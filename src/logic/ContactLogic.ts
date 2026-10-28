import { useState } from 'react';
import { useCms } from '../cms/CmsContext';
import type { FormEvent } from 'react';
import { api } from '../auth/api';
import { c } from '../theme';

export function useContactLogic() {
  const [state, setFull] = useState({ submitted: false, busy: false, error: '' });
  const setState = (p: Partial<typeof state>) => setFull((s) => ({ ...s, ...p }));

    const cms = useCms();
    const site = cms('site.settings', {"legalName": "OneOfficeAutomation Private Limited", "cin": "U72200KA2021PTC155157", "address": "28/1, Near Nandan Enclaves, Billakempanahalli, Ramanagara, Karnataka – 562109, India", "supportEmail": "support@oneofficeautomation.com", "salesEmail": "sales@oneofficeautomation.com", "phoneIndia": "+91 76760 95823", "phoneQatar": "+974 7018 5221", "linkedin": "https://www.linkedin.com/", "facebook": "https://www.facebook.com/", "instagram": "https://www.instagram.com/", "youtube": "https://www.youtube.com/", "footerTagline": "Intelligent automation solutions.", "announcementOn": false, "announcementText": "AI agents and One Workflow are now available.", "announcementLabel": "Learn more", "announcementUrl": "/platform"});
    const siteX = { ...site, telIndia: site.phoneIndia.replace(/[^+0-9]/g, ''), telQatar: site.phoneQatar.replace(/[^+0-9]/g, '') };

    const done = state.submitted;
    return { c, error: state.error, busy: state.busy, site: siteX, showForm: !done, submitted: done, submit: async (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const data = Object.fromEntries(new FormData(e.currentTarget)); try { setState({ busy: true, error: '' }); await api.lead('demo', data); setState({ submitted: true, busy: false }); } catch (err) { setState({ busy: false, error: (err as Error).message }); } }, reset: () => setState({ submitted: false, busy: false, error: '' }) };
  
}
