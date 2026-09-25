import {
  IMAGE_GENERATION_PLAN_FEATURE,
  IMAGE_GENERATION_PLAN_REFUSAL_TEXT,
} from '../../constants/plan-feature-refusal.constants';
import {
  imagePlanRefusalResponse,
  isPlanFeatureDisabledResponse,
} from '../plan-feature-refusal.utility';

// ADR-122: a media feature the plan lacks is a finished, translated notice in
// the chat — never an error, never a pending generation card.
describe('plan-feature refusal', () => {
  it('builds a finished reply that names the missing feature and starts no generation', () => {
    const response = imagePlanRefusalResponse(
      IMAGE_GENERATION_PLAN_FEATURE,
      'IMAGE_OPENAI',
      'gpt-image-1',
      Date.now(),
      false,
    );

    expect(response).toEqual(
      expect.objectContaining({
        content: IMAGE_GENERATION_PLAN_REFUSAL_TEXT,
        provider: 'IMAGE_OPENAI',
        model: 'gpt-image-1',
        finishReason: 'stop',
        usedFallback: false,
        planFeatureRefusal: { feature: 'allowImageGeneration' },
      }),
    );
    expect(response.imageGenerationId).toBeUndefined();
  });

  it.each([
    [403, { code: 'PLAN_FEATURE_DISABLED' }, true],
    [403, { code: 'INSUFFICIENT_PERMISSIONS' }, false],
    [402, { code: 'PLAN_FEATURE_DISABLED' }, false],
    [403, null, false],
    [403, 'PLAN_FEATURE_DISABLED', false],
  ])('status %s body %j → plan refusal %s', (status, body, expected) => {
    expect(isPlanFeatureDisabledResponse(status, body)).toBe(expected);
  });
});
