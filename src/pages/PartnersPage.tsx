import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { usePartnersLogic } from '../logic/PartnersLogic';
import { useSite } from '../cms/CmsContext';
import { I, Icon, Rings, useAutoplay, useHeroTop, useSeen } from '../ds/ui';
import { Contacts, Done, Field } from '../ds/Form';
import { PartnerDirectory } from './public/PublicPages';
import { usePageText, Hi, Go } from '../cms/pageText';

/* One small live scene per partner type (same order as the types). */
const REGION_PINS: [number, number][] = [[18, 34], [38, 58], [55, 28], [72, 52], [86, 30]];
const TYPE_PICS: ReactNode[] = [
  // Implementation: a client project fills up to 100% as its go-live checklist is ticked off.
  <div className="px-go" key="g">
    <span className="px-ring"><svg viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="32" /><circle className="px-arc" cx="40" cy="40" r="32" pathLength="100" /></svg><b /></span>
    <ul>{['Discovery', 'Agents built', 'Go live'].map((t) => <li key={t}><i>✓</i>{t}</li>)}</ul>
  </div>,
  // Reseller: deals drop onto the map one by one while the pipeline value counts up.
  <div className="px-reg" key="r">
    <div className="px-map" aria-hidden="true">{Array.from({ length: 40 }, (_, i) => <i key={i} />)}{REGION_PINS.map(([x, y], i) => <u key={i} style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${i * 0.7}s` }} />)}</div>
    <p><small>Pipeline</small><b /></p>
  </div>,
  // Technology: your app plugs into OneOffice, a spark confirms the connection, and the connector goes live.
  <div className="px-conn" key="c">
    <span><Icon d="M4 5h16v14H4zM4 9h16" size={22} />Your app</span>
    <b><i /></b>
    <span data-us=""><Rings width={30} />OneOffice</span>
    <em>Connector live</em>
  </div>,
];

/* What each partner type is doing right now, shown beside its node in the hero (in the same order as the types). */
const TOASTS: [string, string][] = [['Client project went live', I.check], ['New deal registered', I.shield], ['Integration published', 'M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8 5.8 21.3l2.4-7.4L2 9.4h7.6z']];
/* Node centres in the 440 × 400 picture, for the beam from the core to the active node. */
const NODE_AT: [number, number][] = [[220, 48], [374, 264], [70, 264]];
const prefersStill = () => typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function PartnersPage() {
  const P = usePageText('page.partners');
  const v = usePartnersLogic();
  // Company details through useSite(), which understands every saved format (the raw value has no phoneIndia/phoneQatar once saved).
  const site = useSite();
  const heroRef = useHeroTop<HTMLElement>();
  const points = P.list('heroPoints');
  // The partner types take turns in the spotlight; hovering one holds it there.
  const [act, setAct] = useState(prefersStill() ? 0 : -1);
  const [hold, setHold] = useState(false);
  useEffect(() => {
    if (prefersStill() || hold) return;
    const t = window.setTimeout(() => setAct((a) => (a + 1) % 3), act < 0 ? 1200 : 3000);
    return () => window.clearTimeout(t);
  }, [act, hold]);
  // Clicking a type in the hero brings its card into view and briefly highlights it.
  const [flash, setFlash] = useState(-1);
  const goToType = (i: number) => {
    const card = document.querySelectorAll<HTMLElement>('.px-type')[i];
    card?.scrollIntoView({ behavior: prefersStill() ? 'auto' : 'smooth', block: 'center' });
    setFlash(i);
    window.setTimeout(() => setFlash(-1), 1800);
  };
  const proc = useAutoplay(v.procSteps.length, 4600);
  const step = v.procSteps[proc.i];
  const ladder = useSeen<HTMLDivElement>();
  const b = v.benefits;

  return (
    <>
      {/* Hero */}
      <section id="overview" className="hz-hero hz-fit px-hero" ref={heroRef}>
        <div className="ds-container hz-hero-grid pf-hero-grid">
          <div className="pf-hero-copy">
            <p className="ab-kicker"><Rings width={30} />{P.kicker}</p>
            <h1 className="pf-h1"><Hi a={P.heroA} b={P.heroB} br /></h1>
            <p className="cu-lead">{P.heroText}</p>
            <div className="ds-actions" style={{ marginTop: 24 }}>
              <Go className="ds-btn ds-btn-grad" to={P.heroBtn1Link}>{P.heroBtn1}</Go>
              <Go className="ds-btn ds-btn-outline" to={P.heroBtn2Link}>{P.heroBtn2}</Go>
            </div>
            {points.length > 0 && <ul className="px-points">{points.map((pt) => <li key={pt}><Icon d={I.check} size={16} stroke={2.8} />{pt}</li>)}</ul>}
            {P.heroNote && <p className="px-note"><i aria-hidden="true" />{P.heroNote}</p>}
          </div>
          {/* The partner network: the types take turns to light up, with a beam from the core and what that partner is doing.
              Hovering one holds it; clicking one goes to its card below. */}
          <nav className="px-net" aria-label="Partner types">
            <svg viewBox="0 0 440 400" aria-hidden="true"><circle cx="220" cy="200" r="150" fill="none" stroke="rgba(143,184,255,.25)" strokeDasharray="3 9" /><circle cx="220" cy="200" r="95" fill="none" stroke="rgba(195,177,255,.2)" /></svg>
            <svg className="px-beams" viewBox="0 0 440 400" aria-hidden="true">
              {NODE_AT.map(([x, y], i) => <line key={i} x1="220" y1="200" x2={x} y2={y} data-on={act === i ? '1' : undefined} />)}
            </svg>
            <span className="px-core" aria-hidden="true"><Rings width={74} /></span>
            {v.types.slice(0, 3).map((t, i) => (
              <a key={t.k} href="#types" className={`px-node px-node-${i}`} data-on={act === i ? '1' : undefined}
                onMouseEnter={() => { setHold(true); setAct(i); }} onMouseLeave={() => setHold(false)}
                onFocus={() => { setHold(true); setAct(i); }} onBlur={() => setHold(false)}
                onClick={(e) => { e.preventDefault(); goToType(i); }}>
                <i><Icon d={t.icon} size={22} /></i>{t.k.replace(' partner', '')}
              </a>
            ))}
            {TOASTS.map(([t, d], i) => <span key={t} className={`px-toast px-toast-${i}`} data-on={act === i ? '1' : undefined} aria-hidden="true"><i><Icon d={d} size={16} stroke={2.4} /></i>{t}</span>)}
          </nav>
        </div>
        <svg className="hz-curve" viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden="true"><path d="M0 90 L0 44 Q720 -28 1440 44 L1440 90 Z" fill="#F4F6FD" /></svg>
      </section>

      {/* Partner types */}
      <section id="types" className="ds-soft px-types-sec" style={{ paddingTop: 'clamp(28px, 3.5vw, 48px)', paddingBottom: 'var(--ds-section-y)', scrollMarginTop: 80 }}>
        <div className="ds-container">
          <div className="hx-head hx-head-center"><div><h2 className="ds-h2"><Hi a={P.typesA} b={P.typesB} /></h2></div></div>
          <div className="px-types">
            {v.types.map((t, i) => (
              <article key={t.k} className="px-type" data-tone={i % 2} data-flash={flash === i ? '1' : undefined}>
                <div className="px-type-pic" aria-hidden="true">{TYPE_PICS[i % TYPE_PICS.length]}</div>
                <div className="px-type-body">
                  <div className="px-type-h"><i><Icon d={t.icon} size={24} /></i><span><h3>{t.k}</h3><small>{t.who}</small></span></div>
                  <p>{t.do}</p>
                  <ul>{t.get.map((g: string) => <li key={g}><Icon d={I.check} size={16} stroke={2.8} />{g}</li>)}</ul>
                  <a className="ds-btn ds-btn-grad" href="#apply" onClick={t.pick}>Apply as {t.k.toLowerCase()} <Icon d={I.arrow} size={18} stroke={2.4} /></a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits bento */}
      <section id="benefits" className="ds-paper ds-section">
        <div className="ds-container">
          <div className="hx-head hx-head-center"><div><h2 className="ds-h2"><Hi a={P.benefitsA} b={P.benefitsB} /></h2></div></div>
          {b.length >= 6 && (
            <div className="px-bento">
              <div className="px-b px-b-wide px-dark">
                <span><b>{b[0].t}</b><small>{b[0].d}</small></span>
                <div className="px-chart" aria-hidden="true">{[34, 48, 44, 62, 70, 86].map((h, k) => <i key={k} style={{ height: `${h}%` }} />)}</div>
              </div>
              <div className="px-b">
                <span className="px-badge" aria-hidden="true"><Icon d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8 5.8 21.3l2.4-7.4L2 9.4h7.6z" size={30} /></span>
                <b>{b[1].t}</b><small>{b[1].d}</small>
              </div>
              <div className="px-b px-purple">
                <div className="px-term" aria-hidden="true"><i /><i /><i /><code>agent.run(“demo”)</code><code data-ok="">✓ Sandbox ready</code></div>
                <b>{b[2].t}</b><small>{b[2].d}</small>
              </div>
              <div className="px-b">
                <div className="px-deal" aria-hidden="true"><Icon d={I.shield} size={20} /><span><b>Client rollout</b><small>Registered to you</small></span><em>Protected</em></div>
                <b>{b[3].t}</b><small>{b[3].d}</small>
              </div>
              <div className="px-b px-b-wide px-blue">
                <span><b>{b[4].t}</b><small>{b[4].d}</small></span>
                <div className="px-tags" aria-hidden="true"><em>Campaigns</em><em>Events</em><em>Case studies</em><em>Webinars</em></div>
              </div>
              <div className="px-b">
                <div className="px-mgr" aria-hidden="true"><i>PM</i><span><b>Your partner manager</b><small>One contact, always</small></span></div>
                <b>{b[5].t}</b><small>{b[5].d}</small>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Levels ladder */}
      <section id="levels" className="ds-soft ds-section">
        <div className="ds-container">
          <div className="hx-head hx-head-center">
            <div><h2 className="ds-h2"><Hi a={P.tiersA} b={P.tiersB} /></h2><p className="ds-lead ds-muted">{P.tiersText}</p></div>
          </div>
          <div className="px-ladder" ref={ladder.ref} data-seen={ladder.seen ? '1' : '0'}>
            <div className="px-line" aria-hidden="true"><b /></div>
            {v.tiers.map((t, i) => (
              <div key={t.n} className="px-step" style={{ ['--k' as string]: i }} data-top={i === v.tiers.length - 1 ? '1' : '0'}>
                <span className="pa-medal"><Icon d={t.icon} size={26} /></span>
                <small>{t.label}</small>
                <h3>{t.n}</h3>
                <p>{t.desc}</p>
                <ul>{t.perks.map((p: string) => <li key={p}><Icon d={I.check} size={16} stroke={2.8} />{p}</li>)}</ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Procedure walkthrough */}
      <section id="procedure" className="ds-navy ds-section pf-together">
        <div className="ds-container">
          <div className="hx-head">
            <div>
              <h2 className="ds-h2"><Hi a={P.processA} b={P.processB} /></h2>
              <p className="ds-lead ds-muted">{P.processText}</p>
            </div>
            <Go className="ds-btn ds-btn-white" to={P.processBtnLink}>{P.processBtn} <Icon d={I.arrow} size={18} stroke={2.4} /></Go>
          </div>
          {step && (
            <div className="px-walk" {...proc.bind} data-run={proc.running ? '1' : '0'}>
              <ol className="px-walk-list">
                {v.procSteps.map((s, k) => (
                  <li key={s.title}>
                    <button type="button" aria-pressed={k === proc.i} onClick={() => proc.go(k)}>
                      <span className="n">{s.n}</span><b>{s.title}</b><em>{s.time}</em>
                    </button>
                  </li>
                ))}
              </ol>
              <div className="px-walk-d" key={proc.i} aria-live="polite">
                <div className="px-walk-top"><span>Step {step.n} of {v.procSteps.length}</span><em><Icon d={I.clock} size={16} />{step.time}</em></div>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
                <div className="px-who">
                  <div><small>You</small>{step.you}</div>
                  <div><small>We</small>{step.we}</div>
                  {step.hasPrepare && <div><small>Prepare</small>{step.prepare}</div>}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <PartnerDirectory />

      {/* Apply */}
      <section id="apply" className="ds-soft ds-section" style={{ scrollMarginTop: 80 }}>
        <div className="ds-container fm-wrap fm-wrap-dark">
          <div className="fm-side fm-dark">
            <h2 className="ds-h2"><Hi a={P.applyA} b={P.applyB} /></h2>
            <p className="ds-lead">{P.applyText}</p>
            <p style={{ margin: 0 }}>Already a partner? <a className="ds-link" href="/partner/login">Sign in to the partner portal</a></p>
            <Contacts email={site.salesEmail} phoneIndia={site.phoneIndia} phoneQatar={site.phoneQatar} />
          </div>
          <div className="fm-card">
            {v.formOpen && (
              <form onSubmit={v.submit} className="fm">
                <Field id="pn" label="Full name" required><input id="pn" name="pn" type="text" autoComplete="name" required /></Field>
                <Field id="pc" label="Company" required><input id="pc" name="pc" type="text" autoComplete="organization" required /></Field>
                <Field id="pe" label="Work email" required><input id="pe" name="pe" type="email" autoComplete="email" required /></Field>
                <Field id="pk" label="Country" required><input id="pk" name="pk" type="text" autoComplete="country-name" required /></Field>
                <Field id="pt" label="Partner type" wide>
                  <select id="pt" name="pt" defaultValue={v.sel?.k} key={v.sel?.k}>
                    {v.types.map((t) => <option key={t.k}>{t.k}</option>)}
                    <option>Not sure yet</option>
                  </select>
                </Field>
                <Field id="pm" label="Tell us about your business" wide><textarea id="pm" name="pm" rows={4} /></Field>
                <button type="submit" className="ds-btn ds-btn-grad fm-submit">{P.applySubmit}</button>
                {v.error && <p role="alert" className="fm-err">{v.error}</p>}
              </form>
            )}
            {v.sent && <Done title="Thanks for applying." text="Our partner team will be in touch within two business days." again="Submit another application" onAgain={v.reset} />}
          </div>
        </div>
      </section>
    </>
  );
}
