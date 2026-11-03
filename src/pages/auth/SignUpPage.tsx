import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { useSite } from '../../cms/CmsContext';
import { ApiError, passwordProblem } from '../../auth/api';
import type { Plan } from '../../auth/api';
import { AuthShell, Field, FormError, H, LINE, MUTE, NAVY, PURP, primaryBtn } from './ui';

const PLANS: { id: Plan; name: string; price: string; note: string; points: string[] }[] = [
  { id: 'community', name: 'Community', price: 'Free', note: 'Free forever', points: ['Free forever, upgrade any time', 'Build your first agent in One Agent Studio', 'Runs on your own servers'] },
  { id: 'starter', name: 'Starter', price: '$120/mo', note: 'Free trial', points: ['Starts with a free trial', 'Studio, Command Center and a Runner', 'Schedules, run history and alerts'] },
  { id: 'business', name: 'Business', price: '$360/mo', note: 'Free trial', points: ['Starts with a free trial', 'AI agents and One Workflow', 'Single sign-on, roles and audit trail'] },
  { id: 'enterprise', name: 'Enterprise', price: 'Custom', note: 'Talk to sales', points: ['Our team contacts you to plan the set-up', 'Unlimited users and Runners', '24/7 support with an SLA'] },
];

/** 0–4: length, letters and numbers, mixed case, symbols. Only a guide; the rule itself is checked by passwordProblem. */
function strength(pw: string) {
  if (!pw) return 0;
  let n = 0;
  if (pw.length >= 10) n++;
  if (/[a-z]/i.test(pw) && /\d/.test(pw)) n++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) n++;
  if (/[^a-z0-9]/i.test(pw) || pw.length >= 16) n++;
  return n;
}
const STRENGTH = ['', 'Weak', 'Fair', 'Good', 'Strong'];

export default function SignUpPage() {
  const { register } = useAuth();
  const site = useSite();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialPlan = (PLANS.find((p) => p.id === params.get('plan'))?.id ?? 'community') as Plan;
  const [plan, setPlan] = useState<Plan>(initialPlan);
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [pw, setPw] = useState('');
  const chosen = PLANS.find((p) => p.id === plan) ?? PLANS[0];
  const st = strength(pw);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? '').trim();
    const password = String(f.get('password') ?? '');
    const errs: Record<string, string> = {};
    const pwIssue = passwordProblem(password);
    if (pwIssue) errs.password = pwIssue;
    if (!f.get('acceptTerms')) errs.acceptTerms = 'Please accept the terms to continue.';
    setFields(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    setError('');
    try {
      await register({ firstName: get('firstName'), lastName: get('lastName'), email: get('email'), company: get('company'), country: get('country'), plan, password, acceptTerms: true });
      navigate('/account', { replace: true, state: { welcome: true } });
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message);
      setFields(apiErr.fields ?? {});
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      fit
      title={<>Start automating.<br /><span style={{ color: '#8FB8FF' }}>{plan === 'community' ? 'Free.' : plan === 'enterprise' ? 'At scale.' : 'Try it free.'}</span></>}
      lead={`Create your account in under a minute. ${chosen.name} plan: ${chosen.note.toLowerCase()}.`}
      points={chosen.points}
    >
      <form className="su-form" onSubmit={onSubmit} noValidate={false} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h2 style={{ margin: 0, fontFamily: H, fontWeight: 600, fontSize: 26 }}>Create your account</h2>
        <FormError message={error} />
        <div className="su-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: 14 }}>
          <Field label="First name" name="firstName" autoComplete="given-name" required maxLength={60} error={fields.firstName} />
          <Field label="Last name" name="lastName" autoComplete="family-name" required maxLength={60} error={fields.lastName} />
        </div>
        <div className="su-row">
          <Field label="Work email" name="email" type="email" autoComplete="email" required maxLength={200} error={fields.email} />
          <Field label="Company" name="company" autoComplete="organization" required maxLength={120} error={fields.company} />
        </div>
        <div className="su-row">
          <Field label="Country" name="country" autoComplete="country-name" required maxLength={80} error={fields.country} />
          <Field
            label="Password" name="password" type={showPw ? 'text' : 'password'} autoComplete="new-password" required minLength={10}
            hint="Use 10+ letters and numbers." error={fields.password} onChange={(e) => setPw(e.currentTarget.value)}
            trailing={
              <button type="button" onClick={() => setShowPw((s) => !s)} aria-label={showPw ? 'Hide password' : 'Show password'} style={{ position: 'absolute', right: 6, top: 3, height: 44, padding: '0 12px', border: 'none', background: 'transparent', color: PURP, fontWeight: 600, cursor: 'pointer' }}>
                {showPw ? 'Hide' : 'Show'}
              </button>
            }
          />
        </div>
        {pw && (
          <div className="su-meter" data-n={st} aria-live="polite">
            <span><i /><i /><i /><i /></span>
            <small>Password strength: {STRENGTH[st] || 'Too short'}</small>
          </div>
        )}
        <fieldset className="su-plans">
          <legend>Plan</legend>
          {PLANS.map((p) => (
            <label key={p.id} data-on={plan === p.id ? '1' : undefined}>
              <input type="radio" name="planPick" value={p.id} checked={plan === p.id} onChange={() => setPlan(p.id)} />
              <b>{p.name}</b><span>{p.price}</span><small>{p.note}</small>
            </label>
          ))}
        </fieldset>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14, color: MUTE }}>
            <input type="checkbox" name="acceptTerms" required style={{ width: 20, height: 20, margin: '2px 0 0', flex: 'none', accentColor: PURP }} />
            <span>I agree to the <Link to="/terms" target="_blank" style={{ color: NAVY, fontWeight: 600 }}>Terms of service</Link> and <Link to="/privacy" target="_blank" style={{ color: NAVY, fontWeight: 600 }}>Privacy policy</Link> of {site.legalName}.</span>
          </label>
          {fields.acceptTerms && <span role="alert" style={{ fontSize: 13, color: '#B42318' }}>{fields.acceptTerms}</span>}
        </div>
        <button type="submit" disabled={busy} style={primaryBtn(busy)}>{busy ? 'Creating your account…' : plan === 'community' ? 'Create free account' : plan === 'enterprise' ? 'Create account and contact sales' : `Start ${chosen.name} free trial`}</button>
        <p style={{ margin: 0, textAlign: 'center', color: MUTE, paddingTop: 6, borderTop: `1px dashed ${LINE}` }}>
          Already have an account? <Link to="/signin" style={{ color: NAVY, fontWeight: 600 }}>Sign in</Link>
        </p>
      </form>
    </AuthShell>
  );
}
