SHELL := /bin/bash
.SHELLFLAGS := -euo pipefail -c
.ONESHELL:

ROOT_DIR := $(abspath $(dir $(lastword $(MAKEFILE_LIST))))
WORK_DIR ?= $(ROOT_DIR)/build
DIST_DIR ?= $(ROOT_DIR)/dist
PREFIX_DIR := $(WORK_DIR)/prefix
FFMPEG_DIR := $(WORK_DIR)/ffmpeg
LIBVPX_DIR := $(WORK_DIR)/libvpx

FFMPEG_REF ?= n8.0
LIBVPX_REF ?= v1.16.0
EMSCRIPTEN_VERSION ?= 5.0.2
DOCKER_IMAGE ?= clip2sticker-core-build:emsdk-$(EMSCRIPTEN_VERSION)

FFMPEG_COMMON_CFLAGS := -O3 -msimd128 -pthread
FFMPEG_COMMON_LDFLAGS := -O3 -msimd128 -pthread -sUSE_PTHREADS=1
LIBVPX_COMMON_CFLAGS := -O3 -fPIC -pthread
LIBVPX_COMMON_LDFLAGS := -O3 -fPIC -pthread -sUSE_PTHREADS=1

.NOTPARALLEL: release clean clean-dist refresh-sources build-libvpx build-ffmpeg manifest package-release
.PHONY: test build-image docker-release release clean clean-dist refresh-sources build-libvpx build-ffmpeg manifest package-release

define refresh_checkout
refresh_checkout() { \
  local repo_url="$$1"; \
  local repo_ref="$$2"; \
  local repo_dir="$$3"; \
  if [[ ! -d "$$repo_dir/.git" ]]; then \
    rm -rf "$$repo_dir"; \
    git clone --depth 1 --branch "$$repo_ref" "$$repo_url" "$$repo_dir"; \
    return; \
  fi; \
  git -C "$$repo_dir" fetch --depth 1 origin "$$repo_ref"; \
  git -C "$$repo_dir" checkout --force FETCH_HEAD; \
  git -C "$$repo_dir" clean -fdx; \
}; \
refresh_checkout "$(1)" "$(2)" "$(3)"
endef

test:
	npm test

build-image:
	docker build --tag "$(DOCKER_IMAGE)" .

docker-release: $(if $(SKIP_DOCKER_BUILD),,build-image)
	docker run --rm \
		--user "$$(id -u):$$(id -g)" \
		-e RELEASE_VERSION="$${RELEASE_VERSION:-dev}" \
		-e FFMPEG_REF="$(FFMPEG_REF)" \
		-e LIBVPX_REF="$(LIBVPX_REF)" \
		-e EMSCRIPTEN_VERSION="$(EMSCRIPTEN_VERSION)" \
		-v "$(ROOT_DIR):/workspace" \
		-w /workspace \
		"$(DOCKER_IMAGE)"

release: package-release

clean:
	rm -rf "$(WORK_DIR)" "$(DIST_DIR)"

clean-dist:
	rm -rf "$(DIST_DIR)" "$(PREFIX_DIR)"
	mkdir -p "$(DIST_DIR)" "$(PREFIX_DIR)"

refresh-sources:
	mkdir -p "$(WORK_DIR)"
	@$(call refresh_checkout,https://chromium.googlesource.com/webm/libvpx,$(LIBVPX_REF),$(LIBVPX_DIR))
	@$(call refresh_checkout,https://github.com/FFmpeg/FFmpeg.git,$(FFMPEG_REF),$(FFMPEG_DIR))

build-libvpx: refresh-sources clean-dist
	cd "$(LIBVPX_DIR)"
	export CC=emcc
	export CXX=em++
	export AR=emar
	export AS=llvm-as
	export LD=emcc
	export RANLIB=emranlib
	export NM=emnm
	export STRIP=emstrip
	export CFLAGS="$(LIBVPX_COMMON_CFLAGS)"
	export CXXFLAGS="$(LIBVPX_COMMON_CFLAGS)"
	export LDFLAGS="$(LIBVPX_COMMON_LDFLAGS)"
	./configure \
		--target=generic-gnu \
		--prefix="$(PREFIX_DIR)" \
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
		--disable-vp9-decoder
	emmake make -j"$$(nproc)"
	emmake make install

build-ffmpeg: build-libvpx
	cd "$(FFMPEG_DIR)"
	export PKG_CONFIG_PATH="$(PREFIX_DIR)/lib/pkgconfig"
	export CC=emcc
	export CXX=em++
	export AR=emar
	export RANLIB=emranlib
	export NM=emnm
	export STRIP=emstrip
	export CFLAGS="$(FFMPEG_COMMON_CFLAGS)"
	export CXXFLAGS="$(FFMPEG_COMMON_CFLAGS)"
	export LDFLAGS="$(FFMPEG_COMMON_LDFLAGS)"
	PKG_CONFIG_BIN="$${PKG_CONFIG:-pkg-config}"
	if ! command -v "$$PKG_CONFIG_BIN" >/dev/null 2>&1; then PKG_CONFIG_BIN="$(ROOT_DIR)/scripts/pkg-config-lite.mjs"; fi
	emconfigure ./configure \
		--enable-cross-compile \
		--target-os=none \
		--arch=x86_32 \
		--prefix="$(DIST_DIR)" \
		--cc=emcc \
		--cxx=em++ \
		--ar=emar \
		--ranlib=emranlib \
		--nm=emnm \
		--extra-cflags="$(FFMPEG_COMMON_CFLAGS) -I$(PREFIX_DIR)/include" \
		--extra-cxxflags="$(FFMPEG_COMMON_CFLAGS) -I$(PREFIX_DIR)/include" \
		--extra-ldflags="$(FFMPEG_COMMON_LDFLAGS) -L$(PREFIX_DIR)/lib" \
		--pkg-config="$$PKG_CONFIG_BIN" \
		--pkg-config-flags="--static" \
		--disable-everything \
		--disable-autodetect \
		--disable-doc \
		--disable-debug \
		--disable-stripping \
		--disable-network \
		--disable-ffplay \
		--disable-ffprobe \
		--disable-avdevice \
		--disable-swresample \
		--disable-swscale-alpha \
		--disable-bsfs \
		--disable-hwaccels \
		--disable-devices \
		--disable-protocols \
		--enable-protocol=file \
		--disable-asm \
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
		--enable-encoder=libvpx_vp9 \
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
	emmake make -j"$$(nproc)"
	mapfile -t FFMPEG_OBJECTS < <(node "$(ROOT_DIR)/scripts/resolve-ffmpeg-objs.mjs" "$(FFMPEG_DIR)/fftools/Makefile")
	if [[ "$${#FFMPEG_OBJECTS[@]}" -eq 0 ]]; then echo "failed to resolve FFmpeg object list from fftools/Makefile" >&2; exit 1; fi
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
		-o "$(DIST_DIR)/ffmpeg-core.js" \
		"$${FFMPEG_OBJECTS[@]}" \
		-L"$(PREFIX_DIR)/lib" \
		libavcodec/libavcodec.a \
		libavformat/libavformat.a \
		libavfilter/libavfilter.a \
		libswscale/libswscale.a \
		libavutil/libavutil.a \
		"$(PREFIX_DIR)/lib/libvpx.a"
	test -f "$(DIST_DIR)/ffmpeg-core.js"
	test -f "$(DIST_DIR)/ffmpeg-core.wasm"

manifest: build-ffmpeg
	RELEASE_VERSION="$${RELEASE_VERSION:-dev}" \
	FFMPEG_REF="$(FFMPEG_REF)" \
	LIBVPX_REF="$(LIBVPX_REF)" \
	EMSCRIPTEN_VERSION="$(EMSCRIPTEN_VERSION)" \
	node "$(ROOT_DIR)/scripts/generate-manifest.mjs" "$(DIST_DIR)"

package-release: manifest
	node "$(ROOT_DIR)/scripts/package-release.mjs" "$(DIST_DIR)"
