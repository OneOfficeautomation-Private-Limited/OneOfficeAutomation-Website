import { Link } from 'react-router-dom';
import { useContactLogic } from '../logic/ContactLogic';
import { I, Icon } from '../ds/ui';
import { Done, Field } from '../ds/Form';
import PD from '../cms/defaults.generated.json';
import { useCms } from '../cms/CmsContext';
import { usePageText, Hi } from '../cms/pageText';


export const STEPS: [string, string][] = [
  ['Understand', 'We learn the processes you want to automate.'],
  ['Show', 'You see a live agent built for a similar use case.'],
  ['Estimate', 'We estimate the time and cost you could save.'],
  ['Recommend', 'You get the right plan and clear next steps.'],
];

export default function ContactPage() {
  const P = usePageText('page.contact');
  const v = useContactLogic();
  const steps = useCms()<{ t: string; d: string }[]>('contact.steps', PD['contact.steps']).map((x) => [x.t, x.d] as [string, string]);
  const s = v.site;
  return (
    <>
      <section id="overview" className="hz-hero ct-hero">
        <div className="ds-container ct-grid">
          <div className="ct-left">
            <p className="ab-kicker"><Icon d={I.clock} size={20} />{P.kicker}</p>
            <h1 className="pf-h1"><Hi a={P.heroA} b={P.heroB} /></h1>
            <p className="ct-in">In 30 minutes, we will</p>
            <ol className="ct-steps">
              {steps.map(([t, d], i) => <li key={t}><span>{i + 1}</span><div><b>{t}</b><small>{d}</small></div></li>)}
            </ol>
          </div>
          <div className="fm-card ct-card">
            {v.showForm && (
              <form onSubmit={v.submit} className="fm">
                <h2 className="ct-form-h">{P.formTitle}</h2>
                <Field id="fn" label="First name" required><input id="fn" name="fn" type="text" autoComplete="given-name" required /></Field>
                <Field id="ln" label="Last name" required><input id="ln" name="ln" type="text" autoComplete="family-name" required /></Field>
                <Field id="em" label="Work email" required><input id="em" name="em" type="email" autoComplete="email" required /></Field>
                <Field id="ph" label="Phone"><input id="ph" name="ph" type="tel" autoComplete="tel" /></Field>
                <Field id="co" label="Company" required><input id="co" name="co" type="text" autoComplete="organization" required /></Field>
                <Field id="jt" label="Job title"><input id="jt" name="jt" type="text" autoComplete="organization-title" /></Field>
                <Field id="cs" label="Company size"><select id="cs" name="cs">{P.list('companySizes').map((o) => <option key={o}>{o}</option>)}</select></Field>
                <Field id="ii" label="I’m interested in"><select id="ii" name="ii">{P.list('interests').map((o) => <option key={o}>{o}</option>)}</select></Field>
                <Field id="pr" label="Which process would you like to automate?" wide><textarea id="pr" name="pr" rows={3} defaultValue={v.prefill} /></Field>
                <div className="fm-f fm-check" data-wide="1">
                  <input id="ok" type="checkbox" name="ok" />
                  <label htmlFor="ok">I agree to the <Link className="ds-link" to="/privacy">privacy policy</Link> and to be contacted by OneOfficeAutomation.</label>
                </div>
                <button type="submit" className="ds-btn ds-btn-grad fm-submit" disabled={v.busy}>{v.busy ? 'Sending…' : P.formSubmit}</button>
                {v.error && <p role="alert" className="fm-err">{v.error}</p>}
              </form>
            )}
            {v.submitted && (
              <Done title="Thanks, we’ve got your request." again="Submit another request" onAgain={v.reset}
                text={<>An automation expert will be in touch to schedule your 30-minute demo. You can also reach us at <a className="ds-link" href={`mailto:${s.salesEmail}`}>{s.salesEmail}</a>.</>} />
            )}
          </div>
        </div>
        <svg className="hz-curve" viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden="true"><path d="M0 90 L0 44 Q720 -28 1440 44 L1440 90 Z" fill="#F4F6FD" /></svg>
      </section>

      <section className="ds-soft" style={{ paddingTop: 'clamp(28px, 3.5vw, 48px)', paddingBottom: 'var(--ds-section-y)' }}>
        <div className="ds-container">
          <div className="hx-head hx-head-center"><div><h2 className="ds-h2"><Hi a={P.waysA} b={P.waysB} /></h2></div></div>
          <div className="ct-ways">
            <a href={`mailto:${s.salesEmail}`}><i><Icon d={I.chat} size={26} /></i><h3>{P.salesTitle}</h3><p>{P.salesText}</p><em>{s.salesEmail}</em></a>
            <a href={`mailto:${s.supportEmail}`}><i><Icon d="M4 14v-2a8 8 0 0116 0v2M3 14h4v6H3zM17 14h4v6h-4z" size={26} /></i><h3>{P.supportTitle}</h3><p>{P.supportText}</p><em>{s.supportEmail}</em></a>
            <Link to="/partners"><i><Icon d="M14 12a5 5 0 11-10 0 5 5 0 0110 0zM20 12a5 5 0 11-10 0 5 5 0 0110 0z" size={26} /></i><h3>{P.partnersTitle}</h3><p>{P.partnersText}</p><em>{P.partnersLink}</em></Link>
            <div><i><Icon d="M12 21s-7-6.2-7-11a7 7 0 0114 0c0 4.8-7 11-7 11zM12 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" size={26} /></i><h3>Offices</h3><p>Registered office: {s.address}.{s.others.length > 0 && ` Also in ${s.others.map((o) => o.address || o.country).join('; ')}.`}</p><em><a href={`tel:${s.telIndia}`}>India: {s.phoneIndia}</a><br /><a href={`tel:${s.telQatar}`}>Qatar: {s.phoneQatar}</a></em></div>
          </div>
        </div>
      </section>
    </>
  );
}
