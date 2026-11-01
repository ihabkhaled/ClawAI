import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChatSurface } from '../../../common/enums/chat-surface.enum';
import { ToolChoiceMode } from '../../../common/enums/tool-choice-mode.enum';
import { MEDIA_TOOL_NAME, MEDIA_TOOL_TURN_BUDGET } from '../constants/media-tools.constants';
import { MediaKind } from '../enums/media-kind.enum';
import { MediaToolLoopManager } from '../managers/media-tool-loop.manager';
import type { AccessControlService } from '../services/access-control.service';
import { StreamCancellationService } from '../services/stream-cancellation.service';
import type { AssembledContext } from '../types/context.types';
import type { LlmResponse } from '../types/execution.types';
import type { MediaAwaitOutcome, MediaStartOutcome } from '../types/media-tools.types';
import type { PluginModelRound } from '../types/plugin-tools.types';
import type { NormalizedToolCall } from '../types/provider-tool.types';

const gateway = vi.hoisted(() => ({
  startMedia: vi.fn(),
  awaitMedia: vi.fn(),
  cancelMedia: vi.fn(),
}));
vi.mock('../utilities/media-gateway.utility', () => gateway);

function context(overrides: Partial<AssembledContext> = {}): AssembledContext {
  return {
    userId: 'user-1',
    systemPrompt: 'Be brief.',
    threadMessages: [
      { id: 'um-1', threadId: 'th-1', role: 'USER', content: 'draw me a red fox', metadata: null },
    ],
    memories: [],
    contextPackItems: [],
    fileContents: [],
    workspaceCitations: [],
    platformSurface: ChatSurface.CHAT,
    ...overrides,
  } as unknown as AssembledContext;
}

function contextSaying(text: string, overrides: Partial<AssembledContext> = {}): AssembledContext {
  return context({
    threadMessages: [
      { id: 'um-1', threadId: 'th-1', role: 'USER', content: text, metadata: null },
    ] as unknown as AssembledContext['threadMessages'],
    ...overrides,
  });
}

function response(content: string, toolCalls?: NormalizedToolCall[]): LlmResponse {
  return { content, provider: 'GROK', model: 'grok-4', toolCalls } as LlmResponse;
}

function call(kind: MediaKind, id: string, args: Record<string, unknown>): NormalizedToolCall {
  return {
    callId: id,
    nativeName: MEDIA_TOOL_NAME.get(kind) ?? '',
    toolName: MEDIA_TOOL_NAME.get(kind) ?? '',
    toolVersion: '1',
    operation: 'generate',
    targetId: 'clawai-media',
    arguments: args,
  };
}

const STARTED: MediaStartOutcome = {
  ok: true,
  id: 'gen-1',
  provider: 'IMAGE_GEMINI',
  model: 'gemini-2.5-flash-image',
};
const DONE: MediaAwaitOutcome = {
  state: 'completed',
  snapshot: { id: 'gen-1', status: 'COMPLETED', mimeType: 'image/png' },
};

function setup(options: { plan?: boolean; cancellation?: StreamCancellationService } = {}) {
  const accessControl = {
    hasPlanFeatureFor: vi.fn().mockResolvedValue(options.plan ?? true),
  } as unknown as AccessControlService;
  const manager = new MediaToolLoopManager(accessControl, options.cancellation);
  const refusal = { content: 'upgrade', provider: 'GROK', model: 'grok-4' } as LlmResponse;
  const planRefusal = vi.fn().mockReturnValue(refusal);
  return { manager, accessControl, planRefusal, refusal };
}

function modelReplying(...answers: LlmResponse[]) {
  const rounds: PluginModelRound[] = [];
  const callModel = vi.fn((round: PluginModelRound) => {
    rounds.push(round);
    const next = answers.shift();
    return Promise.resolve(next ?? response('done'));
  });
  return { callModel, rounds };
}

describe('MediaToolLoopManager', () => {
  beforeEach(() => {
    gateway.startMedia.mockReset().mockResolvedValue(STARTED);
    gateway.cancelMedia.mockReset().mockResolvedValue(true);
    gateway.awaitMedia.mockReset().mockResolvedValue(DONE);
  });

  it('offers the three tools, runs the call, and gives the SAME model the result for its reply', async () => {
    const { manager, planRefusal } = setup();
    const { callModel, rounds } = modelReplying(
      response('', [call(MediaKind.IMAGE, 'c1', { prompt: 'a red fox, studio light' })]),
      response('Here is your fox.'),
    );

    const result = await manager.run({
      context: context(),
      executionOptions: undefined,
      callModel,
      planRefusal,
    });

    expect(result.content).toBe('Here is your fox.');
    expect(result.toolCalls).toBeUndefined();
    expect(result.mediaGenerations).toEqual([
      { kind: 'image', id: 'gen-1', status: 'completed', prompt: 'a red fox, studio light' },
    ]);
    expect(rounds).toHaveLength(2);
    expect(rounds[0]?.options.toolCatalog?.map((tool) => tool.name)).toEqual([
      'generate_image',
      'generate_video',
      'generate_audio',
    ]);
    expect(rounds[0]?.options.toolChoice).toBe(ToolChoiceMode.AUTO);
    expect(rounds[0]?.context.mediaToolsHandled).toBe(true);
    expect(rounds[0]?.context.systemPrompt).toContain('you CAN make images');
    const turn = rounds[1]?.context.toolTurns?.[0];
    expect(turn?.results[0]?.isError).toBe(false);
    expect(turn?.results[0]?.content).toContain('"status":"completed"');
    expect(turn?.results[0]?.content).toContain('image/png');
    expect(turn?.results[0]?.content).not.toMatch(/base64|data:/u);
    expect(gateway.startMedia).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'image',
        provider: 'IMAGE_GEMINI',
        userId: 'user-1',
        threadId: 'th-1',
        userMessageId: 'um-1',
      }),
      undefined,
    );
  });

  it('answers as plain chat when the model never calls a tool', async () => {
    const { manager, planRefusal } = setup();
    const { callModel } = modelReplying(response('A fox is a mammal.'));
    const result = await manager.run({
      context: context(),
      executionOptions: undefined,
      callModel,
      planRefusal,
    });
    expect(result.content).toBe('A fox is a mammal.');
    expect(result.mediaGenerations).toBeUndefined();
    expect(gateway.startMedia).not.toHaveBeenCalled();
  });

  it('returns a clear tool error when the generation fails and leaves a failure entry for the card', async () => {
    gateway.awaitMedia.mockResolvedValue({
      state: 'failed',
      snapshot: {
        id: 'gen-1',
        status: 'FAILED',
        errorCode: 'PROVIDER_ERROR',
        errorMessage: 'quota',
      },
    });
    const { manager, planRefusal } = setup();
    const { callModel, rounds } = modelReplying(
      response('', [call(MediaKind.IMAGE, 'c1', { prompt: 'fox' })]),
      response('Sorry, that failed.'),
    );
    const result = await manager.run({
      context: context(),
      executionOptions: undefined,
      callModel,
      planRefusal,
    });
    const toolResult = rounds[1]?.context.toolTurns?.[0]?.results[0];
    expect(toolResult?.isError).toBe(true);
    expect(toolResult?.content).toContain('PROVIDER_ERROR');
    expect(result.mediaGenerations).toEqual([
      { kind: 'image', id: 'gen-1', status: 'failed', prompt: 'fox' },
    ]);
    expect(result.content).toBe('Sorry, that failed.');
  });

  it('keeps the card when the wait times out: the generation is still running', async () => {
    gateway.awaitMedia.mockResolvedValue({ state: 'timeout', snapshot: undefined });
    const { manager, planRefusal } = setup();
    const { callModel, rounds } = modelReplying(
      response('', [call(MediaKind.VIDEO, 'c1', { prompt: 'a fox runs', durationSeconds: 6 })]),
      response('It is on its way.'),
    );
    const result = await manager.run({
      context: context(),
      executionOptions: undefined,
      callModel,
      planRefusal,
    });
    expect(result.mediaGenerations?.[0]).toMatchObject({ kind: 'video', status: 'in_progress' });
    expect(rounds[1]?.context.toolTurns?.[0]?.results[0]?.content).toContain('in_progress');
    expect(gateway.startMedia).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'video', durationSeconds: 6, aspectRatio: '16:9' }),
      undefined,
    );
  });

  it('Stop ends the wait and spends no further model call', async () => {
    gateway.awaitMedia.mockResolvedValue({ state: 'cancelled', snapshot: undefined });
    const controller = new AbortController();
    const cancellation = {
      register: vi.fn().mockReturnValue(controller),
      release: vi.fn(),
    } as unknown as StreamCancellationService;
    const { manager, planRefusal } = setup({ cancellation });
    const { callModel } = modelReplying(
      response('', [call(MediaKind.IMAGE, 'c1', { prompt: 'fox' })]),
    );
    const result = await manager.run({
      context: context(),
      executionOptions: undefined,
      callModel,
      planRefusal,
    });
    expect(callModel).toHaveBeenCalledTimes(1);
    expect(result.mediaGenerations).toBeUndefined();
    expect(cancellation.register).toHaveBeenCalledWith('th-1');
    expect(cancellation.release).toHaveBeenCalledWith('th-1');
  });

  it('a plan without media never sees the tools: a clear request gets the upgrade notice', async () => {
    const { manager, planRefusal, refusal } = setup({ plan: false });
    const { callModel } = modelReplying();
    const result = await manager.run({
      context: context(),
      executionOptions: undefined,
      callModel,
      planRefusal,
    });
    expect(result).toBe(refusal);
    expect(callModel).not.toHaveBeenCalled();
    expect(gateway.startMedia).not.toHaveBeenCalled();
  });

  it('a plan without media answers an unclear media-word message as plain chat, without tools', async () => {
    const { manager, planRefusal } = setup({ plan: false });
    const { callModel, rounds } = modelReplying(response('Foxes are red.'));
    const result = await manager.run({
      context: context({
        threadMessages: [
          {
            id: 'um-2',
            threadId: 'th-1',
            role: 'USER',
            content: 'what is a music video',
            metadata: null,
          },
        ] as unknown as AssembledContext['threadMessages'],
      }),
      executionOptions: undefined,
      callModel,
      planRefusal,
    });
    expect(result.content).toBe('Foxes are red.');
    expect(rounds[0]?.options.toolCatalog).toBeUndefined();
  });

  it('tells the model when the media service says the plan has no media', async () => {
    gateway.startMedia.mockResolvedValue({ ok: false, reason: 'PLAN', status: 403 });
    const { manager, planRefusal } = setup();
    const { callModel, rounds } = modelReplying(
      response('', [
        call(MediaKind.IMAGE, 'c1', { prompt: 'fox' }),
        call(MediaKind.IMAGE, 'c2', { prompt: 'cat' }),
      ]),
      response('Needs an upgrade.'),
    );
    await manager.run({ context: context(), executionOptions: undefined, callModel, planRefusal });
    const results = rounds[1]?.context.toolTurns?.[0]?.results ?? [];
    expect(results.every((r) => r.isError && r.content.includes('"code":"PLAN"'))).toBe(true);
    expect(gateway.startMedia).toHaveBeenCalledTimes(1);
  });

  it('rejects an empty prompt without calling the media service', async () => {
    const { manager, planRefusal } = setup();
    const { callModel, rounds } = modelReplying(
      response('', [call(MediaKind.IMAGE, 'c1', { prompt: '   ' })]),
      response('ok'),
    );
    await manager.run({ context: context(), executionOptions: undefined, callModel, planRefusal });
    expect(gateway.startMedia).not.toHaveBeenCalled();
    expect(rounds[1]?.context.toolTurns?.[0]?.results[0]?.content).toContain('ARGUMENTS_INVALID');
  });

  it('caps calls per answer and per user message', async () => {
    const { manager, planRefusal } = setup();
    const calls = [1, 2, 3].map((n) =>
      call(MediaKind.IMAGE, `c${String(n)}`, { prompt: `fox ${String(n)}` }),
    );
    const { callModel, rounds } = modelReplying(response('', calls), response('done'));
    await manager.run({ context: context(), executionOptions: undefined, callModel, planRefusal });
    expect(gateway.startMedia).toHaveBeenCalledTimes(2);
    expect(rounds[1]?.context.toolTurns?.[0]?.results[2]?.content).toContain('"code":"LIMIT"');

    // The same user message in another lane shares the budget of MEDIA_TOOL_TURN_BUDGET.
    gateway.startMedia.mockClear();
    const second = modelReplying(
      response('', [
        call(MediaKind.IMAGE, 'd1', { prompt: 'x' }),
        call(MediaKind.IMAGE, 'd2', { prompt: 'y' }),
      ]),
      response('done'),
    );
    await manager.run({
      context: context(),
      executionOptions: undefined,
      callModel: second.callModel,
      planRefusal,
    });
    expect(gateway.startMedia).toHaveBeenCalledTimes(MEDIA_TOOL_TURN_BUDGET - 2);
  });

  it('stops offering tools after the round cap and asks for the answer', async () => {
    const { manager, planRefusal } = setup();
    const again = (n: number): LlmResponse =>
      response('', [call(MediaKind.IMAGE, `c${String(n)}`, { prompt: `p${String(n)}` })]);
    const { callModel, rounds } = modelReplying(again(1), again(2), again(3), response('final'));
    const result = await manager.run({
      context: context({
        threadMessages: [
          { id: 'um-cap', threadId: 'th-1', role: 'USER', content: 'draw a fox', metadata: null },
        ] as unknown as AssembledContext['threadMessages'],
      }),
      executionOptions: undefined,
      callModel,
      planRefusal,
    });
    expect(result.content).toBe('final');
    expect(rounds.at(-1)?.options.toolChoice).toBe(ToolChoiceMode.NONE);
  });

  it('answers without tools when the first tool round is refused by the model', async () => {
    const { manager, planRefusal } = setup();
    const callModel = vi
      .fn()
      .mockRejectedValueOnce(new Error('tools not supported'))
      .mockResolvedValueOnce(response('Plain answer.'));
    const result = await manager.run({
      context: context(),
      executionOptions: undefined,
      callModel,
      planRefusal,
    });
    expect(result.content).toBe('Plain answer.');
    const retry = callModel.mock.calls[1]?.[0] as PluginModelRound;
    expect(retry.options.toolCatalog).toBeUndefined();
  });

  it('works when normal chat sets no surface at all (defaults to CHAT)', async () => {
    const { manager, planRefusal } = setup();
    const { callModel } = modelReplying(
      response('', [call(MediaKind.IMAGE, 'c1', { prompt: 'fox' })]),
      response('Done.'),
    );
    const result = await manager.run({
      context: context({ platformSurface: undefined }),
      executionOptions: undefined,
      callModel,
      planRefusal,
    });
    expect(result.mediaGenerations).toHaveLength(1);
  });

  it('a credit failure comes back as a clear credit tool error, with a failure card', async () => {
    gateway.awaitMedia.mockResolvedValue({
      state: 'failed',
      snapshot: { id: 'gen-1', status: 'FAILED', errorCode: 'PAYG_CREDIT_EXHAUSTED' },
    });
    const { manager, planRefusal } = setup();
    const { callModel, rounds } = modelReplying(
      response('', [call(MediaKind.IMAGE, 'c1', { prompt: 'fox' })]),
      response('You are out of credit.'),
    );
    const result = await manager.run({
      context: context(),
      executionOptions: undefined,
      callModel,
      planRefusal,
    });
    const toolResult = rounds[1]?.context.toolTurns?.[0]?.results[0];
    expect(toolResult?.isError).toBe(true);
    expect(toolResult?.content).toContain('"code":"CREDIT"');
    expect(toolResult?.content).toContain('credit exhausted');
    expect(result.mediaGenerations?.[0]?.status).toBe('failed');
    expect(planRefusal).not.toHaveBeenCalled();
  });

  it('a plan refusal from the media service on a clear single-lane request shows the upgrade notice', async () => {
    gateway.startMedia.mockResolvedValue({ ok: false, reason: 'PLAN', status: 403 });
    const { manager, planRefusal, refusal } = setup();
    const { callModel } = modelReplying(
      response('', [call(MediaKind.IMAGE, 'c1', { prompt: 'fox' })]),
      response('never reached'),
    );
    const result = await manager.run({
      context: context(),
      executionOptions: undefined,
      callModel,
      planRefusal,
    });
    expect(result).toBe(refusal);
    expect(callModel).toHaveBeenCalledTimes(1);
  });

  it('a plan refusal in a Compare lane is a tool error for the model, not a notice', async () => {
    gateway.startMedia.mockResolvedValue({ ok: false, reason: 'PLAN', status: 403 });
    const { manager, planRefusal } = setup();
    const { callModel } = modelReplying(
      response('', [call(MediaKind.IMAGE, 'c1', { prompt: 'fox' })]),
      response('Needs an upgrade.'),
    );
    const result = await manager.run({
      context: context({ platformSurface: ChatSurface.COMPARE }),
      executionOptions: undefined,
      callModel,
      planRefusal,
    });
    expect(result.content).toBe('Needs an upgrade.');
    expect(planRefusal).not.toHaveBeenCalled();
  });

  it('never lets a reply claim media no tool made: retries with the tool forced', async () => {
    const { manager, planRefusal } = setup();
    const { callModel, rounds } = modelReplying(
      response('Image generated: a red apple'),
      response('', [call(MediaKind.IMAGE, 'c1', { prompt: 'a red apple' })]),
      response('Here is your apple.'),
    );
    const result = await manager.run({
      context: context(),
      executionOptions: undefined,
      callModel,
      planRefusal,
    });
    expect(rounds[1]?.options.toolChoice).toBe(ToolChoiceMode.REQUIRED);
    expect(rounds[1]?.context.systemPrompt).toContain('no media tool call finished');
    expect(result.content).toBe('Here is your apple.');
    expect(result.mediaGenerations?.[0]?.status).toBe('completed');
  });

  it('strips a claim the model repeats after the retry', async () => {
    const { manager, planRefusal } = setup();
    const { callModel } = modelReplying(
      response('Image generated: a red apple'),
      response('Image generated: a red apple\nEnjoy the apple.'),
    );
    const result = await manager.run({
      context: context(),
      executionOptions: undefined,
      callModel,
      planRefusal,
    });
    expect(result.content).toBe('Enjoy the apple.');
    expect(result.mediaGenerations).toBeUndefined();
    expect(gateway.startMedia).not.toHaveBeenCalled();
  });

  it('a failed generation does not count as backing a claim', async () => {
    gateway.awaitMedia.mockResolvedValue({
      state: 'failed',
      snapshot: { id: 'gen-1', status: 'FAILED', errorCode: 'X' },
    });
    const { manager, planRefusal } = setup();
    const { callModel } = modelReplying(
      response('', [call(MediaKind.IMAGE, 'c1', { prompt: 'fox' })]),
      response('I have created the image for you.'),
      response('I have created the image for you.'),
    );
    const result = await manager.run({
      context: context(),
      executionOptions: undefined,
      callModel,
      planRefusal,
    });
    expect(result.content).not.toMatch(/created the image/u);
  });

  it('Stop through the real cancel key aborts the wait and spends no further model call', async () => {
    const handlers: Array<(channel: string, key: string) => void> = [];
    const redis = {
      set: vi.fn().mockResolvedValue('OK'),
      del: vi.fn().mockResolvedValue(1),
      eval: vi.fn((_script: string, _n: number, channel: string, key: string) => {
        for (const handler of handlers) handler(channel, key);
        return Promise.resolve(1);
      }),
    };
    const subscriber = {
      onMessage: vi.fn((handler: (channel: string, key: string) => void) => handlers.push(handler)),
      onReady: vi.fn(),
      subscribe: vi.fn().mockResolvedValue(undefined),
    };
    const real = new StreamCancellationService(redis as never, subscriber as never);
    await real.onModuleInit();
    gateway.awaitMedia.mockImplementation(
      (_kind: unknown, _id: unknown, opts: { signal?: AbortSignal }) =>
        new Promise((resolve) => {
          opts.signal?.addEventListener('abort', () =>
            resolve({ state: 'cancelled', snapshot: undefined }),
          );
        }),
    );
    const { manager, planRefusal } = setup({ cancellation: real });
    const { callModel } = modelReplying(
      response('', [call(MediaKind.VIDEO, 'c1', { prompt: 'waves' })]),
      response('should not run'),
    );
    const running = manager.run({
      context: context(),
      executionOptions: undefined,
      callModel,
      planRefusal,
    });
    await vi.waitFor(() => expect(gateway.awaitMedia).toHaveBeenCalled());
    // The Stop endpoint cancels by thread id, the same key the loop registered.
    await real.cancel('th-1');
    const result = await running;
    expect(callModel).toHaveBeenCalledTimes(1);
    expect(result.mediaGenerations).toBeUndefined();
    expect(real.isActive('th-1')).toBe(false);
  });

  const providersStarted = (): string[] =>
    gateway.startMedia.mock.calls.map((c) => (c[0] as { provider: string }).provider);

  it('honors a model the user named: grok-imagine-image runs on IMAGE_GROK, alone', async () => {
    const { manager, planRefusal } = setup();
    const { callModel } = modelReplying(
      response('', [
        call(MediaKind.IMAGE, 'c1', { prompt: 'a red apple', model: 'grok-imagine-image' }),
      ]),
      response('Done.'),
    );
    await manager.run({
      context: contextSaying('Use the grok-imagine-image model to draw a red apple'),
      executionOptions: undefined,
      callModel,
      planRefusal,
    });
    expect(gateway.startMedia).toHaveBeenCalledTimes(1);
    expect(gateway.startMedia.mock.calls[0]?.[0]).toMatchObject({
      provider: 'IMAGE_GROK',
      model: 'grok-imagine-image',
    });
  });

  it('a named model that fails is not silently swapped for another one', async () => {
    gateway.awaitMedia.mockResolvedValue({
      state: 'failed',
      snapshot: { id: 'gen-1', status: 'FAILED', errorCode: 'IMAGE_PROVIDER_QUOTA_EXCEEDED' },
    });
    const { manager, planRefusal } = setup();
    const { callModel } = modelReplying(
      response('', [call(MediaKind.IMAGE, 'c1', { prompt: 'apple', model: 'gpt-image-1' })]),
      response('It failed.'),
    );
    await manager.run({
      context: contextSaying('draw an apple with gpt-image-1'),
      executionOptions: undefined,
      callModel,
      planRefusal,
    });
    expect(gateway.startMedia).toHaveBeenCalledTimes(1);
  });

  it('a provider failure retries on each OTHER cloud provider in order, never a local one', async () => {
    gateway.startMedia
      .mockResolvedValueOnce({ ok: true, id: 'g-a', provider: 'IMAGE_GEMINI', model: 'm' })
      .mockResolvedValueOnce({ ok: false, reason: 'UNAVAILABLE', status: 502 })
      .mockResolvedValueOnce({ ok: true, id: 'g-c', provider: 'IMAGE_GROK', model: 'm' });
    gateway.awaitMedia
      .mockResolvedValueOnce({
        state: 'failed',
        snapshot: { id: 'g-a', status: 'FAILED', errorCode: 'IMAGE_PROVIDER_QUOTA_EXCEEDED' },
      })
      .mockResolvedValueOnce({
        state: 'completed',
        snapshot: { id: 'g-c', status: 'COMPLETED', mimeType: 'image/png' },
      });
    const { manager, planRefusal } = setup();
    const { callModel, rounds } = modelReplying(
      response('', [call(MediaKind.IMAGE, 'c1', { prompt: 'a red apple' })]),
      response('Here it is.'),
    );
    const result = await manager.run({
      context: context(),
      executionOptions: undefined,
      callModel,
      planRefusal,
    });
    expect(providersStarted()).toEqual(['IMAGE_GEMINI', 'IMAGE_OPENAI', 'IMAGE_GROK']);
    expect(providersStarted().some((p) => p.includes('LOCAL'))).toBe(false);
    expect(result.mediaGenerations).toEqual([
      { kind: 'image', id: 'g-c', status: 'completed', prompt: 'a red apple' },
    ]);
    expect(rounds[1]?.context.toolTurns?.[0]?.results[0]?.isError).toBe(false);
  });

  it('returns the tool error only when all 3 attempts failed, with one failure card', async () => {
    gateway.startMedia.mockResolvedValue({ ok: true, id: 'g-x', provider: 'p', model: 'm' });
    gateway.awaitMedia.mockResolvedValue({
      state: 'failed',
      snapshot: { id: 'g-x', status: 'FAILED', errorCode: 'AUTH_FAILED' },
    });
    const { manager, planRefusal } = setup();
    const { callModel, rounds } = modelReplying(
      response('', [call(MediaKind.IMAGE, 'c1', { prompt: 'apple' })]),
      response('Could not.'),
    );
    const result = await manager.run({
      context: context(),
      executionOptions: undefined,
      callModel,
      planRefusal,
    });
    expect(gateway.startMedia).toHaveBeenCalledTimes(3);
    expect(rounds[1]?.context.toolTurns?.[0]?.results[0]?.isError).toBe(true);
    expect(result.mediaGenerations).toHaveLength(1);
    expect(result.mediaGenerations?.[0]?.status).toBe('failed');
  });

  it('video has two cloud providers: GEMINI then GROK', async () => {
    gateway.awaitMedia
      .mockResolvedValueOnce({
        state: 'failed',
        snapshot: { id: 'a', status: 'FAILED', errorCode: 'PROVIDER_ERROR' },
      })
      .mockResolvedValueOnce({ state: 'completed', snapshot: { id: 'b', status: 'COMPLETED' } });
    const { manager, planRefusal } = setup();
    const { callModel } = modelReplying(
      response('', [call(MediaKind.VIDEO, 'c1', { prompt: 'waves' })]),
      response('ok'),
    );
    await manager.run({ context: context(), executionOptions: undefined, callModel, planRefusal });
    expect(providersStarted()).toEqual(['VIDEO_GEMINI', 'VIDEO_GROK']);
  });

  it('credit errors stop at once: no second provider is tried', async () => {
    gateway.awaitMedia.mockResolvedValue({
      state: 'failed',
      snapshot: { id: 'a', status: 'FAILED', errorCode: 'PAYG_CREDIT_EXHAUSTED' },
    });
    const { manager, planRefusal } = setup();
    const first = modelReplying(
      response('', [call(MediaKind.IMAGE, 'c1', { prompt: 'apple' })]),
      response('Out of credit.'),
    );
    await manager.run({
      context: context(),
      executionOptions: undefined,
      callModel: first.callModel,
      planRefusal,
    });
    expect(gateway.startMedia).toHaveBeenCalledTimes(1);
  });

  it('a refused start for credit stops at once too', async () => {
    gateway.startMedia.mockResolvedValue({ ok: false, reason: 'PAYMENT', status: 402 });
    const { manager, planRefusal } = setup();
    const { callModel } = modelReplying(
      response('', [call(MediaKind.IMAGE, 'd1', { prompt: 'pear' })]),
      response('Out of credit.'),
    );
    await manager.run({ context: context(), executionOptions: undefined, callModel, planRefusal });
    expect(gateway.startMedia).toHaveBeenCalledTimes(1);
  });

  it('Stop cancels the generation at the media service and starts no further attempt', async () => {
    gateway.awaitMedia.mockResolvedValue({ state: 'cancelled', snapshot: undefined });
    const controller = new AbortController();
    controller.abort();
    const cancellation = {
      register: vi.fn().mockReturnValue(controller),
      release: vi.fn(),
    } as unknown as StreamCancellationService;
    const { manager, planRefusal } = setup({ cancellation });
    const { callModel } = modelReplying(
      response('', [call(MediaKind.VIDEO, 'c1', { prompt: 'waves' })]),
      response('should not run'),
    );
    const result = await manager.run({
      context: context(),
      executionOptions: undefined,
      callModel,
      planRefusal,
    });
    // Aborted before the first attempt: nothing is started, so no orphan row can exist.
    expect(gateway.startMedia).not.toHaveBeenCalled();
    expect(callModel).not.toHaveBeenCalled();
    expect(result.content).toBe('Generation stopped at your request.');
  });

  it('Stop during the wait calls the service cancel for that row and never tries Veo or Grok', async () => {
    const controller = new AbortController();
    gateway.awaitMedia.mockImplementation(() => {
      controller.abort();
      return Promise.resolve({ state: 'cancelled', snapshot: undefined });
    });
    const cancellation = {
      register: vi.fn().mockReturnValue(controller),
      release: vi.fn(),
    } as unknown as StreamCancellationService;
    const { manager, planRefusal } = setup({ cancellation });
    const { callModel } = modelReplying(
      response('', [call(MediaKind.VIDEO, 'c1', { prompt: 'waves' })]),
      response('should not run'),
    );
    await manager.run({ context: context(), executionOptions: undefined, callModel, planRefusal });
    expect(gateway.cancelMedia).toHaveBeenCalledWith('video', 'gen-1', 'user-1');
    expect(gateway.startMedia).toHaveBeenCalledTimes(1);
    expect(callModel).toHaveBeenCalledTimes(1);
  });

  it('a request aborted by Stop (reads as an outage) does not start the next provider', async () => {
    const controller = new AbortController();
    gateway.startMedia.mockImplementation(() => {
      controller.abort();
      return Promise.resolve({ ok: false, reason: 'UNAVAILABLE', status: 0 });
    });
    const cancellation = {
      register: vi.fn().mockReturnValue(controller),
      release: vi.fn(),
    } as unknown as StreamCancellationService;
    const { manager, planRefusal } = setup({ cancellation });
    const { callModel } = modelReplying(
      response('', [call(MediaKind.IMAGE, 'c1', { prompt: 'apple' })]),
      response('should not run'),
    );
    await manager.run({ context: context(), executionOptions: undefined, callModel, planRefusal });
    expect(gateway.startMedia).toHaveBeenCalledTimes(1);
  });

  it('a Compare lane waits as long as normal chat, so it reaches the same cloud fallbacks', async () => {
    const { manager, planRefusal } = setup();
    const { callModel } = modelReplying(
      response('', [call(MediaKind.IMAGE, 'c1', { prompt: 'apple' })]),
      response('ok'),
    );
    await manager.run({
      context: context({ platformSurface: ChatSurface.COMPARE }),
      executionOptions: undefined,
      callModel,
      planRefusal,
    });
    expect(gateway.awaitMedia.mock.calls[0]?.[2]).toMatchObject({ maxPolls: 60 });
  });

  it('passes the thread and turn ids so the media row links to its conversation', async () => {
    const { manager, planRefusal } = setup();
    const { callModel } = modelReplying(
      response('', [call(MediaKind.AUDIO, 'c1', { prompt: 'hello' })]),
      response('ok'),
    );
    await manager.run({ context: context(), executionOptions: undefined, callModel, planRefusal });
    expect(gateway.startMedia.mock.calls[0]?.[0]).toMatchObject({
      kind: 'audio',
      threadId: 'th-1',
      userMessageId: 'um-1',
    });
  });

  it('Stop mid-wait: exactly one generate call, no further model round, and a saved stopped reply', async () => {
    const controller = new AbortController();
    gateway.awaitMedia.mockImplementation(() => {
      controller.abort();
      return Promise.resolve({
        state: 'cancelled',
        snapshot: { id: 'gen-1', status: 'CANCELLED' },
      });
    });
    const cancellation = {
      register: vi.fn().mockReturnValue(controller),
      release: vi.fn(),
    } as unknown as StreamCancellationService;
    const { manager, planRefusal } = setup({ cancellation });
    const { callModel } = modelReplying(
      response('', [call(MediaKind.VIDEO, 'c1', { prompt: 'waves' })]),
      response('', [call(MediaKind.VIDEO, 'c2', { prompt: 'waves again' })]),
    );
    const result = await manager.run({
      context: context(),
      executionOptions: undefined,
      callModel,
      planRefusal,
    });
    expect(gateway.startMedia).toHaveBeenCalledTimes(1);
    expect(callModel).toHaveBeenCalledTimes(1);
    // Never empty: an empty reply would be retried upstream and run the tools again.
    expect(result.content).toBe('Generation stopped at your request.');
    expect(result.toolCalls).toBeUndefined();
  });

  it('an upstream retry of a stopped turn starts nothing: no model round, no generation', async () => {
    const controller = new AbortController();
    gateway.awaitMedia.mockImplementation(() => {
      controller.abort();
      return Promise.resolve({ state: 'cancelled', snapshot: undefined });
    });
    const cancellation = {
      register: vi.fn().mockReturnValue(new AbortController()),
      release: vi.fn(),
    } as unknown as StreamCancellationService;
    (cancellation.register as ReturnType<typeof vi.fn>).mockReturnValueOnce(controller);
    const { manager, planRefusal } = setup({ cancellation });
    const first = modelReplying(response('', [call(MediaKind.VIDEO, 'c1', { prompt: 'waves' })]));
    await manager.run({
      context: context(),
      executionOptions: undefined,
      callModel: first.callModel,
      planRefusal,
    });
    gateway.startMedia.mockClear();
    const retry = modelReplying(response('', [call(MediaKind.VIDEO, 'c2', { prompt: 'waves' })]));
    const result = await manager.run({
      context: context(),
      executionOptions: undefined,
      callModel: retry.callModel,
      planRefusal,
    });
    expect(retry.callModel).not.toHaveBeenCalled();
    expect(gateway.startMedia).not.toHaveBeenCalled();
    expect(result.content).toBe('Generation stopped at your request.');
  });

  it('a model the chat model fills in by itself does not switch off the provider fallback', async () => {
    gateway.awaitMedia
      .mockResolvedValueOnce({
        state: 'failed',
        snapshot: { id: 'a', status: 'FAILED', errorCode: 'IMAGE_PROVIDER_QUOTA_EXCEEDED' },
      })
      .mockResolvedValueOnce({
        state: 'failed',
        snapshot: { id: 'b', status: 'FAILED', errorCode: 'AUTH_FAILED' },
      })
      .mockResolvedValueOnce({ state: 'completed', snapshot: { id: 'c', status: 'COMPLETED' } });
    const { manager, planRefusal } = setup();
    // The user said "draw a cat"; the model copied the default id into `model` by itself.
    const { callModel } = modelReplying(
      response('', [
        call(MediaKind.IMAGE, 'c1', { prompt: 'a cat', model: 'gemini-2.5-flash-image' }),
      ]),
      response('Here is the cat.'),
    );
    await manager.run({
      context: contextSaying('draw a cat', { platformSurface: ChatSurface.COMPARE }),
      executionOptions: undefined,
      callModel,
      planRefusal,
    });
    expect(
      gateway.startMedia.mock.calls.map((c) => (c[0] as { provider: string }).provider),
    ).toEqual(['IMAGE_GEMINI', 'IMAGE_OPENAI', 'IMAGE_GROK']);
  });

  it('two Compare lanes of one message each get the full fallback list', async () => {
    gateway.awaitMedia.mockResolvedValue({
      state: 'failed',
      snapshot: { id: 'x', status: 'FAILED', errorCode: 'IMAGE_PROVIDER_QUOTA_EXCEEDED' },
    });
    const { manager, planRefusal } = setup();
    for (const lane of ['a', 'b']) {
      const { callModel } = modelReplying(
        response('', [call(MediaKind.IMAGE, `c-${lane}`, { prompt: 'a cat' })]),
        response('Sorry.'),
      );
      await manager.run({
        context: contextSaying('draw a cat', { platformSurface: ChatSurface.COMPARE }),
        executionOptions: undefined,
        callModel,
        planRefusal,
      });
    }
    // 3 attempts per lane: attempts are not generations and do not drain the shared budget.
    expect(gateway.startMedia).toHaveBeenCalledTimes(6);
  });

  describe('targets from the user catalog', () => {
    const catalogOf = (
      candidates: unknown,
      named: unknown = { status: 'unknown' },
      allowed = true,
    ) =>
      ({
        candidates: vi.fn().mockResolvedValue(candidates),
        findNamed: vi.fn().mockResolvedValue(named),
        isAllowed: vi.fn().mockResolvedValue(allowed),
      }) as never;
    const manager = (catalog: unknown) =>
      new MediaToolLoopManager(
        { hasPlanFeatureFor: vi.fn().mockResolvedValue(true) } as unknown as AccessControlService,
        undefined,
        catalog as never,
      );
    const providers = (): string[] =>
      gateway.startMedia.mock.calls.map(
        (c) => (c[0] as { provider: string; model: string }).provider,
      );

    it('tries the catalog models, not the constants: chatgpt-image-latest, then Grok', async () => {
      gateway.awaitMedia
        .mockResolvedValueOnce({
          state: 'failed',
          snapshot: { id: 'a', status: 'FAILED', errorCode: 'IMAGE_MODEL_UNAVAILABLE' },
        })
        .mockResolvedValueOnce({ state: 'completed', snapshot: { id: 'b', status: 'COMPLETED' } });
      const loop = manager(
        catalogOf([
          { provider: 'IMAGE_OPENAI', model: 'chatgpt-image-latest' },
          { provider: 'IMAGE_GROK', model: 'grok-imagine-image' },
        ]),
      );
      const { callModel } = modelReplying(
        response('', [call(MediaKind.IMAGE, 'c1', { prompt: 'a cat' })]),
        response('ok'),
      );
      await loop.run({
        context: contextSaying('draw a cat'),
        executionOptions: undefined,
        callModel,
        planRefusal: vi.fn(),
      });
      expect(providers()).toEqual(['IMAGE_OPENAI', 'IMAGE_GROK']);
      expect(gateway.startMedia.mock.calls[0]?.[0]).toMatchObject({
        model: 'chatgpt-image-latest',
      });
    });

    it('falls back to the constants only when the catalog call failed (null)', async () => {
      const loop = manager(catalogOf(null));
      const { callModel } = modelReplying(
        response('', [call(MediaKind.IMAGE, 'c1', { prompt: 'a cat' })]),
        response('ok'),
      );
      await loop.run({
        context: contextSaying('draw a cat'),
        executionOptions: undefined,
        callModel,
        planRefusal: vi.fn(),
      });
      expect(providers()[0]).toBe('IMAGE_GEMINI');
    });

    it('an empty catalog is a clear "no model" tool error, with no generation started', async () => {
      const loop = manager(catalogOf([]));
      const { callModel, rounds } = modelReplying(
        response('', [call(MediaKind.VIDEO, 'c1', { prompt: 'waves' })]),
        response('Not available.'),
      );
      await loop.run({
        context: contextSaying('make a video of waves'),
        executionOptions: undefined,
        callModel,
        planRefusal: vi.fn(),
      });
      expect(gateway.startMedia).not.toHaveBeenCalled();
      expect(rounds[1]?.context.toolTurns?.[0]?.results[0]?.content).toContain('NO_MODEL');
    });

    it('honors an audio model the user named, resolved by the catalog', async () => {
      const loop = manager(
        catalogOf([{ provider: 'AUDIO_GEMINI', model: 'other' }], {
          provider: 'AUDIO_OPENAI',
          model: 'gpt-4o-mini-tts',
        }),
      );
      const { callModel } = modelReplying(
        response('', [call(MediaKind.AUDIO, 'c1', { prompt: 'hello', model: 'gpt-4o-mini-tts' })]),
        response('ok'),
      );
      await loop.run({
        context: contextSaying('use gpt-4o-mini-tts to say hello as audio'),
        executionOptions: undefined,
        callModel,
        planRefusal: vi.fn(),
      });
      expect(providers()).toEqual(['AUDIO_OPENAI']);
      expect(gateway.startMedia.mock.calls[0]?.[0]).toMatchObject({ model: 'gpt-4o-mini-tts' });
    });

    it('a named premium model on a plan without access is refused: no generation, no other model', async () => {
      const loop = manager(
        catalogOf([{ provider: 'IMAGE_GEMINI', model: 'm' }], { status: 'denied' }),
      );
      const { callModel, rounds } = modelReplying(
        response('', [
          call(MediaKind.IMAGE, 'c1', { prompt: 'a cat', model: 'chatgpt-image-latest' }),
        ]),
        response('Not in your plan.'),
      );
      await loop.run({
        context: contextSaying('draw a cat with chatgpt-image-latest'),
        executionOptions: undefined,
        callModel,
        planRefusal: vi.fn(),
      });
      expect(gateway.startMedia).not.toHaveBeenCalled();
      const result = rounds[1]?.context.toolTurns?.[0]?.results[0];
      expect(result?.isError).toBe(true);
      expect(result?.content).toContain('MODEL_NOT_IN_PLAN');
      expect(result?.content).toContain('not included in their plan');
    });

    it('an unlisted name falls back to the inferred model, but only if the plan allows it', async () => {
      const allowedLoop = manager(catalogOf([], { status: 'unknown' }, true));
      const first = modelReplying(
        response('', [
          call(MediaKind.IMAGE, 'c1', { prompt: 'a cat', model: 'grok-imagine-image' }),
        ]),
        response('ok'),
      );
      await allowedLoop.run({
        context: contextSaying('draw a cat with grok-imagine-image'),
        executionOptions: undefined,
        callModel: first.callModel,
        planRefusal: vi.fn(),
      });
      expect(providers()).toEqual(['IMAGE_GROK']);

      gateway.startMedia.mockClear();
      const deniedLoop = manager(catalogOf([], { status: 'unknown' }, false));
      const second = modelReplying(
        response('', [
          call(MediaKind.IMAGE, 'd1', { prompt: 'a cat', model: 'grok-imagine-image' }),
        ]),
        response('no'),
      );
      await deniedLoop.run({
        context: contextSaying('draw a cat with grok-imagine-image'),
        executionOptions: undefined,
        callModel: second.callModel,
        planRefusal: vi.fn(),
      });
      expect(gateway.startMedia).not.toHaveBeenCalled();
    });
  });
});
