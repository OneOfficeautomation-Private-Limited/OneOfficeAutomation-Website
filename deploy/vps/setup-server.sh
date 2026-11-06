#!/usr/bin/env bash
# One-time setup of a fresh Ubuntu 22.04 / 24.04 VPS. Run it as root from a copy of this folder:
#   git clone https://github.com/OneOfficeautomation-Private-Limited/OneOfficeAutomation-Website && cd OneOfficeAutomation-Website/deploy/vps
#   sudo bash setup-server.sh "<the deploy user's SSH public key>" oneofficeautomation.com
# Read it first; it installs software, opens the firewall and creates the database and the folders the deployments use.
# It prints no passwords: the generated secrets are written to /srv/ooa/shared/.env (readable only by the deploy user).
set -euo pipefail

PUBKEY="${1:?Usage: setup-server.sh \"<ssh public key for GitHub deployments>\" <domain>}"
DOMAIN="${2:?Usage: setup-server.sh \"<ssh public key>\" <domain>}"
HERE="$(cd "$(dirname "$0")" && pwd)"
BASE=/srv/ooa
APPUSER=deploy
DBNAME=ooa
DBUSER=ooa

[ "$(id -u)" = 0 ] || { echo "Run as root (sudo)." >&2; exit 1; }
export DEBIAN_FRONTEND=noninteractive

echo "==> Updating the system and installing packages"
apt-get update -y && apt-get upgrade -y
apt-get install -y curl ca-certificates gnupg ufw fail2ban nginx mysql-server certbot python3-certbot-nginx unattended-upgrades

echo "==> Installing Node.js 20 and PM2"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
npm install -g pm2

echo "==> Creating the deploy user"
id "$APPUSER" >/dev/null 2>&1 || adduser --disabled-password --gecos "" "$APPUSER"
install -d -m 700 -o "$APPUSER" -g "$APPUSER" "/home/$APPUSER/.ssh"
echo "$PUBKEY" > "/home/$APPUSER/.ssh/authorized_keys"
chown "$APPUSER:$APPUSER" "/home/$APPUSER/.ssh/authorized_keys"; chmod 600 "/home/$APPUSER/.ssh/authorized_keys"

echo "==> Creating folders and installing the deployment scripts"
install -d -o "$APPUSER" -g "$APPUSER" "$BASE" "$BASE/releases" "$BASE/incoming" "$BASE/shared" "$BASE/backups" "$BASE/bin"
install -m 755 -o "$APPUSER" -g "$APPUSER" "$HERE/deploy.sh" "$HERE/rollback.sh" "$HERE/backup-db.sh" "$BASE/bin/"
install -m 644 -o "$APPUSER" -g "$APPUSER" "$HERE/ecosystem.config.cjs" "$BASE/ecosystem.config.cjs"

echo "==> Creating the database and the app's settings file"
DBPASS="$(openssl rand -hex 24)"
mysql -e "CREATE DATABASE IF NOT EXISTS \`$DBNAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -e "CREATE USER IF NOT EXISTS '$DBUSER'@'localhost' IDENTIFIED BY '$DBPASS'; ALTER USER '$DBUSER'@'localhost' IDENTIFIED BY '$DBPASS'; GRANT ALL ON \`$DBNAME\`.* TO '$DBUSER'@'localhost'; FLUSH PRIVILEGES;"
if [ ! -f "$BASE/shared/.env" ]; then
  cat > "$BASE/shared/.env" <<EOF
# Settings for the live site. Only the deploy user can read this file. Never commit it.
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=$DBNAME
DB_USER=$DBUSER
DB_PASSWORD=$DBPASS
JWT_SECRET=$(openssl rand -hex 48)
ADMIN_SETUP_TOKEN=$(openssl rand -hex 24)
SITE_URL=https://$DOMAIN

# Email (fill these in, then: pm2 reload ooa --update-env). Without them, no email is sent.
# SMTP_HOST=
# SMTP_PORT=587
# SMTP_USER=
# SMTP_PASS=
# Sign in with Google / GitHub (see docs/deployment/OAUTH-SETUP.md)
# GOOGLE_CLIENT_ID=
# GOOGLE_CLIENT_SECRET=
# GITHUB_CLIENT_ID=
# GITHUB_CLIENT_SECRET=

# MAIL_FROM=OneOfficeAutomation <no-reply@$DOMAIN>
# NOTIFY_EMAIL=sales@$DOMAIN
EOF
  chown "$APPUSER:$APPUSER" "$BASE/shared/.env"; chmod 600 "$BASE/shared/.env"
fi

echo "==> Nginx"
sed "s/oneofficeautomation\.com/$DOMAIN/g" "$HERE/nginx-ooa.conf" > /etc/nginx/sites-available/ooa
ln -sfn /etc/nginx/sites-available/ooa /etc/nginx/sites-enabled/ooa
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo "==> Firewall (SSH, HTTP, HTTPS only)"
ufw allow OpenSSH && ufw allow 'Nginx Full'
ufw --force enable

echo "==> Start on reboot and nightly database backup"
su - "$APPUSER" -c "pm2 startup systemd -u $APPUSER --hp /home/$APPUSER" | tail -n 1 | bash || true
( crontab -u "$APPUSER" -l 2>/dev/null | grep -v backup-db.sh; echo "30 2 * * * $BASE/bin/backup-db.sh nightly >> $BASE/backups/cron.log 2>&1" ) | crontab -u "$APPUSER" -

cat <<EOF

Server is ready. Next:
  1. Point $DOMAIN (and www) DNS at this server's IP address.
  2. Get the HTTPS certificate:   certbot --nginx -d $DOMAIN -d www.$DOMAIN
  3. Add the GitHub secrets and run the first deployment (see docs/deployment/VPS-GITHUB-DEPLOY.md).
  4. Read /srv/ooa/shared/.env as the deploy user to find your ADMIN_SETUP_TOKEN, and add the SMTP settings.
  5. Harden SSH: set PasswordAuthentication no and PermitRootLogin no in /etc/ssh/sshd_config, then restart ssh
     (only after you have confirmed you can log in as "$APPUSER" with your key).
EOF
