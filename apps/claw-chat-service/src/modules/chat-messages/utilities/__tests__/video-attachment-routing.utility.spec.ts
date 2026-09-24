import { HttpStatus } from '@nestjs/common';

import { GEMINI_VIDEO_CAPABLE_MODELS } from '../../../../common/constants';
import { BusinessException } from '../../../../common/errors';
import type { AssembledContext } from '../../types/context.types';
import type { MessageRoutedData } from '../../types/execution.types';
import { resolveVideoAttachmentCandidates } from '../video-attachment-routing.utility';
import {
  disabledCrossThreadResult,
  emptyConversationManifest,
  fallbackModelTokenBudget,
} from '../../utilities/assembled-context.utility';

const makePayload = (
  routingMode: string,
  selectedProvider: string,
  selectedModel: string,
): MessageRoutedData => ({
  messageId: 'message-1',
  threadId: 'thread-1',
  selectedProvider,
  selectedModel,
  routingMode,
  timestamp: '2026-07-29T00:00:00.000Z',
});

const makeContext = (mimeType?: string): AssembledContext =>
  ({
    userId: 'user-1',
    systemPrompt: null,
    threadMessages: [],
    memories: [],
    contextPackItems: [],
    fileContents:
      mimeType === undefined
        ? []
        : [
            {
              id: 'file-1',
              filename: 'clip.mp4',
              mimeType,
              content: Buffer.from('video').toString('base64'),
            },
          ],
    workspaceCitations: [],
    researchEvidence: [],
    researchRunId: null,
    researchWarnings: [],
    researchRequested: false,
    researchToolsUsed: [],
    tokenBudget: 4096,
    modelBudget: fallbackModelTokenBudget(),
    conversationManifest: emptyConversationManifest(),
    crossThread: disabledCrossThreadResult(),
  }) as AssembledContext;

const fallbackCandidates = [
  { provider: 'local-ollama', model: 'qwen3:1.7b' },
  { provider: 'OPENAI', model: 'gpt-4o' },
];

describe('resolveVideoAttachmentCandidates', () => {
  it('preserves the ordinary candidate chain when no video is attached', () => {
    const candidates = resolveVideoAttachmentCandidates(
      makePayload('AUTO', 'local-ollama', 'qwen3:1.7b'),
      makeContext(),
      fallbackCandidates,
    );

    expect(candidates).toEqual(fallbackCandidates);
  });

  it('routes AUTO video requests exclusively to the canonical Gemini video model', () => {
    const candidates = resolveVideoAttachmentCandidates(
      makePayload('AUTO', 'local-ollama', 'qwen3:1.7b'),
      makeContext('video/mp4'),
      fallbackCandidates,
    );

    expect(candidates).toEqual([{ provider: 'GEMINI', model: 'gemini-2.5-flash' }]);
  });

  it.each(['gemini-2.5-flash', 'gemini-2.5-pro'])(
    'keeps a manually selected video-capable Gemini model (%s) without fallbacks',
    (model) => {
      const candidates = resolveVideoAttachmentCandidates(
        makePayload('MANUAL_MODEL', 'GEMINI', model),
        makeContext('video/webm'),
        [
          { provider: 'GEMINI', model },
          { provider: 'OPENAI', model: 'gpt-4o' },
        ],
      );

      expect(candidates).toEqual([{ provider: 'GEMINI', model }]);
    },
  );

  it('fails clearly before dispatching a manually selected provider that cannot read video', () => {
    expect(() =>
      resolveVideoAttachmentCandidates(
        makePayload('MANUAL_MODEL', 'OPENAI', 'gpt-4o'),
        makeContext('video/mp4'),
        fallbackCandidates,
      ),
    ).toThrow(
      // Vitest compares the whole thrown object where Jest compared only the
      // message, so the expected exception carries the same status and
      // messageKey the utility actually raises.
      new BusinessException(
        'The selected provider/model OPENAI/gpt-4o cannot process video attachments. Choose Gemini/gemini-2.5-flash, Gemini/gemini-2.5-pro, or use Auto.',
        'VIDEO_ATTACHMENT_PROVIDER_UNSUPPORTED',
        HttpStatus.BAD_REQUEST,
        'chat.errors.videoAttachmentProviderUnsupported',
      ),
    );
  });

  it.each([
    ['MANUAL_MODEL', 'OPENAI', 'gpt-4o', 'chat.errors.videoAttachmentProviderUnsupported'],
    [
      'LOCAL_ONLY',
      'local-ollama',
      'qwen3:1.7b',
      'chat.errors.videoAttachmentLocalModelUnavailable',
    ],
  ])(
    'includes a localizable message key for %s video routing failures',
    (routingMode, provider, model, messageKey) => {
      try {
        resolveVideoAttachmentCandidates(
          makePayload(routingMode, provider, model),
          makeContext('video/mp4'),
          fallbackCandidates,
        );
        throw new Error('Expected video routing to fail');
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(BusinessException);
        expect((error as BusinessException).getResponse()).toEqual(
          expect.objectContaining({ messageKey }),
        );
      }
    },
  );

  it('fails clearly when the manually selected Gemini model is not video-capable', () => {
    expect(() =>
      resolveVideoAttachmentCandidates(
        makePayload('MANUAL_MODEL', 'GEMINI', 'text-embedding-004'),
        makeContext('video/mp4'),
        [{ provider: 'GEMINI', model: 'text-embedding-004' }],
      ),
    ).toThrow('GEMINI/text-embedding-004 cannot process video attachments');
  });

  it.each(['gemini-2.5-flash', 'gemini-2.5-pro'])(
    "accepts the connector catalog's `models/`-prefixed id for a video-capable model (%s) — regression for the self-contradictory rejection bug",
    (model) => {
      const candidates = resolveVideoAttachmentCandidates(
        makePayload('MANUAL_MODEL', 'GEMINI', `models/${model}`),
        makeContext('video/webm'),
        [{ provider: 'GEMINI', model: `models/${model}` }],
      );

      expect(candidates).toEqual([{ provider: 'GEMINI', model }]);
    },
  );

  it('never rejects a model while recommending that same model as the fix', () => {
    // Bug reproduction: production rejected exactly the models it told the
    // user to switch to (gemini-2.5-flash rejected while recommended). This
    // proves the rejection check and the suggestion text are both derived
    // from the same GEMINI_VIDEO_CAPABLE_MODELS data, so they can never
    // disagree again — for every model this codebase considers video
    // capable, resolving it never throws, and for both the bare and the
    // catalog `models/`-prefixed id shapes.
    for (const model of GEMINI_VIDEO_CAPABLE_MODELS) {
      for (const candidateModel of [model, `models/${model}`]) {
        expect(() =>
          resolveVideoAttachmentCandidates(
            makePayload('MANUAL_MODEL', 'GEMINI', candidateModel),
            makeContext('video/mp4'),
            [{ provider: 'GEMINI', model: candidateModel }],
          ),
        ).not.toThrow();
      }
    }
  });

  it('builds the suggested-alternatives text from the same capability set it just rejected against', () => {
    try {
      resolveVideoAttachmentCandidates(
        makePayload('MANUAL_MODEL', 'OPENAI', 'gpt-4o'),
        makeContext('video/mp4'),
        fallbackCandidates,
      );
      throw new Error('Expected video routing to fail');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(BusinessException);
      const message = (error as BusinessException).message;
      for (const model of GEMINI_VIDEO_CAPABLE_MODELS) {
        expect(message).toContain(`Gemini/${model}`);
      }
    }
  });

  it.each(['LOCAL_ONLY', 'PRIVACY_FIRST'])(
    'never exfiltrates video from the %s routing mode',
    (routingMode) => {
      expect(() =>
        resolveVideoAttachmentCandidates(
          makePayload(routingMode, 'local-ollama', 'qwen3:1.7b'),
          makeContext('video/mp4'),
          fallbackCandidates,
        ),
      ).toThrow(
        `Video attachments cannot be processed in ${routingMode} mode because no local video-capable model is configured.`,
      );
    },
  );
});
