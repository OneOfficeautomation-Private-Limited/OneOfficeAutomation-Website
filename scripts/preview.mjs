// npm run preview:file → preview-dist/oneofficeautomation-preview.html (one file, nothing external but Quicksand)
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

execSync('npx vite build --config preview/vite.config.ts', { stdio: 'inherit' });
const dir = 'preview-dist';
let html = readFileSync(join(dir, 'index.html'), 'utf8');
html = html.replace(/<script type="module" crossorigin src="\.\/([^"]+)"><\/script>/g, (_, f) =>
  `<script type="module">${readFileSync(join(dir, f), 'utf8').replace(/<\/script/gi, '<\\/script')}</script>`);
html = html.replace(/<link rel="stylesheet" crossorigin href="\.\/([^"]+)">/g, (_, f) => `<style>${readFileSync(join(dir, f), 'utf8')}</style>`);
if (/src="\.\/assets|href="\.\/assets/.test(html)) throw new Error('Something was not inlined');
writeFileSync(join(dir, 'oneofficeautomation-preview.html'), html);
console.log('Preview written:', join(dir, 'oneofficeautomation-preview.html'), `${(html.length / 1024).toFixed(0)} KB`);
