import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useAboutLogic } from '../logic/AboutLogic';
import { I, Icon, Rings, useHeroTop, useSeen } from '../ds/ui';
import PD from '../cms/defaults.generated.json';
import { useCms } from '../cms/CmsContext';
import { usePageText, Hi, Go } from '../cms/pageText';

/* The teams relay: which card (by its place in the list) goes first, second… and the line from the core to each card. */
const RELAY = [2, 0, 1, 3];
const HUB_LINKS = ['M100 150 L0 70', 'M100 150 L0 230', 'M100 150 L200 70', 'M100 150 L200 230'];

const BUILT = ['AI agents', 'Large language models', 'Intelligent document processing', 'Robotic process automation', 'Workflow orchestration', 'Self-hosted and secure'];

/** Shows an email address that may wrap after the @ but never in the middle of the domain. */
function Email({ addr }: { addr: string }) {
  const at = addr.indexOf('@');
  if (at < 0) return <>{addr}</>;
  return <>{addr.slice(0, at + 1)}<wbr /><span style={{ whiteSpace: 'nowrap' }}>{addr.slice(at + 1)}</span></>;
}

export default function AboutPage() {
  const P = usePageText('page.about');
  const v = useAboutLogic();
  const glance = useCms()<{ big: string; text: string }[]>('about.glance', PD['about.glance']);
  const heroRef = useHeroTop<HTMLElement>();
  // The "At a glance" tiles take turns in the spotlight (lit edge and glow); off for reduced motion.
  const [spot, setSpot] = useState(-1);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || glance.length < 2) return;
    const t = window.setTimeout(() => setSpot((x) => (x + 1) % glance.length), spot < 0 ? 1400 : 2600);
    return () => window.clearTimeout(t);
  }, [spot, glance.length]);
  const s = v.site;
  /*
   * Our journey plays like a story: it starts at the first milestone when the section comes into view, the rail draws itself
   * from one milestone to the next, and each chapter opens as the line arrives (the drawing animation's end moves it on).
   * After the last milestone the line runs on to the end of the track, then the story starts again. Pointing at the current
   * card pauses it. Reduced motion: no drawing, so it moves only when someone picks a year.
   */
  const steps = v.journey.length;
  const { ref: journeyRef, seen: journeySeen } = useSeen<HTMLDivElement>();
  const [ji, setJi] = useState(0);
  const [jHold, setJHold] = useState(false);
  const [jRun, setJRun] = useState(0); // restarts the drawing when someone picks a year
  const pickJ = (k: number) => { setJi(k); setJRun((r) => r + 1); };
  const jPlaying = journeySeen && !jHold;
  // Where each milestone's pill starts along the track: one grid column (plus the 18px gap) per milestone.
  const at = (k: number) => `calc(${k} * (100% + 18px) / ${Math.max(steps, 1)})`;
  const isLast = ji >= steps - 1;

  const teams = v.teams;

  // The teams relay: consulting designs, engineering builds, AI trains, customer success runs. Starts when in view.
  const { ref: teamsRef, seen: teamsSeen } = useSeen<HTMLDivElement>();
  const relay = RELAY.filter((k) => k < teams.length);
  const [relayAt, setRelayAt] = useState(0);
  const [teamHold, setTeamHold] = useState(false);
  useEffect(() => {
    if (!teamsSeen || teamHold || relay.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = window.setTimeout(() => setRelayAt((r) => (r + 1) % relay.length), 2600);
    return () => window.clearTimeout(t);
  }, [teamsSeen, teamHold, relayAt, relay.length]);
  const teamOn = relay[relayAt] ?? 0;
  const teamCard = (x: (typeof teams)[number], k: number) => (
    <div key={x.n} className="ax-team" data-on={teamOn === k ? '1' : undefined}
      onMouseEnter={() => { const r = relay.indexOf(k); if (r >= 0) { setTeamHold(true); setRelayAt(r); } }}>
      <i><Icon d={x.icon} size={26} /></i>
      <span>
        <h3>{x.n}</h3><p>{x.d}</p>
        {(x as { now?: string }).now && <small className="ax-now"><em />{(x as { now?: string }).now}</small>}
      </span>
      {relay.includes(k) && <b className="ax-badge">Step {relay.indexOf(k) + 1}</b>}
    </div>
  );

  return (
    <>
      {/* Hero */}
      <section id="overview" className="hz-hero hz-fit ab-hero" ref={heroRef}>
        <div className="ds-container hz-hero-grid pf-hero-grid">
          <div className="pf-hero-copy">
            <p className="ab-kicker"><Rings width={30} />{P.kicker}</p>
            <h1 className="pf-h1 ab-h1"><Hi a={P.heroA} b={P.heroB} tight /></h1>
            <p className="cu-lead">{P.heroText}</p>
            <div className="ds-actions" style={{ marginTop: 24 }}>
              <Go className="ds-btn ds-btn-grad" to={P.heroBtn1Link}>{P.heroBtn1}</Go>
              <Go className="ds-btn ds-btn-outline" to={P.heroBtn2Link}>{P.heroBtn2}</Go>
            </div>
          </div>
          <div className="ax-glance">
            <small>At a glance</small>
            {glance.map((g, i) => (
              <div key={g.text} style={{ '--k': i } as CSSProperties} data-on={spot === i ? '1' : undefined}>
                <b>{g.big || <Icon d={I.lock} size={30} />}</b><span>{g.text}</span>
              </div>
            ))}
          </div>
        </div>
        <svg className="hz-curve" viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden="true"><path d="M0 90 L0 44 Q720 -28 1440 44 L1440 90 Z" fill="#F4F6FD" /></svg>
      </section>

      {/* Mission and vision */}
      <section id="mission" className="ds-soft" style={{ paddingTop: 'clamp(28px, 3.5vw, 48px)', paddingBottom: 'var(--ds-section-y)' }}>
        <div className="ds-container">
          <div className="ax-mv">
            <div>
              <small><Icon d="M12 21a9 9 0 100-18 9 9 0 000 18zM12 17a5 5 0 100-10 5 5 0 000 10zM12 13a1 1 0 100-2 1 1 0 000 2z" size={20} />Our mission</small>
              <p>{v.t.missionA}<span className="ds-gradtext">{v.t.missionH}</span>{v.t.missionB}</p>
            </div>
            <div>
              <small><Icon d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6z" size={20} />Our vision</small>
              <p>{v.t.visionA}<span className="ds-gradtext">{v.t.visionH}</span>{v.t.visionB}</p>
            </div>
            <div className="ax-built"><span>Built with</span>{BUILT.map((b) => <em key={b}>{b}</em>)}</div>
          </div>
        </div>
      </section>

      {/* Values bento */}
      <section className="ds-paper ds-section">
        <div className="ds-container">
          <div className="hx-head hx-head-center"><div><h2 className="ds-h2"><Hi a={P.valuesA} b={P.valuesB} /></h2></div></div>
          <div className="ax-values">
            {v.values.map((x, i) => (
              <div key={x.t} data-k={i}>
                <i><Icon d={x.icon} size={34} /></i>
                <h3>{x.t}</h3>
                <p>{x.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Journey */}
      <section id="journey" className="ds-navy ds-section pf-together ax-journey">
        <div className="ds-container">
          <div className="ax-jhead">
            <div className="hx-head"><div>
              <h2 className="ds-h2"><Hi a={P.journeyA} b={P.journeyB} /></h2>
              {P.journeyText && <p className="ds-lead ds-muted">{P.journeyText}</p>}
            </div></div>
            {/* The current milestone's year, very large and outlined, behind the heading row. */}
            {v.journey[ji] && <span className="ax-ghost" aria-hidden="true" key={ji}>{v.journey[ji].y}</span>}
          </div>
          <div className="ax-time" ref={journeyRef} data-playing={jPlaying ? '1' : '0'}>
            <div className="ax-track" aria-hidden="true">
              {/* Travelled so far, then the stretch being drawn now (to the next milestone, or on to the end after the last). */}
              <b style={{ width: at(ji) }} />
              <i className="ax-seg" data-last={isLast ? '1' : undefined} style={{ left: at(ji), width: isLast ? `calc(100% - ${at(ji)})` : at(1) }}>
                <s key={`${ji}-${jRun}`} onAnimationEnd={() => setJi((x) => (x + 1) % Math.max(steps, 1))} />
              </i>
            </div>
            <ol>
              {v.journey.map((j, k) => (
                <li key={j.y + j.t} data-on={k <= ji ? '1' : '0'} data-cur={k === ji ? '1' : '0'} data-ahead={/^\d/.test(j.y) ? undefined : '1'}>
                  <button type="button" onClick={() => pickJ(k)} aria-pressed={k === ji}><span className="ab-year">{j.y}</span></button>
                  <div className="ax-card" onMouseEnter={() => k === ji && setJHold(true)} onMouseLeave={() => setJHold(false)}>
                    <b>{j.t}</b>
                    <small>{j.d}</small>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Teams org graphic */}
      <section id="teams" className="ds-soft ds-section">
        <div className="ds-container">
          <div className="hx-head hx-head-center"><div><h2 className="ds-h2"><Hi a={P.teamsA} b={P.teamsB} /></h2></div></div>
          {/* A relay: the teams take turns, in the order work flows for a customer. A pulse runs from the core to the team
              whose turn it is, its card lights up with its step and what it is doing, and the core names the step. */}
          <div className="ax-org" ref={teamsRef} onMouseLeave={() => setTeamHold(false)}>
            <div className="ax-col">
              {teams.slice(0, 2).map((x, i) => teamCard(x, i))}
            </div>
            <div className="ax-hub" aria-hidden="true">
              <svg viewBox="0 0 200 300" preserveAspectRatio="none">
                {HUB_LINKS.map((d, i) => <path key={i} d={d} className="ax-link" data-on={teamOn === i ? '1' : undefined} vectorEffect="non-scaling-stroke" />)}
              </svg>
              <span className="ax-core"><s /><Rings width={64} /></span>
              {teams[teamOn] && <em className="ax-step" key={teamOn}><b>Step {relayAt + 1}</b>{teams[teamOn].step}</em>}
            </div>
            <div className="ax-col">
              {teams.slice(2, 4).map((x, i) => teamCard(x, i + 2))}
            </div>
          </div>
        </div>
      </section>

      {/* Company information */}
      <section id="info" className="ds-paper ds-section">
        <div className="ds-container">
          <div className="ab-info">
            <div className="ab-info-h"><Rings width={44} light /><span><small>Company information</small><b>{s.legalName}</b><em>CIN {s.cin}</em></span></div>
            <div className="ab-info-g">
              <div><small>Registered office{s.head.country ? ` · ${s.head.country}` : ''}</small><p>{s.address}</p></div>
              {s.others.length > 0 && <div><small>Also in</small><p>{s.others.map((o, i) => <span key={o.country + i}>{i > 0 && <br />}{o.address || o.country}</span>)}</p></div>}
              <div><small>Email</small><p>{[...new Set(s.offices.flatMap((o) => [o.supportEmail, o.salesEmail]).filter(Boolean))].map((e, i) => <span key={e}>{i > 0 && <br />}<a href={`mailto:${e}`}><Email addr={e} /></a></span>)}</p></div>
              <div><small>Phone</small><p>{s.offices.filter((o) => o.phone).map((o, i) => <span key={o.country + i}>{i > 0 && <br />}<a href={`tel:${s.tel(o.phone)}`}>{o.country} {o.phone}</a></span>)}</p></div>
            </div>
          </div>
        </div>
      </section>

      {/* Careers */}
      <section id="careers" className="ds-paper" style={{ paddingBottom: 'var(--ds-section-y)' }}>
        <div className="ds-container">
          <div className="hz-final">
            <svg viewBox="0 0 600 360" fill="none" aria-hidden="true"><circle cx="225" cy="180" r="150" stroke="#8FB8FF" strokeOpacity=".35" strokeWidth="2" /><circle cx="375" cy="180" r="150" stroke="#C3B1FF" strokeOpacity=".35" strokeWidth="2" /></svg>
            <h2 className="ds-h2" style={{ position: 'relative' }}>{P.endTitle}</h2>
            <p className="ds-lead" style={{ position: 'relative' }}>{P.endText}</p>
            <div className="ds-actions" style={{ position: 'relative', justifyContent: 'center' }}>
              <Go className="ds-btn ds-btn-white" to={P.endBtn1Link}>{P.endBtn1} <Icon d={I.arrow} size={18} stroke={2.4} /></Go>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
