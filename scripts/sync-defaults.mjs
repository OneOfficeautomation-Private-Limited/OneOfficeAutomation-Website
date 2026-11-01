// Default content lives in ONE file: src/cms/defaults.generated.json.
// The site's main bundle only needs a few small sections, so this script copies them into
// src/cms/core.defaults.json. Never edit core.defaults.json by hand.
//   node scripts/sync-defaults.mjs          write core.defaults.json
//   node scripts/sync-defaults.mjs --check  fail if it is out of date (used by npm run typecheck)
import { readFileSync, writeFileSync } from 'node:fs';

const CORE_KEYS = ['site.settings', 'resources.categories', 'resources.products', 'nav.main', 'nav.menus', 'nav.header', 'nav.footer', 'seo.site', 'seo.pages', 'site.analytics'];
const all = JSON.parse(readFileSync('src/cms/defaults.generated.json', 'utf8'));
const core = Object.fromEntries(CORE_KEYS.map((k) => [k, all[k]]));
// Industry names for the automatic "By industry" menu sections, used until Solutions or Customer stories are edited.
core['nav.industries'] = {
  sectors: all['solutions.sectors'].map((s) => s.k),
  stories: [...new Set(all['customers.stories'].map((s) => s.ind))],
};
const text = JSON.stringify(core, null, 2) + '\n';
const path = 'src/cms/core.defaults.json';

if (process.argv.includes('--check')) {
  let current = '';
  try { current = readFileSync(path, 'utf8'); } catch { /* missing */ }
  if (current !== text) {
    console.error('src/cms/core.defaults.json is out of date. Run: node scripts/sync-defaults.mjs');
    process.exit(1);
  }
} else {
  writeFileSync(path, text);
}
