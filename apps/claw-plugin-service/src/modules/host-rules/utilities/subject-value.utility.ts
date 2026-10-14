import { HostRuleMatch } from '../../../common/enums/host-rule-match.enum';
import { type RuleSubject } from '../types/host-rules.types';

/** The part of a subject a rule of the given match type looks at. */
export function subjectValue(subject: RuleSubject, match: HostRuleMatch): string | undefined {
  switch (match) {
    case HostRuleMatch.HOST:
      return subject.host;
    case HostRuleMatch.PUBLISHER:
      return subject.publisher;
    case HostRuleMatch.SLUG:
      return subject.slug;
  }
}
