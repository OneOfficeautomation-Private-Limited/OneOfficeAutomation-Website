import { useState } from 'react';
import { useCms } from '../cms/CmsContext';
import { c } from '../theme';
import D from '../cms/defaults.generated.json';

export function usePlatformLogic() {
  const [state, setFull] = useState({});
  const setState = (p: Partial<typeof state>) => setFull((s) => ({ ...s, ...p }));

    const cms = useCms();
    const stats = cms('platform.stats', D['platform.stats']);

    return { c, stats };
  
}
