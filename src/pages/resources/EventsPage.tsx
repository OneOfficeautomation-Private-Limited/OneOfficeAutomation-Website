import { Link } from 'react-router-dom';
import { useCms } from '../../cms/CmsContext';
import RD from '../../cms/defaults.generated.json';
import { ResHero } from './DocsPage';
import { I, Icon } from '../../ds/ui';
import { EventRegister } from '../public/PublicPages';

type Ev = { title: string; kind: string; date: string; time: string; place: string; summary: string; url: string; cta: string; page?: string };

function DateBox({ date }: { date: string }) {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(date + 'T00:00:00') : null;
  return (
    <span className="rs-ev-date" aria-hidden="true">
      {d ? <><small>{d.toLocaleString('en-GB', { month: 'short' })}</small><b>{d.getDate()}</b><small>{d.getFullYear()}</small></> : <b>TBA</b>}
    </span>
  );
}

function List({ items, past }: { items: Ev[]; past?: boolean }) {
  return (
    <div className="rs-ev">
      {items.map((e) => (
        <article key={e.title + e.date} data-past={past ? '1' : '0'}>
          <DateBox date={e.date} />
          <div>
            <div className="rs-ev-tags"><em>{e.kind}</em>{e.place && <span><Icon d="M12 21s-7-6.2-7-11.5a7 7 0 0114 0C19 14.8 12 21 12 21zM12 12a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" size={14} />{e.place}</span>}{e.time && <span><Icon d={I.clock} size={14} />{e.time}</span>}</div>
            <h3>{e.page ? <Link to={e.page}>{e.title}</Link> : e.title}</h3>
            <p>{e.summary}</p>
          </div>
          {!e.url && !past && <EventRegister event={`${e.title}${e.date ? ' (' + e.date + ')' : ''}`} />}
          {e.url && <a className={past ? 'ds-btn ds-btn-line' : 'ds-btn ds-btn-grad'} href={e.url} {...(/^https?:/.test(e.url) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{e.cta || (past ? 'Watch the recording' : 'Register')}</a>}
        </article>
      ))}
    </div>
  );
}

export default function EventsPage() {
  const cms = useCms();
  const events = cms<Ev[]>('resources.events', RD['resources.events'] as Ev[]);
  const today = new Date().toISOString().slice(0, 10);
  const up = events.filter((e) => (e.date || '9999') >= today).sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'));
  const past = events.filter((e) => e.date && e.date < today).sort((a, b) => b.date.localeCompare(a.date));
  return (
    <>
      <ResHero crumbs={[['Resources', '/resources'], ['Events']]} title="Events" sub="Webinars, workshops and meetups." icon="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4M8 14h3" col="linear-gradient(135deg, #6D4AD8, #3F67D6)" extra={up.length ? `${up.length} upcoming` : undefined} />
      <section className="ds-soft" style={{ paddingTop: 'clamp(20px, 3vw, 36px)', paddingBottom: 'var(--ds-section-y)' }}>
        <div className="ds-container" style={{ maxWidth: 1000 }}>
          <h2 className="ds-h2 rs-sub-h">Upcoming</h2>
          {up.length ? <List items={up} /> : (
            <div className="rs-empty">
              <i><Icon d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4" size={30} /></i>
              <b>New dates are announced soon.</b>
              <p>Subscribe to product updates and we’ll tell you when the next webinar or workshop opens.</p>
              <Link className="ds-btn ds-btn-grad" to="/community">Get product updates</Link>
            </div>
          )}
          {past.length > 0 && <><h2 className="ds-h2 rs-sub-h" style={{ marginTop: 40 }}>Past events</h2><List items={past} past /></>}
          <p style={{ marginTop: 28 }}>Looking for recordings? <Link className="ds-link" to="/resources/training">See videos in Training →</Link></p>
        </div>
      </section>
    </>
  );
}
