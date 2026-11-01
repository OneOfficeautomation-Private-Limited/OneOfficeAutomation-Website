import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useResourceData } from '../../logic/useResourceData';
import { ResHero } from './DocsPage';
import { I, Icon } from '../../ds/ui';

const FAQ_ICON = 'M12 21a9 9 0 100-18 9 9 0 000 18zM9.5 9a2.5 2.5 0 015 .5c0 1.5-2.5 2-2.5 3.5M12 17h.01';

export default function FaqsPage() {
  const d = useResourceData();
  const [params] = useSearchParams();
  const [prod, setProd] = useState(params.get('product') ?? 'all');
  const [q, setQ] = useState(params.get('q') ?? '');
  const [open, setOpen] = useState<string>(params.get('q') ?? '');

  const groups = useMemo(() => {
    const t = q.trim().toLowerCase();
    const ids = [...d.products.map((p) => p.id), ''];
    return ids.map((id) => ({
      id: id || 'general', title: id ? d.productTitle(id) : 'General',
      items: d.faqs.filter((f) => (id ? f.product === id : !f.product || !d.products.some((p) => p.id === f.product)) && (t === '' || (f.q + ' ' + f.a).toLowerCase().includes(t))),
    })).filter((g) => g.items.length > 0 && (prod === 'all' || g.id === prod));
  }, [d, q, prod]);
  const tabs = [{ id: 'all', title: 'All' }, ...d.products.filter((p) => d.faqs.some((f) => f.product === p.id)), ...(d.faqs.some((f) => !f.product) ? [{ id: 'general', title: 'General' }] : [])];

  return (
    <>
      <ResHero crumbs={[['Resources', '/resources'], ['FAQs']]} title="FAQs" sub="Quick answers, grouped by product." icon={FAQ_ICON} col="linear-gradient(135deg, #6D4AD8, #5236BE)" extra={`${d.faqs.length} questions`} />
      <section className="ds-soft" style={{ paddingTop: 'clamp(20px, 3vw, 36px)', paddingBottom: 'var(--ds-section-y)' }}>
        <div className="ds-container rs-faq-wrap">
          <div className="rs-faq-bar">
            <label className="ca-search">
              <Icon d="M11 4a7 7 0 100 14 7 7 0 000-14zM20 20l-4-4" size={20} />
              <span className="ds-sr">Search questions</span>
              <input type="search" placeholder="Search questions" value={q} onChange={(e) => setQ(e.target.value)} />
            </label>
            <div className="cu-filters" role="group" aria-label="Product" style={{ margin: 0, justifyContent: 'flex-start' }}>
              {tabs.map((t) => <button key={t.id} type="button" aria-pressed={prod === t.id} onClick={() => setProd(t.id)}>{t.title}</button>)}
            </div>
          </div>
          {groups.length === 0 && <p className="ca-none">No questions match. Try another word, or <Link className="ds-link" to="/contact">ask our team</Link>.</p>}
          {groups.map((g) => (
            <div key={g.id} className="rs-faq-group">
              <h2>{g.title}<span>{g.items.length}</span></h2>
              {g.items.map((f) => {
                const isOpen = open === f.q;
                const id = `faq-${g.id}-${f.q.length}-${f.q.slice(0, 12).replace(/\W/g, '')}`;
                return (
                  <div className="pr-q" key={f.q} data-open={isOpen ? '1' : '0'}>
                    <h3><button type="button" aria-expanded={isOpen} aria-controls={id} onClick={() => setOpen(isOpen ? '' : f.q)}><span>{f.q}</span><i aria-hidden="true">{isOpen ? '−' : '+'}</i></button></h3>
                    {isOpen && <div id={id} className="rs-faq-a">{f.a.split(/\n\s*\n/).map((p, k) => <p key={k}>{p}</p>)}</div>}
                  </div>
                );
              })}
            </div>
          ))}
          <div className="rs-ask rs-ask-wide">
            <b>Can’t find your answer?</b>
            <p>Our support team is in your time zone.</p>
            <a className="ds-btn ds-btn-white" href="mailto:support@oneofficeautomation.com">Email support <Icon d={I.arrow} size={18} stroke={2.4} /></a>
          </div>
        </div>
      </section>
    </>
  );
}
