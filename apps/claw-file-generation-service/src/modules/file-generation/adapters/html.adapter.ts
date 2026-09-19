import MarkdownIt from 'markdown-it';

import { escapeHtml } from '../utilities/html-escape.utility';
import { documentMeta, parseMarkdownDocument } from '../utilities/markdown-document.utility';

/**
 * Markdown to a standalone web page. Raw HTML in the answer is escaped
 * (markdown-it `html: false`), and `javascript:` links are refused by
 * markdown-it's link validation. The title and direction come from the answer
 * (F3, ADR-107): the page used to be "Generated Document", left to right,
 * whatever it held.
 */
export const convertToHtml = (content: string, title: string | null = null): Buffer => {
  const htmlBody = new MarkdownIt({ html: false }).render(content);
  const meta = documentMeta(parseMarkdownDocument(content), title);
  const fullHtml = `<!DOCTYPE html>
<html dir="${meta.rtl ? 'rtl' : 'ltr'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(meta.title)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; line-height: 1.6; color: #333; }
    h1, h2, h3 { margin-top: 1.5em; }
    code { background: #f4f4f4; padding: 0.2em 0.4em; border-radius: 3px; font-size: 0.9em; }
    pre { background: #f4f4f4; padding: 1em; border-radius: 6px; overflow-x: auto; }
    table { border-collapse: collapse; width: 100%; margin: 1em 0; }
    th, td { border: 1px solid #ddd; padding: 0.5em 1em; text-align: start; }
    th { background: #f8f8f8; }
    blockquote { border-inline-start: 4px solid #ddd; margin: 1em 0; padding: 0.5em 1em; color: #666; }
  </style>
</head>
<body>
${htmlBody}
</body>
</html>`;
  return Buffer.from(fullHtml, 'utf-8');
};
