import { type Mock, vi } from 'vitest';
import type { PaygMeter } from '@claw/shared-entitlements';

import { buildInterServiceAuthHeader, httpGet, httpPost } from '@common/utilities';

import { ImageProviderCancel } from '../../../../common/enums';
import {
  IMAGE_PROVIDER_GEMINI,
  IMAGE_PROVIDER_LOCAL,
  IMAGE_PROVIDER_LOCAL_COMFYUI,
  IMAGE_PROVIDER_OPENAI,
} from '../../../../common/constants';
import { generateWithGemini } from '../../adapters/gemini-image.adapter';
import { IMAGE_GENERATION_CANCELLED_CODE } from '../../constants/image-cancel.constants';
import { isImageCancelledError } from '../../utilities/image-cancel.utility';
import { ImageExecutionManager } from '../image-execution.manager';
import type { ComfyUIProgressAdapter } from '../../../runtime-progress/adapters/comfyui-progress.adapter';
import type { StableDiffusionWebuiProgressAdapter } from '../../../runtime-progress/adapters/stable-diffusion-webui-progress.adapter';
import type { ExecuteImageInput, ImageSettlement } from '../../types/image-generation.types';

vi.mock('@common/utilities');
vi.mock('../../adapters/gemini-image.adapter');

const { appConfigGet } = vi.hoisted(() => ({ appConfigGet: vi.fn() }));

vi.mock('../../../../app/config/app.config', () => ({
  AppConfig: { get: appConfigGet },
}));

const httpGetMock = vi.mocked(httpGet);
const httpPostMock = vi.mocked(httpPost);
const geminiMock = vi.mocked(generateWithGemini);

type Harness = {
  manager: ImageExecutionManager;
  reserve: Mock;
  finalize: Mock;
  release: Mock;
  comfyCancel: Mock;
  streamGenerate: Mock;
  sdCancel: Mock;
};

const harness = (): Harness => {
  const reserve = vi.fn().mockResolvedValue({
    metered: true,
    reservationId: 'res-cancel-1',
    maxOutputTokens: 8192,
    clamped: false,
    heldMicroUsd: 41_000,
    availableAfterMicroUsd: 959_000,
    reason: null,
  });
  const finalize = vi.fn().mockResolvedValue(undefined);
  const release = vi.fn().mockResolvedValue(undefined);
  const comfyCancel = vi.fn().mockResolvedValue(true);
  const streamGenerate = vi.fn();
  const sdCancel = vi.fn().mockResolvedValue(undefined);
  const payg: Pick<PaygMeter, 'reserve' | 'finalize' | 'release'> = { reserve, finalize, release };
  const comfy: Pick<ComfyUIProgressAdapter, 'cancel' | 'streamGenerate'> = {
    cancel: comfyCancel,
    streamGenerate,
  };
  const sd: Pick<StableDiffusionWebuiProgressAdapter, 'cancel'> = { cancel: sdCancel };
  const manager = new ImageExecutionManager(
    comfy as ComfyUIProgressAdapter,
    payg as PaygMeter,
    sd as StableDiffusionWebuiProgressAdapter,
  );
  return { manager, reserve, finalize, release, comfyCancel, streamGenerate, sdCancel };
};

const input = (isCancelled: () => Promise<boolean>): ExecuteImageInput => ({
  prompt: 'a cute tabby cat',
  provider: IMAGE_PROVIDER_GEMINI,
  model: 'gemini-2.5-flash-image',
  userId: 'user-1',
  requestId: 'gen-1:attempt-a',
  isCancelled,
});

const caught = async (promise: Promise<unknown>): Promise<unknown> =>
  promise.then(
    () => null,
    (error: unknown) => error,
  );

describe('ImageExecutionManager — user cancellation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    appConfigGet.mockReturnValue({
      FILE_SERVICE_URL: 'http://file-service:4005',
      CONNECTOR_SERVICE_URL: 'http://connector-service:4004',
      STABLE_DIFFUSION_URL: 'http://stable-diffusion:7860',
      COMFYUI_BASE_URL: 'http://comfyui:8188',
    });
    vi.mocked(buildInterServiceAuthHeader).mockReturnValue('Service image-token');
    httpGetMock.mockResolvedValue({ provider: 'GEMINI', apiKey: 'k', baseUrl: undefined });
    httpPostMock.mockResolvedValue({ fileId: 'file-1' });
    geminiMock.mockResolvedValue({ imageBase64: 'AAA', mimeType: 'image/png' });
  });

  it('cancelled before the call: no hold, no provider call, no stored file', async () => {
    const h = harness();

    const error = await caught(h.manager.execute(input(async () => Promise.resolve(true))));

    expect(isImageCancelledError(error)).toBe(true);
    expect(h.reserve).not.toHaveBeenCalled();
    expect(geminiMock).not.toHaveBeenCalled();
    expect(httpPostMock).not.toHaveBeenCalled();
    expect(h.release).not.toHaveBeenCalled();
  });

  it('cancelled while the provider worked: result dropped before storing, hold RELEASED (CANCELLED), never finalized', async () => {
    const h = harness();
    const probe = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);

    const error = await caught(h.manager.execute(input(probe)));

    expect(error).toMatchObject({ code: IMAGE_GENERATION_CANCELLED_CODE });
    expect(geminiMock).toHaveBeenCalledTimes(1);
    expect(httpPostMock).not.toHaveBeenCalled();
    expect(h.release).toHaveBeenCalledTimes(1);
    expect(h.release).toHaveBeenCalledWith(
      expect.objectContaining({ reservationId: 'res-cancel-1' }),
      'CANCELLED',
    );
    expect(h.finalize).not.toHaveBeenCalled();
  });

  it('not cancelled: stores the image and leaves the hold open for the caller to settle', async () => {
    const h = harness();

    const result = await h.manager.execute(input(async () => Promise.resolve(false)));

    expect(result.fileId).toBe('file-1');
    expect(result.settlement).toBeDefined();
    expect(h.release).not.toHaveBeenCalled();
  });

  it('releaseCancelled reports false and calls nothing for a local attempt (no hold)', async () => {
    const h = harness();
    expect(await h.manager.releaseCancelled(undefined)).toBe(false);
    expect(h.release).not.toHaveBeenCalled();
  });

  it('releaseCancelled releases a paid hold with reason CANCELLED and never finalizes', async () => {
    const h = harness();
    const settlement: ImageSettlement = {
      hold: {
        metered: true,
        reservationId: 'res-cancel-2',
        maxOutputTokens: 8192,
        clamped: false,
        heldMicroUsd: 41_000,
        availableAfterMicroUsd: 959_000,
        reason: null,
      },
      usage: { promptTokens: 0, completionTokens: 0, cachedPromptTokens: 0, reasoningTokens: 0 },
      calls: { imageUnits: 1 },
    };
    expect(await h.manager.releaseCancelled(settlement)).toBe(true);
    expect(h.release).toHaveBeenCalledWith(settlement.hold, 'CANCELLED');
    expect(h.finalize).not.toHaveBeenCalled();
  });

  describe("requestProviderCancel — never stops another user's job", () => {
    const comfyResult = {
      promptId: 'prompt-42',
      imageBase64: 'AAA',
      mimeType: 'image/png',
      filename: 'out.png',
      subfolder: '',
      nodeTimings: [],
    };

    /** Runs a ComfyUI attempt that stays in flight until `finish` is called. */
    const comfyInFlight = (h: Harness, generationId: string): { finish: () => Promise<void> } => {
      let release: () => void = () => {
        // replaced synchronously by the Promise executor below
      };
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      h.streamGenerate.mockImplementationOnce(
        async (options: { onPromptAccepted?: (promptId: string) => void }) => {
          options.onPromptAccepted?.('prompt-42');
          await gate;
          return comfyResult;
        },
      );
      const run = h.manager.execute({
        prompt: 'a cat',
        provider: IMAGE_PROVIDER_LOCAL_COMFYUI,
        model: 'sd15.safetensors',
        userId: 'user-1',
        requestId: `${generationId}:attempt`,
        generationId,
      });
      return {
        finish: async () => {
          release();
          await run;
        },
      };
    };

    it('ComfyUI with a known prompt id: TARGETED interrupt carrying that prompt_id', async () => {
      const h = harness();
      const job = comfyInFlight(h, 'gen-comfy');
      await Promise.resolve();

      expect(await h.manager.requestProviderCancel('gen-comfy', IMAGE_PROVIDER_LOCAL_COMFYUI)).toBe(
        ImageProviderCancel.REQUESTED,
      );
      expect(h.comfyCancel).toHaveBeenCalledWith('http://comfyui:8188', 'prompt-42');
      await job.finish();
    });

    it('ComfyUI with an unknown prompt id (other replica / other generation): no interrupt at all', async () => {
      const h = harness();
      const job = comfyInFlight(h, 'gen-other');
      await Promise.resolve();

      expect(await h.manager.requestProviderCancel('gen-comfy', IMAGE_PROVIDER_LOCAL_COMFYUI)).toBe(
        ImageProviderCancel.UNSUPPORTED,
      );
      expect(h.comfyCancel).not.toHaveBeenCalled();
      await job.finish();
    });

    it('ComfyUI after the run settled: the prompt id is forgotten, so no interrupt', async () => {
      const h = harness();
      const job = comfyInFlight(h, 'gen-comfy');
      await job.finish();

      expect(await h.manager.requestProviderCancel('gen-comfy', IMAGE_PROVIDER_LOCAL_COMFYUI)).toBe(
        ImageProviderCancel.UNSUPPORTED,
      );
      expect(h.comfyCancel).not.toHaveBeenCalled();
    });

    it('SD WebUI: never interrupted — its interrupt has no job target and nothing proves ours is running', async () => {
      const h = harness();
      expect(await h.manager.requestProviderCancel('gen-sd', IMAGE_PROVIDER_LOCAL)).toBe(
        ImageProviderCancel.UNSUPPORTED,
      );
      expect(h.sdCancel).not.toHaveBeenCalled();
      expect(h.comfyCancel).not.toHaveBeenCalled();
    });

    it('cloud provider: reports unsupported and touches no runtime', async () => {
      const h = harness();
      expect(await h.manager.requestProviderCancel('gen-cloud', IMAGE_PROVIDER_OPENAI)).toBe(
        ImageProviderCancel.UNSUPPORTED,
      );
      expect(h.sdCancel).not.toHaveBeenCalled();
      expect(h.comfyCancel).not.toHaveBeenCalled();
    });
  });
});
