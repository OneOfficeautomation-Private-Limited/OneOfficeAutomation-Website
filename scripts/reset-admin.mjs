// Removes every admin account so the setup screen at /admin appears again: npm run admin:reset
// Uses the database settings in .env. Website content, submissions and customer accounts are kept.
import { existsSync, readFileSync } from 'node:fs';
import mysql from 'mysql2/promise';

if (existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

try {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || '',
  });
  const [result] = await db.query('DELETE FROM admins');
  await db.end();
  console.log(`Removed ${result.affectedRows} admin account(s).`);
  console.log('Now open http://localhost:3000/admin to create a new admin (setup token: ADMIN_SETUP_TOKEN in .env).');
} catch (err) {
  if (err.code === 'ER_NO_SUCH_TABLE') {
    console.log('No admin accounts yet: start the site with "npm run local" and open http://localhost:3000/admin.');
  } else {
    // A refused connection on Windows is an AggregateError with an empty message; show the codes instead.
    const reasons = [err, ...(err.errors ?? [])].map((e) => e.code || e.message).filter(Boolean);
    const where = `${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}`;
    if (!existsSync('.env')) console.error('There is no .env file in this folder. Create it with: copy .env.example .env');
    if (reasons.includes('ECONNREFUSED')) console.error(`Nothing is answering at ${where}: MySQL is not running, or it uses a different port (set DB_PORT in .env).`);
    else if (reasons.includes('ER_ACCESS_DENIED_ERROR')) console.error('MySQL is running but rejected DB_USER / DB_PASSWORD from .env. Create that user (see README, Run locally) or change .env to match.');
    else if (reasons.includes('ER_BAD_DB_ERROR')) console.error(`MySQL is running but the database "${process.env.DB_NAME}" does not exist. Create it (see README, Run locally).`);
    else console.error('Could not reach the database. Check that MySQL is running and the DB_ lines in .env are right.');
    console.error('Details:', [...new Set(reasons)].join(', ') || String(err));
    process.exitCode = 1;
  }
}
