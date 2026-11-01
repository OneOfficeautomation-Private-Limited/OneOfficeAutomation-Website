import { useCategories, useCms, useProducts } from '../cms/CmsContext';
import RD from '../cms/defaults.generated.json';
import G from '../cms/defaults.generated.json';

export type Article = { id: string; category: string; product?: string; chapter?: string; title: string; summary: string; meta?: string; points?: string[]; body?: string };
export type Faq = { product?: string; q: string; a: string };
export type Training = { title: string; summary: string; kind: string; level: string; product?: string; duration: string; url: string; cta: string };
/**
 * Puts each sub-topic straight after its parent topic (set as “Parent topic” in the Resources library),
 * keeping the order within each level, and records how deep it sits for the table of contents.
 */
function nest<T extends { id: string; parent?: string }>(list: T[]): (T & { depth: number })[] {
  const ids = new Set(list.map((a) => a.id));
  const kids = new Map<string, T[]>();
  for (const a of list) if (a.parent && ids.has(a.parent) && a.parent !== a.id) kids.set(a.parent, [...(kids.get(a.parent) ?? []), a]);
  const out: (T & { depth: number })[] = [];
  const seen = new Set<string>();
  const walk = (a: T, depth: number) => {
    if (seen.has(a.id)) return;
    seen.add(a.id); out.push({ ...a, depth });
    for (const k of kids.get(a.id) ?? []) walk(k, Math.min(depth + 1, 3));
  };
  for (const a of list) if (!a.parent || !ids.has(a.parent) || a.parent === a.id) walk(a, 0);
  for (const a of list) walk(a, 0); // anything left (for example a loop of parents) stays visible
  return out;
}

export type DocProduct = { id: string; title: string; desc: string; icon: string; col: string; chapters: Article[] };

const BLOCK: Record<string, string> = { learn: 'learn', templates: 'library', community: 'community' };
const CAT_ORDER = ['get-started', 'how-to', 'reference', 'troubleshooting', 'whats-new'];
export const BASICS = { id: 'basics', title: 'Platform basics', desc: 'What the platform is, choosing your first process and release notes.', icon: 'M4 5h16v14H4zM4 9h16M9 9v10', col: '#1F74C9' };

/* Everything the Resources pages need, read from the admin content with built-in defaults. */
export function useResourceData() {
  const cms = useCms();
  const cats = useCategories() as { id: string; title: string; block?: string }[];
  const products = useProducts() as { id: string; title: string; desc: string; icon: string; col: string }[];
  const items = cms<Article[]>('resources.items', (G as unknown as Record<string, Article[]>)['resources.items']);
  const faqs = cms<Faq[]>('resources.faqs', RD['resources.faqs'] as Faq[]);
  const training = cms<Training[]>('resources.training', RD['resources.training'] as Training[]);
  const path = cms('resources.learnpath', RD['resources.learnpath']);

  /* Troubleshooting lives in FAQs, so it is left out of the product manuals. */
  const docCats = cats.filter((c) => c.id !== 'troubleshooting' && (c.block || BLOCK[c.id] || 'docs') === 'docs').map((c) => c.id);
  const rank = (a: Article, k: number) => {
    const ch = parseFloat(a.chapter ?? '');
    const ci = CAT_ORDER.indexOf(a.category);
    return Number.isFinite(ch) ? ch : 1000 + (ci < 0 ? 9 : ci) * 100 + k;
  };
  const docItems = items.map((a, k) => ({ a, k })).filter(({ a }) => docCats.includes(a.category));
  const groups: DocProduct[] = [BASICS, ...products].map((p) => ({
    ...p,
    chapters: docItems.filter(({ a }) => (p.id === 'basics' ? !a.product || !products.some((x) => x.id === a.product) : a.product === p.id))
      .sort((x, y) => rank(x.a, x.k) - rank(y.a, y.k)).map(({ a }) => a),
  })).map((g) => ({ ...g, chapters: nest(g.chapters) })).filter((p) => p.chapters.length > 0);

  const productTitle = (id?: string) => products.find((p) => p.id === id)?.title ?? '';
  return { cats, products, items, faqs, training, path, groups, productTitle };
}
