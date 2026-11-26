import {
  LYRIC_QUERY_MAX_WORDS,
  LYRIC_SEARCH_WORDS,
  SUNG_LINE_MARK,
} from '../constants/processing.constants';
import type { TranscriptLine } from '../types/processing.types';

/** True when speech-to-text marked the line as sung. */
export function isSungLine(text: string): boolean {
  return text.trimStart().startsWith(SUNG_LINE_MARK);
}

/** The words of a line without the note signs. */
export function withoutSungMarks(text: string): string {
  return text.split(SUNG_LINE_MARK).join(' ').replaceAll(/\s+/gu, ' ').trim();
}

/**
 * A lyric search for the longest sung line of the window ("انا بموت ... كلمات"), or '' when nothing
 * was sung. Searching the lyric itself is what names the song and its artist (owner, 2026-11-26:
 * "انا بموت" from a Tamer Hosny song was reported as someone wanting to die).
 */
export function lyricResearchQuery(
  window: readonly TranscriptLine[],
  spokenLanguage: string | null,
): string {
  const sung = window
    .filter((line) => isSungLine(line.text))
    .map((line) => withoutSungMarks(line.text))
    .filter((words) => words !== '');
  if (sung.length === 0) return '';
  const longest = sung.reduce((best, words) => (words.length > best.length ? words : best));
  const words = longest.split(' ').slice(0, LYRIC_QUERY_MAX_WORDS).join(' ');
  const base = (spokenLanguage ?? '').toLowerCase().split('-')[0] ?? '';
  const lyricsWord = new Map(Object.entries(LYRIC_SEARCH_WORDS)).get(base) ?? 'lyrics';
  return `${words} ${lyricsWord}`;
}
