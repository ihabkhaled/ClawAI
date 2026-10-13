import { SEMVER_PATTERN } from '../constants/catalog.constants';

function parts(version: string): [number, number, number] {
  const match = SEMVER_PATTERN.exec(version);
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : [0, 0, 0];
}

/** Negative when left < right, zero when equal, positive when left > right. */
export function compareSemver(left: string, right: string): number {
  const [leftMajor, leftMinor, leftPatch] = parts(left);
  const [rightMajor, rightMinor, rightPatch] = parts(right);
  return leftMajor - rightMajor || leftMinor - rightMinor || leftPatch - rightPatch;
}
