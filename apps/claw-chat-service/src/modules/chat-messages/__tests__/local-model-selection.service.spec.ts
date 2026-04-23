import { LocalModelSelectionService } from '../services/local-model-selection.service';

jest.mock('../../../common/utilities/http-client.utility', () => ({
  httpRequest: jest.fn(),
}));

jest.mock('../../../app/config/app.config', () => ({
  AppConfig: {
    get: jest.fn(() => ({
      OLLAMA_SERVICE_URL: 'http://ollama:4008',
    })),
  },
}));

const { httpRequest } = jest.requireMock('../../../common/utilities/http-client.utility') as {
  httpRequest: jest.Mock;
};

describe('LocalModelSelectionService', () => {
  let service: LocalModelSelectionService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new LocalModelSelectionService();
  });

  it('prefers stronger general chat models over tiny coder models for AUTO fallback chat', async () => {
    httpRequest.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        models: [
          {
            name: 'qwen2.5-coder',
            tag: '1.5b',
            roles: ['LOCAL_FALLBACK_CHAT'],
            parameterCount: '1.5B',
            sizeBytes: null,
          },
          {
            name: 'llama3.2',
            tag: 'latest',
            roles: ['LOCAL_FALLBACK_CHAT'],
            parameterCount: '3.2B',
            sizeBytes: null,
          },
          {
            name: 'gemma4',
            tag: 'e4b',
            roles: ['LOCAL_FALLBACK_CHAT'],
            parameterCount: '4B',
            sizeBytes: null,
          },
        ],
      },
    });

    await expect(service.resolveDefaultModel()).resolves.toBe('gemma4:e4b');
  });

  it('keeps coding-specialized models eligible when an explicit role matches', async () => {
    httpRequest.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        models: [
          {
            name: 'qwen2.5-coder',
            tag: '7b',
            roles: ['CODE_GENERATION'],
            parameterCount: '7B',
            sizeBytes: null,
          },
          {
            name: 'llama3.2',
            tag: 'latest',
            roles: ['LOCAL_FALLBACK_CHAT'],
            parameterCount: '3.2B',
            sizeBytes: null,
          },
        ],
      },
    });

    await expect(service.resolveDefaultModel('CODE_GENERATION')).resolves.toBe('qwen2.5-coder:7b');
  });

  it('orders model lists from strongest to weakest instead of smallest first', async () => {
    httpRequest.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        models: [
          {
            name: 'qwen2.5-coder',
            tag: '1.5b',
            roles: ['LOCAL_FALLBACK_CHAT'],
            parameterCount: '1.5B',
            sizeBytes: null,
          },
          {
            name: 'llama3.2',
            tag: 'latest',
            roles: ['LOCAL_FALLBACK_CHAT'],
            parameterCount: '3.2B',
            sizeBytes: null,
          },
          {
            name: 'gemma4',
            tag: 'e4b',
            roles: ['LOCAL_FALLBACK_CHAT'],
            parameterCount: '4B',
            sizeBytes: null,
          },
        ],
      },
    });

    await expect(service.resolveModelList(3)).resolves.toEqual([
      'gemma4:e4b',
      'llama3.2:latest',
      'qwen2.5-coder:1.5b',
    ]);
  });
});
