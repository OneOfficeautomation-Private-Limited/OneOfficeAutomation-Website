import type { ReactNode } from 'react';
import { usePartnersLogic } from '../logic/PartnersLogic';
import { useCms, useSite } from '../cms/CmsContext';
import { I, Icon, Rings, useAutoplay, useSeen } from '../ds/ui';
import { Contacts, Done, Field } from '../ds/Form';
import { PartnerDirectory } from './public/PublicPages';
import { usePageText, Hi, Go } from '../cms/pageText';

/* Small pictures for each partner type */
const TYPE_PICS: ReactNode[] = [
  <div className="px-board" key="b">
    {[['To do', ['Discovery', 'Process map']], ['Building', ['Invoice agent']], ['Live', ['KYC agent', 'Reports']]].map(([h, cards]) => (
      <div key={h as string}><small>{h as string}</small>{(cards as string[]).map((c) => <span key={c}>{c}</span>)}</div>
    ))}
  </div>,
  <div className="px-pipe" key="p">
    {[['Qualified', 90], ['Demo booked', 64], ['Proposal', 42], ['Won', 28]].map(([n, w]) => (
      <div key={n as string}><span>{n as string}</span><b style={{ width: `${w}%` }} /></div>
    ))}
  </div>,
  <div className="px-conn" key="c">
    <span><Icon d="M4 5h16v14H4zM4 9h16" size={22} />Your app</span>
    <b><i /><i /><i /></b>
    <span data-us=""><Rings width={30} />OneOffice</span>
    <em>Connector live</em>
  </div>,
];

const TOASTS: [string, string][] = [['New deal registered', I.shield], ['Consultant certified', 'M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8 5.8 21.3l2.4-7.4L2 9.4h7.6z'], ['Client project went live', I.check]];

export default function PartnersPage() {
  const P = usePageText('page.partners');
  const v = usePartnersLogic();
  const cms = useCms();
  const site = cms('site.settings', { salesEmail: 'sales@oneofficeautomation.com', phoneIndia: '+91 76760 95823', phoneQatar: '+974 7018 5221' } as { salesEmail: string; phoneIndia: string; phoneQatar: string });
  const proc = useAutoplay(v.procSteps.length, 4600);
  const step = v.procSteps[proc.i];
  const ladder = useSeen<HTMLDivElement>();
  const b = v.benefits;

  return (
    <>
      {/* Hero */}
      <section id="overview" className="hz-hero">
        <div className="ds-container hz-hero-grid pf-hero-grid">
          <div>
            <p className="ab-kicker"><Rings width={30} />{P.kicker}</p>
            <h1 className="pf-h1"><Hi a={P.heroA} b={P.heroB} br /></h1>
            <p className="cu-lead">{P.heroText}</p>
            <div className="ds-actions" style={{ marginTop: 24 }}>
              <Go className="ds-btn ds-btn-grad" to={P.heroBtn1Link}>{P.heroBtn1}</Go>
              <Go className="ds-btn ds-btn-outline" to={P.heroBtn2Link}>{P.heroBtn2}</Go>
            </div>
          </div>
          <div className="px-net" aria-hidden="true">
            <svg viewBox="0 0 440 400"><circle cx="220" cy="200" r="150" fill="none" stroke="rgba(143,184,255,.25)" strokeDasharray="3 9" /><circle cx="220" cy="200" r="95" fill="none" stroke="rgba(195,177,255,.2)" /></svg>
            <span className="px-core"><Rings width={74} /></span>
            {v.types.slice(0, 3).map((t, i) => <span key={t.k} className={`px-node px-node-${i}`}><i><Icon d={t.icon} size={22} /></i>{t.k.replace(' partner', '')}</span>)}
            {TOASTS.map(([t, d], i) => <span key={t} className={`px-toast px-toast-${i}`}><i><Icon d={d} size={16} stroke={2.4} /></i>{t}</span>)}
          </div>
        </div>
        <svg className="hz-curve" viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden="true"><path d="M0 90 L0 44 Q720 -28 1440 44 L1440 90 Z" fill="#F4F6FD" /></svg>
      </section>

      {/* Partner types */}
      <section id="types" className="ds-soft" style={{ paddingTop: 'clamp(28px, 3.5vw, 48px)', paddingBottom: 'var(--ds-section-y)', scrollMarginTop: 80 }}>
        <div className="ds-container">
          <div className="hx-head hx-head-center"><div><h2 className="ds-h2"><Hi a={P.typesA} b={P.typesB} /></h2></div></div>
          <div className="px-types">
            {v.types.map((t, i) => (
              <article key={t.k} className="px-type" data-tone={i % 2}>
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
