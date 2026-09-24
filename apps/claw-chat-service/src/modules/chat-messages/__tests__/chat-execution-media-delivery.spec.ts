// ADR-120 through the real chokepoint: `callProvider` resolves the lane's
// attachments against that lane's model, builds the provider body from that
// decision, and stamps the same decision on the response as `fileDelivery`.

import { type Mock, vi } from 'vitest';

import { FileDeliveryMode } from '../../../common/enums/file-delivery-mode.enum';
import { MediaCapabilityState } from '../../../common/enums/media-capability-state.enum';
import type { ChatMessage } from '../../../generated/prisma';
import { AttachmentDeliveryManager } from '../managers/attachment-delivery.manager';
import { ChatExecutionManager } from '../managers/chat-execution.manager';
import { ContextAssemblyManager } from '../managers/context-assembly.manager';
import type { AssembledContext } from '../types/context.types';
import type { ModelMediaCapabilities } from '../types/model-capability.types';
import {
  disabledCrossThreadResult,
  emptyConversationManifest,
  fallbackModelTokenBudget,
} from '../utilities/assembled-context.utility';
import {
  asAccessControlService,
  createFakePaygAccessControl,
} from './helpers/fake-payg-access-control.helper';

vi.mock('../clients/model-exposure.client', () => ({
  ModelExposureClient: vi.fn(function () {
    return { isExposed: vi.fn().mockResolvedValue(true) };
  }),
}));
vi.mock('../../../common/utilities', () => ({
  httpRequest: vi.fn(),
  buildInterServiceAuthHeader: vi.fn(() => 'Service test-token'),
  recordGet: <T>(record: Record<string, T> | undefined | null, key: string): T | undefined =>
    !record ? undefined : (Object.entries(record).find(([k]) => k === key)?.[1] as T | undefined),
}));

const { httpRequest } = (await vi.importMock('../../../common/utilities')) as {
  httpRequest: Mock;
};
const { appConfigGet } = vi.hoisted(() => ({ appConfigGet: vi.fn() }));
vi.mock('../../../app/config/app.config', () => ({ AppConfig: { get: appConfigGet } }));

const IMAGE_BYTES = Buffer.from('png-bytes').toString('base64');

const capabilityTable: Record<string, MediaCapabilityState> = {
  'OPENAI/gpt-4o': MediaCapabilityState.SUPPORTED,
  'DEEPSEEK/deepseek-chat': MediaCapabilityState.UNSUPPORTED,
};

const capabilityClient = {
  resolve: vi.fn(async (provider: string, model: string): Promise<ModelMediaCapabilities> => ({
    vision: capabilityTable[`${provider}/${model}`] ?? MediaCapabilityState.UNKNOWN,
    audioInput: MediaCapabilityState.UNKNOWN,
    videoInput: MediaCapabilityState.UNKNOWN,
  })),
  listVideoCapableModels: vi.fn(async () => null),
};

function contextWithImage(): AssembledContext {
  return {
    userId: 'user-1',
    systemPrompt: null,
    threadMessages: [
      {
        id: 'msg-1',
        threadId: 'thread-1',
        role: 'USER',
        content: 'What does this chart say?',
        metadata: null,
        createdAt: new Date('2026-09-25T00:00:00.000Z'),
      } as ChatMessage,
    ],
    memories: [],
    contextPackItems: [],
    fileContents: [
      {
        id: 'img-1',
        filename: 'chart.png',
        mimeType: 'image/png',
        content: IMAGE_BYTES,
        extractedText: 'Q3 revenue 1.2M',
        ingestionStatus: 'COMPLETED',
        extractionError: null,
      },
    ],
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
  };
}

function build(): ChatExecutionManager {
  const assembly = new ContextAssemblyManager({} as never, {} as never, {} as never, {} as never);
  return new ChatExecutionManager(
    assembly,
    { checkResponseQuality: vi.fn(), shouldReRoute: vi.fn() } as never,
    { setExecutionManager: vi.fn(), shouldActivate: vi.fn().mockReturnValue(false) } as never,
    {
      emitProviderSelected: vi.fn(),
      emitResponseStreaming: vi.fn(),
      startResponseProgressHeartbeat: vi.fn().mockReturnValue(vi.fn()),
    } as never,
    { run: vi.fn() } as never,
    asAccessControlService(createFakePaygAccessControl({ metered: false })),
    { uploadFile: vi.fn(), getCachedOrUpload: vi.fn() } as never,
    undefined,
    undefined,
    undefined,
    new AttachmentDeliveryManager(capabilityClient as never),
  );
}

function answerWith(provider: string): void {
  httpRequest
    .mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: { provider, apiKey: 'k', baseUrl: 'https://api.example.com/v1' },
    })
    .mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: {
        id: 'c1',
        choices: [
          { index: 0, message: { role: 'assistant', content: 'ok' }, finish_reason: 'stop' },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 2, total_tokens: 12 },
      },
    });
}

const providerBody = (): string => JSON.stringify(httpRequest.mock.calls[1]?.[0].body);

describe('callProvider resolves attachments for the lane it dials', () => {
  beforeEach(() => {
    httpRequest.mockReset();
    appConfigGet.mockReturnValue({
      CONNECTOR_SERVICE_URL: 'http://connector:4003',
      OLLAMA_GENERATE_TIMEOUT_MS: 10_000,
    });
  });

  it('sends a text-only model no image bytes, only the honest note, and records it', async () => {
    answerWith('DEEPSEEK');

    const response = await build().callProvider(
      'DEEPSEEK',
      'deepseek-chat',
      contextWithImage(),
      Date.now(),
      false,
    );

    expect(providerBody()).not.toContain('image_url');
    expect(providerBody()).not.toContain(IMAGE_BYTES);
    expect(providerBody()).toContain('cannot view directly');
    expect(providerBody()).toContain('Q3 revenue 1.2M');
    expect(response.fileDelivery).toEqual([
      expect.objectContaining({
        fileId: 'img-1',
        provider: 'DEEPSEEK',
        model: 'deepseek-chat',
        mode: FileDeliveryMode.OMITTED_NO_VISION,
      }),
    ]);
    expect(response.fileDelivery?.[0]).not.toHaveProperty('sendNative');
  });

  it('sends a vision model the image and records NATIVE_IMAGE', async () => {
    answerWith('OPENAI');

    const response = await build().callProvider(
      'OPENAI',
      'gpt-4o',
      contextWithImage(),
      Date.now(),
      false,
    );

    expect(providerBody()).toContain(`data:image/png;base64,${IMAGE_BYTES}`);
    expect(response.fileDelivery?.[0]?.mode).toBe(FileDeliveryMode.NATIVE_IMAGE);
  });

  it('keeps the provider-level behaviour when the catalog cannot answer', async () => {
    answerWith('ANTHROPIC');
    capabilityClient.resolve.mockResolvedValueOnce({
      vision: MediaCapabilityState.UNKNOWN,
      audioInput: MediaCapabilityState.UNKNOWN,
      videoInput: MediaCapabilityState.UNKNOWN,
    });

    const response = await build().callProvider(
      'ANTHROPIC',
      'claude-sonnet-4',
      contextWithImage(),
      Date.now(),
      false,
    );

    expect(providerBody()).toContain('image_url');
    expect(response.fileDelivery?.[0]?.mode).toBe(FileDeliveryMode.NATIVE_IMAGE);
  });
});
