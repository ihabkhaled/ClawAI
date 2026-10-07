import { decode, encode } from '@toon-format/toon';
import { InternalServerErrorException } from '@nestjs/common';
import { isDeepStrictEqual } from 'node:util';

/**
 * The only place the TOON library is imported (rule 13 wrapper). Canonical JSON stays the
 * source of truth; TOON is a derived export that must decode back to exactly the
 * same value, so a lossy encode is refused rather than shipped.
 */
export function encodeVerifiedToon(value: unknown): string {
  const text = encode(value);
  if (!isDeepStrictEqual(decode(text), JSON.parse(JSON.stringify(value)))) {
    throw new InternalServerErrorException('TOON export is unavailable for this publication');
  }
  return text;
}

export function decodeToon(text: string): unknown {
  return decode(text);
}
