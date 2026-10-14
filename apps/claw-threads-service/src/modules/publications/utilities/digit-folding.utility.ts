import { DIGIT_ZERO_BLOCKS } from '../constants/digit-folding.constants';

/**
 * Arabic-Indic, Persian, Devanagari, Bengali, Tamil, Thai, full-width and other decimal digits
 * become 0-9. The text keeps its length (one code point in, one out for BMP digits).
 */
export function foldDigits(text: string): string {
  return text.replaceAll(/\p{Nd}/gu, (digit) => {
    const code = digit.codePointAt(0) ?? 0;
    const zero = DIGIT_ZERO_BLOCKS.find((block) => code >= block && code <= block + 9);
    return zero === undefined ? digit : String(code - zero);
  });
}
