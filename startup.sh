#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -d node_modules ]; then
  npm install
fi

npm install three @react-three/fiber @react-three/drei @types/three --save 2>/dev/null || true

exec npm run dev
