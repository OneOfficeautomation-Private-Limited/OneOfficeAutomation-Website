import { useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePricingLogic } from '../logic/PricingLogic';
import { I, Icon } from '../ds/ui';
import Calculator from '../ds/Calculator';
import type { CalcText } from '../ds/Calculator';
import { useCms } from '../cms/CmsContext';
import RD from '../cms/defaults.generated.json';
import { usePageText, Hi, Go } from '../cms/pageText';

const PLAN_ICON: Record<string, string> = {
  community: I.code,
  starter: I.play,
  business: I.layers,
  enterprise: 'M3 21h18M5 21V10h14v11M9 21v-6h6v6M12 3l9 6H3z',
};

function Cta({ href, children, className }: { href: string; children: React.ReactNode; className: string }) {
  return href.startsWith('/') ? <Link className={className} to={href}>{children}</Link> : <a className={className} href={href}>{children}</a>;
}

export default function PricingPage() {
  const P = usePageText('page.pricing');
  const v = usePricingLogic();
  const cms = useCms();
  const calc = { ...RD['resources.calculator'], ...cms<Partial<CalcText>>('resources.calculator', {}) } as CalcText;
  // The comparison table shows as many rows as fit the screen (heading to button, below the header); the rest open with "Show all".
  const cmpRef = useRef<HTMLElement>(null);
  const [fitRows, setFitRows] = useState(v.cmpRows.length);
  const [allRows, setAllRows] = useState(false);
  useLayoutEffect(() => {
    const sec = cmpRef.current;
    if (!sec) return;
    const measure = () => {
      const row = sec.querySelector<HTMLElement>('.pr-table tbody tr');
      const head = sec.querySelector<HTMLElement>('.hx-head');
      const thead = sec.querySelector<HTMLElement>('.pr-table thead');
      if (!row || !head || !thead || window.innerWidth <= 760) { setFitRows(v.cmpRows.length); return; }
      const hdr = document.querySelector<HTMLElement>('.ooa-hdr')?.offsetHeight ?? 72;
      const used = parseFloat(getComputedStyle(sec).paddingTop) + head.offsetHeight + parseFloat(getComputedStyle(head).marginBottom) + thead.offsetHeight + 76; // 76: the button and a little air below it
      const n = Math.floor((window.innerHeight - hdr - used) / row.offsetHeight);
      setFitRows(n >= v.cmpRows.length - 1 ? v.cmpRows.length : Math.max(6, n));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [v.cmpRows.length]);
  const rowsShown = allRows ? v.cmpRows : v.cmpRows.slice(0, fitRows);
  const moreRows = v.cmpRows.length - fitRows;

  // Phones compare one plan at a time; it starts on the plan recommended for the visitor.
  const recIndex = Math.max(0, v.cmpHead.findIndex((h) => h.name === v.rec));
  const [cmpPick, setCmpPick] = useState<number | null>(null);
  const cmpAt = cmpPick ?? recIndex;
  // On narrow screens the recommended card can be far below the picker, so bring it into view.
  const pickSize = (pick: () => void) => {
    pick();
    if (window.innerWidth > 1080) return;
    window.setTimeout(() => document.querySelector('.pr-plan[data-rec="1"]')?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center',
    }), 60);
  };

  return (
    <>
      {/* Hero */}
      <section id="overview" className="hz-hero">
        <div className="ds-container pr-hero">
          <h1 className="pf-h1"><Hi a={P.heroA} b={P.heroB} /></h1>
          <p className="hz-tagline" style={{ marginBottom: 26 }}>{P.heroText}</p>
          <div className="pr-picker" role="group" aria-label="Who will use it?">
            <span>Who will use it?</span>
            <div>{v.sizes.map((s) => <button key={s.label} type="button" aria-pressed={s.active} onClick={() => pickSize(s.pick)}>{s.label}</button>)}</div>
            <p aria-live="polite">We recommend <b>{v.rec}</b></p>
          </div>
        </div>
        <svg className="hz-curve" viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden="true"><path d="M0 90 L0 44 Q720 -28 1440 44 L1440 90 Z" fill="#F4F6FD" /></svg>
      </section>

      {/* Plans */}
      <section id="plans" className="ds-soft" style={{ paddingTop: 'clamp(16px, 2vw, 28px)', paddingBottom: 'clamp(56px, 7vw, 96px)', scrollMarginTop: 80 }}>
        <div className="ds-container">
          <div className="pr-plans">
            {v.plans.map((p, i) => {
              const rec = String(p.border).startsWith('linear');
              return (
                <article key={p.id} className="pr-plan" data-tone={i % 2} data-popular={p.popular ? '1' : '0'} data-rec={rec ? '1' : '0'}>
                  {/* One badge per card, sitting on its top edge: the personal recommendation wins over "Most popular". */}
                  {(rec || p.popular) && <div className="pr-badges">{rec ? <em data-rec="">Recommended for you</em> : <em>Most popular</em>}</div>}
                  <div className="pr-plan-top">
                    <i><Icon d={PLAN_ICON[p.id] ?? I.layers} size={26} /></i>
                    <h2>{p.name}</h2>
                    <p>{p.who}</p>
                  </div>
                  <div className="pr-plan-buy">
                    <div className="pr-price"><b>{p.price}</b>{p.per && <span>{p.per}</span>}</div>
                    <Cta href={p.href} className={`ds-btn ${p.popular || rec ? 'ds-btn-grad' : 'ds-btn-line'} pr-cta`}>{p.cta}</Cta>
                  </div>
                  <ul className="pr-plan-feats">{p.feats.map((f: string) => <li key={f}><Icon d={I.check} size={18} stroke={2.6} />{f}</li>)}</ul>
                </article>
              );
            })}
          </div>
          <p className="pr-note">{v.t.note}</p>
        </div>
      </section>

      {/* Savings calculator */}
      {calc.show !== false && (
        <section id="calculator" className="ds-paper ds-section pr-calc-sec">
          <div className="ds-container">
            <div className="hx-head hx-head-center"><div><h2 className="ds-h2">{calc.title.split(' ').slice(0, -1).join(' ')} <span className="ds-gradtext">{calc.title.split(' ').slice(-1)}</span></h2><p className="ds-lead ds-muted">{calc.text}</p></div></div>
            <Calculator c={calc} />
          </div>
        </section>
      )}

      {/* Compare */}
      <section id="compare" className="ds-soft ds-section pr-cmp-sec" ref={cmpRef}>
        <div className="ds-container">
          <div className="hx-head hx-head-center"><div><h2 className="ds-h2"><Hi a={P.compareA} b={P.compareB} /></h2></div></div>
          <div className="pr-table-wrap" data-more={!allRows && moreRows > 0 ? '1' : undefined}>
            <table className="pr-table">
              <thead>
                <tr><th scope="col">Features</th>{v.cmpHead.map((h, i) => <th scope="col" key={h.name} data-pop={v.plans[i]?.popular ? '1' : '0'}>{h.name}</th>)}</tr>
              </thead>
              <tbody>
                {rowsShown.map((r) => (
                  <tr key={r.feature}>
                    <th scope="row">{r.feature}</th>
                    {r.cells.map((c, i) => (
                      <td key={i} data-pop={v.plans[i]?.popular ? '1' : '0'}>
                        {c.isYes && <span className="pr-yes"><Icon d={I.check} size={16} stroke={3} /><span className="ds-sr">Included</span></span>}
                        {c.isNo && <span className="pr-no" aria-label="Not included">–</span>}
                        {c.isText && <span className="pr-txt">{c.text}</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {moreRows > 0 && (
            <div className="pr-more">
              <button type="button" aria-expanded={allRows} onClick={() => {
                if (allRows) cmpRef.current?.scrollIntoView({ block: 'start' });
                setAllRows(!allRows);
              }}>
                {allRows ? 'Show fewer features' : `Show all ${v.cmpRows.length} features`}
                <Icon d={allRows ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'} size={18} stroke={2.4} />
              </button>
            </div>
          )}

          {/* Phones: pick a plan, see everything it includes. */}
          <div className="pr-cmp-m">
            <div className="pr-cmp-tabs" role="tablist" aria-label="Choose a plan to compare">
              {v.cmpHead.map((h, i) => (
                <button key={h.name} type="button" role="tab" aria-selected={i === cmpAt} aria-controls="pr-cmp-list" onClick={() => setCmpPick(i)}>{h.name}</button>
              ))}
            </div>
            <ul className="pr-cmp-list" id="pr-cmp-list" role="tabpanel" aria-label={`${v.cmpHead[cmpAt]?.name} plan`} key={cmpAt}>
              {v.cmpRows.map((r) => {
                const c = r.cells[cmpAt];
                return (
                  <li key={r.feature} data-no={c?.isNo ? '1' : undefined}>
                    <span>{r.feature}</span>
                    {c?.isYes && <span className="pr-yes"><Icon d={I.check} size={16} stroke={3} /><span className="ds-sr">Included</span></span>}
                    {c?.isNo && <span className="pr-no" aria-label="Not included">–</span>}
                    {c?.isText && <span className="pr-txt">{c.text}</span>}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="ds-paper ds-section">
        <div className="ds-container">
          <div className="hx-head hx-head-center"><div><h2 className="ds-h2"><Hi a={P.faqA} b={P.faqB} /></h2></div></div>
          <div className="pr-faq">
            {v.faqs.map((f, k) => {
              const id = `pr-faq-${k}`;
              return (
                <div className="pr-q" key={f.q} data-open={f.open ? '1' : '0'}>
                  <h3>
                    <button type="button" aria-expanded={f.expanded} aria-controls={id} onClick={f.toggle}>
                      <span>{f.q}</span><i aria-hidden="true">{f.open ? '−' : '+'}</i>
                    </button>
                  </h3>
                  {f.open && <p id={id}>{f.a}</p>}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Closing: one plain strip, the same as the other pages: help choosing, or Enterprise. */}
      <section className="ds-paper rs-ask-sec">
        <div className="ds-container">
          <div className="ask-strip">
            <div>
              <h2>{P.helpTitle}</h2>
              <p>Tell us about your processes and we’ll recommend the right fit. {P.entTitle} Unlimited users and Runners, with 24/7 SLA-backed support.</p>
            </div>
            <div className="ds-actions">
              <Go className="ds-btn ds-btn-white" to={P.helpBtnLink}>{P.helpBtn} <Icon d={I.arrow} size={18} stroke={2.4} /></Go>
              <Go className="ds-btn ds-btn-outline" to={P.entBtnLink}>{P.entBtn}</Go>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
