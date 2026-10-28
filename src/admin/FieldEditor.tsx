import { useId, useState } from 'react';
import { blankFor } from '../cms/registry';
import type { Field } from '../cms/registry';

export type Row = Record<string, unknown> & { _k?: string };
export type Refs = Record<string, Record<string, unknown>[]>;

let counter = 0;
const newKey = () => `k${Date.now().toString(36)}${(counter++).toString(36)}`;

/** Adds a client-side key to every row of every list so rows keep their identity while being edited. */
export function withKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map((x) => (x && typeof x === 'object' && !Array.isArray(x) ? { ...(withKeys(x) as Row), _k: newKey() } : withKeys(x)));
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v as Row).map(([k, x]) => [k, withKeys(x)]));
  return v;
}
export function stripKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(stripKeys);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v as Row).filter(([k]) => k !== '_k').map(([k, x]) => [k, stripKeys(x)]));
  return v;
}

function Labeled({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="lbl" htmlFor={id}>{label}</label>
      {children}
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}

function StringsEditor({ field, value, onChange }: { field: Extract<Field, { type: 'strings' }>; value: string[]; onChange: (v: string[]) => void }) {
  const set = (i: number, text: string) => onChange(value.map((x, j) => (j === i ? text : x)));
  return (
    <div>
      <div className="lbl">{field.label}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {value.map((s, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <textarea aria-label={`${field.label} ${i + 1}`} rows={field.rows ?? 2} value={s} onChange={(e) => set(i, e.target.value)} style={{ flex: 1 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <button type="button" className="btn small" aria-label="Move up" disabled={i === 0} onClick={() => onChange(value.map((x, j) => (j === i - 1 ? value[i] : j === i ? value[i - 1] : x)))}>↑</button>
              <button type="button" className="btn small" aria-label="Move down" disabled={i === value.length - 1} onClick={() => onChange(value.map((x, j) => (j === i + 1 ? value[i] : j === i ? value[i + 1] : x)))}>↓</button>
              <button type="button" className="btn small danger" aria-label={`Remove ${field.label} ${i + 1}`} onClick={() => onChange(value.filter((_, j) => j !== i))}>✕</button>
            </div>
          </div>
        ))}
        <div><button type="button" className="btn small" onClick={() => onChange([...value, ''])}>+ Add</button></div>
      </div>
      {field.hint && <div className="hint">{field.hint}</div>}
    </div>
  );
}

export function ItemsEditor({ fields, titleField, itemLabel, value, onChange, refs, startOpen = false }: { fields: Field[]; titleField: string; itemLabel: string; value: Row[]; onChange: (v: Row[]) => void; refs: Refs; startOpen?: boolean }) {
  const [open, setOpen] = useState<Record<string, boolean>>(() => (startOpen && value[0]?._k ? { [value[0]._k]: true } : {}));
  const update = (i: number, row: Row) => onChange(value.map((x, j) => (j === i ? row : x)));
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const add = () => {
    const row: Row = { ...(withKeys(blankFor(fields)) as Row), _k: newKey() };
    setOpen({ ...open, [row._k as string]: true });
    onChange([...value, row]);
  };
  const duplicate = (i: number) => {
    const copy = { ...(withKeys(stripKeys(value[i])) as Row), _k: newKey() };
    const next = [...value];
    next.splice(i + 1, 0, copy);
    setOpen({ ...open, [copy._k as string]: true });
    onChange(next);
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {value.length === 0 && <div className="hint">No {itemLabel}s yet.</div>}
      {value.map((row, i) => {
        const k = row._k ?? String(i);
        const isOpen = !!open[k];
        const title = String(row[titleField] ?? '').trim() || `(untitled ${itemLabel})`;
        return (
          <div key={k} className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, padding: '8px 10px 8px 14px', background: isOpen ? '#F4F6FC' : '#fff' }}>
              <button type="button" aria-expanded={isOpen} onClick={() => setOpen({ ...open, [k]: !isOpen })} style={{ flex: '1 1 160px', minWidth: 0, textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', font: 'inherit', fontWeight: 600, color: 'inherit', minHeight: 40, display: 'flex', gap: 10, alignItems: 'center' }}>
                <span aria-hidden="true" style={{ display: 'inline-block', transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}>▸</span>
                <span style={{ color: '#4A5175', fontWeight: 500 }}>{i + 1}.</span> {title}
              </button>
              <button type="button" className="btn small" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
              <button type="button" className="btn small" aria-label="Move down" disabled={i === value.length - 1} onClick={() => move(i, 1)}>↓</button>
              <button type="button" className="btn small" onClick={() => duplicate(i)}>Duplicate</button>
              <button type="button" className="btn small danger" onClick={() => { if (window.confirm(`Delete “${title}”?`)) onChange(value.filter((_, j) => j !== i)); }}>Delete</button>
            </div>
            {isOpen && (
              <div style={{ padding: 16, display: 'grid', gap: 14 }}>
                <FieldsGrid fields={fields} value={row} onChange={(r) => update(i, r)} refs={refs} />
              </div>
            )}
          </div>
        );
      })}
      <div><button type="button" className="btn" onClick={add}>+ Add {itemLabel}</button></div>
    </div>
  );
}

export function FieldsGrid({ fields, value, onChange, refs }: { fields: Field[]; value: Row; onChange: (v: Row) => void; refs: Refs }) {
  const wide = (f: Field) => f.type === 'textarea' || f.type === 'strings' || f.type === 'items';
  return (
    <div className="adm-grid2">
      {fields.map((f) => (
        <div key={f.name} style={wide(f) ? { gridColumn: '1 / -1' } : undefined}>
          <FieldEditor field={f} value={value[f.name]} onChange={(v) => onChange({ ...value, [f.name]: v })} refs={refs} />
        </div>
      ))}
    </div>
  );
}

export function FieldEditor({ field, value, onChange, refs }: { field: Field; value: unknown; onChange: (v: unknown) => void; refs: Refs }) {
  const id = useId();
  switch (field.type) {
    case 'text':
      return <Labeled id={id} label={field.label} hint={field.hint}><input id={id} type="text" value={String(value ?? '')} maxLength={field.max ?? 600} onChange={(e) => onChange(e.target.value)} /></Labeled>;
    case 'url':
      return <Labeled id={id} label={field.label} hint={field.hint}><input id={id} type="text" inputMode="url" placeholder="https://…" value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} /></Labeled>;
    case 'textarea':
      return <Labeled id={id} label={field.label} hint={field.hint}><textarea id={id} rows={field.rows ?? 3} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} /></Labeled>;
    case 'boolean':
      return (
        <div>
          <label style={{ display: 'flex', gap: 10, alignItems: 'center', minHeight: 44, fontWeight: 600, cursor: 'pointer' }}>
            <input type="checkbox" checked={value === true} onChange={(e) => onChange(e.target.checked)} style={{ width: 20, height: 20, accentColor: '#6D4AD8' }} /> {field.label}
          </label>
          {field.hint && <div className="hint">{field.hint}</div>}
        </div>
      );
    case 'select':
      return (
        <Labeled id={id} label={field.label} hint={field.hint}>
          <select id={id} value={String(value ?? field.options[0].value)} onChange={(e) => onChange(e.target.value)}>
            {field.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Labeled>
      );
    case 'ref': {
      const options = (refs[field.ref] ?? []).map((r) => ({ value: String(r[field.refValue] ?? ''), label: String(r[field.refLabel] ?? r[field.refValue] ?? '') }));
      const current = String(value ?? '');
      if (current && !options.some((o) => o.value === current)) options.push({ value: current, label: `${current} (not found)` });
      return (
        <Labeled id={id} label={field.label} hint={field.hint}>
          <select id={id} value={current} onChange={(e) => onChange(e.target.value)}>
            {!current && <option value="">Choose…</option>}
            {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Labeled>
      );
    }
    case 'strings':
      return <StringsEditor field={field} value={Array.isArray(value) ? (value as string[]) : []} onChange={onChange} />;
    case 'items':
      return (
        <div>
          <div className="lbl">{field.label}</div>
          <ItemsEditor fields={field.fields} titleField={field.titleField} itemLabel={field.itemLabel} value={Array.isArray(value) ? (value as Row[]) : []} onChange={onChange} refs={refs} />
          {field.hint && <div className="hint">{field.hint}</div>}
        </div>
      );
  }
}
