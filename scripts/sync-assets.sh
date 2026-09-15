#!/usr/bin/env bash
# Kopiert die Web-Quellen aus dem Repo-Root in die Android-Assets.
# Nach jeder Änderung an fitX.js / index.html / splash.png ausführen.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ASSETS="$ROOT/android/app/src/main/assets"
RES="$ROOT/android/app/src/main/res/drawable-nodpi"

mkdir -p "$ASSETS" "$RES"

for f in fitX.js index.html splash.png; do
  if [ ! -f "$ROOT/$f" ]; then
    echo "Quelle fehlt: $ROOT/$f" >&2
    exit 1
  fi
  cp -f "$ROOT/$f" "$ASSETS/$f"
  echo "-> $f -> $ASSETS"
done

cp -f "$ROOT/splash.png" "$RES/splash.png"
echo "-> splash.png -> $RES"
echo "Asset-Sync abgeschlossen."
