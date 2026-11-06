#!/usr/bin/env bash
# Runs on the VPS (installed at /srv/ooa/bin/deploy.sh). Activates a new release: unpack, install, back up the database,
# switch the "current" link, reload the app and check it is healthy. If it is not healthy, the previous release is put back.
# Usage: deploy.sh <release-id>     (the archive must already be at /srv/ooa/incoming/<release-id>.tgz)
set -euo pipefail

BASE=/srv/ooa
ID="${1:?release id missing}"
ARCHIVE="$BASE/incoming/$ID.tgz"
REL="$BASE/releases/$ID"
KEEP=5
PORT="${PORT:-3000}"

[ -f "$ARCHIVE" ] || { echo "Archive not found: $ARCHIVE" >&2; exit 1; }

health() {
  for _ in $(seq 1 20); do
    if curl -fsS "http://127.0.0.1:$PORT/api/health" | grep -q '"ok":true'; then return 0; fi
    sleep 2
  done
  return 1
}

echo "==> Unpacking $ID"
rm -rf "$REL"; mkdir -p "$REL"
tar -xzf "$ARCHIVE" -C "$REL"
ln -sfn "$BASE/shared/.env" "$REL/.env"      # the server reads .env from the release folder; the real file lives in shared/

echo "==> Installing production dependencies"
( cd "$REL" && npm ci --omit=dev --no-audit --no-fund )

echo "==> Backing up the database"
"$BASE/bin/backup-db.sh" "pre-$ID" || echo "WARNING: backup failed; continuing" >&2

PREVIOUS="$(readlink -f "$BASE/current" 2>/dev/null || true)"
echo "==> Switching to $ID (previous: ${PREVIOUS:-none})"
ln -sfn "$REL" "$BASE/current"
pm2 startOrReload "$BASE/ecosystem.config.cjs" --update-env

if health; then
  echo "==> Healthy. Release $ID is live."
else
  echo "!! Health check failed." >&2
  if [ -n "$PREVIOUS" ] && [ -d "$PREVIOUS" ]; then
    echo "!! Putting the previous release back: $PREVIOUS" >&2
    ln -sfn "$PREVIOUS" "$BASE/current"
    pm2 startOrReload "$BASE/ecosystem.config.cjs" --update-env
    health && echo "!! Previous release restored." >&2
  fi
  exit 1
fi

echo "==> Cleaning up old releases (keeping $KEEP)"
ls -1dt "$BASE"/releases/*/ 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm -rf
rm -f "$ARCHIVE"
