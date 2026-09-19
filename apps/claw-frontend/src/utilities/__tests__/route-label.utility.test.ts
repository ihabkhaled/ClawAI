import { describe, expect, it } from 'vitest';

import { describeRoute } from '@/utilities/route-label.utility';

const t = (key: string, params?: Record<string, string | number>): string =>
  params === undefined ? key : `${key} ${JSON.stringify(params)}`;

describe('describeRoute', () => {
  // Production 2026-09-19: gpt-oss:120b routed and gpt-5.1 answered; the UI
  // named only OpenAI.
  it('names the router model, its provider label and the answering model', () => {
    expect(describeRoute('OLLAMA_CLOUD/gpt-oss:120b', 'gpt-5.1', t)).toBe(
      'chat.routedBy {"router":"gpt-oss:120b","routerProvider":"smartRouterAdmin.enums.provider.OLLAMA_CLOUD","model":"gpt-5.1"}',
    );
  });

  it('keeps a model id that itself contains a slash', () => {
    expect(describeRoute('GEMINI/models/gemini-3.6-flash', 'x', t)).toContain(
      '"router":"models/gemini-3.6-flash"',
    );
  });

  it('shows an unknown provider as-is and a bare id as the model', () => {
    expect(describeRoute('NEWPROV/m1', 'x', t)).toContain('"routerProvider":"NEWPROV"');
    expect(describeRoute('qwen3:1.7b', 'x', t)).toContain('"router":"qwen3:1.7b"');
  });
});
