import { DEFAULT_FIT_MODE, DEFAULT_FPS, OUTPUT_FILENAME } from "./constants.js";
import { buildFfmpegArgs } from "./command.js";
import { expandRawMaskFrame } from "./mask.js";

function toUint8Array(input) {
  if (input instanceof Uint8Array) {
    return input;
  }

  if (input instanceof ArrayBuffer) {
    return new Uint8Array(input);
  }

  throw new Error("input must be an ArrayBuffer or Uint8Array");
}

function toWorkerUrl(baseUrl, filename) {
  const normalized = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(filename, normalized).toString();
}

export function createClip2StickerCore({
  coreBaseUrl,
  workerFactory,
  threads = 2,
} = {}) {
  if (!coreBaseUrl && !workerFactory) {
    throw new Error("coreBaseUrl or workerFactory is required");
  }

  let worker;
  let nextRequestId = 1;
  const pending = new Map();

  function ensureWorker() {
    if (worker) {
      return worker;
    }

    worker = workerFactory
      ? workerFactory()
      : new Worker(toWorkerUrl(coreBaseUrl, "runtime-worker.js"), {
          type: "module",
        });

    worker.addEventListener("message", (event) => {
      const { id, error, result } = event.data || {};
      const deferred = pending.get(id);

      if (!deferred) {
        return;
      }

      pending.delete(id);

      if (error) {
        deferred.reject(new Error(error));
        return;
      }

      deferred.resolve(result);
    });

    return worker;
  }

  function callWorker(type, payload) {
    const activeWorker = ensureWorker();
    const id = nextRequestId;
    nextRequestId += 1;

    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      activeWorker.postMessage({ id, type, payload });
    });
  }

  return {
    async load() {
      return callWorker("load", {
        coreBaseUrl,
        threads,
      });
    },

    async transcode({
      input,
      inputName,
      maskRaw,
      fitMode = DEFAULT_FIT_MODE,
      fps = DEFAULT_FPS,
      durationSeconds,
    }) {
      const inputBytes = toUint8Array(input);
      const args = buildFfmpegArgs({
        inputName,
        maskName: maskRaw ? "mask.raw" : undefined,
        durationSeconds,
        fitMode,
        fps,
        threads,
        outputName: OUTPUT_FILENAME,
      });

      const payload = {
        args,
        inputName,
        inputBytes,
        outputName: OUTPUT_FILENAME,
      };

      if (maskRaw) {
        payload.maskName = "mask.raw";
        payload.maskBytes = expandRawMaskFrame(
          toUint8Array(maskRaw),
          fps,
          durationSeconds,
        );
      }

      const result = await callWorker("transcode", payload);
      return {
        output: new Uint8Array(result.outputBytes),
        outputName: result.outputName,
        logs: result.logs || [],
      };
    },

    terminate() {
      if (worker) {
        worker.terminate();
        worker = undefined;
      }
    },
  };
}

