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
  const half = Math.ceil(v.faqs.length / 2);

  return (
    <>
      {/* Hero */}
      <section id="overview" className="hz-hero">
        <div className="ds-container pr-hero">
          <h1 className="pf-h1"><Hi a={P.heroA} b={P.heroB} /></h1>
          <p className="hz-tagline" style={{ marginBottom: 26 }}>{P.heroText}</p>
          <div className="pr-picker" role="group" aria-label="Who will use it?">
            <span>Who will use it?</span>
            <div>{v.sizes.map((s) => <button key={s.label} type="button" aria-pressed={s.active} onClick={s.pick}>{s.label}</button>)}</div>
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
                  <div className="pr-plan-top">
                    {/* One badge per card: the personal recommendation wins over "Most popular". */}
                    {(rec || p.popular) && <div className="pr-badges">{rec ? <em data-rec="">Recommended for you</em> : <em>Most popular</em>}</div>}
                    <i><Icon d={PLAN_ICON[p.id] ?? I.layers} size={26} /></i>
                    <h2>{p.name}</h2>
                    <p>{p.who}</p>
                  </div>
                  <div className="pr-plan-body">
                    <div className="pr-price"><b>{p.price}</b>{p.per && <span>{p.per}</span>}</div>
                    <Cta href={p.href} className={`ds-btn ${p.popular || rec ? 'ds-btn-grad' : 'ds-btn-line'} pr-cta`}>{p.cta}</Cta>
                    <ul>{p.feats.map((f: string) => <li key={f}><Icon d={I.check} size={18} stroke={2.6} />{f}</li>)}</ul>
                  </div>
                </article>
              );
            })}
          </div>
          <p className="pr-note">{v.t.note}</p>
        </div>
      </section>

      {/* Savings calculator */}
      {calc.show !== false && (
        <section id="calculator" className="ds-paper ds-section">
          <div className="ds-container">
            <div className="hx-head hx-head-center"><div><h2 className="ds-h2">{calc.title.split(' ').slice(0, -1).join(' ')} <span className="ds-gradtext">{calc.title.split(' ').slice(-1)}</span></h2><p className="ds-lead ds-muted">{calc.text}</p></div></div>
            <Calculator c={calc} />
          </div>
        </section>
      )}

      {/* Compare */}
      <section id="compare" className="ds-soft ds-section">
        <div className="ds-container">
          <div className="hx-head hx-head-center"><div><h2 className="ds-h2"><Hi a={P.compareA} b={P.compareB} /></h2></div></div>
          <div className="pr-table-wrap">
            <table className="pr-table">
              <thead>
                <tr><th scope="col">Features</th>{v.cmpHead.map((h, i) => <th scope="col" key={h.name} data-pop={v.plans[i]?.popular ? '1' : '0'}>{h.name}</th>)}</tr>
              </thead>
              <tbody>
                {v.cmpRows.map((r) => (
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
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="ds-paper ds-section">
        <div className="ds-container">
          <div className="hx-head hx-head-center"><div><h2 className="ds-h2"><Hi a={P.faqA} b={P.faqB} /></h2></div></div>
          <div className="pr-faq">
            {[v.faqs.slice(0, half), v.faqs.slice(half)].map((col, ci) => (
              <div key={ci}>
                {col.map((f, k) => {
                  const id = `pr-faq-${ci}-${k}`;
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
            ))}
          </div>
        </div>
      </section>

      {/* Closing */}
      <section className="ds-paper ds-section">
        <div className="ds-container pr-close">
          <div>
            <i><Icon d={I.chat} size={26} /></i>
            <h2>{P.helpTitle}</h2>
            <p>Tell us about your processes and we’ll recommend the right fit.</p>
            <Go className="ds-btn ds-btn-white" to={P.helpBtnLink}>{P.helpBtn} <Icon d={I.arrow} size={18} stroke={2.4} /></Go>
          </div>
          <div data-tone="1">
            <i><Icon d={PLAN_ICON.enterprise} size={26} /></i>
            <h2>{P.entTitle}</h2>
            <p>Unlimited users and Runners, with 24/7 SLA-backed support.</p>
            <Go className="ds-btn ds-btn-white" to={P.entBtnLink}>{P.entBtn} <Icon d={I.arrow} size={18} stroke={2.4} /></Go>
          </div>
        </div>
      </section>
    </>
  );
}
