import {
  DIGIT_BLOCKS,
  DIGITS_PER_BLOCK,
  FENCE_PATTERN,
  HEADING_MARK_PATTERN,
  HEADING_MAX_LEVEL,
  HEADING_NUMBERING_PATTERN,
  HTML_TAG_NAME_START,
  LINE_TERMINATOR_CHARACTER,
  LIST_ITEM_PATTERN,
  PARAGRAPH_BREAK_PATTERN,
  TABLE_CELL_PATTERN,
  TRAILING_URL_PUNCTUATION_CHARACTERS,
  URL_PATTERN,
  WHITESPACE_CHARACTER,
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

function trimTrailingUrlPunctuation(url: string): string {
  let end = url.length;
  while (end > 0 && TRAILING_URL_PUNCTUATION_CHARACTERS.includes(url.charAt(end - 1))) end -= 1;
  return url.slice(0, end);
}

export function extractUrls(markdown: string): string[] {
  return (markdown.match(URL_PATTERN) ?? []).map(trimTrailingUrlPunctuation);
}

/** True when the text holds a tag: `<` or `</`, a letter, and a `>` anywhere after it. */
export function containsRawHtml(text: string): boolean {
  const lastClose = text.lastIndexOf('>');
  let open = text.indexOf('<');
  while (open >= 0 && open < lastClose) {
    const name = text.charAt(open + 1) === '/' ? open + 2 : open + 1;
    if (name < lastClose && HTML_TAG_NAME_START.test(text.charAt(name))) {
      return true;
    }
    open = text.indexOf('<', open + 1);
  }
  return false;
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

function isBlank(character: string): boolean {
  return WHITESPACE_CHARACTER.test(character);
}

function skipBlanks(line: string, from: number): number {
  let index = from;
  while (isBlank(line.charAt(index))) index += 1;
  return index;
}

/** Where the trailing blanks, `#`s and blanks of a heading line begin. */
function closingRunStart(line: string): number {
  let index = line.length;
  while (index > 0 && isBlank(line.charAt(index - 1))) index -= 1;
  while (index > 0 && line.charAt(index - 1) === '#') index -= 1;
  while (index > 0 && isBlank(line.charAt(index - 1))) index -= 1;
  return index;
}

/**
 * One ATX heading line (`## Title ##`) to its level and text, or null. The same capture as the
 * earlier `^(#{1,6})\s+(.+?)\s*#*\s*$`, which CodeQL js/polynomial-redos flagged (the lazy text and
 * the closing blanks overlap, so a long run of blanks cost the square of its length). The text runs
 * from the first non-blank after the marks to the closing run of blanks, `#`s and blanks, and is at
 * least one character; a line terminator inside it fails the line, as `.` does not match one.
 */
export function parseHeadingLine(line: string): MarkdownHeading | null {
  let level = 0;
  while (line.charAt(level) === '#') level += 1;
  if (level < 1 || level > HEADING_MAX_LEVEL) {
    return null;
  }
  const textStart = skipBlanks(line, level);
  if (textStart === level) {
    return null;
  }
  if (textStart === line.length) {
    // Only blanks follow the marks: the regex gave back its last blank that `.` matches.
    for (let index = line.length - 1; index > level; index -= 1) {
      if (!LINE_TERMINATOR_CHARACTER.test(line.charAt(index))) {
        return { level, text: line.charAt(index) };
      }
    }
    return null;
  }
  const text = line.slice(textStart, Math.max(closingRunStart(line), textStart + 1));
  return [...text].some((character) => LINE_TERMINATOR_CHARACTER.test(character))
    ? null
    : { level, text };
}

export function headingsOf(markdown: string): MarkdownHeading[] {
  const found: MarkdownHeading[] = [];
  for (const line of proseLines(markdown)) {
    const heading = parseHeadingLine(line);
    if (heading) {
      found.push(heading);
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
