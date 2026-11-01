import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCustomersLogic } from '../logic/CustomersLogic';
import { I, Icon } from '../ds/ui';
import { usePageText, Hi, Go } from '../cms/pageText';
import { storySlug } from '../cms/slug';

/* Counts a figure like "3,500" or "80%" up from zero once, keeping its prefix and suffix. */
function CountUp({ value }: { value: string }) {
  const m = value.match(/^([^0-9]*)([0-9][0-9,.]*)(.*)$/);
  const [shown, setShown] = useState(value);
  useEffect(() => {
    if (!m || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setShown(value); return; }
    const target = parseFloat(m[2].replace(/,/g, ''));
    const decimals = (m[2].split('.')[1] || '').length;
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 1400);
      const n = target * (1 - Math.pow(1 - p, 3));
      const txt = n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
      setShown(`${m[1]}${txt}${m[3]}`);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span aria-label={value}>{shown}</span>;
}

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
  const quotes = v.quotes;
  const [q, setQ] = useState(0);
  const [hover, setHover] = useState(false);
  const [auto, setAuto] = useState(false);
  const lastPick = useRef(0);
  useEffect(() => { setAuto(!window.matchMedia('(prefers-reduced-motion: reduce)').matches); }, []);
  useEffect(() => {
    if (!auto || quotes.length < 2) return;
    const t = window.setInterval(() => {
      if (hover || Date.now() - lastPick.current < 9000) return;
      setQ((x) => (x + 1) % quotes.length);
    }, 6000);
    return () => window.clearInterval(t);
  }, [auto, hover, quotes.length]);
  const pickQ = (i: number) => { lastPick.current = Date.now(); setQ((i + quotes.length) % quotes.length); };
  const cur = quotes[Math.min(q, Math.max(0, quotes.length - 1))];

  return (
    <>
      {/* Hero */}
      <section id="overview" className="hz-hero">
        <div className="ds-container hz-hero-grid pf-hero-grid">
          <div>
            <h1 className="pf-h1"><Hi a={P.heroA} b={P.heroB} br /></h1>
            <p className="cu-lead">{P.heroText}</p>
            <div className="ds-actions" style={{ marginTop: 24 }}>
              <Go className="ds-btn ds-btn-grad" to={P.heroBtn1Link}>{P.heroBtn1}</Go>
              <Go className="ds-btn ds-btn-outline" to={P.heroBtn2Link}>{P.heroBtn2}</Go>
            </div>
          </div>
          <div className="cu-board">
            <div className="cu-board-h"><Icon d="M4 20V10M10 20V4M16 20v-7M22 20H2" size={20} />Results at a glance</div>
            {v.board.slice(0, 3).map((s) => (
              <div className="cu-board-r" key={s.co + s.s1}>
                <b><CountUp value={s.s1} /></b>
                <span>{s.l1}<small>{s.co}</small></span>
              </div>
            ))}
          </div>
        </div>
        <svg className="hz-curve" viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden="true"><path d="M0 90 L0 44 Q720 -28 1440 44 L1440 90 Z" fill="#F4F6FD" /></svg>
      </section>

      {/* Stories */}
      <section id="stories" className="ds-soft" style={{ paddingTop: 'clamp(28px, 3.5vw, 48px)', paddingBottom: 'var(--ds-section-y)', scrollMarginTop: 80 }}>
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
                  {(s as { logo?: string }).logo ? <img className="cu-logo" src={(s as { logo?: string }).logo} alt={s.co} loading="lazy" /> : <small>{s.co}</small>}
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
        <section id="quotes" className="ds-navy ds-section cu-quotes" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
          <div className="ds-container">
            <div className="hx-head hx-head-center"><div><h2 className="ds-h2"><Hi a={P.quotesA} b={P.quotesB} /></h2></div></div>
            <figure className="cu-quote" key={q} aria-live="polite">
              <svg width="64" height="50" viewBox="0 0 56 44" aria-hidden="true"><path fill="currentColor" d="M0 44V26C0 11 8 2 22 0l2 6c-8 2-12 7-12 14h10v24zm32 0V26C32 11 40 2 54 0l2 6c-8 2-12 7-12 14h10v24z" /></svg>
              <blockquote>{cur.quote}</blockquote>
              <figcaption><i>{cur.role.split(' ').map((w: string) => w[0]).filter((c: string) => /[A-Z]/.test(c)).slice(0, 2).join('')}</i><span><b>{cur.role}</b>{cur.co}</span></figcaption>
            </figure>
            {quotes.length > 1 && (
              <div className="cu-qnav">
                <button type="button" aria-label="Previous quote" onClick={() => pickQ(q - 1)}><Icon d="M15 6l-6 6 6 6" size={22} stroke={2.4} /></button>
                <div className="sl-dots" style={{ margin: 0 }}>
                  {quotes.map((x, i) => <button key={x.co + i} type="button" aria-label={`Quote ${i + 1}`} aria-current={i === q} onClick={() => pickQ(i)} />)}
                </div>
                <button type="button" aria-label="Next quote" onClick={() => pickQ(q + 1)}><Icon d="M9 6l6 6-6 6" size={22} stroke={2.4} /></button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Closing */}
      <section className="ds-paper" style={{ paddingBlock: 'var(--ds-section-y)' }}>
        <div className="ds-container">
          <div className="hz-final">
            <svg viewBox="0 0 600 360" fill="none" aria-hidden="true"><circle cx="225" cy="180" r="150" stroke="#8FB8FF" strokeOpacity=".35" strokeWidth="2" /><circle cx="375" cy="180" r="150" stroke="#C3B1FF" strokeOpacity=".35" strokeWidth="2" /></svg>
            <h2 className="ds-h2" style={{ position: 'relative' }}>{P.endTitle}</h2>
            <p className="ds-lead" style={{ position: 'relative' }}>{P.endText}</p>
            <ol className="cu-path">
              {[['Demo', 'See an agent built for your process.'], ['Pilot', 'Automate one process with our team.'], ['Live', 'Scale to more processes and teams.']].map(([t, d], i) => (
                <li key={t}><span>{i + 1}</span><b>{t}</b><small>{d}</small></li>
              ))}
            </ol>
            <div className="ds-actions" style={{ position: 'relative', justifyContent: 'center' }}>
              <Go className="ds-btn ds-btn-white" to={P.endBtn1Link}>{P.endBtn1} <Icon d={I.arrow} size={18} stroke={2.4} /></Go>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
