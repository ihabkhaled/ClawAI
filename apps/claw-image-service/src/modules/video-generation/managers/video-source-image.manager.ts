import { Injectable, Logger } from '@nestjs/common';
import { buildInterServiceAuthHeader, httpGet } from '@common/utilities';

import { AppConfig } from '../../../app/config/app.config';
import { VideoFailureCode } from '../../../common/enums';
import { IMAGE_REFERENCE_CONTENT_PATH } from '../../image-generation/constants/image-reference.constants';
import { VIDEO_SOURCE_IMAGE_FETCH_TIMEOUT_MS } from '../constants/video-generation.constants';
import type { VideoSourceFileResponse, VideoSourceImage } from '../types/video-generation.types';
import { videoFailure } from '../utilities/video-provider-error.utility';
import { toVideoSourceImage } from '../utilities/video-source-image.utility';

/**
 * Reads the image an image-to-video job starts from (ADR-137, image-to-video).
 *
 * The bytes come from file-service's owner-checked internal read: it answers 404
 * unless `userId` owns the file, so a stranger's file id is refused here exactly as
 * a missing one is, and the caller learns nothing about which it was. Every miss
 * (not the user's, deleted, wrong type, too large, service down) is the one
 * `SOURCE_IMAGE_INVALID` failure: generating without the image would quietly turn
 * "animate this" into an unrelated clip.
 */
@Injectable()
export class VideoSourceImageManager {
  private readonly logger = new Logger(VideoSourceImageManager.name);

  async load(fileId: string, userId: string): Promise<VideoSourceImage> {
    const config = AppConfig.get();
    const url = `${config.FILE_SERVICE_URL}${IMAGE_REFERENCE_CONTENT_PATH}/${encodeURIComponent(fileId)}/content?userId=${encodeURIComponent(userId)}`;
    let file: VideoSourceFileResponse;
    try {
      file = await httpGet<VideoSourceFileResponse>(url, {
        timeout: VIDEO_SOURCE_IMAGE_FETCH_TIMEOUT_MS,
        headers: { Authorization: buildInterServiceAuthHeader() },
      });
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.message : 'unknown error';
      this.logger.warn(`load: file-service refused fileId=${fileId} — ${detail}`);
      throw videoFailure(VideoFailureCode.SOURCE_IMAGE_INVALID, detail);
    }
    const image = toVideoSourceImage(file);
    if (image === null) {
      this.logger.warn(`load: unusable source image fileId=${fileId} mimeType=${file.mimeType}`);
      throw videoFailure(VideoFailureCode.SOURCE_IMAGE_INVALID, 'type, size or content refused');
    }
    return image;
  }
}
