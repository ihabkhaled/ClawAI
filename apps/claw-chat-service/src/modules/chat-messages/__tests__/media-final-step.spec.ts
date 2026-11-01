import { TokenLedgerContext } from '@claw/shared-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChatSurface } from '../../../common/enums/chat-surface.enum';
import { MediaGenerationState } from '../enums/media-generation-state.enum';
import { MediaKind } from '../enums/media-kind.enum';
import { MediaFinalStepManager } from '../managers/media-final-step.manager';
import { StreamCancellationService } from '../services/stream-cancellation.service';
import { BestOfNManager } from '../managers/best-of-n.manager';
import { ConsensusExecutionManager } from '../managers/consensus-execution.manager';
import { CostEnsembleManager } from '../managers/cost-ensemble.manager';
import { EscalationChainManager } from '../managers/escalation-chain.manager';
import { PipelineManager } from '../managers/pipeline.manager';
import { RolePackManager } from '../managers/role-pack.manager';
import { TaskDecompositionManager } from '../managers/task-decomposition.manager';
import { VerifierManager } from '../managers/verifier.manager';
import { MediaToolLoopManager } from '../managers/media-tool-loop.manager';
import type { AccessControlService } from '../services/access-control.service';
import type { AssembledContext } from '../types/context.types';
import type { LlmResponse } from '../types/execution.types';
import type { PluginModelRound } from '../types/plugin-tools.types';
import { readStoredMediaGenerations } from '../utilities/media-metadata.utility';
import { wantsMediaTools } from '../utilities/media-tool-eligibility.utility';
import answer_repair_source from '../managers/answer-repair.manager.ts?raw';
import best_of_n_source from '../managers/best-of-n.manager.ts?raw';
import chat_execution_source from '../managers/chat-execution.manager.ts?raw';
import consensus_source from '../managers/consensus-execution.manager.ts?raw';
import cost_ensemble_source from '../managers/cost-ensemble.manager.ts?raw';
import escalation_source from '../managers/escalation-chain.manager.ts?raw';
import pipeline_source from '../managers/pipeline.manager.ts?raw';
import role_pack_source from '../managers/role-pack.manager.ts?raw';
import task_decomposition_source from '../managers/task-decomposition.manager.ts?raw';
import verifier_source from '../managers/verifier.manager.ts?raw';

const gateway = vi.hoisted(() => ({
  startMedia: vi.fn(),
  awaitMedia: vi.fn(),
  cancelMedia: vi.fn(),
  linkMedia: vi.fn(),
}));
vi.mock('../utilities/media-gateway.utility', () => gateway);

const FINAL_STEP_SURFACES = [
  ChatSurface.CONSENSUS,
  ChatSurface.ESCALATION,
  ChatSurface.DECOMPOSE,
  ChatSurface.BEST_OF_N,
  ChatSurface.PIPELINE,
  ChatSurface.COST_ENSEMBLE,
  ChatSurface.ROLE_PACK,
  ChatSurface.VERIFY,
];
const NEVER_OFFERED = [
  ChatSurface.REPAIR,
  ChatSurface.JUDGE,
  ChatSurface.CRITIC,
  ChatSurface.AGENT,
];
const GROK = 'grok-4.20-0309-non-reasoning';

function ctx(text: string, overrides: Partial<AssembledContext> = {}): AssembledContext {
  return {
    userId: 'user-1',
    systemPrompt: null,
    threadMessages: [{ id: 'um-1', threadId: 'th-1', role: 'USER', content: text, metadata: null }],
    memories: [],
    contextPackItems: [],
    fileContents: [],
    workspaceCitations: [],
    platformSurface: ChatSurface.BEST_OF_N,
    ...overrides,
  } as unknown as AssembledContext;
}

describe('final-step-only offer (many-candidate surfaces)', () => {
  it.each(FINAL_STEP_SURFACES)(
    '%s: candidates get no tools, the final answer call does',
    (surface) => {
      expect(wantsMediaTools(ctx('draw a cat', { platformSurface: surface }), 'GROK', GROK)).toBe(
        false,
      );
      expect(
        wantsMediaTools(
          ctx('draw a cat', { platformSurface: surface, mediaFinalStep: true }),
          'GROK',
          GROK,
        ),
      ).toBe(true);
    },
  );

  it.each(NEVER_OFFERED)('%s: never offered the tools, even flagged as a final step', (surface) => {
    expect(
      wantsMediaTools(
        ctx('draw a cat', { platformSurface: surface, mediaFinalStep: true }),
        'GROK',
        GROK,
      ),
    ).toBe(false);
  });
});

describe('MediaFinalStepManager', () => {
  const callProvider = vi.fn();
  const manager = new MediaFinalStepManager({ callProvider } as never);
  const base = {
    threadSettings: undefined,
    ledgerContext: TokenLedgerContext.BEST_OF_N,
    answer: 'Here is a red apple.',
  };

  beforeEach(() => callProvider.mockReset());

  it('spends nothing on a turn that did not ask for media', async () => {
    const result = await manager.finalize({
      ...base,
      context: ctx('explain how apples grow'),
      provider: 'GROK',
      model: GROK,
    });
    expect(result).toEqual({ content: 'Here is a red apple.' });
    expect(callProvider).not.toHaveBeenCalled();
  });

  it('runs ONE tool-offering call on the answering model and returns the media', async () => {
    const media = [
      { kind: MediaKind.IMAGE, id: 'g1', status: MediaGenerationState.COMPLETED, prompt: 'apple' },
    ];
    callProvider.mockResolvedValue({
      content: 'I drew your apple.',
      provider: 'GROK',
      model: GROK,
      mediaGenerations: media,
    } as unknown as LlmResponse);
    const result = await manager.finalize({
      ...base,
      context: ctx('draw a red apple'),
      provider: 'GROK',
      model: GROK,
    });
    expect(callProvider).toHaveBeenCalledTimes(1);
    const sent = callProvider.mock.calls[0]?.[2] as AssembledContext;
    expect(sent.mediaFinalStep).toBe(true);
    expect(sent.systemPrompt).toContain('<prepared_answer>');
    expect(callProvider.mock.calls[0]?.[8]).toBe(TokenLedgerContext.BEST_OF_N);
    expect(result).toEqual({ content: 'I drew your apple.', mediaGenerations: media });
  });

  it('keeps the orchestrated answer when the model made no media', async () => {
    callProvider.mockResolvedValue({ content: 'Rewritten.', provider: 'GROK', model: GROK });
    const result = await manager.finalize({
      ...base,
      context: ctx('draw a red apple'),
      provider: 'GROK',
      model: GROK,
    });
    expect(result).toEqual({ content: 'Here is a red apple.' });
  });

  it('strips a candidate claim of made media when no tool result backs it', async () => {
    const result = await manager.finalize({
      ...base,
      context: ctx('draw a red apple'),
      provider: 'OLLAMA',
      model: 'kimi-k2.6:cloud',
      answer: 'Image generated: a red apple\nEnjoy.',
    });
    expect(callProvider).not.toHaveBeenCalled();
    expect(result.content).toBe('Enjoy.');
    expect(result.mediaGenerations).toBeUndefined();
  });

  it('never costs the user the answer if the media step fails', async () => {
    // A plain function, not a vi.fn: vitest 5 reports a throwing mock as a failed test.
    const failing = new MediaFinalStepManager({
      callProvider: async (): Promise<never> => {
        throw new Error('boom');
      },
    } as never);
    const result = await failing.finalize({
      ...base,
      context: ctx('draw a red apple'),
      provider: 'GROK',
      model: GROK,
    });
    expect(result).toEqual({ content: 'Here is a red apple.' });
  });
});

describe('the media loop on a final step: shared budget and Stop', () => {
  beforeEach(() => {
    gateway.startMedia
      .mockReset()
      .mockResolvedValue({ ok: true, id: 'g', provider: 'p', model: 'm' });
    gateway.awaitMedia
      .mockReset()
      .mockResolvedValue({ state: 'completed', snapshot: { id: 'g', status: 'COMPLETED' } });
    gateway.cancelMedia.mockReset().mockResolvedValue(true);
  });

  const access = {
    hasPlanFeatureFor: vi.fn().mockResolvedValue(true),
  } as unknown as AccessControlService;
  const call = (id: string) => ({
    callId: id,
    nativeName: 'generate_image',
    toolName: 'generate_image',
    toolVersion: '1',
    operation: 'generate',
    targetId: 'clawai-media',
    arguments: { prompt: 'a cat' },
  });
  const modelThatCalls = (count: number) => {
    const queue: LlmResponse[] = [
      {
        content: '',
        provider: 'GROK',
        model: GROK,
        toolCalls: Array.from({ length: count }, (_, i) => call(`c${String(i)}`)),
      } as unknown as LlmResponse,
      { content: 'done', provider: 'GROK', model: GROK } as LlmResponse,
    ];
    return vi.fn((_round: PluginModelRound) =>
      Promise.resolve(queue.shift() ?? ({ content: 'done' } as LlmResponse)),
    );
  };
  const planRefusal = (): LlmResponse =>
    ({ content: 'plan', provider: 'GROK', model: GROK }) as LlmResponse;

  it('the final step owns the thread Stop key', async () => {
    const controller = new AbortController();
    const cancellation = {
      register: vi.fn().mockReturnValue(controller),
      getController: vi.fn().mockReturnValue(undefined),
      release: vi.fn(),
    } as unknown as StreamCancellationService;
    const loop = new MediaToolLoopManager(access, cancellation);
    await loop.run({
      context: ctx('draw a cat', { mediaFinalStep: true }),
      executionOptions: undefined,
      callModel: modelThatCalls(1),
      planRefusal,
    });
    expect(cancellation.register).toHaveBeenCalledWith('th-1');
    expect(cancellation.release).toHaveBeenCalledWith('th-1');
  });

  it('Stop during the final step cancels the in-flight job and ends the turn', async () => {
    const controller = new AbortController();
    gateway.awaitMedia.mockImplementation(() => {
      controller.abort();
      return Promise.resolve({ state: 'cancelled', snapshot: undefined });
    });
    const cancellation = {
      register: vi.fn().mockReturnValue(controller),
      getController: vi.fn().mockReturnValue(undefined),
      release: vi.fn(),
    } as unknown as StreamCancellationService;
    const loop = new MediaToolLoopManager(access, cancellation);
    const model = modelThatCalls(1);
    await loop.run({
      context: ctx('draw a cat', { mediaFinalStep: true }),
      executionOptions: undefined,
      callModel: model,
      planRefusal,
    });
    expect(gateway.cancelMedia).toHaveBeenCalledWith('image', 'g', 'user-1');
    expect(model).toHaveBeenCalledTimes(1);
  });

  it('the 3-per-message budget is shared across the whole orchestration', async () => {
    const loop = new MediaToolLoopManager(access);
    for (const surface of [ChatSurface.BEST_OF_N, ChatSurface.BEST_OF_N]) {
      await loop.run({
        context: ctx('draw a cat', { platformSurface: surface, mediaFinalStep: true }),
        executionOptions: undefined,
        callModel: modelThatCalls(2),
        planRefusal,
      });
    }
    // 2 + 2 requested, 3 allowed for the one user message.
    expect(gateway.startMedia).toHaveBeenCalledTimes(3);
  });
});

describe('every surface that produces an answer carries the media to its saved message', () => {
  it.each([
    ['best-of-n', best_of_n_source, 'TokenLedgerContext.BEST_OF_N'],
    ['cost-ensemble', cost_ensemble_source, 'TokenLedgerContext.COST_ENSEMBLE'],
    ['role-pack', role_pack_source, 'TokenLedgerContext.ROLE_PACK'],
    ['pipeline', pipeline_source, 'TokenLedgerContext.PIPELINE'],
    ['decompose', task_decomposition_source, 'TokenLedgerContext.TASK_DECOMPOSITION'],
    ['escalation', escalation_source, 'TokenLedgerContext.ESCALATION_CHAIN'],
    ['consensus', consensus_source, 'TokenLedgerContext.CONSENSUS'],
    ['verify', verifier_source, 'TokenLedgerContext.VERIFY'],
  ])('%s finalizes once and saves mediaGenerations', (_name, source, ledger) => {
    expect(source).toContain('mediaFinalStep?.finalize');
    expect(source).toContain(ledger);
    expect(source).toContain('buildMediaMetaPart(final ?? {})');
  });

  it('repair keeps the media of the message it rewrites; the judge revision keeps it too', () => {
    expect(answer_repair_source).toContain('readStoredMediaGenerations(source?.metadata)');
    expect(answer_repair_source).toContain('buildMediaMetaPart({ mediaGenerations: preserved })');
    expect(chat_execution_source).toContain('...mediaGenerationsField(finalResponse)');
  });
});

describe('readStoredMediaGenerations', () => {
  it('reads valid entries and drops the malformed, never inventing one', () => {
    expect(
      readStoredMediaGenerations({
        mediaGenerations: [
          { kind: 'image', id: 'g1', status: 'completed', prompt: 'a cat' },
          { kind: 'video', id: 'v1', status: 'failed' },
          { kind: 'gif', id: 'x', status: 'completed' },
          { kind: 'image', id: '', status: 'completed' },
          'junk',
        ],
      }),
    ).toEqual([
      { kind: 'image', id: 'g1', status: 'completed', prompt: 'a cat' },
      { kind: 'video', id: 'v1', status: 'failed', prompt: '' },
    ]);
    expect(readStoredMediaGenerations(null)).toEqual([]);
    expect(readStoredMediaGenerations({ mediaGenerations: 'x' })).toEqual([]);
  });
});

describe('linking: the media a final step made is linked to the SAVED message', () => {
  const final = {
    content: 'Here you go.',
    mediaGenerations: [
      { kind: MediaKind.IMAGE, id: 'img-1', status: MediaGenerationState.COMPLETED, prompt: 'cat' },
      { kind: MediaKind.VIDEO, id: 'vid-1', status: MediaGenerationState.COMPLETED, prompt: 'cat' },
      { kind: MediaKind.AUDIO, id: 'aud-1', status: MediaGenerationState.COMPLETED, prompt: 'cat' },
    ],
  };

  beforeEach(() => {
    gateway.linkMedia.mockReset().mockResolvedValue(true);
  });

  it('linkSaved links every image, video and audio with the owner and the saved message id', async () => {
    const manager = new MediaFinalStepManager({} as never, undefined, {
      findById: vi.fn().mockResolvedValue({ userId: 'owner-1' }),
    } as never);
    await manager.linkSaved(final, 'th-1', 'saved-9');
    expect(gateway.linkMedia.mock.calls).toEqual([
      ['image', 'img-1', 'owner-1', 'saved-9'],
      ['video', 'vid-1', 'owner-1', 'saved-9'],
      ['audio', 'aud-1', 'owner-1', 'saved-9'],
    ]);
  });

  const selection = { modelSelectionMode: 'AUTO', actualProvider: 'GROK', actualModel: GROK };
  const bundle = { context: ctx('draw a cat'), threadSettings: undefined };
  const cases: Array<[string, new (...a: never[]) => object, string, unknown[]]> = [
    [
      'best-of-n',
      BestOfNManager,
      'storeWinnerMessage',
      ['th-1', { content: 'a', model: 'm', latencyMs: 1 }, [], selection, null, final],
    ],
    [
      'cost-ensemble',
      CostEnsembleManager,
      'storeSelectedMessage',
      ['th-1', 'a', 1, {}, selection, final],
    ],
    [
      'role-pack',
      RolePackManager,
      'storePackMessage',
      ['th-1', 'a', 'pack', [], selection, null, 1, final],
    ],
    ['pipeline', PipelineManager, 'storeFinalMessage', ['th-1', 'a', 'm', 1, {}, final]],
    ['decompose', TaskDecompositionManager, 'storeMergedMessage', ['th-1', 'a', 'm', 1, {}, final]],
    [
      'escalation',
      EscalationChainManager,
      'storeChainResult',
      [
        'th-1',
        { finalAnswer: 'a', finalProvider: 'GROK', finalModel: 'm', stepResults: [] },
        null,
        final,
      ],
    ],
    [
      'consensus',
      ConsensusExecutionManager,
      'storeSynthesisMessage',
      [
        'th-1',
        'grp',
        { finalAnswer: 'a', analysis: { agreementScore: 1 }, modelBreakdown: [] },
        null,
        final,
      ],
    ],
    [
      'verify',
      VerifierManager,
      'storeVerifiedMessage',
      ['th-1', 'a', { score: 1, issues: [] }, 0, Date.now(), selection, null, bundle],
    ],
  ];

  it.each(cases)(
    '%s saves the final message and links its media to that message',
    async (_name, Manager, method, args) => {
      const linkSaved = vi.fn();
      const create = vi.fn().mockResolvedValue({ id: 'saved-1' });
      const manager = Object.assign(Object.create(Manager.prototype) as object, {
        chatMessagesRepository: { create },
        mediaFinalStep: {
          linkSaved,
          finalizeForBundle: vi.fn().mockResolvedValue(final),
          finalize: vi.fn().mockResolvedValue(final),
        },
      });
      await (manager as Record<string, (...a: unknown[]) => Promise<void>>)[method]?.(...args);
      expect(create).toHaveBeenCalledTimes(1);
      expect(create.mock.calls[0]?.[0].content).toBe('Here you go.');
      expect(create.mock.calls[0]?.[0].metadata.mediaGenerations).toHaveLength(3);
      expect(linkSaved).toHaveBeenCalledWith(final, 'th-1', 'saved-1');
    },
  );
});

describe('Stop on an orchestrated turn, with the real StreamCancellationService', () => {
  function realCancellation() {
    const handlers: Array<(channel: string, key: string) => void> = [];
    const redis = {
      set: vi.fn().mockResolvedValue('OK'),
      del: vi.fn().mockResolvedValue(1),
      eval: vi.fn((_s: string, _n: number, channel: string, key: string) => {
        for (const handler of handlers) handler(channel, key);
        return Promise.resolve(1);
      }),
    };
    const subscriber = {
      onMessage: vi.fn((h: (c: string, k: string) => void) => handlers.push(h)),
      onReady: vi.fn(),
      subscribe: vi.fn().mockResolvedValue(undefined),
    };
    return new StreamCancellationService(redis as never, subscriber as never);
  }

  it('the whole turn is cancellable; after Stop the final step saves "stopped" and makes no media', async () => {
    const real = realCancellation();
    await real.onModuleInit();
    const callProvider = vi.fn();
    const manager = new MediaFinalStepManager(
      { callProvider } as never,
      undefined,
      undefined,
      real,
    );
    let result: unknown;
    await manager.runScoped('th-1', async () => {
      // Stop arrives while the candidates are still running.
      await real.cancel('th-1');
      result = await manager.finalize({
        context: ctx('draw a cat'),
        threadSettings: undefined,
        provider: 'GROK',
        model: GROK,
        ledgerContext: TokenLedgerContext.CONSENSUS,
        answer: 'synthesis text',
      });
    });
    expect(result).toEqual({ content: 'Generation stopped at your request.' });
    expect(callProvider).not.toHaveBeenCalled();
    expect(real.isActive('th-1')).toBe(false);
  });

  it('Stop returns cancelled:true while an orchestrated turn runs (the key is registered)', async () => {
    const real = realCancellation();
    await real.onModuleInit();
    const manager = new MediaFinalStepManager({} as never, undefined, undefined, real);
    let cancelled: boolean | undefined;
    await manager.runScoped('th-2', async () => {
      cancelled = await real.cancel('th-2');
    });
    expect(cancelled).toBe(true);
  });

  it('Stop during the final media step cancels the job and saves "stopped"', async () => {
    const real = realCancellation();
    await real.onModuleInit();
    const access = {
      hasPlanFeatureFor: vi.fn().mockResolvedValue(true),
    } as unknown as AccessControlService;
    const loop = new MediaToolLoopManager(access, real);
    gateway.startMedia
      .mockReset()
      .mockResolvedValue({ ok: true, id: 'job-1', provider: 'p', model: 'm' });
    gateway.cancelMedia.mockReset().mockResolvedValue(true);
    gateway.awaitMedia.mockReset().mockImplementation(
      (_k: unknown, _id: unknown, opts: { signal?: AbortSignal }) =>
        new Promise((resolve) => {
          opts.signal?.addEventListener('abort', () =>
            resolve({ state: 'cancelled', snapshot: undefined }),
          );
        }),
    );
    const manager = new MediaFinalStepManager({} as never, loop, undefined, real);
    const turn = manager.runScoped('th-1', () =>
      manager.finalize({
        context: { ...ctx('draw a cat'), platformSurface: ChatSurface.CONSENSUS },
        threadSettings: undefined,
        provider: 'OLLAMA',
        model: 'qwen3:7b',
        ledgerContext: TokenLedgerContext.CONSENSUS,
        answer: 'synthesis text',
      }),
    );
    await vi.waitFor(() => expect(gateway.awaitMedia).toHaveBeenCalled());
    await real.cancel('th-1');
    expect(await turn).toEqual({ content: 'Generation stopped at your request.' });
    expect(gateway.cancelMedia).toHaveBeenCalledWith('image', 'job-1', 'user-1');
  });
});

describe('a final answer from a model that cannot call tools still gets its media (direct path)', () => {
  const access = {
    hasPlanFeatureFor: vi.fn().mockResolvedValue(true),
  } as unknown as AccessControlService;
  const build = () => {
    const loop = new MediaToolLoopManager(access);
    return new MediaFinalStepManager({ callProvider: vi.fn() } as never, loop);
  };
  const run = (manager: MediaFinalStepManager, text: string) =>
    manager.finalize({
      context: { ...ctx(text), platformSurface: ChatSurface.BEST_OF_N },
      threadSettings: undefined,
      provider: 'local-ollama',
      model: 'qwen3:7b',
      ledgerContext: TokenLedgerContext.BEST_OF_N,
      answer: 'The lab answer.',
    });

  beforeEach(() => {
    gateway.startMedia
      .mockReset()
      .mockResolvedValue({ ok: true, id: 'img-9', provider: 'p', model: 'm' });
    gateway.awaitMedia
      .mockReset()
      .mockResolvedValue({ state: 'completed', snapshot: { id: 'img-9', status: 'COMPLETED' } });
  });

  it('create intent: exactly one generation, the request is the prompt, media on the final message', async () => {
    const result = await run(build(), 'draw a red apple');
    expect(gateway.startMedia).toHaveBeenCalledTimes(1);
    expect(gateway.startMedia.mock.calls[0]?.[0]).toMatchObject({
      kind: 'image',
      prompt: 'draw a red apple',
      userId: 'user-1',
      threadId: 'th-1',
    });
    expect(result.content).toBe('The lab answer.');
    expect(result.mediaGenerations).toEqual([
      { kind: 'image', id: 'img-9', status: 'completed', prompt: 'draw a red apple' },
    ]);
  });

  it('picks the kind with the shared classifiers: video and audio requests', async () => {
    await run(build(), 'make a 5 second video of waves');
    expect(gateway.startMedia.mock.calls[0]?.[0]).toMatchObject({ kind: 'video' });
    gateway.startMedia.mockClear();
    await run(build(), 'sing a short song about apples');
    expect(gateway.startMedia.mock.calls[0]?.[0]).toMatchObject({
      kind: 'audio',
      audioKind: 'MUSIC',
    });
  });

  it('discussion intent makes no media', async () => {
    const result = await run(build(), 'explain how diffusion models make images');
    expect(gateway.startMedia).not.toHaveBeenCalled();
    expect(result).toEqual({ content: 'The lab answer.' });
  });

  it('the per-message budget (3) is shared with the direct path', async () => {
    const manager = build();
    for (let i = 0; i < 5; i += 1) await run(manager, 'draw a red apple');
    expect(gateway.startMedia).toHaveBeenCalledTimes(3);
  });

  it('a plan without media makes none and keeps the answer', async () => {
    const noPlan = {
      hasPlanFeatureFor: vi.fn().mockResolvedValue(false),
    } as unknown as AccessControlService;
    const manager = new MediaFinalStepManager(
      { callProvider: vi.fn() } as never,
      new MediaToolLoopManager(noPlan),
    );
    expect(await run(manager, 'draw a red apple')).toEqual({ content: 'The lab answer.' });
    expect(gateway.startMedia).not.toHaveBeenCalled();
  });
});
