// Password hashing and session tokens using the Web Crypto API built into Node.js.

const enc = new TextEncoder();
const ITERATIONS = 100_000; // stored in each hash, so it can be raised later without breaking existing passwords

const b64url = (bytes: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), (ch) => ch.charCodeAt(0));

async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
  return new Uint8Array(bits);
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/** Returns "pbkdf2_sha256$iterations$salt$hash". */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, ITERATIONS);
  return `pbkdf2_sha256$${ITERATIONS}$${b64url(salt)}$${b64url(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, iter, salt, hash] = stored.split('$');
  if (scheme !== 'pbkdf2_sha256' || !iter || !salt || !hash) return false;
  const actual = await pbkdf2(password, fromB64url(salt), Number(iter));
  return constantTimeEqual(actual, fromB64url(hash));
}

/** A real-format hash of a random password, used so unknown emails take as long as wrong passwords. */
export const DUMMY_HASH = 'pbkdf2_sha256$100000$ry1fQOSLVjzTz5qZTNb6tQ$6Z5pchFCgePtF03X5t2hR3DBDcKz1pVzqQQEpMLvgJY';

async function hmacKey(secret: string) {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

/** Signs a compact HS256 JWT. */
export async function signSession(sub: string, secret: string, days: number): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(enc.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const payload = b64url(enc.encode(JSON.stringify({ sub, iat: now, exp: now + days * 86400 })));
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(`${header}.${payload}`));
  return `${header}.${payload}.${b64url(sig)}`;
}

/** Returns the customer id from a valid, unexpired HS256 token, otherwise null. */
export async function verifySession(token: string, secret: string): Promise<string | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, payload, sig] = parts;
  try {
    const h = JSON.parse(new TextDecoder().decode(fromB64url(header))) as { alg?: string };
    if (h.alg !== 'HS256') return null;
    const ok = await crypto.subtle.verify('HMAC', await hmacKey(secret), fromB64url(sig), enc.encode(`${header}.${payload}`));
    if (!ok) return null;
    const p = JSON.parse(new TextDecoder().decode(fromB64url(payload))) as { sub?: unknown; exp?: unknown };
    if (typeof p.sub !== 'string' || typeof p.exp !== 'number' || p.exp < Date.now() / 1000) return null;
    return p.sub;
  } catch {
    return null;
  }
}

/** Signs a compact HS256 JWT with any payload (adds iat and exp). */
export async function signToken(payload: Record<string, unknown>, secret: string, ttlSeconds: number): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(enc.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const body = b64url(enc.encode(JSON.stringify({ ...payload, iat: now, exp: now + ttlSeconds })));
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(`${header}.${body}`));
  return `${header}.${body}.${b64url(sig)}`;
}

/** Returns the payload of a valid, unexpired HS256 token, otherwise null. */
export async function verifyToken(token: string, secret: string): Promise<Record<string, unknown> | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, payload, sig] = parts;
  try {
    const h = JSON.parse(new TextDecoder().decode(fromB64url(header))) as { alg?: string };
    if (h.alg !== 'HS256') return null;
    const ok = await crypto.subtle.verify('HMAC', await hmacKey(secret), fromB64url(sig), enc.encode(`${header}.${payload}`));
    if (!ok) return null;
    const p = JSON.parse(new TextDecoder().decode(fromB64url(payload))) as Record<string, unknown>;
    if (typeof p.exp !== 'number' || p.exp < Date.now() / 1000) return null;
    return p;
  } catch {
    return null;
  }
}
