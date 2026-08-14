import { RouterErrorCode } from '../../../common/enums';
import { httpRequest } from '../../../common/utilities';
import { RouterProvider } from '../../../generated/prisma';
import { GeminiRouterAdapter } from '../adapters/gemini-router.adapter';
import { LegacyLocalRouterAdapter } from '../adapters/legacy-local-router.adapter';
import { OllamaCloudRouterAdapter } from '../adapters/ollama-cloud-router.adapter';
import { type ConnectorCredentialService } from '../services/connector-credential.service';
import type { RouterInferenceRequest } from '../types/router-inference.types';
import { extractProviderMessage } from '../utilities/router-adapter-response.utility';

jest.mock('../../../common/utilities', () => ({
  ...jest.requireActual('../../../common/utilities'),
  httpRequest: jest.fn(),
}));

jest.mock('../../../app/config/app.config', () => ({
  AppConfig: {
    get: (): Record<string, string> => ({
      CONNECTOR_SERVICE_URL: 'http://connector:4003',
      OLLAMA_SERVICE_URL: 'http://ollama:4008',
      OLLAMA_KEEP_ALIVE: '5m',
    }),
  },
}));

const httpRequestMock = jest.mocked(httpRequest);

const request = (overrides: Partial<RouterInferenceRequest> = {}): RouterInferenceRequest => ({
  traceId: 'trace-1',
  prompt: 'route this',
  providerModelId: 'gemini-2.5-flash',
  deploymentId: 'dep_a',
  timeoutMs: 1_600,
  ...overrides,
});

const credentialService = (credential: unknown): ConnectorCredentialService =>
  ({ resolve: jest.fn().mockResolvedValue(credential) }) as unknown as ConnectorCredentialService;

const GEMINI_CRED = {
  provider: 'GEMINI',
  apiKey: 'secret-key',
  baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
};

const OLLAMA_CRED = {
  provider: 'OLLAMA',
  apiKey: 'ollama-key',
  baseUrl: 'https://ollama.com/api',
};

beforeEach(() => {
  httpRequestMock.mockReset();
});

describe('GeminiRouterAdapter', () => {
  it('declares the provider it serves', () => {
    expect(new GeminiRouterAdapter(credentialService(GEMINI_CRED)).provider).toBe(
      RouterProvider.GEMINI,
    );
  });

  it('returns the model content on success', async () => {
    httpRequestMock.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        choices: [{ message: { content: '{"deploymentId":"dep_a"}' } }],
        usage: { prompt_tokens: 120, completion_tokens: 18 },
      },
    });

    const result = await new GeminiRouterAdapter(credentialService(GEMINI_CRED)).invoke(request());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.raw).toBe('{"deploymentId":"dep_a"}');
      expect(result.inputTokens).toBe(120);
      expect(result.outputTokens).toBe(18);
    }
  });

  it('asks for JSON at the protocol level rather than trusting the prompt', async () => {
    httpRequestMock.mockResolvedValue({
      ok: true,
      status: 200,
      data: { choices: [{ message: { content: '{}' } }] },
    });

    await new GeminiRouterAdapter(credentialService(GEMINI_CRED)).invoke(request());

    const body = httpRequestMock.mock.calls[0]?.[0]?.body as Record<string, unknown>;
    expect(body['response_format']).toEqual({ type: 'json_object' });
    expect(body['temperature']).toBe(0);
  });

  // Caught live, not by a mock: sending a NUMBER here returns
  // `400 Invalid value at 'reasoning_effort' (TYPE_STRING)` and fails every
  // call. A mock accepts any payload, so only a type assertion catches it.
  it('sends reasoning_effort as a string, which the API requires', async () => {
    httpRequestMock.mockResolvedValue({
      ok: true,
      status: 200,
      data: { choices: [{ message: { content: '{}' } }] },
    });

    await new GeminiRouterAdapter(credentialService(GEMINI_CRED)).invoke(request());

    const body = httpRequestMock.mock.calls[0]?.[0]?.body as Record<string, unknown>;
    expect(typeof body['reasoning_effort']).toBe('string');
    expect(['low', 'minimal']).toContain(body['reasoning_effort']);
  });

  it('sends the credential as a bearer token and never in the url', async () => {
    httpRequestMock.mockResolvedValue({
      ok: true,
      status: 200,
      data: { choices: [{ message: { content: '{}' } }] },
    });

    await new GeminiRouterAdapter(credentialService(GEMINI_CRED)).invoke(request());

    const call = httpRequestMock.mock.calls[0]?.[0] as {
      url: string;
      headers: Record<string, string>;
    };
    expect(call.headers['Authorization']).toBe('Bearer secret-key');
    expect(call.url).not.toContain('secret-key');
  });

  it('appends the repair hint to the prompt when one is supplied', async () => {
    httpRequestMock.mockResolvedValue({
      ok: true,
      status: 200,
      data: { choices: [{ message: { content: '{}' } }] },
    });

    await new GeminiRouterAdapter(credentialService(GEMINI_CRED)).invoke(
      request({ repairHint: 'STRICTER PLEASE' }),
    );

    const body = httpRequestMock.mock.calls[0]?.[0]?.body as {
      messages: Array<{ content: string }>;
    };
    expect(body.messages[0]?.content).toContain('route this');
    expect(body.messages[0]?.content).toContain('STRICTER PLEASE');
  });

  it('honours the coordinator-supplied timeout', async () => {
    httpRequestMock.mockResolvedValue({
      ok: true,
      status: 200,
      data: { choices: [{ message: { content: '{}' } }] },
    });

    await new GeminiRouterAdapter(credentialService(GEMINI_CRED)).invoke(
      request({ timeoutMs: 250 }),
    );

    // Never MORE than the budget. Credential resolution is a separate network
    // hop that happens inside the attempt, so its cost is deducted — an entry
    // must not overrun the walk's total deadline by the time it spent looking
    // up a key.
    const sent = httpRequestMock.mock.calls[0]?.[0]?.timeoutMs as number;
    expect(sent).toBeLessThanOrEqual(250);
    expect(sent).toBeGreaterThan(0);
  });

  it.each([
    [429, RouterErrorCode.RATE_LIMITED],
    [401, RouterErrorCode.AUTHENTICATION_FAILED],
    [403, RouterErrorCode.AUTHORIZATION_FAILED],
    [404, RouterErrorCode.MODEL_NOT_FOUND],
    [503, RouterErrorCode.PROVIDER_5XX],
  ])('maps HTTP %s to %s', async (status, expected) => {
    httpRequestMock.mockResolvedValue({
      ok: false,
      status,
      data: { error: { message: 'provider said no' } },
    });

    const result = await new GeminiRouterAdapter(credentialService(GEMINI_CRED)).invoke(request());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe(expected);
      expect(result.safeMessage).toBe('provider said no');
    }
  });

  it('maps a transport failure to NETWORK', async () => {
    httpRequestMock.mockRejectedValue(new Error('fetch failed'));

    const result = await new GeminiRouterAdapter(credentialService(GEMINI_CRED)).invoke(request());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe(RouterErrorCode.NETWORK);
    }
  });

  it('maps an aborted request to TIMEOUT', async () => {
    const abort = new Error('aborted');
    abort.name = 'AbortError';
    httpRequestMock.mockRejectedValue(abort);

    const result = await new GeminiRouterAdapter(credentialService(GEMINI_CRED)).invoke(request());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe(RouterErrorCode.TIMEOUT);
    }
  });

  // Retrying cannot conjure a key, and the coordinator must skip the provider
  // rather than spend the entry's retry budget on it.
  it('reports a missing connector as an auth failure without calling out', async () => {
    const result = await new GeminiRouterAdapter(credentialService(null)).invoke(request());

    expect(httpRequestMock).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe(RouterErrorCode.AUTHENTICATION_FAILED);
    }
  });

  it('treats an empty completion as malformed output', async () => {
    httpRequestMock.mockResolvedValue({
      ok: true,
      status: 200,
      data: { choices: [{ message: { content: '' } }] },
    });

    const result = await new GeminiRouterAdapter(credentialService(GEMINI_CRED)).invoke(request());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe(RouterErrorCode.MALFORMED_STRUCTURED_OUTPUT);
    }
  });
});

describe('OllamaCloudRouterAdapter', () => {
  it('serves OLLAMA_CLOUD, distinct from the local runtime', () => {
    expect(new OllamaCloudRouterAdapter(credentialService(OLLAMA_CRED)).provider).toBe(
      RouterProvider.OLLAMA_CLOUD,
    );
  });

  // connector-service still files this connector under OLLAMA; the split into a
  // separate cloud identity exists only in the routing registry.
  it('resolves its credential under the connector-service provider name', async () => {
    const credentials = credentialService(OLLAMA_CRED);
    httpRequestMock.mockResolvedValue({
      ok: true,
      status: 200,
      data: { message: { content: '{}' } },
    });

    await new OllamaCloudRouterAdapter(credentials).invoke(request());

    expect(credentials.resolve).toHaveBeenCalledWith(RouterProvider.OLLAMA);
  });

  it('forces JSON at the decoder and disables streaming', async () => {
    httpRequestMock.mockResolvedValue({
      ok: true,
      status: 200,
      data: { message: { content: '{}' } },
    });

    await new OllamaCloudRouterAdapter(credentialService(OLLAMA_CRED)).invoke(request());

    const body = httpRequestMock.mock.calls[0]?.[0]?.body as Record<string, unknown>;
    expect(body['format']).toBe('json');
    expect(body['stream']).toBe(false);
    expect(body['think']).toBe(false);
  });

  it('returns content and token counts from the native shape', async () => {
    httpRequestMock.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        message: { content: '{"deploymentId":"dep_c"}' },
        prompt_eval_count: 90,
        eval_count: 12,
      },
    });

    const result = await new OllamaCloudRouterAdapter(credentialService(OLLAMA_CRED)).invoke(
      request(),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.raw).toBe('{"deploymentId":"dep_c"}');
      expect(result.inputTokens).toBe(90);
      expect(result.outputTokens).toBe(12);
    }
  });

  it('reports null token counts rather than inventing them', async () => {
    httpRequestMock.mockResolvedValue({
      ok: true,
      status: 200,
      data: { message: { content: '{}' } },
    });

    const result = await new OllamaCloudRouterAdapter(credentialService(OLLAMA_CRED)).invoke(
      request(),
    );

    if (result.ok) {
      expect(result.inputTokens).toBeNull();
      expect(result.outputTokens).toBeNull();
    }
  });

  it('maps provider failures through the same taxonomy', async () => {
    httpRequestMock.mockResolvedValue({ ok: false, status: 429, data: { error: 'slow down' } });

    const result = await new OllamaCloudRouterAdapter(credentialService(OLLAMA_CRED)).invoke(
      request(),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe(RouterErrorCode.RATE_LIMITED);
    }
  });
});

describe('LegacyLocalRouterAdapter', () => {
  it('serves the local OLLAMA runtime', () => {
    expect(new LegacyLocalRouterAdapter().provider).toBe(RouterProvider.OLLAMA);
  });

  // The rollback path must not depend on a cloud connector existing.
  it('calls ollama-service without any connector credential', async () => {
    httpRequestMock.mockResolvedValue({ ok: true, status: 200, data: { response: '{}' } });

    await new LegacyLocalRouterAdapter().invoke(request({ providerModelId: 'qwen3:1.7b' }));

    const call = httpRequestMock.mock.calls[0]?.[0] as {
      url: string;
      headers?: Record<string, string>;
    };
    expect(call.url).toContain('http://ollama:4008');
    expect(call.headers?.['Authorization']).toBeUndefined();
  });

  it('reads the generate proxy response shape', async () => {
    httpRequestMock.mockResolvedValue({
      ok: true,
      status: 200,
      data: { response: '{"deploymentId":"dep_local"}', prompt_eval_count: 40, eval_count: 8 },
    });

    const result = await new LegacyLocalRouterAdapter().invoke(request());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.raw).toBe('{"deploymentId":"dep_local"}');
      expect(result.inputTokens).toBe(40);
    }
  });

  it('maps a local outage to the same canonical codes', async () => {
    httpRequestMock.mockResolvedValue({ ok: false, status: 500, data: {} });

    const result = await new LegacyLocalRouterAdapter().invoke(request());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe(RouterErrorCode.PROVIDER_5XX);
    }
  });
});

describe('extractProviderMessage', () => {
  it.each([
    ['nested error object', { error: { message: 'nested' } }, 'nested'],
    ['string error', { error: 'flat' }, 'flat'],
    ['top-level message', { message: 'top' }, 'top'],
    ['bare string body', 'plain text', 'plain text'],
  ])('reads %s', (_label, body, expected) => {
    expect(extractProviderMessage(body)).toBe(expected);
  });

  it('falls back when nothing readable is present', () => {
    expect(extractProviderMessage({})).toBe('provider returned an unreadable error');
    expect(extractProviderMessage(null)).toBe('provider returned an unreadable error');
  });

  // The message lands on an attempt record that reaches a trace event.
  it('truncates a very long provider message', () => {
    expect(extractProviderMessage({ message: 'x'.repeat(5_000) }).length).toBeLessThanOrEqual(200);
  });
});
