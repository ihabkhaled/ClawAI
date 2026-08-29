import { BusinessException } from '../../../common/errors';
import {
  IMAGE_CREDIT_FAILURE_CODES,
  IMAGE_CREDIT_FAILURE_MESSAGE,
} from '../constants/image-payg.constants';
import { type ImageFailureDescription } from '../types/image-generation.types';

/**
 * True when this generation failed because the wallet refused, not because a
 * provider misbehaved.
 *
 * Reads the stored `errorCode` rather than the live exception so the auto
 * -fallback chain can ask the question about an attempt it did not itself run —
 * `processJob` swallows the error into the row, and the chain only ever sees the
 * row afterwards.
 */
export function isCreditFailureCode(errorCode: string | null | undefined): boolean {
  if (errorCode === null || errorCode === undefined) {
    return false;
  }
  return IMAGE_CREDIT_FAILURE_CODES.includes(errorCode);
}

/**
 * Turns a thrown generation failure into the pair that gets stored on the row
 * and streamed over SSE.
 *
 * The distinction matters because the job is fire-and-forget. There is no HTTP
 * response left to carry a 402, so "you are out of credit" and "the provider
 * broke" have to be told apart HERE or the user sees the same
 * "please try again" for a condition that retrying cannot fix.
 *
 * The provider branch keeps the existing generic copy on purpose: a raw upstream
 * message can carry a prompt, a URL or a key fragment, and this string is
 * persisted and streamed to the browser.
 */
export function describeImageFailure(error: unknown): ImageFailureDescription {
  if (error instanceof BusinessException && isCreditFailureCode(error.code)) {
    return {
      errorCode: error.code,
      errorMessage: IMAGE_CREDIT_FAILURE_MESSAGE,
      isCreditFailure: true,
    };
  }
  return {
    errorCode: 'PROVIDER_FAILURE',
    errorMessage: 'Image generation failed. Please try again.',
    isCreditFailure: false,
  };
}
