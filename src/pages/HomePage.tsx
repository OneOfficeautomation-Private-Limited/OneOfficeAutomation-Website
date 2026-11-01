import { useEffect, useState } from 'react';
import type { FormEvent, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMainLogic } from '../logic/MainLogic';
import { useCms } from '../cms/CmsContext';
import PD from '../cms/defaults.generated.json';
import { usePageText, Hi, Go } from '../cms/pageText';
import { LogoMark } from '../ds/LogoMark';

/* Line icons in the site's existing style (24px grid). */
const P = {
  spark: 'M12 3l1.8 4.7 4.7 1.8-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8zM19 15l.8 2 2 .8-2 .8L19 21l-.8-2.4-2-.8 2-.8z',
  agent: 'M7 8h10a3 3 0 013 3v5a3 3 0 01-3 3H7a3 3 0 01-3-3v-5a3 3 0 013-3zM12 4v4M9.5 13h.01M14.5 13h.01M9.5 16h5',
  flow: 'M4 5h6v5H4zM14 14h6v5h-6zM7 10v3a2 2 0 002 2h5',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  bank: 'M3 10l9-6 9 6M5 10v9M19 10v9M9 10v9M15 10v9M3 21h18',
  heart: 'M12 20s-7-4.5-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.5-7 10-7 10z',
  factory: 'M3 21V10l5 3V10l5 3V7l8 4v10z',
  cart: 'M4 6h16l-2 9H6zM9 19.5h.01M16 19.5h.01',
  truck: 'M2 7h12v9H2zM14 10h4l3 3v3h-7zM6 18.5h.01M17 18.5h.01',
  shield: 'M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7zM9 12l2 2 4-4',
};

function Icon({ d, size = 20, stroke = 1.8 }: { d: string; size?: number; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

function Logo({ width = 40 }: { width?: number }) {
  return <LogoMark width={width} />;
}


/* Hero picture: the OneOfficeAutomation rings, large and simple. */
function HeroMark() {
  return (
    <div className="hz-mark" aria-hidden="true">
      <svg viewBox="0 0 520 520">
        <defs>
          <linearGradient id="hzRA" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#5FA8FF" /><stop offset="1" stopColor="#1F5FC9" /></linearGradient>
          <linearGradient id="hzRB" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#B99CFF" /><stop offset="1" stopColor="#6D4AD8" /></linearGradient>
          <filter id="hzGlow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="28" /></filter>
          <clipPath id="hzKnot"><rect x="215" y="80" width="90" height="95" /></clipPath>
        </defs>
        <g filter="url(#hzGlow)" opacity=".55">
          <circle cx="190" cy="260" r="150" fill="none" stroke="#3B8BE0" strokeWidth="44" />
          <circle cx="330" cy="260" r="150" fill="none" stroke="#8B6CF0" strokeWidth="44" />
        </g>
        <circle cx="190" cy="260" r="150" fill="none" stroke="url(#hzRA)" strokeWidth="44" />
        <circle cx="330" cy="260" r="150" fill="none" stroke="url(#hzRB)" strokeWidth="44" />
        <circle cx="190" cy="260" r="150" fill="none" stroke="url(#hzRA)" strokeWidth="44" clipPath="url(#hzKnot)" />
      </svg>
    </div>
  );
}

const IND: [string, string][] = [
  ['Banking', 'M3 10l9-6 9 6M5 10v9M19 10v9M9 10v9M15 10v9M3 21h18'],
  ['Insurance', 'M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7zM9 12l2 2 4-4'],
  ['Healthcare', 'M12 20s-7-4.5-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.5-7 10-7 10z'],
  ['Manufacturing', 'M3 21V10l5 3V10l5 3V7l8 4v10z'],
  ['Retail', 'M4 6h16l-2 9H6zM9 19.5h.01M16 19.5h.01'],
  ['Logistics', 'M2 7h12v9H2zM14 10h4l3 3v3h-7zM6 18.5h.01M17 18.5h.01'],
  ['Telecom', 'M12 21V11M8.5 7.5a5 5 0 017 0M5.5 4.5a9 9 0 0113 0M12 11a1.5 1.5 0 100-3 1.5 1.5 0 000 3z'],
  ['Public sector', 'M3 21h18M5 21V10h14v11M9 21v-6h6v6M12 3l9 6H3z'],
  ['Utilities', 'M13 2L4 14h7l-1 8 9-12h-7z'],
];

type Article = { id: string; category: string; title: string; summary: string; meta?: string; featured?: boolean };
const ARTICLES_FALLBACK: Article[] = [
  { id: 'intro', category: 'get-started', title: 'Platform overview', summary: 'A tour of OneOfficeAutomation and how its four parts fit together.', meta: '6 min read' },
  { id: 'studio-first', category: 'get-started', title: 'Build your first agent', summary: 'Design, test and publish a working agent in One Agent Studio.' },
  { id: 'runner-setup', category: 'get-started', title: 'Set up a Runner', summary: 'Connect a Windows machine so it can run your agents.' },
];
const CAT_NAMES: Record<string, string> = { 'get-started': 'Get started', learn: 'Learn', 'how-to': 'How-to guide', reference: 'Reference', troubleshooting: 'Troubleshooting', 'whats-new': 'What’s new', templates: 'Template', community: 'Community' };

/* Welcome: one tab per page, with a large panel for the chosen one. */
type Board = { co: string; title: string; s1: string; l1: string }[];
type Quote = { quoteText: string; quoteRole: string; quoteCompany: string; ctaText: string };
type Tab = { id: string; name: string; icon: string; to: string; go: string; line: string; points: string[] };

const CHECK = 'M5 12.5l4.5 4.5L19 7.5';
export const BASE_TABS: Tab[] = [
  { id: 'platform', name: 'Platform', to: '/platform', go: 'Explore the platform', icon: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5M3 17.5l9 5 9-5',
    line: 'Build, run and govern AI agents on one secure platform.',
    points: ['One Agent Studio to design agents, or let AI draft them', 'One Runner works on your own machines', 'One Command Center for schedules, vault and audit'] },
  { id: 'solutions', name: 'Solutions', to: '/solutions', go: 'Browse solutions', icon: 'M9 18h6M10 21h4M12 3a6 6 0 00-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0012 3z',
    line: 'Use cases for your industry, ready to adapt.',
    points: ['Nine industries, from banking to utilities', 'Cross-industry processes for finance, HR and operations', 'Ready to adapt to the systems you already use'] },
  { id: 'customers', name: 'Customers', to: '/customers', go: 'Read customer stories', icon: 'M9 11a3 3 0 100-6 3 3 0 000 6zM3 20v-1a6 6 0 0112 0v1M16 5a3 3 0 010 6M21 20v-1a6 6 0 00-4-5.6',
    line: 'See what teams like yours automated first, and what changed.', points: [] },
  { id: 'resources', name: 'Resources', to: '/resources', go: 'Start learning', icon: 'M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zM4 19V5M8 7h7M8 11h5',
    line: 'Guides, courses and templates for every step.',
    points: ['Get started: install and build your first agent', 'How-to guides and reference for every product', 'Templates and samples to copy and adapt'] },
  { id: 'pricing', name: 'Pricing', to: '/pricing', go: 'See plans', icon: 'M3 12V3h9l9 9-9 9zM7.5 7.5h.01',
    line: 'Start free. Upgrade only when your agents need it.',
    points: ['Community plan, free to start', 'Starter and Business plans for growing teams', 'Enterprise with custom terms'] },
  { id: 'partners', name: 'Partners', to: '/partners', go: 'Become a partner', icon: 'M14 12a5 5 0 11-10 0 5 5 0 0110 0zM20 12a5 5 0 11-10 0 5 5 0 0110 0z',
    line: 'Your expertise. Our platform. Grow together.',
    points: ['Implementation partners deliver projects', 'Reseller partners bring the platform to clients', 'Technology partners build integrations'] },
  { id: 'contact', name: 'Contact', to: '/contact', go: 'Book a demo', icon: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4M8 14h3',
    line: 'Talk to an expert about your processes.', points: ['Talk to an automation expert', 'See a live agent for a process like yours', 'Offices in India and Qatar'] },
];

function TabPicture({ id, story, quote, latest }: { id: string; story: Board; quote: Quote; latest: Article[] }) {
  if (id === 'platform') return (
    <div className="hs-pic">
      <div className="hs-flow">
        <span><i>@</i>New invoice email</span><b />
        <span data-ai=""><i>AI</i>Extract invoice fields</span><b />
        <span><i>?</i>Matches purchase order?</span><b />
        <span><i>✓</i>Post to SAP</span>
      </div>
      <div className="hs-stat"><div><b>1,284</b><small>runs today</small></div><div><b>99.2%</b><small>success rate</small></div></div>
    </div>
  );
  if (id === 'solutions') return (
    <div className="hs-pic"><div className="hs-ind">{IND.map(([n, d]) => <span key={n}><i><Icon d={d} size={20} /></i>{n}</span>)}</div></div>
  );
  if (id === 'customers') return (
    <div className="hs-pic">
      <div className="hs-res">{story.slice(0, 3).map((b) => <div key={b.co + b.s1}><b>{b.s1}</b><span>{b.l1}<small>{b.co}</small></span></div>)}</div>
      <blockquote className="hs-q">“{quote.quoteText}”<small>{quote.quoteRole}, {quote.quoteCompany}</small></blockquote>
    </div>
  );
  if (id === 'resources') return (
    <div className="hs-pic"><div className="hs-docs">{latest.map((a) => (
      <div key={a.id}><i><Icon d="M6 3h9l4 4v14H6zM14 3v5h5M9 13h6M9 17h4" size={20} /></i><span><small>{CAT_NAMES[a.category] ?? 'Guide'}</small>{a.title}</span></div>
    ))}</div></div>
  );
  if (id === 'pricing') return (
    <div className="hs-pic"><div className="hs-plans">
      {[['Community', 'Free'], ['Starter', ''], ['Business', ''], ['Enterprise', 'Custom']].map(([n, p], i) => (
        <div key={n} style={{ height: `${46 + i * 18}%` }}><b>{n}</b>{p && <small>{p}</small>}</div>
      ))}
    </div></div>
  );
  if (id === 'partners') return (
    <div className="hs-pic hs-center">
      <LogoMark width={190} tone="light" />
      <div className="hs-chips"><em>Implementation</em><em>Reseller</em><em>Technology</em></div>
    </div>
  );
  return (
    <div className="hs-pic hs-center">
      <div className="hs-cal"><b>DEMO</b><strong>30</strong><span>minutes</span></div>
      <div className="hs-bubble">Tell us your process. We’ll build the agent live, with you.</div>
    </div>
  );
}

function Showcase({ story, quote, latest }: { story: Board; quote: Quote; latest: Article[] }) {
  const TABS: Tab[] = useCms()<{ name: string; line: string; points: string[]; go: string }[]>('home.tabs', PD['home.tabs']).slice(0, BASE_TABS.length).map((x, i) => ({ ...BASE_TABS[i], name: x.name, line: x.line, points: x.points, go: x.go }));
  const [tab, setTab] = useState(0);
  const [auto, setAuto] = useState(true);
  useEffect(() => {
    if (!auto || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = window.setInterval(() => setTab((x) => (x + 1) % TABS.length), 6000);
    return () => window.clearInterval(t);
  }, [auto]);
  const pick = (i: number) => { setAuto(false); setTab(i); };
  const onKey = (e: ReactKeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const n = (tab + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length;
    pick(n);
    document.getElementById(`hs-tab-${TABS[n].id}`)?.focus();
  };
  const t = TABS[tab];
  const points = t.id === 'customers' ? story.slice(0, 3).map((b) => `${b.co}: ${b.title}`) : t.points;
  return (
    <div className="hs" onMouseEnter={() => setAuto(false)} onFocus={() => setAuto(false)}>
      <div className="hs-tabs" role="tablist" aria-label="Explore OneOfficeAutomation" onKeyDown={onKey}>
        {TABS.map((x, i) => (
          <button key={x.id} id={`hs-tab-${x.id}`} role="tab" type="button" aria-selected={i === tab} aria-controls="hs-panel" tabIndex={i === tab ? 0 : -1} onClick={() => pick(i)}>
            <Icon d={x.icon} size={26} />
            <span>{x.name}</span>
            {i === tab && auto && <i className="hs-timer" />}
          </button>
        ))}
      </div>
      <div className="hs-panel" id="hs-panel" role="tabpanel" aria-labelledby={`hs-tab-${t.id}`} data-tone={tab % 2} key={t.id}>
        <div className="hs-copy">
          <span className="hs-sym"><Icon d={t.icon} size={30} /></span>
          <h3>{t.name}</h3>
          <p>{t.line || (t.id === 'contact' ? quote.ctaText : '')}</p>
          <ul>{points.map((pt) => <li key={pt}><Icon d={CHECK} size={18} stroke={2.6} />{pt}</li>)}</ul>
          <Link className="ds-btn ds-btn-grad hs-go" to={t.to}>{t.go}<Icon d={P.arrow} size={20} stroke={2.4} /></Link>
        </div>
        <div className="hs-visual" aria-hidden="true"><TabPicture id={t.id} story={story} quote={quote} latest={latest} /></div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const T = usePageText('page.home');
  const examples = T.list('examples');
  const quick = T.list('quickPicks');
  const v = useMainLogic();
  const navigate = useNavigate();
  const [task, setTask] = useState('');
  const [hint, setHint] = useState(0);

  useEffect(() => {
    const t = window.setInterval(() => setHint((h) => (h + 1) % Math.max(examples.length, 1)), 3200);
    return () => window.clearInterval(t);
  }, [examples.length]);

  const cms = useCms();
  const articles = cms<Article[]>('resources.items', ARTICLES_FALLBACK);
  const latest = [...articles.filter((a) => a.featured), ...articles.filter((a) => !a.featured)].slice(0, 3);
  const story = v.board[0];

  const start = (e: FormEvent) => {
    e.preventDefault();
    const q = task.trim();
    navigate(q ? `/contact?process=${encodeURIComponent(q)}` : '/contact');
  };


  return (
    <>
      {/* Hero */}
      <section id="top" className="hz-hero">
        <div className="ds-container hz-hero-grid">
          <div>
            <h1 className="hz-brand"><Logo width={64} /><span>OneOfficeAutomation</span></h1>
            <p className="hz-tagline"><Hi a={T.heroA} b={T.heroB} c={T.heroC} /></p>

            <form className="hz-ask" onSubmit={start}>
              <label htmlFor="hz-task" className="ds-sr">What would you like to automate?</label>
              <Icon d={P.spark} size={22} />
              <input id="hz-task" value={task} onChange={(e) => setTask(e.target.value)} placeholder={examples[hint % Math.max(examples.length, 1)] ?? ''} maxLength={300} autoComplete="off" />
              <button type="submit">{T.searchButton}</button>
            </form>
            <div className="hz-try">
              <span>{T.tryLabel}</span>
              {quick.map((q) => <button type="button" key={q} onClick={() => setTask(q)}>{q}</button>)}
            </div>
          </div>
          <HeroMark />
        </div>
        <div className="ds-container hy-nums">
          {v.stats.map((st) => <div key={st.label}><b>{st.n}</b><span>{st.label}</span></div>)}
        </div>
        <svg className="hz-curve" viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden="true"><path d="M0 90 L0 44 Q720 -28 1440 44 L1440 90 Z" fill="#F4F6FD" /></svg>
      </section>

      {/* Welcome: tabbed showcase */}
      <section className="ds-soft" style={{ paddingTop: 'clamp(28px, 3.5vw, 48px)', paddingBottom: 'var(--ds-section-y)' }}>
        <div className="ds-container">
          <div className="hx-head hx-head-center">
            <div>
              <h2 className="ds-h2"><Hi a={T.welcomeA} b={T.welcomeB} /></h2>
              <p className="ds-lead ds-muted">{T.welcomeText}</p>
            </div>
          </div>
          <Showcase story={v.board} quote={v.t} latest={latest} />
        </div>
      </section>

      {/* Results */}
      <section className="ds-navy hy-results">
        <div className="ds-container">
          <div className="hx-head">
            <div><h2 className="ds-h2"><Hi a={T.resultsA} b={T.resultsB} /></h2></div>
            <Go className="ds-link" to={T.resultsLinkLink}>{T.resultsLink}</Go>
          </div>
          <div className="hy-res">
            {v.board.slice(0, 3).map((b) => (
              <div key={b.co + b.title}><b className="ds-gradtext">{b.s1}</b><strong>{b.l1}</strong><span>{b.co}</span></div>
            ))}
            <figure>
              <blockquote>“{v.t.quoteText}”</blockquote>
              <figcaption>{v.t.quoteRole}, {v.t.quoteCompany}</figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* Closing */}
      <section className="ds-paper ds-section">
        <div className="ds-container">
          <div className="hz-final">
            <svg viewBox="0 0 600 360" fill="none" aria-hidden="true"><circle cx="225" cy="180" r="150" stroke="#8FB8FF" strokeOpacity=".35" strokeWidth="2" /><circle cx="375" cy="180" r="150" stroke="#C3B1FF" strokeOpacity=".35" strokeWidth="2" /></svg>
            <h2 className="ds-h2" style={{ position: 'relative', maxWidth: 760 }}>{T.endTitle}</h2>
            <p className="ds-lead" style={{ position: 'relative' }}>{v.t.ctaText}</p>
            <div className="ds-actions" style={{ position: 'relative', justifyContent: 'center' }}>
              <Go className="ds-btn ds-btn-white" to={T.endBtn1Link}>{T.endBtn1}</Go>
              <Go className="ds-btn ds-btn-outline" to={T.endBtn2Link}>{T.endBtn2}</Go>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
