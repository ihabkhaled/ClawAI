import { describe, expect, it, vi } from 'vitest';

import type { StreamEvent, TranslateFunction } from '@/types';
import { resolveChatStreamError } from '@/utilities/chat-stream-error.utility';

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
