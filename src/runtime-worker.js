const STATE = {
  ffmpegModule: null,
  coreBaseUrl: null,
};

async function loadCore({ coreBaseUrl, threads }) {
  if (!coreBaseUrl) {
    throw new Error("coreBaseUrl is required");
  }

  if (STATE.ffmpegModule) {
    return { loaded: true };
  }

  STATE.coreBaseUrl = coreBaseUrl.endsWith("/")
    ? coreBaseUrl
    : `${coreBaseUrl}/`;

  globalThis.Module = {
    locateFile(path) {
      return new URL(path, STATE.coreBaseUrl).toString();
    },
    mainScriptUrlOrBlob: new URL("ffmpeg-core.js", STATE.coreBaseUrl).toString(),
    pthreadPoolSize: Math.max(1, threads || 2),
  };

  const coreModule = await import(
    new URL("ffmpeg-core.js", STATE.coreBaseUrl).toString()
  );
  const factory = coreModule.default || coreModule.createFFmpegCore;

  if (typeof factory !== "function") {
    throw new Error("FFmpeg core factory was not found");
  }

  STATE.ffmpegModule = await factory(globalThis.Module);
  return { loaded: true };
}

function writeFile(path, bytes) {
  STATE.ffmpegModule.FS.writeFile(path, bytes);
}

function unlinkIfExists(path) {
  try {
    STATE.ffmpegModule.FS.unlink(path);
  } catch {
    // The worker reuses the same MEMFS between calls.
  }
}

async function transcode({
  args,
  inputName,
  inputBytes,
  maskName,
  maskBytes,
  outputName,
}) {
  if (!STATE.ffmpegModule) {
    throw new Error("Core is not loaded");
  }

  unlinkIfExists(inputName);
  unlinkIfExists(outputName);
  if (maskName) {
    unlinkIfExists(maskName);
  }

  writeFile(inputName, inputBytes);
  if (maskName && maskBytes) {
    writeFile(maskName, maskBytes);
  }

  const logs = [];
  const previousPrint = STATE.ffmpegModule.print;
  const previousPrintErr = STATE.ffmpegModule.printErr;

  STATE.ffmpegModule.print = (...items) => {
    logs.push(items.join(" "));
  };
  STATE.ffmpegModule.printErr = (...items) => {
    logs.push(items.join(" "));
  };

  try {
    const exitCode = STATE.ffmpegModule.callMain(args);
    if (exitCode !== 0) {
      throw new Error(`FFmpeg exited with code ${exitCode}`);
    }

    const output = STATE.ffmpegModule.FS.readFile(outputName);
    return {
      outputBytes: output.buffer.slice(
        output.byteOffset,
        output.byteOffset + output.byteLength,
      ),
      outputName,
      logs,
    };
  } finally {
    STATE.ffmpegModule.print = previousPrint;
    STATE.ffmpegModule.printErr = previousPrintErr;
  }
}

globalThis.addEventListener("message", async (event) => {
  const { id, type, payload } = event.data || {};

  try {
    let result;

    switch (type) {
      case "load":
        result = await loadCore(payload);
        break;
      case "transcode":
        result = await transcode(payload);
        break;
      default:
        throw new Error(`Unsupported worker message type: ${type}`);
    }

    globalThis.postMessage({ id, result }, result?.outputBytes ? [result.outputBytes] : []);
  } catch (error) {
    globalThis.postMessage({
      id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});
