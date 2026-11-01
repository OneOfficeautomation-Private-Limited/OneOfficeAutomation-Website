import { useCareersLogic } from '../logic/CareersLogic';
import { I, Icon, useAutoplay } from '../ds/ui';
import { Done, Field } from '../ds/Form';
import { usePageText, Hi, Go } from '../cms/pageText';
import { Link } from 'react-router-dom';

const HERO_ROLES: [string, string][] = [['AI Engineer', 'AI and ML · India'], ['Solution Consultant', 'Solutions · Doha, Qatar'], ['Customer Success Manager', 'Customer success · Doha, Qatar']];
const TEAM_BADGES: [string, string][] = [['Engineering', I.code], ['AI and ML', I.spark], ['Solutions', I.layers], ['Customer success', 'M4 14v-2a8 8 0 0116 0v2M3 14h4v6H3zM17 14h4v6h-4z']];
const WHY_ICONS = ['M12 3l2.5 5.5L20 11l-5.5 2.5L12 19l-2.5-5.5L4 11l5.5-2.5z', I.key, 'M4 20V10M10 20V4M16 20v-7M22 20H2'];

export default function CareersPage() {
  const P = usePageText('page.careers');
  const v = useCareersLogic();
  const hire = useAutoplay(v.steps.length, 3400);
  return (
    <>
      {/* Hero */}
      <section id="overview" className="hz-hero">
        <div className="ds-container hz-hero-grid pf-hero-grid">
          <div>
            <p className="ab-kicker"><span className="ca-dot" />{P.kicker}</p>
            <h1 className="pf-h1"><Hi a={P.heroA} b={P.heroB} /></h1>
            <p className="cu-lead">{v.t.sub}</p>
            <div className="ds-actions" style={{ marginTop: 24 }}>
              <Go className="ds-btn ds-btn-grad" to={P.heroBtn1Link}>{P.heroBtn1}</Go>
              <Go className="ds-btn ds-btn-outline" to={P.heroBtn2Link}>{P.heroBtn2}</Go>
            </div>
          </div>
          <div className="cx-mosaic" aria-hidden="true">
            <div className="cx-count"><b>{v.count.split(' ')[0]}</b><span>open roles</span></div>
            {TEAM_BADGES.map(([t, d], i) => <span key={t} className={`cx-team cx-team-${i}`}><i><Icon d={d} size={24} /></i>{t}</span>)}
            <div className="cx-chips">{HERO_ROLES.map(([t]) => <em key={t}><span className="ca-dot" />{t}</em>)}</div>
          </div>
        </div>
        <svg className="hz-curve" viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden="true"><path d="M0 90 L0 44 Q720 -28 1440 44 L1440 90 Z" fill="#F4F6FD" /></svg>
      </section>

      {/* Why */}
      <section id="why" className="ds-soft" style={{ paddingTop: 'clamp(28px, 3.5vw, 48px)', paddingBottom: 'clamp(56px, 7vw, 96px)' }}>
        <div className="ds-container">
          <div className="cx-why">
            <h2 className="ds-h2"><Hi a={P.whyA} b={P.whyB} /></h2>
            <div>{v.why.map((w, i) => <div key={w.t}><i><Icon d={WHY_ICONS[i % WHY_ICONS.length]} size={28} /></i><h3>{w.t}</h3><p>{w.d}</p></div>)}</div>
          </div>
        </div>
      </section>

      {/* Roles */}
      <section id="roles" className="ds-paper ds-section" style={{ scrollMarginTop: 80 }}>
        <div className="ds-container">
          <div className="hx-head">
            <div><h2 className="ds-h2">Open <span className="ds-gradtext">roles</span></h2><p className="ds-lead ds-muted">{v.count}</p></div>
          </div>
          <div className="cx-board">
          <aside className="cx-side">
            <label className="ca-search">
              <Icon d="M11 4a7 7 0 100 14 7 7 0 000-14zM20 20l-4-4" size={20} />
              <span className="ds-sr">Search roles</span>
              <input type="search" placeholder="Search roles" value={v.q} onChange={v.typeQ} />
            </label>
            <div role="group" aria-label="Team"><small>Team</small>{v.teams.map((x) => <button key={x.label} type="button" aria-pressed={x.active} onClick={x.pick}>{x.label}<Icon d="M9 6l6 6-6 6" size={16} stroke={2.4} /></button>)}</div>
            <div role="group" aria-label="Location"><small>Location</small>{v.locs.map((x) => <button key={x.label} type="button" aria-pressed={x.active} onClick={x.pick}>{x.label}<Icon d="M9 6l6 6-6 6" size={16} stroke={2.4} /></button>)}</div>
          </aside>
          <div className="cx-main">
          {v.none && <p className="ca-none">No roles match your search. Try another team or location, or send a general application.</p>}
          <div className="ca-list">
            {v.shown.map((r) => (
              <div className="ca-role" key={r.id} data-open={r.open ? '1' : '0'}>
                <button type="button" onClick={r.toggle} aria-expanded={r.expanded}>
                  <i><Icon d={I.agent} size={22} /></i>
                  <span className="ca-role-t"><b>{r.title}</b><span><em>{r.team}</em><em>{r.place}</em><em>{r.type}</em></span></span>
                  <span className="ca-role-cta">{r.cta}<Icon d="M9 6l6 6-6 6" size={18} stroke={2.4} /></span>
                </button>
                {r.open && (
                  <div className="ca-role-d">
                    <p>{r.about}</p>
                    <div className="ca-cols">
                      <div><small>What you’ll do</small><ul>{r.does.map((b: string) => <li key={b}><Icon d={I.check} size={16} stroke={2.8} />{b}</li>)}</ul></div>
                      <div><small>What we look for</small><ul>{r.needs.map((b: string) => <li key={b}><Icon d={I.check} size={16} stroke={2.8} />{b}</li>)}</ul></div>
                    </div>
                    <div className="ds-actions">
                      <a className="ds-btn ds-btn-grad" href="#apply" onClick={r.apply}>Apply for this role <Icon d={I.arrow} size={18} stroke={2.4} /></a>
                      <Link className="ds-btn ds-btn-outline" to={`/careers/${r.id}`}>Open the job page</Link>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          {v.multi && (
            <nav className="ca-pages" aria-label="Pages of roles">
              <span>{v.range}</span>
              <div>
                <button type="button" onClick={v.prevPage} disabled={v.noPrev} aria-label="Previous page"><Icon d="M15 6l-6 6 6 6" size={20} stroke={2.4} /></button>
                {v.pageBtns.map((p) => <button key={p.n} type="button" aria-current={p.active ? 'page' : undefined} aria-label={`Page ${p.n}`} onClick={p.pick}>{p.n}</button>)}
                <button type="button" onClick={v.nextPage} disabled={v.noNext} aria-label="Next page"><Icon d="M9 6l6 6-6 6" size={20} stroke={2.4} /></button>
              </div>
            </nav>
          )}
          </div>
          </div>
        </div>
      </section>

      {/* How we hire */}
      <section id="hire" className="ds-navy ds-section pf-together">
        <div className="ds-container">
          <div className="hx-head"><div><h2 className="ds-h2"><Hi a={P.hireA} b={P.hireB} /></h2></div></div>
          <div className="cx-hire" {...hire.bind}>
            {v.steps.map((st, k) => (
              <button key={st.t} type="button" aria-pressed={k === hire.i} onClick={() => hire.go(k)} data-done={k < hire.i ? '1' : '0'}>
                <span className="n">{k < hire.i ? <Icon d={I.check} size={18} stroke={3} /> : st.num}</span>
                <b>{st.t}</b>
                <small>{st.d}</small>
                {k === hire.i && hire.running && <i className="hs-timer" />}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Apply */}
      <section id="apply" className="ds-soft ds-section" style={{ scrollMarginTop: 80 }}>
        <div className="ds-container fm-wrap fm-wrap-dark">
          <div className="fm-side fm-dark">
            <h2 className="ds-h2"><Hi a={P.applyA} b={P.applyB} /></h2>
            <p className="ds-lead">{P.applyText}</p>
            <p style={{ marginTop: 16 }}>Prefer email? Write to <a className="ds-link" href={`mailto:${P.applyEmail}`}>{P.applyEmail}</a>.</p>
          </div>
          <div className="fm-card">
            {v.formOpen && (
              <form onSubmit={v.submit} className="fm">
                <Field id="cn" label="Full name" required><input id="cn" name="cn" type="text" autoComplete="name" required /></Field>
                <Field id="ce" label="Email" required><input id="ce" name="ce" type="email" autoComplete="email" required /></Field>
                <Field id="cph" label="Phone"><input id="cph" name="cph" type="tel" autoComplete="tel" /></Field>
                {v.noRole && (
                  <Field id="crole" label="Role"><select id="crole" name="crole">{v.roleOptions.map((o) => <option key={o}>{o}</option>)}</select></Field>
                )}
                {v.hasRole && (
                  <div className="fm-f fm-role">
                    <span>Applying for <strong>{v.applyRole}</strong></span>
                    <button type="button" onClick={v.clearRole}>Change</button>
                    <input type="hidden" name="crole" value={v.applyRole} />
                  </div>
                )}
                <Field id="clink" label="Link to your CV, LinkedIn or portfolio" wide><input id="clink" name="clink" type="url" /></Field>
                <Field id="cmsg" label="Anything you’d like to add?" wide><textarea id="cmsg" name="cmsg" rows={4} /></Field>
                <button type="submit" className="ds-btn ds-btn-grad fm-submit">{P.applySubmit}</button>
                {v.error && <p role="alert" className="fm-err">{v.error}</p>}
              </form>
            )}
            {v.sent && <Done title="Thanks for applying." text="We’ll review your details and get back to you soon." again="Send another application" onAgain={v.reset} />}
          </div>
        </div>
      </section>
    </>
  );
}
