/**
 * Website analytics and advertising tools (/admin → Site settings → Website analytics), shared by the site and the server.
 * Each tool loads only after the visitor accepts the matching cookies ("analytics" or "marketing"), and the page's
 * security policy allows exactly the addresses the chosen tools need.
 */
export type ToolId = 'ga4' | 'gtm' | 'clarity' | 'pagesense' | 'matomo' | 'plausible' | 'umami' | 'fathom' | 'linkedin' | 'meta' | 'googleads' | 'hubspot';
export type ToolEntry = { tool: ToolId; id: string; url: string };
type Sources = { script: string[]; connect: string[]; img: string[]; frame?: string[] };
export type ToolDef = { label: string; consent: 'analytics' | 'marketing'; idLabel: string; idHint: string; pattern: RegExp; needsUrl?: boolean; urlHint?: string; sources: (e: ToolEntry) => Sources; warning?: string };

const host = (u: string) => { try { const x = new URL(u); return x.protocol === 'https:' ? x.origin : ''; } catch { return ''; } };

export const TOOLS: Record<ToolId, ToolDef> = {
  ga4: { label: 'Google Analytics 4', consent: 'analytics', idLabel: 'Measurement ID', idHint: 'For example G-AB12CD34EF.', pattern: /^G-[A-Z0-9]{4,14}$/,
    sources: () => ({ script: ['https://www.googletagmanager.com'], connect: ['https://*.google-analytics.com', 'https://*.analytics.google.com', 'https://www.googletagmanager.com'], img: ['https://*.google-analytics.com', 'https://www.googletagmanager.com'] }) },
  gtm: { label: 'Google Tag Manager', consent: 'analytics', idLabel: 'Container ID', idHint: 'For example GTM-AB12CD3.', pattern: /^GTM-[A-Z0-9]{4,12}$/,
    warning: 'Tag Manager can load other tools you set up inside it. The website allows Google’s own tags; tags from other companies set up in Tag Manager may be blocked. Add those tools here instead where possible.',
    sources: () => ({ script: ['https://www.googletagmanager.com', 'https://tagmanager.google.com'], connect: ['https://*.google-analytics.com', 'https://*.analytics.google.com', 'https://www.googletagmanager.com'], img: ['https://*.google-analytics.com', 'https://www.googletagmanager.com'], frame: ['https://www.googletagmanager.com'] }) },
  clarity: { label: 'Microsoft Clarity', consent: 'analytics', idLabel: 'Project ID', idHint: 'The 10-character ID in Clarity → Settings → Overview.', pattern: /^[a-z0-9]{6,14}$/,
    sources: () => ({ script: ['https://www.clarity.ms', 'https://*.clarity.ms'], connect: ['https://*.clarity.ms'], img: ['https://*.clarity.ms', 'https://c.bing.com'] }) },
  pagesense: { label: 'Zoho PageSense', consent: 'analytics', idLabel: 'Script path', idHint: 'From the tracking code: the part after https://cdn.pagesense.io/js/, for example abc123/1a2b3c….js.', pattern: /^[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\.js$/,
    sources: () => ({ script: ['https://cdn.pagesense.io'], connect: ['https://*.pagesense.io'], img: ['https://*.pagesense.io'] }) },
  matomo: { label: 'Matomo', consent: 'analytics', idLabel: 'Site ID', idHint: 'A number, for example 1.', pattern: /^\d{1,6}$/, needsUrl: true, urlHint: 'Your Matomo address, for example https://analytics.example.com/ or https://example.matomo.cloud/.',
    sources: (e) => ({ script: [host(e.url), 'https://cdn.matomo.cloud'].filter(Boolean), connect: [host(e.url)].filter(Boolean), img: [host(e.url)].filter(Boolean) }) },
  plausible: { label: 'Plausible', consent: 'analytics', idLabel: 'Site domain', idHint: 'As set up in Plausible, for example oneofficeautomation.com.', pattern: /^[a-z0-9.-]+\.[a-z]{2,}$/i,
    sources: () => ({ script: ['https://plausible.io'], connect: ['https://plausible.io'], img: [] }) },
  umami: { label: 'Umami', consent: 'analytics', idLabel: 'Website ID', idHint: 'The ID from Umami’s tracking code, for example 94db1cb1-74f4-4a40-ad6c-962362670409.', pattern: /^[0-9a-f-]{36}$/i, needsUrl: true, urlHint: 'Leave empty for Umami Cloud, or your own Umami address, for example https://umami.example.com.',
    sources: (e) => ({ script: [host(e.url) || 'https://cloud.umami.is'], connect: [host(e.url) || 'https://cloud.umami.is', 'https://api-gateway.umami.dev'], img: [] }) },
  fathom: { label: 'Fathom', consent: 'analytics', idLabel: 'Site ID', idHint: 'For example ABCDEFGH.', pattern: /^[A-Z0-9]{5,12}$/,
    sources: () => ({ script: ['https://cdn.usefathom.com'], connect: ['https://cdn.usefathom.com'], img: ['https://cdn.usefathom.com'] }) },
  linkedin: { label: 'LinkedIn Insight Tag', consent: 'marketing', idLabel: 'Partner ID', idHint: 'A number, from Campaign Manager → Insight Tag.', pattern: /^\d{4,12}$/,
    sources: () => ({ script: ['https://snap.licdn.com'], connect: ['https://px.ads.linkedin.com'], img: ['https://px.ads.linkedin.com'] }) },
  meta: { label: 'Meta (Facebook) Pixel', consent: 'marketing', idLabel: 'Pixel ID', idHint: 'A number, from Events Manager.', pattern: /^\d{8,20}$/,
    sources: () => ({ script: ['https://connect.facebook.net'], connect: ['https://www.facebook.com', 'https://connect.facebook.net'], img: ['https://www.facebook.com'] }) },
  googleads: { label: 'Google Ads conversion tracking', consent: 'marketing', idLabel: 'Conversion ID', idHint: 'For example AW-123456789.', pattern: /^AW-\d{6,14}$/,
    sources: () => ({ script: ['https://www.googletagmanager.com', 'https://www.googleadservices.com'], connect: ['https://www.googleadservices.com', 'https://googleads.g.doubleclick.net', 'https://www.google.com'], img: ['https://www.googleadservices.com', 'https://googleads.g.doubleclick.net', 'https://www.google.com'] }) },
  hubspot: { label: 'HubSpot tracking code', consent: 'marketing', idLabel: 'Hub ID', idHint: 'Your HubSpot account number.', pattern: /^\d{4,12}$/,
    sources: () => ({ script: ['https://js.hs-scripts.com', 'https://js.hs-analytics.net', 'https://js.hsadspixel.net', 'https://js.hscollectedforms.net', 'https://js.hs-banner.com', 'https://js.usemessages.com'], connect: ['https://*.hubspot.com', 'https://*.hs-analytics.net', 'https://*.hubapi.com'], img: ['https://track.hubspot.com', 'https://*.hubspot.com'] }) },
};

export const TOOL_OPTIONS = (Object.keys(TOOLS) as ToolId[]).map((value) => ({ value, label: `${TOOLS[value].label} (${TOOLS[value].consent === 'analytics' ? 'analytics' : 'advertising'})` }));

/** The tools to load: entries with a known tool and an ID that looks right (older single-tool settings are read too). */
export function analyticsTools(raw: unknown): ToolEntry[] {
  const r = (raw ?? {}) as { tools?: Partial<ToolEntry>[]; provider?: string; id?: string };
  const list: Partial<ToolEntry>[] = Array.isArray(r.tools) ? r.tools : r.provider && r.provider !== 'none' ? [{ tool: r.provider as ToolId, id: r.id ?? '', url: '' }] : [];
  const seen = new Set<string>();
  return list
    .map((e) => ({ tool: e.tool as ToolId, id: String(e.id ?? '').trim(), url: String(e.url ?? '').trim() }))
    .filter((e) => {
      const d = TOOLS[e.tool]; if (!d || !d.pattern.test(e.id) || seen.has(e.tool)) return false;
      if (d.needsUrl && e.tool === 'matomo' && !host(e.url)) return false;
      seen.add(e.tool); return true;
    });
}

/** The page's security policy with the chosen tools' addresses added. */
export function cspWithTools(csp: string, tools: ToolEntry[]): string {
  const add: Record<string, Set<string>> = { 'script-src': new Set(), 'connect-src': new Set(), 'img-src': new Set(), 'frame-src': new Set() };
  for (const t of tools) {
    const s = TOOLS[t.tool].sources(t);
    s.script.forEach((x) => add['script-src'].add(x)); s.connect.forEach((x) => add['connect-src'].add(x)); s.img.forEach((x) => add['img-src'].add(x)); (s.frame ?? []).forEach((x) => add['frame-src'].add(x));
  }
  let out = csp;
  for (const [dir, set] of Object.entries(add)) {
    if (!set.size) continue;
    const extra = [...set].join(' ');
    out = new RegExp(`${dir} [^;]*`).test(out) ? out.replace(new RegExp(`${dir} ([^;]*)`), (_m, v: string) => `${dir} ${v} ${extra}`) : `${out}; ${dir} 'self' ${extra}`;
  }
  return out;
}
