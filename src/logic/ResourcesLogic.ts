import { useState } from 'react';
import { useCms } from '../cms/CmsContext';
import type { FormEvent } from 'react';
import { api } from '../auth/api';
import { c } from '../theme';
import D from '../cms/defaults.generated.json';

export function useResourcesLogic() {
  const [state, setFull] = useState({ sub: false, busy: false, error: '' });
  const setState = (p: Partial<typeof state>) => setFull((s) => ({ ...s, ...p }));

    const cms = useCms();
    const CATS = cms('resources.categories', D['resources.categories']);
    const PRODUCTS = cms('resources.products', D['resources.products']);
    const ITEMS = cms('resources.items', D['resources.items']);
    const cats = CATS.map(k => ({ ...k, tint: k.col === '#6D4AD8' ? '#F0EBFD' : '#E8F1FC', href: '/resources/' + k.id, count: ITEMS.filter(i => i.category === k.id).length + ' articles' }));
    const prods = PRODUCTS.map(k => ({ ...k, tint: k.col === '#6D4AD8' ? '#F0EBFD' : '#E8F1FC', href: '/resources/' + k.id, count: ITEMS.filter(i => i.product === k.id).length + ' articles' }));
    const latest = ITEMS.filter(i => i.featured).slice(0, 3).map(i => {
      const k = CATS.filter(x => x.id === i.category)[0] || CATS[0];
      return { ...i, type: k.title, col: k.col, href: '/resources/' + i.category + '?article=' + i.id };
    });
    return { c, error: state.error, cats, prods, latest, items: ITEMS, busy: state.busy, subOpen: !state.sub, subDone: state.sub, subscribe: async (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const data = Object.fromEntries(new FormData(e.currentTarget)); try { setState({ busy: true, error: '' }); await api.lead('newsletter', data); setState({ sub: true, busy: false }); } catch (err) { setState({ busy: false, error: (err as Error).message }); } } };
  
}
