// ADR-152: a follow-up turn reuses the description the helper already wrote,
// so the user is not charged for the same image on every message.

import { vi } from 'vitest';

import { FileDeliveryMode } from '../../../../common/enums/file-delivery-mode.enum';
import { MediaCapabilityState } from '../../../../common/enums/media-capability-state.enum';
import type { ChatMessage } from '../../../../generated/prisma';
import { DerivedImageDescriptionStore } from '../../services/derived-image-description-store.service';
import type { AssembledContext, FileContentResponse } from '../../types/context.types';
import type { LlmResponse } from '../../types/execution.types';
import type { VisionHelperInvoker } from '../../types/vision-helper.types';
import {
  disabledCrossThreadResult,
  emptyConversationManifest,
  fallbackModelTokenBudget,
} from '../../utilities/assembled-context.utility';
import { AttachmentDeliveryManager } from '../attachment-delivery.manager';
import { VisionHelperManager } from '../vision-helper.manager';

const capabilities = {
  resolve: async (provider: string) =>
    Promise.resolve({
      vision:
        provider === 'GEMINI' ? MediaCapabilityState.SUPPORTED : MediaCapabilityState.UNSUPPORTED,
      audioInput: MediaCapabilityState.UNKNOWN,
      videoInput: MediaCapabilityState.UNKNOWN,
    }),
  listVideoCapableModels: async () => Promise.resolve(null),
};

const image: FileContentResponse = {
  id: 'img-1',
  filename: 'postman.png',
  mimeType: 'image/png',
  content: Buffer.from('bytes').toString('base64'),
  extractedText: null,
  ingestionStatus: 'COMPLETED',
  extractionError: null,
};

const turn = (turnId: string, userId = 'user-1'): AssembledContext => ({
  userId,
  systemPrompt: null,
  threadMessages: [
    {
      id: `m-${turnId}`,
      threadId: 't1',
      role: 'USER',
      content: 'and the second button?',
      metadata: null,
      createdAt: new Date('2026-10-02T00:00:00.000Z'),
    } as ChatMessage,
  ],
  memories: [],
  contextPackItems: [],
  fileContents: [image],
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
  turnId,
});

function build(store?: DerivedImageDescriptionStore): {
  helper: VisionHelperManager;
  reserve: ReturnType<typeof vi.fn>;
} {
  const reserve = vi.fn(async () =>
    Promise.resolve({
      metered: true,
      maxOutputTokens: 700,
      clamped: false,
      reservationId: 'res',
      heldMicroUsd: 10,
      availableAfterMicroUsd: 1_000,
      reason: null,
    }),
  );
  const access = {
    reserveCredit: reserve,
    releaseCredit: vi.fn(async () => Promise.resolve()),
    hasPlanFeatureFor: vi.fn(async () => Promise.resolve(true)),
  };
  const candidates = {
    resolve: async () =>
      Promise.resolve([
        { provider: 'GEMINI', modelAlias: 'gemini-2.5-flash', timeoutMs: 30_000, maxTokens: 1_024 },
      ]),
  };
  const helper = new VisionHelperManager(
    candidates as never,
    capabilities as never,
    access as never,
    undefined,
    store,
  );
  return { helper, reserve };
}

const invoker = (): ReturnType<typeof vi.fn<VisionHelperInvoker>> =>
  vi.fn<VisionHelperInvoker>(async (): Promise<LlmResponse> =>
    Promise.resolve({
      content: 'A blue Send button right of the URL field.',
      provider: 'GEMINI',
      model: 'gemini-2.5-flash',
      latencyMs: 5,
      usedFallback: false,
    }),
  );

const delivery = new AttachmentDeliveryManager(capabilities as never);

const blind = async (context: AssembledContext): Promise<AssembledContext> =>
  delivery.applyToContext(context, 'DEEPSEEK', 'deepseek-chat');

describe('helper description reuse across turns', () => {
  it('pays for one description, then reuses it on the next turn', async () => {
    const store = new DerivedImageDescriptionStore();
    const { helper, reserve } = build(store);
    const invoke = invoker();

    const first = await helper.upgradeContext(await blind(turn('turn-1')), invoke);
    const second = await helper.upgradeContext(await blind(turn('turn-2')), invoke);

    expect(invoke).toHaveBeenCalledTimes(1);
    expect(reserve).toHaveBeenCalledTimes(1);
    for (const lane of [first, second]) {
      expect(lane.attachmentDelivery?.decisions[0]?.mode).toBe(FileDeliveryMode.DERIVED_IMAGE_TEXT);
      expect(lane.attachmentDelivery?.derivedImages?.[0]?.text).toContain('blue Send button');
    }
  });

  it('never shares a description between users', async () => {
    const store = new DerivedImageDescriptionStore();
    const { helper } = build(store);
    const invoke = invoker();

    await helper.upgradeContext(await blind(turn('turn-1', 'user-1')), invoke);
    await helper.upgradeContext(await blind(turn('turn-2', 'user-2')), invoke);

    expect(invoke).toHaveBeenCalledTimes(2);
  });

  it('describes again on every turn when no store is wired (the old behaviour)', async () => {
    const { helper } = build();
    const invoke = invoker();

    await helper.upgradeContext(await blind(turn('turn-1')), invoke);
    await helper.upgradeContext(await blind(turn('turn-2')), invoke);

    expect(invoke).toHaveBeenCalledTimes(2);
  });

  it('does not remember a failed attempt', async () => {
    const store = new DerivedImageDescriptionStore();
    const { helper } = build(store);
    const failing = vi.fn<VisionHelperInvoker>(async () => Promise.reject(new Error('boom')));

    await helper.upgradeContext(await blind(turn('turn-1')), failing);

    expect(store.get('user-1', 'img-1')).toBeUndefined();
  });
});

describe('images carried from an earlier turn never cost a new helper call', () => {
  const earlierImage: FileContentResponse = { ...image, id: 'img-old', filename: 'old.png' };
  const followUp = (turnId: string, withNew: boolean): AssembledContext => ({
    ...turn(turnId),
    fileContents: withNew ? [{ ...image, id: 'img-new' }, earlierImage] : [earlierImage],
    earlierFileIds: ['img-old'],
  });

  it('skips the helper for an earlier image when the store is cold (another replica)', async () => {
    const { helper, reserve } = build(new DerivedImageDescriptionStore());
    const invoke = invoker();

    const lane = await helper.upgradeContext(await blind(followUp('t-1', false)), invoke);

    expect(invoke).not.toHaveBeenCalled();
    expect(reserve).not.toHaveBeenCalled();
    expect(lane.attachmentDelivery?.decisions[0]?.mode).toBe(FileDeliveryMode.OMITTED_NO_VISION);
  });

  it('describes only the new image when the store is cold, and reuses a warm earlier one', async () => {
    const store = new DerivedImageDescriptionStore();
    const { helper } = build(store);
    const invoke = invoker();

    const cold = await helper.upgradeContext(await blind(followUp('t-1', true)), invoke);
    expect(invoke).toHaveBeenCalledTimes(1);
    const modes = new Map(cold.attachmentDelivery?.decisions.map((d) => [d.fileId, d.mode]));
    expect(modes.get('img-new')).toBe(FileDeliveryMode.DERIVED_IMAGE_TEXT);
    expect(modes.get('img-old')).toBe(FileDeliveryMode.OMITTED_NO_VISION);

    store.set('user-1', {
      fileId: 'img-old',
      filename: 'old.png',
      helperProvider: 'GEMINI',
      helperModel: 'gemini-2.5-flash',
      text: 'A grey Save button.',
    });
    const warm = await helper.upgradeContext(await blind(followUp('t-2', false)), invoke);

    expect(invoke).toHaveBeenCalledTimes(1);
    expect(warm.attachmentDelivery?.decisions[0]?.mode).toBe(FileDeliveryMode.DERIVED_IMAGE_TEXT);
  });
});
