#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

function fail(message) {
  if (message) {
    process.stderr.write(`${message}\n`);
  }
  process.exit(1);
}

function compareVersions(left, right) {
  const leftParts = left.split(".").map((part) => Number.parseInt(part, 10) || 0);
  const rightParts = right.split(".").map((part) => Number.parseInt(part, 10) || 0);
  const count = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < count; index += 1) {
    const leftPart = leftParts[index] || 0;
    const rightPart = rightParts[index] || 0;
    if (leftPart > rightPart) {
      return 1;
    }
    if (leftPart < rightPart) {
      return -1;
    }
  }
  return 0;
}

function parsePcFile(pcPath) {
  const variables = new Map();
  const fields = new Map();
  const lines = fs.readFileSync(pcPath, "utf8").split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const variableMatch = trimmed.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (variableMatch) {
      variables.set(variableMatch[1], variableMatch[2]);
      continue;
    }

    const fieldMatch = trimmed.match(/^([A-Za-z0-9_.-]+):\s*(.*)$/);
    if (fieldMatch) {
      fields.set(fieldMatch[1], fieldMatch[2]);
    }
  }

  function expand(value, depth = 0) {
    if (depth > 20) {
      fail("pkg-config-lite: variable expansion exceeded recursion limit");
    }
    return value.replace(/\$\{([^}]+)\}/g, (_, name) => {
      if (fields.has(name)) {
        return expand(fields.get(name), depth + 1);
      }
      if (variables.has(name)) {
        return expand(variables.get(name), depth + 1);
      }
      return "";
    });
  }

  return { fields, expand };
}

function findPcFile(packageName) {
  const searchPaths = (process.env.PKG_CONFIG_PATH || "")
    .split(":")
    .filter(Boolean);
  for (const searchPath of searchPaths) {
    const candidate = path.join(searchPath, `${packageName}.pc`);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  fail(`pkg-config-lite: ${packageName}.pc was not found in PKG_CONFIG_PATH`);
}

const rawArgs = process.argv.slice(2);
const wantsExists = rawArgs.includes("--exists");
const wantsCflags = rawArgs.includes("--cflags");
const wantsLibs = rawArgs.includes("--libs");
const wantsCflagsOnlyI = rawArgs.includes("--cflags-only-I");
const variableArg = rawArgs.find((arg) => arg.startsWith("--variable="));
const wantsStatic = rawArgs.includes("--static");

const packageSpec = rawArgs.find((arg) => !arg.startsWith("--"));
if (!packageSpec) {
  fail("pkg-config-lite: package name is required");
}

const packageName = packageSpec.split(/\s+/)[0];
const versionMatch = packageSpec.match(/^\S+\s*>=\s*([0-9.]+)$/);
const pcPath = findPcFile(packageName);
const pc = parsePcFile(pcPath);
const version = pc.expand(pc.fields.get("Version") || "0");

if (versionMatch && compareVersions(version, versionMatch[1]) < 0) {
  process.exit(1);
}

if (wantsExists) {
  process.exit(0);
}

if (variableArg) {
  const variableName = variableArg.slice("--variable=".length);
  if (variableName === "pcfiledir") {
    process.stdout.write(`${path.dirname(pcPath)}\n`);
    process.exit(0);
  }
  const fieldValue = pc.fields.get(variableName);
  if (fieldValue) {
    process.stdout.write(`${pc.expand(fieldValue)}\n`);
    process.exit(0);
  }
  fail(`pkg-config-lite: unsupported variable ${variableName}`);
}

if (wantsCflagsOnlyI) {
  const cflags = pc.expand(pc.fields.get("Cflags") || "")
    .split(/\s+/)
    .filter((item) => item.startsWith("-I"));
  process.stdout.write(`${cflags.join(" ")}\n`);
  process.exit(0);
}

if (wantsCflags) {
  process.stdout.write(`${pc.expand(pc.fields.get("Cflags") || "")}\n`);
  process.exit(0);
}

if (wantsLibs) {
  const libs = [pc.expand(pc.fields.get("Libs") || "")];
  if (wantsStatic) {
    libs.push(pc.expand(pc.fields.get("Libs.private") || ""));
  }
  process.stdout.write(`${libs.join(" ").trim()}\n`);
  process.exit(0);
}

fail("pkg-config-lite: unsupported arguments");
