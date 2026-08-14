import { DeploymentType, RouterProvider } from '../../../generated/prisma';

/// Identity of the backfill that gives every existing registry definition a
/// deployment row. Bumping the version re-runs the seed; changing the payload
/// without bumping it is a checksum mismatch, not a silent overwrite.
export const DEPLOYMENT_SEED_NAME = 'router-model-deployments-backfill';
export const DEPLOYMENT_SEED_VERSION = 1;

/// Distinct from payment-service's 740_018_001 so the two advisory locks can
/// never collide if both services ever share a database.
export const DEPLOYMENT_SEED_LOCK_ID = 740_040_001;

export const DEPLOYMENT_SEED_METADATA_SOURCE = 'deployment-backfill';

/// Composed when a definition has neither a connector nor a runtime to key on.
export const DEPLOYMENT_KEY_FALLBACK_SCOPE = 'default';

export const DEPLOYMENT_KEY_SEPARATOR = ':';

/// The registry stores `provider` as a free-form String whose allowed values
/// live only in a schema comment and in seed data. This is the one place that
/// translation happens; anything absent here is deliberately skipped rather
/// than guessed, so an unrecognised provider can never become routable.
export const REGISTRY_PROVIDER_TO_ROUTER_PROVIDER: Readonly<Record<string, RouterProvider>> =
  Object.freeze({
    OPENAI: RouterProvider.OPENAI,
    ANTHROPIC: RouterProvider.ANTHROPIC,
    GEMINI: RouterProvider.GEMINI,
    DEEPSEEK: RouterProvider.DEEPSEEK,
    GROK: RouterProvider.GROK,
    BEDROCK: RouterProvider.AWS_BEDROCK,
    AWS_BEDROCK: RouterProvider.AWS_BEDROCK,
    OLLAMA: RouterProvider.OLLAMA,
    LLAMACPP: RouterProvider.LLAMACPP,
  });

/// Local runtimes are LOCAL; everything else reached over a connector is a
/// cloud API. OLLAMA_CLOUD is never produced by the backfill: the registry has
/// no way to express it today, so promoting a local OLLAMA row to the cloud
/// would be an assumption about where data goes. Discovery creates those rows.
export const PROVIDER_DEFAULT_DEPLOYMENT_TYPE: Readonly<
  Partial<Record<RouterProvider, DeploymentType>>
> = Object.freeze({
  [RouterProvider.OLLAMA]: DeploymentType.LOCAL,
  [RouterProvider.LLAMACPP]: DeploymentType.LOCAL,
});
