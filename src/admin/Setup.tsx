import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { admin, AdminError } from './api';
import { useAdmin } from './AdminContext';
import { Center, Input, Notice } from './ui';

/** First-time setup: creates the first admin. Only works while no admin exists, and needs the ADMIN_SETUP_TOKEN secret. */
export default function Setup() {
  const nav = useNavigate();
  const { setMe } = useAdmin();
  const [status, setStatus] = useState<{ needsSetup: boolean; setupEnabled: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  useEffect(() => { admin.status().then(setStatus).catch(() => setStatus({ needsSetup: true, setupEnabled: true })); }, []);
  useEffect(() => { if (status && !status.needsSetup) nav('/admin/login', { replace: true }); }, [status, nav]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true); setError(''); setFields({});
    try {
      const r = await admin.setup({ token: String(f.get('token') ?? ''), name: String(f.get('name') ?? ''), email: String(f.get('email') ?? ''), password: String(f.get('password') ?? '') });
      setMe(r.admin);
      nav('/admin', { replace: true });
    } catch (err) {
      setError((err as Error).message);
      setFields((err as AdminError).fields ?? {});
    } finally {
      setBusy(false);
    }
  }
  return (
    <Center title="Create the first admin">
      <p style={{ margin: 0, color: '#4A5175' }}>This only works once. You need the <strong>ADMIN_SETUP_TOKEN</strong> environment variable you added in Hostinger.</p>
      {status && !status.setupEnabled && <Notice kind="error">Setup is switched off. Add an ADMIN_SETUP_TOKEN environment variable (at least 16 characters) in Hostinger, then restart the app.</Notice>}
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {error && <Notice kind="error">{error}</Notice>}
        <Input label="Setup token" name="token" type="password" autoComplete="off" required error={fields.token} />
        <Input label="Your name" name="name" type="text" autoComplete="name" required error={fields.name} />
        <Input label="Email" name="email" type="email" autoComplete="username" required error={fields.email} />
        <Input label="Password" name="password" type="password" autoComplete="new-password" required minLength={10} hint="At least 10 characters, with a letter and a number." error={fields.password} />
        <button className="btn primary" type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create admin account'}</button>
      </form>
    </Center>
  );
}
