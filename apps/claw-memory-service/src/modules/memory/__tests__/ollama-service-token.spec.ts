import { type Mock, vi } from 'vitest';

import { httpRequest } from '../../../common/utilities/http-client.utility';
import { resetCircuits } from '../../../common/utilities';
import { buildInterServiceAuthHeader } from '../../../common/utilities/inter-service-auth.utility';
import { MemoryExtractionManager } from '../managers/memory-extraction.manager';
import { MemorySensitivityManager } from '../managers/memory-sensitivity.manager';

vi.mock('../../../common/utilities/http-client.utility', () => ({ httpRequest: vi.fn() }));

vi.mock('../../../app/config/app.config', () => ({
  AppConfig: {
    get: (): Record<string, string> => ({
      OLLAMA_SERVICE_URL: 'http://ollama-service:4008',
      MEMORY_EXTRACTION_MODEL: 'AUTO',
      MEMORY_SENSITIVITY_MODEL: 'qwen3:1.7b',
      INTER_SERVICE_AUTH_TOKEN: 'inter-service-token-for-memory-spec',
    }),
  },
}));

const mockedHttpRequest = httpRequest as unknown as Mock;
const EXPECTED = 'Service inter-service-token-for-memory-spec';

type Call = { url: string; headers?: Record<string, string> };

// ADR-144: ollama-service refuses an anonymous generate / internal call with
// 401, so every memory-service hop to it must carry the inter-service token.
describe('memory-service → ollama-service carries the service token', () => {
  beforeEach(() => {
    mockedHttpRequest.mockReset();
    resetCircuits();
  });

  it('buildInterServiceAuthHeader uses the Service scheme', () => {
    expect(buildInterServiceAuthHeader()).toBe(EXPECTED);
  });

  it('extraction sends it on installed-models and generate', async () => {
    mockedHttpRequest
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: {
          models: [
            { name: 'qwen3', tag: '1.7b', roles: ['LOCAL_REASONING'], parameterCount: null },
          ],
        },
      })
      .mockResolvedValueOnce({ ok: true, status: 200, data: { response: '[]' } });

    await new MemoryExtractionManager().extract('hello', 'world');

    const calls = mockedHttpRequest.mock.calls.map((c) => c[0] as Call);
    expect(calls.map((c) => c.url)).toEqual([
      'http://ollama-service:4008/api/v1/internal/ollama/installed-models',
      'http://ollama-service:4008/api/v1/ollama/generate',
    ]);
    for (const call of calls) {
      expect(call.headers?.['Authorization']).toBe(EXPECTED);
    }
  });

  it('the sensitivity classifier sends it on generate', async () => {
    mockedHttpRequest.mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: { response: '{"verdict":"NORMAL","confidence":0.9,"reason":null}' },
    });

    await new MemorySensitivityManager().classifyWithOllama('a plain sentence about gardening');

    const call = mockedHttpRequest.mock.calls[0]?.[0] as Call;
    expect(call.url).toBe('http://ollama-service:4008/api/v1/ollama/generate');
    expect(call.headers?.['Authorization']).toBe(EXPECTED);
  });
});
