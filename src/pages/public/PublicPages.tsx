import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../../auth/api';
import { ResHero } from '../resources/DocsPage';
import { Done, Field } from '../../ds/Form';
import { I, Icon } from '../../ds/ui';

/** /application/:token — a job applicant checks where their application is. */
export function ApplicationStatusPage() {
  const { token = '' } = useParams();
  const [d, setD] = useState<Awaited<ReturnType<typeof api.application>> | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { api.application(token).then(setD).catch((e: Error) => setError(e.message)); }, [token]);
  const idx = d ? d.steps.findIndex((s) => s.id === d.stage) : -1;
  return (
    <>
      <ResHero crumbs={[['Careers', '/careers'], ['Your application']]} title="Your application" sub={d ? `${d.role} · sent ${new Date(d.submittedAt).toLocaleDateString()}` : 'Where your application is now.'} icon="M7 8h10a3 3 0 013 3v5a3 3 0 01-3 3H7a3 3 0 01-3-3v-5a3 3 0 013-3zM12 4v4" />
      <section className="ds-soft" style={{ paddingBlock: 'clamp(24px, 3vw, 40px) var(--ds-section-y)' }}>
        <div className="ds-container" style={{ maxWidth: 820 }}>
          {error && <p className="fm-err">{error}</p>}
          {!d && !error && <p>Loading…</p>}
          {d && (
            <div className="ac-card">
              <h2>Hello {d.name.split(' ')[0]}, your application is: {d.stageLabel}</h2>
              {(!d.closed || d.stage === 'hired') && <ol className="pp-check">{d.steps.map((s, i) => <li key={s.id} data-done={i < idx || (i === idx && d.closed && d.stage === 'hired') ? '1' : '0'} style={i === idx ? { outline: '2px solid #8A6CEB' } : undefined}><i>{i < idx && <Icon d={I.check} size={14} stroke={3} />}</i>{s.label}{i === idx && ' (now)'}</li>)}</ol>}
              <p>{d.stage === 'hired' ? 'Congratulations, and welcome to the team!' : d.closed ? 'This application is closed. We emailed you with more details. Thank you for applying.' : 'We’ll email you whenever there’s news. You can come back to this page any time.'}</p>
              <Link className="ds-link" to="/careers#roles">See other open roles →</Link>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

/** /unsubscribe?e=…&s=… — one-click unsubscribe from product updates. */
export function UnsubscribePage() {
  const [params] = useSearchParams();
  const [state, setState] = useState<'idle' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');
  const e = params.get('e') ?? ''; const s = params.get('s') ?? '';
  return (
    <>
      <ResHero crumbs={[['Home', '/'], ['Unsubscribe']]} title="Unsubscribe" sub="Stop receiving product updates by email." icon="M3 6h18v12H3zM3 7l9 6 9-6" />
      <section className="ds-soft" style={{ paddingBlock: 'clamp(24px, 3vw, 40px) var(--ds-section-y)' }}>
        <div className="ds-container" style={{ maxWidth: 680 }}>
          <div className="ac-card">
            {state === 'done' ? <><h2>You’re unsubscribed</h2><p>{e} won’t get product updates any more. You can subscribe again from the Resources page.</p></> : (
              <>
                <h2>Unsubscribe {e || 'this address'}?</h2>
                {error && <p className="fm-err">{error}</p>}
                <button type="button" className="ds-btn ds-btn-grad" onClick={async () => { try { await api.unsubscribe(e, s); setState('done'); } catch (er) { setError((er as Error).message); setState('error'); } }}>Unsubscribe</button>
              </>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

/** /verify?token=… — confirms a customer's email address (link from the welcome email). */
export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [state, setState] = useState<'idle' | 'working' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');
  async function confirm() {
    setState('working'); setError('');
    try { await api.verifyEmail(token); setState('done'); } catch (er) { setError((er as Error).message); setState('error'); }
  }
  return (
    <>
      <ResHero crumbs={[['Home', '/'], ['Confirm email']]} title="Confirm your email" sub="One click to finish setting up your account." icon="M3 6h18v12H3zM3 7l9 6 9-6" />
      <section className="ds-soft" style={{ paddingBlock: 'clamp(24px, 3vw, 40px) var(--ds-section-y)' }}>
        <div className="ds-container" style={{ maxWidth: 680 }}>
          <div className="ac-card">
            {state === 'done' ? (
              <><h2>Thank you, your email is confirmed</h2><p>Your requests and other details sent with this address now appear in My account.</p><Link className="ds-btn ds-btn-grad" to="/account">Go to My account</Link></>
            ) : !token ? (
              <><h2>This link is incomplete</h2><p>Open the link from your email again, or sign in and ask for a new one from My account.</p></>
            ) : (
              <>
                <h2>Confirm this email address?</h2>
                {error && <p className="fm-err" role="alert">{error}</p>}
                {/* A button rather than confirming on page load, so email scanners that open links don't use it up. */}
                <button type="button" className="ds-btn ds-btn-grad" disabled={state === 'working'} onClick={() => void confirm()}>{state === 'working' ? 'Confirming…' : 'Confirm my email'}</button>
              </>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

/** /community — request an invitation to the community. */
export function CommunityPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  async function submit(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault(); setError('');
    const f = Object.fromEntries(new FormData(ev.currentTarget)) as Record<string, string>;
    try { await api.community(f); setSent(true); } catch (er) { setError((er as Error).message); }
  }
  return (
    <>
      <ResHero crumbs={[['Resources', '/resources'], ['Community']]} title="Join the community" sub="Ask questions, share the agents you build and learn from other automation teams." icon="M9 11a3 3 0 100-6 3 3 0 000 6zM3 20v-1a6 6 0 0112 0v1M16 5a3 3 0 010 6M21 20v-1a6 6 0 00-4-5.6" />
      <section className="ds-soft" style={{ paddingBlock: 'clamp(24px, 3vw, 40px) var(--ds-section-y)' }}>
        <div className="ds-container" style={{ maxWidth: 760 }}>
          <div className="fm-card">
            {sent ? <Done title="Thanks, request received." text="We’ll review it and email your invitation shortly." again="Send another request" onAgain={() => setSent(false)} /> : (
              <form className="fm" onSubmit={submit}>
                <Field id="cn" label="Full name" required><input id="cn" name="name" autoComplete="name" required /></Field>
                <Field id="ce" label="Work email" required><input id="ce" name="email" type="email" autoComplete="email" required /></Field>
                <Field id="cc" label="Company" wide><input id="cc" name="company" autoComplete="organization" /></Field>
                <Field id="cm" label="What would you like to get out of the community? (optional)" wide><textarea id="cm" name="message" rows={4} /></Field>
                <button className="ds-btn ds-btn-grad fm-submit" type="submit">Request an invite</button>
                {error && <p role="alert" className="fm-err">{error}</p>}
              </form>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

/** Small inline form to register for an event that has no external registration link. */
export function EventRegister({ event }: { event: string }) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  if (sent) return <span className="ac-pill" style={{ background: '#E3F5EC', color: '#116B3C' }}>You’re registered</span>;
  if (!open) return <button type="button" className="ds-btn ds-btn-grad" onClick={() => setOpen(true)}>Register</button>;
  return (
    <form className="rs-ev-form" onSubmit={async (ev) => { ev.preventDefault(); const f = Object.fromEntries(new FormData(ev.currentTarget)) as Record<string, string>; try { await api.eventRegister({ ...f, event }); setSent(true); } catch (er) { setError((er as Error).message); } }}>
      <label className="ds-sr" htmlFor={`en-${event}`}>Name</label><input id={`en-${event}`} name="name" placeholder="Your name" required />
      <label className="ds-sr" htmlFor={`ee-${event}`}>Email</label><input id={`ee-${event}`} name="email" type="email" placeholder="Work email" required />
      <button className="ds-btn ds-btn-grad" type="submit">Confirm</button>
      {error && <span className="fm-err">{error}</span>}
    </form>
  );
}

/** Public partner directory (active partners who chose to be listed). Hidden while empty. */
export function PartnerDirectory() {
  const [items, setItems] = useState<Awaited<ReturnType<typeof api.directory>>['items'] | null>(null);
  const [type, setType] = useState('');
  useEffect(() => { api.directory().then((r) => setItems(r.items)).catch(() => setItems([])); }, []);
  if (!items || items.length === 0) return null;
  const types = Array.from(new Set(items.map((i) => i.type)));
  const shown = items.filter((i) => !type || i.type === type);
  return (
    <section id="directory" className="ds-paper ds-section">
      <div className="ds-container">
        <div className="hx-head"><div><h2 className="ds-h2">Find a <span className="ds-gradtext">partner</span></h2><p className="ds-lead ds-muted">Approved partners who can help you design, build and run your automation.</p></div></div>
        {types.length > 1 && <div className="cu-filters" style={{ justifyContent: 'flex-start' }}><button type="button" aria-pressed={!type} onClick={() => setType('')}>All</button>{types.map((t) => <button key={t} type="button" aria-pressed={type === t} onClick={() => setType(t)}>{t}</button>)}</div>}
        <div className="pd-grid">
          {shown.map((p) => (
            <article key={p.company} className="pd-card">
              <div className="pd-top"><span className="pd-logo">{p.company.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()}</span><span className="ac-pill">{p.level}</span></div>
              <h3>{p.company}</h3>
              <small>{p.type} · {p.country}</small>
              {p.about && <p>{p.about}</p>}
              {p.website && <a className="ds-link" href={p.website} target="_blank" rel="noopener noreferrer">Visit website ↗</a>}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
