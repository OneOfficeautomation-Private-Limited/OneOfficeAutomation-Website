import { useId, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { helpFor } from './help';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { LogoMark } from '../ds/LogoMark';

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

/**
 * The sign-in and first-time setup screens: a brand panel on the left and the form on the right
 * (on phones the panel becomes a slim band above the form).
 */
export function Center({ title, intro, help, children }: { title: string; intro?: ReactNode; help?: ReactNode; children: ReactNode }) {
  return (
    <div className="auth">
      <aside className="auth-brand" aria-hidden="true">
        <div className="auth-brand-top">
          <LogoMark width={46} />
          <span>OneOfficeAutomation</span>
        </div>
        <span className="auth-rings"><LogoMark width={620} /></span>
        <p className="auth-brand-line">Run the website, its leads and the partner programme from one place.</p>
      </aside>
      <main className="auth-main">
        <div className="auth-form">
          <h1>{title}</h1>
          {intro && <div className="auth-intro">{intro}</div>}
          {children}
          {help && <p className="auth-help">{help}</p>}
        </div>
      </main>
    </div>
  );
}

/** A password box with a Show / Hide button. */
export function PasswordInput({ label, name, autoComplete, hint, error, minLength }: { label: string; name: string; autoComplete: string; hint?: string; error?: string; minLength?: number }) {
  const id = useId();
  const [show, setShow] = useState(false);
  return (
    <div className="auth-field">
      <label htmlFor={id}>{label}</label>
      <div className="auth-pass">
        <input id={id} name={name} type={show ? 'text' : 'password'} autoComplete={autoComplete} required minLength={minLength} aria-invalid={!!error} aria-describedby={hint || error ? `${id}-d` : undefined} />
        <button type="button" onClick={() => setShow((v) => !v)} aria-pressed={show} aria-label={show ? 'Hide password' : 'Show password'}>{show ? 'Hide' : 'Show'}</button>
      </div>
      {(hint || error) && <small id={`${id}-d`} className={error ? 'auth-err' : undefined}>{error || hint}</small>}
    </div>
  );
}

/** A plain text field for the sign-in screens. */
export function AuthInput({ label, name, type = 'text', autoComplete, error, autoFocus }: { label: string; name: string; type?: string; autoComplete: string; error?: string; autoFocus?: boolean }) {
  const id = useId();
  return (
    <div className="auth-field">
      <label htmlFor={id}>{label}</label>
      <input id={id} name={name} type={type} autoComplete={autoComplete} required autoFocus={autoFocus} aria-invalid={!!error} aria-describedby={error ? `${id}-e` : undefined} />
      {error && <small id={`${id}-e`} className="auth-err">{error}</small>}
    </div>
  );
}

/** Small “How to use this page” note under a screen's title. The text lives in help.ts. */
export function HowTo() {
  const { pathname } = useLocation();
  const h = helpFor(pathname);
  if (!h) return null;
  return (
    <div className="howto" role="note" aria-label="How to use this page">
      <p><b>How to use this page.</b> {h.what}</p>
      {h.steps.length > 0 && <ol>{h.steps.map((s) => <li key={s}>{s}</li>)}</ol>}
    </div>
  );
}
