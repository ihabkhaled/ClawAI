export type PendingPlanRetirementMigration = {
  id: string;
  userId: string;
  sourcePlanId: string;
  replacementPlanId: string;
  replacementPlanSlug: string;
  sourceSubscriptionId: string;
};
