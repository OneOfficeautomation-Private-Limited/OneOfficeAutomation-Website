import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import defaultsJson from '../cms/defaults.generated.json';
import { SECTION_BY_KEY, sanitize } from '../cms/registry';
import type { Field, Section } from '../cms/registry';
import { AdminError, admin } from './api';
import { describeChanges } from './diff';
import { useAdmin } from './AdminContext';
import type { Revision } from './api';
import { FieldsGrid, ItemsEditor, ListMaster, stripKeys, withKeys } from './FieldEditor';
import type { Refs, Row } from './FieldEditor';
import { HowTo, Notice, fmtDate } from './ui';
import { confirmDialog, promptDialog } from '../ui/dialog';
import { EmailEditor } from './EmailEditor';
import { locate } from './siteMap';

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
  if (section.library) return (
    <div style={{ display: 'grid', gap: 12 }}>
      <h1 style={{ fontSize: 26 }}>{section.label}</h1>
      <Notice kind="success">These items now live in the Resources library, one at a time, with their own status, dates, owner and history.</Notice>
      <p><Link className="btn primary" to="/admin/library">Open the Resources library</Link></p>
    </div>
  );
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
  const { me } = useAdmin();
  const [pending, setPending] = useState<{ value: unknown; savedBy: string; savedAt: string } | null>(null);
  const [conflict, setConflict] = useState<string | null>(null);
  const [live, setLive] = useState<unknown>(null);
  const [decision, setDecision] = useState<Awaited<ReturnType<typeof admin.draft>>['lastDecision']>(null);

  const load = useCallback(async () => {
    try {
      const [stored, ...others] = await Promise.all([admin.contentGet(key), ...refKeys(section.fields).map((k) => admin.contentGet(k).then((r) => [k, r.value] as const))]);
      const initial = clean(section, stored.value ?? DEFAULTS[key]);
      setDraft(withKeys(initial));
      setSaved(JSON.stringify(initial));
      setLive(initial);
      setCustom(stored.value !== null);
      setMeta({ at: stored.updatedAt, by: stored.updatedBy });
      setRefs(Object.fromEntries(others.map(([k, v]) => [k, ((v ?? DEFAULTS[k]) as Record<string, unknown>[]) ?? []])));
      admin.draft(key).then((r) => { setPending(r.draft); setDecision(r.lastDecision); }).catch(() => setPending(null));
      setConflict(null);
      setPhase('ready');
    } catch (err) {
      setMessage({ kind: 'error', text: (err as Error).message });
      setPhase('error');
    }
  }, [key, section]);
  useEffect(() => { void load(); }, [load]);

  const where = locate(`/admin/content/${key}`);
  const navigate = useNavigate();
  const dirty = useMemo(() => phase === 'ready' && JSON.stringify(stripKeys(draft)) !== saved, [draft, saved, phase]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    // Leaving with unsaved changes asks first, in the admin's own dialog. That dialog doesn't pause the page like the
    // browser's did, so the navigation is held, and carried out only if they choose to leave.
    let leaving = false;
    const ask = () => confirmDialog({ title: 'Leave without saving?', message: 'You have unsaved changes on this page. If you leave now, they are lost.', confirm: 'Leave without saving', cancel: 'Stay on this page', danger: true });
    // Links inside the admin (menu, breadcrumbs) change the page without reloading.
    const guard = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a || a.target === '_blank' || a.hasAttribute('download') || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const to = new URL(a.href, window.location.href);
      if (to.origin !== window.location.origin || to.pathname === window.location.pathname) return;
      e.preventDefault(); e.stopPropagation();
      void ask().then((ok) => { if (ok) { leaving = true; navigate(`${to.pathname}${to.search}${to.hash}`); } });
    };
    document.addEventListener('click', guard, true);
    // The browser's Back button: keep one extra history entry for this page while there are unsaved edits,
    // so pressing Back stays here and asks first. If they choose to leave, go back past it.
    window.history.pushState({ ooaGuard: true }, '', window.location.href);
    const onPop = () => {
      if (leaving) return;
      window.history.pushState({ ooaGuard: true }, '', window.location.href);
      void ask().then((ok) => { if (ok) { leaving = true; window.history.go(-2); } });
    };
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('beforeunload', warn); document.removeEventListener('click', guard, true); window.removeEventListener('popstate', onPop);
      // Saved (or discarded) while still on the page: remove the extra entry so Back works normally again.
      if (!leaving && (window.history.state as { ooaGuard?: boolean } | null)?.ooaGuard) window.history.back();
    };
  }, [dirty, navigate]);

  async function save(force = false) {
    setBusy(true); setMessage(null); setConflict(null);
    try {
      const r = await admin.contentPut(key, stripKeys(draft), meta.at, force);
      if (r.pending) {
        setSaved(JSON.stringify(r.value)); setPending({ value: r.value, savedBy: r.updatedBy, savedAt: r.updatedAt });
        setMessage({ kind: 'success', text: 'Sent for approval. An admin will publish it, and the website keeps the current version until then.' });
      } else {
        setDraft(withKeys(r.value)); setSaved(JSON.stringify(r.value)); setCustom(true); setMeta({ at: r.updatedAt, by: r.updatedBy });
        setMessage({ kind: 'success', text: 'Saved. The website now shows your changes.' });
      }
    } catch (err) {
      if (err instanceof AdminError && err.status === 409) setConflict(err.message);
      else setMessage({ kind: 'error', text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }
  async function reset() {
    if (!(await confirmDialog({ title: 'Reset to the original content?', message: 'The section goes back to its original text. Your edits stay in History, so you can restore them later.', confirm: 'Reset to original', danger: true }))) return;
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
    if (dirty && !(await confirmDialog({ title: 'Restore this version?', message: 'Your unsaved changes will be lost.', confirm: 'Restore version', danger: true }))) return;
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
        <div className="hint" style={{ marginTop: 0 }}><Link to="/admin">Dashboard</Link> › {where ? <><Link to={`/admin/pages/${where.page.id}`}>{where.page.label}{where.page.id !== 'every' && where.page.id !== 'emails' ? ' page' : ''}</Link>{where.item.caption && where.page.items.filter((x) => x.caption).length > 1 ? ` › ${where.item.caption}` : ''}</> : section.group}</div>
        <h1 style={{ fontSize: 26, marginTop: 4 }}>{where?.item.label ?? section.label}</h1>
        <p style={{ margin: '6px 0 0', color: '#4A5175' }}>{section.description}</p>
        <HowTo />
        <p className="hint" style={{ marginTop: 6 }}>
          {custom ? `Last edited ${fmtDate(meta.at)} by ${meta.by}.` : section.settings ? 'Not changed yet: these are the original settings.' : 'Showing the original content. Nothing has been edited yet.'}{' '}
          {!section.settings && <a href={section.path} target="_blank" rel="noopener noreferrer">Open the page ↗</a>}
        </p>
      </div>
      {pending && (
        <div className="card" style={{ borderColor: '#E9C46A', background: '#FFF9EA', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <b>A change by {pending.savedBy} ({fmtDate(pending.savedAt)}) is waiting for approval.</b>
          {me?.role === 'admin' ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button type="button" className="btn small" onClick={() => setDraft(withKeys(pending.value))}>Show the change in the form</button>
              <button type="button" className="btn small primary" onClick={async () => {
                const approve = async (force: boolean) => { await admin.decideDraft(key, 'approve', '', force); setPending(null); await load(); setMessage({ kind: 'success', text: 'Approved. The website now shows the change.' }); };
                try { await approve(false); }
                catch (e) {
                  // Someone changed the live section after this change was sent: approving would replace their edits.
                  if (e instanceof AdminError && e.status === 409) { if (await confirmDialog({ title: 'This section changed after the edit was sent', message: e.message, confirm: 'Approve anyway' })) { try { await approve(true); } catch (e2) { setMessage({ kind: 'error', text: (e2 as Error).message }); } } }
                  else setMessage({ kind: 'error', text: (e as Error).message });
                }
              }}>Approve and publish</button>
              <button type="button" className="btn small danger" onClick={async () => { const note = await promptDialog({ title: 'Send back this change', message: 'The website keeps the current version, and the editor gets an email with your reason.', label: 'Reason (optional)', multiline: true, confirm: 'Send back', danger: true }); if (note === null) return; try { await admin.decideDraft(key, 'reject', note); setPending(null); setMessage({ kind: 'success', text: 'The change was discarded.' }); } catch (e) { setMessage({ kind: 'error', text: (e as Error).message }); } }}>Reject</button>
            </div>
          ) : <span className="hint" style={{ margin: 0 }}>Saving again replaces the waiting change.</span>}
          {(() => {
              const list = describeChanges(section, live, pending.value);
              return (
                <details className="changes" open={list.length <= 8} style={{ marginTop: 10 }}>
                  <summary><b>What changed</b> ({list.length === 0 ? 'nothing differs from the live version' : `${list.length} change${list.length === 1 ? '' : 's'}`})</summary>
                  {list.length > 0 && (
                    <table className="table" style={{ marginTop: 8 }}>
                      <thead><tr><th>Where</th><th>Live now</th><th>Proposed</th></tr></thead>
                      <tbody>{list.slice(0, 60).map((c, i) => <tr key={i}><td>{c.where}</td><td><del>{c.before}</del></td><td><ins>{c.after}</ins></td></tr>)}</tbody>
                    </table>
                  )}
                  {list.length > 60 && <p className="hint">…and {list.length - 60} more.</p>}
                </details>
              );
            })()}
        </div>
      )}
      {featuredCount > 4 && <div role="status" style={{ padding: '10px 14px', borderRadius: 10, background: '#FFF6E0', color: '#7A5200', fontSize: 14.5 }}>{featuredCount} stories are featured. Featuring 3 or 4 works best, because only the first few are shown in the hero, the scoreboard and the quote wall.</div>}
      <div aria-live="polite">
        {message && <Notice kind={message.kind}>{message.text}</Notice>}
        {conflict && (
          <div className="card" role="alert" style={{ borderColor: '#E7B9B9', background: '#FFF6F6', display: 'grid', gap: 10 }}>
            <b>Your changes were not saved.</b>
            <span>{conflict}</span>
            <span className="hint" style={{ marginTop: 0 }}>Tip: before loading their version, copy anything you want to keep from the form.</span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="btn small" onClick={async () => { if (!dirty || await confirmDialog({ title: 'Load the latest saved version?', message: 'Your unsaved changes will be lost. Copy anything you want to keep first.', confirm: 'Load latest version', danger: true })) void load(); }}>Load the latest version</button>
              <button type="button" className="btn small danger" onClick={() => void save(true)}>Save mine anyway</button>
            </div>
          </div>
        )}
        {!pending && decision && decision.for === me?.name && (
          <Notice kind={decision.decision === 'approved' ? 'success' : 'error'}>
            Your last change was {decision.decision === 'approved' ? 'approved' : 'sent back'} by {decision.by} on {fmtDate(decision.at)}.{decision.decision === 'rejected' && decision.note ? ` Reason: ${decision.note}` : ''}
          </Notice>
        )}
      </div>
      {section.key === 'emails.templates' ? (
        <EmailEditor value={(draft ?? {}) as Row} onChange={(v) => setDraft(v)} />
      ) : section.kind === 'doc' ? (
        <div className="card"><FieldsGrid fields={section.fields} value={(draft ?? {}) as Row} onChange={(v) => setDraft(v)} refs={refs} /></div>
      ) : (
        // Long lists, or lists of items with many fields, are edited one item at a time.
        (Array.isArray(draft) && (draft.length > 4 || (draft.length > 1 && section.fields.length > 4)))
          ? <ListMaster saved={saved} fields={section.fields} titleField={section.titleField ?? section.fields[0].name} itemLabel={section.itemLabel ?? 'item'} value={draft as Row[]} onChange={(v) => setDraft(v)} refs={refs} />
          : <ItemsEditor fields={section.fields} titleField={section.titleField ?? section.fields[0].name} itemLabel={section.itemLabel ?? 'item'} value={(Array.isArray(draft) ? draft : []) as Row[]} onChange={(v) => setDraft(v)} refs={refs} startOpen />
      )}
      <div style={{ position: 'sticky', bottom: 0, background: 'rgba(244,246,252,0.96)', backdropFilter: 'blur(6px)', padding: '12px 0', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', borderTop: '1.5px solid #DDE3F3' }}>
        <button type="button" className="btn primary" onClick={() => void save()} disabled={!dirty || busy}>{busy ? 'Saving…' : 'Save changes'}</button>
        <button type="button" className="btn" onClick={() => { void load(); setMessage(null); }} disabled={!dirty || busy}>Discard changes</button>
        {!section.private && !section.settings && <button type="button" className="btn" title="Opens the page with your unsaved changes. Only you can see them." onClick={() => {
          try { localStorage.setItem('ooa-preview', JSON.stringify({ key, label: section.label, value: stripKeys(draft), at: Date.now() })); } catch { /* storage off */ }
          window.open(`${section.path}${section.path.includes('?') ? '&' : '?'}preview=1`, '_blank', 'noopener');
        }}>Preview on the website</button>}
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
