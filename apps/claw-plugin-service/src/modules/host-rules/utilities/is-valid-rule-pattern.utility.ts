import { SLUG_PATTERN } from '../../catalog/constants/catalog.constants';
import { containsHostileText } from '../../catalog/utilities/contains-hostile-text.utility';
import { isValidHostname } from '../../catalog/utilities/is-valid-hostname.utility';
import { HostRuleMatch } from '../../../common/enums/host-rule-match.enum';

/** Whether a pattern is well formed for its match type. A host is a DNS name (a leading "*." is dropped). */
export function isValidRulePattern(match: HostRuleMatch, pattern: string): boolean {
  const lower = pattern.toLowerCase();
  if (match === HostRuleMatch.HOST) {
    return isValidHostname(lower.startsWith('*.') ? lower.slice(2) : lower);
  }
  return match === HostRuleMatch.SLUG
    ? SLUG_PATTERN.test(lower)
    : !containsHostileText(lower, false);
}
