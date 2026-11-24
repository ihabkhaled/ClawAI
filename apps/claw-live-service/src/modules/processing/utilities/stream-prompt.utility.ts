import { STREAM_DATA_CLOSE, STREAM_DATA_OPEN } from '../constants/processing.constants';
import type { RunMemory, TranscriptLine, WebNote } from '../types/processing.types';

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

/** The host of a web result (`genius.com`), or null when it is not a URL. */
export function webHost(value: string): string | null {
  try {
    return new URL(value).hostname;
  } catch {
    return null;
  }
}

/** `- title: snippet (host)` lines of the web context, or `(none)`. */
export function formatWebNotes(notes: readonly WebNote[]): string {
  return notes.length === 0
    ? '(none)'
    : notes
        .map(
          (note) =>
            `- ${sanitizeStreamText(note.title)}: ${sanitizeStreamText(note.snippet)} (${note.host})`,
        )
        .join('\n');
}

/**
 * The summarizer's user message: output language, working summary, open card, recent window,
 * visual notes and the web context the model asked for.
 */
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
      `OUTPUT_LANGUAGE: ${memory.spokenLanguage ?? 'auto'}`,
      `WORKING_SUMMARY: ${sanitizeStreamText(memory.workingSummary) || '(empty)'}`,
      `CURRENT_CARD: ${card}`,
      'TRANSCRIPT:',
      formatTranscript(window),
      'VISUAL_NOTES:',
      visuals.length > 0 ? visuals.join('\n') : '(none)',
      'WEB_CONTEXT:',
      formatWebNotes(memory.webNotes),
    ].join('\n'),
  );
}

/** Every string field of a reply, joined, for the link/markup check. */
export function joinedStrings(values: readonly string[]): string {
  return values.join('\n');
}
