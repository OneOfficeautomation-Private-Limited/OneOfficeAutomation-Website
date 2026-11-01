import { useState } from 'react';
import { useCms } from '../cms/CmsContext';
import { c } from '../theme';
import D from '../cms/defaults.generated.json';

export function useMainLogic() {
  const [state, setFull] = useState({ step: 0 });
  const setState = (p: Partial<typeof state>) => setFull((s) => ({ ...s, ...p }));

    const cms = useCms();
    const STEPS = cms('home.steps', D['home.steps']);
    const t = cms('home.text', D['home.text']);
    const stats = cms('platform.stats', D['platform.stats']);
    const allStories = cms('customers.stories', D['customers.stories']);
    const board = (allStories.some(x => x.featured) ? allStories.filter(x => x.featured) : allStories).slice(0, 4);
    const S = state;
    const steps = STEPS.map((s, i) => ({ ...s, num: String(i + 1), notLast: i < STEPS.length - 1, active: i === S.step, inactive: i !== S.step, pick: () => setState({ step: i }) }));
    return { c, t, stats, board, steps, current: steps[S.step] };
  
}
