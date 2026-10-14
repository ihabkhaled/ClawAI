import { HostRuleMatch } from '../../../common/enums/host-rule-match.enum';

/** Rule patterns are compared lower case, without a trailing dot. */
export function normalizeRulePattern(match: HostRuleMatch, pattern: string): string {
  const lower = pattern.trim().toLowerCase();
  return match === HostRuleMatch.HOST ? lower.replace(/\.$/u, '') : lower;
}

/**
 * Whether a subject value falls under a rule pattern. HOST matches the host itself and every
 * subdomain (never a host that merely ends with the same letters); PUBLISHER and SLUG are exact.
 */
export function matchesRulePattern(match: HostRuleMatch, value: string, pattern: string): boolean {
  const subject = normalizeRulePattern(match, value);
  const wanted = normalizeRulePattern(match, pattern);
  return match !== HostRuleMatch.HOST
    ? subject === wanted
    : subject === wanted || subject.endsWith(`.${wanted}`);
}
