import { useCallback, useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { api, passwordProblem } from '../../auth/api';
import type { Plan } from '../../auth/api';
import { I, Icon } from '../../ds/ui';
import { Field } from '../../ds/Form';
import { confirmDialog } from '../../ui/dialog';

const PLAN_NAMES: Record<Plan, string> = { community: 'Community', starter: 'Starter', business: 'Business', enterprise: 'Enterprise' };
const STATUS: Record<string, string> = { free: 'Free', trial: 'Free trial', paid: 'Active', enterprise_pending: 'Enterprise set-up in progress', enterprise: 'Enterprise', suspended: 'Suspended', closed: 'Closed' };
const TABS = [['overview', 'Overview'], ['profile', 'Profile'], ['security', 'Password'], ['requests', 'My requests'], ['plan', 'Plan'], ['privacy', 'Privacy and data']] as const;
type Msg = { kind: 'ok' | 'err'; text: string } | null;

function Note({ m }: { m: Msg }) {
  if (!m) return null;
  return <p role={m.kind === 'ok' ? 'status' : 'alert'} className={m.kind === 'ok' ? 'ac-ok' : 'fm-err'}>{m.text}</p>;
}
function Card({ title, children }: { title: string; children: ReactNode }) {
  return <div className="ac-card"><h2>{title}</h2>{children}</div>;
}

export default function AccountPage() {
  const { user, logout, refresh } = useAuth();
  const navigate = useNavigate();
  const welcome = (useLocation().state as { welcome?: boolean } | null)?.welcome;
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') ?? 'overview';
  const [msg, setMsg] = useState<Msg>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [reqs, setReqs] = useState<Awaited<ReturnType<typeof api.myRequests>>['items'] | null>(null);
  const loadReqs = useCallback(() => api.myRequests().then((r) => setReqs(r.items)).catch(() => setReqs([])), []);
  useEffect(() => { setMsg(null); setFields({}); if (tab === 'requests' || tab === 'plan' || tab === 'privacy' || tab === 'overview') void loadReqs(); }, [tab, loadReqs]);
  if (!user) return null;
  const go = (t: string) => setParams(t === 'overview' ? {} : { tab: t });
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setMsg(null); setFields({});
    try { await fn(); setMsg({ kind: 'ok', text: ok }); await refresh(); await loadReqs(); return true; }
    catch (e) { setMsg({ kind: 'err', text: (e as Error).message }); setFields((e as { fields?: Record<string, string> }).fields ?? {}); return false; }
  };
  const pendingPlan = reqs?.find((r) => r.kind === 'plan' && r.status === 'new');
  const pendingDelete = reqs?.find((r) => r.kind === 'deletion' && r.status === 'new');

  return (
    <>
      <section className="hz-hero" style={{ paddingBottom: 0 }}>
        <div className="ds-container ac-hero">
          <div>
            <p className="ab-kicker"><Icon d="M9 11a3 3 0 100-6 3 3 0 000 6zM3 20v-1a6 6 0 0112 0v1" size={18} />{welcome ? 'Your account is ready' : 'My account'}</p>
            <h1 className="pf-h1" style={{ fontSize: 'clamp(2rem, 3.6vw, 3rem)' }}>{welcome ? `Welcome aboard, ${user.firstName}.` : `Hello, ${user.firstName}.`}</h1>
            <p className="cu-lead">{user.company} · {PLAN_NAMES[user.plan]} plan · <span className="ac-pill">{STATUS[user.status] ?? user.status}</span></p>
          </div>
          <button type="button" className="ds-btn ds-btn-outline" onClick={async () => { await logout(); navigate('/'); }}>Sign out</button>
        </div>
        <div className="ds-container"><nav className="ac-tabs" aria-label="Account sections">{TABS.map(([id, label]) => <button key={id} type="button" aria-current={tab === id ? 'page' : undefined} onClick={() => go(id)}>{label}</button>)}</nav></div>
      </section>
      <section className="ds-soft" style={{ paddingBlock: 'clamp(28px, 4vw, 48px) var(--ds-section-y)' }}>
        <div className="ds-container ac-body">
          {!user.emailVerified && (
            <div className="ac-card" role="status" style={{ marginBottom: 20 }}>
              <h2>Please confirm your email address</h2>
              <p>We sent a link to <b>{user.email}</b>. Until you confirm it, demo requests and other messages sent with this address won’t show in My account, and you can’t turn on product updates.</p>
              <button type="button" className="ds-btn ds-btn-line" onClick={() => void run(async () => { const r = await api.resendVerification(); if (r.alreadyVerified) await refresh(); }, 'We’ve sent a new link. Please check your inbox (and spam folder).')}>Send the link again</button>
            </div>
          )}
          <Note m={msg} />
          {tab === 'overview' && (
            <div className="ac-grid">
              <Card title="Your plan">
                <b className="ac-big">{PLAN_NAMES[user.plan]}</b>
                <p>{user.status === 'enterprise_pending' ? 'Our sales team will contact you to set up Enterprise.' : user.plan === 'community' ? 'Free for learners and individual builders.' : user.status === 'trial' ? 'Your free trial is active.' : 'Thank you for being a customer.'}</p>
                {pendingPlan ? <p className="ac-wait">Change to {pendingPlan.title.replace('Plan change to ', '')} is waiting for review.</p> : <button type="button" className="ds-btn ds-btn-line" onClick={() => go('plan')}>Change plan</button>}
              </Card>
              <Card title="Next steps">
                <ul className="ac-steps">
                  {[['Build your first agent', '/resources/docs/studio'], ['Take the beginner course', '/resources/training'], ['Book a guided demo', '/contact']].map(([t, to]) => <li key={t}><Link to={to}>{t}<Icon d={I.arrow} size={16} stroke={2.4} /></Link></li>)}
                </ul>
              </Card>
              <Card title="Recent requests">
                {!reqs ? <p>Loading…</p> : reqs.length === 0 ? <p>Nothing yet.</p> : <ul className="ac-list">{reqs.slice(0, 3).map((r) => <li key={r.id}><b>{r.title}</b><span>{r.status}</span></li>)}</ul>}
                <button type="button" className="ds-link" style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', font: 'inherit' }} onClick={() => go('requests')}>See all →</button>
              </Card>
            </div>
          )}
          {tab === 'profile' && (
            <Card title="Profile">
              <form className="fm" onSubmit={(e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const f = new FormData(e.currentTarget); void run(() => api.profile({ firstName: String(f.get('fn')), lastName: String(f.get('ln')), company: String(f.get('co')), country: String(f.get('ct')) }), 'Profile saved.'); }}>
                <Field id="fn" label="First name" required><input id="fn" name="fn" defaultValue={user.firstName} required autoComplete="given-name" /></Field>
                <Field id="ln" label="Last name" required><input id="ln" name="ln" defaultValue={user.lastName} required autoComplete="family-name" /></Field>
                <Field id="co" label="Company" required><input id="co" name="co" defaultValue={user.company} required autoComplete="organization" /></Field>
                <Field id="ct" label="Country" required><input id="ct" name="ct" defaultValue={user.country} required autoComplete="country-name" /></Field>
                <Field id="em" label="Email" wide><input id="em" value={user.email} readOnly /></Field>
                <p className="ac-hint" style={{ gridColumn: '1 / -1' }}>To change your email address, write to support@oneofficeautomation.com.</p>
                <button className="ds-btn ds-btn-grad" type="submit">Save profile</button>
              </form>
            </Card>
          )}
          {tab === 'security' && (
            <Card title="Change password">
              <form className="fm" onSubmit={async (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const form = e.currentTarget; const f = new FormData(form); const next = String(f.get('next')); const p = passwordProblem(next); if (p) { setFields({ next: p }); return; } if (await run(() => api.password(String(f.get('current')), next), 'Password changed.')) form.reset(); }}>
                <Field id="cur" label="Current password" required wide><input id="cur" name="current" type="password" autoComplete="current-password" required />{fields.current && <span className="fm-err">{fields.current}</span>}</Field>
                <Field id="nx" label="New password" required wide><input id="nx" name="next" type="password" autoComplete="new-password" required />{fields.next ? <span className="fm-err">{fields.next}</span> : <span className="ac-hint">At least 10 characters, with a letter and a number.</span>}</Field>
                <button className="ds-btn ds-btn-grad" type="submit">Change password</button>
              </form>
              <p className="ac-hint">Forgot it? <Link className="ds-link" to="/forgot">Reset it by email</Link>.</p>
            </Card>
          )}
          {tab === 'requests' && (
            <Card title="My requests">
              <p>Demo requests, plan changes and other requests you’ve sent, with where they are now.</p>
              {!reqs ? <p>Loading…</p> : reqs.length === 0 ? <p>Nothing yet. <Link className="ds-link" to="/contact">Book a demo</Link></p> : (
                <ul className="ac-list">{reqs.map((r) => <li key={r.id}><b>{r.title}</b><span className="ac-pill">{r.status}</span><small>{new Date(r.createdAt).toLocaleDateString()}{r.detail ? ` · ${r.detail}` : ''}</small></li>)}</ul>
              )}
            </Card>
          )}
          {tab === 'plan' && (
            <Card title="Change your plan">
              <p>You’re on <b>{PLAN_NAMES[user.plan]}</b>. Choose a new plan and our team will confirm the change by email.</p>
              {pendingPlan ? <p className="ac-wait">{pendingPlan.title} is waiting for review.</p> : (
                <form className="fm" onSubmit={(e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const f = new FormData(e.currentTarget); void run(() => api.planRequest(String(f.get('plan')) as Plan, String(f.get('msg') ?? '')), 'Request sent. We’ll email you once it’s reviewed.'); }}>
                  <Field id="pl" label="New plan" required wide><select id="pl" name="plan">{(Object.keys(PLAN_NAMES) as Plan[]).filter((p) => p !== user.plan).map((p) => <option key={p} value={p}>{PLAN_NAMES[p]}</option>)}</select></Field>
                  <Field id="msg" label="Anything we should know? (optional)" wide><textarea id="msg" name="msg" rows={3} /></Field>
                  <button className="ds-btn ds-btn-grad" type="submit">Send request</button>
                </form>
              )}
              <p className="ac-hint"><Link className="ds-link" to="/pricing">Compare plans</Link></p>
            </Card>
          )}
          {tab === 'privacy' && (
            <div className="ac-grid">
              <Card title="Product updates">
                <label className="ac-switch"><input type="checkbox" checked={user.newsletter} onChange={(e) => void run(() => api.newsletter(e.target.checked), e.target.checked ? 'Subscribed to product updates.' : 'Unsubscribed from product updates.')} /> Email me new features, guides and webinars (about once a month)</label>
              </Card>
              <Card title="Download your data">
                <p>Get a copy of your account details and requests as a file.</p>
                <a className="ds-btn ds-btn-line" href="/api/auth/export" download>Download my data</a>
              </Card>
              <Card title="Delete your account">
                {pendingDelete ? <p className="ac-wait">Your deletion request is waiting for review. We’ll email you when it’s done.</p> : (
                  <>
                    <p>We’ll delete your account and personal data after checking there’s nothing still open. You’ll get an email when it’s done.</p>
                    <button type="button" className="ds-btn ds-btn-line ac-danger" onClick={async () => { if (await confirmDialog({ title: 'Delete your account?', message: 'We’ll delete your account and personal data. Our team confirms the request by email first.', confirm: 'Ask to delete my account', danger: true })) void run(() => api.deleteRequest(''), 'Deletion requested. We’ll email you once it’s done.'); }}>Request account deletion</button>
                  </>
                )}
              </Card>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
