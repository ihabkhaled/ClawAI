import { BusinessException } from '../../../common/errors';
import {
  IMAGE_CREDIT_FAILURE_CODES,
  IMAGE_CREDIT_FAILURE_MESSAGE,
} from '../constants/image-payg.constants';
import {
  IMAGE_CHAIN_TERMINAL_FAILURE_CODES,
  imageFailureMessage,
} from '../constants/image-failure.constants';
import { ImageFailureCode } from '../../../common/enums';
import { type ImageFailureDescription } from '../types/image-generation.types';

function isImageFailureCode(code: string): code is ImageFailureCode {
  return Object.values<string>(ImageFailureCode).includes(code);
}

/**
 * True when no other provider in the AUTO fallback chain could do better —
 * storage is shared, so every further attempt would pay for an image and lose
 * it the same way.
 */
export function isChainTerminalFailureCode(errorCode: string | null | undefined): boolean {
  return typeof errorCode === 'string' && IMAGE_CHAIN_TERMINAL_FAILURE_CODES.includes(errorCode);
}

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
  return errorCode === null || errorCode === undefined ? false : IMAGE_CREDIT_FAILURE_CODES.includes(errorCode);
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
 * A classified failure (see `ImageFailureCode`) stores the FIXED sentence for
 * its code, never the provider's own words: a raw upstream message can carry a
 * prompt, a URL or a key fragment, and this string is persisted and streamed to
 * the browser. Anything unclassified keeps the generic copy.
 */
export function describeImageFailure(error: unknown): ImageFailureDescription {
  if (error instanceof BusinessException && isCreditFailureCode(error.code)) {
    return {
      errorCode: error.code,
      errorMessage: IMAGE_CREDIT_FAILURE_MESSAGE,
      isCreditFailure: true,
    };
  }
  return error instanceof BusinessException && isImageFailureCode(error.code)
    ? {
        errorCode: error.code,
        errorMessage: imageFailureMessage(error.code),
        isCreditFailure: false,
      }
    : {
        errorCode: ImageFailureCode.PROVIDER_FAILURE,
        errorMessage: imageFailureMessage(ImageFailureCode.PROVIDER_FAILURE),
        isCreditFailure: false,
      };
}
