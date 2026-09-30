import { Logger } from '@nestjs/common';
import { declaredHost } from '@claw/shared-utilities';
import { httpGet, httpPost } from '@common/utilities';

import { VideoFailureCode } from '../../../common/enums';
import {
  VIDEO_DOWNLOAD_TIMEOUT_MS,
  VIDEO_POLL_TIMEOUT_MS,
  VIDEO_RESOLUTION,
  VIDEO_START_TIMEOUT_MS,
} from '../constants/video-generation.constants';
import type {
  VeoOperation,
  VeoStartResponse,
  VideoPollResult,
  VideoProviderConfig,
  VideoStartRequest,
} from '../types/video-generation.types';
import { veoAuthHeaders, veoBareModel, veoBase } from '../utilities/video-provider-wire.utility';
import { toVideoProviderException, videoFailure } from '../utilities/video-provider-error.utility';
import { VIDEO_CONTENT_POLICY_MARKERS } from '../constants/video-failure.constants';

const logger = new Logger('GeminiVeoAdapter');

/**
 * Veo 3.1 through the Gemini API's long-running `predictLongRunning` call.
 *
 * Start returns an operation name, polled until `done`; the clip is then fetched
 * from `response.generateVideoResponse.generatedSamples[0].video.uri` with the
 * same key header (the file is kept for two days). Text-to-video only, at 720p:
 * 1080p and 4K cost more and need an 8 second clip, and the price this service
 * meters is the 720p one (routing seed v11).
 */
export const startVeo = async (
  config: VideoProviderConfig,
  request: VideoStartRequest,
): Promise<string> => {
  const base = veoBase(config);
  const model = veoBareModel(request.model);
  logger.log(`start: model=${model} seconds=${String(request.durationSeconds)}`);
  try {
    const response = await httpPost<VeoStartResponse>(
      `${base}/models/${encodeURIComponent(model)}:predictLongRunning`,
      {
        instances: [{ prompt: request.prompt }],
        parameters: {
          aspectRatio: request.aspectRatio,
          resolution: VIDEO_RESOLUTION,
          durationSeconds: String(request.durationSeconds),
        },
      },
      { headers: veoAuthHeaders(config), timeout: VIDEO_START_TIMEOUT_MS },
      declaredHost(base),
    );
    if (response.name === undefined || response.name.length === 0) {
      throw videoFailure(VideoFailureCode.NO_VIDEO_RETURNED, 'Gemini returned no operation name');
    }
    return response.name;
  } catch (error: unknown) {
    throw toVideoProviderException(error, 'Gemini');
  }
};

export const pollVeo = async (
  config: VideoProviderConfig,
  operationId: string,
): Promise<VideoPollResult> => {
  const base = veoBase(config);
  let operation: VeoOperation;
  try {
    operation = await httpGet<VeoOperation>(
      `${base}/${operationId}`,
      { headers: veoAuthHeaders(config), timeout: VIDEO_POLL_TIMEOUT_MS },
      declaredHost(base),
    );
  } catch (error: unknown) {
    throw toVideoProviderException(error, 'Gemini');
  }
  if (operation.done !== true) {
    return { state: 'PENDING' };
  }
  if (operation.error !== undefined) {
    const detail = operation.error.message ?? 'Gemini reported an error';
    const blocked = VIDEO_CONTENT_POLICY_MARKERS.some((marker) =>
      detail.toLowerCase().includes(marker),
    );
    return {
      state: 'FAILED',
      code: blocked ? VideoFailureCode.CONTENT_REJECTED : VideoFailureCode.PROVIDER_REJECTED,
      detail,
    };
  }
  const generated = operation.response?.generateVideoResponse;
  const uri = generated?.generatedSamples?.[0]?.video?.uri;
  if (uri === undefined) {
    const reasons = generated?.raiMediaFilteredReasons?.join('; ');
    return {
      state: 'FAILED',
      code:
        (generated?.raiMediaFilteredCount ?? 0) > 0
          ? VideoFailureCode.CONTENT_REJECTED
          : VideoFailureCode.NO_VIDEO_RETURNED,
      detail: reasons ?? 'Gemini finished without a video',
    };
  }
  return { state: 'DONE', downloadUrl: uri };
};

export const downloadVeo = async (
  config: VideoProviderConfig,
  downloadUrl: string,
): Promise<Buffer> => {
  try {
    const data = await httpGet<ArrayBuffer>(
      downloadUrl,
      {
        headers: veoAuthHeaders(config),
        timeout: VIDEO_DOWNLOAD_TIMEOUT_MS,
        responseType: 'arraybuffer',
        maxContentLength: Infinity,
      },
      declaredHost(veoBase(config)),
    );
    return Buffer.from(data);
  } catch (error: unknown) {
    throw toVideoProviderException(error, 'Gemini');
  }
};
