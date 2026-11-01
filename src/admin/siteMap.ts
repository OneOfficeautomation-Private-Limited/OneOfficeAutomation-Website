/**
 * The website, page by page, as the admin shows it. One list drives the admin menu, each page's overview screen
 * and the "Edit this page" button on the website, so admin and website always match.
 * Pages follow the website's top menu; each page's parts are listed top to bottom as visitors see them.
 * Any editable section not listed here still appears, under "Other", so nothing can go missing.
 */
import { SECTIONS } from '../cms/registry';

export type MapItem = { label: string; key?: string; to?: string; caption?: string; hint?: string };
export type MapPage = { id: string; label: string; icon: string; path: string; intro: string; items: MapItem[] };

const lib = (type: string) => `/admin/library?type=${type}`;

export const SITE_MAP: MapPage[] = [
  { id: 'every', label: 'Every page', icon: 'grid', path: '/', intro: 'Parts shown on every page: the top bar, menus, footer and company details, plus images and settings for search engines and analytics.', items: [
    { caption: 'Top of every page', label: 'Top menu', key: 'nav.main' },
    { label: 'Dropdown menus', key: 'nav.menus' },
    { label: 'Header buttons (Sign in, Try it free, Book a demo)', key: 'nav.header' },
    { caption: 'Bottom of every page', label: 'Footer links and buttons', key: 'nav.footer' },
    { label: 'Company details: offices, contacts, social links, announcement bar', key: 'site.settings' },
    { caption: 'Behind the scenes', label: 'Images and PDFs (media library)', to: '/admin/media' },
    { label: 'Page titles and descriptions (Google)', key: 'seo.pages' },
    { label: 'Search engine defaults', key: 'seo.site' },
    { label: 'Redirects', key: 'site.redirects' },
    { label: 'Website analytics', key: 'site.analytics' },
  ] },
  { id: 'home', label: 'Home', icon: 'overview', path: '/', intro: 'The home page, from the headline at the top to the closing banner.', items: [
    { label: 'Headline, search, buttons and banners', key: 'page.home' },
    { label: '“Welcome to OneOfficeAutomation” tabs', key: 'home.tabs' },
    { label: '“Follow one invoice” steps', key: 'home.steps' },
    { label: 'Other home page text', key: 'home.text' },
  ] },
  { id: 'platform', label: 'Platform', icon: 'flow', path: '/platform', intro: 'The Platform page: the four parts, how they work together, AI and security.', items: [
    { label: 'Headline, buttons and banners', key: 'page.platform' },
    { label: 'Numbers (actions, toolkits…)', key: 'platform.stats' },
    { label: 'The four parts', key: 'platform.parts' },
    { label: 'How the parts work together', key: 'platform.flow' },
    { label: 'AI built in', key: 'platform.ai' },
    { label: 'Security and deployment', key: 'platform.security' },
  ] },
  { id: 'solutions', label: 'Solutions', icon: 'bank', path: '/solutions', intro: 'The Solutions page and one page per industry (built from the industries list).', items: [
    { label: 'Headline, buttons and banners', key: 'page.solutions' },
    { label: 'Industries and use cases (also each industry’s own page)', key: 'solutions.sectors' },
    { label: 'Use case spotlights (before and after)', key: 'solutions.spotlights' },
    { label: 'Processes in every sector', key: 'solutions.cross' },
  ] },
  { id: 'customers', label: 'Customers', icon: 'users', path: '/customers', intro: 'The Customers page and one page per customer story.', items: [
    { label: 'Headline, buttons and banners', key: 'page.customers' },
    { label: 'Customer stories (also each story’s own page)', key: 'customers.stories' },
  ] },
  { id: 'pricing', label: 'Pricing', icon: 'tag', path: '/pricing', intro: 'The Pricing page, top to bottom.', items: [
    { label: 'Headline, buttons and banners', key: 'page.pricing' },
    { label: 'Plans', key: 'pricing.plans' },
    { label: 'Comparison table (also the plans’ feature lists)', key: 'pricing.compare' },
    { label: 'Savings calculator', key: 'resources.calculator' },
    { label: 'Note under the plans', key: 'pricing.text' },
    { label: 'Pricing questions', key: 'pricing.faq' },
  ] },
  { id: 'resources', label: 'Resources', icon: 'book', path: '/resources', intro: 'Everything under Resources on the website, in the same order as its menu. Articles, FAQs, events, blog and training items are kept in the Resources library; the links below open it at the right type.', items: [
    { caption: 'Resources page', label: 'Landing page text', key: 'resources.hub' },
    { label: '“What do you need?” help types', key: 'resources.categories' },
    { label: 'All library items (search everything)', to: '/admin/library' },
    { caption: 'Documentation', label: 'Documentation articles', to: lib('article') },
    { label: 'Product manuals list', key: 'resources.products' },
    { label: 'Troubleshooting entries', to: lib('troubleshoot') },
    { label: 'Release notes (What’s new)', to: lib('release') },
    { label: 'Toolkit catalogue (actions)', to: '/admin/catalog' },
    { caption: 'FAQs', label: 'FAQs', to: lib('faq') },
    { caption: 'Training', label: 'Training items', to: lib('training') },
    { label: 'Learning path levels', key: 'resources.learnpath' },
    { caption: 'Support', label: 'Support options', key: 'resources.support' },
    { caption: 'Events and webinars', label: 'Events and webinars', to: lib('event') },
    { caption: 'Blog and downloads', label: 'Blog posts, e-books and downloads', to: lib('post') },
    { caption: 'Community', label: 'Community invitation link', key: 'community.settings' },
  ] },
  { id: 'partners', label: 'Partners', icon: 'heartHand', path: '/partners', intro: 'The Partners page, top to bottom.', items: [
    { label: 'Headline, buttons and banners', key: 'page.partners' },
    { label: 'Partner benefits', key: 'partners.benefits' },
    { label: 'Partner types', key: 'partners.types' },
    { label: 'Partner levels', key: 'partners.tiers' },
    { label: 'How to become a partner', key: 'partners.process' },
  ] },
  { id: 'company', label: 'Company', icon: 'building', path: '/about', intro: 'About, Contact and Security and trust: the pages under Company in the website menu.', items: [
    { caption: 'About', label: 'Headline, buttons and banners', key: 'page.about' },
    { label: 'Mission and vision', key: 'about.text' },
    { label: 'At a glance', key: 'about.glance' },
    { label: 'What we believe', key: 'about.values' },
    { label: 'Our journey', key: 'about.journey' },
    { label: 'The teams', key: 'about.teams' },
    { caption: 'Contact', label: 'Headline, form choices and contact cards', key: 'page.contact' },
    { label: 'What happens in the demo', key: 'contact.steps' },
    { caption: 'Security and trust', label: 'Security and trust page', key: 'page.trust' },
  ] },
  { id: 'careers', label: 'Careers', icon: 'briefcase', path: '/careers', intro: 'The Careers page and one page per open role.', items: [
    { label: 'Headline, buttons and banners', key: 'page.careers' },
    { label: 'Intro text', key: 'careers.text' },
    { label: 'Why join us', key: 'careers.why' },
    { label: 'Open roles (also each role’s own page)', key: 'careers.roles' },
    { label: 'How we hire', key: 'careers.steps' },
  ] },
  { id: 'legal', label: 'Legal', icon: 'shield', path: '/privacy', intro: 'The legal pages linked from the footer.', items: [
    { label: 'Privacy policy', key: 'legal.privacy' },
    { label: 'Terms of service', key: 'legal.terms' },
  ] },
  { id: 'emails', label: 'Emails', icon: 'mail', path: '/', intro: 'The emails the website sends to visitors, customers, partners, applicants and your team.', items: [
    { label: 'Email messages', key: 'emails.templates' },
  ] },
];

const listed = new Set(SITE_MAP.flatMap((p) => p.items.map((i) => i.key).filter(Boolean)));
const others = SECTIONS.filter((s) => !s.library && !listed.has(s.key));
if (others.length) SITE_MAP.push({ id: 'other', label: 'Other', icon: 'grid', path: '/', intro: 'Editable parts not yet placed on a page in this map.', items: others.map((s) => ({ label: s.label, key: s.key })) });

/** Where an item opens in the admin. */
export const itemTo = (i: MapItem) => i.to ?? `/admin/content/${i.key}`;

/** The page and item an admin address belongs to (for the menu and the breadcrumb). */
export function locate(pathname: string, search = ''): { page: MapPage; item: MapItem } | null {
  const here = pathname + search;
  for (const page of SITE_MAP) for (const item of page.items) {
    const to = itemTo(item);
    if (to === here || (!to.includes('?') && to === pathname)) return { page, item };
  }
  if (pathname.startsWith('/admin/library')) { const page = SITE_MAP.find((p) => p.id === 'resources')!; return { page, item: page.items.find((i) => i.to === '/admin/library')! }; }
  return null;
}
