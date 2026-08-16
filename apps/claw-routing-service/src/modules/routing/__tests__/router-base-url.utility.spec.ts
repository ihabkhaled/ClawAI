import { RouterProvider } from '../../../generated/prisma';
import {
  normalizeOllamaCloudBaseUrl,
  resolveProviderBaseUrl,
} from '../utilities/router-base-url.utility';

describe('resolveProviderBaseUrl', () => {
  // baseUrl is optional on the connector DTO and connector-service defaults it
  // only inside its own private adapters, so `{apiKey, baseUrl: undefined}` is
  // a valid connector. Treating that as unusable reported AUTHENTICATION_FAILED
  // — provider-scoped AND quarantining — and killed the whole chain.
  it.each([
    [RouterProvider.GEMINI, 'https://generativelanguage.googleapis.com/v1beta/openai'],
    [RouterProvider.OLLAMA_CLOUD, 'https://ollama.com/api'],
  ])('defaults %s when the connector stores no base url', (provider, expected) => {
    expect(resolveProviderBaseUrl(provider, null)).toBe(expected);
    expect(resolveProviderBaseUrl(provider, '   ')).toBe(expected);
  });

  it('prefers an explicitly configured base url', () => {
    expect(resolveProviderBaseUrl(RouterProvider.GEMINI, 'https://proxy.internal/v1')).toBe(
      'https://proxy.internal/v1',
    );
  });

  it('trims a trailing slash so path concatenation cannot double up', () => {
    expect(resolveProviderBaseUrl(RouterProvider.GEMINI, 'https://x.test/v1///')).toBe(
      'https://x.test/v1',
    );
  });

  it('returns null for a provider with no default and no configuration', () => {
    expect(resolveProviderBaseUrl(RouterProvider.ANTHROPIC, null)).toBeNull();
  });
});

describe('normalizeOllamaCloudBaseUrl', () => {
  // connector-service rewrites these ONLY inside its own adapter; the config
  // endpoint returns the raw stored value. Without mirroring it, the cloud API
  // key is POSTed at the local runtime on a path it does not serve.
  it.each(['http://localhost:11434', 'http://127.0.0.1:11434', 'http://0.0.0.0:11434'])(
    'rewrites the local runtime address %s to the cloud endpoint',
    (configured) => {
      expect(normalizeOllamaCloudBaseUrl(configured)).toBe('https://ollama.com/api');
    },
  );

  it('defaults an empty value to the cloud endpoint', () => {
    expect(normalizeOllamaCloudBaseUrl(null)).toBe('https://ollama.com/api');
    expect(normalizeOllamaCloudBaseUrl('  ')).toBe('https://ollama.com/api');
  });

  it('appends the api path when ollama.com is stored bare', () => {
    expect(normalizeOllamaCloudBaseUrl('https://ollama.com')).toBe('https://ollama.com/api');
  });

  it('converts an openai-style /v1 suffix to /api', () => {
    expect(normalizeOllamaCloudBaseUrl('https://ollama.com/v1')).toBe('https://ollama.com/api');
  });

  it('leaves a correct cloud url alone', () => {
    expect(normalizeOllamaCloudBaseUrl('https://ollama.com/api')).toBe('https://ollama.com/api');
  });

  it('leaves an unrelated private host alone', () => {
    expect(normalizeOllamaCloudBaseUrl('https://ollama.corp.internal/api')).toBe(
      'https://ollama.corp.internal/api',
    );
  });
});
