import { isPromptCacheEligible } from '../anthropic-prompt-cache-policy.utility';

const ELIGIBLE = {
  provider: 'ANTHROPIC',
  catalogEnabled: true,
  carriesTools: false,
  holdSuppliedByCaller: false,
};

describe('isPromptCacheEligible', () => {
  it('arms only when every condition holds', () => {
    expect(isPromptCacheEligible(ELIGIBLE)).toBe(true);
  });

  it('is OFF when the catalog switch is off (the default state)', () => {
    expect(isPromptCacheEligible({ ...ELIGIBLE, catalogEnabled: false })).toBe(false);
  });

  it.each(['OPENAI', 'GEMINI', 'DEEPSEEK', 'GROK', 'OLLAMA', 'local-ollama', 'anthropic', ''])(
    'is OFF for provider %s even with the switch on',
    (provider) => {
      expect(isPromptCacheEligible({ ...ELIGIBLE, provider })).toBe(false);
    },
  );

  it('stays on the compatible path for a tool-carrying turn', () => {
    expect(isPromptCacheEligible({ ...ELIGIBLE, carriesTools: true })).toBe(false);
  });

  it('refuses when the caller already took a hold that was not sized for the write premium', () => {
    expect(isPromptCacheEligible({ ...ELIGIBLE, holdSuppliedByCaller: true })).toBe(false);
  });
});
