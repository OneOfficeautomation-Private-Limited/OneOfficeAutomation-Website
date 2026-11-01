import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useCms } from './CmsContext';
import D from './defaults.generated.json';

type Texts = Record<string, string | string[]>;

/**
 * The editable framing text of one page (hero, section headings, closing banner), from the
 * "Pages" group in /admin. Saved text wins; anything not saved yet falls back to the default.
 */
/** The fields of a page's text, typed from its defaults so a misspelt field name is a type error. */
export type PageTexts<K extends keyof typeof D> = { readonly [F in keyof (typeof D)[K]]: string } & { list: (name: keyof (typeof D)[K] & string) => string[] };

export function usePageText<K extends keyof typeof D>(key: K): PageTexts<K> {
  const cms = useCms();
  const defaults = D[key] as unknown as Texts;
  const saved = cms<Partial<Texts>>(key, {});
  const out = Object.assign(
    Object.fromEntries(Object.entries({ ...defaults, ...saved }).filter(([, v]) => typeof v === 'string')) as Record<string, string>,
    { list: (name: string) => { const v = (saved[name] ?? defaults[name]) as string[] | undefined; return Array.isArray(v) ? v.filter((s) => s.trim()) : []; } },
  );
  return out as unknown as PageTexts<K>;
}

/**
 * A headline in the brand style: normal words, then the coloured part, then optional words after it.
 * br puts the coloured part on its own line; tight joins the parts without a space (OneOffice + Automation).
 */
export function Hi({ a, b, c, br, tight, cls = 'ds-gradtext' }: { a?: string; b?: string; c?: string; br?: boolean; tight?: boolean; cls?: string }) {
  return (
    <>
      {a}
      {a && b ? (br ? <br /> : tight ? null : ' ') : null}
      {b ? <span className={cls}>{b}</span> : null}
      {c ? ` ${c}` : null}
    </>
  );
}

/** A button or link that works for pages on this site (/pricing), anchors (#apply) and full links (https://, mailto:). */
export function Go({ to, className, style, children, onClick }: { to: string; className?: string; style?: CSSProperties; children: ReactNode; onClick?: () => void }) {
  const internal = to.startsWith('/') && !to.startsWith('//');
  return internal
    ? <Link className={className} style={style} to={to} onClick={onClick}>{children}</Link>
    : <a className={className} style={style} href={to} onClick={onClick} {...(/^https?:/.test(to) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{children}</a>;
}
