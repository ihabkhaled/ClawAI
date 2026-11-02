import { MARKDOWN_CODE_FENCE } from '../constants/publication-translation.constants';

/**
 * Splits Markdown into pieces of about `limit` characters at blank lines, never inside a code
 * fence. A single block longer than the limit stays whole: cutting it would cut a sentence.
 */
export function splitMarkdownForTranslation(markdown: string, limit: number): string[] {
  const chunks: string[] = [];
  let current: string[] = [];
  let currentLength = 0;
  let insideFence = false;
  for (const line of markdown.split('\n')) {
    if (line.trimStart().startsWith(MARKDOWN_CODE_FENCE)) insideFence = !insideFence;
    const isBoundary = !insideFence && line.trim() === '';
    if (isBoundary && currentLength >= limit) {
      chunks.push(current.join('\n'));
      current = [];
      currentLength = 0;
      continue;
    }
    current.push(line);
    currentLength += line.length + 1;
  }
  if (current.length > 0) chunks.push(current.join('\n'));
  return chunks.filter((chunk) => chunk.trim() !== '');
}
