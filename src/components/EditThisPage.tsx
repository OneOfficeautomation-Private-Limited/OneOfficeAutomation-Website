import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { sitePageFor } from '../cms/sitePages';

/**
 * For team members signed in to the admin: a small button that opens this page's overview in the admin,
 * listing every part of the page they can edit. Visitors never see it (and never trigger the check).
 */
export default function EditThisPage() {
  const { pathname } = useLocation();
  const [team, setTeam] = useState(false);
  useEffect(() => {
    let hint = false;
    try { hint = localStorage.getItem('ooa-team') === '1'; } catch { /* storage off */ }
    if (!hint) return;
    fetch('/api/admin/me', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { admin?: { role?: string } } | null) => setTeam(!!j?.admin && ['admin', 'editor', 'viewer'].includes(j.admin.role ?? '')))
      .catch(() => undefined);
  }, []);
  const page = sitePageFor(pathname);
  if (!team || !page) return null;
  return (
    <a className="edit-this" href={`/admin/pages/${page}`} title="See and edit every part of this page in the admin">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" /></svg>
      Edit this page
    </a>
  );
}
