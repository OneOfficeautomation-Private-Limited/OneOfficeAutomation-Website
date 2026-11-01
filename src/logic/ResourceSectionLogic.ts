import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useCms } from '../cms/CmsContext';
import type { ChangeEvent } from 'react';
import { c } from '../theme';
import D from '../cms/defaults.generated.json';
import { useArticleBody } from './articleBody';

export function useResourceSectionLogic() {
  const [state, setFull] = useState({ section: 'get-started', open: '', flt: 'All', q: '' });
  const setState = (p: Partial<typeof state>) => setFull((s) => ({ ...s, ...p }));
  const { section: routeSection } = useParams();
  const [params, setParams] = useSearchParams();
  const articleParam = params.get('article') ?? '';
  useEffect(() => setState({ flt: 'All', q: '' }), [routeSection]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => window.scrollTo(0, 0), [routeSection, articleParam]);

    const cms = useCms();
    const CATS = cms('resources.categories', D['resources.categories']);
    const PRODUCTS = cms('resources.products', D['resources.products']);
    const ITEMS = cms('resources.items', D['resources.items']);
    const S = { ...state, section: routeSection ?? 'get-started', open: articleParam };
    const prod = PRODUCTS.filter(p => p.id === S.section)[0];
    const isProduct = !!prod;
    const cat = prod || CATS.filter(k => k.id === S.section)[0] || CATS[0];
    const other = isProduct ? CATS : PRODUCTS;
    const tagged = ITEMS.filter(i => (isProduct ? i.product === cat.id : i.category === cat.id)).map(i => ({ ...i, kind: isProduct ? i.category : i.product }));
    const kinds = other.filter(o => tagged.some(i => i.kind === o.id));
    const chips = [{ id: 'All', label: 'All', active: S.flt === 'All', inactive: S.flt !== 'All', pick: () => setState({ flt: 'All' }) }].concat(kinds.map(o => ({ id: o.id, label: o.title, active: S.flt === o.id, inactive: S.flt !== o.id, pick: () => setState({ flt: o.id }) })));
    const q = S.q.trim().toLowerCase();
    const titles = other.map(o => ({ id: o.id, title: o.title }));
    const list = tagged.filter(i => (S.flt === 'All' || i.kind === S.flt) && (q === '' || (i.title + ' ' + i.summary).toLowerCase().indexOf(q) !== -1)).map(i => {
      const t = titles.filter(x => x.id === i.kind)[0];
      return { ...i, tag: t ? t.title : '', hasTag: !!t, open: () => setParams({ article: i.id }) };
    });
    const found = tagged.filter(i => i.id === S.open)[0];
    const art = found || tagged[0] || ITEMS[0];
    // Lists carry summaries only; the article's text loads when it is opened.
    const artText = useArticleBody(art?.id, (art as { body?: string } | undefined)?.body);
    const idx = tagged.indexOf(found);
    const linked = tagged.map(i => ({ ...i, open: () => setParams({ article: i.id }) }));
    const prev = linked[(idx + linked.length - 1) % linked.length] || linked[0];
    const next = linked[(idx + 1) % linked.length] || linked[0];
    const related = linked.filter(i => i.id !== art.id).slice(0, 4);
    const artCat = CATS.filter(k => k.id === art.category)[0] || CATS[0];
    const artProd = PRODUCTS.filter(p => p.id === art.product)[0];
    const blocks = (artText.body || '').split('\n').filter(l => l.trim() !== '').map(l => (l.indexOf('## ') === 0 ? { text: l.slice(3), isH: true, isLi: false, isP: false } : l.indexOf('- ') === 0 ? { text: l.slice(2), isH: false, isLi: true, isP: false } : { text: l, isH: false, isLi: false, isP: true }));
    return {
      c, cat, chips, list, art, artCat, blocks, related, prev, next, artState: artText.state, bodyText: artText.body,
      kindLabel: isProduct ? 'Product' : 'Help type', filterLabel: isProduct ? 'Help type' : 'Product',
      total: tagged.length + (tagged.length === 1 ? ' article' : ' articles'),
      hasChips: kinds.length > 0, emptyList: list.length === 0, showArticle: !!found, showList: !found,
      hasPoints: art.points.length > 0, hasRelated: related.length > 0, hasArtProd: !!artProd, artProdTitle: artProd ? artProd.title : '',
      q: S.q, typeQ: (e: ChangeEvent<HTMLInputElement>) => setState({ q: e.target.value }),
      back: () => setParams({}),
    };
  
}
