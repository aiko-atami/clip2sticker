#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "usage: $0 <source-dir> <prefix-dir>" >&2
  exit 1
fi

SOURCE_DIR=$1
PREFIX_DIR=$2

export CC=emcc
export CXX=em++
export AR=emar
export RANLIB=emranlib
export NM=emnm

cd "$SOURCE_DIR"

./configure \
  --target=generic-gnu \
  --prefix="$PREFIX_DIR" \
  --enable-static \
  --disable-shared \
  --disable-examples \
  --disable-tools \
  --disable-docs \
  --disable-unit-tests \
  --disable-install-bins \
  --disable-install-srcs \
  --disable-debug \
  --disable-gprof \
  --disable-gcov \
  --disable-libyuv \
  --disable-postproc \
  --disable-runtime-cpu-detect \
  --disable-webm-io \
  --disable-vp8 \
  --disable-vp8-encoder \
  --disable-vp8-decoder \
  --disable-vp9-decoder

emmake make -j"$(nproc)"
emmake make install

