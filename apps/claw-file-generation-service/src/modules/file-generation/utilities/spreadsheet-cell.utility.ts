import { FORMULA_TRIGGER, PLAIN_NUMBER } from '../constants/document-render.constants';

/**
 * A CSV cell that a spreadsheet will show as text, never run as a formula.
 * `=HYPERLINK(...)`, `+cmd|...`, `@SUM(...)` in a model's answer would
 * otherwise execute when the user opens the file (CSV injection). A plain
 * number such as "-5" or "+" alone is left as it is.
 */
export function csvSafeCell(value: string): string {
  return FORMULA_TRIGGER.test(value) && !PLAIN_NUMBER.test(value) ? `'${value}` : value;
}

/** Whether a cell should be written as a number rather than text. */
export function isPlainNumber(value: string): boolean {
  return PLAIN_NUMBER.test(value.trim());
}
