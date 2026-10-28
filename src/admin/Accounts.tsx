import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { admin, AdminError } from './api';
import type { CustomerRow, TeamMember } from './api';
import { useAdmin } from './AdminContext';
import { Input, Notice, fmtDate } from './ui';

export function Customers() {
  const [rows, setRows] = useState<CustomerRow[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { admin.customers().then((r) => setRows(r.items)).catch((e: Error) => setError(e.message)); }, []);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h1 style={{ fontSize: 28 }}>Customer accounts</h1>
      <p style={{ margin: 0, color: '#4A5175' }}>People who registered on the website. Passwords are never shown or stored in readable form.</p>
      {error && <Notice kind="error">{error}</Notice>}
      {rows === null ? <p>Loading…</p> : rows.length === 0 ? <div className="card hint">No customer accounts yet.</div> : (
        <div className="card scroll-x" style={{ padding: 0 }}><table><thead><tr><th>Name</th><th>Email</th><th>Company</th><th>Country</th><th>Plan</th><th>Joined</th></tr></thead><tbody>
          {rows.map((r) => <tr key={r.id}><td>{r.first_name} {r.last_name}</td><td>{r.email}</td><td>{r.company}</td><td>{r.country}</td><td style={{ textTransform: 'capitalize' }}>{r.plan}</td><td style={{ whiteSpace: 'nowrap' }}>{fmtDate(r.created_at)}</td></tr>)}
        </tbody></table></div>
      )}
    </div>
  );
}

export function Team() {
  const { me } = useAdmin();
  const [rows, setRows] = useState<TeamMember[] | null>(null);
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const load = () => admin.users().then((r) => setRows(r.items)).catch((e: Error) => setMessage({ kind: 'error', text: e.message }));
  useEffect(() => { void load(); }, []);
  async function patch(id: string, b: { role?: string; active?: boolean; password?: string }, ok: string) {
    try { await admin.updateUser(id, b); setMessage({ kind: 'success', text: ok }); await load(); } catch (e) { setMessage({ kind: 'error', text: (e as Error).message }); }
  }
  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget; const f = new FormData(form);
    try { await admin.addUser({ name: String(f.get('name')), email: String(f.get('email')), password: String(f.get('password')), role: String(f.get('role')) }); form.reset(); setMessage({ kind: 'success', text: 'Team member added.' }); await load(); } catch (err) { setMessage({ kind: 'error', text: (err as Error).message }); }
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <h1 style={{ fontSize: 28 }}>Team</h1>
      <p style={{ margin: 0, color: '#4A5175' }}><strong>Admins</strong> can do everything. <strong>Editors</strong> can edit content and handle the inbox, but can’t delete submissions or manage the team.</p>
      <div aria-live="polite">{message && <Notice kind={message.kind}>{message.text}</Notice>}</div>
      {rows && (
        <div className="card scroll-x" style={{ padding: 0 }}><table><thead><tr><th>Name</th><th>Role</th><th>Last sign-in</th><th>Access</th><th>Password</th></tr></thead><tbody>
          {rows.map((r) => (
            <tr key={r.id} style={{ opacity: r.active ? 1 : 0.6 }}>
              <td><div style={{ fontWeight: 600 }}>{r.name}{r.id === me?.id && ' (you)'}</div><div className="hint" style={{ marginTop: 0 }}>{r.email}</div></td>
              <td><select aria-label={`Role for ${r.name}`} value={r.role} disabled={r.id === me?.id} onChange={(e) => void patch(r.id, { role: e.target.value }, 'Role updated.')} style={{ width: 'auto' }}><option value="admin">Admin</option><option value="editor">Editor</option></select></td>
              <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(r.lastLogin)}</td>
              <td><button type="button" className={`btn small${r.active ? ' danger' : ''}`} disabled={r.id === me?.id} onClick={() => void patch(r.id, { active: !r.active }, r.active ? 'Access removed.' : 'Access restored.')}>{r.active ? 'Remove access' : 'Restore access'}</button></td>
              <td><button type="button" className="btn small" onClick={() => { const pw = window.prompt(`New password for ${r.name} (at least 10 characters, with a letter and a number):`); if (pw) void patch(r.id, { password: pw }, 'Password changed.'); }}>Reset</button></td>
            </tr>
          ))}
        </tbody></table></div>
      )}
      <form className="card" onSubmit={add} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h2 style={{ fontSize: 19 }}>Add a team member</h2>
        <div className="adm-grid2">
          <Input label="Name" name="name" type="text" required />
          <Input label="Email" name="email" type="email" required />
          <Input label="Temporary password" name="password" type="password" autoComplete="new-password" required minLength={10} hint="They should change it after signing in." />
          <div><label className="lbl" htmlFor="role">Role</label><select id="role" name="role" defaultValue="editor"><option value="editor">Editor</option><option value="admin">Admin</option></select></div>
        </div>
        <div><button className="btn primary" type="submit">Add team member</button></div>
      </form>
    </div>
  );
}

export function Account() {
  const { me } = useAdmin();
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget; const f = new FormData(form);
    setMessage(null); setFields({});
    try { await admin.password(String(f.get('current')), String(f.get('next'))); form.reset(); setMessage({ kind: 'success', text: 'Your password has been changed.' }); }
    catch (err) { setMessage({ kind: 'error', text: (err as Error).message }); setFields((err as AdminError).fields ?? {}); }
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 520 }}>
      <h1 style={{ fontSize: 28 }}>My account</h1>
      <p style={{ margin: 0, color: '#4A5175' }}>{me?.name} · {me?.email} · {me?.role === 'admin' ? 'Admin' : 'Editor'}</p>
      <div aria-live="polite">{message && <Notice kind={message.kind}>{message.text}</Notice>}</div>
      <form className="card" onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h2 style={{ fontSize: 19 }}>Change password</h2>
        <Input label="Current password" name="current" type="password" autoComplete="current-password" required error={fields.current} />
        <Input label="New password" name="next" type="password" autoComplete="new-password" required minLength={10} hint="At least 10 characters, with a letter and a number." error={fields.next} />
        <div><button className="btn primary" type="submit">Change password</button></div>
      </form>
    </div>
  );
}
