import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { GROUPS, SECTIONS } from '../cms/registry';
import { admin } from './api';
import type { Dashboard as Data } from './api';
import { useAdmin } from './AdminContext';
import { fmtDate } from './ui';

const KIND_LABEL: Record<string, string> = { demo: 'Demo requests', partner: 'Partner applications', newsletter: 'Newsletter sign-ups', career: 'Job applications' };

export default function Dashboard() {
  const { me } = useAdmin();
  const [data, setData] = useState<Data | null>(null);
  const [custom, setCustom] = useState<Record<string, string>>({});
  useEffect(() => {
    admin.dashboard().then(setData).catch(() => undefined);
    admin.contentList().then((r) => setCustom(Object.fromEntries(r.items.map((i) => [i.key, i.updated_at])))).catch(() => undefined);
  }, []);
  const fresh = (kind: string) => data?.leads.filter((l) => l.kind === kind && l.status === 'new').reduce((a, l) => a + l.n, 0) ?? 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div><h1 style={{ fontSize: 28 }}>Welcome, {me?.name.split(' ')[0]}</h1><p style={{ margin: '6px 0 0', color: '#4A5175' }}>Edit any part of the website below. Changes go live within seconds, and every save keeps a history you can restore.</p></div>
      <section aria-label="Inbox" className="adm-grid2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))' }}>
        {Object.entries(KIND_LABEL).map(([k, label]) => (
          <Link key={k} to={`/admin/inbox?kind=${k}`} className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{ fontFamily: 'Poppins, system-ui, sans-serif', fontWeight: 600, fontSize: 32, color: fresh(k) ? '#6D4AD8' : '#1B2350' }}>{fresh(k)}</div>
            <div style={{ fontWeight: 600 }}>{label}</div><div className="hint">new</div>
          </Link>
        ))}
        <div className="card"><div style={{ fontFamily: 'Poppins, system-ui, sans-serif', fontWeight: 600, fontSize: 32 }}>{data?.customers ?? '–'}</div><div style={{ fontWeight: 600 }}>Customer accounts</div><div className="hint">registered</div></div>
      </section>
      {GROUPS.map((g) => (
        <section key={g} aria-labelledby={`g-${g}`}>
          <h2 id={`g-${g}`} style={{ fontSize: 19, marginBottom: 10 }}>{g}</h2>
          <div className="card" style={{ padding: 0 }}>
            {SECTIONS.filter((s) => s.group === g).map((s, i) => (
              <div key={s.key} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, padding: '14px 18px', borderTop: i ? '1px solid #DDE3F3' : 'none' }}>
                <div style={{ flex: '1 1 260px', minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{s.label}</div>
                  <div className="hint" style={{ marginTop: 2 }}>{s.description}</div>
                </div>
                <span className={`badge ${custom[s.key] ? 'custom' : 'def'}`}>{custom[s.key] ? `Edited ${fmtDate(custom[s.key])}` : 'Original'}</span>
                <Link className="btn small" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }} to={`/admin/content/${s.key}`}>Edit</Link>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
