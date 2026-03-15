#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 3 ]]; then
  echo "usage: $0 <source-dir> <prefix-dir> <output-dir>" >&2
  exit 1
fi

SOURCE_DIR=$1
PREFIX_DIR=$2
OUTPUT_DIR=$3

export PKG_CONFIG_PATH="$PREFIX_DIR/lib/pkgconfig"
export CC=emcc
export CXX=em++
export AR=emar
export RANLIB=emranlib
export NM=emnm

mkdir -p "$OUTPUT_DIR"
cd "$SOURCE_DIR"

emconfigure ./configure \
  --enable-cross-compile \
  --target-os=none \
  --arch=x86_32 \
  --prefix="$OUTPUT_DIR" \
  --cc=emcc \
  --cxx=em++ \
  --ar=emar \
  --ranlib=emranlib \
  --nm=emnm \
  --extra-cflags="-O3 -msimd128 -pthread -I$PREFIX_DIR/include" \
  --extra-cxxflags="-O3 -msimd128 -pthread -I$PREFIX_DIR/include" \
  --extra-ldflags="-O3 -msimd128 -pthread -L$PREFIX_DIR/lib" \
  --pkg-config-flags="--static" \
  --disable-everything \
  --disable-autodetect \
  --disable-doc \
  --disable-debug \
  --disable-network \
  --disable-programs \
  --enable-ffmpeg \
  --disable-ffplay \
  --disable-ffprobe \
  --disable-avdevice \
  --disable-postproc \
  --disable-swresample \
  --disable-swscale-alpha \
  --disable-bsfs \
  --disable-hwaccels \
  --disable-devices \
  --disable-protocols \
  --enable-protocol=file \
  --disable-muxers \
  --enable-muxer=webm \
  --disable-demuxers \
  --enable-demuxer=mov \
  --disable-parsers \
  --enable-parser=h264 \
  --enable-parser=hevc \
  --disable-decoders \
  --enable-decoder=h264 \
  --enable-decoder=hevc \
  --disable-encoders \
  --enable-encoder=libvpx-vp9 \
  --disable-filters \
  --enable-filter=fps \
  --enable-filter=scale \
  --enable-filter=crop \
  --enable-filter=pad \
  --enable-filter=format \
  --enable-filter=setpts \
  --enable-filter=setsar \
  --enable-filter=alphamerge \
  --enable-libvpx

emmake make -j"$(nproc)"

emcc \
  -O3 \
  -msimd128 \
  -pthread \
  -s USE_PTHREADS=1 \
  -s MODULARIZE=1 \
  -s EXPORT_ES6=1 \
  -s ENVIRONMENT=web,worker \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s INITIAL_MEMORY=268435456 \
  -s EXPORTED_RUNTIME_METHODS=FS,callMain \
  -s EXPORT_NAME=createFFmpegCore \
  -o "$OUTPUT_DIR/ffmpeg-core.js" \
  fftools/ffmpeg.c \
  fftools/cmdutils.c \
  fftools/opt_common.c \
  fftools/ffmpeg_opt.c \
  fftools/ffmpeg_filter.c \
  fftools/ffmpeg_hw.c \
  fftools/ffmpeg_mux_init.c \
  fftools/ffmpeg_demux.c \
  fftools/ffmpeg_dec.c \
  fftools/ffmpeg_enc.c \
  fftools/ffmpeg_sched.c \
  fftools/sync_queue.c \
  -I. \
  -L"$PREFIX_DIR/lib" \
  libavcodec/libavcodec.a \
  libavformat/libavformat.a \
  libavfilter/libavfilter.a \
  libavutil/libavutil.a \
  libswscale/libswscale.a \
  "$PREFIX_DIR/lib/libvpx.a"
