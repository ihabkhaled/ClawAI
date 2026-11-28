import { vi } from 'vitest';
import { HfDiscoveryManager } from '../hf-discovery.manager';

const { mockRequest } = vi.hoisted(() => ({ mockRequest: vi.fn() }));

vi.mock('undici', () => ({
  Agent: class {
    compose(): object {
      return {};
    }
  },
  interceptors: { redirect: vi.fn(() => ({})) },
  request: mockRequest,
}));

vi.mock('../../../../app/config/app.config', () => ({
  AppConfig: {
    get: vi.fn().mockReturnValue({
      HUGGINGFACE_API_BASE: 'https://huggingface.example',
      HUGGINGFACE_TOKEN: undefined,
    }),
  },
}));

const REPO = 'unsloth/gemma-3-4b-it-GGUF';

function reply(
  statusCode: number,
  body: unknown,
): { statusCode: number; body: { text: () => Promise<string> } } {
  return { statusCode, body: { text: () => Promise.resolve(JSON.stringify(body)) } };
}

/** Routes each HuggingFace URL to its own answer. */
function answerWith(routes: { detail?: unknown; tree?: unknown; gguf: unknown }): void {
  mockRequest.mockImplementation((url: string) => {
    if (url.includes('expand[]=gguf')) {
      return routes.gguf instanceof Error
        ? Promise.reject(routes.gguf)
        : Promise.resolve(reply(200, routes.gguf));
    }
    if (url.includes('/tree/main')) {
      return Promise.resolve(reply(200, routes.tree ?? []));
    }
    return Promise.resolve(reply(200, routes.detail ?? { id: REPO, tags: ['gguf'] }));
  });
}

describe('HfDiscoveryManager.getDetails (GGUF context window, ADR-234)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('carries the window HuggingFace reads from the GGUF metadata', async () => {
    answerWith({ gguf: { gguf: { context_length: 131_072, architecture: 'gemma3' } } });

    const details = await new HfDiscoveryManager().getDetails(REPO);

    expect(details.ggufContextLength).toBe(131_072);
    expect(mockRequest).toHaveBeenCalledWith(
      `https://huggingface.example/api/models/${REPO}?expand[]=gguf`,
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('leaves the window unknown when the repo reports no GGUF context_length', async () => {
    answerWith({ gguf: { gguf: { architecture: 'gemma3' } } });

    const details = await new HfDiscoveryManager().getDetails(REPO);

    expect(details.ggufContextLength).toBeNull();
  });

  it('leaves the window unknown, and still returns the repo, when the GGUF call fails', async () => {
    answerWith({
      detail: { id: REPO, tags: ['gguf'], downloads: 5 },
      tree: [{ type: 'file', path: 'gemma-3-4b-it-Q4_K_M.gguf', size: 2_489_894_016 }],
      gguf: new Error('connect ETIMEDOUT'),
    });

    const details = await new HfDiscoveryManager().getDetails(REPO);

    expect(details.ggufContextLength).toBeNull();
    expect(details.id).toBe(REPO);
    expect(details.ggufFiles).toHaveLength(1);
  });

  it('leaves the window unknown for a gated repo the API refuses (401)', async () => {
    mockRequest.mockImplementation((url: string) =>
      Promise.resolve(
        url.includes('expand[]=gguf')
          ? reply(401, { error: 'Invalid credentials' })
          : reply(200, url.includes('/tree/main') ? [] : { id: REPO, tags: ['gguf'] }),
      ),
    );

    const details = await new HfDiscoveryManager().getDetails(REPO);

    expect(details.ggufContextLength).toBeNull();
  });

  it('never reads a malformed window as a number', async () => {
    answerWith({ gguf: { gguf: { context_length: '131072' } } });

    const details = await new HfDiscoveryManager().getDetails(REPO);

    expect(details.ggufContextLength).toBeNull();
  });
});
