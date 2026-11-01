// Shared workflow rules: pipeline stages, the activity log, one-time links and signed links.
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Env } from './http';

/** Pipeline stages for each kind of form submission, in order. The first one is where new items start. */
export const STAGES: Record<string, { id: string; label: string; done?: boolean }[]> = {
  demo: [
    { id: 'new', label: 'New' }, { id: 'contacted', label: 'Contacted' }, { id: 'scheduled', label: 'Demo scheduled' },
    { id: 'done', label: 'Demo done' }, { id: 'won', label: 'Won', done: true }, { id: 'lost', label: 'Lost', done: true },
  ],
  download: [
    { id: 'new', label: 'New' }, { id: 'contacted', label: 'Contacted' },
    { id: 'qualified', label: 'Qualified', done: true }, { id: 'closed', label: 'Not a fit', done: true },
  ],
  partner: [
    { id: 'submitted', label: 'Submitted' }, { id: 'review', label: 'In review' },
    { id: 'approved', label: 'Approved', done: true }, { id: 'rejected', label: 'Rejected', done: true },
  ],
  career: [
    { id: 'new', label: 'New' }, { id: 'screening', label: 'Screening' }, { id: 'intro', label: 'Intro chat' }, { id: 'task', label: 'Practical task' },
    { id: 'offer', label: 'Offer' }, { id: 'hired', label: 'Hired', done: true }, { id: 'rejected', label: 'Not successful', done: true }, { id: 'withdrawn', label: 'Withdrawn', done: true },
  ],
  newsletter: [{ id: 'subscribed', label: 'Subscribed' }, { id: 'unsubscribed', label: 'Unsubscribed', done: true }],
};
export const PARTNER_LEVELS = ['Registered', 'Certified', 'Strategic'];
export const PARTNER_STATUSES = ['onboarding', 'active', 'inactive'];
export const PARTNER_CHECKLIST = [
  { id: 'agreement', label: 'Partner agreement signed' },
  { id: 'training', label: 'Partner training completed' },
  { id: 'sandbox', label: 'Sandbox environment issued' },
];
export const CUSTOMER_STATUSES = ['free', 'trial', 'paid', 'enterprise_pending', 'enterprise', 'suspended', 'closed'];
export const CUSTOMER_STATUS_LABEL: Record<string, string> = { free: 'Free', trial: 'Trial', paid: 'Paid', enterprise_pending: 'Enterprise (pending)', enterprise: 'Enterprise', suspended: 'Suspended', closed: 'Closed' };
export const REQUEST_KINDS = ['community', 'plan', 'deletion', 'event'];

/** Maps the old three statuses (new, contacted, closed) to a stage, for submissions made before workflows existed. */
export function legacyStage(kind: string, status: string): string {
  const first = STAGES[kind]?.[0]?.id ?? 'new';
  if (kind === 'newsletter') return 'subscribed';
  if (status === 'contacted') return kind === 'partner' ? 'review' : kind === 'career' ? 'screening' : 'contacted';
  if (status === 'closed') return kind === 'demo' ? 'done' : kind === 'partner' ? 'review' : kind === 'career' ? 'screening' : first;
  return first;
}
/** Keeps the old status column meaningful (new, contacted, closed) for exports made before workflows. */
export function legacyStatus(kind: string, stage: string): string {
  const s = STAGES[kind]?.find((x) => x.id === stage);
  if (!s || stage === STAGES[kind][0].id) return 'new';
  return s.done ? 'closed' : 'contacted';
}
export const stageLabel = (kind: string, stage: string) => STAGES[kind]?.find((s) => s.id === stage)?.label ?? stage;

export async function logActivity(env: Env, entity: string, entityId: string, actor: string, action: string, from: string | null = null, to: string | null = null, note: string | null = null) {
  await env.DB.prepare('INSERT INTO activity (entity, entity_id, actor, action, from_value, to_value, note, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)')
    .bind(entity, entityId.slice(0, 36), actor.slice(0, 120), action, from ? from.slice(0, 60) : null, to ? to.slice(0, 60) : null, note ? note.slice(0, 4000) : null, new Date().toISOString()).run();
}

/** Creates a one-time link token. Only its hash is stored. */
export type TokenPurpose = 'reset' | 'invite' | 'verify';
export async function createToken(env: Env, purpose: TokenPurpose, userType: 'customer' | 'partner', userId: string, ttlSeconds: number): Promise<string> {
  const raw = randomBytes(32).toString('base64url');
  const hash = createHash('sha256').update(raw).digest('hex');
  await env.DB.prepare('INSERT INTO tokens (hash, purpose, user_type, user_id, expires_at, used, created_at) VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6)')
    .bind(hash, purpose, userType, userId, Date.now() + ttlSeconds * 1000, new Date().toISOString()).run();
  return raw;
}
/**
 * Uses up a one-time link token. Returns the user it belongs to, or null if it's invalid, used, expired,
 * for another kind of user, or made for a different purpose.
 * Marking it used is one atomic UPDATE, so two requests with the same link can't both succeed.
 */
export async function consumeToken(env: Env, raw: string, userType: 'customer' | 'partner', purposes: TokenPurpose[]): Promise<{ userId: string; purpose: TokenPurpose } | null> {
  if (!raw || raw.length > 100) return null;
  const hash = createHash('sha256').update(raw).digest('hex');
  const row = await env.DB.prepare('SELECT user_id, purpose, user_type FROM tokens WHERE hash = ?1').bind(hash).first<{ user_id: string; purpose: TokenPurpose; user_type: string }>();
  if (!row || row.user_type !== userType || !purposes.includes(row.purpose)) return null;
  const { changes } = await env.DB.prepare('UPDATE tokens SET used = 1 WHERE hash = ?1 AND used = 0 AND expires_at >= ?2').bind(hash, Date.now()).run();
  if (changes !== 1) return null;
  return { userId: row.user_id, purpose: row.purpose };
}

// ---- session versions: bumping a user's version signs out every session issued before it ----
export type SessionKind = 'customer' | 'partner' | 'admin';
export async function sessionVersion(env: Env, kind: SessionKind, userId: string): Promise<number> {
  const row = await env.DB.prepare('SELECT version FROM session_versions WHERE user_type = ?1 AND user_id = ?2').bind(kind, userId).first<{ version: number }>();
  return Number(row?.version ?? 0);
}
/** Signs the user out everywhere (call after a password change or reset, or when access is removed). */
export async function bumpSessionVersion(env: Env, kind: SessionKind, userId: string): Promise<number> {
  await env.DB.prepare('INSERT INTO session_versions (user_type, user_id, version) VALUES (?1, ?2, 1) ON DUPLICATE KEY UPDATE version = version + 1').bind(kind, userId).run();
  return sessionVersion(env, kind, userId);
}
/** Tokens issued before versions existed carry no version and count as version 0. */
export async function sessionCurrent(env: Env, kind: SessionKind, userId: string, tokenVersion: unknown): Promise<boolean> {
  const v = typeof tokenVersion === 'number' ? tokenVersion : 0;
  return v === (await sessionVersion(env, kind, userId));
}

// ---- customer email verification ----
export async function emailVerified(env: Env, customerId: string): Promise<boolean> {
  return !!(await env.DB.prepare('SELECT customer_id FROM customer_verified WHERE customer_id = ?1').bind(customerId).first());
}
export async function markEmailVerified(env: Env, customerId: string, email: string): Promise<void> {
  await env.DB.prepare('INSERT INTO customer_verified (customer_id, email, verified_at) VALUES (?1, ?2, ?3) ON DUPLICATE KEY UPDATE email = VALUES(email), verified_at = VALUES(verified_at)').bind(customerId, email, now()).run();
}

/** Loosely normalises a company name so "Acme Ltd." and "ACME Limited" count as the same customer. */
export function normalizeCompany(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\b(the|private|pvt|limited|ltd|llp|llc|inc|incorporated|corp|corporation|co|company|gmbh|plc|pte|sa|bv)\b/g, ' ')
    .replace(/\s+/g, '')
    .trim();
}

/**
 * Signed, non-expiring links (job application status, newsletter unsubscribe).
 * They use their own key, derived from JWT_SECRET, so a link signature can never double as a session signature.
 */
const linkKey = (env: Env) => createHmac('sha256', env.JWT_SECRET).update('ooa-signed-links-v1').digest();
const mac = (key: string | Buffer, value: string) => createHmac('sha256', key).update(value).digest('base64url').slice(0, 22);
export function sign(env: Env, value: string): string {
  return mac(linkKey(env), value);
}
const sameSig = (expected: string, sig: string) => {
  const a = Buffer.from(expected); const b = Buffer.from(sig || '');
  return a.length === b.length && timingSafeEqual(a, b);
};
export function verifySigned(env: Env, value: string, sig: string): boolean {
  // Links emailed before the separate key existed were signed with JWT_SECRET directly; keep them working.
  return sameSig(sign(env, value), sig) || sameSig(mac(env.JWT_SECRET, value), sig);
}

/** The public address used in links inside emails. Never taken from the request's Host header outside local development. */
export const DEFAULT_SITE_URL = 'https://oneofficeautomation.com';
let warnedSiteUrl = false;
export function siteUrl(env: Env, req: Request): string {
  if (env.SITE_URL) return env.SITE_URL.replace(/\/+$/, '');
  const u = new URL(req.url);
  if (/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(u.host)) return `${u.protocol}//${u.host}`;
  if (!warnedSiteUrl) { warnedSiteUrl = true; console.warn(`SITE_URL is not set; email links will use ${DEFAULT_SITE_URL}.`); }
  return DEFAULT_SITE_URL;
}

export const now = () => new Date().toISOString();
export const addDays = (days: number) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
