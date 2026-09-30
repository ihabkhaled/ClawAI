/** `1.148.7` → `[1, 148, 7]`; null for anything that is not dotted numbers. */
function parseVersion(version: string): number[] | null {
  const core = version.trim().split(/[-+]/)[0] ?? '';
  const parts = core.split('.');
  if (parts.length === 0 || parts.some((part) => !/^\d+$/.test(part))) {
    return null;
  }
  return parts.map(Number);
}

/**
 * Whether `deployed` is a later release than `running`.
 *
 * Equal or older is not an update: a page that is already on the deployed
 * version (it was just reloaded) must not be told a new one exists. Anything
 * unparseable is treated as "not newer" — a wrong banner is worse than none.
 */
export function isNewerVersion(deployed: string, running: string): boolean {
  const next = parseVersion(deployed);
  const current = parseVersion(running);
  if (next === null || current === null) {
    return false;
  }
  const length = Math.max(next.length, current.length);
  for (let index = 0; index < length; index += 1) {
    const a = next[index] ?? 0;
    const b = current[index] ?? 0;
    if (a !== b) {
      return a > b;
    }
  }
  return false;
}
