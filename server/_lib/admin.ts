// Admin API: sign-in, content editing with history, the inbox and team management.
// Everything here lives under /api/admin and needs an admin session cookie (except setup/login/status).
import { SECTION_BY_KEY, SECTIONS, ValidationError, sanitize } from '../../src/cms/registry';
import { DUMMY_HASH, hashPassword, signToken, verifyPassword, verifyToken } from './crypto';
import { allow, json, readCookie, readJson } from './http';
import type { Env } from './http';
import { ROLES, can, contentApprovalOn, handleAdminWorkflow } from './adminWorkflow';
import type { Me as WfMe, Role } from './adminWorkflow';
import { bumpSessionVersion, logActivity, sessionCurrent, sessionVersion, siteUrl } from './workflow';
import { sendMail } from './mail';
import { clearSeoCache } from './seoPage';
import { clearSearchCache, handleLibrary } from './library';
import { handleMedia } from './media';
import { handleCatalogAdmin } from './catalog';
import { createHash, timingSafeEqual } from 'node:crypto';

const COOKIE = 'ooa_admin';
const SESSION_SECONDS = 12 * 3600;
const MAX_CONTENT_BYTES = 400_000;
const KEEP_REVISIONS = 30;
const LEAD_KINDS = ['demo', 'partner', 'newsletter', 'career', 'download'];
const LEAD_STATUSES = ['new', 'contacted', 'closed'];

interface AdminRow { id: string; email: string; name: string; role: 'admin' | 'editor'; active: number; password_hash: string; created_at: string; last_login: string | null }
type Me = WfMe;

const publicAdmin = (a: AdminRow & { xrole?: string | null }) => ({ id: a.id, email: a.email, name: a.name, role: (a.xrole as Role) || a.role, active: !!a.active, createdAt: a.created_at, lastLogin: a.last_login });
/** Base role stored in admins.role (admin or editor); the finer role lives in admin_roles. */
const baseRole = (r: Role) => (r === 'admin' ? 'admin' : 'editor');
async function setXRole(env: Env, id: string, r: Role) {
  if (r === 'admin' || r === 'editor') await env.DB.prepare('DELETE FROM admin_roles WHERE admin_id = ?1').bind(id).run();
  else await env.DB.prepare('INSERT INTO admin_roles (admin_id, role) VALUES (?1, ?2) ON DUPLICATE KEY UPDATE role = VALUES(role)').bind(id, r).run();
}
const sessionCookie = (token: string, maxAge: number) => `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
const passwordProblem = (pw: string) => (pw.length < 10 ? 'Use at least 10 characters.' : !/[A-Za-z]/.test(pw) || !/\d/.test(pw) ? 'Include at least one letter and one number.' : null);
/** Compares two secrets in constant time (hashing first makes the lengths equal). */
const secretEquals = (a: string, b: string) => timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest());
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
  if (!(await sessionCurrent(env, 'admin', payload.sub, payload.v))) return null;
  const row = await env.DB.prepare('SELECT a.id, a.email, a.name, a.role, a.active, r.role AS xrole FROM admins a LEFT JOIN admin_roles r ON r.admin_id = a.id WHERE a.id = ?1').bind(payload.sub).first<AdminRow & { xrole: string | null }>();
  if (!row || !row.active) return null;
  const role = (row.role === 'admin' ? 'admin' : (row.xrole as Role) || row.role) as Role;
  return { id: row.id, email: row.email, name: row.name, role };
}

async function startSession(env: Env, admin: AdminRow): Promise<string> {
  const v = await sessionVersion(env, 'admin', admin.id);
  const token = await signToken({ sub: admin.id, aud: 'admin', v }, env.JWT_SECRET, SESSION_SECONDS);
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
    if (!secretEquals(token, env.ADMIN_SETUP_TOKEN)) return json({ error: 'The setup token is not correct.', fields: { token: 'Not correct.' } }, 403);
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
    const row = email ? await env.DB.prepare('SELECT a.*, r.role AS xrole FROM admins a LEFT JOIN admin_roles r ON r.admin_id = a.id WHERE a.email = ?1').bind(email).first<AdminRow & { xrole: string | null }>() : null;
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
    // Sign out every other device, and give this one a fresh session.
    await bumpSessionVersion(env, 'admin', me.id);
    return json({ ok: true }, 200, { 'Set-Cookie': await startSession(env, row) });
  }

  const cata = await handleCatalogAdmin(env, req, me, method, path);
  if (cata) { if (method !== 'GET') clearSeoCache(); return cata; }
  const med = await handleMedia(env, req, me, method, path);
  if (med) return med;
  const lib = await handleLibrary(env, req, me, method, path);
  if (lib) { if (method !== 'GET') { clearSeoCache(); clearSearchCache(); } return lib; }
  const wf = await handleAdminWorkflow(req, env, method, path, url, me);
  if (wf) return wf;

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
    if (method !== 'GET' && !can(me, 'content', true)) return json({ error: 'Your role doesn’t allow content changes.' }, 403);
    const needsApproval = me.role === 'editor' && (await contentApprovalOn(env));
    if (needsApproval && method === 'DELETE') return json({ error: 'Changes need an admin’s approval. Ask an admin to reset this section.' }, 403);
    if (method === 'PUT') {
      if (section.library) return json({ error: 'These items now live in the Resources library (/admin/library), one item at a time.' }, 409);
      const b = (await readJson(req)) as { value?: unknown; baseUpdatedAt?: string | null; force?: boolean } | null;
      let clean: unknown;
      try {
        clean = sanitize(section, b?.value);
      } catch (err) {
        if (err instanceof ValidationError) return json({ error: err.message }, 400);
        throw err;
      }
      const text = JSON.stringify(clean);
      if (text.length > MAX_CONTENT_BYTES) return json({ error: 'This content is too large to save.' }, 413);
      // Someone else saved this section after it was opened here: refuse unless the person chose to overwrite.
      const live = await env.DB.prepare('SELECT updated_at, updated_by FROM content WHERE `key` = ?1').bind(key).first<{ updated_at: string; updated_by: string }>();
      const liveAt = live?.updated_at ?? null;
      if (b && 'baseUpdatedAt' in b && !b.force && (b.baseUpdatedAt ?? null) !== liveAt) {
        const who = live ? `${live.updated_by} saved this section on ${live.updated_at.slice(0, 16).replace('T', ' ')} UTC` : 'Someone reset this section to the original';
        return json({ error: `${who}, after you opened it. Load their version to keep it, or save yours to replace it.`, conflict: 'live' }, 409);
      }
      const now = new Date().toISOString();
      if (needsApproval) {
        const other = await env.DB.prepare('SELECT saved_by FROM content_drafts WHERE `key` = ?1').bind(key).first<{ saved_by: string }>();
        if (other && other.saved_by !== me.name && !b?.force) {
          return json({ error: `${other.saved_by} already has a change waiting for approval in this section. Saving yours replaces it.`, conflict: 'draft' }, 409);
        }
        await env.DB.prepare('INSERT INTO content_draft_meta (`key`, base_updated_at, saved_by_id) VALUES (?1, ?2, ?3) ON DUPLICATE KEY UPDATE base_updated_at = VALUES(base_updated_at), saved_by_id = VALUES(saved_by_id), decision = NULL, decision_note = NULL, decided_by = NULL, decided_at = NULL, decided_for = NULL').bind(key, b && 'baseUpdatedAt' in b ? (b.baseUpdatedAt ?? null) : liveAt, me.id).run();
        await env.DB.prepare('INSERT INTO content_drafts (`key`, value, saved_by, saved_at) VALUES (?1, ?2, ?3, ?4) ON DUPLICATE KEY UPDATE value = VALUES(value), saved_by = VALUES(saved_by), saved_at = VALUES(saved_at)').bind(key, text, me.name, now).run();
        await logActivity(env, 'content', key, me.name, 'draft_saved', null, section.label);
        return json({ ok: true, pending: true, value: clean, updatedAt: now, updatedBy: me.name });
      }
      await env.DB.batch([
        env.DB.prepare('INSERT INTO content (`key`, value, updated_at, updated_by) VALUES (?1, ?2, ?3, ?4) ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = VALUES(updated_at), updated_by = VALUES(updated_by)').bind(key, text, now, me.name),
        env.DB.prepare('INSERT INTO content_revisions (`key`, value, saved_at, saved_by) VALUES (?1, ?2, ?3, ?4)').bind(key, text, now, me.name),
        // Keep the newest KEEP_REVISIONS versions: delete everything older than the oldest one kept.
        env.DB.prepare('DELETE FROM content_revisions WHERE `key` = ?1 AND id < (SELECT id FROM (SELECT id FROM content_revisions WHERE `key` = ?1 ORDER BY id DESC LIMIT 1 OFFSET ?2) AS oldest_kept)').bind(key, KEEP_REVISIONS - 1),
      ]);
      await logActivity(env, 'content', key, me.name, 'published', null, section.label);
      clearSeoCache();
      return json({ ok: true, value: clean, updatedAt: now, updatedBy: me.name });
    }
    if (method === 'DELETE') {
      const now = new Date().toISOString();
      await env.DB.batch([
        env.DB.prepare('DELETE FROM content WHERE `key` = ?1').bind(key),
        env.DB.prepare("INSERT INTO content_revisions (`key`, value, saved_at, saved_by) VALUES (?1, 'null', ?2, ?3)").bind(key, now, me.name),
      ]);
      await logActivity(env, 'content', key, me.name, 'reset', null, section.label);
      clearSeoCache();
      return json({ ok: true });
    }
  }
  m = path.match(/^\/content\/([\w.]+)\/revisions$/);
  if (m && method === 'GET') {
    if (!SECTION_BY_KEY[m[1]]) return json({ error: 'Unknown content section.' }, 404);
    const rows = await env.DB.prepare('SELECT id, saved_at, saved_by, LENGTH(value) AS size, value = \'null\' AS reverted FROM content_revisions WHERE `key` = ?1 ORDER BY id DESC').bind(m[1]).all();
    return json({ items: rows.results });
  }
  m = path.match(/^\/content\/([\w.]+)\/draft$/);
  if (m && method === 'GET') {
    const d = await env.DB.prepare('SELECT value, saved_by, saved_at FROM content_drafts WHERE `key` = ?1').bind(m[1]).first<{ value: string; saved_by: string; saved_at: string }>();
    const meta = await env.DB.prepare('SELECT decision, decision_note, decided_by, decided_at, decided_for FROM content_draft_meta WHERE `key` = ?1').bind(m[1]).first<{ decision: string | null; decision_note: string | null; decided_by: string | null; decided_at: string | null; decided_for: string | null }>();
    const lastDecision = meta?.decision && (meta.decided_for === me.name || me.role === 'admin')
      ? { decision: meta.decision, note: meta.decision_note ?? '', by: meta.decided_by, at: meta.decided_at, for: meta.decided_for } : null;
    return json({ draft: d ? { value: JSON.parse(d.value), savedBy: d.saved_by, savedAt: d.saved_at } : null, lastDecision });
  }
  m = path.match(/^\/drafts\/([\w.]+)\/(approve|reject)$/);
  if (m && method === 'POST') {
    if (me.role !== 'admin') return json({ error: 'Only an admin can approve changes.' }, 403);
    const key = m[1];
    const d = await env.DB.prepare('SELECT value, saved_by FROM content_drafts WHERE `key` = ?1').bind(key).first<{ value: string; saved_by: string }>();
    if (!d) return json({ error: 'There is no change waiting for this section.' }, 404);
    const b = (await readJson(req)) as { note?: string; force?: boolean } | null;
    const now = new Date().toISOString();
    const dm = await env.DB.prepare('SELECT base_updated_at, saved_by_id FROM content_draft_meta WHERE `key` = ?1').bind(key).first<{ base_updated_at: string | null; saved_by_id: string | null }>();
    if (m[2] === 'approve' && dm && !b?.force) {
      const live = await env.DB.prepare('SELECT updated_at, updated_by FROM content WHERE `key` = ?1').bind(key).first<{ updated_at: string; updated_by: string }>();
      if ((live?.updated_at ?? null) !== dm.base_updated_at) {
        const who = live ? `${live.updated_by} changed this section on ${live.updated_at.slice(0, 16).replace('T', ' ')} UTC` : 'This section was reset to the original';
        return json({ error: `${who}, after this change was sent for approval. Approving it replaces those edits.`, conflict: 'approve' }, 409);
      }
    }
    if (m[2] === 'approve') {
      await env.DB.batch([
        env.DB.prepare('INSERT INTO content (`key`, value, updated_at, updated_by) VALUES (?1, ?2, ?3, ?4) ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = VALUES(updated_at), updated_by = VALUES(updated_by)').bind(key, d.value, now, `${d.saved_by} (approved by ${me.name})`),
        env.DB.prepare('INSERT INTO content_revisions (`key`, value, saved_at, saved_by) VALUES (?1, ?2, ?3, ?4)').bind(key, d.value, now, `${d.saved_by} (approved by ${me.name})`),
        env.DB.prepare('DELETE FROM content_drafts WHERE `key` = ?1').bind(key),
      ]);
    } else {
      await env.DB.prepare('DELETE FROM content_drafts WHERE `key` = ?1').bind(key).run();
    }
    clearSeoCache();
    const reason = String(b?.note ?? '').slice(0, 1000);
    await env.DB.prepare('INSERT INTO content_draft_meta (`key`, decision, decision_note, decided_by, decided_at, decided_for) VALUES (?1, ?2, ?3, ?4, ?5, ?6) ON DUPLICATE KEY UPDATE decision = VALUES(decision), decision_note = VALUES(decision_note), decided_by = VALUES(decided_by), decided_at = VALUES(decided_at), decided_for = VALUES(decided_for)').bind(key, m[2] === 'approve' ? 'approved' : 'rejected', reason, me.name, now, d.saved_by).run();
    await logActivity(env, 'content', key, me.name, m[2] === 'approve' ? 'draft_approved' : 'draft_rejected', null, SECTION_BY_KEY[key]?.label ?? key, reason || `Change by ${d.saved_by}`);
    // Tell the person who sent the change what happened, and why.
    const author = dm?.saved_by_id ? await env.DB.prepare('SELECT name, email FROM admins WHERE id = ?1 AND active = 1').bind(dm.saved_by_id).first<{ name: string; email: string }>() : null;
    if (author && author.email !== me.email) {
      await sendMail(env, author.email, m[2] === 'approve' ? 'content_approved' : 'content_rejected', {
        name: author.name.split(' ')[0], section: SECTION_BY_KEY[key]?.label ?? key, by: me.name,
        reason: reason || 'No reason was given.', link: `${siteUrl(env, req)}/admin/content/${key}`,
      });
    }
    return json({ ok: true });
  }
  m = path.match(/^\/content\/([\w.]+)\/restore$/);
  if (m && method === 'POST') {
    if (!can(me, 'content', true) || (me.role === 'editor' && (await contentApprovalOn(env)))) return json({ error: 'Ask an admin to restore an older version.' }, 403);
    const key = m[1];
    if (!SECTION_BY_KEY[key]) return json({ error: 'Unknown content section.' }, 404);
    const b = (await readJson(req)) as { id?: number } | null;
    const rev = await env.DB.prepare('SELECT value FROM content_revisions WHERE id = ?1 AND `key` = ?2').bind(Number(b?.id), key).first<{ value: string }>();
    if (!rev) return json({ error: 'That version was not found.' }, 404);
    const now = new Date().toISOString();
    if (rev.value === 'null') {
      await env.DB.batch([env.DB.prepare('DELETE FROM content WHERE `key` = ?1').bind(key), env.DB.prepare("INSERT INTO content_revisions (`key`, value, saved_at, saved_by) VALUES (?1, 'null', ?2, ?3)").bind(key, now, me.name)]);
      await logActivity(env, 'content', key, me.name, 'restored', null, SECTION_BY_KEY[key]?.label ?? key);
    clearSeoCache();
      return json({ ok: true, value: null });
    }
    await env.DB.batch([
      env.DB.prepare('INSERT INTO content (`key`, value, updated_at, updated_by) VALUES (?1, ?2, ?3, ?4) ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = VALUES(updated_at), updated_by = VALUES(updated_by)').bind(key, rev.value, now, me.name),
      env.DB.prepare('INSERT INTO content_revisions (`key`, value, saved_at, saved_by) VALUES (?1, ?2, ?3, ?4)').bind(key, rev.value, now, me.name),
    ]);
    await logActivity(env, 'content', key, me.name, 'restored', null, SECTION_BY_KEY[key]?.label ?? key);
    clearSeoCache();
    return json({ ok: true, value: JSON.parse(rev.value) });
  }

  // ---- inbox (form submissions)
  if (method === 'GET' && (path === '/leads' || path === '/leads.csv')) {
    const kind = url.searchParams.get('kind') ?? '';
    const status = url.searchParams.get('status') ?? '';
    // Only real submission types: otherwise e.g. ?kind=content would pass an Editor's permission check
    // and then return every submission unfiltered.
    if (kind && !LEAD_KINDS.includes(kind)) return json({ error: 'Unknown type.' }, 400);
    if (!can(me, kind || 'demo') || (!kind && me.role !== 'admin' && me.role !== 'viewer')) return json({ error: 'Your role doesn’t allow this.' }, 403);
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
    if (me.role !== 'admin') return json({ error: 'Use the pipeline to change stages.' }, 403);
    const b = (await readJson(req)) as { status?: string } | null;
    if (!b?.status || !LEAD_STATUSES.includes(b.status)) return json({ error: 'Choose new, contacted or closed.' }, 400);
    await env.DB.prepare('UPDATE leads SET status = ?2 WHERE id = ?1').bind(m[1], b.status).run();
    return json({ ok: true });
  }
  if (m && method === 'DELETE') {
    if (!isAdmin) return json({ error: 'Only an admin can delete submissions.' }, 403);
    await env.DB.batch([env.DB.prepare('DELETE FROM leads WHERE id = ?1').bind(m[1]), env.DB.prepare('DELETE FROM lead_meta WHERE lead_id = ?1').bind(m[1])]);
    await logActivity(env, 'lead', m[1], me.name, 'deleted');
    return json({ ok: true });
  }
  // ---- team (admins only)
  if (path === '/users' || path.startsWith('/users/')) {
    if (!isAdmin) return json({ error: 'Only an admin can manage the team.' }, 403);
    if (method === 'GET' && path === '/users') {
      const rows = await env.DB.prepare('SELECT a.*, r.role AS xrole FROM admins a LEFT JOIN admin_roles r ON r.admin_id = a.id ORDER BY a.created_at').all<AdminRow & { xrole: string | null }>();
      return json({ items: rows.results.map(publicAdmin) });
    }
    if (method === 'POST' && path === '/users') {
      const b = (await readJson(req)) as Record<string, unknown> | null;
      const name = String(b?.name ?? '').trim(); const email = String(b?.email ?? '').trim().toLowerCase(); const password = String(b?.password ?? ''); const role: Role = ROLES.includes(b?.role as Role) ? (b?.role as Role) : 'editor';
      if (!name || !emailOk(email)) return json({ error: 'Enter a name and a valid email address.' }, 400);
      const pw = passwordProblem(password);
      if (pw) return json({ error: pw }, 400);
      const exists = await env.DB.prepare('SELECT id FROM admins WHERE email = ?1').bind(email).first();
      if (exists) return json({ error: 'A team member with this email already exists.' }, 409);
      const newId = crypto.randomUUID();
      await env.DB.prepare('INSERT INTO admins (id, email, name, role, password_hash, active, created_at) VALUES (?1, ?2, ?3, ?4, ?5, 1, ?6)').bind(newId, email, name, baseRole(role), await hashPassword(password), new Date().toISOString()).run();
      await setXRole(env, newId, role);
      await logActivity(env, 'team', newId, me.name, 'added', null, role, email);
      return json({ ok: true }, 201);
    }
    m = path.match(/^\/users\/([\w-]+)$/);
    if (m && method === 'PATCH') {
      const id = m[1];
      const b = (await readJson(req)) as Record<string, unknown> | null;
      const target = await env.DB.prepare('SELECT * FROM admins WHERE id = ?1').bind(id).first<AdminRow>();
      if (!target) return json({ error: 'Team member not found.' }, 404);
      const xr = await env.DB.prepare('SELECT role FROM admin_roles WHERE admin_id = ?1').bind(id).first<{ role: Role }>();
      const current: Role = target.role === 'admin' ? 'admin' : xr?.role ?? 'editor';
      const role: Role = ROLES.includes(b?.role as Role) ? (b?.role as Role) : current;
      const active = typeof b?.active === 'boolean' ? (b.active ? 1 : 0) : target.active;
      if (id === me.id && (!active || role !== 'admin')) return json({ error: 'You cannot remove your own admin access.' }, 400);
      if ((role !== 'admin' || !active) && target.role === 'admin' && target.active) {
        const others = await env.DB.prepare("SELECT COUNT(*) AS n FROM admins WHERE role = 'admin' AND active = 1 AND id != ?1").bind(id).first<{ n: number }>();
        if ((others?.n ?? 0) === 0) return json({ error: 'There must be at least one active admin.' }, 400);
      }
      let hash = target.password_hash;
      const newPassword = typeof b?.password === 'string' && !!b.password;
      if (newPassword) {
        const pw = passwordProblem(b!.password as string);
        if (pw) return json({ error: pw }, 400);
        hash = await hashPassword(b!.password as string);
      }
      await env.DB.prepare('UPDATE admins SET role = ?2, active = ?3, password_hash = ?4 WHERE id = ?1').bind(id, baseRole(role), active, hash).run();
      await setXRole(env, id, role);
      // A new password, a role change or deactivation signs the person out everywhere.
      const signedOut = newPassword || role !== current || !active;
      if (signedOut) await bumpSessionVersion(env, 'admin', id);
      if (role !== current || active !== target.active) await logActivity(env, 'team', id, me.name, 'changed', current, `${role}${active ? '' : ' (inactive)'}`);
      // An admin who set their own new password here keeps working on this device.
      if (signedOut && id === me.id) return json({ ok: true }, 200, { 'Set-Cookie': await startSession(env, target) });
      return json({ ok: true });
    }
  }

  return json({ error: 'Not found.' }, 404);
}

export const CONTENT_KEYS = SECTIONS.map((s) => s.key);
