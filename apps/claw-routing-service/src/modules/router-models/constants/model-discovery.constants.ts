import { RouterProvider } from '../../../generated/prisma';

/** Path-style prefixes providers put in front of a model id. Decoration only —
 * stripping one never changes which model is meant. */
export const MODEL_ID_PATH_PREFIXES: readonly string[] = ['models/', 'model/'];

/** connector-service endpoint returning its active model catalogue. */
export const CONNECTOR_MODELS_SNAPSHOT_PATH = '/api/v1/internal/connectors/models-snapshot';

export const DISCOVERY_TIMEOUT_MS = 15_000;

/** Rows created by discovery, distinguishable from a seeded or admin-edited row. */
export const DISCOVERY_METADATA_SOURCE = 'connector-discovery';

/**
 * connector-service reports one OLLAMA connector whose base URL it rewrites to
 * ollama.com, so its models are cloud endpoints. Routing keeps the two
 * identities apart, and this is the one place the upstream name is translated.
 */
export const CONNECTOR_PROVIDER_TO_ROUTER_PROVIDER: Readonly<Record<string, RouterProvider>> =
  Object.freeze({
    OPENAI: RouterProvider.OPENAI,
    ANTHROPIC: RouterProvider.ANTHROPIC,
    GEMINI: RouterProvider.GEMINI,
    DEEPSEEK: RouterProvider.DEEPSEEK,
    GROK: RouterProvider.GROK,
    AWS_BEDROCK: RouterProvider.AWS_BEDROCK,
    BEDROCK: RouterProvider.AWS_BEDROCK,
    OLLAMA: RouterProvider.OLLAMA_CLOUD,
    LLAMACPP: RouterProvider.LLAMACPP,
  });

/** Provider whose catalogue is hosted-only, so a cloud marker is decoration. */
export const OLLAMA_CLOUD_PROVIDER: string = RouterProvider.OLLAMA_CLOUD;

/**
 * Cloud markers written on hosted Ollama model ids. connector-service lists the
 * hosted catalogue bare (`gpt-oss:120b`) while the pack's chain writes it
 * decorated (`gpt-oss:120b-cloud`); both name the same endpoint.
 */
export const OLLAMA_CLOUD_SUFFIXES: readonly string[] = ['-cloud', ':cloud'];
