// MySQL access with a small prepare/bind/first/all/run interface, so the API code reads the same everywhere.
// SQL uses numbered placeholders (?1, ?2, ...); they are turned into MySQL's plain ? placeholders here.
import { readFileSync } from 'node:fs';
import { toV2 } from '../../src/cms/siteSettings';
import mysql from 'mysql2/promise';
import type { Pool, PoolConnection } from 'mysql2/promise';
import { analyticsTools } from '../../src/cms/analytics';

type Value = string | number | null | Buffer;
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

  /** Runs the statement and returns how many rows it changed. */
  async run(): Promise<{ changes: number }> {
    const res = (await this.exec()) as { affectedRows?: number } | unknown;
    return { changes: Number((res as { affectedRows?: number })?.affectedRows ?? 0) };
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

  /**
   * Changes to tables that already exist (CREATE TABLE IF NOT EXISTS can't change them). Each step checks first,
   * so running it again does nothing.
   */
  private async upgrade(): Promise<void> {
    // 1. Leads may also be gated downloads: widen the check on leads.kind (its name differs between MySQL and MariaDB).
    const [rows] = await this.pool.query(
      `SELECT tc.CONSTRAINT_NAME AS n, cc.CHECK_CLAUSE AS c FROM information_schema.TABLE_CONSTRAINTS tc
       JOIN information_schema.CHECK_CONSTRAINTS cc ON cc.CONSTRAINT_SCHEMA = tc.CONSTRAINT_SCHEMA AND cc.CONSTRAINT_NAME = tc.CONSTRAINT_NAME
       WHERE tc.TABLE_SCHEMA = DATABASE() AND tc.TABLE_NAME = 'leads' AND tc.CONSTRAINT_TYPE = 'CHECK'`);
    const checks = rows as { n: string; c: string }[];
    const old = checks.filter((r) => /newsletter/.test(r.c) && !/download/.test(r.c));
    for (const r of old) {
      const name = r.n.replace(/`/g, '');
      const tries = [
        `ALTER TABLE leads DROP CONSTRAINT \`${name}\``, // MySQL 8.0.19+
        `ALTER TABLE leads DROP CHECK \`${name}\``, // older MySQL 8
        'ALTER TABLE leads MODIFY kind VARCHAR(20) NOT NULL', // MariaDB: a check written on the column goes with the column definition
      ];
      let done = false;
      for (const q of tries) { try { await this.pool.query(q); done = true; break; } catch { /* try the next way */ } }
      if (!done) throw new Error('Could not update the check on leads.kind');
    }
    if (old.length && !checks.some((r) => /download/.test(r.c))) {
      await this.pool.query("ALTER TABLE leads ADD CONSTRAINT leads_kind_chk CHECK (kind IN ('demo', 'partner', 'newsletter', 'career', 'download'))");
    }
    // 2. Company details moved from single fields (phoneIndia, linkedin…) to lists of offices and social links.
    const [sr] = await this.pool.query("SELECT value FROM content WHERE `key` = 'site.settings'");
    const stored = (sr as { value: string }[])[0];
    if (stored) {
      const v = JSON.parse(stored.value) as Record<string, unknown>;
      if (!Array.isArray(v.offices)) await this.pool.query("UPDATE content SET value = ? WHERE `key` = 'site.settings'", [JSON.stringify(toV2(v))]);
    }
    // 3. Website analytics moved from one tool (provider + id) to a list of tools.
    const [ar] = await this.pool.query("SELECT value FROM content WHERE `key` = 'site.analytics'");
    const an = (ar as { value: string }[])[0];
    if (an) {
      const v = JSON.parse(an.value) as Record<string, unknown>;
      if (!Array.isArray(v.tools)) await this.pool.query("UPDATE content SET value = ? WHERE `key` = 'site.analytics'", [JSON.stringify({ tools: analyticsTools(v) })]);
    }
  }

  /** Creates the tables on first use (safe to run every time). Retries on the next request if it fails. */
  ensureSchema(schemaFile: string): Promise<void> {
    this.ready ??= (async () => {
      const sql = readFileSync(schemaFile, 'utf8').replace(/^\s*--.*$/gm, '');
      for (const stmt of sql.split(';').map((s) => s.trim()).filter(Boolean)) await this.pool.query(stmt);
      await this.upgrade();
    })().catch((err) => {
      this.ready = null;
      throw err;
    });
    return this.ready;
  }
}
