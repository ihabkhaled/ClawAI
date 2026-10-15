export const CITATION_TABLE_MAX_ITEMS = 60;
export const CITATION_TABLE_LEAD =
  'Evidence you may cite, one per line as: evidenceId url. Copy the id and the url exactly; a number or any other id is not valid.';

/** How the article body is laid out (ADR-189); the FORMAT stage enforces it, the authors aim for it. */
export const AUTHOR_STRUCTURE_NOTE =
  'Lay the "markdown" article out as clean GitHub-flavoured Markdown: one H1 title, then a short "Key takeaways" bullet list or a 2 to 3 sentence summary, H2 sections with H3 subsections, paragraphs of at most 4 sentences, bullet lists for enumerations and numbered lists for steps, a Markdown table (header row) for any comparison or specification data, notable definitions or cautions as blockquotes starting "> **Note:** ", "> **Tip:** " or "> **Warning:** " (translate the label), and a final "Sources" list of the cited urls. Every heading is written in the article language. No raw HTML.';

/** JSON reply an author must return; keys stay English whatever the article language. */
export const AUTHOR_REPLY_SHAPE =
  '{"markdown": string, "citations": [{"evidenceId": string, "url": string}]}';

export const AUTHOR_REPLY_EXAMPLE =
  '{"markdown":"# Title\\n\\nA claim [abc123].","citations":[{"evidenceId":"abc123","url":"https://example.com/a"}]}';
