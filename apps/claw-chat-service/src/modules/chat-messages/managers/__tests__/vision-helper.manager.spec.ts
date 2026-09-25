// ADR-120 batch 5: a lane whose model cannot see gets a helper's description of
// the image, framed as derived observations and metered on its own surface.

import { HttpStatus } from '@nestjs/common';
import type { PaygHold } from '@claw/shared-entitlements';
import { PaygSurface } from '@claw/shared-types';
import { type Mock, vi } from 'vitest';

import { FileDeliveryMode } from '../../../../common/enums/file-delivery-mode.enum';
import { HelperExecutionKind } from '../../../../common/enums/helper-execution-kind.enum';
import { MediaCapabilityState } from '../../../../common/enums/media-capability-state.enum';
import { VisionHelperOutcome } from '../../../../common/enums/vision-helper-outcome.enum';
import { BusinessException } from '../../../../common/errors';
import type { ChatMessage } from '../../../../generated/prisma';
import {
  DELIVERY_REASON_VISION_HELPER_FAILED,
  DELIVERY_REASON_VISION_HELPER_LIMIT,
  DELIVERY_REASON_VISION_HELPER_REFUSED,
} from '../../constants/attachment-delivery.constants';
import { PAYG_WORKFLOW_VISION_HELPER } from '../../constants/payg.constants';
import { VISION_HELPER_SYSTEM_PROMPT } from '../../constants/vision-helper.constants';
import type { AssembledContext, FileContentResponse } from '../../types/context.types';
import type { ModelMediaCapabilities } from '../../types/model-capability.types';
import type {
  VisionHelperCandidateWire,
  VisionHelperInvoker,
} from '../../types/vision-helper.types';
import type { LlmResponse } from '../../types/execution.types';
import {
  disabledCrossThreadResult,
  emptyConversationManifest,
  fallbackModelTokenBudget,
} from '../../utilities/assembled-context.utility';
import { AttachmentDeliveryManager } from '../attachment-delivery.manager';
import { VisionHelperManager } from '../vision-helper.manager';

const { SUPPORTED, UNSUPPORTED, UNKNOWN } = MediaCapabilityState;

const CAPABILITY_TABLE: Record<string, Partial<ModelMediaCapabilities>> = {
  'GEMINI/gemini-2.5-flash': { vision: SUPPORTED },
  'OPENAI/gpt-4.1-mini': { vision: SUPPORTED },
  'OPENAI/gpt-4o': { vision: SUPPORTED },
  'local-ollama/llava:7b': { vision: SUPPORTED },
  'DEEPSEEK/deepseek-chat': { vision: UNSUPPORTED },
  'GROQ/llama-3.3-70b': { vision: UNSUPPORTED },
  'OPENAI/o3-mini': { vision: UNSUPPORTED },
};

const capabilityClient = {
  resolve: async (provider: string, model: string): Promise<ModelMediaCapabilities> =>
    Promise.resolve({
      vision: UNKNOWN,
      audioInput: UNKNOWN,
      videoInput: UNKNOWN,
      ...CAPABILITY_TABLE[`${provider}/${model}`],
    }),
  listVideoCapableModels: async () => Promise.resolve(null),
};

const GEMINI: VisionHelperCandidateWire = {
  provider: 'GEMINI',
  modelAlias: 'gemini-2.5-flash',
  timeoutMs: 30_000,
  maxTokens: 1_024,
};
const OPENAI: VisionHelperCandidateWire = {
  provider: 'OPENAI',
  modelAlias: 'gpt-4.1-mini',
  timeoutMs: 30_000,
  maxTokens: 1_024,
};

function hold(overrides: Partial<PaygHold> = {}): PaygHold {
  return {
    metered: true,
    maxOutputTokens: 700,
    clamped: false,
    reservationId: 'res-1',
    heldMicroUsd: 10,
    availableAfterMicroUsd: 1_000,
    reason: null,
    ...overrides,
  };
}

const image = (id: string, extractedText = 'TOTAL 42.00 EUR'): FileContentResponse => ({
  id,
  filename: `${id}.png`,
  mimeType: 'image/png',
  content: Buffer.from(`bytes-${id}`).toString('base64'),
  extractedText,
  ingestionStatus: 'COMPLETED',
  extractionError: null,
});

function contextWith(
  files: FileContentResponse[],
  extra: Partial<AssembledContext> = {},
): AssembledContext {
  return {
    userId: 'user-1',
    systemPrompt: 'You are helpful.',
    threadMessages: [
      {
        id: 'msg-1',
        threadId: 'thread-1',
        role: 'USER',
        content: 'What does this receipt say?',
        metadata: null,
        createdAt: new Date('2026-09-25T00:00:00.000Z'),
      } as ChatMessage,
    ],
    memories: [
      { id: 'm1', userId: 'user-1', type: 'FACT', content: 'secret memory', isEnabled: true },
    ],
    contextPackItems: [],
    fileContents: files,
    workspaceCitations: [],
    researchEvidence: [],
    researchRunId: null,
    researchWarnings: [],
    researchRequested: false,
    researchToolsUsed: [],
    tokenBudget: 8_000,
    modelBudget: fallbackModelTokenBudget(),
    conversationManifest: emptyConversationManifest(),
    crossThread: disabledCrossThreadResult(),
    turnId: 'turn-1',
    ...extra,
  };
}

function build(candidates: VisionHelperCandidateWire[]): {
  helper: VisionHelperManager;
  access: {
    reserveCredit: ReturnType<typeof vi.fn>;
    releaseCredit: ReturnType<typeof vi.fn>;
  };
} {
  const access = {
    reserveCredit: vi.fn(async () => Promise.resolve(hold())),
    releaseCredit: vi.fn(async () => Promise.resolve()),
  };
  const client = { resolve: vi.fn(async () => Promise.resolve(candidates)) };
  const helper = new VisionHelperManager(
    client as never,
    capabilityClient as never,
    access as never,
  );
  return { helper, access };
}

const delivery = new AttachmentDeliveryManager(capabilityClient as never);

async function blindLane(
  context: AssembledContext,
  provider = 'DEEPSEEK',
  model = 'deepseek-chat',
): Promise<AssembledContext> {
  return delivery.applyToContext(context, provider, model);
}

const reply = (content: string, provider = 'GEMINI', model = 'gemini-2.5-flash'): LlmResponse => ({
  content,
  provider,
  model,
  latencyMs: 5,
  usedFallback: false,
});

const answered = (content: string): Mock<VisionHelperInvoker> =>
  vi.fn<VisionHelperInvoker>(async () => Promise.resolve(reply(content)));

describe('VisionHelperManager', () => {
  it('describes a blind image: DERIVED_IMAGE_TEXT, provenance, one metered hold at the granted ceiling', async () => {
    const { helper, access } = build([GEMINI]);
    const invoke = answered('A receipt. Text: "TOTAL 42.00 EUR".');

    const lane = await helper.upgradeContext(
      await blindLane(contextWith([image('img-1')])),
      invoke,
    );

    const decision = lane.attachmentDelivery?.decisions[0];
    expect(decision?.mode).toBe(FileDeliveryMode.DERIVED_IMAGE_TEXT);
    expect(decision?.helperProvider).toBe('GEMINI');
    expect(decision?.helperModel).toBe('gemini-2.5-flash');
    // The lane's own model is never replaced by the helper.
    expect(decision?.provider).toBe('DEEPSEEK');
    expect(decision?.model).toBe('deepseek-chat');
    expect(decision?.reason).toBeUndefined();
    expect(lane.attachmentDelivery?.derivedImages?.[0]?.text).toContain('TOTAL 42.00 EUR');
    expect(lane.attachmentDelivery?.helperExecutions).toEqual([
      expect.objectContaining({
        kind: HelperExecutionKind.VISION,
        provider: 'GEMINI',
        model: 'gemini-2.5-flash',
        fileId: 'img-1',
        outcome: VisionHelperOutcome.SUCCEEDED,
      }),
    ]);

    expect(access.reserveCredit).toHaveBeenCalledTimes(1);
    expect(access.reserveCredit).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        requestId: 'turn-1:vision:img-1',
        provider: 'GEMINI',
        model: 'gemini-2.5-flash',
        surface: PaygSurface.VISION_HELPER,
        workflow: PAYG_WORKFLOW_VISION_HELPER,
        requestedMaxOutputTokens: 1_024,
      }),
    );
    // The chokepoint receives the GRANTED hold (700), not the 1,024 asked for.
    const call = invoke.mock.calls[0]?.[0];
    expect(call?.hold.maxOutputTokens).toBe(700);
    expect(call?.requestId).toBe('turn-1:vision:img-1');
  });

  it('sends the helper only the fixed instruction and the one image — no memories, no history', async () => {
    const { helper } = build([GEMINI]);
    const invoke = answered('A receipt.');

    await helper.upgradeContext(await blindLane(contextWith([image('img-1')])), invoke);

    const sent = invoke.mock.calls[0]?.[0]?.context;
    expect(sent?.systemPrompt).toBe(VISION_HELPER_SYSTEM_PROMPT);
    expect(sent?.memories).toEqual([]);
    expect(sent?.fileContents.map((file) => file.id)).toEqual(['img-1']);
    expect(sent?.threadMessages).toHaveLength(1);
    expect(sent?.threadMessages[0]?.content).not.toContain('What does this receipt say?');
    expect(sent?.visionHelperCall).toBe(true);
    expect(sent?.attachmentDelivery).toBeUndefined();
  });

  it('falls back to OCR + the honest note when the only helper fails', async () => {
    const { helper } = build([GEMINI]);
    const invoke = vi.fn<VisionHelperInvoker>(async () =>
      Promise.reject(new Error('upstream 503')),
    );

    const lane = await helper.upgradeContext(
      await blindLane(contextWith([image('img-1')])),
      invoke,
    );

    const decision = lane.attachmentDelivery?.decisions[0];
    expect(decision?.mode).toBe(FileDeliveryMode.OMITTED_NO_VISION);
    expect(decision?.reason).toBe(DELIVERY_REASON_VISION_HELPER_FAILED);
    expect(lane.attachmentDelivery?.derivedImages).toEqual([]);
    expect(lane.attachmentDelivery?.helperExecutions?.[0]?.outcome).toBe(
      VisionHelperOutcome.FAILED,
    );
  });

  it('a 402 on the reservation ends the walk: no provider call, no second helper', async () => {
    const { helper, access } = build([GEMINI, OPENAI]);
    access.reserveCredit.mockRejectedValue(
      new BusinessException('Out of credit', 'PAYG_CREDIT_EXHAUSTED', HttpStatus.PAYMENT_REQUIRED),
    );
    const invoke = answered('never');

    const lane = await helper.upgradeContext(
      await blindLane(contextWith([image('img-1')])),
      invoke,
    );

    expect(access.reserveCredit).toHaveBeenCalledTimes(1);
    expect(invoke).not.toHaveBeenCalled();
    expect(lane.attachmentDelivery?.decisions[0]?.reason).toBe(
      DELIVERY_REASON_VISION_HELPER_REFUSED,
    );
  });

  it('a 402 raised by the call itself is also terminal', async () => {
    const { helper, access } = build([GEMINI, OPENAI]);
    const invoke = vi.fn<VisionHelperInvoker>(async () =>
      Promise.reject(
        new BusinessException(
          'Out of credit',
          'PAYG_CREDIT_EXHAUSTED',
          HttpStatus.PAYMENT_REQUIRED,
        ),
      ),
    );

    const lane = await helper.upgradeContext(
      await blindLane(contextWith([image('img-1')])),
      invoke,
    );

    expect(invoke).toHaveBeenCalledTimes(1);
    expect(access.reserveCredit).toHaveBeenCalledTimes(1);
    expect(lane.attachmentDelivery?.helperExecutions?.[0]?.outcome).toBe(
      VisionHelperOutcome.REFUSED,
    );
  });

  it('a clamped hold is released and treated as a refusal', async () => {
    const { helper, access } = build([GEMINI, OPENAI]);
    const clamped = hold({ clamped: true, maxOutputTokens: 40 });
    access.reserveCredit.mockResolvedValue(clamped);
    const invoke = answered('never');

    const lane = await helper.upgradeContext(
      await blindLane(contextWith([image('img-1')])),
      invoke,
    );

    expect(access.releaseCredit).toHaveBeenCalledWith(clamped, 'CANCELLED');
    expect(invoke).not.toHaveBeenCalled();
    expect(access.reserveCredit).toHaveBeenCalledTimes(1);
    expect(lane.attachmentDelivery?.decisions[0]?.reason).toBe(
      DELIVERY_REASON_VISION_HELPER_REFUSED,
    );
  });

  it('a candidate that rejects images falls through to the next under a distinct requestId', async () => {
    const { helper, access } = build([GEMINI, OPENAI]);
    const invoke = vi
      .fn<VisionHelperInvoker>(async () =>
        Promise.resolve(reply('A receipt.', 'OPENAI', 'gpt-4.1-mini')),
      )
      .mockRejectedValueOnce(new Error('400: this model does not support image input'));

    const lane = await helper.upgradeContext(
      await blindLane(contextWith([image('img-1')])),
      invoke,
    );

    const requestIds = access.reserveCredit.mock.calls.map(
      (args: unknown[]) => (args[0] as { requestId: string }).requestId,
    );
    expect(requestIds).toEqual(['turn-1:vision:img-1', 'turn-1:vision:img-1:attempt:2']);
    expect(lane.attachmentDelivery?.decisions[0]?.helperProvider).toBe('OPENAI');
    expect(lane.attachmentDelivery?.helperExecutions?.map((e) => e.outcome)).toEqual([
      VisionHelperOutcome.REJECTED_IMAGE,
      VisionHelperOutcome.SUCCEEDED,
    ]);
  });

  it('a timeout ends the walk (the late call settles its own hold)', async () => {
    const { helper, access } = build([{ ...GEMINI, timeoutMs: 5 }, OPENAI]);
    const invoke = vi.fn<VisionHelperInvoker>(
      async () =>
        new Promise<LlmResponse>(() => {
          // Never settles.
        }),
    );

    const lane = await helper.upgradeContext(
      await blindLane(contextWith([image('img-1')])),
      invoke,
    );

    expect(access.reserveCredit).toHaveBeenCalledTimes(1);
    expect(lane.attachmentDelivery?.helperExecutions?.[0]?.outcome).toBe(
      VisionHelperOutcome.TIMED_OUT,
    );
    expect(lane.attachmentDelivery?.decisions[0]?.mode).toBe(FileDeliveryMode.OMITTED_NO_VISION);
  });

  it('three compare lanes sharing one image take ONE hold and make ONE call', async () => {
    const { helper, access } = build([GEMINI]);
    const invoke = answered('A receipt.');
    const turn = contextWith([image('img-1')]);

    const lanes = await Promise.all([
      helper.upgradeContext(await blindLane(turn, 'DEEPSEEK', 'deepseek-chat'), invoke),
      helper.upgradeContext(await blindLane(turn, 'GROQ', 'llama-3.3-70b'), invoke),
      helper.upgradeContext(await blindLane(turn, 'OPENAI', 'o3-mini'), invoke),
    ]);
    // The judge of the same turn, later, reuses it too.
    const judge = await helper.upgradeContext(await blindLane(turn, 'OPENAI', 'o3-mini'), invoke);

    expect(access.reserveCredit).toHaveBeenCalledTimes(1);
    expect(invoke).toHaveBeenCalledTimes(1);
    for (const lane of [...lanes, judge]) {
      expect(lane.attachmentDelivery?.decisions[0]?.mode).toBe(FileDeliveryMode.DERIVED_IMAGE_TEXT);
    }
  });

  it('a new turn is a new description and a new hold', async () => {
    const { helper, access } = build([GEMINI]);
    const invoke = answered('A receipt.');

    await helper.upgradeContext(await blindLane(contextWith([image('img-1')])), invoke);
    await helper.upgradeContext(
      await blindLane(contextWith([image('img-1')], { turnId: 'turn-2' })),
      invoke,
    );

    expect(access.reserveCredit).toHaveBeenCalledTimes(2);
  });

  it('never runs for a lane that can see', async () => {
    const { helper, access } = build([GEMINI]);
    const invoke = answered('never');
    const planned = await blindLane(contextWith([image('img-1')]), 'OPENAI', 'gpt-4o');

    const lane = await helper.upgradeContext(planned, invoke);

    expect(lane).toBe(planned);
    expect(lane.attachmentDelivery?.decisions[0]?.mode).toBe(FileDeliveryMode.NATIVE_IMAGE);
    expect(access.reserveCredit).not.toHaveBeenCalled();
    expect(invoke).not.toHaveBeenCalled();
  });

  it('leaves the lane exactly as it was when no helper is configured', async () => {
    const { helper, access } = build([]);
    const planned = await blindLane(contextWith([image('img-1')]));

    const lane = await helper.upgradeContext(planned, answered('never'));

    expect(lane).toBe(planned);
    expect(lane.attachmentDelivery?.decisions[0]?.reason).toBe('file_delivery.reason.no_vision');
    expect(access.reserveCredit).not.toHaveBeenCalled();
  });

  it('skips helpers the catalog does not mark vision-SUPPORTED', async () => {
    const { helper, access } = build([
      { provider: 'DEEPSEEK', modelAlias: 'deepseek-chat', timeoutMs: 1, maxTokens: 64 },
    ]);
    const planned = await blindLane(contextWith([image('img-1')]));

    expect(await helper.upgradeContext(planned, answered('never'))).toBe(planned);
    expect(access.reserveCredit).not.toHaveBeenCalled();
  });

  it('a LOCAL_ONLY turn only uses a local helper', async () => {
    const { helper, access } = build([
      GEMINI,
      { provider: 'OLLAMA', modelAlias: 'llava:7b', timeoutMs: 30_000, maxTokens: 512 },
    ]);
    const invoke = answered('A receipt.');

    const lane = await helper.upgradeContext(
      await blindLane(contextWith([image('img-1')], { mediaLocalOnly: true })),
      invoke,
    );

    expect(access.reserveCredit).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'OLLAMA', model: 'llava:7b' }),
    );
    expect(lane.attachmentDelivery?.decisions[0]?.helperProvider).toBe('local-ollama');
  });

  it('describes at most four images per turn; the rest keep OCR with a limit reason', async () => {
    const { helper } = build([GEMINI]);
    const invoke = answered('An image.');
    const files = ['a', 'b', 'c', 'd', 'e'].map((id) => image(id));

    const lane = await helper.upgradeContext(await blindLane(contextWith(files)), invoke);

    expect(invoke).toHaveBeenCalledTimes(4);
    const modes = lane.attachmentDelivery?.decisions.map((decision) => decision.mode);
    expect(modes?.filter((mode) => mode === FileDeliveryMode.DERIVED_IMAGE_TEXT)).toHaveLength(4);
    expect(lane.attachmentDelivery?.decisions[4]?.reason).toBe(DELIVERY_REASON_VISION_HELPER_LIMIT);
  });

  it('never recurses into its own call', async () => {
    const { helper, access } = build([GEMINI]);
    const planned = await blindLane(contextWith([image('img-1')], { visionHelperCall: true }));

    expect(await helper.upgradeContext(planned, answered('never'))).toBe(planned);
    expect(access.reserveCredit).not.toHaveBeenCalled();
  });
});
