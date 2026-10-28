import { useState } from 'react';

type Consent = { analytics: boolean; marketing: boolean };
const KEY = 'ooa-consent';

function readConsent(): Consent | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Consent) : null;
  } catch {
    return null;
  }
}

/** Cookie consent: non-essential cookies stay off until the visitor opts in. */
export default function CookieBanner() {
  const [open, setOpen] = useState(() => readConsent() === null);
  const [manage, setManage] = useState(false);
  const [prefs, setPrefs] = useState<Consent>({ analytics: false, marketing: false });

  if (!open) return null;
  const save = (consent: Consent) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(consent));
    } catch {
      /* storage unavailable: still close the banner for this visit */
    }
    setOpen(false);
  };
  const btn = { flex: '1 1 140px', minHeight: 46, borderRadius: 12, font: '600 15px Inter, system-ui, sans-serif', cursor: 'pointer' } as const;
  const row = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, minHeight: 32 } as const;

  return (
    <div role="dialog" aria-labelledby="ooa-ck-title" style={{ position: 'fixed', left: 16, right: 16, bottom: 16, zIndex: 60, maxWidth: 560, marginLeft: 'auto', background: '#FFFFFF', color: '#1B2350', borderRadius: 22, padding: 22, boxShadow: '0 24px 60px rgba(15,20,60,0.35)', font: '15px/1.55 Inter, system-ui, sans-serif' }}>
      <strong id="ooa-ck-title" style={{ font: '600 18px Poppins, system-ui, sans-serif' }}>We use cookies</strong>
      <p style={{ margin: '6px 0 0', color: '#4A5175' }}>Essential cookies keep the site working. With your permission, we also use analytics and marketing cookies to improve it.</p>
      {manage && (
        <div id="ooa-ck-prefs" style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10, padding: 14, borderRadius: 14, background: '#F4F6FC' }}>
          <label style={row}><span><strong>Essential</strong><br /><span style={{ color: '#4A5175', fontSize: 14 }}>Always on</span></span><input type="checkbox" checked disabled readOnly style={{ width: 20, height: 20 }} /></label>
          <label style={row}><span><strong>Analytics</strong><br /><span style={{ color: '#4A5175', fontSize: 14 }}>Helps us understand how the site is used</span></span><input type="checkbox" checked={prefs.analytics} onChange={(e) => setPrefs({ ...prefs, analytics: e.target.checked })} style={{ width: 20, height: 20, accentColor: '#6D4AD8' }} /></label>
          <label style={row}><span><strong>Marketing</strong><br /><span style={{ color: '#4A5175', fontSize: 14 }}>Lets us show you relevant content</span></span><input type="checkbox" checked={prefs.marketing} onChange={(e) => setPrefs({ ...prefs, marketing: e.target.checked })} style={{ width: 20, height: 20, accentColor: '#6D4AD8' }} /></label>
        </div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
        <button type="button" onClick={() => save({ analytics: true, marketing: true })} style={{ ...btn, border: 'none', background: 'linear-gradient(90deg, #1F74C9, #6D4AD8)', color: '#FFFFFF' }}>Accept all</button>
        <button type="button" onClick={() => save({ analytics: false, marketing: false })} style={{ ...btn, border: '1.5px solid #DDE3F3', background: '#FFFFFF', color: '#1B2350' }}>Essential only</button>
        <button type="button" aria-expanded={manage} aria-controls="ooa-ck-prefs" onClick={() => (manage ? save(prefs) : setManage(true))} style={{ ...btn, border: 'none', background: 'transparent', color: '#6D4AD8', textDecoration: 'underline', textUnderlineOffset: 4 }}>{manage ? 'Save preferences' : 'Manage preferences'}</button>
      </div>
    </div>
  );
}
