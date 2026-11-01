import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useCms } from '../cms/CmsContext';
import type { FormEvent } from 'react';
import { api } from '../auth/api';
import { c } from '../theme';
import D from '../cms/defaults.generated.json';
import { siteView } from '../cms/siteSettings';

export function useContactLogic() {
  const [state, setFull] = useState({ submitted: false, busy: false, error: '' });
  const setState = (p: Partial<typeof state>) => setFull((s) => ({ ...s, ...p }));

    const cms = useCms();
    // The home page sends visitors here with ?process=… already filled in.
    const prefill = (new URLSearchParams(useLocation().search).get('process') ?? '').slice(0, 500);
    const site = siteView(cms<unknown>('site.settings', D['site.settings']));
    const siteX = { ...site, telIndia: site.phoneIndia.replace(/[^+0-9]/g, ''), telQatar: site.phoneQatar.replace(/[^+0-9]/g, '') };

    const done = state.submitted;
    return { c, prefill, error: state.error, busy: state.busy, site: siteX, showForm: !done, submitted: done, submit: async (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const data = Object.fromEntries(new FormData(e.currentTarget)); try { setState({ busy: true, error: '' }); await api.lead('demo', data); setState({ submitted: true, busy: false }); } catch (err) { setState({ busy: false, error: (err as Error).message }); } }, reset: () => setState({ submitted: false, busy: false, error: '' }) };
  
}
