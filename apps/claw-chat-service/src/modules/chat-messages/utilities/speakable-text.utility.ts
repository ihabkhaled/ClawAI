import { createHash } from 'node:crypto';

import {
  SPEECH_CONTENT_HASH_LENGTH,
  SPEECH_SENTENCE_END_PATTERN,
  SPEECH_TRUNCATION_MIN_SENTENCE_RATIO,
} from '../constants/speech.constants';
import type { SpeakableText, SpeechTextCap } from '../types/speech.types';

/**
 * Turns an assistant reply (Markdown) into what a voice should say
 * (multimodal batch 9). A voice reading "asterisk asterisk" or a 200-character
 * URL aloud is worse than silence, so:
 *  - fenced and indented code blocks are dropped (a paragraph break remains);
 *  - `[text](url)` becomes `text`, `![alt](url)` becomes `alt`;
 *  - a bare URL becomes its host (`https://docs.example.com/a/b` → `docs.example.com`);
 *  - inline code, emphasis, heading, list, quote and table markers go, the words stay;
 *  - HTML tags, footnote refs (`[^1]`) and citation markers (`[3]`) go;
 *  - whitespace collapses, keeping paragraph breaks.
 * Pure and deterministic — the content hash depends on it.
 */
export function toSpeakableText(markdown: string): string {
  const withoutCode = markdown
    .replaceAll(/\r\n?/g, '\n')
    .replaceAll(/^(```|~~~)[^\n]*\n[\s\S]*?(?:^\1[^\n]*$|(?![\s\S]))/gm, '\n\n')
    .replaceAll(/^(?: {4}|\t)[^\n]*$/gm, '');
  const withoutLinks = withoutCode
    .replaceAll(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replaceAll(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replaceAll(/<(https?:\/\/[^>\s]+)>/g, '$1')
    .replaceAll(/https?:\/\/([^\s/?#)\]>]+)[^\s)\]>]*?([.,;:!?]*)(?=\s|$|[)\]>])/g, '$1$2')
    .replaceAll(/\s*\[\^[^\]]+\]/g, '')
    .replaceAll(/\s*\[\d{1,3}\]/g, '')
    .replaceAll(/<\/?[a-z][^>]*>/gi, ' ');
  const withoutMarkers = withoutLinks
    .replaceAll(/^\s{0,3}#{1,6}\s+/gm, '')
    .replaceAll(/^\s{0,3}>\s?/gm, '')
    .replaceAll(/^\s*(?:[-*+]|\d{1,3}[.)])\s+/gm, '')
    .replaceAll(
      /^[ \t]*\|?[ \t]*:?-{3,}:?[ \t]*(?:\|[ \t]*:?-{3,}:?[ \t]*)*\|?[ \t]*(?:\n|$)/gm,
      '',
    )
    .replaceAll(/^[ \t]*(?:[-*_][ \t]*){3,}$/gm, '')
    .replaceAll(/^[ \t]*\|(.*?)\|?[ \t]*$/gm, '$1')
    .replaceAll(/[ \t]*\|[ \t]*/g, ', ')
    .replaceAll(/`([^`]*)`/g, '$1')
    .replaceAll(/(\*\*|__)(.+?)\1/g, '$2')
    .replaceAll(/(^|[^\w*])[*_]([^*_\n]+)[*_](?=[^\w*]|$)/g, '$1$2')
    .replaceAll(/~~(.+?)~~/g, '$1');
  return withoutMarkers
    .split(/\n{2,}/)
    .map((paragraph) =>
      paragraph
        .replaceAll(/^[,\s]+|[,\s]+$/g, '')
        .replaceAll(/\s+/g, ' ')
        .trim(),
    )
    .filter((paragraph) => paragraph.length > 0)
    .join('\n\n');
}

/** Characters as a voice provider bills them: code points, not UTF-16 units. */
export function speechCharacterCount(text: string): number {
  return [...text].length;
}

/**
 * Cuts `text` to at most `maxCharacters` code points, at the last sentence end
 * when one falls late enough, else at the last space, else hard. Never adds
 * words; says whether anything was dropped.
 */
export function capSpeakableText(text: string, maxCharacters: number): SpeechTextCap {
  const points = [...text];
  if (points.length <= maxCharacters) {
    return { text, truncated: false };
  }
  const window = points.slice(0, maxCharacters).join('');
  const sentenceEnd = lastSentenceEnd(window);
  if (sentenceEnd >= Math.floor(window.length * SPEECH_TRUNCATION_MIN_SENTENCE_RATIO)) {
    return { text: window.slice(0, sentenceEnd).trim(), truncated: true };
  }
  const lastSpace = window.search(/\s\S*$/);
  const cut = lastSpace > 0 ? window.slice(0, lastSpace) : window;
  return { text: cut.trim(), truncated: true };
}

/** The reply as it will be spoken: cleaned, capped, counted and hashed. */
export function prepareSpeakableText(markdown: string, maxCharacters: number): SpeakableText {
  const capped = capSpeakableText(toSpeakableText(markdown), maxCharacters);
  return {
    text: capped.text,
    characters: speechCharacterCount(capped.text),
    truncated: capped.truncated,
    contentHash: createHash('sha256')
      .update(capped.text, 'utf8')
      .digest('hex')
      .slice(0, SPEECH_CONTENT_HASH_LENGTH),
  };
}

/** Index just past the last sentence-ending mark, or -1. */
function lastSentenceEnd(window: string): number {
  let end = -1;
  for (const match of window.matchAll(SPEECH_SENTENCE_END_PATTERN)) {
    end = match.index + match[0].length;
  }
  return end;
}
