import {
  FORMULA_TRIGGER,
  PLAIN_NUMBER_FRACTION,
  PLAIN_NUMBER_INTEGER,
} from '../constants/document-render.constants';

/**
 * A CSV cell that a spreadsheet will show as text, never run as a formula.
 * `=HYPERLINK(...)`, `+cmd|...`, `@SUM(...)` in a model's answer would
 * otherwise execute when the user opens the file (CSV injection). A plain
 * number such as "-5" or "+" alone is left as it is.
 */
export function csvSafeCell(value: string): string {
  return FORMULA_TRIGGER.test(value) && !isPlainNumberText(value) ? `'${value}` : value;
}

/** Whether a cell should be written as a number rather than text. */
export function isPlainNumber(value: string): boolean {
  return isPlainNumberText(value.trim());
}

/** "-12.5" style text: the integer part and the optional fraction are matched separately. */
function isPlainNumberText(value: string): boolean {
  const [integer = '', fraction, ...rest] = value.split('.');
  const integerOk = rest.length === 0 && PLAIN_NUMBER_INTEGER.test(integer);
  return integerOk && (fraction === undefined || PLAIN_NUMBER_FRACTION.test(fraction));
}
