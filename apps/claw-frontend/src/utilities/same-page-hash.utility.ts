/**
 * The `#fragment` of `target` when it points into the page the reader is already on, else null.
 * Setting `location.hash` for that case fires a real `hashchange`; a router push does not.
 */
export function samePageHash(target: string, currentPathname: string): string | null {
  const hashAt = target.indexOf('#');
  if (hashAt < 0 || hashAt === target.length - 1) {
    return null;
  }
  const path = target.slice(0, hashAt).split('?')[0];
  return path === currentPathname ? target.slice(hashAt) : null;
}
