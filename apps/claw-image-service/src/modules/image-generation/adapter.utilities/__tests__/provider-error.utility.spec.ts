import { ImageFailureCode } from '../../../../common/enums';
import { BusinessException } from '../../../../common/errors';
import {
  extractProviderErrorMessage,
  imageFailure,
  toImageProviderException,
} from '../provider-error.utility';

function httpError(status: number, data: unknown): { response: { status: number; data: unknown } } {
  return { response: { status, data } };
}

describe('extractProviderErrorMessage', () => {
  it('reads the OpenAI / Gemini nested shape', () => {
    expect(extractProviderErrorMessage(httpError(400, { error: { message: 'nested' } }))).toBe(
      'nested',
    );
  });

  it('reads the xAI shape, where `error` is the sentence itself', () => {
    // Captured live from api.x.ai on 2026-09-23 (chat endpoint, image model).
    const body = {
      code: 'invalid-argument',
      error:
        'The model grok-imagine-image is an image model and is therefore not available on this endpoint.',
    };
    expect(extractProviderErrorMessage(httpError(400, body))).toContain('is an image model');
  });

  it('falls back to the transport error message', () => {
    expect(extractProviderErrorMessage(new Error('socket hang up'))).toBe('socket hang up');
  });
});

describe('toImageProviderException', () => {
  it.each([
    [
      httpError(401, { error: { message: 'Incorrect API key provided' } }),
      ImageFailureCode.PROVIDER_AUTH_FAILED,
    ],
    [
      httpError(403, { error: { message: 'organization must be verified' } }),
      ImageFailureCode.PROVIDER_AUTH_FAILED,
    ],
    // Gemini answers a bad key with 400, not 401.
    [
      httpError(400, { error: { message: 'API key not valid. Please pass a valid API key.' } }),
      ImageFailureCode.PROVIDER_AUTH_FAILED,
    ],
    [
      httpError(429, { error: { message: 'Resource has been exhausted (e.g. check quota).' } }),
      ImageFailureCode.PROVIDER_QUOTA_EXCEEDED,
    ],
    [httpError(402, { error: 'Insufficient credits' }), ImageFailureCode.PROVIDER_QUOTA_EXCEEDED],
    [
      httpError(400, { error: { message: "The model 'dall-e-3' does not exist." } }),
      ImageFailureCode.MODEL_UNAVAILABLE,
    ],
    [
      httpError(404, {
        error: { message: 'models/imagen-4.0-generate-001 is not found for API version v1beta' },
      }),
      ImageFailureCode.MODEL_UNAVAILABLE,
    ],
    [
      httpError(400, {
        error: { message: 'Your request was rejected as a result of our safety system.' },
      }),
      ImageFailureCode.CONTENT_REJECTED,
    ],
    [
      httpError(400, {
        error: { code: 'content_policy_violation', message: 'content_policy_violation' },
      }),
      ImageFailureCode.CONTENT_REJECTED,
    ],
    [httpError(400, { error: 'Invalid size' }), ImageFailureCode.PROVIDER_REJECTED],
    [httpError(503, { error: { message: 'overloaded' } }), ImageFailureCode.PROVIDER_UNAVAILABLE],
    [
      Object.assign(new Error('timeout of 120000ms exceeded'), { code: 'ECONNABORTED' }),
      ImageFailureCode.PROVIDER_UNAVAILABLE,
    ],
    [new Error('something odd'), ImageFailureCode.PROVIDER_FAILURE],
  ])('classifies %j as %s', (error, expected) => {
    const exception = toImageProviderException(error, 'Test');
    expect(exception).toBeInstanceOf(BusinessException);
    expect(exception.code).toBe(expected);
  });

  it('keeps the provider detail in the exception message for the log', () => {
    const exception = toImageProviderException(
      httpError(400, { error: { message: "The model 'dall-e-3' does not exist." } }),
      'OpenAI',
    );
    expect(exception.message).toBe(
      "OpenAI image generation failed: The model 'dall-e-3' does not exist.",
    );
  });

  it('passes an already-classified exception through unchanged', () => {
    const original = imageFailure(ImageFailureCode.NO_IMAGE_RETURNED);
    expect(toImageProviderException(original, 'Gemini')).toBe(original);
  });
});
