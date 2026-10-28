import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { GROUPS, SECTIONS } from '../cms/registry';
import { admin } from './api';
import { useAdmin } from './AdminContext';

interface MenuGroup { id: string; label: string; items: { to: string; label: string }[]; match: (path: string) => boolean }

const NARROW = '(max-width: 900px)';
const FLY_LEFT = 278;

/** The admin's left menu: short main items; a main item with several options opens them in a panel on the right. */
export default function Shell() {
  const { me, loading, logout } = useAdmin();
  const location = useLocation();
  const [menu, setMenu] = useState(false);
  const [fresh, setFresh] = useState(0);
  const [narrow, setNarrow] = useState(() => window.matchMedia(NARROW).matches);
  const [openId, setOpenId] = useState('');
  const [pinned, setPinned] = useState(false);
  const [top, setTop] = useState(80);
  const closeTimer = useRef(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttons = useRef<Record<string, HTMLButtonElement | null>>({});
  const focusFirst = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia(NARROW);
    const on = () => setNarrow(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  useEffect(() => { setMenu(false); setOpenId(''); setPinned(false); }, [location.pathname]);
  useEffect(() => {
    if (!me) return;
    admin.dashboard().then((d) => setFresh(d.leads.filter((l) => l.status === 'new').reduce((a, l) => a + l.n, 0))).catch(() => undefined);
  }, [me, location.pathname]);

  const groups: MenuGroup[] = [
    ...GROUPS.map((g) => ({
      id: g,
      label: g === 'Site' ? 'Site settings' : g,
      items: SECTIONS.filter((s) => s.group === g).map((s) => ({ to: `/admin/content/${s.key}`, label: s.label })),
      match: (path: string) => SECTIONS.some((s) => s.group === g && path === `/admin/content/${s.key}`),
    })),
    {
      id: 'Accounts', label: 'Accounts',
      items: [{ to: '/admin/customers', label: 'Customers' }, ...(me?.role === 'admin' ? [{ to: '/admin/team', label: 'Team' }] : []), { to: '/admin/account', label: 'My account' }],
      match: (path: string) => ['/admin/customers', '/admin/team', '/admin/account'].includes(path),
    },
  ];

  const cancelClose = useCallback(() => window.clearTimeout(closeTimer.current), []);
  const scheduleClose = useCallback(() => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => { setOpenId(''); setPinned(false); }, 200);
  }, []);
  const open = (id: string, pin: boolean) => {
    cancelClose();
    const el = buttons.current[id];
    if (el) setTop(Math.max(72, Math.min(el.getBoundingClientRect().top - 8, window.innerHeight - 160)));
    setOpenId(id);
    if (pin) setPinned(true);
  };
  const close = (returnFocus: boolean) => {
    const id = openId;
    setOpenId(''); setPinned(false);
    if (returnFocus && id) buttons.current[id]?.focus();
  };

  // click outside closes a pinned panel
  useEffect(() => {
    if (!openId || !pinned) return;
    const away = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || Object.values(buttons.current).some((b) => b?.contains(t))) return;
      setOpenId(''); setPinned(false);
    };
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, [openId, pinned]);
  // keyboard: focus the first option when the panel was opened with the keyboard
  useLayoutEffect(() => {
    if (openId && focusFirst.current) { panelRef.current?.querySelector<HTMLElement>('a')?.focus(); focusFirst.current = false; }
  }, [openId]);

  if (loading) return <div className="adm" style={{ padding: 40 }}>Loading…</div>;
  if (!me) return <Navigate to="/admin/login" replace />;

  const cls = ({ isActive }: { isActive: boolean }) => (isActive ? 'on' : undefined);
  const current = groups.find((g) => g.id === openId);

  const onButtonKey = (e: React.KeyboardEvent, g: MenuGroup) => {
    if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') {
      if (narrow) return; // on phones the button simply expands in place
      e.preventDefault(); focusFirst.current = true; open(g.id, true);
    } else if (e.key === 'Escape') close(true);
  };
  const onPanelKey = (e: React.KeyboardEvent) => {
    const links = Array.from(panelRef.current?.querySelectorAll<HTMLElement>('a') ?? []);
    const i = links.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); links[(i + 1) % links.length]?.focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); links[(i - 1 + links.length) % links.length]?.focus(); }
    else if (e.key === 'Escape' || e.key === 'ArrowLeft') { e.preventDefault(); close(true); }
  };

  return (
    <div className="adm">
      <header style={{ height: 64, background: '#1F2A5C', color: '#fff', display: 'flex', alignItems: 'center', gap: 12, padding: '0 clamp(14px, 3vw, 28px)', position: 'sticky', top: 0, zIndex: 20 }}>
        <button type="button" className="btn small adm-menu-btn" aria-expanded={menu} onClick={() => setMenu((m) => !m)} style={{ background: 'transparent', color: '#fff', borderColor: '#5A6CB8', alignItems: 'center' }}>{menu ? 'Close' : 'Menu'}</button>
        <Link to="/admin" style={{ color: '#fff', textDecoration: 'none', fontFamily: 'Poppins, system-ui, sans-serif', fontWeight: 600, fontSize: 17, whiteSpace: 'nowrap' }}>OneOffice<span className="adm-wide">Automation</span> <span style={{ opacity: 0.7, fontWeight: 500 }}>admin</span></Link>
        <span style={{ flex: 1 }} />
        <a href="/" target="_blank" rel="noopener noreferrer" className="adm-wide" style={{ color: '#fff', fontSize: 14, whiteSpace: 'nowrap' }}>View website ↗</a>
        <span style={{ fontSize: 14, opacity: 0.85 }} className="adm-wide">{me.name}</span>
        <button type="button" className="btn small" onClick={() => void logout()} style={{ background: 'transparent', color: '#fff', borderColor: '#5A6CB8' }}>Sign out</button>
      </header>
      <div className="adm-shell">
        <nav className={`adm-nav${menu ? ' open' : ''}`} aria-label="Admin">
          <NavLink to="/admin" end className={cls}>Dashboard</NavLink>
          <NavLink to="/admin/inbox" className={cls}>Inbox {fresh > 0 && <span className="badge custom">{fresh} new</span>}</NavLink>
          <div className="grp">Website content</div>
          {groups.map((g) => {
            if (g.items.length === 1) return <NavLink key={g.id} to={g.items[0].to} className={cls}>{g.label}</NavLink>;
            const isOpen = openId === g.id;
            const active = g.match(location.pathname);
            return (
              <div key={g.id} onMouseEnter={() => { if (!narrow) open(g.id, false); }} onMouseLeave={() => { if (!narrow && !pinned) scheduleClose(); }}>
                <button
                  type="button"
                  ref={(el) => { buttons.current[g.id] = el; }}
                  className={`adm-gbtn${active ? ' on-group' : ''}`}
                  aria-haspopup="true"
                  aria-expanded={isOpen}
                  onClick={() => (isOpen && (narrow || pinned) ? close(false) : open(g.id, true))}
                  onKeyDown={(e) => onButtonKey(e, g)}
                >
                  <span>{g.label}</span>
                  <span aria-hidden="true" style={{ transform: narrow && isOpen ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}>›</span>
                </button>
                {narrow && isOpen && (
                  <div className="adm-sub-inline">
                    {g.items.map((it) => <NavLink key={it.to} to={it.to} className={cls}>{it.label}</NavLink>)}
                  </div>
                )}
              </div>
            );
          })}
          <a href="/" target="_blank" rel="noopener noreferrer" style={{ marginTop: 10 }}>View website ↗</a>
        </nav>
        <main className="adm-main" id="admin-main"><Outlet /></main>
      </div>
      {!narrow && current && (
        <div
          ref={panelRef}
          className="adm-fly"
          role="menu"
          aria-label={current.label}
          style={{ top, left: FLY_LEFT }}
          onMouseEnter={cancelClose}
          onMouseLeave={() => { if (!pinned) scheduleClose(); }}
          onKeyDown={onPanelKey}
        >
          <div className="grp" style={{ paddingTop: 6 }}>{current.label}</div>
          {current.items.map((it) => <NavLink key={it.to} to={it.to} role="menuitem" className={cls}>{it.label}</NavLink>)}
        </div>
      )}
    </div>
  );
}
