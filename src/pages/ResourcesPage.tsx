import { useMemo, useState, useEffect } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useResourcesLogic } from '../logic/ResourcesLogic';
import { useResourceData } from '../logic/useResourceData';
import { useCms } from '../cms/CmsContext';
import RD from '../cms/defaults.generated.json';
import { I, Icon } from '../ds/ui';

type Hub = typeof RD['resources.hub'];
type Insight = { kind: string; title: string; summary: string; meta: string; url: string; cta: string; featured?: boolean };
type Hit = { kind: string; title: string; sub: string; to: string };

function SmartLink({ to, className, children }: { to: string; className?: string; children: ReactNode }) {
  return /^https?:/.test(to) ? <a className={className} href={to} target="_blank" rel="noopener noreferrer">{children}</a> : <Link className={className} to={to}>{children}</Link>;
}

const DOOR_ICONS = {
  support: 'M4 14v-2a8 8 0 0116 0v2M3 14h4v6H3zM17 14h4v6h-4z',
  events: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4M8 14h3',
  blog: 'M4 4h16v16H4zM8 8h8M8 12h8M8 16h5',
  docs: 'M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zM4 19V5M8 7h7M8 11h5',
  faq: 'M12 21a9 9 0 100-18 9 9 0 000 18zM9.5 9a2.5 2.5 0 015 .5c0 1.5-2.5 2-2.5 3.5M12 17h.01',
  training: 'M2 9l10-5 10 5-10 5zM6 11v5c3 2 9 2 12 0v-5',
};

export default function ResourcesPage() {
  const v = useResourcesLogic();
  const d = useResourceData();
  const cms = useCms();
  const hub = { ...RD['resources.hub'], ...cms<Partial<Hub>>('resources.hub', {}) } as Hub;
  const insights = cms<Insight[]>('resources.insights', RD['resources.insights'] as Insight[]);
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  const chapters = d.groups.reduce((n, g) => n + g.chapters.length, 0);
  // Full-text results from the server (article text, blog, events too); until they arrive, the quick
  // on-page matches below are shown, and they stay if the server can't be reached.
  const [server, setServer] = useState<{ q: string; hits: Hit[] } | null>(null);
  useEffect(() => {
    const t = q.trim();
    if (t.length < 2) { setServer(null); return; }
    const ctl = new AbortController();
    const timer = window.setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(t)}`, { signal: ctl.signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((j: { results?: Hit[] } | null) => { if (j?.results) setServer({ q: t, hits: j.results.slice(0, 8) }); })
        .catch(() => undefined);
    }, 250);
    return () => { window.clearTimeout(timer); ctl.abort(); };
  }, [q]);
  const quick = useMemo<Hit[]>(() => {
    const t = q.trim().toLowerCase();
    if (t.length < 2) return [];
    const hits: Hit[] = [];
    d.groups.forEach((g) => g.chapters.forEach((a) => { if ((a.title + ' ' + a.summary).toLowerCase().includes(t)) hits.push({ kind: 'Docs · ' + g.title, title: a.title, sub: a.summary, to: `/resources/docs/${g.id}/${encodeURIComponent(a.id)}` }); }));
    d.faqs.forEach((f) => { if ((f.q + ' ' + f.a).toLowerCase().includes(t)) hits.push({ kind: 'FAQ', title: f.q, sub: d.productTitle(f.product) || 'General', to: `/resources/faqs?q=${encodeURIComponent(f.q)}` }); });
    d.training.forEach((x) => { if ((x.title + ' ' + x.summary).toLowerCase().includes(t)) hits.push({ kind: 'Training · ' + x.kind, title: x.title, sub: x.summary, to: x.url }); });
    return hits.slice(0, 8);
  }, [q, d.groups, d.faqs, d.training, d]);
  const results = server && server.q === q.trim() ? server.hits : quick;

  const events = cms<{ date: string }[]>('resources.events', RD['resources.events'] as { date: string }[]);
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = events.filter((e) => (e.date || '9999') >= today).length;
  const doors = [
    { key: 'docs', to: '/resources/docs', title: hub.docsTitle, text: hub.docsText, count: `${d.groups.length} products · ${chapters} chapters`, cta: 'Open the documentation' },
    { key: 'faq', to: '/resources/faqs', title: hub.faqTitle, text: hub.faqText, count: `${d.faqs.length} questions`, cta: 'Find an answer' },
    { key: 'training', to: '/resources/training', title: hub.trainingTitle, text: hub.trainingText, count: `${d.training.length} courses, videos and documents`, cta: 'Start learning' },
    { key: 'support', to: '/resources/support', title: hub.supportTitle, text: hub.supportCardText, count: 'Email, phone and request form', cta: 'Get help' },
    { key: 'events', to: '/resources/events', title: hub.eventsTitle, text: hub.eventsText, count: upcoming ? `${upcoming} upcoming` : 'New dates announced soon', cta: 'See events' },
    { key: 'blog', to: '/resources/blog', title: hub.blogTitle, text: hub.blogText, count: insights.length ? `${insights.length} posts and downloads` : 'First posts coming soon', cta: 'Read the blog' },
  ] as const;

  return (
    <>
      <section id="overview" className="hz-hero rs-hero">
        <div className="ds-container rs-hero-in">
          <p className="ab-kicker"><Icon d={DOOR_ICONS.docs} size={20} />Resources</p>
          <h1 className="pf-h1">{hub.heroA} <span className="ds-gradtext">{hub.heroB}</span></h1>
          <p className="cu-lead">{hub.heroSub}</p>
          <form className="rs-search" role="search" onSubmit={(e) => { e.preventDefault(); if (results[0]) navigate(results[0].to); }}>
            <label htmlFor="rs-q" className="ds-sr">Search resources</label>
            <Icon d="M11 4a7 7 0 100 14 7 7 0 000-14zM20 20l-4-4" size={22} />
            <input id="rs-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={hub.searchHint} autoComplete="off" />
            {q.trim().length >= 2 && (
              <div className="rs-results" aria-label="Matching results">
                {results.length === 0 && <p>No results for that search. Try another word, or <Link to="/contact">ask our team</Link>.</p>}
                {results.map((r) => <SmartLink key={r.kind + r.title} to={r.to}><em>{r.kind}</em><b>{r.title}</b><small>{r.sub}</small></SmartLink>)}
              </div>
            )}
          </form>
          {hub.popular?.length > 0 && <div className="hz-try"><span>Popular:</span>{hub.popular.map((p) => <button key={p} type="button" onClick={() => setQ(p)}>{p}</button>)}</div>}
        </div>
        <svg className="hz-curve" viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden="true"><path d="M0 90 L0 44 Q720 -28 1440 44 L1440 90 Z" fill="#F4F6FD" /></svg>
      </section>

      <section className="ds-soft" style={{ paddingTop: 'clamp(16px, 2vw, 28px)', paddingBottom: 'var(--ds-section-y)' }}>
        <div className="ds-container rs-doors">
          {doors.map((x, k) => (
            <Link key={x.key} to={x.to} data-k={k} data-small={k > 2 ? '1' : '0'} style={{ '--k': k } as CSSProperties}>
              <i><Icon d={DOOR_ICONS[x.key]} size={k > 2 ? 26 : 34} /></i>
              <h2>{x.title}</h2>
              <p>{x.text}</p>
              <small>{x.count}</small>
              <em>{x.cta} <Icon d={I.arrow} size={18} stroke={2.4} /></em>
            </Link>
          ))}
        </div>
      </section>

      {hub.showCommunity && (
        <section id="community" className="ds-paper" style={{ paddingBottom: 'var(--ds-section-y)', paddingTop: 0 }}>
          <div className="ds-container rs-comm rs-comm-2">
            <div data-tone="0">
              <i><Icon d="M9 11a3 3 0 100-6 3 3 0 000 6zM3 20v-1a6 6 0 0112 0v1M16 5a3 3 0 010 6M21 20v-1a6 6 0 00-4-5.6" size={26} /></i>
              <h2>{hub.communityTitle}</h2><p>{hub.communityText}</p>
              <SmartLink className="ds-btn ds-btn-white" to={hub.communityUrl || '/contact'}>{hub.communityCta}</SmartLink>
            </div>
            <div data-tone="1">
              <i><Icon d={I.mail} size={26} /></i>
              <h2>{hub.newsTitle}</h2><p>{hub.newsText}</p>
              {v.subOpen && (
                <form onSubmit={v.subscribe} className="rs-news">
                  <label htmlFor="nl" className="ds-sr">Work email</label>
                  <input required id="nl" name="nl" type="email" autoComplete="email" placeholder="Work email" />
                  <button type="submit" className="ds-btn ds-btn-white" disabled={v.busy}>Subscribe</button>
                  {v.error && <p role="alert" className="fm-err">{v.error}</p>}
                </form>
              )}
              {v.subDone && <p className="rs-done"><Icon d={I.check} size={18} stroke={3} />You’re subscribed. Look out for our next update.</p>}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
