import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCms } from '../cms/CmsContext';
import D from '../cms/defaults.generated.json';
import { ArticleBody } from '../cms/ArticleBody';
import { slugify, storySlug } from '../cms/slug';
import { I, Icon } from '../ds/ui';
import { ArticleText } from '../logic/articleBody';
import { EventRegister } from './public/PublicPages';
import { eventStart, tzLabel } from '../cms/time';
import { iconPath } from '../cms/icons';

type Story = { co: string; slug?: string; logo?: string; title: string; does: string; ind: string; icon: string; s1: string; l1: string; s2?: string; l2?: string; quote?: string; role?: string; challenge?: string; solution?: string; results?: string };
type Role = { id: string; title: string; team: string; place: string; type: string; about: string; does: string[]; needs: string[] };

function NotFound({ what, back, backLabel }: { what: string; back: string; backLabel: string }) {
  return (
    <section className="ds-paper ds-section">
      <div className="ds-container" style={{ maxWidth: 720 }}>
        <h1 className="ds-h2">We can’t find that {what}.</h1>
        <p className="ds-lead ds-muted">It may have been renamed or removed.</p>
        <Link className="ds-btn ds-btn-grad" to={back}>{backLabel}</Link>
      </div>
    </section>
  );
}

const Rings = () => (
  <svg viewBox="0 0 600 360" fill="none" aria-hidden="true"><circle cx="225" cy="180" r="150" stroke="#8FB8FF" strokeOpacity=".35" strokeWidth="2" /><circle cx="375" cy="180" r="150" stroke="#C3B1FF" strokeOpacity=".35" strokeWidth="2" /></svg>
);

/** /customers/:story — one customer story, with its results and (when written) the full case study. */
export function StoryPage() {
  const { story = '' } = useParams();
  const stories = useCms()<Story[]>('customers.stories', D['customers.stories'] as Story[]);
  const s = stories.find((x) => storySlug(x) === story);
  if (!s) return <NotFound what="customer story" back="/customers#stories" backLabel="See all customer stories" />;
  const more = stories.filter((x) => x !== s).slice(0, 2);
  const sections: [string, string | undefined][] = [['The challenge', s.challenge], ['What we built', s.solution], ['The results', s.results]];
  return (
    <>
      <section className="hz-hero">
        <div className="ds-container" style={{ maxWidth: 900, paddingBottom: 'clamp(44px, 6vw, 76px)' }}>
          <p className="hint" style={{ margin: 0 }}><Link to="/customers#stories" style={{ color: '#C9D4FF' }}>← Customer stories</Link></p>
          <p className="ab-kicker" style={{ marginTop: 18 }}><Icon d={s.icon} size={18} />{s.ind}</p>
          {s.logo ? <img src={s.logo} alt={s.co} style={{ display: 'block', maxHeight: 48, maxWidth: 220, margin: '6px 0 14px', background: '#FFFFFF', borderRadius: 8, padding: '6px 10px' }} /> : <p className="cu-lead" style={{ margin: '6px 0 0' }}>{s.co}</p>}
          <h1 className="pf-h1">{s.title}</h1>
          <p className="cu-lead">{s.does}</p>
        </div>
      </section>
      <section className="ds-paper ds-section">
        <div className="ds-container" style={{ maxWidth: 900, display: 'grid', gap: 28 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            {[[s.s1, s.l1], [s.s2, s.l2]].filter(([n]) => n).map(([n, l]) => (
              <div key={n} className="ds-card" style={{ padding: 22, borderRadius: 18, border: '1px solid #E3E8F5', background: '#FFFFFF' }}>
                <b style={{ display: 'block', font: '700 2.4rem/1.1 var(--ooa-display)', color: '#2B54C9' }}>{n}</b><span>{l}</span>
              </div>
            ))}
          </div>
          {sections.some(([, t]) => t) && (
            <div className="rs-body">
              {sections.map(([h, t]) => t ? <div key={h}><h2>{h}</h2><ArticleBody text={t} /></div> : null)}
            </div>
          )}
          {s.quote && (
            <figure style={{ margin: 0, padding: 24, borderRadius: 18, background: '#F4F6FD' }}>
              <blockquote style={{ margin: 0, font: '500 1.25rem/1.5 var(--ooa-display)' }}>“{s.quote}”</blockquote>
              <figcaption className="ds-muted" style={{ marginTop: 10 }}>{s.role}{s.role && s.co ? ', ' : ''}{s.co}</figcaption>
            </figure>
          )}
          {more.length > 0 && (
            <div>
              <h2 className="ds-h3" style={{ marginBottom: 12 }}>More stories</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
                {more.map((m) => <Link key={storySlug(m)} to={`/customers/${storySlug(m)}`} className="ds-card" style={{ padding: 18, borderRadius: 16, border: '1px solid #E3E8F5', background: '#FFFFFF', textDecoration: 'none', color: 'inherit' }}><small className="ds-muted">{m.ind}</small><b style={{ display: 'block', marginTop: 4 }}>{m.title}</b></Link>)}
              </div>
            </div>
          )}
        </div>
      </section>
      <section className="ds-paper" style={{ paddingBottom: 'var(--ds-section-y)' }}>
        <div className="ds-container"><div className="hz-final"><Rings />
          <h2 className="ds-h2" style={{ position: 'relative' }}>Your process could be next.</h2>
          <div className="ds-actions" style={{ position: 'relative', justifyContent: 'center' }}><Link className="ds-btn ds-btn-white" to="/contact">Book a demo <Icon d={I.arrow} size={18} stroke={2.4} /></Link></div>
        </div></div>
      </section>
    </>
  );
}

/** /careers/:role — one open role, with everything a candidate needs and a button to apply. */
export function RolePage() {
  const { role = '' } = useParams();
  const roles = useCms()<Role[]>('careers.roles', D['careers.roles'] as Role[]);
  const r = roles.find((x) => x.id === role);
  if (!r) return <NotFound what="role" back="/careers#roles" backLabel="See all open roles" />;
  const others = roles.filter((x) => x.id !== r.id).slice(0, 3);
  return (
    <>
      <section className="hz-hero">
        <div className="ds-container" style={{ maxWidth: 900, paddingBottom: 'clamp(44px, 6vw, 76px)' }}>
          <p className="hint" style={{ margin: 0 }}><Link to="/careers#roles" style={{ color: '#C9D4FF' }}>← Open roles</Link></p>
          <h1 className="pf-h1" style={{ marginTop: 18 }}>{r.title}</h1>
          <p className="cu-lead">{[r.team, r.place, r.type].filter(Boolean).join(' · ')}</p>
          <div className="ds-actions" style={{ marginTop: 20 }}><Link className="ds-btn ds-btn-grad" to={`/careers?apply=${encodeURIComponent(r.id)}#apply`}>Apply for this role <Icon d={I.arrow} size={18} stroke={2.4} /></Link></div>
        </div>
      </section>
      <section className="ds-paper ds-section">
        <div className="ds-container rs-body" style={{ maxWidth: 820 }}>
          <p style={{ fontSize: '1.15rem' }}>{r.about}</p>
          <h2>What you’ll do</h2>
          {(r.does ?? []).map((b) => <p key={b} className="rs-li">{b}</p>)}
          <h2>What we look for</h2>
          {(r.needs ?? []).map((b) => <p key={b} className="rs-li">{b}</p>)}
          <p style={{ marginTop: 28 }}><Link className="ds-btn ds-btn-grad" to={`/careers?apply=${encodeURIComponent(r.id)}#apply`}>Apply for this role</Link></p>
          {others.length > 0 && (
            <>
              <h2>Other open roles</h2>
              {others.map((o) => <p key={o.id} className="rs-li"><Link to={`/careers/${o.id}`}>{o.title}</Link> <span className="ds-muted">· {o.team} · {o.place}</span></p>)}
            </>
          )}
        </div>
      </section>
    </>
  );
}

type Sector = { k: string; name: string; icon: string; d?: string; tA: string; tH: string; tB: string; uses: { t: string; d: string }[]; sys: string[]; start?: string };
type Spot = { sector: string; title: string; before: string; after: string; checks?: string[]; result?: string };

/** /solutions/:sector — one industry: what agents do there, a before-and-after example, and stories. */
export function SectorPage() {
  const { sector = '' } = useParams();
  const cms = useCms();
  const sectors = cms<Sector[]>('solutions.sectors', D['solutions.sectors'] as Sector[]);
  const x = sectors.find((v) => slugify(v.k) === sector);
  if (!x) return <NotFound what="industry" back="/solutions#explorer" backLabel="See all industries" />;
  const spot = cms<Spot[]>('solutions.spotlights', D['solutions.spotlights'] as Spot[]).find((v) => v.sector === x.k);
  const stories = cms<Story[]>('customers.stories', D['customers.stories'] as Story[])
    .filter((v) => v.ind === x.k || x.name.toLowerCase().includes(v.ind.toLowerCase()));
  const card = { padding: 20, borderRadius: 16, border: '1px solid #E3E8F5', background: '#FFFFFF' } as const;
  return (
    <>
      <section className="hz-hero">
        <div className="ds-container" style={{ maxWidth: 960, paddingBottom: 'clamp(44px, 6vw, 76px)' }}>
          <p className="hint" style={{ margin: 0 }}><Link to="/solutions#explorer" style={{ color: '#C9D4FF' }}>← All industries</Link></p>
          <p className="ab-kicker" style={{ marginTop: 18 }}><Icon d={x.icon} size={18} />{x.name}</p>
          <h1 className="pf-h1">{x.tA}<span className="ds-gradtext">{x.tH}</span>{x.tB}</h1>
          <div className="ds-actions" style={{ marginTop: 20 }}><Link className="ds-btn ds-btn-grad" to={`/contact?process=${encodeURIComponent(x.start || x.uses[0]?.t || x.k)}`}>Book a demo <Icon d={I.arrow} size={18} stroke={2.4} /></Link></div>
        </div>
      </section>
      <section className="ds-paper ds-section">
        <div className="ds-container" style={{ maxWidth: 960, display: 'grid', gap: 32 }}>
          <div>
            <h2 className="ds-h2" style={{ marginBottom: 14 }}>What agents do in {x.k.toLowerCase() === 'public sector' ? 'the public sector' : x.k.toLowerCase()}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
              {x.uses.map((u) => <div key={u.t} style={card}><b style={{ display: 'block', marginBottom: 6 }}>{u.t}</b><span className="ds-muted">{u.d}</span></div>)}
            </div>
            {x.start && <p className="ds-muted" style={{ marginTop: 14 }}>Most teams start with <b>{x.start}</b>.</p>}
          </div>
          {spot && (
            <div>
              <h2 className="ds-h2" style={{ marginBottom: 14 }}>{spot.title}</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
                <div style={{ ...card, background: '#F7F8FC' }}><small style={{ fontWeight: 700, letterSpacing: '.06em' }}>BEFORE</small><p style={{ margin: '6px 0 0' }}>{spot.before}</p></div>
                <div style={{ ...card, borderColor: '#C9B8FF' }}><small style={{ fontWeight: 700, letterSpacing: '.06em', color: '#6D4AD8' }}>WITH AN AGENT</small><p style={{ margin: '6px 0 0' }}>{spot.after}</p></div>
              </div>
              {spot.result && <p style={{ marginTop: 12, fontWeight: 600 }}>{spot.result}</p>}
            </div>
          )}
          <div>
            <h2 className="ds-h3" style={{ marginBottom: 10 }}>Agents work with</h2>
            <div className="sl-sys" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{x.sys.map((v) => <em key={v}>{v}</em>)}</div>
          </div>
          {stories.length > 0 && (
            <div>
              <h2 className="ds-h3" style={{ marginBottom: 10 }}>Customer stories</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
                {stories.map((m) => <Link key={storySlug(m)} to={`/customers/${storySlug(m)}`} style={{ ...card, textDecoration: 'none', color: 'inherit' }}><b style={{ display: 'block', font: '700 1.6rem/1.1 var(--ooa-display)', color: '#2B54C9' }}>{m.s1}</b><small className="ds-muted">{m.l1}</small><b style={{ display: 'block', marginTop: 8 }}>{m.title}</b></Link>)}
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

type Post = { id?: string; slug?: string; page?: string; kind: string; title: string; summary: string; meta?: string; date?: string; author?: string; cover?: string };
type Ev = { id?: string; slug?: string; title: string; kind: string; date: string; time: string; tz?: string; place: string; summary: string; url: string; cta: string; cover?: string; recording?: string; hasDetails?: boolean };

const longDate = (iso: string) => { const d = new Date(`${iso}T12:00:00Z`); return isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }); };

/** /resources/blog/:post — a blog post written on this site. */
export function PostPage() {
  const { post = '' } = useParams();
  const p = useCms()<Post[]>('resources.insights', []).find((x) => x.slug === post && x.page);
  if (!p || !p.id) return <NotFound what="post" back="/resources/blog" backLabel="See all posts" />;
  return (
    <>
      <section className="hz-hero">
        <div className="ds-container" style={{ maxWidth: 820, paddingBottom: 'clamp(44px, 6vw, 76px)' }}>
          <p className="hint" style={{ margin: 0 }}><Link to="/resources/blog" style={{ color: '#C9D4FF' }}>← Blog</Link></p>
          <p className="ab-kicker" style={{ marginTop: 18 }}>{p.kind}</p>
          <h1 className="pf-h1">{p.title}</h1>
          <p className="cu-lead">{[p.author, p.date ? longDate(p.date) : p.meta].filter(Boolean).join(' · ')}</p>
        </div>
      </section>
      <section className="ds-paper ds-section">
        <div className="ds-container rs-body" style={{ maxWidth: 760 }}>
          {p.cover && <figure className="rs-figure"><img src={p.cover} alt="" /></figure>}
          {p.summary && <p style={{ fontSize: '1.2rem' }}>{p.summary}</p>}
          <ArticleText id={p.id}>{(body) => <ArticleBody text={body} />}</ArticleText>
          <p style={{ marginTop: 32 }}><Link className="ds-btn ds-btn-grad" to="/community">Get product updates</Link></p>
        </div>
      </section>
    </>
  );
}

/** /resources/events/:event — one event: when (in its time zone and the visitor's), where, details, and how to join. */
export function EventPage() {
  const { event = '' } = useParams();
  const e = useCms()<Ev[]>('resources.events', []).find((x) => x.slug === event);
  if (!e || !e.id) return <NotFound what="event" back="/resources/events" backLabel="See all events" />;
  const tz = e.tz || 'Asia/Kolkata';
  const start = eventStart(e.date, e.time, tz);
  const past = start ? start.getTime() < Date.now() - 3 * 3600e3 : (e.date || '9999') < new Date().toISOString().slice(0, 10);
  const fmt = (zone: string) => start ? new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: zone }).format(start) : '';
  const mine = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const sameClock = start && fmt(mine) === fmt(tz);
  return (
    <>
      <section className="hz-hero">
        <div className="ds-container" style={{ maxWidth: 820, paddingBottom: 'clamp(44px, 6vw, 76px)' }}>
          <p className="hint" style={{ margin: 0 }}><Link to="/resources/events" style={{ color: '#C9D4FF' }}>← Events</Link></p>
          <p className="ab-kicker" style={{ marginTop: 18 }}>{e.kind}{past ? ' · Past event' : ''}</p>
          <h1 className="pf-h1">{e.title}</h1>
          <p className="cu-lead">{start ? `${fmt(tz)} ${tzLabel(tz)}` : [longDate(e.date), e.time].filter(Boolean).join(', ')}{e.place ? ` · ${e.place}` : ''}</p>
          {start && !sameClock && <p className="hint" style={{ color: '#C9D4FF' }}>That’s {fmt(mine)} where you are.</p>}
        </div>
      </section>
      <section className="ds-paper ds-section">
        <div className="ds-container rs-body" style={{ maxWidth: 760 }}>
          {e.cover && <figure className="rs-figure"><img src={e.cover} alt="" /></figure>}
          <p style={{ fontSize: '1.2rem' }}>{e.summary}</p>
          {e.hasDetails && <ArticleText id={e.id}>{(body) => <ArticleBody text={body} />}</ArticleText>}
          <div style={{ marginTop: 28 }}>
            {past
              ? (e.recording ? <a className="ds-btn ds-btn-grad" href={e.recording} {...(/^https?:/.test(e.recording) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>Watch the recording</a> : <p className="ds-muted">This event has finished. <Link to="/resources/events">See upcoming events</Link>.</p>)
              : e.url ? <a className="ds-btn ds-btn-grad" href={e.url} {...(/^https?:/.test(e.url) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{e.cta || 'Register'}</a>
              : <EventRegister event={`${e.title}${e.date ? ' (' + e.date + ')' : ''}`} />}
          </div>
        </div>
      </section>
    </>
  );
}

type Gated = { id?: string; slug?: string; download?: string; kind: string; title: string; summary: string; cover?: string };

/** /resources/download/:post — a short form, then the file (each request is a lead in Pipelines → Downloads). */
export function DownloadPage() {
  const { post = '' } = useParams();
  const g = useCms()<Gated[]>('resources.insights', []).find((x) => x.slug === post && x.download);
  const [state, setState] = useState<{ busy: boolean; url: string; error: string }>({ busy: false, url: '', error: '' });
  if (!g) return <NotFound what="download" back="/resources/blog" backLabel="See all resources" />;
  return (
    <>
      <section className="hz-hero">
        <div className="ds-container" style={{ maxWidth: 820, paddingBottom: 'clamp(44px, 6vw, 76px)' }}>
          <p className="hint" style={{ margin: 0 }}><Link to="/resources/blog" style={{ color: '#C9D4FF' }}>← Blog and downloads</Link></p>
          <p className="ab-kicker" style={{ marginTop: 18 }}>Free {g.kind.toLowerCase()}</p>
          <h1 className="pf-h1">{g.title}</h1>
          <p className="cu-lead">{g.summary}</p>
        </div>
      </section>
      <section className="ds-paper ds-section">
        <div className="ds-container" style={{ maxWidth: 620 }}>
          {g.cover && <figure className="rs-figure" style={{ margin: '0 0 20px' }}><img src={g.cover} alt="" style={{ maxWidth: '100%', borderRadius: 12 }} /></figure>}
          {state.url ? (
            <div className="rs-helpful" role="status" style={{ display: 'grid', gap: 12 }}>
              <b>Thank you. Your download is ready.</b>
              <a className="ds-btn ds-btn-grad" href={state.url} target="_blank" rel="noopener noreferrer" download>Download {g.kind.toLowerCase()}</a>
            </div>
          ) : (
            <form className="rs-helpful" style={{ display: 'grid', gap: 10 }} onSubmit={async (e) => {
              e.preventDefault();
              const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
              setState({ busy: true, url: '', error: '' });
              try {
                const r = await fetch('/api/leads/download', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dn: f.dn, de: f.de, dc: f.dc ?? '', dfile: post }) });
                const j = (await r.json().catch(() => ({}))) as { url?: string; error?: string; fields?: Record<string, string> };
                if (r.ok && j.url) { setState({ busy: false, url: j.url, error: '' }); window.open(j.url, '_blank', 'noopener'); }
                else setState({ busy: false, url: '', error: j.error || Object.values(j.fields ?? {})[0] || 'Something went wrong. Please try again.' });
              } catch { setState({ busy: false, url: '', error: 'We couldn’t reach the server. Please try again.' }); }
            }}>
              <b>Get the {g.kind.toLowerCase()}</b>
              <label>Name<input name="dn" required maxLength={120} autoComplete="name" /></label>
              <label>Work email<input name="de" type="email" required maxLength={200} autoComplete="email" /></label>
              <label>Company (optional)<input name="dc" maxLength={120} autoComplete="organization" /></label>
              {state.error && <p className="fm-err" role="alert" style={{ margin: 0 }}>{state.error}</p>}
              <button className="ds-btn ds-btn-grad" type="submit" disabled={state.busy}>{state.busy ? 'Sending…' : 'Download'}</button>
              <small className="ds-muted">We’ll only use your details to send you this and related resources. See our <Link to="/privacy">privacy policy</Link>.</small>
            </form>
          )}
        </div>
      </section>
    </>
  );
}

type Trust = { heroA: string; heroB: string; heroText: string; items: { icon: string; title: string; text: string }[]; certs: { name: string; status: string; note?: string }[]; reportTitle: string; reportText: string; securityEmail: string; endTitle: string; endText: string };

/** /trust — how the platform keeps data and credentials safe, certifications (only when added), and how to report an issue. */
export function TrustPage() {
  const t = { ...(D['page.trust'] as Trust), ...useCms()<Partial<Trust>>('page.trust', {}) };
  const card = { padding: 22, borderRadius: 18, border: '1px solid #E3E8F5', background: '#FFFFFF' } as const;
  return (
    <>
      <section className="hz-hero">
        <div className="ds-container" style={{ maxWidth: 960, paddingBottom: 'clamp(44px, 6vw, 76px)' }}>
          <h1 className="pf-h1">{t.heroA} <span className="ds-gradtext">{t.heroB}</span></h1>
          <p className="cu-lead">{t.heroText}</p>
        </div>
      </section>
      <section className="ds-paper ds-section">
        <div className="ds-container" style={{ maxWidth: 960, display: 'grid', gap: 32 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            {t.items.map((x) => (
              <div key={x.title} style={card}>
                <span style={{ width: 42, height: 42, borderRadius: 12, display: 'grid', placeItems: 'center', background: '#EEF1FA', color: '#3B2E8C', marginBottom: 10 }}><Icon d={iconPath(x.icon) === iconPath('grid') && x.icon && x.icon.length > 20 ? x.icon : iconPath(x.icon)} size={22} /></span>
                <b style={{ display: 'block', marginBottom: 6 }}>{x.title}</b><span className="ds-muted">{x.text}</span>
              </div>
            ))}
          </div>
          {t.certs.length > 0 && (
            <div>
              <h2 className="ds-h2" style={{ marginBottom: 12 }}>Certifications and audits</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                {t.certs.map((c) => <div key={c.name} style={card}><b>{c.name}</b><p className="ds-muted" style={{ margin: '6px 0 0' }}>{c.status === 'certified' ? 'Certified' : 'In progress'}{c.note ? ` · ${c.note}` : ''}</p></div>)}
              </div>
            </div>
          )}
          <div style={{ ...card, background: '#F4F6FD', border: 0 }}>
            <h2 className="ds-h3" style={{ marginTop: 0 }}>{t.reportTitle}</h2>
            <p style={{ margin: '0 0 10px' }}>{t.reportText}</p>
            <a className="ds-btn ds-btn-line" href={`mailto:${t.securityEmail}?subject=${encodeURIComponent('Security report')}`}>{t.securityEmail}</a>
          </div>
        </div>
      </section>
      <section className="ds-paper" style={{ paddingBottom: 'var(--ds-section-y)' }}>
        <div className="ds-container"><div className="hz-final"><Rings />
          <h2 className="ds-h2" style={{ position: 'relative' }}>{t.endTitle}</h2>
          <p className="ds-lead" style={{ position: 'relative' }}>{t.endText}</p>
          <div className="ds-actions" style={{ position: 'relative', justifyContent: 'center' }}><Link className="ds-btn ds-btn-white" to="/contact">Book a call <Icon d={I.arrow} size={18} stroke={2.4} /></Link></div>
        </div></div>
      </section>
    </>
  );
}

/** /resources/webinars — upcoming webinars and recordings to watch on demand. */
export function WebinarsPage() {
  const events = useCms()<Ev[]>('resources.events', D['resources.events'] as Ev[]);
  const today = new Date().toISOString().slice(0, 10);
  const isWebinar = (e: Ev) => /webinar|online|live/i.test(`${e.kind} ${e.place}`);
  const upcoming = events.filter((e) => isWebinar(e) && (e.date || '9999') >= today).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const onDemand = events.filter((e) => e.recording && (e.date || '') < today).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const card = { padding: 18, borderRadius: 16, border: '1px solid #E3E8F5', background: '#FFFFFF', textDecoration: 'none', color: 'inherit', display: 'grid', gap: 6 } as const;
  const Item = ({ e, past }: { e: Ev; past?: boolean }) => (
    <Link to={e.slug ? `/resources/events/${e.slug}` : '/resources/events'} style={card}>
      <small className="ds-muted">{e.kind}{e.date ? ` · ${longDate(e.date)}` : ''}</small>
      <b>{e.title}</b><span style={{ fontSize: '.95rem' }}>{e.summary}</span>
      <span style={{ color: '#6D4AD8', fontWeight: 600 }}>{past ? 'Watch the recording →' : 'See details and register →'}</span>
    </Link>
  );
  return (
    <>
      <section className="hz-hero">
        <div className="ds-container" style={{ maxWidth: 960, paddingBottom: 'clamp(44px, 6vw, 76px)' }}>
          <p className="hint" style={{ margin: 0 }}><Link to="/resources/events" style={{ color: '#C9D4FF' }}>← All events</Link></p>
          <h1 className="pf-h1" style={{ marginTop: 18 }}>Webinars</h1>
          <p className="cu-lead">Join a live session, or watch past ones whenever suits you.</p>
        </div>
      </section>
      <section className="ds-paper ds-section">
        <div className="ds-container" style={{ maxWidth: 960, display: 'grid', gap: 28 }}>
          <div>
            <h2 className="ds-h2" style={{ marginBottom: 12 }}>Upcoming</h2>
            {upcoming.length ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>{upcoming.map((e) => <Item key={e.title + e.date} e={e} />)}</div> : <p className="ds-muted">No webinars scheduled right now. <Link to="/community">Get product updates</Link> to hear about the next one.</p>}
          </div>
          <div>
            <h2 className="ds-h2" style={{ marginBottom: 12 }}>On demand</h2>
            {onDemand.length ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>{onDemand.map((e) => <Item key={e.title + e.date} e={e} past />)}</div> : <p className="ds-muted">Recordings of past sessions will appear here.</p>}
          </div>
        </div>
      </section>
    </>
  );
}
