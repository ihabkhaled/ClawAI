import { downloadOmni, pollOmni, startOmni } from '../adapters/gemini-omni.adapter';
import { downloadVeo, pollVeo, startVeo } from '../adapters/gemini-veo.adapter';
import { downloadXaiVideo, pollXaiVideo, startXaiVideo } from '../adapters/xai-video.adapter';
import { OMNI_OPERATION_PREFIX } from './video-generation.constants';
import type { VideoProviderClient } from '../types/video-generation.types';
import { veoBareModel } from '../utilities/video-provider-wire.utility';

/**
 * Gemini video: `gemini-omni-*` goes through the Interactions API, every other id through the
 * Veo long-running call (Veo 3.1 is shut down; the path stays for a future Veo GA id). The
 * operation id says which one made it, so poll and download need no model.
 */
export const geminiVeoClient: VideoProviderClient = {
  start: (config, request) =>
    veoBareModel(request.model).startsWith('gemini-omni')
      ? startOmni(config, request)
      : startVeo(config, request),
  poll: (config, operationId) =>
    Promise.resolve(
      operationId.startsWith(OMNI_OPERATION_PREFIX)
        ? pollOmni(operationId)
        : pollVeo(config, operationId),
    ),
  download: (config, downloadUrl) =>
    Promise.resolve(
      downloadUrl.startsWith(OMNI_OPERATION_PREFIX)
        ? downloadOmni(downloadUrl)
        : downloadVeo(config, downloadUrl),
    ),
};

export const xaiVideoClient: VideoProviderClient = {
  start: startXaiVideo,
  poll: pollXaiVideo,
  download: downloadXaiVideo,
};
