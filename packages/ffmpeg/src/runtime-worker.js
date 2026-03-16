const STATE = {
  ffmpegModule: null,
  ffmpegBaseUrl: null,
};

async function loadFFmpeg({ ffmpegBaseUrl, threads }) {
  if (!ffmpegBaseUrl) {
    throw new Error("ffmpegBaseUrl is required");
  }

  if (STATE.ffmpegModule) {
    return { loaded: true };
  }

  STATE.ffmpegBaseUrl = ffmpegBaseUrl.endsWith("/")
    ? ffmpegBaseUrl
    : `${ffmpegBaseUrl}/`;

  globalThis.Module = {
    locateFile(path) {
      return new URL(path, STATE.ffmpegBaseUrl).toString();
    },
    mainScriptUrlOrBlob: new URL("ffmpeg.js", STATE.ffmpegBaseUrl).toString(),
    pthreadPoolSize: Math.max(1, threads || 2),
  };

  const ffmpegModule = await import(
    new URL("ffmpeg.js", STATE.ffmpegBaseUrl).toString()
  );
  const factory = ffmpegModule.default || ffmpegModule.createFFmpegModule;

  if (typeof factory !== "function") {
    throw new Error("FFmpeg factory was not found");
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
    throw new Error("FFmpeg is not loaded");
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
        result = await loadFFmpeg(payload);
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
