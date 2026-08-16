import type {
  RoutingLabCaseCategory,
  RoutingLabConfigurationVariant,
  RoutingLabPromptLengthBucket,
} from '../../../../common/enums';
import type { DomainTag, PrivacyClass } from '../../../../generated/prisma';
import type { RoutingLabFaultPlan } from './routing-lab-fault-plan.types';

/**
 * One request the lab replays through a real `CloudRouterManager`.
 *
 * Every field the manifest can break results down by lives here: which
 * config the case decides against, what may respond and how, and what the
 * request itself looked like. `id` is stable and human-greppable so a
 * regression can be chased straight to the constant that defines it.
 */
export interface RoutingLabCase {
  readonly id: string;
  readonly category: RoutingLabCaseCategory;
  readonly description: string;
  readonly configurationVariant: RoutingLabConfigurationVariant;
  readonly privacyClass: PrivacyClass;
  readonly domain: DomainTag;
  readonly lengthBucket: RoutingLabPromptLengthBucket;
  readonly prompt: string;
  readonly eligibleDeploymentIds: readonly string[];
  readonly faultPlan: RoutingLabFaultPlan;
}
