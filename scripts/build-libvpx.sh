#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "usage: $0 <source-dir> <prefix-dir>" >&2
  exit 1
fi

SOURCE_DIR=$1
PREFIX_DIR=$2

COMMON_CFLAGS="-O3 -fPIC -pthread"
COMMON_LDFLAGS="-O3 -fPIC -pthread -sUSE_PTHREADS=1"

export CC=emcc
export CXX=em++
export AR=emar
export AS=llvm-as
export LD=emcc
export RANLIB=emranlib
export NM=emnm
export STRIP=emstrip
export CFLAGS="$COMMON_CFLAGS"
export CXXFLAGS="$COMMON_CFLAGS"
export LDFLAGS="$COMMON_LDFLAGS"

cd "$SOURCE_DIR"

./configure \
  --target=generic-gnu \
  --prefix="$PREFIX_DIR" \
  --enable-static \
  --enable-pic \
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
  --disable-vp9-decoder \
  --extra-cflags="$COMMON_CFLAGS" \
  --extra-cxxflags="$COMMON_CFLAGS" \
  --extra-ldflags="$COMMON_LDFLAGS"

emmake make -j"$(nproc)"
emmake make install
