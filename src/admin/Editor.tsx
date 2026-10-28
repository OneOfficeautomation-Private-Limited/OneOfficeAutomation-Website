import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import defaultsJson from '../cms/defaults.generated.json';
import { SECTION_BY_KEY, sanitize } from '../cms/registry';
import type { Field, Section } from '../cms/registry';
import { admin } from './api';
import type { Revision } from './api';
import { FieldsGrid, ItemsEditor, stripKeys, withKeys } from './FieldEditor';
import type { Refs, Row } from './FieldEditor';
import { Notice, fmtDate } from './ui';

const DEFAULTS = defaultsJson as Record<string, unknown>;

/** Finds the other sections this one refers to (for example article → section drop-downs). */
function refKeys(fields: Field[]): string[] {
  return fields.flatMap((f) => (f.type === 'ref' ? [f.ref] : f.type === 'items' ? refKeys(f.fields) : []));
}

function clean(section: Section, v: unknown): unknown {
  try {
    return sanitize(section, v);
  } catch {
    return v;
  }
}

export default function Editor() {
  const { key = '' } = useParams();
  const section = SECTION_BY_KEY[key];
  if (!section) return <Notice kind="error">That section doesn’t exist. <Link to="/admin">Back to the dashboard</Link></Notice>;
  return <EditorInner key={key} section={section} />;
}

function EditorInner({ section }: { section: Section }) {
  const key = section.key;
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');
  const [draft, setDraft] = useState<unknown>(null);
  const [saved, setSaved] = useState('');
  const [custom, setCustom] = useState(false);
  const [meta, setMeta] = useState<{ at: string | null; by: string | null }>({ at: null, by: null });
  const [refs, setRefs] = useState<Refs>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const [history, setHistory] = useState<Revision[] | null>(null);

  const load = useCallback(async () => {
    try {
      const [stored, ...others] = await Promise.all([admin.contentGet(key), ...refKeys(section.fields).map((k) => admin.contentGet(k).then((r) => [k, r.value] as const))]);
      const initial = clean(section, stored.value ?? DEFAULTS[key]);
      setDraft(withKeys(initial));
      setSaved(JSON.stringify(initial));
      setCustom(stored.value !== null);
      setMeta({ at: stored.updatedAt, by: stored.updatedBy });
      setRefs(Object.fromEntries(others.map(([k, v]) => [k, ((v ?? DEFAULTS[k]) as Record<string, unknown>[]) ?? []])));
      setPhase('ready');
    } catch (err) {
      setMessage({ kind: 'error', text: (err as Error).message });
      setPhase('error');
    }
  }, [key, section]);
  useEffect(() => { void load(); }, [load]);

  const dirty = useMemo(() => phase === 'ready' && JSON.stringify(stripKeys(draft)) !== saved, [draft, saved, phase]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  async function save() {
    setBusy(true); setMessage(null);
    try {
      const r = await admin.contentPut(key, stripKeys(draft));
      setDraft(withKeys(r.value)); setSaved(JSON.stringify(r.value)); setCustom(true); setMeta({ at: r.updatedAt, by: r.updatedBy });
      setMessage({ kind: 'success', text: 'Saved. The website now shows your changes.' });
    } catch (err) {
      setMessage({ kind: 'error', text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }
  async function reset() {
    if (!window.confirm('Go back to the original content for this section? Your edits stay in the history, so you can restore them later.')) return;
    setBusy(true); setMessage(null);
    try {
      await admin.contentReset(key);
      await load();
      setMessage({ kind: 'success', text: 'Restored the original content.' });
    } catch (err) {
      setMessage({ kind: 'error', text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }
  async function openHistory() {
    setMessage(null);
    try { setHistory((await admin.revisions(key)).items); } catch (err) { setMessage({ kind: 'error', text: (err as Error).message }); }
  }
  async function restore(id: number) {
    if (dirty && !window.confirm('You have unsaved changes that will be lost. Restore this version anyway?')) return;
    try {
      await admin.restore(key, id);
      setHistory(null);
      await load();
      setMessage({ kind: 'success', text: 'Restored that version.' });
    } catch (err) {
      setMessage({ kind: 'error', text: (err as Error).message });
    }
  }

  const featuredCount = key === 'customers.stories' && Array.isArray(draft) ? (draft as Row[]).filter((r) => r.featured === true).length : 0;
  if (phase === 'loading') return <p>Loading…</p>;
  if (phase === 'error') return message ? <Notice kind="error">{message.text}</Notice> : null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <div className="hint" style={{ marginTop: 0 }}><Link to="/admin">Dashboard</Link> › {section.group}</div>
        <h1 style={{ fontSize: 26, marginTop: 4 }}>{section.label}</h1>
        <p style={{ margin: '6px 0 0', color: '#4A5175' }}>{section.description}</p>
        <p className="hint" style={{ marginTop: 6 }}>
          {custom ? `Last edited ${fmtDate(meta.at)} by ${meta.by}.` : 'Showing the original content. Nothing has been edited yet.'}{' '}
          <a href={section.path} target="_blank" rel="noopener noreferrer">Open the page ↗</a>
        </p>
      </div>
      {featuredCount > 4 && <div role="status" style={{ padding: '10px 14px', borderRadius: 10, background: '#FFF6E0', color: '#7A5200', fontSize: 14.5 }}>{featuredCount} stories are featured. Featuring 3 or 4 works best, because only the first few are shown in the hero, the scoreboard and the quote wall.</div>}
      <div aria-live="polite">{message && <Notice kind={message.kind}>{message.text}</Notice>}</div>
      {section.kind === 'doc' ? (
        <div className="card"><FieldsGrid fields={section.fields} value={(draft ?? {}) as Row} onChange={(v) => setDraft(v)} refs={refs} /></div>
      ) : (
        <ItemsEditor fields={section.fields} titleField={section.titleField ?? section.fields[0].name} itemLabel={section.itemLabel ?? 'item'} value={(Array.isArray(draft) ? draft : []) as Row[]} onChange={(v) => setDraft(v)} refs={refs} startOpen />
      )}
      <div style={{ position: 'sticky', bottom: 0, background: 'rgba(244,246,252,0.96)', backdropFilter: 'blur(6px)', padding: '12px 0', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', borderTop: '1.5px solid #DDE3F3' }}>
        <button type="button" className="btn primary" onClick={() => void save()} disabled={!dirty || busy}>{busy ? 'Saving…' : 'Save changes'}</button>
        <button type="button" className="btn" onClick={() => { void load(); setMessage(null); }} disabled={!dirty || busy}>Discard changes</button>
        <span style={{ flex: 1 }} />
        {dirty && <span className="badge custom">Unsaved changes</span>}
        <button type="button" className="btn" onClick={() => void openHistory()}>History</button>
        <button type="button" className="btn danger" onClick={() => void reset()} disabled={!custom || busy}>Reset to original</button>
      </div>
      {history && (
        <div role="dialog" aria-modal="true" aria-label="History" style={{ position: 'fixed', inset: 0, background: 'rgba(15,20,60,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 50 }}>
          <div className="card" style={{ width: '100%', maxWidth: 560, maxHeight: '80vh', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h2 style={{ fontSize: 20 }}>History</h2><button type="button" className="btn small" onClick={() => setHistory(null)}>Close</button></div>
            {history.length === 0 && <p className="hint">No saved versions yet.</p>}
            {history.map((r, i) => (
              <div key={r.id} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid #DDE3F3' }}>
                <div><div style={{ fontWeight: 600 }}>{fmtDate(r.saved_at)}{i === 0 && <span className="badge custom" style={{ marginLeft: 8 }}>Latest</span>}</div><div className="hint" style={{ marginTop: 0 }}>{r.reverted ? 'Went back to the original' : `Saved by ${r.saved_by}`}</div></div>
                <button type="button" className="btn small" onClick={() => void restore(r.id)}>Restore</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
