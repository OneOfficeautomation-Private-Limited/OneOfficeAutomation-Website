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
};

/** Same rule as the server: at least 10 characters, with a letter and a number. */
export function passwordProblem(pw: string): string | null {
  if (pw.length < 10) return 'Use at least 10 characters.';
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'Include at least one letter and one number.';
  return null;
}
