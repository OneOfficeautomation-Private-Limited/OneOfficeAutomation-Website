import { useState } from 'react';
import { useCms } from '../cms/CmsContext';
import { c } from '../theme';

export function usePlatformLogic() {
  const [state, setFull] = useState({});
  const setState = (p: Partial<typeof state>) => setFull((s) => ({ ...s, ...p }));

    const cms = useCms();
    const stats = cms('platform.stats', [{"n": "73", "label": "Toolkits"}, {"n": "945", "label": "Ready-made actions"}, {"n": "18", "label": "App connectors"}, {"n": "6", "label": "AI model providers"}]);

    return { c, stats };
  
}
