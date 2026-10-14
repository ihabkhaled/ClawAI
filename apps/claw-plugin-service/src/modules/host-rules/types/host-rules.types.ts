import type { HostRuleKind } from '../../../common/enums/host-rule-kind.enum';
import type { HostRuleMatch } from '../../../common/enums/host-rule-match.enum';

export type HostRuleRecord = {
  id: string;
  kind: HostRuleKind;
  match: HostRuleMatch;
  pattern: string;
  note: string | null;
  createdBy: string;
  createdAt: Date;
};

/** What a rule check looks at. A field left out is not checked. */
export type RuleSubject = {
  host?: string;
  publisher?: string;
  slug?: string;
};

export type RuleVerdict =
  | { allowed: true }
  | { allowed: false; reason: 'DENIED_BY_RULE'; rule: HostRuleRecord }
  | { allowed: false; reason: 'NOT_IN_ALLOW_LIST'; match: HostRuleMatch };

export type NewHostRule = {
  kind: HostRuleKind;
  match: HostRuleMatch;
  pattern: string;
  note: string | null;
  createdBy: string;
};
