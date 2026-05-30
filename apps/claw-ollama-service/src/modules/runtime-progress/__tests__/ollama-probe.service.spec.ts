import {
  RuntimeExecutionProfile,
  RuntimeProbeStatus,
  RuntimeProvider,
  StreamingErrorType,
} from '@claw/shared-types';

import { OllamaProbeService } from '../services/ollama-probe.service';

const mockGet = jest.fn();

jest.mock('@common/utilities', () => ({
  createHttpClient: jest.fn(() => ({ get: mockGet })),
}));

jest.mock('../../../app/config/app.config', () => ({
  AppConfig: {
    get: (): { OLLAMA_BASE_URL: string } => ({ OLLAMA_BASE_URL: 'http://ollama:11434' }),
  },
}));

type GetArgs = {
  version?: { ok: boolean; data?: { version: string }; error?: string };
  tags?: {
    ok: boolean;
    data?: {
      models: {
        name: string;
        size?: number;
        details?: { family?: string; quantization_level?: string };
      }[];
    };
    error?: string;
  };
  ps?: { ok: boolean; data?: { models: { name: string }[] }; error?: string };
};

const setupHttpResponses = (responses: GetArgs): void => {
  mockGet.mockImplementation((url: string) => {
    if (url === '/api/version') {
      if (responses.version?.ok === true) {
        return Promise.resolve({ data: responses.version.data });
      }
      return Promise.reject(new Error(responses.version?.error ?? 'connect ECONNREFUSED'));
    }
    if (url === '/api/tags') {
      if (responses.tags?.ok === true) {
        return Promise.resolve({ data: responses.tags.data });
      }
      return Promise.reject(new Error(responses.tags?.error ?? 'tags failed'));
    }
    if (url === '/api/ps') {
      if (responses.ps?.ok === true) {
        return Promise.resolve({ data: responses.ps.data });
      }
      return Promise.reject(new Error(responses.ps?.error ?? 'ps failed'));
    }
    return Promise.reject(new Error(`Unexpected url ${url}`));
  });
};

describe('OllamaProbeService', () => {
  let service: OllamaProbeService;

  beforeEach(() => {
    mockGet.mockReset();
    service = new OllamaProbeService();
  });

  it('returns REACHABLE when all three endpoints succeed', async () => {
    setupHttpResponses({
      version: { ok: true, data: { version: '0.5.0' } },
      tags: { ok: true, data: { models: [] } },
      ps: { ok: true, data: { models: [] } },
    });

    const report = await service.probe({ includeModels: true, timeoutMs: 5000 });

    expect(report.status).toBe(RuntimeProbeStatus.REACHABLE);
    expect(report.provider).toBe(RuntimeProvider.OLLAMA);
    expect(report.runtimeUrl).toBe('http://ollama:11434');
    expect(report.version).toBe('0.5.0');
    expect(report.executionProfile).toBe(RuntimeExecutionProfile.UNKNOWN);
    expect(report.capabilities?.streamingText).toBe(true);
    expect(report.latencyMs).toBeGreaterThanOrEqual(0);
    expect(report.errorType).toBeUndefined();
  });

  it('returns DEGRADED when version succeeds but tags fails', async () => {
    setupHttpResponses({
      version: { ok: true, data: { version: '0.5.0' } },
      tags: { ok: false, error: 'tags 500' },
      ps: { ok: true, data: { models: [] } },
    });

    const report = await service.probe({ includeModels: true, timeoutMs: 5000 });

    expect(report.status).toBe(RuntimeProbeStatus.DEGRADED);
    expect(report.version).toBe('0.5.0');
    expect(report.models).toBeUndefined();
    expect(report.slots).toEqual([]);
  });

  it('returns DEGRADED when version succeeds but ps fails', async () => {
    setupHttpResponses({
      version: { ok: true, data: { version: '0.5.0' } },
      tags: { ok: true, data: { models: [] } },
      ps: { ok: false, error: 'ps 500' },
    });

    const report = await service.probe({ includeModels: true, timeoutMs: 5000 });

    expect(report.status).toBe(RuntimeProbeStatus.DEGRADED);
    expect(report.slots).toBeUndefined();
  });

  it('returns UNREACHABLE with RUNTIME_UNREACHABLE when all endpoints fail', async () => {
    setupHttpResponses({
      version: { ok: false, error: 'connect ECONNREFUSED' },
      tags: { ok: false, error: 'connect ECONNREFUSED' },
      ps: { ok: false, error: 'connect ECONNREFUSED' },
    });

    const report = await service.probe({ includeModels: true, timeoutMs: 5000 });

    expect(report.status).toBe(RuntimeProbeStatus.UNREACHABLE);
    expect(report.errorType).toBe(StreamingErrorType.RUNTIME_UNREACHABLE);
    expect(report.errorMessage).toBe('connect ECONNREFUSED');
    expect(report.version).toBeUndefined();
    expect(report.models).toBeUndefined();
    expect(report.slots).toBeUndefined();
  });

  it('returns thinking=true when a qwen3 model is installed via tags', async () => {
    setupHttpResponses({
      version: { ok: true, data: { version: '0.5.0' } },
      tags: {
        ok: true,
        data: {
          models: [
            {
              name: 'qwen3:1.7b',
              size: 1_100_000_000,
              details: { family: 'qwen3', quantization_level: 'Q4_K_M' },
            },
          ],
        },
      },
      ps: { ok: true, data: { models: [] } },
    });

    const report = await service.probe({ includeModels: true, timeoutMs: 5000 });

    expect(report.status).toBe(RuntimeProbeStatus.REACHABLE);
    expect(report.capabilities?.thinking).toBe(true);
  });

  it('maps /api/tags models with id, sizeBytes, quantization, family', async () => {
    setupHttpResponses({
      version: { ok: true, data: { version: '0.5.0' } },
      tags: {
        ok: true,
        data: {
          models: [
            {
              name: 'gemma3:4b',
              size: 3_300_000_000,
              details: { family: 'gemma', quantization_level: 'Q4_K_M' },
            },
            {
              name: 'mistral:7b',
              size: 7_000_000_000,
              details: { family: 'llama', quantization_level: 'Q8_0' },
            },
          ],
        },
      },
      ps: { ok: true, data: { models: [] } },
    });

    const report = await service.probe({ includeModels: true, timeoutMs: 5000 });

    expect(report.models).toEqual([
      {
        id: 'gemma3:4b',
        sizeBytes: 3_300_000_000,
        quantization: 'Q4_K_M',
        family: 'gemma',
      },
      {
        id: 'mistral:7b',
        sizeBytes: 7_000_000_000,
        quantization: 'Q8_0',
        family: 'llama',
      },
    ]);
    expect(report.capabilities?.thinking).toBe(false);
  });

  it('maps /api/ps running models into slots with busy=true', async () => {
    setupHttpResponses({
      version: { ok: true, data: { version: '0.5.0' } },
      tags: { ok: true, data: { models: [] } },
      ps: {
        ok: true,
        data: {
          models: [{ name: 'gemma3:4b' }, { name: 'llama3:8b' }],
        },
      },
    });

    const report = await service.probe({ includeModels: true, timeoutMs: 5000 });

    expect(report.slots).toEqual([
      { index: 0, modelId: 'gemma3:4b', busy: true },
      { index: 1, modelId: 'llama3:8b', busy: true },
    ]);
  });

  it('skips /api/tags fetch when includeModels=false', async () => {
    setupHttpResponses({
      version: { ok: true, data: { version: '0.5.0' } },
      ps: { ok: true, data: { models: [] } },
    });

    const report = await service.probe({ includeModels: false, timeoutMs: 5000 });

    expect(report.status).toBe(RuntimeProbeStatus.REACHABLE);
    expect(report.models).toBeUndefined();
    expect(mockGet).not.toHaveBeenCalledWith('/api/tags');
  });
});
