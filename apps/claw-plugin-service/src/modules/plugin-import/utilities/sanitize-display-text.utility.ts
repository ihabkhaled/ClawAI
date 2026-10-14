import { WHITESPACE_RUN } from '../constants/plugin-import.constants';
import { stripControlAndInvisible } from './character-classes.utility';

/**
 * Text from a manifest, made safe to show: NFC, control and bidi-override characters removed
 * (RTL letters and emoji stay), whitespace collapsed, cut by CODE POINTS so an emoji is never split.
 */
export function sanitizeDisplayText(value: unknown, maxCodePoints: number): string {
  if (typeof value !== 'string') return '';
  const cleaned = stripControlAndInvisible(value.normalize('NFC'))
    .replaceAll(WHITESPACE_RUN, ' ')
    .trim();
  const points = [...cleaned];
  return points.length <= maxCodePoints
    ? cleaned
    : `${points.slice(0, maxCodePoints - 1).join('')}…`;
}

/** Key used to detect two components or plugins with the same name. */
export function nameKey(value: string): string {
  return value.normalize('NFKC').toLowerCase();
}
