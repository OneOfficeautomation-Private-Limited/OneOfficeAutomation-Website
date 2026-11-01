import { useState } from 'react';
import { useCms } from '../cms/CmsContext';
import G from '../cms/defaults.generated.json';
import D from '../cms/defaults.generated.json';
import { c } from '../theme';

export function usePricingLogic() {
  const [state, setFull] = useState({ size: 2, faq: 0 });
  const setState = (p: Partial<typeof state>) => setFull((s) => ({ ...s, ...p }));

    const cms = useCms();
    const PLANS = cms('pricing.plans', G['pricing.plans']);
    const SIZES = [["Just me", "community"], ["A small team", "starter"], ["A department", "business"], ["The whole company", "enterprise"]];
    const FAQ = cms('pricing.faq', D['pricing.faq']);
    const t = cms('pricing.text', D['pricing.text']);
    const COMPARE = cms('pricing.compare', G['pricing.compare']);
    const S = state;
    const recId = SIZES[S.size][1];
    const sizes = SIZES.map((z, i) => ({ label: z[0], active: i === S.size, inactive: i !== S.size, pick: () => setState({ size: i }) }));
    const recPlan = PLANS.filter(p => p.id === recId)[0] || PLANS[0];
    // Each card's "What is included" list comes from the comparison table unless the plan has its own lines.
    const cell = (r: Record<string, unknown>, id: string) => String(r[id] ?? '').trim();
    const isYes = (v: string) => v.toLowerCase() === 'yes';
    const isNo = (v: string) => v === '' || v.toLowerCase() === 'no';
    const autoFeats = (i: number): string[] => {
      const id = PLANS[i].id, prev = i > 0 ? PLANS[i - 1] : null;
      const lines = prev ? [`Everything in ${prev.name}`] : [];
      for (const r of COMPARE as Record<string, unknown>[]) {
        if (r.hideOnCards === true) continue;
        const v = cell(r, id), before = prev ? cell(r, prev.id) : '';
        if (isNo(v)) continue;
        if (isYes(v)) { if (!prev || !isYes(before)) lines.push(String(r.feature)); }
        else if (!prev || v !== before) lines.push(`${r.feature}: ${v}`);
      }
      return lines;
    };
    const plans = PLANS.map((p, i) => {
      const isRec = p.id === recId, dark = p.popular;
      const own = (p.feats ?? []).map((f: string) => f.trim()).filter(Boolean);
      return { ...p, feats: own.length ? own : autoFeats(i), step: (i * 24) + 'px', dark, light: !dark, border: isRec ? 'linear-gradient(135deg, #1F74C9, #6D4AD8)' : '#DDE3F3', glow: isRec ? '0 0 0 4px rgba(109,74,216,0.35)' : '0 0 0 0 transparent' };
    });
    const faqs = FAQ.map((f, i) => ({ q: f.q, a: f.a, open: i === S.faq, expanded: i === S.faq, sign: i === S.faq ? '−' : '+', badge: i === S.faq ? 'linear-gradient(135deg, #1F74C9, #6D4AD8)' : '#F0EBFD', badgeInk: i === S.faq ? '#FFFFFF' : '#6D4AD8', toggle: () => setState({ faq: S.faq === i ? -1 : i }) }));
    const cmpHead = PLANS.map(p => ({ name: p.name, bg: p.popular ? '#6D4AD8' : 'transparent', fg: p.popular ? '#FFFFFF' : '#1B2350', rad: p.popular ? '16px 16px 0 0' : '0' }));
    const cmpRows = COMPARE.map(r => ({
      feature: r.feature,
      cells: PLANS.map(p => {
        const hit = Object.entries(r).filter(e => e[0] === p.id)[0];
        const v = (hit ? hit[1] : '').trim();
        const low = v.toLowerCase();
        const yes = low === 'yes';
        const no = v === '' || low === 'no';
        return { isYes: yes, isNo: no, isText: !yes && !no, text: v, bg: p.popular ? '#F0EBFD' : 'transparent', ck: p.popular ? '#6D4AD8' : '#1F74C9' };
      }),
    }));
    return { c, t, sizes, rec: recPlan.name, plans, faqs, cmpHead, cmpRows };
  
}
