#!/usr/bin/env bash
# Download the Piper TTS voice model (~60 MB).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODELS="$ROOT/models"
mkdir -p "$MODELS"

BASE="https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium"

for f in en_US-lessac-medium.onnx en_US-lessac-medium.onnx.json; do
  if [ -f "$MODELS/$f" ]; then
    echo "Already present: $f"
    continue
  fi
  echo "Downloading $f..."
  curl -L --fail -o "$MODELS/$f" "$BASE/$f"
done

echo "Done. Voice files in: $MODELS"
