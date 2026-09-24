import {
  extractTranscriptionErrorMessage,
  isAudioModalityRejection,
} from '../transcription-error.utility';

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
