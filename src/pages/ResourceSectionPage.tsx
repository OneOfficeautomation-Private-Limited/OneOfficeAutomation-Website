import { Fragment } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { useResourceData } from '../logic/useResourceData';
import { useResourceSectionLogic } from '../logic/ResourceSectionLogic';
import { I, Icon } from '../ds/ui';
import { ArticleState, Helpful } from '../logic/articleBody';
import { ArticleBody } from '../cms/ArticleBody';

export default function ResourceSectionPage() {
  const v = useResourceSectionLogic();
  const d = useResourceData();
  const { section = '' } = useParams();
  const [params] = useSearchParams();
  if (!params.get('article')) {
    const cat = d.cats.find((c) => c.id === section);
    const block = cat ? (cat.block || ({ learn: 'learn', templates: 'library', community: 'community' } as Record<string, string>)[cat.id] || 'docs') : '';
    if (d.products.some((p) => p.id === section)) return <Navigate to={`/resources/docs/${section}`} replace />;
    if (section === 'troubleshooting') return <Navigate to="/resources/faqs" replace />;
    if (block === 'learn' || block === 'library') return <Navigate to="/resources/training" replace />;
    if (block === 'docs') return <Navigate to="/resources/docs" replace />;
  }
  const art = v.art;
  return (
    <>
      {/* Compact hero */}
      <section id="overview" className="hz-hero rs-sec-hero">
        <div className="ds-container">
          <nav className="rs-crumb" aria-label="Breadcrumb">
            <Link to="/resources">Resources</Link><span aria-hidden="true">›</span>
            {v.showArticle ? <button type="button" onClick={v.back}>{v.cat.title}</button> : <span aria-current="page">{v.cat.title}</span>}
            {v.showArticle && <><span aria-hidden="true">›</span><span aria-current="page">{art.title}</span></>}
          </nav>
          {v.showList && (
            <div className="rs-sec-head">
              <span className="rs-sec-ic" style={{ background: v.cat.col }}><Icon d={v.cat.icon} size={30} /></span>
              <div>
                <small>{v.kindLabel}</small>
                <h1 className="pf-h1 rs-h1">{v.cat.title}</h1>
                <p className="cu-lead" style={{ marginTop: 6 }}>{v.cat.desc}</p>
              </div>
              <em>{v.total}</em>
            </div>
          )}
          {v.showArticle && (
            <div className="rs-art-head">
              <div className="rs-art-tags"><span>{v.artCat.title}</span>{v.hasArtProd && <span>{v.artProdTitle}</span>}{art.meta && <span><Icon d={I.clock} size={14} />{art.meta}</span>}</div>
              <h1 className="pf-h1 rs-h1">{art.title}</h1>
              <p className="cu-lead" style={{ marginTop: 8 }}>{art.summary}</p>
            </div>
          )}
        </div>
        <svg className="hz-curve" viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden="true"><path d="M0 90 L0 44 Q720 -28 1440 44 L1440 90 Z" fill="#F4F6FD" /></svg>
      </section>

      {/* Library */}
      {v.showList && (
        <section className="ds-soft" style={{ paddingTop: 'clamp(20px, 3vw, 36px)', paddingBottom: 'clamp(56px, 7vw, 96px)' }}>
          <div className="ds-container cx-board">
            <aside className="cx-side">
              <label className="ca-search">
                <Icon d="M11 4a7 7 0 100 14 7 7 0 000-14zM20 20l-4-4" size={20} />
                <span className="ds-sr">Search this section</span>
                <input type="search" placeholder="Search this section" value={v.q} onChange={v.typeQ} />
              </label>
              {v.hasChips && (
                <div role="group" aria-label={v.filterLabel}>
                  <small>{v.filterLabel}</small>
                  {v.chips.map((c) => <button key={c.id} type="button" aria-pressed={c.active} onClick={c.pick}>{c.label}<Icon d="M9 6l6 6-6 6" size={16} stroke={2.4} /></button>)}
                </div>
              )}
              <Link className="ds-link" to="/resources">← All resources</Link>
            </aside>
            <div className="cx-main">
              {v.emptyList && <p className="ca-none">Nothing matches yet. Try another word or filter, or <Link className="ds-link" to="/contact">ask our team</Link>.</p>}
              <div className="rs-list">
                {v.list.map((i) => (
                  <button key={i.id} type="button" className="rs-item" onClick={i.open}>
                    <span className="rs-item-ic" style={{ background: v.cat.col }}><Icon d={v.cat.icon} size={20} /></span>
                    <span className="rs-item-t">
                      {i.hasTag && <em>{i.tag}</em>}
                      <b>{i.title}</b>
                      <small>{i.summary}</small>
                    </span>
                    <span className="rs-item-m">{i.meta && <span>{i.meta}</span>}<i>Read <Icon d={I.arrow} size={16} stroke={2.4} /></i></span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Article */}
      {v.showArticle && (
        <section className="ds-soft" style={{ paddingTop: 'clamp(20px, 3vw, 36px)', paddingBottom: 'clamp(56px, 7vw, 96px)' }}>
          <div className="ds-container rs-read">
            <article className="rs-doc">
              {v.hasPoints && (
                <div className="rs-points">
                  <small>In this article</small>
                  <ul>{art.points.map((p: string) => <li key={p}><Icon d={I.check} size={16} stroke={2.8} />{p}</li>)}</ul>
                </div>
              )}
              <div className="rs-body">
                <ArticleState state={v.artState} />
                {v.artState === 'ready' && <ArticleBody text={v.bodyText} />}
                {v.artState === 'ready' && !(v.art as { body?: string }).body && <Helpful id={v.art.id} />}
              </div>
              <div className="rs-pn">
                <button type="button" onClick={v.prev.open}><small>← Previous</small><b>{v.prev.title}</b></button>
                <button type="button" onClick={v.next.open}><small>Next →</small><b>{v.next.title}</b></button>
              </div>
            </article>
            <aside className="rs-aside">
              <button type="button" className="ds-link rs-back" onClick={v.back}>← All {v.cat.title.toLowerCase()} articles</button>
              {v.hasRelated && (
                <div className="rs-rel">
                  <small>Related articles</small>
                  {v.related.map((r) => <button key={r.id} type="button" onClick={r.open}><b>{r.title}</b><span>{r.meta}</span></button>)}
                </div>
              )}
              <div className="rs-ask">
                <b>Still stuck?</b>
                <p>Our team can walk you through it.</p>
                <a className="ds-btn ds-btn-grad" href="mailto:support@oneofficeautomation.com">Email support</a>
              </div>
            </aside>
          </div>
        </section>
      )}

      {/* Help strip */}
      <section className="ds-paper" style={{ paddingBlock: 'clamp(40px, 5vw, 64px)' }}>
        <div className="ds-container rs-help">
          <h2>Didn’t find what you need?</h2>
          <div>
            <Link to="/resources/community"><Icon d="M9 11a3 3 0 100-6 3 3 0 000 6zM3 20v-1a6 6 0 0112 0v1M16 5a3 3 0 010 6M21 20v-1a6 6 0 00-4-5.6" size={20} />Ask the community</Link>
            <a href="mailto:support@oneofficeautomation.com"><Icon d={I.mail} size={20} />Email support</a>
            <Link to="/contact"><Icon d={I.clock} size={20} />Book a demo</Link>
          </div>
        </div>
      </section>
    </>
  );
}
