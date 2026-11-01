import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, passwordProblem } from '../../auth/api';
import { AuthShell, Field, FormError, H, LINE, MUTE, NAVY, PURP, primaryBtn } from './ui';

/** "Forgot your password?" for customers (/forgot) and partners (/partner/forgot). */
export function ForgotPage({ partner = false }: { partner?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState('');
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const email = String(new FormData(e.currentTarget).get('email') ?? '').trim();
    setBusy(true); setError('');
    try { await api.forgot(email, partner); setSent(email); } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }
  return (
    <AuthShell title={<>Reset your<br /><span style={{ color: '#8FB8FF' }}>password.</span></>} lead="We’ll email you a link to choose a new one." points={['The link works for one hour', 'It can only be used once', 'Your password stays the same until you change it']}>
      {sent ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }} role="status">
          <h2 style={{ margin: 0, fontFamily: H, fontWeight: 600, fontSize: 26 }}>Check your inbox</h2>
          <p style={{ margin: 0, color: MUTE }}>If <b>{sent}</b> has {partner ? 'a partner portal' : 'an'} account, a reset link is on its way. It can take a minute or two. Check spam if you don’t see it.</p>
          <Link to={partner ? '/partner/login' : '/signin'} style={{ color: PURP, fontWeight: 600 }}>← Back to sign in</Link>
        </div>
      ) : (
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h2 style={{ margin: 0, fontFamily: H, fontWeight: 600, fontSize: 26 }}>Forgot your password?</h2>
          <FormError message={error} />
          <Field label="Email" name="email" type="email" autoComplete="email" required />
          <button type="submit" disabled={busy} style={primaryBtn(busy)}>{busy ? 'Sending…' : 'Email me a reset link'}</button>
          <p style={{ margin: 0, textAlign: 'center', color: MUTE, paddingTop: 6, borderTop: `1px dashed ${LINE}` }}><Link to={partner ? '/partner/login' : '/signin'} style={{ color: NAVY, fontWeight: 600 }}>Back to sign in</Link></p>
        </form>
      )}
    </AuthShell>
  );
}

/** Choose a new password from an emailed link: customer reset, partner reset, or a partner invitation. */
export function ResetPage({ mode }: { mode: 'reset' | 'partner-reset' | 'partner-accept' }) {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const invite = mode === 'partner-accept';
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = new FormData(e.currentTarget);
    const pw = String(f.get('password') ?? ''); const again = String(f.get('again') ?? '');
    const problem = passwordProblem(pw);
    if (problem) { setFields({ password: problem }); return; }
    if (pw !== again) { setFields({ again: 'The two passwords don’t match.' }); return; }
    setBusy(true); setError(''); setFields({});
    try {
      await api.reset(token, pw, mode === 'reset' ? 'auth/reset' : mode === 'partner-reset' ? 'partner/reset' : 'partner/accept');
      if (mode === 'reset') setDone(true); else navigate('/partner', { replace: true });
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }
  return (
    <AuthShell
      title={invite ? <>Welcome to the<br /><span style={{ color: '#8FB8FF' }}>partner portal.</span></> : <>Choose a new<br /><span style={{ color: '#8FB8FF' }}>password.</span></>}
      lead={invite ? 'Set your password to open your partner portal.' : 'Pick something you don’t use anywhere else.'}
      points={invite ? ['See your onboarding checklist and level', 'Register deals and track them', 'Add colleagues from your company'] : ['At least 10 characters', 'Include a letter and a number', 'You’ll sign in with it straight away']}
    >
      {!token ? <FormError message="This link is missing its code. Open the link from your email again." /> : done ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }} role="status">
          <h2 style={{ margin: 0, fontFamily: H, fontWeight: 600, fontSize: 26 }}>Password changed</h2>
          <p style={{ margin: 0, color: MUTE }}>You can now sign in with your new password.</p>
          <Link to="/signin" style={{ ...primaryBtn(false), display: 'grid', placeItems: 'center', textDecoration: 'none' }}>Sign in</Link>
        </div>
      ) : (
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h2 style={{ margin: 0, fontFamily: H, fontWeight: 600, fontSize: 26 }}>{invite ? 'Set your password' : 'New password'}</h2>
          <FormError message={error} />
          <Field label="New password" name="password" type="password" autoComplete="new-password" required hint="At least 10 characters, with a letter and a number." error={fields.password} />
          <Field label="Type it again" name="again" type="password" autoComplete="new-password" required error={fields.again} />
          <button type="submit" disabled={busy} style={primaryBtn(busy)}>{busy ? 'Saving…' : invite ? 'Open my partner portal' : 'Save password'}</button>
          {error && <Link to={mode === 'reset' ? '/forgot' : '/partner/forgot'} style={{ color: PURP, fontWeight: 600 }}>Ask for a new link</Link>}
        </form>
      )}
    </AuthShell>
  );
}
