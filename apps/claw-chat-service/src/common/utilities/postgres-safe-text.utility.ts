import { NUL_BYTE } from '../constants/postgres-safe-text.constants';

// Postgres rejects a NUL byte in a text column with SQLSTATE 22021,
// "invalid byte sequence for encoding UTF8: 0x00". Prisma surfaces that as an
// unhandled PrismaClientKnownRequestError, so a single NUL anywhere in a chat
// message produced a bare 500 and killed the thread — the raw database error
// text reached the log, and the client got nothing it could act on.
//
// Any user or agent can hit this by pasting binary content or echoing a control
// character, so message text is normalised before it is ever persisted.
export function stripNulBytes(value: string): string {
  return value.includes(NUL_BYTE) ? value.split(NUL_BYTE).join('') : value;
}

export function containsNulByte(value: string): boolean {
  return value.includes(NUL_BYTE);
}
