import { STREAM_DATA_CLOSE, STREAM_DATA_OPEN } from '../constants/processing.constants';
import type { RunMemory, TranscriptLine } from '../types/processing.types';

/** Removes the delimiter tokens from untrusted text so it cannot close its own data block. */
export function sanitizeStreamText(text: string): string {
  return text.replaceAll('<<<', '‹‹‹').replaceAll('>>>', '›››');
}

/** Wraps untrusted content in the delimited data block. */
export function streamDataBlock(body: string): string {
  return `${STREAM_DATA_OPEN}\n${body}\n${STREAM_DATA_CLOSE}`;
}

function clock(ms: number): string {
  const date = new Date(ms);
  return date.toISOString().slice(11, 19);
}

/** `[hh:mm:ss] text` lines in media time. */
export function formatTranscript(lines: readonly TranscriptLine[]): string {
  return lines
    .map((line) => `[${clock(line.startAt)}] ${sanitizeStreamText(line.text)}`)
    .join('\n');
}

/** The summarizer's user message: working summary + open card + recent window + visual notes. */
export function buildSummaryUserMessage(
  memory: RunMemory,
  window: readonly TranscriptLine[],
): string {
  const card = memory.openCard
    ? `${sanitizeStreamText(memory.openCard.title)} — ${sanitizeStreamText(memory.openCard.body)}`
    : '(none yet)';
  const visuals = memory.visualNotes.map(
    (note) => `- [${clock(note.at)}] ${sanitizeStreamText(note.description)}`,
  );
  return streamDataBlock(
    [
      `WORKING_SUMMARY: ${sanitizeStreamText(memory.workingSummary) || '(empty)'}`,
      `CURRENT_CARD: ${card}`,
      'TRANSCRIPT:',
      formatTranscript(window),
      'VISUAL_NOTES:',
      visuals.length > 0 ? visuals.join('\n') : '(none)',
    ].join('\n'),
  );
}

/** Every string field of a reply, joined, for the link/markup check. */
export function joinedStrings(values: readonly string[]): string {
  return values.join('\n');
}
