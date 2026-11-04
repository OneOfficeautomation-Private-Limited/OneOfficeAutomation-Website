import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useResourceData } from '../../logic/useResourceData';
import { useCms } from '../../cms/CmsContext';
import RD from '../../cms/defaults.generated.json';
import { ResHero } from './DocsPage';
import { I, Icon } from '../../ds/ui';

const FAQ_ICON = 'M12 21a9 9 0 100-18 9 9 0 000 18zM9.5 9a2.5 2.5 0 015 .5c0 1.5-2.5 2-2.5 3.5M12 17h.01';
const BUY_ICON = 'M12 3v18M17 7H9.5a3 3 0 000 6h5a3 3 0 010 6H6';

type Topic = { id: string; title: string; icon: string; items: { q: string; a: string }[] };

/*
 * FAQs: topics on the left (plans and buying, then each product), questions on the right.
 * The plans questions are the same ones the Pricing page answers, so there is one place to edit each answer.
 * ?product=<id> opens a topic; ?q=<question> opens that question.
 */
export default function FaqsPage() {
  const d = useResourceData();
  const cms = useCms();
  const buying = cms<{ q: string; a: string }[]>('pricing.faq', RD['pricing.faq'] as { q: string; a: string }[]);
  const [params] = useSearchParams();
  const [topic, setTopic] = useState(params.get('product') ?? 'all');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string>(params.get('q') ?? '');

  const topics = useMemo<Topic[]>(() => {
    const byProduct = d.products.map((p) => ({ id: p.id, title: p.title, icon: p.icon, items: d.faqs.filter((f) => f.product === p.id) }));
    const general = d.faqs.filter((f) => !f.product || !d.products.some((p) => p.id === f.product));
    return [
      { id: 'buying', title: 'Plans and buying', icon: BUY_ICON, items: buying },
      ...byProduct,
      { id: 'general', title: 'General', icon: FAQ_ICON, items: general },
    ].filter((t) => t.items.length > 0);
  }, [d, buying]);
  const total = topics.reduce((n, t) => n + t.items.length, 0);

  const t = q.trim().toLowerCase();
  const shown = topics
    .filter((x) => topic === 'all' || x.id === topic)
    .map((x) => ({ ...x, items: x.items.filter((f) => t.length < 2 || (f.q + ' ' + f.a).toLowerCase().includes(t)) }))
    .filter((x) => x.items.length > 0);
  // The first question shown starts open, so the page answers something straight away.
  useEffect(() => { if (!params.get('q') && shown[0]?.items[0]) setOpen(shown[0].items[0].q); }, [topic]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <ResHero crumbs={[['Resources', '/resources'], ['FAQs']]} title="Frequently asked questions" sub="Straight answers about plans, set-up and each product." icon={FAQ_ICON} col="linear-gradient(135deg, #6D4AD8, #5236BE)" extra={`${total} answers`} curve="#FFFFFF" />
      <section className="ds-paper fq-sec">
        <div className="ds-container fq">
          <aside className="fq-side">
            <nav className="fq-topics" aria-label="Topics">
              <button type="button" aria-pressed={topic === 'all'} onClick={() => setTopic('all')}><Icon d={FAQ_ICON} size={18} />All questions<span>{total}</span></button>
              {topics.map((x) => (
                <button key={x.id} type="button" aria-pressed={topic === x.id} onClick={() => setTopic(x.id)}><Icon d={x.icon} size={18} />{x.title}<span>{x.items.length}</span></button>
              ))}
            </nav>
            <div className="fq-help">
              <b>Still need help?</b>
              <a href="mailto:support@oneofficeautomation.com"><Icon d={I.mail} size={18} />Email support</a>
              <Link to="/resources/docs"><Icon d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zM4 19V5M8 7h7M8 11h5" size={18} />Read the documentation</Link>
              <Link to="/community"><Icon d={I.chat} size={18} />Ask the community</Link>
            </div>
          </aside>

          <div className="fq-main">
            <label className="ca-search fq-search">
              <Icon d="M11 4a7 7 0 100 14 7 7 0 000-14zM20 20l-4-4" size={20} />
              <span className="ds-sr">Search questions</span>
              <input type="search" placeholder="Search questions, for example “trial” or “Runner”" value={q} onChange={(e) => setQ(e.target.value)} />
            </label>
            {shown.length === 0 && (
              <p className="ca-none">No questions match “{q}”. Try another word, or <a className="ds-link" href="mailto:support@oneofficeautomation.com">ask our team</a>.</p>
            )}
            {shown.map((x) => (
              <div key={x.id} className="fq-group">
                <h2><Icon d={x.icon} size={20} />{x.title}</h2>
                {x.items.map((f, k) => {
                  const isOpen = open === f.q;
                  const id = `fq-${x.id}-${k}`;
                  return (
                    <div className="fq-q" key={f.q} data-open={isOpen ? '1' : '0'}>
                      <h3><button type="button" aria-expanded={isOpen} aria-controls={id} onClick={() => setOpen(isOpen ? '' : f.q)}><span>{f.q}</span><i aria-hidden="true" /></button></h3>
                      {isOpen && <div id={id} className="fq-a">{f.a.split(/\n\s*\n/).map((p, n) => <p key={n}>{p}</p>)}</div>}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="ds-paper rs-ask-sec">
        <div className="ds-container">
          <div className="ask-strip">
            <div><h2>Didn’t find your answer?</h2><p>Our team answers within one business day, in your time zone.</p></div>
            <div className="ds-actions">
              <a className="ds-btn ds-btn-white" href="mailto:support@oneofficeautomation.com">Email support <Icon d={I.arrow} size={18} stroke={2.4} /></a>
              <Link className="ds-btn ds-btn-outline" to="/contact">Talk to sales</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
