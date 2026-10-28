export class AdminError extends Error {
  constructor(message: string, public status: number, public fields: Record<string, string> = {}) {
    super(message);
  }
}

export interface AdminUser { id: string; email: string; name: string; role: 'admin' | 'editor' }
export interface TeamMember extends AdminUser { active: boolean; createdAt: string; lastLogin: string | null }
export interface Lead { id: string; kind: 'demo' | 'partner' | 'newsletter' | 'career'; status: 'new' | 'contacted' | 'closed'; createdAt: string; payload: Record<string, unknown> }
export interface CustomerRow { id: string; first_name: string; last_name: string; email: string; company: string; country: string; plan: string; created_at: string }
export interface Revision { id: number; saved_at: string; saved_by: string; size: number; reverted: number }
export interface Dashboard { leads: { kind: string; status: string; n: number }[]; customers: number; customised: number; recent: { key: string; updated_at: string; updated_by: string }[] }

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

export const admin = {
  status: () => call<{ needsSetup: boolean; setupEnabled: boolean }>('GET', '/status'),
  setup: (b: { token: string; name: string; email: string; password: string }) => call<{ admin: AdminUser }>('POST', '/setup', b),
  login: (email: string, password: string) => call<{ admin: AdminUser }>('POST', '/login', { email, password }),
  logout: () => call<{ ok: true }>('POST', '/logout', {}),
  me: () => call<{ admin: AdminUser }>('GET', '/me'),
  password: (current: string, next: string) => call<{ ok: true }>('POST', '/password', { current, next }),
  dashboard: () => call<Dashboard>('GET', '/dashboard'),
  contentList: () => call<{ items: { key: string; updated_at: string; updated_by: string }[] }>('GET', '/content'),
  contentGet: (key: string) => call<{ key: string; value: unknown; updatedAt: string | null; updatedBy: string | null }>('GET', `/content/${key}`),
  contentPut: (key: string, value: unknown) => call<{ ok: true; value: unknown; updatedAt: string; updatedBy: string }>('PUT', `/content/${key}`, { value }),
  contentReset: (key: string) => call<{ ok: true }>('DELETE', `/content/${key}`),
  revisions: (key: string) => call<{ items: Revision[] }>('GET', `/content/${key}/revisions`),
  restore: (key: string, id: number) => call<{ ok: true; value: unknown }>('POST', `/content/${key}/restore`, { id }),
  leads: (kind: string, status: string) => call<{ items: Lead[] }>('GET', `/leads?kind=${encodeURIComponent(kind)}&status=${encodeURIComponent(status)}`),
  setLeadStatus: (id: string, status: string) => call<{ ok: true }>('PATCH', `/leads/${id}`, { status }),
  deleteLead: (id: string) => call<{ ok: true }>('DELETE', `/leads/${id}`),
  customers: () => call<{ items: CustomerRow[] }>('GET', '/customers'),
  users: () => call<{ items: TeamMember[] }>('GET', '/users'),
  addUser: (b: { name: string; email: string; password: string; role: string }) => call<{ ok: true }>('POST', '/users', b),
  updateUser: (id: string, b: { role?: string; active?: boolean; password?: string }) => call<{ ok: true }>('PATCH', `/users/${id}`, b),
};
