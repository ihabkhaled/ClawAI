import { PaygSurface } from '@claw/shared-types';

import { internalGenerateSchema } from '../internal-generate.dto';

const request = {
  userId: 'owner-1',
  surface: PaygSurface.THREADS,
  provider: 'OPENAI',
  model: 'gpt-5',
  systemPrompt: 'Write a sourced article.',
  userPrompt: 'Sources and evidence are complete.',
  requestId: 'job-1:author-1:round-1',
  threadJobBudgetId: 'budget-1',
};

describe('internalGenerateSchema Threads budget contract', () => {
  it('requires the job budget and stable request id for Threads calls', () => {
    expect(internalGenerateSchema.safeParse(request).success).toBe(true);
    expect(
      internalGenerateSchema.safeParse({ ...request, threadJobBudgetId: undefined }).success,
    ).toBe(false);
    expect(internalGenerateSchema.safeParse({ ...request, requestId: undefined }).success).toBe(
      false,
    );
  });

  it('does not let another surface attach a Threads job budget', () => {
    expect(
      internalGenerateSchema.safeParse({
        ...request,
        surface: PaygSurface.CHAT,
      }).success,
    ).toBe(false);
  });
});
