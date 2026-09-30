/** Integer counts for one slice of the ledger. Never a cost: see UserUsageView. */
export type UsageTotals = {
  requests: number;
  weightedTokens: number;
  inputTokens: number;
  outputTokens: number;
};

export type UsageSurfaceLine = UsageTotals & { surface: string };
export type UsageModelLine = UsageTotals & { provider: string; model: string };
export type UsageMemberLine = UsageTotals & { userId: string };

export type UsageWindow = { from: Date; to: Date };

/** The optional ISO bounds a caller may send; both default. */
export type UsageWindowQuery = { from?: string | undefined; to?: string | undefined };

export type UsageBreakdownView = {
  from: string;
  to: string;
  totals: UsageTotals;
  bySurface: UsageSurfaceLine[];
  byModel: UsageModelLine[];
};

export type OrganizationUsageView = {
  organizationId: string;
  from: string;
  to: string;
  memberCount: number;
  totals: UsageTotals;
  byMember: UsageMemberLine[];
  byModel: UsageModelLine[];
};

/** One grouped ledger row as the repository returns it. */
export type UsageAggregateRow = {
  key: Record<string, string | null>;
  requests: number;
  weightedTokens: number;
  inputTokens: number;
  outputTokens: number;
};

export type OrganizationUsageScope = {
  organizationId: string;
  memberUserIds: string[];
};

/** The sums a Prisma groupBy returns for one attribution group. */
export type UsageGroupedSums = {
  _count: { _all: number };
  _sum: {
    weightedTokens: number | null;
    rawInputTokens: number | null;
    rawOutputTokens: number | null;
  };
};
