import { BusinessException, ProviderUnsupportedParameterException } from '../../../../common/errors';
import {
  parseRejectedSamplingParameter,
  providerRetryPlan,
  toProviderHttpFailure,
} from '../provider-http-failure.utility';

// Verbatim production body, claw-chat-service 2026-10-02 (claude-opus-5-5).
const ANTHROPIC_TEMPERATURE_400 = {
  error: {
    code: 'invalid_request_error',
    message: '`temperature` is deprecated for this model.',
    type: 'invalid_request_error',
    param: null,
  },
};

const failure = (status: number, body: unknown): BusinessException =>
  toProviderHttpFailure({
    status,
    body,
    failureCode: 'CLOUD_PROVIDER_ERROR',
    fallbackMessage: 'Provider ANTHROPIC returned 400',
  });

describe('parseRejectedSamplingParameter', () => {
  it.each([
    ['`temperature` is deprecated for this model.', 'temperature'],
    [
      "Unsupported value: 'temperature' does not support 0.7 with this model. Only the default (1) value is supported.",
      'temperature',
    ],
    ['top_p is not supported for this model', 'top_p'],
    ['topK is no longer supported', 'top_k'],
    ['presence_penalty is not allowed with reasoning models', 'presence_penalty'],
    ['frequencyPenalty: unsupported parameter', 'frequency_penalty'],
  ])('reads %s as a refusal of %s', (text, parameter) => {
    expect(parseRejectedSamplingParameter(400, text)).toBe(parameter);
  });

  it('accepts a 422 validation refusal', () => {
    expect(parseRejectedSamplingParameter(422, 'temperature is not permitted')).toBe(
      'temperature',
    );
  });

  it('ignores a sentence that names temperature without refusing it', () => {
    expect(parseRejectedSamplingParameter(400, 'temperature must be between 0 and 2')).toBe(
      undefined,
    );
  });

  it('ignores a refusal of a non-sampling parameter', () => {
    expect(
      parseRejectedSamplingParameter(
        400,
        "Unsupported parameter: 'max_tokens' is not supported with this model.",
      ),
    ).toBe(undefined);
  });

  it('ignores non-request-shape statuses', () => {
    expect(parseRejectedSamplingParameter(500, '`temperature` is deprecated')).toBe(undefined);
    expect(parseRejectedSamplingParameter(429, '`temperature` is deprecated')).toBe(undefined);
  });
});

describe('toProviderHttpFailure — sampling-parameter refusals', () => {
  it('classifies the production Anthropic body (parsed JSON)', () => {
    const error = failure(400, ANTHROPIC_TEMPERATURE_400);
    expect(error).toBeInstanceOf(ProviderUnsupportedParameterException);
    expect((error as ProviderUnsupportedParameterException).parameter).toBe('temperature');
    expect(error.code).toBe('CLOUD_PROVIDER_ERROR');
  });

  it('classifies the streaming hop (raw text body)', () => {
    const error = failure(400, JSON.stringify(ANTHROPIC_TEMPERATURE_400));
    expect(error).toBeInstanceOf(ProviderUnsupportedParameterException);
  });

  it('leaves every other 400 a plain BusinessException', () => {
    const error = failure(400, { error: { message: 'messages: at least one message is required' } });
    expect(error).not.toBeInstanceOf(ProviderUnsupportedParameterException);
    expect(error).toBeInstanceOf(BusinessException);
  });
});

describe('providerRetryPlan — sampling-parameter refusals', () => {
  it('drops temperature and retries once', () => {
    expect(providerRetryPlan(failure(400, ANTHROPIC_TEMPERATURE_400))).toEqual({
      reason: 'rejected the temperature parameter',
      dropSamplingParameter: 'temperature',
    });
  });

  it('does not retry a parameter chat-service never sends (identical body)', () => {
    expect(
      providerRetryPlan(failure(400, { error: { message: 'top_p is deprecated for this model' } })),
    ).toBe(undefined);
  });

  it('does not retry an unrelated 400', () => {
    expect(providerRetryPlan(failure(400, { error: { message: 'invalid model id' } }))).toBe(
      undefined,
    );
  });
});
