// MySQL access with a small prepare/bind/first/all/run interface, so the API code reads the same everywhere.
// SQL uses numbered placeholders (?1, ?2, ...); they are turned into MySQL's plain ? placeholders here.
import { readFileSync } from 'node:fs';
import mysql from 'mysql2/promise';
import type { Pool, PoolConnection } from 'mysql2/promise';

type Value = string | number | null;
type Runner = Pick<Pool, 'query'> | PoolConnection;

function toMysql(sql: string, args: Value[]): [string, Value[]] {
  const values: Value[] = [];
  const text = sql.replace(/\?(\d+)/g, (_, n: string) => {
    values.push(args[Number(n) - 1] ?? null);
    return '?';
  });
  return [text, values];
}

export class Statement {
  private args: Value[] = [];
  constructor(private pool: Pool, readonly sql: string) {}

  bind(...args: Value[]): Statement {
    const s = new Statement(this.pool, this.sql);
    s.args = args;
    return s;
  }

  async exec(runner: Runner = this.pool): Promise<unknown> {
    const [text, values] = toMysql(this.sql, this.args);
    const [rows] = await runner.query(text, values);
    return rows;
  }

  async all<T = Record<string, unknown>>(): Promise<{ results: T[] }> {
    const rows = await this.exec();
    return { results: (Array.isArray(rows) ? rows : []) as T[] };
  }

  async first<T = Record<string, unknown>>(): Promise<T | null> {
    const { results } = await this.all<T>();
    return results[0] ?? null;
  }

  async run(): Promise<void> {
    await this.exec();
  }
}

export class Database {
  private pool: Pool;
  private ready: Promise<void> | null = null;

  constructor(config: { host: string; port: number; user: string; password: string; database: string; ssl?: { ca: string; rejectUnauthorized: true } }) {
    this.pool = mysql.createPool({ ...config, connectionLimit: 5, charset: 'utf8mb4_unicode_ci', supportBigNumbers: true });
  }

  prepare(sql: string): Statement {
    return new Statement(this.pool, sql);
  }

  /** Runs the statements in one transaction. */
  async batch(statements: Statement[]): Promise<void> {
    const conn = await this.pool.getConnection();
    try {
      await conn.beginTransaction();
      for (const s of statements) await s.exec(conn);
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  /** Creates the tables on first use (safe to run every time). Retries on the next request if it fails. */
  ensureSchema(schemaFile: string): Promise<void> {
    this.ready ??= (async () => {
      const sql = readFileSync(schemaFile, 'utf8').replace(/^\s*--.*$/gm, '');
      for (const stmt of sql.split(';').map((s) => s.trim()).filter(Boolean)) await this.pool.query(stmt);
    })().catch((err) => {
      this.ready = null;
      throw err;
    });
    return this.ready;
  }
}
