import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { AuthShell, Field, FormError, H, LINE, MUTE, NAVY, PURP, primaryBtn } from './ui';

export default function SignInPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/account';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError('');
    try {
      await login(String(f.get('email') ?? '').trim(), String(f.get('password') ?? ''));
      navigate(from, { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title={<>Welcome<br /><span style={{ color: '#8FB8FF' }}>back.</span></>}
      lead="Sign in to manage your plan and your automation journey."
      points={['See your plan and account details', 'Pick up where you left off', 'Get help from our team in your time zone']}
    >
      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h2 style={{ margin: 0, fontFamily: H, fontWeight: 600, fontSize: 26 }}>Sign in</h2>
        <FormError message={error} />
        <Field label="Work email" name="email" type="email" autoComplete="email" required />
        <Field
          label="Password" name="password" type={showPw ? 'text' : 'password'} autoComplete="current-password" required
          trailing={
            <button type="button" onClick={() => setShowPw((s) => !s)} aria-label={showPw ? 'Hide password' : 'Show password'} style={{ position: 'absolute', right: 6, top: 3, height: 44, padding: '0 12px', border: 'none', background: 'transparent', color: PURP, fontWeight: 600, cursor: 'pointer' }}>
              {showPw ? 'Hide' : 'Show'}
            </button>
          }
        />
        <Link to="/contact" style={{ alignSelf: 'flex-end', color: PURP, fontWeight: 600, fontSize: 14 }}>Forgot your password?</Link>
        <button type="submit" disabled={busy} style={primaryBtn(busy)}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <p style={{ margin: 0, textAlign: 'center', color: MUTE, paddingTop: 6, borderTop: `1px dashed ${LINE}` }}>
          New to OneOfficeAutomation? <Link to="/signup" style={{ color: NAVY, fontWeight: 600 }}>Create an account</Link>
        </p>
      </form>
    </AuthShell>
  );
}
