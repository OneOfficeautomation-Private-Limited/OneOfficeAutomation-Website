import { Link } from 'react-router-dom';
import { useCms, useSite } from '../cms/CmsContext';
import CORE from '../cms/core.defaults.json';
import { Go } from '../cms/pageText';
import { LogoMark } from '../ds/LogoMark';

/* Social icons. Each shows only when its link is filled in under /admin → Site → Company details, contacts and social links. */
const SOCIALS = [
  { name: 'LinkedIn', key: 'linkedin' as const, svg: <path d="M4.98 3.5a2.5 2.5 0 11-.02 5 2.5 2.5 0 01.02-5zM3 9.75h4V21H3zM9.5 9.75H13v1.6h.05c.5-.95 1.7-1.95 3.5-1.95 3.75 0 4.45 2.45 4.45 5.65V21h-4v-5.1c0-1.2 0-2.8-1.7-2.8s-1.95 1.3-1.95 2.7V21h-4z" fill="currentColor" /> },
  { name: 'X', key: 'x' as const, svg: <path d="M17.8 3h3.1l-6.8 7.8L22 21h-6.3l-4.9-6.4L5.2 21H2.1l7.3-8.3L1.8 3h6.4l4.4 5.9zm-1.1 16.2h1.7L7.4 4.7H5.6z" fill="currentColor" /> },
  { name: 'Facebook', key: 'facebook' as const, svg: <path d="M13.5 21v-8h2.7l.5-3.2h-3.2V7.9c0-.9.4-1.7 1.8-1.7h1.5V3.4c-.3 0-1.2-.1-2.2-.1-2.6 0-4.3 1.6-4.3 4.4v2.1H7v3.2h2.8v8z" fill="currentColor" /> },
  { name: 'Instagram', key: 'instagram' as const, svg: <><rect x="3.5" y="3.5" width="17" height="17" rx="5" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="17.2" cy="6.8" r="1.2" fill="currentColor" /></> },
  { name: 'YouTube', key: 'youtube' as const, svg: <><path d="M21.6 7.2a2.5 2.5 0 00-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 002.4 7.2C2 8.8 2 12 2 12s0 3.2.4 4.8a2.5 2.5 0 001.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 001.8-1.8c.4-1.6.4-4.8.4-4.8s0-3.2-.4-4.8z" fill="currentColor" /><path d="M10 15V9l5.2 3z" fill="#0F1533" /></> },
  { name: 'WhatsApp', key: 'whatsapp' as const, svg: <path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm0 18.2a8.2 8.2 0 01-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1112 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 01-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 00-.7.3 3 3 0 00-.9 2.2 5.2 5.2 0 001.1 2.8 11.9 11.9 0 004.6 4c1.7.7 2.4.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2l-.6-.3z" fill="currentColor" /> },
];


function Column({ title, links }: { title: string; links: { label: string; to: string }[] }) {
  return (
    <nav className="ft-col" aria-label={title}>
      <h2>{title}</h2>
      <ul>{links.map(({ label, to }) => <li key={label + to}><Go to={to}>{label}</Go></li>)}</ul>
    </nav>
  );
}

const ic = (d: string) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;

export default function Footer() {
  const site = useSite() as ReturnType<typeof useSite> & { x?: string; whatsapp?: string };
  // Columns, buttons and legal links come from /admin → Menus and footer → Footer.
  const F = { ...CORE['nav.footer'], ...useCms()<Partial<typeof CORE['nav.footer']>>('nav.footer', {}) };
  const socials = SOCIALS.filter((s) => String((site as Record<string, unknown>)[s.key] ?? '').trim() !== '');
  const year = new Date().getFullYear();

  return (
    <footer className="ft">
      <div className="ft-in">
        <div className="ft-top">
          <div className="ft-brand">
            <Link to="/" className="ft-logo" aria-label="OneOfficeAutomation home">
              <LogoMark width={40} />
              <span>OneOfficeAutomation</span>
            </Link>
            <p>{site.footerTagline}</p>
            <div className="ft-cta">
              <Go to={F.btn1Link} className="ft-btn ft-btn-main">{F.btn1}</Go>
              <Go to={F.btn2Link} className="ft-btn">{F.btn2}</Go>
            </div>
            {socials.length > 0 && (
              <div className="ft-social" aria-label="Follow us">
                {socials.map((s) => (
                  <a key={s.key} href={String((site as Record<string, unknown>)[s.key])} target="_blank" rel="noopener noreferrer" aria-label={s.name} title={s.name}>
                    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">{s.svg}</svg>
                  </a>
                ))}
              </div>
            )}
          </div>
          <div className="ft-cols">
            {F.columns.map((col) => <Column key={col.title} title={col.title} links={col.links} />)}
          </div>
        </div>

        <div className="ft-contact">
          <div>
            <span className="ft-ic">{ic('M12 21s-7-6.2-7-11.5a7 7 0 0114 0C19 14.8 12 21 12 21zM12 12a2.5 2.5 0 100-5 2.5 2.5 0 000 5z')}</span>
            <div><small>Registered office</small><p>{site.address}</p></div>
          </div>
          <div>
            <span className="ft-ic">{ic('M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2')}</span>
            <div><small>Call us</small><p>{site.offices.filter((o) => o.phone).map((o, i) => <span key={o.country + i}>{i > 0 && <br />}<a href={`tel:${site.tel(o.phone)}`}>{o.country} {o.phone}</a></span>)}</p></div>
          </div>
          <div>
            <span className="ft-ic">{ic('M3 6h18v12H3zM3 7l9 6 9-6')}</span>
            <div><small>Write to us</small><p>{[...new Set(site.offices.flatMap((o) => [o.salesEmail, o.supportEmail]).filter(Boolean))].map((e, i) => <span key={e}>{i > 0 && <br />}<a href={`mailto:${e}`}>{e}</a></span>)}</p></div>
          </div>
        </div>

        <div className="ft-bottom">
          <p>© {year} {site.legalName}. All rights reserved. <span>CIN {site.cin}</span></p>
          <nav aria-label="Legal">
            <Link to="/privacy">{F.privacy}</Link>
            <Link to="/terms">{F.terms}</Link>
            <a href="#top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>{F.backToTop}</a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
