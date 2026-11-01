import { MediaPicker } from './Media';
import { ICON_OPTIONS, MENU_ICONS } from '../cms/icons';
import { useId, useState, useMemo } from 'react';
import { blankFor } from '../cms/registry';
import type { Field } from '../cms/registry';
import { confirmDialog } from '../ui/dialog';

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
              <button type="button" className="btn small danger" onClick={async () => { if (await confirmDialog({ title: `Delete “${title}”?`, message: 'It is removed when you save. Until then, Discard changes brings it back.', confirm: 'Delete', danger: true })) onChange(value.filter((_, j) => j !== i)); }}>Delete</button>
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
  const wide = (f: Field) => f.type === 'textarea' || f.type === 'strings' || f.type === 'items' || f.type === 'section';
  return (
    <div className="adm-grid2">
      {fields.map((f) => f.type === 'section' ? (
        <div key={f.name} className="adm-section" style={{ gridColumn: '1 / -1' }}><h3>{f.label}</h3>{f.hint && <p>{f.hint}</p>}</div>
      ) : (
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
      // Icon fields store an SVG drawing; offer a visual picker instead of asking people to type it.
      if (field.name === 'icon') return <IconField id={id} label={field.label} hint={field.hint} value={String(value ?? '')} onChange={onChange} />;
      return <Labeled id={id} label={field.label} hint={field.hint}><input id={id} type="text" value={String(value ?? '')} maxLength={field.max ?? 600} onChange={(e) => onChange(e.target.value)} /></Labeled>;
    case 'image':
      return <ImageField id={id} label={field.label} hint={field.hint} value={String(value ?? '')} onChange={onChange} />;
    case 'file':
      return <ImageField id={id} label={field.label} hint={field.hint} value={String(value ?? '')} onChange={onChange} files />;
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

/** An image from the media library: thumbnail, its address, and buttons to choose or remove it. */
function ImageField({ id, label, hint, value, onChange, files = false }: { id: string; label: string; hint?: string; value: string; onChange: (v: unknown) => void; files?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <Labeled id={id} label={label} hint={hint}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ width: 96, height: 60, borderRadius: 8, background: '#EEF1FA', display: 'grid', placeItems: 'center', overflow: 'hidden', flex: 'none' }}>
          {value ? (/\.pdf$/i.test(value) ? <b style={{ color: '#4A5175' }}>PDF</b> : <img src={value} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />) : <small className="hint" style={{ margin: 0 }}>{files ? 'No file' : 'No image'}</small>}
        </span>
        <button type="button" className="btn small" onClick={() => setOpen(true)}>{value ? 'Change…' : 'Choose…'}</button>
        {value && <button type="button" className="btn small" onClick={() => onChange('')}>Remove</button>}
        <input id={id} type="text" value={value} placeholder="/media/…" onChange={(e) => onChange(e.target.value)} style={{ flex: '1 1 180px' }} />
      </div>
      {open && <MediaPicker images={!files} onClose={() => setOpen(false)} onPick={(f) => { onChange(f.path); setOpen(false); }} />}
    </Labeled>
  );
}

/** Picks an icon by sight. The stored value is still the icon's drawing, so existing content keeps working. */
function IconField({ id, label, hint, value, onChange }: { id: string; label: string; hint?: string; value: string; onChange: (v: unknown) => void }) {
  const [open, setOpen] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const current = ICON_OPTIONS.find((o) => MENU_ICONS[o.value] === value);
  const glyph = (d: string, size = 22) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
  return (
    <Labeled id={id} label={label} hint={hint}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ width: 40, height: 40, borderRadius: 10, background: '#EEF1FA', display: 'grid', placeItems: 'center', color: '#3B2E8C' }}>{value ? glyph(value) : null}</span>
        <span className="hint" style={{ margin: 0 }}>{current ? current.label : value ? 'Custom icon' : 'No icon'}</span>
        <button type="button" className="btn small" onClick={() => setOpen((o) => !o)} aria-expanded={open}>{open ? 'Close' : 'Choose icon…'}</button>
        <button type="button" className="btn small" onClick={() => setAdvanced((a) => !a)}>{advanced ? 'Hide drawing' : 'Advanced'}</button>
      </div>
      {open && (
        <div role="listbox" aria-label="Icons" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(92px, 1fr))', gap: 6, marginTop: 8 }}>
          {ICON_OPTIONS.map((o) => (
            <button key={o.value} type="button" role="option" aria-selected={MENU_ICONS[o.value] === value} className="btn small" onClick={() => { onChange(MENU_ICONS[o.value]); setOpen(false); }}
              style={{ display: 'grid', justifyItems: 'center', gap: 4, padding: 8, height: 'auto', borderColor: MENU_ICONS[o.value] === value ? '#6D4AD8' : undefined }}>
              {glyph(MENU_ICONS[o.value])}<small style={{ fontWeight: 500, fontSize: 11, lineHeight: 1.2, textAlign: 'center' }}>{o.label}</small>
            </button>
          ))}
        </div>
      )}
      {advanced && <input id={id} type="text" value={value} onChange={(e) => onChange(e.target.value)} style={{ marginTop: 8 }} />}
    </Labeled>
  );
}

/**
 * Long lists, one item at a time: the items down the left (search, drag or ↑ ↓ to reorder, a dot on changed ones),
 * the selected item's fields on the right. Used for top-level lists with more than four items.
 */
export function ListMaster({ fields, titleField, itemLabel, value, onChange, refs, saved }: { fields: Field[]; titleField: string; itemLabel: string; value: Row[]; onChange: (v: Row[]) => void; refs: Refs; saved: string }) {
  // Items as last saved, to mark changed ones (moving an item doesn't count as a change).
  const savedItems = useMemo(() => { try { return new Set((JSON.parse(saved) as unknown[]).map((x) => JSON.stringify(x))); } catch { return new Set<string>(); } }, [saved]);
  const [sel, setSel] = useState<string>(() => (value[0]?._k as string) ?? '');
  const [q, setQ] = useState('');
  const [drag, setDrag] = useState<number | null>(null);
  const i = Math.max(0, value.findIndex((x) => x._k === sel));
  const cur = value[i];
  const titleOf = (x: Row, n: number) => {
    const raw = x[titleField];
    const sf = fields.find((f) => f.name === titleField);
    const t = sf?.type === 'select' ? sf.options.find((o) => o.value === raw)?.label : raw;
    return typeof t === 'string' && t.trim() ? t : `${itemLabel.charAt(0).toUpperCase() + itemLabel.slice(1)} ${n + 1}`;
  };
  const changed = (x: Row) => !savedItems.has(JSON.stringify(stripKeys(x)));
  const shown = value.map((x, n) => ({ x, n })).filter(({ x, n }) => !q.trim() || titleOf(x, n).toLowerCase().includes(q.trim().toLowerCase()));
  const move = (from: number, to: number) => {
    if (to < 0 || to >= value.length || from === to) return;
    const next = [...value]; const [m] = next.splice(from, 1); next.splice(to, 0, m); onChange(next);
  };
  const add = () => { const row: Row = { ...(withKeys(blankFor(fields)) as Row), _k: newKey() }; onChange([...value, row]); setSel(row._k as string); };
  const duplicate = () => { if (!cur) return; const copy = { ...(withKeys(stripKeys(cur)) as Row), _k: newKey() }; const next = [...value]; next.splice(i + 1, 0, copy); onChange(next); setSel(copy._k as string); };
  const remove = async () => {
    if (!cur || !(await confirmDialog({ title: `Delete “${titleOf(cur, i)}”?`, message: 'It is removed when you save. Until then, Discard changes brings it back.', confirm: 'Delete', danger: true }))) return;
    const next = value.filter((_, j) => j !== i); onChange(next); setSel((next[Math.min(i, next.length - 1)]?._k as string) ?? '');
  };
  return (
    <div className="lm">
      <div className="card lm-list" aria-label={`${itemLabel}s`}>
        {value.length > 8 && <input type="search" className="lm-search" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} aria-label={`Search ${itemLabel}s`} />}
        <ol>
          {shown.map(({ x, n }) => (
            <li key={x._k as string} draggable={!q} onDragStart={() => setDrag(n)} onDragOver={(e) => { e.preventDefault(); }} onDrop={() => { if (drag !== null) move(drag, n); setDrag(null); }} onDragEnd={() => setDrag(null)} className={`${x._k === cur?._k ? 'on' : ''}${drag === n ? ' dragging' : ''}`}>
              <button type="button" onClick={() => setSel(x._k as string)} aria-current={x._k === cur?._k}>
                <span className="lm-n">{n + 1}</span><span className="lm-t">{titleOf(x, n)}</span>{changed(x) && <span className="lm-dot" title="Changed, not saved yet" aria-label="changed" />}
              </button>
            </li>
          ))}
        </ol>
        {shown.length === 0 && <p className="hint" style={{ padding: '0 8px' }}>Nothing matches.</p>}
        <button type="button" className="btn small primary lm-add" onClick={add}>+ Add {itemLabel}</button>
      </div>
      {cur ? (
        <div className="card lm-detail">
          <div className="lm-head">
            <h2>{titleOf(cur, i)}</h2>
            <div className="lm-tools">
              <button type="button" className="btn small" onClick={() => move(i, i - 1)} disabled={i === 0} aria-label="Move up">↑</button>
              <button type="button" className="btn small" onClick={() => move(i, i + 1)} disabled={i === value.length - 1} aria-label="Move down">↓</button>
              <button type="button" className="btn small" onClick={duplicate}>Duplicate</button>
              <button type="button" className="btn small danger" onClick={() => void remove()}>Delete</button>
            </div>
          </div>
          <p className="hint" style={{ marginTop: 0 }}>{itemLabel.charAt(0).toUpperCase() + itemLabel.slice(1)} {i + 1} of {value.length}</p>
          <FieldsGrid fields={fields} value={cur} onChange={(row) => onChange(value.map((x, j) => (j === i ? { ...row, _k: x._k } : x)))} refs={refs} />
        </div>
      ) : (
        <div className="card lm-detail"><p className="hint">No {itemLabel}s yet. Press + Add {itemLabel}.</p></div>
      )}
    </div>
  );
}
