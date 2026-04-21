import type { DomainPolicyOutcome } from '../enums/domain-policy-outcome.enum';

export type DomainPolicyResult = {
  outcome: DomainPolicyOutcome;
  reason?: string;
  host?: string;
};
