// All /api/* requests are handled here (called by the Express server in index.ts).
import { DUMMY_HASH, hashPassword, verifyPassword } from './_lib/crypto';
import { fieldErrors, leadSchemas, loginSchema, registerSchema } from './_lib/validation';
import { handleAdmin } from './_lib/admin';
import { handlePortal, customerStatus, customerCookie, customerSession, sessionCustomerId, verifyLink } from './_lib/portal';
import { notifyTeam, sendMail } from './_lib/mail';
import { STAGES, emailVerified, legacyStatus, logActivity, now, sign, siteUrl } from './_lib/workflow';
import { allow } from './_lib/http';
import { publicContent } from './_lib/seoPage';
import { articleBody, articleFeedback, gatedFile, publicLists, searchLibrary } from './_lib/library';
import { handleCatalogPublic } from './_lib/catalog';
import type { Env } from './_lib/http';

type Customer = { id: string; first_name: string; last_name: string; email: string; company: string; country: string; plan: string; password_hash: string; created_at: string };


function json(body: unknown, status = 200, extra: HeadersInit = {}): Response {
  const headers = new Headers(extra);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  // Callers may set their own caching (the public content uses a short cache); everything else is never cached.
  if (!headers.has('Cache-Control')) headers.set('Cache-Control', 'no-store');
  headers.set('X-Content-Type-Options', 'nosniff');
  return new Response(JSON.stringify(body), { status, headers });
}

const publicUser = (c: Customer, meta: { status: string; newsletter: number } | null | undefined, verified: boolean) => ({
  id: c.id, firstName: c.first_name, lastName: c.last_name, email: c.email,
  company: c.company, country: c.country, plan: c.plan, createdAt: c.created_at,
  status: meta?.status ?? (c.plan === 'community' ? 'free' : 'trial'), newsletter: !!meta?.newsletter, emailVerified: verified,
});

async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

async function currentCustomer(env: Env, req: Request): Promise<Customer | null> {
  const id = await sessionCustomerId(env, req);
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
    // The one exception is a file upload to the media library: it must be an image or PDF type (which other sites can't
    // send without the browser asking first) and, when the browser says where it came from, come from this site.
    const ctype = (request.headers.get('Content-Type') ?? '').toLowerCase();
    if (route === 'POST /api/admin/media/upload') {
      const origin = request.headers.get('Origin');
      if (!/^(image\/(png|jpeg|gif|webp)|application\/pdf)$/.test(ctype.split(';')[0].trim())) return json({ error: 'Only PNG, JPEG, WebP, GIF and PDF files can be uploaded.' }, 415);
      if (origin && new URL(origin).host !== url.host) return json({ error: 'Uploads must come from this site.' }, 403);
    } else if ((request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH') && !ctype.startsWith('application/json')) {
      return json({ error: 'Send JSON.' }, 415);
    }

    if (route === 'GET /api/health') return json({ ok: true });

    // Published content overrides: one small JSON map, cached for a few seconds.
    if (route === 'GET /api/content') {
      // Private sections stay on the server; the Resources lists come from the library.
      return json(await publicContent(env), 200, { 'Cache-Control': 'public, max-age=5' });
    }
    const cat = await handleCatalogPublic(env, route);
    if (cat) return cat;
    if (route === 'GET /api/search') {
      if (!(await allow(env, request, 'search', 120, 600))) return json({ error: 'Too many searches. Please wait a moment.' }, 429);
      return json(await searchLibrary(env, url.searchParams.get('q') ?? ''), 200, { 'Cache-Control': 'public, max-age=30' });
    }
    const fb = route.match(/^POST \/api\/items\/article\/([A-Za-z0-9_-]{1,80})\/feedback$/);
    if (fb) {
      if (!(await allow(env, request, 'feedback', 30, 3600))) return json({ error: 'Thanks, we already have your feedback.' }, 429);
      return articleFeedback(env, fb[1], await readJson(request));
    }
    const art = route.match(/^GET \/api\/items\/article\/([A-Za-z0-9_-]{1,80})$/);
    if (art) return articleBody(env, art[1], !!(await sessionCustomerId(env, request)));

    const adminResponse = await handleAdmin(request, env, route, url);
    if (adminResponse) return adminResponse;
    const portalResponse = await handlePortal(request, env, route, url);
    if (portalResponse) return portalResponse;

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
      const status = customer.plan === 'enterprise' ? 'enterprise_pending' : customer.plan === 'community' ? 'free' : 'trial';
      await env.DB.prepare('INSERT INTO customer_meta (customer_id, status, newsletter, updated_at) VALUES (?1, ?2, 0, ?3)').bind(customer.id, status, now()).run();
      await logActivity(env, 'customer', customer.id, `${customer.first_name} ${customer.last_name}`, 'signed_up', null, status);
      const base = siteUrl(env, request);
      // The welcome email's link confirms the address; until then, nothing matched by email is shown in My account.
      await sendMail(env, customer.email, 'welcome', { name: customer.first_name, plan: customer.plan[0].toUpperCase() + customer.plan.slice(1), link: await verifyLink(env, base, customer.id) });
      await notifyTeam(env, { type: customer.plan === 'enterprise' ? 'Enterprise sign-up (needs sales follow-up)' : 'sign-up', name: `${customer.first_name} ${customer.last_name} (${customer.company})`, email: customer.email, link: `${base}/admin/customers` });
      return json({ user: publicUser(customer, { status, newsletter: 0 }, false) }, 201, { 'Set-Cookie': await customerSession(env, customer.id) });
    }

    if (route === 'POST /api/auth/login') {
      if (!(await allow(env, request, 'auth', 20, 900))) return json({ error: 'Too many attempts. Please wait a few minutes and try again.' }, 429);
      const parsed = loginSchema.safeParse(await readJson(request));
      if (!parsed.success) return json(fieldErrors(parsed.error), 400);
      const customer = await env.DB.prepare('SELECT * FROM customers WHERE email = ?1').bind(parsed.data.email).first<Customer>();
      const ok = await verifyPassword(parsed.data.password, customer?.password_hash ?? DUMMY_HASH);
      if (!customer || !ok) return json({ error: 'Email or password is incorrect.' }, 401);
      const meta = await customerStatus(env, customer.id);
      if (meta && (meta.status === 'suspended' || meta.status === 'closed')) return json({ error: `This account is ${meta.status}. Please contact support@oneofficeautomation.com.` }, 403);
      return json({ user: publicUser(customer, meta, await emailVerified(env, customer.id)) }, 200, { 'Set-Cookie': await customerSession(env, customer.id) });
    }

    if (route === 'POST /api/auth/logout') {
      return json({ ok: true }, 200, { 'Set-Cookie': customerCookie('', 0) });
    }

    if (route === 'GET /api/auth/me') {
      const customer = await currentCustomer(env, request);
      if (!customer) return json({ error: 'Not signed in.' }, 401);
      const meta = await customerStatus(env, customer.id);
      if (meta && (meta.status === 'suspended' || meta.status === 'closed')) return json({ error: 'Not signed in.' }, 401, { 'Set-Cookie': customerCookie('', 0) });
      return json({ user: publicUser(customer, meta, await emailVerified(env, customer.id)) });
    }

    const lead = route.match(/^POST \/api\/leads\/(demo|partner|newsletter|career|download)$/);
    if (lead) {
      if (!(await allow(env, request, 'leads', 30, 3600))) return json({ error: 'Too many submissions. Please try again later.' }, 429);
      const kind = lead[1] as keyof typeof leadSchemas;
      const parsed = leadSchemas[kind].safeParse(await readJson(request));
      if (!parsed.success) return json(fieldErrors(parsed.error), 400);
      const d = parsed.data as Record<string, string>;
      const base = siteUrl(env, request);
      // A gated download must name a published blog item that has a file and asks for details first.
      let fileUrl = '';
      if (kind === 'download') {
        const posts = ((await publicLists(env))['resources.insights'] ?? []) as { slug?: string; gated?: boolean; title?: string }[];
        const post = posts.find((x) => x.slug === d.dfile && x.gated);
        if (!post) return json({ error: 'That download isn’t available.' }, 404);
        fileUrl = await gatedFile(env, d.dfile);
        if (!fileUrl) return json({ error: 'That download isn’t available.' }, 404);
        d.dtitle = String(post.title ?? '');
      }
      if (kind === 'newsletter') {
        // One row per email address: subscribing again simply re-activates it.
        const existing = await env.DB.prepare("SELECT l.id, m.stage FROM leads l LEFT JOIN lead_meta m ON m.lead_id = l.id WHERE l.kind = 'newsletter' AND JSON_UNQUOTE(JSON_EXTRACT(l.payload, '$.nl')) = ?1 LIMIT 1").bind(d.nl).first<{ id: string; stage: string | null }>();
        if (existing) {
          if (existing.stage === 'unsubscribed') {
            await env.DB.prepare("UPDATE lead_meta SET stage = 'subscribed', updated_at = ?2 WHERE lead_id = ?1").bind(existing.id, now()).run();
            await logActivity(env, 'lead', existing.id, d.nl, 'stage', 'unsubscribed', 'subscribed', 'Subscribed again');
          }
          return json({ ok: true }, 201);
        }
      }
      const id = crypto.randomUUID();
      const stage = STAGES[kind][0].id;
      await env.DB.batch([
        env.DB.prepare('INSERT INTO leads (id, kind, status, payload, created_at) VALUES (?1, ?2, ?3, ?4, ?5)').bind(id, kind, legacyStatus(kind, stage), JSON.stringify(d), now()),
        env.DB.prepare('INSERT INTO lead_meta (lead_id, stage, updated_at) VALUES (?1, ?2, ?3)').bind(id, stage, now()),
      ]);
      const who = kind === 'demo' ? `${d.fn} ${d.ln}` : kind === 'partner' ? d.pn : kind === 'career' ? d.cn : kind === 'download' ? d.dn : d.nl;
      await logActivity(env, 'lead', id, who, 'submitted', null, stage);
      const admin = `${base}/admin/records/${id}`;
      if (kind === 'download') {
        await notifyTeam(env, { type: `download (${d.dtitle})`, name: `${d.dn}${d.dc ? ` (${d.dc})` : ''}`, email: d.de, link: admin });
        return json({ ok: true, url: fileUrl }, 201);
      }
      if (kind === 'demo') {
        await sendMail(env, d.em, 'demo_received', { name: d.fn });
        await notifyTeam(env, { type: 'demo request', name: `${d.fn} ${d.ln} (${d.co})`, email: d.em, link: admin });
      } else if (kind === 'partner') {
        await sendMail(env, d.pe, 'partner_received', { name: d.pn, company: d.pc });
        await notifyTeam(env, { type: 'partner application', name: `${d.pn} (${d.pc})`, email: d.pe, link: admin });
      } else if (kind === 'career') {
        const statusLink = `${base}/application/${id}.${sign(env, 'app:' + id)}`;
        await sendMail(env, d.ce, 'career_received', { name: d.cn, role: d.crole || 'a role', statusLink });
        await notifyTeam(env, { type: 'job application', name: `${d.cn} (${d.crole || 'general'})`, email: d.ce, link: admin });
      } else {
        await sendMail(env, d.nl, 'newsletter_welcome', { unsubscribe: `${base}/unsubscribe?e=${encodeURIComponent(d.nl)}&s=${sign(env, 'nl:' + d.nl)}` });
      }
      return json({ ok: true }, 201);
    }

    return json({ error: 'Not found.' }, 404);
  } catch (err) {
    console.error(err);
    return json({ error: 'Something went wrong on our side. Please try again.' }, 500);
  }
}
