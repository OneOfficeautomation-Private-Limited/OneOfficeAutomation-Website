import { Fragment } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

/**
 * Article text formatting (a small, safe subset of Markdown). Builds React elements, never raw HTML.
 *   ## Heading            ### Smaller heading
 *   - bullet               1. numbered step
 *   > Note: text           > Warning: text        (also Tip:)
 *   ```                    code block (lines between two ``` lines)
 *   | a | b |              table (first row is the header)
 *   ![description](/media/picture.png)            image from this site
 *   https://www.youtube.com/watch?v=…            a YouTube or Vimeo link alone on a line becomes a video player
 *   **bold**   `code`   [link text](/page or https://…)
 * Blank lines separate paragraphs. Existing articles (##, - and paragraphs) look exactly as before.
 */
export const FORMAT_HELP = 'Leave a blank line between paragraphs. ## heading, ### smaller heading, - bullet, 1. numbered step, > Note: / > Tip: / > Warning: box, ``` on its own line before and after code, | a | b | for a table, ![description](/media/file.png) for an image from this site. In text: **bold**, `code`, [link text](/page).';

const SAFE_LINK = /^(https?:\/\/|\/(?![/\\])|#|mailto:)/i;

/** Bold, inline code and links inside a line. */
export function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  // A link is [text](address); ![…](…) mid-sentence is left as text (images only work on their own line).
  const re = /\*\*([^*]+)\*\*|`([^`]+)`|(?<!!)\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0; let m: RegExpExecArray | null; let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1]) out.push(<strong key={k++}>{m[1]}</strong>);
    else if (m[2]) out.push(<code key={k++}>{m[2]}</code>);
    else if (m[3] && SAFE_LINK.test(m[4])) {
      const href = m[4];
      out.push(href.startsWith('/') ? <Link key={k++} to={href}>{m[3]}</Link> : <a key={k++} href={href} {...(/^https?:/.test(href) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{m[3]}</a>);
    } else out.push(m[0]);
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** A YouTube or Vimeo link alone on a line becomes a player (YouTube's privacy-enhanced player, no cookies until played). */
export function videoEmbed(line: string): string | null {
  const y = line.match(/^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})\S*$/);
  if (y) return `https://www.youtube-nocookie.com/embed/${y[1]}`;
  const v = line.match(/^(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(\d{5,12})\S*$/);
  if (v) return `https://player.vimeo.com/video/${v[1]}`;
  return null;
}

const CALLOUT = /^>\s*(Note|Tip|Warning|Important)\s*:\s*(.*)$/i;

export function ArticleBody({ text }: { text: string }) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const out: ReactNode[] = [];
  let i = 0; let k = 0;
  while (i < lines.length) {
    const l = lines[i];
    const t = l.trim();
    if (!t) { i++; continue; }
    if (t.startsWith('```')) {
      const code: string[] = []; i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) code.push(lines[i++]);
      i++;
      out.push(<pre key={k++} className="rs-code"><code>{code.join('\n')}</code></pre>);
      continue;
    }
    if (t.startsWith('## ')) { out.push(<h2 key={k++}>{inline(t.slice(3))}</h2>); i++; continue; }
    if (t.startsWith('### ')) { out.push(<h3 key={k++}>{inline(t.slice(4))}</h3>); i++; continue; }
    if (t.startsWith('- ')) { out.push(<p key={k++} className="rs-li">{inline(t.slice(2))}</p>); i++; continue; }
    if (/^\d+\.\s/.test(t)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) items.push(lines[i++].trim().replace(/^\d+\.\s/, ''));
      out.push(<ol key={k++} className="rs-steps">{items.map((s, n) => <li key={n}>{inline(s)}</li>)}</ol>);
      continue;
    }
    const c = t.match(CALLOUT);
    if (c) {
      const kind = c[1].toLowerCase();
      out.push(<div key={k++} className={`rs-callout rs-${kind === 'important' ? 'warning' : kind}`} role="note"><strong>{c[1][0].toUpperCase() + c[1].slice(1).toLowerCase()}:</strong> {inline(c[2])}</div>);
      i++; continue;
    }
    if (t.startsWith('|')) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const cells = lines[i].trim().replace(/^\||\|$/g, '').split('|').map((x) => x.trim());
        if (!cells.every((x) => /^:?-{2,}:?$/.test(x))) rows.push(cells);
        i++;
      }
      const [head, ...body] = rows;
      out.push(
        <div key={k++} className="rs-table" role="region" aria-label="Table" tabIndex={0}>
          <table>
            <thead><tr>{head.map((h, n) => <th key={n}>{inline(h)}</th>)}</tr></thead>
            <tbody>{body.map((r, n) => <tr key={n}>{r.map((x, j) => <td key={j}>{inline(x)}</td>)}</tr>)}</tbody>
          </table>
        </div>,
      );
      continue;
    }
    const vid = videoEmbed(t);
    if (vid) { out.push(<div key={k++} className="rs-video"><iframe src={vid} title="Video" loading="lazy" allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /></div>); i++; continue; }
    const img = t.match(/^!\[([^\]]*)\]\((\/(?![/\\])[^)\s]+)\)$/);
    if (img) { out.push(<figure key={k++} className="rs-figure"><img src={img[2]} alt={img[1]} loading="lazy" />{img[1] && <figcaption>{img[1]}</figcaption>}</figure>); i++; continue; }
    out.push(<p key={k++}>{inline(t)}</p>);
    i++;
  }
  return <Fragment>{out}</Fragment>;
}
