import { modelRoleSchema } from '../generation-pipeline.types';

const role = { id: 'author-1', provider: 'OPENAI', model: 'm', fallbacks: [] };

describe('modelRoleSchema output ceiling', () => {
  it('accepts the 8192 author ceiling the frontend now sends', () => {
    expect(modelRoleSchema.safeParse({ ...role, maxOutputTokens: 8192 }).success).toBe(true);
  });

  it('still refuses a ceiling above 32768 or below 256', () => {
    expect(modelRoleSchema.safeParse({ ...role, maxOutputTokens: 32_769 }).success).toBe(false);
    expect(modelRoleSchema.safeParse({ ...role, maxOutputTokens: 255 }).success).toBe(false);
  });
});
