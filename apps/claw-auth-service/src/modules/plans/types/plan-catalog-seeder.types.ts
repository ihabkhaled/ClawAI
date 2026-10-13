// Ambient typing for the plain-CommonJS plan-catalog seeder
// (prisma/seeders/plan-catalog.seeder.cjs). It ships with no TypeScript types
// of its own — it runs under bare `node` in the production image, where the
// TypeScript sources are not shipped. `plan-catalog.spec.ts` dynamically
// imports it to exercise its real pricing function against a real
// PlanCatalog fixture rather than a duplicated copy of the formula; this
// declaration lets that import type-check without an `any`-typed module or a
// suppressed finding.
declare module '*/plan-catalog.seeder.cjs' {
  export function computeDiscountedIntervalMinor(monthlyMinor: number, months: number): number;
  /** The slice of the Prisma client the seeder's run() touches; a spec passes an in-memory fake. */
  export type PlanSeederDb = {
    plan: {
      findUnique(args: { where: { slug: string } }): Promise<Record<string, unknown> | null>;
      create(args: { data: Record<string, unknown> }): Promise<{ id: string }>;
      update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<unknown>;
    };
    planPriceVersion: {
      findUnique(args: { where: { activeKey: string } }): Promise<unknown>;
      create(args: { data: Record<string, unknown> }): Promise<unknown>;
    };
    planFeatureRule: { upsert(args: Record<string, unknown>): Promise<unknown> };
    userPlanAssignment: { updateMany(args: Record<string, unknown>): Promise<{ count: number }> };
  };

  export function run(
    prisma: PlanSeederDb,
  ): Promise<{ created: string[]; upgraded: string[]; preserved: string[] }>;

  /** A plan's `media` block in plan-catalog.json (ADR-122). */
  export type PlanCatalogMediaBlock = {
    imageGeneration?: boolean;
    helperVision?: boolean;
    textToSpeech?: boolean;
    maxVideoSeconds?: number | null;
  };

  /** The Plan columns the media block projects to; a missing block is the free default. */
  export type PlanMediaColumns = {
    allowImageGeneration: boolean;
    allowHelperVision: boolean;
    allowTextToSpeech: boolean;
    maxVideoSeconds: number | null;
  };

  export function mediaGateProjections(media: PlanCatalogMediaBlock | undefined): PlanMediaColumns;

  /** A plan's `plugins` block in plan-catalog.json. */
  export type PlanCatalogPluginsBlock = {
    enabled?: boolean;
    maxInstalled?: number | null;
    maxUserMcpServers?: number | null;
    maxCallsPerDay?: number | null;
  };

  /** The Plan columns the plugins block projects to; a missing block is on with the Free caps. */
  export type PlanPluginColumns = {
    allowPlugins: boolean;
    maxInstalledPlugins: number | null;
    maxUserMcpServers: number | null;
    maxPluginCallsPerDay: number | null;
  };

  export function pluginGateProjections(
    plugins: PlanCatalogPluginsBlock | undefined,
  ): PlanPluginColumns;

  /** The Plan column the free credit-connector allowance projects to (ADR-142). */
  export type PlanCreditAllowanceColumn = {
    creditConnectorFreeRequestsPerMonth: number | null;
    creditConnectorFreeBudgetMicroUsd: number | null;
    creditConnectorFreeMaxModelOutputMicroUsd: number | null;
  };

  export function creditAllowanceProjection(definition: {
    creditConnectorFreeRequestsPerMonth?: number | null;
    creditConnectorFreeBudgetMicroUsd?: number | null;
    creditConnectorFreeMaxModelOutputMicroUsd?: number | null;
  }): PlanCreditAllowanceColumn;
}
