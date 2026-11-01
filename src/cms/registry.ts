/**
 * Every piece of website content that an admin can edit.
 *
 * This file is shared by the admin screens (to build the edit forms) and by the API
 * (to validate what gets saved), so it must stay free of React and browser code.
 * Default values live in defaults.generated.json (produced from the design files).
 */

import { ICON_OPTIONS } from './icons';
import { TZ_OPTIONS } from './time';
import { SOCIAL_PLATFORMS } from './siteSettings';
import { TOOL_OPTIONS } from './analytics';

export type Option = { value: string; label: string };

export type Field =
  | { type: 'text' | 'textarea' | 'url'; name: string; label: string; hint?: string; max?: number; rows?: number }
  | { type: 'boolean'; name: string; label: string; hint?: string }
  /** A heading that splits a long form into sections (shows only in the admin; stores nothing). */
  | { type: 'section'; name: string; label: string; hint?: string }
  /** An image from the media library, stored as its site address (/media/…). */
  | { type: 'image'; name: string; label: string; hint?: string }
  /** Any file from the media library (images or PDFs), stored as its site address. */
  | { type: 'file'; name: string; label: string; hint?: string }
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
  /** Private sections are never sent to the public website; only the admin and the server read them. */
  private?: boolean;
  /** Stored one item at a time in the Resources library (/admin/library), not as one list. */
  library?: boolean;
  /** A settings screen (not words on one page): no “Open the page” or “Preview on the website”. */
  settings?: boolean;
}

const image = (name: string, label: string, hint?: string): Field => ({ type: 'image', name, label, ...(hint ? { hint } : {}) });
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
      { type: 'section', name: '_offices', label: 'Offices and legal entities', hint: 'One entry per country or company. The head office’s details appear in legal pages; every office is listed in the footer and on the Contact and About pages.' },
      { type: 'items', name: 'offices', label: 'Offices', itemLabel: 'office', titleField: 'country', max: 20, fields: [
        text('country', 'Country', { hint: 'For example India or Qatar.' }), text('legalName', 'Legal company name', { hint: 'For example OneOfficeAutomation Private Limited.' }),
        text('regLabel', 'Registration type', { hint: 'CIN in India, CR number in Qatar, and so on.' }), text('regNumber', 'Registration number'),
        area('address', 'Registered address', { rows: 2 }), text('phone', 'Phone'),
        text('supportEmail', 'Support email'), text('salesEmail', 'Sales email'),
        flag('head', 'Head office', 'Used in the legal pages and as the main contact.'),
      ] },
      { type: 'section', name: '_social', label: 'Social media', hint: 'Only the platforms you add appear as icons in the footer.' },
      { type: 'items', name: 'socials', label: 'Social links', itemLabel: 'link', titleField: 'platform', max: 12, fields: [
        { type: 'select', name: 'platform', label: 'Platform', options: SOCIAL_PLATFORMS }, link('url', 'Link', 'The company page or profile, for example https://www.linkedin.com/company/oneofficeautomation. For WhatsApp: https://wa.me/917676095823.'),
      ] },
      { type: 'section', name: '_footer', label: 'Footer' },
      text('footerTagline', 'Footer tagline'),
      { type: 'section', name: '_bar', label: 'Announcement bar', hint: 'A thin bar at the very top of every page.' },
      flag('announcementOn', 'Show the announcement bar'), text('announcementText', 'Announcement text'), text('announcementLabel', 'Link label'),
      link('announcementUrl', 'Link', 'A page address such as /pricing, or a full https:// link.'),
    ],
  },
  // ---- Menus and footer ----
  { key: 'site.analytics', label: 'Website analytics', group: 'Site', path: '/', kind: 'doc', settings: true,
    description: 'The measuring and advertising tools on the website. Each loads only after a visitor accepts the matching cookies in the cookie banner: analytics tools need “analytics”, advertising tools need “marketing”.',
    fields: [
      { type: 'items', name: 'tools', label: 'Tools', itemLabel: 'tool', titleField: 'tool', max: 12, fields: [
        { type: 'select', name: 'tool', label: 'Tool', options: TOOL_OPTIONS, hint: 'Google Tag Manager: tags from other companies that you set up inside it may be blocked by the website’s security settings. Add those tools here instead.' },
        text('id', 'ID', { hint: 'GA4: G-…  ·  Tag Manager: GTM-…  ·  Clarity: project ID  ·  PageSense: script path  ·  Matomo: site number  ·  Plausible: site domain  ·  Umami: website ID  ·  Fathom: site ID  ·  LinkedIn: partner ID  ·  Meta: pixel ID  ·  Google Ads: AW-…  ·  HubSpot: Hub ID' }),
        link('url', 'Address (Matomo, or your own Umami)', 'Only for Matomo (required) and a self-hosted Umami. Leave empty otherwise.'),
      ] },
    ] },
  { key: 'nav.main', label: 'Top menu', group: 'Menus and footer', path: '/', kind: 'list', titleField: 'label', itemLabel: 'menu item', max: 10,
    description: 'The items across the top of every page, in order. An item shows a dropdown when “Dropdown menus” has one with the same address.',
    fields: [text('label', 'Label'), link('to', 'Address', 'A page on this site, for example /pricing.')] },
  { key: 'nav.menus', label: 'Dropdown menus', group: 'Menus and footer', path: '/', kind: 'list', titleField: 'menu', itemLabel: 'dropdown', max: 12,
    description: 'The panel that opens under a top menu item. Each one has sections of links and a highlighted box on the right. In a link description, {manuals} is replaced by the number of product manuals.',
    fields: [
      link('menu', 'Opens under the top menu item with this address', 'For example /platform. It must match an address in “Top menu”.'),
      { type: 'items', name: 'sections', label: 'Sections', itemLabel: 'section', titleField: 'heading', max: 4, fields: [
        text('heading', 'Heading'),
        { type: 'select', name: 'source', label: 'Links', options: [{ value: 'links', label: 'The links below' }, { value: 'sectors', label: 'Automatic: industries from Solutions' }, { value: 'stories', label: 'Automatic: industries from Customer stories' }] },
        { type: 'select', name: 'cols', label: 'Columns', options: [{ value: '1', label: 'One column' }, { value: '2', label: 'Two columns' }] },
        { type: 'items', name: 'links', label: 'Links (used when “Links” is “The links below”)', itemLabel: 'link', titleField: 'label', max: 12, fields: [
          text('label', 'Label'), text('desc', 'Short description (optional)'), link('to', 'Address', 'A page on this site such as /platform#run, or a full https:// link.'),
          { type: 'select', name: 'icon', label: 'Icon', options: ICON_OPTIONS },
        ] },
      ] },
      text('featureKicker', 'Highlighted box: small label'), text('featureStat', 'Highlighted box: big number (optional)', { hint: 'For example 80%. Careers shows the number of open roles here automatically.' }),
      text('featureTitle', 'Highlighted box: title'), area('featureText', 'Highlighted box: text', { rows: 2 }),
      text('featureCta', 'Highlighted box: link label'), link('featureTo', 'Highlighted box: link address'),
    ] },
  { key: 'nav.header', label: 'Header buttons', group: 'Menus and footer', path: '/', kind: 'doc',
    description: 'The buttons on the right of the top bar on every page (also shown in the phone menu).',
    fields: [text('signIn', 'Sign-in link: label'), link('signInLink', 'Sign-in link: address'), text('tryLabel', 'Outline button: label'), link('tryLink', 'Outline button: address'), text('demoLabel', 'Main button: label'), link('demoLink', 'Main button: address')] },
  { key: 'nav.footer', label: 'Footer', group: 'Menus and footer', path: '/', kind: 'doc',
    description: 'The bottom of every page: the link columns, the two buttons under the logo and the legal links. Company details and social links are in Site settings.',
    fields: [
      { type: 'items', name: 'columns', label: 'Link columns', itemLabel: 'column', titleField: 'title', max: 6, fields: [
        text('title', 'Column heading'),
        { type: 'items', name: 'links', label: 'Links', itemLabel: 'link', titleField: 'label', max: 10, fields: [text('label', 'Label'), link('to', 'Address')] },
      ] },
      text('btn1', 'Main button: label'), link('btn1Link', 'Main button: address'), text('btn2', 'Second button: label'), link('btn2Link', 'Second button: address'),
      text('privacy', 'Privacy link: label'), text('terms', 'Terms link: label'), text('backToTop', '“Back to top” label'),
    ] },
  // ---- SEO ----
  { key: 'seo.site', label: 'Site-wide', group: 'SEO', path: '/', kind: 'doc', settings: true,
    description: 'Used for every page that has no title, description or share image of its own in “Page titles and descriptions”.',
    fields: [
      text('siteName', 'Site name'), text('titleSuffix', 'Added to the end of every page title', { hint: 'For example “ | OneOfficeAutomation”. Start with a space.' }),
      area('description', 'Default description', { rows: 2, max: 300 }),
      link('image', 'Default share image', 'Shown when a page is shared on LinkedIn, WhatsApp, X and so on. A site path such as /og-default.png or a full https:// link to a 1200 × 630 image.'),
      text('twitter', 'X (Twitter) account (optional)', { hint: 'For example @oneofficeauto.' }),
    ] },
  { key: 'seo.pages', label: 'Page titles and descriptions', group: 'SEO', path: '/', kind: 'list', settings: true, titleField: 'path', itemLabel: 'page', max: 100,
    description: 'What search engines and link previews show for each page. Keep titles under 60 characters and descriptions under 160. Documentation pages for each product get their title automatically.',
    fields: [
      text('path', 'Page address', { hint: 'For example /pricing.' }), text('title', 'Title', { max: 120, hint: 'The site name is added automatically unless the title already contains it.' }),
      area('description', 'Description', { rows: 2, max: 300 }),
      link('image', 'Share image (optional)', 'Leave empty to use the default share image.'),
      flag('noindex', 'Hide from search engines', 'Keeps this page out of Google and the sitemap.'),
    ] },
  { key: 'site.redirects', label: 'Redirects', group: 'SEO', path: '/', kind: 'list', settings: true, titleField: 'from', itemLabel: 'redirect', max: 300,
    description: 'Send visitors (and search engines) from an old address to a new one, for example after renaming a page. Checked before any page is shown.',
    fields: [
      text('from', 'Old address', { hint: 'A page address on this site, for example /resources/old-guide. Letters are matched without regard to capitals.' }),
      link('to', 'New address', 'A page on this site such as /resources/docs, or a full https:// link.'),
      flag('permanent', 'Permanent move', 'Tick for a page that has moved for good (search engines update their links). Leave unticked for a temporary move.'),
    ] },
  { key: "page.home", label: "Home page: headings, buttons and banners", group: 'Pages', path: "/", kind: 'doc',
    description: "The words around the content on the Home page: the headline at the top, section headings, buttons and the closing banner. Coloured parts of headlines are shown in the brand gradient.",
    fields: [
      text("heroA", "Hero line under the logo: first part"),
      text("heroB", "Hero line under the logo: coloured part"),
      text("heroC", "Hero line under the logo: words after the coloured part"),
      text("searchButton", "Search box: button"),
      text("tryLabel", "Search box: label before the quick picks"),
      text("welcomeA", "Tabs section: heading: first part"),
      text("welcomeB", "Tabs section: heading: coloured part"),
      text("welcomeText", "Tabs section: line under the heading"),
      text("resultsA", "Results section: heading: first part"),
      text("resultsB", "Results section: heading: coloured part"),
      text("resultsLink", "Results section: link: label"),
      link("resultsLinkLink", "Results section: link: address", 'A page on this site such as /contact, an anchor such as #apply, or a full https:// or mailto: link.'),
      text("endTitle", "Closing banner: heading"),
      text("endBtn1", "Closing banner: first button: label"),
      link("endBtn1Link", "Closing banner: first button: address", 'A page on this site such as /contact, an anchor such as #apply, or a full https:// or mailto: link.'),
      text("endBtn2", "Closing banner: second button: label"),
      link("endBtn2Link", "Closing banner: second button: address", 'A page on this site such as /contact, an anchor such as #apply, or a full https:// or mailto: link.'),
      list("examples", "Search box: example tasks shown in the box (one per line)", { hint: "They rotate every few seconds." }),
      list("quickPicks", "Search box: quick picks under the box (one per line)"),
    ] },
  { key: "page.platform", label: "Platform page: headings, buttons and banners", group: 'Pages', path: "/platform", kind: 'doc',
    description: "The words around the content on the Platform page: the headline at the top, section headings, buttons and the closing banner. Coloured parts of headlines are shown in the brand gradient.",
    fields: [
      text("heroA", "Hero: headline: first part"),
      text("heroB", "Hero: headline: coloured part"),
      text("heroText", "Hero: tagline"),
      text("heroBtn1", "Hero: first button: label"),
      link("heroBtn1Link", "Hero: first button: address", 'A page on this site such as /contact, an anchor such as #apply, or a full https:// or mailto: link.'),
      text("heroBtn2", "Hero: second button: label"),
      link("heroBtn2Link", "Hero: second button: address", 'A page on this site such as /contact, an anchor such as #apply, or a full https:// or mailto: link.'),
      text("partsA", "Four parts section: heading: first part"),
      text("partsB", "Four parts section: heading: coloured part"),
      text("walkTitle", "Invoice walkthrough: heading"),
      text("flowA", "How the parts work together: heading: first part"),
      text("flowB", "How the parts work together: heading: coloured part"),
      area("flowText", "How the parts work together: intro", { rows: 2 }),
      text("aiA", "AI section: heading: first part"),
      text("aiB", "AI section: heading: coloured part"),
      area("aiText", "AI section: intro", { rows: 2 }),
      text("secTitle", "Security section: heading"),
      area("secText", "Security section: intro", { rows: 2 }),
      text("endTitle", "Closing banner: heading"),
      area("endText", "Closing banner: text", { rows: 2 }),
      text("endBtn1", "Closing banner: first button: label"),
      link("endBtn1Link", "Closing banner: first button: address", 'A page on this site such as /contact, an anchor such as #apply, or a full https:// or mailto: link.'),
      text("endBtn2", "Closing banner: second button: label"),
      link("endBtn2Link", "Closing banner: second button: address", 'A page on this site such as /contact, an anchor such as #apply, or a full https:// or mailto: link.'),
    ] },
  { key: "page.solutions", label: "Solutions page: headings, buttons and banners", group: 'Pages', path: "/solutions", kind: 'doc',
    description: "The words around the content on the Solutions page: the headline at the top, section headings, buttons and the closing banner. Coloured parts of headlines are shown in the brand gradient.",
    fields: [
      text("heroA", "Hero: headline (the coloured part starts a new line): first part"),
      text("heroB", "Hero: headline (the coloured part starts a new line): coloured part"),
      text("heroText", "Hero: tagline"),
      text("heroBtn1", "Hero: first button: label"),
      link("heroBtn1Link", "Hero: first button: address", 'A page on this site such as /contact, an anchor such as #apply, or a full https:// or mailto: link.'),
      text("heroBtn2", "Hero: second button: label"),
      link("heroBtn2Link", "Hero: second button: address", 'A page on this site such as /contact, an anchor such as #apply, or a full https:// or mailto: link.'),
      text("exploreA", "Sector explorer: heading: first part"),
      text("exploreB", "Sector explorer: heading: coloured part"),
      area("exploreText", "Sector explorer: intro", { rows: 2 }),
      text("sectorCta", "Sector explorer: button under each sector"),
      text("spotTitle", "Spotlights: heading"),
      text("crossA", "Processes in every sector: heading: first part"),
      text("crossB", "Processes in every sector: heading: coloured part"),
      area("crossText", "Processes in every sector: intro", { rows: 2 }),
      text("endTitle", "Closing banner: heading"),
      area("endText", "Closing banner: text", { rows: 2 }),
      text("endBtn1", "Closing banner: first button: label"),
      link("endBtn1Link", "Closing banner: first button: address", 'A page on this site such as /contact, an anchor such as #apply, or a full https:// or mailto: link.'),
      text("endBtn2", "Closing banner: second button: label"),
      link("endBtn2Link", "Closing banner: second button: address", 'A page on this site such as /contact, an anchor such as #apply, or a full https:// or mailto: link.'),
    ] },
  { key: "page.customers", label: "Customers page: headings, buttons and banners", group: 'Pages', path: "/customers", kind: 'doc',
    description: "The words around the content on the Customers page: the headline at the top, section headings, buttons and the closing banner. Coloured parts of headlines are shown in the brand gradient.",
    fields: [
      text("heroA", "Hero: headline (the coloured part starts a new line): first part"),
      text("heroB", "Hero: headline (the coloured part starts a new line): coloured part"),
      area("heroText", "Hero: tagline", { rows: 2 }),
      text("heroBtn1", "Hero: first button: label"),
      link("heroBtn1Link", "Hero: first button: address", 'A page on this site such as /contact, an anchor such as #apply, or a full https:// or mailto: link.'),
      text("heroBtn2", "Hero: second button: label"),
      link("heroBtn2Link", "Hero: second button: address", 'A page on this site such as /contact, an anchor such as #apply, or a full https:// or mailto: link.'),
      text("storiesA", "Stories section: heading: first part"),
      text("storiesB", "Stories section: heading: coloured part"),
      text("storiesText", "Stories section: intro"),
      text("quotesA", "Quotes section: heading: first part"),
      text("quotesB", "Quotes section: heading: coloured part"),
      text("endTitle", "Closing banner: heading"),
      area("endText", "Closing banner: text", { rows: 2 }),
      text("endBtn1", "Closing banner: button: label"),
      link("endBtn1Link", "Closing banner: button: address", 'A page on this site such as /contact, an anchor such as #apply, or a full https:// or mailto: link.'),
    ] },
  { key: "page.pricing", label: "Pricing page: headings, buttons and banners", group: 'Pages', path: "/pricing", kind: 'doc',
    description: "The words around the content on the Pricing page: the headline at the top, section headings, buttons and the closing banner. Coloured parts of headlines are shown in the brand gradient.",
    fields: [
      text("heroA", "Hero: headline: first part"),
      text("heroB", "Hero: headline: coloured part"),
      text("heroText", "Hero: tagline"),
      text("compareA", "Comparison table: heading: first part"),
      text("compareB", "Comparison table: heading: coloured part"),
      text("faqA", "Questions section: heading: first part"),
      text("faqB", "Questions section: heading: coloured part"),
      text("helpTitle", "“Not sure” box: heading"),
      text("helpBtn", "“Not sure” box: button: label"),
      link("helpBtnLink", "“Not sure” box: button: address", 'A page on this site such as /contact, an anchor such as #apply, or a full https:// or mailto: link.'),
      text("entTitle", "Enterprise box: heading"),
      text("entBtn", "Enterprise box: button: label"),
      link("entBtnLink", "Enterprise box: button: address", 'A page on this site such as /contact, an anchor such as #apply, or a full https:// or mailto: link.'),
    ] },
  { key: "page.partners", label: "Partners page: headings, buttons and banners", group: 'Pages', path: "/partners", kind: 'doc',
    description: "The words around the content on the Partners page: the headline at the top, section headings, buttons and the closing banner. Coloured parts of headlines are shown in the brand gradient.",
    fields: [
      text("kicker", "Hero: small badge above the headline"),
      text("heroA", "Hero: headline (the coloured part starts a new line): first part"),
      text("heroB", "Hero: headline (the coloured part starts a new line): coloured part"),
      area("heroText", "Hero: tagline", { rows: 2 }),
      text("heroBtn1", "Hero: first button: label"),
      link("heroBtn1Link", "Hero: first button: address", 'A page on this site such as /contact, an anchor such as #apply, or a full https:// or mailto: link.'),
      text("heroBtn2", "Hero: second button: label"),
      link("heroBtn2Link", "Hero: second button: address", 'A page on this site such as /contact, an anchor such as #apply, or a full https:// or mailto: link.'),
      text("typesA", "Partner types: heading: first part"),
      text("typesB", "Partner types: heading: coloured part"),
      text("benefitsA", "Benefits: heading: first part"),
      text("benefitsB", "Benefits: heading: coloured part"),
      text("tiersA", "Levels: heading: first part"),
      text("tiersB", "Levels: heading: coloured part"),
      area("tiersText", "Levels: intro", { rows: 2 }),
      text("processA", "How to become a partner: heading: first part"),
      text("processB", "How to become a partner: heading: coloured part"),
      area("processText", "How to become a partner: intro", { rows: 2 }),
      text("processBtn", "How to become a partner: button: label"),
      link("processBtnLink", "How to become a partner: button: address", 'A page on this site such as /contact, an anchor such as #apply, or a full https:// or mailto: link.'),
      text("applyA", "Application form: heading: first part"),
      text("applyB", "Application form: heading: coloured part"),
      area("applyText", "Application form: intro", { rows: 2 }),
      text("applySubmit", "Application form: send button"),
    ] },
  { key: "page.about", label: "About page: headings, buttons and banners", group: 'Pages', path: "/about", kind: 'doc',
    description: "The words around the content on the About page: the headline at the top, section headings, buttons and the closing banner. Coloured parts of headlines are shown in the brand gradient.",
    fields: [
      text("kicker", "Hero: small badge above the headline"),
      text("heroA", "Hero: headline (the two parts are joined without a space): first part"),
      text("heroB", "Hero: headline (the two parts are joined without a space): coloured part"),
      area("heroText", "Hero: tagline", { rows: 2 }),
      text("heroBtn1", "Hero: first button: label"),
      link("heroBtn1Link", "Hero: first button: address", 'A page on this site such as /contact, an anchor such as #apply, or a full https:// or mailto: link.'),
      text("heroBtn2", "Hero: second button: label"),
      link("heroBtn2Link", "Hero: second button: address", 'A page on this site such as /contact, an anchor such as #apply, or a full https:// or mailto: link.'),
      text("valuesA", "Values: heading: first part"),
      text("valuesB", "Values: heading: coloured part"),
      text("journeyA", "Journey: heading: first part"),
      text("journeyB", "Journey: heading: coloured part"),
      text("teamsA", "Teams: heading: first part"),
      text("teamsB", "Teams: heading: coloured part"),
      text("endTitle", "Closing banner: heading"),
      area("endText", "Closing banner: text", { rows: 2 }),
      text("endBtn1", "Closing banner: button: label"),
      link("endBtn1Link", "Closing banner: button: address", 'A page on this site such as /contact, an anchor such as #apply, or a full https:// or mailto: link.'),
    ] },
  { key: "page.careers", label: "Careers page: headings, buttons and banners", group: 'Pages', path: "/careers", kind: 'doc',
    description: "The words around the content on the Careers page: the headline at the top, section headings, buttons and the closing banner. Coloured parts of headlines are shown in the brand gradient.",
    fields: [
      text("kicker", "Hero: small badge above the headline"),
      text("heroA", "Hero: headline: first part"),
      text("heroB", "Hero: headline: coloured part"),
      text("heroBtn1", "Hero: first button: label"),
      link("heroBtn1Link", "Hero: first button: address", 'A page on this site such as /contact, an anchor such as #apply, or a full https:// or mailto: link.'),
      text("heroBtn2", "Hero: second button: label"),
      link("heroBtn2Link", "Hero: second button: address", 'A page on this site such as /contact, an anchor such as #apply, or a full https:// or mailto: link.'),
      text("whyA", "Why join us: heading: first part"),
      text("whyB", "Why join us: heading: coloured part"),
      text("hireA", "How we hire: heading: first part"),
      text("hireB", "How we hire: heading: coloured part"),
      text("applyA", "Application form: heading: first part"),
      text("applyB", "Application form: heading: coloured part"),
      area("applyText", "Application form: intro", { rows: 2 }),
      text("applySubmit", "Application form: send button"),
      text("applyEmail", "Application form: email address for CVs", { hint: "Shown as “Prefer email? Write to …”." }),
    ] },
  { key: "page.contact", label: "Contact page: headings, buttons and banners", group: 'Pages', path: "/contact", kind: 'doc',
    description: "The words around the content on the Contact page: the headline at the top, section headings, buttons and the closing banner. Coloured parts of headlines are shown in the brand gradient.",
    fields: [
      text("kicker", "Hero: small badge above the headline"),
      text("heroA", "Hero: headline: first part"),
      text("heroB", "Hero: headline: coloured part"),
      text("formTitle", "Demo form: heading"),
      text("waysA", "Other ways to reach us: heading: first part"),
      text("waysB", "Other ways to reach us: heading: coloured part"),
      text("formSubmit", "Demo form: send button"),
      list("companySizes", "Demo form: company size options (one per line)"),
      list("interests", "Demo form: “I’m interested in” options (one per line)"),
      text("salesTitle", "Other ways: sales card heading"),
      text("salesText", "Other ways: sales card text"),
      text("supportTitle", "Other ways: support card heading"),
      text("supportText", "Other ways: support card text"),
      text("partnersTitle", "Other ways: partners card heading"),
      text("partnersText", "Other ways: partners card text"),
      text("partnersLink", "Other ways: partners card link text"),
    ] },
  { key: 'page.trust', label: 'Security and trust page', group: 'Pages', path: '/trust', kind: 'doc',
    description: 'The /trust page. Only list certifications you actually hold; the list is hidden while it is empty.',
    fields: [
      text('heroA', 'Hero: headline: first part'), text('heroB', 'Hero: headline: coloured part'), area('heroText', 'Hero: tagline', { rows: 2 }),
      { type: 'items', name: 'items', label: 'How we keep you safe', itemLabel: 'point', titleField: 'title', max: 12, fields: [text('icon', 'Icon'), text('title', 'Title'), area('text', 'Text', { rows: 2 })] },
      { type: 'items', name: 'certs', label: 'Certifications and audits (optional)', itemLabel: 'certification', titleField: 'name', max: 12, fields: [
        text('name', 'Name', { hint: 'For example ISO/IEC 27001 or SOC 2 Type II.' }),
        { type: 'select', name: 'status', label: 'Status', options: [{ value: 'certified', label: 'Certified' }, { value: 'progress', label: 'In progress' }] },
        text('note', 'Note (optional)', { hint: 'For example the year or the auditor.' }),
      ] },
      text('reportTitle', 'Reporting: heading'), area('reportText', 'Reporting: text', { rows: 2 }),
      text('securityEmail', 'Security contact email', { hint: 'Also published in /.well-known/security.txt for security researchers.' }),
      text('endTitle', 'Closing banner: heading'), area('endText', 'Closing banner: text', { rows: 2 }),
    ] },
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
      text('co', 'Customer', { hint: 'Use a description such as “A retail company” unless you have permission to name them.' }), text('slug', 'Page address (optional)', { hint: 'The story’s own page is /customers/<this>. Leave empty to make it from the headline. Changing it later breaks old links.' }), image('logo', 'Customer logo (optional)', 'Only with the customer’s permission. Shown on the story card instead of the name. A wide logo on a transparent or white background works best.'), text('ind', 'Industry', { hint: 'Stories are filtered by this value.' }),
      text('title', 'Headline'), area('does', 'What the agents do'),
      text('s1', 'Big result: number'), text('l1', 'Big result: label'), text('s2', 'Second result: number'), text('l2', 'Second result: label'),
      flag('featured', 'Feature this story', 'Featured stories get a badge, appear first, and feed the hero cards, the scoreboard and the quote wall. 3 or 4 works best.'),
      area('quote', 'Customer quote (optional)'), text('role', 'Quote: person’s role'), text('icon', 'Icon', { hint: ICON_HINT }),
      area('challenge', 'Full story: the challenge (optional)', { rows: 4, max: 6000, hint: 'Shown on the story’s own page. Same formatting as articles: - bullets, 1. steps, **bold**.' }),
      area('solution', 'Full story: what we built (optional)', { rows: 4, max: 6000 }),
      area('results', 'Full story: the results (optional)', { rows: 4, max: 6000 }),
    ],
  },
  {
    key: 'pricing.plans', label: 'Pricing plans', group: 'Pricing', path: '/pricing', kind: 'list', titleField: 'name', itemLabel: 'plan',
    description: 'The plan cards. The same plan names are used as columns in the comparison table, and each card’s feature list comes from that table unless you type your own.',
    fields: [
      text('id', 'Plan ID', { hint: 'community, starter, business or enterprise. Keep these IDs so the plan picker and comparison table keep working.' }), text('name', 'Name'),
      text('price', 'Price', { hint: 'For example $120, Free or Custom.' }), text('per', 'Billing period', { hint: 'For example / month. Leave empty for Free or Custom.' }),
      text('who', 'Who it is for'), text('cta', 'Button label'), link('href', 'Button link', 'For example /signup?plan=starter or /contact.'),
      flag('popular', 'Highlight as “Most popular”'),
      list('feats', 'What is included (optional)', { hint: 'Leave empty to build this list automatically from the comparison table (recommended): the card starts with “Everything in” the plan before it, then lists what this plan adds. Lines typed here replace the automatic list.' }),
    ],
  },
  { key: 'pricing.compare', label: 'Pricing comparison table', group: 'Pricing', path: '/pricing', kind: 'list', titleField: 'feature', itemLabel: 'row',
    description: 'The one list of features for every plan. Type yes for a check mark, leave empty for a dash, or type any text (for example 24/7 with SLA). The plan cards are built from this table, so moving a feature to another plan or deleting a row updates the cards too.',
    fields: [text('feature', 'Feature'), text('community', 'Community'), text('starter', 'Starter'), text('business', 'Business'), text('enterprise', 'Enterprise'), flag('hideOnCards', 'Hide from the plan cards', 'Show this row only in the comparison table.')] },
  { key: 'pricing.faq', label: 'Pricing questions', group: 'Pricing', path: '/pricing', kind: 'list', titleField: 'q', itemLabel: 'question',
    description: 'The accordion at the bottom of the Pricing page.', fields: [text('q', 'Question'), area('a', 'Answer')] },
  { key: 'pricing.text', label: 'Pricing note', group: 'Pricing', path: '/pricing', kind: 'doc', description: 'The small note under the plan cards.', fields: [text('note', 'Note')] },
  {
    key: 'resources.categories', label: 'Resources: help types (by what you need)', group: 'Resources', path: '/resources', kind: 'list', titleField: 'title', itemLabel: 'help type',
    description: 'The “By what you need” options in the Resources menu, footer and landing page, for example Get started or Troubleshooting. Adding one adds it everywhere.',
    fields: [text('id', 'Page address', { hint: SLUG_HINT }), text('title', 'Title'), area('desc', 'Short description'), { type: 'select', name: 'col', label: 'Colour', options: COLORS }, text('icon', 'Icon', { hint: ICON_HINT }),
      { type: 'select', name: 'block', label: 'Where it appears on the Resources landing page', options: [{ value: 'docs', label: 'Documentation' }, { value: 'learn', label: 'OneOffice Learn' }, { value: 'library', label: 'Templates and connectors' }, { value: 'community', label: 'Community and support' }] }],
  },
  {
    key: 'resources.products', label: 'Resources: products (by product)', group: 'Resources', path: '/resources', kind: 'list', titleField: 'title', itemLabel: 'product',
    description: 'The “By product” options, for example One Runner. Every article can belong to one product.',
    fields: [text('id', 'Page address', { hint: SLUG_HINT }), text('title', 'Title'), area('desc', 'Short description'), { type: 'select', name: 'col', label: 'Colour', options: COLORS }, text('icon', 'Icon', { hint: ICON_HINT })],
  },
  { key: 'resources.troubleshooting', label: 'Resources: troubleshooting', group: 'Resources', path: '/resources/troubleshooting', kind: 'list', library: true, titleField: 'symptom', itemLabel: 'entry',
    description: 'Known problems and their fixes, shown as articles in Troubleshooting and in the product documentation.',
    fields: [
      text('symptom', 'What the user sees (short)', { max: 200, hint: 'Becomes the title, for example “Runner shows Access is denied”.' }),
      area('error', 'Exact error message (optional)', { rows: 2, max: 2000, hint: 'Paste it exactly: people search by copying the error.' }),
      { type: 'ref', name: 'product', label: 'Product', ref: 'resources.products', refValue: 'id', refLabel: 'title' },
      text('versions', 'Applies to versions (optional)', { hint: 'For example 4.2 to 4.5, or “all versions”.' }),
      text('environment', 'Environment (optional)', { hint: 'For example Windows Server 2019 behind a proxy.' }),
      area('cause', 'Cause', { rows: 3, max: 5000, hint: 'Same formatting as article text: - bullets, 1. steps, ``` code, **bold**, [links](/page).' }),
      area('resolution', 'How to fix it', { rows: 6, max: 10000, hint: 'Same formatting as article text: - bullets, 1. steps, ``` code, **bold**, [links](/page).' }),
      text('code', 'Article number (optional)', { hint: 'For example KB-1042, for support to refer to.' }),
      text('summary', 'Summary for lists (optional)', { max: 200 }),
    ] },
  { key: 'resources.releases', label: 'Resources: release notes', group: 'Resources', path: '/resources/whats-new', kind: 'list', library: true, titleField: 'version', itemLabel: 'release',
    description: 'One entry per release, shown as articles in What’s new and in the product documentation.',
    fields: [
      text('version', 'Version', { hint: 'For example 4.6. The title becomes “What’s new in 4.6”.' }),
      text('date', 'Release date', { hint: 'YYYY-MM-DD' }),
      { type: 'ref', name: 'product', label: 'Product (optional)', ref: 'resources.products', refValue: 'id', refLabel: 'title', hint: 'Leave empty for a platform-wide release.' },
      text('summary', 'Summary for lists (optional)', { max: 200 }),
      area('whatsNew', 'What’s new', { rows: 5, max: 10000, hint: 'Same formatting as article text: - bullets, 1. steps, ``` code, **bold**, [links](/page).' }),
      area('changes', 'Changes', { rows: 3, max: 10000 }), area('fixed', 'Fixed', { rows: 3, max: 10000 }),
      area('limitations', 'Known limitations', { rows: 3, max: 10000 }), area('deprecated', 'Deprecated', { rows: 2, max: 10000 }),
    ] },
  {
    key: 'resources.items', label: 'Resources: articles', group: 'Resources', path: '/resources', kind: 'list', library: true, titleField: 'title', itemLabel: 'article',
    description: 'Every article. Give each one a help type and, where it applies, a product, so customers can find it either way.',
    fields: [
      text('id', 'Page address', { hint: SLUG_HINT }),
      { type: 'ref', name: 'category', label: 'Help type', ref: 'resources.categories', refValue: 'id', refLabel: 'title' },
      { type: 'ref', name: 'product', label: 'Product (optional)', ref: 'resources.products', refValue: 'id', refLabel: 'title', hint: 'Leave empty for articles that are not about one product.' },
      text('chapter', 'Chapter number in the product documentation', { hint: 'Sets the reading order inside Documentation, for example 1, 2, 3. Leave empty to order automatically.' }),
      text('title', 'Title'), area('summary', 'Summary'), text('meta', 'Detail line', { hint: 'For example 8 min read, 45 min recording or Free.' }),
      list('points', 'In this article (bullet points)'),
      area('body', 'Article text', { rows: 14, max: 30000, hint: 'Leave a blank line between paragraphs. ## heading, ### smaller heading, - bullet, 1. numbered step, > Note: / > Tip: / > Warning: box, ``` on its own line before and after code, | a | b | for a table, ![description](/media/file.png) for an image from this site, a YouTube or Vimeo link alone on a line for a video. In text: **bold**, `code`, [link text](/page). A preview appears under the form.' }),
      flag('featured', 'Show on the Resources landing page'),
    ],
  },
  {
    key: 'resources.hub', label: 'Resources: landing page', group: 'Resources', path: '/resources', kind: 'doc',
    description: 'The Resources landing page: headline, search box, the six cards (Documentation, FAQs, Training, Support, Events, Blog) and the community strip.',
    fields: [
      text('heroA', 'Headline: first part'), text('heroB', 'Headline: highlighted part'), area('heroSub', 'Line under the headline'),
      text('searchHint', 'Search box placeholder'), list('popular', 'Popular searches', { hint: 'One per line. Shown as quick buttons under the search box.' }),
      text('docsTitle', 'Documentation card: title'), area('docsText', 'Documentation card: text'),
      text('faqTitle', 'FAQs card: title'), area('faqText', 'FAQs card: text'),
      text('trainingTitle', 'Training card: title'), area('trainingText', 'Training card: text'),
      text('supportTitle', 'Support card: title'), area('supportCardText', 'Support card: text'),
      text('eventsTitle', 'Events card: title'), area('eventsText', 'Events card: text'),
      text('blogTitle', 'Blog card: title'), area('blogText', 'Blog card: text'),
      flag('showCommunity', 'Show the community and newsletter strip'),
      text('communityTitle', 'Community: heading'), area('communityText', 'Community: text'), text('communityCta', 'Community: button label'), link('communityUrl', 'Community: button link'),
      text('newsTitle', 'Newsletter: heading'), area('newsText', 'Newsletter: text'),
    ],
  },
  { key: 'resources.faqs', label: 'Resources: FAQs', group: 'Resources', path: '/resources/faqs', kind: 'list', library: true, titleField: 'q', itemLabel: 'question',
    description: 'Every question on the FAQs page. Pick a product so the question is grouped under it; leave it empty for general questions.',
    fields: [
      { type: 'ref', name: 'product', label: 'Product (optional)', ref: 'resources.products', refValue: 'id', refLabel: 'title', hint: 'Leave empty for general questions.' },
      text('q', 'Question'), area('a', 'Answer', { rows: 5, max: 4000, hint: 'Leave a blank line between paragraphs.' }),
    ] },
  { key: 'resources.training', label: 'Resources: training material', group: 'Resources', path: '/resources/training', kind: 'list', library: true, titleField: 'title', itemLabel: 'training item',
    description: 'Courses, videos, documents and links on the Training page.',
    fields: [
      text('title', 'Title'), area('summary', 'Short description'),
      { type: 'select', name: 'kind', label: 'Type', options: ['Online course', 'Video', 'Document', 'Link', 'Sample'].map((x) => ({ value: x, label: x })) },
      { type: 'select', name: 'level', label: 'Level', options: ['All levels', 'Beginner', 'Builder', 'Administrator', 'Expert'].map((x) => ({ value: x, label: x })) },
      { type: 'ref', name: 'product', label: 'Product (optional)', ref: 'resources.products', refValue: 'id', refLabel: 'title' },
      text('duration', 'Length', { hint: 'For example 45 min, 2 hours or 20 pages.' }),
      link('url', 'Link', 'A page on this site, or a full https:// link to the course, video or file.'), text('cta', 'Button label', { hint: 'For example Start the course, Watch or Download.' }),
    ] },
  { key: 'resources.events', label: 'Resources: events', group: 'Resources', path: '/resources/events', kind: 'list', library: true, titleField: 'title', itemLabel: 'event',
    description: 'Webinars, workshops, meetups and conferences. Events with a date in the past move to “Past events” automatically.',
    fields: [
      text('title', 'Title'), { type: 'select', name: 'kind', label: 'Type', options: ['Webinar', 'Workshop', 'Meetup', 'Conference'].map((x) => ({ value: x, label: x })) },
      text('date', 'Date', { hint: 'Write it as YYYY-MM-DD, for example 2026-12-03.' }), text('time', 'Time', { hint: 'For example 15:00 IST.' }),
      text('place', 'Where', { hint: 'For example Online, or Doha, Qatar.' }), area('summary', 'Short description'),
      link('url', 'Registration or recording link'), text('cta', 'Button label', { hint: 'For example Register or Watch the recording.' }),
      { type: 'select', name: 'tz', label: 'Time zone', options: TZ_OPTIONS, hint: 'The event page shows the time in this zone and in the visitor’s own.' },
      text('slug', 'Page address (optional)', { hint: 'The event’s own page is /resources/events/<this>. Leave empty to make it from the title.' }),
      image('cover', 'Cover image (optional)', 'Shown at the top of the event page. Choose from the media library.'),
      area('details', 'Full details for the event page (optional)', { rows: 6, max: 10000, hint: 'Agenda, speakers, who it’s for. Same formatting as articles.' }),
      link('recording', 'Recording link (after the event)', 'When the event is over, the page shows “Watch the recording” with this link.'),
    ] },
  { key: 'resources.support', label: 'Resources: support options', group: 'Resources', path: '/resources/support', kind: 'list', titleField: 'title', itemLabel: 'support option',
    description: 'The ways to get help shown on the Support page, in order.',
    fields: [text('title', 'Title'), area('text', 'Short description'), text('label', 'Button label'), link('url', 'Button link', 'A page such as /contact, mailto:support@… or tel:+91…'), text('icon', 'Icon', { hint: ICON_HINT })] },
  { key: 'resources.learnpath', label: 'Resources: learning path levels', group: 'Resources', path: '/resources/training', kind: 'list', titleField: 'n', itemLabel: 'level',
    description: 'The levels of the OneOffice Learn path, in order. They are numbered automatically.', fields: [text('n', 'Level name'), area('d', 'What the learner can do')] },
  { key: 'resources.calculator', label: 'Pricing: savings calculator', group: 'Pricing', path: '/pricing', kind: 'doc',
    description: 'The text and starting values of the savings calculator. Visitors change the values; nothing they enter is saved.',
    fields: [
      flag('show', 'Show the calculator on the Pricing page'), text('title', 'Heading'), area('text', 'Line under the heading'),
      text('minutes', 'Starting value: minutes per task'), text('tasks', 'Starting value: tasks per month'), text('cost', 'Starting value: hourly cost of the person doing it'),
      text('currency', 'Currency symbol', { hint: 'For example $, ₹ or QAR.' }),
      text('share', 'Share of the work an agent takes on (%)', { hint: 'Used in every estimate. Keep it realistic, for example 70 or 80.' }),
      area('note', 'Small print under the results'), text('cta', 'Button label'), link('ctaUrl', 'Button link'),
    ] },
  { key: 'resources.insights', label: 'Resources: blog (posts, e-books, datasheets)', group: 'Resources', path: '/resources', kind: 'list', library: true, titleField: 'title', itemLabel: 'insight',
    description: 'Everything on the Blog page: posts, e-books, whitepapers, datasheets, reports and videos. Newest first: add new items at the top.',
    fields: [
      { type: 'select', name: 'kind', label: 'Type', options: ['Blog post', 'E-book', 'Whitepaper', 'Datasheet', 'Report', 'Video'].map((x) => ({ value: x, label: x })) },
      text('title', 'Title'), area('summary', 'Summary'), text('meta', 'Detail line', { hint: 'For example a date, 12 pages, or 5 min read.' }),
      link('url', 'Link', 'A page on this site such as /resources/learn, or a full https:// link to the post or file.'), text('cta', 'Link label', { hint: 'For example Read the post or Download the e-book.' }),
      flag('featured', 'Show first'),
      text('slug', 'Page address (optional)', { hint: 'Posts with text below get their own page at /resources/blog/<this>. Leave empty to make it from the title.' }),
      text('date', 'Published date (optional)', { hint: 'YYYY-MM-DD' }), text('author', 'Author (optional)'),
      image('cover', 'Cover image (optional)', 'Shown at the top of the post. Choose from the media library.'),
      area('body', 'Post text (optional)', { rows: 14, max: 30000, hint: 'Write the post here to publish it on this site (then “Link” can stay empty). Same formatting as articles.' }),
      { type: 'file', name: 'file', label: 'Download file (optional)', hint: 'An e-book, whitepaper or datasheet from the media library. The card then downloads it.' },
      flag('gated', 'Ask for name and email before the download', 'Visitors fill in a short form first; each request appears in Pipelines → Downloads for the sales team.'),
    ] },
  {
    key: 'emails.templates', label: 'Email messages', group: 'Emails', path: '/', kind: 'doc', settings: true, private: true,
    description: 'Every email the website sends. Words in double curly brackets are filled in automatically: {{name}}, {{company}}, {{link}}, {{reason}}, {{plan}}, {{level}}, {{role}}, {{customer}}, {{event}}, {{status}}, {{protectedUntil}}, {{statusLink}}, {{unsubscribe}}.',
    fields: [
      text('demo_received_subject', 'Demo request: thank-you to the visitor: subject', { max: 200 }), area('demo_received_body', 'Demo request: thank-you to the visitor: message', { rows: 7, max: 5000 }),
      text('team_new_subject', 'Team alert: new submission (sent to the team address): subject', { max: 200 }), area('team_new_body', 'Team alert: new submission (sent to the team address): message', { rows: 7, max: 5000 }),
      text('content_approved_subject', 'Team: website change approved (sent to the editor): subject', { max: 200 }), area('content_approved_body', 'Team: website change approved: message', { rows: 6, max: 5000 }),
      text('content_rejected_subject', 'Team: website change sent back (sent to the editor): subject', { max: 200 }), area('content_rejected_body', 'Team: website change sent back: message', { rows: 6, max: 5000 }),
      text('partner_received_subject', 'Partner application: thank-you: subject', { max: 200 }), area('partner_received_body', 'Partner application: thank-you: message', { rows: 7, max: 5000 }),
      text('partner_approved_subject', 'Partner application: approved (with portal invitation): subject', { max: 200 }), area('partner_approved_body', 'Partner application: approved (with portal invitation): message', { rows: 7, max: 5000 }),
      text('partner_rejected_subject', 'Partner application: not approved: subject', { max: 200 }), area('partner_rejected_body', 'Partner application: not approved: message', { rows: 7, max: 5000 }),
      text('partner_level_subject', 'Partner: new level: subject', { max: 200 }), area('partner_level_body', 'Partner: new level: message', { rows: 7, max: 5000 }),
      text('partner_status_subject', 'Partner: account status changed: subject', { max: 200 }), area('partner_status_body', 'Partner: account status changed: message', { rows: 7, max: 5000 }),
      text('partner_member_invite_subject', 'Partner: colleague added to the portal: subject', { max: 200 }), area('partner_member_invite_body', 'Partner: colleague added to the portal: message', { rows: 7, max: 5000 }),
      text('deal_approved_subject', 'Deal registration: approved: subject', { max: 200 }), area('deal_approved_body', 'Deal registration: approved: message', { rows: 7, max: 5000 }),
      text('deal_rejected_subject', 'Deal registration: not approved: subject', { max: 200 }), area('deal_rejected_body', 'Deal registration: not approved: message', { rows: 7, max: 5000 }),
      text('career_received_subject', 'Job application: thank-you (with status link): subject', { max: 200 }), area('career_received_body', 'Job application: thank-you (with status link): message', { rows: 7, max: 5000 }),
      text('career_rejected_subject', 'Job application: not successful: subject', { max: 200 }), area('career_rejected_body', 'Job application: not successful: message', { rows: 7, max: 5000 }),
      text('newsletter_welcome_subject', 'Newsletter: subscribed: subject', { max: 200 }), area('newsletter_welcome_body', 'Newsletter: subscribed: message', { rows: 7, max: 5000 }),
      text('community_received_subject', 'Community invite: request received: subject', { max: 200 }), area('community_received_body', 'Community invite: request received: message', { rows: 7, max: 5000 }),
      text('community_approved_subject', 'Community invite: approved: subject', { max: 200 }), area('community_approved_body', 'Community invite: approved: message', { rows: 7, max: 5000 }),
      text('community_rejected_subject', 'Community invite: not approved: subject', { max: 200 }), area('community_rejected_body', 'Community invite: not approved: message', { rows: 7, max: 5000 }),
      text('welcome_subject', 'Customer: welcome after sign-up: subject', { max: 200 }), area('welcome_body', 'Customer: welcome after sign-up: message', { rows: 7, max: 5000 }),
      text('password_reset_subject', 'Password reset link: subject', { max: 200 }), area('password_reset_body', 'Password reset link: message', { rows: 7, max: 5000 }),
      text('verify_email_subject', 'Customer: confirm email address (sent again on request): subject', { max: 200 }), area('verify_email_body', 'Customer: confirm email address (sent again on request): message', { rows: 7, max: 5000 }),
      text('plan_received_subject', 'Plan change: request received: subject', { max: 200 }), area('plan_received_body', 'Plan change: request received: message', { rows: 7, max: 5000 }),
      text('plan_approved_subject', 'Plan change: approved: subject', { max: 200 }), area('plan_approved_body', 'Plan change: approved: message', { rows: 7, max: 5000 }),
      text('plan_rejected_subject', 'Plan change: not approved: subject', { max: 200 }), area('plan_rejected_body', 'Plan change: not approved: message', { rows: 7, max: 5000 }),
      text('account_status_subject', 'Customer: account status changed: subject', { max: 200 }), area('account_status_body', 'Customer: account status changed: message', { rows: 7, max: 5000 }),
      text('deletion_done_subject', 'Account deletion: done: subject', { max: 200 }), area('deletion_done_body', 'Account deletion: done: message', { rows: 7, max: 5000 }),
      text('deletion_rejected_subject', 'Account deletion: not done: subject', { max: 200 }), area('deletion_rejected_body', 'Account deletion: not done: message', { rows: 7, max: 5000 }),
      text('event_received_subject', 'Event registration: confirmed: subject', { max: 200 }), area('event_received_body', 'Event registration: confirmed: message', { rows: 7, max: 5000 }),
    ],
  },
  { key: 'community.settings', label: 'Community invitation link', group: 'Emails', path: '/resources', kind: 'doc', settings: true, private: true,
    description: 'The link sent to people whose community invite request is approved (for example your forum or chat group).',
    fields: [link('inviteUrl', 'Invitation link')] },
  { key: 'home.tabs', label: 'Home: “Welcome to OneOfficeAutomation” tabs', group: 'Home & Platform', path: '/', kind: 'list', titleField: 'name', itemLabel: 'tab',
    description: 'The 7 tabs on the Home page, in order: Platform, Solutions, Customers, Resources, Pricing, Partners, Contact. Each tab keeps its link and picture; you can change the words.',
    fields: [text('name', 'Tab name'), area('line', 'Line under the name'), list('points', 'Points (one per line)'), text('go', 'Button label')] },
  { key: 'platform.parts', label: 'Platform: the four parts', group: 'Home & Platform', path: '/platform', kind: 'list', titleField: 'name', itemLabel: 'part',
    description: 'The four tabs on the Platform page, in order (Build, Run, Govern, Orchestrate). Each keeps its picture.',
    fields: [text('verb', 'Step word (for example Build)'), text('name', 'Product name'), area('intro', 'Introduction'), list('feats', 'Features', { hint: 'One per line, written as: Title — description' })] },
  { key: 'platform.flow', label: 'Platform: how the parts work together', group: 'Home & Platform', path: '/platform', kind: 'list', titleField: 'title', itemLabel: 'step',
    description: 'The numbered steps on the navy band of the Platform page.', fields: [text('tool', 'Product'), text('title', 'Step'), text('text', 'Detail')] },
  { key: 'platform.ai', label: 'Platform: AI built in', group: 'Home & Platform', path: '/platform', kind: 'list', titleField: 't', itemLabel: 'item',
    description: 'The four AI cards on the Platform page.', fields: [text('t', 'Title'), area('d', 'Description')] },
  { key: 'platform.security', label: 'Platform: security and deployment', group: 'Home & Platform', path: '/platform', kind: 'list', titleField: 't', itemLabel: 'item',
    description: 'The four shields on the Platform page.', fields: [text('t', 'Title'), area('d', 'Description')] },
  { key: 'solutions.spotlights', label: 'Solutions: use case spotlights', group: 'Solutions', path: '/solutions', kind: 'list', titleField: 'title', itemLabel: 'spotlight',
    description: 'The slides in the use case spotlights carousel.',
    fields: [text('sector', 'Sector'), text('title', 'Use case'), area('before', 'Before'), area('after', 'With an agent'), list('checks', 'What the agent does (one per line)'), text('result', 'Result')] },
  { key: 'solutions.cross', label: 'Solutions: processes in every sector', group: 'Solutions', path: '/solutions', kind: 'list', titleField: 't', itemLabel: 'process',
    description: 'The process cards. Each opens the demo form with that process filled in.', fields: [text('t', 'Process'), text('icon', 'Icon', { hint: ICON_HINT })] },
  { key: 'about.glance', label: 'About: at a glance', group: 'About', path: '/about', kind: 'list', titleField: 'text', itemLabel: 'fact',
    description: 'The facts in the Company page hero. Leave the big text empty to show a lock symbol.', fields: [text('big', 'Big text (for example 2021)'), text('text', 'Description')] },
  { key: 'contact.steps', label: 'Contact: what happens in the demo', group: 'Site', path: '/contact', kind: 'list', titleField: 't', itemLabel: 'step',
    description: 'The numbered steps beside the demo form.', fields: [text('t', 'Step'), area('d', 'Description')] },
  {
    key: 'partners.types', label: 'Partner types', group: 'Partners', path: '/partners', kind: 'list', titleField: 'k', itemLabel: 'partner type',
    description: 'The three partner types and what each one gets.',
    fields: [text('k', 'Name'), text('who', 'Who it is for'), area('do', 'What partners do'), list('get', 'What partners get'), text('icon', 'Icon', { hint: ICON_HINT })],
  },
  { key: 'partners.process', label: 'Partner procedure: how to become a partner', group: 'Partners', path: '/partners', kind: 'list', titleField: 'title', itemLabel: 'step',
    description: 'The step-by-step procedure shown on the Partners page. The steps are numbered automatically.',
    fields: [text('title', 'Step title'), text('time', 'How long it takes', { hint: 'For example 1 to 3 days.' }), area('desc', 'What happens'), area('you', 'What the partner does'), area('we', 'What we do'), text('prepare', 'What to have ready (optional)')] },
  { key: 'partners.benefits', label: 'Partner benefits', group: 'Partners', path: '/partners', kind: 'list', titleField: 't', itemLabel: 'benefit', description: 'The “Included for every partner” cards.', fields: [text('t', 'Title'), area('d', 'Description')] },
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
    fields: [text('id', 'Role ID', { hint: SLUG_HINT }), text('title', 'Job title'), text('team', 'Team'), text('place', 'Location', { hint: 'For example Bengaluru, India or Doha, Qatar. A city helps the role show up in Google’s job listings.' }), text('posted', 'Date posted (optional)', { hint: 'YYYY-MM-DD. Used by Google’s job listings; if empty, the date the roles were last saved is used.' }), text('type', 'Type', { hint: 'For example Full-time.' }), area('about', 'About the role'), list('does', 'What you will do'), list('needs', 'What we look for')],
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
// A page on this site (/pricing but not //other-site or /\other-site), a full https:// link, an anchor, email or phone.
const LINK = /^(https?:\/\/|\/(?![\/\\])|#|mailto:|tel:)/i;

function cleanString(v: unknown, max: number, label: string): string {
  const s = typeof v === 'string' ? v : v == null ? '' : String(v);
  if (s.length > max) throw new ValidationError(`“${label}” is too long (the limit is ${max} characters).`);
  return s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
}

/** Validates one object against its fields (used for single Resources library items). */
export function cleanObject(fields: Field[], value: unknown, path: string): Record<string, unknown> {
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
      case 'section': break;
      case 'file':
      case 'image': {
        const s = cleanString(v, 300, label).trim();
        // Only images from this site: the security policy blocks images from other sites.
        if (s && !/^\/(?![/\\])[^\s"'<>]+$/.test(s)) throw new ValidationError(`“${label}” must be an image from the media library (an address starting with /media/).`);
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
    if (f.type === 'section') continue;
    o[f.name] = f.type === 'boolean' ? false : f.type === 'strings' || f.type === 'items' ? [] : f.type === 'select' ? f.options[0].value : '';
  }
  return o;
}

/** Keys of sections that must never be sent to the public website. */
export const PRIVATE_KEYS = new Set(SECTIONS.filter((s) => s.private).map((s) => s.key));
