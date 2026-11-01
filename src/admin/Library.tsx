import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import defaultsJson from '../cms/defaults.generated.json';
import { SECTION_BY_KEY } from '../cms/registry';
import type { Field } from '../cms/registry';
import { AdminError, admin } from './api';
import type { LibItem } from './api';
import { useAdmin } from './AdminContext';
import { FieldsGrid, stripKeys, withKeys } from './FieldEditor';
import type { Refs, Row } from './FieldEditor';
import { HowTo, Notice, fmtDate } from './ui';
import { describeChanges } from './diff';
import { ArticleBody } from '../cms/ArticleBody';
import { itemArticle } from '../cms/itemArticle';
import { confirmDialog, copyText, promptDialog } from '../ui/dialog';

const TYPE_KEYS: Record<string, string> = { article: 'resources.items', faq: 'resources.faqs', post: 'resources.insights', event: 'resources.events', training: 'resources.training', troubleshoot: 'resources.troubleshooting', release: 'resources.releases' };
const TYPE_LABEL: Record<string, string> = { article: 'Article', troubleshoot: 'Troubleshooting', release: 'Release note', faq: 'FAQ', post: 'Blog item', event: 'Event', training: 'Training item' };
const STATUS_LABEL: Record<string, string> = { draft: 'Draft', review: 'In review', scheduled: 'Scheduled', published: 'Published', archived: 'Archived' };
const STATUS_CLASS: Record<string, string> = { draft: 'custom', review: 'warn', scheduled: 'warn', published: 'ok', archived: '' };
const DEFAULTS = defaultsJson as Record<string, unknown>;

function refKeys(fields: Field[]): string[] {
  return [...new Set(fields.flatMap((f) => (f.type === 'ref' ? [f.ref] : f.type === 'items' ? refKeys(f.fields) : [])))];
}
async function loadRefs(fields: Field[]): Promise<Refs> {
  const keys = refKeys(fields);
  const vals = await Promise.all(keys.map((k) => admin.contentGet(k).then((r) => [k, ((r.value ?? DEFAULTS[k]) as Record<string, unknown>[]) ?? []] as const)));
  return Object.fromEntries(vals);
}

/** /admin/library — every article, FAQ, blog item, event and training item, with search and filters. */
export function Library() {
  const navigate = useNavigate();
  const { me } = useAdmin();
  const [items, setItems] = useState<LibItem[] | null>(null);
  const [today, setToday] = useState('');
  const [error, setError] = useState('');
  const [newType, setNewType] = useState('article');
  const location = useLocation();
  const [f, setF] = useState(() => ({ q: '', type: '', status: '', product: '' }));
  // The menu's Resources shortcuts open the library at one type (?type=faq…); follow them as they change.
  useEffect(() => { const sp = new URLSearchParams(location.search); const t = sp.get('type') ?? ''; setF((x) => ({ ...x, type: t, status: sp.get('status') ?? '' })); if (t && TYPE_LABEL[t]) setNewType(t); }, [location.search]);
  const readOnly = me?.role === 'viewer';

  const [misses, setMisses] = useState<{ q: string; count: number; last_at: string }[]>([]);
  useEffect(() => { admin.library().then((r) => { setItems(r.items); setToday(r.today); }).catch((e) => setError((e as Error).message)); admin.librarySearches().then((r) => setMisses(r.items)).catch(() => undefined); }, []);

  const products = useMemo(() => [...new Set((items ?? []).map((i) => i.product).filter(Boolean) as string[])].sort(), [items]);
  const shown = useMemo(() => {
    const q = f.q.trim().toLowerCase();
    return (items ?? []).filter((i) => (!f.type || i.type === f.type) && (!f.status || i.status === f.status || (f.status === 'due' && !!i.reviewBy && i.reviewBy <= today))
      && (!f.product || i.product === f.product) && (!q || `${i.title} ${i.id} ${i.category ?? ''} ${i.owner ?? ''}`.toLowerCase().includes(q)));
  }, [items, f, today]);
  const count = (s: string) => (items ?? []).filter((i) => i.status === s).length;

  async function create() {
    const title = await promptDialog({ title: `New ${TYPE_LABEL[newType].toLowerCase()}`, message: 'It starts as a draft, so nothing appears on the website until you publish it.', label: 'Title', required: true, confirm: 'Create' });
    if (!title) return;
    try { const r = await admin.libraryCreate(newType, title); navigate(`/admin/library/${r.id}`); } catch (e) { setError((e as Error).message); }
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div>
        <h1 style={{ fontSize: 28 }}>Resources library{f.type && TYPE_LABEL[f.type] ? <span style={{ color: '#6B7294', fontWeight: 500 }}> · {TYPE_LABEL[f.type]}{f.type === 'faq' ? 's' : f.type === 'troubleshoot' ? ' entries' : 's'}</span> : null}</h1>
        <p className="hint" style={{ margin: '4px 0 0', fontSize: 15 }}>Articles, FAQs, blog items, events and training, one item at a time.</p>
      </div>
      <HowTo />
      {error && <Notice kind="error">{error}</Notice>}
      <div className="card lib-form" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'end' }}>
        <label style={{ flex: '2 1 220px' }}>Search<input type="search" value={f.q} placeholder="Title, address, owner…" onChange={(e) => setF({ ...f, q: e.target.value })} /></label>
        <label style={{ flex: '1 1 140px' }}>Type<select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}><option value="">Every type</option>{Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        <label style={{ flex: '1 1 140px' }}>Status<select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option value="">Every status</option>{Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v} ({count(k)})</option>)}<option value="due">Review due</option></select></label>
        <label style={{ flex: '1 1 140px' }}>Product<select value={f.product} onChange={(e) => setF({ ...f, product: e.target.value })}><option value="">Every product</option>{products.map((p) => <option key={p} value={p}>{p}</option>)}</select></label>
        {!readOnly && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'end' }}>
            <label>New<select value={newType} onChange={(e) => setNewType(e.target.value)}>{Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
            <button type="button" className="btn primary" onClick={() => void create()}>+ Create</button>
          </div>
        )}
      </div>
      {items === null ? <p className="hint">Loading…</p> : (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="table">
            <thead><tr><th>Title</th><th>Type</th><th>Status</th><th>Product / kind</th><th>Owner</th><th>Updated</th></tr></thead>
            <tbody>
              {shown.map((i) => (
                <tr key={i.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/admin/library/${i.id}`)}>
                  <td><Link to={`/admin/library/${i.id}`} onClick={(e) => e.stopPropagation()}>{i.title || '(untitled)'}</Link>{i.access === 'customers' && <span className="badge" style={{ marginLeft: 6 }}>Customers only</span>}{i.reviewBy && i.reviewBy <= today && <span className="badge warn" style={{ marginLeft: 6 }}>Review due</span>}{i.pending && <span className="badge warn" style={{ marginLeft: 6 }}>Change waiting</span>}</td>
                  <td>{TYPE_LABEL[i.type] ?? i.type}</td>
                  <td><span className={`badge ${STATUS_CLASS[i.status] ?? ''}`}>{STATUS_LABEL[i.status] ?? i.status}</span>{i.status === 'scheduled' && i.publishAt ? <small className="hint" style={{ display: 'block', margin: 0 }}>{fmtDate(i.publishAt)}</small> : null}</td>
                  <td>{[i.product, i.category].filter(Boolean).join(' · ') || '—'}</td>
                  <td>{i.owner || '—'}</td>
                  <td>{fmtDate(i.updatedAt)}<small className="hint" style={{ display: 'block', margin: 0 }}>{i.updatedBy}</small></td>
                </tr>
              ))}
            </tbody>
          </table>
          {shown.length === 0 && <p className="hint" style={{ padding: 16 }}>Nothing matches these filters.</p>}
        </div>
      )}
      <p className="hint">{shown.length} of {items?.length ?? 0} items shown.</p>
      <Digest />
      <div className="card">
        <h2 style={{ fontSize: 17, marginTop: 0 }}>Searches that found nothing</h2>
        <p className="hint" style={{ marginTop: 0 }}>What visitors searched for on the Resources page in the last 90 days without finding anything. A good list of articles and FAQs to write next.</p>
        {misses.length === 0 ? <p className="hint">Nothing yet.</p> : (
          <table className="table"><thead><tr><th>Search</th><th>Times</th><th>Last searched</th></tr></thead>
            <tbody>{misses.map((m) => <tr key={m.q}><td>{m.q}</td><td>{m.count}</td><td>{fmtDate(m.last_at)}</td></tr>)}</tbody></table>
        )}
      </div>
    </div>
  );
}

type Meta = { status: string; publishAt: string; access: string; parent: string; order: number; owner: string; reviewBy: string };
const toLocal = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '');

/** /admin/library/:id — edit one item, with its status, dates, owner, history and access. */
export function LibraryItem() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { me } = useAdmin();
  const [item, setItem] = useState<(LibItem & { data: Record<string, unknown> }) | null>(null);
  const [pending, setPending] = useState<{ data: Record<string, unknown>; savedBy: string; savedAt: string } | null>(null);
  const [feedback, setFeedback] = useState<{ helpful: number; unhelpful: number; notes: { note: string; at: string }[] } | null>(null);
  const [data, setData] = useState<Row>({});
  const [meta, setMeta] = useState<Meta | null>(null);
  const [saved, setSaved] = useState('');
  const [refs, setRefs] = useState<Refs>({});
  const [articles, setArticles] = useState<LibItem[]>([]);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [conflict, setConflict] = useState('');
  const [busy, setBusy] = useState(false);
  const [revs, setRevs] = useState<{ id: number; saved_at: string; saved_by: string }[] | null>(null);
  const readOnly = me?.role === 'viewer';

  const load = useCallback(async () => {
    try {
      const r = await admin.libraryItem(id);
      const fields = SECTION_BY_KEY[TYPE_KEYS[r.type]].fields;
      setItem(r); setData(withKeys(r.data) as Row); setPending(r.pending); setFeedback((r as { feedback?: typeof feedback }).feedback ?? null);
      const m: Meta = { status: r.status, publishAt: toLocal(r.publishAt), access: r.access, parent: r.parent ?? '', order: r.order, owner: r.owner ?? '', reviewBy: r.reviewBy ?? '' };
      setMeta(m); setSaved(JSON.stringify([r.data, m])); setConflict('');
      setRefs(await loadRefs(fields));
      if (r.type === 'article') admin.library().then((l) => setArticles(l.items.filter((x) => x.type === 'article' && x.id !== r.id)));
    } catch (e) { setMessage({ kind: 'error', text: (e as Error).message }); }
  }, [id]);
  useEffect(() => { void load(); }, [load]);

  const dirty = !!meta && JSON.stringify([stripKeys(data), meta]) !== saved;
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  if (!item || !meta) return message ? <Notice kind="error">{message.text}</Notice> : <p className="hint">Loading…</p>;
  const key = TYPE_KEYS[item.type];
  const fields = SECTION_BY_KEY[key].fields.filter((f) => !(item.type === 'article' && f.name === 'id'));
  const pageUrl = item.type === 'troubleshoot' ? `/resources/troubleshooting?article=${item.id}` : item.type === 'release' ? (item.product ? `/resources/docs/${item.product}/${item.id}` : `/resources/whats-new?article=${item.id}`) : item.type === 'article' ? (item.product ? `/resources/docs/${item.product}/${item.id}` : `/resources/${item.category ?? 'get-started'}?article=${item.id}`)
    : item.type === 'faq' ? '/resources/faqs' : item.type === 'post' ? '/resources/blog' : item.type === 'event' ? '/resources/events' : '/resources/training';

  async function save(force = false) {
    setBusy(true); setMessage(null); setConflict('');
    try {
      const r = await admin.librarySave(id, stripKeys(data), { ...meta, publishAt: meta!.publishAt ? new Date(meta!.publishAt).toISOString() : '' }, item!.version, force);
      if (r.pendingSaved) {
        // The live item is unchanged; keep the editor's version in the form and show it as waiting.
        setSaved(JSON.stringify([stripKeys(data), meta])); setPending({ data: stripKeys(data) as Record<string, unknown>, savedBy: me?.name ?? '', savedAt: new Date().toISOString() });
        setMessage({ kind: 'success', text: 'Sent for review. The website keeps showing the current version until an admin approves your change.' });
        return;
      }
      setItem(r); const m: Meta = { ...meta!, status: r.status }; setMeta(m); setSaved(JSON.stringify([r.data, m])); setData(withKeys(r.data) as Row);
      setMessage({ kind: 'success', text: r.sentForReview ? 'Saved and sent for review. An admin will publish it.' : r.status === 'published' ? 'Saved. The website now shows this item.' : r.status === 'scheduled' ? `Saved. It will appear on ${fmtDate(r.publishAt ?? '')}.` : 'Saved. It is not on the website (status: ' + (STATUS_LABEL[r.status] ?? r.status) + ').' });
    } catch (e) {
      if (e instanceof AdminError && e.status === 409) setConflict(e.message); else setMessage({ kind: 'error', text: (e as Error).message });
    } finally { setBusy(false); }
  }

  const sameProduct = articles.filter((a) => a.product === item.product);
  return (
    <div style={{ display: 'grid', gap: 16, paddingBottom: 80 }}>
      <div>
        <p className="hint" style={{ margin: 0 }}><Link to="/admin/library">Resources library</Link> › {TYPE_LABEL[item.type]}</p>
        <h1 style={{ fontSize: 26 }}>{String(data[SECTION_BY_KEY[key].titleField ?? 'title'] ?? '') || '(untitled)'}</h1>
        <p className="hint" style={{ marginTop: 4 }}>
          {item.type === 'article' && <>Address: <code>{item.id}</code> · </>}Last saved {fmtDate(item.updatedAt)} by {item.updatedBy}.{' '}
          {item.status === 'published' && <a href={pageUrl} target="_blank" rel="noopener noreferrer">Open on the website ↗</a>}
        </p>
      </div>
      <HowTo />
      {message && <Notice kind={message.kind}>{message.text}</Notice>}
      {pending && (
        <div className="card" style={{ borderColor: '#E9C46A', background: '#FFF9EA', display: 'grid', gap: 10 }}>
          <b>A change by {pending.savedBy} ({fmtDate(pending.savedAt)}) is waiting for approval. The website shows the current version until then.</b>
          {me?.role === 'admin' && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button type="button" className="btn small" onClick={() => setData(withKeys(pending.data) as Row)}>Show the change in the form</button>
              <button type="button" className="btn small primary" onClick={async () => {
                const go = async (force: boolean) => { await admin.libraryDecide(id, 'approve', force); await load(); setMessage({ kind: 'success', text: 'Approved. The website now shows the change.' }); };
                try { await go(false); } catch (e) {
                  if (e instanceof AdminError && e.status === 409) { if (await confirmDialog({ title: 'This item changed after the edit was sent', message: e.message, confirm: 'Approve anyway' })) await go(true).catch((e2) => setMessage({ kind: 'error', text: (e2 as Error).message })); }
                  else setMessage({ kind: 'error', text: (e as Error).message });
                }
              }}>Approve and publish</button>
              <button type="button" className="btn small danger" onClick={async () => { const note = await promptDialog({ title: 'Send back this change', message: 'The website keeps the current version.', label: 'Reason (optional)', multiline: true, confirm: 'Send back', danger: true }); if (note === null) return; try { await admin.libraryDecide(id, 'reject', false, note); await load(); setMessage({ kind: 'success', text: 'Sent back. The website keeps the current version.' }); } catch (e) { setMessage({ kind: 'error', text: (e as Error).message }); } }}>Send back</button>
            </div>
          )}
          {(() => {
            const list = describeChanges({ ...SECTION_BY_KEY[key], kind: 'doc' }, item.data, pending.data);
            return list.length === 0 ? <span className="hint">The waiting change is the same as the live version.</span> : (
              <details className="changes" open={list.length <= 8}><summary><b>What changed</b> ({list.length})</summary>
                <table className="table" style={{ marginTop: 8 }}><thead><tr><th>Where</th><th>Live now</th><th>Proposed</th></tr></thead>
                  <tbody>{list.map((c, i) => <tr key={i}><td>{c.where}</td><td><del>{c.before}</del></td><td><ins>{c.after}</ins></td></tr>)}</tbody></table>
              </details>
            );
          })()}
        </div>
      )}
      {conflict && (
        <div className="card" role="alert" style={{ borderColor: '#E7B9B9', background: '#FFF6F6', display: 'grid', gap: 10 }}>
          <b>Your changes were not saved.</b><span>{conflict}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn small" onClick={() => void load()}>Load the latest version</button>
            <button type="button" className="btn small danger" onClick={() => void save(true)}>Save mine anyway</button>
          </div>
        </div>
      )}
      <div className="card">
        <h2 style={{ fontSize: 17, marginTop: 0 }}>Publishing</h2>
        <div className="lib-form" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          <label>Status<select disabled={readOnly} value={meta.status} onChange={(e) => setMeta({ ...meta, status: e.target.value })}>{Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          {meta.status === 'scheduled' && <label>Publish on<input disabled={readOnly} type="datetime-local" value={meta.publishAt} onChange={(e) => setMeta({ ...meta, publishAt: e.target.value })} /></label>}
          {item.type === 'article' && <label>Who can read it<select disabled={readOnly} value={meta.access} onChange={(e) => setMeta({ ...meta, access: e.target.value })}><option value="public">Everyone</option><option value="customers">Signed-in customers only</option></select></label>}
          {item.type === 'article' && <label>Parent topic<select disabled={readOnly} value={meta.parent} onChange={(e) => setMeta({ ...meta, parent: e.target.value })}><option value="">None (top level)</option>{sameProduct.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}</select></label>}
          <label>Order<input disabled={readOnly} type="number" step={10} value={meta.order} onChange={(e) => setMeta({ ...meta, order: Number(e.target.value) })} /><small className="hint">Lower numbers come first.</small></label>
          <label>Owner<input disabled={readOnly} value={meta.owner} onChange={(e) => setMeta({ ...meta, owner: e.target.value })} placeholder="Who keeps it up to date" /></label>
          <label>Review by<input disabled={readOnly} type="date" value={meta.reviewBy} onChange={(e) => setMeta({ ...meta, reviewBy: e.target.value })} /><small className="hint">Shows “Review due” in the library from this date.</small></label>
        </div>
      </div>
      <div className="card">
        <h2 style={{ fontSize: 17, marginTop: 0 }}>Content</h2>
        <fieldset disabled={readOnly} style={{ border: 0, padding: 0, margin: 0 }}>
          <FieldsGrid fields={fields} value={data} onChange={setData} refs={refs} />
        </fieldset>
      </div>
      {(item.type === 'article' || item.type === 'troubleshoot' || item.type === 'release') && (() => {
        const built = itemArticle(item.type, item.id, stripKeys(data) as Record<string, unknown>);
        return (
          <div className="card">
            <h2 style={{ fontSize: 17, marginTop: 0 }}>Preview</h2>
            <p className="hint" style={{ marginTop: 0 }}>How it will look on the website (updates as you type).{built ? ` It appears as an article titled “${built.title}” in ${built.category === 'troubleshooting' ? 'Troubleshooting' : 'What’s new'}${built.product ? ' and in the product’s documentation' : ''}.` : ''}</p>
            <div className="rs-body" style={{ maxWidth: '70ch' }}><ArticleBody text={built ? built.body : String(data.body ?? '')} /></div>
          </div>
        );
      })()}
      {feedback && (feedback.helpful + feedback.unhelpful > 0) && (
        <div className="card">
          <h2 style={{ fontSize: 17, marginTop: 0 }}>Reader feedback</h2>
          <p style={{ margin: 0 }}><b>{feedback.helpful}</b> found it helpful · <b>{feedback.unhelpful}</b> didn’t ({Math.round(100 * feedback.helpful / (feedback.helpful + feedback.unhelpful))}% helpful)</p>
          {feedback.notes.length > 0 && <><p className="hint">What readers said was missing:</p><ul>{feedback.notes.map((n, i) => <li key={i}>{n.note} <small className="hint">({fmtDate(n.at)})</small></li>)}</ul></>}
        </div>
      )}
      <div className="card">
        <button type="button" className="btn small" onClick={() => admin.libraryRevisions(id).then((r) => setRevs(r.items))}>History</button>
        {revs && (revs.length === 0 ? <p className="hint">No earlier versions yet.</p> : (
          <ul>{revs.map((r) => <li key={r.id}>{fmtDate(r.saved_at)} by {r.saved_by} {!readOnly && <button type="button" className="btn small" onClick={async () => { if (await confirmDialog({ title: 'Restore this version?', message: 'The current version is kept in History, so you can switch back.', confirm: 'Restore version' })) { try { await admin.libraryRestore(id, r.id); await load(); setRevs(null); setMessage({ kind: 'success', text: 'Earlier version restored.' }); } catch (e) { setMessage({ kind: 'error', text: (e as Error).message }); } } }}>Restore</button>}</li>)}</ul>
        ))}
      </div>
      {!readOnly && (
        <div className="savebar" style={{ position: 'sticky', bottom: 0, display: 'flex', gap: 8, justifyContent: 'space-between', padding: '10px 0', background: 'var(--adm-bg, #F4F6FC)' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn primary" disabled={!dirty || busy} onClick={() => void save()}>{busy ? 'Saving…' : 'Save'}</button>
            <button type="button" className="btn" disabled={!dirty} onClick={() => void load()}>Discard changes</button>
          </div>
          {me?.role === 'admin' && <button type="button" className="btn danger" onClick={async () => { if (await confirmDialog({ title: 'Delete this item?', message: 'It is deleted for good, with its history. To hide it but keep it, set the status to Archived instead.', confirm: 'Delete item', danger: true })) { try { await admin.libraryDelete(id); navigate('/admin/library'); } catch (e) { setMessage({ kind: 'error', text: (e as Error).message }); } } }}>Delete</button>}
        </div>
      )}
    </div>
  );
}

/** The monthly product updates email: everything new since a date, ready to paste into a newsletter tool. */
function Digest() {
  const [since, setSince] = useState(() => new Date(Date.now() - 31 * 86400e3).toISOString().slice(0, 10));
  const [d, setD] = useState<{ html: string; text: string; count: number } | null>(null);
  const [err, setErr] = useState('');
  const copy = (t: string) => copyText(t, 'Email');
  return (
    <div className="card" style={{ display: 'grid', gap: 10 }}>
      <h2 style={{ fontSize: 17, margin: 0 }}>Product updates email</h2>
      <p className="hint" style={{ margin: 0 }}>Everything published or updated since a date, as an email to paste into your newsletter tool (for example Zoho Campaigns or Mailchimp). Sending from the website itself would hit email limits and land in spam.</p>
      <div style={{ display: 'flex', gap: 8, alignItems: 'end', flexWrap: 'wrap' }}>
        <label>Since<input type="date" value={since} onChange={(e) => setSince(e.target.value)} /></label>
        <button type="button" className="btn primary" onClick={() => admin.libraryDigest(since).then(setD).catch((e) => setErr((e as Error).message))}>Build the email</button>
        <a className="btn" href="/api/admin/leads.csv?kind=newsletter">Download subscribers (CSV)</a>
      </div>
      {err && <Notice kind="error">{err}</Notice>}
      {d && (d.count === 0 ? <p className="hint">Nothing new since that date.</p> : (
        <>
          <div style={{ display: 'flex', gap: 8 }}><button type="button" className="btn small" onClick={() => void copy(d.html)}>Copy HTML</button><button type="button" className="btn small" onClick={() => void copy(d.text)}>Copy plain text</button><span className="hint" style={{ margin: 0 }}>{d.count} items</span></div>
          <iframe title="Email preview" sandbox="" srcDoc={d.html} style={{ width: '100%', height: 360, border: '1px solid #E3E8F5', borderRadius: 10, background: '#FFFFFF' }} />
        </>
      ))}
    </div>
  );
}
