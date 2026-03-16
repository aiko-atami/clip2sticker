export const OUTPUT_MAX_DURATION_SECONDS = 3;
export const OUTPUT_DIMENSION = 512;
export const DEFAULT_FPS = 20;
export const FPS_PRESETS = [15, 20, 24, 30];
export const DEFAULT_FIT_MODE = "contain";
export const OUTPUT_FILENAME = "output.webm";
export const OUTPUT_VIDEO_CODEC = "libvpx-vp9";
export const OUTPUT_PIXEL_FORMAT = "yuva420p";

export const INPUT_SUPPORT = Object.freeze({
  containers: ["mp4", "mov"],
  codecs: ["h264", "hevc"],
});

export const FILTERS = Object.freeze({
  contain:
    "scale='if(gte(iw,ih),512,-2)':'if(gte(ih,iw),512,-2)':flags=lanczos,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=black@0,setsar=1,format=rgba",
  crop:
    "crop='min(iw,ih)':'min(iw,ih)',scale=512:512:flags=lanczos,setsar=1,format=rgba",
});

export const RELEASE_FILES = Object.freeze([
  "ffmpeg.js",
  "ffmpeg.wasm",
  "manifest.json",
  "SHA256SUMS",
]);
