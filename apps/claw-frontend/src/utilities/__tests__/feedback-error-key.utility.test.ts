import { describe, expect, it } from 'vitest';

import { ApiClientError } from '@/services/shared/api-client';
import { publicFeedbackErrorKey } from '@/utilities/feedback-error-key.utility';

const failure = (status: number): ApiClientError => new ApiClientError({ message: 'x', status });

describe('publicFeedbackErrorKey', () => {
  it('maps 429, 400 and everything else', () => {
    expect(publicFeedbackErrorKey(failure(429))).toBe('feedback.errors.rateLimited');
    expect(publicFeedbackErrorKey(failure(400))).toBe('feedback.errors.checkFields');
    expect(publicFeedbackErrorKey(failure(500))).toBe('feedback.errors.submitFailed');
    expect(publicFeedbackErrorKey(new Error('network'))).toBe('feedback.errors.submitFailed');
  });
});
