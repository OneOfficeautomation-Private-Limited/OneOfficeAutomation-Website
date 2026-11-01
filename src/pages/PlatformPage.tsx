import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { usePlatformLogic } from '../logic/PlatformLogic';
import { useMainLogic } from '../logic/MainLogic';
import { I, Icon, Rings } from '../ds/ui';
import PD from '../cms/defaults.generated.json';
import { useCms } from '../cms/CmsContext';
import { usePageText, Hi, Go } from '../cms/pageText';


type Part = { id: string; verb: string; name: string; icon: string; intro: string; feats: [string, string][]; pic: ReactNode };

export const BASE_PARTS: Part[] = [
  { id: 'build', verb: 'Build', name: 'One Agent Studio', icon: I.code,
    intro: 'The workspace where business teams and developers build agents side by side.',
    feats: [['Visual designer', 'Drag actions onto a canvas and connect them.'], ['945 ready-made actions', 'Across 73 toolkits for email, Excel, PDF, web, SAP and more.'], ['Web recorder', 'Record steps in any web app instead of scripting them.'], ['Debugger and AI assistant', 'Step through line by line, or let AI draft the agent.']],
    pic: (
      <div className="pf-pic">
        <div className="pf-assist"><i><Icon d={I.spark} size={16} /></i>“Draft an invoice agent for SAP”</div>
        <div className="hs-flow">
          <span><i>@</i>Read new email</span><b />
          <span data-ai=""><i>AI</i>Extract fields</span><b />
          <span><i>?</i>Match purchase order</span><b />
          <span><i>✓</i>Post to SAP</span>
        </div>
        <div className="pf-chips"><em>Email</em><em>Excel</em><em>PDF</em><em>Browser</em><em>SAP</em><em>AI prompt</em></div>
      </div>
    ) },
  { id: 'run', verb: 'Run', name: 'One Runner', icon: I.play,
    intro: 'The engine that does the work, on your own machines, using the same apps your team uses.',
    feats: [['Isolated processes', 'One failure never affects another run.'], ['Runner pools', 'Group machines and spread work as volume grows.'], ['Priorities', 'Urgent work queues run first.'], ['Remote stop', 'Stop any run from One Command Center, instantly.']],
    pic: (
      <div className="pf-pic">
        <div className="pf-card-h">Pool A <small>3 runners online</small></div>
        {[['RUNNER-01', 'Invoice processing', 72, 'Busy'], ['RUNNER-02', 'Employee onboarding', 40, 'Busy'], ['RUNNER-03', 'Idle, ready', 0, 'Ready']].map(([n, t, w, st]) => (
          <div className="pf-runner" key={n as string}>
            <i><Icon d={I.play} size={16} /></i>
            <span><b>{n}</b><small>{t}</small><span className="pf-bar"><b style={{ width: `${w}%` }} /></span></span>
            <em data-ready={st === 'Ready' ? '' : undefined}>{st}</em>
          </div>
        ))}
      </div>
    ) },
  { id: 'govern', verb: 'Govern', name: 'One Command Center', icon: I.shield,
    intro: 'Decide what runs, when, on which machines and with whose permission, and see every run live.',
    feats: [['Versions', 'Publish, roll back and track every agent version.'], ['Schedules and triggers', 'Run on a timetable, a new email or a queue item.'], ['Work queues and live runs', 'Hand items between agents and people, live.'], ['Vault, roles and audit', 'AES-256 vault, SSO, custom roles, hash-chained audit.']],
    pic: (
      <div className="pf-pic">
        <div className="pf-card-h">Schedules <small>Runs this week</small></div>
        {[['Bank reconciliation', '18:00 daily', I.clock], ['Tax report', 'Monthly', I.clock], ['Invoice inbox', 'On new email', I.mail]].map(([n, w, d]) => (
          <div className="pf-runner" key={n}><i><Icon d={d} size={16} /></i><span><b>{n}</b><small>{w}</small></span><em>Active</em></div>
        ))}
        <div className="pf-verified"><Icon d={I.audit} size={20} /><span><b>Audit trail verified</b><small>Every run and change recorded</small></span></div>
      </div>
    ) },
  { id: 'orchestrate', verb: 'Orchestrate', name: 'AI agents and One Workflow', icon: I.network,
    intro: 'Coordinates work across agents, AI and people, with humans in the loop exactly where judgment matters.',
    feats: [['AI agents', 'Reason over a task and call your agents as tools.'], ['One Prompt Skill', 'Extract and classify data from documents with AI.'], ['Forms and approvals', 'Bring people in where judgment is needed.'], ['Task inbox', 'Reviewers see each exception with full context.']],
    pic: (
      <div className="pf-pic">
        <div className="pf-chain"><span data-ai=""><Icon d={I.spark} size={16} />AI agent</span><b /><span>Invoice agent</span><b /><span>Vendor lookup</span><b /><span>ERP agent</span></div>
        <div className="pf-approve">
          <div><i>AR</i><span><b>Approval needed</b><small>INV-2291, PO mismatch</small></span></div>
          <div className="pf-approve-b"><span>Approve</span><span>Review</span></div>
        </div>
      </div>
    ) },
];

export const BASE_FLOW = [['Studio', 'Build the agent', 'Visual designer or AI assistant'], ['Command Center', 'Publish a version', 'Versioned and approved'], ['Command Center', 'Trigger or schedule', 'Email, timetable or queue'], ['Runner', 'Run on your machines', 'Pools and priorities'], ['Workflow', 'People handle exceptions', 'Approvals in the Task inbox'], ['Command Center', 'Every step audited', 'Hash-chained audit trail']];

export const BASE_AI: [string, string, string][] = [
  ['AI agents', 'Reason over a task and call your existing agents as tools.', I.agent],
  ['One Prompt Skill', 'Read, extract and classify data from invoices, forms and emails.', I.doc],
  ['AI assistant in Studio', 'Describe a process and get a first draft of the agent.', I.chat],
  ['6 AI model providers', 'Choose the model that fits each task, cost and data policy.', I.layers],
];

export const BASE_SECURITY: [string, string, string][] = [
  ['Self-hosted', 'Install on your own servers with PostgreSQL.', I.db],
  ['Encrypted vault', 'Credentials live in an AES-256 vault, never in agent code.', I.lock],
  ['Single sign-on and roles', 'Use your identity provider and custom roles.', I.key],
  ['Tamper-evident audit', 'Every run and change on a hash-chained trail.', I.audit],
];

/* What the agent is doing at each step of the invoice walkthrough. */
function Scene({ i }: { i: number }) {
  const rows: Record<number, [string, ReactNode, [string, string, string?][]]> = {
    0: ['Invoice inbox', 'Email trigger', [['From', 'accounts@kestrelsupplies.example'], ['Subject', 'Invoice INV-2291'], ['Attachment', 'INV-2291.pdf'], ['Added to work queue', 'Just now', 'ok']]],
    1: ['Extracted fields', 'One Prompt Skill', [['Supplier', 'Kestrel Supplies · 98%', 'ok'], ['Tax ID', '29ABCDE1234F1Z5 · 99%', 'ok'], ['Total', '12,480.00 · 99%', 'ok'], ['Due date', '30 Nov · 99%', 'ok']]],
    2: ['Validation', 'Business rules', [['Tax ID format', 'Passed', 'ok'], ['Purchase order 4500-1182', 'Found', 'ok'], ['Quantities match', 'Passed', 'ok'], ['Total matches PO', 'Differs by 3.2%', 'warn']]],
    3: ['RUNNER-01', 'One Runner', [['Open SAP, transaction FB60', 'Done', 'ok'], ['Enter header and 12 lines', 'Done', 'ok'], ['Post document', '5100004821', 'ok'], ['Audit entry', 'Recorded', 'ok']]],
    4: ['Task inbox', 'One Workflow', [['INV-2291', 'Total doesn’t match the PO', 'warn'], ['Invoice total', '12,480.00'], ['Purchase order', '12,090.00'], ['Assigned to', 'Finance reviewers']]],
  };
  const [title, tag, list] = rows[i % 5];
  return (
    <div className="pf-scene">
      <div className="pf-scene-h">{title}<span>{tag}</span></div>
      {list.map(([a, b, s], k) => <div className="pf-scene-r" key={a} style={{ '--k': k } as CSSProperties}><span>{a}</span><b data-s={s}>{b}</b></div>)}
      {i % 5 === 4 && <div className="pf-approve-b" style={{ marginTop: 8 }}><span>Approve</span><span>Send back</span></div>}
    </div>
  );
}

export default function PlatformPage() {
  const P = usePageText('page.platform');
  const v = usePlatformLogic();
  const cms = useCms();
  const PARTS = cms<{ verb: string; name: string; intro: string; feats: string[] }[]>('platform.parts', PD['platform.parts']).slice(0, BASE_PARTS.length).map((x, i) => ({
    ...BASE_PARTS[i], verb: x.verb, name: x.name, intro: x.intro,
    feats: x.feats.map((f) => { const [a, ...b] = f.split(/\s+[—–-]\s+|:\s+/); return [a, b.join(' — ')] as [string, string]; }),
  }));
  const FLOW = cms<{ tool: string; title: string; text: string }[]>('platform.flow', PD['platform.flow']).map((x) => [x.tool, x.title, x.text]);
  const AI_ITEMS = cms<{ t: string; d: string }[]>('platform.ai', PD['platform.ai']).map((x, i) => [x.t, x.d, BASE_AI[i % BASE_AI.length][2]] as [string, string, string]);
  const SECURITY = cms<{ t: string; d: string }[]>('platform.security', PD['platform.security']).map((x, i) => [x.t, x.d, BASE_SECURITY[i % BASE_SECURITY.length][2]] as [string, string, string]);
  const m = useMainLogic();
  const { hash } = useLocation();
  const [tab, setTab] = useState(0);

  useEffect(() => {
    const i = PARTS.findIndex((p) => `#${p.id}` === hash);
    if (i >= 0) setTab(i);
  }, [hash]);

  const onKey = (e: ReactKeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const n = (tab + (e.key === 'ArrowRight' ? 1 : PARTS.length - 1)) % PARTS.length;
    setTab(n);
    document.getElementById(`pf-tab-${PARTS[n].id}`)?.focus();
  };
  const p = PARTS[tab];

  /* The invoice walkthrough moves on by itself; it pauses while hovered and for a while after a click. */
  const [walkPaused, setWalkPaused] = useState(false);
  const lastPick = useRef(0);
  const [auto, setAuto] = useState(false);
  useEffect(() => { setAuto(!window.matchMedia('(prefers-reduced-motion: reduce)').matches); }, []);
  const stepsRef = useRef(m.steps);
  stepsRef.current = m.steps;
  const curRef = useRef(0);
  curRef.current = Number(m.current.num) - 1;
  useEffect(() => {
    if (!auto) return;
    const t = window.setInterval(() => {
      if (walkPaused || Date.now() - lastPick.current < 9000) return;
      const all = stepsRef.current;
      all[(curRef.current + 1) % all.length].pick();
    }, 3600);
    return () => window.clearInterval(t);
  }, [auto, walkPaused]);
  const running = auto && !walkPaused;

  return (
    <>
      {/* Hero */}
      <section id="overview" className="hz-hero">
        <div className="ds-container hz-hero-grid pf-hero-grid">
          <div>
            <h1 className="pf-h1"><Hi a={P.heroA} b={P.heroB} /></h1>
            <p className="hz-tagline">{P.heroText}</p>
            <div className="ds-actions" style={{ marginTop: 8 }}>
              <Go className="ds-btn ds-btn-grad" to={P.heroBtn1Link}>{P.heroBtn1}</Go>
              <Go className="ds-btn ds-btn-outline" to={P.heroBtn2Link}>{P.heroBtn2}</Go>
            </div>
          </div>
          <div className="pf-quad" aria-hidden="true">
            {PARTS.map((x) => (
              <div key={x.id}><i><Icon d={x.icon} size={30} /></i><b>{x.name.replace('AI agents and ', '')}</b><small>{x.verb}</small></div>
            ))}
            <span className="pf-quad-core"><Rings width={56} /></span>
          </div>
        </div>
        <div className="ds-container hy-nums">
          {v.stats.map((st) => <div key={st.label}><b>{st.n}</b><span>{st.label}</span></div>)}
        </div>
        <svg className="hz-curve" viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden="true"><path d="M0 90 L0 44 Q720 -28 1440 44 L1440 90 Z" fill="#F4F6FD" /></svg>
      </section>

      {/* The four parts */}
      <section id="parts" className="ds-soft" style={{ paddingTop: 'clamp(28px, 3.5vw, 48px)', paddingBottom: 'var(--ds-section-y)', scrollMarginTop: 80 }}>
        {PARTS.map((x) => <span key={x.id} id={x.id} style={{ position: 'relative', top: -90, display: 'block', height: 0 }} />)}
        <div className="ds-container">
          <div className="hx-head hx-head-center">
            <div>
              <h2 className="ds-h2"><Hi a={P.partsA} b={P.partsB} /></h2>
            </div>
          </div>
          <div className="hs">
            <div className="hs-tabs pf-tabs" role="tablist" aria-label="Platform parts" onKeyDown={onKey}>
              {PARTS.map((x, i) => (
                <button key={x.id} id={`pf-tab-${x.id}`} role="tab" type="button" aria-selected={i === tab} aria-controls="pf-panel" tabIndex={i === tab ? 0 : -1} onClick={() => setTab(i)}>
                  <Icon d={x.icon} size={26} />
                  <span><small>{x.verb}</small>{x.name}</span>
                </button>
              ))}
            </div>
            <div className="hs-panel" id="pf-panel" role="tabpanel" aria-labelledby={`pf-tab-${p.id}`} data-tone={tab % 2} key={p.id}>
              <div className="hs-copy">
                <span className="hs-sym"><Icon d={p.icon} size={30} /></span>
                <span className="pf-verb">{p.verb}</span>
                <h3>{p.name}</h3>
                <p>{p.intro}</p>
                <dl className="pf-feats">{p.feats.map(([t, d]) => <div key={t}><dt><Icon d={I.check} size={18} stroke={2.6} />{t}</dt><dd>{d}</dd></div>)}</dl>
              </div>
              <div className="hs-visual" aria-hidden="true">{p.pic}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Follow one invoice */}
      <section id="walkthrough" className="ds-paper ds-section">
        <div className="ds-container">
          <div className="pf-walk" data-run={running ? '1' : '0'} onMouseEnter={() => setWalkPaused(true)} onMouseLeave={() => setWalkPaused(false)}>
            <div className="hx-head">
              <div><h2 className="ds-h2">{P.walkTitle}</h2></div>
              <span className="pf-walk-hint">Plays on its own. Pick any step to jump in.</span>
            </div>
            <ol className="pf-steps">
              {m.steps.map((s) => (
                <li key={s.num}>
                  <button type="button" onClick={() => { lastPick.current = Date.now(); s.pick(); }} aria-pressed={s.active}>
                    <span className="n">{s.num}</span><span><b>{s.label}</b><small>{s.tool}</small></span>
                  </button>
                </li>
              ))}
            </ol>
            <div className="pf-walk-body" aria-live="polite" key={m.current.num}>
              <div>
                <h3>{m.current.title}</h3>
                <p>{m.current.detail}</p>
                <span className="pf-tool">{m.current.tool}</span>
              </div>
              <Scene key={m.current.num} i={Number(m.current.num) - 1} />
            </div>
          </div>
        </div>
      </section>

      {/* How the parts work together */}
      <section id="together" className="ds-navy ds-section pf-together">
        <div className="ds-container">
          <div className="hx-head">
            <div>
              <h2 className="ds-h2"><Hi a={P.flowA} b={P.flowB} /></h2>
              <p className="ds-lead ds-muted">{P.flowText}</p>
            </div>
          </div>
          <ol className="pf-flow">
            {FLOW.map(([tool, title, text], i) => (
              <li key={title}><span className="n">{i + 1}</span><em>{tool}</em><b>{title}</b><small>{text}</small></li>
            ))}
          </ol>
        </div>
      </section>

      {/* AI */}
      <section id="ai" className="ds-soft ds-section">
        <div className="ds-container pf-ai">
          <div>
            <h2 className="ds-h2"><Hi a={P.aiA} b={P.aiB} /></h2>
            <p className="ds-lead ds-muted" style={{ margin: '14px 0 28px' }}>{P.aiText}</p>
            <div className="pf-ai-list">
              {AI_ITEMS.map(([t, d, ic]) => <div key={t}><i><Icon d={ic} size={24} /></i><span><b>{t}</b><small>{d}</small></span></div>)}
            </div>
          </div>
          <div className="pf-doc" aria-hidden="true">
            <div className="pf-sheet">
              <div className="pf-sheet-h"><b>Kestrel Supplies</b><small>Supplier invoice · PDF</small></div>
              <i style={{ width: '70%' }} /><i style={{ width: '45%' }} />
              <span className="pf-hl">Invoice no. INV-2291</span>
              <i style={{ width: '92%' }} /><i style={{ width: '84%' }} /><i style={{ width: '88%' }} /><i style={{ width: '60%' }} />
              <span className="pf-hl" style={{ alignSelf: 'flex-end' }}>Total 12,480.00</span>
            </div>
            <div className="pf-fields">
              <div className="pf-fields-h"><Icon d={I.spark} size={18} />One Prompt Skill</div>
              {[['Supplier', 'Kestrel Supplies'], ['Invoice no.', 'INV-2291'], ['Total', '12,480.00'], ['Due date', '30 Nov']].map(([a, b]) => <div key={a}><span>{a}</span><b>{b}</b></div>)}
            </div>
          </div>
        </div>
      </section>

      {/* Security */}
      <section id="security" className="ds-paper ds-section">
        <div className="ds-container">
          <div className="pf-secure">
            <div className="hx-head">
              <div>
                <h2 className="ds-h2">{P.secTitle}</h2>
                <p className="ds-lead" style={{ color: '#D4CBF7' }}>{P.secText}</p>
              </div>
            </div>
            <div className="pf-shields">
              {SECURITY.map(([t, d, ic]) => (
                <div key={t}>
                  <svg width="84" height="96" viewBox="0 0 84 96" aria-hidden="true">
                    <path d="M42 4l34 13v24c0 25-15 42-34 51C23 83 8 66 8 41V17z" fill="rgba(255,255,255,.08)" stroke="#B9A6F5" strokeWidth="2.5" />
                    <path d="M42 14l25 10v18c0 19-11 32-25 39-14-7-25-20-25-39V24z" fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="1.5" strokeDasharray="3 4" />
                    <g transform="translate(28 30)" stroke="#FFFFFF" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d={ic} transform="scale(1.17)" /></g>
                  </svg>
                  <h3>{t}</h3>
                  <p>{d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Closing */}
      <section className="ds-paper" style={{ paddingBottom: 'var(--ds-section-y)' }}>
        <div className="ds-container">
          <div className="hz-final">
            <svg viewBox="0 0 600 360" fill="none" aria-hidden="true"><circle cx="225" cy="180" r="150" stroke="#8FB8FF" strokeOpacity=".35" strokeWidth="2" /><circle cx="375" cy="180" r="150" stroke="#C3B1FF" strokeOpacity=".35" strokeWidth="2" /></svg>
            <h2 className="ds-h2" style={{ position: 'relative', maxWidth: 760 }}>{P.endTitle}</h2>
            <p className="ds-lead" style={{ position: 'relative' }}>{P.endText}</p>
            <div className="ds-actions" style={{ position: 'relative', justifyContent: 'center' }}>
              <Go className="ds-btn ds-btn-white" to={P.endBtn1Link}>{P.endBtn1}</Go>
              <Go className="ds-btn ds-btn-outline" to={P.endBtn2Link}>{P.endBtn2}</Go>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
