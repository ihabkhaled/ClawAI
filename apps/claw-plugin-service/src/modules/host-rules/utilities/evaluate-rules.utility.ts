import { HostRuleKind } from '../../../common/enums/host-rule-kind.enum';
import { HostRuleMatch } from '../../../common/enums/host-rule-match.enum';
import { type HostRuleRecord, type RuleSubject, type RuleVerdict } from '../types/host-rules.types';
import { matchesRulePattern } from './match-rule-pattern.utility';
import { subjectValue } from './subject-value.utility';

/**
 * DENY always wins. When at least one ALLOW rule exists for a match type, that type becomes an
 * allow-list: a subject value not covered by any ALLOW rule of the type is refused. With no ALLOW
 * rule of a type, only the DENY rules apply to it.
 */
export function evaluateRules(rules: readonly HostRuleRecord[], subject: RuleSubject): RuleVerdict {
  for (const match of Object.values(HostRuleMatch)) {
    const value = subjectValue(subject, match);
    if (value === undefined) continue;
    const ofType = rules.filter((rule) => rule.match === match);
    const denied = ofType.find(
      (rule) => rule.kind === HostRuleKind.DENY && matchesRulePattern(match, value, rule.pattern),
    );
    if (denied !== undefined) return { allowed: false, reason: 'DENIED_BY_RULE', rule: denied };
    const allows = ofType.filter((rule) => rule.kind === HostRuleKind.ALLOW);
    if (
      allows.length > 0 &&
      !allows.some((rule) => matchesRulePattern(match, value, rule.pattern))
    ) {
      return { allowed: false, reason: 'NOT_IN_ALLOW_LIST', match };
    }
  }
  return { allowed: true };
}
