// One command to test everything locally: npm run local
// 1) creates .env if it is missing  2) builds the site and server  3) starts it (the server creates the database tables)
import { copyFileSync, existsSync, readFileSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import mysql from 'mysql2/promise';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const opts = { stdio: 'inherit', shell: process.platform === 'win32' };

if (!existsSync('.env')) {
  copyFileSync('.env.example', '.env');
  console.log('Created .env from .env.example (edit the DB_ settings if your local MySQL is different)');
}

const envText = readFileSync('.env', 'utf8');
const getEnv = (key, fallback) => (envText.match(new RegExp(`^\\s*${key}\\s*=\\s*(.*)$`, 'm')) ?? [])[1]?.trim() ?? fallback;

const dbHost = getEnv('DB_HOST', '127.0.0.1');
const dbPort = Number(getEnv('DB_PORT', '3306'));
const dbUser = getEnv('DB_USER', 'root');
const dbPassword = getEnv('DB_PASSWORD', '');
const dbName = getEnv('DB_NAME', 'ooa');

try {
  const db = await mysql.createConnection({ host: dbHost, port: dbPort, user: dbUser, password: dbPassword });
  await db.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await db.end();
  console.log(`Database "${dbName}" is ready.`);
} catch (err) {
  console.warn(`Could not auto-create database "${dbName}" (${err.message}). Trying to start anyway...`);
}

console.log('\nBuilding the site...');
const build = spawnSync(npm, ['run', 'build'], opts);
if (build.status !== 0) process.exit(build.status ?? 1);

// The port comes from .env (PORT=…), or 3000.
const port = (readFileSync('.env', 'utf8').match(/^\s*PORT\s*=\s*(\d+)/m) ?? [])[1] ?? '3000';
const base = `http://localhost:${port}`;
console.log(`\nStarting the site. When it is ready, open ${base}\n`);
const server = spawn(npm, ['start'], opts);
server.on('exit', (code) => process.exit(code ?? 0));

// First start on an empty database: add the sample data, so every role has a login straight away.
for (let i = 0; i < 60; i++) {
  await new Promise((r) => setTimeout(r, 1000));
  const status = await fetch(`${base}/api/admin/status`).then((r) => r.json()).catch(() => null);
  if (!status) continue;
  if (status.needsSetup) {
    console.log('\nThe database is empty: adding sample data and logins for every role…');
    spawnSync(process.execPath, ['scripts/sample-data.mjs'], { stdio: 'inherit' });
  } else {
    console.log(`\nReady at ${base}. Sample logins (if you added sample data): see SAMPLE-LOGINS.md. Start again from scratch: npm run local:fresh`);
  }
  break;
}
