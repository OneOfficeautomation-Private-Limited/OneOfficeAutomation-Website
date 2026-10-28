import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { BLUE, H, LINE, MUTE, NAVY, PURP } from './ui';

const PLAN_NAMES = { community: 'Community', starter: 'Starter', business: 'Business', enterprise: 'Enterprise' } as const;

export default function AccountPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const welcome = (useLocation().state as { welcome?: boolean } | null)?.welcome;
  if (!user) return null;
  const card = { background: '#FFFFFF', borderRadius: 24, padding: 28, boxShadow: '0 14px 32px rgba(31,42,92,0.10)', display: 'flex', flexDirection: 'column' as const, gap: 12 };
  const steps = [
    { t: 'Build your first agent', d: 'Follow the Agent Studio guide to automate one real task.', to: '/resources' },
    { t: 'Explore the platform', d: 'See how Studio, Runner and Command Center fit together.', to: '/platform' },
    { t: 'Book a guided demo', d: 'An automation expert walks you through a process like yours.', to: '/contact' },
  ];
  return (
    <section style={{ background: '#F4F6FC', color: NAVY }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '56px 28px 96px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 30, background: 'linear-gradient(120deg, #1F74C9, #6D4AD8)', color: '#FFFFFF', padding: 'clamp(26px, 4vw, 48px)', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontWeight: 600, opacity: 0.9 }}>{welcome ? 'Your account is ready' : 'My account'}</span>
            <h1 style={{ margin: 0, fontFamily: H, fontWeight: 600, fontSize: 'clamp(2rem, 3.6vw, 3rem)', letterSpacing: '-0.025em' }}>
              {welcome ? `Welcome aboard, ${user.firstName}.` : `Hello, ${user.firstName}.`}
            </h1>
          </div>
          <button type="button" onClick={async () => { await logout(); navigate('/'); }} style={{ minHeight: 48, padding: '0 22px', borderRadius: 12, border: '1.5px solid #FFFFFF', background: 'transparent', color: '#FFFFFF', fontWeight: 600, fontSize: 16, cursor: 'pointer' }}>
            Sign out
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 20 }}>
          <div style={card}>
            <h2 style={{ margin: 0, fontFamily: H, fontWeight: 600, fontSize: 20 }}>Profile</h2>
            <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '10px 18px' }}>
              {[['Name', `${user.firstName} ${user.lastName}`], ['Email', user.email], ['Company', user.company], ['Country', user.country], ['Member since', new Date(user.createdAt).toLocaleDateString()]].map(([k, v]) => (
                <div key={k} style={{ display: 'contents' }}>
                  <dt style={{ color: MUTE }}>{k}</dt>
                  <dd style={{ margin: 0, fontWeight: 500, wordBreak: 'break-word' }}>{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div style={{ ...card, border: '2px solid transparent', background: `linear-gradient(#FFFFFF,#FFFFFF) padding-box, linear-gradient(135deg, ${BLUE}, ${PURP}) border-box` }}>
            <h2 style={{ margin: 0, fontFamily: H, fontWeight: 600, fontSize: 20 }}>Your plan</h2>
            <span style={{ fontFamily: H, fontWeight: 600, fontSize: 40, lineHeight: 1, color: PURP }}>{PLAN_NAMES[user.plan]}</span>
            <p style={{ margin: 0, color: MUTE }}>
              {user.plan === 'community' ? 'Free for learners and individual builders.' : user.plan === 'enterprise' ? 'Our sales team will contact you to set up Enterprise.' : 'Your free trial is set up. Our team will be in touch to get you started.'}
            </p>
            <Link to="/pricing" style={{ marginTop: 'auto', alignSelf: 'flex-start', color: PURP, fontWeight: 600 }}>Compare plans</Link>
          </div>
        </div>
        <div style={card}>
          <h2 style={{ margin: 0, fontFamily: H, fontWeight: 600, fontSize: 20 }}>Next steps</h2>
          <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' }}>
            {steps.map((s, i) => (
              <li key={s.t} style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '14px 0', borderTop: i ? `1px dashed ${LINE}` : 'none' }}>
                <span style={{ flex: 'none', width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(140deg, #1F74C9, #6D4AD8)', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{i + 1}</span>
                <span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}><strong style={{ fontWeight: 600 }}>{s.t}</strong><span style={{ color: MUTE }}>{s.d}</span></span>
                <Link to={s.to} style={{ color: PURP, fontWeight: 600, padding: '8px 0' }}>Go →</Link>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
