import { AudioFailureCode } from '../../../common/enums';

/**
 * The English sentence stored beside each failure code: fixed strings, never the
 * provider's own text (it can carry a prompt or a key fragment, and this string is
 * persisted and returned to the browser). The provider's detail goes to the log.
 */
// A Map, not a Record: bracket access on a Record trips security/detect-object-injection.
export const AUDIO_FAILURE_MESSAGES: ReadonlyMap<AudioFailureCode, string> = new Map([
  [AudioFailureCode.PROVIDER_FAILURE, 'Audio generation failed. Please try again.'],
  [
    AudioFailureCode.PROVIDER_AUTH_FAILED,
    'The audio provider rejected the connector credentials for this model. An administrator needs to check the API key and its access.',
  ],
  [
    AudioFailureCode.PROVIDER_QUOTA_EXCEEDED,
    'The audio provider refused the request because the account quota or billing limit was reached.',
  ],
  [
    AudioFailureCode.PROVIDER_CREDITS_DEPLETED,
    'The audio provider account has no prepaid credit left, so it refused the request. An administrator needs to top up that account.',
  ],
  [
    AudioFailureCode.PROVIDER_REJECTED,
    'The audio provider rejected the request for this model. Try another audio model.',
  ],
  [
    AudioFailureCode.PROVIDER_UNAVAILABLE,
    'The audio provider is not responding right now. Try again in a moment.',
  ],
  [
    AudioFailureCode.MODEL_UNAVAILABLE,
    'This audio model is not available from the provider any more. Pick another audio model.',
  ],
  [
    AudioFailureCode.CONTENT_REJECTED,
    'The audio provider declined this text under its content policy. Rephrase the request and try again.',
  ],
  [
    AudioFailureCode.NO_AUDIO_RETURNED,
    'The model finished without producing audio. Rephrase the request and try again.',
  ],
  [
    AudioFailureCode.CONNECTOR_NOT_CONFIGURED,
    'No connector is configured for this audio provider. An administrator needs to add one.',
  ],
  [
    AudioFailureCode.STORAGE_FAILED,
    'The audio was generated but could not be saved. Try again in a moment.',
  ],
  [
    AudioFailureCode.GENERATION_TIMED_OUT,
    'The audio provider did not finish in time. Try shorter text or try again.',
  ],
  [
    AudioFailureCode.GENERATION_INTERRUPTED,
    'The audio generation was interrupted before it finished. You were not charged; try again.',
  ],
  [AudioFailureCode.AUDIO_TOO_LARGE, 'The generated audio is too large to save. Try shorter text.'],
]);

export function audioFailureMessage(code: AudioFailureCode): string {
  return AUDIO_FAILURE_MESSAGES.get(code) ?? 'Audio generation failed. Please try again.';
}

export const AUDIO_CONTENT_POLICY_MARKERS: readonly string[] = [
  'content_policy',
  'content policy',
  'safety',
  'moderation',
  'blocked',
  'prohibited',
  'recitation',
];

export const AUDIO_MODEL_MISSING_MARKERS: readonly string[] = [
  'does not exist',
  'not found',
  'is not supported',
  'unknown model',
  'model not found',
];

export const AUDIO_AUTH_FAILURE_MARKERS: readonly string[] = [
  'api key not valid',
  'api_key_invalid',
  'invalid api key',
  'incorrect api key',
];

export const AUDIO_CREDITS_DEPLETED_MARKERS: readonly string[] = [
  'prepayment credits',
  'credits are depleted',
  'used all available credits',
];

export const AUDIO_QUOTA_MARKERS: readonly string[] = [
  'used all available credits',
  'spending limit',
  'insufficient credit',
  'insufficient_quota',
  'exceeded your current quota',
];
