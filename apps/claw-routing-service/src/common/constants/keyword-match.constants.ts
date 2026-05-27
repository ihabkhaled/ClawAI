// Module-level state for the keyword matcher. Kept here because the
// service-wide ESLint rule `no-restricted-syntax` bans top-level
// `const` declarations inside utility files (every const must live in
// a dedicated constants file). The WeakMap is a process-lifetime
// cache keyed by the source keyword array — each list compiles once.

export const KEYWORD_REGEX_CACHE: WeakMap<readonly string[], RegExp[]> = new WeakMap();
export const KEYWORD_WORD_CHAR_RE: RegExp = /\w/;
