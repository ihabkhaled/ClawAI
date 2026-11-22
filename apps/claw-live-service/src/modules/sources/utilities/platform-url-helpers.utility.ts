/** Non-empty path segments of a URL, decoded once (an undecodable segment stays as is). */
export function pathSegments(url: URL): string[] {
  return url.pathname
    .split('/')
    .filter((segment) => segment !== '')
    .map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return segment;
      }
    });
}

/** True when the URL's lower-cased host is one of `hosts`. */
export function hostIn(url: URL, hosts: ReadonlySet<string>): boolean {
  return hosts.has(url.hostname.toLowerCase());
}

/** The candidate when it is a string matching `pattern`, else null. */
export function matching(candidate: string | undefined, pattern: RegExp): string | null {
  return candidate !== undefined && pattern.test(candidate) ? candidate : null;
}
