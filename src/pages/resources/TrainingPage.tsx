import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useResourceData } from '../../logic/useResourceData';
import { ResHero } from './DocsPage';
import { I, Icon } from '../../ds/ui';

const KIND_ICON: Record<string, string> = {
  'Online course': 'M2 9l10-5 10 5-10 5zM6 11v5c3 2 9 2 12 0v-5',
  Video: 'M4 6h16v10H4zM10 9l5 2-5 2zM8 20h8',
  Document: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h6M9 17h4',
  Link: 'M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1',
  Sample: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
};
function SmartLink({ to, className, children }: { to: string; className?: string; children: ReactNode }) {
  return /^https?:/.test(to) ? <a className={className} href={to} target="_blank" rel="noopener noreferrer">{children}</a> : <Link className={className} to={to}>{children}</Link>;
}

export default function TrainingPage() {
  const d = useResourceData();
  const [level, setLevel] = useState('all');
  const [kind, setKind] = useState('all');
  const levels = ['all', ...d.path.map((p) => p.n)];
  const kinds = ['all', ...Array.from(new Set(d.training.map((x) => x.kind)))];
  const shown = d.training.filter((x) => (level === 'all' || x.level === level || x.level === 'All levels') && (kind === 'all' || x.kind === kind));

  return (
    <>
      <ResHero crumbs={[['Resources', '/resources'], ['Training']]} title="Training" sub="Courses, videos and documents for every level." icon={KIND_ICON['Online course']} col="linear-gradient(135deg, #3F67D6, #6D4AD8)" extra={`${d.training.length} items`} curve="#1F2A5C" />
      <section className="ds-navy" style={{ paddingBlock: 'clamp(40px, 5vw, 64px)' }}>
        <div className="ds-container">
          <ol className="rs-path">
            {d.path.map((l, k) => (
              <li key={l.n}><button type="button" className="rs-path-btn" aria-pressed={level === l.n} onClick={() => setLevel(level === l.n ? 'all' : l.n)}><span className="n">{k + 1}</span><b>{l.n}</b><small>{l.d}</small></button></li>
            ))}
          </ol>
        </div>
      </section>
      <section className="ds-soft" style={{ paddingTop: 'clamp(28px, 3.5vw, 48px)', paddingBottom: 'var(--ds-section-y)' }}>
        <div className="ds-container">
          <div className="rs-tr-filters">
            <div role="group" aria-label="Level"><small>Level</small>{levels.map((l) => <button key={l} type="button" aria-pressed={level === l} onClick={() => setLevel(l)}>{l === 'all' ? 'All levels' : l}</button>)}</div>
            <div role="group" aria-label="Type"><small>Type</small>{kinds.map((k) => <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}>{k === 'all' ? 'All types' : k}</button>)}</div>
          </div>
          {shown.length === 0 && <p className="ca-none">Nothing for this choice yet. Try another level or type.</p>}
          <div className="rs-tr">
            {shown.map((x, k) => (
              <SmartLink key={x.title + k} to={x.url || '/resources'}>
                <div className="rs-tr-top" data-tone={k % 2}><i><Icon d={KIND_ICON[x.kind] ?? KIND_ICON.Link} size={22} /></i><em>{x.kind}</em></div>
                <h3>{x.title}</h3>
                <p>{x.summary}</p>
                <div className="rs-tr-meta"><span>{x.level}</span>{x.product && <span>{d.productTitle(x.product)}</span>}{x.duration && <span><Icon d={I.clock} size={13} />{x.duration}</span>}</div>
                <b>{x.cta || 'Open'} <Icon d={/^https?:/.test(x.url) ? 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6' : I.arrow} size={16} stroke={2.4} /></b>
              </SmartLink>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
