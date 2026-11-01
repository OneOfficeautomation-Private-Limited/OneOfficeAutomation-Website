import { useState } from 'react';
import { Link } from 'react-router-dom';

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
      window.dispatchEvent(new Event('ooa-consent'));
    } catch {
      /* storage unavailable: still close the banner for this visit */
    }
    setOpen(false);
  };
  return (
    <div role="dialog" aria-label="Cookie preferences" aria-describedby="ooa-ck-text" className="ck">
      <p id="ooa-ck-text">We use essential cookies to run this site, and analytics and marketing cookies only if you allow them. <Link to="/privacy">Privacy policy</Link></p>
      {manage && (
        <div id="ooa-ck-prefs" className="ck-prefs">
          <label><span><b>Essential</b><small>Always on</small></span><input type="checkbox" checked disabled readOnly /></label>
          <label><span><b>Analytics</b><small>Helps us understand how the site is used</small></span><input type="checkbox" checked={prefs.analytics} onChange={(e) => setPrefs({ ...prefs, analytics: e.target.checked })} /></label>
          <label><span><b>Marketing</b><small>Lets us show you relevant content</small></span><input type="checkbox" checked={prefs.marketing} onChange={(e) => setPrefs({ ...prefs, marketing: e.target.checked })} /></label>
        </div>
      )}
      <div className="ck-btns">
        <button type="button" className="ck-main" onClick={() => save({ analytics: true, marketing: true })}>Accept all</button>
        <button type="button" className="ck-line" onClick={() => save({ analytics: false, marketing: false })}>Essential only</button>
        <button type="button" className="ck-link" aria-expanded={manage} aria-controls="ooa-ck-prefs" onClick={() => (manage ? save(prefs) : setManage(true))}>{manage ? 'Save choices' : 'Manage'}</button>
      </div>
    </div>
  );
}
