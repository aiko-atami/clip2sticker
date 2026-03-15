import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { RELEASE_FILES } from "../src/constants.js";

const releaseDir = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve("dist");

async function hashFile(filePath) {
  const data = await fs.readFile(filePath);
  return crypto.createHash("sha256").update(data).digest("hex");
}

async function main() {
  const checksums = [];

  for (const fileName of RELEASE_FILES) {
    if (fileName === "SHA256SUMS") {
      continue;
    }

    const absolutePath = path.join(releaseDir, fileName);
    await fs.access(absolutePath);
    const sha256 = await hashFile(absolutePath);
    checksums.push(`${sha256}  ${fileName}`);
  }

  await fs.writeFile(
    path.join(releaseDir, "SHA256SUMS"),
    `${checksums.join("\n")}\n`,
  );
}

await main();

