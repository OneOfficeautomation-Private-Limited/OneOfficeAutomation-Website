import { useState } from 'react';
import { useCms } from '../cms/CmsContext';
import type { ChangeEvent } from 'react';
import type { FormEvent } from 'react';
import { api } from '../auth/api';
import { c } from '../theme';

export function useCareersLogic() {
  const [state, setFull] = useState({ team: 'All', loc: 'All', q: '', page: 0, menu: '', open: '', applyRole: '', sent: false, busy: false, error: '' });
  const setState = (p: Partial<typeof state>) => setFull((s) => ({ ...s, ...p }));

    const cms = useCms();
    const ROLES = cms('careers.roles', [{"id": "fullstack", "title": "Full-stack Developer", "team": "Engineering", "loc": "India", "place": "India", "type": "Full-time", "about": "Build the web experiences and APIs behind One Command Center and our website.", "does": ["Build features across React and Node.js", "Design clean, secure APIs", "Work closely with designers and customers"], "needs": ["Strong JavaScript or TypeScript", "Experience with a modern database", "Care about quality and detail"]}, {"id": "platform", "title": "Platform Engineer", "team": "Engineering", "loc": "India", "place": "India", "type": "Full-time", "about": "Keep the platform fast, reliable and easy to install on customers’ own servers.", "does": ["Package and ship releases", "Improve performance and reliability", "Automate testing and deployment"], "needs": ["Experience with Linux and PostgreSQL", "Scripting and CI skills", "A security mindset"]}, {"id": "ai", "title": "AI Engineer", "team": "AI and ML", "loc": "India", "place": "India", "type": "Full-time", "about": "Turn language models into reliable agents that customers can trust.", "does": ["Design and test AI agents", "Build document understanding skills", "Measure and improve accuracy"], "needs": ["Experience building with language models", "Python or TypeScript", "Clear thinking about evaluation"]}, {"id": "ml", "title": "ML Engineer", "team": "AI and ML", "loc": "India", "place": "India", "type": "Full-time", "about": "Improve how our platform reads, extracts and classifies documents.", "does": ["Train and evaluate extraction models", "Build data pipelines and tests", "Monitor quality in production"], "needs": ["Solid machine learning fundamentals", "Python and data tooling", "Comfortable with messy real-world data"]}, {"id": "rpa", "title": "RPA Developer", "team": "Solutions", "loc": "India", "place": "India", "type": "Full-time", "about": "Build agents for customers and shape how we deliver automation projects.", "does": ["Design and build customer agents", "Connect ERP, CRM and legacy apps", "Document and hand over solutions"], "needs": ["Hands-on automation or scripting experience", "Good problem-solving habits", "Clear written communication"]}, {"id": "consultant", "title": "Solution Consultant", "team": "Solutions", "loc": "Qatar", "place": "Doha, Qatar", "type": "Full-time", "about": "Help customers find the right processes to automate and show what is possible.", "does": ["Run discovery sessions and demos", "Estimate time and cost savings", "Work with engineers on solutions"], "needs": ["Experience in consulting or pre-sales", "Understanding of business processes", "Confident presenter"]}, {"id": "csm", "title": "Customer Success Manager", "team": "Customer success", "loc": "Qatar", "place": "Doha, Qatar", "type": "Full-time", "about": "Make sure every customer gets lasting value long after go-live.", "does": ["Guide customers through onboarding", "Track adoption and results", "Bring feedback back to the team"], "needs": ["Experience with business software customers", "Strong relationship skills", "Organised and proactive"]}, {"id": "support", "title": "Support Engineer", "team": "Customer success", "loc": "India", "place": "India", "type": "Full-time", "about": "Be the first to help when a customer needs an answer or a fix.", "does": ["Investigate and resolve customer issues", "Write clear guides and answers", "Escalate and follow up with engineering"], "needs": ["Technical curiosity", "Patience and clear communication", "Experience with Windows and databases is a plus"]}]);
    const TEAMS = ['All'].concat(ROLES.map(r => r.team).filter((v, i, a) => a.indexOf(v) === i));
    const LOCS = ['All'].concat(ROLES.map(r => r.place).filter((v, i, a) => a.indexOf(v) === i));
    const t = cms('careers.text', {"sub": "A small, focused team in India and Qatar. Real customers, real problems, real ownership."});
    const why = cms('careers.why', [{"t": "Real problems", "d": "Build automation that businesses depend on every single day."}, {"t": "Real ownership", "d": "A small team means your work ships and your ideas are heard."}, {"t": "Room to grow", "d": "Learn new tools and new industries with every customer."}]);
    const steps = cms('careers.steps', [{"t": "Apply", "d": "Send your details or CV."}, {"t": "Intro chat", "d": "A friendly call with the team."}, {"t": "Practical task", "d": "A short task that reflects the real work."}, {"t": "Offer", "d": "Meet the founders and get your offer."}]).map((x, i, a) => ({ ...x, num: String(i + 1), bg: i === a.length - 1 ? 'linear-gradient(140deg, #1F74C9, #6D4AD8)' : '#FFFFFF', fg: i === a.length - 1 ? '#FFFFFF' : (i % 2 === 0 ? '#1F74C9' : '#6D4AD8'), bd: i % 2 === 0 ? '#1F74C9' : '#6D4AD8' }));
    const S = state;
    const PER = 5;
    const teams = TEAMS.map(t => ({ label: t, active: t === S.team, inactive: t !== S.team, pick: () => setState({ team: t, page: 0, menu: '' }) }));
    const locs = LOCS.map(l => ({ label: l, active: l === S.loc, inactive: l !== S.loc, pick: () => setState({ loc: l, page: 0, menu: '' }) }));
    const query = S.q.trim().toLowerCase();
    const matches = ROLES.filter(r => (S.team === 'All' || r.team === S.team) && (S.loc === 'All' || r.place === S.loc) && (query === '' || (r.title + ' ' + r.about + ' ' + r.team + ' ' + r.place).toLowerCase().indexOf(query) !== -1));
    const total = matches.length;
    const pages = Math.max(1, Math.ceil(total / PER));
    const page = Math.min(S.page, pages - 1);
    const start = page * PER;
    const shown = matches.slice(start, start + PER).map(r => ({
      ...r,
      open: S.open === r.id,
      expanded: S.open === r.id,
      cta: S.open === r.id ? 'Hide details' : 'View details',
      rot: S.open === r.id ? '90deg' : '0deg',
      toggle: () => setState({ open: S.open === r.id ? '' : r.id }),
      apply: () => setState({ applyRole: r.title }),
    }));
    const toList = () => { const el = document.getElementById('roles'); if (el) el.scrollIntoView(); };
    const pageBtns = Array.from({ length: pages }, (_, i) => ({ n: String(i + 1), active: i === page, inactive: i !== page, pick: () => { setState({ page: i, open: '' }); toList(); } }));
    const roleOptions = ['General application'].concat(ROLES.map(r => r.title));
    return {
      c, error: state.error, t, why, steps, teams, locs, shown, roleOptions,
      count: total + (total === 1 ? ' open role' : ' open roles'),
      none: total === 0,
      q: S.q, typeQ: (e: ChangeEvent<HTMLInputElement>) => setState({ q: e.target.value, page: 0 }),
      teamChips: TEAMS.length <= 6, teamMenu: TEAMS.length > 6, teamOpen: S.menu === 'team', teamLabel: S.team === 'All' ? 'All teams' : S.team, toggleTeam: () => setState({ menu: S.menu === 'team' ? '' : 'team' }),
      locChips: LOCS.length <= 6, locMenu: LOCS.length > 6, locOpen: S.menu === 'loc', locLabel: S.loc === 'All' ? 'All locations' : S.loc, toggleLoc: () => setState({ menu: S.menu === 'loc' ? '' : 'loc' }),
      range: total === 0 ? '' : 'Showing ' + (start + 1) + '–' + (start + shown.length) + ' of ' + total + (total === 1 ? ' role' : ' roles'),
      multi: pages > 1, pageBtns, canPrev: page > 0, noPrev: page === 0, canNext: page < pages - 1, noNext: page >= pages - 1,
      prevPage: () => { setState({ page: page - 1, open: '' }); toList(); },
      nextPage: () => { setState({ page: page + 1, open: '' }); toList(); },
      applyRole: S.applyRole, hasRole: S.applyRole !== '', noRole: S.applyRole === '',
      clearRole: () => setState({ applyRole: '' }),
      formOpen: !S.sent, sent: S.sent,
      submit: async (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const data = Object.fromEntries(new FormData(e.currentTarget)); try { setState({ busy: true, error: '' }); await api.lead('career', data); setState({ sent: true, busy: false }); } catch (err) { setState({ busy: false, error: (err as Error).message }); } },
      reset: () => setState({ sent: false }),
    };
  
}
