import { PaygSurface, TokenLedgerContext } from '@claw/shared-types';

import {
  isPaygDelegatedProvider,
  isPaygExemptProvider,
  normalizePaygProvider,
  paygSurfaceForTokenContext,
  paygUnmeteredHold,
  paygWorkflowForTokenContext,
} from '../payg-metering.utility';

describe('normalizePaygProvider', () => {
  it('rewrites the composer runtime tags to the connector provider auth knows', () => {
    expect(normalizePaygProvider('local-ollama')).toBe('OLLAMA');
    expect(normalizePaygProvider('local-llamacpp')).toBe('LLAMACPP');
  });

  it('passes an unknown provider through untouched rather than treating it as free', () => {
    // The classification belongs to auth-service (ADR-082). A provider this map
    // has not heard of must reach the meter and be decided there.
    expect(normalizePaygProvider('SOME_NEW_GATEWAY')).toBe('SOME_NEW_GATEWAY');
    expect(isPaygExemptProvider('SOME_NEW_GATEWAY')).toBe(false);
  });
});

describe('isPaygExemptProvider', () => {
  it('recognises the runtimes that cost no marginal money, through their aliases', () => {
    expect(isPaygExemptProvider('local-ollama')).toBe(true);
    expect(isPaygExemptProvider('OLLAMA')).toBe(true);
    expect(isPaygExemptProvider('LLAMACPP')).toBe(true);
  });

  it('never exempts a paid gateway', () => {
    for (const paid of ['OPENAI', 'ANTHROPIC', 'GEMINI', 'DEEPSEEK', 'GROK', 'AWS_BEDROCK']) {
      expect(isPaygExemptProvider(paid)).toBe(false);
    }
  });
});

describe('isPaygDelegatedProvider', () => {
  it('is true only for the pseudo-providers that meter themselves downstream', () => {
    expect(isPaygDelegatedProvider('IMAGE_OPENAI')).toBe(true);
    expect(isPaygDelegatedProvider('IMAGE_LOCAL')).toBe(true);
    expect(isPaygDelegatedProvider('FILE_GENERATION')).toBe(true);
    expect(isPaygDelegatedProvider('OPENAI')).toBe(false);
  });
});

describe('paygSurfaceForTokenContext', () => {
  it('maps each ledger context to the surface a billing page can explain', () => {
    expect(paygSurfaceForTokenContext(TokenLedgerContext.CHAT)).toBe(PaygSurface.CHAT);
    expect(paygSurfaceForTokenContext(TokenLedgerContext.REGENERATE)).toBe(PaygSurface.CHAT);
    expect(paygSurfaceForTokenContext(TokenLedgerContext.COMPARE)).toBe(PaygSurface.COMPARE);
    expect(paygSurfaceForTokenContext(TokenLedgerContext.JUDGE)).toBe(PaygSurface.JUDGE);
    expect(paygSurfaceForTokenContext(TokenLedgerContext.IMAGE_GENERATION)).toBe(PaygSurface.IMAGE);
    expect(paygSurfaceForTokenContext(TokenLedgerContext.FILE_GENERATION)).toBe(
      PaygSurface.FILE_GENERATION,
    );
    expect(paygSurfaceForTokenContext(TokenLedgerContext.ROUTING)).toBe(PaygSurface.ROUTING);
  });

  it('records the mode name beside the surface', () => {
    expect(paygWorkflowForTokenContext(TokenLedgerContext.BEST_OF_N)).toBe('best_of_n');
  });
});

describe('paygUnmeteredHold', () => {
  it('still carries the ceiling, so a caller never branches on `metered`', () => {
    const hold = paygUnmeteredHold(8192);
    expect(hold.metered).toBe(false);
    expect(hold.maxOutputTokens).toBe(8192);
    expect(hold.clamped).toBe(false);
    // No reservation id means finalize and release are no-ops rather than
    // calls against a hold that was never taken.
    expect(hold.reservationId).toBeNull();
  });
});
