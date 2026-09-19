import {
  OLLAMA_CLOUD_DEFAULT_BASE_URL,
  OLLAMA_LOCAL_HOSTS,
} from '../constants/research-gate.constants';

/**
 * The hosted Ollama API base for a connector's stored base URL.
 *
 * The connector row keeps whatever the admin saved, and the UI default is the
 * local runtime (`http://localhost:11434`). Sending the cloud key there would
 * miss the cloud entirely, so a local or empty URL means ollama.com. A bare
 * `https://ollama.com` or an OpenAI-style `/v1` URL is mapped to `/api`, the
 * native path `/chat` hangs off.
 */
export function resolveOllamaCloudBaseUrl(stored: string | null | undefined): string {
  const trimmed = (stored ?? '').trim().replace(/\/+$/u, '');
  if (trimmed.length === 0 || OLLAMA_LOCAL_HOSTS.some((host) => trimmed.includes(host))) {
    return OLLAMA_CLOUD_DEFAULT_BASE_URL;
  }
  if (trimmed.endsWith('/api')) {
    return trimmed;
  }
  if (trimmed.endsWith('/v1')) {
    return trimmed.replace(/\/v1$/u, '/api');
  }
  return `${trimmed}/api`;
}
