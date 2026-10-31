export interface ParsedUserAgent {
  /** "Windows", "macOS", "Android 14" ... or null when the string does not say. */
  os: string | null;
  /** "Chrome 130", "Firefox 131", "curl 8" ... or null. */
  browser: string | null;
  /** DESKTOP | MOBILE | TABLET | TOOL | UNKNOWN. */
  deviceKind: string;
}
