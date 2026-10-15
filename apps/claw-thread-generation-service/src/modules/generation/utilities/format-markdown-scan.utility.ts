import {
  DIGIT_BLOCKS,
  DIGITS_PER_BLOCK,
  FENCE_PATTERN,
  HEADING_MARK_PATTERN,
  HEADING_NUMBERING_PATTERN,
  HEADING_PATTERN,
  LIST_ITEM_PATTERN,
  PARAGRAPH_BREAK_PATTERN,
  TABLE_CELL_PATTERN,
  TRAILING_URL_PUNCTUATION,
  URL_PATTERN,
} from '../constants/format-scan.constants';
import type { MarkdownHeading } from '../types/format-guard.types';

export function foldDigits(text: string): string {
  const compat = text.normalize('NFKC');
  let folded = '';
  for (const char of compat) {
    const code = char.codePointAt(0) ?? 0;
    const block = DIGIT_BLOCKS.find((start) => code >= start && code < start + DIGITS_PER_BLOCK);
    folded += block === undefined ? char : String(code - block);
  }
  return folded;
}

export function extractUrls(markdown: string): string[] {
  return (markdown.match(URL_PATTERN) ?? []).map((url) =>
    url.replace(TRAILING_URL_PUNCTUATION, ''),
  );
}

/** Lines outside code fences; code is never restructured and never counted as prose. */
export function proseLines(markdown: string): string[] {
  const lines: string[] = [];
  let inFence = false;
  for (const line of markdown.split(/\r?\n/u)) {
    if (FENCE_PATTERN.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (!inFence) {
      lines.push(line);
    }
  }
  return lines;
}

export function headingsOf(markdown: string): MarkdownHeading[] {
  const found: MarkdownHeading[] = [];
  for (const line of proseLines(markdown)) {
    const match = HEADING_PATTERN.exec(line);
    if (match?.[1] && match[2]) {
      found.push({ level: match[1].length, text: match[2] });
    }
  }
  return found;
}

/** A GFM delimiter row: cells of three or more dashes, optionally with alignment colons. */
function isTableSeparator(line: string): boolean {
  if (!line.includes('|') && !line.includes('-')) {
    return false;
  }
  const cells = line.trim().replace(/^\|/u, '').replace(/\|$/u, '').split('|');
  return cells.length > 0 && cells.every((cell) => TABLE_CELL_PATTERN.test(cell));
}

export function countTables(markdown: string): number {
  const lines = proseLines(markdown);
  return lines.filter(
    (line, index) =>
      line.includes('|') && isTableSeparator(line) && (lines[index - 1] ?? '').includes('|'),
  ).length;
}

export function countListItems(markdown: string): number {
  return proseLines(markdown).filter((line) => LIST_ITEM_PATTERN.test(line)).length;
}

/** Paragraph blocks: runs of non-blank lines that are not headings, tables, lists or quotes. */
export function paragraphsOf(markdown: string): string[] {
  const blocks = proseLines(markdown).join('\n').split(PARAGRAPH_BREAK_PATTERN);
  return blocks
    .map((block) => block.trim())
    .filter(
      (block) =>
        block.length > 0 &&
        !block.startsWith('#') &&
        !block.startsWith('>') &&
        !block.includes('|') &&
        !LIST_ITEM_PATTERN.test(block),
    );
}

export function stripLineMarkers(line: string): string {
  return HEADING_MARK_PATTERN.test(line) && line.trimStart().startsWith('#')
    ? line.replace(HEADING_MARK_PATTERN, '').replace(HEADING_NUMBERING_PATTERN, '')
    : line.replace(LIST_ITEM_PATTERN, '');
}
