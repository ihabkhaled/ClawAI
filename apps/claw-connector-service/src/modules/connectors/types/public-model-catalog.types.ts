import { type ConnectorProvider } from '../../../generated/prisma';

/**
 * One model, as the PUBLIC marketing pages may describe it.
 *
 * What is absent matters as much as what is present. There is **no price and no
 * cost rate here, ever** — rule 37 forbids returning a provider rate in any
 * non-admin response, and a public page is the least-admin surface there is.
 * `usageTier` is a coarse band (LOW…EXTRA_HIGH) and is the most the public may
 * learn about relative cost.
 *
 * Nothing here identifies the connector either: a connector id, its status or
 * its base URL would tell a stranger about this deployment's configuration,
 * which is operational detail, not product information.
 */
export type PublicCatalogModel = {
  modelKey: string;
  displayName: string;
  /** Context window in tokens. Null when the provider does not publish one. */
  maxContextTokens: number | null;
  supportsStreaming: boolean;
  supportsTools: boolean;
  supportsVision: boolean;
  supportsAudio: boolean;
  supportsStructuredOutput: boolean;
  /** Coarse cost band. Never a rate. */
  usageTier: string;
};

/**
 * A provider and the models it actually offers on THIS deployment.
 *
 * The list is built from connectors that are enabled, from models that are
 * ACTIVE, EXPOSED and CHAT — the same predicate that decides what a signed-in
 * user can pick in the composer. That equivalence is the point: a public page
 * that advertises a model nobody can select is a lie, and one that omits a
 * model users have is a missed sale.
 */
export type PublicCatalogProvider = {
  provider: ConnectorProvider;
  /** Human-facing provider name, e.g. "OpenAI" rather than "OPENAI". */
  displayName: string;
  modelCount: number;
  models: PublicCatalogModel[];
};

export type PublicModelCatalog = {
  providers: PublicCatalogProvider[];
  /** Total across providers, so a page can headline it without re-summing. */
  totalModelCount: number;
  providerCount: number;
  /** When this snapshot was taken, for cache and freshness copy. */
  generatedAt: string;
};
