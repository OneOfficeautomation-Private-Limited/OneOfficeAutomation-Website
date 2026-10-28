import { z } from 'zod';

const text = (label: string, max: number) => z.string({ required_error: `${label} is required.` }).trim().min(1, `${label} is required.`).max(max, `${label} is too long.`);
const optional = (max: number) => z.string().trim().max(max).optional().default('');
const email = z.string({ required_error: 'Email is required.' }).trim().toLowerCase().email('Enter a valid email address.').max(200);

export const registerSchema = z.object({
  firstName: text('First name', 60),
  lastName: text('Last name', 60),
  email,
  company: text('Company', 120),
  country: text('Country', 80),
  plan: z.enum(['community', 'starter', 'business', 'enterprise']).default('community'),
  password: z
    .string({ required_error: 'Password is required.' })
    .min(10, 'Use at least 10 characters.')
    .max(200, 'Password is too long.')
    .refine((p) => /[A-Za-z]/.test(p) && /\d/.test(p), 'Include at least one letter and one number.'),
  acceptTerms: z.literal(true, { errorMap: () => ({ message: 'Please accept the terms to continue.' }) }),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required.').max(200),
});

export const leadSchemas = {
  demo: z.object({ fn: text('First name', 60), ln: text('Last name', 60), em: email, ph: optional(40), co: text('Company', 120), jt: optional(120), cs: optional(40), ii: optional(60), pr: optional(2000) }),
  partner: z.object({ pn: text('Full name', 120), pc: text('Company', 120), pe: email, pk: text('Country', 80), pt: optional(60), pm: optional(2000) }),
  newsletter: z.object({ nl: email }),
  career: z.object({ cn: text('Full name', 120), ce: email, cph: optional(40), crole: optional(120), clink: optional(300), cmsg: optional(2000) }),
};

/** Turns a Zod error into a summary message and per-field messages. */
export function fieldErrors(error: z.ZodError) {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form');
    fields[key] ??= issue.message;
  }
  return { error: 'Please check the highlighted fields.', fields };
}
