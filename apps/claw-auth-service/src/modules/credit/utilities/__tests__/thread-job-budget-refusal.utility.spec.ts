import { PlanFeatureKey } from '../../../../generated/prisma';
import { threadAllowanceRefusal } from '../thread-job-budget-refusal.utility';

const refused = (overrides: Record<string, unknown> = {}) => ({
  allowed: false as const,
  reason: 'FEATURE_TRIAL_EXHAUSTED' as const,
  used: 1,
  limit: 1,
  window: 'LIFETIME',
  ...overrides,
});

describe('threadAllowanceRefusal', () => {
  it('names used and limit and says a lifetime allowance frees up when the running generation ends', () => {
    const body = threadAllowanceRefusal(PlanFeatureKey.RESEARCH_MODE, refused()).getResponse();
    expect(body).toMatchObject({
      statusCode: 403,
      code: 'THREAD_ALLOWANCE_UNAVAILABLE',
      feature: 'RESEARCH_MODE',
      used: 1,
      limit: 1,
      window: 'LIFETIME',
    });
    const message = (body as { message: string }).message;
    expect(message).toContain('allows 1 Thread generation with web research');
    expect(message).toContain('1 is used or held');
    expect(message).toContain('life of the account');
    expect(message).toContain('ends or fails on our side');
  });

  it.each([
    ['MONTH', 'plan month'],
    ['WEEK', 'every week'],
    ['DAY', 'every day'],
    [null, 'renews with your plan period'],
    ['SOMETHING_NEW', 'renews with your plan period'],
  ])('says when a %s allowance renews', (window, text) => {
    const message = (
      threadAllowanceRefusal(
        PlanFeatureKey.JUDGE_MODE,
        refused({ window, used: 3, limit: 3 }),
      ).getResponse() as { message: string }
    ).message;
    expect(message).toContain('3 Thread generations with Judge review');
    expect(message).toContain('3 are used or held');
    expect(message).toContain(text);
  });

  it('says a switched-off feature is not in the plan, without used and limit prose', () => {
    const message = (
      threadAllowanceRefusal(
        PlanFeatureKey.CRITIC_REVIEW,
        refused({ reason: 'FEATURE_DISABLED', used: 0, limit: 0, window: null }),
      ).getResponse() as { message: string }
    ).message;
    expect(message).toBe(
      'Your plan does not include Critic review, which Thread generation needs.',
    );
  });
});
