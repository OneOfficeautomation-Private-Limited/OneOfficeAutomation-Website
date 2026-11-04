import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useCms } from '../../cms/CmsContext';
import RD from '../../cms/defaults.generated.json';
import { ResHero } from './DocsPage';
import { I, Icon } from '../../ds/ui';

type Post = { kind: string; title: string; summary: string; meta: string; url: string; cta: string; featured?: boolean; page?: string; download?: string; file?: string; date?: string; author?: string; cover?: string; gated?: boolean };
function SmartLink({ to, className, children }: { to: string; className?: string; children: ReactNode }) {
  return /^https?:/.test(to) ? <a className={className} href={to} target="_blank" rel="noopener noreferrer">{children}</a> : <Link className={className} to={to}>{children}</Link>;
}
const BLOG = 'M4 4h16v16H4zM8 8h8M8 12h8M8 16h5';
const KIND_ICON: Record<string, string> = { 'Blog post': BLOG, 'E-book': 'M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zM4 19V5', Datasheet: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h6M9 17h4' };
const shortDate = (iso?: string) => { if (!iso) return ''; const d = new Date(`${iso}T12:00:00Z`); return isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }); };
const linkOf = (x: Post) => x.download || x.page || x.file || x.url || '/resources';
const ctaOf = (x: Post) => x.cta || (x.download || x.gated ? 'Get the free copy' : x.kind === 'Blog post' ? 'Read the post' : 'Open');

/** One cover: the post's image, or a branded tile with its type, so every card has the same shape. */
function Cover({ x, k }: { x: Post; k: number }) {
  return x.cover
    ? <span className="bl-cover"><img src={x.cover} alt="" loading="lazy" /></span>
    : <span className="bl-cover" data-tone={k % 3} aria-hidden="true"><Icon d={KIND_ICON[x.kind] ?? BLOG} size={34} /></span>;
}

/** /resources/blog — the newest (or featured) piece large, the rest as cards, filtered by type. */
export default function BlogPage() {
  const cms = useCms();
  const all = cms<Post[]>('resources.insights', RD['resources.insights'] as Post[]);
  const byDate = [...all].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
  const posts = [...byDate.filter((x) => x.featured), ...byDate.filter((x) => !x.featured)];
  const [kind, setKind] = useState('all');
  const kinds = ['all', ...Array.from(new Set(posts.map((p) => p.kind)))];
  const shown = posts.filter((p) => kind === 'all' || p.kind === kind);
  const [lead, ...rest] = shown;
  return (
    <>
      <ResHero crumbs={[['Resources', '/resources'], ['Blog']]} title="Blog and guides" sub="Lessons from real automation projects, plus e-books and datasheets you can take to your team." icon={BLOG} col="linear-gradient(135deg, #3F67D6, #6D4AD8)" extra={posts.length ? `${posts.length} ${posts.length === 1 ? 'piece' : 'pieces'}` : undefined} curve="#FFFFFF" />
      <section className="ds-paper bl-sec">
        <div className="ds-container">
          {posts.length === 0 ? (
            <div className="rs-empty" style={{ maxWidth: 720, marginInline: 'auto' }}>
              <i><Icon d={BLOG} size={30} /></i>
              <b>Our first posts are on their way.</b>
              <p>Get product updates and we’ll send new posts, e-books and guides once a month.</p>
              <Link className="ds-btn ds-btn-grad" to="/community#updates">Get product updates</Link>
            </div>
          ) : (
            <>
              {kinds.length > 2 && <div className="cu-filters bl-filters" role="group" aria-label="Type">{kinds.map((k) => <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}>{k === 'all' ? 'All' : k}</button>)}</div>}
              {lead && (
                <SmartLink to={linkOf(lead)} className="bl-lead">
                  <Cover x={lead} k={0} />
                  <span className="bl-lead-t">
                    <em>{lead.kind}{lead.featured ? ' · Featured' : ''}</em>
                    <b>{lead.title}</b>
                    <span>{lead.summary}</span>
                    <small>{[lead.author, shortDate(lead.date) || lead.meta].filter(Boolean).join(' · ')}</small>
                    <i>{ctaOf(lead)} <Icon d={I.arrow} size={16} stroke={2.4} /></i>
                  </span>
                </SmartLink>
              )}
              {rest.length > 0 && (
                <div className="bl-grid">
                  {rest.map((x, k) => (
                    <SmartLink key={x.title + k} to={linkOf(x)} className="bl-card">
                      <Cover x={x} k={k + 1} />
                      <em>{x.kind}</em>
                      <b>{x.title}</b>
                      <span>{x.summary}</span>
                      <small>{[x.author, shortDate(x.date) || x.meta].filter(Boolean).join(' · ')}</small>
                      <i>{ctaOf(x)} <Icon d={I.arrow} size={16} stroke={2.4} /></i>
                    </SmartLink>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>
      <section className="ds-paper rs-ask-sec">
        <div className="ds-container">
          <div className="ask-strip">
            <div><h2>One email a month. Only the useful bits.</h2><p>New posts, guides and webinar dates, straight to your inbox. Unsubscribe any time.</p></div>
            <div className="ds-actions"><Link className="ds-btn ds-btn-white" to="/community#updates">Get product updates <Icon d={I.arrow} size={18} stroke={2.4} /></Link></div>
          </div>
        </div>
      </section>
    </>
  );
}
