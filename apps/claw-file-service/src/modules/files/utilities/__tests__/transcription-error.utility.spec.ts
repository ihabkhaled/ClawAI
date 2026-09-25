import {
  classifyTranscriptionFailure,
  extractTranscriptionErrorMessage,
  isAudioModalityRejection,
} from '../transcription-error.utility';
import { TranscriptionFailureKind } from '../../../../common/enums';

const axiosLikeError = (status: number, data: unknown): unknown => {
  const error = new Error(`Request failed with status code ${String(status)}`) as Error & {
    response: { status: number; data: unknown };
  };
  error.response = { status, data };
  return error;
};

describe('extractTranscriptionErrorMessage', () => {
  it('reads Gemini/OpenAI-style { error: { message } } bodies', () => {
    const error = axiosLikeError(400, {
      error: { code: 400, message: 'Audio input modality is not enabled for models/x' },
    });
    expect(extractTranscriptionErrorMessage(error)).toBe(
      'Audio input modality is not enabled for models/x',
    );
  });

  it('reads a bare string error field', () => {
    const error = axiosLikeError(400, { error: 'bad request' });
    expect(extractTranscriptionErrorMessage(error)).toBe('bad request');
  });

  it('reads a top-level message field', () => {
    const error = axiosLikeError(400, { message: 'no body error field' });
    expect(extractTranscriptionErrorMessage(error)).toBe('no body error field');
  });

  it('falls back to the transport message when there is no response body', () => {
    expect(extractTranscriptionErrorMessage(new Error('ECONNREFUSED'))).toBe('ECONNREFUSED');
  });

  it('falls back to a fixed string for a non-Error throw', () => {
    expect(extractTranscriptionErrorMessage('nope')).toBe('unknown error');
  });
});

describe('isAudioModalityRejection', () => {
  it('recognises the exact live Gemini refusal', () => {
    const error = axiosLikeError(400, {
      error: {
        code: 400,
        message: 'Audio input modality is not enabled for models/antigravity-preview-05-2026',
        status: 'INVALID_ARGUMENT',
      },
    });
    expect(isAudioModalityRejection(error)).toBe(true);
  });

  it('is case-insensitive', () => {
    const error = axiosLikeError(400, {
      error: { message: 'AUDIO INPUT MODALITY IS NOT ENABLED' },
    });
    expect(isAudioModalityRejection(error)).toBe(true);
  });

  it('does not classify a rate limit as a modality rejection', () => {
    expect(isAudioModalityRejection(new Error('429 rate limited'))).toBe(false);
  });

  it('does not classify a generic 400 with no modality wording as a modality rejection', () => {
    const error = axiosLikeError(400, { error: { message: 'Invalid request body' } });
    expect(isAudioModalityRejection(error)).toBe(false);
  });

  it('does not classify the bare axios transport message as a modality rejection', () => {
    // No response body attached — the case this bug ships as if the check
    // only looked at error.message instead of the response body.
    expect(isAudioModalityRejection(new Error('Request failed with status code 400'))).toBe(false);
  });
});

// The shapes below are the providers' real 429 / 404 bodies. What each class
// is allowed to do next is decided in TranscriptionManager#runCandidates; this
// only has to put every body in the right class.
describe('classifyTranscriptionFailure', () => {
  it('reads the live Gemini modality refusal as a model rejection', () => {
    const error = axiosLikeError(400, {
      error: {
        code: 400,
        message: 'Audio input modality is not enabled for models/antigravity-preview-05-2026',
        status: 'INVALID_ARGUMENT',
      },
    });
    expect(classifyTranscriptionFailure(error)).toBe(TranscriptionFailureKind.MODEL_REJECTED);
  });

  it('reads a 404 model-not-found as a model rejection', () => {
    const error = axiosLikeError(404, {
      error: {
        code: 404,
        message: 'models/gemini-x is not found for API version v1beta',
        status: 'NOT_FOUND',
      },
    });
    expect(classifyTranscriptionFailure(error)).toBe(TranscriptionFailureKind.MODEL_REJECTED);
  });

  it('reads OpenAI insufficient_quota as an exhausted quota, not a transient limit', () => {
    const error = axiosLikeError(429, {
      error: {
        message: 'You exceeded your current quota, please check your plan and billing details.',
        type: 'insufficient_quota',
        code: 'insufficient_quota',
      },
    });
    expect(classifyTranscriptionFailure(error)).toBe(TranscriptionFailureKind.QUOTA_EXHAUSTED);
  });

  it('reads an OpenAI rate_limit_exceeded 429 as transient', () => {
    const error = axiosLikeError(429, {
      error: {
        message: 'Rate limit reached for whisper-1 on requests per min (RPM): Limit 3.',
        type: 'requests',
        code: 'rate_limit_exceeded',
      },
    });
    expect(classifyTranscriptionFailure(error)).toBe(TranscriptionFailureKind.RATE_LIMITED);
  });

  it("reads Gemini's RESOURCE_EXHAUSTED 429 as transient", () => {
    const error = axiosLikeError(429, {
      error: {
        code: 429,
        message: 'Resource has been exhausted (e.g. check quota).',
        status: 'RESOURCE_EXHAUSTED',
      },
    });
    expect(classifyTranscriptionFailure(error)).toBe(TranscriptionFailureKind.RATE_LIMITED);
  });

  it('reads a bodiless 429 (the prod log shape) as transient', () => {
    expect(classifyTranscriptionFailure(axiosLikeError(429, undefined))).toBe(
      TranscriptionFailureKind.RATE_LIMITED,
    );
  });

  it('keeps every other failure terminal', () => {
    expect(classifyTranscriptionFailure(axiosLikeError(500, { error: 'boom' }))).toBe(
      TranscriptionFailureKind.TERMINAL,
    );
    expect(classifyTranscriptionFailure(new Error('ECONNRESET'))).toBe(
      TranscriptionFailureKind.TERMINAL,
    );
    expect(
      classifyTranscriptionFailure(axiosLikeError(400, { error: { message: 'Invalid body' } })),
    ).toBe(TranscriptionFailureKind.TERMINAL);
  });
});
