import { Injectable, Logger } from '@nestjs/common';
import { EntityNotFoundException } from '../../../common/errors';
import { FilesRepository } from '../repositories/files.repository';
import { VideoCancellationManager } from '../managers/video-cancellation.manager';
import { type VideoCancelResult } from '../types/video-processing.types';

/**
 * `POST /files/:id/processing/cancel` — the owner stops a video that is still
 * processing (pack section 72). Ownership here, mechanics in
 * `VideoCancellationManager`. A stranger's id and a missing id get the SAME
 * 404, so an id cannot be probed for existence (rules/16).
 */
@Injectable()
export class VideoCancellationService {
  private readonly logger = new Logger(VideoCancellationService.name);

  constructor(
    private readonly filesRepository: FilesRepository,
    private readonly cancellation: VideoCancellationManager,
  ) {}

  async cancelProcessing(fileId: string, userId: string): Promise<VideoCancelResult> {
    const file = await this.filesRepository.findById(fileId);
    if (file?.userId !== userId) {
      this.logger.warn(`cancelProcessing: fileId=${fileId} not found for this user`);
      throw new EntityNotFoundException('File', fileId);
    }
    return this.cancellation.cancel(file);
  }
}
