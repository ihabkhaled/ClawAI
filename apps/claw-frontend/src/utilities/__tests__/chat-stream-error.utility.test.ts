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
