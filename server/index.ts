// The website server for Hostinger (Node.js web app): serves the built site from dist/ and the API under /api.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import type { NextFunction, Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { handleApi } from './api';
import { Database } from './_lib/db';
import type { Env } from './_lib/http';

// This file is bundled to server-dist/index.js, so the project folder is one level up.
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = join(ROOT, 'dist');

/** Reads KEY=value lines from .env (if present). Variables set in hPanel take priority. */
function loadEnvFile(file: string) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}
loadEnvFile(join(ROOT, '.env'));

const env: Env = {
  DB: new Database({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || '',
    // Hosted databases such as Aiven require an encrypted connection checked against their CA certificate.
    // DB_SSL_CA holds the certificate text; written on one line, \n stands for each line break.
    ssl: process.env.DB_SSL_CA ? { ca: process.env.DB_SSL_CA.replace(/\\n/g, '\n'), rejectUnauthorized: true } : undefined,
  }),
  JWT_SECRET: process.env.JWT_SECRET || '',
  ADMIN_SETUP_TOKEN: process.env.ADMIN_SETUP_TOKEN,
};
const SCHEMA = join(ROOT, 'server', 'schema.sql');

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
};

const app = express();
app.disable('x-powered-by');
// Hostinger runs the app behind a proxy that handles HTTPS. Trusting only private-network proxies means the
// visitor's real IP is used for rate limiting and can't be faked with an X-Forwarded-For header.
app.set('trust proxy', process.env.TRUST_PROXY || 'loopback, linklocal, uniquelocal');

app.use((_req, res, next) => {
  res.set(SECURITY_HEADERS);
  next();
});

// /api: turn the Express request into a standard Request, run the handler, send its Response back.
app.use('/api', express.raw({ type: '*/*', limit: '2mb' }), async (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
  try {
    await env.DB.ensureSchema(SCHEMA);
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) {
      if (v !== undefined && k !== 'x-client-ip') headers.set(k, Array.isArray(v) ? v.join(', ') : v);
    }
    headers.set('X-Client-IP', req.ip ?? 'unknown');
    const hasBody = req.method !== 'GET' && req.method !== 'HEAD' && Buffer.isBuffer(req.body) && req.body.length > 0;
    const request = new Request(`${req.protocol}://${req.get('host')}${req.originalUrl}`, {
      method: req.method,
      headers,
      body: hasBody ? req.body : undefined,
    });
    const response = await handleApi(request, env);
    res.status(response.status);
    response.headers.forEach((value, key) => {
      if (key !== 'set-cookie') res.setHeader(key, value);
    });
    const cookies = response.headers.getSetCookie();
    if (cookies.length) res.setHeader('Set-Cookie', cookies);
    res.send(Buffer.from(await response.arrayBuffer()));
  } catch (err) {
    next(err);
  }
});

// The built website. Hashed files in /assets never change, so browsers may cache them for a year.
app.use(
  express.static(SITE, {
    index: false,
    setHeaders: (res, path) => {
      if (path.includes(`${join(SITE, 'assets')}`)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    },
  }),
);

// Every other address is a page of the single-page app (the app shows its own 404 page).
app.get('*', (_req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(join(SITE, 'index.html'));
});

app.use((err: unknown, _req: ExpressRequest, res: ExpressResponse, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`OneOfficeAutomation is running on http://localhost:${port}`);
  env.DB.ensureSchema(SCHEMA).then(
    () => console.log('Database ready.'),
    (err) => {
      // A refused connection is an AggregateError with an empty message; show the codes instead.
      const reasons = [err, ...(err.errors ?? [])].map((e: { code?: string; message?: string }) => e.code || e.message).filter(Boolean);
      console.error('Could not connect to the database. Check that MySQL is running and DB_HOST, DB_PORT, DB_USER, DB_PASSWORD and DB_NAME.', [...new Set(reasons)].join(', '));
    },
  );
});
