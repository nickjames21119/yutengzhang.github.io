#!/usr/bin/env sh
set -eu
cd "$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)"
if command -v python3 >/dev/null 2>&1; then
  exec python3 scripts/serve.py --open
elif command -v python >/dev/null 2>&1; then
  exec python scripts/serve.py --open
else
  printf '%s\n' 'Python 3.10+ was not found. Install Python, then run this script to enable the 3D modules.'
  exit 1
fi
