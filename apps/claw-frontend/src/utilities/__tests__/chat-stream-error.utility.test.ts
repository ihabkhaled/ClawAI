import { describe, expect, it, vi } from 'vitest';

import type { StreamEvent, TranslateFunction } from '@/types';
import {
  resolveChatStreamError,
  resolveStoredErrorMessage,
} from '@/utilities/chat-stream-error.utility';

const translate = vi.fn<TranslateFunction>((key) => `localized:${key}`);

describe('resolveChatStreamError', () => {
  it('uses an allow-listed backend message key', () => {
    const event = {
      messageKey: 'chat.errors.videoAttachmentProviderUnsupported',
    } as StreamEvent;

    expect(resolveChatStreamError(event, translate)).toBe(
      'localized:chat.errors.videoAttachmentProviderUnsupported',
    );
  });

  it('maps a known error code when the message key is absent', () => {
    const event = {
      code: 'VIDEO_ATTACHMENT_LOCAL_MODEL_UNAVAILABLE',
    } as StreamEvent;

    expect(resolveChatStreamError(event, translate)).toBe(
      'localized:chat.errors.videoAttachmentLocalModelUnavailable',
    );
  });

  it('does not expose an unknown backend error message', () => {
    const event = {
      error: 'Sensitive provider response',
      code: 'UNKNOWN_PROVIDER_FAILURE',
      messageKey: 'untrusted.translation.key',
    } as StreamEvent;

    expect(resolveChatStreamError(event, translate)).toBe('localized:chat.allProvidersFailed');
  });
});

describe('provider credit exhaustion', () => {
  it('maps PROVIDER_CREDIT_EXHAUSTED on the stream to its translated sentence', () => {
    const event = { code: 'PROVIDER_CREDIT_EXHAUSTED' } as StreamEvent;
    expect(resolveChatStreamError(event, translate)).toBe(
      'localized:chat.errors.providerCreditExhausted',
    );
  });
});

describe('retired model (ADR-151)', () => {
  it('maps PROVIDER_MODEL_UNAVAILABLE on the stream to its translated sentence', () => {
    const event = { code: 'PROVIDER_MODEL_UNAVAILABLE' } as StreamEvent;
    expect(resolveChatStreamError(event, translate)).toBe(
      'localized:chat.errors.providerModelUnavailable',
    );
  });
});

describe('rate-limit and output-limit keys (ADR-125)', () => {
  it.each(['chat.errors.providerRateLimited', 'chat.errors.providerOutputLimit'])(
    'translates %s from the stream and from a stored reply',
    (key) => {
      expect(
        resolveChatStreamError(
          { code: 'CLOUD_PROVIDER_UNAVAILABLE', messageKey: key } as StreamEvent,
          translate,
        ),
      ).toBe(`localized:${key}`);
      expect(resolveStoredErrorMessage({ error: true, errorMessageKey: key }, translate)).toBe(
        `⚠️ localized:${key}`,
      );
    },
  );
});

describe('resolveStoredErrorMessage', () => {
  it('translates a stored error reply by its message key', () => {
    expect(
      resolveStoredErrorMessage(
        { error: true, errorMessageKey: 'chat.errors.providerCreditExhausted' },
        translate,
      ),
    ).toBe('⚠️ localized:chat.errors.providerCreditExhausted');
  });

  it('falls back to the error code when the key is absent', () => {
    expect(
      resolveStoredErrorMessage({ error: true, errorCode: 'PROVIDER_CREDIT_EXHAUSTED' }, translate),
    ).toBe('⚠️ localized:chat.errors.providerCreditExhausted');
  });

  it('leaves an unknown or non-error message to its stored content', () => {
    expect(
      resolveStoredErrorMessage({ error: true, errorCode: 'SOMETHING' }, translate),
    ).toBeNull();
    expect(
      resolveStoredErrorMessage(
        { errorMessageKey: 'chat.errors.providerCreditExhausted' },
        translate,
      ),
    ).toBeNull();
    expect(resolveStoredErrorMessage(null, translate)).toBeNull();
  });

  it('never trusts an arbitrary key from metadata', () => {
    expect(
      resolveStoredErrorMessage({ error: true, errorMessageKey: 'admin.secret' }, translate),
    ).toBeNull();
  });
});

describe('credit refusals that arrive over SSE', () => {
  it.each([
    ['PAYG_CREDIT_EXHAUSTED', 'billing.errors.PAYG_CREDIT_EXHAUSTED'],
    ['PAYG_PROMPT_TOO_EXPENSIVE', 'billing.errors.PAYG_PROMPT_TOO_EXPENSIVE'],
    ['PAYG_MODEL_UNPRICED', 'billing.errors.PAYG_MODEL_UNPRICED'],
    ['PAYG_PRICING_UNAVAILABLE', 'billing.errors.PAYG_PRICING_UNAVAILABLE'],
    ['PAYG_FREE_ALLOWANCE_EXHAUSTED', 'billing.errors.PAYG_FREE_ALLOWANCE_EXHAUSTED'],
  ])('maps %s to its own message, never "all providers failed"', (code, key) => {
    expect(resolveChatStreamError({ code } as StreamEvent, translate)).toBe(`localized:${key}`);
  });

  it('shows the spent-allowance sentence for a stored reply after a reload', () => {
    expect(
      resolveStoredErrorMessage(
        { error: true, errorCode: 'PAYG_FREE_ALLOWANCE_EXHAUSTED' },
        translate,
      ),
    ).toContain('billing.errors.PAYG_FREE_ALLOWANCE_EXHAUSTED');
  });
});
