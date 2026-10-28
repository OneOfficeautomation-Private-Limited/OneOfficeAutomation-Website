// One command to test everything locally: npm run local
// 1) creates .env if it is missing  2) builds the site and server  3) starts it (the server creates the database tables)
import { copyFileSync, existsSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const opts = { stdio: 'inherit', shell: process.platform === 'win32' };

if (!existsSync('.env')) {
  copyFileSync('.env.example', '.env');
  console.log('Created .env from .env.example (edit the DB_ settings if your local MySQL is different)');
}

console.log('\nBuilding the site...');
const build = spawnSync(npm, ['run', 'build'], opts);
if (build.status !== 0) process.exit(build.status ?? 1);

console.log('\nStarting the site. When it is ready, open http://localhost:3000\n');
const server = spawn(npm, ['start'], opts);
server.on('exit', (code) => process.exit(code ?? 0));
