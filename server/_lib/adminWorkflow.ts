// Admin workflows: dashboard, pipelines, approvals and their side effects, partners, deals, requests,
// customers, the email log and site settings. Called from admin.ts for signed-in team members.
import { json, readJson } from './http';
import type { Env } from './http';
import { mailConfigured, sendMail } from './mail';
import { reviewDueCount } from './library';
import {
  CUSTOMER_STATUSES, CUSTOMER_STATUS_LABEL, PARTNER_CHECKLIST, PARTNER_LEVELS, PARTNER_STATUSES, REQUEST_KINDS, STAGES,
  addDays, createToken, legacyStage, legacyStatus, logActivity, now, sign, siteUrl, stageLabel,
} from './workflow';

export type Role = 'admin' | 'editor' | 'sales' | 'partners' | 'recruiter' | 'viewer';
export type Me = { id: string; email: string; name: string; role: Role };
export const ROLES: Role[] = ['admin', 'editor', 'sales', 'partners', 'recruiter', 'viewer'];
const AREAS: Record<Role, string[]> = {
  admin: ['*'], editor: ['content'], sales: ['demo', 'download', 'newsletter', 'customers', 'requests'], partners: ['partner', 'partners', 'deals'], recruiter: ['career'], viewer: [],
};
/** Viewers can read everything except the team; other roles read and change only their own areas. */
export function can(me: Me, area: string, write = false): boolean {
  if (me.role === 'admin') return true;
  if (me.role === 'viewer') return !write && area !== 'team';
  return AREAS[me.role].includes(area);
}
/** Which area each kind of activity entry belongs to (leads are checked by their own kind). Team and settings: admins only. */
const ACTIVITY_AREA: Record<string, string> = { partner_org: 'partners', deal: 'deals', customer: 'customers', request: 'requests', content: 'content' };
/** Keeps only the activity entries this person's role may see; admins and viewers see everything. */
async function visibleActivity<T extends { entity: string; entity_id: string }>(env: Env, me: Me, rows: T[]): Promise<T[]> {
  if (me.role === 'admin' || me.role === 'viewer') return rows;
  const leadIds = [...new Set(rows.filter((r) => r.entity === 'lead').map((r) => r.entity_id))];
  const kinds = new Map<string, string>();
  if (leadIds.length) {
    const q = await env.DB.prepare(`SELECT id, kind FROM leads WHERE id IN (${leadIds.map((_, i) => `?${i + 1}`).join(', ')})`).bind(...leadIds).all<{ id: string; kind: string }>();
    for (const r of q.results) kinds.set(r.id, r.kind);
  }
  return rows.filter((r) => {
    if (r.entity === 'lead') { const k = kinds.get(r.entity_id); return !!k && can(me, k); }
    const area = ACTIVITY_AREA[r.entity];
    return !!area && can(me, area);
  });
}
const deny = () => json({ error: 'Your role doesn’t allow this. Ask an admin.' }, 403);

type Lead = { id: string; kind: string; status: string; payload: string; created_at: string; stage: string | null; owner: string | null; follow_up: string | null; reason: string | null; updated_at: string | null };
const leadView = (l: Lead) => {
  const p = JSON.parse(l.payload) as Record<string, string>;
  const stage = l.stage ?? legacyStage(l.kind, l.status);
  const who = l.kind === 'demo' ? { name: `${p.fn ?? ''} ${p.ln ?? ''}`.trim(), email: p.em, company: p.co }
    : l.kind === 'partner' ? { name: p.pn, email: p.pe, company: p.pc, partnerType: p.pt }
      : l.kind === 'career' ? { name: p.cn, email: p.ce, company: p.crole || 'General application' }
        : { name: p.nl, email: p.nl, company: '' };
  return { id: l.id, kind: l.kind, stage, stageLabel: stageLabel(l.kind, stage), owner: l.owner ?? '', followUp: l.follow_up ?? '', reason: l.reason ?? '', createdAt: l.created_at, updatedAt: l.updated_at ?? l.created_at, payload: p, ...who };
};
const LEAD_SQL = 'SELECT l.id, l.kind, l.status, l.payload, l.created_at, m.stage, m.owner, m.follow_up, m.reason, m.updated_at FROM leads l LEFT JOIN lead_meta m ON m.lead_id = l.id';

async function setStage(env: Env, id: string, kind: string, from: string, to: string, actor: string, note: string | null, reason: string | null) {
  await env.DB.prepare('INSERT INTO lead_meta (lead_id, stage, reason, updated_at) VALUES (?1, ?2, ?3, ?4) ON DUPLICATE KEY UPDATE stage = VALUES(stage), reason = COALESCE(VALUES(reason), reason), updated_at = VALUES(updated_at)').bind(id, to, reason, now()).run();
  await env.DB.prepare('UPDATE leads SET status = ?2 WHERE id = ?1').bind(id, legacyStatus(kind, to)).run();
  await logActivity(env, 'lead', id, actor, 'stage', from, to, [note, reason ? `Reason: ${reason}` : ''].filter(Boolean).join('\n') || null);
}

type Org = { id: string; lead_id: string | null; company: string; country: string; type: string; level: string; status: string; checklist: string; website: string | null; about: string | null; listed: number; created_at: string; updated_at: string };
const orgView = (o: Org, extra: Record<string, unknown> = {}) => ({
  id: o.id, leadId: o.lead_id, company: o.company, country: o.country, type: o.type, level: o.level, status: o.status, website: o.website ?? '', about: o.about ?? '', listed: !!o.listed, createdAt: o.created_at, updatedAt: o.updated_at,
  checklist: PARTNER_CHECKLIST.map((c) => ({ ...c, done: !!(JSON.parse(o.checklist || '{}') as Record<string, boolean>)[c.id] })), ...extra,
});
async function orgOwner(env: Env, orgId: string) {
  return env.DB.prepare("SELECT id, name, email FROM partner_users WHERE org_id = ?1 ORDER BY role = 'owner' DESC, created_at LIMIT 1").bind(orgId).first<{ id: string; name: string; email: string }>();
}
async function partnerTypes(env: Env): Promise<string[]> {
  const row = await env.DB.prepare("SELECT value FROM content WHERE `key` = 'partners.types'").first<{ value: string }>();
  const list = row ? (JSON.parse(row.value) as { k: string }[]).map((t) => t.k) : [];
  return list.length ? list : ['Implementation partner', 'Reseller partner', 'Technology partner'];
}
async function setting(env: Env, key: string): Promise<string | null> {
  return (await env.DB.prepare('SELECT value FROM settings WHERE `key` = ?1').bind(key).first<{ value: string }>())?.value ?? null;
}
export async function contentApprovalOn(env: Env) { return (await setting(env, 'content_approval')) === '1'; }

export async function handleAdminWorkflow(req: Request, env: Env, method: string, path: string, url: URL, me: Me): Promise<Response | null> {
  const base = siteUrl(env, req);
  const actor = me.name;
  let m: RegExpMatchArray | null;

  // ===================== dashboard =====================
  if (method === 'GET' && path === '/dashboard') {
    const since30 = new Date(Date.now() - 30 * 86400000).toISOString();
    const since60 = new Date(Date.now() - 60 * 86400000).toISOString();
    const since84 = new Date(Date.now() - 84 * 86400000).toISOString();
    const [leadRows, orgRows, dealRows, custRows, reqRows, weekly, recent, emailFail, drafts] = await Promise.all([
      env.DB.prepare(`${LEAD_SQL}`).all<Lead>(),
      env.DB.prepare('SELECT type, level, status FROM partner_orgs').all<{ type: string; level: string; status: string }>(),
      env.DB.prepare('SELECT status, COUNT(*) AS n FROM deals GROUP BY status').all<{ status: string; n: number }>(),
      env.DB.prepare("SELECT c.plan, COALESCE(m.status, IF(c.plan = 'community', 'free', 'trial')) AS status, c.created_at FROM customers c LEFT JOIN customer_meta m ON m.customer_id = c.id").all<{ plan: string; status: string; created_at: string }>(),
      env.DB.prepare('SELECT kind, status, COUNT(*) AS n FROM requests GROUP BY kind, status').all<{ kind: string; status: string; n: number }>(),
      env.DB.prepare("SELECT kind, YEARWEEK(STR_TO_DATE(LEFT(created_at, 10), '%Y-%m-%d'), 3) AS wk, COUNT(*) AS n FROM leads WHERE created_at >= ?1 GROUP BY kind, wk").bind(since84).all<{ kind: string; wk: number; n: number }>(),
      env.DB.prepare('SELECT entity, entity_id, actor, action, from_value, to_value, created_at FROM activity ORDER BY id DESC LIMIT 150').all<{ entity: string; entity_id: string }>(),
      env.DB.prepare("SELECT COUNT(*) AS n FROM email_log WHERE status = 'failed' AND created_at >= ?1").bind(since30).first<{ n: number }>(),
      env.DB.prepare('SELECT COUNT(*) AS n FROM content_drafts').first<{ n: number }>(),
    ]);
    const leads = leadRows.results.map(leadView);
    const pipelines: Record<string, { id: string; label: string; done: boolean; n: number }[]> = {};
    for (const k of Object.keys(STAGES)) pipelines[k] = STAGES[k].map((s) => ({ id: s.id, label: s.label, done: !!s.done, n: leads.filter((l) => l.kind === k && l.stage === s.id).length }));
    const count = (k: string, from: string, to?: string) => leads.filter((l) => l.kind === k && l.createdAt >= from && (!to || l.createdAt < to)).length;
    const cust30 = custRows.results.filter((c) => c.created_at >= since30).length;
    const custPrev = custRows.results.filter((c) => c.created_at >= since60 && c.created_at < since30).length;
    const won = leads.filter((l) => l.kind === 'demo' && l.stage === 'won').length;
    const closedDemos = leads.filter((l) => l.kind === 'demo' && (l.stage === 'won' || l.stage === 'lost')).length;
    const types = await partnerTypes(env);
    const partnerBoard = [...types, ...new Set(orgRows.results.map((o) => o.type).filter((t) => !types.includes(t)))].map((t) => {
      const apps = leads.filter((l) => l.kind === 'partner' && (l.partnerType || '') === t);
      const orgs = orgRows.results.filter((o) => o.type === t);
      return {
        type: t, submitted: apps.filter((l) => l.stage === 'submitted').length, review: apps.filter((l) => l.stage === 'review').length, rejected: apps.filter((l) => l.stage === 'rejected').length,
        onboarding: orgs.filter((o) => o.status === 'onboarding').length, active: orgs.filter((o) => o.status === 'active').length, inactive: orgs.filter((o) => o.status === 'inactive').length,
        levels: Object.fromEntries(PARTNER_LEVELS.map((lv) => [lv, orgs.filter((o) => o.status === 'active' && o.level === lv).length])),
      };
    });
    const unknownApps = leads.filter((l) => l.kind === 'partner' && !types.includes(l.partnerType || ''));
    if (unknownApps.length) partnerBoard.push({ type: 'Not sure yet', submitted: unknownApps.filter((l) => l.stage === 'submitted').length, review: unknownApps.filter((l) => l.stage === 'review').length, rejected: unknownApps.filter((l) => l.stage === 'rejected').length, onboarding: 0, active: 0, inactive: 0, levels: {} });
    const twoDays = new Date(Date.now() - 2 * 86400000).toISOString();
    const today = new Date().toISOString().slice(0, 10);
    const attention = [
      ...leads.filter((l) => !STAGES[l.kind].find((s) => s.id === l.stage)?.done && l.kind !== 'newsletter' && l.updatedAt < twoDays).map((l) => ({ kind: l.kind, id: l.id, title: `${l.name}${l.company ? ' · ' + l.company : ''}`, why: `${l.stageLabel} for more than 2 days` })),
      ...leads.filter((l) => l.followUp && l.followUp <= today && !STAGES[l.kind].find((s) => s.id === l.stage)?.done).map((l) => ({ kind: l.kind, id: l.id, title: l.name, why: `Follow-up due ${l.followUp}` })),
    ].filter((a) => can(me, a.kind)).slice(0, 25);
    const reqWaiting = reqRows.results.filter((r) => r.status === 'new').reduce((a, r) => a + Number(r.n), 0);
    const dealsWaiting = Number(dealRows.results.find((d) => d.status === 'submitted')?.n ?? 0);
    const reviewDue = can(me, 'content') ? await reviewDueCount(env) : 0;
    return json({
      reviewDue,
      kpis: [
        { id: 'demo', label: 'Demo requests', now: count('demo', since30), prev: count('demo', since60, since30) },
        { id: 'partner', label: 'Partner applications', now: count('partner', since30), prev: count('partner', since60, since30) },
        { id: 'career', label: 'Job applications', now: count('career', since30), prev: count('career', since60, since30) },
        { id: 'customers', label: 'New sign-ups', now: cust30, prev: custPrev },
        { id: 'newsletter', label: 'Newsletter subscribers', total: leads.filter((l) => l.kind === 'newsletter' && l.stage === 'subscribed').length },
        { id: 'partners', label: 'Active partners', total: orgRows.results.filter((o) => o.status === 'active').length },
        { id: 'conversion', label: 'Demo → customer', total: closedDemos ? Math.round((won / closedDemos) * 100) : null, suffix: '%' },
      ],
      pipelines, partnerBoard,
      deals: Object.fromEntries(dealRows.results.map((d) => [d.status, Number(d.n)])),
      customers: { byStatus: Object.fromEntries(CUSTOMER_STATUSES.map((s) => [s, custRows.results.filter((c) => c.status === s).length])), byPlan: Object.fromEntries(['community', 'starter', 'business', 'enterprise'].map((p) => [p, custRows.results.filter((c) => c.plan === p).length])), total: custRows.results.length },
      requests: reqRows.results,
      weekly: weekly.results,
      attention, approvals: { requests: reqWaiting, deals: dealsWaiting, partners: pipelines.partner.filter((s) => s.id === 'submitted' || s.id === 'review').reduce((a, s) => a + s.n, 0), drafts: drafts?.n ?? 0 },
      recent: (await visibleActivity(env, me, recent.results)).slice(0, 15),
      email: { configured: mailConfigured(env), failed30: emailFail?.n ?? 0, notify: env.NOTIFY_EMAIL ?? '' },
    });
  }

  // ===================== pipelines (form submissions) =====================
  if (method === 'GET' && (path === '/records' || path === '/records.csv')) {
    const kind = url.searchParams.get('kind') ?? 'demo';
    if (!STAGES[kind]) return json({ error: 'Unknown type.' }, 400);
    if (!can(me, kind)) return deny();
    const stage = url.searchParams.get('stage') ?? '';
    const q = (url.searchParams.get('q') ?? '').toLowerCase();
    const rows = await env.DB.prepare(`${LEAD_SQL} WHERE l.kind = ?1 ORDER BY l.created_at DESC LIMIT 5000`).bind(kind).all<Lead>();
    const items = rows.results.map(leadView).filter((l) => (!stage || l.stage === stage) && (!q || JSON.stringify(l.payload).toLowerCase().includes(q) || l.owner.toLowerCase().includes(q)));
    if (path === '/records') return json({ items: items.slice(0, 1000), stages: STAGES[kind] });
    const cols = Array.from(new Set(items.flatMap((i) => Object.keys(i.payload))));
    const cell = (v: unknown) => { let s = v == null ? '' : String(v); if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; return `"${s.replace(/"/g, '""')}"`; };
    const lines = [['received', 'stage', 'owner', 'follow_up', 'reason', ...cols].map(cell).join(',')];
    for (const i of items) lines.push([i.createdAt, i.stageLabel, i.owner, i.followUp, i.reason, ...cols.map((c) => i.payload[c])].map(cell).join(','));
    return new Response('\ufeff' + lines.join('\r\n'), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${kind}${stage ? '-' + stage : ''}.csv"`, 'Cache-Control': 'no-store' } });
  }
  m = path.match(/^\/records\/([\w-]+)$/);
  if (m && method === 'GET') {
    const l = await env.DB.prepare(`${LEAD_SQL} WHERE l.id = ?1`).bind(m[1]).first<Lead>();
    if (!l) return json({ error: 'Not found.' }, 404);
    if (!can(me, l.kind)) return deny();
    const acts = await env.DB.prepare("SELECT actor, action, from_value, to_value, note, created_at FROM activity WHERE entity = 'lead' AND entity_id = ?1 ORDER BY id DESC").bind(l.id).all();
    const org = l.kind === 'partner' ? await env.DB.prepare('SELECT id, company, status, level FROM partner_orgs WHERE lead_id = ?1').bind(l.id).first() : null;
    const statusLink = l.kind === 'career' ? `${base}/application/${l.id}.${sign(env, 'app:' + l.id)}` : null;
    return json({ item: leadView(l), stages: STAGES[l.kind], activity: acts.results, org, statusLink, partnerTypes: l.kind === 'partner' ? await partnerTypes(env) : undefined });
  }
  m = path.match(/^\/records\/([\w-]+)\/(stage|note|assign)$/);
  if (m && method === 'POST') {
    const l = await env.DB.prepare(`${LEAD_SQL} WHERE l.id = ?1`).bind(m[1]).first<Lead>();
    if (!l) return json({ error: 'Not found.' }, 404);
    if (!can(me, l.kind, true)) return deny();
    const v = leadView(l);
    const b = ((await readJson(req)) ?? {}) as Record<string, unknown>;
    const note = String(b.note ?? '').trim().slice(0, 4000) || null;
    if (m[2] === 'note') {
      if (!note) return json({ error: 'Write a note first.' }, 400);
      await logActivity(env, 'lead', l.id, actor, 'note', null, null, note);
      return json({ ok: true });
    }
    if (m[2] === 'assign') {
      const owner = String(b.owner ?? '').trim().slice(0, 100) || null;
      const follow = String(b.followUp ?? '').trim();
      if (follow && !/^\d{4}-\d{2}-\d{2}$/.test(follow)) return json({ error: 'Use a date like 2026-11-30.' }, 400);
      await env.DB.prepare('INSERT INTO lead_meta (lead_id, stage, owner, follow_up, updated_at) VALUES (?1, ?2, ?3, ?4, ?5) ON DUPLICATE KEY UPDATE owner = VALUES(owner), follow_up = VALUES(follow_up), updated_at = VALUES(updated_at)').bind(l.id, v.stage, owner, follow || null, now()).run();
      await logActivity(env, 'lead', l.id, actor, 'assigned', v.owner || null, owner, follow ? `Follow up on ${follow}` : null);
      return json({ ok: true });
    }
    // stage change
    const to = String(b.stage ?? '');
    if (!STAGES[l.kind].some((s) => s.id === to)) return json({ error: 'Unknown stage.' }, 400);
    if (to === v.stage) return json({ ok: true });
    const reason = String(b.reason ?? '').trim().slice(0, 500) || null;
    const sendEmail = b.notify !== false;
    if (l.kind === 'partner') {
      if (v.stage === 'approved') return json({ error: 'This application is already approved. Manage the partner under Partners.' }, 400);
      if (to === 'approved') {
        const types = await partnerTypes(env);
        const type = String(b.partnerType ?? v.partnerType ?? '');
        if (!types.includes(type)) return json({ error: 'Choose the partner type before approving.', fields: { partnerType: 'Required.' } }, 400);
        const existing = await env.DB.prepare('SELECT id FROM partner_users WHERE email = ?1').bind(v.email).first();
        if (existing) return json({ error: 'This email already has a partner portal account.' }, 409);
        const orgId = crypto.randomUUID(); const userId = crypto.randomUUID();
        await env.DB.batch([
          env.DB.prepare("INSERT INTO partner_orgs (id, lead_id, company, country, type, level, status, checklist, listed, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, 'Registered', 'onboarding', '{}', 1, ?6, ?6)").bind(orgId, l.id, v.company || v.name, String(v.payload.pk ?? ''), type, now()),
          env.DB.prepare("INSERT INTO partner_users (id, org_id, email, name, role, active, created_at) VALUES (?1, ?2, ?3, ?4, 'owner', 1, ?5)").bind(userId, orgId, v.email, v.name, now()),
        ]);
        await setStage(env, l.id, l.kind, v.stage, to, actor, note, null);
        await logActivity(env, 'partner_org', orgId, actor, 'created', null, 'onboarding', `Approved as ${type}`);
        const t = await createToken(env, 'invite', 'partner', userId, 7 * 86400);
        const sent = await sendMail(env, v.email, 'partner_approved', { name: v.name, company: v.company, type: type.toLowerCase(), link: `${base}/partner/accept?token=${t}` });
        return json({ ok: true, orgId, email: sent });
      }
    }
    if (to === 'rejected' && !reason && l.kind !== 'newsletter') return json({ error: 'Add a reason. It is included in the email.', fields: { reason: 'Required.' } }, 400);
    await setStage(env, l.id, l.kind, v.stage, to, actor, note, to === 'rejected' || to === 'lost' ? reason : null);
    let email: string | null = null;
    if (sendEmail && to === 'rejected' && l.kind === 'partner') email = await sendMail(env, v.email, 'partner_rejected', { name: v.name, company: v.company, reason: reason ?? '' });
    if (sendEmail && to === 'rejected' && l.kind === 'career') email = await sendMail(env, v.email, 'career_rejected', { name: v.name, role: v.company, reason: reason ?? '' });
    return json({ ok: true, email });
  }
  m = path.match(/^\/records\/([\w-]+)$/);
  if (m && method === 'DELETE') {
    if (me.role !== 'admin') return json({ error: 'Only an admin can delete records.' }, 403);
    await env.DB.batch([env.DB.prepare('DELETE FROM leads WHERE id = ?1').bind(m[1]), env.DB.prepare('DELETE FROM lead_meta WHERE lead_id = ?1').bind(m[1])]);
    await logActivity(env, 'lead', m[1], actor, 'deleted');
    return json({ ok: true });
  }

  // ===================== partners =====================
  if (method === 'GET' && path === '/partners') {
    if (!can(me, 'partners')) return deny();
    const rows = await env.DB.prepare('SELECT o.*, (SELECT COUNT(*) FROM partner_users u WHERE u.org_id = o.id) AS people, (SELECT COUNT(*) FROM deals d WHERE d.org_id = o.id) AS deals FROM partner_orgs o ORDER BY o.created_at DESC').all<Org & { people: number; deals: number }>();
    return json({ items: rows.results.map((o) => orgView(o, { people: Number(o.people), deals: Number(o.deals) })), levels: PARTNER_LEVELS, statuses: PARTNER_STATUSES, types: await partnerTypes(env) });
  }
  m = path.match(/^\/partners\/([\w-]+)$/);
  if (m && method === 'GET') {
    if (!can(me, 'partners')) return deny();
    const o = await env.DB.prepare('SELECT * FROM partner_orgs WHERE id = ?1').bind(m[1]).first<Org>();
    if (!o) return json({ error: 'Not found.' }, 404);
    const [people, deals, acts] = await Promise.all([
      env.DB.prepare('SELECT id, name, email, role, active, password_hash IS NOT NULL AS joined, last_login, created_at FROM partner_users WHERE org_id = ?1 ORDER BY created_at').bind(o.id).all(),
      env.DB.prepare('SELECT * FROM deals WHERE org_id = ?1 ORDER BY created_at DESC').bind(o.id).all(),
      env.DB.prepare("SELECT actor, action, from_value, to_value, note, created_at FROM activity WHERE entity = 'partner_org' AND entity_id = ?1 ORDER BY id DESC").bind(o.id).all(),
    ]);
    return json({ item: orgView(o), people: people.results, deals: deals.results, activity: acts.results, levels: PARTNER_LEVELS, statuses: PARTNER_STATUSES, types: await partnerTypes(env) });
  }
  if (m && method === 'PATCH') {
    if (!can(me, 'partners', true)) return deny();
    const o = await env.DB.prepare('SELECT * FROM partner_orgs WHERE id = ?1').bind(m[1]).first<Org>();
    if (!o) return json({ error: 'Not found.' }, 404);
    const b = ((await readJson(req)) ?? {}) as Record<string, unknown>;
    const owner = await orgOwner(env, o.id);
    const note = String(b.note ?? '').trim().slice(0, 1000);
    const checklist = JSON.parse(o.checklist || '{}') as Record<string, boolean>;
    if (b.checklist && typeof b.checklist === 'object') for (const c of PARTNER_CHECKLIST) if (typeof (b.checklist as Record<string, unknown>)[c.id] === 'boolean') checklist[c.id] = (b.checklist as Record<string, boolean>)[c.id];
    const level = typeof b.level === 'string' && PARTNER_LEVELS.includes(b.level) ? b.level : o.level;
    let status = typeof b.status === 'string' && PARTNER_STATUSES.includes(b.status) ? b.status : o.status;
    const types = await partnerTypes(env);
    const type = typeof b.type === 'string' && types.includes(b.type) ? b.type : o.type;
    const listed = typeof b.listed === 'boolean' ? (b.listed ? 1 : 0) : o.listed;
    // Finishing every onboarding step makes the partner active automatically.
    if (o.status === 'onboarding' && status === 'onboarding' && PARTNER_CHECKLIST.every((c) => checklist[c.id])) status = 'active';
    await env.DB.prepare('UPDATE partner_orgs SET checklist = ?2, level = ?3, status = ?4, type = ?5, listed = ?6, updated_at = ?7 WHERE id = ?1').bind(o.id, JSON.stringify(checklist), level, status, type, listed, now()).run();
    const emails: string[] = [];
    if (JSON.stringify(checklist) !== (o.checklist || '{}')) await logActivity(env, 'partner_org', o.id, actor, 'checklist', null, null, PARTNER_CHECKLIST.map((c) => `${checklist[c.id] ? '✓' : '○'} ${c.label}`).join('\n'));
    if (type !== o.type) await logActivity(env, 'partner_org', o.id, actor, 'type', o.type, type);
    if (listed !== o.listed) await logActivity(env, 'partner_org', o.id, actor, 'directory', o.listed ? 'listed' : 'hidden', listed ? 'listed' : 'hidden');
    if (level !== o.level) {
      await logActivity(env, 'partner_org', o.id, actor, 'level', o.level, level, note || null);
      if (owner) emails.push(await sendMail(env, owner.email, 'partner_level', { name: owner.name, company: o.company, level, link: `${base}/partner` }));
    }
    if (status !== o.status) {
      await logActivity(env, 'partner_org', o.id, actor, 'status', o.status, status, note || null);
      if (owner) emails.push(await sendMail(env, owner.email, 'partner_status', { name: owner.name, company: o.company, status, reason: note, link: `${base}/partner` }));
    }
    return json({ ok: true, status, emails });
  }
  m = path.match(/^\/partners\/([\w-]+)\/reinvite$/);
  if (m && method === 'POST') {
    if (!can(me, 'partners', true)) return deny();
    const b = ((await readJson(req)) ?? {}) as { userId?: string };
    const u = await env.DB.prepare('SELECT u.id, u.name, u.email, o.company FROM partner_users u JOIN partner_orgs o ON o.id = u.org_id WHERE u.id = ?1 AND u.org_id = ?2').bind(String(b.userId ?? ''), m[1]).first<{ id: string; name: string; email: string; company: string }>();
    if (!u) return json({ error: 'Person not found.' }, 404);
    const t = await createToken(env, 'invite', 'partner', u.id, 7 * 86400);
    const sent = await sendMail(env, u.email, 'partner_member_invite', { name: u.name, company: u.company, link: `${base}/partner/accept?token=${t}` });
    await logActivity(env, 'partner_org', m[1], actor, 'invite_resent', null, null, u.email);
    return json({ ok: true, email: sent });
  }

  // ===================== deals =====================
  if (method === 'GET' && path === '/deals') {
    if (!can(me, 'deals')) return deny();
    const rows = await env.DB.prepare('SELECT d.*, o.company AS partner FROM deals d JOIN partner_orgs o ON o.id = d.org_id ORDER BY d.created_at DESC LIMIT 2000').all();
    return json({ items: rows.results });
  }
  m = path.match(/^\/deals\/([\w-]+)\/decision$/);
  if (m && method === 'POST') {
    if (!can(me, 'deals', true)) return deny();
    const d = await env.DB.prepare('SELECT d.*, o.company AS partner FROM deals d JOIN partner_orgs o ON o.id = d.org_id WHERE d.id = ?1').bind(m[1]).first<{ id: string; org_id: string; customer: string; status: string; partner: string }>();
    if (!d) return json({ error: 'Not found.' }, 404);
    const b = ((await readJson(req)) ?? {}) as Record<string, unknown>;
    const decision = String(b.decision ?? '');
    const reason = String(b.reason ?? '').trim().slice(0, 500);
    const owner = await orgOwner(env, d.org_id);
    if (decision === 'approve' || decision === 'reject') {
      if (d.status !== 'submitted') return json({ error: 'This deal has already been decided.' }, 400);
      if (decision === 'reject' && !reason) return json({ error: 'Add a reason. It is included in the email.', fields: { reason: 'Required.' } }, 400);
      const days = Math.min(365, Math.max(7, Number(b.days ?? 90) || 90));
      const until = decision === 'approve' ? addDays(days) : null;
      await env.DB.prepare('UPDATE deals SET status = ?2, reason = ?3, protected_until = ?4, updated_at = ?5 WHERE id = ?1').bind(d.id, decision === 'approve' ? 'approved' : 'rejected', reason || null, until, now()).run();
      await logActivity(env, 'deal', d.id, actor, 'stage', d.status, decision === 'approve' ? 'approved' : 'rejected', reason || (until ? `Protected until ${until}` : null));
      const email = owner ? await sendMail(env, owner.email, decision === 'approve' ? 'deal_approved' : 'deal_rejected', { name: owner.name, customer: d.customer, protectedUntil: until ?? '', reason, link: `${base}/partner` }) : null;
      return json({ ok: true, email });
    }
    if (decision === 'won' || decision === 'lost') {
      if (d.status !== 'approved') return json({ error: 'Only approved deals can be marked won or lost.' }, 400);
      await env.DB.prepare('UPDATE deals SET status = ?2, updated_at = ?3 WHERE id = ?1').bind(d.id, decision, now()).run();
      await logActivity(env, 'deal', d.id, actor, 'stage', d.status, decision);
      return json({ ok: true });
    }
    return json({ error: 'Unknown decision.' }, 400);
  }

  // ===================== requests (community, plan change, deletion, events) =====================
  if (method === 'GET' && path === '/requests') {
    if (!can(me, 'requests')) return deny();
    const kind = url.searchParams.get('kind') ?? '';
    const rows = await env.DB.prepare(`SELECT * FROM requests ${REQUEST_KINDS.includes(kind) ? 'WHERE kind = ?1' : ''} ORDER BY created_at DESC LIMIT 2000`).bind(...(REQUEST_KINDS.includes(kind) ? [kind] : [])).all<{ payload: string }>();
    return json({ items: rows.results.map((r) => ({ ...r, payload: JSON.parse(r.payload) })) });
  }
  m = path.match(/^\/requests\/([\w-]+)\/decision$/);
  if (m && method === 'POST') {
    if (!can(me, 'requests', true)) return deny();
    const r = await env.DB.prepare('SELECT * FROM requests WHERE id = ?1').bind(m[1]).first<{ id: string; kind: string; customer_id: string | null; name: string; email: string; payload: string; status: string }>();
    if (!r) return json({ error: 'Not found.' }, 404);
    const b = ((await readJson(req)) ?? {}) as Record<string, unknown>;
    const decision = String(b.decision ?? '');
    const reason = String(b.reason ?? '').trim().slice(0, 500);
    const p = JSON.parse(r.payload) as Record<string, string>;
    if (r.kind === 'event') {
      if (decision !== 'attended' && decision !== 'no_show' && decision !== 'cancelled') return json({ error: 'Choose attended, no-show or cancelled.' }, 400);
      await env.DB.prepare('UPDATE requests SET status = ?2, updated_at = ?3 WHERE id = ?1').bind(r.id, decision, now()).run();
      await logActivity(env, 'request', r.id, actor, 'stage', r.status, decision);
      return json({ ok: true });
    }
    if (r.status !== 'new') return json({ error: 'This request has already been decided.' }, 400);
    if (decision !== 'approve' && decision !== 'reject') return json({ error: 'Choose approve or reject.' }, 400);
    if (decision === 'reject' && !reason) return json({ error: 'Add a reason. It is included in the email.', fields: { reason: 'Required.' } }, 400);
    const first = r.name.split(' ')[0];
    let email: string | null = null;
    if (r.kind === 'community') {
      const row = await env.DB.prepare("SELECT value FROM content WHERE `key` = 'community.settings'").first<{ value: string }>();
      const link = row ? (JSON.parse(row.value) as { inviteUrl?: string }).inviteUrl ?? '' : '';
      if (decision === 'approve' && !link) return json({ error: 'Add the community invitation link first (Emails → Community invitation link).' }, 400);
      email = await sendMail(env, r.email, decision === 'approve' ? 'community_approved' : 'community_rejected', { name: first, link, reason });
    }
    if (r.kind === 'plan') {
      const planName = p.plan[0].toUpperCase() + p.plan.slice(1);
      if (decision === 'approve' && r.customer_id) {
        const exists = await env.DB.prepare('SELECT id FROM customers WHERE id = ?1').bind(r.customer_id).first();
        if (!exists) return json({ error: 'This customer account no longer exists. Reject the request instead.' }, 409);
        const status = p.plan === 'community' ? 'free' : p.plan === 'enterprise' ? 'enterprise' : 'paid';
        await env.DB.prepare('UPDATE customers SET plan = ?2 WHERE id = ?1').bind(r.customer_id, p.plan).run();
        await env.DB.prepare('INSERT INTO customer_meta (customer_id, status, newsletter, updated_at) VALUES (?1, ?2, 0, ?3) ON DUPLICATE KEY UPDATE status = VALUES(status), updated_at = VALUES(updated_at)').bind(r.customer_id, status, now()).run();
        await logActivity(env, 'customer', r.customer_id, actor, 'plan', p.from, p.plan);
      }
      email = await sendMail(env, r.email, decision === 'approve' ? 'plan_approved' : 'plan_rejected', { name: first, plan: planName, reason, link: `${base}/account` });
    }
    if (r.kind === 'deletion') {
      if (decision === 'approve' && r.customer_id) {
        if (me.role !== 'admin') return json({ error: 'Only an admin can delete an account.' }, 403);
        await env.DB.batch([
          env.DB.prepare('DELETE FROM customers WHERE id = ?1').bind(r.customer_id),
          env.DB.prepare('DELETE FROM customer_meta WHERE customer_id = ?1').bind(r.customer_id),
          env.DB.prepare("DELETE FROM tokens WHERE user_type = 'customer' AND user_id = ?1").bind(r.customer_id),
        ]);
        await logActivity(env, 'customer', r.customer_id, actor, 'deleted', null, null, 'Deleted at the customer’s request');
      }
      email = await sendMail(env, r.email, decision === 'approve' ? 'deletion_done' : 'deletion_rejected', { name: first, reason });
    }
    await env.DB.prepare('UPDATE requests SET status = ?2, reason = ?3, updated_at = ?4 WHERE id = ?1').bind(r.id, decision === 'approve' ? 'approved' : 'rejected', reason || null, now()).run();
    await logActivity(env, 'request', r.id, actor, 'stage', r.status, decision === 'approve' ? 'approved' : 'rejected', reason || null);
    return json({ ok: true, email });
  }

  // ===================== customers =====================
  if (method === 'GET' && path === '/customers') {
    if (!can(me, 'customers')) return deny();
    const rows = await env.DB.prepare("SELECT c.id, c.first_name, c.last_name, c.email, c.company, c.country, c.plan, c.created_at, COALESCE(m.status, IF(c.plan = 'community', 'free', 'trial')) AS status, COALESCE(m.newsletter, 0) AS newsletter FROM customers c LEFT JOIN customer_meta m ON m.customer_id = c.id ORDER BY c.created_at DESC LIMIT 2000").all();
    return json({ items: rows.results, statuses: CUSTOMER_STATUSES.map((s) => ({ id: s, label: CUSTOMER_STATUS_LABEL[s] })) });
  }
  m = path.match(/^\/customers\/([\w-]+)$/);
  if (m && method === 'GET') {
    if (!can(me, 'customers')) return deny();
    const c = await env.DB.prepare("SELECT c.id, c.first_name, c.last_name, c.email, c.company, c.country, c.plan, c.created_at, COALESCE(m.status, IF(c.plan = 'community', 'free', 'trial')) AS status, COALESCE(m.newsletter, 0) AS newsletter FROM customers c LEFT JOIN customer_meta m ON m.customer_id = c.id WHERE c.id = ?1").bind(m[1]).first<{ email: string }>();
    if (!c) return json({ error: 'Not found.' }, 404);
    const [reqs, acts, demos] = await Promise.all([
      env.DB.prepare('SELECT id, kind, status, reason, payload, created_at FROM requests WHERE customer_id = ?1 ORDER BY created_at DESC').bind(m[1]).all(),
      env.DB.prepare("SELECT actor, action, from_value, to_value, note, created_at FROM activity WHERE entity = 'customer' AND entity_id = ?1 ORDER BY id DESC").bind(m[1]).all(),
      env.DB.prepare(`${LEAD_SQL} WHERE l.kind = 'demo' AND JSON_UNQUOTE(JSON_EXTRACT(l.payload, '$.em')) = ?1`).bind(c.email).all<Lead>(),
    ]);
    return json({ item: c, requests: reqs.results, activity: acts.results, demos: demos.results.map(leadView), statuses: CUSTOMER_STATUSES.map((s) => ({ id: s, label: CUSTOMER_STATUS_LABEL[s] })) });
  }
  if (m && method === 'PATCH') {
    if (!can(me, 'customers', true)) return deny();
    const c = await env.DB.prepare("SELECT c.id, c.first_name, c.email, c.plan, COALESCE(m.status, IF(c.plan = 'community', 'free', 'trial')) AS status FROM customers c LEFT JOIN customer_meta m ON m.customer_id = c.id WHERE c.id = ?1").bind(m[1]).first<{ id: string; first_name: string; email: string; plan: string; status: string }>();
    if (!c) return json({ error: 'Not found.' }, 404);
    const b = ((await readJson(req)) ?? {}) as Record<string, unknown>;
    const status = typeof b.status === 'string' && CUSTOMER_STATUSES.includes(b.status) ? b.status : c.status;
    const plan = typeof b.plan === 'string' && ['community', 'starter', 'business', 'enterprise'].includes(b.plan) ? b.plan : c.plan;
    const note = String(b.note ?? '').trim().slice(0, 1000);
    if ((status === 'suspended' || status === 'closed') && status !== c.status && !note) return json({ error: 'Add a reason. It is included in the email.', fields: { note: 'Required.' } }, 400);
    await env.DB.prepare('UPDATE customers SET plan = ?2 WHERE id = ?1').bind(c.id, plan).run();
    await env.DB.prepare('INSERT INTO customer_meta (customer_id, status, newsletter, updated_at) VALUES (?1, ?2, 0, ?3) ON DUPLICATE KEY UPDATE status = VALUES(status), updated_at = VALUES(updated_at)').bind(c.id, status, now()).run();
    let email: string | null = null;
    if (plan !== c.plan) await logActivity(env, 'customer', c.id, actor, 'plan', c.plan, plan, note || null);
    if (status !== c.status) {
      await logActivity(env, 'customer', c.id, actor, 'status', c.status, status, note || null);
      if (b.notify !== false) email = await sendMail(env, c.email, 'account_status', { name: c.first_name, status: CUSTOMER_STATUS_LABEL[status].toLowerCase(), reason: note });
    }
    return json({ ok: true, email });
  }
  if (m && method === 'DELETE') {
    if (me.role !== 'admin') return json({ error: 'Only an admin can delete an account.' }, 403);
    await env.DB.batch([
      env.DB.prepare('DELETE FROM customers WHERE id = ?1').bind(m[1]),
      env.DB.prepare('DELETE FROM customer_meta WHERE customer_id = ?1').bind(m[1]),
      env.DB.prepare("DELETE FROM tokens WHERE user_type = 'customer' AND user_id = ?1").bind(m[1]),
    ]);
    await logActivity(env, 'customer', m[1], actor, 'deleted');
    return json({ ok: true });
  }

  // ===================== email log and test =====================
  if (method === 'GET' && path === '/emails') {
    if (me.role !== 'admin' && me.role !== 'viewer') return deny();
    const rows = await env.DB.prepare('SELECT * FROM email_log ORDER BY id DESC LIMIT 300').all();
    return json({ items: rows.results, configured: mailConfigured(env), from: env.MAIL_FROM || env.SMTP_USER || '', notify: env.NOTIFY_EMAIL || '', host: env.SMTP_HOST || '' });
  }
  if (method === 'POST' && path === '/emails/test-template') {
    // “Send me a test” in the email editor: the unsaved wording, with sample details, to the person's own address.
    if (!can(me, 'content', true)) return deny();
    const b = (await readJson(req)) as { template?: string; subject?: string; body?: string; vars?: Record<string, string> } | null;
    if (!b?.template || !/^[a-z_]{3,40}$/.test(b.template) || typeof b.subject !== 'string' || typeof b.body !== 'string') return json({ error: 'Choose an email first.' }, 400);
    const vars = Object.fromEntries(Object.entries(b.vars ?? {}).filter(([k, v]) => /^[a-zA-Z]{1,30}$/.test(k) && typeof v === 'string').map(([k, v]) => [k, String(v).slice(0, 300)]));
    const result = await sendMail(env, me.email, b.template, vars, { subject: `[Test] ${b.subject.slice(0, 250)}`, body: b.body.slice(0, 10000) });
    return json({ result, to: me.email });
  }
  if (method === 'POST' && path === '/emails/test') {
    if (me.role !== 'admin') return deny();
    const result = await sendMail(env, me.email, 'team_new', { type: 'test email', name: 'This is a test from the admin', email: me.email, link: `${base}/admin` });
    return json({ ok: result === 'sent', result });
  }

  // ===================== activity feed =====================
  if (method === 'GET' && path === '/activity') {
    const rows = await env.DB.prepare('SELECT * FROM activity ORDER BY id DESC LIMIT 600').all<{ entity: string; entity_id: string }>();
    return json({ items: (await visibleActivity(env, me, rows.results)).slice(0, 200) });
  }

  // ===================== settings and content approvals =====================
  if (path === '/settings') {
    if (method === 'GET') return json({ contentApproval: await contentApprovalOn(env) });
    if (method === 'PUT') {
      if (me.role !== 'admin') return deny();
      const b = ((await readJson(req)) ?? {}) as { contentApproval?: boolean };
      await env.DB.prepare("INSERT INTO settings (`key`, value) VALUES ('content_approval', ?1) ON DUPLICATE KEY UPDATE value = VALUES(value)").bind(b.contentApproval ? '1' : '0').run();
      await logActivity(env, 'settings', 'content_approval', actor, 'changed', null, b.contentApproval ? 'on' : 'off');
      return json({ ok: true });
    }
  }
  if (method === 'GET' && path === '/drafts') {
    const rows = await env.DB.prepare('SELECT `key`, saved_by, saved_at FROM content_drafts ORDER BY saved_at DESC').all();
    return json({ items: rows.results });
  }

  return null;
}
