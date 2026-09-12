// Which signal decided the visitor's country, in descending trust.
//
// Ordering matters: a signal ClawAI's own infrastructure produced outranks
// anything the client could have written, and a client hint is only ever
// consulted when every trusted route has failed.
export enum GeoCountrySource {
  // The user said so. Outranks every detection.
  USER_PREFERENCE = 'USER_PREFERENCE',
  // Anonymous visitor's own choice, from the first-party cookie.
  ANONYMOUS_PREFERENCE = 'ANONYMOUS_PREFERENCE',
  // Trusted edge header. Only consulted when the deployment is behind a CDN
  // that rewrites it AND the operator has switched it on.
  EDGE_HEADER = 'EDGE_HEADER',
  // Country.is, called with the address nginx itself observed.
  IP_LOOKUP = 'IP_LOOKUP',
  // Browser locale/timezone. A hint, not evidence: the client controls it.
  CLIENT_HINT = 'CLIENT_HINT',
  // Nothing resolved. USD.
  UNRESOLVED = 'UNRESOLVED',
}
