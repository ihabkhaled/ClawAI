import {
  RuntimeProgressConfidence,
  RuntimeProgressEventType,
  RuntimeProgressStage,
  RuntimeProvider,
} from '@claw/shared-types';

import { StableDiffusionWebuiProgressAdapter } from '../adapters/stable-diffusion-webui-progress.adapter';
import {
  SD_PROGRESS_MAX_CONSECUTIVE_ERRORS,
  SD_PROGRESS_POLL_MIN_INTERVAL_MS,
} from '../constants/sd-webui-progress.constants';

const httpGetMock = jest.fn();
const httpPostMock = jest.fn();

jest.mock('@common/utilities', () => ({
  httpGet: (...args: unknown[]) => httpGetMock(...args),
  httpPost: (...args: unknown[]) => httpPostMock(...args),
}));

const flushAll = async (iterationsBetween = 0): Promise<void> => {
  for (let i = 0; i <= iterationsBetween; i += 1) {
    await Promise.resolve();
  }
};

describe('StableDiffusionWebuiProgressAdapter', () => {
  let adapter: StableDiffusionWebuiProgressAdapter;

  beforeEach(() => {
    jest.useFakeTimers();
    httpGetMock.mockReset();
    httpPostMock.mockReset();
    adapter = new StableDiffusionWebuiProgressAdapter();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('start', () => {
    it('emits a CONNECTING lifecycle envelope first', async () => {
      httpGetMock.mockResolvedValue({
        progress: 0,
        eta_relative: 0,
        state: { job: '', sampling_step: 0, sampling_steps: 12 },
      });
      const session = adapter.start({
        sdUrl: 'http://sd:7860',
        runId: 'run-1',
        totalSteps: 12,
      });

      const first = await session.events.next();
      expect(first.done).toBe(false);
      expect(first.value?.eventType).toBe(RuntimeProgressEventType.LIFECYCLE);
      expect(first.value?.stage).toBe(RuntimeProgressStage.CONNECTING);
      expect(first.value?.provider).toBe(RuntimeProvider.STABLE_DIFFUSION_WEBUI);
      expect(first.value?.metrics?.progressConfidence).toBe(
        RuntimeProgressConfidence.STAGE_ESTIMATED,
      );
      session.stop();
    });

    it('emits STEP_PROGRESS envelopes mapping progress -> percent and ETA -> samplingMs', async () => {
      httpGetMock.mockResolvedValueOnce({
        progress: 0.5,
        eta_relative: 4.5,
        state: { job: 'task(abc)', sampling_step: 6, sampling_steps: 12 },
      });

      const session = adapter.start({
        sdUrl: 'http://sd:7860',
        runId: 'run-2',
        totalSteps: 12,
        intervalMs: 1000,
      });
      // consume the LIFECYCLE envelope
      await session.events.next();
      // pump the first poll
      const second = await session.events.next();
      session.stop();

      expect(second.value?.eventType).toBe(RuntimeProgressEventType.STEP_PROGRESS);
      expect(second.value?.stage).toBe(RuntimeProgressStage.GENERATING);
      expect(second.value?.metrics?.currentStep).toBe(6);
      expect(second.value?.metrics?.totalSteps).toBe(12);
      expect(second.value?.metrics?.progressPercent).toBe(50);
      expect(second.value?.metrics?.samplingMs).toBe(4500);
      expect(second.value?.metrics?.progressConfidence).toBe(
        RuntimeProgressConfidence.RUNTIME_REPORTED,
      );
      expect(second.value?.rawProviderEventType).toBe('task(abc)');
    });

    it('clamps poll interval to the safe-minimum', () => {
      httpGetMock.mockResolvedValue({ progress: 0, state: {} });
      const session = adapter.start({
        sdUrl: 'http://sd:7860',
        runId: 'run-clamp',
        totalSteps: 12,
        intervalMs: 50, // below the SAFE minimum
      });
      session.stop();
      expect(SD_PROGRESS_POLL_MIN_INTERVAL_MS).toBeGreaterThan(50);
    });

    it('emits IMAGE_PREVIEW envelope when preview=true and current_image is present', async () => {
      httpGetMock.mockResolvedValueOnce({
        progress: 0.25,
        state: { job: 'preview', sampling_step: 3, sampling_steps: 12 },
        current_image: 'iVBORw0KGgoAAAANSUhEUg==',
      });
      const session = adapter.start({
        sdUrl: 'http://sd:7860',
        runId: 'run-prev',
        totalSteps: 12,
        preview: true,
      });
      await session.events.next();
      const previewEvt = await session.events.next();
      session.stop();

      expect(previewEvt.value?.eventType).toBe(RuntimeProgressEventType.IMAGE_PREVIEW);
      expect(previewEvt.value?.imagePreviewBase64).toBe('iVBORw0KGgoAAAANSUhEUg==');
      expect(httpGetMock).toHaveBeenCalledWith(
        expect.stringContaining('skip_current_image=false'),
        expect.any(Object),
      );
    });

    it('omits current_image when preview=false', async () => {
      httpGetMock.mockResolvedValueOnce({
        progress: 0.25,
        state: { job: 'no-prev', sampling_step: 3, sampling_steps: 12 },
        current_image: 'should-be-ignored',
      });
      const session = adapter.start({
        sdUrl: 'http://sd:7860',
        runId: 'run-no-prev',
        totalSteps: 12,
        preview: false,
      });
      await session.events.next();
      const evt = await session.events.next();
      session.stop();
      expect(evt.value?.eventType).toBe(RuntimeProgressEventType.STEP_PROGRESS);
      expect(evt.value?.imagePreviewBase64).toBeUndefined();
      expect(httpGetMock).toHaveBeenCalledWith(
        expect.stringContaining('skip_current_image=true'),
        expect.any(Object),
      );
    });

    it('gives up after consecutive errors and exits the loop', async () => {
      httpGetMock.mockRejectedValue(new Error('connection refused'));
      const session = adapter.start({
        sdUrl: 'http://sd:7860',
        runId: 'run-err',
        totalSteps: 12,
        intervalMs: SD_PROGRESS_POLL_MIN_INTERVAL_MS,
      });
      await session.events.next();
      const allowed = SD_PROGRESS_MAX_CONSECUTIVE_ERRORS + 2;
      for (let i = 0; i < allowed; i += 1) {
        await Promise.race([session.events.next(), flushAll(2)]);
        jest.advanceTimersByTime(SD_PROGRESS_POLL_MIN_INTERVAL_MS);
      }
      session.stop();
      expect(httpGetMock.mock.calls.length).toBeGreaterThanOrEqual(1);
    });

    it('isolates sessions: stop on one does not affect another', () => {
      httpGetMock.mockResolvedValue({ progress: 0, state: {} });
      const s1 = adapter.start({ sdUrl: 'http://sd:7860', runId: 'r1', totalSteps: 12 });
      const s2 = adapter.start({ sdUrl: 'http://sd:7860', runId: 'r2', totalSteps: 12 });
      s1.stop();
      s2.stop();
      expect(s1.nextSequence).not.toBe(s2.nextSequence);
    });
  });

  describe('cancel', () => {
    it('POSTs to /sdapi/v1/interrupt', async () => {
      httpPostMock.mockResolvedValueOnce({});
      await adapter.cancel('http://sd:7860');
      expect(httpPostMock).toHaveBeenCalledWith(
        'http://sd:7860/sdapi/v1/interrupt',
        {},
        expect.objectContaining({ timeout: expect.any(Number) }),
      );
    });

    it('propagates HTTP failures', async () => {
      httpPostMock.mockRejectedValueOnce(new Error('boom'));
      await expect(adapter.cancel('http://sd:7860')).rejects.toThrow('boom');
    });
  });

  describe('emitArtifactSaved', () => {
    it('produces an ARTIFACT_SAVED envelope at exact 100% confidence', async () => {
      const evt = await adapter.emitArtifactSaved({
        runId: 'run-x',
        sdUrl: 'http://sd:7860',
        totalSteps: 12,
        sequence: 42,
        startedAtMs: Date.now() - 1000,
        artifactId: 'art-x',
      });
      expect(evt.eventType).toBe(RuntimeProgressEventType.ARTIFACT_SAVED);
      expect(evt.stage).toBe(RuntimeProgressStage.SAVING);
      expect(evt.metrics?.progressPercent).toBe(100);
      expect(evt.metrics?.progressConfidence).toBe(RuntimeProgressConfidence.EXACT);
      expect(evt.sequence).toBe(42);
      expect(evt.artifactId).toBe('art-x');
    });
  });
});
