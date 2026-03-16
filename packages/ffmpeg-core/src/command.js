import {
  DEFAULT_FIT_MODE,
  FILTERS,
  FPS_PRESETS,
  OUTPUT_FILENAME,
  OUTPUT_MAX_DURATION_SECONDS,
  OUTPUT_PIXEL_FORMAT,
  OUTPUT_VIDEO_CODEC,
} from "./constants.js";

function assertFps(fps) {
  if (!FPS_PRESETS.includes(fps)) {
    throw new Error(`Unsupported FPS preset: ${fps}`);
  }
}

function assertFitMode(fitMode) {
  if (!Object.hasOwn(FILTERS, fitMode)) {
    throw new Error(`Unsupported fit mode: ${fitMode}`);
  }
}

function formatSpeedMultiplier(durationSeconds) {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return null;
  }

  if (durationSeconds <= OUTPUT_MAX_DURATION_SECONDS) {
    return null;
  }

  return (OUTPUT_MAX_DURATION_SECONDS / durationSeconds).toFixed(6);
}

export function buildFilterGraph({
  durationSeconds,
  fitMode = DEFAULT_FIT_MODE,
  fps,
  hasMask = false,
}) {
  assertFps(fps);
  assertFitMode(fitMode);

  const filters = [`fps=${fps}`];
  const speedMultiplier = formatSpeedMultiplier(durationSeconds);

  if (speedMultiplier) {
    filters.push(`setpts=${speedMultiplier}*PTS`);
  }

  filters.push(FILTERS[fitMode]);

  const baseVideoLabel = hasMask ? "[video]" : "[v]";
  const maskVideoLabel = "[mask]";
  const baseChain = `[0:v]${filters.join(",")}${baseVideoLabel}`;

  if (!hasMask) {
    return baseChain;
  }

  const maskChain =
    `[1:v]fps=${fps},format=gray,scale=512:512:flags=neighbor${maskVideoLabel};` +
    `${baseChain};` +
    `[video][mask]alphamerge[v]`;

  return maskChain;
}

export function buildFfmpegArgs({
  inputName,
  maskName,
  durationSeconds,
  fitMode = DEFAULT_FIT_MODE,
  fps,
  threads = 2,
  outputName = OUTPUT_FILENAME,
}) {
  if (!inputName) {
    throw new Error("inputName is required");
  }

  const hasMask = Boolean(maskName);
  const filterGraph = buildFilterGraph({
    durationSeconds,
    fitMode,
    fps,
    hasMask,
  });

  const args = ["-hide_banner", "-y", "-i", inputName];

  if (hasMask) {
    args.push(
      "-f",
      "rawvideo",
      "-pix_fmt",
      "gray",
      "-s:v",
      "512x512",
      "-r",
      String(fps),
      "-i",
      maskName,
    );
  }

  args.push(
    "-filter_complex",
    filterGraph,
    "-map",
    "[v]",
    "-an",
    "-c:v",
    OUTPUT_VIDEO_CODEC,
    "-pix_fmt",
    OUTPUT_PIXEL_FORMAT,
    "-b:v",
    "0",
    "-crf",
    "42",
    "-deadline",
    "good",
    "-cpu-used",
    "2",
    "-row-mt",
    "1",
    "-tile-columns",
    "2",
    "-threads",
    String(threads),
    outputName,
  );

  return args;
}
