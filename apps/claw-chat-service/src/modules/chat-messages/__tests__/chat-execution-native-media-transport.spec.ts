// Rule 42 item 14 (record == payload) for native audio / video through the
// real chokepoint, on both Gemini bodies:
//   - Runtime V2 turn options (no tool catalog) → the native generateContent
//     body, which carries the audio / video part, recorded NATIVE_*;
//   - a native tool catalog → the OpenAI-compatible body, which carries no
//     audio or video bytes, so the plan resolves TRANSCRIPT /
//     VIDEO_FRAMES_AND_TRANSCRIPT and the record says so.
// Plus: a compare lane's up-front hold includes the native media estimate.

import { type Mock, vi } from 'vitest';

import { FileDeliveryMode } from '../../../common/enums/file-delivery-mode.enum';
import { MediaCapabilityState } from '../../../common/enums/media-capability-state.enum';
import type { ChatMessage } from '../../../generated/prisma';
import { RUNTIME_V2_TURN_EXECUTION_OPTIONS } from '../constants/runtime-v2-execution.constants';
import type { ToolDefinitionDto } from '../dto/runtime-v2.dto';
import { AttachmentDeliveryManager } from '../managers/attachment-delivery.manager';
import { ChatExecutionManager } from '../managers/chat-execution.manager';
import { ContextAssemblyManager } from '../managers/context-assembly.manager';
import type { AssembledContext, FileContentResponse } from '../types/context.types';
import type { ExecutionOptions } from '../types/execution-options.types';
import type { ModelMediaCapabilities } from '../types/model-capability.types';
import {
  disabledCrossThreadResult,
  emptyConversationManifest,
  fallbackModelTokenBudget,
} from '../utilities/assembled-context.utility';
import {
  estimateNativeAudioTokens,
  nativeMediaTokenEstimate,
} from '../utilities/native-audio.utility';
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

const AUDIO_BYTES = Buffer.from('opus-bytes-of-a-voice-note').toString('base64');
const VIDEO_BYTES = Buffer.from('mp4-bytes-of-a-short-clip').toString('base64');
const TRANSCRIPT = 'Book the table for eight on Friday.';
const VIDEO_DOCUMENT = 'VIDEO clip.mp4\n[00:00–00:05] Someone waves at the camera.';

const TOOL: ToolDefinitionDto = {
  schemaVersion: '2.0',
  name: 'workspace.files',
  version: '2.0.0',
  description: 'Workspace files.',
  operations: ['read'],
  riskClasses: ['inspect'],
  targetIds: ['target:workspace'],
  inputSchema: { type: 'object', properties: {}, required: [], additionalProperties: false },
} as ToolDefinitionDto;

const WITH_TOOLS: ExecutionOptions = { ...RUNTIME_V2_TURN_EXECUTION_OPTIONS, toolCatalog: [TOOL] };

const HEARS_AND_WATCHES: ModelMediaCapabilities = {
  vision: MediaCapabilityState.SUPPORTED,
  audioInput: MediaCapabilityState.SUPPORTED,
  videoInput: MediaCapabilityState.SUPPORTED,
};

const TEXT_ONLY: ModelMediaCapabilities = {
  vision: MediaCapabilityState.SUPPORTED,
  audioInput: MediaCapabilityState.UNSUPPORTED,
  videoInput: MediaCapabilityState.UNSUPPORTED,
};

const capabilityClient = {
  resolve: vi.fn(async (provider: string): Promise<ModelMediaCapabilities> =>
    Promise.resolve(provider === 'GEMINI' ? HEARS_AND_WATCHES : TEXT_ONLY),
  ),
  listVideoCapableModels: vi.fn(async () => Promise.resolve(null)),
};

const voiceNote: FileContentResponse = {
  id: 'memo-1',
  filename: 'memo.webm',
  mimeType: 'audio/webm',
  content: AUDIO_BYTES,
  extractedText: TRANSCRIPT,
  ingestionStatus: 'COMPLETED',
  extractionError: null,
};

const clip: FileContentResponse = {
  id: 'clip-1',
  filename: 'clip.mp4',
  mimeType: 'video/mp4',
  content: VIDEO_BYTES,
  extractedText: VIDEO_DOCUMENT,
  ingestionStatus: 'COMPLETED',
  extractionError: null,
  media: { durationMs: 5_000, width: 640, height: 360, hasAudio: true, failureReason: null },
};

function contextWith(files: FileContentResponse[]): AssembledContext {
  return {
    userId: 'user-1',
    systemPrompt: null,
    threadMessages: [
      {
        id: 'msg-1',
        threadId: 'thread-1',
        role: 'USER',
        content: 'What is in the attachment?',
        metadata: null,
        createdAt: new Date('2026-09-26T00:00:00.000Z'),
      } as ChatMessage,
    ],
    memories: [],
    contextPackItems: [],
    fileContents: files,
    workspaceCitations: [],
    researchEvidence: [],
    researchRunId: null,
    researchWarnings: [],
    researchRequested: false,
    researchToolsUsed: [],
    tokenBudget: 8_000,
    modelBudget: { ...fallbackModelTokenBudget(), contextWindowTokens: 1_048_576 },
    conversationManifest: emptyConversationManifest(),
    crossThread: disabledCrossThreadResult(),
  };
}

function build(access = createFakePaygAccessControl({ metered: false })): ChatExecutionManager {
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
    asAccessControlService(access),
    { uploadFile: vi.fn(), getCachedOrUpload: vi.fn() } as never,
    undefined,
    undefined,
    undefined,
    // A 600 s plan, so a processed 5 s clip may ride natively.
    new AttachmentDeliveryManager(
      capabilityClient as never,
      {
        maxVideoSecondsFor: async () => Promise.resolve(600),
      } as never,
    ),
  );
}

const CONNECTOR = {
  ok: true,
  status: 200,
  data: {
    provider: 'GEMINI',
    apiKey: 'gemini-key',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
  },
};

function answerNative(): void {
  httpRequest.mockResolvedValueOnce(CONNECTOR).mockResolvedValueOnce({
    ok: true,
    status: 200,
    data: {
      candidates: [{ content: { role: 'model', parts: [{ text: 'ok' }] }, finishReason: 'STOP' }],
      usageMetadata: { promptTokenCount: 12, candidatesTokenCount: 2, totalTokenCount: 14 },
    },
  });
}

function answerCompatible(): void {
  httpRequest.mockResolvedValueOnce(CONNECTOR).mockResolvedValueOnce({
    ok: true,
    status: 200,
    data: {
      id: 'c1',
      choices: [{ index: 0, message: { role: 'assistant', content: 'ok' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 12, completion_tokens: 2, total_tokens: 14 },
    },
  });
}

const providerCall = (): { url: string; body: unknown } =>
  (httpRequest.mock.calls[1]?.[0] ?? { url: '', body: null }) as { url: string; body: unknown };

const call = async (files: FileContentResponse[], options: ExecutionOptions) =>
  build().callProvider(
    'GEMINI',
    'gemini-2.5-flash',
    contextWith(files),
    Date.now(),
    false,
    undefined,
    'MANUAL_MODEL',
    options,
  );

describe('record == payload for native media on both Gemini bodies', () => {
  beforeEach(() => {
    httpRequest.mockReset();
    appConfigGet.mockReturnValue({
      CONNECTOR_SERVICE_URL: 'http://connector:4003',
      OLLAMA_GENERATE_TIMEOUT_MS: 10_000,
      CHAT_NATIVE_TOOL_CALLING_ENABLED: true,
      CHAT_TOOL_CATALOG_MAX_BYTES: 262_144,
      ENABLE_GEMINI_FILES_API: false,
      GEMINI_FILES_API_SIZE_THRESHOLD_BYTES: 10 * 1024 * 1024,
    });
  });

  it('Runtime V2 turn: the audio rides the native body and is recorded NATIVE_AUDIO', async () => {
    answerNative();

    const response = await call([voiceNote], RUNTIME_V2_TURN_EXECUTION_OPTIONS);

    expect(providerCall().url).toContain(':generateContent');
    expect(JSON.stringify(providerCall().body)).toContain(
      JSON.stringify({ inline_data: { mime_type: 'audio/webm', data: AUDIO_BYTES } }),
    );
    expect(response.fileDelivery?.[0]?.mode).toBe(FileDeliveryMode.NATIVE_AUDIO);
  });

  it('tool catalog: no audio bytes in the compatible body, recorded TRANSCRIPT', async () => {
    answerCompatible();

    const response = await call([voiceNote], WITH_TOOLS);
    const body = JSON.stringify(providerCall().body);

    expect(providerCall().url).not.toContain(':generateContent');
    expect(body).not.toContain(AUDIO_BYTES);
    expect(body).toContain(TRANSCRIPT);
    expect(response.fileDelivery?.[0]?.mode).toBe(FileDeliveryMode.TRANSCRIPT);
  });

  it('Runtime V2 turn: the video rides the native body and is recorded NATIVE_VIDEO', async () => {
    answerNative();

    const response = await call([clip], RUNTIME_V2_TURN_EXECUTION_OPTIONS);

    expect(JSON.stringify(providerCall().body)).toContain(
      JSON.stringify({ inline_data: { mime_type: 'video/mp4', data: VIDEO_BYTES } }),
    );
    expect(response.fileDelivery?.[0]?.mode).toBe(FileDeliveryMode.NATIVE_VIDEO);
  });

  it('tool catalog: no video bytes, the transcript document, recorded VIDEO_FRAMES_AND_TRANSCRIPT', async () => {
    answerCompatible();

    const response = await call([clip], WITH_TOOLS);
    const body = JSON.stringify(providerCall().body);

    expect(body).not.toContain(VIDEO_BYTES);
    expect(body).toContain('Someone waves at the camera.');
    expect(response.fileDelivery?.[0]?.mode).toBe(FileDeliveryMode.VIDEO_FRAMES_AND_TRANSCRIPT);
  });
});

describe('a compare lane is reserved for the media it will really be sent', () => {
  beforeEach(() => {
    httpRequest.mockReset();
    appConfigGet.mockReturnValue({
      CONNECTOR_SERVICE_URL: 'http://connector:4003',
      OLLAMA_GENERATE_TIMEOUT_MS: 10_000,
    });
  });

  it('adds the native audio estimate to the Gemini lane hold, not to a transcript lane', async () => {
    const access = createFakePaygAccessControl();
    const execution = build(access);
    const context = contextWith([voiceNote]);

    await execution.reserveCompareLane({
      provider: 'GEMINI',
      model: 'gemini-2.5-flash',
      context,
      requestId: 'turn-1:lane:0',
    });
    await execution.reserveCompareLane({
      provider: 'OPENAI',
      model: 'gpt-4o',
      context,
      requestId: 'turn-1:lane:1',
    });

    const reserves = access.reserveCredit.mock.calls.map(
      (args) => (args as unknown[])[0] as { promptTokens: number; requestId: string },
    );
    const gemini = reserves.find((input) => input.requestId === 'turn-1:lane:0');
    const openAi = reserves.find((input) => input.requestId === 'turn-1:lane:1');
    expect(gemini?.promptTokens).toBe(
      (openAi?.promptTokens ?? 0) + estimateNativeAudioTokens(voiceNote),
    );
    expect(estimateNativeAudioTokens(voiceNote)).toBeGreaterThan(0);
  });

  it('adds the native video estimate (measured duration) to the Gemini lane hold', async () => {
    const access = createFakePaygAccessControl();
    const execution = build(access);
    const context = contextWith([clip]);
    const planned = await new AttachmentDeliveryManager(
      capabilityClient as never,
      {
        maxVideoSecondsFor: async () => Promise.resolve(600),
      } as never,
    ).applyToContext(context, 'GEMINI', 'gemini-2.5-flash');

    await execution.reserveCompareLane({
      provider: 'GEMINI',
      model: 'gemini-2.5-flash',
      context,
      requestId: 'turn-2:lane:0',
    });

    // 5 s × 300 tokens/s.
    expect(nativeMediaTokenEstimate(planned)).toBe(1_500);
    const input = ((access.reserveCredit.mock.calls[0] ?? []) as unknown[])[0] as {
      promptTokens: number;
    };
    expect(input.promptTokens).toBeGreaterThanOrEqual(1_500);
  });
});
