import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { useSite } from '../../cms/CmsContext';
import { ApiError, passwordProblem } from '../../auth/api';
import type { Plan } from '../../auth/api';
import { AuthShell, Field, FormError, H, LINE, MUTE, NAVY, PURP, inputStyle, primaryBtn } from './ui';

const PLANS: { id: Plan; label: string }[] = [
  { id: 'community', label: 'Community (free)' },
  { id: 'starter', label: 'Starter ($120 / month, free trial)' },
  { id: 'business', label: 'Business ($360 / month, free trial)' },
  { id: 'enterprise', label: 'Enterprise (talk to sales)' },
];

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

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? '').trim();
    const password = String(f.get('password') ?? '');
    const errs: Record<string, string> = {};
    const pwIssue = passwordProblem(password);
    if (pwIssue) errs.password = pwIssue;
    if (password !== String(f.get('confirm') ?? '')) errs.confirm = 'Passwords don’t match.';
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
      title={<>Start automating.<br /><span style={{ color: '#8FB8FF' }}>Free.</span></>}
      lead="Create your OneOfficeAutomation account in under a minute."
      points={['Free Community edition, upgrade any time', 'Build your first agent in One Agent Studio', 'Self-hosted and secure by design']}
    >
      <form onSubmit={onSubmit} noValidate={false} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h2 style={{ margin: 0, fontFamily: H, fontWeight: 600, fontSize: 26 }}>Create your account</h2>
        <FormError message={error} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: 14 }}>
          <Field label="First name" name="firstName" autoComplete="given-name" required maxLength={60} error={fields.firstName} />
          <Field label="Last name" name="lastName" autoComplete="family-name" required maxLength={60} error={fields.lastName} />
        </div>
        <Field label="Work email" name="email" type="email" autoComplete="email" required maxLength={200} error={fields.email} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: 14 }}>
          <Field label="Company" name="company" autoComplete="organization" required maxLength={120} error={fields.company} />
          <Field label="Country" name="country" autoComplete="country-name" required maxLength={80} error={fields.country} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label htmlFor="plan" style={{ fontSize: 14, fontWeight: 600 }}>Plan</label>
          <select id="plan" value={plan} onChange={(e) => setPlan(e.target.value as Plan)} style={{ ...inputStyle(false), padding: '0 12px' }}>
            {PLANS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
        <Field
          label="Password" name="password" type={showPw ? 'text' : 'password'} autoComplete="new-password" required minLength={10}
          hint="At least 10 characters, with a letter and a number." error={fields.password}
          trailing={
            <button type="button" onClick={() => setShowPw((s) => !s)} aria-label={showPw ? 'Hide password' : 'Show password'} style={{ position: 'absolute', right: 6, top: 3, height: 44, padding: '0 12px', border: 'none', background: 'transparent', color: PURP, fontWeight: 600, cursor: 'pointer' }}>
              {showPw ? 'Hide' : 'Show'}
            </button>
          }
        />
        <Field label="Confirm password" name="confirm" type={showPw ? 'text' : 'password'} autoComplete="new-password" required error={fields.confirm} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14, color: MUTE }}>
            <input type="checkbox" name="acceptTerms" required style={{ width: 20, height: 20, margin: '2px 0 0', flex: 'none', accentColor: PURP }} />
            <span>I agree to the <Link to="/terms" target="_blank" style={{ color: NAVY, fontWeight: 600 }}>Terms of service</Link> and <Link to="/privacy" target="_blank" style={{ color: NAVY, fontWeight: 600 }}>Privacy policy</Link> of {site.legalName}.</span>
          </label>
          {fields.acceptTerms && <span role="alert" style={{ fontSize: 13, color: '#B42318' }}>{fields.acceptTerms}</span>}
        </div>
        <button type="submit" disabled={busy} style={primaryBtn(busy)}>{busy ? 'Creating your account…' : 'Create account'}</button>
        <p style={{ margin: 0, textAlign: 'center', color: MUTE, paddingTop: 6, borderTop: `1px dashed ${LINE}` }}>
          Already have an account? <Link to="/signin" style={{ color: NAVY, fontWeight: 600 }}>Sign in</Link>
        </p>
      </form>
    </AuthShell>
  );
}
