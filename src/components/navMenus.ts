/* What each main-menu item shows when hovered. The content comes from /admin → Menus and footer → Dropdown menus.
   The Resources menu is built separately, from the Resources categories and products. */
import { INDUSTRY_ICONS, iconPath } from '../cms/icons';

export type MenuLink = { label: string; desc?: string; to: string; icon: string };
export type MenuSection = { heading: string; links: MenuLink[]; cols?: number };
export type MenuFeature = { kicker: string; title: string; text: string; cta: string; to: string; stat?: string };
export type Menu = { sections: MenuSection[]; feature: MenuFeature };

/** One dropdown as stored in the CMS (nav.menus). */
export type MenuData = {
  menu: string;
  sections: { heading: string; source: string; cols: string; links: { label: string; desc: string; to: string; icon: string }[] }[];
  featureKicker: string; featureStat: string; featureTitle: string; featureText: string; featureCta: string; featureTo: string;
};

const industry = (name: string, base: string, param: string, hash: string): MenuLink => ({
  label: name, to: `${base}?${param}=${encodeURIComponent(name)}#${hash}`, icon: iconPath(INDUSTRY_ICONS[name] ?? 'grid'),
});

/** Turns the stored dropdowns into menus, filling the automatic “By industry” sections. */
export function buildMenus(data: MenuData[], sectors: string[], storyIndustries: string[], vars: Record<string, string> = {}): Record<string, Menu> {
  const fill = (t: string) => t.replace(/\{(\w+)\}/g, (all, k: string) => vars[k] ?? all);
  const out: Record<string, Menu> = {};
  for (const m of data) {
    if (!m.menu) continue;
    out[m.menu] = {
      sections: m.sections.map((s) => ({
        heading: s.heading,
        ...(s.cols === '2' ? { cols: 2 } : {}),
        links: s.source === 'sectors' ? sectors.map((n) => industry(n, '/solutions', 'sector', 'explorer'))
          : s.source === 'stories' ? storyIndustries.map((n) => industry(n, '/customers', 'filter', 'stories'))
          : s.links.map((l) => ({ label: l.label, ...(l.desc ? { desc: fill(l.desc) } : {}), to: l.to, icon: iconPath(l.icon) })),
      })),
      feature: {
        kicker: m.featureKicker, title: m.featureTitle, text: m.featureText, cta: m.featureCta, to: m.featureTo,
        ...(m.featureStat ? { stat: m.featureStat } : {}),
      },
    };
  }
  return out;
}
