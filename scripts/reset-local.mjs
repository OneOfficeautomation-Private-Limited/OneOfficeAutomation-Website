// Empties the LOCAL database (every table), so the next "npm run local" starts fresh with sample data: npm run local:fresh
// Refuses to run unless DB_HOST is this computer, so it can never touch the live database.
import { existsSync, readFileSync } from 'node:fs';
import mysql from 'mysql2/promise';

if (existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}
const host = process.env.DB_HOST || 'localhost';
if (!['localhost', '127.0.0.1', '::1'].includes(host)) {
  console.error(`Refusing: DB_HOST is "${host}". This command only empties a database on this computer.`);
  process.exit(1);
}
try {
  const db = await mysql.createConnection({ host, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER || '', password: process.env.DB_PASSWORD || '', database: process.env.DB_NAME || '' });
  const [rows] = await db.query('SHOW TABLES');
  const tables = rows.map((r) => Object.values(r)[0]);
  await db.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const t of tables) await db.query(`DROP TABLE \`${String(t).replace(/`/g, '')}\``);
  await db.query('SET FOREIGN_KEY_CHECKS = 1');
  await db.end();
  console.log(`Emptied the local database "${process.env.DB_NAME}" (${tables.length} tables). Now run: npm run local`);
} catch (err) {
  const reasons = [err, ...(err.errors ?? [])].map((e) => e.code || e.message).filter(Boolean);
  console.error(`Could not empty the database (${reasons.join(', ')}). Is MySQL running, and are the DB_ settings in .env right?`);
  process.exit(1);
}
