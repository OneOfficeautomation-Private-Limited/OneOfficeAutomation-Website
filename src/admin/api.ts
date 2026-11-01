export class AdminError extends Error {
  constructor(message: string, public status: number, public fields: Record<string, string> = {}) {
    super(message);
  }
}

export type Role = 'admin' | 'editor' | 'sales' | 'partners' | 'recruiter' | 'viewer';
export interface AdminUser { id: string; email: string; name: string; role: Role }
export interface TeamMember extends AdminUser { active: boolean; createdAt: string; lastLogin: string | null }
export interface Lead { id: string; kind: 'demo' | 'partner' | 'newsletter' | 'career'; status: 'new' | 'contacted' | 'closed'; createdAt: string; payload: Record<string, unknown> }
export interface CustomerRow { id: string; first_name: string; last_name: string; email: string; company: string; country: string; plan: string; created_at: string }
export interface Revision { id: number; saved_at: string; saved_by: string; size: number; reverted: number }
export type Stage = { id: string; label: string; done?: boolean };
export interface Kpi { id: string; label: string; now?: number; prev?: number; total?: number | null; suffix?: string }
export interface PartnerRow { type: string; submitted: number; review: number; rejected: number; onboarding: number; active: number; inactive: number; levels: Record<string, number> }
export interface Activity { entity?: string; entity_id?: string; actor: string; action: string; from_value: string | null; to_value: string | null; note?: string | null; created_at: string }
export interface Dashboard {
  /** Library items past their review date (0 for roles without content access). */
  reviewDue?: number;
  kpis: Kpi[]; pipelines: Record<string, (Stage & { n: number })[]>; partnerBoard: PartnerRow[]; deals: Record<string, number>;
  customers: { byStatus: Record<string, number>; byPlan: Record<string, number>; total: number }; requests: { kind: string; status: string; n: number }[];
  weekly: { kind: string; wk: number; n: number }[]; attention: { kind: string; id: string; title: string; why: string }[];
  approvals: { requests: number; deals: number; partners: number; drafts: number }; recent: Activity[]; email: { configured: boolean; failed30: number; notify: string };
}
export interface RecordItem { id: string; kind: string; stage: string; stageLabel: string; owner: string; followUp: string; reason: string; createdAt: string; updatedAt: string; name: string; email: string; company: string; partnerType?: string; payload: Record<string, unknown> }
export interface Org { id: string; leadId: string | null; company: string; country: string; type: string; level: string; status: string; website: string; about: string; listed: boolean; createdAt: string; updatedAt: string; checklist: { id: string; label: string; done: boolean }[]; people?: number; deals?: number }
export interface Deal { id: string; org_id: string; partner?: string; created_by: string; customer: string; contact: string; email: string; country: string; value: string | null; notes: string | null; status: string; reason: string | null; protected_until: string | null; created_at: string; updated_at: string }
export interface RequestRow { id: string; kind: string; customer_id: string | null; name: string; email: string; payload: Record<string, string>; status: string; reason: string | null; created_at: string; updated_at: string }
export interface CustomerFull extends CustomerRow { status: string; newsletter: number }
export interface EmailRow { id: number; to_email: string; subject: string; template: string; status: string; error: string | null; created_at: string }

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/admin${path}`, {
      method,
      credentials: 'include',
      headers: body !== undefined || method !== 'GET' ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : method === 'GET' || method === 'DELETE' ? undefined : '{}',
    });
  } catch {
    throw new AdminError('We couldn’t reach the server. Check your connection and try again.', 0);
  }
  const data = (await res.json().catch(() => ({}))) as T & { error?: string; fields?: Record<string, string> };
  if (!res.ok) throw new AdminError(data.error ?? 'Something went wrong. Please try again.', res.status, data.fields);
  return data;
}

export type LibItem = {
  id: string; type: string; title: string; status: string; publishAt: string | null; product: string | null; category: string | null;
  parent: string | null; order: number; access: string; owner: string | null; reviewBy: string | null; version: number;
  updatedAt: string; updatedBy: string; createdAt: string; pending?: boolean;
};
export type MediaFile = { id: string; name: string; mime: string; size: number; width: number | null; height: number | null; alt: string; path: string; createdAt: string; createdBy: string; duplicate?: boolean };

/** Sends one file to the media library (the body is the file itself, not JSON). */
async function uploadFile(file: File): Promise<MediaFile> {
  const type = file.type || (/\.pdf$/i.test(file.name) ? 'application/pdf' : 'application/octet-stream');
  let res: Response;
  try {
    res = await fetch('/api/admin/media/upload', { method: 'POST', credentials: 'include', headers: { 'Content-Type': type, 'X-File-Name': encodeURIComponent(file.name) }, body: file });
  } catch { throw new AdminError('We couldn’t reach the server. Check your connection and try again.', 0); }
  const data = (await res.json().catch(() => ({}))) as MediaFile & { error?: string };
  if (!res.ok) throw new AdminError(data.error ?? (res.status === 413 ? 'Files can be up to 5 MB.' : 'The upload failed. Please try again.'), res.status);
  return data;
}

export const admin = {
  emailTemplateTest: (template: string, subject: string, body: string, vars: Record<string, string>) => call<{ result: 'sent' | 'skipped' | 'failed'; to: string }>('POST', '/emails/test-template', { template, subject, body, vars }),
  mediaList: () => call<{ items: MediaFile[] }>('GET', '/media'),
  mediaUpload: uploadFile,
  mediaUpdate: (id: string, alt: string, name?: string) => call<MediaFile>('PATCH', `/media/${id}`, { alt, ...(name ? { name } : {}) }),
  mediaUsage: (id: string) => call<{ usedIn: string[] }>('GET', `/media/${id}/usage`),
  mediaDelete: (id: string, force = false) => call<{ ok: true }>('DELETE', `/media/${id}${force ? '?force=1' : ''}`),
  libraryDigest: (since: string) => call<{ html: string; text: string; count: number }>('GET', `/library-digest?since=${since}`),
  librarySearches: () => call<{ items: { q: string; count: number; last_at: string }[] }>('GET', '/library-searches'),
  library: () => call<{ items: LibItem[]; today: string; types: Record<string, string> }>('GET', '/library'),
  libraryItem: (id: string) => call<LibItem & { data: Record<string, unknown>; pending: { data: Record<string, unknown>; meta: Record<string, unknown>; savedBy: string; savedAt: string } | null }>('GET', `/library/${id}`),
  libraryDecide: (id: string, decision: 'approve' | 'reject', force = false, note = '') => call<{ ok: true }>('POST', `/library/${id}/${decision}`, { force, note }),
  libraryCreate: (type: string, title: string) => call<{ id: string }>('POST', '/library', { type, title }),
  librarySave: (id: string, data: unknown, meta: Record<string, unknown>, version: number, force = false) => call<LibItem & { data: Record<string, unknown>; sentForReview?: boolean; pendingSaved?: boolean }>('PUT', `/library/${id}`, { data, meta, version, force }),
  libraryDelete: (id: string) => call<{ ok: true }>('DELETE', `/library/${id}`),
  libraryRevisions: (id: string) => call<{ items: { id: number; saved_at: string; saved_by: string }[] }>('GET', `/library/${id}/revisions`),
  libraryRestore: (id: string, revision: number) => call<{ ok: true }>('POST', `/library/${id}/restore`, { revision }),
  status: () => call<{ needsSetup: boolean; setupEnabled: boolean }>('GET', '/status'),
  setup: (b: { token: string; name: string; email: string; password: string }) => call<{ admin: AdminUser }>('POST', '/setup', b),
  login: (email: string, password: string) => call<{ admin: AdminUser }>('POST', '/login', { email, password }),
  logout: () => call<{ ok: true }>('POST', '/logout', {}),
  me: () => call<{ admin: AdminUser }>('GET', '/me'),
  password: (current: string, next: string) => call<{ ok: true }>('POST', '/password', { current, next }),
  dashboard: () => call<Dashboard>('GET', '/dashboard'),
  records: (kind: string, stage = '', q = '') => call<{ items: RecordItem[]; stages: Stage[] }>('GET', `/records?kind=${kind}&stage=${encodeURIComponent(stage)}&q=${encodeURIComponent(q)}`),
  record: (id: string) => call<{ item: RecordItem; stages: Stage[]; activity: Activity[]; org: { id: string; company: string; status: string; level: string } | null; statusLink: string | null; partnerTypes?: string[] }>('GET', `/records/${id}`),
  setStage: (id: string, b: { stage: string; note?: string; reason?: string; partnerType?: string; notify?: boolean }) => call<{ ok: true; email?: string | null; orgId?: string }>('POST', `/records/${id}/stage`, b),
  addNote: (id: string, note: string) => call<{ ok: true }>('POST', `/records/${id}/note`, { note }),
  assign: (id: string, owner: string, followUp: string) => call<{ ok: true }>('POST', `/records/${id}/assign`, { owner, followUp }),
  deleteRecord: (id: string) => call<{ ok: true }>('DELETE', `/records/${id}`),
  partners: () => call<{ items: Org[]; levels: string[]; statuses: string[]; types: string[] }>('GET', '/partners'),
  partner: (id: string) => call<{ item: Org; people: { id: string; name: string; email: string; role: string; active: number; joined: number; last_login: string | null }[]; deals: Deal[]; activity: Activity[]; levels: string[]; statuses: string[]; types: string[] }>('GET', `/partners/${id}`),
  updatePartner: (id: string, b: Record<string, unknown>) => call<{ ok: true; status: string; emails: string[] }>('PATCH', `/partners/${id}`, b),
  reinvite: (id: string, userId: string) => call<{ ok: true; email: string }>('POST', `/partners/${id}/reinvite`, { userId }),
  deals: () => call<{ items: Deal[] }>('GET', '/deals'),
  decideDeal: (id: string, b: { decision: string; reason?: string; days?: number }) => call<{ ok: true; email?: string | null }>('POST', `/deals/${id}/decision`, b),
  requests: (kind = '') => call<{ items: RequestRow[] }>('GET', `/requests?kind=${kind}`),
  decideRequest: (id: string, b: { decision: string; reason?: string }) => call<{ ok: true; email?: string | null }>('POST', `/requests/${id}/decision`, b),
  customer: (id: string) => call<{ item: CustomerFull; requests: RequestRow[]; activity: Activity[]; demos: RecordItem[]; statuses: { id: string; label: string }[] }>('GET', `/customers/${id}`),
  updateCustomer: (id: string, b: { status?: string; plan?: string; note?: string; notify?: boolean }) => call<{ ok: true; email?: string | null }>('PATCH', `/customers/${id}`, b),
  deleteCustomer: (id: string) => call<{ ok: true }>('DELETE', `/customers/${id}`),
  emails: () => call<{ items: EmailRow[]; configured: boolean; from: string; notify: string; host: string }>('GET', '/emails'),
  testEmail: () => call<{ ok: boolean; result: string }>('POST', '/emails/test', {}),
  activity: () => call<{ items: Activity[] }>('GET', '/activity'),
  settings: () => call<{ contentApproval: boolean }>('GET', '/settings'),
  saveSettings: (b: { contentApproval: boolean }) => call<{ ok: true }>('PUT', '/settings', b),
  drafts: () => call<{ items: { key: string; saved_by: string; saved_at: string }[] }>('GET', '/drafts'),
  draft: (key: string) => call<{ draft: { value: unknown; savedBy: string; savedAt: string } | null; lastDecision: { decision: 'approved' | 'rejected'; note: string; by: string; at: string; for: string } | null }>('GET', `/content/${key}/draft`),
  decideDraft: (key: string, decision: 'approve' | 'reject', note = '', force = false) => call<{ ok: true }>('POST', `/drafts/${key}/${decision}`, { note, force }),
  contentList: () => call<{ items: { key: string; updated_at: string; updated_by: string }[] }>('GET', '/content'),
  contentGet: (key: string) => call<{ key: string; value: unknown; updatedAt: string | null; updatedBy: string | null }>('GET', `/content/${key}`),
  /** baseUpdatedAt: when the version being edited was saved (null if never), so the server can spot someone else's newer save. */
  contentPut: (key: string, value: unknown, baseUpdatedAt?: string | null, force = false) => call<{ ok: true; pending?: boolean; value: unknown; updatedAt: string; updatedBy: string }>('PUT', `/content/${key}`, baseUpdatedAt === undefined ? { value } : { value, baseUpdatedAt, force }),
  contentReset: (key: string) => call<{ ok: true }>('DELETE', `/content/${key}`),
  revisions: (key: string) => call<{ items: Revision[] }>('GET', `/content/${key}/revisions`),
  restore: (key: string, id: number) => call<{ ok: true; value: unknown }>('POST', `/content/${key}/restore`, { id }),
  leads: (kind: string, status: string) => call<{ items: Lead[] }>('GET', `/leads?kind=${encodeURIComponent(kind)}&status=${encodeURIComponent(status)}`),
  setLeadStatus: (id: string, status: string) => call<{ ok: true }>('PATCH', `/leads/${id}`, { status }),
  deleteLead: (id: string) => call<{ ok: true }>('DELETE', `/leads/${id}`),
  customers: () => call<{ items: CustomerFull[]; statuses: { id: string; label: string }[] }>('GET', '/customers'),
  users: () => call<{ items: TeamMember[] }>('GET', '/users'),
  addUser: (b: { name: string; email: string; password: string; role: string }) => call<{ ok: true }>('POST', '/users', b),
  updateUser: (id: string, b: { role?: string; active?: boolean; password?: string }) => call<{ ok: true }>('PATCH', `/users/${id}`, b),
};
