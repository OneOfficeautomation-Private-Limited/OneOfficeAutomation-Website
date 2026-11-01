import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { admin, AdminError } from './api';
import type { Role, TeamMember } from './api';
import { ROLE_HELP, ROLE_LABEL } from './wf';
import { useAdmin } from './AdminContext';
import { HowTo, Input, Notice, fmtDate } from './ui';
import { promptDialog } from '../ui/dialog';

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
      <HowTo />
      <ul style={{ margin: 0, paddingLeft: 18, color: '#4A5175' }}>{(Object.keys(ROLE_LABEL) as Role[]).map((r) => <li key={r}><strong>{ROLE_LABEL[r]}:</strong> {ROLE_HELP[r]}</li>)}</ul>
      <p style={{ display: 'none' }}><strong>Admins</strong> can do everything. <strong>Editors</strong> can edit content and handle the inbox, but can’t delete submissions or manage the team.</p>
      <div aria-live="polite">{message && <Notice kind={message.kind}>{message.text}</Notice>}</div>
      {rows && (
        <div className="card scroll-x" style={{ padding: 0 }}><table><thead><tr><th>Name</th><th>Role</th><th>Last sign-in</th><th>Access</th><th>Password</th></tr></thead><tbody>
          {rows.map((r) => (
            <tr key={r.id} style={{ opacity: r.active ? 1 : 0.6 }}>
              <td><div style={{ fontWeight: 600 }}>{r.name}{r.id === me?.id && ' (you)'}</div><div className="hint" style={{ marginTop: 0 }}>{r.email}</div></td>
              <td><select aria-label={`Role for ${r.name}`} value={r.role} disabled={r.id === me?.id} onChange={(e) => void patch(r.id, { role: e.target.value }, 'Role updated.')} style={{ width: 'auto' }}>{(Object.keys(ROLE_LABEL) as Role[]).map((x) => <option key={x} value={x}>{ROLE_LABEL[x]}</option>)}</select></td>
              <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(r.lastLogin)}</td>
              <td><button type="button" className={`btn small${r.active ? ' danger' : ''}`} disabled={r.id === me?.id} onClick={() => void patch(r.id, { active: !r.active }, r.active ? 'Access removed.' : 'Access restored.')}>{r.active ? 'Remove access' : 'Restore access'}</button></td>
              <td><button type="button" className="btn small" onClick={async () => { const pw = await promptDialog({ title: `Set a new password for ${r.name}`, message: 'Share it with them privately. They are signed out everywhere and can change it in My account.', label: 'New password', type: 'password', minLength: 10, hint: 'At least 10 characters, with a letter and a number.', required: true, confirm: 'Set password' }); if (pw) void patch(r.id, { password: pw }, 'Password changed.'); }}>Reset</button></td>
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
          <div><label className="lbl" htmlFor="role">Role</label><select id="role" name="role" defaultValue="editor">{(Object.keys(ROLE_LABEL) as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select></div>
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
      <p style={{ margin: 0, color: '#4A5175' }}>{me?.name} · {me?.email} · {me ? ROLE_LABEL[me.role] : ''}</p>
      <HowTo />
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
