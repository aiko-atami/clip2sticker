FROM emscripten/emsdk:3.1.67

RUN apt-get update \
  && apt-get install -y --no-install-recommends git ca-certificates xz-utils make python3 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

