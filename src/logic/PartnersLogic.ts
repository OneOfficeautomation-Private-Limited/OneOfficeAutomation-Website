import { useState } from 'react';
import { useCms } from '../cms/CmsContext';
import type { FormEvent } from 'react';
import { api } from '../auth/api';
import { c } from '../theme';
import D from '../cms/defaults.generated.json';

export function usePartnersLogic() {
  const [state, setFull] = useState({ type: 0, sent: false, busy: false, error: '' });
  const setState = (p: Partial<typeof state>) => setFull((s) => ({ ...s, ...p }));

    const cms = useCms();
    const TYPES = cms('partners.types', D['partners.types']);
    const BICON = ['M12 2v20M17 6H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6', 'M22 10L12 5 2 10l10 5 10-5zM6 12v5c3 2 9 2 12 0v-5', 'M5 4h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2zM8 21h8', 'M9 11l3 3 8-8M20 12v7a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2h9', 'M3 11l18-8v18L3 13zM7 12v6', 'M12 8m-4 0a4 4 0 108 0 4 4 0 10-8 0M4 21c0-4 3.6-7 8-7s8 3 8 7'];
    const TICON = ['M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z', 'M9 12l2 2 4-4M12 3l2.6 2.2 3.4-.2.7 3.3 2.8 1.9-1.2 3.2 1.2 3.2-2.8 1.9-.7 3.3-3.4-.2L12 21l-2.6-2.2-3.4.2-.7-3.3L2.5 13.8 3.7 10.6 2.5 7.4l2.8-1.9.7-3.3 3.4.2z', 'M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8 5.8 21.3l2.4-7.4L2 9.4h7.6z'];
    const benefits = cms('partners.benefits', D['partners.benefits']).map((x, i) => ({ ...x, icon: BICON[i % BICON.length], col: i % 2 === 0 ? '#1F74C9' : '#6D4AD8', tint: i % 2 === 0 ? '#E8F1FC' : '#F0EBFD' }));
    const tiers = cms('partners.tiers', D['partners.tiers']).map((x, i, a) => {
      const dark = i === a.length - 1;
      const col = i % 2 === 0 ? '#1F74C9' : '#6D4AD8';
      return {
        ...x, label: 'Level ' + (i + 1) + ' · ' + x.tag, icon: TICON[i % TICON.length], pad: (28 + i * 48) + 'px',
        bg: dark ? 'linear-gradient(160deg, #43278A 0%, #2B1862 100%)' : 'linear-gradient(#FFFFFF,#FFFFFF) padding-box, linear-gradient(135deg, ' + col + ', #D9E2F7 70%) border-box',
        bd: dark ? 'none' : '2px solid transparent', fg: dark ? '#FFFFFF' : '#1B2350', mu: dark ? '#DCD3F7' : '#4A5175', ck: dark ? '#C9B5FF' : col,
        sh: dark ? '0 16px 34px rgba(31,42,92,0.28)' : '0 16px 34px rgba(31,42,92,0.1)',
        medalBg: dark ? 'linear-gradient(140deg, #1F74C9, #6D4AD8)' : col, medalRing: dark ? '0 0 0 6px rgba(255,255,255,0.14)' : '0 0 0 6px ' + (col === '#1F74C9' ? '#E8F1FC' : '#F0EBFD'),
      };
    });
    const procSteps = cms('partners.process', D['partners.process']).map((x, i, a) => ({ ...x, n: String(i + 1), hasPrepare: x.prepare !== '', showLine: i < a.length - 1, bg: i === a.length - 1 ? 'linear-gradient(140deg, #1F74C9, #6D4AD8)' : '#FFFFFF', fg: i === a.length - 1 ? '#FFFFFF' : (i % 2 === 0 ? '#1F74C9' : '#6D4AD8'), bd: i % 2 === 0 ? '#1F74C9' : '#6D4AD8' }));
    const S = state;
    const types = TYPES.map((t, i) => ({ ...t, active: i === S.type, inactive: i !== S.type, pick: () => setState({ type: i }) }));
    return { c, error: state.error, benefits, tiers, procSteps, types, sel: types[S.type], formOpen: !S.sent, sent: S.sent, submit: async (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const data = Object.fromEntries(new FormData(e.currentTarget)); try { setState({ busy: true, error: '' }); await api.lead('partner', data); setState({ sent: true, busy: false }); } catch (err) { setState({ busy: false, error: (err as Error).message }); } }, reset: () => setState({ sent: false }) };
  
}
