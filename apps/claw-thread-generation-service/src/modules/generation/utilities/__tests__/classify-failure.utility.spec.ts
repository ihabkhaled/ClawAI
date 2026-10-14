import { ThreadFailureClass, ThreadFailurePhase, ThreadFailureRemedy } from '@claw/shared-types';

import { ModelOutputFailureKind } from '../../../../common/enums/model-output-failure-kind.enum';
import { FAILURE_CLASS_BY_CODE, FAILURE_CLASS_INFO } from '../../constants/failure-class.constants';
import { classifyFailure, phaseOfStage } from '../classify-failure.utility';

describe('classifyFailure (ADR-181)', () => {
  it.each([...FAILURE_CLASS_BY_CODE])('maps the code %s to %s', (code, failureClass) => {
    expect(classifyFailure({ code, httpStatus: null }).failureClass).toBe(failureClass);
  });

  it('has an info entry for every class', () => {
    for (const failureClass of Object.values(ThreadFailureClass)) {
      expect(FAILURE_CLASS_INFO.has(failureClass), failureClass).toBe(true);
    }
  });

  it.each([
    [429, ThreadFailureClass.PROVIDER_RATE_LIMITED],
    [500, ThreadFailureClass.PROVIDER_UNAVAILABLE],
    [503, ThreadFailureClass.PROVIDER_UNAVAILABLE],
    [504, ThreadFailureClass.PROVIDER_TIMEOUT],
    [408, ThreadFailureClass.PROVIDER_TIMEOUT],
    [400, ThreadFailureClass.PROVIDER_REJECTED],
    [404, ThreadFailureClass.PROVIDER_REJECTED],
    [422, ThreadFailureClass.PROVIDER_REJECTED],
    [413, ThreadFailureClass.CONTEXT_OVERFLOW],
    [402, ThreadFailureClass.PROVIDER_CREDIT],
    [401, ThreadFailureClass.ENTITLEMENT],
    [403, ThreadFailureClass.ENTITLEMENT],
  ])('reads a bare PROVIDER_ERROR with HTTP %i as %s', (httpStatus, failureClass) => {
    expect(classifyFailure({ code: 'PROVIDER_ERROR', httpStatus }).failureClass).toBe(failureClass);
  });

  it('reads PROVIDER_ERROR with no status as a network failure', () => {
    expect(classifyFailure({ code: 'PROVIDER_ERROR', httpStatus: null }).failureClass).toBe(
      ThreadFailureClass.NETWORK,
    );
  });

  it('keeps the owner-visible 400 with an empty excerpt a provider rejection that models can heal', () => {
    const result = classifyFailure({ code: 'CLOUD_PROVIDER_REQUEST_FAILED', httpStatus: 400 });
    expect(result).toMatchObject({
      failureClass: ThreadFailureClass.PROVIDER_REJECTED,
      healable: true,
      ownerOnly: false,
    });
  });

  it('treats the platform provider credit as healable by another provider, never as the owner wallet', () => {
    expect(classifyFailure({ code: 'PROVIDER_CREDIT_EXHAUSTED', httpStatus: 503 })).toMatchObject({
      failureClass: ThreadFailureClass.PROVIDER_CREDIT,
      ownerOnly: false,
    });
    expect(classifyFailure({ code: 'PAYG_CREDIT_EXHAUSTED', httpStatus: 402 })).toMatchObject({
      failureClass: ThreadFailureClass.CREDIT_EXHAUSTED,
      ownerOnly: true,
      retryable: false,
      remedies: [ThreadFailureRemedy.ADD_CREDIT],
    });
  });

  it('treats a request the provider found too large as a window overflow to shrink or swap', () => {
    expect(classifyFailure({ code: 'PROVIDER_REQUEST_TOO_LARGE', httpStatus: 413 })).toMatchObject({
      failureClass: ThreadFailureClass.CONTEXT_OVERFLOW,
      healable: true,
    });
  });

  it('never heals a safety refusal and offers only a new topic', () => {
    const result = classifyFailure({ code: 'CONTENT_FILTERED_SAFETY', httpStatus: 400 });
    expect(result).toMatchObject({
      failureClass: ThreadFailureClass.REFUSAL,
      healable: false,
      ownerOnly: true,
      remedies: [ThreadFailureRemedy.CHANGE_TOPIC],
    });
  });

  it('treats a plan refusal as owner-only', () => {
    expect(
      classifyFailure({ code: 'THREAD_GENERATION_NOT_IN_PLAN', httpStatus: 403 }),
    ).toMatchObject({
      failureClass: ThreadFailureClass.ENTITLEMENT,
      ownerOnly: true,
    });
  });

  it.each([
    [ModelOutputFailureKind.EMPTY, false, ThreadFailureClass.EMPTY_OUTPUT],
    [ModelOutputFailureKind.TRUNCATED, false, ThreadFailureClass.TRUNCATED_OUTPUT],
    [ModelOutputFailureKind.PROSE, false, ThreadFailureClass.INVALID_JSON],
    [ModelOutputFailureKind.INVALID_JSON, false, ThreadFailureClass.INVALID_JSON],
    [ModelOutputFailureKind.WRONG_SHAPE, false, ThreadFailureClass.WRONG_SHAPE],
    [ModelOutputFailureKind.WRONG_SHAPE, true, ThreadFailureClass.CITATION_RULE],
  ])('reads a refused %s reply (citation rule %s) as %s', (outputKind, citationRule, expected) => {
    expect(
      classifyFailure({ code: 'OUTPUT_INVALID', httpStatus: null, outputKind, citationRule })
        .failureClass,
    ).toBe(expected);
  });

  it('puts a citation failure in the citations phase and others in their stage phase', () => {
    expect(
      classifyFailure({ code: 'CITATION_INVALID', httpStatus: null, stage: 'AUTHOR_DRAFTS' }).phase,
    ).toBe(ThreadFailurePhase.CITATIONS);
    expect(
      classifyFailure({ code: 'OUTPUT_INVALID', httpStatus: null, stage: 'JUDGE' }).phase,
    ).toBe(ThreadFailurePhase.JUDGE);
  });

  it.each([
    ['RESEARCH', ThreadFailurePhase.RESEARCH],
    ['AUTHOR_DRAFTS', ThreadFailurePhase.AUTHOR],
    ['CONSENSUS', ThreadFailurePhase.CONSENSUS],
    ['JUDGE', ThreadFailurePhase.JUDGE],
    ['CRITIC', ThreadFailurePhase.CRITIC],
    ['SNAPSHOT', ThreadFailurePhase.SNAPSHOT],
    ['QUEUE', ThreadFailurePhase.QUEUE],
    ['GENERATION', ThreadFailurePhase.FINALIZE],
    ['SOMETHING_NEW', ThreadFailurePhase.FINALIZE],
    [undefined, ThreadFailurePhase.FINALIZE],
  ])('maps the stage %s to the phase %s', (stage, phase) => {
    expect(phaseOfStage(stage)).toBe(phase);
  });

  it('classifies an unknown code with no status as UNKNOWN with a plain retry', () => {
    expect(classifyFailure({ code: 'SOMETHING_ODD', httpStatus: null })).toMatchObject({
      failureClass: ThreadFailureClass.UNKNOWN,
      retryable: true,
    });
  });
});
