import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCms } from '../cms/CmsContext';
import D from '../cms/defaults.generated.json';
import { ArticleBody } from '../cms/ArticleBody';
import { slugify, storySlug } from '../cms/slug';
import { CountUp, I, Icon } from '../ds/ui';
import { Field } from '../ds/Form';
import { ArticleText } from '../logic/articleBody';
import { EventRegister } from './public/PublicPages';
import { eventStart, tzLabel } from '../cms/time';
import { iconPath } from '../cms/icons';
import { ResHero } from './resources/DocsPage';

type Story = { co: string; slug?: string; logo?: string; title: string; does: string; ind: string; icon: string; s1: string; l1: string; s2?: string; l2?: string; quote?: string; role?: string; challenge?: string; solution?: string; results?: string };
type Role = { id: string; title: string; team: string; place: string; type: string; about: string; does: string[]; needs: string[] };

function NotFound({ what, back, backLabel }: { what: string; back: string; backLabel: string }) {
  return (
    <section className="ds-paper ds-section">
      <div className="ds-container" style={{ maxWidth: 720 }}>
        <h1 className="ds-h2">We can’t find that {what}.</h1>
        <p className="ds-lead ds-muted">It may have been renamed or removed.</p>
        <Link className="ds-btn ds-btn-grad" to={back}>{backLabel}</Link>
      </div>
    </section>
  );
}

/** /customers/:story — one customer story laid out as a case study: the results first, then the story, the quote and more stories.
 *  The full write-up (challenge, what we built, results) shows when it is written in /admin; until then the page tells the story from the summary. */
export function StoryPage() {
  const { story = '' } = useParams();
  const stories = useCms()<Story[]>('customers.stories', D['customers.stories'] as Story[]);
  const s = stories.find((x) => storySlug(x) === story);
  if (!s) return <NotFound what="customer story" back="/customers#stories" backLabel="See all customer stories" />;
  const more = stories.filter((x) => x !== s).sort((x, y) => Number(y.ind === s.ind) - Number(x.ind === s.ind)).slice(0, 3);
  const results = [[s.s1, s.l1], [s.s2, s.l2]].filter(([n]) => n) as [string, string][];
  const full: [string, string, string | undefined][] = [['challenge', 'The challenge', s.challenge], ['built', 'What we built', s.solution], ['results', 'The results', s.results]];
  const written = full.filter(([, , t]) => t);
  const toc = [...(written.length ? written.map(([id, h]) => [id, h]) : [['built', 'What the agents do'], ['results', 'The results']]), ...(s.quote ? [['quote', 'In their words']] : [])];
  return (
    <>
      <section className="hz-hero st-hero">
        <div className="ds-container hz-hero-grid pf-hero-grid">
          <div className="pf-hero-copy">
            <nav className="rs-crumb" aria-label="Breadcrumb"><Link to="/customers">Customers</Link><span aria-hidden="true">›</span><Link to="/customers#stories">Stories</Link><span aria-hidden="true">›</span><span aria-current="page">{s.ind}</span></nav>
            <p className="ab-kicker"><Icon d={s.icon} size={18} />{s.ind}</p>
            <h1 className="pf-h1 st-h1">{s.title}</h1>
            <p className="cu-lead">{s.does}</p>
            <div className="ds-actions" style={{ marginTop: 24 }}>
              <Link className="ds-btn ds-btn-grad" to="/contact">Book a demo</Link>
              <a className="ds-btn ds-btn-outline" href="#story">Read the story</a>
            </div>
          </div>
          <aside className="st-glance" aria-label="Results at a glance">
            <div className="st-glance-co">
              {s.logo ? <img src={s.logo} alt={s.co} onError={(e) => { e.currentTarget.hidden = true; (e.currentTarget.nextElementSibling as HTMLElement | null)?.removeAttribute('hidden'); }} /> : null}
              <b hidden={!!s.logo}>{s.co}</b>
              <span>{s.ind}</span>
            </div>
            {results.map(([n, l], k) => (
              <div className="st-glance-r" key={n}><b><CountUp value={n} ms={1600} delay={k * 200} /></b><span>{l}</span></div>
            ))}
          </aside>
        </div>
        <svg className="hz-curve" viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden="true"><path d="M0 90 L0 44 Q720 -28 1440 44 L1440 90 Z" fill="#FFFFFF" /></svg>
      </section>

      <section id="story" className="ds-paper st-body-sec">
        <div className="ds-container st-body">
          <article className="st-main">
            {written.length ? written.map(([id, h, t]) => (
              <section key={id} id={id} className="st-part"><h2>{h}</h2><div className="rs-body"><ArticleBody text={t!} /></div></section>
            )) : (
              <>
                <section id="built" className="st-part"><h2>What the agents do</h2><p className="st-text">{s.does}</p></section>
                <section id="results" className="st-part">
                  <h2>The results</h2>
                  <ul className="st-results">{results.map(([n, l]) => <li key={n}><Icon d={I.check} size={18} stroke={2.8} /><span><b>{n}</b> {l}</span></li>)}</ul>
                </section>
              </>
            )}
            {s.quote && (
              <figure id="quote" className="st-quote">
                <svg width="38" height="30" viewBox="0 0 38 30" aria-hidden="true"><path d="M0 30V17C0 7 6 1 15 0l2 5c-5 2-8 5-8 10h7v15zm21 0V17c0-10 6-16 15-17l2 5c-5 2-8 5-8 10h7v15z" fill="currentColor" /></svg>
                <blockquote>{s.quote}</blockquote>
                <figcaption><b>{s.role}</b>{s.role && s.co ? ', ' : ''}{s.co}</figcaption>
              </figure>
            )}
          </article>
          <aside className="st-side">
            <nav className="st-toc" aria-label="In this story">
              <small>In this story</small>
              {toc.map(([id, h]) => <a key={id} href={`#${id}`}>{h}</a>)}
            </nav>
            <div className="st-cta">
              <b>Want results like these?</b>
              <p>See an agent built on your own process in a 30-minute demo.</p>
              <Link className="ds-btn ds-btn-grad" to="/contact">Book a demo</Link>
            </div>
          </aside>
        </div>
      </section>

      {more.length > 0 && (
        <section className="ds-soft st-more-sec">
          <div className="ds-container">
            <div className="st-more-h"><h2 className="ds-h2">More stories</h2><Link className="ds-link" to="/customers#stories">All customer stories →</Link></div>
            <div className="rs-cards">
              {more.map((m) => (
                <Link key={storySlug(m)} to={`/customers/${storySlug(m)}`} className="rs-card st-card">
                  <small><Icon d={m.icon} size={15} />{m.ind}</small>
                  <b className="st-card-n">{m.s1}</b>
                  <span className="st-card-l">{m.l1}</span>
                  <h3>{m.title}</h3>
                  <span>Read the story<Icon d={I.arrow} size={16} stroke={2.4} /></span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="ds-paper rs-ask-sec" style={{ paddingTop: 'clamp(40px, 5vw, 72px)' }}>
        <div className="ds-container">
          <div className="ask-strip">
            <div><h2>Your process could be next.</h2><p>Most customers have a live agent running within weeks of the first conversation.</p></div>
            <div className="ds-actions">
              <Link className="ds-btn ds-btn-white" to="/contact">Book a demo <Icon d={I.arrow} size={18} stroke={2.4} /></Link>
              <Link className="ds-btn ds-btn-outline" to="/customers#stories">More stories</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

/** /careers/:role — one open role, with everything a candidate needs and a button to apply. */
export function RolePage() {
  const { role = '' } = useParams();
  const roles = useCms()<Role[]>('careers.roles', D['careers.roles'] as Role[]);
  const r = roles.find((x) => x.id === role);
  if (!r) return <NotFound what="role" back="/careers#roles" backLabel="See all open roles" />;
  const others = roles.filter((x) => x.id !== r.id).slice(0, 3);
  return (
    <>
      <section className="hz-hero">
        <div className="ds-container" style={{ maxWidth: 900, paddingBottom: 'clamp(44px, 6vw, 76px)' }}>
          <p className="hint back-row" style={{ margin: 0 }}><Link to="/careers#roles" style={{ color: '#C9D4FF' }}>← Open roles</Link></p>
          <h1 className="pf-h1" style={{ marginTop: 18 }}>{r.title}</h1>
          <p className="cu-lead">{[r.team, r.place, r.type].filter(Boolean).join(' · ')}</p>
          <div className="ds-actions" style={{ marginTop: 20 }}><Link className="ds-btn ds-btn-grad" to={`/careers?apply=${encodeURIComponent(r.id)}#apply`}>Apply for this role <Icon d={I.arrow} size={18} stroke={2.4} /></Link></div>
        </div>
      </section>
      <section className="ds-paper ds-section">
        <div className="ds-container rs-body" style={{ maxWidth: 820 }}>
          <p style={{ fontSize: '1.15rem' }}>{r.about}</p>
          <h2>What you’ll do</h2>
          {(r.does ?? []).map((b) => <p key={b} className="rs-li">{b}</p>)}
          <h2>What we look for</h2>
          {(r.needs ?? []).map((b) => <p key={b} className="rs-li">{b}</p>)}
          <p style={{ marginTop: 28 }}><Link className="ds-btn ds-btn-grad" to={`/careers?apply=${encodeURIComponent(r.id)}#apply`}>Apply for this role</Link></p>
          {others.length > 0 && (
            <>
              <h2>Other open roles</h2>
              {others.map((o) => <p key={o.id} className="rs-li"><Link to={`/careers/${o.id}`}>{o.title}</Link> <span className="ds-muted">· {o.team} · {o.place}</span></p>)}
            </>
          )}
        </div>
      </section>
    </>
  );
}

type Sector = { k: string; name: string; icon: string; d?: string; tA: string; tH: string; tB: string; uses: { t: string; d: string }[]; sys: string[]; start?: string };
type Spot = { sector: string; title: string; before: string; after: string; checks?: string[]; result?: string };

/** /solutions/:sector — one industry: what agents do there, a before-and-after example, and stories. */
export function SectorPage() {
  const { sector = '' } = useParams();
  const cms = useCms();
  const sectors = cms<Sector[]>('solutions.sectors', D['solutions.sectors'] as Sector[]);
  const x = sectors.find((v) => slugify(v.k) === sector);
  // The highlighted process moves on by itself; pointing at the list holds it. Hooks run before the "not found" return.
  const [u, setU] = useState(0);
  const [held, setHeld] = useState(false);
  const n = x?.uses.length ?? 0;
  useEffect(() => {
    if (held || n < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = window.setInterval(() => setU((i) => (i + 1) % n), 3400);
    return () => window.clearInterval(t);
  }, [held, n]);
  useEffect(() => setU(0), [sector]);
  if (!x) return <NotFound what="industry" back="/solutions#explorer" backLabel="See all industries" />;
  const spot = cms<Spot[]>('solutions.spotlights', D['solutions.spotlights'] as Spot[]).find((v) => v.sector === x.k);
  const stories = cms<Story[]>('customers.stories', D['customers.stories'] as Story[])
    .filter((v) => v.ind === x.k || x.name.toLowerCase().includes(v.ind.toLowerCase()));
  const first = x.start || x.uses[0]?.t || x.k;
  const inName = x.k.toLowerCase() === 'public sector' ? 'the public sector' : x.k.toLowerCase();
  return (
    <>
      <section className="hz-hero sx-hero">
        <div className="ds-container hz-hero-grid pf-hero-grid">
          <div className="pf-hero-copy">
            <nav className="rs-crumb" aria-label="Breadcrumb"><Link to="/solutions">Solutions</Link><span aria-hidden="true">›</span><Link to="/solutions#explorer">Industries</Link><span aria-hidden="true">›</span><span aria-current="page">{x.k}</span></nav>
            <p className="ab-kicker"><Icon d={x.icon} size={18} />{x.name}</p>
            <h1 className="pf-h1 st-h1">{x.tA}<span className="ds-gradtext">{x.tH}</span>{x.tB}</h1>
            <p className="cu-lead">Most {inName} teams start with <b style={{ color: '#FFFFFF' }}>{first}</b>, then add the next process once it runs.</p>
            <div className="ds-actions" style={{ marginTop: 24 }}>
              <Link className="ds-btn ds-btn-grad" to={`/contact?process=${encodeURIComponent(first)}`}>Book a demo</Link>
              <a className="ds-btn ds-btn-outline" href="#processes">See the processes</a>
            </div>
          </div>
          <div className="sx-uses" onMouseEnter={() => setHeld(true)} onMouseLeave={() => setHeld(false)}
            onFocus={() => setHeld(true)} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHeld(false); }}>
            <small>What agents take on in {inName}</small>
            <ol>
              {x.uses.map((it, i) => (
                <li key={it.t}>
                  <button type="button" aria-expanded={i === u} onClick={() => setU(i)} onMouseEnter={() => setU(i)}>
                    <span className="n">{i + 1}</span><b>{it.t}</b>{it.t === x.start && <em>Start here</em>}
                  </button>
                  {i === u && <p>{it.d}</p>}
                </li>
              ))}
            </ol>
          </div>
        </div>
        <svg className="hz-curve" viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden="true"><path d="M0 90 L0 44 Q720 -28 1440 44 L1440 90 Z" fill="#FFFFFF" /></svg>
      </section>

      <section id="processes" className="ds-paper sx-sec">
        <div className="ds-container">
          <h2 className="ds-h2">Processes we automate in {inName}</h2>
          <div className="rs-cards sx-cards">
            {x.uses.map((it, i) => (
              <Link key={it.t} className="rs-card" to={`/contact?process=${encodeURIComponent(it.t)}`}>
                <i><span className="sx-num">{i + 1}</span></i>
                <h3>{it.t}</h3>
                <p>{it.d}</p>
                <span>{it.t === x.start ? 'Most teams start here' : 'Ask about this process'}<Icon d={I.arrow} size={16} stroke={2.4} /></span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {spot && (
        <section className="ds-soft sx-sec">
          <div className="ds-container">
            <h2 className="ds-h2">{spot.title}: before and after</h2>
            <div className="sx-ba">
              <div className="sx-before"><small>Today</small><p>{spot.before}</p></div>
              <div className="sx-after">
                <small>With an agent</small>
                <p>{spot.after}</p>
                {spot.checks && spot.checks.length > 0 && <ul>{spot.checks.map((c) => <li key={c}><Icon d={I.check} size={16} stroke={3} />{c}</li>)}</ul>}
                {spot.result && <b className="sx-result">{spot.result}</b>}
              </div>
            </div>
          </div>
        </section>
      )}

      <section className={`${spot ? 'ds-paper' : 'ds-soft'} sx-sec`}>
        <div className="ds-container sx-two">
          <div>
            <h2 className="ds-h3">Works with the systems you already use</h2>
            <p className="ds-muted">Agents work in your applications the way your team does, through their screens, APIs and files.</p>
            <div className="sl-sys">{x.sys.map((v) => <em key={v}>{v}</em>)}</div>
          </div>
          <div>
            <h2 className="ds-h3">Other industries</h2>
            <div className="sx-other">
              {sectors.filter((v) => v !== x).map((v) => <Link key={v.k} to={`/solutions/${slugify(v.k)}`}><Icon d={v.icon} size={16} />{v.k}</Link>)}
            </div>
          </div>
        </div>
      </section>

      {stories.length > 0 && (
        <section className="ds-soft st-more-sec">
          <div className="ds-container">
            <div className="st-more-h"><h2 className="ds-h2">{x.k} customer stories</h2><Link className="ds-link" to="/customers#stories">All customer stories →</Link></div>
            <div className="rs-cards">
              {stories.map((m) => (
                <Link key={storySlug(m)} to={`/customers/${storySlug(m)}`} className="rs-card st-card">
                  <small><Icon d={m.icon} size={15} />{m.ind}</small>
                  <b className="st-card-n">{m.s1}</b>
                  <span className="st-card-l">{m.l1}</span>
                  <h3>{m.title}</h3>
                  <span>Read the story<Icon d={I.arrow} size={16} stroke={2.4} /></span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="ds-paper rs-ask-sec" style={{ paddingTop: 'clamp(40px, 5vw, 72px)' }}>
        <div className="ds-container">
          <div className="ask-strip">
            <div><h2>See an agent handle {first}.</h2><p>We build it on your own documents and systems in the demo, so you see exactly how it would work for you.</p></div>
            <div className="ds-actions">
              <Link className="ds-btn ds-btn-white" to={`/contact?process=${encodeURIComponent(first)}`}>Book a demo <Icon d={I.arrow} size={18} stroke={2.4} /></Link>
              <Link className="ds-btn ds-btn-outline" to="/solutions#explorer">All industries</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

type Post = { id?: string; slug?: string; page?: string; kind: string; title: string; summary: string; meta?: string; date?: string; author?: string; cover?: string };
type Ev = { id?: string; slug?: string; title: string; kind: string; date: string; time: string; tz?: string; place: string; summary: string; url: string; cta: string; cover?: string; recording?: string; hasDetails?: boolean };

const longDate = (iso: string) => { const d = new Date(`${iso}T12:00:00Z`); return isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }); };

/** /resources/blog/:post — a blog post written on this site: easy to read, with the author, reading time, sharing and what to read next. */
export function PostPage() {
  const { post = '' } = useParams();
  const all = useCms()<Post[]>('resources.insights', []);
  const p = all.find((x) => x.slug === post && x.page);
  const [copied, setCopied] = useState(false);
  if (!p || !p.id) return <NotFound what="post" back="/resources/blog" backLabel="See all posts" />;
  const next = all.filter((x) => x !== p).slice(0, 2);
  const url = typeof window !== 'undefined' ? window.location.href : '';
  const initials = (p.author ?? '').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  // The clipboard can be refused (no permission, or the page isn't focused); fall back to copying from a hidden field.
  const copy = () => {
    const done = () => { setCopied(true); window.setTimeout(() => setCopied(false), 2000); };
    const fallback = () => {
      const ta = document.createElement('textarea'); ta.value = url; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { if (document.execCommand('copy')) done(); } catch { /* nothing more to try */ }
      ta.remove();
    };
    if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, fallback); else fallback();
  };
  return (
    <>
      <section className="hz-hero bp-hero">
        <div className="ds-container bp-hero-in">
          <nav className="rs-crumb" aria-label="Breadcrumb"><Link to="/resources">Resources</Link><span aria-hidden="true">›</span><Link to="/resources/blog">Blog</Link><span aria-hidden="true">›</span><span aria-current="page">{p.kind}</span></nav>
          <h1 className="pf-h1 st-h1">{p.title}</h1>
          {p.summary && <p className="cu-lead">{p.summary}</p>}
          <div className="bp-by">
            {p.author && <span className="bp-avatar" aria-hidden="true">{initials}</span>}
            <span>{p.author && <b>{p.author}</b>}<small>{[p.date ? longDate(p.date) : p.meta, p.kind].filter(Boolean).join(' · ')}</small></span>
          </div>
        </div>
        <svg className="hz-curve" viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden="true"><path d="M0 90 L0 44 Q720 -28 1440 44 L1440 90 Z" fill="#FFFFFF" /></svg>
      </section>
      <section className="ds-paper bp-sec">
        <div className="ds-container bp">
          <article className="bp-main rs-body">
            {p.cover && <figure className="rs-figure"><img src={p.cover} alt="" /></figure>}
            <ArticleText id={p.id}>{(body) => (
              <>
                <p className="bp-read"><Icon d={I.clock} size={15} />{Math.max(1, Math.round(body.split(/\s+/).length / 220))} min read</p>
                <ArticleBody text={body} />
              </>
            )}</ArticleText>
          </article>
          <aside className="bp-side">
            <div className="bp-share">
              <small>Share</small>
              <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer">LinkedIn</a>
              <a href={`mailto:?subject=${encodeURIComponent(p.title)}&body=${encodeURIComponent(url)}`}>Email</a>
              <button type="button" onClick={copy}>{copied ? 'Link copied' : 'Copy link'}</button>
            </div>
            <div className="st-cta">
              <b>Get posts like this monthly</b>
              <p>One email a month with new posts, guides and webinar dates.</p>
              <Link className="ds-btn ds-btn-grad" to="/community#updates">Get product updates</Link>
            </div>
          </aside>
        </div>
      </section>
      {next.length > 0 && (
        <section className="ds-soft st-more-sec">
          <div className="ds-container">
            <div className="st-more-h"><h2 className="ds-h2">Read next</h2><Link className="ds-link" to="/resources/blog">All posts →</Link></div>
            <div className="rs-cards">
              {next.map((x) => (
                <Link key={x.title} to={x.page || (x as Post & { download?: string }).download || '/resources/blog'} className="rs-card">
                  <small className="bp-kind">{x.kind}</small>
                  <h3 className="bp-next-t">{x.title}</h3>
                  <p>{x.summary}</p>
                  <span>Read<Icon d={I.arrow} size={16} stroke={2.4} /></span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
      <section className="ds-paper rs-ask-sec" style={{ paddingTop: 'clamp(40px, 5vw, 72px)' }}>
        <div className="ds-container">
          <div className="ask-strip">
            <div><h2>Want to try this on your own process?</h2><p>We’ll build an agent on your documents in a 30-minute demo.</p></div>
            <div className="ds-actions"><Link className="ds-btn ds-btn-white" to="/contact">Book a demo <Icon d={I.arrow} size={18} stroke={2.4} /></Link></div>
          </div>
        </div>
      </section>
    </>
  );
}

/** /resources/events/:event — one event: when (in its time zone and the visitor's), where, details, and how to join. */
export function EventPage() {
  const { event = '' } = useParams();
  const e = useCms()<Ev[]>('resources.events', []).find((x) => x.slug === event);
  if (!e || !e.id) return <NotFound what="event" back="/resources/events" backLabel="See all events" />;
  const tz = e.tz || 'Asia/Kolkata';
  const start = eventStart(e.date, e.time, tz);
  const past = start ? start.getTime() < Date.now() - 3 * 3600e3 : (e.date || '9999') < new Date().toISOString().slice(0, 10);
  const fmt = (zone: string) => start ? new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: zone }).format(start) : '';
  const mine = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const sameClock = start && fmt(mine) === fmt(tz);
  return (
    <>
      <section className="hz-hero">
        <div className="ds-container" style={{ maxWidth: 820, paddingBottom: 'clamp(44px, 6vw, 76px)' }}>
          <p className="hint back-row" style={{ margin: 0 }}><Link to="/resources/events" style={{ color: '#C9D4FF' }}>← Events</Link></p>
          <p className="ab-kicker" style={{ marginTop: 18 }}>{e.kind}{past ? ' · Past event' : ''}</p>
          <h1 className="pf-h1">{e.title}</h1>
          <p className="cu-lead">{start ? `${fmt(tz)} ${tzLabel(tz)}` : [longDate(e.date), e.time].filter(Boolean).join(', ')}{e.place ? ` · ${e.place}` : ''}</p>
          {start && !sameClock && <p className="hint" style={{ color: '#C9D4FF' }}>That’s {fmt(mine)} where you are.</p>}
        </div>
      </section>
      <section className="ds-paper ds-section">
        <div className="ds-container rs-body" style={{ maxWidth: 760 }}>
          {e.cover && <figure className="rs-figure"><img src={e.cover} alt="" /></figure>}
          <p style={{ fontSize: '1.2rem' }}>{e.summary}</p>
          {e.hasDetails && <ArticleText id={e.id}>{(body) => <ArticleBody text={body} />}</ArticleText>}
          <div style={{ marginTop: 28 }}>
            {past
              ? (e.recording ? <a className="ds-btn ds-btn-grad" href={e.recording} {...(/^https?:/.test(e.recording) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>Watch the recording</a> : <p className="ds-muted">This event has finished. <Link to="/resources/events">See upcoming events</Link>.</p>)
              : e.url ? <a className="ds-btn ds-btn-grad" href={e.url} {...(/^https?:/.test(e.url) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{e.cta || 'Register'}</a>
              : <EventRegister event={`${e.title}${e.date ? ' (' + e.date + ')' : ''}`} />}
          </div>
        </div>
      </section>
    </>
  );
}

type Gated = { id?: string; slug?: string; download?: string; kind: string; title: string; summary: string; cover?: string };

/** /resources/download/:post — a short form, then the file (each request is a lead in Pipelines → Downloads). */
export function DownloadPage() {
  const { post = '' } = useParams();
  const g = useCms()<Gated[]>('resources.insights', []).find((x) => x.slug === post && x.download);
  const [state, setState] = useState<{ busy: boolean; url: string; error: string }>({ busy: false, url: '', error: '' });
  if (!g) return <NotFound what="download" back="/resources/blog" backLabel="See all resources" />;
  return (
    <>
      <section className="hz-hero">
        <div className="ds-container" style={{ maxWidth: 820, paddingBottom: 'clamp(44px, 6vw, 76px)' }}>
          <p className="hint back-row" style={{ margin: 0 }}><Link to="/resources/blog" style={{ color: '#C9D4FF' }}>← Blog and downloads</Link></p>
          <p className="ab-kicker" style={{ marginTop: 18 }}>Free {g.kind.toLowerCase()}</p>
          <h1 className="pf-h1">{g.title}</h1>
          <p className="cu-lead">{g.summary}</p>
        </div>
      </section>
      <section className="ds-soft ds-section">
        <div className="ds-container dl-grid">
          {/* The cover: the uploaded image, or a styled cover with the title when there isn't one. */}
          <figure className="dl-cover">
            {g.cover ? <img src={g.cover} alt={`Cover of ${g.title}`} /> : (
              <div className="dl-book" aria-hidden="true"><small>{g.kind}</small><b>{g.title}</b><span>OneOfficeAutomation</span></div>
            )}
            <figcaption><Icon d={I.check} size={16} stroke={2.8} />Free {g.kind.toLowerCase()}, sent straight to your browser</figcaption>
          </figure>
          {state.url ? (
            <div className="dl-card" role="status">
              <span className="dl-ok"><Icon d={I.check} size={26} stroke={2.8} /></span>
              <h2>Thank you. Your {g.kind.toLowerCase()} is ready.</h2>
              <p>It should have opened in a new tab. If not, use the button below.</p>
              <a className="ds-btn ds-btn-grad" href={state.url} target="_blank" rel="noopener noreferrer" download>Download {g.kind.toLowerCase()}</a>
            </div>
          ) : (
            <form className="dl-card fm" onSubmit={async (e) => {
              e.preventDefault();
              const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
              setState({ busy: true, url: '', error: '' });
              try {
                const r = await fetch('/api/leads/download', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dn: f.dn, de: f.de, dc: f.dc ?? '', dfile: post }) });
                const j = (await r.json().catch(() => ({}))) as { url?: string; error?: string; fields?: Record<string, string> };
                if (r.ok && j.url) { setState({ busy: false, url: j.url, error: '' }); window.open(j.url, '_blank', 'noopener'); }
                else setState({ busy: false, url: '', error: j.error || Object.values(j.fields ?? {})[0] || 'Something went wrong. Please try again.' });
              } catch { setState({ busy: false, url: '', error: 'We couldn’t reach the server. Please try again.' }); }
            }}>
              <h2 className="dl-title">Get the {g.kind.toLowerCase()}</h2>
              <Field id="dl-name" label="Name" required wide><input id="dl-name" name="dn" required maxLength={120} autoComplete="name" /></Field>
              <Field id="dl-email" label="Work email" required wide><input id="dl-email" name="de" type="email" required maxLength={200} autoComplete="email" /></Field>
              <Field id="dl-co" label="Company (optional)" wide><input id="dl-co" name="dc" maxLength={120} autoComplete="organization" /></Field>
              {state.error && <p className="fm-err" role="alert" style={{ margin: 0 }}>{state.error}</p>}
              <button className="ds-btn ds-btn-grad fm-submit" type="submit" disabled={state.busy}>{state.busy ? 'Sending…' : `Download the ${g.kind.toLowerCase()}`}<Icon d={I.arrow} size={18} stroke={2.4} /></button>
              <small className="ds-muted fm-submit">We’ll only use your details to send you this and related resources. See our <Link to="/privacy">privacy policy</Link>.</small>
            </form>
          )}
        </div>
      </section>
    </>
  );
}

type Trust = { heroA: string; heroB: string; heroText: string; items: { icon: string; title: string; text: string }[]; certs: { name: string; status: string; note?: string }[]; reportTitle: string; reportText: string; securityEmail: string; endTitle: string; endText: string };

/** /trust — how the platform keeps data and credentials safe, certifications (only when added), and how to report an issue. */
export function TrustPage() {
  const t = { ...(D['page.trust'] as Trust), ...useCms()<Partial<Trust>>('page.trust', {}) };
  const ic = (x: { icon: string }) => (iconPath(x.icon) === iconPath('grid') && x.icon && x.icon.length > 20 ? x.icon : iconPath(x.icon));
  const mail = `mailto:${t.securityEmail}?subject=${encodeURIComponent('Security report')}`;
  return (
    <>
      <section className="hz-hero tr-hero">
        <div className="ds-container hz-hero-grid pf-hero-grid">
          <div className="pf-hero-copy">
            <p className="ab-kicker"><Icon d={I.shield} size={18} />Trust center</p>
            <h1 className="pf-h1">{t.heroA} <span className="ds-gradtext">{t.heroB}</span></h1>
            <p className="cu-lead">{t.heroText}</p>
            <div className="ds-actions" style={{ marginTop: 24 }}>
              <Link className="ds-btn ds-btn-grad" to="/contact">Talk to our team</Link>
              <a className="ds-btn ds-btn-outline" href="#report">Report an issue</a>
            </div>
          </div>
          {/* Where things run: everything inside the customer's own network. */}
          <figure className="tr-map" aria-label="Where OneOfficeAutomation runs">
            <figcaption><Icon d={I.lock} size={16} />Your servers, your network</figcaption>
            <div className="tr-map-grid">
              {[['Command Center', I.layers], ['Runners', I.play], ['Database', I.db], ['Credential vault', I.key]].map(([n, d]) => <span key={n}><Icon d={d} size={20} />{n}</span>)}
            </div>
            <p><Icon d={I.check} size={16} stroke={3} />Process data stays inside unless you choose otherwise</p>
            <p><Icon d={I.check} size={16} stroke={3} />Every run and change on the audit trail</p>
          </figure>
        </div>
        <svg className="hz-curve" viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden="true"><path d="M0 90 L0 44 Q720 -28 1440 44 L1440 90 Z" fill="#FFFFFF" /></svg>
      </section>

      <section className="ds-paper sx-sec">
        <div className="ds-container">
          <h2 className="ds-h2">How your data is protected</h2>
          <div className="rs-cards tr-cards">
            {t.items.map((x) => (
              <div key={x.title} className="rs-card tr-card">
                <i><Icon d={ic(x)} size={24} /></i>
                <h3>{x.title}</h3>
                <p>{x.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {t.certs.length > 0 && (
        <section className="ds-soft sx-sec">
          <div className="ds-container">
            <h2 className="ds-h2">Certifications and audits</h2>
            <div className="tr-certs">
              {t.certs.map((c) => (
                <div key={c.name}><b>{c.name}</b><em data-ok={c.status === 'certified' ? '1' : undefined}>{c.status === 'certified' ? 'Certified' : 'In progress'}</em>{c.note && <small>{c.note}</small>}</div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className={`${t.certs.length ? 'ds-paper' : 'ds-soft'} sx-sec`}>
        <div className="ds-container tr-two">
          <div id="report" className="tr-report">
            <i><Icon d={I.mail} size={22} /></i>
            <h2>{t.reportTitle}</h2>
            <p>{t.reportText}</p>
            <a className="ds-btn ds-btn-grad" href={mail}>Email {t.securityEmail}</a>
          </div>
          <div className="tr-links">
            <h2>Policies</h2>
            <Link to="/privacy"><Icon d={I.doc} size={18} />Privacy policy<Icon d={I.arrow} size={16} stroke={2.4} /></Link>
            <Link to="/terms"><Icon d={I.doc} size={18} />Terms of service<Icon d={I.arrow} size={16} stroke={2.4} /></Link>
            <a href="/.well-known/security.txt"><Icon d={I.shield} size={18} />security.txt (how to reach us)<Icon d={I.arrow} size={16} stroke={2.4} /></a>
            <Link to="/platform#security"><Icon d={I.layers} size={18} />Security on the Platform page<Icon d={I.arrow} size={16} stroke={2.4} /></Link>
          </div>
        </div>
      </section>

      <section className="ds-paper rs-ask-sec" style={{ paddingTop: 'clamp(40px, 5vw, 72px)' }}>
        <div className="ds-container">
          <div className="ask-strip">
            <div><h2>{t.endTitle}</h2><p>{t.endText}</p></div>
            <div className="ds-actions"><Link className="ds-btn ds-btn-white" to="/contact">Book a call <Icon d={I.arrow} size={18} stroke={2.4} /></Link></div>
          </div>
        </div>
      </section>
    </>
  );
}

/** /resources/webinars — live sessions coming up, then everything to watch now: recorded sessions from Training and past event recordings. */
export function WebinarsPage() {
  const cms = useCms();
  const events = cms<Ev[]>('resources.events', D['resources.events'] as Ev[]);
  const training = cms<{ title: string; summary: string; kind: string; level: string; duration: string; url: string }[]>('resources.training', D['resources.training'] as never);
  const today = new Date().toISOString().slice(0, 10);
  const isWebinar = (e: Ev) => /webinar|online|live/i.test(`${e.kind} ${e.place}`);
  const upcoming = events.filter((e) => isWebinar(e) && (e.date || '9999') >= today).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const recordings = [
    ...events.filter((e) => e.recording && (e.date || '') < today).map((e) => ({ title: e.title, sub: e.summary, meta: e.date ? longDate(e.date) : 'Recording', to: e.slug ? `/resources/events/${e.slug}` : e.recording! })),
    ...training.filter((t) => /video|recording/i.test(`${t.kind} ${t.duration}`)).map((t) => ({ title: t.title, sub: t.summary, meta: [t.duration, t.level].filter(Boolean).join(' · '), to: t.url })),
  ];
  return (
    <>
      <ResHero crumbs={[['Resources', '/resources'], ['Events', '/resources/events'], ['Webinars']]} title="Webinars" sub="Join a live session, or watch a recording whenever it suits you." icon="M3 5h18v12H3zM8 21h8M10 9l5 3-5 3z" col="linear-gradient(135deg, #3F67D6, #6D4AD8)" extra={`${recordings.length} on demand`} curve="#FFFFFF" />
      <section className="ds-paper wb-sec">
        <div className="ds-container">
          <div className="wb-h"><h2 className="ds-h2">Live</h2><Link className="ds-link" to="/resources/events">All events →</Link></div>
          {upcoming.length ? (
            <div className="wb-live">
              {upcoming.map((e) => {
                const d = /^\d{4}-\d{2}-\d{2}$/.test(e.date) ? new Date(e.date + 'T00:00:00') : null;
                return (
                  <Link key={e.title + e.date} className="wb-live-card" to={e.slug ? `/resources/events/${e.slug}` : '/resources/events'}>
                    <span className="ev-date" aria-hidden="true">{d ? <><small>{d.toLocaleString('en-GB', { month: 'short' })}</small><b>{d.getDate()}</b><small>{d.toLocaleString('en-GB', { weekday: 'short' })}</small></> : <b>TBA</b>}</span>
                    <span className="wb-live-t"><em><span className="ca-dot" />Live{e.time ? ` · ${e.time}` : ''}</em><b>{e.title}</b><small>{e.summary}</small></span>
                    <span className="ds-btn ds-btn-grad">Register</span>
                  </Link>
                );
              })}
            </div>
          ) : <p className="ds-muted">No live sessions scheduled right now. <Link className="ds-link" to="/community#updates">Get product updates</Link> to hear about the next one.</p>}

          <div className="wb-h" style={{ marginTop: 44 }}><h2 className="ds-h2">On demand</h2><Link className="ds-link" to="/resources/training">All training →</Link></div>
          {recordings.length ? (
            <div className="wb-grid">
              {recordings.map((r, k) => (
                <Link key={r.title} className="wb-card" to={r.to}>
                  <span className="wb-thumb" data-tone={k % 3} aria-hidden="true"><span className="wb-play"><Icon d={I.play} size={22} /></span><small>{r.meta}</small></span>
                  <b>{r.title}</b>
                  <span>{r.sub}</span>
                </Link>
              ))}
            </div>
          ) : <p className="ds-muted">Recordings of past sessions will appear here.</p>}
        </div>
      </section>
      <section className="ds-paper rs-ask-sec">
        <div className="ds-container">
          <div className="ask-strip">
            <div><h2>Want a session on your own process?</h2><p>We’ll run a private live build for your team.</p></div>
            <div className="ds-actions"><Link className="ds-btn ds-btn-white" to="/contact">Book a session <Icon d={I.arrow} size={18} stroke={2.4} /></Link></div>
          </div>
        </div>
      </section>
    </>
  );
}
