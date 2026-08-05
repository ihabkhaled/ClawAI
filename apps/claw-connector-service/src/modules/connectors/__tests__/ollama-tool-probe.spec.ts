import { OllamaAdapter } from '../managers/adapters/ollama.adapter';
import {
  OLLAMA_TOOL_PROBE_FAILURE_NO_CALL,
  OLLAMA_TOOL_PROBE_FAILURE_REQUEST,
  OLLAMA_TOOL_PROBE_FAILURE_WRONG_TOOL,
  OLLAMA_TOOL_PROBE_ID,
  OLLAMA_TOOL_PROBE_TOOL,
} from '../constants/ollama-tool-probe.constants';
import type { ConnectorConfig } from '../managers/provider-adapter.interface';

jest.mock('../../../common/utilities/http.utility', () => ({
  httpGet: jest.fn(),
  httpGetText: jest.fn(),
  httpPost: jest.fn(),
}));

const { httpPost } = jest.requireMock('../../../common/utilities/http.utility') as {
  httpPost: jest.Mock;
};

// The behavioural probe is what turns an ADVERTISED claim into PROVEN. The
// curated family list is a guess; this is the only thing that actually watches
// a model emit a tool call. It must never report PROVEN on anything less.

const CONFIG: ConnectorConfig = {
  apiKey: 'k',
  baseUrl: 'https://ollama.com/api',
} as ConnectorConfig;

describe('OllamaAdapter.probeToolCapability', () => {
  let adapter: OllamaAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    httpPost.mockReset();
    adapter = new OllamaAdapter();
  });

  it('passes when the model emits the offered tool call', async () => {
    httpPost.mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: {
        message: {
          content: '',
          tool_calls: [{ function: { name: OLLAMA_TOOL_PROBE_TOOL.function.name } }],
        },
      },
    });

    const result = await adapter.probeToolCapability(CONFIG, 'qwen3-coder:480b-cloud');

    expect(result.passed).toBe(true);
    expect(result.probeId).toBe(OLLAMA_TOOL_PROBE_ID);
    expect(result.failureCode).toBeUndefined();
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('FAILS when the model answers in prose instead of calling', async () => {
    // This is the exact drift the whole feature exists to prevent: a model
    // whose family list says "tools" but which ignores the field. Catching it
    // here is the difference between a failed probe and a failed agent run.
    httpPost.mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: { message: { content: 'It is about 18 degrees in Paris.' } },
    });

    const result = await adapter.probeToolCapability(CONFIG, 'gemma3:4b');

    expect(result.passed).toBe(false);
    expect(result.failureCode).toBe(OLLAMA_TOOL_PROBE_FAILURE_NO_CALL);
  });

  it('FAILS when the model calls a tool that was never offered', async () => {
    // Worse than emitting nothing — it means tool names cannot be trusted for
    // dispatch, which is a safety property, not a quality one.
    httpPost.mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: { message: { tool_calls: [{ function: { name: 'delete_everything' } }] } },
    });

    const result = await adapter.probeToolCapability(CONFIG, 'some-model');

    expect(result.passed).toBe(false);
    expect(result.failureCode).toBe(OLLAMA_TOOL_PROBE_FAILURE_WRONG_TOOL);
  });

  it('FAILS rather than throwing when the request errors', async () => {
    // A probe that cannot complete is evidence, not an exception. Throwing
    // here would surface as a broken connector rather than an unproven model.
    httpPost.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const result = await adapter.probeToolCapability(CONFIG, 'unreachable');

    expect(result.passed).toBe(false);
    expect(result.failureCode).toBe(OLLAMA_TOOL_PROBE_FAILURE_REQUEST);
  });

  it('FAILS on a non-2xx response', async () => {
    httpPost.mockResolvedValueOnce({ ok: false, status: 404, data: {} });

    const result = await adapter.probeToolCapability(CONFIG, 'retired-model');

    expect(result.passed).toBe(false);
    expect(result.failureCode).toBe(OLLAMA_TOOL_PROBE_FAILURE_REQUEST);
  });

  it('sends a deterministic, bounded probe request', async () => {
    httpPost.mockResolvedValueOnce({ ok: true, status: 200, data: { message: {} } });

    await adapter.probeToolCapability(CONFIG, 'qwen3:8b');

    const body = httpPost.mock.calls[0][0].body as {
      model: string;
      stream: boolean;
      tools: unknown[];
      options: { temperature: number };
    };
    expect(body.model).toBe('qwen3:8b');
    // Sampling variance is noise for a yes/no mechanical check, and a long
    // completion is wasted spend on every probed model.
    expect(body.options.temperature).toBe(0);
    expect(body.stream).toBe(false);
    expect(body.tools).toHaveLength(1);
  });

  it('never leaks a raw provider body into the failure code', async () => {
    httpPost.mockResolvedValueOnce({
      ok: false,
      status: 500,
      data: { error: 'internal detail with sk-secret-token' },
    });

    const result = await adapter.probeToolCapability(CONFIG, 'm');

    expect(result.failureCode).toBe(OLLAMA_TOOL_PROBE_FAILURE_REQUEST);
    expect(JSON.stringify(result)).not.toMatch(/sk-secret-token/u);
  });
});
