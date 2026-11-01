/**
 * Page titles, descriptions and share images, edited in /admin → SEO.
 * Plain data and functions (no React), so the server can write the tags into each page before sending it
 * (that is what search engines and link previews read) and the browser can update them while visitors navigate.
 */
export type SeoSite = { siteName: string; titleSuffix: string; description: string; image: string; twitter: string };
export type SeoPage = { path: string; title: string; description: string; image: string; noindex: boolean };
export type SeoMeta = { title: string; description: string; image: string; noindex: boolean; path: string };

type Named = { id: string; title: string; desc?: string };
/** An article summary as the site receives it. */
/** Customer stories and job roles, for their own pages. */
export type DetailRefs = { toolkits?: { id: string; name: string; description?: string; actions: number }[]; posts?: { slug: string; title: string; summary?: string; page?: string; cover?: string; download?: string; kind?: string }[]; events?: { slug: string; title: string; summary?: string; cover?: string }[]; sectors?: { slug: string; name: string; summary: string }[]; stories?: { slug: string; title: string; does?: string; co?: string }[]; roles?: { id: string; title: string; about?: string; team?: string; place?: string }[] };
export type ArticleRef = { id: string; title: string; summary?: string; product?: string; access?: string; category?: string };

/** Pages that should never appear in search results (accounts, forms reached from emails, the admin). */
const PRIVATE_PREFIXES = ['/admin', '/account', '/partner', '/forgot', '/reset', '/verify', '/unsubscribe', '/application/', '/signin', '/signup'];

const clean = (p: string) => (p.replace(/[?#].*$/, '').replace(/\/+$/, '') || '/');

/** Works out the title, description and share image for an address. */
export function seoFor(pathname: string, site: SeoSite, pages: SeoPage[], products: Named[] = [], categories: Named[] = [], articles: ArticleRef[] = [], details: DetailRefs = {}): SeoMeta {
  const path = clean(pathname);
  const full = (t: string) => (t.includes(site.siteName) ? t : `${t}${site.titleSuffix}`);
  const exact = pages.find((p) => clean(p.path) === path);
  const privatePage = PRIVATE_PREFIXES.some((x) => path === x.replace(/\/$/, '') || path.startsWith(x.endsWith('/') ? x : `${x}/`));
  if (exact) {
    return { title: full(exact.title), description: exact.description || site.description, image: exact.image || site.image, noindex: exact.noindex || privatePage, path };
  }
  // A customer story: /customers/<story>, and a job role: /careers/<role>.
  const st = path.match(/^\/customers\/([^/]+)$/);
  if (st) {
    const s = (details.stories ?? []).find((x) => x.slug === st[1]);
    if (s) return { title: full(`${s.title} – Customer story`), description: (s.does || site.description).slice(0, 300), image: site.image, noindex: false, path };
  }
  const po = path.match(/^\/resources\/blog\/([^/]+)$/);
  if (po) {
    const s = (details.posts ?? []).find((x) => x.slug === po[1] && x.page);
    if (s) return { title: full(s.title), description: (s.summary || site.description).slice(0, 300), image: s.cover || site.image, noindex: false, path };
  }
  // The catalogue isn't part of the page data, so the browser (details.toolkits undefined) keeps these pages indexable;
  // the server, which has the catalogue, decides precisely.
  if (path === '/resources/toolkits' && (details.toolkits === undefined || details.toolkits.length)) {
    const n = details.toolkits?.length ?? 0, a = (details.toolkits ?? []).reduce((x, t) => x + t.actions, 0);
    return { title: full('Toolkits and actions'), description: n ? `Browse ${n} toolkits and ${a} ready-made actions for building agents, with every input and output explained.` : 'Browse the toolkits and ready-made actions for building agents.', image: site.image, noindex: false, path };
  }
  const tk = path.match(/^\/resources\/toolkits\/([^/]+)$/);
  if (tk && details.toolkits === undefined) return { title: full('Toolkit actions'), description: site.description, image: site.image, noindex: false, path };
  if (tk) {
    const t = (details.toolkits ?? []).find((x) => x.id === tk[1]);
    if (t) return { title: full(`${t.name} actions`), description: (t.description || `${t.actions} ready-made ${t.name} actions for your agents, with inputs and outputs.`).slice(0, 300), image: site.image, noindex: false, path };
  }
  const dl = path.match(/^\/resources\/download\/([^/]+)$/);
  if (dl) {
    const s = (details.posts ?? []).find((x) => x.slug === dl[1] && x.download);
    if (s) return { title: full(`${s.title}${s.kind ? ` – free ${s.kind.toLowerCase()}` : ''}`), description: (s.summary || site.description).slice(0, 300), image: s.cover || site.image, noindex: false, path };
  }
  const ev = path.match(/^\/resources\/events\/([^/]+)$/);
  if (ev) {
    const s = (details.events ?? []).find((x) => x.slug === ev[1]);
    if (s) return { title: full(`${s.title} – Event`), description: (s.summary || site.description).slice(0, 300), image: s.cover || site.image, noindex: false, path };
  }
  const se = path.match(/^\/solutions\/([^/]+)$/);
  if (se) {
    const s = (details.sectors ?? []).find((x) => x.slug === se[1]);
    if (s) return { title: full(`${s.name} automation`), description: s.summary.slice(0, 300), image: site.image, noindex: false, path };
  }
  const ro = path.match(/^\/careers\/([^/]+)$/);
  if (ro) {
    const r = (details.roles ?? []).find((x) => x.id === ro[1]);
    if (r) return { title: full(`${r.title} – Careers`), description: (r.about || `${r.title}${r.team ? `, ${r.team}` : ''}${r.place ? `, ${r.place}` : ''}.`).slice(0, 300), image: site.image, noindex: false, path };
  }
  // One article: /resources/docs/<product>/<article>. Customers-only articles stay out of search results.
  const art = path.match(/^\/resources\/docs\/([^/]+)\/([^/]+)$/);
  if (art) {
    // Troubleshooting articles aren't part of product manuals, so they have no manual address.
    const a = articles.find((x) => x.id === art[2] && x.product === art[1] && x.category !== 'troubleshooting');
    const p = products.find((x) => x.id === art[1]);
    if (a) return { title: full(`${a.title} – ${p?.title ?? 'Documentation'}`), description: a.summary || p?.desc || site.description, image: site.image, noindex: a.access === 'customers', path };
  }
  // Documentation for one product: /resources/docs/<product>
  const doc = path.match(/^\/resources\/docs\/([^/]+)$/);
  if (doc) {
    const p = products.find((x) => x.id === doc[1]);
    if (p) return { title: full(`${p.title} documentation`), description: p.desc || `Guides and reference for ${p.title}.`, image: site.image, noindex: false, path };
  }
  // A Resources category (/resources/<category>) is a filtered view of Documentation, Training or FAQs:
  // a proper title for the browser tab, but kept out of search results so it doesn't compete with its parent page.
  const sec = path.match(/^\/resources\/([^/]+)$/);
  if (sec) {
    const c = categories.find((x) => x.id === sec[1]);
    if (c) return { title: full(c.title), description: c.desc || site.description, image: site.image, noindex: true, path };
  }
  // Anything else: a private page, or an address that doesn't exist (the site shows its 404 page).
  return { title: site.siteName, description: site.description, image: site.image, noindex: true, path };
}

/** Addresses for sitemap.xml: every page that may be indexed, plus each product's documentation. */
export function sitemapPaths(pages: SeoPage[], products: Named[], articles: ArticleRef[] = [], details: DetailRefs = {}): string[] {
  const out = pages.filter((p) => !p.noindex && !PRIVATE_PREFIXES.some((x) => clean(p.path).startsWith(x.replace(/\/$/, '')))).map((p) => clean(p.path));
  for (const p of products) out.push(`/resources/docs/${p.id}`);
  for (const a of articles) if (a.product && a.access !== 'customers' && a.category !== 'troubleshooting' && products.some((p) => p.id === a.product)) out.push(`/resources/docs/${a.product}/${a.id}`);
  if ((details.toolkits ?? []).length) out.push('/resources/toolkits');
  for (const t of details.toolkits ?? []) out.push(`/resources/toolkits/${t.id}`);
  for (const s of details.posts ?? []) { if (s.page) out.push(s.page); if (s.download) out.push(s.download); }
  for (const s of details.events ?? []) out.push(`/resources/events/${s.slug}`);
  for (const s of details.sectors ?? []) out.push(`/solutions/${s.slug}`);
  for (const s of details.stories ?? []) out.push(`/customers/${s.slug}`);
  for (const r of details.roles ?? []) out.push(`/careers/${r.id}`);
  return [...new Set(out)];
}

/** An absolute address for a share image or page, from a site path or a full link. */
export const absolute = (base: string, url: string) => (/^https?:\/\//.test(url) ? url : `${base}${url.startsWith('/') ? '' : '/'}${url}`);
