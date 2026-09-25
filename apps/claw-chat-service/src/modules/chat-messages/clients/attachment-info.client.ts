import { Injectable, Logger } from '@nestjs/common';

import { AppConfig } from '../../../app/config/app.config';
import { buildInterServiceAuthHeader, httpRequest } from '../../../common/utilities';
import {
  ATTACHMENT_LOOKUP_TIMEOUT_MS,
  FILE_INGESTION_STATE_PATH,
  FILE_TEXT_ONLY_CONTENT_PATH,
} from '../constants/attachment-modality.constants';
import type { FileIngestionStateWire } from '../types/attachment-modality.types';
import type { FileContentResponse } from '../types/context.types';

/**
 * Small, bounded reads of a turn's attachments BEFORE the turn is routed
 * (multimodal batch 8): their mime types, for AUTO's modality fit, and their
 * derived text without the bytes, for the research planner's digest.
 *
 * Owner-checked by file-service (the user id travels with every call). Never
 * throws: a file that cannot be read in time is simply left out, and the
 * turn is routed exactly as it would have been without the attachment
 * signal.
 */
@Injectable()
export class AttachmentInfoClient {
  private readonly logger = new Logger(AttachmentInfoClient.name);

  /** The attachments' mime types, in order; unreadable ones left out. */
  async mimeTypes(fileIds: readonly string[], userId: string): Promise<string[]> {
    const answers = await Promise.all(
      fileIds.map(async (fileId) => {
        const data = await this.get<FileIngestionStateWire>(
          FILE_INGESTION_STATE_PATH,
          fileId,
          userId,
        );
        return typeof data?.mimeType === 'string' ? data.mimeType : null;
      }),
    );
    return answers.filter((mime): mime is string => mime !== null);
  }

  /** The attachments' derived text (transcript, OCR, document) without their bytes. */
  async textOnly(fileIds: readonly string[], userId: string): Promise<FileContentResponse[]> {
    const answers = await Promise.all(
      fileIds.map(async (fileId) =>
        this.get<FileContentResponse>(FILE_TEXT_ONLY_CONTENT_PATH, fileId, userId),
      ),
    );
    return answers.filter(
      (file): file is FileContentResponse =>
        file !== null && typeof file.filename === 'string' && typeof file.mimeType === 'string',
    );
  }

  private async get<T>(path: string, fileId: string, userId: string): Promise<T | null> {
    try {
      const response = await httpRequest<T>({
        url: `${AppConfig.get().FILE_SERVICE_URL}${path
          .replace('{FILE_ID}', encodeURIComponent(fileId))
          .replace('{USER_ID}', encodeURIComponent(userId))}`,
        method: 'GET',
        headers: { Authorization: buildInterServiceAuthHeader() },
        timeoutMs: ATTACHMENT_LOOKUP_TIMEOUT_MS,
      });
      return response.ok ? response.data : null;
    } catch (error: unknown) {
      this.logger.warn(
        `get: fileId=${fileId} unavailable — ${error instanceof Error ? error.name : 'error'}`,
      );
      return null;
    }
  }
}
