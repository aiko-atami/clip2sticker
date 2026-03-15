# clip2sticker core

Core-only repository for building and distributing a minimal FFmpeg WebAssembly bundle for Telegram animated sticker conversion.

## What this repository contains

- Reproducible `libvpx + FFmpeg` build scripts targeting `Emscripten`.
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
- `ffmpeg-core.worker.js`
- `manifest.json`

## Release flow

Tag a commit and push the tag:

```bash
git tag v0.1.0
git push origin v0.1.0
```

The release workflow will:

1. Build `libvpx`
2. Build `FFmpeg`
3. Produce `ffmpeg-core.js`, `ffmpeg-core.wasm`, `ffmpeg-core.worker.js`
4. Generate `manifest.json` and `SHA256SUMS`
5. Publish the files as GitHub Release assets

## SharedArrayBuffer requirements

Projects consuming this bundle must serve:

- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp`

This repository does not ship a UI, so host-specific header configuration stays in the consuming application.

## Local checks

```bash
npm test
```

The tests do not build FFmpeg; they verify the JS runtime contract and release metadata generation.

