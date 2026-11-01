import { useEffect, useState } from 'react';
import { HowTo, Notice, fmtDate } from './ui';

type Meta = { version: string; imported_at: string; imported_by: string; toolkits: number; actions: number; connectors: number } | null;

/** /admin/catalog — import the toolkit catalogue (the product's own export) that powers /resources/toolkits. */
export function CatalogAdmin() {
  const [meta, setMeta] = useState<Meta>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string; problems?: string[] } | null>(null);
  useEffect(() => { fetch('/api/admin/catalog', { credentials: 'include' }).then((r) => r.json()).then((j: { meta: Meta }) => setMeta(j.meta)).catch(() => undefined); }, []);
  async function importFile(f: File) {
    setBusy(true); setMsg(null);
    let body: unknown;
    try { body = JSON.parse(await f.text()); } catch { setBusy(false); setMsg({ kind: 'error', text: 'That file isn’t valid JSON. Nothing was changed.' }); return; }
    try {
      const r = await fetch('/api/admin/catalog/import', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = (await r.json().catch(() => ({}))) as { error?: string; problems?: string[]; meta?: Meta };
      if (r.ok && j.meta) { setMeta(j.meta); setMsg({ kind: 'success', text: `Imported ${j.meta.toolkits} toolkits and ${j.meta.actions} actions. The website shows them now.` }); }
      else setMsg({ kind: 'error', text: j.error ?? 'The import failed.', problems: j.problems });
    } catch { setMsg({ kind: 'error', text: 'We couldn’t reach the server. Nothing was changed.' }); }
    finally { setBusy(false); }
  }
  return (
    <div style={{ display: 'grid', gap: 16, maxWidth: 900 }}>
      <div><h1 style={{ fontSize: 28 }}>Toolkit catalogue</h1><p className="hint" style={{ margin: '4px 0 0', fontSize: 15 }}>The toolkits, connectors and actions shown at <a href="/resources/toolkits" target="_blank" rel="noopener noreferrer">/resources/toolkits ↗</a>.</p></div>
      <HowTo />
      <div className="card">
        <h2 style={{ fontSize: 17, marginTop: 0 }}>Now on the website</h2>
        {meta ? <p style={{ margin: 0 }}><b>{meta.toolkits}</b> toolkits, <b>{meta.actions}</b> actions, <b>{meta.connectors}</b> connectors{meta.version ? `, version ${meta.version}` : ''}. Imported {fmtDate(meta.imported_at)} by {meta.imported_by}.</p> : <p className="hint" style={{ margin: 0 }}>Nothing imported yet. The catalogue page says it’s being prepared.</p>}
      </div>
      <div className="card" style={{ display: 'grid', gap: 10 }}>
        <h2 style={{ fontSize: 17, margin: 0 }}>Import a new version</h2>
        <p className="hint" style={{ margin: 0 }}>Choose the JSON file exported from the product. It replaces the whole catalogue in one step; if anything is wrong, nothing changes and the problems are listed. The format is described in <code>docs/ACTION-CATALOG-FORMAT.md</code> (with a sample file next to it).</p>
        <label className="btn primary" style={{ justifySelf: 'start', cursor: 'pointer' }}>{busy ? 'Importing…' : 'Choose file and import'}<input type="file" accept="application/json,.json" hidden disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; if (f) void importFile(f); e.target.value = ''; }} /></label>
      </div>
      {msg && <Notice kind={msg.kind}>{msg.text}{msg.problems?.length ? <ul style={{ margin: '8px 0 0' }}>{msg.problems.map((p) => <li key={p}>{p}</li>)}</ul> : null}</Notice>}
    </div>
  );
}
