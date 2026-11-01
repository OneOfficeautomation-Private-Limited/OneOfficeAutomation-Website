import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useCms } from '../../cms/CmsContext';
import RD from '../../cms/defaults.generated.json';
import { usePricingLogic } from '../../logic/PricingLogic';
import { ResHero } from './DocsPage';
import { I, Icon } from '../../ds/ui';

type Opt = { title: string; text: string; label: string; url: string; icon: string };
function SmartLink({ to, className, children }: { to: string; className?: string; children: ReactNode }) {
  return /^(https?:|mailto:|tel:)/.test(to) ? <a className={className} href={to} {...(/^https?:/.test(to) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{children}</a> : <Link className={className} to={to}>{children}</Link>;
}

export default function SupportPage() {
  const cms = useCms();
  const opts = cms<Opt[]>('resources.support', RD['resources.support'] as Opt[]);
  const pr = usePricingLogic();
  const row = pr.cmpRows.find((r) => /^support$/i.test(r.feature));
  const mgr = pr.cmpRows.find((r) => /success manager/i.test(r.feature));
  return (
    <>
      <ResHero crumbs={[['Resources', '/resources'], ['Support']]} title="Support" sub="Get help from our team in your time zone." icon="M4 14v-2a8 8 0 0116 0v2M3 14h4v6H3zM17 14h4v6h-4z" col="linear-gradient(135deg, #1F74C9, #3F67D6)" />
      <section className="ds-soft" style={{ paddingTop: 'clamp(20px, 3vw, 36px)', paddingBottom: 'clamp(56px, 7vw, 96px)' }}>
        <div className="ds-container rs-sup">
          {opts.map((o, k) => (
            <SmartLink key={o.title} to={o.url || '/contact'} className={k === 0 ? 'rs-sup-main' : ''}>
              <i><Icon d={o.icon || I.arrow} size={26} /></i>
              <h2>{o.title}</h2>
              <p>{o.text}</p>
              <em>{o.label} <Icon d={I.arrow} size={16} stroke={2.4} /></em>
            </SmartLink>
          ))}
        </div>
      </section>
      {row && (
        <section className="ds-paper ds-section">
          <div className="ds-container">
            <div className="hx-head hx-head-center"><div><h2 className="ds-h2">Support by <span className="ds-gradtext">plan</span></h2></div></div>
            <div className="rs-sup-plans">
              {pr.cmpHead.map((h, i) => (
                <div key={h.name} data-pop={pr.plans[i]?.popular ? '1' : '0'}>
                  <b>{h.name}</b>
                  <span>{row.cells[i]?.isText ? row.cells[i].text : row.cells[i]?.isYes ? 'Included' : '–'}</span>
                  {mgr?.cells[i]?.isYes && <small><Icon d={I.check} size={14} stroke={3} />Dedicated success manager</small>}
                </div>
              ))}
            </div>
            <p style={{ textAlign: 'center', marginTop: 20 }}><Link className="ds-link" to="/pricing#compare">Compare every plan →</Link></p>
          </div>
        </section>
      )}
    </>
  );
}
