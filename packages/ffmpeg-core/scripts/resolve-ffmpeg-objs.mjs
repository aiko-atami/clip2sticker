import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_BASE_OBJECTS = [
  "fftools/cmdutils.o",
  "fftools/ffmpeg.o",
  "fftools/opt_common.o",
];

function tokenizeAssignmentValue(value) {
  return value
    .replace(/#.*/, "")
    .trim()
    .replace(/\s*\\$/, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

export function parseMakeAssignments(makefileSource) {
  const assignments = new Map();
  const lines = makefileSource.split("\n");

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const match = line.match(/^([A-Za-z0-9_$(\-)+]+)\s*\+=\s*(.*)$/);

    if (!match) {
      continue;
    }

    const [, variableName, initialValue] = match;
    const values = assignments.get(variableName) || [];
    let currentValue = initialValue;

    while (true) {
      values.push(...tokenizeAssignmentValue(currentValue));

      if (!currentValue.trimEnd().endsWith("\\")) {
        break;
      }

      index += 1;
      if (index >= lines.length) {
        break;
      }
      currentValue = lines[index];
    }

    assignments.set(variableName, values);
  }

  return assignments;
}

function mergeAssignments(...maps) {
  const merged = new Map();

  for (const sourceMap of maps) {
    for (const [key, values] of sourceMap.entries()) {
      const existing = merged.get(key) || [];
      existing.push(...values);
      merged.set(key, existing);
    }
  }

  return merged;
}

function resolveVariable(variableName, assignments, stack = new Set()) {
  if (stack.has(variableName)) {
    throw new Error(`Recursive make variable reference detected for ${variableName}`);
  }

  stack.add(variableName);
  const resolved = [];
  const tokens = assignments.get(variableName) || [];

  for (const token of tokens) {
    const variableRef = token.match(/^\$\(([^)]+)\)$/);

    if (variableRef) {
      resolved.push(...resolveVariable(variableRef[1], assignments, stack));
      continue;
    }

    resolved.push(token);
  }

  stack.delete(variableName);
  return resolved;
}

export function parseFfmpegObjects(makefileSources) {
  const assignments = mergeAssignments(
    ...makefileSources.map((source) => parseMakeAssignments(source)),
  );

  const seen = new Set();
  return [
    ...DEFAULT_BASE_OBJECTS,
    ...resolveVariable("OBJS-ffmpeg", assignments),
    ...resolveVariable("OBJS-ffmpeg-yes", assignments),
  ].filter((value) => {
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
}

async function loadMakefileSources(mainMakefilePath) {
  const sources = [];
  const visited = new Set();
  const sourceRoot = path.dirname(path.dirname(mainMakefilePath));

  async function visit(makefilePath) {
    const normalizedPath = path.resolve(makefilePath);
    if (visited.has(normalizedPath)) {
      return;
    }

    visited.add(normalizedPath);
    const source = await fs.readFile(normalizedPath, "utf8");
    sources.push(source);

    const includeMatches = source.matchAll(/^include\s+\$\(SRC_PATH\)\/([^\s]+)$/gm);
    for (const [, includeRelativePath] of includeMatches) {
      await visit(path.join(sourceRoot, includeRelativePath));
    }
  }

  await visit(mainMakefilePath);
  return sources;
}

async function main() {
  const makefilePath = process.argv[2]
    ? path.resolve(process.argv[2])
    : path.resolve("fftools/Makefile");
  const sources = await loadMakefileSources(makefilePath);
  const objects = parseFfmpegObjects(sources);
  process.stdout.write(`${objects.join("\n")}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
