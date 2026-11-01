import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useCategories, useCms, useProducts } from '../cms/CmsContext';
import { buildMenus } from './navMenus';
import type { Menu, MenuData, MenuLink } from './navMenus';
import CORE from '../cms/core.defaults.json';
import { Go } from '../cms/pageText';
import { ROLE_DEFAULTS } from '../logic/CareersLogic';
import { useResourceData } from '../logic/useResourceData';
import { c } from '../theme';
import { LogoMark } from '../ds/LogoMark';

interface NavItem {
  label: string;
  to: string;
  also?: string[];
}


/** The dropdown stays open while a link inside it has focus, so drop focus after a click. */
const blurActive = () => (document.activeElement as HTMLElement | null)?.blur?.();

export function Logo() {
  return (
    <span className="ooa-brand">
      <LogoMark width={42} />
      <span>OneOfficeAutomation</span>
    </span>
  );
}

const CHEVRON = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>;

function MegaLink({ l }: { l: MenuLink }) {
  return (
    <Link className="mm-link" to={l.to} onClick={blurActive}>
      <span className="mm-ic" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d={l.icon} /></svg></span>
      <span><strong>{l.label}</strong>{l.desc && <small>{l.desc}</small>}</span>
    </Link>
  );
}

function MegaPanel({ menu, label }: { menu: Menu; label: string }) {
  const f = menu.feature;
  return (
    <div className="ooa-dd-panel mm-panel">
      <div className="mm-card" role="group" aria-label={`${label} menu`}>
        <div className="mm-secs">
          {menu.sections.map((sec) => (
            <div key={sec.heading} className="mm-sec" data-cols={sec.cols ?? 1}>
              <span className="mm-h">{sec.heading}</span>
              <div className="mm-links">{sec.links.map((l) => <MegaLink key={l.label + l.to} l={l} />)}</div>
            </div>
          ))}
        </div>
        <Link className="mm-feature" to={f.to} onClick={blurActive}>
          <small>{f.kicker}</small>
          {f.stat && <b className="mm-stat">{f.stat}</b>}
          <strong>{f.title}</strong>
          <span>{f.text}</span>
          <em>{f.cta} <span aria-hidden="true">→</span></em>
        </Link>
      </div>
    </div>
  );
}

export default function Header() {
  const { user } = useAuth();
  const HELP_TYPES = useCategories();
  const PRODUCTS = useProducts();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mOpen, setMOpen] = useState('');
  useEffect(() => { setMenuOpen(false); setMOpen(''); }, [pathname]);
  const cms = useCms();
  const rd = useResourceData();
  // Top menu, dropdowns and buttons come from /admin → Menus and footer.
  const NAV = cms<NavItem[]>('nav.main', CORE['nav.main']);
  const H = { ...CORE['nav.header'], ...cms<Partial<typeof CORE['nav.header']>>('nav.header', {}) };
  const sectors = cms<{ k: string }[] | null>('solutions.sectors', null)?.map((x) => x.k) ?? CORE['nav.industries'].sectors;
  const stories = cms<{ ind: string }[] | null>('customers.stories', null);
  const storyIndustries = stories ? [...new Set(stories.map((x) => x.ind))] : CORE['nav.industries'].stories;
  const MENUS = buildMenus(cms<MenuData[]>('nav.menus', CORE['nav.menus'] as MenuData[]), sectors, storyIndustries, { manuals: String(rd.groups.length) });
  const roleCount = cms<unknown[]>('careers.roles', ROLE_DEFAULTS as unknown[]).length;
  const menuFor = (to: string): Menu | undefined => {
    const m = MENUS[to];
    if (m && to === '/careers' && roleCount > 0) return { ...m, feature: { ...m.feature, stat: String(roleCount), title: roleCount === 1 ? 'open role' : 'open roles', kicker: 'We’re hiring' } };
    return m;
  };

  const isActive = (item: NavItem) => pathname === item.to || pathname.startsWith(`${item.to}/`) || (item.also ?? []).includes(pathname);

  return (
    <header className="ooa-hdr">
      <div className="ooa-hdr-in">
        <Link to="/" aria-label="OneOfficeAutomation home" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <Logo />
        </Link>
        <nav className="ooa-dnav" aria-label="Main">
          {NAV.map((item) =>
            menuFor(item.to) ? (
              <div key={item.to} className="ooa-dd">
                <Link className="ooa-nl" to={item.to} aria-haspopup="true" aria-current={isActive(item) ? 'page' : undefined} style={{ textDecoration: 'none' }}>
                  {item.label}
                  {CHEVRON}
                </Link>
                <MegaPanel menu={menuFor(item.to)!} label={item.label} />
              </div>
            ) : (
              <Link key={item.to} className="ooa-nl" to={item.to} aria-current={isActive(item) ? 'page' : undefined} onClick={blurActive} style={{ textDecoration: 'none' }}>
                {item.label}
              </Link>
            ),
          )}
        </nav>
        <div className="ooa-dsec">
          {user ? (
            <Link to="/account" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', fontWeight: 500, padding: '8px 10px' }}>
              <span aria-hidden="true" style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(140deg, #1F74C9, #6D4AD8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>
                {user.firstName.charAt(0).toUpperCase()}
              </span>
              My account
            </Link>
          ) : (
            <>
              <Go to={H.signInLink} className="ooa-hl">{H.signIn}</Go>
              <Go to={H.tryLink} className="ooa-hb ooa-hb-ghost">{H.tryLabel}</Go>
            </>
          )}
          <Go to={H.demoLink} className="ooa-hb ooa-hb-main">{H.demoLabel}</Go>
        </div>
        <button
          type="button"
          className="ooa-mnav"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          onClick={() => setMenuOpen((o) => !o)}
          
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
          {menuOpen ? 'Close' : 'Menu'}
        </button>
        {menuOpen && (
          <nav id="mobile-menu" aria-label="Mobile" style={{ width: '100%', padding: '8px 0 16px' }}>
            {NAV.map((item) => {
              const m = menuFor(item.to);
              const groups: { heading: string; links: { label: string; to: string }[] }[] = m ? m.sections.map((sec) => ({ heading: sec.heading, links: sec.links })) : [];
              const open = mOpen === item.to;
              return (
                <div key={item.to} className="mm-acc">
                  <div className="mm-acc-row">
                    <Link to={item.to} aria-current={isActive(item) ? 'page' : undefined}>{item.label}</Link>
                    {groups.length > 0 && (
                      <button type="button" aria-expanded={open} aria-controls={`mm-${item.label}`} aria-label={`${open ? 'Hide' : 'Show'} ${item.label} links`} onClick={() => setMOpen(open ? '' : item.to)}>{CHEVRON}</button>
                    )}
                  </div>
                  {open && (
                    <div id={`mm-${item.label}`} className="mm-acc-body">
                      {groups.map((g) => (
                        <div key={g.heading}>
                          <span>{g.heading}</span>
                          {g.links.map((l) => <Link key={l.label + l.to} to={l.to} onClick={() => setMenuOpen(false)}>{l.label}</Link>)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, paddingTop: 16 }}>
              {user ? (
                <Link to="/account" style={{ flex: '1 1 140px', textAlign: 'center', textDecoration: 'none', fontWeight: 600, padding: 13, borderRadius: 10, border: '1.5px solid #8FB8FF' }}>My account</Link>
              ) : (
                <>
                  <Go to={H.signInLink} style={{ flex: '1 1 140px', textAlign: 'center', textDecoration: 'none', fontWeight: 600, padding: 13, borderRadius: 10, border: '1.5px solid #8FB8FF' }}>{H.signIn}</Go>
                  <Go to={H.tryLink} style={{ flex: '1 1 140px', textAlign: 'center', textDecoration: 'none', fontWeight: 600, padding: 13, borderRadius: 10, background: '#FFFFFF', color: c.cardText }}>{H.tryLabel}</Go>
                </>
              )}
              <Go to={H.demoLink} style={{ flex: '1 1 100%', textAlign: 'center', textDecoration: 'none', fontWeight: 600, padding: 14, borderRadius: 10, background: 'linear-gradient(135deg, #1F74C9, #6D4AD8)', color: '#FFFFFF' }}>{H.demoLabel}</Go>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
