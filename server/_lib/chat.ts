// The website assistant: a knowledge-base bot. It uses no AI model and sends nothing to any outside service.
// It understands a question in two ways: by intent (pricing, contact, demo, security… answered from the live site content, so they never go stale),
// and by searching every doc, FAQ, solution and story. When it is not sure, it says so and offers to connect the visitor with the team.
import defaults from '../../src/cms/defaults.generated.json';
import core from '../../src/cms/core.defaults.json';
import type { Env } from './http';
import { allow, json, readJson } from './http';
import { publicContent } from './seoPage';
import { libraryPassages } from './library';

export type ChatAction = null | 'lead' | 'plans' | 'handoff';
export type ChatReply = {
  reply: string;
  sources: { title: string; to: string }[];
  suggestions: string[];
  action: ChatAction;
  answered: boolean;
  intent: string;
  plans?: { id: string; name: string; price: string; per: string; who: string; href: string }[];
  contact?: { sales: string; support: string; phones: string[] };
};

// ---------- text helpers ----------
const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9$%+#\s.'-]/g, ' ').replace(/\s+/g, ' ').trim();
const STOP = new Set(('a an the and or but if so to of in on at by for with from as is are was were be been being am do does did done can could should would will shall may might must i me my we our us you your it its this that these those there here what which who whom whose how when where why not no yes please tell show give about into than then also just any some more most much many very really kindly want need like know get got have has had data support').split(' '));
// Words that mean the same thing for search purposes, folded to one canonical word.
const SYN: Record<string, string> = {
  cost: 'price', pricing: 'price', prices: 'price', pay: 'price', fee: 'price', fees: 'price', subscription: 'price', licence: 'price', license: 'price', expensive: 'price', cheap: 'price',
  safe: 'secur', secure: 'secur', security: 'secur', privacy: 'secur', encrypt: 'secur', encryption: 'secur', gdpr: 'secur', compliance: 'secur', soc: 'secur', iso: 'secur', vulnerability: 'secur',
  onprem: 'host', premise: 'host', premises: 'host', selfhost: 'host', hosting: 'host', hosted: 'host', server: 'host', servers: 'host', cloud: 'host',
  bot: 'agent', bots: 'agent', robot: 'agent', robots: 'agent', rpa: 'agent', automate: 'automat', automation: 'automat', automating: 'automat', automated: 'automat',
  login: 'sign', signin: 'sign', register: 'sign', signup: 'sign', account: 'sign',
  install: 'setup', installation: 'setup', installing: 'setup', configure: 'setup', configuration: 'setup', deploy: 'setup', deployment: 'setup',
  connector: 'integrat', connectors: 'integrat', integration: 'integrat', integrations: 'integrat', integrate: 'integrat', connect: 'integrat', api: 'integrat',
  invoice: 'invoic', invoices: 'invoic', invoicing: 'invoic', payable: 'invoic', payables: 'invoic',
  job: 'career', jobs: 'career', hiring: 'career', vacancy: 'career', vacancies: 'career', career: 'career', careers: 'career', role: 'career', roles: 'career',
  trial: 'trial', demo: 'demo', webinar: 'event', webinars: 'event', event: 'event', events: 'event', workshop: 'event',
  train: 'learn', training: 'learn', course: 'learn', courses: 'learn', tutorial: 'learn', tutorials: 'learn', learn: 'learn', certification: 'learn',
  doc: 'docs', docs: 'docs', documentation: 'docs', manual: 'docs', guide: 'docs',
};
const stem = (w: string) => {
  if (SYN[w]) return SYN[w];
  let s = w;
  if (s.length > 4) s = s.replace(/ies$/, 'y').replace(/(ing|ed|es|s)$/, '');
  return SYN[s] ?? s;
};
const terms = (text: string) => [...new Set(norm(text).split(' ').filter((w) => w.length > 1 && !STOP.has(w)).map(stem))];
const clip = (text: string, max: number) => {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  return end > max * 0.5 ? cut.slice(0, end + 1) : `${cut.replace(/\s+\S*$/, '')}…`;
};
const strip = (s: string) => s.replace(/<[^>]*>/g, ' ').replace(/[*_#`>]/g, '').replace(/\s+/g, ' ').trim();

// ---------- the site's own content (published overrides over the built-in defaults), cached briefly ----------
type Row = Record<string, unknown>;
let contentCache: { at: number; data: Record<string, unknown> } | null = null;
async function content(env: Env): Promise<Record<string, unknown>> {
  if (contentCache && Date.now() - contentCache.at < 30_000) return contentCache.data;
  const base = { ...(defaults as Record<string, unknown>), ...(core as Record<string, unknown>) };
  let pub: Record<string, unknown> = {};
  try { pub = await publicContent(env); } catch { /* database unreachable: the built-in content still works */ }
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(pub)) {
    const b = base[k];
    out[k] = v && typeof v === 'object' && !Array.isArray(v) && b && typeof b === 'object' && !Array.isArray(b) ? { ...(b as object), ...(v as object) } : v;
  }
  contentCache = { at: Date.now(), data: out };
  return out;
}
const arr = (c: Record<string, unknown>, k: string) => (Array.isArray(c[k]) ? (c[k] as Row[]) : []);
const str = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v));

// ---------- the search index: library articles and FAQs, plus the website's own content ----------
type Doc = { kind: string; title: string; to: string; sum: string; body: string; tt: Map<string, number>; st: Map<string, number>; bt: Map<string, number> };
const tf = (text: string) => { const m = new Map<string, number>(); for (const w of terms(text)) m.set(w, (m.get(w) ?? 0) + 1); for (const w of norm(text).split(' ')) { const s = stem(w); if (s && !STOP.has(w) && m.has(s)) m.set(s, Math.min(9, (m.get(s) ?? 0))); } return m; };
const countTerms = (text: string) => { const m = new Map<string, number>(); for (const w of norm(text).split(' ')) { if (w.length < 2 || STOP.has(w)) continue; const s = stem(w); m.set(s, (m.get(s) ?? 0) + 1); } return m; };
let indexCache: { at: number; docs: Doc[]; df: Map<string, number> } | null = null;
async function index(env: Env) {
  if (indexCache && Date.now() - indexCache.at < 60_000) return indexCache;
  const c = await content(env);
  const raw: { kind: string; title: string; to: string; sum: string; body: string }[] = [];
  try {
    for (const d of await libraryPassages(env)) raw.push({ kind: d.kind, title: d.title, to: d.to, sum: d.sub, body: d.r });
  } catch { /* library unavailable: the website content below still answers */ }
  for (const f of arr(c, 'pricing.faq')) raw.push({ kind: 'Pricing', title: str(f.q), to: '/pricing#faq', sum: '', body: str(f.a) });
  for (const f of arr(c, 'resources.faqs')) raw.push({ kind: 'FAQ', title: str(f.q), to: '/resources/faqs', sum: '', body: str(f.a) });
  for (const p of arr(c, 'platform.parts')) raw.push({ kind: 'Platform', title: str(p.name), to: '/platform', sum: str(p.intro), body: (Array.isArray(p.feats) ? (p.feats as string[]) : []).join('. ') });
  for (const p of arr(c, 'platform.security')) raw.push({ kind: 'Security', title: str(p.t), to: '/trust', sum: '', body: str(p.d) });
  for (const s of arr(c, 'solutions.sectors')) raw.push({ kind: 'Industry', title: str(s.name), to: `/solutions/${str(s.k).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, sum: `${str(s.tA)}${str(s.tH)}${str(s.tB)}`, body: [(Array.isArray(s.uses) ? (s.uses as Row[]).map((u) => `${str(u.t)}: ${str(u.d)}`) : []).join('. '), `Works with ${(Array.isArray(s.sys) ? (s.sys as string[]) : []).join(', ')}`].join('. ') });
  for (const s of arr(c, 'customers.stories')) raw.push({ kind: 'Customer story', title: str(s.title), to: '/customers', sum: str(s.does), body: `${str(s.s1)} ${str(s.l1)}. ${str(s.s2)} ${str(s.l2)}. ${str(s.quote)}` });
  for (const p of arr(c, 'partners.types')) raw.push({ kind: 'Partners', title: str(p.k), to: '/partners', sum: str(p.who), body: `${str(p.do)} ${(Array.isArray(p.get) ? (p.get as string[]) : []).join('. ')}` });
  for (const r of arr(c, 'careers.roles')) raw.push({ kind: 'Careers', title: str(r.title), to: `/careers/${str(r.id)}`, sum: `${str(r.team)}, ${str(r.place)}, ${str(r.type)}`, body: str(r.about) });
  for (const s of arr(c, 'contact.steps')) raw.push({ kind: 'Demo', title: `Book a demo: ${str(s.t)}`, to: '/contact', sum: '', body: str(s.d) });
  const trust = (c['page.trust'] ?? {}) as { items?: Row[]; certs?: Row[] };
  for (const t of trust.items ?? []) raw.push({ kind: 'Security', title: str(t.title), to: '/trust', sum: '', body: str(t.text) });
  const docs: Doc[] = raw.filter((d) => d.title).map((d) => ({ ...d, kind: /The full article is being prepared/.test(d.body) ? `${d.kind} (in progress)` : d.kind, sum: strip(d.sum), body: /The full article is being prepared/.test(d.body) ? '' : strip(d.body).slice(0, 6000), tt: countTerms(d.title), st: countTerms(d.sum), bt: countTerms(d.body) }));
  const df = new Map<string, number>();
  for (const d of docs) for (const w of new Set([...d.tt.keys(), ...d.st.keys(), ...d.bt.keys()])) df.set(w, (df.get(w) ?? 0) + 1);
  indexCache = { at: Date.now(), docs, df };
  return indexCache;
}
void tf;

function search(idx: Awaited<ReturnType<typeof index>>, question: string) {
  const q = terms(question);
  if (!q.length) return [];
  const N = idx.docs.length;
  const scored = idx.docs.map((d) => {
    let score = 0, matched = 0, inTitle = 0;
    for (const w of q) {
      const idf = Math.log(1 + N / ((idx.df.get(w) ?? 0) + 0.5));
      const a = d.tt.get(w) ?? 0, b = d.st.get(w) ?? 0, c = d.bt.get(w) ?? 0;
      if (a + b + c > 0) matched++;
      if (a) inTitle++;
      score += idf * (Math.min(a, 2) * 5 + Math.min(b, 2) * 2 + Math.min(c, 3));
    }
    const ratio = matched / q.length;
    return { d, score, ratio, inTitle };
  }).filter((x) => x.score > 0);
  const need = q.length <= 2 ? 1 : 0.5;
  return scored.filter((x) => x.ratio >= need && (q.length > 1 || x.inTitle > 0 || x.score >= 8)).sort((a, b) => b.score - a.score || b.ratio - a.ratio).slice(0, 4);
}

// ---------- intents ----------
const has = (t: string, re: RegExp) => re.test(t);
type Plan = { id: string; name: string; price: string; per: string; who: string; href: string };

function plansOf(c: Record<string, unknown>): Plan[] {
  return arr(c, 'pricing.plans').map((p) => ({ id: str(p.id), name: str(p.name), price: str(p.price), per: str(p.per), who: str(p.who), href: str(p.href) }));
}
function planFeatures(c: Record<string, unknown>, id: string) {
  const out: string[] = [];
  for (const r of arr(c, 'pricing.compare')) {
    const v = str(r[id]);
    if (v === 'yes') out.push(str(r.feature)); else if (v && v !== 'no') out.push(`${str(r.feature)}: ${v}`);
  }
  return out;
}
function office(c: Record<string, unknown>) {
  const s = (c['site.settings'] ?? {}) as { offices?: Row[] };
  const o = s.offices ?? [];
  const head = o.find((x) => x.head) ?? o[0] ?? {};
  return {
    sales: str(head.salesEmail) || str(head.supportEmail), support: str(head.supportEmail) || str(head.salesEmail),
    phones: o.filter((x) => str(x.phone)).map((x) => `${str(x.country)}: ${str(x.phone)}`),
    address: str(head.address),
  };
}

const SUGGEST_HOME = ['What does the platform do?', 'How much does it cost?', 'Help me choose a plan', 'Is my data secure?', 'Book a demo'];

export async function answer(env: Env, textIn: string): Promise<ChatReply> {
  const raw = textIn.replace(/\s+/g, ' ').trim().slice(0, 300);
  const t = norm(raw);
  const c = await content(env);
  const plans = plansOf(c);
  const off = office(c);
  const reply = (r: Partial<ChatReply> & { reply: string; intent: string }): ChatReply => ({ sources: [], suggestions: [], action: null, answered: true, ...r });

  if (t.length < 2) return reply({ intent: 'empty', reply: 'Ask me anything about the platform, pricing, set-up or how to get started.', suggestions: SUGGEST_HOME });

  if (has(t, /^(hi|hello|hey|hiya|namaste|hola|good (morning|afternoon|evening))\b/) && t.length < 30) {
    return reply({ intent: 'greeting', reply: 'Hello! I’m the OneOffice Assistant. I can answer questions about the platform, pricing, security and set-up, or connect you with our team.', suggestions: SUGGEST_HOME });
  }
  if (has(t, /\b(thanks|thank you|thx|cheers|appreciate)\b/)) return reply({ intent: 'thanks', reply: 'You’re welcome! Anything else I can help with?', suggestions: ['Book a demo', 'How much does it cost?'] });
  if (has(t, /^(bye|goodbye|see you|that is all|that's all)\b/)) return reply({ intent: 'bye', reply: 'Goodbye! If you’d like a walkthrough later, you can book a demo any time.', suggestions: ['Book a demo'] });
  if (has(t, /\b(who are you|are you (a )?(bot|human|real|robot|ai|person)|your name|am i talking to)\b/)) {
    return reply({ intent: 'identity', reply: 'I’m an automated assistant for this website, not a live person, and I don’t use an AI chat service. I answer from our own docs, FAQs and product pages. For anything I can’t answer, I’ll connect you with the team.', suggestions: ['Talk to a person', 'What does the platform do?'] });
  }
  if (has(t, /\b(talk|speak|chat|connect|transfer|escalate)\b.{0,20}\b(human|person|agent|someone|representative|rep|sales|team|expert|support|staff)\b|\breal person\b|\bhuman\b|\bcustomer (care|service)\b|\bcall me\b|\bcontact sales\b|\bsales team\b/)) {
    return reply({ intent: 'human', action: 'handoff', reply: 'Of course. Our team replies within one business day, and a demo is the fastest way to see the platform on your own process.', contact: { sales: off.sales, support: off.support, phones: off.phones }, suggestions: ['Book a demo'] });
  }
  if (has(t, /\b(book|schedule|arrange|request|get|want|need|see|like)\b.{0,25}\bdemo\b|\bdemo\b/) && !has(t, /\b(video|recording|webinar)\b/)) {
    return reply({ intent: 'demo', action: 'lead', reply: 'Happy to set that up. A demo is 30 minutes: we learn your process, show a live agent built for something similar, estimate the time you could save, and recommend a plan. Share a few details and the team will be in touch.', suggestions: ['What happens in a demo?', 'How much does it cost?'] });
  }
  if (has(t, /\b(choose|pick|select|recommend|which|right|best|suit|fit)\b.{0,25}\b(plan|edition|pricing|tier|package)\b|\bhelp me (choose|decide|pick)\b/)) {
    return reply({ intent: 'plan-finder', action: 'plans', plans, reply: 'Let me point you to the right plan. Who will be using it?', sources: [{ title: 'Compare every plan', to: '/pricing#compare' }] });
  }
  const named = plans.find((p) => new RegExp(`\\b${p.name.toLowerCase()}\\b`).test(t) && has(t, /\b(plan|edition|price|cost|include|includes|get|features?|offer|offers|what)\b/));
  if (named) {
    const feats = planFeatures(c, named.id);
    const priceLine = named.per ? `${named.price} ${named.per}` : named.price;
    return reply({ intent: 'plan-detail', reply: `**${named.name}** (${priceLine}) is ${named.who.charAt(0).toLowerCase()}${named.who.slice(1)}.${feats.length ? `\n\nIncluded:\n${feats.slice(0, 8).map((f) => `- ${f}`).join('\n')}${feats.length > 8 ? '\n- and more' : ''}` : ''}`, sources: [{ title: 'Compare every plan', to: '/pricing#compare' }, { title: `${named.name}: get started`, to: named.href || '/pricing' }], suggestions: ['Help me choose a plan', 'Book a demo'] });
  }
  if (has(t, /\b(price|pricing|cost|costs|how much|plans?|fee|fees|subscription|licen[sc]e|free trial|trial|free|discount|billing)\b/) && !has(t, /\b(cost saving|savings)\b/)) {
    const trial = arr(c, 'pricing.faq').find((f) => /trial/i.test(str(f.q)));
    const lines = plans.map((p) => `- **${p.name}**: ${p.per ? `${p.price} ${p.per}` : p.price}. ${p.who}.`).join('\n');
    return reply({ intent: 'pricing', reply: `Here are the plans:\n${lines}\n\n${strip(str((c['pricing.text'] as Row | undefined)?.note))}${trial ? ` ${strip(str(trial.a))}` : ''}`.trim(), sources: [{ title: 'Pricing and comparison', to: '/pricing' }, { title: 'Savings calculator', to: '/pricing#calculator' }], suggestions: ['Help me choose a plan', 'Is there a free plan?', 'Book a demo'] });
  }
  if (has(t, /\b(contact|phone|call|email|e-mail|address|office|offices|location|located|where are you|reach you|support number|whatsapp)\b/)) {
    return reply({ intent: 'contact', action: 'handoff', contact: { sales: off.sales, support: off.support, phones: off.phones }, reply: `You can reach us here:\n- Sales: ${off.sales}\n- Support: ${off.support}\n${off.phones.map((p) => `- ${p}`).join('\n')}\n${off.address ? `- Registered office: ${off.address}` : ''}`.trim(), sources: [{ title: 'Contact us', to: '/contact' }], suggestions: ['Book a demo'] });
  }
  if (has(t, /\b(weather|joke|funny|cricket|football|movie|song|recipe|horoscope|bitcoin|crypto|stock price|president|prime minister|lottery|dating)\b/)) {
    return reply({ intent: 'out-of-scope', answered: false, reply: 'I can only help with OneOfficeAutomation: the platform, pricing, security, set-up and getting started. Is there something about that I can help with?', suggestions: SUGGEST_HOME });
  }
  if (has(t, /\b(secur|safe|safety|privacy|private|encrypt|gdpr|soc ?2|iso ?27001|complian|certif|audit|breach|confidential)\w*\b/)) {
    const items = arr(c, 'platform.security').slice(0, 5);
    return reply({ intent: 'security', reply: `Security is built in, not added on:\n${items.map((i) => `- **${str(i.t)}**: ${strip(str(i.d))}`).join('\n')}`, sources: [{ title: 'Trust and security', to: '/trust' }], suggestions: ['Do you support on-premise hosting?', 'Book a demo'] });
  }
  if (has(t, /\b(hiring|career|careers|job|jobs|vacanc\w*|openings?|work for you|join (your|the) team|internship)\b/)) {
    const roles = arr(c, 'careers.roles').slice(0, 6);
    return reply({ intent: 'careers', reply: roles.length ? `We’re hiring. Open roles:\n${roles.map((r) => `- **${str(r.title)}** (${str(r.team)}, ${str(r.place)})`).join('\n')}` : 'You can see our open roles and apply on the careers page.', sources: [{ title: 'Careers', to: '/careers' }] });
  }
  if (has(t, /\b(forgot|reset|change|recover)\b.{0,15}\bpassword\b|\bpassword\b.{0,15}\b(reset|forgot|recover)/)) {
    return reply({ intent: 'password', reply: 'You can reset your password from the sign-in page: choose **Forgot password**, enter your email and we’ll send a link. If the email doesn’t arrive, check your spam folder or contact support.', sources: [{ title: 'Reset your password', to: '/forgot' }, { title: 'Sign in', to: '/signin' }], suggestions: ['Talk to a person'] });
  }
  if (has(t, /\b(industr\w*|sectors?|banking|bank|insurance|healthcare|hospital|retail|manufactur\w*|logistics|government|telecom|education|energy)\b/) && has(t, /\b(serve|serves|work|support|solutions?|industr\w*|sectors?|for|in|use)\b/)) {
    const sec = arr(c, 'solutions.sectors');
    const hit = sec.find((x) => t.includes(str(x.name).toLowerCase().split(/[ &,]+/)[0]) || t.includes(str(x.k).toLowerCase()));
    if (hit) {
      const uses = (Array.isArray(hit.uses) ? (hit.uses as Row[]) : []).slice(0, 4);
      return reply({ intent: 'industry', reply: `**${str(hit.name)}**\n${strip(`${str(hit.tA)}${str(hit.tH)}${str(hit.tB)}`)}\n${uses.map((u) => `- **${str(u.t)}**: ${strip(str(u.d))}`).join('\n')}`, sources: [{ title: str(hit.name), to: `/solutions/${str(hit.k).toLowerCase().replace(/[^a-z0-9]+/g, '-')}` }, { title: 'All solutions', to: '/solutions' }], suggestions: ['Book a demo', 'How much does it cost?'] });
    }
    return reply({ intent: 'industries', reply: `We work with ${sec.map((x) => str(x.name)).join(', ')}.`, sources: [{ title: 'Solutions by industry', to: '/solutions' }], suggestions: ['Book a demo'] });
  }
  if (has(t, /\b(partner|partners|reseller|resell|channel|referral|affiliate|become a partner)\b/)) {
    const types = arr(c, 'partners.types');
    return reply({ intent: 'partners', reply: `We work with partners in a few ways:\n${types.map((p) => `- **${str(p.k)}**: ${strip(str(p.who))}`).join('\n')}`, sources: [{ title: 'Partner programme', to: '/partners' }], suggestions: ['Talk to a person'] });
  }
  if (has(t, /\b(training|course|courses|learn|learning|tutorial|tutorials|certif\w*|academy|webinar|webinars|workshop|workshops|events?)\b/)) {
    return reply({ intent: 'learning', reply: 'There are several ways to learn:\n- **Training**: guided courses and hands-on labs\n- **Docs**: step-by-step guides for every product\n- **Webinars and events**: live sessions and recordings\n- **Community**: ask questions and share what you’ve built', sources: [{ title: 'Training', to: '/resources/training' }, { title: 'Documentation', to: '/resources/docs' }, { title: 'Webinars and events', to: '/resources/events' }], suggestions: ['Book a demo'] });
  }
  if (has(t, /\binvoic\w*|\baccounts? payable\b|\bpurchase orders?\b|\bexpens\w*\b|\bkyc\b|\bonboarding\b/)) {
    return reply({ intent: 'usecase', reply: 'Yes, document-heavy back-office work like invoices, KYC, onboarding and claims is exactly what the agents are built for: they read the documents, enter the data in your systems and send exceptions to a person to approve. The best way to see it on your own process is a short demo.', sources: [{ title: 'Solutions by industry', to: '/solutions' }, { title: 'The platform', to: '/platform' }], suggestions: ['Book a demo', 'How much does it cost?'] });
  }
  if (has(t, /\b(what (is|are|does)|tell me about|explain|overview|introduce)\b.{0,30}\b(oneofficeautomation|ooa|your (company|platform|product|software|tool)|the platform|this (platform|product))\b|\bwhat do you (do|offer|sell)\b|\bwhat does the platform do\b/)) {
    const parts = arr(c, 'platform.parts');
    return reply({ intent: 'overview', reply: `OneOfficeAutomation is an automation platform where AI agents finish back-office work: reading documents, using your applications and passing exceptions to people. It has four parts:\n${parts.map((p) => `- **${str(p.name)}** (${str(p.verb)}): ${str(p.intro)}`).join('\n')}`, sources: [{ title: 'The platform', to: '/platform' }, { title: 'Solutions by industry', to: '/solutions' }], suggestions: ['Which industries do you serve?', 'How much does it cost?', 'Is my data secure?'] });
  }

  // Everything else: search the docs, FAQs, solutions, stories and roles.
  const idx = await index(env);
  const hits = search(idx, raw);
  const top = hits[0];
  const confident = !!top && (top.score >= 7 || (top.ratio === 1 && top.score >= 4));
  if (confident) {
    const d = top.d;
    const isQa = d.kind === 'FAQ' || d.kind === 'Pricing' || /^Troubleshooting/.test(d.kind);
    const stub = /in progress/.test(d.kind);
    const text = stub ? `${clip(d.sum, 300)} The full guide is still being written; our solution engineers can walk you through it.` : isQa ? clip(d.body || d.sum, 520) : clip(d.sum && d.body ? `${d.sum}. ${d.body}` : d.sum || d.body, 460);
    const heading = isQa ? `**${d.title}**\n` : d.kind === 'Industry' || d.kind === 'Platform' || d.kind === 'Partners' || d.kind === 'Careers' || d.kind === 'Customer story' ? `**${d.title}**\n` : '';
    const seen = new Set<string>();
    const sources = hits.map((h) => ({ title: h.d.title, to: h.d.to })).filter((s) => (seen.has(s.to) ? false : (seen.add(s.to), true))).slice(0, 3);
    return reply({ intent: `search:${d.kind}`, reply: `${heading}${text}`.trim(), sources, suggestions: ['Book a demo', 'Talk to a person'] });
  }
  // Not sure: say so, keep the question so the team can see what people ask that the site does not answer yet, and offer a person.
  try {
    const q = norm(raw).slice(0, 190);
    const stamp = new Date().toISOString();
    if (q.length >= 3) await env.DB.prepare('INSERT INTO search_misses (q, count, first_at, last_at) VALUES (?1, 1, ?2, ?2) ON DUPLICATE KEY UPDATE count = count + 1, last_at = VALUES(last_at)').bind(q, stamp).run();
  } catch { /* logging is best-effort */ }
  const near = hits.slice(0, 3).map((h) => ({ title: h.d.title, to: h.d.to }));
  return reply({ intent: 'unknown', answered: false, action: 'handoff', contact: { sales: off.sales, support: off.support, phones: off.phones }, reply: `I don’t have a reliable answer to that yet, and I’d rather not guess. ${near.length ? 'These pages may help, and our' : 'Our'} team can answer it properly; they reply within one business day.`, sources: near, suggestions: ['Book a demo', 'What does the platform do?'] });
}

// ---------- HTTP ----------
export async function handleChat(request: Request, env: Env): Promise<Response> {
  if (!(await allow(env, request, 'chat', 40, 600))) return json({ error: 'You’re asking quickly. Please wait a moment and try again.' }, 429);
  const b = (await readJson(request)) as { text?: unknown } | null;
  const text = typeof b?.text === 'string' ? b.text : '';
  if (!text.trim()) return json({ error: 'Type a question first.' }, 400);
  if (text.length > 1000) return json({ error: 'Please keep your question under 300 characters.' }, 400);
  return json(await answer(env, text));
}

// A thumbs-down: keep the question so the team can see which answers missed.
export async function handleChatFeedback(request: Request, env: Env): Promise<Response> {
  if (!(await allow(env, request, 'chat-fb', 30, 600))) return json({ error: 'Too many requests.' }, 429);
  const b = (await readJson(request)) as { text?: unknown } | null;
  const q = typeof b?.text === 'string' ? norm(b.text).slice(0, 190) : '';
  if (q.length >= 3) {
    try {
      const stamp = new Date().toISOString();
      await env.DB.prepare('INSERT INTO search_misses (q, count, first_at, last_at) VALUES (?1, 1, ?2, ?2) ON DUPLICATE KEY UPDATE count = count + 1, last_at = VALUES(last_at)').bind(q, stamp).run();
    } catch { /* best-effort */ }
  }
  return json({ ok: true });
}
