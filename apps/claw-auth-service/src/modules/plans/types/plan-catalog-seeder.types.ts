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
}
