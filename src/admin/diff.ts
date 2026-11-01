import type { Field, Section } from '../cms/registry';

/** One readable difference between two versions of a section, using the admin's own field labels. */
export interface Change { where: string; before: string; after: string }

const show = (v: unknown, f?: Field): string => {
  if (v === undefined || v === null || v === '') return '(empty)';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (f?.type === 'select') return f.options.find((o) => o.value === v)?.label ?? String(v);
  if (Array.isArray(v)) return v.length ? v.join(' · ') : '(empty)';
  const s = String(v);
  return s.length > 160 ? `${s.slice(0, 157)}…` : s;
};

function items(fields: Field[], itemLabel: string, titleField: string, before: unknown, after: unknown, where: string, out: Change[]) {
  const a = Array.isArray(before) ? (before as Record<string, unknown>[]) : [];
  const b = Array.isArray(after) ? (after as Record<string, unknown>[]) : [];
  const title = (x: Record<string, unknown> | undefined) => (x && typeof x[titleField] === 'string' && x[titleField] ? ` “${String(x[titleField]).slice(0, 60)}”` : '');
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const label = where ? itemLabel : itemLabel.charAt(0).toUpperCase() + itemLabel.slice(1);
    const at = `${where}${label} ${i + 1}${title(b[i] ?? a[i])}`;
    if (i >= a.length) out.push({ where: at, before: '(not there)', after: 'Added' });
    else if (i >= b.length) out.push({ where: at, before: 'Was there', after: 'Removed' });
    else fieldsDiff(fields, a[i], b[i], `${at} › `, out);
  }
}

function fieldsDiff(fields: Field[], before: unknown, after: unknown, where: string, out: Change[]) {
  const a = (before ?? {}) as Record<string, unknown>, b = (after ?? {}) as Record<string, unknown>;
  for (const f of fields) {
    if (f.type === 'items') { items(f.fields, f.itemLabel, f.titleField, a[f.name], b[f.name], `${where}${f.label} › `, out); continue; }
    if (JSON.stringify(a[f.name] ?? (f.type === 'boolean' ? false : f.type === 'strings' ? [] : '')) === JSON.stringify(b[f.name] ?? (f.type === 'boolean' ? false : f.type === 'strings' ? [] : ''))) continue;
    out.push({ where: `${where}${f.label}`, before: show(a[f.name], f), after: show(b[f.name], f) });
  }
}

/** Everything that differs between the live version and a proposed one. */
export function describeChanges(section: Section, before: unknown, after: unknown): Change[] {
  const out: Change[] = [];
  if (section.kind === 'list') items(section.fields, section.itemLabel ?? 'Item', section.titleField ?? '', before, after, '', out);
  else fieldsDiff(section.fields, before, after, '', out);
  return out;
}
