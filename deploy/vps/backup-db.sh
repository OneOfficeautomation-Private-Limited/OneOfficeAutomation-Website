#!/usr/bin/env bash
# Runs on the VPS (installed at /srv/ooa/bin/backup-db.sh). Dumps the database to /srv/ooa/backups and keeps the newest 14.
# Used before every deployment and by the nightly cron job. Copy /srv/ooa/backups off the server too (see the guide).
# Usage: backup-db.sh [label]
set -euo pipefail

BASE=/srv/ooa
LABEL="${1:-nightly}"
OUT="$BASE/backups"
mkdir -p "$OUT"; chmod 700 "$OUT"

get() { grep -E "^\s*$1\s*=" "$BASE/shared/.env" | tail -n 1 | sed -E "s/^[^=]*=\s*//; s/\s+$//; s/^['\"]//; s/['\"]$//"; }
DB_HOST="$(get DB_HOST)"; DB_PORT="$(get DB_PORT)"; DB_NAME="$(get DB_NAME)"; DB_USER="$(get DB_USER)"; DB_PASSWORD="$(get DB_PASSWORD)"

FILE="$OUT/$(date -u +%Y%m%dT%H%M%SZ)-$LABEL.sql.gz"
MYSQL_PWD="$DB_PASSWORD" mysqldump --single-transaction --routines -h "${DB_HOST:-127.0.0.1}" -P "${DB_PORT:-3306}" -u "$DB_USER" "$DB_NAME" | gzip > "$FILE"
chmod 600 "$FILE"
echo "Backup written: $FILE"

ls -1t "$OUT"/*.sql.gz 2>/dev/null | tail -n +15 | xargs -r rm -f
