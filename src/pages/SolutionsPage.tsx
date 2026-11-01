import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSolutionsLogic } from '../logic/SolutionsLogic';
import { I, Icon } from '../ds/ui';
import PD from '../cms/defaults.generated.json';
import { useCms } from '../cms/CmsContext';
import { usePageText, Hi, Go } from '../cms/pageText';
import { slugify } from '../cms/slug';


const USE_ICONS = [I.spark, I.doc, I.layers, I.audit];

export const SPOTS = [
  { sector: 'Banking', title: 'KYC checks', before: 'Analysts copy details between documents, screening tools and the core system, one customer at a time.',
    after: 'The agent reads the documents, screens every name and builds the case. Analysts only review what’s flagged.',
    checks: ['Document verified', 'Address matched', 'Watchlist screened', 'Risk rated: low'], result: 'Ready for officer review' },
  { sector: 'Insurance', title: 'Claims intake', before: 'Claim emails wait in a shared inbox until someone has time to re-type them into the claims system.',
    after: 'The agent reads each claim as it arrives, creates the record, attaches the evidence and assigns an adjuster.',
    checks: ['Policy no. found', 'Incident date read', 'Photos attached', 'Estimate added'], result: 'Claim created in minutes, adjuster assigned' },
  { sector: 'Healthcare', title: 'Insurance pre-authorisation', before: 'The billing desk fills insurer portals by hand and keeps refreshing them to check approval status.',
    after: 'The agent submits each request with patient data from the HIS and tracks status until it’s approved.',
    checks: ['Patient data read from the HIS', 'Request submitted to insurer portal', 'Status tracked', 'Approved'], result: 'Approval tracked automatically' },
  { sector: 'Logistics', title: 'Carrier portal tracking', before: 'Coordinators log into every carrier portal several times a day to copy shipment updates.',
    after: 'The agent checks every portal on schedule, updates the TMS and emails customers when status changes.',
    checks: ['Carrier A checked', 'Carrier B checked', 'Carrier C checked', 'Delivered, proof saved'], result: 'Customer notified' },
  { sector: 'Manufacturing', title: 'Three-way matching', before: 'Accounts payable compares purchase orders, goods receipts and invoices line by line.',
    after: 'The agent matches all three documents automatically and only routes the exceptions for review.',
    checks: ['Purchase order', 'Goods receipt', 'Invoice', 'All three matched'], result: 'Matched, ready to pay. Exceptions go to a reviewer.' },
];

export const CROSS: [string, string][] = [
  ['Invoice processing', I.doc], ['Data migration', I.db], ['Report generation', 'M4 20V10M10 20V4M16 20v-7M22 20H2'],
  ['Email triage', I.mail], ['Employee onboarding', I.key], ['Vendor management', 'M3 21V10l5 3V10l5 3V7l8 4v10z'],
  ['Web data extraction', 'M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18'], ['Document processing', I.layers], ['Reconciliation', 'M7 7h13l-4-4M17 17H4l4 4'],
  ['Form filling', 'M4 4h16v16H4zM8 9h8M8 13h8M8 17h5'], ['System integration', I.network], ['Compliance checks', I.shield],
];

export default function SolutionsPage() {
  const P = usePageText('page.solutions');
  const v = useSolutionsLogic();
  const cms = useCms();
  const spots = cms<typeof SPOTS>('solutions.spotlights', PD['solutions.spotlights'] as typeof SPOTS);
  const cross = cms<{ t: string; icon?: string }[]>('solutions.cross', PD['solutions.cross']).map((x, i) => [x.t, x.icon || CROSS[i % CROSS.length][1]] as [string, string]);
  const [sec, setSec] = useState(0);
  const sectors = v.sectors;
  const sel = sectors[Math.min(sec, sectors.length - 1)];
  const { search } = useLocation();
  const wantSector = new URLSearchParams(search).get('sector') ?? '';
  useEffect(() => {
    if (!wantSector) return;
    const i = sectors.findIndex((x) => x.k.toLowerCase() === wantSector.toLowerCase());
    if (i >= 0) setSec(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantSector]);

  const onKey = (e: ReactKeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const n = (sec + (e.key === 'ArrowRight' ? 1 : sectors.length - 1)) % sectors.length;
    setSec(n);
    document.getElementById(`sl-tab-${n}`)?.focus();
  };

  /* Spotlights carousel: plays on its own, pauses on hover and for a while after a click. */
  const [slide, setSlide] = useState(0);
  const [hover, setHover] = useState(false);
  const [auto, setAuto] = useState(false);
  const lastPick = useRef(0);
  useEffect(() => { setAuto(!window.matchMedia('(prefers-reduced-motion: reduce)').matches); }, []);
  useEffect(() => {
    if (!auto) return;
    const t = window.setInterval(() => {
      if (hover || Date.now() - lastPick.current < 9000) return;
      setSlide((x) => (x + 1) % spots.length);
    }, 5200);
    return () => window.clearInterval(t);
  }, [auto, hover]);
  const go = (i: number) => { lastPick.current = Date.now(); setSlide((i + spots.length) % spots.length); };
  const sp = spots[slide];

  return (
    <>
      {/* Hero */}
      <section id="overview" className="hz-hero">
        <div className="ds-container hz-hero-grid pf-hero-grid">
          <div>
            <h1 className="pf-h1"><Hi a={P.heroA} b={P.heroB} br /></h1>
            <p className="hz-tagline">{P.heroText}</p>
            <div className="ds-actions" style={{ marginTop: 8 }}>
              <Go className="ds-btn ds-btn-grad" to={P.heroBtn1Link}>{P.heroBtn1}</Go>
              <Go className="ds-btn ds-btn-outline" to={P.heroBtn2Link}>{P.heroBtn2}</Go>
            </div>
          </div>
          <div className="sl-grid9" aria-hidden="true">
            {sectors.slice(0, 9).map((s) => <span key={s.k}><i><Icon d={s.icon} size={26} /></i>{s.k}</span>)}
          </div>
        </div>
        <svg className="hz-curve" viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden="true"><path d="M0 90 L0 44 Q720 -28 1440 44 L1440 90 Z" fill="#F4F6FD" /></svg>
      </section>

      {/* Explore by sector */}
      <section id="explorer" className="ds-soft" style={{ paddingTop: 'clamp(28px, 3.5vw, 48px)', paddingBottom: 'var(--ds-section-y)', scrollMarginTop: 80 }}>
        <div className="ds-container">
          <div className="hx-head hx-head-center">
            <div>
              <h2 className="ds-h2"><Hi a={P.exploreA} b={P.exploreB} /></h2>
              <p className="ds-lead ds-muted">{P.exploreText}</p>
            </div>
          </div>
          <div className="hs-tabs sl-tabs" role="tablist" aria-label="Sectors" onKeyDown={onKey}>
            {sectors.map((s, i) => (
              <button key={s.k} id={`sl-tab-${i}`} role="tab" type="button" aria-selected={i === sec} aria-controls="sl-panel" tabIndex={i === sec ? 0 : -1} onClick={() => setSec(i)}>
                <Icon d={s.icon} size={26} /><span>{s.k}</span>
              </button>
            ))}
          </div>
          {sel && (
            <div className="sl-panel" id="sl-panel" role="tabpanel" aria-labelledby={`sl-tab-${sec}`} key={sel.k}>
              <div className="sl-top">
                <div className="sl-title">
                  <span className="hs-sym"><Icon d={sel.icon} size={30} /></span>
                  <div>
                    <h3>{sel.name}</h3>
                    <p>{sel.tA}<span className="ds-gradtext">{sel.tH}</span>{sel.tB}</p>
                  </div>
                </div>
                {sel.first && (
                  <div className="sl-start"><small>Most teams start with</small><b>{sel.start || sel.first}</b></div>
                )}
              </div>
              <div className="sl-uses">
                {sel.uses.map((u, j) => (
                  <div key={u.t} style={{ '--k': j } as CSSProperties}>
                    <i><Icon d={USE_ICONS[j % USE_ICONS.length]} size={24} /></i>
                    <h4>{u.t}</h4>
                    <p>{u.d}</p>
                  </div>
                ))}
              </div>
              <div className="sl-bottom">
                <div className="sl-sys"><small>Agents work with</small>{sel.sys.map((x: string) => <em key={x}>{x}</em>)}</div>
                <div className="ds-actions">
                  <Link className="ds-btn ds-btn-outline" to={`/solutions/${slugify(sel.k)}`}>Read more about {sel.k.toLowerCase() === 'public sector' ? 'the public sector' : sel.k}</Link>
                  <Link className="ds-btn ds-btn-grad" to={`/contact?process=${encodeURIComponent(sel.start || sel.first)}`}>{P.sectorCta} <Icon d={I.arrow} size={18} stroke={2.4} /></Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Use case spotlights */}
      <section id="spotlights" className="ds-paper ds-section" style={{ scrollMarginTop: 80 }}>
        <div className="ds-container">
          <div className="sl-spot" data-run={auto && !hover ? '1' : '0'} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} aria-roledescription="carousel" aria-label="See an agent at work in your sector">
            <div className="sl-spot-h">
              <h2 className="ds-h2">{P.spotTitle}</h2>
              <div className="sl-nav">
                <span className="ds-num">{String(slide + 1).padStart(2, '0')} / {String(spots.length).padStart(2, '0')}</span>
                <button type="button" aria-label="Previous spotlight" onClick={() => go(slide - 1)}><Icon d="M15 6l-6 6 6 6" size={22} stroke={2.4} /></button>
                <button type="button" aria-label="Next spotlight" onClick={() => go(slide + 1)}><Icon d="M9 6l6 6-6 6" size={22} stroke={2.4} /></button>
              </div>
            </div>
            <div className="sl-slide" key={slide} aria-live="polite">
              <div className="sl-story">
                <span className="sl-sector">{sp.sector}</span>
                <h3>{sp.title}</h3>
                <div className="sl-ba">
                  <div><small>Before</small><p>{sp.before}</p></div>
                  <div data-after=""><small>With an agent</small><p>{sp.after}</p></div>
                </div>
              </div>
              <div className="sl-run" aria-hidden="true">
                <div className="sl-run-h"><span className="sl-run-av"><Icon d={I.agent} size={18} /></span>{sp.title} agent<em>Running</em></div>
                {sp.checks.map((c, k) => <div className="sl-run-r" key={c} style={{ '--k': k } as CSSProperties}><i><Icon d={I.check} size={14} stroke={3} /></i>{c}</div>)}
                <div className="sl-run-done" style={{ '--k': sp.checks.length } as CSSProperties}>{sp.result}</div>
              </div>
            </div>
            <div className="sl-dots">
              {spots.map((x, i) => <button key={x.title} type="button" aria-label={`Go to spotlight ${i + 1}: ${x.title}`} aria-current={i === slide} onClick={() => go(i)} />)}
            </div>
          </div>
        </div>
      </section>

      {/* Processes in every sector */}
      <section id="cross" className="ds-soft ds-section" style={{ scrollMarginTop: 80 }}>
        <div className="ds-container">
          <div className="hx-head hx-head-center">
            <div>
              <h2 className="ds-h2"><Hi a={P.crossA} b={P.crossB} /></h2>
              <p className="ds-lead ds-muted">{P.crossText}</p>
            </div>
          </div>
          <div className="sl-cross">
            {cross.map(([t, d]) => (
              <Link key={t} to={`/contact?process=${encodeURIComponent(t)}`}>
                <i><Icon d={d} size={24} /></i><span>{t}</span><Icon d={I.arrow} size={18} stroke={2.2} />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Closing */}
      <section className="ds-paper" style={{ paddingBlock: 'var(--ds-section-y)' }}>
        <div className="ds-container">
          <div className="hz-final">
            <svg viewBox="0 0 600 360" fill="none" aria-hidden="true"><circle cx="225" cy="180" r="150" stroke="#8FB8FF" strokeOpacity=".35" strokeWidth="2" /><circle cx="375" cy="180" r="150" stroke="#C3B1FF" strokeOpacity=".35" strokeWidth="2" /></svg>
            <h2 className="ds-h2" style={{ position: 'relative' }}>{P.endTitle}</h2>
            <p className="ds-lead" style={{ position: 'relative' }}>{P.endText}</p>
            <div className="ds-actions" style={{ position: 'relative', justifyContent: 'center' }}>
              <Go className="ds-btn ds-btn-white" to={P.endBtn1Link}>{P.endBtn1}</Go>
              <Go className="ds-btn ds-btn-outline" to={P.endBtn2Link}>{P.endBtn2}</Go>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
