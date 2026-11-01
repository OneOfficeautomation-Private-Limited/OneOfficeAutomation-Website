// Toolkit catalogue and action reference (R4). The product team exports one JSON file (format: docs/ACTION-CATALOG-FORMAT.md),
// an admin imports it in /admin/catalog, and the site shows /resources/toolkits and one page per toolkit.
import type { Env } from './http';
import { json, readJson } from './http';
import { can } from './adminWorkflow';
import type { Me } from './adminWorkflow';
import { logActivity } from './workflow';
import { MENU_ICONS } from '../../src/cms/icons';

type Param = { name: string; type?: string; required?: boolean; description?: string };
type Action = { id: string; name: string; description?: string; inputs?: Param[]; outputs?: Param[]; example?: string };
export type Toolkit = { id: string; name: string; category?: string; description?: string; connector?: boolean; icon?: string; actions: Action[] };

const ID = /^[a-z0-9][a-z0-9-]{0,59}$/;
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** Checks an import file. Returns the cleaned catalogue, or a list of problems (with where they are). */
export function validateCatalog(input: unknown): { ok: true; version: string; toolkits: Toolkit[] } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const root = input as { version?: unknown; toolkits?: unknown };
  if (!root || typeof root !== 'object' || !Array.isArray(root.toolkits)) return { ok: false, errors: ['The file must be JSON with a "toolkits" list. See docs/ACTION-CATALOG-FORMAT.md.'] };
  if (root.toolkits.length === 0) return { ok: false, errors: ['The "toolkits" list is empty.'] };
  if (root.toolkits.length > 1000) errors.push('At most 1,000 toolkits.');
  const seen = new Set<string>();
  const toolkits: Toolkit[] = [];
  root.toolkits.forEach((t: unknown, i: number) => {
    const k = t as Record<string, unknown>;
    const where = `Toolkit ${i + 1}${typeof k?.name === 'string' && k.name ? ` (“${k.name}”)` : ''}`;
    const id = str(k?.id, 60);
    if (!ID.test(id)) errors.push(`${where}: "id" must be lower-case letters, numbers and dashes, for example "excel" or "sap-s4hana".`);
    else if (seen.has(id)) errors.push(`${where}: the id "${id}" is used twice.`);
    seen.add(id);
    const name = str(k?.name, 120);
    if (!name) errors.push(`${where}: "name" is missing.`);
    const acts = Array.isArray(k?.actions) ? (k.actions as unknown[]) : null;
    if (!acts) { errors.push(`${where}: "actions" must be a list (it can be empty).`); return; }
    if (acts.length > 1000) errors.push(`${where}: at most 1,000 actions.`);
    const aseen = new Set<string>();
    const actions: Action[] = acts.map((a: unknown, j: number) => {
      const x = a as Record<string, unknown>;
      const aw = `${where}, action ${j + 1}${typeof x?.name === 'string' && x.name ? ` (“${x.name}”)` : ''}`;
      const aid = str(x?.id, 60);
      if (!ID.test(aid)) errors.push(`${aw}: "id" must be lower-case letters, numbers and dashes.`);
      else if (aseen.has(aid)) errors.push(`${aw}: the id "${aid}" is used twice in this toolkit.`);
      aseen.add(aid);
      if (!str(x?.name, 160)) errors.push(`${aw}: "name" is missing.`);
      const params = (v: unknown, label: string): Param[] => {
        if (v === undefined) return [];
        if (!Array.isArray(v)) { errors.push(`${aw}: "${label}" must be a list.`); return []; }
        return v.slice(0, 100).map((p: unknown, n: number) => {
          const q = p as Record<string, unknown>;
          if (!str(q?.name, 120)) errors.push(`${aw}: ${label} ${n + 1} has no "name".`);
          return { name: str(q?.name, 120), type: str(q?.type, 60) || undefined, required: q?.required === true || undefined, description: str(q?.description, 1000) || undefined };
        });
      };
      return { id: aid, name: str(x?.name, 160), description: str(x?.description, 2000) || undefined, inputs: params(x?.inputs, 'inputs'), outputs: params(x?.outputs, 'outputs'), example: str(x?.example, 4000) || undefined };
    });
    const icon = str(k?.icon, 40);
    toolkits.push({ id, name, category: str(k?.category, 80) || 'Other', description: str(k?.description, 2000) || undefined, connector: k?.connector === true, icon: MENU_ICONS[icon] ? icon : 'grid', actions });
  });
  if (errors.length) return { ok: false, errors: errors.slice(0, 50).concat(errors.length > 50 ? [`…and ${errors.length - 50} more.`] : []) };
  return { ok: true, version: str(root.version, 40), toolkits };
}

let cache: { at: number; meta: CatalogMeta | null; toolkits: Toolkit[] } | null = null;
type CatalogMeta = { version: string; imported_at: string; imported_by: string; toolkits: number; actions: number; connectors: number };

export async function loadCatalog(env: Env): Promise<{ meta: CatalogMeta | null; toolkits: Toolkit[] }> {
  if (cache && Date.now() - cache.at < 60_000) return cache;
  const meta = await env.DB.prepare('SELECT version, imported_at, imported_by, toolkits, actions, connectors FROM catalog_meta WHERE id = 1').first<CatalogMeta>();
  const rows = await env.DB.prepare('SELECT data FROM action_catalog ORDER BY sort').all<{ data: string }>();
  cache = { at: Date.now(), meta: meta ?? null, toolkits: rows.results.map((r) => JSON.parse(r.data) as Toolkit) };
  return cache;
}

/** The catalogue without the action details (for the catalogue page and SEO). Action names are kept for search. */
export async function catalogSummary(env: Env) {
  const { meta, toolkits } = await loadCatalog(env);
  return {
    version: meta?.version ?? '', updated: meta?.imported_at?.slice(0, 10) ?? '',
    toolkits: toolkits.map((t) => ({ id: t.id, name: t.name, category: t.category, description: t.description, connector: !!t.connector, icon: t.icon, actions: t.actions.length, actionNames: t.actions.map((a) => a.name) })),
  };
}

/** Public: /api/catalog and /api/catalog/<toolkit>. */
export async function handleCatalogPublic(env: Env, route: string): Promise<Response | null> {
  if (route === 'GET /api/catalog') return json(await catalogSummary(env), 200, { 'Cache-Control': 'public, max-age=60' });
  const m = route.match(/^GET \/api\/catalog\/([a-z0-9-]{1,60})$/);
  if (!m) return null;
  const t = (await loadCatalog(env)).toolkits.find((x) => x.id === m[1]);
  return t ? json(t, 200, { 'Cache-Control': 'public, max-age=60' }) : json({ error: 'Toolkit not found.' }, 404);
}

/** Admin: /api/admin/catalog (status) and /api/admin/catalog/import (path arrives without /api/admin). */
export async function handleCatalogAdmin(env: Env, req: Request, me: Me, method: string, path: string): Promise<Response | null> {
  if (!path.startsWith('/catalog')) return null;
  if (!can(me, 'content')) return json({ error: 'You don’t have access to website content.' }, 403);
  if (method === 'GET' && path === '/catalog') return json({ meta: (await loadCatalog(env)).meta });
  if (method === 'POST' && path === '/catalog/import') {
    if (me.role !== 'admin' && me.role !== 'editor') return json({ error: 'Only admins and editors can import the catalogue.' }, 403);
    const body = await readJson(req);
    const v = validateCatalog(body);
    if (!v.ok) return json({ error: 'The file has problems. Nothing was changed.', problems: v.errors }, 400);
    const t = new Date().toISOString();
    const actions = v.toolkits.reduce((n, k) => n + k.actions.length, 0);
    const connectors = v.toolkits.filter((k) => k.connector).length;
    await env.DB.batch([
      env.DB.prepare('DELETE FROM action_catalog'),
      ...v.toolkits.map((k, i) => env.DB.prepare('INSERT INTO action_catalog (toolkit_id, sort, name, category, connector, data) VALUES (?1, ?2, ?3, ?4, ?5, ?6)').bind(k.id, i, k.name, k.category ?? 'Other', k.connector ? 1 : 0, JSON.stringify(k))),
      env.DB.prepare('INSERT INTO catalog_meta (id, version, imported_at, imported_by, toolkits, actions, connectors) VALUES (1, ?1, ?2, ?3, ?4, ?5, ?6) ON DUPLICATE KEY UPDATE version = VALUES(version), imported_at = VALUES(imported_at), imported_by = VALUES(imported_by), toolkits = VALUES(toolkits), actions = VALUES(actions), connectors = VALUES(connectors)')
        .bind(v.version, t, me.name, v.toolkits.length, actions, connectors),
    ]);
    cache = null;
    await logActivity(env, 'content', 'catalog', me.name, 'imported', null, `${v.toolkits.length} toolkits, ${actions} actions`);
    return json({ ok: true, meta: { version: v.version, imported_at: t, imported_by: me.name, toolkits: v.toolkits.length, actions, connectors } });
  }
  return null;
}
