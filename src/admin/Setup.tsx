import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { admin, AdminError } from './api';
import { useAdmin } from './AdminContext';
import { AuthInput, Center, PasswordInput } from './ui';

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
    <Center title="Create the first admin" intro={<p>This works once, while the admin has no accounts. You need the setup token from the server settings (<code>ADMIN_SETUP_TOKEN</code>).</p>}
      help="Everyone else is added later, from the Team page.">
      {status && !status.setupEnabled && <p className="auth-alert" role="alert">Setup is switched off. Add an ADMIN_SETUP_TOKEN environment variable (at least 16 characters) in Hostinger, then restart the app.</p>}
      <form onSubmit={submit} className="auth-stack">
        {error && <p className="auth-alert" role="alert">{error}</p>}
        <PasswordInput label="Setup token" name="token" autoComplete="off" error={fields.token} />
        <AuthInput label="Your name" name="name" autoComplete="name" error={fields.name} autoFocus />
        <AuthInput label="Email" name="email" type="email" autoComplete="username" error={fields.email} />
        <PasswordInput label="Password" name="password" autoComplete="new-password" minLength={10} hint="At least 10 characters, with a letter and a number." error={fields.password} />
        <button className="auth-submit" type="submit" disabled={busy}>{busy ? 'Creating your account…' : 'Create admin account'}</button>
      </form>
    </Center>
  );
}
