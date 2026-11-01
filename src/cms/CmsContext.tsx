import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import core from './core.defaults.json';
import { siteView } from './siteSettings';
import type { SiteView } from './siteSettings';

type Store = Record<string, unknown>;
const CmsContext = createContext<{ data: Store; ready: boolean }>({ data: {}, ready: true });

/** Loads the published content once. If the API is unreachable the built-in defaults are used. */
/** Content the server embedded in the page (see server/_lib/seoPage.ts), or null when there is none. */
function embedded(): Store | null {
  try {
    const el = typeof document !== 'undefined' ? document.getElementById('cms-data') : null;
    return el?.textContent ? (JSON.parse(el.textContent) as Store) : null;
  } catch { return null; }
}

/** An editor's unsaved changes, when the page was opened with “Preview on the website” (?preview=1, this browser only, 2 hours). */
function previewDraft(): { key: string; label: string; value: unknown } | null {
  try {
    if (typeof window === 'undefined' || !new URLSearchParams(window.location.search).has('preview')) return null;
    const p = JSON.parse(localStorage.getItem('ooa-preview') ?? 'null') as { key: string; label: string; value: unknown; at: number } | null;
    return p && Date.now() - p.at < 2 * 3600e3 ? p : null;
  } catch { return null; }
}

export function CmsProvider({ children }: { children: ReactNode }) {
  // When the server embedded the content, the site shows straight away; otherwise it is fetched.
  const [first] = useState(embedded);
  const [preview] = useState(previewDraft);
  const [data, setDataRaw] = useState<Store>(() => (preview ? { ...(first ?? {}), [preview.key]: preview.value } : first ?? {}));
  const setData = (d: Store) => setDataRaw(preview ? { ...d, [preview.key]: preview.value } : d);
  const [ready, setReady] = useState(first !== null);
  useEffect(() => {
    if (first) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 2500);
    fetch('/api/content', { signal: controller.signal })
      .then((r) => (r.ok ? (r.json() as Promise<Store>) : {}))
      .then((d) => setData(d))
      .catch(() => undefined)
      .finally(() => {
        window.clearTimeout(timer);
        setReady(true);
      });
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, []);
  const value = useMemo(() => ({ data, ready }), [data, ready]);
  return (
    <CmsContext.Provider value={value}>
      {preview && (
        <div role="status" style={{ position: 'sticky', top: 0, zIndex: 200, padding: '8px 16px', background: '#FFE8A3', color: '#3B2F00', font: '600 14px/1.4 system-ui, sans-serif', textAlign: 'center' }}>
          Preview of your unsaved changes to “{preview.label}”. Only you can see this. <a href={window.location.pathname} style={{ color: 'inherit' }}>Close preview</a>
        </div>
      )}
      {children}
    </CmsContext.Provider>
  );
}

/** Returns a getter: cms('pricing.faq', defaultValue) gives the edited content, or the default. */
export function useCms() {
  const { data } = useContext(CmsContext);
  return useCallback(<T,>(key: string, fallback: T): T => (Object.prototype.hasOwnProperty.call(data, key) ? (data[key] as T) : fallback), [data]);
}

export function useCmsReady(): boolean {
  return useContext(CmsContext).ready;
}

export type SiteSettings = SiteView;
export type ResourceCategory = (typeof core)['resources.categories'][number];
export type ResourceProduct = (typeof core)['resources.products'][number];


/** Company details and social links, with phone numbers prepared for tel: links. */
export function useSite() {
  const cms = useCms();
  return siteView(cms<unknown>('site.settings', core['site.settings']));
}

export function useCategories(): ResourceCategory[] {
  const cms = useCms();
  return cms<ResourceCategory[]>('resources.categories', core['resources.categories']);
}

export function useProducts(): ResourceProduct[] {
  const cms = useCms();
  return cms<ResourceProduct[]>('resources.products', core['resources.products']);
}
