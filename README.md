# clip2sticker

`clip2sticker` is a browser-first project for turning short videos into Telegram-ready animated stickers.

This repository now contains two distinct deliverables in one codebase:

- `apps/web` contains the first-party frontend application.
- `packages/ffmpeg-core` contains the reusable FFmpeg WebAssembly build, browser runtime, and downloadable release assets.

This keeps the product and the infrastructure together without pretending the whole repository is only a WASM build pipeline.

## Repository layout

```text
apps/
  web/                  official browser UI
packages/
  ffmpeg-core/          FFmpeg WASM build + runtime + release artifacts
```

## Intended usage

If you want the full product, start from `apps/web`.

If you want to build your own UI, use `packages/ffmpeg-core` directly or download its release artifacts from GitHub Releases:

- `ffmpeg-core.js`
- `ffmpeg-core.wasm`
- `manifest.json`

## Workspace commands

The root workspace keeps lightweight proxy commands for the core package:

```bash
npm test
make test
make docker-release RELEASE_VERSION=dev
```

For the package-specific build and release details, see [packages/ffmpeg-core/README.md](/home/xs/aiko/clip2sticker/packages/ffmpeg-core/README.md).
