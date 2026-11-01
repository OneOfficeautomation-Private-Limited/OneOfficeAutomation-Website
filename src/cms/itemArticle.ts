/**
 * Troubleshooting entries and release notes are entered as structured fields in the Resources library,
 * and shown on the website as ordinary articles (in the Troubleshooting and What's new categories, and in the
 * product's documentation). This builds that article. Shared by the server and the admin preview.
 */
type Data = Record<string, unknown>;
const s = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const section = (title: string, text: string) => (text ? `## ${title}\n${text}` : '');

export type ArticleView = { id: string; title: string; summary: string; category: string; product: string; meta: string; body: string };

export function troubleshootingArticle(id: string, d: Data): ArticleView {
  const symptom = s(d.symptom);
  const versions = s(d.versions);
  return {
    id, title: symptom || 'Troubleshooting', category: 'troubleshooting', product: s(d.product),
    summary: s(d.summary) || (s(d.cause) ? s(d.cause).split('\n')[0].slice(0, 160) : 'Cause and fix.'),
    meta: [s(d.code) && `Article ${s(d.code)}`, versions && `Applies to ${versions}`].filter(Boolean).join(' · '),
    body: [
      section('What you see', [s(d.error) ? `\`\`\`\n${s(d.error)}\n\`\`\`` : '', symptom].filter(Boolean).join('\n')),
      section('Applies to', [versions, s(d.environment)].filter(Boolean).join('\n')),
      section('Cause', s(d.cause)),
      section('How to fix it', s(d.resolution)),
    ].filter(Boolean).join('\n\n'),
  };
}

export function releaseArticle(id: string, d: Data): ArticleView {
  const version = s(d.version);
  return {
    id, title: version ? `What’s new in ${version}` : 'Release notes', category: 'whats-new', product: s(d.product),
    summary: s(d.summary) || `Release notes${s(d.date) ? ` from ${s(d.date)}` : ''}.`,
    meta: [s(d.date) && `Released ${s(d.date)}`].filter(Boolean).join(''),
    body: [
      section('What’s new', s(d.whatsNew)), section('Changes', s(d.changes)), section('Fixed', s(d.fixed)),
      section('Known limitations', s(d.limitations)), section('Deprecated', s(d.deprecated)),
    ].filter(Boolean).join('\n\n'),
  };
}

/** The article for a library item of either type, or null for other types. */
export function itemArticle(type: string, id: string, d: Data): ArticleView | null {
  return type === 'troubleshoot' ? troubleshootingArticle(id, d) : type === 'release' ? releaseArticle(id, d) : null;
}
