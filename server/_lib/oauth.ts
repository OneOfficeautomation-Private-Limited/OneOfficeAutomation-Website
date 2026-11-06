// "Continue with Google" and "Continue with GitHub", for customers (sign in or sign up) and for partners (sign in to an
// account the partner team has already approved). Both providers are free to use. A provider appears on the site only once
// its client id and secret are set (see docs/deployment/OAUTH-SETUP.md).
//
// Safety rules: the browser keeps a signed, short-lived "state" cookie that must match the provider's reply (stops forged
// callbacks), Google also gets a PKCE challenge, only an email address the provider says is verified is accepted, and an
// existing unconfirmed password account on that email has its password cleared before the provider takes it over.
import { randomBytes, createHash } from 'node:crypto';
import { decryptSecret, encryptSecret, hashPassword, signToken, verifyToken } from './crypto';
import { allow, readCookie } from './http';
import { notifyTeam } from './mail';
import { customerSession, partnerSession } from './portal';
import { bumpSessionVersion, emailVerified, logActivity, markEmailVerified, now, siteUrl } from './workflow';
import type { Env } from './http';

type Provider = 'google' | 'github';
type Kind = 'customer' | 'partner';
type Profile = { subject: string; email: string; first: string; last: string };

const STATE_COOKIE = 'ooa_oauth';
const STATE_SECONDS = 600;
const PLANS = ['community', 'starter', 'business', 'enterprise'];

/** Endpoints are fixed to the real providers; the overrides exist so the flow can be tested against a local stand-in. */
function endpoints(env: Env, p: Provider) {
  const e = env as unknown as Record<string, string | undefined>;
  const up = p.toUpperCase();
  const d = p === 'google'
    ? { auth: 'https://accounts.google.com/o/oauth2/v2/auth', token: 'https://oauth2.googleapis.com/token', user: 'https://openidconnect.googleapis.com/v1/userinfo', emails: '' }
    : { auth: 'https://github.com/login/oauth/authorize', token: 'https://github.com/login/oauth/access_token', user: 'https://api.github.com/user', emails: 'https://api.github.com/user/emails' };
  return {
    auth: e[`OAUTH_${up}_AUTH_URL`] || d.auth, token: e[`OAUTH_${up}_TOKEN_URL`] || d.token,
    user: e[`OAUTH_${up}_USER_URL`] || d.user, emails: e[`OAUTH_${up}_EMAILS_URL`] || d.emails,
  };
}
export type StoredProvider = { clientId: string; secret: string; enabled: boolean; updatedAt?: string; updatedBy?: string };
const settingKey = (p: Provider) => `oauth.${p}`;
let cache: { at: number; rows: Partial<Record<Provider, StoredProvider | null>> } = { at: 0, rows: {} };
/** Call after the admin changes a provider so the change is used straight away. */
export const forgetOAuthCache = () => { cache = { at: 0, rows: {} }; };

export async function storedProvider(env: Env, p: Provider): Promise<StoredProvider | null> {
  const row = await env.DB.prepare('SELECT value FROM settings WHERE `key` = ?1').bind(settingKey(p)).first<{ value: string }>();
  if (!row) return null;
  try { return JSON.parse(row.value) as StoredProvider; } catch { return null; }
}
export async function saveStoredProvider(env: Env, p: Provider, v: StoredProvider | null): Promise<void> {
  if (!v) await env.DB.prepare('DELETE FROM settings WHERE `key` = ?1').bind(settingKey(p)).run();
  else await env.DB.prepare('INSERT INTO settings (`key`, value) VALUES (?1, ?2) ON DUPLICATE KEY UPDATE value = VALUES(value)').bind(settingKey(p), JSON.stringify(v)).run();
  forgetOAuthCache();
}
export const sealSecret = (env: Env, plain: string) => encryptSecret(plain, env.JWT_SECRET);

/** Where a provider's keys come from: the server settings win; otherwise the ones an admin saved (if switched on). */
export async function creds(env: Env, p: Provider): Promise<{ id: string; secret: string; source: 'server' | 'admin' } | null> {
  const e = env as unknown as Record<string, string | undefined>;
  const id = e[`${p.toUpperCase()}_CLIENT_ID`], secret = e[`${p.toUpperCase()}_CLIENT_SECRET`];
  if (id && secret) return { id, secret, source: 'server' };
  if (Date.now() - cache.at > 30_000) cache = { at: Date.now(), rows: {} };
  if (!(p in cache.rows)) cache.rows[p] = await storedProvider(env, p).catch(() => null);
  const s = cache.rows[p];
  if (!s || !s.enabled || !s.clientId || !s.secret) return null;
  const plain = await decryptSecret(s.secret, env.JWT_SECRET);
  return plain ? { id: s.clientId, secret: plain, source: 'admin' } : null;
}

const redirect = (to: string, cookie?: string) => {
  const h = new Headers({ Location: to, 'Cache-Control': 'no-store' });
  if (cookie) h.append('Set-Cookie', cookie);
  return new Response(null, { status: 302, headers: h });
};
const stateCookie = (token: string, age: number) => `${STATE_COOKIE}=${token}; Path=/api/oauth; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`;
const failTo = (kind: Kind, code: string) => redirect(`${kind === 'partner' ? '/partner/login' : '/signin'}?oauth=${code}`, stateCookie('', 0));
const b64url = (b: Buffer) => b.toString('base64url');

async function exchange(env: Env, p: Provider, code: string, verifier: string, redirectUri: string): Promise<string | null> {
  const c = await creds(env, p); if (!c) return null;
  const body = new URLSearchParams({ client_id: c.id, client_secret: c.secret, code, redirect_uri: redirectUri, grant_type: 'authorization_code' });
  if (p === 'google') body.set('code_verifier', verifier);
  const r = await fetch(endpoints(env, p).token, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  if (!r.ok) return null;
  const j = (await r.json().catch(() => null)) as { access_token?: string } | null;
  return j?.access_token ?? null;
}

/** The person's id and a verified email address from the provider, or null if it can't be trusted. */
async function profile(env: Env, p: Provider, token: string): Promise<Profile | null> {
  const ep = endpoints(env, p);
  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/json', 'User-Agent': 'OneOfficeAutomation' };
  const u = await fetch(ep.user, { headers });
  if (!u.ok) return null;
  const j = (await u.json().catch(() => null)) as Record<string, unknown> | null;
  if (!j) return null;
  let email = '';
  if (p === 'google') {
    if (j.email_verified !== true && j.email_verified !== 'true') return null;
    email = String(j.email ?? '');
    const first = String(j.given_name ?? '').trim(), last = String(j.family_name ?? '').trim();
    const [f, ...rest] = String(j.name ?? '').trim().split(/\s+/);
    return email ? { subject: String(j.sub ?? ''), email: email.toLowerCase(), first: first || f || 'Customer', last: last || rest.join(' ') || '-' } : null;
  }
  // GitHub: the public profile email is not proof of ownership; use the primary address GitHub has verified.
  const e = await fetch(ep.emails, { headers });
  if (!e.ok) return null;
  const list = (await e.json().catch(() => null)) as { email: string; primary: boolean; verified: boolean }[] | null;
  const primary = Array.isArray(list) ? list.find((x) => x.primary && x.verified) ?? list.find((x) => x.verified) : null;
  if (!primary) return null;
  email = primary.email;
  const [f, ...rest] = String(j.name ?? j.login ?? '').trim().split(/\s+/);
  return { subject: String(j.id ?? ''), email: email.toLowerCase(), first: f || 'Customer', last: rest.join(' ') || '-' };
}

async function linked(env: Env, p: Provider, subject: string) {
  return env.DB.prepare('SELECT user_type, user_id FROM oauth_identities WHERE provider = ?1 AND subject = ?2').bind(p, subject).first<{ user_type: string; user_id: string }>();
}
async function link(env: Env, p: Provider, subject: string, type: Kind, id: string, email: string) {
  await env.DB.prepare('INSERT INTO oauth_identities (provider, subject, user_type, user_id, email, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6) ON DUPLICATE KEY UPDATE email = VALUES(email)').bind(p, subject, type, id, email, now()).run();
}

async function customerFor(env: Env, p: Provider, pr: Profile, plan: string, request: Request): Promise<{ cookie: string } | { error: string }> {
  const trim = (s: string, n: number) => s.slice(0, n);
  let id: string | null = null;
  const known = await linked(env, p, pr.subject);
  if (known?.user_type === 'customer') id = known.user_id;
  if (!id) {
    const existing = await env.DB.prepare('SELECT id FROM customers WHERE email = ?1').bind(pr.email).first<{ id: string }>();
    if (existing) {
      id = existing.id;
      // A password account nobody has confirmed could have been created by someone else using this address: lock that password out.
      if (!(await emailVerified(env, id))) {
        await env.DB.prepare('UPDATE customers SET password_hash = ?2 WHERE id = ?1').bind(id, await hashPassword(randomBytes(32).toString('hex'))).run();
        await bumpSessionVersion(env, 'customer', id);
      }
    }
  }
  if (id) {
    const meta = await env.DB.prepare('SELECT status FROM customer_meta WHERE customer_id = ?1').bind(id).first<{ status: string }>();
    if (meta && (meta.status === 'suspended' || meta.status === 'closed')) return { error: 'suspended' };
  } else {
    id = crypto.randomUUID();
    const status = plan === 'enterprise' ? 'enterprise_pending' : plan === 'community' ? 'free' : 'trial';
    await env.DB.prepare(
      `INSERT INTO customers (id, first_name, last_name, email, company, country, plan, password_hash, created_at)
       VALUES (?1, ?2, ?3, ?4, '', '', ?5, ?6, ?7)`,
    ).bind(id, trim(pr.first, 100), trim(pr.last, 100), pr.email, plan, await hashPassword(randomBytes(32).toString('hex')), now()).run();
    await env.DB.prepare('INSERT INTO customer_meta (customer_id, status, newsletter, updated_at) VALUES (?1, ?2, 0, ?3)').bind(id, status, now()).run();
    await logActivity(env, 'customer', id, `${pr.first} ${pr.last}`, 'signed_up', null, status);
    await notifyTeam(env, { type: plan === 'enterprise' ? 'Enterprise sign-up (needs sales follow-up)' : 'sign-up', name: `${pr.first} ${pr.last} (via ${p === 'google' ? 'Google' : 'GitHub'})`, email: pr.email, link: `${siteUrl(env, request)}/admin/customers` });
  }
  await markEmailVerified(env, id, pr.email);
  await link(env, p, pr.subject, 'customer', id, pr.email);
  return { cookie: await customerSession(env, id) };
}

async function partnerFor(env: Env, p: Provider, pr: Profile): Promise<{ cookie: string } | { error: string }> {
  const user = await env.DB.prepare('SELECT id, org_id FROM partner_users WHERE email = ?1 AND active = 1').bind(pr.email).first<{ id: string; org_id: string }>();
  if (!user) return { error: 'no_partner' };
  const org = await env.DB.prepare('SELECT status FROM partner_orgs WHERE id = ?1').bind(user.org_id).first<{ status: string }>();
  if (!org || org.status === 'inactive') return { error: 'inactive' };
  await link(env, p, pr.subject, 'partner', user.id, pr.email);
  return { cookie: await partnerSession(env, user) };
}

export async function handleOAuth(request: Request, env: Env, route: string, url: URL): Promise<Response | null> {
  if (route === 'GET /api/oauth/providers') {
    return new Response(JSON.stringify({ google: !!(await creds(env, 'google')), github: !!(await creds(env, 'github')) }), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=60' } });
  }
  const m = route.match(/^GET \/api\/oauth\/(google|github)\/(start|callback)$/);
  if (!m) return null;
  const provider = m[1] as Provider;
  const redirectUri = `${siteUrl(env, request)}/api/oauth/${provider}/callback`;

  if (m[2] === 'start') {
    const kind: Kind = url.searchParams.get('as') === 'partner' ? 'partner' : 'customer';
    if (!(await allow(env, request, 'oauth', 40, 600))) return failTo(kind, 'busy');
    const c = await creds(env, provider);
    if (!c) return failTo(kind, 'unavailable');
    const planAsked = (url.searchParams.get('plan') ?? '').toLowerCase();
    const plan = PLANS.includes(planAsked) ? planAsked : 'community';
    const state = randomBytes(24).toString('hex');
    const verifier = b64url(randomBytes(32));
    const token = await signToken({ aud: 'oauth', st: state, cv: verifier, k: kind, p: plan, pr: provider }, env.JWT_SECRET, STATE_SECONDS);
    const q = new URLSearchParams({ client_id: c.id, redirect_uri: redirectUri, response_type: 'code', state });
    if (provider === 'google') {
      q.set('scope', 'openid email profile'); q.set('prompt', 'select_account');
      q.set('code_challenge', b64url(createHash('sha256').update(verifier).digest())); q.set('code_challenge_method', 'S256');
    } else { q.set('scope', 'read:user user:email'); q.set('allow_signup', 'true'); }
    return redirect(`${endpoints(env, provider).auth}?${q}`, stateCookie(token, STATE_SECONDS));
  }

  // callback
  const raw = readCookie(request, STATE_COOKIE);
  const saved = raw ? await verifyToken(raw, env.JWT_SECRET) : null;
  const kind: Kind = saved?.k === 'partner' ? 'partner' : 'customer';
  if (!(await allow(env, request, 'oauth', 40, 600))) return failTo(kind, 'busy');
  if (!saved || saved.aud !== 'oauth' || saved.pr !== provider || !saved.st || saved.st !== url.searchParams.get('state')) return failTo(kind, 'state');
  if (url.searchParams.get('error') || !url.searchParams.get('code')) return failTo(kind, 'denied');
  try {
    const access = await exchange(env, provider, url.searchParams.get('code') as string, String(saved.cv), redirectUri);
    const pr = access ? await profile(env, provider, access) : null;
    if (!pr || !pr.subject) return failTo(kind, 'email');
    const result = kind === 'partner' ? await partnerFor(env, provider, pr) : await customerFor(env, provider, pr, String(saved.p), request);
    if ('error' in result) return failTo(kind, result.error);
    const h = new Headers({ Location: kind === 'partner' ? '/partner' : '/account', 'Cache-Control': 'no-store' });
    h.append('Set-Cookie', result.cookie);
    h.append('Set-Cookie', stateCookie('', 0));
    return new Response(null, { status: 302, headers: h });
  } catch (err) {
    console.error('OAuth sign-in failed:', err instanceof Error ? err.message : err);
    return failTo(kind, 'failed');
  }
}
