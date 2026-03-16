import { FILTERS, INPUT_SUPPORT, RELEASE_FILES } from "./constants.js";

export function buildManifest({
  version,
  ffmpegRef,
  libvpxRef,
  emscriptenVersion,
  assetHashes = {},
  buildDate = new Date().toISOString(),
}) {
  if (!version) {
    throw new Error("version is required");
  }

  return {
    version,
    buildDate,
    build: {
      ffmpegRef: ffmpegRef || "unknown",
      libvpxRef: libvpxRef || "unknown",
      emscriptenVersion: emscriptenVersion || "unknown",
    },
    runtime: {
      headers: {
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Embedder-Policy": "require-corp",
      },
      threads: {
        mode: "pthreads",
        recommended: "Math.min(4, navigator.hardwareConcurrency || 2)",
      },
    },
    support: {
      inputs: INPUT_SUPPORT,
      output: {
        container: "webm",
        codec: "vp9",
        alpha: true,
      },
      filters: Object.keys(FILTERS),
    },
    files: RELEASE_FILES.map((name) => ({
      name,
      sha256: assetHashes[name] || null,
    })),
  };
}

