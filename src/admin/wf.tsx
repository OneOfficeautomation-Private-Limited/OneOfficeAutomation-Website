// Shared pieces for the admin workflow screens.
import type { ReactNode } from 'react';
import type { Activity, Role } from './api';
import { HowTo, fmtDate } from './ui';

export const KIND_LABEL: Record<string, string> = { download: 'Downloads', demo: 'Demo requests', partner: 'Partner applications', career: 'Job applications', newsletter: 'Newsletter' };
export const KIND_ONE: Record<string, string> = { demo: 'Demo request', partner: 'Partner application', career: 'Job application', newsletter: 'Newsletter subscriber' };
const AREAS: Record<Role, string[]> = { admin: ['*'], editor: ['content'], sales: ['demo', 'download', 'newsletter', 'customers', 'requests'], partners: ['partner', 'partners', 'deals'], recruiter: ['career'], viewer: [] };
export function canSee(role: Role | undefined, area: string) {
  if (!role) return false;
  if (role === 'admin' || role === 'viewer') return area !== 'team' || role === 'admin';
  return AREAS[role].includes(area);
}
export function canChange(role: Role | undefined, area: string) {
  if (!role || role === 'viewer') return false;
  return role === 'admin' || AREAS[role].includes(area);
}
export const ROLE_LABEL: Record<Role, string> = { admin: 'Admin', editor: 'Editor', sales: 'Sales', partners: 'Partner manager', recruiter: 'Recruiter', viewer: 'Viewer (read-only)' };
export const ROLE_HELP: Record<Role, string> = {
  admin: 'Everything, including the team and deleting records.',
  editor: 'Website content only.',
  sales: 'Demo requests, customers, requests and the newsletter.',
  partners: 'Partner applications, partners and deals.',
  recruiter: 'Job applications.',
  viewer: 'Can look at everything, can’t change anything.',
};

export const FIELD_LABEL: Record<string, string> = {
  fn: 'First name', ln: 'Last name', em: 'Email', ph: 'Phone', co: 'Company', jt: 'Job title', cs: 'Company size', ii: 'Interested in', pr: 'Process to automate', ok: 'Agreed to be contacted',
  pn: 'Name', pc: 'Company', pe: 'Email', pk: 'Country', pt: 'Partner type', pm: 'About the business',
  cn: 'Name', ce: 'Email', cph: 'Phone', crole: 'Role', clink: 'CV or profile link', cmsg: 'Message', nl: 'Email',
  name: 'Name', email: 'Email', company: 'Company', message: 'Message', event: 'Event', plan: 'Requested plan', from: 'Current plan',
};

const TONE: Record<string, string> = {
  new: 'blue', submitted: 'blue', subscribed: 'green', registered: 'blue', trial: 'blue', free: 'grey', onboarding: 'blue',
  approved: 'green', won: 'green', hired: 'green', active: 'green', paid: 'green', enterprise: 'green', attended: 'green',
  rejected: 'red', lost: 'red', suspended: 'red', closed: 'grey', inactive: 'grey', unsubscribed: 'grey', withdrawn: 'grey', no_show: 'grey', cancelled: 'grey',
  enterprise_pending: 'amber', review: 'amber', offer: 'amber', scheduled: 'amber',
};
export function StageBadge({ id, label }: { id: string; label?: string }) {
  return <span className={`wf-badge wf-${TONE[id] ?? 'purple'}`}>{label ?? id.replace(/_/g, ' ')}</span>;
}

const ACTION_LABEL: Record<string, string> = { published: 'Published a website change', reset: 'Reset to the original content', restored: 'Restored an earlier version', draft_saved: 'Sent a website change for approval', draft_approved: 'Approved a website change', draft_rejected: 'Sent back a website change', submitted: 'Submitted', stage: 'Moved', note: 'Note', assigned: 'Assigned', created: 'Created', checklist: 'Onboarding checklist', level: 'Level changed', status: 'Status changed', type: 'Type changed', directory: 'Directory listing', profile_updated: 'Profile updated', portal_activated: 'Signed in to the portal for the first time', member_added: 'Colleague added', member_removed: 'Colleague removed', invite_resent: 'Invitation re-sent', signed_up: 'Signed up', plan: 'Plan changed', password_changed: 'Password changed', password_reset: 'Password reset', deleted: 'Deleted' };
/** Readable text for an activity entry's action, shared by timelines and the dashboard. */
export const actionLabel = (action: string) => ACTION_LABEL[action] ?? action.replace(/_/g, ' ');

export function Timeline({ items }: { items: Activity[] }) {
  if (!items.length) return <p className="hint">Nothing yet.</p>;
  const say = (a: Activity) => actionLabel(a.action);
  return (
    <ol className="wf-time">
      {items.map((a, i) => (
        <li key={i}>
          <b>{say(a)}{(a.from_value || a.to_value) && <span> {a.from_value ? `${a.from_value.replace(/_/g, ' ')} → ` : ''}{a.to_value?.replace(/_/g, ' ')}</span>}</b>
          {a.note && <p>{a.note}</p>}
          <small>{a.actor} · {fmtDate(a.created_at)}</small>
        </li>
      ))}
    </ol>
  );
}

export function EmailResult({ result }: { result?: string | null }) {
  if (!result) return null;
  if (result === 'sent') return <> The email has been sent.</>;
  if (result === 'skipped') return <> No email was sent because email isn’t set up yet (see Emails).</>;
  return <> The email could not be sent (see Emails).</>;
}

export function PageHead({ title, sub, children }: { title: string; sub?: string; children?: ReactNode }) {
  return (
    <>
      <div className="wf-head">
        <div><h1 style={{ fontSize: 28 }}>{title}</h1>{sub && <p className="hint" style={{ margin: '4px 0 0', fontSize: 15 }}>{sub}</p>}</div>
        {children && <div className="wf-head-actions">{children}</div>}
      </div>
      <HowTo />
    </>
  );
}
