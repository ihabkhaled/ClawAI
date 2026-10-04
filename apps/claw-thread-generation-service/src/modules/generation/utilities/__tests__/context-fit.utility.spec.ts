import { checkRoleContextFit } from '../context-fit.utility';

describe('checkRoleContextFit', () => {
  it('requires prompt plus output reserve to fit the model window', () => {
    expect(
      checkRoleContextFit({
        provider: 'OPENAI',
        model: 'gpt-4o',
        promptTokens: 127_000,
        outputReserveTokens: 1_000,
        knownWindowTokens: 128_000,
      }).fits,
    ).toBe(true);
    expect(
      checkRoleContextFit({
        provider: 'OPENAI',
        model: 'gpt-4o',
        promptTokens: 127_001,
        outputReserveTokens: 1_000,
        knownWindowTokens: 128_000,
      }).fits,
    ).toBe(false);
  });

  it('fails closed when the model context window is unknown', () => {
    expect(
      checkRoleContextFit({
        provider: 'UNKNOWN',
        model: 'unknown',
        promptTokens: 1,
        outputReserveTokens: 1,
      }),
    ).toMatchObject({ fits: false, windowTokens: null });
  });
});
