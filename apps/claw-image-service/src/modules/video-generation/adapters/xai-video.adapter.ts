import { Logger } from '@nestjs/common';
import { declaredHost } from '@claw/shared-utilities';
import { httpGet, httpPost } from '@common/utilities';

import { VideoFailureCode } from '../../../common/enums';
import { providerImageDownloadHosts } from '../../image-generation/utilities/provider-image-download.utility';
import { VIDEO_CONTENT_POLICY_MARKERS } from '../constants/video-failure.constants';
import {
  VIDEO_DOWNLOAD_TIMEOUT_MS,
  VIDEO_POLL_TIMEOUT_MS,
  VIDEO_RESOLUTION,
  VIDEO_START_TIMEOUT_MS,
} from '../constants/video-generation.constants';
import type {
  VideoPollResult,
  VideoProviderConfig,
  VideoStartRequest,
  XaiVideoPollResponse,
  XaiVideoStartResponse,
} from '../types/video-generation.types';
import { toVideoProviderException, videoFailure } from '../utilities/video-provider-error.utility';
import { xaiAuthHeaders, xaiBase, xaiImageField } from '../utilities/video-provider-wire.utility';

const logger = new Logger('XaiVideoAdapter');

/**
 * Grok Imagine Video through xAI's asynchronous video endpoint.
 *
 * `POST /videos/generations` returns a `request_id`; `GET /videos/{request_id}`
 * answers `pending`, `done` (with `video.url`), `failed` or `expired`. The clip
 * URL is a per-request blob host that cannot be enumerated in advance, so the
 * download is allowed by the "any public host, never a private one" rule the
 * image downloader uses, not by declaring the URL's own host.
 */
export const startXaiVideo = async (
  config: VideoProviderConfig,
  request: VideoStartRequest,
): Promise<string> => {
  logger.log(`start: model=${request.model} seconds=${String(request.durationSeconds)}`);
  try {
    const response = await httpPost<XaiVideoStartResponse>(
      `${xaiBase(config)}/videos/generations`,
      {
        model: request.model,
        prompt: request.prompt,
        duration: request.durationSeconds,
        aspect_ratio: request.aspectRatio,
        resolution: VIDEO_RESOLUTION,
        ...xaiImageField(request),
      },
      { headers: xaiAuthHeaders(config), timeout: VIDEO_START_TIMEOUT_MS },
      declaredHost(xaiBase(config)),
    );
    const id = response.request_id ?? response.id;
    if (id === undefined || id.length === 0) {
      throw videoFailure(VideoFailureCode.NO_VIDEO_RETURNED, 'xAI returned no request id');
    }
    return id;
  } catch (error: unknown) {
    throw toVideoProviderException(error, 'xAI');
  }
};

export const pollXaiVideo = async (
  config: VideoProviderConfig,
  requestId: string,
): Promise<VideoPollResult> => {
  let response: XaiVideoPollResponse;
  try {
    response = await httpGet<XaiVideoPollResponse>(
      `${xaiBase(config)}/videos/${encodeURIComponent(requestId)}`,
      { headers: xaiAuthHeaders(config), timeout: VIDEO_POLL_TIMEOUT_MS },
      declaredHost(xaiBase(config)),
    );
  } catch (error: unknown) {
    throw toVideoProviderException(error, 'xAI');
  }
  const status = (response.status ?? 'pending').toLowerCase();
  if (status === 'done') {
    const url = response.video?.url;
    return url === undefined
      ? {
          state: 'FAILED',
          code: VideoFailureCode.NO_VIDEO_RETURNED,
          detail: 'xAI finished without a video url',
        }
      : {
          state: 'DONE',
          downloadUrl: url,
          ...(response.video?.duration === undefined
            ? {}
            : { durationSeconds: Math.ceil(response.video.duration) }),
        };
  }
  if (status === 'failed' || status === 'expired') {
    const detail =
      typeof response.error === 'string'
        ? response.error
        : (response.error?.message ?? `xAI reported the job as ${status}`);
    const blocked = VIDEO_CONTENT_POLICY_MARKERS.some((marker) =>
      detail.toLowerCase().includes(marker),
    );
    return {
      state: 'FAILED',
      code: blocked ? VideoFailureCode.CONTENT_REJECTED : VideoFailureCode.PROVIDER_FAILURE,
      detail,
    };
  }
  return { state: 'PENDING' };
};

export const downloadXaiVideo = async (
  _config: VideoProviderConfig,
  downloadUrl: string,
): Promise<Buffer> => {
  try {
    const data = await httpGet<ArrayBuffer>(
      downloadUrl,
      {
        timeout: VIDEO_DOWNLOAD_TIMEOUT_MS,
        responseType: 'arraybuffer',
        maxContentLength: Infinity,
      },
      providerImageDownloadHosts(downloadUrl),
    );
    return Buffer.from(data);
  } catch (error: unknown) {
    throw toVideoProviderException(error, 'xAI');
  }
};
