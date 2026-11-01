import type { CSSProperties, InputHTMLAttributes, ReactNode } from 'react';
import { useId } from 'react';

export const NAVY = '#1B2350';
export const MUTE = '#4A5175';
export const LINE = '#DDE3F3';
export const BLUE = '#1F74C9';
export const PURP = '#6D4AD8';
export const H = "Poppins, system-ui, sans-serif";

export const inputStyle = (invalid: boolean): CSSProperties => ({
  height: 50, padding: '0 14px', borderRadius: 12, fontSize: 16, color: NAVY, background: '#F4F6FC',
  border: `1.5px solid ${invalid ? '#C53030' : LINE}`, width: '100%',
});

type FieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string; trailing?: ReactNode };

/** Labelled input with hint and error message wired up for screen readers. */
export function Field({ label, error, hint, trailing, required, ...rest }: FieldProps) {
  const id = useId();
  const describedBy = [hint && `${id}-hint`, error && `${id}-err`].filter(Boolean).join(' ') || undefined;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label htmlFor={id} style={{ fontSize: 14, fontWeight: 600, color: NAVY }}>
        {label}
        {required && <span style={{ color: MUTE, fontWeight: 400 }}> (required)</span>}
      </label>
      <div style={{ position: 'relative' }}>
        <input id={id} required={required} aria-invalid={!!error} aria-describedby={describedBy} style={inputStyle(!!error)} {...rest} />
        {trailing}
      </div>
      {hint && !error && <span id={`${id}-hint`} style={{ fontSize: 13, color: MUTE }}>{hint}</span>}
      {error && <span id={`${id}-err`} role="alert" style={{ fontSize: 13, color: '#B42318', fontWeight: 500 }}>{error}</span>}
    </div>
  );
}

/** Two-column auth layout: indigo story panel + white form card. */
export function AuthShell({ title, lead, points, children }: { title: ReactNode; lead: string; points: string[]; children: ReactNode }) {
  return (
    <section style={{ background: '#FFFFFF', color: NAVY }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '48px 28px 88px' }}>
        <div style={{ position: 'relative', borderRadius: 36, background: 'radial-gradient(ellipse at 10% 0%, #2F3D7C 0%, #1F2A5C 55%)', color: '#FFFFFF', padding: 'clamp(28px, 4.5vw, 60px)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))', gap: 48, alignItems: 'start', boxShadow: '0 30px 60px rgba(31,42,92,0.25)', overflow: 'hidden' }}>
          <svg aria-hidden="true" viewBox="0 0 300 200" style={{ position: 'absolute', left: -70, bottom: -80, width: 360, opacity: 0.12 }}>
            <circle cx="110" cy="100" r="80" fill="none" stroke="#FFFFFF" strokeWidth="16" />
            <circle cx="190" cy="100" r="80" fill="none" stroke="#FFFFFF" strokeWidth="16" />
          </svg>
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 22 }}>
            <h1 style={{ margin: 0, fontFamily: H, fontWeight: 600, fontSize: 'clamp(2.3rem, 4.2vw, 3.6rem)', lineHeight: 1.05, letterSpacing: '-0.03em' }}>{title}</h1>
            <p style={{ margin: 0, fontSize: 18, color: '#DCE3FA' }}>{lead}</p>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {points.map((p) => (
                <li key={p} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span aria-hidden="true" style={{ flex: 'none', width: 26, height: 26, borderRadius: '50%', background: 'rgba(255,255,255,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8FB8FF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l4 4 10-10" /></svg>
                  </span>
                  <span style={{ fontSize: 17 }}>{p}</span>
                </li>
              ))}
            </ul>
          </div>
          <div style={{ position: 'relative', background: '#FFFFFF', color: NAVY, borderRadius: 28, padding: 'clamp(24px, 3.5vw, 40px)', boxShadow: '0 30px 60px rgba(15,20,60,0.30)' }}>{children}</div>
        </div>
      </div>
    </section>
  );
}

export const primaryBtn = (busy: boolean): CSSProperties => ({
  height: 54, border: 'none', borderRadius: 12, background: 'linear-gradient(90deg, #1F74C9, #6D4AD8)', color: '#FFFFFF',
  fontSize: 17, fontWeight: 600, cursor: busy ? 'progress' : 'pointer', opacity: busy ? 0.75 : 1,
});

export function FormError({ message }: { message: string }) {
  if (!message) return null;
  return <p role="alert" style={{ margin: 0, padding: '12px 14px', borderRadius: 12, background: '#FDECEC', color: '#9B1C1C', fontSize: 15 }}>{message}</p>;
}
