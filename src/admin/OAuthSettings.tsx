import { useCallback, useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { admin, AdminError } from './api';
import type { OAuthProviderRow } from './api';
import { Input, Notice, fmtDate } from './ui';
import { confirmDialog } from '../ui/dialog';

const NAMES = { google: 'Google', github: 'GitHub' } as const;
const WHERE = {
  google: 'Google Cloud console → APIs & Services → Credentials → OAuth client ID (Web application).',
  github: 'GitHub → Settings → Developer settings → OAuth Apps → New OAuth App.',
} as const;

function Provider({ row, onChanged }: { row: OAuthProviderRow; onChanged: () => void }) {
  const [clientId, setClientId] = useState(row.clientId);
  const [secret, setSecret] = useState('');
  const [enabled, setEnabled] = useState(row.enabled);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'error' | 'success'; text: ReactNode } | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const name = NAMES[row.provider];
  const fromServer = row.source === 'server';
  useEffect(() => { setClientId(row.clientId); setEnabled(row.enabled); setSecret(''); }, [row]);

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null); setFields({});
    try {
      await admin.saveOAuth(row.provider, { clientId, secret: secret || undefined, enabled });
      setMsg({ kind: 'success', text: enabled ? `${name} sign-in is saved and on.` : `${name} details saved. Sign-in is off.` });
      setSecret('');
      onChanged();
    } catch (err) {
      setMsg({ kind: 'error', text: (err as Error).message });
      setFields((err as AdminError).fields ?? {});
    } finally { setBusy(false); }
  }
  async function remove() {
    if (!(await confirmDialog({ title: `Remove ${name} sign-in?`, message: `The client ID and secret are deleted and the “Continue with ${name}” button disappears. Customers who signed in this way can still use “Forgot your password?”.`, confirm: 'Remove keys', danger: true }))) return;
    setBusy(true); setMsg(null);
    try { await admin.clearOAuth(row.provider); setMsg({ kind: 'success', text: `${name} sign-in removed.` }); onChanged(); } catch (err) { setMsg({ kind: 'error', text: (err as Error).message }); } finally { setBusy(false); }
  }

  return (
    <form onSubmit={save} className="wf-stack-s" style={{ paddingTop: 14, borderTop: '1px solid var(--line)' }} aria-label={`${name} sign-in`}>
      <div className="wf-pipe-h">
        <h3 style={{ fontSize: 16, margin: 0 }}>{name}</h3>
        <span className="hint" style={{ margin: 0 }}>{row.live ? (fromServer ? 'On · set on the server' : 'On') : 'Off'}</span>
      </div>
      {fromServer ? (
        <p className="hint" style={{ margin: 0 }}>The keys for {name} are set in the server settings (environment variables), which take priority. To manage them here instead, remove them from the server settings.</p>
      ) : (
        <>
          <p className="hint" style={{ margin: 0 }}>Create the keys at: {WHERE[row.provider]} Use this callback address:</p>
          <input type="text" readOnly aria-label={`${name} callback address`} value={row.callback} onFocus={(e) => e.currentTarget.select()} style={{ fontFamily: 'monospace', fontSize: 13 }} />
          <Input label="Client ID" type="text" value={clientId} onChange={(e) => setClientId(e.target.value)} autoComplete="off" spellCheck={false} error={fields.clientId} />
          <Input label="Client secret" type="password" value={secret} onChange={(e) => setSecret(e.target.value)} autoComplete="new-password" spellCheck={false}
            placeholder={row.secretSet ? 'Saved. Leave empty to keep it' : ''} error={fields.secret}
            hint={row.secretSet ? 'The saved secret is never shown again. Paste a new one only to replace it.' : 'It is stored encrypted and never shown again.'} />
          <label className="wf-check"><input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />Show “Continue with {name}” on the sign-in, sign-up and partner pages</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
            {(row.secretSet || row.clientId) && <button type="button" className="btn danger" disabled={busy} onClick={() => void remove()}>Remove keys</button>}
          </div>
          {row.updatedAt && <p className="hint" style={{ margin: 0 }}>Last changed {fmtDate(row.updatedAt)}{row.updatedBy ? ` by ${row.updatedBy}` : ''}.</p>}
        </>
      )}
      <div aria-live="polite">{msg && <Notice kind={msg.kind}>{msg.text}</Notice>}</div>
    </form>
  );
}

/** Settings card for the Google and GitHub sign-in keys. Only full admins can open it; the server checks the role too. */
export function OAuthSettings() {
  const [rows, setRows] = useState<OAuthProviderRow[] | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(() => admin.oauth().then((r) => setRows(r.items)).catch((e) => setError((e as Error).message)), []);
  useEffect(() => { void load(); }, [load]);
  return (
    <div className="card wf-stack-s">
      <h2 style={{ fontSize: 18 }}>Sign in with Google and GitHub</h2>
      <p className="hint" style={{ margin: 0 }}>
        Lets customers sign in or sign up, and approved partners sign in, with a Google or GitHub account. Free to use. Secrets are stored encrypted
        and can’t be read back. Keys set in the server settings take priority over these. Setup steps: <code>docs/deployment/OAUTH-SETUP.md</code>.
      </p>
      {error && <Notice kind="error">{error}</Notice>}
      {!rows && !error ? <p>Loading…</p> : rows?.map((r) => <Provider key={r.provider} row={r} onChanged={() => void load()} />)}
    </div>
  );
}
