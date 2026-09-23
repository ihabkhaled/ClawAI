import { vi } from 'vitest';
import type { PaygMeter } from '@claw/shared-entitlements';
import { PaygSurface } from '@claw/shared-types';

import { buildInterServiceAuthHeader, httpGet, httpPost } from '@common/utilities';

import { ImageFailureCode } from '../../../../common/enums';
import { generateWithGemini } from '../../adapters/gemini-image.adapter';
import { generateWithOpenAI } from '../../adapters/openai-image.adapter';
import { generateWithXai } from '../../adapters/xai-image.adapter';
import { XAI_DEFAULT_BASE_URL } from '../../constants/xai-image.constants';
import { ImageExecutionManager } from '../image-execution.manager';
import type { ComfyUIProgressAdapter } from '../../../runtime-progress/adapters/comfyui-progress.adapter';
import type { ExecuteImageInput } from '../../types/image-generation.types';

vi.mock('@common/utilities');
vi.mock('../../adapters/openai-image.adapter');
vi.mock('../../adapters/gemini-image.adapter');
vi.mock('../../adapters/xai-image.adapter');
vi.mock('../../adapters/stable-diffusion.adapter');

const { appConfigGet } = vi.hoisted(() => ({ appConfigGet: vi.fn() }));
vi.mock('../../../../app/config/app.config', () => ({ AppConfig: { get: appConfigGet } }));

const reserve = vi.fn();
const finalize = vi.fn();
const release = vi.fn();
const meter: Pick<PaygMeter, 'reserve' | 'finalize' | 'release'> = { reserve, finalize, release };
const comfy: Pick<ComfyUIProgressAdapter, 'streamGenerate'> = { streamGenerate: vi.fn() };

function build(): ImageExecutionManager {
  // The manager only calls these three meter methods and never touches comfy on
  // a cloud path, so the narrowed doubles are sufficient.
  return new ImageExecutionManager(comfy as ComfyUIProgressAdapter, meter as PaygMeter);
}

const input = (overrides: Partial<ExecuteImageInput> = {}): ExecuteImageInput => ({
  prompt: 'a red apple on a wooden table',
  provider: 'IMAGE_GROK',
  model: 'grok-imagine-image',
  userId: 'user-1',
  requestId: 'gen-1:attempt-a',
  ...overrides,
});

describe('ImageExecutionManager — cloud providers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    appConfigGet.mockReturnValue({
      FILE_SERVICE_URL: 'http://file-service:4006',
      CONNECTOR_SERVICE_URL: 'http://connector-service:4003',
    });
    reserve.mockResolvedValue({
      metered: false,
      reservationId: null,
      maxOutputTokens: 8192,
      clamped: false,
      heldMicroUsd: 0,
      availableAfterMicroUsd: null,
      reason: null,
    });
    finalize.mockResolvedValue(undefined);
    release.mockResolvedValue(undefined);
    vi.mocked(buildInterServiceAuthHeader).mockReturnValue('Service t');
    vi.mocked(httpPost).mockResolvedValue({ fileId: 'file-1' });
  });

  it('routes IMAGE_GROK to xAI with the GROK connector key and the default base URL', async () => {
    // The live GROK connector row has base_url = NULL.
    vi.mocked(httpGet).mockResolvedValue({ provider: 'GROK', apiKey: 'xai-k' });
    vi.mocked(generateWithXai).mockResolvedValue({ imageBase64: '/9j/', mimeType: 'image/jpeg' });

    const result = await build().execute(input());

    expect(vi.mocked(httpGet).mock.calls[0]?.[0]).toContain(
      '/internal/connectors/config?provider=GROK',
    );
    expect(generateWithXai).toHaveBeenCalledWith(
      XAI_DEFAULT_BASE_URL,
      'xai-k',
      'a red apple on a wooden table',
      'grok-imagine-image',
    );
    expect(generateWithGemini).not.toHaveBeenCalled();
    expect(generateWithOpenAI).not.toHaveBeenCalled();
    expect(reserve).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'GROK',
        model: 'grok-imagine-image',
        surface: PaygSurface.IMAGE,
      }),
    );
    expect(vi.mocked(httpPost).mock.calls[0]?.[1]).toMatchObject({ mimeType: 'image/jpeg' });
    expect(result.fileId).toBe('file-1');
  });

  it('uses the connector base URL when the operator set one', async () => {
    vi.mocked(httpGet).mockResolvedValue({
      provider: 'GROK',
      apiKey: 'k',
      baseUrl: 'https://xai.proxy.example/v1',
    });
    vi.mocked(generateWithXai).mockResolvedValue({ imageBase64: '/9j/', mimeType: 'image/jpeg' });

    await build().execute(input());

    expect(vi.mocked(generateWithXai).mock.calls[0]?.[0]).toBe('https://xai.proxy.example/v1');
  });

  it('reports a file-service outage as a storage failure, not a provider failure', async () => {
    vi.mocked(httpGet).mockResolvedValue({ provider: 'GEMINI', apiKey: 'k' });
    vi.mocked(generateWithGemini).mockResolvedValue({ imageBase64: 'AAA', mimeType: 'image/png' });
    vi.mocked(httpPost).mockRejectedValue(new Error('connect ECONNREFUSED 172.18.0.36:4006'));

    await expect(
      build().execute(input({ provider: 'IMAGE_GEMINI', model: 'gemini-2.5-flash-image' })),
    ).rejects.toMatchObject({ code: ImageFailureCode.STORAGE_FAILED });
    // The provider call itself succeeded, so its hold was settled, not released.
    expect(finalize).toHaveBeenCalledTimes(1);
    expect(release).not.toHaveBeenCalled();
  });

  it('reports a missing connector as CONNECTOR_NOT_CONFIGURED', async () => {
    vi.mocked(httpGet).mockRejectedValue(new Error('Request failed with status code 404'));

    await expect(build().execute(input())).rejects.toMatchObject({
      code: ImageFailureCode.CONNECTOR_NOT_CONFIGURED,
    });
    expect(generateWithXai).not.toHaveBeenCalled();
  });

  it('still refuses an unknown provider', async () => {
    await expect(build().execute(input({ provider: 'IMAGE_MIDJOURNEY' }))).rejects.toMatchObject({
      code: 'UNSUPPORTED_IMAGE_PROVIDER',
    });
  });
});
