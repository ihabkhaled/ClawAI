import type { RouterErrorCode, RoutingLabCaseCategory } from '../../../../common/enums';
import type { DomainTag, PrivacyClass } from '../../../../generated/prisma';

/**
 * What actually happened when one `RoutingLabCase` was replayed through
 * `CloudRouterManager.route()`. Carries only safe, structural facts — never
 * the prompt or provider payload — because outcomes are aggregated into a
 * markdown artifact that may be read outside the service.
 */
export interface RoutingLabCaseOutcome {
  readonly caseId: string;
  readonly category: RoutingLabCaseCategory;
  readonly description: string;
  readonly domain: DomainTag;
  readonly privacyClass: PrivacyClass;
  /** False for every `CloudRouteUnavailable` reason. */
  readonly available: boolean;
  /** `available && outcome.ok` — the one number that answers "did this route?". */
  readonly passed: boolean;
  /** `CloudRouteUnavailable.reason` when `available` is false, else null. */
  readonly unavailableReason: string | null;
  /** The coordinator's final `RouterErrorCode` when the chain was exhausted. */
  readonly finalErrorCode: RouterErrorCode | null;
  /** `RouterCoordinatorSuccess.fallbackDepth`; null for a decline. */
  readonly fallbackDepth: number | null;
  readonly attemptCount: number;
  /** Every attempt's code, in order; null entries are the successful attempt. */
  readonly attemptCodes: readonly (RouterErrorCode | null)[];
  readonly quarantinedDeploymentIds: readonly string[];
  readonly selectedDeploymentId: string | null;
}

export interface RoutingLabRunResult {
  readonly totalCases: number;
  readonly generatedAt: string;
  readonly outcomes: readonly RoutingLabCaseOutcome[];
}
