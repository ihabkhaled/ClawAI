import { type Mock, vi } from 'vitest';
import { PaygSurface } from '@claw/shared-types';
import { resetInternalHostAllowlist } from '@claw/shared-utilities';

import { AppConfig, type AppConfigType } from '../../../app/config/app.config';
import { callCloudGenerate } from '../../../modules/ai-actions/utilities/cloud-generation-client.utility';
import { callOllamaGenerate } from '../../../modules/ai-actions/utilities/ollama-generation-client.utility';
import { getMetadata, uploadInternal } from '../file-service-client.utility';

/**
 * TD-040. The internal service calls carry the inter-service secret or a
 * user's PAYG attribution, so they go through the same door as provider
 * calls: the host must be the configured `*_SERVICE_URL` the URL was built
 * from, and a redirect is refused. Run with a CI-shaped environment so the
 * shared guard enforces rather than standing down.
 */

const FILE_SERVICE_URL = 'http://file-service:4006';

function config(overrides: Partial<AppConfigType>): AppConfigType {
  const base: Partial<AppConfigType> = {
    FILE_SERVICE_URL,
    INTER_SERVICE_AUTH_TOKEN: 'inter-service-secret',
    ...overrides,
  };
  return base as AppConfigType;
}

describe('internal service calls go through the outbound URL guard', () => {
  let fetchMock: Mock;

  beforeEach(() => {
    vi.stubEnv('ACTIONS_RESULTS_ENDPOINT', 'https://x.example');
    resetInternalHostAllowlist();
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ fileId: 'f-1' }),
      text: () => Promise.resolve(JSON.stringify({ content: 'ok', response: 'ok' })),
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(AppConfig, 'get').mockReturnValue(config({}));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    resetInternalHostAllowlist();
  });

  function firstCall(): { host: string; init: RequestInit } {
    const [target, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    return { host: new URL(target).host, init };
  }

  it('file-service upload reaches FILE_SERVICE_URL with redirects refused', async () => {
    await expect(
      uploadInternal({
        userId: 'u',
        filename: 'a.txt',
        mimeType: 'text/plain',
        content: Buffer.from('x'),
      }),
    ).resolves.toBe('f-1');
    expect(firstCall()).toMatchObject({ host: 'file-service:4006', init: { redirect: 'error' } });
  });

  it('file-service metadata read refuses a FILE_SERVICE_URL on the metadata address', async () => {
    vi.spyOn(AppConfig, 'get').mockReturnValue(
      config({ FILE_SERVICE_URL: 'http://169.254.169.254' }),
    );
    await expect(getMetadata('f-1')).rejects.toThrow(/cloud metadata/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('cloud generation reaches chat-service with redirects refused', async () => {
    await callCloudGenerate({
      chatServiceUrl: 'http://chat-service:4002',
      provider: 'ANTHROPIC',
      model: 'm',
      systemPrompt: 's',
      userPrompt: 'u',
      timeoutMs: 5_000,
      userId: 'user-7',
      surface: PaygSurface.WORKSPACE_ACTION,
    });
    expect(firstCall()).toMatchObject({ host: 'chat-service:4002', init: { redirect: 'error' } });
  });

  it('local generation reaches ollama-service, and refuses a non-http base', async () => {
    await callOllamaGenerate({
      baseUrl: 'http://ollama-service:4008',
      model: 'm',
      prompt: 'p',
      timeoutMs: 5_000,
    });
    expect(firstCall()).toMatchObject({
      host: 'ollama-service:4008',
      init: { redirect: 'error' },
    });

    fetchMock.mockClear();
    await expect(
      callOllamaGenerate({ baseUrl: 'file:///etc', model: 'm', prompt: 'p', timeoutMs: 5_000 }),
    ).rejects.toThrow(/protocol/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
