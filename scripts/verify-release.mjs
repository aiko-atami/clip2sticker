import fs from "node:fs/promises";
import path from "node:path";
import { RELEASE_FILES } from "../src/constants.js";

const releaseDir = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve("dist");

async function assertFile(fileName) {
  const absolutePath = path.join(releaseDir, fileName);
  const stats = await fs.stat(absolutePath);
  if (!stats.isFile()) {
    throw new Error(`${fileName} exists but is not a regular file`);
  }
  if (stats.size === 0) {
    throw new Error(`${fileName} is empty`);
  }
}

async function main() {
  for (const fileName of RELEASE_FILES) {
    await assertFile(fileName);
  }
}

await main();
