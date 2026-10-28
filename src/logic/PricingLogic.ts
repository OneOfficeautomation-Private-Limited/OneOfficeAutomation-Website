import { useState } from 'react';
import { useCms } from '../cms/CmsContext';
import { c } from '../theme';

export function usePricingLogic() {
  const [state, setFull] = useState({ size: 2, faq: 0 });
  const setState = (p: Partial<typeof state>) => setFull((s) => ({ ...s, ...p }));

    const cms = useCms();
    const PLANS = cms('pricing.plans', [{"id": "community", "name": "Community", "price": "Free", "per": "", "who": "For learners and individual builders", "cta": "Download free", "href": "/signup?plan=community", "popular": false, "feats": ["One Agent Studio", "Ready-made actions and toolkits", "Community support"]}, {"id": "starter", "name": "Starter", "price": "$120", "per": "/ month", "who": "For small teams automating their first processes", "cta": "Start free trial", "href": "/signup?plan=starter", "popular": false, "feats": ["Everything in Community", "One Command Center", "One Runner", "Support in your time zone"]}, {"id": "business", "name": "Business", "price": "$360", "per": "/ month", "who": "For departments scaling automation", "cta": "Start free trial", "href": "/signup?plan=business", "popular": true, "feats": ["Everything in Starter", "AI agents and One Workflow", "Single sign-on", "Custom roles and audit trail"]}, {"id": "enterprise", "name": "Enterprise", "price": "Custom", "per": "", "who": "For organisations automating at scale", "cta": "Talk to sales", "href": "mailto:sales@oneofficeautomation.com", "popular": false, "feats": ["Everything in Business", "Unlimited users and Runners", "24/7 SLA-backed support", "Dedicated success manager"]}]);
    const SIZES = [["Just me", "community"], ["A small team", "starter"], ["A department", "business"], ["The whole company", "enterprise"]];
    const FAQ = cms('pricing.faq', [{"q": "Is there a free plan?", "a": "Yes. The Community edition is free for learners and individual builders."}, {"q": "Can I try a paid plan first?", "a": "Starter and Business both include a free trial, so you can automate a real process before you buy."}, {"q": "Which currency are prices in?", "a": "All prices are in US dollars and exclude applicable taxes, which are added at checkout."}, {"q": "Can I change plans later?", "a": "Yes. Move up as you automate more processes, or talk to us about Enterprise when you need unlimited scale."}, {"q": "Where does my data live?", "a": "On your own servers. OneOfficeAutomation is self-hosted with PostgreSQL on every plan."}]);
    const t = cms('pricing.text', {"note": "All prices in US dollars and exclude applicable taxes. Starter and Business include a free trial."});
    const COMPARE = cms('pricing.compare', [{"feature": "One Agent Studio", "community": "yes", "starter": "yes", "business": "yes", "enterprise": "yes"}, {"feature": "Ready-made actions and toolkits", "community": "yes", "starter": "yes", "business": "yes", "enterprise": "yes"}, {"feature": "One Command Center", "community": "", "starter": "yes", "business": "yes", "enterprise": "yes"}, {"feature": "One Runner", "community": "", "starter": "yes", "business": "yes", "enterprise": "yes"}, {"feature": "AI agents and One Workflow", "community": "", "starter": "", "business": "yes", "enterprise": "yes"}, {"feature": "Single sign-on", "community": "", "starter": "", "business": "yes", "enterprise": "yes"}, {"feature": "Custom roles and audit trail", "community": "", "starter": "", "business": "yes", "enterprise": "yes"}, {"feature": "Unlimited users and Runners", "community": "", "starter": "", "business": "", "enterprise": "yes"}, {"feature": "Support", "community": "Community", "starter": "Your time zone", "business": "Your time zone", "enterprise": "24/7 with SLA"}, {"feature": "Dedicated success manager", "community": "", "starter": "", "business": "", "enterprise": "yes"}]);
    const S = state;
    const recId = SIZES[S.size][1];
    const sizes = SIZES.map((z, i) => ({ label: z[0], active: i === S.size, inactive: i !== S.size, pick: () => setState({ size: i }) }));
    const recPlan = PLANS.filter(p => p.id === recId)[0] || PLANS[0];
    const plans = PLANS.map((p, i) => {
      const isRec = p.id === recId, dark = p.popular;
      return { ...p, step: (i * 24) + 'px', dark, light: !dark, border: isRec ? 'linear-gradient(135deg, #1F74C9, #6D4AD8)' : '#DDE3F3', glow: isRec ? '0 0 0 4px rgba(109,74,216,0.35)' : '0 0 0 0 transparent' };
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
