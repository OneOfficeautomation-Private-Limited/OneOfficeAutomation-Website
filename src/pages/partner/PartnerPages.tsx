import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { partnerApi } from '../../auth/api';
import type { PartnerDeal, PartnerOrg } from '../../auth/api';
import { AuthShell, Field as AuthField, FormError, H, LINE, MUTE, NAVY, PURP, primaryBtn } from '../auth/ui';
import { Field } from '../../ds/Form';
import { usePartnersLogic } from '../../logic/PartnersLogic';
import { I, Icon } from '../../ds/ui';
import { confirmDialog } from '../../ui/dialog';

export function PartnerLoginPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = new FormData(e.currentTarget); setBusy(true); setError('');
    try { await partnerApi.login(String(f.get('email') ?? '').trim(), String(f.get('password') ?? '')); navigate('/partner'); } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }
  return (
    <AuthShell title={<>Partner<br /><span style={{ color: '#8FB8FF' }}>portal.</span></>} lead="For approved OneOfficeAutomation partners." points={['Your onboarding checklist and partner level', 'Register deals and track them', 'Manage your listing in the partner directory']}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h2 style={{ margin: 0, fontFamily: H, fontWeight: 600, fontSize: 26 }}>Sign in</h2>
        <FormError message={error} />
        <AuthField label="Email" name="email" type="email" autoComplete="email" required />
        <AuthField label="Password" name="password" type="password" autoComplete="current-password" required />
        <Link to="/partner/forgot" style={{ alignSelf: 'flex-end', color: PURP, fontWeight: 600, fontSize: 14, padding: '6px 0' }}>Forgot your password?</Link>
        <button type="submit" disabled={busy} style={primaryBtn(busy)}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <p style={{ margin: 0, textAlign: 'center', color: MUTE, paddingTop: 6, borderTop: `1px dashed ${LINE}` }}>Not a partner yet? <Link to="/partners#apply" style={{ color: NAVY, fontWeight: 600 }}>Apply to the program</Link></p>
      </form>
    </AuthShell>
  );
}

const TABS = [['overview', 'Overview'], ['deals', 'Deals'], ['team', 'Team'], ['profile', 'Directory profile']] as const;
type Msg = { kind: 'ok' | 'err'; text: string } | null;

export function PartnerPortalPage() {
  const navigate = useNavigate();
  const tiers = usePartnersLogic().tiers as { n: string; perks: string[] }[];
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') ?? 'overview';
  const [me, setMe] = useState<{ user: { id: string; name: string; email: string; role: string }; org: PartnerOrg } | null | undefined>(undefined);
  const [deals, setDeals] = useState<PartnerDeal[] | null>(null);
  const [team, setTeam] = useState<Awaited<ReturnType<typeof partnerApi.team>>['items'] | null>(null);
  const [msg, setMsg] = useState<Msg>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState(false);
  const load = useCallback(async () => {
    try { setMe(await partnerApi.me()); } catch { setMe(null); return; }
    partnerApi.deals().then((r) => setDeals(r.items)).catch(() => setDeals([]));
    partnerApi.team().then((r) => setTeam(r.items)).catch(() => setTeam([]));
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setMsg(null); setFields({}); }, [tab]);
  if (me === undefined) return <section className="ds-soft ds-section"><div className="ds-container">Loading…</div></section>;
  if (me === null) { navigate('/partner/login', { replace: true }); return null; }
  const { org, user } = me;
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setMsg(null); setFields({});
    try { await fn(); setMsg({ kind: 'ok', text: ok }); await load(); return true; }
    catch (e) { setMsg({ kind: 'err', text: (e as Error).message }); setFields((e as { fields?: Record<string, string> }).fields ?? {}); return false; }
  };
  const done = org.checklist.filter((c) => c.done).length;
  const perks = tiers.find((t) => t.n === org.level)?.perks ?? [];
  const count = (s: string) => (deals ?? []).filter((d) => d.status === s).length;

  return (
    <>
      <section className="hz-hero" style={{ paddingBottom: 0 }}>
        <div className="ds-container ac-hero">
          <div>
            <p className="ab-kicker"><Icon d="M14 12a5 5 0 11-10 0 5 5 0 0110 0zM20 12a5 5 0 11-10 0 5 5 0 0110 0z" size={18} />Partner portal</p>
            <h1 className="pf-h1" style={{ fontSize: 'clamp(2rem, 3.6vw, 3rem)' }}>{org.company}</h1>
            <p className="cu-lead">{org.type} · <span className="ac-pill">{org.level}</span> · <span className="ac-pill">{org.status}</span></p>
          </div>
          <button type="button" className="ds-btn ds-btn-outline" onClick={async () => { await partnerApi.logout(); navigate('/partner/login'); }}>Sign out</button>
        </div>
        <div className="ds-container"><nav className="ac-tabs" aria-label="Portal sections">{TABS.map(([id, label]) => <button key={id} type="button" aria-current={tab === id ? 'page' : undefined} onClick={() => setParams(id === 'overview' ? {} : { tab: id })}>{label}</button>)}</nav></div>
      </section>
      <section className="ds-soft" style={{ paddingBlock: 'clamp(28px, 4vw, 48px) var(--ds-section-y)' }}>
        <div className="ds-container ac-body">
          {msg && <p role={msg.kind === 'ok' ? 'status' : 'alert'} className={msg.kind === 'ok' ? 'ac-ok' : 'fm-err'}>{msg.text}</p>}
          {tab === 'overview' && (
            <div className="ac-grid">
              <div className="ac-card">
                <h2>{org.status === 'onboarding' ? `Onboarding: ${done} of ${org.checklist.length} done` : 'Onboarding complete'}</h2>
                <p>{org.status === 'onboarding' ? 'Our partner team ticks these off with you. Once they’re all done you can register deals.' : 'You can register deals and you appear in the partner directory if your listing is on.'}</p>
                <ul className="pp-check">{org.checklist.map((c) => <li key={c.id} data-done={c.done ? '1' : '0'}><i>{c.done && <Icon d={I.check} size={14} stroke={3} />}</i>{c.label}</li>)}</ul>
              </div>
              <div className="ac-card">
                <h2>Your level: {org.level}</h2>
                {perks.length > 0 ? <ul className="pp-check">{perks.map((p) => <li key={p} data-done="1"><i><Icon d={I.check} size={14} stroke={3} /></i>{p}</li>)}</ul> : <p>Your benefits are listed on the <Link className="ds-link" to="/partners#levels">Partners page</Link>.</p>}
              </div>
              <div className="ac-card">
                <h2>Deals</h2>
                <div className="pp-stats">{['submitted', 'approved', 'won'].map((s) => <span key={s}><b>{count(s)}</b>{s === 'submitted' ? 'waiting' : s}</span>)}</div>
                <button type="button" className="ds-btn ds-btn-grad" disabled={org.status !== 'active'} onClick={() => setParams({ tab: 'deals' })}>Register a deal</button>
                {org.status !== 'active' && <p className="ac-hint">Available once onboarding is complete.</p>}
              </div>
            </div>
          )}
          {tab === 'deals' && (
            <>
              {org.status === 'active' && (
                <div className="ac-card">
                  <h2>Register a deal</h2>
                  <p>Tell us about a customer you’re working with. Once approved, the deal is protected for you.</p>
                  {!adding ? <button type="button" className="ds-btn ds-btn-grad" onClick={() => setAdding(true)}>Register a deal</button> : (
                    <form className="fm" onSubmit={async (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const form = e.currentTarget; const f = Object.fromEntries(new FormData(form)) as Record<string, string>; if (await run(() => partnerApi.addDeal(f), 'Deal registered. We’ll email you once it’s reviewed.')) { form.reset(); setAdding(false); } }}>
                      <Field id="dc" label="Customer company" required><input id="dc" name="customer" required />{fields.customer && <span className="fm-err">{fields.customer}</span>}</Field>
                      <Field id="dk" label="Country" required><input id="dk" name="country" required /></Field>
                      <Field id="dp" label="Customer contact" required><input id="dp" name="contact" required /></Field>
                      <Field id="de" label="Contact email" required><input id="de" name="email" type="email" required /></Field>
                      <Field id="dv" label="Estimated value (optional)" wide><input id="dv" name="value" placeholder="For example USD 25,000 per year" /></Field>
                      <Field id="dn" label="Notes (optional)" wide><textarea id="dn" name="notes" rows={3} /></Field>
                      <button className="ds-btn ds-btn-grad" type="submit">Submit deal</button>
                    </form>
                  )}
                </div>
              )}
              <div className="ac-card">
                <h2>Your deals</h2>
                {!deals ? <p>Loading…</p> : deals.length === 0 ? <p>No deals registered yet.</p> : (
                  <div className="pp-wrap"><table className="pp-table">
                    <thead><tr><th>Customer</th><th>Status</th><th>Value</th><th>Registered</th><th /></tr></thead>
                    <tbody>{deals.map((d) => (
                      <tr key={d.id}>
                        <td><b>{d.customer}</b><div className="ac-hint">{d.contact} · {d.country}</div></td>
                        <td><span className="ac-pill">{d.status === 'submitted' ? 'waiting for review' : d.status}</span>{d.protected_until && <div className="ac-hint">protected until {d.protected_until}</div>}{d.reason && <div className="ac-hint">{d.reason}</div>}</td>
                        <td>{d.value || '–'}</td><td>{new Date(d.created_at).toLocaleDateString()}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>{d.status === 'approved' && <><button type="button" className="ds-btn ds-btn-line" style={{ minHeight: 40, padding: '0 12px' }} onClick={() => void run(() => partnerApi.dealStatus(d.id, 'won'), 'Marked as won. Congratulations!')}>Won</button> <button type="button" className="ds-btn ds-btn-line" style={{ minHeight: 40, padding: '0 12px' }} onClick={() => void run(() => partnerApi.dealStatus(d.id, 'lost'), 'Marked as lost.')}>Lost</button></>}</td>
                      </tr>
                    ))}</tbody>
                  </table></div>
                )}
              </div>
            </>
          )}
          {tab === 'team' && (
            <div className="ac-grid">
              <div className="ac-card">
                <h2>People with access</h2>
                {!team ? <p>Loading…</p> : <ul className="ac-list">{team.map((t) => <li key={t.id}><b>{t.name}{t.role === 'owner' ? ' (main contact)' : ''}</b>{user.role === 'owner' && t.role !== 'owner' ? <button type="button" className="ds-link" style={{ background: 'none', border: 0, cursor: 'pointer', font: 'inherit', padding: '8px 0' }} onClick={async () => { if (await confirmDialog({ title: `Remove ${t.name} from your team?`, message: 'They can no longer sign in to the partner portal.', confirm: 'Remove', danger: true })) void run(() => partnerApi.removeMember(t.id), 'Removed.'); }}>Remove</button> : <span />}<small>{t.email} · {t.joined ? 'active' : 'invitation sent'}</small></li>)}</ul>}
              </div>
              {user.role === 'owner' && (
                <div className="ac-card">
                  <h2>Add a colleague</h2>
                  <form className="fm" style={{ gridTemplateColumns: '1fr' }} onSubmit={async (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const form = e.currentTarget; const f = new FormData(form); if (await run(() => partnerApi.addMember(String(f.get('name')), String(f.get('email'))), 'Invitation sent.')) form.reset(); }}>
                    <Field id="tn" label="Name" required><input id="tn" name="name" required /></Field>
                    <Field id="te" label="Work email" required><input id="te" name="email" type="email" required />{fields.email && <span className="fm-err">{fields.email}</span>}</Field>
                    <button className="ds-btn ds-btn-grad" type="submit">Send invitation</button>
                  </form>
                </div>
              )}
            </div>
          )}
          {tab === 'profile' && (
            <div className="ac-card">
              <h2>Your listing in the partner directory</h2>
              <p>Active partners can appear on the public Partners page so customers can find them.</p>
              <form className="fm" onSubmit={(e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const f = new FormData(e.currentTarget); void run(() => partnerApi.profile({ website: String(f.get('website') ?? ''), about: String(f.get('about') ?? ''), listed: f.get('listed') === 'on' }), 'Listing saved.'); }}>
                <Field id="pw" label="Website" wide><input id="pw" name="website" type="url" placeholder="https://" defaultValue={org.website} />{fields.website && <span className="fm-err">{fields.website}</span>}</Field>
                <Field id="pa" label="About your company (shown in the directory)" wide><textarea id="pa" name="about" rows={4} maxLength={1000} defaultValue={org.about} /></Field>
                <label className="ac-switch" style={{ gridColumn: '1 / -1' }}><input type="checkbox" name="listed" defaultChecked={org.listed} /> Show {org.company} in the public partner directory</label>
                <button className="ds-btn ds-btn-grad" type="submit">Save listing</button>
              </form>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
