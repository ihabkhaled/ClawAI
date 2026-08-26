// Postgres rejects a NUL byte in a text column with SQLSTATE 22021,
// "invalid byte sequence for encoding UTF8: 0x00". Built from a char code so
// no control byte is ever embedded in this source file.
export const NUL_BYTE = String.fromCharCode(0);
