import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AdminError, admin } from './api';
import type { MediaFile } from './api';
import { useAdmin } from './AdminContext';
import { HowTo, Notice, fmtDate } from './ui';
import { confirmDialog, copyText, promptDialog } from '../ui/dialog';

const kb = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const isImage = (f: MediaFile) => f.mime.startsWith('image/');

/** Upload button + drop area. Calls onDone with each file once it is stored. */
function Uploader({ onDone, onError, compact = false }: { onDone: (f: MediaFile) => void; onError: (msg: string) => void; compact?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(0);
  const [over, setOver] = useState(false);
  const send = async (files: FileList | File[]) => {
    for (const f of Array.from(files)) {
      setBusy((n) => n + 1);
      try { onDone(await admin.mediaUpload(f)); } catch (e) { onError(`${f.name}: ${(e as Error).message}`); } finally { setBusy((n) => n - 1); }
    }
  };
  return (
    <div
      className="card" onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); void send(e.dataTransfer.files); }}
      style={{ borderStyle: 'dashed', borderColor: over ? '#6D4AD8' : undefined, background: over ? '#F4F0FF' : undefined, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', padding: compact ? 12 : 18 }}
    >
      <button type="button" className="btn primary" onClick={() => input.current?.click()}>{busy ? `Uploading ${busy}…` : 'Upload files'}</button>
      <span className="hint" style={{ margin: 0 }}>or drag them here. PNG, JPEG, WebP, GIF or PDF, up to 5 MB each.</span>
      <input ref={input} type="file" multiple accept="image/png,image/jpeg,image/webp,image/gif,application/pdf" hidden onChange={(e) => { if (e.target.files) void send(e.target.files); e.target.value = ''; }} />
    </div>
  );
}

/** /admin/media — every uploaded image and PDF. */
export function MediaLibrary() {
  const { me } = useAdmin();
  const [items, setItems] = useState<MediaFile[] | null>(null);
  const [q, setQ] = useState('');
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const canEdit = me?.role !== 'viewer';
  const load = useCallback(() => admin.mediaList().then((r) => setItems(r.items)).catch((e) => setMsg({ kind: 'error', text: (e as Error).message })), []);
  useEffect(() => { void load(); }, [load]);
  const shown = useMemo(() => (items ?? []).filter((f) => !q.trim() || `${f.name} ${f.alt}`.toLowerCase().includes(q.trim().toLowerCase())), [items, q]);
  const copy = (text: string, what: string) => copyText(text, what);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div><h1 style={{ fontSize: 28 }}>Media library</h1><p className="hint" style={{ margin: '4px 0 0', fontSize: 15 }}>Images and PDFs for the website: logos, screenshots, banners and downloads.</p></div>
      <HowTo />
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      {canEdit && <Uploader onDone={(f) => { setItems((l) => [f, ...(l ?? []).filter((x) => x.id !== f.id)]); setMsg({ kind: 'success', text: f.duplicate ? `${f.name} was already in the library.` : `${f.name} uploaded. Add a description so everyone can understand it.` }); }} onError={(t) => setMsg({ kind: 'error', text: t })} />}
      <label className="lib-form" style={{ maxWidth: 360 }}>Search<input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="File name or description" /></label>
      {items === null ? <p className="hint">Loading…</p> : shown.length === 0 ? <p className="hint">No files yet.</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 14 }}>
          {shown.map((f) => (
            <div key={f.id} className="card" style={{ padding: 12, display: 'grid', gap: 8, alignContent: 'start' }}>
              <div style={{ aspectRatio: '16 / 10', borderRadius: 8, background: '#EEF1FA', display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
                {isImage(f) ? <img src={f.path} alt={f.alt} loading="lazy" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /> : <b style={{ color: '#4A5175' }}>PDF</b>}
              </div>
              <b style={{ fontSize: 14, overflowWrap: 'anywhere' }}>{f.name}</b>
              <small className="hint" style={{ margin: 0 }}>{kb(f.size)}{f.width ? ` · ${f.width} × ${f.height}` : ''} · {fmtDate(f.createdAt)} by {f.createdBy}</small>
              <label className="lib-form" style={{ fontSize: 13 }}>Description (alt text)
                <input defaultValue={f.alt} disabled={!canEdit} placeholder={isImage(f) ? 'What the image shows' : 'What the document is'}
                  onBlur={async (e) => { const v = e.target.value.trim(); if (v !== f.alt) { try { const u = await admin.mediaUpdate(f.id, v); setItems((l) => (l ?? []).map((x) => (x.id === f.id ? u : x))); } catch (er) { setMsg({ kind: 'error', text: (er as Error).message }); } } }} />
              </label>
              {!f.alt && isImage(f) && <small style={{ color: '#9B5B00' }}>Add a description: screen readers and search engines use it.</small>}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button type="button" className="btn small" onClick={() => void copy(f.path, 'Address')}>Copy address</button>
                {isImage(f) && <button type="button" className="btn small" onClick={() => void copy(`![${f.alt || f.name}](${f.path})`, 'Article image code')}>Copy for articles</button>}
                <button type="button" className="btn small" onClick={async () => { const u = await admin.mediaUsage(f.id); setMsg({ kind: 'success', text: u.usedIn.length ? `${f.name} is used in: ${u.usedIn.join('; ')}` : `${f.name} isn’t used anywhere yet.` }); }}>Where used</button>
                {me?.role === 'admin' && <button type="button" className="btn small danger" onClick={async () => {
                  if (!(await confirmDialog({ title: `Delete ${f.name}?`, message: 'The file is removed from the media library for good.', confirm: 'Delete file', danger: true }))) return;
                  try { await admin.mediaDelete(f.id); setItems((l) => (l ?? []).filter((x) => x.id !== f.id)); }
                  catch (e) { if (e instanceof AdminError && e.status === 409 && await confirmDialog({ title: 'This file is still in use', message: `${e.message}\n\nIf you delete it anyway, those places will show a broken image.`, confirm: 'Delete anyway', danger: true })) { await admin.mediaDelete(f.id, true); setItems((l) => (l ?? []).filter((x) => x.id !== f.id)); } else if (!(e instanceof AdminError && e.status === 409)) setMsg({ kind: 'error', text: (e as Error).message }); }
                }}>Delete</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** A pop-up to choose (or upload) an image, used by image fields in forms. */
export function MediaPicker({ onPick, onClose, images = true }: { onPick: (f: MediaFile) => void; onClose: () => void; images?: boolean }) {
  const [items, setItems] = useState<MediaFile[] | null>(null);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  useEffect(() => { admin.mediaList().then((r) => setItems(r.items)).catch((e) => setErr((e as Error).message)); }, []);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
  const shown = (items ?? []).filter((f) => (!images || isImage(f)) && (!q.trim() || `${f.name} ${f.alt}`.toLowerCase().includes(q.trim().toLowerCase())));
  return (
    <div role="dialog" aria-modal="true" aria-label="Choose a file" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(15,21,51,.45)', display: 'grid', placeItems: 'center', padding: 16 }}>
      <div className="card" onClick={(e) => e.stopPropagation()} style={{ width: 'min(900px, 100%)', maxHeight: '85vh', overflow: 'auto', display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}><h2 style={{ margin: 0, fontSize: 18 }}>Choose {images ? 'an image' : 'a file'}</h2><button type="button" className="btn small" onClick={onClose}>Close</button></div>
        {err && <Notice kind="error">{err}</Notice>}
        <Uploader compact onDone={(f) => onPick(f)} onError={setErr} />
        <input type="search" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
          {shown.map((f) => (
            <button key={f.id} type="button" onClick={() => onPick(f)} className="card" style={{ padding: 8, display: 'grid', gap: 6, cursor: 'pointer', textAlign: 'left' }}>
              <span style={{ aspectRatio: '4 / 3', background: '#EEF1FA', borderRadius: 6, display: 'grid', placeItems: 'center', overflow: 'hidden' }}>{isImage(f) ? <img src={f.path} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /> : <b>PDF</b>}</span>
              <small style={{ overflowWrap: 'anywhere' }}>{f.name}</small>
            </button>
          ))}
        </div>
        {items && shown.length === 0 && <p className="hint">Nothing here yet. Upload a file above.</p>}
      </div>
    </div>
  );
}
