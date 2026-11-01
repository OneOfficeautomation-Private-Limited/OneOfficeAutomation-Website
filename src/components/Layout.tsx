import { Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AnnouncementBar from './AnnouncementBar';
import Header from './Header';
import Footer from './Footer';
import CookieBanner from './CookieBanner';
import Analytics from './Analytics';
import { c } from '../theme';
import { useCategories, useCms, useCmsReady, useProducts } from '../cms/CmsContext';
import CORE from '../cms/core.defaults.json';
import { seoFor } from '../cms/seo';
import { slugify, storySlug } from '../cms/slug';

import DEFAULTS from '../cms/defaults.generated.json';
import type { ArticleRef, SeoPage, SeoSite } from '../cms/seo';
import EditThisPage from './EditThisPage';

/** This address's title, description and indexing rule, from /admin → SEO (same rules the server uses). */
function usePageMeta(pathname: string) {
  const cms = useCms();
  const site = { ...CORE['seo.site'], ...cms<Partial<SeoSite>>('seo.site', {}) } as SeoSite;
  const pages = cms<SeoPage[]>('seo.pages', CORE['seo.pages'] as SeoPage[]);
  const stories = cms<{ slug?: string; title: string; does?: string }[]>('customers.stories', DEFAULTS['customers.stories']).map((s) => ({ ...s, slug: storySlug(s) }));
  const roles = cms<{ id: string; title: string; about?: string }[]>('careers.roles', DEFAULTS['careers.roles']);
  const sectors = cms<{ k: string; name: string; tA: string; tH: string; tB: string }[]>('solutions.sectors', DEFAULTS['solutions.sectors']).map((s) => ({ slug: slugify(s.k), name: s.name, summary: `${s.tA}${s.tH}${s.tB}` }));
  const posts = cms<{ slug: string; title: string; summary?: string; page?: string }[]>('resources.insights', []).filter((p) => p.slug);
  const events = cms<{ slug: string; title: string; summary?: string }[]>('resources.events', []).filter((e) => e.slug);
  return seoFor(pathname, site, pages, useProducts(), useCategories(), cms<ArticleRef[]>('resources.items', []), { posts, events, sectors, stories, roles });
}

/** Sets (or removes, when empty) a <meta> tag in the page head. */
function setMeta(attr: 'name' | 'property', key: string, value: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!value) { el?.remove(); return; }
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el); }
  el.setAttribute('content', value);
}

/** Scrolls to the top on page change, or to the #section in the URL (waiting for the page to load). */
function useScrollManagement() {
  const { pathname, hash } = useLocation();
  const meta = usePageMeta(pathname);
  useEffect(() => {
    // The server writes these tags for the first page; keep them right as visitors move between pages.
    document.title = meta.title;
    setMeta('name', 'description', meta.description);
    setMeta('property', 'og:title', meta.title);
    setMeta('property', 'og:description', meta.description);
    setMeta('name', 'robots', meta.noindex ? 'noindex, follow' : '');
  }, [meta.title, meta.description, meta.noindex]);
  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      return;
    }
    const id = decodeURIComponent(hash.slice(1));
    let tries = 0;
    let timer = 0;
    const seek = () => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView();
      else if (tries++ < 40) timer = window.setTimeout(seek, 50);
      else window.scrollTo(0, 0);
    };
    seek();
    return () => window.clearTimeout(timer);
  }, [pathname, hash]);
}

export default function Layout() {
  useScrollManagement();
  if (!useCmsReady()) return <div style={{ minHeight: '100vh', background: c.bg }} aria-busy="true" />;
  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#FFFFFF', background: c.bg, lineHeight: 1.55, fontSize: 16, minHeight: '100vh' }}>
      <a href="#main" style={{ position: 'absolute', left: -9999, top: 8, background: '#FFFFFF', color: c.cardText, padding: '10px 16px', borderRadius: 8, zIndex: 100 }} onFocus={(e) => (e.currentTarget.style.left = '8px')} onBlur={(e) => (e.currentTarget.style.left = '-9999px')}>
        Skip to content
      </a>
      <AnnouncementBar />
      <Header />
      <main id="main">
        <Suspense fallback={<div style={{ minHeight: '60vh' }} aria-busy="true" />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <CookieBanner />
      <Analytics />
      <EditThisPage />
    </div>
  );
}
