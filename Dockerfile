FROM emscripten/emsdk:5.0.2

RUN apt-get update \
  && apt-get install -y --no-install-recommends git ca-certificates xz-utils make python3 pkg-config \
  && rm -rf /var/lib/apt/lists/*

COPY scripts/container-entrypoint.sh /usr/local/bin/clip2sticker-build
RUN chmod +x /usr/local/bin/clip2sticker-build

WORKDIR /workspace
ENTRYPOINT ["/usr/local/bin/clip2sticker-build"]
