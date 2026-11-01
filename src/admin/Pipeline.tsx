import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { admin } from './api';
import type { Activity, RecordItem, Stage } from './api';
import { useAdmin } from './AdminContext';
import { Notice, fmtDate } from './ui';
import { EmailResult, FIELD_LABEL, KIND_LABEL, KIND_ONE, PageHead, StageBadge, Timeline, canChange } from './wf';
import { confirmDialog } from '../ui/dialog';

export function Pipeline() {
  const { kind = 'demo' } = useParams();
  const [params, setParams] = useSearchParams();
  const stage = params.get('stage') ?? '';
  const [q, setQ] = useState('');
  const [all, setAll] = useState<RecordItem[] | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [error, setError] = useState('');
  useEffect(() => { setAll(null); admin.records(kind).then((r) => { setAll(r.items); setStages(r.stages); }).catch((e: Error) => setError(e.message)); }, [kind]);
  const t = q.trim().toLowerCase();
  const items = (all ?? []).filter((i) => (!stage || i.stage === stage) && (!t || `${i.name} ${i.email} ${i.company} ${i.owner}`.toLowerCase().includes(t)));
  return (
    <div className="wf-stack">
      <PageHead title={KIND_LABEL[kind] ?? kind} sub="Click a row to open it, change its stage, add notes and see its history.">
        <a className="btn small" href={`/api/admin/records.csv?kind=${kind}&stage=${stage}`}>Download CSV</a>
      </PageHead>
      {error && <Notice kind="error">{error}</Notice>}
      <div className="wf-chips wf-tabs" role="group" aria-label="Stage">
        <button type="button" className={!stage ? 'on' : ''} onClick={() => setParams({})}>All <b>{all?.length ?? 0}</b></button>
        {stages.map((s) => <button key={s.id} type="button" className={stage === s.id ? 'on' : ''} onClick={() => setParams({ stage: s.id })}>{s.label} <b>{(all ?? []).filter((i) => i.stage === s.id).length}</b></button>)}
      </div>
      <input type="text" placeholder="Search name, email, company or owner" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" style={{ maxWidth: 420 }} />
      {all === null ? <p>Loading…</p> : items.length === 0 ? <div className="card hint">Nothing here.</div> : (
        <div className="card scroll-x" style={{ padding: 0 }}>
          <table className="wf-table wf-click">
            <thead><tr><th>Name</th><th>{kind === 'career' ? 'Role' : kind === 'newsletter' ? '' : 'Company'}</th><th>Stage</th><th>Owner</th><th>Follow-up</th><th>Received</th></tr></thead>
            <tbody>{items.map((i) => (
              <tr key={i.id}>
                <td><Link to={`/admin/records/${i.id}`}><b>{i.name || i.email}</b></Link><div className="hint" style={{ margin: 0 }}>{i.email}</div></td>
                <td>{i.company}{i.partnerType && <div className="hint" style={{ margin: 0 }}>{i.partnerType}</div>}</td>
                <td><StageBadge id={i.stage} label={i.stageLabel} /></td>
                <td>{i.owner || '–'}</td><td>{i.followUp || '–'}</td><td style={{ whiteSpace: 'nowrap' }}>{fmtDate(i.createdAt)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function RecordPage() {
  const { id = '' } = useParams();
  const { me } = useAdmin();
  const navigate = useNavigate();
  const [data, setData] = useState<{ item: RecordItem; stages: Stage[]; activity: Activity[]; org: { id: string; company: string; status: string; level: string } | null; statusLink: string | null; partnerTypes?: string[] } | null>(null);
  const [msg, setMsg] = useState<{ kind: 'error' | 'success'; text: React.ReactNode } | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [target, setTarget] = useState('');
  const load = useCallback(() => admin.record(id).then((d) => { setData(d); setTarget(''); }).catch((e: Error) => setMsg({ kind: 'error', text: e.message })), [id]);
  useEffect(() => { void load(); }, [load]);
  if (!data) return msg ? <Notice kind="error">{msg.text}</Notice> : <p>Loading…</p>;
  const { item, stages } = data;
  const writable = canChange(me?.role, item.kind);
  const cur = stages.find((s) => s.id === item.stage);
  const locked = item.kind === 'partner' && item.stage === 'approved';
  const needsReason = target === 'rejected' || target === 'lost';

  async function move(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setFields({}); setMsg(null);
    try {
      const r = await admin.setStage(id, { stage: target, note: String(f.get('note') ?? ''), reason: String(f.get('reason') ?? ''), partnerType: String(f.get('partnerType') ?? '') || undefined, notify: f.get('notify') === 'on' });
      setMsg({ kind: 'success', text: <>Moved to {stages.find((s) => s.id === target)?.label}.<EmailResult result={r.email} />{target === 'approved' && item.kind === 'partner' ? ' A partner account was created and the invitation was sent.' : ''}</> });
      await load();
    } catch (err) { setMsg({ kind: 'error', text: (err as Error).message }); setFields((err as { fields?: Record<string, string> }).fields ?? {}); }
  }
  async function note(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = e.currentTarget; const f = new FormData(form);
    try { await admin.addNote(id, String(f.get('n') ?? '')); form.reset(); await load(); } catch (err) { setMsg({ kind: 'error', text: (err as Error).message }); }
  }
  async function assign(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = new FormData(e.currentTarget);
    try { await admin.assign(id, String(f.get('owner') ?? ''), String(f.get('follow') ?? '')); setMsg({ kind: 'success', text: 'Saved.' }); await load(); } catch (err) { setMsg({ kind: 'error', text: (err as Error).message }); }
  }
  const emailWillSend = (target === 'rejected' && (item.kind === 'partner' || item.kind === 'career')) || (target === 'approved' && item.kind === 'partner');

  return (
    <div className="wf-stack">
      <Link to={`/admin/pipeline/${item.kind}`}>← {KIND_LABEL[item.kind]}</Link>
      <PageHead title={item.name || item.email} sub={`${KIND_ONE[item.kind]} · received ${fmtDate(item.createdAt)}`}><StageBadge id={item.stage} label={item.stageLabel} /></PageHead>
      <div aria-live="polite">{msg && <Notice kind={msg.kind}>{msg.text}</Notice>}</div>

      <ol className="wf-steps" aria-label="Stages">
        {stages.filter((s) => !s.done || s.id === item.stage).map((s) => <li key={s.id} data-on={s.id === item.stage ? '1' : '0'}>{s.label}</li>)}
      </ol>

      <div className="wf-two wf-two-wide">
        <div className="wf-stack">
          {writable && !locked && (
            <form className="card wf-stack-s" onSubmit={move}>
              <h2 style={{ fontSize: 18 }}>Move to another stage</h2>
              <div className="wf-chips wf-tabs">
                {stages.filter((s) => s.id !== item.stage).map((s) => <button key={s.id} type="button" className={target === s.id ? 'on' : ''} onClick={() => setTarget(s.id)}>{s.label}</button>)}
              </div>
              {target && (
                <>
                  {target === 'approved' && item.kind === 'partner' && (
                    <div><label className="lbl" htmlFor="pt">Partner type</label>
                      <select id="pt" name="partnerType" defaultValue={data.partnerTypes?.includes(item.partnerType ?? '') ? item.partnerType : ''} required>
                        <option value="" disabled>Choose…</option>{data.partnerTypes?.map((t) => <option key={t}>{t}</option>)}
                      </select>
                      {fields.partnerType && <div className="hint" style={{ color: '#B42318' }}>{fields.partnerType}</div>}
                    </div>
                  )}
                  {needsReason && (
                    <div><label className="lbl" htmlFor="rs">Reason{item.kind !== 'demo' ? ' (included in the email)' : ''}</label><textarea id="rs" name="reason" rows={3} required={item.kind !== 'demo'} />{fields.reason && <div className="hint" style={{ color: '#B42318' }}>{fields.reason}</div>}</div>
                  )}
                  <div><label className="lbl" htmlFor="nt">Internal note (optional)</label><textarea id="nt" name="note" rows={2} /></div>
                  {emailWillSend && target !== 'approved' && <label className="wf-check"><input type="checkbox" name="notify" defaultChecked /> Send the email to {item.email}</label>}
                  {target === 'approved' && item.kind === 'partner' && <p className="hint">Approving creates the partner account, sends {item.email} an invitation to the partner portal, and starts onboarding.</p>}
                  <div><button className="btn primary" type="submit">{target === 'approved' ? 'Approve' : target === 'rejected' ? 'Reject' : `Move to ${stages.find((s) => s.id === target)?.label}`}</button></div>
                </>
              )}
            </form>
          )}
          {locked && data.org && <div className="card">This application is approved. <Link to={`/admin/partners/${data.org.id}`}>Manage {data.org.company}</Link> ({data.org.status}, {data.org.level}).</div>}
          {cur?.done && item.reason && <div className="card"><b>Reason recorded:</b> {item.reason}</div>}

          <div className="card">
            <h2 style={{ fontSize: 18, marginBottom: 10 }}>Details</h2>
            <dl className="wf-dl">{Object.entries(item.payload).filter(([, v]) => v !== '' && v !== undefined).map(([k, v]) => <div key={k}><dt>{FIELD_LABEL[k] ?? k}</dt><dd>{String(v) === 'on' ? 'Yes' : /^https?:\/\//.test(String(v)) ? <a href={String(v)} target="_blank" rel="noopener noreferrer">{String(v)}</a> : String(v)}</dd></div>)}</dl>
            {data.statusLink && <p className="hint">Applicant’s status page: <a href={data.statusLink} target="_blank" rel="noopener noreferrer">{data.statusLink}</a></p>}
          </div>
        </div>
        <div className="wf-stack">
          {writable && (
            <form className="card wf-stack-s" onSubmit={assign}>
              <h2 style={{ fontSize: 18 }}>Owner and follow-up</h2>
              <div><label className="lbl" htmlFor="ow">Owner</label><input id="ow" name="owner" type="text" defaultValue={item.owner} placeholder={me?.name} /></div>
              <div><label className="lbl" htmlFor="fu">Follow up on</label><input id="fu" name="follow" type="date" defaultValue={item.followUp} /></div>
              <div><button className="btn small" type="submit">Save</button></div>
            </form>
          )}
          {writable && (
            <form className="card wf-stack-s" onSubmit={note}>
              <h2 style={{ fontSize: 18 }}>Add a note</h2>
              <textarea name="n" rows={3} aria-label="Note" required />
              <div><button className="btn small" type="submit">Add note</button></div>
            </form>
          )}
          <div className="card"><h2 style={{ fontSize: 18, marginBottom: 10 }}>History</h2><Timeline items={data.activity} /></div>
          {me?.role === 'admin' && <button type="button" className="btn small danger" onClick={async () => { if (await confirmDialog({ title: 'Delete this submission?', message: 'It is removed for good, with its notes and history.', confirm: 'Delete submission', danger: true })) { await admin.deleteRecord(id); navigate(`/admin/pipeline/${item.kind}`); } }}>Delete record</button>}
        </div>
      </div>
    </div>
  );
}
