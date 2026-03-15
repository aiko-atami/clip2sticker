# Local WASM Build Stabilization

## Status

The local FFmpeg WASM build path is now reproducible in the current working tree, and the remaining inconsistencies are primarily documentation and maintenance-shape issues rather than a proven hard build blocker.

Confirmed in the current repository state on 2026-03-15:

- Docker image builds successfully with the updated Emscripten base image.
- `libvpx v1.16.0` builds successfully under Emscripten and installs its headers and static archive.
- `FFmpeg n8.0` `configure` completes with the current script flags.
- `FFmpeg n8.0` `make` produces browser-targeted artifacts in `build/ffmpeg/`, including `ffmpeg`, `ffmpeg_g.wasm`, and `ffmpeg_g.worker.js`.
- The repository's release flow currently produces `dist/ffmpeg-core.js`, `dist/ffmpeg-core.wasm`, `dist/ffmpeg-core.worker.js`, `manifest.json`, and `SHA256SUMS`.
- The repository no longer hand-maintains the final `fftools/*.o` list; it derives that list from FFmpeg's generated `fftools/Makefile`.
- `npm test` passes against those artifacts.

Confirmed validation steps:

- `docker build -t clip2sticker-core-build .`
- `docker run --rm -e RELEASE_VERSION=dev -e FFMPEG_REF=n8.0 -e LIBVPX_REF=v1.16.0 -e EMSCRIPTEN_VERSION=4.0.22 -v "$PWD:/workspace" -w /workspace clip2sticker-core-build bash ./scripts/release-build.sh`
- `npm test`

Earlier investigation captured a blocking error around:

- `emcc: error: fftools/objpool.o: No such file or directory`

That failure mode is now addressed structurally: the build no longer relies on a stale hard-coded object list.

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

`scripts/release-build.sh` now refreshes both upstream repositories to the pinned refs and cleans stale build products before rebuilding. Using `/tmp` for `WORK_DIR` and `DIST_DIR` is still a useful isolation pattern, but it is no longer required just to avoid stale checkout state.

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

This remains the intended structure, and the repository now derives the object list from FFmpeg's generated build metadata instead of maintaining it manually.

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

The authoritative source is `build/ffmpeg/fftools/Makefile`, which currently expands the pinned baseline link graph to:

- `fftools/cmdutils.o`
- `fftools/ffmpeg.o`
- `fftools/ffmpeg_dec.o`
- `fftools/ffmpeg_demux.o`
- `fftools/ffmpeg_enc.o`
- `fftools/ffmpeg_filter.o`
- `fftools/ffmpeg_hw.o`
- `fftools/ffmpeg_mux.o`
- `fftools/ffmpeg_mux_init.o`
- `fftools/ffmpeg_opt.o`
- `fftools/ffmpeg_sched.o`
- `fftools/graph/graphprint.o`
- `fftools/opt_common.o`
- `fftools/resources/resman.o`
- `fftools/resources/graph.html.o`
- `fftools/resources/graph.css.o`
- `fftools/sync_queue.o`
- `fftools/textformat/avtextformat.o`
- `fftools/textformat/tf_compact.o`
- `fftools/textformat/tf_default.o`
- `fftools/textformat/tf_flat.o`
- `fftools/textformat/tf_ini.o`
- `fftools/textformat/tf_json.o`
- `fftools/textformat/tf_mermaid.o`
- `fftools/textformat/tf_xml.o`
- `fftools/textformat/tw_avio.o`
- `fftools/textformat/tw_buffer.o`
- `fftools/textformat/tw_stdout.o`
- `fftools/thread_queue.o`

The build now follows that upstream-generated list automatically:

- `scripts/resolve-ffmpeg-objs.mjs` reads `OBJS-ffmpeg` from `fftools/Makefile`
- it follows included makefiles such as `fftools/resources/Makefile`
- it expands nested references such as `$(OBJS-resman)`
- it prepends the `DOFFTOOL` objects (`cmdutils.o`, `ffmpeg.o`, `opt_common.o`) that FFmpeg links for the `ffmpeg` program target
- `scripts/build-ffmpeg.sh` passes that resolved list into the final `emcc` link

This removes the old maintenance hazard where the repository duplicated upstream `OBJS-ffmpeg` by hand.

### 7. Included `libswscale.a` in the final link

Why:

- enabled filters such as `scale` depend on swscale
- FFmpeg configure had already enabled `swscale`
- omitting it from the final link would be logically inconsistent with the configured filter graph

## Worker Artifact Naming

After the final `emcc` link, this repository expects:

- `ffmpeg-core.js`
- `ffmpeg-core.wasm`
- `ffmpeg-core.worker.js`

Why that exact output matters:

- `src/runtime-worker.js`
- `scripts/generate-manifest.mjs`
- `scripts/package-release.mjs`
- `.github/workflows/release.yml`

all assume the `.worker.js` name.

The build script now validates that the expected `.js` worker artifact exists instead of renaming alternate outputs after the fact.

Fresh Emscripten documentation still matters here: `EXPORT_ES6` requires `MODULARIZE`, and `.mjs` output suffixes imply `EXPORT_ES6`. That is useful context when debugging Emscripten output naming, but this repository's fresh path is to emit `ffmpeg-core.js` and `ffmpeg-core.worker.js` directly and fail fast if that contract changes.

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

The update from `FFmpeg n7.1` to `n8.0` exposed one confirmed incompatibility and one build-system maintenance lesson:

1. `FFmpeg configure` no longer accepts `--disable-postproc`.
2. The final browser-targeted link should follow FFmpeg's generated `fftools/Makefile`, not a repository-local handwritten `fftools/*.o` list.

There is also a follow-up warning during `configure`:

- `WARNING: Disabled libvpx_vp9_encoder because`

That warning did not block `make`, but it is still worth verifying with `ffbuild/config.log` and the generated `config.h` / `config_components.h` before treating the encoder path as fully settled.

## Fresh Documentation Cross-Check

The current conclusions above were checked against recent official documentation and upstream sources:

- Emscripten "Building Projects":
  https://emscripten.org/docs/compiling/Building-Projects.html
  This explicitly recommends `emconfigure ./configure`, `emmake make`, and then a final `emcc ... -o project.js` step when the build system itself does not emit the desired JS/WASM launcher shape.
- Emscripten settings reference:
  https://emscripten.org/docs/tools_reference/settings_reference.html
  `EXPORT_ES6` requires `MODULARIZE` and is implicitly enabled for `.mjs` output suffixes, which explains the worker naming difference.
- FFmpeg upstream source:
  in the local `n8.0` checkout, `build/ffmpeg/fftools/Makefile` remains the authoritative source for `OBJS-ffmpeg`, and `build/ffmpeg/Makefile` links `%_g` executables from `$(OBJS-$*)`.
- FFmpeg upstream mailing list:
  https://ffmpeg.org/pipermail/ffmpeg-devel/2025-May/343193.html
  The removal of `libpostproc` explains why `--disable-postproc` is no longer a safe configure flag assumption on the modern baseline.

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

For an isolated verification run using throwaway paths:

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
- the final link still remains repository-owned because the runtime contract needs `MODULARIZE`, `EXPORT_ES6`, `EXPORT_NAME=createFFmpegCore`, and the package-specific asset names
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

The current local baseline is materially healthier than the earlier notes suggest.

The practical rule is:

use Emscripten end-to-end, treat FFmpeg's generated makefiles as the source of truth for the `ffmpeg` object graph, and keep the repository-specific final packaging step only for runtime-contract differences such as `MODULARIZE`, `EXPORT_NAME`, and worker filename normalization.
