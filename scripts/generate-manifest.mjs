import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { buildManifest } from "../src/manifest.js";

const releaseDir = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve("dist");
const version = process.env.RELEASE_VERSION || "dev";

async function hashFile(filePath) {
  const data = await fs.readFile(filePath);
  return crypto.createHash("sha256").update(data).digest("hex");
}

async function main() {
  const assetHashes = {};
  for (const name of ["ffmpeg-core.js", "ffmpeg-core.wasm", "ffmpeg-core.worker.js"]) {
    const absolutePath = path.join(releaseDir, name);
    try {
      assetHashes[name] = await hashFile(absolutePath);
    } catch {
      assetHashes[name] = null;
    }
  }

  const manifest = buildManifest({
    version,
    ffmpegRef: process.env.FFMPEG_REF,
    libvpxRef: process.env.LIBVPX_REF,
    emscriptenVersion: process.env.EMSCRIPTEN_VERSION,
    assetHashes,
  });

  await fs.mkdir(releaseDir, { recursive: true });
  await fs.writeFile(
    path.join(releaseDir, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
}

await main();

