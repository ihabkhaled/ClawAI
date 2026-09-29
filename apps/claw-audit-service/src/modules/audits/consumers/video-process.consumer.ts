import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import {
  EventPattern,
  type FileVideoProcessCompletedPayload,
  type FileVideoProcessFailedPayload,
  type FileVideoProcessRequestedPayload,
} from '@claw/shared-types';

import { AuditsService } from '../services/audits.service';
import {
  VIDEO_PROCESS_AUDIT_ACTIONS,
  VIDEO_PROCESS_AUDIT_ENTITY_TYPE,
} from '../constants/video-process-audit.constants';
import { type VideoProcessAuditRow } from '../types/video-process-audit.types';

/**
 * Audits file-service's video pipeline (`file.video_process_*`). Details carry
 * only structural facts — never the filename, the transcript, or the free-text
 * failure reason (which can echo user content); the `reasonCode` enum is enough.
 *
 * Like the other file handlers, a failed audit write is logged and swallowed:
 * rethrowing would DLQ an event whose side-effect already happened.
 */
@Injectable()
export class VideoProcessAuditConsumer implements OnModuleInit {
  private readonly logger = new Logger(VideoProcessAuditConsumer.name);

  constructor(
    private readonly rabbitmq: RabbitMQService,
    private readonly audits: AuditsService,
  ) {}

  async onModuleInit(): Promise<void> {
    const entries: Array<[string, (raw: unknown) => Promise<void>]> = [
      [
        EventPattern.FILE_VIDEO_PROCESS_REQUESTED,
        (raw) => this.handleRequested(raw as FileVideoProcessRequestedPayload),
      ],
      [
        EventPattern.FILE_VIDEO_PROCESS_COMPLETED,
        (raw) => this.handleCompleted(raw as FileVideoProcessCompletedPayload),
      ],
      [
        EventPattern.FILE_VIDEO_PROCESS_FAILED,
        (raw) => this.handleFailed(raw as FileVideoProcessFailedPayload),
      ],
    ];
    for (const [pattern, handler] of entries) {
      await this.rabbitmq.subscribe(pattern, handler);
      this.logger.log(`Subscribed to event: ${pattern}`);
    }
  }

  async handleRequested(payload: FileVideoProcessRequestedPayload): Promise<void> {
    await this.write({
      userId: payload.userId,
      action: VIDEO_PROCESS_AUDIT_ACTIONS.REQUESTED,
      entityId: payload.fileId,
      severity: 'LOW',
      details: { mimeType: payload.mimeType },
    });
  }

  async handleCompleted(payload: FileVideoProcessCompletedPayload): Promise<void> {
    await this.write({
      userId: payload.userId,
      action: VIDEO_PROCESS_AUDIT_ACTIONS.COMPLETED,
      entityId: payload.fileId,
      severity: 'LOW',
      details: {
        durationMs: payload.durationMs,
        hasAudio: payload.hasAudio,
        audioStatus: payload.audioStatus,
        transcriptSegmentCount: payload.transcriptSegmentCount,
        processingMs: payload.processingMs,
      },
    });
  }

  async handleFailed(payload: FileVideoProcessFailedPayload): Promise<void> {
    await this.write({
      userId: payload.userId,
      action: VIDEO_PROCESS_AUDIT_ACTIONS.FAILED,
      entityId: payload.fileId,
      severity: 'ERROR',
      details: { reasonCode: payload.reasonCode },
    });
  }

  private async write(row: VideoProcessAuditRow): Promise<void> {
    try {
      await this.audits.createAuditLog({
        userId: row.userId,
        action: row.action,
        entityType: VIDEO_PROCESS_AUDIT_ENTITY_TYPE,
        entityId: row.entityId,
        severity: row.severity,
        details: row.details,
      });
    } catch (error) {
      this.logger.error(
        `${row.action}: audit write failed fileId=${row.entityId} — ${(error as Error).message}`,
      );
    }
  }
}
