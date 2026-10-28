// Admin API: sign-in, content editing with history, the inbox and team management.
// Everything here lives under /api/admin and needs an admin session cookie (except setup/login/status).
import { SECTION_BY_KEY, SECTIONS, ValidationError, sanitize } from '../../src/cms/registry';
import { DUMMY_HASH, hashPassword, signToken, verifyPassword, verifyToken } from './crypto';
import { allow, json, readCookie, readJson } from './http';
import type { Env } from './http';

const COOKIE = 'ooa_admin';
const SESSION_SECONDS = 12 * 3600;
const MAX_CONTENT_BYTES = 400_000;
const KEEP_REVISIONS = 30;
const LEAD_KINDS = ['demo', 'partner', 'newsletter', 'career'];
const LEAD_STATUSES = ['new', 'contacted', 'closed'];

interface AdminRow { id: string; email: string; name: string; role: 'admin' | 'editor'; active: number; password_hash: string; created_at: string; last_login: string | null }
type Me = Pick<AdminRow, 'id' | 'email' | 'name' | 'role'>;

const publicAdmin = (a: AdminRow) => ({ id: a.id, email: a.email, name: a.name, role: a.role, active: !!a.active, createdAt: a.created_at, lastLogin: a.last_login });
const sessionCookie = (token: string, maxAge: number) => `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
const passwordProblem = (pw: string) => (pw.length < 10 ? 'Use at least 10 characters.' : !/[A-Za-z]/.test(pw) || !/\d/.test(pw) ? 'Include at least one letter and one number.' : null);
const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 200;

function sameOrigin(req: Request): boolean {
  const origin = req.headers.get('Origin');
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(req.url).host;
  } catch {
    return false;
  }
}

async function currentAdmin(env: Env, req: Request): Promise<Me | null> {
  const token = readCookie(req, COOKIE);
  const payload = token ? await verifyToken(token, env.JWT_SECRET) : null;
  if (!payload || payload.aud !== 'admin' || typeof payload.sub !== 'string') return null;
  const row = await env.DB.prepare('SELECT id, email, name, role, active FROM admins WHERE id = ?1').bind(payload.sub).first<AdminRow>();
  if (!row || !row.active) return null;
  return { id: row.id, email: row.email, name: row.name, role: row.role };
}

async function startSession(env: Env, admin: AdminRow): Promise<string> {
  const token = await signToken({ sub: admin.id, aud: 'admin' }, env.JWT_SECRET, SESSION_SECONDS);
  await env.DB.prepare('UPDATE admins SET last_login = ?2 WHERE id = ?1').bind(admin.id, new Date().toISOString()).run();
  return sessionCookie(token, SESSION_SECONDS);
}

/** Protects against CSV formula injection when a spreadsheet opens the export. */
const csvCell = (v: unknown) => {
  let s = v == null ? '' : typeof v === 'string' ? v : JSON.stringify(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

export async function handleAdmin(req: Request, env: Env, route: string, url: URL): Promise<Response | null> {
  if (!route.includes(' /api/admin')) return null;
  const method = req.method;
  const path = route.slice(method.length + 1).replace('/api/admin', '') || '/';

  // CSRF defence for everything that changes data.
  if (method !== 'GET' && !sameOrigin(req)) return json({ error: 'Blocked cross-site request.' }, 403);

  // ---- public admin endpoints
  if (method === 'GET' && path === '/status') {
    const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM admins').first<{ n: number }>();
    return json({ needsSetup: (n?.n ?? 0) === 0, setupEnabled: !!env.ADMIN_SETUP_TOKEN && env.ADMIN_SETUP_TOKEN.length >= 16 });
  }

  if (method === 'POST' && path === '/setup') {
    if (!(await allow(env, req, 'admin-auth', 10, 900))) return json({ error: 'Too many attempts. Please wait a few minutes.' }, 429);
    const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM admins').first<{ n: number }>();
    if ((count?.n ?? 0) > 0) return json({ error: 'Setup is already complete. Please sign in.' }, 409);
    if (!env.ADMIN_SETUP_TOKEN || env.ADMIN_SETUP_TOKEN.length < 16) return json({ error: 'Setup is disabled: add an ADMIN_SETUP_TOKEN environment variable (at least 16 characters) in Hostinger first.' }, 503);
    const b = (await readJson(req)) as Record<string, unknown> | null;
    const token = String(b?.token ?? ''); const name = String(b?.name ?? '').trim(); const email = String(b?.email ?? '').trim().toLowerCase(); const password = String(b?.password ?? '');
    if (token !== env.ADMIN_SETUP_TOKEN) return json({ error: 'The setup token is not correct.', fields: { token: 'Not correct.' } }, 403);
    if (!name || name.length > 100) return json({ error: 'Enter your name.', fields: { name: 'Required.' } }, 400);
    if (!emailOk(email)) return json({ error: 'Enter a valid email address.', fields: { email: 'Invalid.' } }, 400);
    const pw = passwordProblem(password);
    if (pw) return json({ error: pw, fields: { password: pw } }, 400);
    const row: AdminRow = { id: crypto.randomUUID(), email, name, role: 'admin', active: 1, password_hash: await hashPassword(password), created_at: new Date().toISOString(), last_login: null };
    await env.DB.prepare('INSERT INTO admins (id, email, name, role, password_hash, active, created_at) VALUES (?1, ?2, ?3, ?4, ?5, 1, ?6)').bind(row.id, row.email, row.name, row.role, row.password_hash, row.created_at).run();
    return json({ admin: publicAdmin(row) }, 201, { 'Set-Cookie': await startSession(env, row) });
  }

  if (method === 'POST' && path === '/login') {
    if (!(await allow(env, req, 'admin-auth', 10, 900))) return json({ error: 'Too many attempts. Please wait a few minutes and try again.' }, 429);
    const b = (await readJson(req)) as Record<string, unknown> | null;
    const email = String(b?.email ?? '').trim().toLowerCase(); const password = String(b?.password ?? '');
    const row = email ? await env.DB.prepare('SELECT * FROM admins WHERE email = ?1').bind(email).first<AdminRow>() : null;
    const ok = await verifyPassword(password, row?.password_hash ?? DUMMY_HASH);
    if (!row || !row.active || !ok) return json({ error: 'Email or password is incorrect.' }, 401);
    return json({ admin: publicAdmin(row) }, 200, { 'Set-Cookie': await startSession(env, row) });
  }

  if (method === 'POST' && path === '/logout') return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie('', 0) });

  // ---- everything below needs a signed-in admin
  const me = await currentAdmin(env, req);
  if (!me) return json({ error: 'Please sign in.' }, 401);
  const isAdmin = me.role === 'admin';

  if (method === 'GET' && path === '/me') return json({ admin: me });

  if (method === 'POST' && path === '/password') {
    const b = (await readJson(req)) as Record<string, unknown> | null;
    const row = await env.DB.prepare('SELECT * FROM admins WHERE id = ?1').bind(me.id).first<AdminRow>();
    if (!row || !(await verifyPassword(String(b?.current ?? ''), row.password_hash))) return json({ error: 'Your current password is not correct.', fields: { current: 'Not correct.' } }, 400);
    const next = String(b?.next ?? ''); const pw = passwordProblem(next);
    if (pw) return json({ error: pw, fields: { next: pw } }, 400);
    await env.DB.prepare('UPDATE admins SET password_hash = ?2 WHERE id = ?1').bind(me.id, await hashPassword(next)).run();
    return json({ ok: true });
  }

  if (method === 'GET' && path === '/dashboard') {
    const [leads, customers, overrides, recent] = await Promise.all([
      env.DB.prepare("SELECT kind, status, COUNT(*) AS n FROM leads GROUP BY kind, status").all<{ kind: string; status: string; n: number }>(),
      env.DB.prepare('SELECT COUNT(*) AS n FROM customers').first<{ n: number }>(),
      env.DB.prepare('SELECT COUNT(*) AS n FROM content').first<{ n: number }>(),
      env.DB.prepare('SELECT `key`, updated_at, updated_by FROM content ORDER BY updated_at DESC LIMIT 6').all<{ key: string; updated_at: string; updated_by: string }>(),
    ]);
    return json({ leads: leads.results, customers: customers?.n ?? 0, customised: overrides?.n ?? 0, recent: recent.results });
  }

  // ---- content
  if (method === 'GET' && path === '/content') {
    const rows = await env.DB.prepare('SELECT `key`, updated_at, updated_by FROM content').all<{ key: string; updated_at: string; updated_by: string }>();
    return json({ items: rows.results });
  }
  let m = path.match(/^\/content\/([\w.]+)$/);
  if (m) {
    const key = m[1];
    const section = SECTION_BY_KEY[key];
    if (!section) return json({ error: 'Unknown content section.' }, 404);
    if (method === 'GET') {
      const row = await env.DB.prepare('SELECT value, updated_at, updated_by FROM content WHERE `key` = ?1').bind(key).first<{ value: string; updated_at: string; updated_by: string }>();
      return json({ key, value: row ? JSON.parse(row.value) : null, updatedAt: row?.updated_at ?? null, updatedBy: row?.updated_by ?? null });
    }
    if (method === 'PUT') {
      const b = (await readJson(req)) as { value?: unknown } | null;
      let clean: unknown;
      try {
        clean = sanitize(section, b?.value);
      } catch (err) {
        if (err instanceof ValidationError) return json({ error: err.message }, 400);
        throw err;
      }
      const text = JSON.stringify(clean);
      if (text.length > MAX_CONTENT_BYTES) return json({ error: 'This content is too large to save.' }, 413);
      const now = new Date().toISOString();
      await env.DB.batch([
        env.DB.prepare('INSERT INTO content (`key`, value, updated_at, updated_by) VALUES (?1, ?2, ?3, ?4) ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = VALUES(updated_at), updated_by = VALUES(updated_by)').bind(key, text, now, me.name),
        env.DB.prepare('INSERT INTO content_revisions (`key`, value, saved_at, saved_by) VALUES (?1, ?2, ?3, ?4)').bind(key, text, now, me.name),
        // Keep the newest KEEP_REVISIONS versions: delete everything older than the oldest one kept.
        env.DB.prepare('DELETE FROM content_revisions WHERE `key` = ?1 AND id < (SELECT id FROM (SELECT id FROM content_revisions WHERE `key` = ?1 ORDER BY id DESC LIMIT 1 OFFSET ?2) AS oldest_kept)').bind(key, KEEP_REVISIONS - 1),
      ]);
      return json({ ok: true, value: clean, updatedAt: now, updatedBy: me.name });
    }
    if (method === 'DELETE') {
      const now = new Date().toISOString();
      await env.DB.batch([
        env.DB.prepare('DELETE FROM content WHERE `key` = ?1').bind(key),
        env.DB.prepare("INSERT INTO content_revisions (`key`, value, saved_at, saved_by) VALUES (?1, 'null', ?2, ?3)").bind(key, now, me.name),
      ]);
      return json({ ok: true });
    }
  }
  m = path.match(/^\/content\/([\w.]+)\/revisions$/);
  if (m && method === 'GET') {
    if (!SECTION_BY_KEY[m[1]]) return json({ error: 'Unknown content section.' }, 404);
    const rows = await env.DB.prepare('SELECT id, saved_at, saved_by, LENGTH(value) AS size, value = \'null\' AS reverted FROM content_revisions WHERE `key` = ?1 ORDER BY id DESC').bind(m[1]).all();
    return json({ items: rows.results });
  }
  m = path.match(/^\/content\/([\w.]+)\/restore$/);
  if (m && method === 'POST') {
    const key = m[1];
    if (!SECTION_BY_KEY[key]) return json({ error: 'Unknown content section.' }, 404);
    const b = (await readJson(req)) as { id?: number } | null;
    const rev = await env.DB.prepare('SELECT value FROM content_revisions WHERE id = ?1 AND `key` = ?2').bind(Number(b?.id), key).first<{ value: string }>();
    if (!rev) return json({ error: 'That version was not found.' }, 404);
    const now = new Date().toISOString();
    if (rev.value === 'null') {
      await env.DB.batch([env.DB.prepare('DELETE FROM content WHERE `key` = ?1').bind(key), env.DB.prepare("INSERT INTO content_revisions (`key`, value, saved_at, saved_by) VALUES (?1, 'null', ?2, ?3)").bind(key, now, me.name)]);
      return json({ ok: true, value: null });
    }
    await env.DB.batch([
      env.DB.prepare('INSERT INTO content (`key`, value, updated_at, updated_by) VALUES (?1, ?2, ?3, ?4) ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = VALUES(updated_at), updated_by = VALUES(updated_by)').bind(key, rev.value, now, me.name),
      env.DB.prepare('INSERT INTO content_revisions (`key`, value, saved_at, saved_by) VALUES (?1, ?2, ?3, ?4)').bind(key, rev.value, now, me.name),
    ]);
    return json({ ok: true, value: JSON.parse(rev.value) });
  }

  // ---- inbox (form submissions)
  if (method === 'GET' && (path === '/leads' || path === '/leads.csv')) {
    const kind = url.searchParams.get('kind') ?? '';
    const status = url.searchParams.get('status') ?? '';
    const where: string[] = []; const args: string[] = [];
    if (LEAD_KINDS.includes(kind)) { args.push(kind); where.push(`kind = ?${args.length}`); }
    if (LEAD_STATUSES.includes(status)) { args.push(status); where.push(`status = ?${args.length}`); }
    const limit = path === '/leads.csv' ? 5000 : 500;
    const rows = await env.DB.prepare(`SELECT id, kind, status, payload, created_at FROM leads ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY created_at DESC LIMIT ${limit}`).bind(...args).all<{ id: string; kind: string; status: string; payload: string; created_at: string }>();
    const items = rows.results.map((r) => ({ id: r.id, kind: r.kind, status: r.status, createdAt: r.created_at, payload: JSON.parse(r.payload) as Record<string, unknown> }));
    if (path === '/leads') return json({ items });
    const cols = Array.from(new Set(items.flatMap((i) => Object.keys(i.payload))));
    const lines = [['received', 'type', 'status', ...cols].map(csvCell).join(',')];
    for (const i of items) lines.push([i.createdAt, i.kind, i.status, ...cols.map((c) => i.payload[c])].map(csvCell).join(','));
    return new Response('\ufeff' + lines.join('\r\n'), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${kind || 'all'}-submissions.csv"`, 'Cache-Control': 'no-store' } });
  }
  m = path.match(/^\/leads\/([\w-]+)$/);
  if (m && method === 'PATCH') {
    const b = (await readJson(req)) as { status?: string } | null;
    if (!b?.status || !LEAD_STATUSES.includes(b.status)) return json({ error: 'Choose new, contacted or closed.' }, 400);
    await env.DB.prepare('UPDATE leads SET status = ?2 WHERE id = ?1').bind(m[1], b.status).run();
    return json({ ok: true });
  }
  if (m && method === 'DELETE') {
    if (!isAdmin) return json({ error: 'Only an admin can delete submissions.' }, 403);
    await env.DB.prepare('DELETE FROM leads WHERE id = ?1').bind(m[1]).run();
    return json({ ok: true });
  }
  if (method === 'GET' && path === '/customers') {
    const rows = await env.DB.prepare('SELECT id, first_name, last_name, email, company, country, plan, created_at FROM customers ORDER BY created_at DESC LIMIT 1000').all();
    return json({ items: rows.results });
  }

  // ---- team (admins only)
  if (path === '/users' || path.startsWith('/users/')) {
    if (!isAdmin) return json({ error: 'Only an admin can manage the team.' }, 403);
    if (method === 'GET' && path === '/users') {
      const rows = await env.DB.prepare('SELECT * FROM admins ORDER BY created_at').all<AdminRow>();
      return json({ items: rows.results.map(publicAdmin) });
    }
    if (method === 'POST' && path === '/users') {
      const b = (await readJson(req)) as Record<string, unknown> | null;
      const name = String(b?.name ?? '').trim(); const email = String(b?.email ?? '').trim().toLowerCase(); const password = String(b?.password ?? ''); const role = b?.role === 'admin' ? 'admin' : 'editor';
      if (!name || !emailOk(email)) return json({ error: 'Enter a name and a valid email address.' }, 400);
      const pw = passwordProblem(password);
      if (pw) return json({ error: pw }, 400);
      const exists = await env.DB.prepare('SELECT id FROM admins WHERE email = ?1').bind(email).first();
      if (exists) return json({ error: 'A team member with this email already exists.' }, 409);
      await env.DB.prepare('INSERT INTO admins (id, email, name, role, password_hash, active, created_at) VALUES (?1, ?2, ?3, ?4, ?5, 1, ?6)').bind(crypto.randomUUID(), email, name, role, await hashPassword(password), new Date().toISOString()).run();
      return json({ ok: true }, 201);
    }
    m = path.match(/^\/users\/([\w-]+)$/);
    if (m && method === 'PATCH') {
      const id = m[1];
      const b = (await readJson(req)) as Record<string, unknown> | null;
      const target = await env.DB.prepare('SELECT * FROM admins WHERE id = ?1').bind(id).first<AdminRow>();
      if (!target) return json({ error: 'Team member not found.' }, 404);
      const role = b?.role === 'admin' || b?.role === 'editor' ? (b.role as 'admin' | 'editor') : target.role;
      const active = typeof b?.active === 'boolean' ? (b.active ? 1 : 0) : target.active;
      if (id === me.id && (!active || role !== 'admin')) return json({ error: 'You cannot remove your own admin access.' }, 400);
      if ((role !== 'admin' || !active) && target.role === 'admin' && target.active) {
        const others = await env.DB.prepare("SELECT COUNT(*) AS n FROM admins WHERE role = 'admin' AND active = 1 AND id != ?1").bind(id).first<{ n: number }>();
        if ((others?.n ?? 0) === 0) return json({ error: 'There must be at least one active admin.' }, 400);
      }
      let hash = target.password_hash;
      if (typeof b?.password === 'string' && b.password) {
        const pw = passwordProblem(b.password);
        if (pw) return json({ error: pw }, 400);
        hash = await hashPassword(b.password);
      }
      await env.DB.prepare('UPDATE admins SET role = ?2, active = ?3, password_hash = ?4 WHERE id = ?1').bind(id, role, active, hash).run();
      return json({ ok: true });
    }
  }

  return json({ error: 'Not found.' }, 404);
}

export const CONTENT_KEYS = SECTIONS.map((s) => s.key);
