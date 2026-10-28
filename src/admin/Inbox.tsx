import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { admin } from './api';
import type { Lead } from './api';
import { useAdmin } from './AdminContext';
import { Notice, fmtDate } from './ui';

const KINDS = [
  { id: 'demo', label: 'Demo requests' }, { id: 'partner', label: 'Partner applications' }, { id: 'career', label: 'Job applications' }, { id: 'newsletter', label: 'Newsletter' },
];
const LABELS: Record<string, string> = { fn: 'First name', ln: 'Last name', em: 'Email', ph: 'Phone', co: 'Company', jt: 'Job title', cs: 'Company size', ii: 'Interested in', pr: 'Process to automate', pn: 'Name', pc: 'Company', pe: 'Email', pk: 'Country', pt: 'Partner type', pm: 'About their business', cn: 'Name', ce: 'Email', cph: 'Phone', crole: 'Role', clink: 'CV / profile link', cmsg: 'Message', nl: 'Email' };

function who(l: Lead): { name: string; email: string; extra: string } {
  const p = l.payload as Record<string, string>;
  if (l.kind === 'demo') return { name: `${p.fn ?? ''} ${p.ln ?? ''}`.trim(), email: p.em ?? '', extra: p.co ?? '' };
  if (l.kind === 'partner') return { name: p.pn ?? '', email: p.pe ?? '', extra: p.pc ?? '' };
  if (l.kind === 'career') return { name: p.cn ?? '', email: p.ce ?? '', extra: p.crole ?? '' };
  return { name: '', email: p.nl ?? '', extra: '' };
}

export default function Inbox() {
  const { me } = useAdmin();
  const [params, setParams] = useSearchParams();
  const kind = params.get('kind') ?? 'demo';
  const [status, setStatus] = useState('');
  const [items, setItems] = useState<Lead[] | null>(null);
  const [open, setOpen] = useState<string>('');
  const [error, setError] = useState('');
  const load = useCallback(() => { setItems(null); admin.leads(kind, status).then((r) => setItems(r.items)).catch((e: Error) => setError(e.message)); }, [kind, status]);
  useEffect(() => { load(); }, [load]);

  async function setLead(id: string, s: string) {
    try { await admin.setLeadStatus(id, s); setItems((it) => it?.map((l) => (l.id === id ? { ...l, status: s as Lead['status'] } : l)) ?? null); } catch (e) { setError((e as Error).message); }
  }
  async function remove(id: string) {
    if (!window.confirm('Delete this submission permanently?')) return;
    try { await admin.deleteLead(id); setItems((it) => it?.filter((l) => l.id !== id) ?? null); } catch (e) { setError((e as Error).message); }
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h1 style={{ fontSize: 28 }}>Inbox</h1>
      <div role="tablist" aria-label="Submission type" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {KINDS.map((k) => <button key={k.id} role="tab" aria-selected={kind === k.id} type="button" className={`btn${kind === k.id ? ' primary' : ''}`} onClick={() => setParams({ kind: k.id })}>{k.label}</button>)}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <label className="lbl" htmlFor="st" style={{ margin: 0 }}>Show</label>
        <select id="st" value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: 'auto' }}><option value="">All</option><option value="new">New</option><option value="contacted">Contacted</option><option value="closed">Closed</option></select>
        <span style={{ flex: 1 }} />
        <a className="btn" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }} href={`/api/admin/leads.csv?kind=${kind}&status=${status}`}>Download CSV</a>
      </div>
      {error && <Notice kind="error">{error}</Notice>}
      {items === null ? <p>Loading…</p> : items.length === 0 ? <div className="card hint">Nothing here yet.</div> : (
        <div className="card scroll-x" style={{ padding: 0 }}>
          <table>
            <thead><tr><th>Received</th><th>Who</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {items.map((l) => {
                const w = who(l); const isOpen = open === l.id;
                return (
                  <tr key={l.id} style={{ background: l.status === 'new' ? '#FBFAFF' : undefined }}>
                    <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(l.createdAt)}</td>
                    <td style={{ minWidth: 240 }}>
                      <div style={{ fontWeight: 600 }}>{w.name || w.email}</div>
                      <div className="hint" style={{ marginTop: 0 }}>{w.name && w.email}{w.extra && ` · ${w.extra}`}</div>
                      {isOpen && <dl style={{ margin: '10px 0 0', display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 14px', fontSize: 14 }}>{Object.entries(l.payload).filter(([, v]) => String(v) !== '').map(([k, v]) => (<div key={k} style={{ display: 'contents' }}><dt style={{ color: '#4A5175' }}>{LABELS[k] ?? k}</dt><dd style={{ margin: 0, overflowWrap: 'anywhere' }}>{String(v)}</dd></div>))}</dl>}
                    </td>
                    <td><select aria-label="Status" value={l.status} onChange={(e) => void setLead(l.id, e.target.value)} style={{ width: 'auto' }}><option value="new">New</option><option value="contacted">Contacted</option><option value="closed">Closed</option></select></td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button type="button" className="btn small" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? '' : l.id)}>{isOpen ? 'Hide' : 'Details'}</button>{' '}
                      {me?.role === 'admin' && <button type="button" className="btn small danger" onClick={() => void remove(l.id)}>Delete</button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
