import { PAYG_DEFAULT_PROVIDERS, PAYG_EXEMPT_PROVIDERS } from '@claw/shared-constants';
import { ConnectorProvider } from '../../../generated/prisma';
import { paygDefaultForProvider, rollUpPaygPolicy } from '../utilities/payg-policy.utility';

describe('paygDefaultForProvider', () => {
  it.each(PAYG_DEFAULT_PROVIDERS)('defaults %s to metered', (provider) => {
    expect(paygDefaultForProvider(provider as ConnectorProvider)).toBe(true);
  });

  it.each(PAYG_EXEMPT_PROVIDERS)('defaults %s to free', (provider) => {
    expect(paygDefaultForProvider(provider as ConnectorProvider)).toBe(false);
  });

  // The safe default. A provider nobody has classified must be free until an
  // operator says otherwise; the opposite default starts charging users the
  // moment someone adds a connector for a provider this list has never heard
  // of, which is a billing incident rather than a bug.
  it('defaults an unclassified provider to free', () => {
    const classified = new Set<string>([...PAYG_DEFAULT_PROVIDERS, ...PAYG_EXEMPT_PROVIDERS]);
    const unclassified = Object.values(ConnectorProvider).filter(
      (provider) => !classified.has(provider),
    );

    for (const provider of unclassified) {
      expect(paygDefaultForProvider(provider)).toBe(false);
    }
  });

  // ADR-082: Ollama Cloud costs money upstream but is indistinguishable from
  // self-hosted Ollama at the provider grain, so the default stays free and the
  // per-connector admin toggle is the lever.
  it('keeps OLLAMA free by default even though Ollama Cloud is paid', () => {
    expect(paygDefaultForProvider(ConnectorProvider.OLLAMA)).toBe(false);
  });
});

describe('rollUpPaygPolicy', () => {
  it('returns an empty map for no connectors', () => {
    expect(rollUpPaygPolicy([])).toEqual({});
  });

  it('emits one entry per distinct provider', () => {
    const providers = rollUpPaygPolicy([
      { provider: 'OPENAI', isEnabled: true, isPayAsYouGo: true },
      { provider: 'OPENAI', isEnabled: true, isPayAsYouGo: true },
      { provider: 'GEMINI', isEnabled: true, isPayAsYouGo: true },
    ]);

    expect(Object.keys(providers).sort()).toEqual(['GEMINI', 'OPENAI']);
  });

  // The conservative direction: one metered connector makes the provider
  // metered. Treating the provider as free because a sibling row is
  // unclassified would hand out uncapped provider spend.
  it('marks a provider metered when ANY enabled connector for it is metered', () => {
    const providers = rollUpPaygPolicy([
      { provider: 'OPENAI', isEnabled: true, isPayAsYouGo: false },
      { provider: 'OPENAI', isEnabled: true, isPayAsYouGo: false },
      { provider: 'OPENAI', isEnabled: true, isPayAsYouGo: true },
    ]);

    expect(providers.OPENAI).toBe(true);
  });

  it('is independent of row order', () => {
    const rows = [
      { provider: 'OPENAI', isEnabled: true, isPayAsYouGo: true },
      { provider: 'OPENAI', isEnabled: true, isPayAsYouGo: false },
    ];

    expect(rollUpPaygPolicy(rows)).toEqual(rollUpPaygPolicy([...rows].reverse()));
  });

  it('ignores a disabled connector but still reports its provider', () => {
    const providers = rollUpPaygPolicy([
      { provider: 'ANTHROPIC', isEnabled: false, isPayAsYouGo: true },
      { provider: 'ANTHROPIC', isEnabled: true, isPayAsYouGo: false },
    ]);

    expect(providers).toEqual({ ANTHROPIC: false });
  });

  it('marks the provider metered when the enabled sibling is the metered one', () => {
    const providers = rollUpPaygPolicy([
      { provider: 'ANTHROPIC', isEnabled: false, isPayAsYouGo: false },
      { provider: 'ANTHROPIC', isEnabled: true, isPayAsYouGo: true },
    ]);

    expect(providers).toEqual({ ANTHROPIC: true });
  });

  it('reports an all-free provider as an explicit false, never an absent key', () => {
    const providers = rollUpPaygPolicy([
      { provider: 'OLLAMA', isEnabled: true, isPayAsYouGo: false },
    ]);

    expect(Object.hasOwn(providers, 'OLLAMA')).toBe(true);
    expect(providers.OLLAMA).toBe(false);
  });
});
