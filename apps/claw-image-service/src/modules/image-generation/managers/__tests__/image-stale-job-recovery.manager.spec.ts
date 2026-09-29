import { type Mock, vi } from 'vitest';
import { Logger } from '@nestjs/common';
import { EventPattern } from '@claw/shared-types';
import type { RabbitMQService } from '@claw/shared-rabbitmq';

import { ImageGenerationStatus } from '../../../../generated/prisma';
import { ImageFailureCode } from '../../../../common/enums';
import { imageFailureMessage } from '../../constants/image-failure.constants';
import {
  IMAGE_BOOT_RECOVERY_GRACE_MS,
  IMAGE_LONGEST_PROVIDER_DEADLINE_MS,
  IMAGE_STALE_JOB_THRESHOLD_MS,
  IMAGE_STALE_SWEEP_BATCH_SIZE,
  IMAGE_STALE_SWEEP_INTERVAL_MS,
} from '../../constants/image-stale-recovery.constants';
import type { ImageGenerationRepository } from '../../repositories/image-generation.repository';
import type { ImageGenerationEventsService } from '../../services/image-generation-events.service';
import type { ImageStaleJobRecord } from '../../types/image-stale-recovery.types';
import { abandonedHold } from '../../utilities/image-settlement.utility';
import type { ImageExecutionManager } from '../image-execution.manager';
import { ImageStaleJobRecoveryManager } from '../image-stale-job-recovery.manager';

type Harness = {
  manager: ImageStaleJobRecoveryManager;
  findStaleActive: Mock;
  timeOutIfStale: Mock;
  createEvent: Mock;
  releaseAbandoned: Mock;
  publishSse: Mock;
  publishBus: Mock;
};

const NOW = new Date('2026-09-29T12:00:00.000Z');

function staleRow(overrides: Partial<ImageStaleJobRecord> = {}): ImageStaleJobRecord {
  return {
    id: 'gen-stale',
    userId: 'user-1',
    prompt: 'a red fox',
    provider: 'OPENAI',
    model: 'gpt-image-1',
    status: ImageGenerationStatus.GENERATING,
    paygReservationId: 'res-1',
    ...overrides,
  };
}

function build(): Harness {
  const findStaleActive = vi.fn().mockResolvedValue([]);
  const timeOutIfStale = vi.fn().mockImplementation(async (id: string) => ({ id }));
  const createEvent = vi.fn().mockResolvedValue(undefined);
  const releaseAbandoned = vi.fn().mockResolvedValue(undefined);
  const publishSse = vi.fn();
  const publishBus = vi.fn().mockResolvedValue(undefined);
  const manager = new ImageStaleJobRecoveryManager(
    {
      findStaleActive,
      timeOutIfStale,
      createEvent,
    } as Partial<ImageGenerationRepository> as ImageGenerationRepository,
    { releaseAbandoned } as Partial<ImageExecutionManager> as ImageExecutionManager,
    {
      publish: publishSse,
    } as Partial<ImageGenerationEventsService> as ImageGenerationEventsService,
    { publish: publishBus } as Partial<RabbitMQService> as RabbitMQService,
  );
  return {
    manager,
    findStaleActive,
    timeOutIfStale,
    createEvent,
    releaseAbandoned,
    publishSse,
    publishBus,
  };
}

describe('ImageStaleJobRecoveryManager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('threshold sits above the slowest provider deadline', () => {
    expect(IMAGE_STALE_JOB_THRESHOLD_MS).toBeGreaterThan(IMAGE_LONGEST_PROVIDER_DEADLINE_MS);
  });

  it('times out a stale row, releases its hold and emits SSE + image.failed', async () => {
    const h = build();
    h.findStaleActive.mockResolvedValue([staleRow()]);

    const recovered = await h.manager.sweep(IMAGE_STALE_JOB_THRESHOLD_MS);

    const cutoff = new Date(NOW.getTime() - IMAGE_STALE_JOB_THRESHOLD_MS);
    const errorCode = ImageFailureCode.GENERATION_INTERRUPTED;
    const errorMessage = imageFailureMessage(errorCode);
    expect(recovered).toBe(1);
    expect(h.findStaleActive).toHaveBeenCalledWith(cutoff, IMAGE_STALE_SWEEP_BATCH_SIZE);
    expect(h.timeOutIfStale).toHaveBeenCalledWith('gen-stale', cutoff, { errorCode, errorMessage });
    expect(h.releaseAbandoned).toHaveBeenCalledWith('res-1', 'gen-stale');
    expect(h.createEvent).toHaveBeenCalledWith({
      generationId: 'gen-stale',
      status: ImageGenerationStatus.TIMED_OUT,
      payloadJson: { errorCode, errorMessage },
    });
    expect(h.publishSse).toHaveBeenCalledWith({
      generationId: 'gen-stale',
      status: ImageGenerationStatus.TIMED_OUT,
      provider: 'OPENAI',
      model: 'gpt-image-1',
      errorCode,
      errorMessage,
    });
    expect(h.publishBus).toHaveBeenCalledWith(
      EventPattern.IMAGE_FAILED,
      expect.objectContaining({ generationId: 'gen-stale', userId: 'user-1', errorCode }),
    );
  });

  it('a row with no hold (local provider) is timed out without a release', async () => {
    const h = build();
    h.findStaleActive.mockResolvedValue([staleRow({ paygReservationId: null })]);

    expect(await h.manager.sweep(IMAGE_STALE_JOB_THRESHOLD_MS)).toBe(1);
    expect(h.releaseAbandoned).not.toHaveBeenCalled();
    expect(h.publishSse).toHaveBeenCalledTimes(1);
  });

  it('leaves fresh rows alone (none returned for the cutoff)', async () => {
    const h = build();

    expect(await h.manager.sweep(IMAGE_STALE_JOB_THRESHOLD_MS)).toBe(0);
    expect(h.timeOutIfStale).not.toHaveBeenCalled();
    expect(h.publishSse).not.toHaveBeenCalled();
  });

  it('a row that became terminal concurrently is untouched: no release, no events', async () => {
    const h = build();
    h.findStaleActive.mockResolvedValue([staleRow()]);
    h.timeOutIfStale.mockResolvedValue(null);

    expect(await h.manager.sweep(IMAGE_STALE_JOB_THRESHOLD_MS)).toBe(0);
    expect(h.releaseAbandoned).not.toHaveBeenCalled();
    expect(h.createEvent).not.toHaveBeenCalled();
    expect(h.publishSse).not.toHaveBeenCalled();
    expect(h.publishBus).not.toHaveBeenCalled();
  });

  it('never throws when the database read fails', async () => {
    const h = build();
    h.findStaleActive.mockRejectedValue(new Error('db down'));

    await expect(h.manager.sweep(IMAGE_STALE_JOB_THRESHOLD_MS)).resolves.toBe(0);
  });

  it('is single-flight: an overlapping sweep is skipped', async () => {
    const h = build();
    let finish: (rows: ImageStaleJobRecord[]) => void = () => {};
    h.findStaleActive.mockReturnValue(
      new Promise<ImageStaleJobRecord[]>((resolve) => {
        finish = resolve;
      }),
    );

    const first = h.manager.sweep(IMAGE_STALE_JOB_THRESHOLD_MS);
    expect(await h.manager.sweep(IMAGE_STALE_JOB_THRESHOLD_MS)).toBe(0);
    finish([]);
    await first;
    expect(h.findStaleActive).toHaveBeenCalledTimes(1);
  });

  it('boot sweeps with the short grace, then ticks on the interval until destroyed', async () => {
    const h = build();

    await h.manager.onApplicationBootstrap();
    expect(h.findStaleActive).toHaveBeenLastCalledWith(
      new Date(NOW.getTime() - IMAGE_BOOT_RECOVERY_GRACE_MS),
      IMAGE_STALE_SWEEP_BATCH_SIZE,
    );

    await vi.advanceTimersByTimeAsync(IMAGE_STALE_SWEEP_INTERVAL_MS);
    expect(h.findStaleActive).toHaveBeenCalledTimes(2);
    expect(h.findStaleActive).toHaveBeenLastCalledWith(
      new Date(NOW.getTime() + IMAGE_STALE_SWEEP_INTERVAL_MS - IMAGE_STALE_JOB_THRESHOLD_MS),
      IMAGE_STALE_SWEEP_BATCH_SIZE,
    );

    h.manager.onModuleDestroy();
    await vi.advanceTimersByTimeAsync(IMAGE_STALE_SWEEP_INTERVAL_MS * 3);
    expect(h.findStaleActive).toHaveBeenCalledTimes(2);
  });

  it('abandonedHold rebuilds a metered hold from the reservation id alone', () => {
    expect(abandonedHold('res-9')).toEqual(
      expect.objectContaining({ metered: true, reservationId: 'res-9' }),
    );
  });
});
