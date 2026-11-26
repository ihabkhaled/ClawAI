import { LIVE_COUNCIL_DEFAULT_AGENT } from '../../constants/live-policy.constants';
import { livePolicySchema } from '../live-policy.schema';

const gemini = { connector: 'GEMINI', model: 'gemini-3.1-flash-lite', style: 'OPENAI_COMPAT' };
const ollama = { connector: 'OLLAMA', model: 'gemma4:31b', style: 'OLLAMA' };

const base = {
  featureEnabled: true,
  killSwitch: false,
  plans: {},
  defaultPlan: { freeSecondsPerMonth: 0, paidMicroUsdPerMinute: 20_000 },
  visionBilling: 'ACTUAL_COST',
  graceSeconds: 60,
  maxActiveStreams: 20,
  maxSessionsPerUser: 3,
  sessionsPerUserPerHour: 30,
  dailyBudgetMicroUsd: 20_000_000,
  budgetSoftStopPercent: 80,
  summaryModelChain: [ollama, gemini],
  visionModelChain: [gemini],
};

describe('livePolicySchema model chains', () => {
  it.each([1, 2, 3])('accepts %i council agents', (count) => {
    const councilModelChain = Array.from({ length: count }, () => gemini);
    const parsed = livePolicySchema.safeParse({ ...base, councilModelChain });
    expect(parsed.success).toBe(true);
    expect(parsed.data?.councilModelChain).toHaveLength(count);
  });

  it.each([0, 4])('refuses %i council agents', (count) => {
    const councilModelChain = Array.from({ length: count }, () => gemini);
    expect(livePolicySchema.safeParse({ ...base, councilModelChain }).success).toBe(false);
  });

  it('gives a version saved before the council one default agent', () => {
    const parsed = livePolicySchema.parse(base);
    expect(parsed.councilModelChain).toEqual([LIVE_COUNCIL_DEFAULT_AGENT]);
  });

  it('keeps the main and vision chains at 1..5 models', () => {
    const six = Array.from({ length: 6 }, () => ollama);
    expect(livePolicySchema.safeParse({ ...base, summaryModelChain: [] }).success).toBe(false);
    expect(livePolicySchema.safeParse({ ...base, visionModelChain: [] }).success).toBe(false);
    expect(livePolicySchema.safeParse({ ...base, summaryModelChain: six }).success).toBe(false);
    const five = six.slice(1);
    expect(livePolicySchema.safeParse({ ...base, summaryModelChain: five }).success).toBe(true);
  });

  it('refuses a style the model client cannot call', () => {
    const bad = [{ ...gemini, style: 'ANTHROPIC' }];
    expect(livePolicySchema.safeParse({ ...base, councilModelChain: bad }).success).toBe(false);
  });
});
