import { Link } from 'react-router-dom';
import { useAboutLogic } from '../logic/AboutLogic';
import { I, Icon, Rings, useAutoplay } from '../ds/ui';
import PD from '../cms/defaults.generated.json';
import { useCms } from '../cms/CmsContext';
import { usePageText, Hi, Go } from '../cms/pageText';

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
  const s = v.site;
  const jr = useAutoplay(v.journey.length, 3600);
  const pct = v.journey.length > 1 ? (jr.i / (v.journey.length - 1)) * 100 : 100;
  const teams = v.teams;

  return (
    <>
      {/* Hero */}
      <section id="overview" className="hz-hero">
        <div className="ds-container hz-hero-grid pf-hero-grid">
          <div>
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
            {glance.map((g) => <div key={g.text}><b>{g.big || <Icon d={I.lock} size={30} />}</b><span>{g.text}</span></div>)}
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
      <section id="journey" className="ds-navy ds-section pf-together">
        <div className="ds-container">
          <div className="hx-head"><div><h2 className="ds-h2"><Hi a={P.journeyA} b={P.journeyB} /></h2></div></div>
          <div className="ax-time" {...jr.bind}>
            <div className="ax-track" aria-hidden="true"><b style={{ width: `${pct}%` }} /></div>
            <ol>
              {v.journey.map((j, k) => (
                <li key={j.y + j.t} data-on={k <= jr.i ? '1' : '0'} data-cur={k === jr.i ? '1' : '0'}>
                  <button type="button" onClick={() => jr.go(k)} aria-pressed={k === jr.i}><span className="ab-year">{j.y}</span></button>
                  <b>{j.t}</b>
                  <small>{j.d}</small>
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
          <div className="ax-org">
            <div className="ax-col">
              {teams.slice(0, 2).map((x) => <div key={x.n} className="ax-team"><i><Icon d={x.icon} size={26} /></i><span><h3>{x.n}</h3><p>{x.d}</p></span></div>)}
            </div>
            <div className="ax-hub" aria-hidden="true">
              <svg viewBox="0 0 200 300" preserveAspectRatio="none"><path d="M100 150 L0 70 M100 150 L0 230 M100 150 L200 70 M100 150 L200 230" stroke="#B9A6F5" strokeWidth="2" strokeDasharray="5 6" fill="none" vectorEffect="non-scaling-stroke" /></svg>
              <span><Rings width={64} /></span>
            </div>
            <div className="ax-col">
              {teams.slice(2, 4).map((x) => <div key={x.n} className="ax-team"><i><Icon d={x.icon} size={26} /></i><span><h3>{x.n}</h3><p>{x.d}</p></span></div>)}
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
