import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { admin } from './api';
import { useAdmin } from './AdminContext';
import { AuthInput, Center, PasswordInput } from './ui';

export default function Login() {
  const nav = useNavigate();
  const { me, setMe } = useAdmin();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (me) nav('/admin', { replace: true }); }, [me, nav]);
  useEffect(() => { admin.status().then((s) => { if (s.needsSetup) nav('/admin/setup', { replace: true }); }).catch(() => undefined); }, [nav]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true); setError('');
    try {
      const r = await admin.login(String(f.get('email') ?? ''), String(f.get('password') ?? ''));
      setMe(r.admin);
      nav('/admin', { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Center title="Sign in to the admin" intro={<p>Use the email and password your admin gave you.</p>}
      help={<>Forgotten your password? Ask an admin to set a new one on the Team page. <Link to="/">Back to the website</Link></>}>
      <form onSubmit={submit} className="auth-stack" noValidate={false}>
        {error && <p className="auth-alert" role="alert">{error}</p>}
        <AuthInput label="Email" name="email" type="email" autoComplete="username" autoFocus />
        <PasswordInput label="Password" name="password" autoComplete="current-password" />
        <button className="auth-submit" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </Center>
  );
}
