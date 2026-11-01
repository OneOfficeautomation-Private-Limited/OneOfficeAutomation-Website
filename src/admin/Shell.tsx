import { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { GROUPS, SECTIONS } from '../cms/registry';
import { admin } from './api';
import { useAdmin } from './AdminContext';
import { KIND_LABEL, canSee } from './wf';
import { iconPath } from '../cms/icons';
import { SITE_MAP, itemTo, locate } from './siteMap';
import { LogoMark } from '../ds/LogoMark';

type Item = { to: string; label: string; count?: number; caption?: string };
interface MenuGroup { id: string; label: string; icon: string; items: Item[]; match: (path: string) => boolean }

const Ico = ({ name }: { name: string }) => (
  <svg className="adm-ico" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={iconPath(name)} /></svg>
);

/** The admin's left menu: sections with icons; groups open in place, with their options indented beneath them. */
export default function Shell() {
  const { me, loading, logout } = useAdmin();
  const location = useLocation();
  const [menu, setMenu] = useState(false);
  const [counts, setCounts] = useState({ partners: 0, deals: 0, requests: 0, drafts: 0 });
  const [openIds, setOpenIds] = useState<string[]>([]);

  useEffect(() => { setMenu(false); }, [location.pathname]);
  useEffect(() => {
    if (!me) return;
    admin.dashboard().then((d) => setCounts(d.approvals)).catch(() => undefined);
  }, [me, location.pathname]);

  const role = me?.role;
  const work: MenuGroup = {
    id: 'pipelines', label: 'Pipelines', icon: 'flow',
    items: (['demo', 'download', 'partner', 'career', 'newsletter'] as const).filter((k) => canSee(role, k)).map((k) => ({ to: `/admin/pipeline/${k}`, label: KIND_LABEL[k], count: k === 'partner' ? counts.partners : undefined })),
    match: (path: string) => path.startsWith('/admin/pipeline') || path.startsWith('/admin/records'),
  };
  // Website content follows the website itself: one group per page, in the order of the site's top menu,
  // each page's parts listed top to bottom (src/admin/siteMap.ts).
  const content: MenuGroup[] = canSee(role, 'content') ? SITE_MAP.map((pg) => {
    const items: Item[] = [{ to: `/admin/pages/${pg.id}`, label: 'Overview of this page' }, ...pg.items.map((it) => ({ to: itemTo(it), label: it.label, caption: it.caption }))];
    return { id: `page-${pg.id}`, label: pg.label, icon: pg.icon, items, match: (path: string) => path === `/admin/pages/${pg.id}` || locate(path, location.search)?.page.id === pg.id };
  }) : [];
  const accounts: MenuGroup = {
    id: 'accounts', label: 'Team and settings', icon: 'users',
    items: [...(role === 'admin' ? [{ to: '/admin/team', label: 'Team' }, { to: '/admin/activity', label: 'Activity log' }] : []), ...(role === 'admin' || role === 'viewer' ? [{ to: '/admin/emails', label: 'Emails sent' }] : []), ...(role === 'admin' ? [{ to: '/admin/settings', label: 'Settings' }] : []), { to: '/admin/account', label: 'My account' }],
    match: (path: string) => ['/admin/team', '/admin/account', '/admin/activity', '/admin/emails', '/admin/settings'].includes(path),
  };
  const all = [work, ...content, accounts];
  // The group holding the current page is always open.
  const activeId = all.find((g) => g.match(location.pathname))?.id;
  const isOpen = (id: string) => openIds.includes(id) || id === activeId;
  const toggle = (id: string) => setOpenIds((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));

  if (loading) return <div className="adm" style={{ padding: 40 }}>Loading…</div>;
  if (!me) return <Navigate to="/admin/login" replace />;

  const cls = ({ isActive }: { isActive: boolean }) => (isActive ? 'on' : undefined);
  /** Whether a menu link is the current page; library shortcuts differ only by ?type=, so compare that too. */
  const isHere = (to: string) => (to.includes('?') ? `${location.pathname}${location.search}` === to : location.pathname === to && (to !== '/admin/library' || !location.search));
  const Badge = ({ n }: { n?: number }) => (n ? <span className="adm-count" aria-label={`${n} waiting`}>{n}</span> : null);
  const renderGroup = (g: MenuGroup) => {
    if (g.items.length === 1) return <NavLink key={g.id} to={g.items[0].to} className={cls}><Ico name={g.icon} /><span>{g.label}</span></NavLink>;
    const open = isOpen(g.id);
    const total = g.items.reduce((n, it) => n + (it.count ?? 0), 0);
    return (
      <div key={g.id} className={`adm-group${open ? ' open' : ''}${g.id === activeId ? ' current' : ''}`}>
        <button type="button" className="adm-gbtn" aria-expanded={open} aria-controls={`grp-${g.id}`} onClick={() => toggle(g.id)} disabled={g.id === activeId && open}>
          <Ico name={g.icon} /><span>{g.label}</span>{!open && <Badge n={total} />}
          <svg className="adm-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
        </button>
        {open && (
          <div className="adm-sub" id={`grp-${g.id}`}>
            {g.items.map((it) => (
              <div key={it.to}>
                {it.caption && <div className="adm-cap">{it.caption}</div>}
                <Link to={it.to} className={isHere(it.to) ? 'on' : undefined} aria-current={isHere(it.to) ? 'page' : undefined}><span>{it.label}</span><Badge n={it.count} /></Link>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="adm">
      <header style={{ height: 64, background: '#1F2A5C', color: '#fff', display: 'flex', alignItems: 'center', gap: 12, padding: '0 clamp(14px, 3vw, 28px)', position: 'sticky', top: 0, zIndex: 20 }}>
        <button type="button" className="btn small adm-menu-btn" aria-expanded={menu} onClick={() => setMenu((m) => !m)} style={{ background: 'transparent', color: '#fff', borderColor: '#5A6CB8', alignItems: 'center' }}>{menu ? 'Close' : 'Menu'}</button>
        <Link to="/admin" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, color: '#fff', textDecoration: 'none', fontFamily: 'Poppins, system-ui, sans-serif', fontWeight: 600, fontSize: 17, whiteSpace: 'nowrap' }}><LogoMark width={34} /><span>OneOffice<span className="adm-wide">Automation</span> <span style={{ opacity: 0.7, fontWeight: 500 }}>admin</span></span></Link>
        <span style={{ flex: 1 }} />
        <a href="/" target="_blank" rel="noopener noreferrer" className="adm-wide" style={{ color: '#fff', fontSize: 14, whiteSpace: 'nowrap' }}>View website ↗</a>
        <span style={{ fontSize: 14, opacity: 0.85 }} className="adm-wide">{me.name}</span>
        <button type="button" className="btn small" onClick={() => void logout()} style={{ background: 'transparent', color: '#fff', borderColor: '#5A6CB8' }}>Sign out</button>
      </header>
      <div className="adm-shell">
        <nav className={`adm-nav${menu ? ' open' : ''}`} aria-label="Admin">
          <NavLink to="/admin" end className={cls}><Ico name="grid" /><span>Dashboard</span></NavLink>
          {counts.partners + counts.deals + counts.requests + counts.drafts > 0 && <NavLink to="/admin" end className="wf-waiting">{counts.partners + counts.deals + counts.requests + counts.drafts} waiting for a decision</NavLink>}
          <div className="grp">Work</div>
          {work.items.length > 0 && renderGroup(work)}
          {canSee(role, 'partners') && <NavLink to="/admin/partners" className={cls}><Ico name="heartHand" /><span>Partners</span></NavLink>}
          {canSee(role, 'deals') && <NavLink to="/admin/deals" className={cls}><Ico name="tag" /><span>Deal registrations</span><Badge n={counts.deals} /></NavLink>}
          {canSee(role, 'requests') && <NavLink to="/admin/requests" className={cls}><Ico name="send" /><span>Requests</span><Badge n={counts.requests} /></NavLink>}
          {canSee(role, 'customers') && <NavLink to="/admin/customers" className={cls}><Ico name="users" /><span>Customers</span></NavLink>}
          {content.length > 0 && <div className="grp">Website content</div>}
          {content.map((g) => renderGroup(g))}
          <div className="grp">Admin</div>
          {renderGroup(accounts)}
          <a href="/" target="_blank" rel="noopener noreferrer" className="adm-out"><Ico name="overview" /><span>View website</span><span aria-hidden="true">↗</span></a>
        </nav>
        <main className="adm-main" id="admin-main"><Outlet /></main>
      </div>
    </div>
  );
}
