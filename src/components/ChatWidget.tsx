import { Fragment, useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../auth/api';

type Plan = { id: string; name: string; price: string; per: string; who: string; href: string };
type Reply = {
  reply: string; sources: { title: string; to: string }[]; suggestions: string[]; action: null | 'lead' | 'plans' | 'handoff';
  answered: boolean; plans?: Plan[]; contact?: { sales: string; support: string; phones: string[] };
};
type Msg = { id: number; from: 'me' | 'bot'; text: string; data?: Reply; typing?: boolean; rated?: 'up' | 'down' };

const KEY = 'ooa-chat';
const HELLO: Msg = {
  id: 1, from: 'bot', text: 'Hi! I’m the OneOffice Assistant (an automated helper, not a person). Ask me about the platform, pricing, security or set-up, or pick one below.',
  data: { reply: '', sources: [], suggestions: ['What does the platform do?', 'How much does it cost?', 'Help me choose a plan', 'Is my data secure?', 'Book a demo', 'Talk to a person'], action: null, answered: true },
};
const PLAN_FOR: Record<string, string> = { 'Just me': 'community', 'A small team': 'starter', 'A department': 'business', 'The whole company': 'enterprise' };

// Safe, minimal formatting: **bold**, "- " bullets and [links](/path) are the only things the bot's text can contain. Everything else stays plain text.
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => (part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>));
}
function Rich({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  const flush = () => { if (list.length) { blocks.push(<ul key={`u${blocks.length}`}>{list.map((l, i) => <li key={i}>{inline(l)}</li>)}</ul>); list = []; } };
  text.split('\n').forEach((line) => {
    if (/^- /.test(line)) list.push(line.slice(2));
    else { flush(); if (line.trim()) blocks.push(<p key={`p${blocks.length}`}>{inline(line)}</p>); }
  });
  flush();
  return <>{blocks}</>;
}

function LeadForm({ onDone }: { onDone: (ok: boolean, name?: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const full = String(f.get('name') ?? '').trim().split(/\s+/);
    if (full.length < 2) { setErr('Please enter your first and last name.'); return; }
    setBusy(true); setErr('');
    try {
      await api.lead('demo', { fn: full[0], ln: full.slice(1).join(' '), em: String(f.get('em') ?? ''), ph: String(f.get('ph') ?? ''), co: String(f.get('co') ?? ''), pr: `Asked for a demo through the website assistant. ${String(f.get('pr') ?? '')}`.trim() });
      onDone(true, full[0]);
    } catch (x) { setErr(x instanceof Error ? x.message : 'Something went wrong. Please try again.'); setBusy(false); }
  };
  return (
    <form className="cb-form" onSubmit={submit} noValidate={false}>
      <label>Full name<input name="name" required autoComplete="name" maxLength={80} /></label>
      <label>Work email<input name="em" type="email" required autoComplete="email" maxLength={120} /></label>
      <label>Phone<input name="ph" type="tel" required inputMode="tel" autoComplete="tel" minLength={7} maxLength={25} pattern="[0-9+()\-. ]{7,25}" title="Include the country code, e.g. +91 98765 43210" /></label>
      <label>Company<input name="co" required autoComplete="organization" maxLength={100} /></label>
      <label>What would you like to automate? (optional)<input name="pr" maxLength={200} /></label>
      <p className="cb-fine">We use these details only to arrange your demo. See our <Link to="/privacy">privacy policy</Link>.</p>
      {err && <p className="cb-err" role="alert">{err}</p>}
      <button className="ds-btn ds-btn-grad" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Request my demo'}</button>
      <button className="cb-link" type="button" onClick={() => onDone(false)}>Cancel</button>
    </form>
  );
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>(() => {
    try { const s = sessionStorage.getItem(KEY); if (s) { const m = JSON.parse(s) as Msg[]; if (Array.isArray(m) && m.length) return m.map((x) => ({ ...x, typing: false })); } } catch { /* private mode */ }
    return [HELLO];
  });
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(false);
  const log = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const fab = useRef<HTMLButtonElement>(null);
  const nextId = useRef(msgs.reduce((m, x) => Math.max(m, x.id), 1) + 1);
  const reduce = useRef(typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  useEffect(() => { try { sessionStorage.setItem(KEY, JSON.stringify(msgs.slice(-40))); } catch { /* ignore */ } }, [msgs]);
  useEffect(() => { const el = log.current; if (el) el.scrollTop = el.scrollHeight; }, [msgs, form, open]);
  useEffect(() => { if (open) { document.documentElement.dataset.chat = '1'; input.current?.focus(); } else delete document.documentElement.dataset.chat; return () => { delete document.documentElement.dataset.chat; }; }, [open]);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); fab.current?.focus(); } };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open]);
  useEffect(() => { const o = () => setOpen(true); window.addEventListener('ooa-chat-open', o); return () => window.removeEventListener('ooa-chat-open', o); }, []);

  const push = useCallback((m: Omit<Msg, 'id'>) => { const id = nextId.current++; setMsgs((x) => [...x, { ...m, id }]); return id; }, []);

  // The bot's reply appears word by word, like someone typing (all at once when the visitor prefers less motion).
  const reveal = useCallback((id: number, full: string) => {
    if (reduce.current) { setMsgs((x) => x.map((m) => (m.id === id ? { ...m, text: full, typing: false } : m))); return; }
    const words = full.split(/(\s+)/); let i = 0;
    const step = () => {
      i = Math.min(words.length, i + 3);
      setMsgs((x) => x.map((m) => (m.id === id ? { ...m, text: words.slice(0, i).join(''), typing: i < words.length } : m)));
      if (i < words.length) window.setTimeout(step, 28);
    };
    step();
  }, []);

  const ask = useCallback(async (q: string) => {
    const t = q.trim();
    if (!t || busy) return;
    setForm(false); setText('');
    push({ from: 'me', text: t });
    setBusy(true);
    const id = push({ from: 'bot', text: '', typing: true });
    try {
      const r = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: t.slice(0, 300) }) });
      const d = (await r.json().catch(() => ({}))) as Reply & { error?: string };
      if (!r.ok) throw new Error(d.error || 'The assistant is unavailable right now.');
      setMsgs((x) => x.map((m) => (m.id === id ? { ...m, data: d } : m)));
      if (d.action === 'lead') setForm(true);
      reveal(id, d.reply);
    } catch (e) {
      setMsgs((x) => x.map((m) => (m.id === id ? { ...m, typing: false, text: `${e instanceof Error ? e.message : 'Something went wrong.'} You can also email us or book a demo.`, data: { reply: '', sources: [{ title: 'Contact us', to: '/contact' }], suggestions: [], action: null, answered: false } } : m)));
    } finally { setBusy(false); }
  }, [busy, push, reveal]);

  const rate = (m: Msg, v: 'up' | 'down') => {
    setMsgs((x) => x.map((y) => (y.id === m.id ? { ...y, rated: v } : y)));
    if (v === 'down') {
      const q = [...msgs].reverse().find((y) => y.id < m.id && y.from === 'me')?.text;
      if (q) void fetch('/api/chat/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: q.slice(0, 250) }) }).catch(() => undefined);
    }
  };
  const reset = () => { setMsgs([HELLO]); setForm(false); try { sessionStorage.removeItem(KEY); } catch { /* ignore */ } };
  const last = msgs[msgs.length - 1];

  return (
    <>
      {!open && (
        <button ref={fab} className="cb-fab" type="button" onClick={() => setOpen(true)} aria-label="Open OneOffice Assistant" aria-haspopup="dialog">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H11l-4.2 3.6a.6.6 0 0 1-1-.46V16h-.3A2.5 2.5 0 0 1 4 13.5z" fill="currentColor" /><circle cx="9" cy="9.5" r="1.1" fill="#171F4A" /><circle cx="12" cy="9.5" r="1.1" fill="#171F4A" /><circle cx="15" cy="9.5" r="1.1" fill="#171F4A" /></svg>
          <span>Ask us</span>
        </button>
      )}
      {open && (
        <section className="cb" role="dialog" aria-label="OneOffice Assistant" aria-modal="false">
          <header className="cb-h">
            <span className="cb-av" aria-hidden="true">OA</span>
            <div><strong>OneOffice Assistant</strong><small>Automated · answers from our docs</small></div>
            <button type="button" className="cb-x" onClick={reset} aria-label="Start a new conversation" title="New conversation">↺</button>
            <button type="button" className="cb-x" onClick={() => { setOpen(false); window.setTimeout(() => fab.current?.focus(), 0); }} aria-label="Close chat">✕</button>
          </header>
          <div className="cb-log" ref={log} role="log" aria-live="polite" aria-relevant="additions text">
            {msgs.map((m) => (
              <div key={m.id} className={`cb-m cb-${m.from}`}>
                {m.from === 'bot' && m.text === '' && m.typing ? <span className="cb-dots" aria-label="Typing"><i /><i /><i /></span> : <div className="cb-b"><Rich text={m.text} /></div>}
                {m.from === 'bot' && !m.typing && m.data && (
                  <>
                    {m.data.action === 'plans' && m.data.plans && m === last && (
                      <div className="cb-chips">
                        {Object.keys(PLAN_FOR).map((k) => <button key={k} type="button" onClick={() => {
                          const p = m.data!.plans!.find((x) => x.id === PLAN_FOR[k]);
                          if (!p) return;
                          push({ from: 'me', text: k });
                          const id = push({ from: 'bot', text: '', typing: true });
                          const per = p.per ? ` ${p.per}` : '';
                          setMsgs((x) => x.map((y) => (y.id === id ? { ...y, data: { reply: '', sources: [{ title: `${p.name}: get started`, to: p.href || '/pricing' }, { title: 'Compare every plan', to: '/pricing#compare' }], suggestions: ['Book a demo', `What does ${p.name} include?`], action: null, answered: true } } : y)));
                          reveal(id, `I’d suggest **${p.name}** (${p.price}${per}). ${p.who}.`);
                        }}>{k}</button>)}
                      </div>
                    )}
                    {m.data.action === 'handoff' && m.data.contact && (
                      <div className="cb-card">
                        <Link to="/contact" className="ds-btn ds-btn-grad" onClick={() => setOpen(false)}>Book a demo</Link>
                        {m.data.contact.support && <a className="ds-btn ds-btn-outline" href={`mailto:${m.data.contact.support}`}>Email {m.data.contact.support}</a>}
                      </div>
                    )}
                    {m.data.sources.length > 0 && (
                      <div className="cb-src"><span>Read more</span>{m.data.sources.map((s) => <Link key={s.to + s.title} to={s.to} onClick={() => setOpen(false)}>{s.title}</Link>)}</div>
                    )}
                    {m.data.reply && m.id > 1 && !m.rated && (
                      <div className="cb-rate" aria-label="Was this helpful?"><button type="button" onClick={() => rate(m, 'up')} aria-label="Helpful">👍</button><button type="button" onClick={() => rate(m, 'down')} aria-label="Not helpful">👎</button></div>
                    )}
                    {m.rated && <small className="cb-thx">{m.rated === 'up' ? 'Thanks for the feedback.' : 'Thanks, we’ll use this to improve.'}</small>}
                    {m === last && m.data.suggestions.length > 0 && !busy && (
                      <div className="cb-chips">{m.data.suggestions.map((s) => <button key={s} type="button" onClick={() => void ask(s)}>{s}</button>)}</div>
                    )}
                  </>
                )}
              </div>
            ))}
            {form && !busy && last?.from === 'bot' && !last.typing && (
              <div className="cb-m cb-bot"><LeadForm onDone={(ok, name) => {
                setForm(false);
                if (ok) { const id = push({ from: 'bot', text: '', typing: true }); setMsgs((x) => x.map((y) => (y.id === id ? { ...y, data: { reply: '', sources: [], suggestions: ['What does the platform do?', 'How much does it cost?'], action: null, answered: true } } : y))); reveal(id, `Thank you${name ? `, ${name}` : ''}! Your request is with our team and we’ll reply within one business day.`); }
              }} /></div>
            )}
          </div>
          <form className="cb-in" onSubmit={(e) => { e.preventDefault(); void ask(text); }}>
            <input ref={input} value={text} onChange={(e) => setText(e.target.value)} maxLength={300} placeholder="Ask a question…" aria-label="Your question" autoComplete="off" enterKeyHint="send" />
            <button type="submit" disabled={busy || !text.trim()} aria-label="Send">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3.4 20.4 21 12 3.4 3.6l.1 6.5L15 12 3.5 13.9z" fill="currentColor" /></svg>
            </button>
          </form>
          <p className="cb-note">Automated assistant. For anything urgent, <Link to="/contact" onClick={() => setOpen(false)}>contact the team</Link>.</p>
        </section>
      )}
    </>
  );
}
