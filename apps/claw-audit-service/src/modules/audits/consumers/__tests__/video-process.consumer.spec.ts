import { type Mock, vi } from 'vitest';
import {
  EventPattern,
  type FileVideoProcessCompletedPayload,
  type FileVideoProcessFailedPayload,
  type FileVideoProcessRequestedPayload,
  VideoAudioStatus,
  VideoProcessingFailureReason,
} from '@claw/shared-types';

import type { RabbitMQService } from '@claw/shared-rabbitmq';
import type { AuditsService } from '../../services/audits.service';
import { VideoProcessAuditConsumer } from '../video-process.consumer';

type Handler = (raw: unknown) => Promise<void>;

function build(): {
  consumer: VideoProcessAuditConsumer;
  createAuditLog: Mock;
  subscribe: Mock;
} {
  const createAuditLog = vi.fn().mockResolvedValue({});
  const subscribe = vi.fn().mockResolvedValue(undefined);
  const rabbit = { subscribe } as Partial<RabbitMQService> as RabbitMQService;
  const audits = { createAuditLog } as Partial<AuditsService> as AuditsService;
  return { consumer: new VideoProcessAuditConsumer(rabbit, audits), createAuditLog, subscribe };
}

function handlerFor(subscribe: Mock, pattern: string): Handler {
  const call = subscribe.mock.calls.find((c) => c[0] === pattern);
  if (call === undefined) throw new Error(`no subscription for ${pattern}`);
  return call[1] as Handler;
}

const requested: FileVideoProcessRequestedPayload = {
  timestamp: '2026-09-29T00:00:00.000Z',
  fileId: 'file-1',
  userId: 'user-1',
  filename: 'secret-board-meeting.mp4',
  mimeType: 'video/mp4',
};

const completed: FileVideoProcessCompletedPayload = {
  timestamp: '2026-09-29T00:00:00.000Z',
  fileId: 'file-1',
  userId: 'user-1',
  durationMs: 60_000,
  hasAudio: true,
  audioStatus: VideoAudioStatus.TRANSCRIBED,
  transcriptSegmentCount: 12,
  processingMs: 4_200,
};

const failed: FileVideoProcessFailedPayload = {
  timestamp: '2026-09-29T00:00:00.000Z',
  fileId: 'file-1',
  userId: 'user-1',
  reasonCode: VideoProcessingFailureReason.DURATION_TOO_LONG,
  reason: 'Video secret-board-meeting.mp4 is longer than allowed',
};

describe('VideoProcessAuditConsumer', () => {
  it('subscribes to the three file.video_process_* patterns', async () => {
    const { consumer, subscribe } = build();
    await consumer.onModuleInit();
    expect(subscribe.mock.calls.map((c) => c[0])).toEqual([
      EventPattern.FILE_VIDEO_PROCESS_REQUESTED,
      EventPattern.FILE_VIDEO_PROCESS_COMPLETED,
      EventPattern.FILE_VIDEO_PROCESS_FAILED,
    ]);
  });

  it('requested → LOW file row without the filename', async () => {
    const { consumer, subscribe, createAuditLog } = build();
    await consumer.onModuleInit();
    await handlerFor(subscribe, EventPattern.FILE_VIDEO_PROCESS_REQUESTED)(requested);
    expect(createAuditLog).toHaveBeenCalledWith({
      userId: 'user-1',
      action: 'file.video_process_requested',
      entityType: 'file',
      entityId: 'file-1',
      severity: 'LOW',
      details: { mimeType: 'video/mp4' },
    });
    expect(JSON.stringify(createAuditLog.mock.calls)).not.toContain('secret-board-meeting');
  });

  it('completed → LOW file row with structural facts only', async () => {
    const { consumer, subscribe, createAuditLog } = build();
    await consumer.onModuleInit();
    await handlerFor(subscribe, EventPattern.FILE_VIDEO_PROCESS_COMPLETED)(completed);
    expect(createAuditLog).toHaveBeenCalledWith({
      userId: 'user-1',
      action: 'file.video_process_completed',
      entityType: 'file',
      entityId: 'file-1',
      severity: 'LOW',
      details: {
        durationMs: 60_000,
        hasAudio: true,
        audioStatus: VideoAudioStatus.TRANSCRIBED,
        transcriptSegmentCount: 12,
        processingMs: 4_200,
      },
    });
  });

  it('failed → ERROR row with the reason code, never the free-text reason', async () => {
    const { consumer, subscribe, createAuditLog } = build();
    await consumer.onModuleInit();
    await handlerFor(subscribe, EventPattern.FILE_VIDEO_PROCESS_FAILED)(failed);
    expect(createAuditLog).toHaveBeenCalledWith({
      userId: 'user-1',
      action: 'file.video_process_failed',
      entityType: 'file',
      entityId: 'file-1',
      severity: 'ERROR',
      details: { reasonCode: VideoProcessingFailureReason.DURATION_TOO_LONG },
    });
    expect(JSON.stringify(createAuditLog.mock.calls)).not.toContain('secret-board-meeting');
  });

  it('swallows an audit write failure so the message is not DLQ-ed', async () => {
    const { consumer, createAuditLog } = build();
    createAuditLog.mockRejectedValueOnce(new Error('mongo down'));
    await expect(consumer.handleFailed(failed)).resolves.toBeUndefined();
  });
});
