// Sends the site's emails through SMTP (for example Zoho Mail) and records every attempt in email_log.
// If SMTP isn't configured yet, emails are logged as "skipped" and everything else keeps working.
import { DEFAULT_SITE_URL } from './workflow';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import defaults from '../../src/cms/defaults.generated.json';
import type { Env } from './http';

let transport: Transporter | null = null;
let transportKey = '';

export function mailConfigured(env: Env): boolean {
  return !!(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
}

function getTransport(env: Env): Transporter {
  if (transport && transportKey === 'test') return transport;
  const key = `${env.SMTP_HOST}|${env.SMTP_PORT}|${env.SMTP_USER}`;
  if (!transport || key !== transportKey) {
    const port = Number(env.SMTP_PORT || 465);
    transport = nodemailer.createTransport({ host: env.SMTP_HOST, port, secure: port === 465, auth: { user: env.SMTP_USER, pass: env.SMTP_PASS } });
    transportKey = key;
  }
  return transport;
}

/** Only for tests: send through a custom transport. */
export function setTestTransport(t: Transporter | null) { transport = t; transportKey = t ? 'test' : ''; }

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);
const fill = (s: string, vars: Record<string, string>) => s.replace(/\{\{(\w+)\}\}/g, (_, k: string) => vars[k] ?? '');
/** Values the server builds itself (never typed by a visitor); only these may become clickable links. */
const LINK_VARS = new Set(['link', 'statusLink', 'unsubscribe']);
const A = (href: string) => `<a href="${esc(href)}" style="color:#1F74C9">${esc(href)}</a>`;

/**
 * Builds the HTML part. Web addresses written into the template by the team are made clickable first,
 * while the {{placeholders}} are still in place; then each placeholder is filled with its escaped value.
 * So text a visitor typed (a name, a company, an event) is never turned into a link.
 */
/** The HTML version of an email: the logo at the top (from the live site, so it shows once images are allowed), then the text. */
function html(template: string, vars: Record<string, string>, base = DEFAULT_SITE_URL): string {
  const tpl = template.replace(/\n{3,}/g, '\n\n').trim();
  const paras = esc(tpl).split(/\n{2,}/).map((p) => {
    const linked = p.replace(/\n/g, '<br>').replace(/(https?:\/\/[^\s<{]+)/g, (u) => `<a href="${u}" style="color:#1F74C9">${u}</a>`);
    const filled = linked.replace(/\{\{(\w+)\}\}/g, (_, k: string) => {
      const v = vars[k] ?? '';
      return LINK_VARS.has(k) && /^https?:\/\//.test(v) ? A(v) : esc(v).replace(/\r?\n/g, '<br>');
    });
    return `<p style="margin:0 0 14px">${filled}</p>`;
  }).join('');
  return `<!doctype html><html><body style="margin:0;background:#F4F6FD;font-family:Arial,Helvetica,sans-serif;color:#1B2350">
<div style="max-width:560px;margin:0 auto;padding:28px 16px"><div style="background:#ffffff;border-radius:14px 14px 0 0;padding:16px 24px;border-bottom:3px solid #6A3FBF"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right:10px;vertical-align:middle"><img src="${base}/brand/email-mark.png" width="50" height="32" alt="" style="display:block;border:0"></td><td style="vertical-align:middle;font-weight:bold;font-size:18px;color:#1B2350;font-family:Arial,Helvetica,sans-serif">OneOfficeAutomation</td></tr></table></div>
<div style="background:#fff;border-radius:0 0 14px 14px;padding:24px;font-size:15px;line-height:1.6">${paras}</div>
<p style="color:#7F8BB8;font-size:12px;text-align:center;margin-top:16px">OneOfficeAutomation Private Limited</p></div></body></html>`;
}

async function templates(env: Env): Promise<Record<string, string>> {
  try {
    const row = await env.DB.prepare("SELECT value FROM content WHERE `key` = 'emails.templates'").first<{ value: string }>();
    return { ...defaults['emails.templates'], ...(row ? JSON.parse(row.value) : {}) };
  } catch {
    return defaults['emails.templates'];
  }
}

/** Sends one templated email. Never throws: failures are recorded in email_log. */
export async function sendMail(env: Env, to: string, template: string, vars: Record<string, string>, override?: { subject: string; body: string }): Promise<'sent' | 'skipped' | 'failed'> {
  // override: unsaved wording from the admin's email editor, for “Send me a test”.
  const t = override ? { ...(await templates(env)), [`${template}_subject`]: override.subject, [`${template}_body`]: override.body } : await templates(env);
  const oneLine = Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, String(v ?? '').replace(/[\r\n]+/g, ' ')]));
  const subject = fill(t[`${template}_subject`] ?? template, oneLine).slice(0, 290);
  const bodyTemplate = t[`${template}_body`] ?? '';
  const body = fill(bodyTemplate, vars).replace(/\n{3,}/g, '\n\n').trim();
  let status: 'sent' | 'skipped' | 'failed' = 'skipped';
  let error: string | null = null;
  if (!to) { status = 'failed'; error = 'No email address.'; }
  else if (mailConfigured(env) || transportKey === 'test') {
    try {
      await getTransport(env).sendMail({ from: env.MAIL_FROM || env.SMTP_USER, to, replyTo: env.NOTIFY_EMAIL || undefined, subject, text: body, html: html(bodyTemplate, vars, (env.SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, '')) });
      status = 'sent';
    } catch (err) {
      status = 'failed';
      error = String((err as Error).message || err).slice(0, 480);
    }
  } else {
    error = 'Email is not set up yet (SMTP settings missing).';
  }
  try {
    await env.DB.prepare('INSERT INTO email_log (to_email, subject, template, status, error, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)')
      .bind(to.slice(0, 200), subject, template, status, error, new Date().toISOString()).run();
  } catch (err) {
    console.error('email_log', err);
  }
  return status;
}

/** Sends to the team address (NOTIFY_EMAIL), if one is set. */
export async function notifyTeam(env: Env, vars: Record<string, string>) {
  if (env.NOTIFY_EMAIL) await sendMail(env, env.NOTIFY_EMAIL, 'team_new', vars);
}
