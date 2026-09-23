/**
 * The redirect statuses a download endpoint may answer with before handing
 * over the bytes. Microsoft Graph's `/content` answers 302 with a short-lived,
 * pre-authenticated CDN URL; the others are listed so a 301/303/307/308 from
 * the same endpoint takes the same checked path instead of failing oddly.
 */
export const DOWNLOAD_REDIRECT_STATUSES: ReadonlySet<number> = new Set([301, 302, 303, 307, 308]);

/** The only protocol a pre-authenticated download hop may use. */
export const DOWNLOAD_HOP_PROTOCOL = 'https:';
