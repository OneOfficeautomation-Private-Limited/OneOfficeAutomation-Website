import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

/**
 * In-page dialogs that replace the browser's own pop-ups (confirm / prompt), plus a small "Copied" notice.
 *   if (await confirmDialog({ title: 'Delete this file?', confirm: 'Delete file', danger: true })) …
 *   const reason = await promptDialog({ title: 'Send back this change', label: 'Reason', required: true });
 *   notify('Copied');
 * <DialogHost /> is mounted once at the root of the app (src/main.tsx).
 */
type Base = { title: string; message?: ReactNode; confirm?: string; cancel?: string; danger?: boolean };
export type ConfirmOptions = Base;
export type PromptOptions = Base & { label: string; initial?: string; placeholder?: string; hint?: string; required?: boolean; multiline?: boolean; type?: 'text' | 'number' | 'password'; min?: number; minLength?: number };
type Req = { kind: 'confirm'; o: ConfirmOptions; done: (v: boolean) => void } | { kind: 'prompt'; o: PromptOptions; done: (v: string | null) => void };

let current: Req | null = null;
let toast: { text: string; id: number } | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** A new dialog replaces any open one, which is answered as cancelled. */
function open(r: Req) { if (current) close(current.kind === 'confirm' ? false : null); current = r; emit(); }
export function confirmDialog(o: ConfirmOptions): Promise<boolean> {
  return new Promise((done) => open({ kind: 'confirm', o, done }));
}
export function promptDialog(o: PromptOptions): Promise<string | null> {
  return new Promise((done) => open({ kind: 'prompt', o, done }));
}
export function notify(text: string) {
  const id = Date.now(); toast = { text, id }; emit();
  window.setTimeout(() => { if (toast?.id === id) { toast = null; emit(); } }, 2600);
}
/** Copies text and says so; if the browser won't allow it, shows the text ready to copy by hand. */
export async function copyText(text: string, what = 'Text') {
  try { await navigator.clipboard.writeText(text); notify(`${what} copied`); }
  catch { await promptDialog({ title: `Copy the ${what.toLowerCase()}`, message: 'Select it and press Ctrl+C (or ⌘+C on a Mac).', label: what, initial: text, confirm: 'Done', cancel: 'Close' }); }
}

function close(v: boolean | string | null) {
  const r = current; current = null; emit();
  if (r) (r.done as (x: unknown) => void)(v);
}

export function DialogHost() {
  const [, setTick] = useState(0);
  useEffect(() => { const l = () => setTick((t) => t + 1); listeners.add(l); return () => { listeners.delete(l); }; }, []);
  return (
    <>
      {current && <Dialog key={current.o.title + current.kind} req={current} />}
      {toast && <div className="dlg-toast" role="status" aria-live="polite">{toast.text}</div>}
    </>
  );
}

function Dialog({ req }: { req: Req }) {
  const box = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const before = useRef<Element | null>(typeof document !== 'undefined' ? document.activeElement : null);
  const [value, setValue] = useState(req.kind === 'prompt' ? req.o.initial ?? '' : '');
  const [error, setError] = useState('');
  const o = req.o;
  const cancelValue = req.kind === 'confirm' ? false : null;

  useEffect(() => {
    const first = field.current ?? box.current?.querySelector<HTMLElement>('[data-autofocus]');
    first?.focus(); if (field.current && req.kind === 'prompt' && req.o.initial) field.current.select();
    const prev = before.current;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; (prev as HTMLElement | null)?.focus?.(); };
  }, [req]);

  function submit() {
    if (req.kind === 'confirm') return close(true);
    const p = req.o; const v = value.trim();
    if (p.required && !v) { setError(`${p.label} is required.`); field.current?.focus(); return; }
    if (p.minLength && v && v.length < p.minLength) { setError(`${p.label} needs at least ${p.minLength} characters.`); field.current?.focus(); return; }
    if (p.type === 'number' && v && (!Number.isFinite(Number(v)) || (p.min !== undefined && Number(v) < p.min))) { setError(`Enter a number${p.min !== undefined ? ` of at least ${p.min}` : ''}.`); field.current?.focus(); return; }
    close(p.type === 'password' ? value : v);
  }
  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { e.preventDefault(); close(cancelValue); return; }
    if (e.key === 'Tab' && box.current) {
      const f = Array.from(box.current.querySelectorAll<HTMLElement>('button, input, textarea, [href], select')).filter((x) => !x.hasAttribute('disabled'));
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  }
  const id = 'dlg-title';
  return (
    <div className="dlg-back" onMouseDown={(e) => { if (e.target === e.currentTarget) close(cancelValue); }}>
      <div ref={box} className="dlg" role={o.danger ? 'alertdialog' : 'dialog'} aria-modal="true" aria-labelledby={id} onKeyDown={onKey}>
        <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <h2 id={id}>{o.title}</h2>
          {o.message && <div className="dlg-msg">{o.message}</div>}
          {req.kind === 'prompt' && (
            <label className="dlg-field">{req.o.label}
              {req.o.multiline
                ? <textarea ref={field} rows={4} value={value} placeholder={req.o.placeholder} onChange={(e) => { setValue(e.target.value); setError(''); }} aria-invalid={!!error} />
                : <input ref={field} type={req.o.type ?? 'text'} value={value} placeholder={req.o.placeholder} min={req.o.min} onChange={(e) => { setValue(e.target.value); setError(''); }} aria-invalid={!!error} />}
              {(error || req.o.hint) && <small className={error ? 'dlg-err' : undefined}>{error || req.o.hint}</small>}
            </label>
          )}
          <div className="dlg-actions">
            <button type="button" className="dlg-btn" onClick={() => close(cancelValue)} data-autofocus={req.kind === 'confirm' && o.danger ? '' : undefined}>{o.cancel ?? 'Cancel'}</button>
            <button type="submit" className={`dlg-btn ${o.danger ? 'dlg-danger' : 'dlg-primary'}`} data-autofocus={req.kind === 'confirm' && !o.danger ? '' : undefined}>{o.confirm ?? 'OK'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
