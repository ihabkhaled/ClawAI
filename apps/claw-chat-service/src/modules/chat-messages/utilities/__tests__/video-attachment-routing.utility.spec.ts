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
      new BusinessException(
        'The selected provider/model OPENAI/gpt-4o cannot process video attachments. Choose Gemini/gemini-2.5-flash, Gemini/gemini-2.5-pro, or use Auto.',
        'VIDEO_ATTACHMENT_PROVIDER_UNSUPPORTED',
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
