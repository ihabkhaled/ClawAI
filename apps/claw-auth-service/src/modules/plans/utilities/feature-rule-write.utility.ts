import { type PlanFeatureKey, type Prisma } from '../../../generated/prisma';
import { type FeatureRuleValues } from '../types/feature-rule-values.types';

/**
 * The one statement that writes a plan feature rule. It takes the client as an
 * argument so a caller already inside a transaction (a plan write that must land
 * together with its rule) and a caller outside one run exactly the same upsert.
 */
export async function upsertFeatureRuleOn(
  client: Pick<Prisma.TransactionClient, 'planFeatureRule'>,
  planId: string,
  feature: PlanFeatureKey,
  rule: FeatureRuleValues,
): Promise<void> {
  await client.planFeatureRule.upsert({
    where: { planId_feature: { planId, feature } },
    update: rule,
    create: { planId, feature, ...rule },
  });
}
