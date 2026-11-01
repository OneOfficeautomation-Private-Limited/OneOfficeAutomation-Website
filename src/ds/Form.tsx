import type { ReactNode } from 'react';
import { I, Icon } from './ui';

/* Shared look for the site's forms. The fields keep their original names, so submissions are unchanged. */
export function Field({ id, label, required, children, wide }: { id: string; label: string; required?: boolean; children: ReactNode; wide?: boolean }) {
  return (
    <div className="fm-f" data-wide={wide ? '1' : '0'}>
      <label htmlFor={id}>{label}{required && <span className="fm-req"> (required)</span>}</label>
      {children}
    </div>
  );
}

export function Done({ title, text, again, onAgain }: { title: string; text: ReactNode; again: string; onAgain: () => void }) {
  return (
    <div className="fm-done" role="status">
      <span><Icon d={I.check} size={30} stroke={2.6} /></span>
      <h3>{title}</h3>
      <p>{text}</p>
      <button type="button" className="ds-btn ds-btn-line" onClick={onAgain}>{again}</button>
    </div>
  );
}

export function Contacts({ email, phoneIndia, phoneQatar }: { email: string; phoneIndia: string; phoneQatar: string }) {
  const tel = (s: string) => s.replace(/[^+0-9]/g, '');
  return (
    <div className="fm-contacts">
      <a href={`mailto:${email}`}><i><Icon d={I.mail} size={20} /></i>{email}</a>
      <a href={`tel:${tel(phoneIndia)}`}><i><Icon d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2" size={20} /></i>India: {phoneIndia}</a>
      <a href={`tel:${tel(phoneQatar)}`}><i><Icon d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2" size={20} /></i>Qatar: {phoneQatar}</a>
    </div>
  );
}
