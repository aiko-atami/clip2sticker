FROM emscripten/emsdk:4.0.22

RUN apt-get update \
  && apt-get install -y --no-install-recommends git ca-certificates xz-utils make python3 pkg-config \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace
