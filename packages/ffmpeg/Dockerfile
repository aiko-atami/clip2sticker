# syntax=docker/dockerfile:1.7
FROM emscripten/emsdk:5.0.2

# Install build dependencies with cached APT directories.
# docker-clean is disabled only for this layer so BuildKit can reuse package downloads.
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
  --mount=type=cache,target=/var/lib/apt,sharing=locked \
  rm -f /etc/apt/apt.conf.d/docker-clean \
  && echo 'Binary::apt::APT::Keep-Downloaded-Packages "true";' > /etc/apt/apt.conf.d/keep-cache \
  && apt-get update \
  && \
  DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    ca-certificates \
    git \
    make \
    pkg-config \
    python3 \
    xz-utils \
  && rm -f /etc/apt/apt.conf.d/keep-cache

# Copy entrypoint and set permissions in a single layer
COPY --chmod=755 scripts/container-entrypoint.sh /usr/local/bin/clip2sticker-build

WORKDIR /workspace
ENTRYPOINT ["/usr/local/bin/clip2sticker-build"]
