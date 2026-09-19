import {
  ANSWER_FILENAME_TRAILING_CHARS,
  ANSWER_TITLE_MAX_CHARS,
} from '@/constants/answer-export.constants';

/** A short title for the filename: the first heading, else the first line. */
export function answerTitle(markdown: string): string {
  const lines = markdown
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const heading = lines.find((line) => /^#{1,6}\s/u.test(line));
  const raw = (heading ?? lines[0] ?? 'answer').replace(/^#{1,6}\s+/u, '');
  const plain = markdownToPlainText(raw).trim();
  return (plain.length > 0 ? plain : 'answer').slice(0, ANSWER_TITLE_MAX_CHARS);
}

/** A filename-safe version of a title, without an extension. */
export function safeFileBase(title: string): string {
  // Control characters go first: they are invisible in a filename and some
  // file systems refuse them.
  const printable = Array.from(title)
    .map((char) => (char.charCodeAt(0) < 32 ? ' ' : char))
    .join('');
  const base = trimFilenameEnd(
    printable
      .replaceAll(/[\\/:*?"<>|\r\n\t]/gu, ' ')
      .replaceAll(/\s+/gu, ' ')
      .trim(),
  );
  return base.length > 0 ? base : 'answer';
}

function trimFilenameEnd(base: string): string {
  let end = base.length;
  while (end > 0 && ANSWER_FILENAME_TRAILING_CHARS.includes(base.charAt(end - 1))) {
    end -= 1;
  }
  return base.slice(0, end);
}

/**
 * Markdown to readable plain text: headings, emphasis, links, images, code
 * fences and table pipes are reduced to their words, lists keep a bullet.
 */
export function markdownToPlainText(markdown: string): string {
  // Table separator rows (|---|:--:|) are dropped line by line: a single
  // regex for them needs nested quantifiers, which can backtrack for ages.
  const withoutSeparators = markdown
    .split('\n')
    .filter((line) => !(line.includes('---') && /^[\s|:-]+$/u.test(line)))
    .join('\n');
  return withoutSeparators
    .replaceAll(/```[a-zA-Z0-9]*\n?/gu, '')
    .replaceAll(/!\[([^\]]*)\]\([^)]*\)/gu, '$1')
    .replaceAll(/\[([^\]]+)\]\(([^)]+)\)/gu, '$1 ($2)')
    .replaceAll(/^#{1,6}\s+/gmu, '')
    .replaceAll(/(\*\*|__)(.*?)\1/gu, '$2')
    .replaceAll(/(\*|_)(.*?)\1/gu, '$2')
    .replaceAll(/`([^`]+)`/gu, '$1')
    .replaceAll(/^\s*[-*+]\s+/gmu, '• ')
    .replaceAll(/^\s*>\s?/gmu, '')
    .replaceAll(/\s*\|\s*/gu, '  ')
    .replaceAll(/\n{3,}/gu, '\n\n')
    .trim();
}

/** Saves text as a file on the user's device. */
export function saveTextFile(filename: string, text: string, mimeType: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: mimeType }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
