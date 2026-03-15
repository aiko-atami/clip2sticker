#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
WORK_DIR=${WORK_DIR:-"$ROOT_DIR/build"}
DIST_DIR=${DIST_DIR:-"$ROOT_DIR/dist"}
FFMPEG_REF=${FFMPEG_REF:-n7.1}
LIBVPX_REF=${LIBVPX_REF:-v1.14.1}

mkdir -p "$WORK_DIR" "$DIST_DIR"

if [[ ! -d "$WORK_DIR/libvpx" ]]; then
  git clone --depth 1 --branch "$LIBVPX_REF" https://chromium.googlesource.com/webm/libvpx "$WORK_DIR/libvpx"
fi

if [[ ! -d "$WORK_DIR/ffmpeg" ]]; then
  git clone --depth 1 --branch "$FFMPEG_REF" https://github.com/FFmpeg/FFmpeg.git "$WORK_DIR/ffmpeg"
fi

"$ROOT_DIR/scripts/build-libvpx.sh" "$WORK_DIR/libvpx" "$WORK_DIR/prefix"
"$ROOT_DIR/scripts/build-ffmpeg.sh" "$WORK_DIR/ffmpeg" "$WORK_DIR/prefix" "$DIST_DIR"

RELEASE_VERSION=${RELEASE_VERSION:-dev} \
FFMPEG_REF="$FFMPEG_REF" \
LIBVPX_REF="$LIBVPX_REF" \
EMSCRIPTEN_VERSION=${EMSCRIPTEN_VERSION:-unknown} \
node "$ROOT_DIR/scripts/generate-manifest.mjs" "$DIST_DIR"

node "$ROOT_DIR/scripts/package-release.mjs" "$DIST_DIR"

