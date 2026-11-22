import { describe, expect, it } from 'vitest';

import {
  MODEL_KIND_NOT_OFFERED_BADGE_CLASS,
  MODEL_KIND_OFFERED_BADGE_CLASS,
} from '@/constants/model-visibility.constants';
import { ConnectorModelKind } from '@/enums/connector-model-kind.enum';
import { isChatPickerKind, resolveModelKindView } from '@/utilities/model-visibility.utility';

describe('isChatPickerKind', () => {
  it('offers chat models and audio-output models only', () => {
    expect(isChatPickerKind(ConnectorModelKind.CHAT, 'gpt-4o')).toBe(true);
    expect(isChatPickerKind(ConnectorModelKind.AUDIO, 'gpt-4o-mini-tts')).toBe(true);
    expect(isChatPickerKind(ConnectorModelKind.AUDIO, 'whisper-1')).toBe(false);
    expect(isChatPickerKind(ConnectorModelKind.TOOL, 'models/gemini-decision-1')).toBe(false);
    expect(isChatPickerKind(ConnectorModelKind.EMBEDDING, 'text-embedding-3-large')).toBe(false);
  });
});

describe('resolveModelKindView', () => {
  it('marks an exposed TOOL model as not offered and carries the sync reason', () => {
    expect(
      resolveModelKindView({
        kind: ConnectorModelKind.TOOL,
        kindReason: 'Google lists only: createDecision',
        modelKey: 'models/gemini-decision-1',
      }),
    ).toEqual({
      labelKey: 'adminConnectors.visibility.kindTool',
      badgeClass: MODEL_KIND_NOT_OFFERED_BADGE_CLASS,
      offeredInChat: false,
      reason: 'Google lists only: createDecision',
    });
  });

  it('shows a chat model as offered with no reason', () => {
    expect(
      resolveModelKindView({
        kind: ConnectorModelKind.CHAT,
        kindReason: null,
        modelKey: 'gpt-4o',
      }),
    ).toEqual({
      labelKey: 'adminConnectors.visibility.kindChat',
      badgeClass: MODEL_KIND_OFFERED_BADGE_CLASS,
      offeredInChat: true,
      reason: null,
    });
  });

  it('leaves the reason null for an old non-chat row no sync has classified', () => {
    expect(
      resolveModelKindView({
        kind: ConnectorModelKind.EMBEDDING,
        kindReason: null,
        modelKey: 'text-embedding-3-large',
      }).reason,
    ).toBeNull();
  });
});
