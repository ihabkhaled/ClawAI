/**
 * The only URL schemes a link in untrusted content may use.
 *
 * `mailto` and `tel` are here because chat messages legitimately contain them and
 * neither can execute script. Everything else — `javascript`, `vbscript`, `data`,
 * `file`, `blob`, and any future addition — is refused by omission.
 */
export const SAFE_URL_SCHEMES: ReadonlyArray<string> = ['http', 'https', 'mailto', 'tel'];

/** Highest code point treated as whitespace-or-control (U+0020 SPACE). */
export const MAX_UNSAFE_URL_CODE_POINT = 0x20;

/** DEL (U+007F) — a control character above the printable range. */
export const DEL_CODE_POINT = 0x7f;
