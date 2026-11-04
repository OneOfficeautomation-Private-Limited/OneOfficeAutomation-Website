import { Fragment, useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCustomersLogic } from '../logic/CustomersLogic';
import { CountUp, I, Icon, useHeroTop, useSeen } from '../ds/ui';
import { usePageText, Hi, Go } from '../cms/pageText';
import { storySlug } from '../cms/slug';

/* From the first call to live: when, what, and what happens. */
const END_STEPS: [string, string, string][] = [
  ['Week 1', 'Demo', 'See an agent built on your own process and documents.'],
  ['Weeks 2–5', 'Pilot', 'Automate one process end to end with our team.'],
  ['Week 6 on', 'Live', 'Scale to more processes and teams.'],
];

export default function CustomersPage() {
  const P = usePageText('page.customers');
  const v = useCustomersLogic();
  const { search } = useLocation();
  const wantFilter = new URLSearchParams(search).get('filter') ?? '';
  useEffect(() => {
    if (!wantFilter) return;
    const f = v.filters.find((x) => x.label.toLowerCase() === wantFilter.toLowerCase());
    if (f && !f.active) f.pick();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantFilter]);
  // Quotes move on by themselves: the active progress segment fills, and when it ends the next quote comes in.
  // Pointing at (or tabbing into) the quote card pauses it. Reduced motion: no fill, so nothing moves on its own.
  const quotes = v.quotes;
  const [q, setQ] = useState(0);
  const [paused, setPaused] = useState(false);
  const pickQ = (i: number) => setQ((i + quotes.length) % quotes.length);
  const cur = quotes[Math.min(q, Math.max(0, quotes.length - 1))];
  const words = (cur?.quote ?? '').split(/\s+/).filter(Boolean);
  // The hero spotlight: one story at a time, and each industry once (the first story from it).
  const heroRef = useHeroTop<HTMLElement>();
  const all = v.all;
  const [si, setSi] = useState(0);
  const [held, setHeld] = useState(false);
  const spot = all[Math.min(si, all.length - 1)];
  const inds = all.filter((x, i) => all.findIndex((y) => y.ind === x.ind) === i);
  // The closing card tries on each story's result in turn, once it is on screen (still for reduced motion).
  const { ref: endRef, seen: endSeen } = useSeen<HTMLDivElement>();
  const [ti, setTi] = useState(0);
  useEffect(() => {
    if (!endSeen || all.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => setTi((n) => (n + 1) % all.length), 2600);
    return () => window.clearInterval(id);
  }, [endSeen, all.length]);
  const try1 = all[ti % Math.max(1, all.length)];

  return (
    <>
      {/* Hero: a spotlight that moves through every story's headline result by itself (pointing at it pauses),
          with the industries alongside. The active story's industry lights up; an industry opens the stories filtered to it. */}
      <section id="overview" className="hz-hero hz-fit ab-hero cs-hero" ref={heroRef}>
        <div className="ds-container hz-hero-grid pf-hero-grid">
          <div className="pf-hero-copy">
            <p className="ab-kicker"><span className="ca-dot" />{P.kicker || `${all.length} customer stories · ${inds.length} industries`}</p>
            <h1 className="pf-h1"><Hi a={P.heroA} b={P.heroB} br /></h1>
            <p className="cu-lead">{P.heroText}</p>
            <div className="ds-actions" style={{ marginTop: 24 }}>
              <Go className="ds-btn ds-btn-grad" to={P.heroBtn1Link}>{P.heroBtn1}</Go>
              <Go className="ds-btn ds-btn-outline" to={P.heroBtn2Link}>{P.heroBtn2}</Go>
            </div>
            <div className="cs-inds" aria-label="Stories by industry">
              {inds.map((x) => (
                <a key={x.ind} href="#stories" data-on={spot?.ind === x.ind ? '1' : undefined}
                  onMouseEnter={() => setSi(all.indexOf(x))} onFocus={() => setSi(all.indexOf(x))}
                  onClick={(e) => { e.preventDefault(); v.pick(x.ind); document.getElementById('stories')?.scrollIntoView({ behavior: 'smooth' }); }}>
                  <Icon d={x.icon} size={16} />{x.ind}
                </a>
              ))}
            </div>
          </div>
          {spot && (
            <div className="cs-stage" data-paused={held ? '1' : '0'}
              onMouseEnter={() => setHeld(true)} onMouseLeave={() => setHeld(false)}
              onFocus={() => setHeld(true)} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHeld(false); }}>
              <span className="cs-ghost cs-ghost-2" aria-hidden="true" />
              <span className="cs-ghost cs-ghost-1" aria-hidden="true" />
              <article className="cs-card" key={si} aria-live="polite">
                <div className="cs-card-top">
                  <span className="cs-tag"><Icon d={spot.icon} size={16} />{spot.ind}</span>
                  <small>Story {si + 1} of {all.length}</small>
                </div>
                <b className="cs-num"><CountUp value={spot.s1} ms={1500} /></b>
                <strong className="cs-label">{spot.l1}</strong>
                <p className="cs-title">{spot.title}</p>
                <div className="cs-foot">
                  {spot.s2 && <span className="cs-second"><b>{spot.s2}</b>{spot.l2}</span>}
                  <Link to={`/customers/${storySlug(spot)}`}>Read the story <Icon d={I.arrow} size={16} stroke={2.4} /></Link>
                </div>
                <small className="cs-co">{spot.co}</small>
              </article>
              <div className="cs-bar" role="group" aria-label="Choose a story">
                {all.map((x, i) => (
                  <button key={x.co + x.title} type="button" aria-label={`${x.ind}: ${x.s1} ${x.l1}`} aria-current={i === si ? 'true' : undefined} data-done={i < si ? '1' : '0'} onClick={() => setSi(i)}>
                    {i === si && <i key={si} onAnimationEnd={() => setSi((si + 1) % all.length)} />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <svg className="hz-curve" viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden="true"><path d="M0 90 L0 44 Q720 -28 1440 44 L1440 90 Z" fill="#F4F6FD" /></svg>
      </section>

      {/* Stories */}
      <section id="stories" className="ds-soft cu-stories">
        <div className="ds-container">
          <div className="hx-head hx-head-center">
            <div>
              <h2 className="ds-h2"><Hi a={P.storiesA} b={P.storiesB} /></h2>
              <p className="ds-lead ds-muted">{P.storiesText}</p>
            </div>
          </div>
          <div className="cu-filters" role="group" aria-label="Filter stories">
            {v.filters.map((f) => <button key={f.label} type="button" aria-pressed={f.active} onClick={f.pick}>{f.label}</button>)}
          </div>
          <div className="cu-grid">
            {v.shown.map((s, i) => (
              <article className="cu-card" key={s.co + s.title} data-tone={i % 2}>
                <div className="cu-card-top">
                  <div className="cu-card-tags"><span><Icon d={s.icon} size={16} />{s.ind}</span>{s.featured && <em>Featured</em>}</div>
                  <b>{s.s1}</b>
                  <strong>{s.l1}</strong>
                </div>
                <div className="cu-card-body">
                  {/* A logo that can't be loaded falls back to the company's name. */}
                  {(s as { logo?: string }).logo
                    ? <><img className="cu-logo" src={(s as { logo?: string }).logo} alt={s.co} loading="lazy" onError={(e) => { e.currentTarget.hidden = true; (e.currentTarget.nextElementSibling as HTMLElement | null)?.removeAttribute('hidden'); }} /><small hidden>{s.co}</small></>
                    : <small>{s.co}</small>}
                  <h3>{s.title}</h3>
                  <p>{s.does}</p>
                  {s.s2 && <div className="cu-second"><b>{s.s2}</b>{s.l2}</div>}
                  <Link className="cu-more" to={`/customers/${storySlug(s)}`}>Read the story <Icon d={I.arrow} size={16} stroke={2.4} /></Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Quotes */}
      {cur && (
        <section id="quotes" className="ds-navy ds-section cu-quotes">
          <div className="ds-container">
            <div className="hx-head hx-head-center"><div><h2 className="ds-h2"><Hi a={P.quotesA} b={P.quotesB} /></h2></div></div>
            <div className="cu-qstage" data-paused={paused ? '1' : '0'}
              onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
              onFocus={() => setPaused(true)} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPaused(false); }}>
              {/* The next stories, stacked behind the current one like a deck. */}
              {quotes.length > 1 && <div className="cu-qdeck" aria-hidden="true"><span /><span /></div>}
              <figure className="cu-qcard" key={q} aria-live="polite">
                <div className="cu-qmain">
                  <svg width="52" height="41" viewBox="0 0 56 44" aria-hidden="true"><path fill="currentColor" d="M0 44V26C0 11 8 2 22 0l2 6c-8 2-12 7-12 14h10v24zm32 0V26C32 11 40 2 54 0l2 6c-8 2-12 7-12 14h10v24z" /></svg>
                  <blockquote aria-label={cur.quote}>
                    {words.map((w: string, i: number) => <Fragment key={i}><span className="cu-qw" aria-hidden="true" style={{ '--i': i } as CSSProperties}>{w}</span>{' '}</Fragment>)}
                  </blockquote>
                  <figcaption><i>{cur.role.split(' ').map((w: string) => w[0]).filter((c: string) => /[A-Z]/.test(c)).slice(0, 2).join('')}</i><span><b>{cur.role}</b>{cur.co}</span></figcaption>
                </div>
                {cur.s1 && (
                  <aside className="cu-qres">
                    <small>The result</small>
                    <b><CountUp value={cur.s1} ms={1800} /></b>
                    <span>{cur.l1}</span>
                    <Link to={`/customers/${storySlug(cur)}`}>Read the story <Icon d={I.arrow} size={16} stroke={2.4} /></Link>
                  </aside>
                )}
              </figure>
            </div>
            {quotes.length > 1 && (
              <div className="cu-qnav">
                <button type="button" aria-label="Previous quote" onClick={() => pickQ(q - 1)}><Icon d="M15 6l-6 6 6 6" size={22} stroke={2.4} /></button>
                <div className="cu-qbar" data-paused={paused ? '1' : '0'}>
                  {quotes.map((x, i) => (
                    <button key={x.co + i} type="button" aria-label={`Quote ${i + 1} of ${quotes.length}`} aria-current={i === q} data-done={i < q ? '1' : undefined} onClick={() => pickQ(i)}>
                      {i === q && <i key={q} onAnimationEnd={() => pickQ(q + 1)} />}
                    </button>
                  ))}
                </div>
                <button type="button" aria-label="Next quote" onClick={() => pickQ(q + 1)}><Icon d="M9 6l6 6-6 6" size={22} stroke={2.4} /></button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Closing: the road from first call to live on the left; on the right, the next story card left blank for the visitor,
          its number trying on real results from the stories above. */}
      <section className="ds-paper" style={{ paddingBlock: 'var(--ds-section-y)' }}>
        <div className="ds-container">
          <div className="cu-final" ref={endRef} data-seen={endSeen ? '1' : undefined}>
            <div className="cu-final-copy">
              <p className="ab-kicker"><span className="ca-dot" />{P.endKicker}</p>
              <h2 className="ds-h2">{P.endTitle}</h2>
              <p className="ds-lead">{P.endText}</p>
              <ol className="cu-road">
                {END_STEPS.map(([w, t, d], i) => (
                  <li key={t} style={{ '--k': i } as CSSProperties}><span>{i + 1}</span><div><small>{w}</small><b>{t}</b><p>{d}</p></div></li>
                ))}
              </ol>
              <div className="ds-actions">
                <Go className="ds-btn ds-btn-white" to={P.endBtn1Link}>{P.endBtn1} <Icon d={I.arrow} size={18} stroke={2.4} /></Go>
                {P.endBtn2 && <Go className="ds-btn ds-btn-outline" to={P.endBtn2Link}>{P.endBtn2}</Go>}
              </div>
            </div>
            {try1 && (
              <div className="cu-yours" aria-hidden="true">
                <span className="cs-ghost cs-ghost-1" />
                <div className="cu-yours-card">
                  <div className="cs-card-top"><span className="cs-tag"><Icon d="M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0" size={16} />Your team</span><small>Story {all.length + 1}</small></div>
                  <b className="cs-num" key={ti}>{try1.s1}</b>
                  <strong className="cs-label" key={'l' + ti}>{try1.l1}</strong>
                  <p className="cu-yours-like" key={'c' + ti}>like {try1.co.replace(/^an? /i, 'a ')}. What will yours be?</p>
                  <div className="cu-yours-blank"><i /><i /></div>
                  <div className="cs-foot"><span className="cs-second"><b>Weeks</b>to go live</span><span className="cu-yours-soon">Your story, next</span></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
