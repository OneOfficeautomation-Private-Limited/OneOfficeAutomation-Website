import { useId } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';

export const fmtDate = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '–');

export function Input({ label, error, hint, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string }) {
  const id = useId();
  return (
    <div>
      <label className="lbl" htmlFor={id}>{label}</label>
      <input id={id} aria-invalid={!!error} {...rest} />
      {hint && !error && <div className="hint">{hint}</div>}
      {error && <div role="alert" style={{ color: '#B42318', fontSize: 13, marginTop: 4 }}>{error}</div>}
    </div>
  );
}

export function Notice({ kind, children }: { kind: 'error' | 'success'; children: ReactNode }) {
  const ok = kind === 'success';
  return (
    <div role={ok ? 'status' : 'alert'} style={{ padding: '10px 14px', borderRadius: 10, background: ok ? '#E8F7EF' : '#FDECEC', color: ok ? '#116B3C' : '#9B1C1C', fontSize: 14.5 }}>
      {children}
    </div>
  );
}

export function Center({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="adm" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="card" style={{ width: '100%', maxWidth: 440, display: 'flex', flexDirection: 'column', gap: 16, padding: 28, boxShadow: '0 20px 50px rgba(31,42,92,0.12)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="38" height="38" viewBox="0 0 40 40" aria-hidden="true"><circle cx="14" cy="20" r="11" fill="none" stroke="#2389C4" strokeWidth="4.2" /><circle cx="26" cy="20" r="11" fill="none" stroke="#A57FE6" strokeWidth="4.2" /></svg>
          <span style={{ fontFamily: 'Poppins, system-ui, sans-serif', fontWeight: 600, fontSize: 18 }}>OneOfficeAutomation admin</span>
        </div>
        <h1 style={{ fontSize: 26 }}>{title}</h1>
        {children}
      </div>
    </div>
  );
}
