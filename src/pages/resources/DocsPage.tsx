import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Fragment, useEffect, useState } from 'react';
import { useResourceData } from '../../logic/useResourceData';
import { I, Icon } from '../../ds/ui';
import { ArticleText, Helpful } from '../../logic/articleBody';
import { ArticleBody } from '../../cms/ArticleBody';

function Hero({ crumbs, title, sub, icon, col, extra, curve = '#F4F6FD' }: { crumbs: [string, string?][]; title: string; sub: string; icon: string; col?: string; extra?: string; curve?: string }) {
  return (
    <section className="hz-hero rs-sec-hero">
      <div className="ds-container">
        <nav className="rs-crumb" aria-label="Breadcrumb">
          {crumbs.map(([label, to], k) => <Fragment key={label}>{k > 0 && <span aria-hidden="true">›</span>}{to ? <Link to={to}>{label}</Link> : <span aria-current="page">{label}</span>}</Fragment>)}
        </nav>
        <div className="rs-sec-head">
          <span className="rs-sec-ic" style={{ background: col ?? 'linear-gradient(135deg, #1F74C9, #6D4AD8)' }}><Icon d={icon} size={30} /></span>
          <div><h1 className="pf-h1 rs-h1">{title}</h1><p className="cu-lead" style={{ marginTop: 6 }}>{sub}</p></div>
          {extra && <em>{extra}</em>}
        </div>
      </div>
      <svg className="hz-curve" viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden="true"><path d="M0 90 L0 44 Q720 -28 1440 44 L1440 90 Z" fill={curve} /></svg>
    </section>
  );
}
export { Hero as ResHero };

const DOC_ICON = 'M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zM4 19V5M8 7h7M8 11h5';

export default function DocsPage() {
  const d = useResourceData();
  const { product, article } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const group = d.groups.find((g) => g.id === product);
  // Each article has its own address: /resources/docs/<product>/<article>. Old ?ch= links move to it.
  const chId = article ?? params.get('ch') ?? '';
  useEffect(() => {
    const old = params.get('ch');
    if (group && old && !article) navigate(`/resources/docs/${group.id}/${old}`, { replace: true });
  }, [group, params, article, navigate]);
  const idx = group ? Math.max(0, group.chapters.findIndex((c) => c.id === chId)) : 0;
  const [q, setQ] = useState('');
  useEffect(() => setQ(''), [product]);
  const t = q.trim().toLowerCase();
  const hit = (c: { title: string; summary: string; body?: string; points?: string[] }) => t.length < 2 || (c.title + ' ' + c.summary + ' ' + (c.points ?? []).join(' ') + ' ' + (c.body ?? '')).toLowerCase().includes(t);
  useEffect(() => { if (product) window.scrollTo(0, 0); }, [product, chId]);

  /* Root: every product */
  if (!group) {
    return (
      <>
        <Hero crumbs={[['Resources', '/resources'], ['Documentation']]} title="Documentation" sub="Pick a product and read it from start to finish." icon={DOC_ICON} extra={`${d.groups.length} products`} />
        <section className="ds-soft" style={{ paddingTop: 'clamp(20px, 3vw, 36px)', paddingBottom: 'var(--ds-section-y)' }}>
          <div className="ds-container">
          <label className="ca-search rs-doc-search">
            <Icon d="M11 4a7 7 0 100 14 7 7 0 000-14zM20 20l-4-4" size={20} />
            <span className="ds-sr">Search the documentation</span>
            <input type="search" placeholder="Search all documentation" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          {t.length >= 2 && (
            <div className="rs-doc-hits">
              {d.groups.flatMap((g) => g.chapters.filter(hit).map((c) => ({ g, c }))).slice(0, 12).map(({ g, c }) => (
                <Link key={g.id + c.id} to={`/resources/docs/${g.id}?ch=${encodeURIComponent(c.id)}`}><em>{g.title}</em><b>{c.title}</b><small>{c.summary}</small></Link>
              ))}
              {!d.groups.some((g) => g.chapters.some(hit)) && <p className="ca-none">No chapters match. Try another word, or <Link className="ds-link" to="/resources/faqs">check the FAQs</Link>.</p>}
            </div>
          )}
          <div className="rs-books">
            {d.groups.map((g, k) => (
              <Link key={g.id} to={`/resources/docs/${g.id}`} data-tone={k % 2}>
                <span className="rs-book-spine" style={{ background: g.col }}><Icon d={g.icon} size={28} /></span>
                <span className="rs-book-b">
                  <h2>{g.title}</h2>
                  <p>{g.desc}</p>
                  <ol>{g.chapters.slice(0, 3).map((c, n) => <li key={c.id}><b>{n + 1}</b>{c.title}</li>)}{g.chapters.length > 3 && <li className="more">+ {g.chapters.length - 3} more chapters</li>}</ol>
                  <em>Start reading · {g.chapters.length} chapter{g.chapters.length === 1 ? '' : 's'} <Icon d={I.arrow} size={16} stroke={2.4} /></em>
                </span>
              </Link>
            ))}
          </div>
          </div>
        </section>
      </>
    );
  }

  /* A product manual, read like a book */
  const ch = group.chapters[idx];
  const total = group.chapters.length;
  const go = (n: number) => navigate(`/resources/docs/${group.id}/${group.chapters[n].id}`);
  return (
    <>
      <Hero crumbs={[['Resources', '/resources'], ['Documentation', '/resources/docs'], [group.title]]} title={group.title} sub={group.desc} icon={group.icon} col={group.col} extra={`${total} chapter${total === 1 ? '' : 's'}`} />
      <section className="ds-soft" style={{ paddingTop: 'clamp(20px, 3vw, 36px)', paddingBottom: 'var(--ds-section-y)' }}>
        <div className="ds-container rs-manual">
          <aside className="rs-toc" aria-label={`${group.title} chapters`}>
            <label className="ca-search rs-toc-search">
              <Icon d="M11 4a7 7 0 100 14 7 7 0 000-14zM20 20l-4-4" size={18} />
              <span className="ds-sr">Search {group.title}</span>
              <input type="search" placeholder={`Search ${group.title}`} value={q} onChange={(e) => setQ(e.target.value)} />
            </label>
            <small>{t.length >= 2 ? `${group.chapters.filter(hit).length} matching chapter${group.chapters.filter(hit).length === 1 ? '' : 's'}` : 'Chapters'}</small>
            <ol>
              {group.chapters.map((c, n) => !hit(c) ? null : (
                <li key={c.id} style={(c as { depth?: number }).depth ? { paddingLeft: `${((c as { depth?: number }).depth ?? 0) * 14}px` } : undefined}><button type="button" aria-current={n === idx ? 'step' : undefined} onClick={() => go(n)} data-read={n < idx ? '1' : '0'}><b>{n < idx ? <Icon d={I.check} size={12} stroke={3} /> : n + 1}</b>{c.title}</button></li>
              ))}
            </ol>
            <Link className="ds-link" to={`/resources/faqs?product=${group.id}`}>Questions about {group.title}? See FAQs →</Link>
          </aside>
          <article className="rs-doc" key={ch.id}>
            <div className="rs-progress"><span>Chapter {idx + 1} of {total}</span><i><b style={{ width: `${((idx + 1) / total) * 100}%` }} /></i>{ch.meta && <span>{ch.meta}</span>}</div>
            <h2 className="rs-ch-title">{ch.title}</h2>
            <p className="rs-ch-sum">{ch.summary}</p>
            {ch.points && ch.points.length > 0 && (
              <div className="rs-points"><small>In this chapter</small><ul>{ch.points.map((p) => <li key={p}><Icon d={I.check} size={16} stroke={2.8} />{p}</li>)}</ul></div>
            )}
            <div className="rs-body">
              <ArticleText id={ch.id} inline={ch.body}>{(body) => <><ArticleBody text={body} />{!ch.body && <Helpful id={ch.id} />}</>}</ArticleText>
            </div>
            <div className="rs-pn">
              {idx > 0 ? <button type="button" onClick={() => go(idx - 1)}><small>← Previous chapter</small><b>{group.chapters[idx - 1].title}</b></button> : <span />}
              {idx < total - 1
                ? <button type="button" onClick={() => go(idx + 1)}><small>Next chapter →</small><b>{group.chapters[idx + 1].title}</b></button>
                : <Link className="rs-pn-done" to="/resources/docs"><small>Finished</small><b>Back to all products</b></Link>}
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
