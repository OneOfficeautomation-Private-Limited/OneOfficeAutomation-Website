/**
 * Which admin page (src/admin/siteMap.ts) each website address belongs to. Kept tiny so the website can use it
 * for the "Edit this page" button without loading the admin.
 */
export const SITE_PAGES: [id: string, paths: RegExp][] = [
  ['home', /^\/$/],
  ['platform', /^\/platform/],
  ['solutions', /^\/solutions/],
  ['customers', /^\/customers/],
  ['pricing', /^\/pricing/],
  ['resources', /^\/(resources|community)/],
  ['partners', /^\/partners/],
  ['company', /^\/(about|contact|trust)/],
  ['careers', /^\/careers/],
  ['legal', /^\/(privacy|terms)/],
];
/** The admin page id for a website address, or null (for example sign-in pages). */
export const sitePageFor = (pathname: string) => SITE_PAGES.find(([, re]) => re.test(pathname))?.[0] ?? null;
