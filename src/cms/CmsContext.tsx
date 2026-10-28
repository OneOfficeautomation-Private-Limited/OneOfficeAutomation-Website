import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import core from './core.defaults.json';

type Store = Record<string, unknown>;
const CmsContext = createContext<{ data: Store; ready: boolean }>({ data: {}, ready: true });

/** Loads the published content once. If the API is unreachable the built-in defaults are used. */
export function CmsProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Store>({});
  const [ready, setReady] = useState(false);
  useEffect(() => {
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
  return <CmsContext.Provider value={value}>{children}</CmsContext.Provider>;
}

/** Returns a getter: cms('pricing.faq', defaultValue) gives the edited content, or the default. */
export function useCms() {
  const { data } = useContext(CmsContext);
  return useCallback(<T,>(key: string, fallback: T): T => (Object.prototype.hasOwnProperty.call(data, key) ? (data[key] as T) : fallback), [data]);
}

export function useCmsReady(): boolean {
  return useContext(CmsContext).ready;
}

export type SiteSettings = (typeof core)['site.settings'];
export type ResourceCategory = (typeof core)['resources.categories'][number];
export type ResourceProduct = (typeof core)['resources.products'][number];

const digits = (s: string) => s.replace(/[^+0-9]/g, '');

/** Company details and social links, with phone numbers prepared for tel: links. */
export function useSite() {
  const cms = useCms();
  const s = { ...core['site.settings'], ...cms<Partial<SiteSettings>>('site.settings', {}) } as SiteSettings;
  return { ...s, telIndia: digits(s.phoneIndia), telQatar: digits(s.phoneQatar), website: 'oneofficeautomation.com' };
}

export function useCategories(): ResourceCategory[] {
  const cms = useCms();
  return cms<ResourceCategory[]>('resources.categories', core['resources.categories']);
}

export function useProducts(): ResourceProduct[] {
  const cms = useCms();
  return cms<ResourceProduct[]>('resources.products', core['resources.products']);
}
