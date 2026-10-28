import { Link } from 'react-router-dom';
import { c } from '../theme';
import { useCategories, useProducts, useSite } from '../cms/CmsContext';

const SOCIALS = [
  { name: 'LinkedIn', key: 'linkedin' as const, svg: (<><path d="M4.98 3.5a2.5 2.5 0 11-.02 5 2.5 2.5 0 01.02-5zM3 9.75h4V21H3zM9.5 9.75H13v1.6h.05c.5-.95 1.7-1.95 3.5-1.95 3.75 0 4.45 2.45 4.45 5.65V21h-4v-5.1c0-1.2 0-2.8-1.7-2.8s-1.95 1.3-1.95 2.7V21h-4z" fill="currentColor" /></>) },
  { name: 'Facebook', key: 'facebook' as const, svg: (<><path d="M13.5 21v-8h2.7l.5-3.2h-3.2V7.9c0-.9.4-1.7 1.8-1.7h1.5V3.4c-.3 0-1.2-.1-2.2-.1-2.6 0-4.3 1.6-4.3 4.4v2.1H7v3.2h2.8v8z" fill="currentColor" /></>) },
  { name: 'Instagram', key: 'instagram' as const, svg: (<><rect x="3.5" y="3.5" width="17" height="17" rx="5" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="17.2" cy="6.8" r="1.2" fill="currentColor" /></>) },
  { name: 'YouTube', key: 'youtube' as const, svg: (<><path d="M21.6 7.2a2.5 2.5 0 00-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 002.4 7.2C2 8.8 2 12 2 12s0 3.2.4 4.8a2.5 2.5 0 001.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 001.8-1.8c.4-1.6.4-4.8.4-4.8s0-3.2-.4-4.8z" fill="currentColor" /><path d="M10 15V9l5.2 3z" fill="#172048" /></>) },
];

const PLATFORM = [
  ['One Agent Studio', '/platform#build'],
  ['One Runner', '/platform#run'],
  ['One Command Center', '/platform#govern'],
  ['AI agents and One Workflow', '/platform#orchestrate'],
];
const SOLUTIONS = [
  ['By industry', '/solutions#explorer'],
  ['Cross-industry processes', '/solutions#cross'],
  ['Customers', '/customers'],
  ['Pricing', '/pricing'],
];
const COMPANY = [
  ['About', '/about'],
  ['Careers', '/careers'],
  ['Partners', '/partners'],
  ['Contact', '/contact'],
];

function Column({ title, links }: { title: string; links: string[][] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
      <span className="ooa-fhead">{title}</span>
      {links.map(([label, to]) => (
        <Link key={label + to} className="ooa-fl" to={to}>
          {label}
        </Link>
      ))}
    </div>
  );
}

function Card({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div className="ooa-fcard">
      <span aria-hidden="true" className="ooa-ficon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: icon }} />
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
        <span className="ooa-fhead">{title}</span>
        {children}
      </div>
    </div>
  );
}

const Row = ({ label, href, text }: { label: string; href: string; text: string }) => (
  <div className="ooa-frow">
    <span className="ooa-flabel">{label}</span>
    <a className="ooa-fl" href={href}>
      {text}
    </a>
  </div>
);

export default function Footer() {
  const site = useSite();
  const categories = useCategories();
  const products = useProducts();
  const resources = [['All resources', '/resources'], ...categories.map((r) => [r.title, `/resources/${r.id}`])];
  const byProduct = products.map((r) => [r.title, `/resources/${r.id}`]);
  const socials = SOCIALS.filter((s) => site[s.key].trim() !== '');
  return (
    <footer style={{ background: c.foot, color: '#DCE3FA' }}>
      <div style={{ height: 3, background: 'linear-gradient(90deg, #2389C4, #6D4AD8, #B08CEE)' }} />
      <div style={{ maxWidth: 1320, margin: '0 auto', padding: '0 28px' }}>
        <div className="ooa-ft-top">
          <div className="ooa-ft-brand">
            <svg width="44" height="44" viewBox="0 0 40 40" aria-hidden="true">
              <defs>
                <linearGradient id="ftA" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#2E97D3" /><stop offset="1" stopColor="#2389C4" /></linearGradient>
                <linearGradient id="ftB" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#B08CEE" /><stop offset="1" stopColor="#A57FE6" /></linearGradient>
              </defs>
              <circle cx="14" cy="20" r="11" fill="none" stroke="url(#ftA)" strokeWidth="4.2" />
              <circle cx="26" cy="20" r="11" fill="none" stroke="url(#ftB)" strokeWidth="4.2" />
            </svg>
            <span style={{ fontFamily: 'Poppins, system-ui, sans-serif', fontWeight: 600, fontSize: 22, color: '#FFFFFF', letterSpacing: '-0.01em' }}>OneOfficeAutomation</span>
            <p style={{ margin: 0, color: '#DCE3FA', maxWidth: 300 }}>{site.footerTagline}</p>
            {socials.length > 0 && (
              <div className="ooa-socials" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {socials.map((s) => (
                  <a key={s.key} className="ooa-soc" href={site[s.key]} target="_blank" rel="noopener noreferrer" aria-label={s.name}>
                    <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true">{s.svg}</svg>
                  </a>
                ))}
              </div>
            )}
          </div>
          <Column title="Platform" links={PLATFORM} />
          <Column title="Solutions" links={SOLUTIONS} />
          <Column title="Resources" links={resources} />
          <Column title="By product" links={byProduct} />
          <Column title="Company" links={COMPANY} />
        </div>
        <div className="ooa-ft-cards">
          <Card icon={`<path d="M12 21s-7-6.2-7-11.5a7 7 0 0114 0C19 14.8 12 21 12 21z"></path><circle cx="12" cy="9.5" r="2.5"></circle>`} title="Registered office">
            <strong style={{ color: '#FFFFFF', fontWeight: 600 }}>{site.legalName}</strong>
            <span>{site.address}</span>
            <span className="ooa-chipf">CIN {site.cin}</span>
          </Card>
          <Card icon={`<circle cx="12" cy="12" r="9"></circle><path d="M3 12h18"></path><path d="M12 3a14 14 0 010 18"></path><path d="M12 3a14 14 0 000 18"></path>`} title="Offices">
            <Row label="India" href={`tel:${site.telIndia}`} text={site.phoneIndia} />
            <Row label="Doha, Qatar" href={`tel:${site.telQatar}`} text={site.phoneQatar} />
          </Card>
          <Card icon={`<rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="M3 7l9 6 9-6"></path>`} title="Write to us">
            <Row label="Sales" href={`mailto:${site.salesEmail}`} text={site.salesEmail} />
            <Row label="Support" href={`mailto:${site.supportEmail}`} text={site.supportEmail} />
          </Card>
        </div>
        <div className="ooa-ft-bottom">
          <span>© 2026 {site.legalName}. All rights reserved.</span>
          <span style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <Link className="ooa-fl" style={{ display: 'inline' }} to="/privacy">Privacy policy</Link>
            <Link className="ooa-fl" style={{ display: 'inline' }} to="/terms">Terms of service</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
