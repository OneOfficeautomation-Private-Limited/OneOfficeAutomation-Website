import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { admin } from './api';
import type { Dashboard as D } from './api';
import { useAdmin } from './AdminContext';
import { HowTo, Notice, fmtDate } from './ui';
import { KIND_LABEL, StageBadge, canSee, actionLabel } from './wf';

const STATUS_LABEL: Record<string, string> = { free: 'Free', trial: 'Trial', paid: 'Paid', enterprise_pending: 'Enterprise (pending)', enterprise: 'Enterprise', suspended: 'Suspended', closed: 'Closed' };

export default function Dashboard() {
  const { me } = useAdmin();
  const [d, setD] = useState<D | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { admin.dashboard().then(setD).catch((e: Error) => setError(e.message)); }, []);
  if (error) return <Notice kind="error">{error}</Notice>;
  if (!d) return <p>Loading…</p>;
  const role = me?.role;
  const weeks = Array.from(new Set(d.weekly.map((w) => w.wk))).sort().slice(-12);
  const maxWeek = Math.max(1, ...weeks.map((wk) => d.weekly.filter((w) => w.wk === wk && w.kind !== 'newsletter').reduce((a, w) => a + Number(w.n), 0)));
  const approvals = [
    { n: d.approvals.partners, label: 'Partner applications to review', to: '/admin/pipeline/partner?stage=submitted', area: 'partner' },
    { n: d.approvals.deals, label: 'Deal registrations to approve', to: '/admin/deals', area: 'deals' },
    { n: d.approvals.requests, label: 'Requests to decide', to: '/admin/requests', area: 'requests' },
    { n: d.approvals.drafts, label: 'Content changes to approve', to: '/admin/settings', area: 'content' },
  ].filter((a) => canSee(role, a.area));

  return (
    <div className="wf-stack">
      <div className="wf-head"><div><h1 style={{ fontSize: 28 }}>Dashboard</h1><p className="hint" style={{ margin: '4px 0 0', fontSize: 15 }}>The last 30 days compared with the 30 days before.</p></div></div>
      <HowTo />
      {!d.email.configured && <Notice kind="error">Emails aren’t being sent yet: the SMTP settings are missing. Everything is recorded, but nobody is notified. See <Link to="/admin/emails">Emails</Link>.</Notice>}
      {d.email.failed30 > 0 && <Notice kind="error">{d.email.failed30} email{d.email.failed30 === 1 ? '' : 's'} failed in the last 30 days. See <Link to="/admin/emails">Emails</Link>.</Notice>}

      <div className="wf-kpis">
        {d.kpis.map((k) => {
          const delta = k.now !== undefined && k.prev !== undefined ? k.now - k.prev : null;
          return (
            <div key={k.id} className="card wf-kpi">
              <small>{k.label}</small>
              <b>{k.now ?? (k.total === null || k.total === undefined ? '–' : k.total)}{k.suffix && k.total !== null ? k.suffix : ''}</b>
              {delta !== null && <span className={delta > 0 ? 'up' : delta < 0 ? 'down' : ''}>{delta > 0 ? '▲' : delta < 0 ? '▼' : '='} {Math.abs(delta)} vs previous 30 days</span>}
              {k.id === 'conversion' && <span>of finished demo requests</span>}
            </div>
          );
        })}
      </div>

      {approvals.some((a) => a.n > 0) && (
        <div className="card wf-approvals">
          <h2 style={{ fontSize: 18 }}>Waiting for a decision</h2>
          <div>{approvals.filter((a) => a.n > 0).map((a) => <Link key={a.to} to={a.to}><b>{a.n}</b>{a.label}</Link>)}</div>
        </div>
      )}

      <div className="wf-pipes">
        {Object.entries(d.pipelines).filter(([k]) => canSee(role, k)).map(([kind, stages]) => {
          const total = stages.reduce((a, s) => a + s.n, 0);
          return (
            <div key={kind} className="card wf-pipe">
              <div className="wf-pipe-h"><h2 style={{ fontSize: 17 }}>{KIND_LABEL[kind]}</h2><Link to={`/admin/pipeline/${kind}`}>Open ({total})</Link></div>
              {stages.map((s) => (
                <Link key={s.id} to={`/admin/pipeline/${kind}?stage=${s.id}`} className="wf-bar">
                  <span>{s.label}</span><i><b style={{ width: `${total ? (s.n / total) * 100 : 0}%` }} data-done={s.done ? '1' : '0'} /></i><em>{s.n}</em>
                </Link>
              ))}
            </div>
          );
        })}
      </div>

      {canSee(role, 'partners') && (
        <div className="card">
          <div className="wf-pipe-h"><h2 style={{ fontSize: 18 }}>Partners by type</h2><Link to="/admin/partners">All partners</Link></div>
          <div className="scroll-x"><table className="wf-table">
            <thead><tr><th>Type</th><th>Applied</th><th>In review</th><th>Onboarding</th><th>Active</th><th>Registered</th><th>Certified</th><th>Strategic</th><th>Rejected</th><th>Inactive</th></tr></thead>
            <tbody>{d.partnerBoard.map((p) => (
              <tr key={p.type}><td><b>{p.type}</b></td><td>{p.submitted}</td><td>{p.review}</td><td>{p.onboarding}</td><td><b>{p.active}</b></td><td>{p.levels.Registered ?? 0}</td><td>{p.levels.Certified ?? 0}</td><td>{p.levels.Strategic ?? 0}</td><td>{p.rejected}</td><td>{p.inactive}</td></tr>
            ))}</tbody>
          </table></div>
          <p className="hint">Deals: {['submitted', 'approved', 'won', 'lost', 'rejected'].map((s) => `${d.deals[s] ?? 0} ${s}`).join(' · ')}</p>
        </div>
      )}

      <div className="wf-two">
        {canSee(role, 'customers') && (
          <div className="card">
            <div className="wf-pipe-h"><h2 style={{ fontSize: 18 }}>Customer accounts ({d.customers.total})</h2><Link to="/admin/customers">Open</Link></div>
            <div className="wf-chips">{Object.entries(d.customers.byStatus).filter(([, n]) => n > 0).map(([s, n]) => <span key={s}><StageBadge id={s} label={STATUS_LABEL[s]} /> {n}</span>)}</div>
            <div className="wf-chips" style={{ marginTop: 10 }}>{Object.entries(d.customers.byPlan).map(([p, n]) => <span key={p} style={{ textTransform: 'capitalize' }}>{p}: <b>{n}</b></span>)}</div>
          </div>
        )}
        <div className="card">
          <h2 style={{ fontSize: 18 }}>Submissions per week</h2>
          <div className="wf-weeks" aria-label="Demo, partner and job submissions per week">
            {weeks.length === 0 && <p className="hint">Nothing in the last 12 weeks.</p>}
            {weeks.map((wk) => {
              const by = (k: string) => Number(d.weekly.find((w) => w.wk === wk && w.kind === k)?.n ?? 0);
              return <div key={wk} title={`Week ${String(wk).slice(4)}: ${by('demo')} demo, ${by('partner')} partner, ${by('career')} job`}>
                <i style={{ height: `${(by('career') / maxWeek) * 100}%` }} data-k="career" /><i style={{ height: `${(by('partner') / maxWeek) * 100}%` }} data-k="partner" /><i style={{ height: `${(by('demo') / maxWeek) * 100}%` }} data-k="demo" />
              </div>;
            })}
          </div>
          <p className="hint"><span className="wf-key" data-k="demo" /> Demo <span className="wf-key" data-k="partner" /> Partner <span className="wf-key" data-k="career" /> Jobs</p>
        </div>
      </div>

      {(d.reviewDue ?? 0) > 0 && (
        <div className="card" role="status" style={{ borderColor: '#E9C46A', background: '#FFF9EA', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <b>{d.reviewDue} Resources {d.reviewDue === 1 ? 'item is' : 'items are'} due for review.</b>
          <span className="hint" style={{ margin: 0 }}>Check they’re still correct, then set a new review date.</span>
          <Link className="btn small" to="/admin/library?status=due">Show them</Link>
        </div>
      )}
      <div className="wf-two">
        <div className="card">
          <h2 style={{ fontSize: 18 }}>Needs attention</h2>
          {d.attention.filter((a) => canSee(role, a.kind)).length === 0 ? <p className="hint">All caught up.</p> : (
            <ul className="wf-list">{d.attention.filter((a) => canSee(role, a.kind)).map((a, i) => <li key={a.id + i}><Link to={`/admin/records/${a.id}`}>{a.title}</Link><small>{KIND_LABEL[a.kind]} · {a.why}</small></li>)}</ul>
          )}
        </div>
        <div className="card">
          <div className="wf-pipe-h"><h2 style={{ fontSize: 18 }}>Recent activity</h2>{role === 'admin' && <Link to="/admin/activity">All activity</Link>}</div>
          <ul className="wf-list">{d.recent.map((a, i) => <li key={i}><span><b>{a.actor}</b> {actionLabel(a.action).toLowerCase()}{a.to_value ? `: ${a.to_value.replace(/_/g, ' ')}` : ''}</span><small>{a.entity} · {fmtDate(a.created_at)}</small></li>)}</ul>
        </div>
      </div>
    </div>
  );
}
