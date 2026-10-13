import { ServiceUnavailableException } from '@nestjs/common';

import type { CandidateOutcome } from '../../types/candidate-outcome.types';
import { formatCandidateSummary, pickPrimaryOutcome } from '../candidate-summary.utility';
import { CandidatesExhaustedError, findCandidatesExhausted } from '../candidates-exhausted.error';
import { describeFailure } from '../describe-failure.utility';
import {
  DeterministicGenerationError,
  isDeterministicGenerationError,
} from '../deterministic-generation.error';
import { parseStepError } from '../parse-step-error.utility';

const outcome = (
  provider: string,
  code: string,
  httpStatus: number | null = null,
): CandidateOutcome => ({
  provider,
  model: `${provider.toLowerCase()}-m`,
  code,
  httpStatus,
});

describe('pickPrimaryOutcome', () => {
  it('picks the code that repeated most', () => {
    const outcomes = [
      outcome('A', 'X'),
      outcome('B', 'OUTPUT_INVALID'),
      outcome('C', 'OUTPUT_INVALID'),
    ];
    expect(pickPrimaryOutcome(outcomes)?.code).toBe('OUTPUT_INVALID');
  });

  it('prefers the earliest candidate on a tie, and the first when all differ', () => {
    expect(pickPrimaryOutcome([outcome('A', 'X'), outcome('B', 'Y')])?.provider).toBe('A');
    expect(
      pickPrimaryOutcome([
        outcome('A', 'X'),
        outcome('B', 'Y'),
        outcome('C', 'Y'),
        outcome('D', 'X'),
      ])?.provider,
    ).toBe('A');
  });

  it('has no primary for no outcomes', () => {
    expect(pickPrimaryOutcome([])).toBeNull();
  });
});

describe('CandidatesExhaustedError', () => {
  const outcomes = [
    outcome('GEMINI', 'OUTPUT_INVALID'),
    outcome('OPENROUTER', 'PROVIDER_ERROR', 400),
  ];

  it('carries the summary, the outcomes and the primary cause', () => {
    const error = new CandidatesExhaustedError(outcomes, new Error('last'));

    expect(error.primary.provider).toBe('GEMINI');
    expect(error.summary).toBe(formatCandidateSummary(outcomes, outcomes[0] as CandidateOutcome));
    expect(error.summary).toContain('OPENROUTER/openrouter-m: PROVIDER_ERROR (HTTP 400)');
    expect(error.message).toBe(error.summary);
  });

  it('is found through wrappers and wins over a deeper upstream status', () => {
    const inner = new Error('Chat model request failed (400)');
    const exhausted = new CandidatesExhaustedError(outcomes, inner);
    const wrapped = new ServiceUnavailableException('An author role failed', { cause: exhausted });

    expect(findCandidatesExhausted(wrapped)).toBe(exhausted);
    expect(parseStepError(wrapped)).toEqual({ code: 'OUTPUT_INVALID', httpStatus: null });
  });

  it('is reported to the operator by its summary only, never the provider error text', () => {
    const exhausted = new CandidatesExhaustedError(
      outcomes,
      new Error('upstream said: secret-token-123'),
    );

    const text = describeFailure(new ServiceUnavailableException('wrap', { cause: exhausted }));

    expect(text.startsWith('CandidatesExhaustedError: Every model failed.')).toBe(true);
    expect(text).not.toContain('secret-token-123');
    expect(text.length).toBeLessThanOrEqual(400);
  });

  it('keeps the deterministic marker of its cause', () => {
    const deterministic = new CandidatesExhaustedError(
      outcomes,
      new DeterministicGenerationError('exceeds the model window'),
    );
    const transient = new CandidatesExhaustedError(outcomes, new Error('x'));

    expect(isDeterministicGenerationError(deterministic)).toBe(true);
    expect(isDeterministicGenerationError(transient)).toBe(false);
  });
});
