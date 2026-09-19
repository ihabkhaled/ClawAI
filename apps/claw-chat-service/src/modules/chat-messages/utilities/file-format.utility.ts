import {
  DEFAULT_FILE_FORMAT,
  FILE_FORMAT_KEYWORDS,
  FILE_FORMAT_TARGET_PREFIX,
  FILE_WRITER_BASE_PROMPT,
  FILE_WRITER_FORMAT_INSTRUCTIONS,
  FILE_WRITER_NAMING_INSTRUCTION,
  NAMED_FILE_FORMATS,
  WHOLE_CODE_FENCE,
} from '../constants/file-writer.constants';
import type { FormatMention } from '../types/file-writer.types';

/**
 * The file format a request asks for (F3b, ADR-108), by whole words.
 *
 * It used to test substrings in a fixed order, so "password" made a Word file,
 * and "spreadsheet", "slides" and "zip" all made a .txt. When several formats
 * are named, the one after "as", "to", "into" or "in" wins ("turn this CSV
 * into a spreadsheet"). Otherwise the first named does.
 */
export function detectRequestedFileFormat(prompt: string): string {
  const mentions: FormatMention[] = [];
  for (const [format, pattern] of FILE_FORMAT_KEYWORDS) {
    for (const match of prompt.matchAll(pattern)) {
      const before = prompt.slice(Math.max(0, match.index - 12), match.index);
      mentions.push({
        format,
        index: match.index,
        targeted: FILE_FORMAT_TARGET_PREFIX.test(before),
      });
    }
  }
  const targeted = mentions.filter((mention) => mention.targeted);
  const pool = targeted.length > 0 ? targeted : mentions;
  const chosen = pool.reduce<FormatMention | null>(
    (first, mention) => (first === null || mention.index < first.index ? mention : first),
    null,
  );
  return chosen?.format ?? DEFAULT_FILE_FORMAT;
}

/** The file writer's system prompt for a format. */
export function fileWriterSystemPrompt(format: string): string {
  const instruction =
    FILE_WRITER_FORMAT_INSTRUCTIONS[format] ??
    FILE_WRITER_FORMAT_INSTRUCTIONS[DEFAULT_FILE_FORMAT] ??
    '';
  const naming = NAMED_FILE_FORMATS.includes(format) ? ` ${FILE_WRITER_NAMING_INSTRUCTION}` : '';
  return `${FILE_WRITER_BASE_PROMPT.replace('{FORMAT}', format)}${naming} ${instruction}`;
}

/**
 * The content inside a fence when the whole answer is one fenced block, as
 * models often wrap a file. The old check matched the first fence anywhere in
 * the answer and threw away everything around it, so a document containing
 * a code sample became just that sample. A zip keeps its fences: they are the
 * files.
 */
export function unwrapWholeCodeFence(content: string, format: string): string {
  if (format === 'ZIP') {
    return content;
  }
  const match = WHOLE_CODE_FENCE.exec(content.trim());
  const inner = match?.[1];
  if (inner === undefined || inner.includes('\n```')) {
    return content;
  }
  return inner.trim();
}
