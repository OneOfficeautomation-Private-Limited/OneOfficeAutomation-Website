// Media library: images and PDFs uploaded in /admin/media, stored in the database (so they survive redeploys and
// are covered by database backups) and served at /media/<id>-<name>.<ext> with long browser caching.
import { createHash, randomUUID } from 'node:crypto';
import type { Env } from './http';
import { json, readJson } from './http';
import { can } from './adminWorkflow';
import type { Me } from './adminWorkflow';
import { logActivity } from './workflow';

export const MAX_MEDIA_BYTES = 5 * 1024 * 1024;
type Kind = { mime: string; ext: string };

/** The real file type from the first bytes (the name and the browser's claim are not trusted). SVG is not accepted. */
export function sniff(b: Uint8Array): Kind | null {
  const at = (i: number, ...v: number[]) => v.every((x, k) => b[i + k] === x);
  if (at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return { mime: 'image/png', ext: 'png' };
  if (at(0, 0xff, 0xd8, 0xff)) return { mime: 'image/jpeg', ext: 'jpg' };
  if (at(0, 0x47, 0x49, 0x46, 0x38)) return { mime: 'image/gif', ext: 'gif' };
  if (at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)) return { mime: 'image/webp', ext: 'webp' };
  if (at(0, 0x25, 0x50, 0x44, 0x46, 0x2d)) return { mime: 'application/pdf', ext: 'pdf' };
  return null;
}

/** Width and height of an image (used to avoid layout jumps), or nulls if unknown. */
export function dimensions(b: Uint8Array, mime: string): { w: number | null; h: number | null } {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  try {
    if (mime === 'image/png') return { w: dv.getUint32(16), h: dv.getUint32(20) };
    if (mime === 'image/gif') return { w: dv.getUint16(6, true), h: dv.getUint16(8, true) };
    if (mime === 'image/webp') {
      const chunk = String.fromCharCode(b[12], b[13], b[14], b[15]);
      if (chunk === 'VP8 ') return { w: dv.getUint16(26, true) & 0x3fff, h: dv.getUint16(28, true) & 0x3fff };
      if (chunk === 'VP8L') { const v = dv.getUint32(21, true); return { w: (v & 0x3fff) + 1, h: ((v >> 14) & 0x3fff) + 1 }; }
      if (chunk === 'VP8X') return { w: 1 + (b[24] | (b[25] << 8) | (b[26] << 16)), h: 1 + (b[27] | (b[28] << 8) | (b[29] << 16)) };
    }
    if (mime === 'image/jpeg') {
      let i = 2;
      while (i < b.length - 9) {
        if (b[i] !== 0xff) { i++; continue; }
        const marker = b[i + 1];
        if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return { w: dv.getUint16(i + 7), h: dv.getUint16(i + 5) };
        i += 2 + dv.getUint16(i + 2);
      }
    }
  } catch { /* unreadable header */ }
  return { w: null, h: null };
}

const slug = (s: string) => s.toLowerCase().replace(/\.[a-z0-9]+$/, '').normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'file';
type Row = { id: string; name: string; mime: string; ext: string; size: number; width: number | null; height: number | null; alt: string; sha256: string; created_at: string; created_by: string };
const pathOf = (r: Pick<Row, 'id' | 'name' | 'ext'>) => `/media/${r.id}-${slug(r.name)}.${r.ext}`;
const view = (r: Row) => ({ id: r.id, name: r.name, mime: r.mime, size: r.size, width: r.width, height: r.height, alt: r.alt, path: pathOf(r), createdAt: r.created_at, createdBy: r.created_by });
const COLS = 'id, name, mime, ext, size, width, height, alt, sha256, created_at, created_by';

/** Where a file is used: saved content sections and library items that mention its address. */
async function usage(env: Env, r: Row): Promise<string[]> {
  const needle = `%/media/${r.id}-%`;
  const a = await env.DB.prepare('SELECT `key` FROM content WHERE value LIKE ?1').bind(needle).all<{ key: string }>();
  const b = await env.DB.prepare('SELECT id, title FROM content_items WHERE data LIKE ?1').bind(needle).all<{ id: string; title: string }>();
  return [...a.results.map((x) => `Section: ${x.key}`), ...b.results.map((x) => `Library: ${x.title}`)];
}

/** Admin API: /api/admin/media… (path arrives without the /api/admin prefix). */
export async function handleMedia(env: Env, req: Request, me: Me, method: string, path: string): Promise<Response | null> {
  if (!path.startsWith('/media')) return null;
  if (!can(me, 'content')) return json({ error: 'You don’t have access to website content.' }, 403);

  if (method === 'GET' && path === '/media') {
    const r = await env.DB.prepare(`SELECT ${COLS} FROM media ORDER BY created_at DESC`).all<Row>();
    return json({ items: r.results.map(view) });
  }
  if (!can(me, 'content', true)) return json({ error: 'You can view but not change website content.' }, 403);

  if (method === 'POST' && path === '/media/upload') {
    const bytes = new Uint8Array(await req.arrayBuffer());
    if (!bytes.length) return json({ error: 'The file is empty.' }, 400);
    if (bytes.length > MAX_MEDIA_BYTES) return json({ error: 'Files can be up to 5 MB. Try a smaller or compressed image.' }, 413);
    const kind = sniff(bytes);
    if (!kind) return json({ error: 'Only PNG, JPEG, WebP, GIF and PDF files can be uploaded.' }, 415);
    const name = (decodeURIComponent(req.headers.get('X-File-Name') ?? '') || `file.${kind.ext}`).slice(0, 200);
    const sha = createHash('sha256').update(bytes).digest('hex');
    const dup = await env.DB.prepare(`SELECT ${COLS} FROM media WHERE sha256 = ?1`).bind(sha).first<Row>();
    if (dup) return json({ ...view(dup), duplicate: true });
    const { w, h } = kind.mime.startsWith('image/') ? dimensions(bytes, kind.mime) : { w: null, h: null };
    const row: Row = { id: randomUUID().slice(0, 8), name, mime: kind.mime, ext: kind.ext, size: bytes.length, width: w, height: h, alt: '', sha256: sha, created_at: new Date().toISOString(), created_by: me.name };
    await env.DB.prepare('INSERT INTO media (id, name, mime, ext, size, width, height, alt, sha256, data, created_at, created_by) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)')
      .bind(row.id, row.name, row.mime, row.ext, row.size, row.width, row.height, '', sha, Buffer.from(bytes), row.created_at, me.name).run();
    await logActivity(env, 'content', row.id, me.name, 'uploaded', null, name.slice(0, 60));
    return json(view(row), 201);
  }

  const m = path.match(/^\/media\/([a-z0-9]{8})(\/usage)?$/);
  if (!m) return null;
  const row = await env.DB.prepare(`SELECT ${COLS} FROM media WHERE id = ?1`).bind(m[1]).first<Row>();
  if (!row) return json({ error: 'That file no longer exists.' }, 404);
  if (method === 'GET' && m[2]) return json({ usedIn: await usage(env, row) });
  if (method === 'PATCH' && !m[2]) {
    const b = (await readJson(req)) as { alt?: string; name?: string } | null;
    const alt = typeof b?.alt === 'string' ? b.alt.trim().slice(0, 300) : row.alt;
    const name = typeof b?.name === 'string' && b.name.trim() ? b.name.trim().slice(0, 200) : row.name;
    await env.DB.prepare('UPDATE media SET alt = ?2, name = ?3 WHERE id = ?1').bind(row.id, alt, name).run();
    return json(view({ ...row, alt, name }));
  }
  if (method === 'DELETE' && !m[2]) {
    if (me.role !== 'admin') return json({ error: 'Only admins can delete files.' }, 403);
    const used = await usage(env, row);
    const force = new URL(req.url).searchParams.get('force') === '1';
    if (used.length && !force) return json({ error: `This file is still used in: ${used.join('; ')}. Remove it there first, or delete anyway.`, usedIn: used }, 409);
    await env.DB.prepare('DELETE FROM media WHERE id = ?1').bind(row.id).run();
    await logActivity(env, 'content', row.id, me.name, 'deleted', null, row.name.slice(0, 60));
    return json({ ok: true });
  }
  return null;
}

/** Public: GET /media/<id>-<name>.<ext>. The name part is ignored, so renaming a file doesn't break links. */
export async function serveMedia(env: Env, file: string): Promise<{ status: number; headers: Record<string, string>; body?: Buffer }> {
  const m = file.match(/^([a-z0-9]{8})(?:-[a-z0-9-]*)?\.(png|jpg|gif|webp|pdf)$/);
  if (!m) return { status: 404, headers: {} };
  const r = await env.DB.prepare('SELECT mime, ext, data, sha256, name FROM media WHERE id = ?1').bind(m[1]).first<{ mime: string; ext: string; data: Buffer; sha256: string; name: string }>();
  if (!r || r.ext !== m[2]) return { status: 404, headers: {} };
  return {
    status: 200,
    body: Buffer.isBuffer(r.data) ? r.data : Buffer.from(r.data as unknown as Uint8Array),
    headers: {
      'Content-Type': r.mime, 'Cache-Control': 'public, max-age=31536000, immutable', ETag: `"${r.sha256.slice(0, 32)}"`,
      'X-Content-Type-Options': 'nosniff',
      // A file opened directly can never run scripts on this site.
      'Content-Security-Policy': "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
      'Content-Disposition': `inline; filename="${r.name.replace(/[^\w.\- ]/g, '_')}"`,
    },
  };
}
