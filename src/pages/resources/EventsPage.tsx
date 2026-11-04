import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCms } from '../../cms/CmsContext';
import RD from '../../cms/defaults.generated.json';
import { ResHero } from './DocsPage';
import { I, Icon } from '../../ds/ui';
import { EventRegister } from '../public/PublicPages';
import { eventStart, tzLabel } from '../../cms/time';

type Ev = { title: string; kind: string; date: string; time: string; tz?: string; place: string; summary: string; url: string; cta: string; page?: string; slug?: string; recording?: string };

const CAL = 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4M8 14h3';
const PIN = 'M12 21s-7-6.2-7-11.5a7 7 0 0114 0C19 14.8 12 21 12 21zM12 12a2.5 2.5 0 100-5 2.5 2.5 0 000 5z';

/** When an event starts, in the event's own time zone and (when different) in the visitor's. */
function when(e: Ev) {
  const start = eventStart(e.date, e.time, e.tz ?? '');
  if (!start) return { start: null, theirs: e.time, mine: '' };
  const theirs = `${e.time}${e.tz ? ' ' + tzLabel(e.tz) : ''}`;
  const mineTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const mine = e.tz && mineTz !== e.tz ? start.toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }) : '';
  return { start, theirs, mine };
}

/** A calendar file for one event (one hour long), so it can be added to Outlook, Google or Apple calendars. */
function icsHref(e: Ev, start: Date) {
  const f = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const link = e.page ? `${location.origin}${e.page}` : location.href;
  const text = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//OneOfficeAutomation//Events//EN', 'BEGIN:VEVENT', `UID:${e.slug || e.title.replace(/\W+/g, '-')}@oneofficeautomation.com`,
    `DTSTAMP:${f(new Date())}`, `DTSTART:${f(start)}`, `DTEND:${f(end)}`, `SUMMARY:${e.title}`, `DESCRIPTION:${e.summary} ${link}`, `LOCATION:${e.place || 'Online'}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(text);
}

function DateBox({ date }: { date: string }) {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(date + 'T00:00:00') : null;
  return (
    <span className="ev-date" aria-hidden="true">
      {d ? <><small>{d.toLocaleString('en-GB', { month: 'short' })}</small><b>{d.getDate()}</b><small>{d.toLocaleString('en-GB', { weekday: 'short' })}</small></> : <b>TBA</b>}
    </span>
  );
}

function Action({ e, past }: { e: Ev; past?: boolean }) {
  if (past) return e.recording || e.url ? <a className="ds-btn ds-btn-line" href={e.recording || e.url}>Watch the recording</a> : null;
  if (e.url) return <a className="ds-btn ds-btn-grad" href={e.url} {...(/^https?:/.test(e.url) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{e.cta || 'Register'}</a>;
  return <EventRegister event={`${e.title}${e.date ? ' (' + e.date + ')' : ''}`} />;
}

/** /resources/events — the next event large, with times in the visitor's zone and a calendar file; then the rest, and past recordings. */
export default function EventsPage() {
  const cms = useCms();
  const events = cms<Ev[]>('resources.events', RD['resources.events'] as Ev[]);
  const today = new Date().toISOString().slice(0, 10);
  const up = events.filter((e) => (e.date || '9999') >= today).sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'));
  const past = events.filter((e) => e.date && e.date < today).sort((a, b) => b.date.localeCompare(a.date));
  const kinds = [...new Set(up.map((e) => e.kind).filter(Boolean))];
  const [kind, setKind] = useState('All');
  const [next, ...rest] = up;
  const restShown = rest.filter((e) => kind === 'All' || e.kind === kind);
  const w = next ? when(next) : null;
  const days = w?.start ? Math.ceil((w.start.getTime() - Date.now()) / 86400000) : null;

  return (
    <>
      <ResHero crumbs={[['Resources', '/resources'], ['Events']]} title="Events and webinars" sub="Live sessions where we build agents with you, answer questions and show what’s new." icon={CAL} col="linear-gradient(135deg, #6D4AD8, #3F67D6)" extra={up.length ? `${up.length} upcoming` : undefined} curve="#FFFFFF" />

      <section className="ds-paper ev-sec">
        <div className="ds-container ev">
          <div className="ev-main">
            {next ? (
              <article className="ev-next">
                <div className="ev-next-top">
                  <span className="ev-badge"><span className="ca-dot" />Next up{days !== null && days >= 0 ? ` · ${days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`}` : ''}</span>
                  <em>{next.kind}</em>
                </div>
                <div className="ev-next-body">
                  <DateBox date={next.date} />
                  <div>
                    <h2>{next.page ? <Link to={next.page}>{next.title}</Link> : next.title}</h2>
                    <p>{next.summary}</p>
                    <ul className="ev-facts">
                      {w?.theirs && <li><Icon d={I.clock} size={16} />{w.theirs}{w.mine && <span> · {w.mine} your time</span>}</li>}
                      {next.place && <li><Icon d={PIN} size={16} />{next.place}</li>}
                    </ul>
                  </div>
                </div>
                <div className="ev-next-act">
                  <Action e={next} />
                  {w?.start && <a className="ds-btn ds-btn-line" href={icsHref(next, w.start)} download={`${next.slug || 'event'}.ics`}><Icon d={CAL} size={16} />Add to calendar</a>}
                  {next.page && <Link className="ds-link" to={next.page}>Event details →</Link>}
                </div>
              </article>
            ) : (
              <div className="rs-empty">
                <i><Icon d={CAL} size={30} /></i>
                <b>New dates are announced soon.</b>
                <p>Get product updates and we’ll tell you when the next webinar or workshop opens.</p>
                <Link className="ds-btn ds-btn-grad" to="/community#updates">Get product updates</Link>
              </div>
            )}

            {rest.length > 0 && (
              <>
                <div className="ev-h"><h2 className="ds-h3">Also coming up</h2>
                  {kinds.length > 1 && <div className="cu-filters" role="group" aria-label="Type of event">{['All', ...kinds].map((k) => <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}>{k}</button>)}</div>}
                </div>
                <div className="ev-list">
                  {restShown.map((e) => {
                    const x = when(e);
                    return (
                      <article key={e.title + e.date}>
                        <DateBox date={e.date} />
                        <div><em>{e.kind}</em><h3>{e.page ? <Link to={e.page}>{e.title}</Link> : e.title}</h3><p>{x.theirs}{e.place ? ` · ${e.place}` : ''}</p></div>
                        <Action e={e} />
                      </article>
                    );
                  })}
                </div>
              </>
            )}

            {past.length > 0 && (
              <>
                <div className="ev-h"><h2 className="ds-h3">Past events</h2></div>
                <div className="ev-list" data-past="1">
                  {past.map((e) => (
                    <article key={e.title + e.date}>
                      <DateBox date={e.date} />
                      <div><em>{e.kind}</em><h3>{e.page ? <Link to={e.page}>{e.title}</Link> : e.title}</h3><p>{e.summary}</p></div>
                      <Action e={e} past />
                    </article>
                  ))}
                </div>
              </>
            )}
          </div>

          <aside className="ev-side">
            <div className="ev-card">
              <b>What to expect</b>
              <ul>
                <li><Icon d={I.check} size={16} stroke={2.8} />Live building, not slides</li>
                <li><Icon d={I.check} size={16} stroke={2.8} />Questions answered on the spot</li>
                <li><Icon d={I.check} size={16} stroke={2.8} />Free to join</li>
              </ul>
            </div>
            <div className="ev-card ev-card-soft">
              <b>Never miss a session</b>
              <p>New dates go out with our monthly product update.</p>
              <Link className="ds-btn ds-btn-grad" to="/community#updates">Get updates</Link>
            </div>
            <Link className="ev-link" to="/resources/training"><Icon d="M2 9l10-5 10 5-10 5zM6 11v5c3 2 9 2 12 0v-5" size={18} />Prefer to learn at your own pace? See Training →</Link>
          </aside>
        </div>
      </section>

      <section className="ds-paper rs-ask-sec">
        <div className="ds-container">
          <div className="ask-strip">
            <div><h2>Want a private session for your team?</h2><p>We’ll run a live build on your own process, with your team’s questions.</p></div>
            <div className="ds-actions"><Link className="ds-btn ds-btn-white" to="/contact">Book a session <Icon d={I.arrow} size={18} stroke={2.4} /></Link></div>
          </div>
        </div>
      </section>
    </>
  );
}
