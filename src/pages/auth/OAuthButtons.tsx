import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FormError, H, LINE, MUTE, NAVY } from './ui';

type Providers = { google: boolean; github: boolean };
let cached: Providers | null = null;

const MESSAGES: Record<string, string> = {
  state: 'That sign-in took too long or was interrupted. Please try again.',
  denied: 'The sign-in was cancelled.',
  email: 'We couldn’t get a verified email address from that account. Make sure the email on it is verified, or use your email and password.',
  suspended: 'This account is not active. Please contact support@oneofficeautomation.com.',
  no_partner: 'There is no approved partner account for that email address. Use the email your partner team invited, or apply to become a partner first.',
  inactive: 'This partner account is inactive. Please contact our partner team.',
  busy: 'Too many attempts. Please wait a few minutes and try again.',
  unavailable: 'That sign-in option isn’t available right now.',
  failed: 'Something went wrong while signing in. Please try again or use your email and password.',
};

const GOOGLE = (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
  </svg>
);
const GITHUB = (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="currentColor" d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.18-3.08-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.62 1.59.23 2.76.11 3.05.74.8 1.18 1.82 1.18 3.08 0 4.42-2.7 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5z" />
  </svg>
);

/** "Continue with Google / GitHub". Shown only for providers the site has set up. kind="partner" signs in to an approved partner account. */
export default function OAuthButtons({ kind = 'customer', plan, signUp = false, compact = false }: { kind?: 'customer' | 'partner'; plan?: string; signUp?: boolean; compact?: boolean }) {
  const [providers, setProviders] = useState<Providers | null>(cached);
  const [params] = useSearchParams();
  useEffect(() => {
    if (cached) return;
    let alive = true;
    fetch('/api/oauth/providers').then((r) => (r.ok ? r.json() : null)).then((p: Providers | null) => { cached = p ?? { google: false, github: false }; if (alive) setProviders(cached); }).catch(() => undefined);
    return () => { alive = false; };
  }, []);

  const code = params.get('oauth');
  const error = code ? MESSAGES[code] ?? MESSAGES.failed : '';
  const list = (['google', 'github'] as const).filter((p) => providers?.[p]);
  if (!list.length && !error) return null;

  const href = (p: string) => `/api/oauth/${p}/start?as=${kind}${plan && kind === 'customer' ? `&plan=${encodeURIComponent(plan)}` : ''}`;
  const verb = signUp ? 'Sign up' : 'Continue';
  return (
    <div style={{ display: 'flex', flexDirection: compact ? 'row' : 'column', flexWrap: 'wrap', gap: compact ? 8 : 10 }}>
      <div style={{ flexBasis: '100%' }}><FormError message={error} /></div>
      {list.map((p) => (
        <a key={p} href={href(p)} className="oa-btn" aria-label={`${verb} with ${p === 'google' ? 'Google' : 'GitHub'}`} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: compact ? 44 : 50, padding: '0 16px', borderRadius: 12, flex: compact ? '1 1 0' : undefined,
          border: `1.5px solid ${LINE}`, background: '#FFFFFF', color: NAVY, fontFamily: H, fontWeight: 600, fontSize: 15, textDecoration: 'none',
        }}>
          {p === 'google' ? GOOGLE : GITHUB}{compact ? (p === 'google' ? 'Google' : 'GitHub') : `${verb} with ${p === 'google' ? 'Google' : 'GitHub'}`}
        </a>
      ))}
      {list.length > 0 && !compact && (
        <div role="separator" aria-label="or" style={{ display: 'flex', alignItems: 'center', gap: 12, color: MUTE, fontSize: 13, margin: '2px 0' }}>
          <span style={{ flex: 1, height: 1, background: LINE }} />or use your email<span style={{ flex: 1, height: 1, background: LINE }} />
        </div>
      )}
    </div>
  );
}
