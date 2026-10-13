import {
  BOARD_ARABIC_DIACRITICS,
  BOARD_ARABIC_FOLD_PATTERN,
  BOARD_ARABIC_FOLDS,
  BOARD_COMBINING_MARK,
  BOARD_CONTROL_OR_FORMAT,
  BOARD_LATIN_OR_CYRILLIC,
} from '../constants/board-index.constants';

function foldCharacter(character: string): string {
  return BOARD_LATIN_OR_CYRILLIC.test(character)
    ? character.normalize('NFKD').replaceAll(BOARD_COMBINING_MARK, '')
    : character.normalize('NFKC');
}

/**
 * One normaliser for both the index and the query so they always agree.
 * Accents are removed for Latin and Cyrillic only; Devanagari and Thai marks carry meaning and stay.
 * Arabic-script text drops tashkeel and tatweel and folds alef, hamza, ya, ta marbuta (and Persian ya/kaf).
 */
export function normalizeSearchText(input: string): string {
  const folded = Array.from(input.normalize('NFC'), foldCharacter).join('');
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
