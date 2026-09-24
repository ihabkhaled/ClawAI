// ADR-120: every compare lane is resolved against ITS OWN model. One vision
// lane and one text-only lane receive the same image; each records what it
// really got, and the shared context is budgeted for the smallest lane.

import { vi } from 'vitest';

import { AppConfig } from '../app/config/app.config';
import { FileDeliveryMode } from '../common/enums/file-delivery-mode.enum';
import { MediaCapabilityState } from '../common/enums/media-capability-state.enum';
import { AttachmentDeliveryManager } from '../modules/chat-messages/managers/attachment-delivery.manager';
import { ParallelExecutionManager } from '../modules/chat-messages/managers/parallel-execution.manager';
import type { AssembledContext } from '../modules/chat-messages/types/context.types';
import type { FileDeliveryEntry } from '../modules/chat-messages/types/file-delivery.types';
import type { ModelMediaCapabilities } from '../modules/chat-messages/types/model-capability.types';
import type {
  ParallelModelResponse,
  ParallelModelTarget,
} from '../modules/chat-messages/types/parallel.types';
import {
  disabledCrossThreadResult,
  emptyConversationManifest,
  fallbackModelTokenBudget,
} from '../modules/chat-messages/utilities/assembled-context.utility';

vi.spyOn(AppConfig, 'get').mockReturnValue({
  OLLAMA_GENERATE_TIMEOUT_MS: 300_000,
} as never);

const lanes: ParallelModelTarget[] = [
  { provider: 'GEMINI', model: 'gemini-2.5-flash' },
  { provider: 'DEEPSEEK', model: 'deepseek-chat' },
];

const catalog: Record<string, ModelMediaCapabilities> = {
  'GEMINI/gemini-2.5-flash': {
    vision: MediaCapabilityState.SUPPORTED,
    audioInput: MediaCapabilityState.SUPPORTED,
    videoInput: MediaCapabilityState.SUPPORTED,
  },
  'DEEPSEEK/deepseek-chat': {
    vision: MediaCapabilityState.UNSUPPORTED,
    audioInput: MediaCapabilityState.UNSUPPORTED,
    videoInput: MediaCapabilityState.UNSUPPORTED,
  },
};

const capabilityClient = {
  resolve: vi.fn(
    async (provider: string, model: string): Promise<ModelMediaCapabilities> =>
      catalog[`${provider}/${model}`] ?? {
        vision: MediaCapabilityState.UNKNOWN,
        audioInput: MediaCapabilityState.UNKNOWN,
        videoInput: MediaCapabilityState.UNKNOWN,
      },
  ),
  listVideoCapableModels: vi.fn(async () => null),
};

const context: AssembledContext = {
  userId: 'user-1',
  systemPrompt: null,
  threadMessages: [],
  memories: [],
  contextPackItems: [],
  fileContents: [
    {
      id: 'img-1',
      filename: 'chart.png',
      mimeType: 'image/png',
      content: Buffer.from('png').toString('base64'),
      extractedText: 'Q3 revenue 1.2M',
      ingestionStatus: 'COMPLETED',
      extractionError: null,
    },
  ],
  workspaceCitations: [],
  tokenBudget: 4096,
  modelBudget: fallbackModelTokenBudget(),
  conversationManifest: emptyConversationManifest(),
  crossThread: disabledCrossThreadResult(),
  researchEvidence: [],
  researchRunId: null,
  researchWarnings: [],
  researchRequested: false,
  researchToolsUsed: [],
};

function build(streamModelForLane: ReturnType<typeof vi.fn>, gatewayBuild = vi.fn()) {
  return new ParallelExecutionManager(
    { streamModelForLane } as never,
    { build: gatewayBuild } as never,
    { judge: vi.fn() } as never,
    { create: vi.fn() } as never,
    { emitProgressStage: vi.fn() } as never,
    { enrich: vi.fn() } as never,
    { recordDeliveries: vi.fn() } as never,
    new AttachmentDeliveryManager(capabilityClient as never),
  );
}

async function runLanes(manager: ParallelExecutionManager): Promise<ParallelModelResponse[]> {
  // Bracket access reaches the private fan-out without a cast.
  return manager['executeAllModels'](
    'user-1',
    lanes,
    context,
    undefined,
    { enabled: false, model: null },
    { enabled: false, model: null },
    'group-1',
    'thread-1',
    [],
  );
}

const modesOf = (response: ParallelModelResponse | undefined): FileDeliveryMode[] =>
  (response?.attachmentDelivery ?? []).map((entry: FileDeliveryEntry) => entry.mode);

describe('compare resolves attachments per lane', () => {
  it('records NATIVE_IMAGE for the vision lane and OMITTED_NO_VISION for the text-only lane', async () => {
    const stream = vi.fn(async (provider: string, model: string) => ({
      content: `answer from ${model}`,
      provider,
      model,
      latencyMs: 10,
      usedFallback: false,
    }));

    const [vision, textOnly] = await runLanes(build(stream));

    expect(modesOf(vision)).toEqual([FileDeliveryMode.NATIVE_IMAGE]);
    expect(modesOf(textOnly)).toEqual([FileDeliveryMode.OMITTED_NO_VISION]);
    expect(textOnly?.attachmentDelivery?.[0]).toMatchObject({
      provider: 'DEEPSEEK',
      model: 'deepseek-chat',
      reason: 'file_delivery.reason.no_vision',
    });
  });

  it("prefers the chokepoint's own record when the lane response carries one", async () => {
    const chokepointRecord: FileDeliveryEntry[] = [
      {
        fileId: 'img-1',
        filename: 'chart.png',
        mimeType: 'image/png',
        provider: 'GEMINI',
        model: 'gemini-2.5-flash',
        mode: FileDeliveryMode.EXTRACTED_TEXT,
      },
    ];
    const stream = vi.fn(async (provider: string, model: string) => ({
      content: 'ok',
      provider,
      model,
      latencyMs: 10,
      usedFallback: false,
      ...(provider === 'GEMINI' ? { fileDelivery: chokepointRecord } : {}),
    }));

    const [vision] = await runLanes(build(stream));

    expect(vision?.attachmentDelivery).toBe(chokepointRecord);
  });

  it("resolves a failed lane against the requested target's own capability", async () => {
    const stream = vi.fn(async (provider: string, model: string) => {
      if (provider === 'DEEPSEEK') {
        throw new Error('provider down');
      }
      return { content: 'ok', provider, model, latencyMs: 10, usedFallback: false };
    });

    const [, failed] = await runLanes(build(stream));

    expect(failed?.status).toBe('failed');
    expect(modesOf(failed)).toEqual([FileDeliveryMode.OMITTED_NO_VISION]);
  });

  it('asks the context gateway to budget for every lane (smallest window wins)', async () => {
    const gatewayBuild = vi.fn(async () => ({ context, threadSettings: undefined }));
    const manager = build(vi.fn(), gatewayBuild);

    await manager['buildContext']('user-1', 'thread-1', lanes, ['img-1']);

    expect(gatewayBuild).toHaveBeenCalledWith(
      expect.objectContaining({
        laneTargets: [
          { provider: 'GEMINI', model: 'gemini-2.5-flash' },
          { provider: 'DEEPSEEK', model: 'deepseek-chat' },
        ],
        fileIds: ['img-1'],
      }),
    );
  });
});
