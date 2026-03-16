# @clip2sticker/ffmpeg

Reusable FFmpeg WebAssembly build and browser runtime for `clip2sticker`.

This package is only one part of the repository. The product itself lives at the repository root as `clip2sticker`, with a separate first-party UI under `apps/web`.

## What this package contains

- Reproducible `libvpx + FFmpeg` build scripts targeting `Emscripten`.
- `Dockerfile + Makefile` build entrypoints for local and CI usage.
- A thin browser runtime API without UI.
- GitHub Actions release automation that publishes raw bundle assets.
- Tests for command construction, manifest generation, and packaging metadata.

## Baseline support

- Input containers: `MP4`, `MOV`
- Input codecs: `H.264`, `HEVC`
- Output container: `WebM`
- Output codec: `VP9`
- Audio: stripped
- Duration policy: inputs longer than `3s` are sped up to `3s`; shorter inputs are left unchanged
- Canvas modes: `contain`, `crop`
- FPS presets: `15`, `20`, `24`, `30`

`GIF` and `WebM` input are intentionally not included in the baseline build to keep the `.wasm` payload smaller.

## Runtime API

```js
import { createClip2StickerFFmpeg } from "./src/index.js";

const ffmpeg = createClip2StickerFFmpeg({
  ffmpegBaseUrl: "/ffmpeg",
});

await ffmpeg.load();

const result = await ffmpeg.transcode({
  input: await file.arrayBuffer(),
  inputName: file.name,
  fitMode: "contain",
  fps: 20,
});
```

The runtime expects the following files to be hosted under `ffmpegBaseUrl`:

- `ffmpeg.js`
- `ffmpeg.wasm`
- `manifest.json`

With `Emscripten 5.x`, pthread workers are loaded from `ffmpeg.js` itself, so there is no separate `ffmpeg.worker.js` asset anymore.

## Release flow

Push to `main` or open a pull request to run CI.

Tag a commit and push the tag to run the release workflow:

```bash
git tag v0.1.0
git push origin v0.1.0
```

The release workflow will:

1. Run `npm test`
2. Build the toolchain image with cached Docker layers
3. Build `libvpx`
4. Build `FFmpeg`
5. Derive the final `ffmpeg` object graph from FFmpeg's generated `fftools/Makefile`
6. Produce `ffmpeg.js` and `ffmpeg.wasm`
7. Generate `manifest.json` and `SHA256SUMS`
8. Publish the files as workflow artifacts and GitHub Release assets

`workflow_dispatch` can be used for a manual CI build without creating a GitHub Release. A real GitHub Release is created only for pushed tags matching `v*`.

## Build strategy

The WASM bundle is built in two layers:

- `emconfigure ./configure` + `emmake make` let FFmpeg decide the compile graph for the pinned release.
- A repository-owned final `emcc` link adds the runtime contract required by this package: `MODULARIZE`, `EXPORT_ES6`, `EXPORT_NAME=createFFmpegModule`, and the exact asset names expected by the JS runtime.
- `make release` refreshes both upstream checkouts to the exact pinned refs, cleans stale release outputs, and rebuilds from scratch.

The important source of truth is FFmpeg's generated `fftools/Makefile`.

- `scripts/resolve-ffmpeg-objs.mjs` reads `OBJS-ffmpeg` from that file.
- `make build-ffmpeg` uses that resolved list instead of a hand-maintained legacy list of `fftools/*.o`.

## Local build

Build the same containerized path used in CI:

```bash
make docker-release RELEASE_VERSION=dev
```

To run inside an already configured `emsdk` shell without Docker:

```bash
make release RELEASE_VERSION=dev
```

The release build is expected to leave:

- `dist/ffmpeg.js`
- `dist/ffmpeg.wasm`
- `dist/manifest.json`
- `dist/SHA256SUMS`

The release workflow also packages those files into `clip2sticker-ffmpeg-<version>.tar.gz` for convenient downloading from GitHub Releases.

## Downloading a build

Consumers of this package do not need to build FFmpeg locally.

1. Open the repository's GitHub Releases page.
2. Download `clip2sticker-ffmpeg-<version>.tar.gz` or the individual assets.
3. Host the extracted files under one public directory.
4. Point `ffmpegBaseUrl` at that directory.

The minimum runtime payload is:

- `ffmpeg.js`
- `ffmpeg.wasm`
- `manifest.json`

## SharedArrayBuffer requirements

Projects consuming this bundle must serve:

- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp`

This package does not ship a UI, so host-specific header configuration stays in the consuming application.

## Local checks

```bash
make test
```

The tests do not build FFmpeg; they verify the JS runtime contract and release metadata generation.
