// Small helpers shared by the API handlers.
import type { Database } from './db';

export interface Env {
  DB: Database;
  JWT_SECRET: string;
  /** Needed once, to create the first admin account. */
  ADMIN_SETUP_TOKEN?: string;
}

export function json(body: unknown, status = 200, extra: HeadersInit = {}): Response {
  const headers = new Headers(extra);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  if (!headers.has('Cache-Control')) headers.set('Cache-Control', 'no-store');
  headers.set('X-Content-Type-Options', 'nosniff');
  return new Response(JSON.stringify(body), { status, headers });
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

export function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get('Cookie') ?? '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return null;
}

/** Fixed-window rate limit stored in the database. Returns true when the request is allowed. */
export async function allow(env: Env, req: Request, bucket: string, limit: number, windowSeconds: number): Promise<boolean> {
  const key = `${bucket}:${req.headers.get('X-Client-IP') ?? 'local'}`;
  const windowStart = Math.floor(Date.now() / 1000 / windowSeconds) * windowSeconds;
  // MySQL applies the assignments left to right, so `count` is reset before `window_start` changes.
  await env.DB.prepare(
    `INSERT INTO rate_limits (\`key\`, window_start, count) VALUES (?1, ?2, 1)
     ON DUPLICATE KEY UPDATE
       count = IF(window_start = VALUES(window_start), count + 1, 1),
       window_start = VALUES(window_start)`,
  ).bind(key, windowStart).run();
  const row = await env.DB.prepare('SELECT count FROM rate_limits WHERE `key` = ?1').bind(key).first<{ count: number }>();
  return (row?.count ?? 0) <= limit;
}
