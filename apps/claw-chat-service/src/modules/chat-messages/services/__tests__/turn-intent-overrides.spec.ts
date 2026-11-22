import type { TurnIntentPayload } from '@claw/shared-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MessageRoutedData } from '../../types/execution.types';
import { ChatMessagesService } from '../chat-messages.service';

// ADR-218: a MODEL turn intent from routing is authoritative over chat-service's keyword
// re-routes; an absent or HEURISTIC intent keeps today's behaviour exactly.
type Thread = { lastProvider: string | null; lastModel: string | null; userId?: string };
type Overrides = {
  applyFollowUpOverrides: (
    payload: MessageRoutedData,
    thread: Thread | null,
    messages: unknown[],
  ) => Promise<MessageRoutedData>;
  detectImageFollowUp: (
    payload: MessageRoutedData,
    thread: Thread | null,
    messages: unknown[],
  ) => MessageRoutedData;
  detectFileGenerationFollowUp: (
    payload: MessageRoutedData,
    thread: Thread | null,
    messages: unknown[],
  ) => MessageRoutedData;
  detectVideoRequest: (
    payload: MessageRoutedData,
    messages: unknown[],
    userId?: string,
  ) => Promise<MessageRoutedData>;
  detectImageFromAttachment: (
    payload: MessageRoutedData,
    messages: unknown[],
    userId: string | undefined,
  ) => Promise<MessageRoutedData>;
  parseMessageRoutedPayload: (data: unknown) => MessageRoutedData | null;
  previousTurnKindField: (turn: {
    id: string;
    threadId: string;
    createdAt: Date;
  }) => Promise<{ previousTurnKind?: string }>;
  buildAssistantMetadata: (args: Record<string, unknown>) => Record<string, unknown>;
};

const intent = (
  kind: TurnIntentPayload['kind'],
  over: Partial<TurnIntentPayload> = {},
): TurnIntentPayload => ({ kind, confidence: 0.92, source: 'MODEL', ...over });

const payload = (over: Partial<MessageRoutedData> = {}): MessageRoutedData =>
  ({
    messageId: 'm1',
    threadId: 't1',
    routingMode: 'AUTO',
    selectedProvider: 'GEMINI',
    selectedModel: 'models/gemini-2.5-flash',
    timestamp: '2026-11-22T00:00:00.000Z',
    ...over,
  }) as MessageRoutedData;

const user = (content: string, metadata: unknown = null): unknown => ({
  role: 'USER',
  content,
  metadata,
});
const fileAnswer = {
  role: 'ASSISTANT',
  content: 'Generating txt file...',
  metadata: { type: 'file_generation' },
};
const imageAnswer = { role: 'ASSISTANT', content: '', metadata: { type: 'image_generation' } };
const imageThread: Thread = { lastProvider: 'IMAGE_GEMINI', lastModel: 'nano-banana' };

const PROD_TEXT_TURNS = [
  "don't generate file, just answer me private static decryptVersionedQRCodeField = (",
  'Regenerate please due to issue Ok Now this is gpt 6 astra opinion Combine it',
  'Keep it cat as it is',
  'Do you know clawAI?',
  // These DO match the legacy follow-up words, so the TEXT intent is what blocks them.
  'another one',
  'regenerate',
];
const NON_ENGLISH = [
  ['Arabic', 'نفس الشيء لكن بلون أزرق'],
  ['Japanese', 'もう一度、今度は青で'],
  ['Turkish', 'aynısını mavi renkte yap'],
] as const;

describe('turn intent overrides (ADR-218)', () => {
  const ctor = ChatMessagesService as unknown as new (...args: unknown[]) => ChatMessagesService;
  const mimeTypes = vi.fn();
  const findRecentByThreadId = vi.fn();
  const service = new ctor(...new Array(22).fill({})) as unknown as Overrides;
  Object.assign(service, {
    attachmentInfo: { mimeTypes },
    chatMessagesRepository: { findRecentByThreadId },
  });

  beforeEach(() => {
    mimeTypes.mockReset();
    findRecentByThreadId.mockReset();
  });

  describe('file follow-up', () => {
    it.each(PROD_TEXT_TURNS)('a MODEL TEXT intent keeps %j a chat answer', (text) => {
      const routed = payload({ turnIntent: intent('TEXT') });
      for (const mode of ['AUTO', 'MANUAL_MODEL']) {
        const input = { ...routed, routingMode: mode };
        expect(service.detectFileGenerationFollowUp(input, null, [fileAnswer, user(text)])).toBe(
          input,
        );
      }
    });

    it.each(NON_ENGLISH)(
      'a MODEL FILE intent re-routes a %s follow-up with no prefix word',
      (_l, text) => {
        const out = service.detectFileGenerationFollowUp(
          payload({ turnIntent: intent('FILE') }),
          null,
          [fileAnswer, user(text)],
        );
        expect(out.selectedProvider).toBe('FILE_GENERATION');
      },
    );

    it('a MODEL FILE intent still needs a previous file answer', () => {
      const routed = payload({ turnIntent: intent('FILE') });
      expect(service.detectFileGenerationFollowUp(routed, null, [user('یک فایل بساز')])).toBe(
        routed,
      );
    });

    it('legacy: no intent, or a HEURISTIC one, re-routes "another one" and leaves prose alone', () => {
      for (const turnIntent of [undefined, intent('TEXT', { source: 'HEURISTIC' })]) {
        const routed = payload(turnIntent === undefined ? {} : { turnIntent });
        expect(
          service.detectFileGenerationFollowUp(routed, null, [fileAnswer, user('another one')])
            .selectedProvider,
        ).toBe('FILE_GENERATION');
        expect(
          service.detectFileGenerationFollowUp(routed, null, [
            fileAnswer,
            user('Do you know clawAI?'),
          ]),
        ).toBe(routed);
      }
    });
  });

  describe('image follow-up', () => {
    it.each(PROD_TEXT_TURNS)('a MODEL TEXT intent keeps %j off the image provider', (text) => {
      const routed = payload({ turnIntent: intent('TEXT') });
      expect(service.detectImageFollowUp(routed, imageThread, [imageAnswer, user(text)])).toBe(
        routed,
      );
    });

    it.each(NON_ENGLISH)('a MODEL IMAGE_EDIT intent re-routes a %s follow-up', (_l, text) => {
      const out = service.detectImageFollowUp(
        payload({ turnIntent: intent('IMAGE_EDIT') }),
        imageThread,
        [imageAnswer, user(text)],
      );
      expect(out.selectedProvider).toBe('IMAGE_GEMINI');
      expect(out.selectedModel).toBe('nano-banana');
    });

    it('legacy: no intent re-routes "another one" and keeps "Keep it cat as it is" (no prefix)', () => {
      expect(
        service.detectImageFollowUp(payload(), imageThread, [imageAnswer, user('another one')])
          .selectedProvider,
      ).toBe('IMAGE_GEMINI');
      const routed = payload();
      expect(
        service.detectImageFollowUp(routed, imageThread, [
          imageAnswer,
          user('Keep it cat as it is'),
        ]),
      ).toBe(routed);
    });
  });

  describe('video request', () => {
    it.each(NON_ENGLISH)('a MODEL VIDEO intent in AUTO goes to video for %s', async (_l, text) => {
      const out = await service.detectVideoRequest(payload({ turnIntent: intent('VIDEO') }), [
        user(text),
      ]);
      expect(out.selectedProvider).toBe('VIDEO_GEMINI');
    });

    it('a MODEL VIDEO intent with a picked chat model keeps the pick (only AUTO re-routes)', async () => {
      const manual = payload({ routingMode: 'MANUAL_MODEL', turnIntent: intent('VIDEO') });
      expect(await service.detectVideoRequest(manual, [user('بحر هادئ')])).toBe(manual);
    });

    it('a MODEL TEXT intent beats the video keywords', async () => {
      const routed = payload({ turnIntent: intent('TEXT') });
      expect(await service.detectVideoRequest(routed, [user('make a video of the sea')])).toBe(
        routed,
      );
    });

    it('legacy: no intent still reads the keywords', async () => {
      expect(
        (await service.detectVideoRequest(payload(), [user('make a video of the sea')]))
          .selectedProvider,
      ).toBe('VIDEO_GEMINI');
    });
  });

  describe('attachment edit', () => {
    const withImage = (text: string): unknown => user(text, { fileIds: ['img-1'] });

    it('a MODEL TEXT intent keeps "remove the background" a question about the picture', async () => {
      mimeTypes.mockResolvedValue(['image/png']);
      const routed = payload({ turnIntent: intent('TEXT') });
      expect(
        await service.detectImageFromAttachment(routed, [withImage('remove the background')], 'u1'),
      ).toBe(routed);
      expect(mimeTypes).not.toHaveBeenCalled();
    });

    it.each(NON_ENGLISH)(
      'a MODEL IMAGE_EDIT intent edits the attached image (%s)',
      async (_l, text) => {
        mimeTypes.mockResolvedValue(['image/png']);
        const out = await service.detectImageFromAttachment(
          payload({ turnIntent: intent('IMAGE_EDIT') }),
          [withImage(text)],
          'u1',
        );
        expect(out.selectedProvider.startsWith('IMAGE_')).toBe(true);
      },
    );

    it('a MODEL IMAGE_EDIT intent never edits a PDF', async () => {
      mimeTypes.mockResolvedValue(['application/pdf']);
      const routed = payload({ turnIntent: intent('IMAGE_EDIT') });
      expect(await service.detectImageFromAttachment(routed, [withImage('أزرق')], 'u1')).toBe(
        routed,
      );
    });

    it('legacy: no intent edits on "remove the background"', async () => {
      mimeTypes.mockResolvedValue(['image/png']);
      const out = await service.detectImageFromAttachment(
        payload(),
        [withImage('remove the background')],
        'u1',
      );
      expect(out.selectedProvider.startsWith('IMAGE_')).toBe(true);
    });
  });

  describe('pickOverridden', () => {
    const imageModelPick = {
      routingMode: 'MANUAL_MODEL',
      selectedProvider: 'GEMINI',
      selectedModel: 'models/gemini-3-pro-image-preview',
    };

    it('does not redirect the answering model back to the image generator', async () => {
      const routed = payload({
        ...imageModelPick,
        turnIntent: intent('TEXT', {
          pickOverridden: { provider: 'GEMINI', model: 'models/gemini-3-pro-image-preview' },
        }),
      });
      const out = await service.applyFollowUpOverrides(routed, null, [user('Do you know clawAI?')]);
      expect(out.selectedProvider).toBe('GEMINI');
    });

    it('legacy: without an intent the image-output model is redirected as before', async () => {
      const out = await service.applyFollowUpOverrides(payload(imageModelPick), null, [
        user('Do you know clawAI?'),
      ]);
      expect(out.selectedProvider).toBe('IMAGE_GEMINI');
    });
  });

  describe('message.routed parsing and metadata', () => {
    const base = {
      messageId: 'm1',
      threadId: 't1',
      selectedProvider: 'GEMINI',
      selectedModel: 'models/gemini-2.5-flash',
      routingMode: 'AUTO',
    };

    it('reads turnIntent off the event, and drops a malformed one', () => {
      expect(
        service.parseMessageRoutedPayload({
          ...base,
          turnIntent: intent('FILE', { fileFormat: 'pdf' }),
        })?.turnIntent,
      ).toEqual(intent('FILE', { fileFormat: 'pdf' }));
      expect(
        service.parseMessageRoutedPayload({ ...base, turnIntent: { kind: 'NOPE' } })?.turnIntent,
      ).toBeUndefined();
    });

    it('persists turnIntent and intentPickOverridden on the assistant message', () => {
      const pick = { provider: 'IMAGE_GEMINI', model: 'nano-banana' };
      const metadata = service.buildAssistantMetadata({
        payload: payload({ turnIntent: intent('TEXT', { pickOverridden: pick }) }),
        llmResponse: { content: 'hi', provider: 'GEMINI', model: 'models/gemini-2.5-flash' },
        hasVisibleContent: true,
        routeRoadmap: {},
        progressSummary: [],
      });
      expect(metadata['turnIntent']).toEqual({ kind: 'TEXT', source: 'MODEL', confidence: 0.92 });
      expect(metadata['intentPickOverridden']).toEqual(pick);
    });

    it('adds neither key without an intent', () => {
      const metadata = service.buildAssistantMetadata({
        payload: payload(),
        llmResponse: { content: 'hi', provider: 'GEMINI', model: 'models/gemini-2.5-flash' },
        hasVisibleContent: true,
        routeRoadmap: {},
        progressSummary: [],
      });
      expect(metadata).not.toHaveProperty('turnIntent');
      expect(metadata).not.toHaveProperty('intentPickOverridden');
    });
  });

  describe('previousTurnKind on message.created', () => {
    const turn = { id: 'u2', threadId: 't1', createdAt: new Date('2026-11-22T10:00:00Z') };

    it('is the kind of the latest answer BEFORE the turn (newest-first rows)', async () => {
      findRecentByThreadId.mockResolvedValue([
        // A regenerated turn's own old answer comes after it and is ignored.
        {
          id: 'a2',
          role: 'ASSISTANT',
          createdAt: new Date('2026-11-22T10:00:05Z'),
          metadata: null,
        },
        { id: 'u2', role: 'USER', createdAt: turn.createdAt, metadata: null },
        {
          id: 'a1',
          role: 'ASSISTANT',
          createdAt: new Date('2026-11-22T09:59:00Z'),
          metadata: { type: 'image_generation' },
        },
        { id: 'u1', role: 'USER', createdAt: new Date('2026-11-22T09:58:00Z'), metadata: null },
      ]);
      expect(await service.previousTurnKindField(turn)).toEqual({ previousTurnKind: 'IMAGE' });
      expect(findRecentByThreadId).toHaveBeenCalledWith('t1', expect.any(Number));
    });

    it('is TEXT on a new thread and left out when the read fails', async () => {
      findRecentByThreadId.mockResolvedValue([
        { id: 'u2', role: 'USER', createdAt: turn.createdAt, metadata: null },
      ]);
      expect(await service.previousTurnKindField(turn)).toEqual({ previousTurnKind: 'TEXT' });
      findRecentByThreadId.mockRejectedValue(new Error('db down'));
      expect(await service.previousTurnKindField(turn)).toEqual({});
    });
  });
});
