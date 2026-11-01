import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { iconPath } from '../../cms/icons';
import { Icon } from '../../ds/ui';

type Summary = { id: string; name: string; category: string; description?: string; connector: boolean; icon: string; actions: number; actionNames: string[] };
type Param = { name: string; type?: string; required?: boolean; description?: string };
type Toolkit = { id: string; name: string; category?: string; description?: string; connector?: boolean; icon?: string; actions: { id: string; name: string; description?: string; inputs?: Param[]; outputs?: Param[]; example?: string }[] };

function useJson<T>(url: string) {
  const [s, set] = useState<{ data: T | null; state: 'loading' | 'ready' | 'missing' }>({ data: null, state: 'loading' });
  useEffect(() => {
    let live = true; set({ data: null, state: 'loading' });
    fetch(url).then(async (r) => { if (!live) return; set(r.ok ? { data: (await r.json()) as T, state: 'ready' } : { data: null, state: 'missing' }); }).catch(() => live && set({ data: null, state: 'missing' }));
    return () => { live = false; };
  }, [url]);
  return s;
}

function Hero({ title, sub, back }: { title: string; sub: string; back?: [string, string] }) {
  return (
    <section className="hz-hero">
      <div className="ds-container" style={{ maxWidth: 1040, paddingBottom: 'clamp(44px, 6vw, 76px)' }}>
        {back && <p className="hint" style={{ margin: 0 }}><Link to={back[0]} style={{ color: '#C9D4FF' }}>← {back[1]}</Link></p>}
        <h1 className="pf-h1" style={{ marginTop: back ? 18 : 0 }}>{title}</h1>
        <p className="cu-lead">{sub}</p>
      </div>
    </section>
  );
}
const card = { padding: 18, borderRadius: 16, border: '1px solid #E3E8F5', background: '#FFFFFF' } as const;

/** /resources/toolkits — every toolkit and connector, searchable (including action names). */
export function ToolkitsPage() {
  const { data, state } = useJson<{ version: string; updated: string; toolkits: Summary[] }>('/api/catalog');
  const [q, setQ] = useState(''); const [cat, setCat] = useState('All'); const [conn, setConn] = useState(false);
  const list = data?.toolkits ?? [];
  const cats = useMemo(() => ['All', ...Array.from(new Set(list.map((t) => t.category))).sort()], [list]);
  const t = q.trim().toLowerCase();
  const shown = list.filter((x) => (cat === 'All' || x.category === cat) && (!conn || x.connector) && (!t || `${x.name} ${x.description ?? ''} ${x.actionNames.join(' ')}`.toLowerCase().includes(t)));
  const actions = list.reduce((n, x) => n + x.actions, 0);
  return (
    <>
      <Hero title="Toolkits and actions" sub={list.length ? `${list.length} toolkits, ${actions} ready-made actions and ${list.filter((x) => x.connector).length} connectors for building agents.${data?.version ? ` Version ${data.version}.` : ''}` : 'Ready-made actions for building agents.'} back={['/resources', 'Resources']} />
      <section className="ds-paper ds-section">
        <div className="ds-container" style={{ maxWidth: 1040, display: 'grid', gap: 18 }}>
          {state === 'loading' && <p className="ds-muted">Loading the catalogue…</p>}
          {state !== 'loading' && list.length === 0 && <p className="ds-muted">The catalogue is being prepared. In the meantime, see the <Link to="/resources/docs">documentation</Link>.</p>}
          {list.length > 0 && (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                <input type="search" aria-label="Search toolkits and actions" placeholder="Search toolkits and actions, for example “send email”" value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: '1 1 320px', padding: '12px 14px', borderRadius: 12, border: '1px solid #D5DCEE', font: 'inherit' }} />
                <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontWeight: 600 }}><input type="checkbox" checked={conn} onChange={(e) => setConn(e.target.checked)} /> Connectors only</label>
              </div>
              <div className="cu-filters" role="group" aria-label="Category">{cats.map((c) => <button key={c} type="button" aria-pressed={cat === c} onClick={() => setCat(c)}>{c}</button>)}</div>
              <p className="ds-muted" style={{ margin: 0 }}>{shown.length} of {list.length} toolkits</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
                {shown.map((x) => {
                  const hits = t ? x.actionNames.filter((n) => n.toLowerCase().includes(t)).slice(0, 3) : [];
                  return (
                    <Link key={x.id} to={`/resources/toolkits/${x.id}${hits.length === 1 ? `#${encodeURIComponent(hits[0].toLowerCase().replace(/[^a-z0-9]+/g, '-'))}` : ''}`} style={{ ...card, textDecoration: 'none', color: 'inherit', display: 'grid', gap: 6, alignContent: 'start' }}>
                      <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}><span style={{ width: 36, height: 36, borderRadius: 10, display: 'grid', placeItems: 'center', background: '#EEF1FA', color: '#3B2E8C' }}><Icon d={iconPath(x.icon)} size={20} /></span><b>{x.name}</b></span>
                      <small className="ds-muted">{x.category} · {x.actions} action{x.actions === 1 ? '' : 's'}{x.connector ? ' · Connector' : ''}</small>
                      {x.description && <span style={{ fontSize: '.95rem' }}>{x.description}</span>}
                      {hits.length > 0 && <small style={{ color: '#6D4AD8' }}>Matches: {hits.join(', ')}</small>}
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}

const anchor = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
function Params({ title, list }: { title: string; list?: Param[] }) {
  if (!list?.length) return null;
  return (
    <div className="rs-table" style={{ marginTop: 10 }}>
      <table>
        <thead><tr><th>{title}</th><th>Type</th><th>Description</th></tr></thead>
        <tbody>{list.map((p) => <tr key={p.name}><td><code>{p.name}</code>{p.required ? <small style={{ color: '#9B2C2C' }}> required</small> : null}</td><td>{p.type ?? '—'}</td><td>{p.description ?? ''}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

/** /resources/toolkits/:toolkit — every action, with inputs, outputs and an example; each action can be linked to directly. */
export function ToolkitPage() {
  const { toolkit = '' } = useParams();
  const { data: t, state } = useJson<Toolkit>(`/api/catalog/${encodeURIComponent(toolkit)}`);
  const [q, setQ] = useState('');
  useEffect(() => { if (t && window.location.hash) document.getElementById(decodeURIComponent(window.location.hash.slice(1)))?.scrollIntoView(); }, [t]);
  if (state === 'loading') return <Hero title="Loading…" sub="" back={['/resources/toolkits', 'All toolkits']} />;
  if (!t) return <Hero title="We can’t find that toolkit." sub="It may have been renamed. Browse all toolkits instead." back={['/resources/toolkits', 'All toolkits']} />;
  const s = q.trim().toLowerCase();
  const acts = t.actions.filter((a) => !s || `${a.name} ${a.description ?? ''}`.toLowerCase().includes(s));
  return (
    <>
      <Hero title={`${t.name} actions`} sub={`${t.description ? `${t.description} ` : ''}${t.actions.length} action${t.actions.length === 1 ? '' : 's'}${t.connector ? ' · Connector' : ''}${t.category ? ` · ${t.category}` : ''}`} back={['/resources/toolkits', 'All toolkits']} />
      <section className="ds-paper ds-section">
        <div className="ds-container rs-body" style={{ maxWidth: 900 }}>
          {t.actions.length > 6 && <input type="search" aria-label={`Search ${t.name} actions`} placeholder={`Search ${t.name} actions`} value={q} onChange={(e) => setQ(e.target.value)} style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #D5DCEE', font: 'inherit', marginBottom: 18 }} />}
          {acts.map((a) => (
            <section key={a.id} id={anchor(a.name)} style={{ scrollMarginTop: 90, padding: '6px 0 18px', borderBottom: '1px solid #E3E8F5', marginBottom: 18 }}>
              <h2 style={{ marginTop: 10 }}><a href={`#${anchor(a.name)}`} style={{ color: 'inherit', textDecoration: 'none' }}>{a.name}</a></h2>
              {a.description && <p>{a.description}</p>}
              <Params title="Input" list={a.inputs} />
              <Params title="Output" list={a.outputs} />
              {a.example && <pre className="rs-code"><code>{a.example}</code></pre>}
            </section>
          ))}
          {acts.length === 0 && <p className="ds-muted">No actions match “{q}”.</p>}
        </div>
      </section>
    </>
  );
}
