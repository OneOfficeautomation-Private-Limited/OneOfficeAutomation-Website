import { Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AnnouncementBar from './AnnouncementBar';
import Header from './Header';
import Footer from './Footer';
import CookieBanner from './CookieBanner';
import { c } from '../theme';
import { useCmsReady } from '../cms/CmsContext';

const TITLES: Record<string, string> = {
  '/': 'OneOfficeAutomation – Intelligent automation solutions',
  '/platform': 'Platform | OneOfficeAutomation',
  '/solutions': 'Solutions | OneOfficeAutomation',
  '/customers': 'Customers | OneOfficeAutomation',
  '/pricing': 'Pricing | OneOfficeAutomation',
  '/resources': 'Resources | OneOfficeAutomation',
  '/partners': 'Partners | OneOfficeAutomation',
  '/about': 'About | OneOfficeAutomation',
  '/careers': 'Careers | OneOfficeAutomation',
  '/contact': 'Book a demo | OneOfficeAutomation',
  '/privacy': 'Privacy policy | OneOfficeAutomation',
  '/terms': 'Terms of service | OneOfficeAutomation',
  '/signup': 'Create your account | OneOfficeAutomation',
  '/signin': 'Sign in | OneOfficeAutomation',
  '/account': 'My account | OneOfficeAutomation',
};

/** Scrolls to the top on page change, or to the #section in the URL (waiting for the page to load). */
function useScrollManagement() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    document.title = TITLES[pathname] ?? 'OneOfficeAutomation';
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
    </div>
  );
}
