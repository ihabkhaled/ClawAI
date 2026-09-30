import { VideoFailureCode } from '../../../common/enums';

/**
 * The English sentence stored beside each failure code. Fixed strings, never the
 * provider's own text: an upstream message can carry a prompt or a key fragment,
 * and this string is persisted and returned to the browser. The provider's detail
 * goes to the log instead. The frontend renders the translated sentence for the
 * code and falls back to this one only for a code it does not know.
 */
// A Map, not a Record: bracket access on a Record trips security/detect-object-injection.
export const VIDEO_FAILURE_MESSAGES: ReadonlyMap<VideoFailureCode, string> = new Map([
  [VideoFailureCode.PROVIDER_FAILURE, 'Video generation failed. Please try again.'],
  [
    VideoFailureCode.PROVIDER_AUTH_FAILED,
    'The video provider rejected the connector credentials for this model. An administrator needs to check the API key and its access.',
  ],
  [
    VideoFailureCode.PROVIDER_QUOTA_EXCEEDED,
    'The video provider refused the request because the account quota or billing limit was reached.',
  ],
  [
    VideoFailureCode.PROVIDER_REJECTED,
    'The video provider rejected the request for this model. Try another video model.',
  ],
  [
    VideoFailureCode.PROVIDER_UNAVAILABLE,
    'The video provider is not responding right now. Try again in a moment.',
  ],
  [
    VideoFailureCode.MODEL_UNAVAILABLE,
    'This video model is not available from the provider any more. Pick another video model.',
  ],
  [
    VideoFailureCode.CONTENT_REJECTED,
    'The video provider declined this prompt under its content policy. Rephrase the request and try again.',
  ],
  [
    VideoFailureCode.NO_VIDEO_RETURNED,
    'The model finished without producing a video. Rephrase the request and try again.',
  ],
  [
    VideoFailureCode.CONNECTOR_NOT_CONFIGURED,
    'No connector is configured for this video provider. An administrator needs to add one.',
  ],
  [
    VideoFailureCode.STORAGE_FAILED,
    'The video was generated but could not be saved. Try again in a moment.',
  ],
  [
    VideoFailureCode.GENERATION_TIMED_OUT,
    'The video provider did not finish in time. Try a shorter clip or try again.',
  ],
  [
    VideoFailureCode.GENERATION_INTERRUPTED,
    'The video generation was interrupted before it finished. You were not charged; try again.',
  ],
  [
    VideoFailureCode.VIDEO_TOO_LARGE,
    'The generated video is too large to save. Try a shorter clip.',
  ],
]);

export function videoFailureMessage(code: VideoFailureCode): string {
  return VIDEO_FAILURE_MESSAGES.get(code) ?? 'Video generation failed. Please try again.';
}

/** Lower-cased fragments that mark a provider refusal as a content-policy block. */
export const VIDEO_CONTENT_POLICY_MARKERS: readonly string[] = [
  'content_policy',
  'content policy',
  'safety',
  'moderation',
  'blocked',
  'prohibited',
  'responsible ai',
  'sensitive',
];

/** Lower-cased fragments that mark a 400/404 as "this model does not exist here". */
export const VIDEO_MODEL_MISSING_MARKERS: readonly string[] = [
  'does not exist',
  'not found',
  'is not supported',
  'unknown model',
  'model not found',
];

/** Lower-cased fragments of an auth refusal that arrives as a 400. */
export const VIDEO_AUTH_FAILURE_MARKERS: readonly string[] = [
  'api key not valid',
  'api_key_invalid',
  'invalid api key',
  'incorrect api key',
];
