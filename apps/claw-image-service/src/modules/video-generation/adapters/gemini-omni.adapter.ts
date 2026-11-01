import { Logger } from '@nestjs/common';
import { declaredHost } from '@claw/shared-utilities';
import { httpPost } from '@common/utilities';

import { VideoFailureCode } from '../../../common/enums';
import {
  VIDEO_OMNI_REQUEST_TIMEOUT_MS,
  VIDEO_RESOLUTION,
} from '../constants/video-generation.constants';
import type {
  OmniInteractionResponse,
  VideoPollResult,
  VideoProviderConfig,
  VideoStartRequest,
} from '../types/video-generation.types';
import { toVideoProviderException, videoFailure } from '../utilities/video-provider-error.utility';
import { OmniClipStore } from '../utilities/omni-clip-store.utility';
import {
  omniInput,
  veoAuthHeaders,
  veoBareModel,
  veoBase,
} from '../utilities/video-provider-wire.utility';

const logger = new Logger('GeminiOmniAdapter');

/**
 * Gemini Omni video through the Interactions API (`POST /interactions`), which replaced
 * Veo 3.1 (shut down 2026-10-22). The call is synchronous: the reply carries the clip as
 * base64 in `steps[model_output].content[video].data`. So `start` does the whole call and
 * keeps the bytes for the poll and download that follow; a restart in between loses the
 * clip and the job ends with NO_VIDEO_RETURNED, never a charge for it.
 */
export const startOmni = async (
  config: VideoProviderConfig,
  request: VideoStartRequest,
): Promise<string> => {
  const base = veoBase(config);
  const model = veoBareModel(request.model);
  logger.log(`start: model=${model} seconds=${String(request.durationSeconds)}`);
  let response: OmniInteractionResponse;
  try {
    response = await httpPost<OmniInteractionResponse>(
      `${base}/interactions`,
      {
        model,
        input: omniInput(request),
        response_format: {
          type: 'video',
          aspect_ratio: request.aspectRatio,
          resolution: VIDEO_RESOLUTION,
        },
      },
      { headers: veoAuthHeaders(config), timeout: VIDEO_OMNI_REQUEST_TIMEOUT_MS },
      declaredHost(base),
    );
  } catch (error: unknown) {
    throw toVideoProviderException(error, 'Gemini');
  }
  const clip = (response.steps ?? [])
    .filter((step) => step.type === 'model_output')
    .flatMap((step) => step.content ?? [])
    .find((part) => part.type === 'video' && part.data !== undefined && part.data.length > 0);
  if (clip?.data === undefined) {
    throw videoFailure(VideoFailureCode.NO_VIDEO_RETURNED, 'Gemini returned no video');
  }
  return OmniClipStore.put(Buffer.from(clip.data, 'base64'));
};

export const pollOmni = (operationId: string): VideoPollResult =>
  OmniClipStore.has(operationId)
    ? { state: 'DONE', downloadUrl: operationId }
    : {
        state: 'FAILED',
        code: VideoFailureCode.NO_VIDEO_RETURNED,
        detail: 'The finished clip is no longer held by this service',
      };

export const downloadOmni = (operationId: string): Buffer => {
  const bytes = OmniClipStore.take(operationId);
  if (bytes === undefined) {
    throw videoFailure(VideoFailureCode.NO_VIDEO_RETURNED, 'The finished clip is gone');
  }
  return bytes;
};
