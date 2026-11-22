import { createHash } from 'node:crypto';

/** Lower-case hex sha256 of a UTF-8 string. */
export function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}
