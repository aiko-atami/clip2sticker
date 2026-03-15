# TASK: Fresh FFmpeg WASM build baseline

## Current Status

The repository now has a reproducible local release path for the pinned baseline:

- `FFmpeg`: `n8.0`
- `libvpx`: `v1.16.0`
- `Emscripten`: `4.0.22`

The intended output set is:

- `dist/ffmpeg-core.js`
- `dist/ffmpeg-core.wasm`
- `dist/ffmpeg-core.worker.js`
- `dist/manifest.json`
- `dist/SHA256SUMS`

## Fresh Build Rule

The build is split into two responsibilities:

1. FFmpeg's own build system decides the compile graph.
2. This repository adds the browser runtime contract in the final `emcc` link.

That means:

- `emconfigure ./configure` and `emmake make` remain the source of truth for FFmpeg internals
- the repository must not hand-maintain a separate legacy list of `fftools/*.o`
- the final link must derive `ffmpeg` objects from `fftools/Makefile`
- each `scripts/release-build.sh` run must refresh upstream checkouts and clean stale build outputs before rebuilding

## Source Of Truth

The canonical upstream-generated source is:

- `build/ffmpeg/fftools/Makefile`

The repository helper that reads it is:

- `scripts/resolve-ffmpeg-objs.mjs`

That helper:

- reads the `OBJS-ffmpeg` block
- prepends the `DOFFTOOL` objects used by FFmpeg's `ffmpeg` program target
- emits the final object list for `scripts/build-ffmpeg.sh`

## Why This Replaced The Old Approach

The previous approach hard-coded the `fftools` object list inside `scripts/build-ffmpeg.sh`.

That was fragile because:

- FFmpeg owns the object graph, not this repository
- future FFmpeg ref bumps can change `OBJS-ffmpeg`
- stale local lists fail in confusing ways and create fake upgrade regressions

The fresh approach keeps the repository-specific packaging step while removing that duplication.

## Runtime Contract

The repository-specific final `emcc` link still owns these outputs and settings:

- `MODULARIZE=1`
- `EXPORT_ES6=1`
- `EXPORT_NAME=createFFmpegCore`
- output file names expected by the runtime

The JS runtime continues to expect:

- `ffmpeg-core.js`
- `ffmpeg-core.wasm`
- `ffmpeg-core.worker.js`

The build now validates those outputs directly instead of renaming alternate worker artifacts after the fact.

## Verification

Minimum verification for changes in this area:

```bash
docker build -t clip2sticker-core-build .
docker run --rm \
  -e RELEASE_VERSION=dev \
  -e FFMPEG_REF=n8.0 \
  -e LIBVPX_REF=v1.16.0 \
  -e EMSCRIPTEN_VERSION=4.0.22 \
  -v "$PWD:/workspace" \
  -w /workspace \
  clip2sticker-core-build \
  bash ./scripts/release-build.sh

npm test
```

## Done Criteria

Treat the task as healthy only when:

- the containerized release build succeeds locally
- the expected `dist/*` artifacts exist
- `npm test` passes
- the release workflow reproduces the same artifact set without ad hoc script edits
