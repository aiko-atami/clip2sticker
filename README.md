# clip2sticker

`clip2sticker` is a browser-first project for turning short videos into Telegram-ready animated stickers.

This repository now contains two distinct deliverables in one codebase:

- `apps/web` contains the first-party frontend application.
- `packages/ffmpeg` contains the reusable FFmpeg WebAssembly build, browser runtime, and downloadable release assets.

## Repository layout

```text
apps/
  web/                  UI
packages/
  ffmpeg/               FFmpeg WASM build + runtime + release artifacts
```

## Intended usage

If you want the full product, start from `apps/web`.

If you want to build your own UI, use `packages/ffmpeg` directly or download its release artifacts from GitHub Releases:

- `ffmpeg.js`
- `ffmpeg.wasm`
- `manifest.json`

## Workspace commands

Run tests for the reusable core package from the workspace root:

```bash
npm test
make -C packages/ffmpeg test
make -C packages/ffmpeg docker-release RELEASE_VERSION=dev
```

For the package-specific build and release details, see [packages/ffmpeg/README.md](/home/xs/aiko/clip2sticker/packages/ffmpeg/README.md).
