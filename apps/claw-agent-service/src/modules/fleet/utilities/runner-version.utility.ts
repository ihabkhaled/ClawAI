import {
  RUNNER_NUMERIC_IDENTIFIER_PATTERN,
  RUNNER_VERSION_PATTERN,
} from '../constants/runner-policy.constants';

import type { ParsedRunnerVersion } from '../types/runner-policy.types';

/**
 * Reads `1.92.0`, `v1.92.0`, `1.93.0-beta.1` and `1.92.0+build`; anything else
 * (two-part versions, words, empty) is null. Build metadata is ignored, as in
 * semver. Never throws: a caller treats null as "cannot compare".
 */
export function parseRunnerVersion(input: string): ParsedRunnerVersion | null {
  const match = RUNNER_VERSION_PATTERN.exec(input.trim());
  if (match === null) return null;
  const [, major, minor, patch, prerelease] = match;
  if (major === undefined || minor === undefined || patch === undefined) return null;
  return {
    major: Number(major),
    minor: Number(minor),
    patch: Number(patch),
    prerelease: prerelease === undefined ? [] : prerelease.split('.'),
  };
}

function compareOrdered(left: number | string, right: number | string): number {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

function compareIdentifiers(left: string, right: string): number {
  const leftNumeric = RUNNER_NUMERIC_IDENTIFIER_PATTERN.test(left);
  const rightNumeric = RUNNER_NUMERIC_IDENTIFIER_PATTERN.test(right);
  if (leftNumeric && rightNumeric) {
    const a = left.replace(/^0+(?=\d)/, '');
    const b = right.replace(/^0+(?=\d)/, '');
    return a.length !== b.length ? compareOrdered(a.length, b.length) : compareOrdered(a, b);
  }
  // A numeric identifier sorts below an alphanumeric one.
  if (leftNumeric) return -1;
  return rightNumeric ? 1 : compareOrdered(left, right);
}

function comparePrerelease(left: readonly string[], right: readonly string[]): number {
  // A release outranks any prerelease of the same core.
  if (left.length === 0 || right.length === 0) {
    return compareOrdered(left.length === 0 ? 1 : 0, right.length === 0 ? 1 : 0);
  }
  const shared = Math.min(left.length, right.length);
  for (let index = 0; index < shared; index += 1) {
    const result = compareIdentifiers(left.at(index) ?? '', right.at(index) ?? '');
    if (result !== 0) return result;
  }
  return compareOrdered(left.length, right.length);
}

/** Negative when `left` is older, 0 when equal, positive when newer. */
export function compareRunnerVersions(
  left: ParsedRunnerVersion,
  right: ParsedRunnerVersion,
): number {
  const core =
    compareOrdered(left.major, right.major) ||
    compareOrdered(left.minor, right.minor) ||
    compareOrdered(left.patch, right.patch);
  return core === 0 ? comparePrerelease(left.prerelease, right.prerelease) : core;
}
