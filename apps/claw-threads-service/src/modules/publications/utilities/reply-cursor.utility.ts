import { BadRequestException } from '@nestjs/common';

import { REPLY_CURSOR_SCHEMA } from '../constants/publication-comments.constants';
import type { ReplyCursor } from '../types/publication-comments.types';

/** Opaque position after a reply: replies are ordered by (createdAt, id) ascending. */
export function encodeReplyCursor(reply: { createdAt: Date; id: string }): string {
  return Buffer.from(JSON.stringify({ t: reply.createdAt.toISOString(), i: reply.id })).toString(
    'base64url',
  );
}

/** A malformed or tampered cursor is a 400, never a database error. */
export function decodeReplyCursor(cursor: string): ReplyCursor {
  try {
    const parsed = REPLY_CURSOR_SCHEMA.parse(
      JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')),
    );
    return { createdAt: new Date(parsed.t), id: parsed.i };
  } catch {
    throw new BadRequestException('Invalid replies cursor');
  }
}
