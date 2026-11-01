import { useState } from 'react';
import { useCms } from '../cms/CmsContext';
import { c } from '../theme';
import D from '../cms/defaults.generated.json';

export function useCustomersLogic() {
  const [state, setFull] = useState({ filter: 'All' });
  const setState = (p: Partial<typeof state>) => setFull((s) => ({ ...s, ...p }));

    const cms = useCms();
    const STORIES = cms('customers.stories', D['customers.stories']).map((x, i) => ({ ...x, grad: i % 2 === 0 ? 'linear-gradient(160deg, #1F74C9, #3B4FB8)' : 'linear-gradient(160deg, #6D4AD8, #4A3BA8)' }));
    const FILTERS = (STORIES.some(x => x.featured) ? ['All', 'Featured'] : ['All']).concat(STORIES.map(x => x.ind).filter((v, i, a) => a.indexOf(v) === i));
    const S = state;
    const filters = FILTERS.map(f => ({ label: f, active: f === S.filter, inactive: f !== S.filter, pick: () => setState({ filter: f }) }));
    const ordered = STORIES.filter(x => x.featured).concat(STORIES.filter(x => !x.featured));
    const shown = ordered.filter(x => S.filter === 'All' || (S.filter === 'Featured' ? x.featured : x.ind === S.filter)).map(x => ({ ...x, shadow: x.featured ? '0 0 0 3px rgba(109,74,216,0.5), 0 22px 44px rgba(109,74,216,0.28)' : '0 14px 34px rgba(31,42,92,0.10)' }));
    const spot = STORIES.some(x => x.featured) ? ordered.filter(x => x.featured) : STORIES;
    const TF = [["translate(calc(-50% + -60px), calc(-50% + -70px)) rotate(-10deg)", "1", "ooa-hide-m"], ["translate(calc(-50% + 60px), calc(-50% + 0px)) rotate(6deg)", "2", "ooa-hide-m"], ["translate(calc(-50% + -20px), calc(-50% + 70px)) rotate(-3deg)", "3", ""]];
    const fan = spot.slice(0, 3).map((x, i) => ({ ...x, tf: TF[i][0], z: TF[i][1], cls: TF[i][2] }));
    const board = spot.slice(0, 4);
    const quotes = spot.filter(x => x.quote !== '').slice(0, 6).map((x, i) => ({ ...x, bg: i % 3 === 1 ? 'rgba(255,255,255,0.06)' : '#FFFFFF', fg: i % 3 === 1 ? '#FFFFFF' : '#1B2350', bd: i % 3 === 1 ? '1.5px dashed rgba(143,184,255,0.5)' : 'none', qc: i % 3 === 1 ? '#8FB8FF' : '#1F74C9', cap: i % 3 === 1 ? '#DCE3FA' : '#4A5175' }));
    return { c, filters, shown, fan, board, quotes };
  
}
