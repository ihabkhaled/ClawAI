import { type Mock, vi } from 'vitest';
import type { PaygMeter } from '@claw/shared-entitlements';
import { type ClawRuntimeProgressEvent, RuntimeProgressStage } from '@claw/shared-types';

import { buildInterServiceAuthHeader, httpGet, httpPost } from '@common/utilities';

import { ImageFailureCode } from '../../../../common/enums';
import { generateWithStableDiffusion } from '../../adapters/stable-diffusion.adapter';
import { ImageExecutionManager } from '../image-execution.manager';
import type { ComfyUIProgressAdapter } from '../../../runtime-progress/adapters/comfyui-progress.adapter';
import type { StableDiffusionWebuiProgressAdapter } from '../../../runtime-progress/adapters/stable-diffusion-webui-progress.adapter';
import type { ExecuteImageInput } from '../../types/image-generation.types';

vi.mock('@common/utilities');
vi.mock('../../adapters/stable-diffusion.adapter');

const { appConfigGet } = vi.hoisted(() => ({ appConfigGet: vi.fn() }));
vi.mock('../../../../app/config/app.config', () => ({ AppConfig: { get: appConfigGet } }));

const event = (stage: RuntimeProgressStage): ClawRuntimeProgressEvent =>
  ({ stage, sequence: 0 }) as unknown as ClawRuntimeProgressEvent;

const input = (overrides: Partial<ExecuteImageInput> = {}): ExecuteImageInput => ({
  prompt: 'a lighthouse',
  provider: 'IMAGE_LOCAL_COMFYUI',
  model: 'sd_v1-5',
  userId: 'user-1',
  requestId: 'gen-1:a',
  ...overrides,
});

/** An async generator the test feeds by hand, like the adapter's poll loop. */
const manualEvents = (): {
  events: AsyncGenerator<ClawRuntimeProgressEvent, void, void>;
  push: (e: ClawRuntimeProgressEvent) => void;
  end: () => void;
} => {
  const queue: ClawRuntimeProgressEvent[] = [];
  let wake: (() => void) | undefined;
  let done = false;
  const waitForPush = async (): Promise<void> =>
    new Promise<void>((resolve) => {
      wake = resolve;
    });
  async function* events(): AsyncGenerator<ClawRuntimeProgressEvent, void, void> {
    while (!done || queue.length > 0) {
      const next = queue.shift();
      if (next) {
        yield next;
        continue;
      }
      await waitForPush();
    }
  }
  return {
    events: events(),
    push: (e) => {
      queue.push(e);
      wake?.();
    },
    end: () => {
      done = true;
      wake?.();
    },
  };
};

const tick = async (): Promise<void> => {
  for (let i = 0; i < 5; i += 1) {
    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });
  }
};

describe('ImageExecutionManager — runtime progress and stored references', () => {
  let streamGenerate: Mock;
  let sdStart: Mock;
  let manager: ImageExecutionManager;

  beforeEach(() => {
    vi.clearAllMocks();
    appConfigGet.mockReturnValue({
      FILE_SERVICE_URL: 'http://file-service:4006',
      COMFYUI_BASE_URL: 'http://comfyui:8188',
      STABLE_DIFFUSION_URL: 'http://stable-diffusion:7860',
      CLAW_IMAGE_PROGRESS_POLL_INTERVAL_MS: 1500,
    });
    vi.mocked(buildInterServiceAuthHeader).mockReturnValue('Service t');
    vi.mocked(httpPost).mockResolvedValue({ fileId: 'file-out' });
    streamGenerate = vi.fn();
    sdStart = vi.fn();
    manager = new ImageExecutionManager(
      { streamGenerate } as unknown as ComfyUIProgressAdapter,
      {} as PaygMeter,
      { start: sdStart } as unknown as StableDiffusionWebuiProgressAdapter,
    );
  });

  describe('ComfyUI', () => {
    it('forwards every adapter envelope to onProgress (it used to be discarded)', async () => {
      streamGenerate.mockImplementation(
        async (opts: { onEvent: (e: ClawRuntimeProgressEvent) => void }) => {
          opts.onEvent(event(RuntimeProgressStage.MODEL_LOADING));
          opts.onEvent(event(RuntimeProgressStage.EXECUTING_NODE));
          return {
            imageBase64: 'AAA',
            mimeType: 'image/png',
            promptId: 'p',
            filename: 'f',
            nodeTimings: [],
          };
        },
      );
      const onProgress = vi.fn();

      await manager.execute(input({ onProgress }));

      expect(
        onProgress.mock.calls.map((call) => (call[0] as ClawRuntimeProgressEvent).stage),
      ).toEqual([RuntimeProgressStage.MODEL_LOADING, RuntimeProgressStage.EXECUTING_NODE]);
    });

    it('still works with no listener', async () => {
      streamGenerate.mockImplementation(
        async (opts: { onEvent: (e: ClawRuntimeProgressEvent) => void }) => {
          opts.onEvent(event(RuntimeProgressStage.EXECUTING_NODE));
          return {
            imageBase64: 'AAA',
            mimeType: 'image/png',
            promptId: 'p',
            filename: 'f',
            nodeTimings: [],
          };
        },
      );

      await expect(manager.execute(input())).resolves.toMatchObject({ fileId: 'file-out' });
    });
  });

  describe('Stable Diffusion WebUI', () => {
    const sdInput = (onProgress?: (e: ClawRuntimeProgressEvent) => void): ExecuteImageInput =>
      input({ provider: 'IMAGE_LOCAL', model: 'sdxl-turbo', onProgress });

    it('polls at the configured interval while txt2img runs, forwards polls, and stops after', async () => {
      const feed = manualEvents();
      const stop = vi.fn(() => {
        feed.end();
      });
      sdStart.mockReturnValue({ events: feed.events, stop, nextSequence: () => 0 });
      let finishTxt2img: (() => void) | undefined;
      vi.mocked(generateWithStableDiffusion).mockImplementation(
        async () =>
          new Promise((resolve) => {
            finishTxt2img = () => {
              resolve({ imageBase64: 'AAA', mimeType: 'image/png' });
            };
          }),
      );
      const onProgress = vi.fn();

      const running = manager.execute(sdInput(onProgress));
      await tick();
      feed.push(event(RuntimeProgressStage.GENERATING));
      await tick();
      finishTxt2img?.();
      await running;
      feed.push(event(RuntimeProgressStage.POST_PROCESSING));
      await tick();

      expect(sdStart).toHaveBeenCalledWith(
        expect.objectContaining({
          sdUrl: 'http://stable-diffusion:7860',
          intervalMs: 1500,
          preview: false,
        }),
      );
      expect(stop).toHaveBeenCalledTimes(1);
      // The poll that landed after txt2img settled is dropped.
      expect(onProgress).toHaveBeenCalledTimes(1);
      expect((onProgress.mock.calls[0]?.[0] as ClawRuntimeProgressEvent).stage).toBe(
        RuntimeProgressStage.GENERATING,
      );
    });

    it('stops polling when txt2img fails', async () => {
      const feed = manualEvents();
      const stop = vi.fn(() => {
        feed.end();
      });
      sdStart.mockReturnValue({ events: feed.events, stop, nextSequence: () => 0 });
      vi.mocked(generateWithStableDiffusion).mockRejectedValue(new Error('sd down'));

      await expect(manager.execute(sdInput(vi.fn()))).rejects.toMatchObject({
        code: 'LOCAL_IMAGE_GENERATION_FAILED',
      });
      expect(stop).toHaveBeenCalledTimes(1);
    });

    it('does not poll at all when nobody listens', async () => {
      vi.mocked(generateWithStableDiffusion).mockResolvedValue({
        imageBase64: 'AAA',
        mimeType: 'image/png',
      });

      await manager.execute(sdInput());

      expect(sdStart).not.toHaveBeenCalled();
    });
  });

  describe('loadStoredReference', () => {
    it('reads the bytes from file-service as the owner, with the service token', async () => {
      vi.mocked(httpGet).mockResolvedValue({ mimeType: 'image/jpeg', content: 'aGVsbG8=' });

      const reference = await manager.loadStoredReference('file-ref', 'user-1');

      expect(reference).toEqual({ base64: 'aGVsbG8=', mimeType: 'image/jpeg' });
      expect(httpGet).toHaveBeenCalledWith(
        'http://file-service:4006/api/v1/internal/files/file-ref/content?userId=user-1',
        expect.objectContaining({ headers: { Authorization: 'Service t' } }),
      );
    });

    it('turns a refusal (deleted / not the owner) into REFERENCE_UNAVAILABLE', async () => {
      vi.mocked(httpGet).mockRejectedValue(new Error('Request failed with status code 404'));

      await expect(manager.loadStoredReference('file-ref', 'user-1')).rejects.toMatchObject({
        code: ImageFailureCode.REFERENCE_UNAVAILABLE,
      });
    });

    it('refuses a file with no bytes rather than generating without the reference', async () => {
      vi.mocked(httpGet).mockResolvedValue({ mimeType: 'image/png', content: null });

      await expect(manager.loadStoredReference('file-ref', 'user-1')).rejects.toMatchObject({
        code: ImageFailureCode.REFERENCE_UNAVAILABLE,
      });
    });
  });
});
