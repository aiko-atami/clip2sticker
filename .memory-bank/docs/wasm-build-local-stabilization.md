# Local WASM Build Stabilization

## Status

The local FFmpeg WASM build path was reproduced through Docker against the updated 2026 baseline, but it is not yet fully stabilized end-to-end.

Confirmed as of the latest local Docker run:

- Docker image builds successfully with the updated Emscripten base image.
- `libvpx v1.16.0` builds successfully under Emscripten and installs its headers and static archive.
- `FFmpeg n8.0` `configure` now starts and completes past the old option-validation failure.
- `FFmpeg n8.0` `make` progresses through library and `fftools` compilation.
- The current failure point is the repository's manual final `emcc` link step.

Confirmed validation steps:

- `docker build -t clip2sticker-core-build .`
- `docker run --rm -e RELEASE_VERSION=dev -e FFMPEG_REF=n8.0 -e LIBVPX_REF=v1.16.0 -e EMSCRIPTEN_VERSION=4.0.22 -v "$PWD:/workspace" -w /workspace clip2sticker-core-build bash ./scripts/release-build.sh`
- `npm test`

Current observed blocking error:

- `emcc: error: fftools/objpool.o: No such file or directory`

This happens after `FFmpeg` itself has already been configured and built. The failure is in the repository-maintained object list used for the final browser-targeted link.

## Locked Versions

The current pinned baseline is:

- `FFmpeg`: `n8.0`
- `libvpx`: `v1.16.0`
- `Emscripten`: `4.0.22`
- Docker base image: `emscripten/emsdk:4.0.22`

These versions are intentionally aligned in three places:

- `Dockerfile`
- `scripts/release-build.sh`
- `.github/workflows/release.yml`

The practical reason is reproducibility. The build is sensitive to toolchain behavior and to FFmpeg internal object layout, so mixing a different `emsdk` image with the same FFmpeg/libvpx refs is not a safe assumption.

## Build Topology

The build pipeline is:

1. Build container from `Dockerfile`.
2. Clone exact upstream refs in `scripts/release-build.sh`.
3. Build `libvpx` into the intermediate prefix.
4. Configure and build `FFmpeg` against that prefix.
5. Link the final browser-facing core into `dist/`.
6. Generate `manifest.json`.
7. Generate `SHA256SUMS`.

The important directories are:

- `build/libvpx`: libvpx source checkout
- `build/ffmpeg`: FFmpeg source checkout
- `build/prefix`: intermediate install prefix for headers and static libs
- `dist`: release-ready artifacts

When reproducing locally for validation, using `/tmp` for `WORK_DIR` and `DIST_DIR` is safer than reusing repository-local `build/`, because `scripts/release-build.sh` does not refresh existing source checkouts automatically.

## Why Docker Is the Primary Local Path

The repository does not assume a host-level `emcc` installation.

Using Docker as the primary local path is deliberate:

- it matches CI more closely than an arbitrary host toolchain
- it removes local `emsdk` drift from the debugging surface
- it makes the first reproducible failure point observable without relying on GitHub tags or CI-only logs

This is the right debugging order for this repository:

1. local Docker reproduction
2. stabilize scripts
3. re-run locally until artifacts exist
4. only then trust CI release flow

## libvpx Build Decisions

`scripts/build-libvpx.sh` uses environment variables rather than trying to pass FFmpeg-style `--extra-*flags` into libvpx `configure`.

Key settings:

- `CC=emcc`
- `CXX=em++`
- `AR=emar`
- `LD=emcc`
- `RANLIB=emranlib`
- `NM=emnm`
- `STRIP=emstrip`
- `CFLAGS="-O3 -fPIC -pthread"`
- `LDFLAGS="-O3 -fPIC -pthread -sUSE_PTHREADS=1"`

Why this matters:

- libvpx does not accept FFmpeg-style `--extra-cflags` and `--extra-ldflags` CLI options
- if `LD` is not aligned with Emscripten, configure or link stages can fall back to host tooling and produce `file format not recognized`
- `STRIP=emstrip` keeps the toolchain internally consistent for wasm artifacts

The chosen libvpx feature set is intentionally narrow:

- VP9 encoder enabled
- VP8 disabled
- VP9 decoder disabled
- examples/tools/docs/tests disabled

This is consistent with the product goal of generating VP9 WebM output rather than shipping a general-purpose codec build.

## FFmpeg Build Decisions

`scripts/build-ffmpeg.sh` remains the main adaptation point.

### 1. Removed `--enable-programs`

`FFmpeg n7.1` does not accept `--enable-programs`.

Why removal is correct:

- programs are built by default unless explicitly disabled
- the script already disables `ffplay` and `ffprobe`
- keeping only `ffmpeg` is achieved by default behavior plus `--disable-ffplay --disable-ffprobe`

### 2. Added `pkg-config` to the container

The Docker image now installs `pkg-config`.

Why this matters:

- `--enable-libvpx` depends on library detection
- without `pkg-config`, configure warns that library detection may fail
- removing that ambiguity makes `libvpx` detection deterministic

### 3. Corrected encoder name to `libvpx_vp9`

The configure flag is:

- `--enable-encoder=libvpx_vp9`

Why:

- FFmpeg component names use underscore form internally
- `libvpx-vp9` did not match any encoder and silently degraded the intended build

### 4. Disabled stripping in FFmpeg configure

The script now passes:

- `--disable-stripping`

Why:

- FFmpeg configure wrote `STRIP=strip` into its generated config
- the build then tried to strip a wasm-linked program with host `strip`
- that failed with `file format not recognized`

Disabling stripping is the minimal deterministic fix. It avoids a host-tool post-processing step that is not required for correctness.

### 5. Removed obsolete `--disable-postproc` for `FFmpeg n8.0`

`FFmpeg n8.0` no longer accepts:

- `--disable-postproc`

This was the first concrete upgrade breakage observed during the local Docker run. Removing it is required just to get `configure` moving again on FFmpeg 8.

### 6. Final link uses compiled FFmpeg objects, not raw `fftools/*.c`

This remains the intended structure, but the object list is no longer current for `FFmpeg n8.0`.

The old approach manually recompiled selected `fftools/*.c` files in the final `emcc` call.

The stabilized approach links:

- compiled `fftools/*.o`
- `libavcodec.a`
- `libavformat.a`
- `libavfilter.a`
- `libswscale.a`
- `libavutil.a`
- `libvpx.a`

Why this is correct:

- FFmpeg `configure` computes include paths, generated headers, compatibility flags, and feature-dependent object graph
- manually recompiling selected C files bypasses part of that logic
- this caused a real failure around `stdbit.h`: the raw compile path did not faithfully reuse the configuration state already validated by FFmpeg's own build system
- linking already built object files preserves the exact compile decisions made by FFmpeg

That approach was a stabilization win for the older baseline, but `FFmpeg 8.0` changed the set of generated `fftools` objects. The repository still links a manually curated subset, and that list now diverges from upstream.

Current evidence from `FFmpeg 8.0`:

- `fftools/objpool.o` is gone
- additional `fftools/graph/*`, `fftools/textformat/*`, and `fftools/resources/*` objects are now part of the program build

This means the final link stage must be updated to track the actual `OBJS-ffmpeg` set for the pinned FFmpeg release, or replaced with a less brittle linkage strategy.

### 7. Included `libswscale.a` in the final link

Why:

- enabled filters such as `scale` depend on swscale
- FFmpeg configure had already enabled `swscale`
- omitting it from the final link would be logically inconsistent with the configured filter graph

## Worker Artifact Naming

After the final `emcc` link, the toolchain produced:

- `ffmpeg-core.js`
- `ffmpeg-core.wasm`
- `ffmpeg-core.worker.mjs`

But this repository's runtime and packaging contract expects:

- `ffmpeg-core.worker.js`

The script now normalizes the name by renaming:

- `ffmpeg-core.worker.mjs` -> `ffmpeg-core.worker.js`

Why this is done in the build script:

- `src/runtime-worker.js`
- `scripts/generate-manifest.mjs`
- `scripts/package-release.mjs`
- `.github/workflows/release.yml`

all already assume the `.worker.js` name.

Normalizing the artifact at build time is the smallest change that preserves the existing contract everywhere else in the repository.

## Current FFmpeg Feature Scope

The stabilized FFmpeg build is intentionally narrow.

Enabled high-level support:

- input containers: `mov`
- input codecs: `h264`, `hevc`
- output muxer: `webm`
- output encoder target: `libvpx_vp9`
- protocol: `file`
- filters: `fps`, `scale`, `crop`, `pad`, `format`, `setpts`, `setsar`, `alphamerge`

Notable disabled areas:

- network
- devices
- hardware accelerators
- ffplay
- ffprobe
- broad autodetection
- assembly
- most muxers/demuxers/codecs outside the sticker pipeline

Why this narrow scope is desirable:

- smaller wasm payload
- smaller attack surface in configuration drift
- fewer transitive link requirements
- behavior aligned with the repository goal rather than generic FFmpeg distribution

## Upgrade Findings

The update from `FFmpeg n7.1` to `n8.0` exposed two concrete incompatibilities:

1. `FFmpeg configure` no longer accepts `--disable-postproc`.
2. The manual final `emcc` object list is stale relative to `FFmpeg 8.0`.

There is also a follow-up warning during `configure`:

- `WARNING: Disabled libvpx_vp9_encoder because`

That warning did not block `make`, but it strongly suggests there is still a second-stage integration issue around `libvpx` detection or encoder enablement that needs to be addressed after the object-list mismatch is fixed.

## Reproducible Local Runbook

From repository root:

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
```

For a clean verification run that avoids stale source checkouts:

```bash
docker run --rm \
  -e RELEASE_VERSION=dev \
  -e FFMPEG_REF=n8.0 \
  -e LIBVPX_REF=v1.16.0 \
  -e EMSCRIPTEN_VERSION=4.0.22 \
  -e WORK_DIR=/tmp/clip2sticker-build \
  -e DIST_DIR=/tmp/clip2sticker-dist \
  -v "$PWD:/workspace" \
  -w /workspace \
  clip2sticker-core-build \
  bash -lc 'rm -rf /tmp/clip2sticker-build /tmp/clip2sticker-dist && bash ./scripts/release-build.sh'
```

Then verify:

```bash
ls dist
npm test
```

Expected `dist` files:

- `ffmpeg-core.js`
- `ffmpeg-core.wasm`
- `ffmpeg-core.worker.js`
- `manifest.json`
- `SHA256SUMS`

## CI Relationship

The GitHub Actions workflow uses the same container-driven release path:

- build Docker image
- run `scripts/release-build.sh`
- upload release artifacts
- attach them to the GitHub Release

That is the correct shape for CI because it reuses the same build entrypoint as local verification.

## Known Tradeoffs

These are accepted for now:

- `--arch=x86_32` looks counterintuitive for wasm, but the current stabilized configuration works with it and should not be changed casually without a fresh full verification
- the final worker artifact is renamed post-build instead of changing the broader runtime contract
- FFmpeg build output still emits warnings; they do not currently block successful artifact generation

## What Should Not Be Changed Blindly

Do not casually change:

- FFmpeg ref
- libvpx ref
- Emscripten image tag
- pthread-related flags
- final `emcc` link inputs
- expected worker filename

Any of those changes can invalidate the local proof of reproducibility. If one must change, re-run the full Docker build and artifact verification path.

## Bottom Line

The build is stable because the pipeline now follows one consistent rule:

use Emscripten toolchain end-to-end, let FFmpeg's own build system decide the compile graph, and only package artifacts that match the repository's runtime contract.
