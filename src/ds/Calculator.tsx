import { useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { I, Icon } from './ui';

export type CalcText = { show?: boolean; title: string; text: string; minutes: string; tasks: string; cost: string; currency: string; share: string; note: string; cta: string; ctaUrl: string };
const num = (s: string, d: number) => { const n = parseFloat(String(s).replace(/[^0-9.]/g, '')); return Number.isFinite(n) ? n : d; };
const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
function SmartLink({ to, className, children }: { to: string; className?: string; children: ReactNode }) {
  return /^https?:/.test(to) ? <a className={className} href={to} target="_blank" rel="noopener noreferrer">{children}</a> : <Link className={className} to={to}>{children}</Link>;
}

/* Savings estimate from the visitor's own numbers. Nothing they enter is stored. */
export default function Calculator({ c }: { c: CalcText }) {
  const [minutes, setMinutes] = useState(num(c.minutes, 15));
  const [tasks, setTasks] = useState(num(c.tasks, 400));
  const [cost, setCost] = useState(num(c.cost, 25));
  const share = Math.min(100, Math.max(0, num(c.share, 80))) / 100;
  const hours = (minutes * tasks / 60) * share;
  const money = hours * cost;
  const fields: [string, number, (n: number) => void, number, number, number, string][] = [
    ['Minutes per task', minutes, setMinutes, 1, 120, 1, 'min'],
    ['Tasks per month', tasks, setTasks, 10, 5000, 10, 'tasks'],
    [`Hourly cost (${c.currency})`, cost, setCost, 1, 200, 1, c.currency],
  ];
  return (
    <div className="rs-calc">
      <div className="rs-calc-in">
        {fields.map(([label, val, set, min, max, step], k) => (
          <div className="rs-slider" key={label}>
            <label htmlFor={`rs-c${k}`}>{label}</label>
            <div>
              <input id={`rs-c${k}`} type="range" min={min} max={max} step={step} value={val} onChange={(e) => set(Number(e.target.value))} style={{ '--p': `${((val - min) / (max - min)) * 100}%` } as CSSProperties} />
              <input type="number" aria-label={label} min={min} max={max} step={step} value={val} onChange={(e) => set(Math.max(0, Number(e.target.value)))} />
            </div>
          </div>
        ))}
        <p className="rs-calc-share">Assumes an agent takes on {Math.round(share * 100)}% of the work.</p>
      </div>
      <div className="rs-calc-out" aria-live="polite">
        <div><b>{fmt(hours)}</b><span>hours back every month</span></div>
        <div><b>{c.currency}{fmt(money * 12)}</b><span>saved per year</span></div>
        <div><b>{(hours / 160).toFixed(1)}</b><span>people freed up, full-time</span></div>
        <small>{c.note}</small>
        <SmartLink className="ds-btn ds-btn-white" to={c.ctaUrl || '/contact'}>{c.cta} <Icon d={I.arrow} size={18} stroke={2.4} /></SmartLink>
      </div>
    </div>
  );
}

