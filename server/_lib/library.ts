// Resources library: one database row per article, FAQ, blog post, event or training item.
// Replaces the five big lists (resources.items, .faqs, .insights, .events, .training) as the place content is stored,
// so items have their own status, dates, owner, history and access level, and there's no 400 KB limit per list.
// The public site still receives the lists under the same names (article text is left out and loaded on demand).
import { randomUUID } from 'node:crypto';
import D from '../../src/cms/defaults.generated.json';
import { SECTION_BY_KEY, ValidationError, cleanObject } from '../../src/cms/registry';
import type { Env } from './http';
import { json, readJson } from './http';
import { can, contentApprovalOn } from './adminWorkflow';
import type { Me } from './adminWorkflow';
import { logActivity, siteUrl } from './workflow';
import { itemArticle } from '../../src/cms/itemArticle';
import { slugify } from '../../src/cms/slug';

export const ITEM_TYPES = {
  article: { key: 'resources.items', label: 'Article', title: 'title', product: 'product', category: 'category' },
  faq: { key: 'resources.faqs', label: 'FAQ', title: 'q', product: 'product', category: '' },
  post: { key: 'resources.insights', label: 'Blog item', title: 'title', product: '', category: 'kind' },
  event: { key: 'resources.events', label: 'Event', title: 'title', product: '', category: 'kind' },
  training: { key: 'resources.training', label: 'Training item', title: 'title', product: 'product', category: 'kind' },
  troubleshoot: { key: 'resources.troubleshooting', label: 'Troubleshooting', title: 'symptom', product: 'product', category: '' },
  release: { key: 'resources.releases', label: 'Release note', title: 'version', product: 'product', category: '' },
} as const;
/** Types shown on the website as articles (built by src/cms/itemArticle.ts). */
const AS_ARTICLE = new Set<string>(['troubleshoot', 'release']);
export type ItemType = keyof typeof ITEM_TYPES;
export const LIBRARY_KEYS = new Set<string>(Object.values(ITEM_TYPES).map((t) => t.key));
const STATUSES = ['draft', 'review', 'scheduled', 'published', 'archived'] as const;
const KEEP_REVISIONS = 20;
const MAX_ITEM_BYTES = 200_000;

type Row = {
  id: string; type: ItemType; title: string; status: string; publish_at: string | null; product: string | null; category: string | null;
  parent_id: string | null; sort_order: number; access: string; owner: string | null; review_by: string | null; data: string; version: number;
  created_at: string; created_by: string; updated_at: string; updated_by: string;
};
const now = () => new Date().toISOString();
const isType = (t: string): t is ItemType => Object.prototype.hasOwnProperty.call(ITEM_TYPES, t);
const slug = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

/** Moves the five old lists into the library, once (the first time the library is empty). */
let migrated = false;
export async function migrateLibrary(env: Env): Promise<void> {
  if (migrated) return;
  const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM content_items').first<{ n: number }>();
  if (Number(n?.n ?? 0) > 0) { migrated = true; return; }
  const t = now();
  for (const [type, def] of Object.entries(ITEM_TYPES) as [ItemType, (typeof ITEM_TYPES)[ItemType]][]) {
    const row = await env.DB.prepare('SELECT value FROM content WHERE `key` = ?1').bind(def.key).first<{ value: string }>();
    const list = (row ? JSON.parse(row.value) : (D as Record<string, unknown>)[def.key] ?? []) as Record<string, unknown>[];
    const used = new Set<string>();
    for (let i = 0; i < list.length; i++) {
      const it = list[i];
      let id = type === 'article' && typeof it.id === 'string' && it.id ? it.id : `${type}-${slug(String(it[def.title] ?? '')) || randomUUID().slice(0, 8)}`;
      while (used.has(id)) id = `${id}-${i}`;
      used.add(id);
      await env.DB.prepare('INSERT INTO content_items (id, type, title, status, product, category, sort_order, data, created_at, created_by, updated_at, updated_by) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?9, ?10)')
        .bind(id, type, String(it[def.title] ?? '').slice(0, 300), 'published', def.product ? String(it[def.product] ?? '') || null : null, def.category ? String(it[def.category] ?? '') || null : null, i * 10, JSON.stringify(it), t, 'Moved from the old lists').run();
    }
  }
  migrated = true;
}

const live = (r: Row, at: string) => r.status === 'published' || (r.status === 'scheduled' && !!r.publish_at && r.publish_at <= at);

/**
 * The public lists, under their old names, with only live items. Article text is left out (it loads when an article
 * is opened); customers-only articles are listed with access: 'customers' so the page can ask visitors to sign in.
 */
export async function publicLists(env: Env): Promise<Record<string, unknown[]>> {
  await migrateLibrary(env);
  const rows = await env.DB.prepare('SELECT * FROM content_items ORDER BY type, sort_order, created_at').all<Row>();
  const at = now();
  const out: Record<string, unknown[]> = Object.fromEntries(Object.values(ITEM_TYPES).map((t) => [t.key, []]));
  for (const r of rows.results) {
    if (!live(r, at) || !isType(r.type)) continue;
    const d = JSON.parse(r.data) as Record<string, unknown>;
    if (AS_ARTICLE.has(r.type)) {
      const a = itemArticle(r.type, r.id, d)!;
      out['resources.items'].push({ id: a.id, title: a.title, summary: a.summary, category: a.category, product: a.product, meta: a.meta, points: [], chapter: '', featured: false, parent: '', access: 'public', updated: r.updated_at.slice(0, 10) });
      continue;
    }
    if (r.type === 'article') { delete d.body; d.id = r.id; d.parent = r.parent_id ?? ''; d.access = r.access; d.updated = r.updated_at.slice(0, 10); }
    // Blog posts written on this site, and every event, get their own page; their long text loads when it's opened.
    if (r.type === 'post') {
      const hasText = typeof d.body === 'string' && d.body.trim() !== '';
      delete d.body; d.id = r.id; d.slug = slugify(String(d.slug || d.title || '')) || r.id;
      if (hasText) d.page = `/resources/blog/${d.slug}`;
      // A gated file's address is only given out after the download form; the card goes to that form.
      if (d.file && d.gated) { delete d.file; d.download = `/resources/download/${d.slug}`; }
      else if (!d.gated) delete d.gated;
    }
    if (r.type === 'event') {
      d.hasDetails = typeof d.details === 'string' && d.details.trim() !== '';
      delete d.details; d.id = r.id; d.slug = slugify(String(d.slug || d.title || '')) || r.id; d.page = `/resources/events/${d.slug}`;
    }
    out[ITEM_TYPES[r.type].key].push(d);
  }
  // Troubleshooting and release notes appear inside the articles list, not as lists of their own.
  delete out['resources.troubleshooting']; delete out['resources.releases'];
  return out;
}

/** One article's text, for the article page. Customers-only articles need a signed-in customer. */
export async function articleBody(env: Env, id: string, customerSignedIn: boolean): Promise<Response> {
  await migrateLibrary(env);
  const r = await env.DB.prepare("SELECT * FROM content_items WHERE id = ?1 AND type IN ('article', 'troubleshoot', 'release', 'post', 'event')").bind(id).first<Row>();
  if (!r || !live(r, now())) return json({ error: 'Article not found.' }, 404);
  if (r.access === 'customers' && !customerSignedIn) return json({ error: 'Sign in to read this article.', signIn: true }, 401);
  const d = JSON.parse(r.data) as Record<string, unknown>;
  if (r.type === 'post' || r.type === 'event') return json({ body: String((r.type === 'post' ? d.body : d.details) ?? ''), points: [], updated: r.updated_at.slice(0, 10) }, 200, { 'Cache-Control': 'public, max-age=30' });
  const built = itemArticle(r.type, r.id, d);
  if (built) return json({ body: built.body, points: [], updated: r.updated_at.slice(0, 10) }, 200, { 'Cache-Control': 'public, max-age=30' });
  return json({ body: d.body ?? '', points: d.points ?? [], updated: r.updated_at.slice(0, 10) }, 200, { 'Cache-Control': 'public, max-age=30' });
}

const summary = (r: Row) => ({
  id: r.id, type: r.type, title: r.title, status: r.status, publishAt: r.publish_at, product: r.product, category: r.category,
  parent: r.parent_id, order: r.sort_order, access: r.access, owner: r.owner, reviewBy: r.review_by, version: r.version,
  updatedAt: r.updated_at, updatedBy: r.updated_by, createdAt: r.created_at,
});

/** Admin API for the library: /api/admin/library… Returns null for other routes. */
export async function handleLibrary(env: Env, req: Request, me: Me, method: string, path: string): Promise<Response | null> {
  if (!path.startsWith('/library')) return null; // path arrives without the /api/admin prefix
  if (!can(me, 'content')) return json({ error: 'You don’t have access to website content.' }, 403);
  await migrateLibrary(env);
  const url = new URL(req.url);

  if (method === 'GET' && path === '/library-searches') return json({ items: await searchMisses(env) });
  if (method === 'GET' && path === '/library-digest') {
    const since = /^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get('since') ?? '') ? String(url.searchParams.get('since')) : new Date(Date.now() - 31 * 86400e3).toISOString().slice(0, 10);
    return json(await digest(env, siteUrl(env, req), since));
  }
  if (method === 'GET' && path === '/library') {
    const rows = await env.DB.prepare('SELECT * FROM content_items ORDER BY type, sort_order, created_at').all<Row>();
    const waiting = new Set((await env.DB.prepare('SELECT item_id FROM content_item_drafts').all<{ item_id: string }>()).results.map((r) => r.item_id));
    const today = now().slice(0, 10);
    return json({ items: rows.results.map((r) => ({ ...summary(r), pending: waiting.has(r.id) })), today, types: Object.fromEntries(Object.entries(ITEM_TYPES).map(([k, v]) => [k, v.label])) });
  }

  const m = path.match(/^\/library\/([A-Za-z0-9_-]{1,80})(\/revisions|\/restore|\/approve|\/reject)?$/);
  if (method === 'POST' && path === '/library') {
    if (!can(me, 'content', true)) return json({ error: 'You can view but not change website content.' }, 403);
    const b = (await readJson(req)) as { type?: string; title?: string } | null;
    if (!b?.type || !isType(b.type)) return json({ error: 'Choose what kind of item to create.' }, 400);
    const def = ITEM_TYPES[b.type];
    const title = String(b.title ?? '').trim().slice(0, 200) || `New ${def.label.toLowerCase()}`;
    let id = b.type === 'article' ? slug(title) || `article-${randomUUID().slice(0, 8)}` : `${b.type}-${randomUUID().slice(0, 8)}`;
    if (await env.DB.prepare('SELECT id FROM content_items WHERE id = ?1').bind(id).first()) id = `${id}-${randomUUID().slice(0, 4)}`;
    const data: Record<string, unknown> = { [def.title]: title, ...(b.type === 'article' ? { id } : {}) };
    const max = await env.DB.prepare('SELECT MAX(sort_order) AS m FROM content_items WHERE type = ?1').bind(b.type).first<{ m: number | null }>();
    const t = now();
    await env.DB.prepare('INSERT INTO content_items (id, type, title, status, sort_order, data, owner, created_at, created_by, updated_at, updated_by) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?8, ?9)')
      .bind(id, b.type, title, 'draft', Number(max?.m ?? 0) + 10, JSON.stringify(data), me.name, t, me.name).run();
    await logActivity(env, 'content', id, me.name, 'created', null, `${def.label}: ${title}`.slice(0, 60));
    return json({ id }, 201);
  }
  if (!m) return null;
  const id = m[1];
  const row = await env.DB.prepare('SELECT * FROM content_items WHERE id = ?1').bind(id).first<Row>();
  if (!row) return json({ error: 'This item no longer exists.' }, 404);

  if (method === 'GET' && !m[2]) {
    const d = await env.DB.prepare('SELECT data, meta, saved_by, saved_at FROM content_item_drafts WHERE item_id = ?1').bind(id).first<{ data: string; meta: string; saved_by: string; saved_at: string }>();
    return json({ ...summary(row), data: JSON.parse(row.data), pending: d ? { data: JSON.parse(d.data), meta: JSON.parse(d.meta), savedBy: d.saved_by, savedAt: d.saved_at } : null, feedback: await feedbackFor(env, id) });
  }

  if (method === 'GET' && m[2] === '/revisions') {
    const r = await env.DB.prepare('SELECT id, saved_at, saved_by FROM content_item_revisions WHERE item_id = ?1 ORDER BY id DESC').bind(id).all();
    return json({ items: r.results });
  }

  if (!can(me, 'content', true)) return json({ error: 'You can view but not change website content.' }, 403);

  if (method === 'PUT' && !m[2]) {
    const b = (await readJson(req)) as { data?: unknown; meta?: Record<string, unknown>; version?: number; force?: boolean } | null;
    if (!b || typeof b.data !== 'object') return json({ error: 'Nothing to save.' }, 400);
    if (typeof b.version === 'number' && b.version !== row.version && !b.force) {
      return json({ error: `${row.updated_by} saved this item on ${row.updated_at.slice(0, 16).replace('T', ' ')} UTC, after you opened it. Load their version to keep it, or save yours to replace it.`, conflict: 'live' }, 409);
    }
    const def = ITEM_TYPES[row.type];
    let data: Record<string, unknown>;
    try { data = cleanObject(SECTION_BY_KEY[def.key].fields, b.data, def.label); }
    catch (e) { if (e instanceof ValidationError) return json({ error: e.message }, 400); throw e; }
    if (row.type === 'article') data.id = row.id; // the address can't be changed here (links would break)
    const text = JSON.stringify(data);
    if (Buffer.byteLength(text) > MAX_ITEM_BYTES) return json({ error: 'This item is too large to save (200 KB limit).' }, 413);
    const mt = b.meta ?? {};
    let status = STATUSES.includes(mt.status as (typeof STATUSES)[number]) ? String(mt.status) : row.status;
    // With content approval on, Editors can't publish: their changes wait in review.
    const needsApproval = me.role === 'editor' && (await contentApprovalOn(env));
    if (needsApproval && row.status === 'published') {
      // The live item stays on the website; the change waits for an admin.
      await env.DB.prepare('INSERT INTO content_item_drafts (item_id, data, meta, base_version, saved_by, saved_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6) ON DUPLICATE KEY UPDATE data = VALUES(data), meta = VALUES(meta), base_version = VALUES(base_version), saved_by = VALUES(saved_by), saved_at = VALUES(saved_at)')
        .bind(id, text, JSON.stringify(b.meta ?? {}), row.version, me.name, now()).run();
      await logActivity(env, 'content', id, me.name, 'draft_saved', null, `${def.label}: ${String(data[def.title] ?? '')}`.slice(0, 60));
      return json({ ...summary(row), data: JSON.parse(row.data), sentForReview: true, pendingSaved: true });
    }
    if (needsApproval && (status === 'published' || status === 'scheduled')) status = 'review';
    const publishAt = typeof mt.publishAt === 'string' && mt.publishAt ? new Date(mt.publishAt).toISOString() : null;
    if (status === 'scheduled' && !publishAt) return json({ error: 'Choose the date and time to publish.' }, 400);
    const reviewBy = typeof mt.reviewBy === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(mt.reviewBy) ? mt.reviewBy : null;
    const parent = typeof mt.parent === 'string' && mt.parent && mt.parent !== id ? mt.parent.slice(0, 80) : null;
    const t = now();
    await env.DB.batch([
      env.DB.prepare('INSERT INTO content_item_revisions (item_id, snapshot, saved_at, saved_by) VALUES (?1, ?2, ?3, ?4)').bind(id, JSON.stringify({ ...summary(row), data: JSON.parse(row.data) }), t, me.name),
      env.DB.prepare(`UPDATE content_items SET data = ?2, title = ?3, status = ?4, publish_at = ?5, product = ?6, category = ?7, parent_id = ?8, sort_order = ?9,
        access = ?10, owner = ?11, review_by = ?12, version = version + 1, updated_at = ?13, updated_by = ?14 WHERE id = ?1`)
        .bind(id, text, String(data[def.title] ?? '').slice(0, 300), status, publishAt,
          def.product ? String(data[def.product] ?? '') || null : null, def.category ? String(data[def.category] ?? '') || null : null,
          parent, Number.isFinite(Number(mt.order)) ? Math.round(Number(mt.order)) : row.sort_order,
          mt.access === 'customers' ? 'customers' : 'public', typeof mt.owner === 'string' ? mt.owner.slice(0, 120) || null : row.owner, reviewBy, t, me.name),
      env.DB.prepare('DELETE FROM content_item_revisions WHERE item_id = ?1 AND id < (SELECT id FROM (SELECT id FROM content_item_revisions WHERE item_id = ?1 ORDER BY id DESC LIMIT 1 OFFSET ?2) AS k)').bind(id, KEEP_REVISIONS - 1),
    ]);
    await logActivity(env, 'content', id, me.name, status === 'review' ? 'draft_saved' : 'published', null, `${def.label}: ${String(data[def.title] ?? '')}`.slice(0, 60));
    const fresh = await env.DB.prepare('SELECT * FROM content_items WHERE id = ?1').bind(id).first<Row>();
    return json({ ...summary(fresh!), data: JSON.parse(fresh!.data), sentForReview: status === 'review' && needsApproval });
  }

  if (method === 'POST' && (m[2] === '/approve' || m[2] === '/reject')) {
    if (me.role !== 'admin') return json({ error: 'Only admins can approve or send back changes.' }, 403);
    const d = await env.DB.prepare('SELECT * FROM content_item_drafts WHERE item_id = ?1').bind(id).first<{ data: string; meta: string; base_version: number; saved_by: string }>();
    if (!d) return json({ error: 'There is no waiting change for this item.' }, 404);
    const b = (await readJson(req)) as { force?: boolean; note?: string } | null;
    if (m[2] === '/approve' && d.base_version !== row.version && !b?.force) return json({ error: `This item was changed after ${d.saved_by} sent their change. Approving it replaces those edits.`, conflict: 'approve' }, 409);
    const label = `${ITEM_TYPES[row.type].label}: ${row.title}`.slice(0, 60);
    if (m[2] === '/approve') {
      const t = now();
      const data = JSON.parse(d.data) as Record<string, unknown>;
      const def = ITEM_TYPES[row.type];
      await env.DB.batch([
        env.DB.prepare('INSERT INTO content_item_revisions (item_id, snapshot, saved_at, saved_by) VALUES (?1, ?2, ?3, ?4)').bind(id, JSON.stringify({ ...summary(row), data: JSON.parse(row.data) }), t, me.name),
        env.DB.prepare('UPDATE content_items SET data = ?2, title = ?3, product = ?4, category = ?5, version = version + 1, updated_at = ?6, updated_by = ?7 WHERE id = ?1')
          .bind(id, d.data, String(data[def.title] ?? '').slice(0, 300), def.product ? String(data[def.product] ?? '') || null : null, def.category ? String(data[def.category] ?? '') || null : null, t, `${d.saved_by} (approved by ${me.name})`),
        env.DB.prepare('DELETE FROM content_item_drafts WHERE item_id = ?1').bind(id),
      ]);
      await logActivity(env, 'content', id, me.name, 'draft_approved', null, label);
    } else {
      await env.DB.prepare('DELETE FROM content_item_drafts WHERE item_id = ?1').bind(id).run();
      await logActivity(env, 'content', id, me.name, 'draft_rejected', null, label, String(b?.note ?? '').slice(0, 1000) || `Change by ${d.saved_by}`);
    }
    return json({ ok: true });
  }

  if (method === 'POST' && m[2] === '/restore') {
    if (me.role === 'editor' && (await contentApprovalOn(env))) return json({ error: 'With content approval on, ask an admin to restore earlier versions.' }, 403);
    const b = (await readJson(req)) as { revision?: number } | null;
    const rev = await env.DB.prepare('SELECT snapshot FROM content_item_revisions WHERE id = ?1 AND item_id = ?2').bind(Number(b?.revision), id).first<{ snapshot: string }>();
    if (!rev) return json({ error: 'That version no longer exists.' }, 404);
    const snap = JSON.parse(rev.snapshot) as ReturnType<typeof summary> & { data: unknown };
    const t = now();
    await env.DB.batch([
      env.DB.prepare('INSERT INTO content_item_revisions (item_id, snapshot, saved_at, saved_by) VALUES (?1, ?2, ?3, ?4)').bind(id, JSON.stringify({ ...summary(row), data: JSON.parse(row.data) }), t, me.name),
      env.DB.prepare('UPDATE content_items SET data = ?2, title = ?3, status = ?4, version = version + 1, updated_at = ?5, updated_by = ?6 WHERE id = ?1').bind(id, JSON.stringify(snap.data), snap.title, snap.status, t, me.name),
    ]);
    await logActivity(env, 'content', id, me.name, 'restored', null, `${ITEM_TYPES[row.type].label}: ${snap.title}`.slice(0, 60));
    return json({ ok: true });
  }

  if (method === 'DELETE' && !m[2]) {
    if (me.role !== 'admin') return json({ error: 'Only admins can delete. Set the status to Archived to hide it instead.' }, 403);
    await env.DB.batch([env.DB.prepare('DELETE FROM content_items WHERE id = ?1').bind(id), env.DB.prepare('DELETE FROM content_item_revisions WHERE item_id = ?1').bind(id)]);
    await logActivity(env, 'content', id, me.name, 'deleted', null, `${ITEM_TYPES[row.type].label}: ${row.title}`.slice(0, 60));
    return json({ ok: true });
  }
  return null;
}

// ---- Full-text search over live library items ----
type Hit = { kind: string; title: string; sub: string; to: string; score: number };
const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
let searchCache: { at: number; docs: { kind: string; title: string; sub: string; to: string; t: string; s: string; b: string }[] } | null = null;
export const clearSearchCache = () => { searchCache = null; };

async function searchDocs(env: Env) {
  if (searchCache && Date.now() - searchCache.at < 60_000) return searchCache.docs;
  await migrateLibrary(env);
  const rows = await env.DB.prepare('SELECT * FROM content_items ORDER BY type, sort_order').all<Row>();
  const prodRow = await env.DB.prepare("SELECT value FROM content WHERE `key` = 'resources.products'").first<{ value: string }>();
  const products = (prodRow ? JSON.parse(prodRow.value) : (D as Record<string, unknown>)['resources.products']) as { id: string; title: string }[];
  const pTitle = (id: string | null) => products.find((p) => p.id === id)?.title ?? '';
  const at = now();
  const docs = [];
  for (const r of rows.results) {
    if (!live(r, at) || !isType(r.type)) continue;
    const d = JSON.parse(r.data) as Record<string, string | string[]>;
    const str = (v: unknown) => (Array.isArray(v) ? v.join(' ') : String(v ?? ''));
    const built = itemArticle(r.type, r.id, d as Record<string, unknown>);
    if (built) {
      docs.push({ kind: r.type === 'troubleshoot' ? `Troubleshooting${built.product ? ` · ${pTitle(built.product)}` : ''}` : 'Release notes', title: built.title, sub: built.summary,
        // Product manuals leave out Troubleshooting (it has its own section); release notes belong in the manual.
        to: built.product && built.category !== 'troubleshooting' ? `/resources/docs/${built.product}/${r.id}` : `/resources/${built.category}?article=${r.id}`,
        t: norm(built.title), s: norm(built.summary), b: norm(built.body) });
    } else if (r.type === 'article') {
      docs.push({ kind: r.product ? `Docs · ${pTitle(r.product)}` : 'Article', title: r.title, sub: str(d.summary),
        to: r.product ? `/resources/docs/${r.product}/${r.id}` : `/resources/${r.category ?? 'get-started'}?article=${r.id}`,
        t: norm(r.title), s: norm(str(d.summary)), b: r.access === 'customers' ? '' : norm(`${str(d.body)} ${str(d.points)}`) });
    } else if (r.type === 'faq') {
      docs.push({ kind: 'FAQ', title: str(d.q), sub: pTitle(r.product) || 'General', to: `/resources/faqs?q=${encodeURIComponent(str(d.q))}`, t: norm(str(d.q)), s: '', b: norm(str(d.a)) });
    } else {
      const kind = r.type === 'post' ? 'Blog' : r.type === 'event' ? 'Event' : `Training${d.kind ? ` · ${str(d.kind)}` : ''}`;
      const own = r.type === 'event' || (r.type === 'post' && str(d.body).trim()) ? `/resources/${r.type === 'event' ? 'events' : 'blog'}/${slugify(str(d.slug) || str(d.title)) || r.id}` : '';
      const to = own || str(d.url) || (r.type === 'post' ? '/resources/blog' : '/resources/training');
      docs.push({ kind, title: str(d.title), sub: str(d.summary), to, t: norm(str(d.title)), s: norm(str(d.summary)), b: norm(`${str(d.meta)} ${str(d.place)} ${str(d.body)} ${str(d.details)}`) });
    }
  }
  searchCache = { at: Date.now(), docs };
  return docs;
}

/** Search titles, summaries and full text. Every word must appear; title words count most; an exact phrase (an error message) ranks first. */
export async function searchLibrary(env: Env, q: string): Promise<{ results: Omit<Hit, 'score'>[] }> {
  const query = norm(q.trim()).slice(0, 200);
  const words = query.split(/[^a-z0-9]+/).filter((w) => w.length > 1);
  if (!words.length) return { results: [] };
  const hits: Hit[] = [];
  for (const d of await searchDocs(env)) {
    const all = `${d.t} ${d.s} ${d.b}`;
    if (!words.every((w) => all.includes(w))) continue;
    let score = 0;
    for (const w of words) score += (d.t.includes(w) ? 6 : 0) + (d.s.includes(w) ? 2 : 0) + (d.b.includes(w) ? 1 : 0);
    if (query.length >= 6 && all.includes(query)) score += 20;
    if (d.t.startsWith(words[0])) score += 3;
    hits.push({ kind: d.kind, title: d.title, sub: d.sub.length > 140 ? `${d.sub.slice(0, 137)}…` : d.sub, to: d.to, score });
  }
  hits.sort((a, b) => b.score - a.score);
  if (!hits.length && query.length >= 3) {
    const t = now();
    await env.DB.prepare('INSERT INTO search_misses (q, count, first_at, last_at) VALUES (?1, 1, ?2, ?2) ON DUPLICATE KEY UPDATE count = count + 1, last_at = VALUES(last_at)').bind(query.slice(0, 190), t).run();
  }
  return { results: hits.slice(0, 12).map(({ score: _s, ...h }) => h) };
}

/** For the Library screen: what people searched for and didn't find (last 90 days, most frequent first). */
export async function searchMisses(env: Env) {
  const since = new Date(Date.now() - 90 * 86400e3).toISOString();
  const r = await env.DB.prepare('SELECT q, count, last_at FROM search_misses WHERE last_at >= ?1 ORDER BY count DESC, last_at DESC LIMIT 50').bind(since).all();
  return r.results;
}

// ---- "Was this helpful?" ----
/** Public: records one vote (and, for "no", an optional short note) for a live article. */
export async function articleFeedback(env: Env, id: string, body: unknown): Promise<Response> {
  const b = (body ?? {}) as { helpful?: unknown; note?: unknown };
  if (typeof b.helpful !== 'boolean') return json({ error: 'Say whether it helped.' }, 400);
  const r = await env.DB.prepare("SELECT status, publish_at, type FROM content_items WHERE id = ?1 AND type IN ('article', 'troubleshoot', 'release')").bind(id).first<Row>();
  if (!r || !live(r, now())) return json({ error: 'Article not found.' }, 404);
  const t = now();
  await env.DB.prepare(`INSERT INTO article_feedback (item_id, helpful, unhelpful, updated_at) VALUES (?1, ?2, ?3, ?4)
    ON DUPLICATE KEY UPDATE helpful = helpful + VALUES(helpful), unhelpful = unhelpful + VALUES(unhelpful), updated_at = VALUES(updated_at)`).bind(id, b.helpful ? 1 : 0, b.helpful ? 0 : 1, t).run();
  const note = typeof b.note === 'string' ? b.note.replace(/\s+/g, ' ').trim().slice(0, 500) : '';
  if (!b.helpful && note) await env.DB.prepare('INSERT INTO article_feedback_notes (item_id, note, at) VALUES (?1, ?2, ?3)').bind(id, note, t).run();
  return json({ ok: true });
}

/** For the Library editor: totals and the latest notes for one article. */
async function feedbackFor(env: Env, id: string) {
  const f = await env.DB.prepare('SELECT helpful, unhelpful FROM article_feedback WHERE item_id = ?1').bind(id).first<{ helpful: number; unhelpful: number }>();
  const n = await env.DB.prepare('SELECT note, at FROM article_feedback_notes WHERE item_id = ?1 ORDER BY id DESC LIMIT 20').bind(id).all<{ note: string; at: string }>();
  return { helpful: Number(f?.helpful ?? 0), unhelpful: Number(f?.unhelpful ?? 0), notes: n.results };
}

/** For the dashboard: how many library items are past their review date. */
export async function reviewDueCount(env: Env): Promise<number> {
  const r = await env.DB.prepare("SELECT COUNT(*) AS n FROM content_items WHERE review_by IS NOT NULL AND review_by <= ?1 AND status <> 'archived'").bind(now().slice(0, 10)).first<{ n: number }>();
  return Number(r?.n ?? 0);
}

// ---- Monthly product updates email (an export to paste into a newsletter tool) ----
const escHtml = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export async function digest(env: Env, base: string, since: string): Promise<{ html: string; text: string; count: number }> {
  const rows = await env.DB.prepare('SELECT * FROM content_items WHERE created_at >= ?1 OR updated_at >= ?1 ORDER BY type, sort_order').bind(since).all<Row>();
  const at = now();
  const groups: Record<string, { title: string; summary: string; url: string }[]> = { 'Release notes': [], 'New and updated guides': [], 'From the blog': [], 'Upcoming events': [] };
  for (const r of rows.results) {
    if (!live(r, at)) continue;
    const d = JSON.parse(r.data) as Record<string, string>;
    const built = itemArticle(r.type, r.id, d);
    if (r.type === 'release' && built) groups['Release notes'].push({ title: built.title, summary: built.summary, url: built.product ? `${base}/resources/docs/${built.product}/${r.id}` : `${base}/resources/whats-new?article=${r.id}` });
    else if ((r.type === 'article' && r.access === 'public') || r.type === 'troubleshoot') {
      const a = built ?? { title: r.title, summary: String(d.summary ?? ''), product: String(d.product ?? ''), category: String(d.category ?? 'get-started') };
      groups['New and updated guides'].push({ title: a.title, summary: a.summary, url: a.product && a.category !== 'troubleshooting' ? `${base}/resources/docs/${a.product}/${r.id}` : `${base}/resources/${a.category}?article=${r.id}` });
    } else if (r.type === 'post') groups['From the blog'].push({ title: d.title, summary: d.summary ?? '', url: String(d.body ?? '').trim() ? `${base}/resources/blog/${slugify(d.slug || d.title) || r.id}` : (d.url?.startsWith('http') ? d.url : `${base}${d.url || '/resources/blog'}`) });
    else if (r.type === 'event' && (d.date || '9999') >= at.slice(0, 10)) groups['Upcoming events'].push({ title: d.title, summary: [d.date, d.place].filter(Boolean).join(' · '), url: `${base}/resources/events/${slugify(d.slug || d.title) || r.id}` });
  }
  const used = Object.entries(groups).filter(([, v]) => v.length);
  const count = used.reduce((n, [, v]) => n + v.length, 0);
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;color:#1B2152;max-width:640px">` +
    `<h1 style="font-size:22px;margin:0 0 6px">What’s new at OneOfficeAutomation</h1><p style="color:#4A5175;margin:0 0 18px">Updates since ${escHtml(since)}.</p>` +
    used.map(([h, items]) => `<h2 style="font-size:17px;margin:22px 0 8px">${escHtml(h)}</h2>` + items.map((x) => `<p style="margin:0 0 12px"><a href="${escHtml(x.url)}" style="color:#2B54C9;font-weight:bold">${escHtml(x.title)}</a><br>${escHtml(x.summary)}</p>`).join('')).join('') +
    `<p style="color:#4A5175;margin-top:24px">See everything in <a href="${escHtml(base)}/resources">Resources</a>.</p></div>`;
  const text = `What’s new at OneOfficeAutomation (since ${since})\n` + used.map(([h, items]) => `\n${h.toUpperCase()}\n` + items.map((x) => `- ${x.title}\n  ${x.summary}\n  ${x.url}`).join('\n')).join('\n') + `\n\nAll resources: ${base}/resources\n`;
  return { html, text, count };
}

/** The file behind a gated download (only used after the visitor has filled in the form). */
export async function gatedFile(env: Env, slug: string): Promise<string> {
  const rows = await env.DB.prepare("SELECT data, status, publish_at FROM content_items WHERE type = 'post'").all<Row>();
  for (const r of rows.results) {
    if (!live(r, now())) continue;
    const d = JSON.parse(r.data) as Record<string, unknown>;
    if ((slugify(String(d.slug || d.title || '')) || '') === slug && d.gated && typeof d.file === 'string') return d.file;
  }
  return '';
}
