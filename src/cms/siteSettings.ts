/**
 * Company details (/admin → Site settings → Company details), shared by the website and the server.
 * Stored as a list of offices (one per country or legal entity) and a list of social links.
 * siteView() also provides the older single-value names (legalName, phoneIndia, linkedin…) that pages and
 * legal texts use, worked out from those lists, so everything keeps working as offices are added.
 */
export type Office = { country: string; legalName: string; regLabel: string; regNumber: string; address: string; phone: string; supportEmail: string; salesEmail: string; head: boolean };
export type Social = { platform: string; url: string };
export type SiteSettingsV2 = {
  offices: Office[]; socials: Social[]; footerTagline: string;
  announcementOn: boolean; announcementText: string; announcementLabel: string; announcementUrl: string;
};

export const SOCIAL_PLATFORMS = [
  { value: 'linkedin', label: 'LinkedIn' }, { value: 'facebook', label: 'Facebook' }, { value: 'instagram', label: 'Instagram' },
  { value: 'youtube', label: 'YouTube' }, { value: 'x', label: 'X (Twitter)' }, { value: 'whatsapp', label: 'WhatsApp' },
];
const PLATFORMS = SOCIAL_PLATFORMS.map((p) => p.value);

const str = (v: unknown) => (typeof v === 'string' ? v : '');
/** A link to a site's home page (https://www.linkedin.com/) is a placeholder, not a company profile. */
const isPlaceholder = (u: string) => /^https?:\/\/(www\.)?[^/]+\/?$/i.test(u.trim());

/** Any stored version (the old single fields, or the new lists) in the current shape. */
export function toV2(raw: unknown): SiteSettingsV2 {
  const r = (raw ?? {}) as Record<string, unknown>;
  const base = {
    footerTagline: str(r.footerTagline), announcementOn: r.announcementOn === true,
    announcementText: str(r.announcementText), announcementLabel: str(r.announcementLabel), announcementUrl: str(r.announcementUrl),
  };
  if (Array.isArray(r.offices)) {
    return {
      ...base,
      offices: (r.offices as Partial<Office>[]).map((o) => ({ country: str(o.country), legalName: str(o.legalName), regLabel: str(o.regLabel), regNumber: str(o.regNumber), address: str(o.address), phone: str(o.phone), supportEmail: str(o.supportEmail), salesEmail: str(o.salesEmail), head: o.head === true })),
      socials: (Array.isArray(r.socials) ? (r.socials as Partial<Social>[]) : []).map((x) => ({ platform: str(x.platform), url: str(x.url) })).filter((x) => x.url),
    };
  }
  // The earlier version: one set of fields, with phones for India and Qatar.
  const offices: Office[] = [{
    country: 'India', legalName: str(r.legalName), regLabel: str(r.cin) ? 'CIN' : '', regNumber: str(r.cin), address: str(r.address),
    phone: str(r.phoneIndia), supportEmail: str(r.supportEmail), salesEmail: str(r.salesEmail), head: true,
  }];
  if (str(r.phoneQatar)) offices.push({ country: 'Qatar', legalName: '', regLabel: '', regNumber: '', address: 'Doha, Qatar', phone: str(r.phoneQatar), supportEmail: '', salesEmail: '', head: false });
  const socials = PLATFORMS.map((p) => ({ platform: p, url: str(r[p]) })).filter((x) => x.url && !isPlaceholder(x.url));
  return { ...base, offices, socials };
}

const digits = (s: string) => s.replace(/[^+0-9]/g, '');

/** Everything pages need: the lists, the head office, and the older single-value names. */
export function siteView(raw: unknown) {
  const v = toV2(raw);
  const offices = v.offices.filter((o) => o.country || o.address || o.phone || o.legalName);
  const head = offices.find((o) => o.head) ?? offices[0] ?? { country: '', legalName: '', regLabel: '', regNumber: '', address: '', phone: '', supportEmail: '', salesEmail: '', head: true };
  const inCountry = (re: RegExp) => offices.find((o) => re.test(o.country));
  const firstEmail = (k: 'supportEmail' | 'salesEmail') => head[k] || offices.find((o) => o[k])?.[k] || '';
  const social = Object.fromEntries(PLATFORMS.map((p) => [p, v.socials.find((s) => s.platform === p)?.url ?? '']));
  const phoneIndia = inCountry(/india/i)?.phone ?? '';
  const phoneQatar = inCountry(/qatar/i)?.phone ?? '';
  return {
    ...v, offices, head,
    others: offices.filter((o) => o !== head),
    legalName: head.legalName, cin: head.regNumber, regLabel: head.regLabel, address: head.address,
    supportEmail: firstEmail('supportEmail'), salesEmail: firstEmail('salesEmail'),
    phoneIndia, phoneQatar, telIndia: digits(phoneIndia), telQatar: digits(phoneQatar),
    linkedin: social.linkedin, facebook: social.facebook, instagram: social.instagram, youtube: social.youtube, x: social.x, whatsapp: social.whatsapp,
    tel: digits,
    website: 'oneofficeautomation.com',
  };
}
export type SiteView = ReturnType<typeof siteView>;
