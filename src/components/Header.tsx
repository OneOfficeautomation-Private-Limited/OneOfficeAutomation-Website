import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useCategories, useProducts } from '../cms/CmsContext';
import { c } from '../theme';

interface NavItem {
  label: string;
  to: string;
  also?: string[];
}

const NAV: NavItem[] = [
  { label: 'Platform', to: '/platform' },
  { label: 'Solutions', to: '/solutions' },
  { label: 'Customers', to: '/customers' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'Resources', to: '/resources' },
  { label: 'Partners', to: '/partners' },
  { label: 'Company', to: '/about' },
  { label: 'Careers', to: '/careers' },
];

/** The dropdown stays open while a link inside it has focus, so drop focus after a click. */
const blurActive = () => (document.activeElement as HTMLElement | null)?.blur?.();

export function Logo() {
  return (
    <svg width="78" height="46" viewBox="0 0 172 102" role="img" aria-label="OneOfficeAutomation"><circle cx="64" cy="38" r="31" fill="none" stroke="#2E97D3" strokeWidth="7" /><circle cx="108" cy="38" r="31" fill="none" stroke="#B08CEE" strokeWidth="7" /><path d="M89.7 55.3 A31 31 0 0 1 81.3 63.7" fill="none" stroke="#2E97D3" strokeWidth="7" /><text x="86" y="99" textAnchor="middle" fontFamily="Quicksand, system-ui, sans-serif" fontSize="25" fontWeight="500" fill="#FFFFFF" textLength="166" lengthAdjust="spacingAndGlyphs">AUTOMATION</text></svg>
  );
}

export default function Header() {
  const { user } = useAuth();
  const HELP_TYPES = useCategories();
  const PRODUCTS = useProducts();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => setMenuOpen(false), [pathname]);

  const isActive = (item: NavItem) => pathname === item.to || pathname.startsWith(`${item.to}/`) || (item.also ?? []).includes(pathname);

  return (
    <header style={{ background: c.bg, borderBottom: `1px solid ${c.line}` }}>
      <div style={{ position: 'relative', maxWidth: 1320, margin: '0 auto', padding: '14px 28px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px 28px' }}>
        <Link to="/" aria-label="OneOfficeAutomation home" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <Logo />
        </Link>
        <nav className="ooa-dnav" aria-label="Main" style={{ display: 'flex', flexWrap: 'wrap', fontSize: 15, fontWeight: 500 }}>
          {NAV.map((item) =>
            item.to === '/resources' ? (
              <div key={item.to} className="ooa-dd">
                <Link className="ooa-nl" to={item.to} aria-haspopup="true" aria-current={isActive(item) ? 'page' : undefined} style={{ textDecoration: 'none' }}>
                  {item.label}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
                </Link>
                <div className="ooa-dd-panel">
                  <div className="ooa-dd-card">
                    {[['By what you need', HELP_TYPES], ['By product', PRODUCTS]].map(([heading, group]) => (
                      <div key={heading as string} className="ooa-dd-sec">
                        <span className="ooa-dd-h">{heading as string}</span>
                        {(group as typeof HELP_TYPES).map((r) => (
                          <Link key={r.id} className="ooa-dd-item" to={`/resources/${r.id}`} onClick={blurActive}>
                            <span aria-hidden="true" style={{ flex: 'none', width: 34, height: 34, borderRadius: 10, background: r.col, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={r.icon} /></svg>
                            </span>
                            <span><strong>{r.title}</strong></span>
                          </Link>
                        ))}
                      </div>
                    ))}
                    <Link className="ooa-dd-all" to="/resources" onClick={blurActive}>
                      <span>View all resources</span>
                      <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <Link key={item.to} className="ooa-nl" to={item.to} aria-current={isActive(item) ? 'page' : undefined} onClick={blurActive} style={{ textDecoration: 'none' }}>
                {item.label}
              </Link>
            ),
          )}
        </nav>
        <div className="ooa-dsec" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {user ? (
            <Link to="/account" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', fontWeight: 500, padding: '8px 10px' }}>
              <span aria-hidden="true" style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(140deg, #1F74C9, #6D4AD8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>
                {user.firstName.charAt(0).toUpperCase()}
              </span>
              My account
            </Link>
          ) : (
            <>
              <Link to="/signin" style={{ textDecoration: 'none', fontWeight: 500, padding: '12px 8px' }}>Sign in</Link>
              <Link to="/signup" style={{ color: '#FFFFFF', textDecoration: 'none', fontWeight: 600, padding: '10px 14px', borderRadius: 10, border: '1.5px solid #8FB8FF' }}>Try it free</Link>
            </>
          )}
          <Link to="/contact" style={{ background: c.acc, color: '#FFFFFF', textDecoration: 'none', fontWeight: 600, padding: '11px 16px', borderRadius: 10 }}>Book a demo</Link>
        </div>
        <button
          type="button"
          className="ooa-mnav"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          onClick={() => setMenuOpen((o) => !o)}
          style={{ alignItems: 'center', gap: 8, minHeight: 44, padding: '0 14px', borderRadius: 10, border: '1.5px solid #8FB8FF', background: 'transparent', color: '#FFFFFF', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
          {menuOpen ? 'Close' : 'Menu'}
        </button>
        {menuOpen && (
          <nav id="mobile-menu" aria-label="Mobile" style={{ width: '100%', padding: '8px 0 16px' }}>
            {NAV.map((item) =>
              item.to === '/resources' ? (
                <div key={item.to}>
                  <Link to={item.to} style={{ display: 'block', padding: '14px 4px', textDecoration: 'none', fontSize: 17, fontWeight: 500 }}>{item.label}</Link>
                  <div style={{ display: 'flex', flexDirection: 'column', padding: '2px 0 8px 14px', marginLeft: 4, borderLeft: `2px solid ${c.line2}`, borderBottom: `1px solid ${c.band}` }}>
                    {[['By what you need', HELP_TYPES], ['By product', PRODUCTS]].map(([heading, group]) => (
                      <div key={heading as string}>
                        <span style={{ display: 'block', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8FB8FF', padding: '10px 8px 2px' }}>{heading as string}</span>
                        {(group as typeof HELP_TYPES).map((r) => (
                          <Link key={r.id} to={`/resources/${r.id}`} style={{ display: 'block', padding: '9px 8px', textDecoration: 'none', fontSize: 15, color: c.mute }}>{r.title}</Link>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <Link key={item.to} to={item.to} style={{ display: 'block', padding: '14px 4px', textDecoration: 'none', fontSize: 17, fontWeight: 500, borderBottom: `1px solid ${c.band}` }}>
                  {item.label}
                </Link>
              ),
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, paddingTop: 16 }}>
              {user ? (
                <Link to="/account" style={{ flex: '1 1 140px', textAlign: 'center', textDecoration: 'none', fontWeight: 600, padding: 13, borderRadius: 10, border: '1.5px solid #8FB8FF' }}>My account</Link>
              ) : (
                <>
                  <Link to="/signin" style={{ flex: '1 1 140px', textAlign: 'center', textDecoration: 'none', fontWeight: 600, padding: 13, borderRadius: 10, border: '1.5px solid #8FB8FF' }}>Sign in</Link>
                  <Link to="/signup" style={{ flex: '1 1 140px', textAlign: 'center', textDecoration: 'none', fontWeight: 600, padding: 13, borderRadius: 10, background: '#FFFFFF', color: c.cardText }}>Try it free</Link>
                </>
              )}
              <Link to="/contact" style={{ flex: '1 1 100%', textAlign: 'center', textDecoration: 'none', fontWeight: 600, padding: 14, borderRadius: 10, background: c.acc, color: '#FFFFFF' }}>Book a demo</Link>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
