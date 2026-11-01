// Self-service for signed-in customers, the partner portal, and small public endpoints
// (community and event requests, partner directory, job application status, newsletter unsubscribe).
import { z } from 'zod';
import { DUMMY_HASH, hashPassword, signToken, verifyPassword, verifyToken } from './crypto';
import { allow, json, readCookie, readJson } from './http';
import type { Env } from './http';
import { notifyTeam, sendMail } from './mail';
import {
  PARTNER_CHECKLIST, STAGES, addDays, bumpSessionVersion, consumeToken, createToken, emailVerified, logActivity, markEmailVerified,
  normalizeCompany, now, sessionCurrent, sessionVersion, sign, siteUrl, stageLabel, verifySigned,
} from './workflow';
import resourceDefaults from '../../src/cms/defaults.generated.json';
import { LINKISH } from './validation';
import { publicLists } from './library';

const CUSTOMER_COOKIE = 'ooa_session';
const PARTNER_COOKIE = 'ooa_partner';
const PARTNER_SECONDS = 7 * 86400;
const RESET_SECONDS = 3600;
const INVITE_SECONDS = 7 * 86400;
export const VERIFY_SECONDS = 7 * 86400;
const CUSTOMER_SECONDS = 7 * 86400;

const str = (max: number) => z.string().trim().max(max);
const req = (label: string, max: number) => z.string({ required_error: `${label} is required.` }).trim().min(1, `${label} is required.`).max(max, `${label} is too long.`);
/** For names and companies that are copied into emails: no web addresses or line breaks. */
const plain = (label: string, max: number) => req(label, max).refine((v) => !LINKISH.test(v) && !/[\r\n]/.test(v), `${label} can’t contain a web address.`);
const plainOpt = (label: string, max: number) => str(max).refine((v) => !LINKISH.test(v) && !/[\r\n]/.test(v), `${label} can’t contain a web address.`).optional().default('');
const email = z.string({ required_error: 'Email is required.' }).trim().toLowerCase().email('Enter a valid email address.').max(200);
const password = z.string().min(10, 'Use at least 10 characters.').max(200).refine((p) => /[A-Za-z]/.test(p) && /\d/.test(p), 'Include at least one letter and one number.');
const bad = (e: z.ZodError) => { const fields: Record<string, string> = {}; for (const i of e.issues) fields[String(i.path[0] ?? 'form')] ??= i.message; return json({ error: Object.values(fields)[0] ?? 'Please check the form.', fields }, 400); };

type Customer = { id: string; first_name: string; last_name: string; email: string; company: string; country: string; plan: string; password_hash: string; created_at: string };
type PartnerUser = { id: string; org_id: string; email: string; name: string; role: string; password_hash: string | null; active: number; created_at: string; last_login: string | null };
type Org = { id: string; company: string; country: string; type: string; level: string; status: string; checklist: string; website: string | null; about: string | null; listed: number; created_at: string };

export async function customerStatus(env: Env, id: string) {
  return env.DB.prepare('SELECT status, newsletter FROM customer_meta WHERE customer_id = ?1').bind(id).first<{ status: string; newsletter: number }>();
}

function sameOrigin(r: Request): boolean {
  const origin = r.headers.get('Origin');
  if (!origin) return true;
  try { return new URL(origin).host === new URL(r.url).host; } catch { return false; }
}

/** Customer session cookie. The token carries the session version, so a password change signs out other devices. */
export const customerCookie = (token: string, maxAgeSeconds: number) =>
  `${CUSTOMER_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
export async function customerSession(env: Env, customerId: string): Promise<string> {
  const v = await sessionVersion(env, 'customer', customerId);
  return customerCookie(await signToken({ sub: customerId, aud: 'customer', v }, env.JWT_SECRET, CUSTOMER_SECONDS), CUSTOMER_SECONDS);
}
/** The signed-in customer's id from a valid, current session cookie (tokens from before versions had no aud). */
export async function sessionCustomerId(env: Env, r: Request): Promise<string | null> {
  const token = readCookie(r, CUSTOMER_COOKIE);
  const p = token ? await verifyToken(token, env.JWT_SECRET) : null;
  if (!p || typeof p.sub !== 'string' || (p.aud !== undefined && p.aud !== 'customer')) return null;
  return (await sessionCurrent(env, 'customer', p.sub, p.v)) ? p.sub : null;
}
/** Sends the "confirm your email" link. Used at sign-up (inside the welcome email) and when the customer asks again. */
export async function verifyLink(env: Env, base: string, customerId: string): Promise<string> {
  return `${base}/verify?token=${await createToken(env, 'verify', 'customer', customerId, VERIFY_SECONDS)}`;
}

/** Upcoming events people can register for on /resources/events (those without their own registration link). */
async function openEvents(env: Env): Promise<Set<string>> {
  type Ev = { title?: string; date?: string; url?: string };
  // Published events from the Resources library (the same list the Events page shows).
  let list: Ev[] = [];
  try { list = ((await publicLists(env))['resources.events'] ?? []) as Ev[]; }
  catch { list = ((resourceDefaults as Record<string, unknown>)['resources.events'] as Ev[] | undefined) ?? []; }
  const today = new Date().toISOString().slice(0, 10);
  return new Set(list.filter((e) => e.title && !e.url && (e.date || '9999') >= today).map((e) => `${e.title}${e.date ? ' (' + e.date + ')' : ''}`));
}

async function me(env: Env, r: Request): Promise<Customer | null> {
  const id = await sessionCustomerId(env, r);
  if (!id) return null;
  const c = await env.DB.prepare('SELECT * FROM customers WHERE id = ?1').bind(id).first<Customer>();
  if (!c) return null;
  const m = await customerStatus(env, c.id);
  return m && (m.status === 'suspended' || m.status === 'closed') ? null : c;
}

async function partnerMe(env: Env, r: Request): Promise<{ user: PartnerUser; org: Org } | null> {
  const token = readCookie(r, PARTNER_COOKIE);
  const p = token ? await verifyToken(token, env.JWT_SECRET) : null;
  if (!p || p.aud !== 'partner' || typeof p.sub !== 'string') return null;
  if (!(await sessionCurrent(env, 'partner', p.sub, p.v))) return null;
  const user = await env.DB.prepare('SELECT * FROM partner_users WHERE id = ?1').bind(p.sub).first<PartnerUser>();
  if (!user || !user.active) return null;
  const org = await env.DB.prepare('SELECT * FROM partner_orgs WHERE id = ?1').bind(user.org_id).first<Org>();
  if (!org || org.status === 'inactive') return null;
  return { user, org };
}
const partnerCookie = (t: string, age: number) => `${PARTNER_COOKIE}=${t}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`;
async function partnerSession(env: Env, user: PartnerUser) {
  await env.DB.prepare('UPDATE partner_users SET last_login = ?2 WHERE id = ?1').bind(user.id, now()).run();
  const v = await sessionVersion(env, 'partner', user.id);
  return partnerCookie(await signToken({ sub: user.id, aud: 'partner', v }, env.JWT_SECRET, PARTNER_SECONDS), PARTNER_SECONDS);
}
const orgView = (o: Org) => ({
  id: o.id, company: o.company, country: o.country, type: o.type, level: o.level, status: o.status, website: o.website ?? '', about: o.about ?? '', listed: !!o.listed, createdAt: o.created_at,
  checklist: PARTNER_CHECKLIST.map((c) => ({ ...c, done: !!(JSON.parse(o.checklist || '{}') as Record<string, boolean>)[c.id] })),
});

export async function handlePortal(r: Request, env: Env, route: string, url: URL): Promise<Response | null> {
  const method = r.method;
  if (method !== 'GET' && !sameOrigin(r)) return json({ error: 'Blocked cross-site request.' }, 403);
  const base = siteUrl(env, r);
  let m: RegExpMatchArray | null;

  // ===== public: password reset for customers =====
  if (route === 'POST /api/auth/forgot' || route === 'POST /api/partner/forgot') {
    if (!(await allow(env, r, 'forgot', 8, 900))) return json({ error: 'Too many attempts. Please wait a few minutes.' }, 429);
    const p = z.object({ email }).safeParse(await readJson(r));
    if (!p.success) return bad(p.error);
    const isPartner = route.includes('/partner/');
    const row = isPartner
      ? await env.DB.prepare('SELECT id, name AS first_name FROM partner_users WHERE email = ?1 AND active = 1').bind(p.data.email).first<{ id: string; first_name: string }>()
      : await env.DB.prepare('SELECT id, first_name FROM customers WHERE email = ?1').bind(p.data.email).first<{ id: string; first_name: string }>();
    if (row) {
      const t = await createToken(env, 'reset', isPartner ? 'partner' : 'customer', row.id, RESET_SECONDS);
      await sendMail(env, p.data.email, 'password_reset', { name: row.first_name, link: `${base}/${isPartner ? 'partner/reset' : 'reset'}?token=${t}` });
    }
    // Same answer either way, so nobody can find out which emails have accounts.
    return json({ ok: true });
  }
  if (route === 'POST /api/auth/reset' || route === 'POST /api/partner/reset' || route === 'POST /api/partner/accept') {
    if (!(await allow(env, r, 'reset', 15, 900))) return json({ error: 'Too many attempts. Please wait a few minutes.' }, 429);
    const p = z.object({ token: z.string().min(10).max(100), password }).safeParse(await readJson(r));
    if (!p.success) return bad(p.error);
    const isPartner = route.includes('/partner/');
    // Reset links and invitations are only accepted on their own pages.
    const purposes = route === 'POST /api/partner/accept' ? (['invite'] as const) : (['reset'] as const);
    const t = await consumeToken(env, p.data.token, isPartner ? 'partner' : 'customer', [...purposes]);
    if (!t) return json({ error: 'This link has expired or was already used. Ask for a new one.' }, 400);
    const hash = await hashPassword(p.data.password);
    if (isPartner) {
      const user = await env.DB.prepare('SELECT * FROM partner_users WHERE id = ?1').bind(t.userId).first<PartnerUser>();
      if (!user) return json({ error: 'Account not found.' }, 404);
      await env.DB.prepare('UPDATE partner_users SET password_hash = ?2 WHERE id = ?1').bind(t.userId, hash).run();
      await bumpSessionVersion(env, 'partner', user.id);
      await logActivity(env, 'partner_org', user.org_id, user.name, t.purpose === 'invite' ? 'portal_activated' : 'password_reset');
      return json({ ok: true }, 200, { 'Set-Cookie': await partnerSession(env, user) });
    }
    const cust = await env.DB.prepare('SELECT email FROM customers WHERE id = ?1').bind(t.userId).first<{ email: string }>();
    if (!cust) return json({ error: 'Account not found.' }, 404);
    await env.DB.prepare('UPDATE customers SET password_hash = ?2 WHERE id = ?1').bind(t.userId, hash).run();
    await bumpSessionVersion(env, 'customer', t.userId);
    // The reset link reached this inbox, which proves the address belongs to the customer.
    await markEmailVerified(env, t.userId, cust.email);
    await logActivity(env, 'customer', t.userId, 'Customer', 'password_reset');
    return json({ ok: true });
  }

  // ===== public: confirm a customer's email address =====
  if (route === 'POST /api/auth/verify') {
    if (!(await allow(env, r, 'reset', 15, 900))) return json({ error: 'Too many attempts. Please wait a few minutes.' }, 429);
    const p = z.object({ token: z.string().min(10).max(100) }).safeParse(await readJson(r));
    if (!p.success) return json({ error: 'This link isn’t valid.' }, 400);
    const t = await consumeToken(env, p.data.token, 'customer', ['verify']);
    if (!t) return json({ error: 'This link has expired or was already used. Sign in and ask for a new one from My account.' }, 400);
    const cust = await env.DB.prepare('SELECT email, first_name, last_name FROM customers WHERE id = ?1').bind(t.userId).first<{ email: string; first_name: string; last_name: string }>();
    if (!cust) return json({ error: 'Account not found.' }, 404);
    await markEmailVerified(env, t.userId, cust.email);
    await logActivity(env, 'customer', t.userId, `${cust.first_name} ${cust.last_name}`, 'email_verified');
    return json({ ok: true });
  }

  // ===== public: requests, directory, application status, unsubscribe =====
  m = route.match(/^POST \/api\/requests\/(community|event)$/);
  if (m) {
    if (!(await allow(env, r, 'leads', 30, 3600))) return json({ error: 'Too many submissions. Please try again later.' }, 429);
    const kind = m[1];
    const p = z.object({ name: plain('Name', 120), email, company: plainOpt('Company', 120), message: str(1000).optional().default(''), event: str(200).optional().default('') }).safeParse(await readJson(r));
    if (!p.success) return bad(p.error);
    if (kind === 'event' && !p.data.event) return json({ error: 'Choose an event.' }, 400);
    // Only events actually open for registration on the Events page; the name is copied into the confirmation email.
    if (kind === 'event' && !(await openEvents(env)).has(p.data.event)) return json({ error: 'Registration for this event isn’t open.' }, 400);
    if (kind === 'community') p.data.event = '';
    const id = crypto.randomUUID();
    await env.DB.prepare('INSERT INTO requests (id, kind, name, email, payload, status, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)')
      .bind(id, kind, p.data.name, p.data.email, JSON.stringify(p.data), kind === 'event' ? 'registered' : 'new', now()).run();
    await logActivity(env, 'request', id, p.data.name, 'submitted');
    if (kind === 'community') await sendMail(env, p.data.email, 'community_received', { name: p.data.name });
    else await sendMail(env, p.data.email, 'event_received', { name: p.data.name, event: p.data.event });
    await notifyTeam(env, { type: kind === 'community' ? 'community invite request' : `event registration (${p.data.event})`, name: p.data.name, email: p.data.email, link: `${base}/admin/requests` });
    return json({ ok: true }, 201);
  }
  if (route === 'GET /api/partners/directory') {
    const rows = await env.DB.prepare("SELECT company, country, type, level, website, about FROM partner_orgs WHERE status = 'active' AND listed = 1 ORDER BY FIELD(level, 'Strategic', 'Certified', 'Registered'), company").all();
    return json({ items: rows.results }, 200, { 'Cache-Control': 'public, max-age=60' });
  }
  m = route.match(/^GET \/api\/application\/([\w-]{36})\.([\w-]{10,40})$/);
  if (m) {
    if (!verifySigned(env, 'app:' + m[1], m[2])) return json({ error: 'This link isn’t valid.' }, 404);
    const row = await env.DB.prepare("SELECT l.payload, l.created_at, m.stage FROM leads l LEFT JOIN lead_meta m ON m.lead_id = l.id WHERE l.id = ?1 AND l.kind = 'career'").bind(m[1]).first<{ payload: string; created_at: string; stage: string | null }>();
    if (!row) return json({ error: 'This application was not found. It may have been removed.' }, 404);
    const pl = JSON.parse(row.payload) as Record<string, string>;
    const stage = row.stage ?? 'new';
    const steps = STAGES.career.filter((s) => !s.done || s.id === stage).map((s) => ({ id: s.id, label: s.label }));
    return json({ name: pl.cn, role: pl.crole || 'General application', submittedAt: row.created_at, stage, stageLabel: stageLabel('career', stage), closed: !!STAGES.career.find((s) => s.id === stage)?.done, steps });
  }
  if (route === 'POST /api/unsubscribe') {
    const b = (await readJson(r)) as { e?: string; s?: string } | null;
    const e = String(b?.e ?? '').trim().toLowerCase();
    if (!e || !verifySigned(env, 'nl:' + e, String(b?.s ?? ''))) return json({ error: 'This unsubscribe link isn’t valid.' }, 400);
    const rows = await env.DB.prepare("SELECT l.id FROM leads l WHERE l.kind = 'newsletter' AND JSON_UNQUOTE(JSON_EXTRACT(l.payload, '$.nl')) = ?1").bind(e).all<{ id: string }>();
    for (const x of rows.results) {
      await env.DB.prepare("INSERT INTO lead_meta (lead_id, stage, updated_at) VALUES (?1, 'unsubscribed', ?2) ON DUPLICATE KEY UPDATE stage = 'unsubscribed', updated_at = VALUES(updated_at)").bind(x.id, now()).run();
      await logActivity(env, 'lead', x.id, e, 'stage', null, 'unsubscribed', 'Unsubscribed from the email link');
    }
    await env.DB.prepare('UPDATE customer_meta SET newsletter = 0 WHERE customer_id IN (SELECT id FROM customers WHERE email = ?1)').bind(e).run();
    return json({ ok: true });
  }

  // ===== signed-in customers =====
  if (route.startsWith(`${method} /api/auth/`) && ['/profile', '/password', '/requests', '/plan-request', '/newsletter', '/export', '/delete-request', '/resend-verification'].some((x) => url.pathname.endsWith(x))) {
    const c = await me(env, r);
    if (!c) return json({ error: 'Please sign in.' }, 401);
    const who = `${c.first_name} ${c.last_name}`;
    // Data that is matched by email address (demo requests, event and community requests) is only shown
    // once the customer has proved the address is theirs.
    const verified = await emailVerified(env, c.id);
    if (route === 'POST /api/auth/resend-verification') {
      if (verified) return json({ ok: true, alreadyVerified: true });
      if (!(await allow(env, r, 'verify-resend', 3, 900))) return json({ error: 'We’ve just sent a link. Please check your inbox (and spam folder) or try again in a few minutes.' }, 429);
      const sent = await sendMail(env, c.email, 'verify_email', { name: c.first_name, link: await verifyLink(env, base, c.id) });
      return json({ ok: true, email: sent });
    }
    if (route === 'PATCH /api/auth/profile') {
      const p = z.object({ firstName: plain('First name', 60), lastName: plain('Last name', 60), company: plain('Company', 120), country: req('Country', 80) }).safeParse(await readJson(r));
      if (!p.success) return bad(p.error);
      await env.DB.prepare('UPDATE customers SET first_name = ?2, last_name = ?3, company = ?4, country = ?5 WHERE id = ?1').bind(c.id, p.data.firstName, p.data.lastName, p.data.company, p.data.country).run();
      await logActivity(env, 'customer', c.id, who, 'profile_updated');
      return json({ ok: true });
    }
    if (route === 'POST /api/auth/password') {
      const p = z.object({ current: z.string().min(1, 'Enter your current password.').max(200), next: password }).safeParse(await readJson(r));
      if (!p.success) return bad(p.error);
      if (!(await verifyPassword(p.data.current, c.password_hash))) return json({ error: 'Your current password is not correct.', fields: { current: 'Not correct.' } }, 400);
      await env.DB.prepare('UPDATE customers SET password_hash = ?2 WHERE id = ?1').bind(c.id, await hashPassword(p.data.next)).run();
      // Sign out every other device, and give this one a fresh session.
      await bumpSessionVersion(env, 'customer', c.id);
      await logActivity(env, 'customer', c.id, who, 'password_changed');
      return json({ ok: true }, 200, { 'Set-Cookie': await customerSession(env, c.id) });
    }
    if (route === 'GET /api/auth/requests') {
      const demos = verified
        ? await env.DB.prepare("SELECT l.id, l.created_at, l.payload, m.stage FROM leads l LEFT JOIN lead_meta m ON m.lead_id = l.id WHERE l.kind = 'demo' AND JSON_UNQUOTE(JSON_EXTRACT(l.payload, '$.em')) = ?1 ORDER BY l.created_at DESC").bind(c.email).all<{ id: string; created_at: string; payload: string; stage: string | null }>()
        : { results: [] as { id: string; created_at: string; payload: string; stage: string | null }[] };
      const reqs = await env.DB.prepare(verified
        ? 'SELECT id, kind, status, reason, payload, created_at, updated_at FROM requests WHERE customer_id = ?1 OR email = ?2 ORDER BY created_at DESC'
        : 'SELECT id, kind, status, reason, payload, created_at, updated_at FROM requests WHERE customer_id = ?1 ORDER BY created_at DESC').bind(c.id, c.email).all<{ id: string; kind: string; status: string; reason: string | null; payload: string; created_at: string; updated_at: string }>();
      return json({ items: [
        ...demos.results.map((d) => ({ id: d.id, kind: 'demo', title: 'Demo request', detail: (JSON.parse(d.payload) as Record<string, string>).pr || '', status: stageLabel('demo', d.stage ?? 'new'), createdAt: d.created_at })),
        ...reqs.results.map((x) => { const pl = JSON.parse(x.payload) as Record<string, string>; return { id: x.id, kind: x.kind, title: x.kind === 'plan' ? `Plan change to ${pl.plan}` : x.kind === 'deletion' ? 'Account deletion' : x.kind === 'event' ? `Event: ${pl.event}` : 'Community invite', detail: x.reason || pl.message || '', status: x.status, createdAt: x.created_at }; }),
      ].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), emailVerified: verified });
    }
    if (route === 'POST /api/auth/plan-request') {
      const p = z.object({ plan: z.enum(['community', 'starter', 'business', 'enterprise']), message: str(1000).optional().default('') }).safeParse(await readJson(r));
      if (!p.success) return bad(p.error);
      if (p.data.plan === c.plan) return json({ error: 'You are already on this plan.' }, 400);
      const open = await env.DB.prepare("SELECT id FROM requests WHERE customer_id = ?1 AND kind = 'plan' AND status = 'new'").bind(c.id).first();
      if (open) return json({ error: 'You already have a plan change waiting for review.' }, 409);
      const id = crypto.randomUUID();
      await env.DB.prepare("INSERT INTO requests (id, kind, customer_id, name, email, payload, status, created_at, updated_at) VALUES (?1, 'plan', ?2, ?3, ?4, ?5, 'new', ?6, ?6)")
        .bind(id, c.id, who, c.email, JSON.stringify({ plan: p.data.plan, from: c.plan, message: p.data.message }), now()).run();
      await logActivity(env, 'request', id, who, 'submitted', c.plan, p.data.plan);
      const planName = p.data.plan[0].toUpperCase() + p.data.plan.slice(1);
      await sendMail(env, c.email, 'plan_received', { name: c.first_name, plan: planName });
      await notifyTeam(env, { type: `plan change request (to ${planName})`, name: `${who} (${c.company})`, email: c.email, link: `${base}/admin/requests` });
      return json({ ok: true }, 201);
    }
    if (route === 'PATCH /api/auth/newsletter') {
      const b = (await readJson(r)) as { on?: boolean } | null;
      const on = b?.on === true;
      if (on && !verified) return json({ error: 'Please confirm your email address first. We can send you a new link from the Overview tab.' }, 403);
      await env.DB.prepare('INSERT INTO customer_meta (customer_id, status, newsletter, updated_at) VALUES (?1, ?2, ?3, ?4) ON DUPLICATE KEY UPDATE newsletter = VALUES(newsletter), updated_at = VALUES(updated_at)')
        .bind(c.id, c.plan === 'community' ? 'free' : 'trial', on ? 1 : 0, now()).run();
      const existing = await env.DB.prepare("SELECT id FROM leads WHERE kind = 'newsletter' AND JSON_UNQUOTE(JSON_EXTRACT(payload, '$.nl')) = ?1 LIMIT 1").bind(c.email).first<{ id: string }>();
      if (existing) {
        await env.DB.prepare('INSERT INTO lead_meta (lead_id, stage, updated_at) VALUES (?1, ?2, ?3) ON DUPLICATE KEY UPDATE stage = VALUES(stage), updated_at = VALUES(updated_at)').bind(existing.id, on ? 'subscribed' : 'unsubscribed', now()).run();
      } else if (on) {
        const id = crypto.randomUUID();
        await env.DB.batch([
          env.DB.prepare("INSERT INTO leads (id, kind, status, payload, created_at) VALUES (?1, 'newsletter', 'new', ?2, ?3)").bind(id, JSON.stringify({ nl: c.email }), now()),
          env.DB.prepare("INSERT INTO lead_meta (lead_id, stage, updated_at) VALUES (?1, 'subscribed', ?2)").bind(id, now()),
        ]);
      }
      return json({ ok: true, newsletter: on });
    }
    if (route === 'GET /api/auth/export') {
      const meta = await customerStatus(env, c.id);
      const reqs = await env.DB.prepare('SELECT kind, status, payload, created_at FROM requests WHERE customer_id = ?1').bind(c.id).all();
      const demos = verified ? await env.DB.prepare("SELECT payload, created_at FROM leads WHERE kind = 'demo' AND JSON_UNQUOTE(JSON_EXTRACT(payload, '$.em')) = ?1").bind(c.email).all() : { results: [] };
      const body = { account: { firstName: c.first_name, lastName: c.last_name, email: c.email, emailVerified: verified, company: c.company, country: c.country, plan: c.plan, status: meta?.status, newsletter: !!meta?.newsletter, createdAt: c.created_at }, requests: reqs.results, demoRequests: demos.results, ...(verified ? {} : { note: 'Demo requests sent with this email address are included once you confirm the address.' }), exportedAt: now() };
      return new Response(JSON.stringify(body, null, 2), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': 'attachment; filename="my-oneofficeautomation-data.json"', 'Cache-Control': 'no-store' } });
    }
    if (route === 'POST /api/auth/delete-request') {
      const open = await env.DB.prepare("SELECT id FROM requests WHERE customer_id = ?1 AND kind = 'deletion' AND status = 'new'").bind(c.id).first();
      if (open) return json({ error: 'Your deletion request is already waiting for review.' }, 409);
      const b = (await readJson(r)) as { message?: string } | null;
      const id = crypto.randomUUID();
      await env.DB.prepare("INSERT INTO requests (id, kind, customer_id, name, email, payload, status, created_at, updated_at) VALUES (?1, 'deletion', ?2, ?3, ?4, ?5, 'new', ?6, ?6)")
        .bind(id, c.id, who, c.email, JSON.stringify({ message: String(b?.message ?? '').slice(0, 1000) }), now()).run();
      await logActivity(env, 'request', id, who, 'submitted');
      await notifyTeam(env, { type: 'account deletion request', name: `${who} (${c.company})`, email: c.email, link: `${base}/admin/requests` });
      return json({ ok: true }, 201);
    }
  }

  // ===== partner portal =====
  if (!url.pathname.startsWith('/api/partner/')) return null;
  if (route === 'POST /api/partner/login') {
    if (!(await allow(env, r, 'auth', 20, 900))) return json({ error: 'Too many attempts. Please wait a few minutes and try again.' }, 429);
    const p = z.object({ email, password: z.string().min(1).max(200) }).safeParse(await readJson(r));
    if (!p.success) return bad(p.error);
    const user = await env.DB.prepare('SELECT * FROM partner_users WHERE email = ?1').bind(p.data.email).first<PartnerUser>();
    const ok = await verifyPassword(p.data.password, user?.password_hash ?? DUMMY_HASH);
    if (!user || !user.active || !user.password_hash || !ok) return json({ error: 'Email or password is incorrect.' }, 401);
    const org = await env.DB.prepare('SELECT status FROM partner_orgs WHERE id = ?1').bind(user.org_id).first<{ status: string }>();
    if (!org || org.status === 'inactive') return json({ error: 'This partner account is inactive. Please contact our partner team.' }, 403);
    return json({ ok: true }, 200, { 'Set-Cookie': await partnerSession(env, user) });
  }
  if (route === 'POST /api/partner/logout') return json({ ok: true }, 200, { 'Set-Cookie': partnerCookie('', 0) });

  const pm = await partnerMe(env, r);
  if (!pm) return json({ error: 'Please sign in to the partner portal.' }, 401);
  const { user, org } = pm;

  if (route === 'GET /api/partner/me') {
    return json({ user: { id: user.id, name: user.name, email: user.email, role: user.role }, org: orgView(org) });
  }
  if (route === 'PATCH /api/partner/profile') {
    const p = z.object({ website: z.string().trim().max(300).refine((w) => w === '' || /^https?:\/\//.test(w), 'Start the website with https://').optional().default(''), about: str(1000).optional().default(''), listed: z.boolean() }).safeParse(await readJson(r));
    if (!p.success) return bad(p.error);
    await env.DB.prepare('UPDATE partner_orgs SET website = ?2, about = ?3, listed = ?4, updated_at = ?5 WHERE id = ?1').bind(org.id, p.data.website, p.data.about, p.data.listed ? 1 : 0, now()).run();
    await logActivity(env, 'partner_org', org.id, user.name, 'profile_updated');
    return json({ ok: true });
  }
  if (route === 'GET /api/partner/deals') {
    const rows = await env.DB.prepare('SELECT id, customer, contact, email, country, value, notes, status, reason, protected_until, created_at, updated_at, created_by FROM deals WHERE org_id = ?1 ORDER BY created_at DESC').bind(org.id).all();
    return json({ items: rows.results });
  }
  if (route === 'POST /api/partner/deals') {
    if (org.status !== 'active') return json({ error: 'You can register deals once your partner account is active.' }, 403);
    const p = z.object({ customer: req('Customer company', 200), contact: req('Customer contact', 200), email, country: req('Country', 100), value: str(60).optional().default(''), notes: str(2000).optional().default('') }).safeParse(await readJson(r));
    if (!p.success) return bad(p.error);
    const key = normalizeCompany(p.data.customer) || p.data.customer.trim().toLowerCase();
    const open = await env.DB.prepare("SELECT customer FROM deals WHERE status IN ('submitted', 'approved')").all<{ customer: string }>();
    const dup = open.results.some((d) => (normalizeCompany(d.customer) || d.customer.trim().toLowerCase()) === key);
    if (dup) return json({ error: 'This customer is already registered by a partner. Our partner team can help.', fields: { customer: 'Already registered.' } }, 409);
    const id = crypto.randomUUID();
    await env.DB.prepare("INSERT INTO deals (id, org_id, created_by, customer, contact, email, country, value, notes, status, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 'submitted', ?10, ?10)")
      .bind(id, org.id, user.name, p.data.customer, p.data.contact, p.data.email, p.data.country, p.data.value, p.data.notes, now()).run();
    await logActivity(env, 'deal', id, `${user.name} (${org.company})`, 'submitted');
    await notifyTeam(env, { type: 'deal registration', name: `${p.data.customer}, from ${org.company}`, email: user.email, link: `${base}/admin/deals` });
    return json({ ok: true }, 201);
  }
  m = route.match(/^PATCH \/api\/partner\/deals\/([\w-]+)$/);
  if (m) {
    const b = (await readJson(r)) as { status?: string } | null;
    if (b?.status !== 'won' && b?.status !== 'lost') return json({ error: 'Choose won or lost.' }, 400);
    const deal = await env.DB.prepare('SELECT status FROM deals WHERE id = ?1 AND org_id = ?2').bind(m[1], org.id).first<{ status: string }>();
    if (!deal) return json({ error: 'Deal not found.' }, 404);
    if (deal.status !== 'approved') return json({ error: 'Only approved deals can be marked won or lost.' }, 400);
    await env.DB.prepare('UPDATE deals SET status = ?2, updated_at = ?3 WHERE id = ?1').bind(m[1], b.status, now()).run();
    await logActivity(env, 'deal', m[1], `${user.name} (${org.company})`, 'stage', 'approved', b.status);
    return json({ ok: true });
  }
  if (route === 'GET /api/partner/team') {
    const rows = await env.DB.prepare('SELECT id, name, email, role, active, password_hash IS NOT NULL AS joined, last_login FROM partner_users WHERE org_id = ?1 ORDER BY created_at').bind(org.id).all();
    return json({ items: rows.results });
  }
  if (route === 'POST /api/partner/team') {
    if (user.role !== 'owner') return json({ error: 'Only the main contact can add colleagues.' }, 403);
    const p = z.object({ name: req('Name', 120), email }).safeParse(await readJson(r));
    if (!p.success) return bad(p.error);
    const exists = await env.DB.prepare('SELECT id FROM partner_users WHERE email = ?1').bind(p.data.email).first();
    if (exists) return json({ error: 'This email already has a partner portal account.', fields: { email: 'Already in use.' } }, 409);
    const id = crypto.randomUUID();
    await env.DB.prepare("INSERT INTO partner_users (id, org_id, email, name, role, active, created_at) VALUES (?1, ?2, ?3, ?4, 'member', 1, ?5)").bind(id, org.id, p.data.email, p.data.name, now()).run();
    const t = await createToken(env, 'invite', 'partner', id, INVITE_SECONDS);
    await sendMail(env, p.data.email, 'partner_member_invite', { name: p.data.name, company: org.company, link: `${base}/partner/accept?token=${t}` });
    await logActivity(env, 'partner_org', org.id, user.name, 'member_added', null, null, p.data.email);
    return json({ ok: true }, 201);
  }
  m = route.match(/^DELETE \/api\/partner\/team\/([\w-]+)$/);
  if (m) {
    if (user.role !== 'owner') return json({ error: 'Only the main contact can remove colleagues.' }, 403);
    if (m[1] === user.id) return json({ error: 'You can’t remove yourself.' }, 400);
    await env.DB.prepare("DELETE FROM partner_users WHERE id = ?1 AND org_id = ?2 AND role = 'member'").bind(m[1], org.id).run();
    await logActivity(env, 'partner_org', org.id, user.name, 'member_removed');
    return json({ ok: true });
  }
  return json({ error: 'Not found.' }, 404);
}

export { addDays };
