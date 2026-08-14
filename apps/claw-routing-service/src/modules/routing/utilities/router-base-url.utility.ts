import {
  OLLAMA_CLOUD_API_BASE_URL,
  OLLAMA_CLOUD_HOSTNAME,
  OLLAMA_LOCALHOST_PATTERNS,
  PROVIDER_DEFAULT_BASE_URLS,
} from '../constants/router-adapter.constants';
import { recordGet } from '../../../common/utilities';

/**
 * Resolves the base URL for a provider, defaulting when the connector stores none.
 *
 * connector-service only defaults inside its own adapters, so the config payload
 * can legitimately carry `baseUrl: undefined` for a working connector. Without
 * this, a valid Gemini connector produced AUTHENTICATION_FAILED — provider-scoped
 * AND quarantining — and took the entire chain down.
 */
export function resolveProviderBaseUrl(provider: string, configured: string | null): string | null {
  const trimmed = configured?.trim();
  if (trimmed === undefined || trimmed.length === 0) {
    return recordGet(PROVIDER_DEFAULT_BASE_URLS, provider) ?? null;
  }
  return trimmed.replace(/\/+$/, '');
}

/**
 * Normalises a base URL for the hosted Ollama endpoint.
 *
 * Mirrors connector-service's OllamaAdapter.resolveBaseUrl, because the config
 * endpoint bypasses it: a connector row storing `http://localhost:11434` — the
 * value the admin UI offers as the OLLAMA default — would otherwise have the
 * cloud API key POSTed at the local runtime on the wrong path.
 */
export function normalizeOllamaCloudBaseUrl(configured: string | null): string {
  const trimmed = configured?.trim();
  if (trimmed === undefined || trimmed.length === 0) {
    return OLLAMA_CLOUD_API_BASE_URL;
  }

  const normalized = trimmed.replace(/\/+$/, '');
  if (OLLAMA_LOCALHOST_PATTERNS.some((pattern) => normalized.includes(pattern))) {
    return OLLAMA_CLOUD_API_BASE_URL;
  }

  let hostname = '';
  try {
    const withScheme = normalized.startsWith('http') ? normalized : `https://${normalized}`;
    hostname = new URL(withScheme).hostname;
  } catch {
    hostname = '';
  }

  if (hostname === OLLAMA_CLOUD_HOSTNAME || hostname.endsWith(`.${OLLAMA_CLOUD_HOSTNAME}`)) {
    if (normalized.endsWith('/api')) {
      return normalized;
    }
    if (normalized.endsWith('/v1')) {
      return normalized.replace(/\/v1$/, '/api');
    }
    return `${normalized}/api`;
  }

  return normalized;
}
