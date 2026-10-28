import { Link } from 'react-router-dom';
import { useCms, useSite } from '../cms/CmsContext';
import type { Section } from '../legal';

const NAVY = '#1B2350';
const MUTE = '#4A5175';
const LINE = '#DDE3F3';
const BLUE = '#1F74C9';
const PURP = '#6D4AD8';
const H = 'Poppins, system-ui, sans-serif';

interface Props {
  title: string;
  lead: string;
  icon: string;
  docKey: 'legal.privacy' | 'legal.terms';
  fallback: { updated: string; sections: Section[] };
  other: { to: string; label: string };
}

export default function LegalPage({ title, lead, icon, docKey, fallback, other }: Props) {
  const site = useSite();
  const doc = useCms()(docKey, fallback);
  const sections = doc.sections;
  /** Fills {tokens} in the legal text from the company details. */
  const values: Record<string, string> = { legalName: site.legalName, cin: site.cin, address: site.address, website: site.website, supportEmail: site.supportEmail, salesEmail: site.salesEmail, phoneIndia: site.phoneIndia, phoneQatar: site.phoneQatar };
  const fill = (text: string) => text.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? '');
  return (
    <>
      <section style={{ color: '#FFFFFF' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '72px 28px 64px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <span style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.12)', padding: '6px 14px', borderRadius: 999, fontSize: 14, fontWeight: 600 }}>Legal</span>
          <h1 style={{ margin: 0, fontFamily: H, fontWeight: 600, fontSize: 'clamp(2.4rem, 4.6vw, 3.8rem)', lineHeight: 1.05, letterSpacing: '-0.035em', display: 'flex', alignItems: 'center', gap: 14 }}>
            <span aria-hidden="true" style={{ flex: 'none', width: 44, height: 44, borderRadius: 11, background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d={icon} /></svg>
            </span>
            {title}
          </h1>
          <p style={{ margin: 0, fontSize: 19, color: '#DCE3FA', maxWidth: 620 }}>{lead}</p>
          <span style={{ color: '#DCE3FA', fontSize: 15 }}>{site.legalName} · Last updated {doc.updated}</span>
        </div>
      </section>
      <section style={{ background: '#FFFFFF', color: NAVY }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '56px 28px 88px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '40px 56px', alignItems: 'start' }}>
          <nav className="ooa-hide-t" aria-label="On this page" style={{ position: 'sticky', top: 24, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontWeight: 600, marginBottom: 8 }}>On this page</span>
            {sections.map((s, i) => (
              <a key={s.heading} href={`#s${i + 1}`} style={{ display: 'block', padding: '7px 0 7px 14px', borderLeft: `2px solid ${LINE}`, color: MUTE, textDecoration: 'none', fontSize: 15 }}>
                {i + 1}. {s.heading}
              </a>
            ))}
          </nav>
          <article className="ooa-span2" style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
            {sections.map((s, i) => (
              <section key={s.heading} id={`s${i + 1}`} style={{ padding: '28px 0', borderTop: `1px dashed ${LINE}` }}>
                <h2 style={{ margin: '0 0 12px', fontFamily: H, fontWeight: 600, fontSize: 'clamp(1.35rem, 2.2vw, 1.7rem)', letterSpacing: '-0.015em', display: 'flex', gap: 12, alignItems: 'baseline' }}>
                  <span style={{ color: i % 2 === 0 ? BLUE : PURP, fontSize: '0.8em' }}>{String(i + 1).padStart(2, '0')}</span>
                  {s.heading}
                </h2>
                {s.kind === 'p' ? (
                  s.items.map((t) => <p key={t} style={{ margin: '0 0 14px', color: MUTE, fontSize: 17 }}>{fill(t)}</p>)
                ) : (
                  <ul style={{ margin: '0 0 14px', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {s.items.map((t) => (
                      <li key={t} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', color: MUTE, fontSize: 17 }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={i % 2 === 0 ? BLUE : PURP} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: 'none', marginTop: 3 }}><path d="M5 12l4 4 10-10" /></svg>
                        <span>{fill(t)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
            <div style={{ marginTop: 12, padding: 22, borderRadius: 20, background: '#F4F6FC', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 14 }}>
              <span style={{ fontWeight: 600 }}>Questions? Email <a href={`mailto:${site.supportEmail}`} style={{ color: PURP }}>{site.supportEmail}</a></span>
              <Link to={other.to} style={{ color: PURP, fontWeight: 600 }}>{other.label} →</Link>
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
