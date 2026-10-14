import { describe, expect, it, vi } from 'vitest';

import { ChatSurface } from '../../../common/enums/chat-surface.enum';
import type { PluginConsentPort } from '../clients/plugin-consent.port';
import type { PluginInvokePort } from '../clients/plugin-invoke.port';
import { PluginConsentState } from '../enums/plugin-consent-state.enum';
import { PluginInvokeStatus } from '../enums/plugin-invoke-status.enum';
import { PluginNoticeCode } from '../enums/plugin-notice-code.enum';
import { PluginToolLoopManager } from '../managers/plugin-tool-loop.manager';
import type { AssembledContext } from '../types/context.types';
import type { LlmResponse } from '../types/execution.types';
import type {
  PluginInvokeRequest,
  PluginInvokeResult,
  PluginModelRound,
  ResolvedPluginTool,
} from '../types/plugin-tools.types';
import type { NormalizedToolCall } from '../types/provider-tool.types';

const INSTALL = '22222222-2222-4222-8222-222222222222';
const REQUEST = '33333333-3333-4333-8333-333333333333';
const SEND_TOOL: ResolvedPluginTool = {
  nativeName: 'plugin_mail_send',
  installId: INSTALL,
  pluginSlug: 'mail',
  toolName: 'send',
  title: 'Send mail',
  description: 'Sends one email.',
  inputSchema: { type: 'object' },
  riskLevel: 'WRITE',
};
const CARD = {
  requestId: REQUEST,
  expiresAt: new Date(Date.now() + 120_000).toISOString(),
  argsPreview: '{"to":"a@b.c"}',
  options: { allowChat: true, always: true, alwaysNeedsConfirmation: false },
};

function context(): AssembledContext {
  return {
    userId: 'user-1',
    systemPrompt: 'Be brief.',
    threadMessages: [],
    memories: [],
    contextPackItems: [],
    fileContents: [],
    workspaceCitations: [],
    platformSurface: ChatSurface.CHAT,
    pluginRefs: [{ installId: INSTALL, label: 'Mail' }],
  } as unknown as AssembledContext;
}

function response(content: string, toolCalls?: NormalizedToolCall[]): LlmResponse {
  return { content, provider: 'p', model: 'm', toolCalls } as LlmResponse;
}

const SEND_CALL: NormalizedToolCall = {
  callId: 'c1',
  nativeName: SEND_TOOL.nativeName,
  toolName: SEND_TOOL.nativeName,
  toolVersion: '1',
  operation: 'call',
  targetId: INSTALL,
  arguments: { to: 'a@b.c' },
};

const ASKED: PluginInvokeResult = {
  status: PluginInvokeStatus.CONSENT_REQUIRED,
  truncated: false,
  durationMs: 2,
  callId: 'chat-abc-123456',
  consent: CARD,
};

function harness(options: {
  answers: Array<PluginConsentState | Error>;
  resumed?: PluginInvokeResult;
  withCard?: boolean;
}) {
  const invocations: PluginInvokeRequest[] = [];
  const plugins: PluginInvokePort = {
    resolve: vi.fn(async () => ({
      tools: [SEND_TOOL],
      systemBlock: '',
      limits: { maxRounds: 3, maxCallsPerTurn: 6, timeoutMs: 30_000 },
      notices: [],
    })),
    invoke: vi.fn(async (request: PluginInvokeRequest) => {
      invocations.push(request);
      if (request.consentRequestId !== undefined) {
        return (
          options.resumed ?? {
            status: PluginInvokeStatus.OK,
            content: 'sent',
            truncated: false,
            durationMs: 9,
          }
        );
      }
      return options.withCard === false ? { ...ASKED, consent: undefined } : ASKED;
    }),
  };
  const waits: Array<{ requestId: string; waitMs: number }> = [];
  const answers = [...options.answers];
  const consent: PluginConsentPort = {
    wait: vi.fn(async (request) => {
      waits.push({ requestId: request.requestId, waitMs: request.waitMs });
      const next = answers.shift() ?? PluginConsentState.PENDING;
      if (next instanceof Error) throw next;
      return next;
    }),
  };
  const stream = {
    emitPluginConsentRequested: vi.fn(),
    emitPluginConsentResolved: vi.fn(),
  };
  const seen: PluginModelRound[] = [];
  const queue = [response('', [SEND_CALL]), response('final answer')];
  const callModel = vi.fn(async (round: PluginModelRound) => {
    seen.push(round);
    const next = queue.shift();
    if (next === undefined) throw new Error('model called too often');
    return next;
  });
  return {
    manager: new PluginToolLoopManager(plugins, consent, stream as never),
    invocations,
    waits,
    consent,
    stream,
    seen,
    callModel,
  };
}

async function run(h: ReturnType<typeof harness>) {
  return h.manager.run({
    context: context(),
    executionOptions: undefined,
    callModel: h.callModel,
    threadId: 'thread-1',
    messageId: 'msg-1',
  });
}

describe('PluginToolLoopManager and the in-chat consent card', () => {
  it('pauses on the card, then resumes the SAME call with the approved request id (once)', async () => {
    const h = harness({ answers: [PluginConsentState.PENDING, PluginConsentState.APPROVED] });
    const out = await run(h);

    expect(h.waits).toHaveLength(2);
    expect(h.invocations).toHaveLength(2);
    expect(h.invocations[0]?.consentRequestId).toBeUndefined();
    expect(h.invocations[1]).toMatchObject({
      callId: 'chat-abc-123456',
      consentRequestId: REQUEST,
      args: { to: 'a@b.c' },
      toolName: 'send',
    });
    expect(out.pluginCalls?.[0]?.status).toBe(PluginInvokeStatus.OK);
    expect(h.seen[1]?.context.toolTurns?.[0]?.results[0]?.content).toContain('sent');
    expect(out.pluginNotices ?? []).not.toContainEqual({
      code: PluginNoticeCode.CONSENT_NOT_AVAILABLE,
    });
  });

  it('announces the card and its outcome on the stream, without the call id', async () => {
    const h = harness({ answers: [PluginConsentState.APPROVED] });
    await run(h);
    expect(h.stream.emitPluginConsentRequested).toHaveBeenCalledWith(
      'thread-1',
      expect.objectContaining({
        requestId: REQUEST,
        toolName: 'send',
        riskLevel: 'WRITE',
        argsPreview: '{"to":"a@b.c"}',
        messageId: 'msg-1',
      }),
    );
    const resolved = h.stream.emitPluginConsentResolved.mock.calls[0]?.[1];
    expect(resolved).toMatchObject({ requestId: REQUEST, outcome: PluginConsentState.APPROVED });
    expect(JSON.stringify(resolved)).not.toContain('chat-abc-123456');
  });

  it('deny path: gives the model a clear result, never resumes, never retries the tool', async () => {
    const h = harness({ answers: [PluginConsentState.DENIED] });
    const out = await run(h);

    expect(h.invocations).toHaveLength(1);
    const result = h.seen[1]?.context.toolTurns?.[0]?.results[0];
    expect(result?.isError).toBe(true);
    expect(result?.content).toContain('declined');
    expect(result?.content).toContain('Do not retry');
    expect(out.pluginCalls?.[0]).toMatchObject({
      status: PluginInvokeStatus.BLOCKED,
      errorCode: 'PLUGIN_CONSENT_DENIED',
    });
  });

  it('expiry: a request that lapsed is denied safely with an honest message', async () => {
    const h = harness({ answers: [PluginConsentState.EXPIRED] });
    const out = await run(h);
    expect(h.invocations).toHaveLength(1);
    expect(h.seen[1]?.context.toolTurns?.[0]?.results[0]?.content).toContain('did not answer');
    expect(out.pluginCalls?.[0]?.errorCode).toBe('PLUGIN_CONSENT_EXPIRED');
  });

  it('timeout: keeps waiting in bounded slices, then denies when the request deadline passes', async () => {
    const h = harness({ answers: [] });
    const original = Date.now;
    let clock = original();
    vi.spyOn(Date, 'now').mockImplementation(() => {
      clock += 50_000;
      return clock;
    });
    const out = await run(h);
    vi.restoreAllMocks();
    expect(h.waits.length).toBeLessThanOrEqual(10);
    expect(h.waits.every((wait) => wait.waitMs <= 20_000)).toBe(true);
    expect(h.invocations).toHaveLength(1);
    expect(out.pluginCalls?.[0]?.errorCode).toBe('PLUGIN_CONSENT_EXPIRED');
  });

  it('stream reconnect: the wait is against plugin-service, so an answer given while the stream was down is still honoured', async () => {
    const h = harness({ answers: [PluginConsentState.APPROVED] });
    await run(h);
    expect(h.waits[0]).toMatchObject({ requestId: REQUEST });
    expect(h.invocations).toHaveLength(2);
  });

  it('plugin-service down while waiting: denies the call, no resume', async () => {
    const h = harness({ answers: [new Error('socket hang up')] });
    const out = await run(h);
    expect(h.invocations).toHaveLength(1);
    expect(out.pluginCalls?.[0]?.status).toBe(PluginInvokeStatus.BLOCKED);
  });

  it('a service that raised no card keeps the old behaviour: not approved plus a notice', async () => {
    const h = harness({ answers: [], withCard: false });
    const out = await run(h);
    expect(h.waits).toHaveLength(0);
    expect(out.pluginNotices).toContainEqual({ code: PluginNoticeCode.CONSENT_NOT_AVAILABLE });
  });

  it('a resumed call that plugin-service still refuses surfaces its refusal to the model', async () => {
    const h = harness({
      answers: [PluginConsentState.APPROVED],
      resumed: {
        status: PluginInvokeStatus.BLOCKED,
        truncated: false,
        durationMs: 1,
        errorCode: 'PLUGIN_CONSENT_DENIED',
      },
    });
    const out = await run(h);
    expect(h.seen[1]?.context.toolTurns?.[0]?.results[0]?.content).toContain('declined');
    expect(out.pluginCalls?.[0]?.status).toBe(PluginInvokeStatus.BLOCKED);
  });
});
