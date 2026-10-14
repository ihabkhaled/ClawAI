import {
  BOARD_ARABIC_DIACRITICS,
  BOARD_ARABIC_FOLD_PATTERN,
  BOARD_ARABIC_FOLDS,
  BOARD_COMBINING_MARK,
  BOARD_CONTROL_OR_FORMAT,
  BOARD_LATIN_OR_CYRILLIC,
  BOARD_THAI_CHARACTER,
  BOARD_UNSPACED_RUN,
  BOARD_UNSPACED_WORD_SEGMENTERS,
} from '../constants/board-index.constants';

/**
 * Han, kana and Thai are written without spaces, which would make a whole run one search term. The run is
 * split into dictionary words so substrings like 免疫 inside 免疫系统 are real terms. The script, not the
 * article locale, picks the dictionary, so the index and any query agree whatever locale each was given.
 */
function segmentUnspacedRuns(text: string): string {
  return text.replaceAll(BOARD_UNSPACED_RUN, (run, offset: number, whole: string) => {
    const segmenter = BOARD_THAI_CHARACTER.test(run)
      ? BOARD_UNSPACED_WORD_SEGMENTERS.thai
      : BOARD_UNSPACED_WORD_SEGMENTERS.cjk;
    const words = Array.from(segmenter.segment(run), (part) => part.segment);
    const before = offset > 0 ? ' ' : '';
    const after = offset + run.length < whole.length ? ' ' : '';
    return `${before}${words.join(' ')}${after}`;
  });
}

function foldCharacter(character: string): string {
  return BOARD_LATIN_OR_CYRILLIC.test(character)
    ? character.normalize('NFKD').replaceAll(BOARD_COMBINING_MARK, '')
    : character.normalize('NFKC');
}

/**
 * One normaliser for both the index and the query so they always agree.
 * Accents are removed for Latin and Cyrillic only; Devanagari and Thai marks carry meaning and stay.
 * ja/zh/th runs are split into words (segmentUnspacedRuns).
 * Arabic-script text drops tashkeel and tatweel and folds alef, hamza, ya, ta marbuta (and Persian ya/kaf).
 */
export function normalizeSearchText(input: string): string {
  const folded = segmentUnspacedRuns(Array.from(input.normalize('NFC'), foldCharacter).join(''));
  return folded
    .replaceAll(BOARD_ARABIC_DIACRITICS, '')
    .replaceAll(
      BOARD_ARABIC_FOLD_PATTERN,
      (character) => BOARD_ARABIC_FOLDS.get(character) ?? character,
    )
    .replaceAll(BOARD_CONTROL_OR_FORMAT, ' ')
    .toLowerCase()
    .replaceAll(/\s+/gu, ' ')
    .trim();
}
