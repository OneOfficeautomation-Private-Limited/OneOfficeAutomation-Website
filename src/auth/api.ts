export type Plan = 'community' | 'starter' | 'business' | 'enterprise';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  country: string;
  plan: Plan;
  createdAt: string;
  status: string;
  newsletter: boolean;
  /** True once the customer has confirmed their email address. */
  emailVerified: boolean;
}

export interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  country: string;
  plan: Plan;
  password: string;
  acceptTerms: boolean;
}

export type LeadKind = 'demo' | 'partner' | 'newsletter' | 'career';

/** Error returned by the API, with optional per-field messages. */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      ...init,
    });
  } catch {
    throw new ApiError('We couldn’t reach the server. Check your connection and try again.', 0);
  }
  const body = (await res.json().catch(() => ({}))) as { error?: string; fields?: Record<string, string> };
  if (!res.ok) throw new ApiError(body.error ?? 'Something went wrong. Please try again.', res.status, body.fields);
  return body as T;
}

export const api = {
  register: (input: RegisterInput) => request<{ user: User }>('/auth/register', { method: 'POST', body: JSON.stringify(input) }),
  login: (email: string, password: string) => request<{ user: User }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => request<{ ok: true }>('/auth/logout', { method: 'POST', body: '{}' }),
  me: () => request<{ user: User }>('/auth/me'),
  lead: (kind: LeadKind, data: Record<string, FormDataEntryValue>) => request<{ ok: true }>(`/leads/${kind}`, { method: 'POST', body: JSON.stringify(data) }),
  forgot: (email: string, partner = false) => request<{ ok: true }>(partner ? '/partner/forgot' : '/auth/forgot', { method: 'POST', body: JSON.stringify({ email }) }),
  reset: (token: string, password: string, path: 'auth/reset' | 'partner/reset' | 'partner/accept') => request<{ ok: true }>(`/${path}`, { method: 'POST', body: JSON.stringify({ token, password }) }),
  profile: (b: { firstName: string; lastName: string; company: string; country: string }) => request<{ ok: true }>('/auth/profile', { method: 'PATCH', body: JSON.stringify(b) }),
  password: (current: string, next: string) => request<{ ok: true }>('/auth/password', { method: 'POST', body: JSON.stringify({ current, next }) }),
  myRequests: () => request<{ items: { id: string; kind: string; title: string; detail: string; status: string; createdAt: string }[] }>('/auth/requests'),
  planRequest: (plan: Plan, message: string) => request<{ ok: true }>('/auth/plan-request', { method: 'POST', body: JSON.stringify({ plan, message }) }),
  newsletter: (on: boolean) => request<{ ok: true; newsletter: boolean }>('/auth/newsletter', { method: 'PATCH', body: JSON.stringify({ on }) }),
  deleteRequest: (message: string) => request<{ ok: true }>('/auth/delete-request', { method: 'POST', body: JSON.stringify({ message }) }),
  community: (b: Record<string, string>) => request<{ ok: true }>('/requests/community', { method: 'POST', body: JSON.stringify(b) }),
  eventRegister: (b: Record<string, string>) => request<{ ok: true }>('/requests/event', { method: 'POST', body: JSON.stringify(b) }),
  directory: () => request<{ items: { company: string; country: string; type: string; level: string; website: string | null; about: string | null }[] }>('/partners/directory'),
  application: (token: string) => request<{ name: string; role: string; submittedAt: string; stage: string; stageLabel: string; closed: boolean; steps: { id: string; label: string }[] }>(`/application/${token}`),
  verifyEmail: (token: string) => request<{ ok: true }>('/auth/verify', { method: 'POST', body: JSON.stringify({ token }) }),
  resendVerification: () => request<{ ok: true; alreadyVerified?: boolean }>('/auth/resend-verification', { method: 'POST', body: '{}' }),
  unsubscribe: (e: string, s: string) => request<{ ok: true }>('/unsubscribe', { method: 'POST', body: JSON.stringify({ e, s }) }),
};

export interface PartnerOrg { id: string; company: string; country: string; type: string; level: string; status: string; website: string; about: string; listed: boolean; createdAt: string; checklist: { id: string; label: string; done: boolean }[] }
export interface PartnerDeal { id: string; customer: string; contact: string; email: string; country: string; value: string | null; notes: string | null; status: string; reason: string | null; protected_until: string | null; created_at: string; created_by: string }
export const partnerApi = {
  login: (email: string, password: string) => request<{ ok: true }>('/partner/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => request<{ ok: true }>('/partner/logout', { method: 'POST', body: '{}' }),
  me: () => request<{ user: { id: string; name: string; email: string; role: string }; org: PartnerOrg }>('/partner/me'),
  profile: (b: { website: string; about: string; listed: boolean }) => request<{ ok: true }>('/partner/profile', { method: 'PATCH', body: JSON.stringify(b) }),
  deals: () => request<{ items: PartnerDeal[] }>('/partner/deals'),
  addDeal: (b: Record<string, string>) => request<{ ok: true }>('/partner/deals', { method: 'POST', body: JSON.stringify(b) }),
  dealStatus: (id: string, status: 'won' | 'lost') => request<{ ok: true }>(`/partner/deals/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  team: () => request<{ items: { id: string; name: string; email: string; role: string; active: number; joined: number; last_login: string | null }[] }>('/partner/team'),
  addMember: (name: string, email: string) => request<{ ok: true }>('/partner/team', { method: 'POST', body: JSON.stringify({ name, email }) }),
  removeMember: (id: string) => request<{ ok: true }>(`/partner/team/${id}`, { method: 'DELETE' }),
};

/** Same rule as the server: at least 10 characters, with a letter and a number. */
export function passwordProblem(pw: string): string | null {
  if (pw.length < 10) return 'Use at least 10 characters.';
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'Include at least one letter and one number.';
  return null;
}
