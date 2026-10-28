// All /api/* requests are handled here (called by the Express server in index.ts).
import { DUMMY_HASH, hashPassword, signSession, verifyPassword, verifySession } from './_lib/crypto';
import { fieldErrors, leadSchemas, loginSchema, registerSchema } from './_lib/validation';
import { handleAdmin } from './_lib/admin';
import { allow } from './_lib/http';
import type { Env } from './_lib/http';

type Customer = { id: string; first_name: string; last_name: string; email: string; company: string; country: string; plan: string; password_hash: string; created_at: string };

const COOKIE = 'ooa_session';
const SESSION_DAYS = 7;

function json(body: unknown, status = 200, extra: HeadersInit = {}): Response {
  const headers = new Headers(extra);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  headers.set('Cache-Control', 'no-store');
  headers.set('X-Content-Type-Options', 'nosniff');
  return new Response(JSON.stringify(body), { status, headers });
}

const sessionCookie = (token: string, maxAgeSeconds: number) =>
  `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSeconds}`;

function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get('Cookie') ?? '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return null;
}

const publicUser = (c: Customer) => ({
  id: c.id, firstName: c.first_name, lastName: c.last_name, email: c.email,
  company: c.company, country: c.country, plan: c.plan, createdAt: c.created_at,
});

async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

async function currentCustomer(env: Env, req: Request): Promise<Customer | null> {
  const token = readCookie(req, COOKIE);
  const id = token ? await verifySession(token, env.JWT_SECRET) : null;
  if (!id) return null;
  return env.DB.prepare('SELECT * FROM customers WHERE id = ?1').bind(id).first<Customer>();
}

export async function handleApi(request: Request, env: Env): Promise<Response> {
  try {
    if (!env.JWT_SECRET || env.JWT_SECRET.length < 32) {
      return json({ error: 'The server isn’t configured yet (JWT_SECRET is missing).' }, 500);
    }
    const url = new URL(request.url);
    const route = `${request.method} ${url.pathname.replace(/\/+$/, '')}`;

    // CSRF protection: cross-site HTML forms can't send JSON.
    if ((request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH') && !(request.headers.get('Content-Type') ?? '').toLowerCase().startsWith('application/json')) {
      return json({ error: 'Send JSON.' }, 415);
    }

    if (route === 'GET /api/health') return json({ ok: true });

    // Published content overrides: one small JSON map, cached for a few seconds.
    if (route === 'GET /api/content') {
      const rows = await env.DB.prepare('SELECT `key`, value FROM content').all<{ key: string; value: string }>();
      const out: Record<string, unknown> = {};
      for (const r of rows.results) out[r.key] = JSON.parse(r.value);
      return json(out, 200, { 'Cache-Control': 'public, max-age=5' });
    }

    const adminResponse = await handleAdmin(request, env, route, url);
    if (adminResponse) return adminResponse;

    if (route === 'POST /api/auth/register') {
      if (!(await allow(env, request, 'auth', 20, 900))) return json({ error: 'Too many attempts. Please wait a few minutes and try again.' }, 429);
      const parsed = registerSchema.safeParse(await readJson(request));
      if (!parsed.success) return json(fieldErrors(parsed.error), 400);
      const d = parsed.data;
      const existing = await env.DB.prepare('SELECT id FROM customers WHERE email = ?1').bind(d.email).first();
      if (existing) {
        return json({ error: 'An account with this email already exists. Try signing in.', fields: { email: 'This email is already registered.' } }, 409);
      }
      const customer: Customer = {
        id: crypto.randomUUID(), first_name: d.firstName, last_name: d.lastName, email: d.email, company: d.company,
        country: d.country, plan: d.plan, password_hash: await hashPassword(d.password), created_at: new Date().toISOString(),
      };
      try {
        await env.DB.prepare(
          `INSERT INTO customers (id, first_name, last_name, email, company, country, plan, password_hash, created_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`,
        ).bind(customer.id, customer.first_name, customer.last_name, customer.email, customer.company, customer.country, customer.plan, customer.password_hash, customer.created_at).run();
      } catch (err) {
        if (/UNIQUE|Duplicate entry/.test(String(err))) return json({ error: 'An account with this email already exists. Try signing in.', fields: { email: 'This email is already registered.' } }, 409);
        throw err;
      }
      const token = await signSession(customer.id, env.JWT_SECRET, SESSION_DAYS);
      return json({ user: publicUser(customer) }, 201, { 'Set-Cookie': sessionCookie(token, SESSION_DAYS * 86400) });
    }

    if (route === 'POST /api/auth/login') {
      if (!(await allow(env, request, 'auth', 20, 900))) return json({ error: 'Too many attempts. Please wait a few minutes and try again.' }, 429);
      const parsed = loginSchema.safeParse(await readJson(request));
      if (!parsed.success) return json(fieldErrors(parsed.error), 400);
      const customer = await env.DB.prepare('SELECT * FROM customers WHERE email = ?1').bind(parsed.data.email).first<Customer>();
      const ok = await verifyPassword(parsed.data.password, customer?.password_hash ?? DUMMY_HASH);
      if (!customer || !ok) return json({ error: 'Email or password is incorrect.' }, 401);
      const token = await signSession(customer.id, env.JWT_SECRET, SESSION_DAYS);
      return json({ user: publicUser(customer) }, 200, { 'Set-Cookie': sessionCookie(token, SESSION_DAYS * 86400) });
    }

    if (route === 'POST /api/auth/logout') {
      return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie('', 0) });
    }

    if (route === 'GET /api/auth/me') {
      const customer = await currentCustomer(env, request);
      return customer ? json({ user: publicUser(customer) }) : json({ error: 'Not signed in.' }, 401);
    }

    const lead = route.match(/^POST \/api\/leads\/(demo|partner|newsletter|career)$/);
    if (lead) {
      if (!(await allow(env, request, 'leads', 30, 3600))) return json({ error: 'Too many submissions. Please try again later.' }, 429);
      const kind = lead[1] as keyof typeof leadSchemas;
      const parsed = leadSchemas[kind].safeParse(await readJson(request));
      if (!parsed.success) return json(fieldErrors(parsed.error), 400);
      await env.DB.prepare('INSERT INTO leads (id, kind, payload, created_at) VALUES (?1, ?2, ?3, ?4)')
        .bind(crypto.randomUUID(), kind, JSON.stringify(parsed.data), new Date().toISOString()).run();
      return json({ ok: true }, 201);
    }

    return json({ error: 'Not found.' }, 404);
  } catch (err) {
    console.error(err);
    return json({ error: 'Something went wrong on our side. Please try again.' }, 500);
  }
}
