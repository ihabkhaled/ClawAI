import { GEMINI_VIDEO_CAPABLE_MODELS } from '../../../../common/constants';
import { MediaCapabilityState } from '../../../../common/enums/media-capability-state.enum';
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

  // Multimodal batch 8 (behaviour changed on purpose): AUTO is no longer forced
  // onto a hardcoded Gemini model. routing-service ranks by modality fit and
  // respects exposure, health and plan; a routed model that cannot watch the
  // video gets frames + transcript at the chokepoint.
  it('keeps the routed AUTO chain for a video instead of forcing Gemini', () => {
    expect(
      resolveVideoAttachmentCandidates(
        makePayload('AUTO', 'local-ollama', 'qwen3:1.7b'),
        makeContext('video/mp4'),
        fallbackCandidates,
        { selected: MediaCapabilityState.UNSUPPORTED, capableModels: null },
      ),
    ).toEqual(fallbackCandidates);
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

  // Behaviour changed on purpose: this used to throw
  // VIDEO_ATTACHMENT_PROVIDER_UNSUPPORTED. The user's model now answers from
  // the video's transcript and sampled frames.
  it.each([
    ['a non-Gemini model', 'OPENAI', 'gpt-4o'],
    ['a Gemini model that is not video-capable', 'GEMINI', 'text-embedding-004'],
  ])('never refuses %s — the chain is kept for frames + transcript', (_label, provider, model) => {
    const chain = [{ provider, model }, ...fallbackCandidates];
    expect(
      resolveVideoAttachmentCandidates(
        makePayload('MANUAL_MODEL', provider, model),
        makeContext('video/mp4'),
        chain,
      ),
    ).toEqual(chain);
  });

  // Behaviour changed on purpose: this used to throw
  // VIDEO_ATTACHMENT_LOCAL_MODEL_UNAVAILABLE. The local model gets the
  // transcript (and frames only through a LOCAL helper); nothing goes to cloud.
  it.each(['LOCAL_ONLY', 'PRIVACY_FIRST'])(
    'keeps the local chain in %s mode and never adds a cloud video model',
    (routingMode) => {
      const local = [{ provider: 'local-ollama', model: 'qwen3:1.7b' }];
      const candidates = resolveVideoAttachmentCandidates(
        makePayload(routingMode, 'local-ollama', 'qwen3:1.7b'),
        makeContext('video/mp4'),
        local,
        {
          selected: MediaCapabilityState.UNSUPPORTED,
          capableModels: [{ provider: 'GEMINI', model: 'gemini-2.5-flash' }],
        },
      );

      expect(candidates).toEqual(local);
      expect(candidates.some((candidate) => candidate.provider === 'GEMINI')).toBe(false);
    },
  );

  it('never throws for any routing mode or model', () => {
    for (const mode of ['AUTO', 'MANUAL_MODEL', 'MANUAL_PROVIDER', 'LOCAL_ONLY', 'PRIVACY_FIRST']) {
      for (const [provider, model] of [
        ['OPENAI', 'gpt-4o'],
        ['GEMINI', 'gemini-2.5-flash'],
        ['local-ollama', 'qwen3:1.7b'],
      ] as const) {
        expect(() =>
          resolveVideoAttachmentCandidates(
            makePayload(mode, provider, model),
            makeContext('video/mp4'),
            fallbackCandidates,
          ),
        ).not.toThrow();
      }
    }
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

  it('routes every statically video-capable Gemini id natively, bare or prefixed', () => {
    for (const model of GEMINI_VIDEO_CAPABLE_MODELS) {
      for (const candidateModel of [model, `models/${model}`]) {
        expect(
          resolveVideoAttachmentCandidates(
            makePayload('MANUAL_MODEL', 'GEMINI', candidateModel),
            makeContext('video/mp4'),
            [{ provider: 'GEMINI', model: candidateModel }],
          ),
        ).toEqual([{ provider: 'GEMINI', model }]);
      }
    }
  });

  // ADR-120: native eligibility comes from the connector catalog's VIDEO_INPUT
  // flag; the static set is only the fallback when the catalog cannot answer.
  describe('driven by per-model capability', () => {
    const catalog = [
      { provider: 'GEMINI', model: 'gemini-3.1-pro' },
      { provider: 'GEMINI', model: 'gemini-2.5-flash' },
    ];

    it('goes native for a model the catalog says takes video even if the static set lacks it', () => {
      const candidates = resolveVideoAttachmentCandidates(
        makePayload('MANUAL_MODEL', 'GEMINI', 'models/gemini-3.1-pro'),
        makeContext('video/mp4'),
        [],
        { selected: MediaCapabilityState.SUPPORTED, capableModels: catalog },
      );

      expect(candidates).toEqual([{ provider: 'GEMINI', model: 'gemini-3.1-pro' }]);
    });

    it('keeps the chain (frames + transcript) for a model the catalog says cannot take video', () => {
      const chain = [{ provider: 'GEMINI', model: 'gemini-2.5-pro' }];
      expect(
        resolveVideoAttachmentCandidates(
          makePayload('MANUAL_MODEL', 'GEMINI', 'gemini-2.5-pro'),
          makeContext('video/mp4'),
          chain,
          { selected: MediaCapabilityState.UNSUPPORTED, capableModels: catalog },
        ),
      ).toEqual(chain);
    });

    it('falls back to the static set when the catalog is unavailable', () => {
      const unknown = { selected: MediaCapabilityState.UNKNOWN, capableModels: null };

      expect(
        resolveVideoAttachmentCandidates(
          makePayload('MANUAL_MODEL', 'GEMINI', 'gemini-2.5-pro'),
          makeContext('video/mp4'),
          [],
          unknown,
        ),
      ).toEqual([{ provider: 'GEMINI', model: 'gemini-2.5-pro' }]);
    });

    it('never treats a non-Gemini model as native, even if the catalog flags it', () => {
      const chain = [{ provider: 'OPENAI', model: 'gpt-4o' }];
      expect(
        resolveVideoAttachmentCandidates(
          makePayload('MANUAL_MODEL', 'OPENAI', 'gpt-4o'),
          makeContext('video/mp4'),
          chain,
          {
            selected: MediaCapabilityState.SUPPORTED,
            capableModels: [{ provider: 'OPENAI', model: 'gpt-4o' }, ...catalog],
          },
        ),
      ).toEqual(chain);
    });
  });
});
