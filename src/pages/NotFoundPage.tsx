import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <section style={{ maxWidth: 720, margin: '0 auto', padding: '120px 28px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'center' }}>
      <span style={{ fontFamily: 'Poppins, system-ui, sans-serif', fontWeight: 600, fontSize: 'clamp(4rem, 10vw, 7rem)', lineHeight: 1, color: '#8FB8FF' }}>404</span>
      <h1 style={{ margin: 0, fontFamily: 'Poppins, system-ui, sans-serif', fontWeight: 600, fontSize: 'clamp(1.8rem, 3vw, 2.4rem)' }}>This page took the day off.</h1>
      <p style={{ margin: 0, color: '#DCE3FA', fontSize: 18 }}>The page you’re looking for doesn’t exist or has moved.</p>
      <Link to="/" style={{ background: '#FFFFFF', color: '#1B2350', textDecoration: 'none', fontWeight: 600, padding: '14px 26px', borderRadius: 12 }}>Back to home</Link>
    </section>
  );
}
