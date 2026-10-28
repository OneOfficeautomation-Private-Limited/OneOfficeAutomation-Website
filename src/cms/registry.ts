/**
 * Every piece of website content that an admin can edit.
 *
 * This file is shared by the admin screens (to build the edit forms) and by the API
 * (to validate what gets saved), so it must stay free of React and browser code.
 * Default values live in defaults.generated.json (produced from the design files).
 */

export type Option = { value: string; label: string };

export type Field =
  | { type: 'text' | 'textarea' | 'url'; name: string; label: string; hint?: string; max?: number; rows?: number }
  | { type: 'boolean'; name: string; label: string; hint?: string }
  | { type: 'select'; name: string; label: string; hint?: string; options: Option[] }
  | { type: 'ref'; name: string; label: string; hint?: string; ref: string; refValue: string; refLabel: string }
  | { type: 'strings'; name: string; label: string; hint?: string; rows?: number; max?: number }
  | { type: 'items'; name: string; label: string; hint?: string; itemLabel: string; titleField: string; fields: Field[]; max?: number };

export interface Section {
  key: string;
  label: string;
  group: string;
  /** Public page where the content appears. */
  path: string;
  description: string;
  kind: 'doc' | 'list';
  /** For lists: the field shown as each item's title. */
  titleField?: string;
  itemLabel?: string;
  fields: Field[];
  max?: number;
}

const text = (name: string, label: string, o: { hint?: string; max?: number } = {}): Field => ({ type: 'text', name, label, ...o });
const area = (name: string, label: string, o: { hint?: string; max?: number; rows?: number } = {}): Field => ({ type: 'textarea', name, label, rows: 3, ...o });
const link = (name: string, label: string, hint?: string): Field => ({ type: 'url', name, label, hint });
const flag = (name: string, label: string, hint?: string): Field => ({ type: 'boolean', name, label, hint });
const list = (name: string, label: string, o: { hint?: string; rows?: number } = {}): Field => ({ type: 'strings', name, label, ...o });
const items = (name: string, label: string, itemLabel: string, titleField: string, fields: Field[]): Field => ({ type: 'items', name, label, itemLabel, titleField, fields });
const COLORS: Option[] = [
  { value: '#1F74C9', label: 'Blue' },
  { value: '#6D4AD8', label: 'Purple' },
];
const ICON_HINT = 'Advanced: an SVG path for the icon. Leave as is unless you know what you are doing.';
const SLUG_HINT = 'Lowercase letters, numbers and dashes only. Changing it changes the page address.';

export const SECTIONS: Section[] = [
  {
    key: 'site.settings', label: 'Company details, contacts and social links', group: 'Site', path: '/', kind: 'doc',
    description: 'Used in the footer, the Contact and About pages, the legal pages and the announcement bar.',
    fields: [
      text('legalName', 'Legal company name'), text('cin', 'CIN (Corporate Identification Number)'),
      area('address', 'Registered office address', { rows: 2 }),
      text('supportEmail', 'Support email'), text('salesEmail', 'Sales email'),
      text('phoneIndia', 'Phone: India'), text('phoneQatar', 'Phone: Qatar'),
      link('linkedin', 'LinkedIn page URL'), link('facebook', 'Facebook page URL'), link('instagram', 'Instagram profile URL'), link('youtube', 'YouTube channel URL'),
      text('footerTagline', 'Footer tagline'),
      flag('announcementOn', 'Show the announcement bar', 'A thin bar at the very top of every page.'),
      text('announcementText', 'Announcement text'), text('announcementLabel', 'Announcement link label'), link('announcementUrl', 'Announcement link', 'A page address such as /pricing, or a full https:// link.'),
    ],
  },
  {
    key: 'home.text', label: 'Home page text', group: 'Home & Platform', path: '/', kind: 'doc',
    description: 'The headline badge, the intro line, the featured quote and the closing call to action.',
    fields: [text('badge', 'Badge above the headline'), area('heroSub', 'Intro paragraph'), area('ctaText', 'Closing call-to-action text'), area('quoteText', 'Featured quote'), text('quoteRole', 'Quote: role'), text('quoteCompany', 'Quote: company')],
  },
  {
    key: 'home.steps', label: 'Home: “Follow one invoice” steps', group: 'Home & Platform', path: '/', kind: 'list', titleField: 'label', itemLabel: 'step',
    description: 'The interactive walkthrough on the home page.',
    fields: [text('label', 'Step name'), text('tool', 'Product or tool used'), text('title', 'Headline'), area('detail', 'Explanation')],
  },
  {
    key: 'platform.stats', label: 'Platform numbers', group: 'Home & Platform', path: '/platform', kind: 'list', titleField: 'label', itemLabel: 'number',
    description: 'The four numbers shown on the Home and Platform pages (for example 945 ready-made actions).',
    fields: [text('n', 'Number'), text('label', 'Label')],
  },
  {
    key: 'solutions.sectors', label: 'Industries and use cases', group: 'Solutions', path: '/solutions', kind: 'list', titleField: 'k', itemLabel: 'industry',
    description: 'Each industry on the sector wheel, with its headline, use cases and connected systems.',
    fields: [
      text('k', 'Short name', { hint: 'Shown on the wheel and tabs, for example Banking.' }), text('name', 'Full name'),
      text('tA', 'Headline: start'), text('tH', 'Headline: highlighted words'), text('tB', 'Headline: end'),
      items('uses', 'Use cases', 'use case', 't', [text('t', 'Title'), area('d', 'Description')]),
      list('sys', 'Systems agents work with'), text('start', 'Most teams start with'), text('icon', 'Icon', { hint: ICON_HINT }),
    ],
  },
  {
    key: 'customers.stories', label: 'Customer stories', group: 'Customers', path: '/customers', kind: 'list', titleField: 'co', itemLabel: 'story',
    description: 'Each story appears on the Customers page; the first few also feed the home page and the quote wall.',
    fields: [
      text('co', 'Customer', { hint: 'Use a description such as “A retail company” unless you have permission to name them.' }), text('ind', 'Industry', { hint: 'Stories are filtered by this value.' }),
      text('title', 'Headline'), area('does', 'What the agents do'),
      text('s1', 'Big result: number'), text('l1', 'Big result: label'), text('s2', 'Second result: number'), text('l2', 'Second result: label'),
      flag('featured', 'Feature this story', 'Featured stories get a badge, appear first, and feed the hero cards, the scoreboard and the quote wall. 3 or 4 works best.'),
      area('quote', 'Customer quote (optional)'), text('role', 'Quote: person’s role'), text('icon', 'Icon', { hint: ICON_HINT }),
    ],
  },
  {
    key: 'pricing.plans', label: 'Pricing plans', group: 'Pricing', path: '/pricing', kind: 'list', titleField: 'name', itemLabel: 'plan',
    description: 'The plan cards. The same plan names are used as columns in the comparison table.',
    fields: [
      text('id', 'Plan ID', { hint: 'community, starter, business or enterprise. Keep these IDs so the plan picker and comparison table keep working.' }), text('name', 'Name'),
      text('price', 'Price', { hint: 'For example $120, Free or Custom.' }), text('per', 'Billing period', { hint: 'For example / month. Leave empty for Free or Custom.' }),
      text('who', 'Who it is for'), text('cta', 'Button label'), link('href', 'Button link', 'For example /signup?plan=starter or /contact.'),
      flag('popular', 'Highlight as “Most popular”'), list('feats', 'What is included'),
    ],
  },
  { key: 'pricing.compare', label: 'Pricing comparison table', group: 'Pricing', path: '/pricing', kind: 'list', titleField: 'feature', itemLabel: 'row',
    description: 'Type yes for a check mark, leave empty for a dash, or type any text (for example 24/7 with SLA).',
    fields: [text('feature', 'Feature'), text('community', 'Community'), text('starter', 'Starter'), text('business', 'Business'), text('enterprise', 'Enterprise')] },
  { key: 'pricing.faq', label: 'Pricing questions', group: 'Pricing', path: '/pricing', kind: 'list', titleField: 'q', itemLabel: 'question',
    description: 'The accordion at the bottom of the Pricing page.', fields: [text('q', 'Question'), area('a', 'Answer')] },
  { key: 'pricing.text', label: 'Pricing note', group: 'Pricing', path: '/pricing', kind: 'doc', description: 'The small note under the plan cards.', fields: [text('note', 'Note')] },
  {
    key: 'resources.categories', label: 'Resources: help types (by what you need)', group: 'Resources', path: '/resources', kind: 'list', titleField: 'title', itemLabel: 'help type',
    description: 'The “By what you need” options in the Resources menu, footer and landing page, for example Get started or Troubleshooting. Adding one adds it everywhere.',
    fields: [text('id', 'Page address', { hint: SLUG_HINT }), text('title', 'Title'), area('desc', 'Short description'), { type: 'select', name: 'col', label: 'Colour', options: COLORS }, text('icon', 'Icon', { hint: ICON_HINT })],
  },
  {
    key: 'resources.products', label: 'Resources: products (by product)', group: 'Resources', path: '/resources', kind: 'list', titleField: 'title', itemLabel: 'product',
    description: 'The “By product” options, for example One Runner. Every article can belong to one product.',
    fields: [text('id', 'Page address', { hint: SLUG_HINT }), text('title', 'Title'), area('desc', 'Short description'), { type: 'select', name: 'col', label: 'Colour', options: COLORS }, text('icon', 'Icon', { hint: ICON_HINT })],
  },
  {
    key: 'resources.items', label: 'Resources: articles', group: 'Resources', path: '/resources', kind: 'list', titleField: 'title', itemLabel: 'article',
    description: 'Every article. Give each one a help type and, where it applies, a product, so customers can find it either way.',
    fields: [
      text('id', 'Page address', { hint: SLUG_HINT }),
      { type: 'ref', name: 'category', label: 'Help type', ref: 'resources.categories', refValue: 'id', refLabel: 'title' },
      { type: 'ref', name: 'product', label: 'Product (optional)', ref: 'resources.products', refValue: 'id', refLabel: 'title', hint: 'Leave empty for articles that are not about one product.' },
      text('title', 'Title'), area('summary', 'Summary'), text('meta', 'Detail line', { hint: 'For example 8 min read, 45 min recording or Free.' }),
      list('points', 'In this article (bullet points)'),
      area('body', 'Article text', { rows: 12, max: 30000, hint: 'Leave a blank line between paragraphs. Start a line with ## for a heading, or with - for a bullet.' }),
      flag('featured', 'Show on the Resources landing page'),
    ],
  },
  {
    key: 'partners.types', label: 'Partner types', group: 'Partners', path: '/partners', kind: 'list', titleField: 'k', itemLabel: 'partner type',
    description: 'The three partner types and what each one gets.',
    fields: [text('k', 'Name'), text('who', 'Who it is for'), area('do', 'What partners do'), list('get', 'What partners get'), text('icon', 'Icon', { hint: ICON_HINT })],
  },
  { key: 'partners.process', label: 'Partner procedure: how to become a partner', group: 'Partners', path: '/partners', kind: 'list', titleField: 'title', itemLabel: 'step',
    description: 'The step-by-step procedure shown on the Partners page. The steps are numbered automatically.',
    fields: [text('title', 'Step title'), text('time', 'How long it takes', { hint: 'For example 1 to 3 days.' }), area('desc', 'What happens'), area('you', 'What the partner does'), area('we', 'What we do'), text('prepare', 'What to have ready (optional)')] },
  { key: 'partners.benefits', label: 'Partner benefits', group: 'Partners', path: '/partners', kind: 'list', titleField: 't', itemLabel: 'benefit', description: 'The “Every partner gets” cards.', fields: [text('t', 'Title'), area('d', 'Description')] },
  { key: 'partners.tiers', label: 'Partner levels', group: 'Partners', path: '/partners', kind: 'list', titleField: 'n', itemLabel: 'level', description: 'The staircase of program levels.',
    fields: [text('n', 'Name'), text('tag', 'Tagline'), area('desc', 'Description'), list('perks', 'Perks')] },
  {
    key: 'about.text', label: 'About: mission and vision', group: 'About', path: '/about', kind: 'doc',
    description: 'Each statement has a highlighted part. Write the words before it, the highlighted words, and the words after it.',
    fields: [text('missionA', 'Mission: start'), text('missionH', 'Mission: highlighted words'), text('missionB', 'Mission: end'), text('visionA', 'Vision: start'), text('visionH', 'Vision: highlighted words'), text('visionB', 'Vision: end')],
  },
  { key: 'about.values', label: 'About: what we believe', group: 'About', path: '/about', kind: 'list', titleField: 't', itemLabel: 'value', description: 'The four tilted cards.', fields: [text('t', 'Title'), area('d', 'Description')] },
  { key: 'about.journey', label: 'About: our journey', group: 'About', path: '/about', kind: 'list', titleField: 't', itemLabel: 'milestone', description: 'The timeline.', fields: [text('y', 'Year or label'), text('t', 'Title'), area('d', 'Description')] },
  { key: 'about.teams', label: 'About: the teams', group: 'About', path: '/about', kind: 'list', titleField: 'n', itemLabel: 'team', description: 'The team cards.', fields: [text('n', 'Team name'), area('d', 'Description')] },
  {
    key: 'careers.roles', label: 'Open roles', group: 'Careers', path: '/careers', kind: 'list', titleField: 'title', itemLabel: 'role',
    description: 'Every open position. Remove a role when it is filled.',
    fields: [text('id', 'Role ID', { hint: SLUG_HINT }), text('title', 'Job title'), text('team', 'Team'), text('place', 'Location', { hint: 'For example India or Doha, Qatar.' }), text('type', 'Type', { hint: 'For example Full-time.' }), area('about', 'About the role'), list('does', 'What you will do'), list('needs', 'What we look for')],
  },
  { key: 'careers.steps', label: 'Careers: how we hire', group: 'Careers', path: '/careers', kind: 'list', titleField: 't', itemLabel: 'step', description: 'The hiring process steps.', fields: [text('t', 'Step'), text('d', 'Description')] },
  { key: 'careers.why', label: 'Careers: why join us', group: 'Careers', path: '/careers', kind: 'list', titleField: 't', itemLabel: 'reason', description: 'The short reasons under the headline.', fields: [text('t', 'Title'), area('d', 'Description')] },
  { key: 'careers.text', label: 'Careers: intro text', group: 'Careers', path: '/careers', kind: 'doc', description: 'The paragraph under the Careers headline.', fields: [area('sub', 'Intro paragraph')] },
  {
    key: 'legal.privacy', label: 'Privacy policy', group: 'Legal', path: '/privacy', kind: 'doc',
    description: 'You can use {legalName}, {cin}, {address}, {website}, {supportEmail}, {phoneIndia} and {phoneQatar}; they are filled in from the company details.',
    fields: [text('updated', 'Last updated'), items('sections', 'Sections', 'section', 'heading', [text('heading', 'Heading'), { type: 'select', name: 'kind', label: 'Format', options: [{ value: 'p', label: 'Paragraphs' }, { value: 'ul', label: 'Bullet list' }] }, list('items', 'Paragraphs or bullets', { rows: 4 })])],
  },
  {
    key: 'legal.terms', label: 'Terms of service', group: 'Legal', path: '/terms', kind: 'doc',
    description: 'You can use {legalName}, {cin}, {address}, {website}, {supportEmail}, {phoneIndia} and {phoneQatar}; they are filled in from the company details.',
    fields: [text('updated', 'Last updated'), items('sections', 'Sections', 'section', 'heading', [text('heading', 'Heading'), { type: 'select', name: 'kind', label: 'Format', options: [{ value: 'p', label: 'Paragraphs' }, { value: 'ul', label: 'Bullet list' }] }, list('items', 'Paragraphs or bullets', { rows: 4 })])],
  },
];

export const SECTION_BY_KEY: Record<string, Section> = Object.fromEntries(SECTIONS.map((s) => [s.key, s]));
export const GROUPS: string[] = SECTIONS.map((s) => s.group).filter((g, i, a) => a.indexOf(g) === i);

export class ValidationError extends Error {}

const MAX_TEXT = 600;
const MAX_AREA = 20000;
const LINK = /^(https?:\/\/|\/|#|mailto:|tel:)/i;

function cleanString(v: unknown, max: number, label: string): string {
  const s = typeof v === 'string' ? v : v == null ? '' : String(v);
  if (s.length > max) throw new ValidationError(`“${label}” is too long (the limit is ${max} characters).`);
  return s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
}

function cleanObject(fields: Field[], value: unknown, path: string): Record<string, unknown> {
  const src = (value && typeof value === 'object' && !Array.isArray(value) ? value : {}) as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    const v = src[f.name];
    const label = path ? `${path} › ${f.label}` : f.label;
    switch (f.type) {
      case 'text': out[f.name] = cleanString(v, f.max ?? MAX_TEXT, label); break;
      case 'textarea': out[f.name] = cleanString(v, f.max ?? MAX_AREA, label); break;
      case 'url': {
        const s = cleanString(v, 600, label).trim();
        if (s && !LINK.test(s)) throw new ValidationError(`“${label}” must start with https://, /, mailto: or tel:.`);
        out[f.name] = s;
        break;
      }
      case 'boolean': out[f.name] = v === true; break;
      case 'select': {
        const s = cleanString(v, 200, label);
        out[f.name] = f.options.some((o) => o.value === s) ? s : f.options[0].value;
        break;
      }
      case 'ref': out[f.name] = cleanString(v, 200, label).trim(); break;
      case 'strings': {
        const arr = Array.isArray(v) ? v : [];
        if (arr.length > (f.max ?? 100)) throw new ValidationError(`“${label}” has too many entries.`);
        out[f.name] = arr.map((x) => cleanString(x, MAX_AREA, label));
        break;
      }
      case 'items': {
        const arr = Array.isArray(v) ? v : [];
        if (arr.length > (f.max ?? 100)) throw new ValidationError(`“${label}” has too many entries.`);
        out[f.name] = arr.map((x, i) => cleanObject(f.fields, x, `${f.itemLabel} ${i + 1}`));
        break;
      }
    }
  }
  return out;
}

/** Validates and cleans a value for a section. Unknown fields are dropped. Throws ValidationError. */
export function sanitize(section: Section, value: unknown): unknown {
  if (section.kind === 'doc') return cleanObject(section.fields, value, '');
  if (!Array.isArray(value)) throw new ValidationError('Expected a list.');
  if (value.length > (section.max ?? 300)) throw new ValidationError('This list has too many entries.');
  return value.map((x, i) => cleanObject(section.fields, x, `${section.itemLabel ?? 'item'} ${i + 1}`));
}

/** A blank object for a list of fields (used when adding a new item in the admin). */
export function blankFor(fields: Field[]): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const f of fields) {
    o[f.name] = f.type === 'boolean' ? false : f.type === 'strings' || f.type === 'items' ? [] : f.type === 'select' ? f.options[0].value : '';
  }
  return o;
}
