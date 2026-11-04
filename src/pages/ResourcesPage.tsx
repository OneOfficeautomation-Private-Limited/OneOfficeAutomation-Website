import { useMemo, useState, useEffect } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useResourcesLogic } from '../logic/ResourcesLogic';
import { useResourceData } from '../logic/useResourceData';
import { useCms } from '../cms/CmsContext';
import RD from '../cms/defaults.generated.json';
import { I, Icon, useTypedPlaceholder } from '../ds/ui';

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
  toolkits: 'M4 7h16v12H4zM9 7V5h6v2M4 12h16',
  webinars: 'M3 5h18v12H3zM8 21h8M10 9l5 3-5 3z',
  community: 'M9 11a3 3 0 100-6 3 3 0 000 6zM3 20v-1a6 6 0 0112 0v1M16 5a3 3 0 010 6M21 20v-1a6 6 0 00-4-5.6',
  trust: 'M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7zM9 12l2 2 4-4',
  stories: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  platform: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5M3 17.5l9 5 9-5',
  solutions: 'M4 7h16v13H4zM9 7V4h6v3M4 12h16',
  pricing: 'M12 3v18M17 7H9.5a3 3 0 000 6h5a3 3 0 010 6H6',
  partners: 'M8 12l3 3 5-5M3 12l4-4 3 2 4-3 3 2 4 3-6 6-3-2-3 2z',
};

/* The tabs: what a visitor came to do. Each one has its own address (#learn, #help, #why). */
const TABS = [
  { id: 'learn', label: 'Learn and build', short: 'Learn', icon: 'M2 9l10-5 10 5-10 5zM6 11v5c3 2 9 2 12 0v-5', lead: 'Install, build and run your agents, at your own pace.' },
  { id: 'help', label: 'Get help', short: 'Help', icon: 'M4 14v-2a8 8 0 0116 0v2M3 14h4v6H3zM17 14h4v6h-4z', lead: 'Answers, people and the community, when you need them.' },
  { id: 'why', label: 'Why OneOfficeAutomation', short: 'Why us', icon: 'M4 20V10M10 20V4M16 20v-7M22 20H2', lead: 'See the platform at work for teams like yours.' },
] as const;
type TabId = typeof TABS[number]['id'];

export default function ResourcesPage() {
  const v = useResourcesLogic();
  const d = useResourceData();
  const cms = useCms();
  const hub = { ...RD['resources.hub'], ...cms<Partial<Hub>>('resources.hub', {}) } as Hub;
  const insights = cms<Insight[]>('resources.insights', RD['resources.insights'] as Insight[]);
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [typingIn, setTyping] = useState(false);
  const typed = useTypedPlaceholder(hub.popular ?? [], typingIn || q !== '');
  const { hash } = useLocation();
  const fromHash = TABS.find((t) => '#' + t.id === hash)?.id;
  const [tab, setTab] = useState<TabId>(fromHash ?? 'learn');
  useEffect(() => { if (fromHash) setTab(fromHash); }, [fromHash]);
  const pickTab = (id: TabId) => { setTab(id); window.history.replaceState(null, '', '#' + id); };

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
  const cards: Record<TabId, { key: keyof typeof DOOR_ICONS; to: string; title: string; text: string; meta: string }[]> = {
    learn: [
      { key: 'docs', to: '/resources/docs', title: hub.docsTitle, text: hub.docsText, meta: `${d.groups.length} products · ${chapters} chapters` },
      { key: 'training', to: '/resources/training', title: hub.trainingTitle, text: hub.trainingText, meta: `${d.training.length} courses, videos and documents` },
      { key: 'toolkits', to: '/resources/toolkits', title: 'Toolkits', text: 'Ready-made actions for Excel, email, PDFs and the apps you already use.', meta: 'Browse the actions' },
      { key: 'webinars', to: '/resources/webinars', title: 'Webinars', text: 'Expert-led sessions, live and on demand.', meta: 'Watch any time' },
      { key: 'events', to: '/resources/events', title: hub.eventsTitle, text: hub.eventsText, meta: upcoming ? `${upcoming} upcoming` : 'New dates announced soon' },
      { key: 'blog', to: '/resources/blog', title: hub.blogTitle, text: hub.blogText, meta: insights.length ? `${insights.length} posts and downloads` : 'First posts coming soon' },
    ],
    help: [
      { key: 'support', to: '/resources/support', title: hub.supportTitle, text: hub.supportCardText, meta: 'Email, phone and request form' },
      { key: 'faq', to: '/resources/faqs', title: hub.faqTitle, text: hub.faqText, meta: `${d.faqs.length} questions answered` },
      { key: 'community', to: hub.communityUrl || '/community', title: hub.communityTitle, text: hub.communityText, meta: 'Ask, share and learn' },
      { key: 'trust', to: '/trust', title: 'Trust and security', text: 'How we protect your data, our certifications and policies.', meta: 'Security, privacy, compliance' },
    ],
    why: [
      { key: 'stories', to: '/customers', title: 'Customer stories', text: 'What finance, operations and service teams achieved, and by how much.', meta: 'Real results' },
      { key: 'platform', to: '/platform', title: 'Platform tour', text: 'Every part of the platform and how they work together.', meta: 'See how it works' },
      { key: 'solutions', to: '/solutions', title: 'Solutions by industry', text: 'The processes teams in your industry automate first.', meta: 'Find your industry' },
      { key: 'pricing', to: '/pricing', title: 'Pricing', text: 'Plans for every size, with a free plan to start.', meta: 'Compare plans' },
      { key: 'partners', to: '/partners', title: 'Partners', text: 'Find a partner to build with, or become one.', meta: 'Partner network' },
    ],
  };
  const cur = TABS.find((t) => t.id === tab)!;

  return (
    <>
      {/* Hero: short, with search first, so the choices below are on the first screen. */}
      <section id="overview" className="hz-hero rs-hero rs-hub">
        <div className="ds-container rs-hub-in">
          <h1 className="pf-h1">{hub.heroA} <span className="ds-gradtext">{hub.heroB}</span></h1>
          <p className="cu-lead">{hub.heroSub}</p>
          <form className="rs-search" role="search" onSubmit={(e) => { e.preventDefault(); if (results[0]) navigate(results[0].to); }}>
            <label htmlFor="rs-q" className="ds-sr">Search resources</label>
            <Icon d="M11 4a7 7 0 100 14 7 7 0 000-14zM20 20l-4-4" size={22} />
            <input id="rs-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => setTyping(true)} onBlur={() => setTyping(false)}
              placeholder={typed ? `Try “${typed}”` : hub.searchHint} aria-label={hub.searchHint} autoComplete="off" />
            {q.trim().length >= 2 && (
              <div className="rs-results" aria-label="Matching results">
                {results.length === 0 && <p>No results for that search. Try another word, or <Link to="/contact">ask our team</Link>.</p>}
                {results.map((r) => <SmartLink key={r.kind + r.title} to={r.to}><em>{r.kind}</em><b>{r.title}</b><small>{r.sub}</small></SmartLink>)}
              </div>
            )}
          </form>
          {hub.popular?.length > 0 && <div className="hz-try"><span>Popular:</span>{hub.popular.map((p) => <button key={p} type="button" aria-pressed={q === p} onClick={() => setQ(p)}>{p}</button>)}</div>}
        </div>
        <svg className="hz-curve" viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden="true"><path d="M0 90 L0 44 Q720 -28 1440 44 L1440 90 Z" fill="#F4F6FD" /></svg>
      </section>

      {/* Everything in one place, grouped by what the visitor came to do. */}
      <section className="ds-soft rs-lib">
        <div className="ds-container">
          <div className="rs-tabs" role="tablist" aria-label="Resources by need">
            {TABS.map((t) => (
              <button key={t.id} id={`tab-${t.id}`} type="button" role="tab" aria-selected={tab === t.id} aria-controls="rs-panel" tabIndex={tab === t.id ? 0 : -1}
                onClick={() => pickTab(t.id)}
                onKeyDown={(e) => {
                  const k = TABS.findIndex((x) => x.id === t.id);
                  const n = e.key === 'ArrowRight' ? k + 1 : e.key === 'ArrowLeft' ? k - 1 : null;
                  if (n === null) return;
                  e.preventDefault();
                  const next = TABS[(n + TABS.length) % TABS.length].id;
                  pickTab(next); document.getElementById(`tab-${next}`)?.focus();
                }}>
                <Icon d={t.icon} size={18} /><span className="rs-tab-l">{t.label}</span><span className="rs-tab-s" aria-hidden="true">{t.short}</span>
              </button>
            ))}
          </div>
          <div id="rs-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="rs-panel" key={tab}>
            <p className="rs-panel-lead">{cur.lead}</p>
            <div className="rs-cards">
              {cards[tab].map((x, k) => (
                <SmartLink key={x.key} to={x.to} className="rs-card">
                  <i style={{ '--k': k } as CSSProperties}><Icon d={DOOR_ICONS[x.key]} size={24} /></i>
                  <h2>{x.title}</h2>
                  <p>{x.text}</p>
                  <span>{x.meta}<Icon d={I.arrow} size={16} stroke={2.4} /></span>
                </SmartLink>
              ))}
            </div>
          </div>
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
      {/* Didn't find it: people to talk to. */}
      <section className="ds-paper rs-ask-sec">
        <div className="ds-container">
          <div className="ask-strip">
            <div><h2>Can’t find what you need?</h2><p>Our team answers within one business day, and a demo shows the platform on your own process.</p></div>
            <div className="ds-actions">
              <Link className="ds-btn ds-btn-white" to="/contact">Talk to us</Link>
              <Link className="ds-btn ds-btn-outline" to="/contact">Book a demo</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
