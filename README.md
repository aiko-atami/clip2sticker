# clip2sticker core

Core-only repository for building and distributing a minimal FFmpeg WebAssembly bundle for Telegram animated sticker conversion.

## What this repository contains

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
import { createClip2StickerCore } from "./src/index.js";

const core = createClip2StickerCore({
  coreBaseUrl: "/ffmpeg",
});

await core.load();

const result = await core.transcode({
  input: await file.arrayBuffer(),
  inputName: file.name,
  fitMode: "contain",
  fps: 20,
});
```

The runtime expects the following files to be hosted under `coreBaseUrl`:

- `ffmpeg-core.js`
- `ffmpeg-core.wasm`
- `manifest.json`

With `Emscripten 5.x`, pthread workers are loaded from `ffmpeg-core.js` itself, so there is no separate `ffmpeg-core.worker.js` asset anymore.

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
6. Produce `ffmpeg-core.js` and `ffmpeg-core.wasm`
7. Generate `manifest.json` and `SHA256SUMS`
8. Publish the files as workflow artifacts and GitHub Release assets

## Build strategy

The WASM bundle is built in two layers:

- `emconfigure ./configure` + `emmake make` let FFmpeg decide the compile graph for the pinned release.
- a repository-owned final `emcc` link adds the runtime contract required by this package: `MODULARIZE`, `EXPORT_ES6`, `EXPORT_NAME=createFFmpegCore`, and the exact asset names expected by the JS runtime.
- `make release` refreshes both upstream checkouts to the exact pinned refs, cleans stale release outputs, and rebuilds from scratch.

The important source of truth is FFmpeg's generated `fftools/Makefile`.

- `scripts/resolve-ffmpeg-objs.mjs` reads `OBJS-ffmpeg` from that file
- `make build-ffmpeg` uses that resolved list instead of a hand-maintained legacy list of `fftools/*.o`

This keeps the local packaging layer explicit without forking FFmpeg's internal object graph by hand.

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

- `dist/ffmpeg-core.js`
- `dist/ffmpeg-core.wasm`
- `dist/manifest.json`
- `dist/SHA256SUMS`

## SharedArrayBuffer requirements

Projects consuming this bundle must serve:

- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp`

This repository does not ship a UI, so host-specific header configuration stays in the consuming application.

## Local checks

```bash
make test
```

The tests do not build FFmpeg; they verify the JS runtime contract and release metadata generation.
