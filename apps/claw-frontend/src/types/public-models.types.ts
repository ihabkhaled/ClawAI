/**
 * One model, exactly as connector-service publishes it to the public surface.
 *
 * Mirrors `PublicCatalogModel` on the backend. There is deliberately no price
 * and no cost rate — rule 37 forbids a provider rate in any non-admin response,
 * and a marketing page is the least-admin surface there is.
 */
export type PublicCatalogModel = {
  modelKey: string;
  displayName: string;
  maxContextTokens: number | null;
  supportsStreaming: boolean;
  supportsTools: boolean;
  supportsVision: boolean;
  supportsAudio: boolean;
  supportsStructuredOutput: boolean;
  /** Coarse band (LOW…EXTRA_HIGH) or UNKNOWN. Never a rate. */
  usageTier: string;
};

export type PublicCatalogProvider = {
  /** The backend `ConnectorProvider` value, e.g. `GEMINI`. */
  provider: string;
  /** Human-facing name, e.g. "Google Gemini". */
  displayName: string;
  modelCount: number;
  models: readonly PublicCatalogModel[];
};

/**
 * The models this deployment can actually serve, grouped by provider.
 *
 * Built from connectors that are enabled and models an administrator has
 * exposed — the same predicate that fills the in-app model picker. That is what
 * makes it safe to publish: a page listing a model nobody can select would be a
 * lie, and the shared query is what keeps the two in step without anyone
 * remembering to.
 */
export type PublicModelCatalog = {
  providers: readonly PublicCatalogProvider[];
  totalModelCount: number;
  providerCount: number;
  generatedAt: string;
};
