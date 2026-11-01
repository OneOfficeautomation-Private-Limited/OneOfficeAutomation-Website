import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useCms } from '../../cms/CmsContext';
import RD from '../../cms/defaults.generated.json';
import { ResHero } from './DocsPage';
import { I, Icon } from '../../ds/ui';

type Post = { kind: string; title: string; summary: string; meta: string; url: string; cta: string; featured?: boolean; page?: string; download?: string; file?: string };
function SmartLink({ to, className, children }: { to: string; className?: string; children: ReactNode }) {
  return /^https?:/.test(to) ? <a className={className} href={to} target="_blank" rel="noopener noreferrer">{children}</a> : <Link className={className} to={to}>{children}</Link>;
}

export default function BlogPage() {
  const cms = useCms();
  const all = cms<Post[]>('resources.insights', RD['resources.insights'] as Post[]);
  const posts = [...all.filter((x) => x.featured), ...all.filter((x) => !x.featured)];
  const [kind, setKind] = useState('all');
  const kinds = ['all', ...Array.from(new Set(posts.map((p) => p.kind)))];
  const shown = posts.filter((p) => kind === 'all' || p.kind === kind);
  return (
    <>
      <ResHero crumbs={[['Resources', '/resources'], ['Blog']]} title="Blog" sub="Posts, e-books and datasheets from our team." icon="M4 4h16v16H4zM8 8h8M8 12h8M8 16h5" col="linear-gradient(135deg, #3F67D6, #6D4AD8)" extra={posts.length ? `${posts.length} items` : undefined} />
      <section className="ds-soft" style={{ paddingTop: 'clamp(20px, 3vw, 36px)', paddingBottom: 'var(--ds-section-y)' }}>
        <div className="ds-container">
          {posts.length === 0 ? (
            <div className="rs-empty" style={{ maxWidth: 720, marginInline: 'auto' }}>
              <i><Icon d="M4 4h16v16H4zM8 8h8M8 12h8M8 16h5" size={30} /></i>
              <b>Our first posts are on their way.</b>
              <p>Subscribe to product updates and we’ll send you new posts, e-books and guides once a month.</p>
              <Link className="ds-btn ds-btn-grad" to="/community">Get product updates</Link>
            </div>
          ) : (
            <>
              {kinds.length > 2 && <div className="cu-filters" role="group" aria-label="Type">{kinds.map((k) => <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}>{k === 'all' ? 'All' : k}</button>)}</div>}
              <div className="rs-ins">
                {shown.map((x, k) => (
                  <SmartLink key={x.title + k} to={x.download || x.page || x.file || x.url || '/resources'}>
                    <div className="rs-ins-top" data-tone={k % 2}><em>{x.kind}</em></div>
                    <h3>{x.title}</h3>
                    <p>{x.summary}</p>
                    <span><small>{x.meta}</small><b>{x.cta || 'Read more'} <Icon d={I.arrow} size={16} stroke={2.4} /></b></span>
                  </SmartLink>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}
