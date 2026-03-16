#!/usr/bin/env bash
set -euo pipefail

if [[ $# -gt 0 ]]; then
  exec "$@"
fi

WORKSPACE_DIR=${WORKSPACE_DIR:-/workspace}
cd "$WORKSPACE_DIR"

exec make release
