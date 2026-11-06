# VPS deployment from GitHub (automatic updates and rollback)

A merge to `main` builds the site on GitHub and deploys it to your VPS. If a release is unhealthy it is undone automatically; if you
find a problem later you can go back to an earlier release in seconds. Everything here is in `.github/workflows/deploy.yml` and `deploy/vps/`.

## How it works

```
merge to main ──► GitHub builds (type check + build) ──► uploads release to the VPS ──► deploy.sh:
   unpack ► install ► back up database ► switch "current" link ► reload the app ► health check
                                                   │                                     │ fails
                                                   └─────── healthy: done ◄──────────────┴─► previous release put back
```

On the server:

```
/srv/ooa/
  releases/<commit>/    each deployed version (the last 5 are kept)
  current  ->  releases/<commit>      the version that is live
  shared/.env           the live settings (outside git, outside releases)
  backups/              database dumps (the last 14)
  bin/                  deploy.sh, rollback.sh, backup-db.sh
```

## One-time setup

1. **Buy the VPS** (Ubuntu 22.04 or 24.04, 2 vCPU and 8 GB RAM is comfortable). Log in as root.
2. **Make a deployment key** on your own computer (not on the server):
   `ssh-keygen -t ed25519 -f ooa-deploy -C "github-deploy" -N ""`
   This creates `ooa-deploy` (private) and `ooa-deploy.pub` (public).
3. **Provision the server** as root:
   ```bash
   git clone https://github.com/OneOfficeautomation-Private-Limited/OneOfficeAutomation-Website
   cd OneOfficeAutomation-Website/deploy/vps
   sudo bash setup-server.sh "$(cat /path/to/ooa-deploy.pub)" oneofficeautomation.com
   ```
   (Paste the public key text if the file is not on the server.) It installs Node 20, MySQL, Nginx, Certbot and PM2, creates the
   database and the `deploy` user, opens only SSH/HTTP/HTTPS, schedules a nightly backup and writes `/srv/ooa/shared/.env` with
   generated secrets.
4. **DNS:** point `oneofficeautomation.com` and `www` at the server's IP address. If you use Cloudflare, add the records there.
5. **HTTPS:** `certbot --nginx -d oneofficeautomation.com -d www.oneofficeautomation.com`
   (With Cloudflare, set SSL/TLS mode to **Full (strict)** once the certificate is in place.)
6. **GitHub secrets** (repository → Settings → Secrets and variables → Actions → New repository secret):

   | Secret | Value |
   |---|---|
   | `VPS_HOST` | the server's IP address or hostname |
   | `VPS_USER` | `deploy` |
   | `VPS_SSH_KEY` | the full text of the private key file `ooa-deploy` |
   | `VPS_KNOWN_HOSTS` | the output of `ssh-keyscan -p 22 <VPS_HOST>` run on your computer |
   | `VPS_PORT` | optional, only if SSH is not on port 22 |

7. **Production environment** (Settings → Environments → New environment → `production`): optionally add **Required reviewers**, so
   every deployment waits for someone's approval.
8. **Protect `main`** (Settings → Branches → Add rule for `main`): require a pull request, require the **CI** check to pass, and
   block force pushes. Then nothing reaches the live site without a reviewed, passing change.
9. **Email and admin:** on the server, as `deploy`, edit `/srv/ooa/shared/.env`: fill in the SMTP lines, then `pm2 reload ooa --update-env`
   (after the first deployment). Your first admin is created at `/admin` with the `ADMIN_SETUP_TOKEN` from that file.
10. **First deployment:** GitHub → Actions → **Deploy to VPS** → Run workflow → `deploy`. After that every merge to `main` deploys by itself.
11. **Harden SSH** once you have confirmed that `ssh deploy@<server>` works with your key: set `PasswordAuthentication no` and
    `PermitRootLogin no` in `/etc/ssh/sshd_config`, then `systemctl restart ssh`.

Check a deployment: `https://oneofficeautomation.com/api/health` returns `{"ok":true}`. Logs: `pm2 logs ooa`.

## Rolling back

- **A release fails its health check:** nothing to do. `deploy.sh` puts the previous release back and the workflow shows red.
- **A bad release is live:** GitHub → Actions → **Deploy to VPS** → Run workflow → `rollback`. Leave "release" empty for the previous
  version, or enter a commit id from `ls /srv/ooa/releases` to go to a specific one. It takes seconds.
- **On the server directly:** `/srv/ooa/bin/rollback.sh` (or `/srv/ooa/bin/rollback.sh <commit>`).
- **Make it permanent:** after a rollback, `git revert` the bad commit on `main` (through a pull request), so the next deployment
  does not bring the problem back.

## The database and rollbacks

Rolling back changes the code, not the database. The app creates missing tables itself, so to keep rollbacks safe:

- Make database changes **additive** (new tables or columns, never renaming or deleting in the same release), so older code still works.
- A backup is taken before every deployment (`/srv/ooa/backups/<time>-pre-<commit>.sql.gz`). To restore one:
  `gunzip -c /srv/ooa/backups/<file>.sql.gz | mysql -u ooa -p ooa` (the password is in `/srv/ooa/shared/.env`).
- Copy `/srv/ooa/backups` off the server regularly (for example with `rclone` to cloud storage, or Hostinger's VPS snapshots).
  A backup that lives only on the same server does not survive losing the server.

## Staging (recommended)

Make a second small server, or a second folder and port on the same one, with its own database and `.env`, and a copy of the workflow
that deploys a `staging` branch to it. Test there first, then merge to `main`.

## Routine care

- Security updates: `unattended-upgrades` is installed; also run `apt update && apt upgrade` monthly and reboot when asked.
- Uptime monitoring: add `/api/health` to UptimeRobot or similar, with email alerts.
- Disk: `df -h` now and then; old releases and backups are pruned automatically.
- Renew HTTPS: Certbot renews by itself; `certbot renew --dry-run` confirms it works.
