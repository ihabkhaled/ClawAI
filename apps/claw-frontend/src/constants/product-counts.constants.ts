import { ConnectorProvider, RoutingMode, WorkspaceProvider } from '@claw/shared-types';

/**
 * Every number the public site quotes about ClawAI's own capabilities.
 *
 * WHY THIS EXISTS
 * ---------------
 * These counts used to be prose. "Twelve workspace connectors" and "Five
 * routing modes" were written into `public-comparison-content/<locale>.constants.ts`
 * — thirteen copies of each — and both went stale the ordinary way: somebody
 * added Google Calendar and Outlook Calendar to `WorkspaceProvider`, shipped the
 * adapters, and had no reason to suspect that a comparison page in Thai
 * depended on the total. The site told visitors twelve while the product
 * offered fourteen, in every language at once.
 *
 * A count in prose is a fact with thirteen copies and no owner. A count derived
 * from the enum can only be wrong if the enum is wrong, and adding a connector
 * now updates all thirteen locales for free.
 *
 * HOW TO USE
 * ----------
 * Never write one of these numbers into a content string. Put a placeholder in
 * the sentence and substitute at render time:
 *
 *   '{connectorCount} workspace connectors'  ->  formatProductCounts(...)
 *
 * The placeholder survives translation; a digit does not survive a refactor.
 */

/**
 * Cloud providers with a working adapter AND synchronised models.
 *
 * `AWS_BEDROCK` is deliberately excluded: it is connector scaffolding whose
 * model synchronisation is not implemented, and `/supported-models` already
 * says so in as many words. Counting it would make the public site claim a
 * provider a user cannot actually select.
 */
const UNIMPLEMENTED_CLOUD_PROVIDERS: ReadonlySet<ConnectorProvider> = new Set([
  ConnectorProvider.AWS_BEDROCK,
]);

/** Providers that run on the operator's own hardware rather than a vendor API. */
const LOCAL_RUNTIME_PROVIDERS: ReadonlySet<ConnectorProvider> = new Set([
  ConnectorProvider.OLLAMA,
  ConnectorProvider.LLAMACPP,
]);

function countCloudProviders(): number {
  return Object.values(ConnectorProvider).filter(
    (provider) =>
      !UNIMPLEMENTED_CLOUD_PROVIDERS.has(provider) && !LOCAL_RUNTIME_PROVIDERS.has(provider),
  ).length;
}

export const PRODUCT_COUNTS = {
  /** Cloud providers a user can actually route to. Excludes Bedrock scaffolding. */
  cloudProviders: countCloudProviders(),
  /** Ollama and llama.cpp. */
  localRuntimes: LOCAL_RUNTIME_PROVIDERS.size,
  /** Every workspace connector with a shipped adapter. */
  connectors: Object.values(WorkspaceProvider).length,
  /**
   * Routing modes as the product presents them.
   *
   * All of them, including `MANUAL_MODEL`. The chat composer renders one option
   * per member via `ROUTING_MODE_LABELS`, so any smaller number describes a
   * product the visitor will not recognise when they sign up.
   */
  routingModes: Object.values(RoutingMode).length,
  /**
   * The advanced orchestration labs.
   *
   * Not derived from an enum because the nine are a *subset* of
   * `TokenLedgerContext` — the contexts mapping to `PaygSurface.ORCHESTRATION`
   * in chat-service's `PAYG_SURFACE_BY_TOKEN_CONTEXT`. That map lives in a
   * service the frontend cannot import, so this number is hand-copied, the same
   * way `INTEGRATION_FACTS` hand-copies workspace-service's connector registry.
   * The one guard against drift is on the chat-service side:
   * `payg-metering.utility.spec.ts`'s "the orchestration-lab count the public
   * site quotes" test pins the real map's ORCHESTRATION count to 9. If that
   * test's count changes, update this number to match.
   */
  orchestrationLabs: 9,
} as const;

/** Placeholder tokens a content string may use. Substituted by `formatProductCounts`. */
export const PRODUCT_COUNT_TOKENS = {
  cloudProviders: '{cloudProviderCount}',
  localRuntimes: '{localRuntimeCount}',
  connectors: '{connectorCount}',
  routingModes: '{routingModeCount}',
  orchestrationLabs: '{orchestrationLabCount}',
} as const;
