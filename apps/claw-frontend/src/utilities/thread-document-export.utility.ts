import { ThreadExportListKind } from '@/enums/thread-export-list-kind.enum';
import type { ThreadExportSource } from '@/types/thread-export.types';
import { safeThreadCitationUrl } from '@/utilities/thread-citation.utility';

const AMPERSAND = /&/gu;
const LESS_THAN = /</gu;
const GREATER_THAN = />/gu;
const DOUBLE_QUOTE = /"/gu;

export function escapeHtml(value: string): string {
  return value
    .replaceAll(AMPERSAND, '&amp;')
    .replaceAll(LESS_THAN, '&lt;')
    .replaceAll(GREATER_THAN, '&gt;')
    .replaceAll(DOUBLE_QUOTE, '&quot;');
}

/** Bold, italic, inline code and links inside one already-escaped line. */
function renderInline(escapedLine: string): string {
  return escapedLine
    .replaceAll(/`([^`]+)`/gu, '<code>$1</code>')
    .replaceAll(/\*\*([^*]+)\*\*/gu, '<strong>$1</strong>')
    .replaceAll(/(^|[^*])\*([^*\s][^*]*)\*/gu, '$1<em>$2</em>')
    .replaceAll(/\[([^\]]+)\]\(([^)\s]+)\)/gu, (_match, label: string, rawUrl: string) => {
      const safe = safeThreadCitationUrl(unescapeAmpersand(rawUrl));
      return safe === null
        ? label
        : `<a href="${escapeHtml(safe)}" rel="noopener noreferrer">${label}</a>`;
    });
}

function unescapeAmpersand(value: string): string {
  return value.replaceAll('&amp;', '&');
}

type BlockState = { html: string[]; list: ThreadExportListKind | null; code: string[] | null };

function closeList(state: BlockState): void {
  if (state.list !== null) {
    state.html.push(`</${state.list}>`);
    state.list = null;
  }
}

function openList(state: BlockState, kind: ThreadExportListKind): void {
  if (state.list !== kind) {
    closeList(state);
    state.html.push(`<${kind}>`);
    state.list = kind;
  }
}

/**
 * A small, safe Markdown-to-HTML converter for exported Threads.
 *
 * Every character of the source is HTML-escaped BEFORE any markup is added, and a link is kept
 * only if its address passes the same check the public page uses, so a hostile draft cannot put a
 * script, an event handler or a `javascript:` link into the file. It covers what Threads
 * contain: headings, paragraphs, lists, quotes, code blocks, rules, bold, italic, inline code
 * and links.
 */
export function markdownToHtml(markdown: string): string {
  const state: BlockState = { html: [], list: null, code: null };
  for (const rawLine of markdown.replaceAll(/\r\n?/gu, '\n').split('\n')) {
    if (rawLine.trimStart().startsWith('```')) {
      if (state.code === null) {
        closeList(state);
        state.code = [];
      } else {
        state.html.push(`<pre><code>${state.code.join('\n')}</code></pre>`);
        state.code = null;
      }
      continue;
    }
    const escaped = escapeHtml(rawLine);
    if (state.code !== null) {
      state.code.push(escaped);
      continue;
    }
    const heading = /^(#{1,6})\s+(.*)$/u.exec(escaped);
    const unordered = /^\s*[-*+]\s+(.*)$/u.exec(escaped);
    const ordered = /^\s*\d+[.)]\s+(.*)$/u.exec(escaped);
    const quote = /^&gt;\s?(.*)$/u.exec(escaped);
    if (heading?.[1] !== undefined && heading[2] !== undefined) {
      closeList(state);
      const level = heading[1].length;
      state.html.push(`<h${String(level)}>${renderInline(heading[2])}</h${String(level)}>`);
    } else if (unordered?.[1] !== undefined) {
      openList(state, ThreadExportListKind.Unordered);
      state.html.push(`<li>${renderInline(unordered[1])}</li>`);
    } else if (ordered?.[1] !== undefined) {
      openList(state, ThreadExportListKind.Ordered);
      state.html.push(`<li>${renderInline(ordered[1])}</li>`);
    } else if (quote?.[1] !== undefined) {
      closeList(state);
      state.html.push(`<blockquote>${renderInline(quote[1])}</blockquote>`);
    } else if (/^\s*([-*_])\1{2,}\s*$/u.test(escaped)) {
      closeList(state);
      state.html.push('<hr />');
    } else if (escaped.trim() === '') {
      closeList(state);
    } else {
      closeList(state);
      state.html.push(`<p>${renderInline(escaped)}</p>`);
    }
  }
  if (state.code !== null) {
    state.html.push(`<pre><code>${state.code.join('\n')}</code></pre>`);
  }
  closeList(state);
  return state.html.join('\n');
}

/** Markdown with its markup removed, for a plain text file. */
export function markdownToPlainText(markdown: string): string {
  return markdown
    .replaceAll(/\r\n?/gu, '\n')
    .replaceAll(/^```.*$/gmu, '')
    .replaceAll(/^#{1,6}\s+/gmu, '')
    .replaceAll(/^\s*>\s?/gmu, '')
    .replaceAll(/^\s*([-*+])\s+/gmu, '- ')
    .replaceAll(/\*\*([^*]+)\*\*/gu, '$1')
    .replaceAll(/(^|[^*])\*([^*\s][^*]*)\*/gu, '$1$2')
    .replaceAll(/`([^`]+)`/gu, '$1')
    .replaceAll(/\[([^\]]+)\]\(([^)\s]+)\)/gu, '$1 ($2)')
    .replaceAll(/\n{3,}/gu, '\n\n')
    .trim();
}

/**
 * A generated draft usually opens with its own `# Title` line. Every export writes the title
 * itself, so that first heading is dropped rather than printed twice.
 */
export function withoutLeadingTitle(markdown: string): string {
  return markdown.replace(/^\s*#[ \t]+[^\n]*\n?/u, '').trimStart();
}

function sourceLines(source: ThreadExportSource): string[] {
  return source.citations.map((citation, index) => `${String(index + 1)}. ${citation.url}`);
}

export function buildThreadTextDocument(source: ThreadExportSource, sourcesLabel: string): string {
  const parts = [source.title, '', markdownToPlainText(withoutLeadingTitle(source.markdown))];
  if (source.citations.length > 0) {
    parts.push('', sourcesLabel, ...sourceLines(source));
  }
  if (source.url !== null) {
    parts.push('', source.url);
  }
  return `${parts.join('\n')}\n`;
}

export function buildThreadMarkdownDocument(
  source: ThreadExportSource,
  sourcesLabel: string,
): string {
  const parts = [`# ${source.title}`, '', withoutLeadingTitle(source.markdown).trim()];
  if (source.citations.length > 0) {
    parts.push('', `## ${sourcesLabel}`, ...sourceLines(source));
  }
  if (source.url !== null) {
    parts.push('', source.url);
  }
  return `${parts.join('\n')}\n`;
}

export function buildThreadJsonDocument(source: ThreadExportSource): string {
  return `${JSON.stringify(
    {
      title: source.title,
      language: source.language,
      url: source.url,
      markdown: source.markdown,
      citations: source.citations.map((citation) => ({ url: citation.url })),
    },
    null,
    2,
  )}\n`;
}

/** One self-contained HTML page: no scripts, no external requests. */
export function buildThreadHtmlDocument(source: ThreadExportSource, sourcesLabel: string): string {
  const citations = source.citations
    .map((citation) => ({ url: citation.url, safe: safeThreadCitationUrl(citation.url) }))
    .filter((citation) => citation.safe !== null);
  const sources =
    citations.length === 0
      ? ''
      : `<h2>${escapeHtml(sourcesLabel)}</h2>\n<ol>\n${citations
          .map(
            (citation) =>
              `<li><a href="${escapeHtml(citation.safe ?? '')}" rel="noopener noreferrer">${escapeHtml(citation.url)}</a></li>`,
          )
          .join('\n')}\n</ol>`;
  const canonical =
    source.url === null
      ? ''
      : `<p><a href="${escapeHtml(source.url)}" rel="noopener noreferrer">${escapeHtml(source.url)}</a></p>`;
  return `<!doctype html>
<html lang="${escapeHtml(source.language)}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(source.title)}</title>
<style>body{font-family:system-ui,sans-serif;line-height:1.6;max-width:46rem;margin:2rem auto;padding:0 1rem;color:#111}pre{background:#f4f4f5;padding:1rem;overflow:auto}code{font-family:ui-monospace,monospace}blockquote{border-inline-start:3px solid #d4d4d8;margin:1rem 0;padding-inline-start:1rem;color:#52525b}a{color:#2563eb}</style>
</head>
<body>
<article>
<h1>${escapeHtml(source.title)}</h1>
${markdownToHtml(withoutLeadingTitle(source.markdown))}
${sources}
${canonical}
</article>
</body>
</html>
`;
}
