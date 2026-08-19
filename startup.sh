#!/bin/sh
set -eu
# Run from the directory containing this script (the repo root), wherever
# that is — not a hardcoded /workspace.
cd "$(dirname "$0")"
if curl -sf -o /dev/null --max-time 2 http://127.0.0.1:8080/; then
  exit 0
fi
npm run dev >>/tmp/app-startup.log 2>&1 &
