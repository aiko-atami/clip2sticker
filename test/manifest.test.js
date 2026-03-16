import test from "node:test";
import assert from "node:assert/strict";
import { buildManifest } from "../src/manifest.js";

test("buildManifest records release metadata and runtime requirements", () => {
  const manifest = buildManifest({
    version: "v0.1.0",
    ffmpegRef: "n8.0",
    libvpxRef: "v1.16.0",
    emscriptenVersion: "5.0.2",
    assetHashes: {
      "ffmpeg-core.js": "abc",
    },
    buildDate: "2026-03-15T00:00:00.000Z",
  });

  assert.equal(manifest.version, "v0.1.0");
  assert.equal(manifest.build.ffmpegRef, "n8.0");
  assert.equal(
    manifest.runtime.headers["Cross-Origin-Embedder-Policy"],
    "require-corp",
  );
  assert.equal(manifest.files.find((file) => file.name === "ffmpeg-core.js").sha256, "abc");
});
