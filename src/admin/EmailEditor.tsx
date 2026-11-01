import { useMemo, useRef, useState } from 'react';
import defaultsJson from '../cms/defaults.generated.json';
import { SECTION_BY_KEY } from '../cms/registry';
import { admin } from './api';
import { notify } from '../ui/dialog';

type Row = Record<string, unknown>;
const DEFAULTS = (defaultsJson as unknown as Record<string, Record<string, string>>)['emails.templates'];

/** Who receives each email, for the grouped list. */
const GROUP_OF = (name: string) =>
  /^(team_new|content_)/.test(name) ? 'Your team'
  : /^(partner_|deal_)/.test(name) ? 'Partners'
  : /^career_/.test(name) ? 'Job applicants'
  : 'Visitors and customers';
const GROUPS = ['Visitors and customers', 'Partners', 'Job applicants', 'Your team'];

/** Example values for the preview and test emails. */
const SAMPLE: Record<string, string> = {
  name: 'Priya', company: 'Kestrel Supplies', link: 'https://oneofficeautomation.com/…', reason: 'We need a few more details first.', plan: 'Business',
  level: 'Certified', role: 'Full-stack Developer', customer: 'Gulf Freight', event: 'Agent Builder Live (2026-12-03)', status: 'Active', protectedUntil: '31 January 2027',
  statusLink: 'https://oneofficeautomation.com/application/…', unsubscribe: 'https://oneofficeautomation.com/unsubscribe?…', type: 'demo request', email: 'priya@example.com',
  section: 'Pricing questions', by: 'Ada Admin',
};
const varsIn = (t: string) => [...new Set([...(t.matchAll(/\{\{(\w+)\}\}/g))].map((m) => m[1]))];

/** Emails one at a time: choose from a grouped, searchable list; edit the subject and message; preview; test; reset. */
export function EmailEditor({ value, onChange }: { value: Row; onChange: (v: Row) => void }) {
  const fields = SECTION_BY_KEY['emails.templates'].fields;
  const emails = useMemo(() => {
    const names = [...new Set(fields.map((f) => f.name.replace(/_(subject|body)$/, '')))];
    return names.map((n) => {
      const label = (fields.find((f) => f.name === `${n}_subject`)?.label ?? n).replace(/: subject$/, '');
      const m = label.match(/\(([^)]*)\)/);
      return { name: n, title: label.replace(/\s*\([^)]*\)/, ''), to: m ? m[1] : '', group: GROUP_OF(n) };
    });
  }, [fields]);
  const [current, setCurrent] = useState(emails[0]?.name ?? '');
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const last = useRef<'subject' | 'body'>('body');
  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const get = (k: string) => String(value[k] ?? DEFAULTS[k] ?? '');
  const edited = (n: string) => get(`${n}_subject`) !== (DEFAULTS[`${n}_subject`] ?? '') || get(`${n}_body`) !== (DEFAULTS[`${n}_body`] ?? '');
  const e = emails.find((x) => x.name === current) ?? emails[0];
  const subject = get(`${e.name}_subject`), body = get(`${e.name}_body`);
  const vars = varsIn(`${DEFAULTS[`${e.name}_subject`] ?? ''} ${DEFAULTS[`${e.name}_body`] ?? ''}`);
  const fill = (t: string) => t.replace(/\{\{(\w+)\}\}/g, (_m, k: string) => SAMPLE[k] ?? `[${k}]`);
  const shown = emails.filter((x) => !q.trim() || `${x.title} ${x.to} ${x.group}`.toLowerCase().includes(q.trim().toLowerCase()));
  const set = (k: string, v: string) => onChange({ ...value, [k]: v });
  const insert = (v: string) => {
    const el = last.current === 'subject' ? subjectRef.current : bodyRef.current;
    const key = `${e.name}_${last.current}`;
    const text = get(key); const token = `{{${v}}}`;
    const at = el && typeof el.selectionStart === 'number' ? el.selectionStart : text.length;
    const end = el && typeof el.selectionEnd === 'number' ? el.selectionEnd : at;
    set(key, text.slice(0, at) + token + text.slice(end));
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(at + token.length, at + token.length); });
  };
  async function test() {
    setBusy(true);
    try {
      const r = await admin.emailTemplateTest(e.name, subject, body, Object.fromEntries(vars.map((k) => [k, SAMPLE[k] ?? k])));
      notify(r.result === 'sent' ? `Test sent to ${r.to}` : r.result === 'skipped' ? 'Email sending isn’t set up on this server, so nothing was sent' : 'The test email couldn’t be sent; see Emails sent');
    } catch (err) { notify((err as Error).message); } finally { setBusy(false); }
  }
  return (
    <div className="eml">
      <div className="card eml-pick lib-form">
        <label>Email
          <select value={e.name} onChange={(ev) => setCurrent(ev.target.value)}>
            {GROUPS.map((g) => {
              const list = shown.filter((x) => x.group === g);
              return list.length ? <optgroup key={g} label={g}>{list.map((x) => <option key={x.name} value={x.name}>{x.title}{edited(x.name) ? '  •  edited' : ''}</option>)}</optgroup> : null;
            })}
          </select>
        </label>
        <label>Find an email<input type="search" value={q} placeholder="For example password, partner, demo" onChange={(ev) => { setQ(ev.target.value); const first = emails.find((x) => `${x.title} ${x.to} ${x.group}`.toLowerCase().includes(ev.target.value.trim().toLowerCase())); if (first) setCurrent(first.name); }} /></label>
        <p className="hint" style={{ margin: 0 }}>{emails.length} emails · {emails.filter((x) => edited(x.name)).length} changed from the original</p>
      </div>
      <div className="eml-cols">
        <div className="card eml-edit lib-form">
          <h2>{e.title}</h2>
          <p className="hint" style={{ marginTop: 0 }}>Sent to: {e.to || (e.group === 'Your team' ? 'your team' : e.group.toLowerCase())}{edited(e.name) && <> · <b>edited</b></>}</p>
          <label>Subject<input ref={subjectRef} value={subject} maxLength={200} onFocus={() => { last.current = 'subject'; }} onChange={(ev) => set(`${e.name}_subject`, ev.target.value)} /></label>
          <label>Message<textarea ref={bodyRef} rows={14} value={body} maxLength={5000} onFocus={() => { last.current = 'body'; }} onChange={(ev) => set(`${e.name}_body`, ev.target.value)} /></label>
          {vars.length > 0 && (
            <div className="eml-vars">
              <span>Insert:</span>
              {vars.map((v) => <button key={v} type="button" className="btn small" onMouseDown={(ev) => ev.preventDefault()} onClick={() => insert(v)} title={`Filled in automatically, for example “${SAMPLE[v] ?? v}”`}>{`{{${v}}}`}</button>)}
            </div>
          )}
          <div className="eml-actions">
            <button type="button" className="btn" disabled={busy} onClick={() => void test()}>{busy ? 'Sending…' : 'Send me a test'}</button>
            <button type="button" className="btn" disabled={!edited(e.name)} onClick={() => onChange({ ...value, [`${e.name}_subject`]: DEFAULTS[`${e.name}_subject`] ?? '', [`${e.name}_body`]: DEFAULTS[`${e.name}_body`] ?? '' })}>Reset this email to the original</button>
          </div>
          <p className="hint">Changes are kept as you move between emails. Press Save changes at the bottom to put them live.</p>
        </div>
        <div className="card eml-preview" aria-label="Preview">
          <p className="hint" style={{ marginTop: 0 }}>Preview, with example details</p>
          <div className="eml-mail">
            <div className="eml-subject">{fill(subject) || <i>No subject</i>}</div>
            <div className="eml-body">{fill(body)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
