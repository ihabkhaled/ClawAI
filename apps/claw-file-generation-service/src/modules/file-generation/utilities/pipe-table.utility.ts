import {
  CODE_FENCE_LINE,
  PIPE_TABLE_LINE,
  PIPE_TABLE_SEPARATOR,
} from '../constants/document-render.constants';

/**
 * Adds the missing `|---|` row under the header of a pipe table that a model
 * wrote without one. markdown-it reads such a block as a paragraph, so a CSV
 * came out as one column (gemini-3.5-flash-lite, live 2026-09-25, ADR-119).
 * Needs two or more pipe lines in a row; code fences are left alone.
 */
export function repairPipeTables(markdown: string): string {
  const lines = markdown.split('\n');
  const out: string[] = [];
  let inFence = false;
  for (const [index, line] of lines.entries()) {
    if (CODE_FENCE_LINE.test(line)) inFence = !inFence;
    out.push(line);
    if (inFence || !startsPipeTable(lines, index)) continue;
    const columns = line
      .trim()
      .replaceAll(/^\||\|$/gu, '')
      .split('|').length;
    out.push(`|${' --- |'.repeat(columns)}`);
  }
  return out.join('\n');
}

/** The header line of a pipe table that has no separator row under it. */
function startsPipeTable(lines: readonly string[], index: number): boolean {
  const line = lines.at(index) ?? '';
  const next = lines.at(index + 1);
  const previous = index > 0 ? lines.at(index - 1) : undefined;
  return (
    PIPE_TABLE_LINE.test(line) &&
    next !== undefined &&
    PIPE_TABLE_LINE.test(next) &&
    !PIPE_TABLE_SEPARATOR.test(next) &&
    !PIPE_TABLE_SEPARATOR.test(line) &&
    (previous === undefined || !PIPE_TABLE_LINE.test(previous))
  );
}
