import { SEMVER_PATTERN } from '../../catalog/constants/catalog.constants';

/** 1.2.3 -> 1.2.4. A value that is not a plain semver falls back to the given first version. */
export function bumpPatchVersion(version: string, fallback: string): string {
  const match = SEMVER_PATTERN.exec(version);
  return match === null
    ? fallback
    : `${match[1] ?? '0'}.${match[2] ?? '0'}.${String(Number(match[3]) + 1)}`;
}
