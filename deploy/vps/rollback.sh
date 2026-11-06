#!/usr/bin/env bash
# Runs on the VPS (installed at /srv/ooa/bin/rollback.sh). Goes back to an earlier release in seconds.
# Usage: rollback.sh [release-id]      (no id = the release before the current one; "ls /srv/ooa/releases" lists them)
set -euo pipefail

BASE=/srv/ooa
PORT="${PORT:-3000}"
CURRENT="$(readlink -f "$BASE/current")"

if [ -n "${1:-}" ]; then
  TARGET="$BASE/releases/$1"
else
  # Releases newest first; the one after the current is the previous.
  TARGET="$(ls -1dt "$BASE"/releases/*/ | sed 's:/$::' | grep -vxF "$CURRENT" | head -n 1 || true)"
fi

[ -n "$TARGET" ] && [ -d "$TARGET" ] || { echo "No release to roll back to." >&2; exit 1; }
[ "$(readlink -f "$TARGET")" != "$CURRENT" ] || { echo "That release is already live." >&2; exit 1; }

echo "==> Rolling back: $CURRENT  ->  $TARGET"
ln -sfn "$TARGET" "$BASE/current"
pm2 startOrReload "$BASE/ecosystem.config.cjs" --update-env

for _ in $(seq 1 20); do
  if curl -fsS "http://127.0.0.1:$PORT/api/health" | grep -q '"ok":true'; then echo "==> Healthy. Rolled back to $(basename "$TARGET")."; exit 0; fi
  sleep 2
done
echo "!! The rolled-back release did not become healthy. Check: pm2 logs ooa" >&2
exit 1
