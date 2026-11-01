import { useCallback, useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { admin } from './api';
import type { Activity, CustomerFull, Deal, EmailRow, Org, RecordItem, RequestRow } from './api';
import { useAdmin } from './AdminContext';
import { Notice, fmtDate } from './ui';
import { EmailResult, FIELD_LABEL, PageHead, StageBadge, Timeline, canChange } from './wf';
import { SECTION_BY_KEY } from '../cms/registry';
import { confirmDialog, promptDialog } from '../ui/dialog';

type Msg = { kind: 'error' | 'success'; text: ReactNode } | null;
const err = (set: (m: Msg) => void) => (e: unknown) => set({ kind: 'error', text: (e as Error).message });

/* ---------------- Partners ---------------- */
export function Partners() {
  const [data, setData] = useState<{ items: Org[]; types: string[] } | null>(null);
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [msg, setMsg] = useState<Msg>(null);
  useEffect(() => { admin.partners().then(setData).catch(err(setMsg)); }, []);
  const items = (data?.items ?? []).filter((o) => (!status || o.status === status) && (!type || o.type === type));
  return (
    <div className="wf-stack">
      <PageHead title="Partners" sub="Approved partners. New applications are under Pipelines → Partner applications." />
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      <div className="wf-filters">
        <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Every status</option><option value="onboarding">Onboarding</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
        <select aria-label="Type" value={type} onChange={(e) => setType(e.target.value)}><option value="">Every type</option>{data?.types.map((t) => <option key={t}>{t}</option>)}</select>
      </div>
      {!data ? <p>Loading…</p> : items.length === 0 ? <div className="card hint">No partners yet. Approve an application to create one.</div> : (
        <div className="card scroll-x" style={{ padding: 0 }}><table className="wf-table">
          <thead><tr><th>Company</th><th>Type</th><th>Level</th><th>Status</th><th>Onboarding</th><th>Directory</th><th>People</th><th>Deals</th></tr></thead>
          <tbody>{items.map((o) => (
            <tr key={o.id}><td><Link to={`/admin/partners/${o.id}`}><b>{o.company}</b></Link><div className="hint" style={{ margin: 0 }}>{o.country}</div></td><td>{o.type}</td><td>{o.level}</td><td><StageBadge id={o.status} /></td>
              <td>{o.checklist.filter((c) => c.done).length}/{o.checklist.length}</td><td>{o.listed ? 'Listed' : 'Hidden'}</td><td>{o.people}</td><td>{o.deals}</td></tr>
          ))}</tbody>
        </table></div>
      )}
    </div>
  );
}

export function PartnerPage() {
  const { id = '' } = useParams();
  const { me } = useAdmin();
  const [d, setD] = useState<Awaited<ReturnType<typeof admin.partner>> | null>(null);
  const [msg, setMsg] = useState<Msg>(null);
  const load = useCallback(() => admin.partner(id).then(setD).catch(err(setMsg)), [id]);
  useEffect(() => { void load(); }, [load]);
  if (!d) return msg ? <Notice kind="error">{msg.text}</Notice> : <p>Loading…</p>;
  const o = d.item;
  const w = canChange(me?.role, 'partners');
  async function patch(b: Record<string, unknown>, ok: string) {
    try { const r = await admin.updatePartner(id, b); setMsg({ kind: 'success', text: <>{ok}{r.emails?.length ? <EmailResult result={r.emails[0]} /> : null}</> }); await load(); } catch (e) { err(setMsg)(e); }
  }
  async function change(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = new FormData(e.currentTarget);
    await patch({ level: f.get('level'), status: f.get('status'), type: f.get('type'), note: f.get('note') }, 'Saved.');
  }
  return (
    <div className="wf-stack">
      <Link to="/admin/partners">← Partners</Link>
      <PageHead title={o.company} sub={`${o.type} · ${o.country} · partner since ${fmtDate(o.createdAt)}`}><StageBadge id={o.status} /> <span className="wf-badge wf-purple">{o.level}</span></PageHead>
      <div aria-live="polite">{msg && <Notice kind={msg.kind}>{msg.text}</Notice>}</div>
      <div className="wf-two wf-two-wide">
        <div className="wf-stack">
          <div className="card wf-stack-s">
            <h2 style={{ fontSize: 18 }}>Onboarding checklist</h2>
            <p className="hint" style={{ margin: 0 }}>When every step is ticked, the partner becomes active automatically and can register deals.</p>
            {o.checklist.map((c) => (
              <label key={c.id} className="wf-check"><input type="checkbox" checked={c.done} disabled={!w} onChange={(e) => void patch({ checklist: { [c.id]: e.target.checked } }, `${c.label}: ${e.target.checked ? 'done' : 'not done'}.`)} /> {c.label}</label>
            ))}
          </div>
          {w && (
            <form className="card wf-stack-s" onSubmit={change}>
              <h2 style={{ fontSize: 18 }}>Level, status and type</h2>
              <div className="adm-grid2">
                <div><label className="lbl" htmlFor="lv">Level</label><select id="lv" name="level" defaultValue={o.level}>{d.levels.map((x) => <option key={x}>{x}</option>)}</select></div>
                <div><label className="lbl" htmlFor="st">Status</label><select id="st" name="status" defaultValue={o.status}>{d.statuses.map((x) => <option key={x} value={x}>{x[0].toUpperCase() + x.slice(1)}</option>)}</select></div>
                <div><label className="lbl" htmlFor="ty">Type</label><select id="ty" name="type" defaultValue={o.type}>{d.types.map((x) => <option key={x}>{x}</option>)}</select></div>
              </div>
              <div><label className="lbl" htmlFor="pn">Message to the partner (optional, included in the email)</label><textarea id="pn" name="note" rows={2} /></div>
              <p className="hint" style={{ margin: 0 }}>A level or status change emails the partner’s main contact. Inactive partners can’t sign in or appear in the directory.</p>
              <div><button className="btn primary" type="submit">Save changes</button></div>
            </form>
          )}
          <div className="card wf-stack-s">
            <div className="wf-pipe-h"><h2 style={{ fontSize: 18 }}>Public partner directory</h2>{w && <button type="button" className="btn small" onClick={() => void patch({ listed: !o.listed }, o.listed ? 'Hidden from the directory.' : 'Listed in the directory.')}>{o.listed ? 'Hide' : 'List'}</button>}</div>
            <p className="hint" style={{ margin: 0 }}>{o.status === 'active' && o.listed ? 'Shown on the Partners page.' : o.listed ? 'Will show once the partner is active.' : 'Hidden.'} Website: {o.website || '–'}. About: {o.about || '–'}</p>
          </div>
          <div className="card">
            <h2 style={{ fontSize: 18, marginBottom: 8 }}>Deals ({d.deals.length})</h2>
            {d.deals.length === 0 ? <p className="hint">No deals registered yet.</p> : <ul className="wf-list">{d.deals.map((x) => <li key={x.id}><span><b>{x.customer}</b> <StageBadge id={x.status} /></span><small>{x.value || 'No value given'} · {fmtDate(x.created_at)}{x.protected_until ? ` · protected until ${x.protected_until}` : ''}</small></li>)}</ul>}
            <Link to="/admin/deals">Manage deals →</Link>
          </div>
        </div>
        <div className="wf-stack">
          <div className="card">
            <h2 style={{ fontSize: 18, marginBottom: 8 }}>People with portal access</h2>
            <ul className="wf-list">{d.people.map((p) => (
              <li key={p.id}><span><b>{p.name}</b> {p.role === 'owner' && <span className="wf-badge wf-blue">Main contact</span>}</span><small>{p.email} · {p.joined ? `last sign-in ${fmtDate(p.last_login)}` : 'hasn’t accepted the invitation yet'}</small>
                {w && !p.joined && <button type="button" className="btn small" style={{ alignSelf: 'flex-start', marginTop: 6 }} onClick={async () => { try { const r = await admin.reinvite(id, p.id); setMsg({ kind: 'success', text: <>Invitation sent again.<EmailResult result={r.email} /></> }); } catch (e) { err(setMsg)(e); } }}>Resend invitation</button>}
              </li>
            ))}</ul>
          </div>
          <div className="card"><h2 style={{ fontSize: 18, marginBottom: 10 }}>History</h2><Timeline items={d.activity} /></div>
          {o.leadId && <Link to={`/admin/records/${o.leadId}`}>Original application →</Link>}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Deals ---------------- */
export function Deals() {
  const { me } = useAdmin();
  const [items, setItems] = useState<Deal[] | null>(null);
  const [status, setStatus] = useState('submitted');
  const [msg, setMsg] = useState<Msg>(null);
  const load = useCallback(() => admin.deals().then((r) => setItems(r.items)).catch(err(setMsg)), []);
  useEffect(() => { void load(); }, [load]);
  const w = canChange(me?.role, 'deals');
  async function decide(d: Deal, decision: string) {
    let reason = ''; let days = 90;
    if (decision === 'reject') { reason = (await promptDialog({ title: `Reject the deal for ${d.customer}`, message: 'The partner gets an email with your reason.', label: 'Reason', multiline: true, required: true, confirm: 'Reject deal', danger: true })) ?? ''; if (!reason) return; }
    if (decision === 'approve') { const v = await promptDialog({ title: `Approve the deal for ${d.customer}`, message: 'While it is protected, other partners can’t register this customer.', label: 'Protect for (days)', type: 'number', min: 1, initial: '90', required: true, confirm: 'Approve deal' }); if (!v) return; days = Number(v) || 90; }
    try { const r = await admin.decideDeal(d.id, { decision, reason, days }); setMsg({ kind: 'success', text: <>Deal {decision === 'approve' ? 'approved' : decision === 'reject' ? 'rejected' : `marked ${decision}`}.<EmailResult result={r.email} /></> }); await load(); } catch (e) { err(setMsg)(e); }
  }
  const shown = (items ?? []).filter((d) => !status || d.status === status);
  return (
    <div className="wf-stack">
      <PageHead title="Deal registrations" sub="Deals registered by partners. Approving protects the customer for that partner for the days you choose." />
      <div aria-live="polite">{msg && <Notice kind={msg.kind}>{msg.text}</Notice>}</div>
      <div className="wf-chips wf-tabs">{['submitted', 'approved', 'won', 'lost', 'rejected', ''].map((s) => <button key={s || 'all'} type="button" className={status === s ? 'on' : ''} onClick={() => setStatus(s)}>{s ? s[0].toUpperCase() + s.slice(1) : 'All'} <b>{(items ?? []).filter((d) => !s || d.status === s).length}</b></button>)}</div>
      {!items ? <p>Loading…</p> : shown.length === 0 ? <div className="card hint">Nothing here.</div> : (
        <div className="card scroll-x" style={{ padding: 0 }}><table className="wf-table">
          <thead><tr><th>Customer</th><th>Partner</th><th>Value</th><th>Status</th><th>Registered</th><th /></tr></thead>
          <tbody>{shown.map((d) => (
            <tr key={d.id}>
              <td><b>{d.customer}</b><div className="hint" style={{ margin: 0 }}>{d.contact} · {d.email} · {d.country}</div>{d.notes && <div className="hint" style={{ margin: 0 }}>{d.notes}</div>}</td>
              <td><Link to={`/admin/partners/${d.org_id}`}>{d.partner}</Link><div className="hint" style={{ margin: 0 }}>by {d.created_by}</div></td>
              <td>{d.value || '–'}</td>
              <td><StageBadge id={d.status} />{d.protected_until && <div className="hint" style={{ margin: 0 }}>until {d.protected_until}</div>}{d.reason && <div className="hint" style={{ margin: 0 }}>{d.reason}</div>}</td>
              <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(d.created_at)}</td>
              <td style={{ whiteSpace: 'nowrap' }}>{w && d.status === 'submitted' && <><button type="button" className="btn small primary" onClick={() => void decide(d, 'approve')}>Approve</button> <button type="button" className="btn small danger" onClick={() => void decide(d, 'reject')}>Reject</button></>}
                {w && d.status === 'approved' && <><button type="button" className="btn small" onClick={() => void decide(d, 'won')}>Won</button> <button type="button" className="btn small" onClick={() => void decide(d, 'lost')}>Lost</button></>}</td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
    </div>
  );
}

/* ---------------- Requests ---------------- */
const REQ_LABEL: Record<string, string> = { community: 'Community invites', plan: 'Plan changes', deletion: 'Account deletion', event: 'Event registrations' };
export function Requests() {
  const { me } = useAdmin();
  const [kind, setKind] = useState('community');
  const [items, setItems] = useState<RequestRow[] | null>(null);
  const [msg, setMsg] = useState<Msg>(null);
  const load = useCallback(() => admin.requests().then((r) => setItems(r.items)).catch(err(setMsg)), []);
  useEffect(() => { void load(); }, [load]);
  const w = canChange(me?.role, 'requests');
  async function decide(r: RequestRow, decision: string) {
    let reason = '';
    if (decision === 'reject') { reason = (await promptDialog({ title: `Reject ${r.name}’s request`, message: 'They get an email with your reason.', label: 'Reason', multiline: true, required: true, confirm: 'Reject request', danger: true })) ?? ''; if (!reason) return; }
    if (decision === 'approve' && r.kind === 'deletion' && !(await confirmDialog({ title: `Delete ${r.name}’s account?`, message: 'Their account and personal data are deleted for good. This can’t be undone.', confirm: 'Delete account', danger: true }))) return;
    try { const x = await admin.decideRequest(r.id, { decision, reason }); setMsg({ kind: 'success', text: <>Done.<EmailResult result={x.email} /></> }); await load(); } catch (e) { err(setMsg)(e); }
  }
  const shown = (items ?? []).filter((r) => r.kind === kind);
  const detail = (r: RequestRow) => Object.entries(r.payload).filter(([k, v]) => v && !['name', 'email'].includes(k)).map(([k, v]) => `${FIELD_LABEL[k] ?? k}: ${v}`).join(' · ');
  return (
    <div className="wf-stack">
      <PageHead title="Requests" sub="Things people asked for that need a decision. Approving or rejecting emails the person." />
      <div aria-live="polite">{msg && <Notice kind={msg.kind}>{msg.text}</Notice>}</div>
      <div className="wf-chips wf-tabs">{Object.keys(REQ_LABEL).map((k) => <button key={k} type="button" className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>{REQ_LABEL[k]} <b>{(items ?? []).filter((r) => r.kind === k && (r.status === 'new' || r.status === 'registered')).length}</b></button>)}</div>
      {!items ? <p>Loading…</p> : shown.length === 0 ? <div className="card hint">Nothing here.</div> : (
        <div className="card scroll-x" style={{ padding: 0 }}><table className="wf-table">
          <thead><tr><th>Person</th><th>Details</th><th>Status</th><th>Received</th><th /></tr></thead>
          <tbody>{shown.map((r) => (
            <tr key={r.id}>
              <td><b>{r.name}</b><div className="hint" style={{ margin: 0 }}>{r.email}</div>{r.customer_id && <Link to={`/admin/customers/${r.customer_id}`}>Customer account →</Link>}</td>
              <td>{detail(r) || '–'}{r.reason && <div className="hint" style={{ margin: 0 }}>Reason: {r.reason}</div>}</td>
              <td><StageBadge id={r.status} /></td><td style={{ whiteSpace: 'nowrap' }}>{fmtDate(r.created_at)}</td>
              <td style={{ whiteSpace: 'nowrap' }}>
                {w && r.status === 'new' && <><button type="button" className="btn small primary" onClick={() => void decide(r, 'approve')}>Approve</button> <button type="button" className="btn small danger" onClick={() => void decide(r, 'reject')}>Reject</button></>}
                {w && r.kind === 'event' && r.status === 'registered' && <><button type="button" className="btn small" onClick={() => void decide(r, 'attended')}>Attended</button> <button type="button" className="btn small" onClick={() => void decide(r, 'no_show')}>No-show</button> <button type="button" className="btn small" onClick={() => void decide(r, 'cancelled')}>Cancelled</button></>}
              </td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
      {kind === 'community' && <p className="hint">Approving sends the community link set under Emails → Community invitation link.</p>}
    </div>
  );
}

/* ---------------- Customers ---------------- */
const CSTATUS: Record<string, string> = { free: 'Free', trial: 'Trial', paid: 'Paid', enterprise_pending: 'Enterprise (pending)', enterprise: 'Enterprise', suspended: 'Suspended', closed: 'Closed' };
export function Customers() {
  const [rows, setRows] = useState<CustomerFull[] | null>(null);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [msg, setMsg] = useState<Msg>(null);
  useEffect(() => { admin.customers().then((r) => setRows(r.items)).catch(err(setMsg)); }, []);
  const t = q.trim().toLowerCase();
  const shown = (rows ?? []).filter((r) => (!status || r.status === status) && (!t || `${r.first_name} ${r.last_name} ${r.email} ${r.company}`.toLowerCase().includes(t)));
  return (
    <div className="wf-stack">
      <PageHead title="Customer accounts" sub="People who signed up on the website. Click a name to change the plan or status." />
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      <div className="wf-chips wf-tabs"><button type="button" className={!status ? 'on' : ''} onClick={() => setStatus('')}>All <b>{rows?.length ?? 0}</b></button>{Object.keys(CSTATUS).map((s) => <button key={s} type="button" className={status === s ? 'on' : ''} onClick={() => setStatus(s)}>{CSTATUS[s]} <b>{(rows ?? []).filter((r) => r.status === s).length}</b></button>)}</div>
      <input type="text" placeholder="Search name, email or company" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" style={{ maxWidth: 420 }} />
      {!rows ? <p>Loading…</p> : shown.length === 0 ? <div className="card hint">Nothing here.</div> : (
        <div className="card scroll-x" style={{ padding: 0 }}><table className="wf-table">
          <thead><tr><th>Name</th><th>Company</th><th>Plan</th><th>Status</th><th>Newsletter</th><th>Joined</th></tr></thead>
          <tbody>{shown.map((r) => <tr key={r.id}><td><Link to={`/admin/customers/${r.id}`}><b>{r.first_name} {r.last_name}</b></Link><div className="hint" style={{ margin: 0 }}>{r.email}</div></td><td>{r.company}<div className="hint" style={{ margin: 0 }}>{r.country}</div></td><td style={{ textTransform: 'capitalize' }}>{r.plan}</td><td><StageBadge id={r.status} label={CSTATUS[r.status]} /></td><td>{r.newsletter ? 'Yes' : 'No'}</td><td style={{ whiteSpace: 'nowrap' }}>{fmtDate(r.created_at)}</td></tr>)}</tbody>
        </table></div>
      )}
    </div>
  );
}

export function CustomerPage() {
  const { id = '' } = useParams();
  const { me } = useAdmin();
  const navigate = useNavigate();
  const [d, setD] = useState<{ item: CustomerFull; requests: RequestRow[]; activity: Activity[]; demos: RecordItem[]; statuses: { id: string; label: string }[] } | null>(null);
  const [msg, setMsg] = useState<Msg>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const load = useCallback(() => admin.customer(id).then(setD).catch(err(setMsg)), [id]);
  useEffect(() => { void load(); }, [load]);
  if (!d) return msg ? <Notice kind="error">{msg.text}</Notice> : <p>Loading…</p>;
  const c = d.item;
  const w = canChange(me?.role, 'customers');
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = new FormData(e.currentTarget); setFields({});
    try { const r = await admin.updateCustomer(id, { status: String(f.get('status')), plan: String(f.get('plan')), note: String(f.get('note') ?? ''), notify: f.get('notify') === 'on' }); setMsg({ kind: 'success', text: <>Saved.<EmailResult result={r.email} /></> }); await load(); }
    catch (er) { err(setMsg)(er); setFields((er as { fields?: Record<string, string> }).fields ?? {}); }
  }
  return (
    <div className="wf-stack">
      <Link to="/admin/customers">← Customers</Link>
      <PageHead title={`${c.first_name} ${c.last_name}`} sub={`${c.email} · ${c.company}, ${c.country} · joined ${fmtDate(c.created_at)}`}><StageBadge id={c.status} label={CSTATUS[c.status]} /></PageHead>
      <div aria-live="polite">{msg && <Notice kind={msg.kind}>{msg.text}</Notice>}</div>
      <div className="wf-two wf-two-wide">
        <div className="wf-stack">
          {w && (
            <form className="card wf-stack-s" onSubmit={save}>
              <h2 style={{ fontSize: 18 }}>Plan and status</h2>
              <div className="adm-grid2">
                <div><label className="lbl" htmlFor="pl">Plan</label><select id="pl" name="plan" defaultValue={c.plan}>{['community', 'starter', 'business', 'enterprise'].map((p) => <option key={p} value={p}>{p[0].toUpperCase() + p.slice(1)}</option>)}</select></div>
                <div><label className="lbl" htmlFor="cs">Status</label><select id="cs" name="status" defaultValue={c.status}>{d.statuses.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></div>
              </div>
              <div><label className="lbl" htmlFor="nn">Reason or message (required to suspend or close; included in the email)</label><textarea id="nn" name="note" rows={2} />{fields.note && <div className="hint" style={{ color: '#B42318' }}>{fields.note}</div>}</div>
              <label className="wf-check"><input type="checkbox" name="notify" defaultChecked /> Email the customer when the status changes</label>
              <p className="hint" style={{ margin: 0 }}>Suspended and closed accounts can’t sign in.</p>
              <div><button className="btn primary" type="submit">Save</button></div>
            </form>
          )}
          <div className="card">
            <h2 style={{ fontSize: 18, marginBottom: 8 }}>Requests</h2>
            {d.requests.length === 0 ? <p className="hint">None.</p> : <ul className="wf-list">{d.requests.map((r) => <li key={r.id}><span><b>{REQ_LABEL[r.kind] ?? r.kind}</b> <StageBadge id={r.status} /></span><small>{fmtDate(r.created_at)}{r.reason ? ` · ${r.reason}` : ''}</small></li>)}</ul>}
            <Link to="/admin/requests">All requests →</Link>
          </div>
          <div className="card">
            <h2 style={{ fontSize: 18, marginBottom: 8 }}>Demo requests</h2>
            {d.demos.length === 0 ? <p className="hint">None.</p> : <ul className="wf-list">{d.demos.map((x) => <li key={x.id}><Link to={`/admin/records/${x.id}`}>{fmtDate(x.createdAt)}</Link><small><StageBadge id={x.stage} label={x.stageLabel} /></small></li>)}</ul>}
          </div>
        </div>
        <div className="wf-stack">
          <div className="card"><h2 style={{ fontSize: 18, marginBottom: 10 }}>History</h2><Timeline items={d.activity} /></div>
          {me?.role === 'admin' && <button type="button" className="btn small danger" onClick={async () => { if (await confirmDialog({ title: 'Delete this account?', message: 'The account and its personal data are deleted for good. This can’t be undone.', confirm: 'Delete account', danger: true })) { await admin.deleteCustomer(id); navigate('/admin/customers'); } }}>Delete account</button>}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Emails ---------------- */
export function Emails() {
  const { me } = useAdmin();
  const [d, setD] = useState<{ items: EmailRow[]; configured: boolean; from: string; notify: string; host: string } | null>(null);
  const [msg, setMsg] = useState<Msg>(null);
  const load = useCallback(() => admin.emails().then(setD).catch(err(setMsg)), []);
  useEffect(() => { void load(); }, [load]);
  return (
    <div className="wf-stack">
      <PageHead title="Emails" sub="Every email the website sends, and whether it went out.">
        {me?.role === 'admin' && <button type="button" className="btn small" onClick={async () => { try { const r = await admin.testEmail(); setMsg({ kind: r.ok ? 'success' : 'error', text: r.ok ? `A test email was sent to ${me.email}.` : `The test email was ${r.result}. Check the settings below.` }); await load(); } catch (e) { err(setMsg)(e); } }}>Send me a test email</button>}
        <Link className="btn small" to="/admin/content/emails.templates">Edit the email texts</Link>
      </PageHead>
      <div aria-live="polite">{msg && <Notice kind={msg.kind}>{msg.text}</Notice>}</div>
      {d && (
        <div className="card wf-stack-s">
          <h2 style={{ fontSize: 18 }}>Settings</h2>
          {d.configured ? <p style={{ margin: 0 }}>✓ Sending through <b>{d.host}</b> as <b>{d.from}</b>. Team alerts go to <b>{d.notify || 'nobody (NOTIFY_EMAIL not set)'}</b>.</p>
            : <p style={{ margin: 0 }}>Email isn’t set up yet. Add these environment variables in Hostinger (hPanel → your Node.js app → Environment variables), then redeploy: <code>SMTP_HOST</code>, <code>SMTP_PORT</code>, <code>SMTP_USER</code>, <code>SMTP_PASS</code>, <code>MAIL_FROM</code>, <code>NOTIFY_EMAIL</code>, <code>SITE_URL</code>. The README has the exact values for Zoho Mail.</p>}
        </div>
      )}
      {!d ? <p>Loading…</p> : d.items.length === 0 ? <div className="card hint">No emails yet.</div> : (
        <div className="card scroll-x" style={{ padding: 0 }}><table className="wf-table">
          <thead><tr><th>When</th><th>To</th><th>Subject</th><th>Result</th></tr></thead>
          <tbody>{d.items.map((e) => <tr key={e.id}><td style={{ whiteSpace: 'nowrap' }}>{fmtDate(e.created_at)}</td><td>{e.to_email}</td><td>{e.subject}</td><td><StageBadge id={e.status === 'sent' ? 'approved' : e.status === 'failed' ? 'rejected' : 'closed'} label={e.status} />{e.error && <div className="hint" style={{ margin: 0 }}>{e.error}</div>}</td></tr>)}</tbody>
        </table></div>
      )}
    </div>
  );
}

/* ---------------- Settings and approvals ---------------- */
export function Settings() {
  const { me } = useAdmin();
  const [on, setOn] = useState<boolean | null>(null);
  const [drafts, setDrafts] = useState<{ key: string; saved_by: string; saved_at: string }[]>([]);
  const [msg, setMsg] = useState<Msg>(null);
  const load = useCallback(() => Promise.all([admin.settings().then((s) => setOn(s.contentApproval)), admin.drafts().then((d) => setDrafts(d.items))]).catch(err(setMsg)), []);
  useEffect(() => { void load(); }, [load]);
  return (
    <div className="wf-stack">
      <PageHead title="Settings" />
      <div aria-live="polite">{msg && <Notice kind={msg.kind}>{msg.text}</Notice>}</div>
      <div className="card wf-stack-s">
        <h2 style={{ fontSize: 18 }}>Content approval</h2>
        <label className="wf-check"><input type="checkbox" checked={!!on} disabled={me?.role !== 'admin' || on === null} onChange={async (e) => { try { await admin.saveSettings({ contentApproval: e.target.checked }); setOn(e.target.checked); setMsg({ kind: 'success', text: 'Saved.' }); } catch (er) { err(setMsg)(er); } }} /> Editors’ changes need an admin’s approval before they go live</label>
        <p className="hint" style={{ margin: 0 }}>Admins’ own changes always go live straight away.</p>
      </div>
      <div className="card">
        <h2 style={{ fontSize: 18, marginBottom: 8 }}>Changes waiting for approval ({drafts.length})</h2>
        {drafts.length === 0 ? <p className="hint">None.</p> : <ul className="wf-list">{drafts.map((x) => <li key={x.key}><Link to={`/admin/content/${x.key}`}>{SECTION_BY_KEY[x.key]?.label ?? x.key}</Link><small>by {x.saved_by} · {fmtDate(x.saved_at)}</small></li>)}</ul>}
      </div>
    </div>
  );
}

export function ActivityLog() {
  const [items, setItems] = useState<Activity[] | null>(null);
  const [msg, setMsg] = useState<Msg>(null);
  useEffect(() => { admin.activity().then((r) => setItems(r.items)).catch(err(setMsg)); }, []);
  return (
    <div className="wf-stack">
      <PageHead title="Activity" sub="The last 200 changes across the admin." />
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      {!items ? <p>Loading…</p> : <div className="card"><Timeline items={items.map((a) => ({ ...a, note: `${a.entity}${a.note ? ' · ' + a.note : ''}` }))} /></div>}
    </div>
  );
}
