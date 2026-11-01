// Writes each page's title, description, share-preview tags and structured data into the HTML before it is sent,
// so search engines and link previews (LinkedIn, WhatsApp, X…) see the right text for every page.
// Also builds sitemap.xml and robots.txt. Content comes from /admin → SEO, falling back to the defaults.
import D from '../../src/cms/defaults.generated.json';
import { absolute, seoFor, sitemapPaths } from '../../src/cms/seo';
import type { ArticleRef, DetailRefs, SeoPage, SeoSite } from '../../src/cms/seo';
import { slugify, storySlug } from '../../src/cms/slug';
import { eventStart, isoWithOffset } from '../../src/cms/time';
import { analyticsTools, cspWithTools } from '../../src/cms/analytics';
import type { Env } from './http';
import { DEFAULT_SITE_URL } from './workflow';
import { PRIVATE_KEYS } from '../../src/cms/registry';
import { LIBRARY_KEYS, publicLists } from './library';
import { catalogSummary } from './catalog';
import { siteView } from '../../src/cms/siteSettings';

/**
 * Everything the public site may see: saved sections (never the private ones), with the five Resources lists
 * coming from the library (live items only, article text left out). Used by /api/content and the embedded data.
 */
export async function publicContent(env: Env): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = {};
  const rows = await env.DB.prepare('SELECT `key`, value FROM content').all<{ key: string; value: string }>();
  for (const r of rows.results) if (!PRIVATE_KEYS.has(r.key) && !LIBRARY_KEYS.has(r.key)) out[r.key] = JSON.parse(r.value);
  Object.assign(out, await publicLists(env));
  return out;
}

type Named = { id: string; title: string; desc?: string };
type Data = { toolkits: { id: string; name: string; description?: string; actions: number }[];
   site: SeoSite; pages: SeoPage[]; products: Named[]; categories: Named[]; settings: Record<string, unknown>; publicJson: string; content: Record<string, unknown>; rolesUpdated: string };

let cache: { at: number; data: Data } | null = null;

/** SEO content, cached for 30 seconds so busy pages don't query the database every time. */
async function load(env: Env): Promise<Data> {
  if (cache && Date.now() - cache.at < 30_000) return cache.data;
  const saved: Record<string, unknown> = {};
  let rolesUpdated = '';
  let toolkits: Data['toolkits'] = [];
  try { toolkits = (await catalogSummary(env)).toolkits; } catch { /* catalogue tables not ready */ }
  try {
    // All published content; private sections (invite link, email templates) never leave the server.
    Object.assign(saved, await publicContent(env));
    const r = await env.DB.prepare("SELECT updated_at FROM content WHERE `key` = 'careers.roles'").first<{ updated_at: string }>();
    if (r) rolesUpdated = r.updated_at;
  } catch { /* database not ready: use the defaults */ }
  const pick = <T,>(k: string) => (saved[k] ?? (D as Record<string, unknown>)[k]) as T;
  const data: Data = {
    site: { ...(D['seo.site'] as SeoSite), ...(saved['seo.site'] as Partial<SeoSite> | undefined) },
    pages: pick<SeoPage[]>('seo.pages'),
    products: pick<Named[]>('resources.products'),
    categories: pick<Named[]>('resources.categories'),
    settings: siteView(saved['site.settings'] ?? D['site.settings']) as unknown as Record<string, unknown>,
    // Embedded in every page so the site can show straight away, without waiting for /api/content.
    // "<" is escaped so the content can never close the tag early.
    publicJson: JSON.stringify(saved).replace(/</g, '\\u003c'),
    content: saved,
    toolkits,
    rolesUpdated,
  };
  cache = { at: Date.now(), data };
  return data;
}
/** Forget cached SEO content (called after content is saved in the admin). */
export const clearSeoCache = () => { cache = null; };

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const baseUrl = (env: Env) => (env.SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, '');

/** A real social profile, not a placeholder such as https://www.linkedin.com/ */
const isProfile = (u: unknown) => typeof u === 'string' && /^https?:\/\/[^/]+\/.+/.test(u.trim());

/** Customer stories and roles (saved, or the defaults) for their own pages. */
function details(d: Data): DetailRefs {
  const get = <T,>(k: string) => (d.content[k] ?? (D as Record<string, unknown>)[k] ?? []) as T;
  return {
    toolkits: d.toolkits,
    posts: get<{ slug: string; title: string; summary?: string; page?: string; cover?: string }[]>('resources.insights').filter((p) => p.slug),
    events: get<{ slug: string; title: string; summary?: string; cover?: string }[]>('resources.events').filter((e) => e.slug),
    sectors: get<{ k: string; name: string; tA: string; tH: string; tB: string }[]>('solutions.sectors').map((s) => ({ slug: slugify(s.k), name: s.name, summary: `${s.tA}${s.tH}${s.tB}` })),
    stories: get<{ slug?: string; title: string; does?: string; co?: string }[]>('customers.stories').map((s) => ({ ...s, slug: storySlug(s) })),
    roles: get<{ id: string; title: string; about?: string; team?: string; place?: string }[]>('careers.roles'),
  };
}

/** The page HTML with this address's tags written in. */
export async function renderPage(env: Env, template: string, pathname: string): Promise<string> {
  const d = await load(env);
  const m = seoFor(pathname, d.site, d.pages, d.products, d.categories, (d.content['resources.items'] ?? []) as ArticleRef[], details(d));
  const base = baseUrl(env);
  const url = `${base}${m.path === '/' ? '/' : m.path}`;
  const image = m.image ? absolute(base, m.image) : '';
  const tags = [
    `<link rel="canonical" href="${esc(url)}" />`,
    m.noindex ? '<meta name="robots" content="noindex, follow" />' : '',
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${esc(d.site.siteName)}" />`,
    `<meta property="og:title" content="${esc(m.title)}" />`,
    `<meta property="og:description" content="${esc(m.description)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    image ? `<meta property="og:image" content="${esc(image)}" />` : '',
    `<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}" />`,
    d.site.twitter ? `<meta name="twitter:site" content="${esc(d.site.twitter)}" />` : '',
  ];
  if (m.path === '/') {
    // Company details search engines can show (name, logo, contact, profiles).
    const s = d.settings;
    const org = {
      '@context': 'https://schema.org', '@type': 'Organization',
      name: d.site.siteName, legalName: s.legalName, url: `${base}/`, logo: `${base}/logo.png`,
      email: s.salesEmail,
      address: s.address ? { '@type': 'PostalAddress', streetAddress: s.address, addressCountry: 'IN' } : undefined,
      contactPoint: [
        s.phoneIndia && { '@type': 'ContactPoint', telephone: s.phoneIndia, contactType: 'sales', areaServed: 'IN' },
        s.phoneQatar && { '@type': 'ContactPoint', telephone: s.phoneQatar, contactType: 'sales', areaServed: 'QA' },
      ].filter(Boolean),
      sameAs: ['linkedin', 'facebook', 'instagram', 'youtube', 'x'].map((k) => s[k]).filter(isProfile),
    };
    // "<" is escaped so the JSON can never close the script tag early.
    tags.push(`<script type="application/ld+json">${JSON.stringify(org).replace(/</g, '\\u003c')}</script>`);
  }
  // Job postings (Google job listings) on /careers, and question-and-answer data on FAQ pages.
  const ld = (o: unknown) => tags.push(`<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`);
  const pick = <T,>(k: string) => (d.content[k] ?? (D as Record<string, unknown>)[k]) as T;
  const roleMatch = m.path.match(/^\/careers\/([^/]+)$/);
  if (roleMatch) {
    const roles = pick<Record<string, unknown>[]>('careers.roles').filter((x) => x.id === roleMatch[1]);
    const posted = (d.rolesUpdated || new Date().toISOString()).slice(0, 10);
    for (const r of roles) {
      const place = String(r.place ?? ''); const remote = /remote/i.test(place);
      const country = /qatar|doha/i.test(place) ? 'QA' : 'IN';
      ld({
        '@context': 'https://schema.org', '@type': 'JobPosting', title: r.title,
        datePosted: /^\d{4}-\d{2}-\d{2}$/.test(String(r.posted ?? '')) ? String(r.posted) : posted,
        // Google expects HTML here: the role summary, then what you'll do and what you need as lists.
        description: [
          r.about ? `<p>${esc(String(r.about))}</p>` : '',
          ...([['What you’ll do', r.does], ['What you need', r.needs]] as [string, unknown][]).map(([h, v]) => {
            const items = (Array.isArray(v) ? v : v ? [v] : []).map((x) => `<li>${esc(String(x))}</li>`).join('');
            return items ? `<p><strong>${h}</strong></p><ul>${items}</ul>` : '';
          }),
        ].join(''),
        employmentType: /part/i.test(String(r.type)) ? 'PART_TIME' : /contract/i.test(String(r.type)) ? 'CONTRACTOR' : /intern/i.test(String(r.type)) ? 'INTERN' : 'FULL_TIME',
        hiringOrganization: { '@type': 'Organization', name: d.site.siteName, sameAs: `${base}/`, logo: `${base}/logo.png` },
        jobLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: place.split(/[,/·]/)[0].trim() || place, addressCountry: country } },
        ...(remote ? { jobLocationType: 'TELECOMMUTE', applicantLocationRequirements: { '@type': 'Country', name: country === 'QA' ? 'Qatar' : 'India' } } : {}),
        directApply: true, url: `${base}/careers/${r.id}`,
      });
    }
  }
  // An event page: date, time zone, place and registration for Google's event results.
  const evm = m.path.match(/^\/resources\/events\/([^/]+)$/);
  if (evm) {
    const e = pick<Record<string, string>[]>('resources.events').find((x) => x.slug === evm[1]);
    const start = e ? eventStart(e.date, e.time, e.tz || 'Asia/Kolkata') : null;
    if (e && start) {
      const online = /online|webinar|virtual|zoom|teams/i.test(`${e.place} ${e.kind}`);
      ld({
        '@context': 'https://schema.org', '@type': 'Event', name: e.title, description: e.summary, startDate: isoWithOffset(start, e.tz || 'Asia/Kolkata'),
        eventAttendanceMode: online ? 'https://schema.org/OnlineEventAttendanceMode' : 'https://schema.org/OfflineEventAttendanceMode',
        eventStatus: 'https://schema.org/EventScheduled',
        location: online ? { '@type': 'VirtualLocation', url: `${base}/resources/events/${e.slug}` } : { '@type': 'Place', name: e.place, address: e.place },
        organizer: { '@type': 'Organization', name: d.site.siteName, url: `${base}/` },
        ...(e.cover ? { image: [absolute(base, e.cover)] } : {}),
        url: `${base}/resources/events/${e.slug}`,
      });
    }
  }
  const faqs = m.path === '/resources/faqs' ? pick<{ q: string; a: string }[]>('resources.faqs') : m.path === '/pricing' ? pick<{ q: string; a: string }[]>('pricing.faq') : [];
  if (faqs.length) ld({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) });
  return template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(m.title)}</title>`)
    .replace(/<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${esc(m.description)}" />`)
    .replace('</head>', `    ${tags.filter(Boolean).join('\n    ')}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root"></div>\n    <script type="application/json" id="cms-data">${d.publicJson}</script>`);
}

export async function sitemapXml(env: Env): Promise<string> {
  const d = await load(env);
  const base = baseUrl(env);
  const urls = sitemapPaths(d.pages, d.products, (d.content['resources.items'] ?? []) as ArticleRef[], details(d)).map((p) => `  <url><loc>${esc(`${base}${p === '/' ? '/' : p}`)}</loc></url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

export function robotsTxt(env: Env): string {
  return [
    'User-agent: *',
    'Allow: /',
    // Rules match by prefix, so the partner portal is listed exactly ("/partner$" and "/partner/"), never as "/partner",
    // which would also block the public /partners page.
    ...['/admin', '/api/', '/account', '/partner$', '/partner/', '/application/', '/reset', '/verify', '/unsubscribe', '/forgot'].map((p) => `Disallow: ${p}`),
    '',
    `Sitemap: ${baseUrl(env)}/sitemap.xml`,
    '',
  ].join('\n');
}

/** The redirect for an address, from /admin → SEO → Redirects, or null. */
export async function redirectFor(env: Env, pathname: string): Promise<{ to: string; status: 301 | 302 } | null> {
  const d = await load(env);
  const list = (d.content['site.redirects'] ?? []) as { from: string; to: string; permanent?: boolean }[];
  if (!list.length) return null;
  const norm = (p: string) => (decodeURIComponent(p).replace(/\/+$/, '') || '/').toLowerCase();
  const here = norm(pathname);
  const r = list.find((x) => x.from && x.to && norm(x.from.split(/[?#]/)[0]) === here);
  if (!r || norm(r.to.split(/[?#]/)[0]) === here) return null;
  return { to: r.to, status: r.permanent ? 301 : 302 };
}

/** The page's security policy with the analytics tool's addresses added (only when one is configured). */
export async function pageCsp(env: Env, base: string): Promise<string> {
  const d = await load(env);
  const tools = analyticsTools(d.content['site.analytics']);
  return tools.length ? cspWithTools(base, tools) : base;
}

/** /.well-known/security.txt, from the security contact on the trust page. */
export async function securityTxt(env: Env): Promise<string> {
  const d = await load(env);
  const t = { ...(D['page.trust'] as unknown as Record<string, string>), ...((d.content['page.trust'] ?? {}) as Record<string, string>) };
  const base = baseUrl(env);
  const expires = new Date(Date.now() + 365 * 86400e3).toISOString().replace(/\.\d{3}Z$/, 'Z');
  return [`Contact: mailto:${t.securityEmail}`, `Expires: ${expires}`, 'Preferred-Languages: en', `Canonical: ${base}/.well-known/security.txt`, `Policy: ${base}/trust`, ''].join('\n');
}
