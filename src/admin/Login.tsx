import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { admin } from './api';
import { useAdmin } from './AdminContext';
import { Center, Input, Notice } from './ui';

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
    <Center title="Sign in">
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {error && <Notice kind="error">{error}</Notice>}
        <Input label="Email" name="email" type="email" autoComplete="username" required />
        <Input label="Password" name="password" type="password" autoComplete="current-password" required />
        <button className="btn primary" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
      <Link to="/" style={{ fontSize: 14 }}>← Back to the website</Link>
    </Center>
  );
}
