const BOARD_LIST_URL_KEY = 'thread-board:list-url';
const BOARD_PATH = '/board';
const LOCALE_PREFIX_PATTERN = /^[a-z]{2}$/;

/** `/board`, optionally locale-prefixed (`/en/board`), with an optional query string. */
function isBoardListUrl(url: string): boolean {
  const [path = '', ...rest] = url.split('?');
  if (rest.length > 0 && url.includes('#')) {
    return false;
  }
  const segments = path.split('/');
  const [empty, first, second] = segments;
  if (empty !== '') {
    return false;
  }
  if (segments.length === 2) {
    return first === 'board';
  }
  return segments.length === 3 && LOCALE_PREFIX_PATTERN.test(first ?? '') && second === 'board';
}

/** Remembers the board URL (with its filters) so the reader's Back returns to the same view. */
export function rememberBoardListUrl(url: string): void {
  try {
    window.sessionStorage.setItem(BOARD_LIST_URL_KEY, url);
  } catch {
    // Storage can be blocked; Back then falls back to the plain Board.
  }
}

/** The remembered board URL, or null when the reader was not opened from the Board. */
export function readBoardListUrl(): string | null {
  try {
    const url = window.sessionStorage.getItem(BOARD_LIST_URL_KEY);
    return url !== null && isBoardListUrl(url) ? url : null;
  } catch {
    return null;
  }
}

/** The canonical public address of a Thread, never the in-app reader. */
export function threadPublicPath(slug: string): string {
  return `/threads/${encodeURIComponent(slug)}`;
}

export function boardReaderPath(slug: string): string {
  return `${BOARD_PATH}/${encodeURIComponent(slug)}`;
}

/** The slug at the end of a public Thread address, or null when the address is not one. */
export function slugFromThreadUrl(url: string): string | null {
  let pathname: string;
  try {
    pathname = new URL(url, 'http://localhost').pathname;
  } catch {
    return null;
  }
  const segments = pathname.split('/').filter((segment) => segment !== '');
  const raw = segments.length === 2 && segments[0] === 'threads' ? segments[1] : undefined;
  if (!raw) {
    return null;
  }
  try {
    return decodeURIComponent(raw);
  } catch {
    return null;
  }
}
