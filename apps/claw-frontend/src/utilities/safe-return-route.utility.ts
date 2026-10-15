import { ROUTES } from '@/constants';

/** Everything up to the second `#`: a return address carries its fragment exactly once. */
function keepOneFragment(route: string): string {
  const first = route.indexOf('#');
  if (first < 0) {
    return route;
  }
  const second = route.indexOf('#', first + 1);
  return second < 0 ? route : route.slice(0, second);
}

export function safeReturnRoute(value: string | null): string {
  if (
    value === null ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\') ||
    value.trim() !== value
  ) {
    return ROUTES.CHAT;
  }
  return keepOneFragment(value);
}

/** The `returnTo` for a guarded page: path, query and the fragment (once) the visitor deep-linked to. */
export function buildReturnTo(pathname: string, search: string, hash: string): string {
  const query = search.length > 0 ? `?${search}` : '';
  const fragment = hash.length > 1 && hash.startsWith('#') ? `#${hash.slice(1).split('#')[0]}` : '';
  return `${pathname}${query}${fragment}`;
}

/**
 * Where to go after sign-in. The browser keeps the fragment of the page that sent the visitor to
 * the form, so when `returnTo` lost its own fragment on the way, the page's one is restored.
 */
export function resolveLoginReturn(value: string | null, pageHash: string): string {
  const route = safeReturnRoute(value);
  if (value === null || route.includes('#') || pageHash.length < 2 || !pageHash.startsWith('#')) {
    return route;
  }
  return `${route}#${pageHash.slice(1).split('#')[0]}`;
}
