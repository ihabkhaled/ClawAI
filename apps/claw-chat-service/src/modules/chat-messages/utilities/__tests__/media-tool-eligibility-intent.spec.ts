import type { TurnIntentPayload } from '@claw/shared-types';
import { describe, expect, it } from 'vitest';

import { ChatSurface } from '../../../../common/enums/chat-surface.enum';
import { MediaKind } from '../../enums/media-kind.enum';
import type { AssembledContext } from '../../types/context.types';
import {
  detectTurnAudioKind,
  detectTurnMediaKind,
  isClearMediaRequest,
  turnAsksForMedia,
  wantsMediaTools,
} from '../media-tool-eligibility.utility';

// ADR-218: a MODEL intent from routing replaces the English keyword lists.
const TOOL_MODEL = ['GROK', 'grok-4.20-0309-non-reasoning'] as const;

const intent = (kind: TurnIntentPayload['kind'], source: 'MODEL' | 'HEURISTIC' = 'MODEL') =>
  ({ kind, confidence: 0.9, source }) satisfies TurnIntentPayload;

function ctx(text: string, turnIntent?: TurnIntentPayload): AssembledContext {
  return {
    userId: 'u',
    systemPrompt: null,
    threadMessages: [{ id: 'm', threadId: 't', role: 'USER', content: text, metadata: null }],
    platformSurface: ChatSurface.CHAT,
    ...(turnIntent === undefined ? {} : { turnIntent }),
  } as unknown as AssembledContext;
}

describe('media tools under a MODEL turn intent', () => {
  it.each([
    ['Arabic', 'اعمل لي أغنية عن القطط'],
    ['Japanese', '猫についての歌を作って'],
    ['Turkish', 'kediler hakkında bir şarkı yap'],
  ])('offers the tools for an AUDIO_MUSIC intent in %s and picks music', (_lang, text) => {
    const context = ctx(text, intent('AUDIO_MUSIC'));

    expect(wantsMediaTools(context, ...TOOL_MODEL)).toBe(true);
    expect(detectTurnMediaKind(context, text)).toBe(MediaKind.AUDIO);
    expect(detectTurnAudioKind(context, text)).toBe('MUSIC');
    expect(isClearMediaRequest(context, text)).toBe(true);
  });

  it('the same non-English message without an intent is not offered the tools (legacy keywords)', () => {
    expect(wantsMediaTools(ctx('猫についての歌を作って'), ...TOOL_MODEL)).toBe(false);
  });

  it('reads speech for AUDIO_SPEECH even when the words say "song"', () => {
    const context = ctx('read the song lyrics aloud', intent('AUDIO_SPEECH'));
    expect(detectTurnAudioKind(context, 'read the song lyrics aloud')).toBe('SPEECH');
  });

  it.each([
    ['IMAGE_GENERATE', MediaKind.IMAGE],
    ['IMAGE_EDIT', MediaKind.IMAGE],
    ['VIDEO', MediaKind.VIDEO],
  ] as const)('maps %s to %s', (kind, media) => {
    expect(detectTurnMediaKind(ctx('x', intent(kind)), 'x')).toBe(media);
  });

  it.each(['TEXT', 'FILE'] as const)(
    'a %s intent is a chat answer: no tools even for "draw me a fox"',
    (kind) => {
      const context = ctx('draw me a fox', intent(kind));
      expect(wantsMediaTools(context, ...TOOL_MODEL)).toBe(false);
      expect(turnAsksForMedia(context, 'draw me a fox')).toBe(false);
      expect(detectTurnMediaKind(context, 'draw me a fox')).toBeUndefined();
      expect(isClearMediaRequest(context, 'draw me a fox')).toBe(false);
    },
  );

  it('a HEURISTIC intent or none keeps the keyword reading', () => {
    expect(wantsMediaTools(ctx('draw me a fox', intent('TEXT', 'HEURISTIC')), ...TOOL_MODEL)).toBe(
      true,
    );
    expect(wantsMediaTools(ctx('draw me a fox'), ...TOOL_MODEL)).toBe(true);
    expect(detectTurnAudioKind(ctx('sing a song about apples'), 'sing a song about apples')).toBe(
      'MUSIC',
    );
    expect(detectTurnMediaKind(ctx('what is a podcast?'), 'what is a podcast?')).toBeUndefined();
  });
});
