import test from "node:test";
import assert from "node:assert/strict";
import { buildFfmpegArgs, buildFilterGraph } from "../src/command.js";

test("buildFilterGraph uses contain chain and no setpts for short inputs", () => {
  const filterGraph = buildFilterGraph({
    durationSeconds: 2.4,
    fitMode: "contain",
    fps: 20,
  });

  assert.equal(filterGraph.includes("setpts="), false);
  assert.equal(filterGraph.includes("pad=512:512"), true);
});

test("buildFilterGraph adds setpts and mask chain when required", () => {
  const filterGraph = buildFilterGraph({
    durationSeconds: 6,
    fitMode: "crop",
    fps: 24,
    hasMask: true,
  });

  assert.equal(filterGraph.includes("setpts=0.500000*PTS"), true);
  assert.equal(filterGraph.includes("alphamerge"), true);
  assert.equal(filterGraph.includes("[1:v]fps=24"), true);
});

test("buildFfmpegArgs emits balanced vp9 arguments", () => {
  const args = buildFfmpegArgs({
    inputName: "input.mov",
    durationSeconds: 6,
    fitMode: "crop",
    fps: 20,
    threads: 4,
  });

  assert.deepEqual(args.slice(0, 4), ["-hide_banner", "-y", "-i", "input.mov"]);
  assert.equal(args.includes("libvpx-vp9"), true);
  assert.equal(args.includes("yuva420p"), true);
  assert.equal(args.at(-1), "output.webm");
});

