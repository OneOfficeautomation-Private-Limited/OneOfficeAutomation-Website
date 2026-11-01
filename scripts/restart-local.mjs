// One command for local testing: stops whatever is using the site's port, then builds and starts the site.
//   npm run restart              stop anything on the port (PORT in .env, or 3000), then start
//   npm run restart -- --fresh   also empty the local database first, so the sample users are created again
//   npm run stop                 only stop it
import { execSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const env = existsSync('.env') ? readFileSync('.env', 'utf8') : '';
const port = (env.match(/^\s*PORT\s*=\s*(\d+)/m) ?? [])[1] ?? '3000';
const win = process.platform === 'win32';

/** The process ids listening on the port. */
function listeners() {
  try {
    if (win) {
      const out = execSync('netstat -ano -p tcp', { encoding: 'utf8' });
      return [...new Set(out.split(/\r?\n/).filter((l) => /LISTENING/i.test(l) && new RegExp(`:${port}\\s`).test(l)).map((l) => l.trim().split(/\s+/).pop()).filter((p) => /^\d+$/.test(p) && p !== '0'))];
    }
    return execSync(`lsof -ti tcp:${port} -sTCP:LISTEN`, { encoding: 'utf8' }).split(/\s+/).filter(Boolean);
  } catch { return []; }
}

const pids = listeners();
if (!pids.length) console.log(`Port ${port} is free.`);
for (const pid of pids) {
  try {
    if (win) execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' }); else process.kill(Number(pid), 'SIGTERM');
    console.log(`Stopped the program using port ${port} (process ${pid}).`);
  } catch {
    console.error(`Couldn't stop process ${pid} on port ${port}. It was probably started as administrator: run this terminal as administrator, or restart the computer.`);
    process.exit(1);
  }
}
if (process.argv.includes('--stop-only')) process.exit(0);
// Give Windows a moment to release the port.
await new Promise((r) => setTimeout(r, 800));

if (process.argv.includes('--fresh')) {
  const r = spawnSync(process.execPath, ['scripts/reset-local.mjs'], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
const r = spawnSync(process.execPath, ['scripts/local.mjs'], { stdio: 'inherit' });
process.exit(r.status ?? 0);
