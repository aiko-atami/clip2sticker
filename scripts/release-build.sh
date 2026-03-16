#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
WORK_DIR=${WORK_DIR:-"$ROOT_DIR/build"}
DIST_DIR=${DIST_DIR:-"$ROOT_DIR/dist"}
FFMPEG_REF=${FFMPEG_REF:-n8.0}
LIBVPX_REF=${LIBVPX_REF:-v1.16.0}

mkdir -p "$WORK_DIR" "$DIST_DIR"

refresh_checkout() {
  local repo_url=$1
  local repo_ref=$2
  local repo_dir=$3

  if [[ ! -d "$repo_dir/.git" ]]; then
    rm -rf "$repo_dir"
    git clone --depth 1 --branch "$repo_ref" "$repo_url" "$repo_dir"
    return
  fi

  git -C "$repo_dir" fetch --depth 1 origin "$repo_ref"
  git -C "$repo_dir" checkout --force FETCH_HEAD
  git -C "$repo_dir" clean -fdx
}

refresh_checkout "https://chromium.googlesource.com/webm/libvpx" "$LIBVPX_REF" "$WORK_DIR/libvpx"
refresh_checkout "https://github.com/FFmpeg/FFmpeg.git" "$FFMPEG_REF" "$WORK_DIR/ffmpeg"

env -u DIST_DIR "$ROOT_DIR/scripts/build-libvpx.sh" "$WORK_DIR/libvpx" "$WORK_DIR/prefix"
"$ROOT_DIR/scripts/build-ffmpeg.sh" "$WORK_DIR/ffmpeg" "$WORK_DIR/prefix" "$DIST_DIR"

RELEASE_VERSION=${RELEASE_VERSION:-dev} \
FFMPEG_REF="$FFMPEG_REF" \
LIBVPX_REF="$LIBVPX_REF" \
EMSCRIPTEN_VERSION=${EMSCRIPTEN_VERSION:-unknown} \
node "$ROOT_DIR/scripts/generate-manifest.mjs" "$DIST_DIR"

node "$ROOT_DIR/scripts/package-release.mjs" "$DIST_DIR"
