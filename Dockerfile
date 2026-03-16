FROM emscripten/emsdk:5.0.2

RUN apt-get update \
  && apt-get install -y --no-install-recommends git ca-certificates xz-utils make python3 pkg-config \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace
