import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useCms } from '../cms/CmsContext';
import CORE from '../cms/core.defaults.json';
import { TOOLS, analyticsTools } from '../cms/analytics';
import type { ToolEntry } from '../cms/analytics';

type Fn = ((...a: unknown[]) => void) & { q?: unknown[]; queue?: unknown[]; callMethod?: (...a: unknown[]) => void; loaded?: boolean; push?: unknown; version?: string };
type W = Window & Record<string, unknown> & { dataLayer?: unknown[]; gtag?: Fn; plausible?: Fn; fbq?: Fn; _fbq?: Fn; _paq?: unknown[]; _hsq?: unknown[]; clarity?: Fn; fathom?: { trackPageview?: () => void }; _linkedin_partner_id?: string; _linkedin_data_partner_ids?: string[] };
const consent = () => { try { const c = JSON.parse(localStorage.getItem('ooa-consent') ?? 'null') as { analytics?: boolean; marketing?: boolean } | null; return { analytics: !!c?.analytics, marketing: !!c?.marketing }; } catch { return { analytics: false, marketing: false }; } };
const script = (src: string, attrs: Record<string, string> = {}) => { const s = document.createElement('script'); s.async = true; s.src = src; for (const [k, v] of Object.entries(attrs)) s.setAttribute(k, v); document.head.appendChild(s); };
const gtagReady = (w: W) => { w.dataLayer = w.dataLayer || []; if (!w.gtag) { w.gtag = function gtag() { w.dataLayer!.push(arguments); } as Fn; w.gtag('js', new Date()); } }; // eslint-disable-line prefer-rest-params

/** Starts one tool (each only once). Code runs from the site's own files: the security policy blocks inline scripts. */
function start(t: ToolEntry, w: W) {
  switch (t.tool) {
    case 'ga4': gtagReady(w); w.gtag!('config', t.id, { send_page_view: false, anonymize_ip: true }); script(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(t.id)}`); break;
    case 'googleads': gtagReady(w); w.gtag!('config', t.id); if (!document.querySelector('script[src*="gtag/js"]')) script(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(t.id)}`); break;
    case 'gtm': w.dataLayer = w.dataLayer || []; w.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' }); script(`https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(t.id)}`); break;
    case 'clarity': { const c = (w.clarity ||= Object.assign(((...a: unknown[]) => { (c.q = c.q || []).push(a); }) as Fn, {})); script(`https://www.clarity.ms/tag/${encodeURIComponent(t.id)}`); break; }
    case 'pagesense': script(`https://cdn.pagesense.io/js/${t.id}`); break;
    case 'matomo': { const base = t.url.replace(/\/+$/, '/'); w._paq = w._paq || []; w._paq.push(['setTrackerUrl', `${base}matomo.php`], ['setSiteId', t.id], ['enableLinkTracking']); script(/matomo\.cloud/.test(base) ? `https://cdn.matomo.cloud/${new URL(base).host}/matomo.js` : `${base}matomo.js`); break; }
    case 'plausible': { const p = (w.plausible ||= Object.assign(((...a: unknown[]) => { (p.q = p.q || []).push(a); }) as Fn, {})); script('https://plausible.io/js/script.manual.js', { 'data-domain': t.id }); break; }
    case 'umami': script(`${(t.url || 'https://cloud.umami.is').replace(/\/+$/, '')}/script.js`, { 'data-website-id': t.id }); break;
    case 'fathom': script('https://cdn.usefathom.com/script.js', { 'data-site': t.id, 'data-spa': 'auto' }); break;
    case 'linkedin': w._linkedin_partner_id = t.id; w._linkedin_data_partner_ids = [...(w._linkedin_data_partner_ids ?? []), t.id]; script('https://snap.licdn.com/li.lms-analytics/insight.min.js'); break;
    case 'meta': {
      if (!w.fbq) { const f: Fn = Object.assign((...a: unknown[]) => { f.callMethod ? f.callMethod(...a) : f.queue!.push(a); }, { queue: [] as unknown[], loaded: true, version: '2.0' }); f.push = f; w.fbq = f; w._fbq = f; script('https://connect.facebook.net/en_US/fbevents.js'); }
      w.fbq!('init', t.id); break;
    }
    case 'hubspot': w._hsq = w._hsq || []; script(`https://js.hs-scripts.com/${encodeURIComponent(t.id)}.js`, { id: 'hs-script-loader' }); break;
  }
}
/** Counts a page view in tools that don't notice page changes on their own. */
function pageview(t: ToolEntry, w: W, path: string) {
  switch (t.tool) {
    case 'ga4': w.gtag?.('event', 'page_view', { page_path: path, page_title: document.title, send_to: t.id }); break;
    case 'gtm': w.dataLayer?.push({ event: 'page_view', page_path: path, page_title: document.title }); break;
    case 'plausible': w.plausible?.('pageview'); break;
    case 'matomo': w._paq?.push(['setCustomUrl', path], ['setDocumentTitle', document.title], ['trackPageView']); break;
    case 'meta': w.fbq?.('track', 'PageView'); break;
    case 'hubspot': w._hsq?.push(['setPath', path], ['trackPageView']); break;
    default: break; // Clarity, PageSense, Umami, Fathom (spa mode), LinkedIn and Google Ads follow page changes themselves
  }
}

/** Loads the chosen tools after the visitor accepts the matching cookies, and counts page views as they navigate. */
export default function Analytics() {
  const tools = analyticsTools(useCms()<unknown>('site.analytics', CORE['site.analytics']));
  const [ok, setOk] = useState(consent);
  const started = useRef(new Set<string>());
  const { pathname, search } = useLocation();
  const allowed = tools.filter((t) => ok[TOOLS[t.tool].consent]);
  const key = allowed.map((t) => t.tool).join(',');
  useEffect(() => { const on = () => setOk(consent()); window.addEventListener('ooa-consent', on); return () => window.removeEventListener('ooa-consent', on); }, []);
  useEffect(() => {
    const w = window as unknown as W;
    for (const t of allowed) if (!started.current.has(t.tool)) { started.current.add(t.tool); start(t, w); }
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const w = window as unknown as W;
    for (const t of allowed) pageview(t, w, pathname + search);
  }, [key, pathname, search]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
