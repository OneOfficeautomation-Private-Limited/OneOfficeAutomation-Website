import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { useCareersLogic } from '../logic/CareersLogic';
import { CountUp, I, Icon, useHeroTop, useSeen } from '../ds/ui';
import { Done, Field } from '../ds/Form';
import { usePageText, Hi, Go } from '../cms/pageText';
import { Link, useLocation } from 'react-router-dom';

const TEAM_BADGES: [string, string][] = [['Engineering', I.code], ['AI and ML', I.spark], ['Solutions', I.layers], ['Customer success', 'M4 14v-2a8 8 0 0116 0v2M3 14h4v6H3zM17 14h4v6h-4z']];
/* Apply, intro chat, practical task, offer. */
const HIRE_ICONS = ['M22 2L11 13M22 2l-7 20-4-9-9-4z', 'M21 12a8 8 0 01-11.6 7.1L3 21l1.9-6.4A8 8 0 1121 12z', 'M4 5h16v11H4zM2 19h20M9 9l-2 2 2 2M15 9l2 2-2 2', 'M8 12l3 3 6-6M12 3a9 9 0 100 18 9 9 0 000-18z'];
const WHY_ICONS = ['M12 3l2.5 5.5L20 11l-5.5 2.5L12 19l-2.5-5.5L4 11l5.5-2.5z', I.key, 'M4 20V10M10 20V4M16 20v-7M22 20H2'];

export default function CareersPage() {
  const P = usePageText('page.careers');
  const v = useCareersLogic();
  // How we hire: the "You" marker moves along the steps once the path is in view; pointing at a step holds it there.
  const promises = P.list('hirePromises');
  const { ref: pathRef, seen: pathSeen } = useSeen<HTMLDivElement>();
  const [pathAt, setPathAt] = useState(0);
  const [pathHold, setPathHold] = useState(false);
  useEffect(() => {
    if (!pathSeen || pathHold || v.steps.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = window.setTimeout(() => setPathAt((x) => (x + 1) % v.steps.length), pathAt === v.steps.length - 1 ? 4200 : 2800);
    return () => window.clearTimeout(t);
  }, [pathSeen, pathHold, pathAt, v.steps.length]);
  const heroRef = useHeroTop<HTMLElement>();
  const goToRoles = () => document.getElementById('roles')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  // "Why join us": the reasons take turns in the spotlight once the band is in view.
  const { ref: whyRef, seen: whySeen } = useSeen<HTMLDivElement>();
  const [whyOn, setWhyOn] = useState(-1);
  const [whyHold, setWhyHold] = useState(false);
  useEffect(() => {
    if (!whySeen || whyHold || v.why.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = window.setTimeout(() => setWhyOn((x) => (x + 1) % v.why.length), whyOn < 0 ? 900 : 2600);
    return () => window.clearTimeout(t);
  }, [whySeen, whyHold, whyOn, v.why.length]);
  // Arriving with #roles (or #apply…) in the address: the page is drawn by script, so scroll there once it is.
  const { hash } = useLocation();
  useEffect(() => {
    if (!hash) return;
    const t = window.setTimeout(() => document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView(), 120);
    return () => window.clearTimeout(t);
  }, [hash]);
  return (
    <>
      {/* Hero */}
      <section id="overview" className="hz-hero hz-fit ab-hero cx-hero" ref={heroRef}>
        <div className="ds-container hz-hero-grid pf-hero-grid">
          <div className="pf-hero-copy">
            <p className="ab-kicker"><span className="ca-dot" />{P.kicker}</p>
            <h1 className="pf-h1"><Hi a={P.heroA} b={P.heroB} /></h1>
            <p className="cu-lead">{v.t.sub}</p>
            <div className="ds-actions" style={{ marginTop: 24 }}>
              <Go className="ds-btn ds-btn-grad" to={P.heroBtn1Link}>{P.heroBtn1}</Go>
              <Go className="ds-btn ds-btn-outline" to={P.heroBtn2Link}>{P.heroBtn2}</Go>
            </div>
          </div>
          {/* Every open role (not the filtered list below), the teams hiring with how many roles each, and a few of the roles.
              A team opens the list filtered to it; a role opens its own page. */}
          <div className="cx-mosaic">
            <div className="cx-count"><b><CountUp value={String(v.allRoles.length)} ms={1600} /></b><span>{v.allRoles.length === 1 ? 'open role' : 'open roles'}</span></div>
            {TEAM_BADGES.map(([t, d], i) => {
              const n = v.allRoles.filter((r) => r.team === t).length;
              return (
                <a key={t} href="#roles" className={`cx-team cx-team-${i}`} style={{ '--k': i } as CSSProperties} data-none={n ? undefined : '1'}
                  onClick={(e) => { e.preventDefault(); if (n) v.pickTeam(t); goToRoles(); }}>
                  <i><Icon d={d} size={24} /></i>
                  <span>{t}<small>{n ? `${n} open ${n === 1 ? 'role' : 'roles'}` : 'No roles right now'}</small></span>
                </a>
              );
            })}
            <div className="cx-chips">
              {v.allRoles.slice(0, 3).map((r) => <Link key={r.id} to={`/careers/${r.id}`}><span className="ca-dot" />{r.title}</Link>)}
              {v.allRoles.length > 3 && <a href="#roles" className="cx-more" onClick={(e) => { e.preventDefault(); v.pickTeam('All'); goToRoles(); }}>+{v.allRoles.length - 3} more</a>}
            </div>
          </div>
        </div>
        <svg className="hz-curve" viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden="true"><path d="M0 90 L0 44 Q720 -28 1440 44 L1440 90 Z" fill="#F4F6FD" /></svg>
      </section>

      {/* Why */}
      <section id="why" className="ds-soft" style={{ paddingTop: 'clamp(28px, 3.5vw, 48px)', paddingBottom: 0 }}>
        <div className="ds-container">
          {/* The reasons take turns in the spotlight once the band is in view; pointing at one holds it. */}
          <div className="cx-why" ref={whyRef} onMouseLeave={() => setWhyHold(false)}>
            <div className="cx-why-head">
              <h2 className="ds-h2"><Hi a={P.whyA} b={P.whyB} /></h2>
              {P.whyText && <p>{P.whyText}</p>}
              {P.whyBtn && (
                <a className="ds-btn ds-btn-white cx-why-btn" href="#roles" onClick={(e) => { e.preventDefault(); v.pickTeam('All'); goToRoles(); }}>
                  {P.whyBtn}<em>{v.allRoles.length}</em><Icon d={I.arrow} size={18} stroke={2.4} />
                </a>
              )}
            </div>
            <div>
              {v.why.map((w, i) => (
                <div key={w.t} style={{ '--k': i } as CSSProperties} data-on={whyOn === i ? '1' : undefined} onMouseEnter={() => { setWhyHold(true); setWhyOn(i); }}>
                  <i><Icon d={WHY_ICONS[i % WHY_ICONS.length]} size={28} /></i><h3>{w.t}</h3><p>{w.d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Roles */}
      <section id="roles" className="ds-soft" style={{ paddingTop: 'clamp(40px, 5vw, 72px)', paddingBottom: 'var(--ds-section-y)', scrollMarginTop: 80 }}>
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
      <section id="hire" className="ds-navy ds-section pf-together cx-hire-sec">
        <div className="ds-container">
          <div className="cx-hire-head">
            <div>
              <h2 className="ds-h2"><Hi a={P.hireA} b={P.hireB} /></h2>
              {P.hireText && <p>{P.hireText}</p>}
              {promises.length > 0 && <ul className="cx-promises">{promises.map((p) => <li key={p}><Icon d={I.check} size={15} stroke={3} />{p}</li>)}</ul>}
            </div>
            {P.hireBtn && <Go className="ds-btn ds-btn-white" to="#apply">{P.hireBtn}<Icon d={I.arrow} size={18} stroke={2.4} /></Go>}
          </div>
          {/* The candidate's path: a "You" marker glides from step to step; passed steps are ticked and the track fills behind it.
              Starts when in view; pointing at a step holds it; clicking a step jumps there. */}
          <div className="cx-path" ref={pathRef} onMouseLeave={() => setPathHold(false)} style={{ '--n': v.steps.length } as CSSProperties}>
            <div className="cx-track" aria-hidden="true">
              <b style={{ width: `calc(${pathAt} * (100% + 18px) / ${v.steps.length} + 22px)` }} />
              <span className="cx-you" style={{ left: `calc(${pathAt} * (100% + 18px) / ${v.steps.length} + 22px)` }}>You</span>
            </div>
            <ol>
              {v.steps.map((st, k) => (
                <li key={st.t} data-done={k < pathAt ? '1' : undefined} data-on={k === pathAt ? '1' : undefined}
                  onMouseEnter={() => { setPathHold(true); setPathAt(k); }}>
                  <button type="button" onClick={() => setPathAt(k)} aria-pressed={k === pathAt} aria-label={`Step ${k + 1}: ${st.t}`}>
                    {k < pathAt ? <Icon d={I.check} size={18} stroke={3} /> : k + 1}
                  </button>
                  <div className="cx-step">
                    <i><Icon d={HIRE_ICONS[k % HIRE_ICONS.length]} size={22} /></i>
                    <b>{st.t}</b>
                    <small>{st.d}</small>
                  </div>
                </li>
              ))}
            </ol>
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
