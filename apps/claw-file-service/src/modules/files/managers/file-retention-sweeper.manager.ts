// Slice C foundation 3 — file retention sweeper.
//
// Runs on a cron (default 02:00 daily, configurable via FILE_RETENTION_SWEEP_CRON)
// and reaps files whose retentionExpiresAt has passed. For each expired file we
// delete the on-disk blob first, then the DB row, then publish
// EventPattern.FILE_RETENTION_EXPIRED so audit-service can record the action.
//
// Failure model: if disk deletion fails for one file we LOG and LEAVE the DB row
// in place. The next sweep tick will see the same row (retentionExpiresAt is
// still in the past) and retry. This is deliberate — we never want a DB row
// pointing at a non-existent path, but a transient EBUSY/EPERM should not
// strand the rest of the batch.

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import {
  EventPattern,
  type FileDeletedPayload,
  type FileRetentionExpiredPayload,
} from '@claw/shared-types';
import { type File } from '../../../generated/prisma';
import { AppConfig } from '../../../app/config/app.config';
import { deleteFile } from '../../../common/utilities';
import { FilesRepository } from '../repositories/files.repository';

@Injectable()
export class FileRetentionSweeperManager {
  private readonly logger = new Logger(FileRetentionSweeperManager.name);

  constructor(
    private readonly filesRepository: FilesRepository,
    private readonly rabbitMQService: RabbitMQService,
  ) {}

  // Cron expression is read once at module load (NestJS reads the decorator
  // metadata eagerly). Default '0 2 * * *' = every day at 02:00.
  @Cron(AppConfig.get().FILE_RETENTION_SWEEP_CRON)
  async runSweep(): Promise<void> {
    const cutoff = new Date();
    const limit = AppConfig.get().FILE_RETENTION_SWEEP_BATCH_LIMIT;
    this.logger.debug(
      `runSweep: starting — cutoff=${cutoff.toISOString()} batchLimit=${String(limit)}`,
    );

    try {
      const expired = await this.filesRepository.findExpiredBefore(cutoff, limit);
      if (expired.length === 0) {
        this.logger.debug('runSweep: no expired files');
        return;
      }
      let reaped = 0;
      for (const file of expired) {
        const ok = await this.reapOne(file);
        if (ok) {
          reaped += 1;
        }
      }
      this.logger.log(
        `runSweep: completed — candidates=${String(expired.length)} reaped=${String(reaped)}`,
      );
    } catch (error) {
      this.logger.error(`runSweep: failed — ${(error as Error).message}`);
    }
  }

  // Returns true when the file was successfully deleted from disk + DB and
  // the retention-expired event was published. Returns false when disk
  // deletion failed (we leave the DB row in place for the next tick).
  private async reapOne(file: File): Promise<boolean> {
    try {
      deleteFile(file.storagePath);
    } catch (error) {
      this.logger.error(
        `reapOne: disk delete failed fileId=${file.id} path=${file.storagePath} — ${(error as Error).message}`,
      );
      return false;
    }

    await this.filesRepository.deleteById(file.id);

    const payload: FileRetentionExpiredPayload = {
      fileId: file.id,
      userId: file.userId,
      filename: file.filename,
      retentionExpiresAt: (file.retentionExpiresAt ?? new Date()).toISOString(),
      sizeBytes: file.sizeBytes,
      timestamp: new Date().toISOString(),
    };
    void this.rabbitMQService.publish(EventPattern.FILE_RETENTION_EXPIRED, payload);

    // Slice D backend 3 — also publish the canonical FILE_DELETED with
    // reason='RETENTION' so a single audit-side handler covers every delete
    // path. FILE_RETENTION_EXPIRED is kept for backward compat consumers that
    // already depend on the sweep-specific event.
    const deletedPayload: FileDeletedPayload = {
      fileId: file.id,
      userId: file.userId,
      filename: file.filename,
      deletedBy: 'system',
      reason: 'RETENTION',
      timestamp: new Date().toISOString(),
    };
    void this.rabbitMQService.publish(EventPattern.FILE_DELETED, deletedPayload);

    this.logger.debug(`reapOne: reaped fileId=${file.id} filename="${file.filename}"`);
    return true;
  }
}
