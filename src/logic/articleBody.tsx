import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

type State = { body: string; state: 'ready' | 'loading' | 'signin' | 'missing' };
const cache = new Map<string, string>();

/**
 * An article's text. Lists only carry titles and summaries, so the text is loaded when an article is opened
 * (and kept for the visit). Articles that already include their text (the built-in defaults) use it directly.
 */
export function useArticleBody(id: string | undefined, inline?: string): State {
  const [s, setS] = useState<State>(() => (inline ? { body: inline, state: 'ready' } : id && cache.has(id) ? { body: cache.get(id)!, state: 'ready' } : { body: '', state: 'loading' }));
  useEffect(() => {
    if (inline) { setS({ body: inline, state: 'ready' }); return; }
    if (!id) { setS({ body: '', state: 'missing' }); return; }
    if (cache.has(id)) { setS({ body: cache.get(id)!, state: 'ready' }); return; }
    let live = true;
    setS({ body: '', state: 'loading' });
    fetch(`/api/items/article/${encodeURIComponent(id)}`, { credentials: 'same-origin' })
      .then(async (r) => {
        const j = (await r.json().catch(() => ({}))) as { body?: string; signIn?: boolean };
        if (!live) return;
        if (r.ok) { cache.set(id, j.body ?? ''); setS({ body: j.body ?? '', state: 'ready' }); }
        else setS({ body: '', state: j.signIn ? 'signin' : 'missing' });
      })
      .catch(() => live && setS({ body: '', state: 'missing' }));
    return () => { live = false; };
  }, [id, inline]);
  return s;
}

/** Shows a short message while the text loads, or asks customers to sign in for customers-only articles. */
export function ArticleState({ state }: { state: State['state'] }): ReactNode {
  if (state === 'loading') return <p className="ds-muted" aria-live="polite">Loading the article…</p>;
  if (state === 'signin') return <p>This article is for customers. <Link to="/signin">Sign in</Link> to read it.</p>;
  if (state === 'missing') return <p className="ds-muted">This article isn’t available right now.</p>;
  return null;
}

/** For pages that can't call the hook directly: loads the text and passes it to children. */
export function ArticleText({ id, inline, children }: { id: string; inline?: string; children: (body: string) => ReactNode }) {
  const a = useArticleBody(id, inline);
  return <>{a.state === 'ready' ? children(a.body) : <ArticleState state={a.state} />}</>;
}

/** “Was this helpful?” under an article. A “No” can add a short note on what was missing. */
export function Helpful({ id }: { id: string }) {
  const [step, setStep] = useState<'ask' | 'why' | 'done'>('ask');
  const [note, setNote] = useState('');
  useEffect(() => { setStep('ask'); setNote(''); }, [id]);
  const send = (helpful: boolean, text = '') => fetch(`/api/items/article/${encodeURIComponent(id)}/feedback`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ helpful, note: text }),
  }).catch(() => undefined);
  if (step === 'done') return <p className="rs-helpful" role="status">Thanks for letting us know.</p>;
  if (step === 'why') return (
    <form className="rs-helpful" onSubmit={(e) => { e.preventDefault(); void send(false, note); setStep('done'); }}>
      <label htmlFor={`fb-${id}`}>What was missing or unclear? (optional)</label>
      <textarea id={`fb-${id}`} rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
      <div><button type="submit" className="ds-btn ds-btn-grad">Send</button></div>
    </form>
  );
  return (
    <div className="rs-helpful">
      <span>Was this helpful?</span>
      <button type="button" className="ds-btn ds-btn-line" onClick={() => { void send(true); setStep('done'); }}>Yes</button>
      <button type="button" className="ds-btn ds-btn-line" onClick={() => setStep('why')}>No</button>
    </div>
  );
}
