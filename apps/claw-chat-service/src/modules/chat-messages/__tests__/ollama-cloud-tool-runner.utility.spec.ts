import { BusinessException } from '../../../common/errors';
import {
  OLLAMA_CLOUD_TOOL_DEFINITIONS,
  executeOllamaCloudToolCall,
  truncateResult,
} from '../utilities/ollama-cloud-tool-runner.utility';
import { OLLAMA_TOOL_RESULT_MAX_CHARS } from '../constants/agentic-loop.constants';

jest.mock('../../../common/utilities', () => ({
  httpRequest: jest.fn(),
}));

const { httpRequest } = jest.requireMock('../../../common/utilities') as {
  httpRequest: jest.Mock;
};

describe('OllamaCloudToolRunner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exposes web_search + web_fetch JSON-schema definitions', () => {
    const names = OLLAMA_CLOUD_TOOL_DEFINITIONS.map((d) => d.function.name);
    expect(names).toEqual(['web_search', 'web_fetch']);
    const search = OLLAMA_CLOUD_TOOL_DEFINITIONS[0];
    expect(search?.function.parameters).toMatchObject({
      type: 'object',
      required: ['query'],
    });
  });

  it('executes a web_search call and returns the stringified result', async () => {
    httpRequest.mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: { results: [{ url: 'https://example.com', title: 'Example', content: 'snippet' }] },
    });
    const result = await executeOllamaCloudToolCall(
      {
        id: 'call-1',
        function: { name: 'web_search', arguments: { query: 'react server components' } },
      },
      { baseUrl: 'https://ollama.com/api', apiKey: 'test-key', timeoutMs: 5_000 },
    );
    expect(httpRequest).toHaveBeenCalledWith({
      url: 'https://ollama.com/api/web_search',
      method: 'POST',
      headers: { Authorization: 'Bearer test-key' },
      body: { query: 'react server components' },
      timeoutMs: 5_000,
    });
    expect(result).toContain('example.com');
    expect(result).toContain('"results"');
  });

  it('passes max_results through when provided', async () => {
    httpRequest.mockResolvedValueOnce({ ok: true, status: 200, data: { results: [] } });
    await executeOllamaCloudToolCall(
      {
        function: {
          name: 'web_search',
          arguments: { query: 'foo', max_results: 3 },
        },
      },
      { baseUrl: 'https://ollama.com/api', apiKey: 'k', timeoutMs: 5_000 },
    );
    const body = httpRequest.mock.calls[0][0].body as Record<string, unknown>;
    expect(body).toEqual({ query: 'foo', max_results: 3 });
  });

  it('executes a web_fetch call against the matching endpoint', async () => {
    httpRequest.mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: { url: 'https://example.com/page', text: 'Body content here' },
    });
    const result = await executeOllamaCloudToolCall(
      {
        function: { name: 'web_fetch', arguments: { url: 'https://example.com/page' } },
      },
      { baseUrl: 'https://ollama.com/api/', apiKey: 'k', timeoutMs: 5_000 },
    );
    expect(httpRequest.mock.calls[0][0].url).toBe('https://ollama.com/api/web_fetch');
    expect(result).toContain('Body content here');
  });

  it('throws BusinessException with OLLAMA_TOOL_CALL_FAILED on non-2xx', async () => {
    httpRequest.mockResolvedValueOnce({
      ok: false,
      status: 503,
      data: { error: 'upstream busy' },
    });
    await expect(
      executeOllamaCloudToolCall(
        { function: { name: 'web_search', arguments: { query: 'x' } } },
        { baseUrl: 'https://ollama.com/api', apiKey: 'k', timeoutMs: 5_000 },
      ),
    ).rejects.toMatchObject({
      code: 'OLLAMA_TOOL_CALL_FAILED',
    });
  });

  it('throws BusinessException for an unknown tool name', async () => {
    await expect(
      executeOllamaCloudToolCall(
        { function: { name: 'something_made_up', arguments: {} } },
        { baseUrl: 'https://ollama.com/api', apiKey: 'k', timeoutMs: 5_000 },
      ),
    ).rejects.toBeInstanceOf(BusinessException);
    expect(httpRequest).not.toHaveBeenCalled();
  });

  it('rejects web_search calls missing the required query argument', async () => {
    await expect(
      executeOllamaCloudToolCall(
        { function: { name: 'web_search', arguments: {} } },
        { baseUrl: 'https://ollama.com/api', apiKey: 'k', timeoutMs: 5_000 },
      ),
    ).rejects.toMatchObject({ code: 'OLLAMA_TOOL_CALL_FAILED' });
  });

  it('rejects web_fetch calls with a non-http URL', async () => {
    await expect(
      executeOllamaCloudToolCall(
        {
          function: {
            name: 'web_fetch',
            arguments: { url: 'file:///etc/passwd' },
          },
        },
        { baseUrl: 'https://ollama.com/api', apiKey: 'k', timeoutMs: 5_000 },
      ),
    ).rejects.toMatchObject({ code: 'OLLAMA_TOOL_CALL_FAILED' });
  });

  it('truncates a result longer than OLLAMA_TOOL_RESULT_MAX_CHARS', () => {
    const big = 'a'.repeat(OLLAMA_TOOL_RESULT_MAX_CHARS + 500);
    const truncated = truncateResult(big);
    expect(truncated.length).toBeGreaterThan(OLLAMA_TOOL_RESULT_MAX_CHARS);
    expect(truncated.length).toBeLessThan(OLLAMA_TOOL_RESULT_MAX_CHARS + 100);
    expect(truncated).toContain('[truncated:');
  });

  it('truncates the executeOllamaCloudToolCall return value when the upstream payload is huge', async () => {
    const big = 'b'.repeat(OLLAMA_TOOL_RESULT_MAX_CHARS + 5_000);
    httpRequest.mockResolvedValueOnce({ ok: true, status: 200, data: big });
    const result = await executeOllamaCloudToolCall(
      { function: { name: 'web_search', arguments: { query: 'x' } } },
      { baseUrl: 'https://ollama.com/api', apiKey: 'k', timeoutMs: 5_000 },
    );
    expect(result.startsWith('b')).toBe(true);
    expect(result).toContain('[truncated:');
  });
});
