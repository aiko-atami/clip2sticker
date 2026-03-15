import { OUTPUT_DIMENSION } from "./constants.js";

export function expandRawMaskFrame(maskBytes, fps, durationSeconds) {
  if (!(maskBytes instanceof Uint8Array)) {
    throw new Error("maskBytes must be a Uint8Array");
  }

  if (!Number.isFinite(fps) || fps <= 0) {
    throw new Error("fps must be a positive number");
  }

  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new Error("durationSeconds must be a positive number");
  }

  const frameSize = OUTPUT_DIMENSION * OUTPUT_DIMENSION;
  if (maskBytes.byteLength !== frameSize) {
    throw new Error(`maskBytes must contain exactly ${frameSize} bytes`);
  }

  const frameCount = Math.max(1, Math.ceil(fps * Math.min(durationSeconds, 3)));
  const output = new Uint8Array(frameSize * frameCount);

  for (let index = 0; index < frameCount; index += 1) {
    output.set(maskBytes, index * frameSize);
  }

  return output;
}

