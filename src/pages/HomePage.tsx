import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, FormEvent, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMainLogic } from '../logic/MainLogic';
import { useCms } from '../cms/CmsContext';
import PD from '../cms/defaults.generated.json';
import { usePageText, Hi, Go } from '../cms/pageText';
import { LogoMark } from '../ds/LogoMark';
import { CountUp, useHeroTop, useTypedPlaceholder } from '../ds/ui';
import { HeroNetwork } from '../ds/HeroNetwork';

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


const prefersStill = () => typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* The paragraph under the headline: words fade in once, then the key phrases get an underline that draws in. */
function HeroSub({ text, highlights }: { text: string; highlights: string[] }) {
  const phrases = highlights.map((h) => h.trim()).filter(Boolean);
  const escaped = phrases.map((h) => h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const parts = escaped.length ? text.split(new RegExp(`(${escaped.join('|')})`, 'i')) : [text];
  let i = 0;
  let hl = 0;
  const words = (s: string) => s.split(/(\s+)/).map((w, k) => (w.trim() ? <span key={k} className="hz-w" style={{ '--i': i++ } as CSSProperties}>{w}</span> : w));
  return (
    <p className="hz-sub">
      {parts.map((part, k) => phrases.some((h) => h.toLowerCase() === part.toLowerCase())
        ? <span key={k} className="hz-hl" style={{ '--h': hl++ } as CSSProperties}>{words(part)}</span>
        : <span key={k}>{words(part)}</span>)}
    </p>
  );
}

/* Hero picture: an agent working through a process, one step at a time. */
/* match: comma-separated words that pick this demo when a visitor types them. draft: drafted from the visitor's own words. */
export type HeroDemo = { chip: string; title: string; steps: string[]; process: string; match?: string; draft?: boolean };
const STEP_MS = 1300;   // time per step
const HOLD_MS = 2800;   // how long a finished run stays on screen before the next demo plays
const DRAFT_MS = 1300;  // how long "AI is drafting…" shows before a drafted agent runs
const isAiStep = (s: string) => /^AI\b/.test(s.trim());

function HeroAgent({ demo, auto, onFinished, cta, replay, note, draftTitle }: {
  demo: HeroDemo; auto: boolean; onFinished: () => void; cta: string; replay: string; note: string; draftTitle: string;
}) {
  const steps = demo.steps.filter((s) => s.trim());
  const still = prefersStill();
  const [at, setAt] = useState(still ? steps.length : 0);
  const [drafting, setDrafting] = useState(false);
  const [run, setRun] = useState(0);
  const runKey = `${demo.chip}|${demo.process}`;
  useEffect(() => { setAt(still ? steps.length : 0); setDrafting(!!demo.draft && !still); }, [runKey, run, still, steps.length]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (still) return;
    if (drafting) { const t = window.setTimeout(() => setDrafting(false), DRAFT_MS); return () => window.clearTimeout(t); }
    // Light the next step; once the run is complete, hold it, then let the parent move on (when it is cycling).
    if (at < steps.length) { const t = window.setTimeout(() => setAt(at + 1), STEP_MS); return () => window.clearTimeout(t); }
    if (!auto) return;
    const t = window.setTimeout(onFinished, HOLD_MS);
    return () => window.clearTimeout(t);
  }, [at, auto, drafting, still, steps.length, onFinished]);
  const done = !drafting && at >= steps.length;
  const status = drafting ? 'Drafting' : done ? 'Completed' : 'Running';
  let n = 0;
  return (
    <figure className="hz-agent" id="hz-agent" data-draft={demo.draft ? '1' : '0'} aria-label={`${demo.draft ? draftTitle : `Example ${demo.title}`}: ${steps.join(', then ')}`}>
      <figcaption>
        <span className="hz-agent-dots" aria-hidden="true"><i /><i /><i /></span>
        {drafting ? 'AI is drafting your agent…' : demo.draft ? draftTitle : `Example: ${demo.title}`}
        <em data-done={done ? '1' : '0'} data-drafting={drafting ? '1' : '0'}>{status}</em>
      </figcaption>
      <ol aria-hidden="true">
        {steps.map((s, i) => {
          const ai = isAiStep(s);
          if (!ai) n += 1;
          return (
            <li key={`${runKey}-${i}`} data-state={drafting ? 'skeleton' : i < at ? 'done' : i === at ? 'now' : 'next'} data-ai={ai ? '' : undefined} style={{ '--i': i } as CSSProperties}>
              <i>{drafting ? '' : i < at ? '✓' : ai ? 'AI' : n}</i><span>{s}</span>
            </li>
          );
        })}
      </ol>
      <div className="hz-agent-end" data-show={done ? '1' : '0'}>
        <Link className="ds-btn ds-btn-grad" to={`/contact?process=${encodeURIComponent(demo.process)}`} tabIndex={done ? 0 : -1}>
          {cta}<Icon d={P.arrow} size={18} stroke={2.4} />
        </Link>
        {!still && <button type="button" onClick={() => setRun((r) => r + 1)} tabIndex={done ? 0 : -1}>{replay}</button>}
      </div>
      {note && <p>{note}</p>}
    </figure>
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

/* The platform's three parts, in the order work flows through them. Each lines up with a checklist item on the left. */
const PARTS: [string, string, string][] = [
  ['One Agent Studio', 'Design agents, or let AI draft them', 'M12 3l1.8 4.7 4.7 1.8-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z'],
  ['One Runner', 'Runs them on your own machines', 'M4 5h16v11H4zM9 20h6M12 16v4'],
  ['One Command Center', 'Schedules, vault and audit', 'M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7zM9 12l2 2 4-4'],
];

function TabPicture({ id, story, quote, latest, hot }: { id: string; story: Board; quote: Quote; latest: Article[]; hot: number | null }) {
  if (id === 'platform') return (
    <div className="hs-pic">
      <div className="hs-arch" data-hot={hot ?? undefined}>
        {PARTS.map(([name, line, icon], k) => (
          <Fragment key={name}>
            {k > 0 && <span className="hs-wire"><em /></span>}
            <div className="hs-node" data-k={k} data-on={hot === k ? '1' : undefined}>
              <i><Icon d={icon} size={20} /></i>
              <span><b>{name}</b><small>{line}</small></span>
            </div>
          </Fragment>
        ))}
      </div>
      <div className="hs-stat">
        <div><b><CountUp value="1,284" /></b><small>runs today</small></div>
        <div><b><CountUp value="99.2%" /></b><small>success rate</small></div>
        <em>Example</em>
      </div>
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
  // The highlight behind the selected tab slides from tab to tab, so it follows the selected button's position.
  const barRef = useRef<HTMLDivElement>(null);
  const [mark, setMark] = useState<{ left: number; width: number } | null>(null);
  useLayoutEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const place = () => {
      const b = bar.querySelector<HTMLElement>('[aria-selected="true"]');
      if (!b) return;
      setMark({ left: b.offsetLeft, width: b.offsetWidth });
      // On narrow screens the bar scrolls sideways: keep the selected tab in view.
      if (bar.scrollWidth > bar.clientWidth) bar.scrollTo({ left: b.offsetLeft - (bar.clientWidth - b.offsetWidth) / 2, behavior: prefersStill() ? 'auto' : 'smooth' });
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(bar);
    return () => ro.disconnect();
  }, [tab]);
  const onKey = (e: ReactKeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const n = (tab + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length;
    pick(n);
    document.getElementById(`hs-tab-${TABS[n].id}`)?.focus();
  };
  const t = TABS[tab];
  const points = t.id === 'customers' ? story.slice(0, 3).map((b) => `${b.co}: ${b.title}`) : t.points;
  // Pointing at a checklist item lights up the matching part of the picture.
  const [hot, setHot] = useState<number | null>(null);
  useEffect(() => setHot(null), [tab]);
  // The picture tilts slightly towards the pointer (mouse only; off for reduced motion).
  const visRef = useRef<HTMLDivElement>(null);
  const tilt = (e: ReactPointerEvent) => {
    const el = visRef.current;
    if (!el || e.pointerType !== 'mouse' || prefersStill()) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--ry', `${((e.clientX - r.left) / r.width - 0.5) * 8}deg`);
    el.style.setProperty('--rx', `${((e.clientY - r.top) / r.height - 0.5) * -8}deg`);
  };
  const untilt = () => { visRef.current?.style.setProperty('--rx', '0deg'); visRef.current?.style.setProperty('--ry', '0deg'); };
  return (
    <div className="hs" onMouseEnter={() => setAuto(false)} onFocus={() => setAuto(false)}>
      <div className="hs-tabs" role="tablist" aria-label="Explore OneOfficeAutomation" onKeyDown={onKey} ref={barRef}>
        {mark && (
          <span className="hs-mark" aria-hidden="true" style={{ transform: `translateX(${mark.left}px)`, width: mark.width }}>
            {auto && <i className="hs-timer" key={tab} />}
          </span>
        )}
        {TABS.map((x, i) => (
          <button key={x.id} id={`hs-tab-${x.id}`} role="tab" type="button" aria-selected={i === tab} aria-controls="hs-panel" tabIndex={i === tab ? 0 : -1} onClick={() => pick(i)}>
            <Icon d={x.icon} size={20} />
            <span>{x.name}</span>
          </button>
        ))}
      </div>
      <div className="hs-panel" id="hs-panel" role="tabpanel" aria-labelledby={`hs-tab-${t.id}`} data-tone={tab % 2} key={t.id}>
        <div className="hs-copy">
          <span className="hs-sym"><Icon d={t.icon} size={30} /></span>
          <h3>{t.name}</h3>
          <p>{t.line || (t.id === 'contact' ? quote.ctaText : '')}</p>
          <ul>{points.map((pt, i) => (
            <li key={pt} data-on={hot === i ? '1' : undefined} onMouseEnter={() => setHot(i)} onMouseLeave={() => setHot(null)}>
              <Icon d={CHECK} size={18} stroke={2.6} />{pt}
            </li>
          ))}</ul>
          <Link className="ds-btn ds-btn-grad hs-go" to={t.to}>{t.go}<Icon d={P.arrow} size={20} stroke={2.4} /></Link>
        </div>
        <div className="hs-visual" aria-hidden="true" ref={visRef} onPointerMove={tilt} onPointerLeave={untilt}>
          <TabPicture id={t.id} story={story} quote={quote} latest={latest} hot={hot} />
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const T = usePageText('page.home');
  const examples = T.list('examples');
  const v = useMainLogic();
  const navigate = useNavigate();
  const [task, setTask] = useState('');
  const placeholder = useTypedPlaceholder(examples, task !== '');

  // Hero demos: they play in turn until the visitor picks one, which then stays on screen.
  const saved = useCms()<{ demos?: HeroDemo[] }>('page.home', {}).demos;
  const demos = (saved?.length ? saved : (PD['page.home'].demos as HeroDemo[])).filter((d) => d.chip && d.steps?.length);
  const [demoAt, setDemoAt] = useState(0);
  const [picked, setPicked] = useState(false);
  const nextDemo = useCallback(() => setDemoAt((i) => (i + 1) % Math.max(demos.length, 1)), [demos.length]);
  const [draft, setDraft] = useState<HeroDemo | null>(null);
  const [typed, setTyped] = useState('');
  const pickDemo = (i: number) => { setPicked(true); setDraft(null); setDemoAt(i); setTask(demos[i].process); };
  const demo = draft ?? demos[demoAt % Math.max(demos.length, 1)];

  // When the visitor pauses typing: play the demo their words match, or draft an agent from what they wrote.
  const draftSteps = T.list('draftSteps');
  useEffect(() => {
    const q = typed.trim();
    if (q.length < 4) { setDraft(null); if (!q) setPicked(false); return; }
    const t = window.setTimeout(() => {
      const lower = q.toLowerCase();
      const words = (d: HeroDemo) => (d.match || d.chip).split(',').map((w) => w.trim().toLowerCase()).filter(Boolean);
      const hit = demos.findIndex((d) => words(d).some((w) => lower.includes(w)));
      setPicked(true);
      if (hit >= 0) { setDraft(null); setDemoAt(hit); return; }
      const short = q.length > 40 ? `${q.slice(0, 38).trimEnd()}…` : q;
      setDraft({ chip: 'draft', title: T.draftTitle, process: q, draft: true, steps: draftSteps.map((s) => s.replace('{process}', short)) });
    }, 750);
    return () => window.clearTimeout(t);
  }, [typed]); // eslint-disable-line react-hooks/exhaustive-deps

  // The hero fills the screen below the header (and the announcement bar, when it's on).
  const heroRef = useHeroTop<HTMLElement>();

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
      <section id="top" className="hz-hero hz-fit" ref={heroRef}>
        <HeroNetwork />
        <div className="ds-container hz-hero-grid">
          <div>
            {v.t.badge && <p className="hz-badge"><i aria-hidden="true" />{v.t.badge}</p>}
            <h1 className="hz-title"><Hi a={T.heroA} b={T.heroB} c={T.heroC} /></h1>
            {v.t.heroSub && <HeroSub text={v.t.heroSub} highlights={T.list('subHighlights')} />}

            <form className="hz-ask" data-label={T.searchLabel ? '1' : '0'} onSubmit={start}>
              {/* Shown only when a label is set in the admin; screen readers always get one. */}
              <label htmlFor="hz-task" className={T.searchLabel ? 'hz-ask-label' : 'ds-sr'}>{T.searchLabel || 'What would you like to automate?'}</label>
              <Icon d={P.spark} size={22} />
              <input id="hz-task" value={task} onChange={(e) => { setTask(e.target.value); setTyped(e.target.value); }} placeholder={placeholder} maxLength={300} autoComplete="off" />
              <button type="submit">{T.searchButton}<Icon d={P.arrow} size={18} stroke={2.4} /></button>
            </form>
            <div className="hz-try">
              <span>{T.tryLabel}</span>
              {demos.map((d, i) => (
                <button type="button" key={d.chip} aria-pressed={picked && !draft && i === demoAt} aria-controls="hz-agent" onClick={() => pickDemo(i)}>{d.chip}</button>
              ))}
            </div>
            {(T.heroBtn1 || T.heroBtn2) && (
              <div className="hz-cta">
                {T.heroBtn1 && <Go to={T.heroBtn1Link} className="ds-btn hz-btn-line">{T.heroBtn1}</Go>}
                {T.heroBtn2 && <Go to={T.heroBtn2Link} className="hz-link">{T.heroBtn2}<Icon d={P.arrow} size={18} stroke={2.4} /></Go>}
              </div>
            )}
          </div>
          {demo && <HeroAgent demo={demo} auto={!picked} onFinished={nextDemo} cta={T.demoCta} replay={T.demoReplay} note={T.cardNote} draftTitle={T.draftTitle} />}
        </div>
        <div className="ds-container hy-nums">
          {v.stats.map((st, i) => <div key={st.label}><b><CountUp value={st.n} ms={2800} delay={i * 220} /></b><span>{st.label}</span></div>)}
        </div>
        {T.trustLine && <p className="ds-container hz-trust">{T.trustLine}</p>}
        <svg className="hz-curve" viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden="true"><path d="M0 90 L0 44 Q720 -28 1440 44 L1440 90 Z" fill="#F4F6FD" /></svg>
      </section>

      {/* Welcome: tabbed showcase */}
      <section className="ds-soft hs-sec">
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
