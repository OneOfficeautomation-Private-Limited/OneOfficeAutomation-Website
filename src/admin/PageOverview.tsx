import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { admin } from './api';
import type { LibItem } from './api';
import { HowTo, Notice, fmtDate } from './ui';
import { SITE_MAP, itemTo } from './siteMap';

/** /admin/pages/:id — one website page and every part of it you can edit, top to bottom, with when each was last changed. */
export function PageOverview() {
  const { id = '' } = useParams();
  const page = SITE_MAP.find((p) => p.id === id);
  const [edited, setEdited] = useState<Record<string, { at: string; by: string }>>({});
  const [lib, setLib] = useState<LibItem[] | null>(null);
  const [waiting, setWaiting] = useState<Record<string, string>>({});
  const [err, setErr] = useState('');
  useEffect(() => {
    admin.contentList().then((r) => setEdited(Object.fromEntries(r.items.map((x) => [x.key, { at: x.updated_at, by: x.updated_by }])))).catch((e) => setErr((e as Error).message));
    admin.drafts().then((r) => setWaiting(Object.fromEntries(r.items.map((x) => [x.key, x.saved_by])))).catch(() => undefined);
    if (page?.items.some((i) => i.to?.startsWith('/admin/library'))) admin.library().then((r) => setLib(r.items)).catch(() => undefined);
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  const counts = useMemo(() => {
    const c: Record<string, { all: number; live: number }> = {};
    for (const i of lib ?? []) { const k = i.type; c[k] ??= { all: 0, live: 0 }; c[k].all++; if (i.status === 'published') c[k].live++; }
    return c;
  }, [lib]);
  if (!page) return <Notice kind="error">That page isn’t in the site map. <Link to="/admin">Back to the dashboard</Link></Notice>;
  let n = 0;
  return (
    <div style={{ display: 'grid', gap: 16, maxWidth: 980 }}>
      <div>
        <div className="hint" style={{ marginTop: 0 }}><Link to="/admin">Dashboard</Link> › Website content</div>
        <h1 style={{ fontSize: 28, margin: '4px 0' }}>{page.label}{page.id !== 'every' && page.id !== 'emails' && page.id !== 'other' ? ' page' : ''}</h1>
        <p className="hint" style={{ margin: 0, fontSize: 15 }}>{page.intro}</p>
        {page.id !== 'every' && page.id !== 'emails' && page.id !== 'other' && <p style={{ margin: '10px 0 0' }}><a className="btn small" href={page.path} target="_blank" rel="noopener noreferrer">Open the page on the website ↗</a></p>}
      </div>
      <HowTo />
      {err && <Notice kind="error">{err}</Notice>}
      <ol className="po-list">
        {page.items.map((it) => {
          const e = it.key ? edited[it.key] : undefined;
          const type = it.to?.match(/type=(\w+)/)?.[1];
          const c = type ? counts[type] : undefined;
          n++;
          return (
            <li key={itemTo(it)}>
              {it.caption && <div className="po-cap">{it.caption}</div>}
              <Link to={itemTo(it)} className="po-row">
                <span className="po-n">{n}</span>
                <span className="po-main"><b>{it.label}</b>
                  <small>{it.key ? (e ? `Edited ${fmtDate(e.at)} by ${e.by}` : 'Original text, not edited yet') : type ? (c ? `${c.all} item${c.all === 1 ? '' : 's'}, ${c.live} published` : lib ? 'No items yet' : 'Resources library') : 'Opens its own screen'}</small>
                </span>
                {it.key && waiting[it.key] && <span className="badge warn">Change waiting from {waiting[it.key]}</span>}
                {e && <span className="badge ok">Edited</span>}
                <span className="po-go" aria-hidden="true">Edit →</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
