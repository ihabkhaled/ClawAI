import { type Mock, vi } from 'vitest';

import { ConsensusExecutionManager } from '../consensus-execution.manager';
import { ChatExecutionManager } from '../chat-execution.manager';
import { ChatContextGatewayManager } from '../chat-context-gateway.manager';
import { ChatMessagesRepository } from '../../repositories/chat-messages.repository';
import { ChatStreamService } from '../../services/chat-stream.service';
import { AccessControlService } from '../../services/access-control.service';
import { ResearchEnricherManager } from '../research-enricher.manager';
import type { AssembledContext, FileContentResponse } from '../../types/context.types';
import type { LlmResponse } from '../../types/execution.types';
import type { ParallelModelTarget } from '../../types/parallel.types';
import {
  disabledCrossThreadResult,
  emptyConversationManifest,
  fallbackModelTokenBudget,
} from '../../utilities/assembled-context.utility';

// The constructor reads OLLAMA_GENERATE_TIMEOUT_MS. Without this mock the spec
// only passed on machines whose shell happened to export every required env var.
const { appConfigGet } = vi.hoisted(() => ({
  appConfigGet: vi.fn(() => ({ OLLAMA_GENERATE_TIMEOUT_MS: 60_000 })),
}));
vi.mock('../../../../app/config/app.config', () => ({ AppConfig: { get: appConfigGet } }));

// Regression coverage for the 2026-09-24 production report: a Consensus-mode
// message with an attachment was answered by every lane as though nothing
// were attached. ConsensusExecutionManager had NO unit tests at all before
// this file — the fileIds→context plumbing was only proven at the
// ChatContextGatewayManager level (chat-context-gateway.manager.spec.ts,
// "finds attachments on the latest user message"), never proven end to end
// for Consensus's own fan-out to ChatExecutionManager.callProvider. This
// closes that gap: it proves the ASSEMBLED context (including fileContents)
// that the gateway hands back reaches every parallel lane unchanged, and that
// the fileIds the caller passed in reach the gateway in the first place.

const buildFile = (overrides: Partial<FileContentResponse> = {}): FileContentResponse => ({
  id: 'file-1',
  filename: 'short.pdf',
  mimeType: 'application/pdf',
  content: 'base64-pdf-bytes',
  ...overrides,
});

const buildContext = (files: FileContentResponse[] = []): AssembledContext => ({
  userId: 'user-1',
  systemPrompt: null,
  threadMessages: [
    { role: 'USER', content: 'Check this' } as AssembledContext['threadMessages'][0],
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
  tokenBudget: 4096,
  modelBudget: fallbackModelTokenBudget(),
  conversationManifest: emptyConversationManifest(),
  crossThread: disabledCrossThreadResult(),
});

const buildLlmResponse = (overrides: Partial<LlmResponse> = {}): LlmResponse => ({
  content: 'The attached PDF says hello.',
  provider: 'GEMINI',
  model: 'gemini-2.5-flash',
  latencyMs: 100,
  usedFallback: false,
  inputTokens: 10,
  outputTokens: 6,
  ...overrides,
});

describe('ConsensusExecutionManager — attachment delivery', () => {
  let manager: ConsensusExecutionManager;
  let chatExecutionManager: ChatExecutionManager;
  let chatContextGateway: ChatContextGatewayManager;
  let chatMessagesRepository: ChatMessagesRepository;
  let chatStreamService: ChatStreamService;
  let researchEnricherManager: ResearchEnricherManager;
  let accessControlService: AccessControlService;
  let callProviderMock: Mock;
  let buildMock: Mock;
  let createMock: Mock;

  beforeEach(() => {
    callProviderMock = vi.fn().mockResolvedValue(buildLlmResponse());
    chatExecutionManager = Object.create(ChatExecutionManager.prototype) as ChatExecutionManager;
    chatExecutionManager.callProvider = callProviderMock;

    buildMock = vi.fn();
    chatContextGateway = Object.create(
      ChatContextGatewayManager.prototype,
    ) as ChatContextGatewayManager;
    chatContextGateway.build = buildMock;

    createMock = vi.fn().mockResolvedValue({ id: 'message-1' });
    chatMessagesRepository = Object.create(
      ChatMessagesRepository.prototype,
    ) as ChatMessagesRepository;
    chatMessagesRepository.create = createMock;

    chatStreamService = Object.create(ChatStreamService.prototype) as ChatStreamService;
    chatStreamService.emitOrchestrationStage = vi.fn();
    chatStreamService.emitCompletion = vi.fn();
    chatStreamService.emitError = vi.fn();

    researchEnricherManager = Object.create(
      ResearchEnricherManager.prototype,
    ) as ResearchEnricherManager;
    researchEnricherManager.enrichForOrchestration = vi
      .fn()
      .mockResolvedValue({ transcript: null, systemPrompt: '' });

    accessControlService = Object.create(AccessControlService.prototype) as AccessControlService;
    accessControlService.recordUsage = vi.fn().mockResolvedValue(undefined);

    manager = new ConsensusExecutionManager(
      chatExecutionManager,
      chatContextGateway,
      chatMessagesRepository,
      chatStreamService,
      researchEnricherManager,
      accessControlService,
    );
  });

  it('passes the caller-supplied fileIds and the CONSENSUS surface to the shared context gateway', async () => {
    buildMock.mockResolvedValue({
      context: buildContext([buildFile()]),
      threadSettings: undefined,
    });

    const models: ParallelModelTarget[] = [{ provider: 'GEMINI', model: 'gemini-2.5-flash' }];
    await manager.executeConsensus('user-1', 'thread-1', 'Check this', models, ['file-1']);

    // executeInBackground is fire-and-forget — wait for it to reach completion.
    await vi.waitFor(() => {
      expect(chatStreamService.emitCompletion).toHaveBeenCalled();
    });

    expect(buildMock).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', threadId: 'thread-1', fileIds: ['file-1'] }),
    );
  });

  it('delivers the attached file content to every lane unchanged — never silently drops it', async () => {
    const file = buildFile();
    buildMock.mockResolvedValue({ context: buildContext([file]), threadSettings: undefined });

    const models: ParallelModelTarget[] = [
      { provider: 'GEMINI', model: 'gemini-2.5-flash' },
      { provider: 'OPENAI', model: 'gpt-4o' },
    ];
    await manager.executeConsensus('user-1', 'thread-1', 'Check this', models, ['file-1']);

    await vi.waitFor(() => {
      expect(callProviderMock).toHaveBeenCalledTimes(2);
    });

    for (const call of callProviderMock.mock.calls) {
      const ctxArg = call[2] as AssembledContext;
      expect(ctxArg.fileContents).toHaveLength(1);
      expect(ctxArg.fileContents[0]?.filename).toBe('short.pdf');
      expect(ctxArg.fileContents[0]?.content).toBe('base64-pdf-bytes');
    }
  });

  it('never calls the gateway with an empty fileIds array when the caller passed attachments', async () => {
    buildMock.mockResolvedValue({
      context: buildContext([buildFile()]),
      threadSettings: undefined,
    });

    const models: ParallelModelTarget[] = [{ provider: 'GEMINI', model: 'gemini-2.5-flash' }];
    await manager.executeConsensus('user-1', 'thread-1', 'Check this', models, [
      'file-1',
      'file-2',
    ]);

    await vi.waitFor(() => {
      expect(chatStreamService.emitCompletion).toHaveBeenCalled();
    });

    const requestArg = buildMock.mock.calls[0]?.[0] as { fileIds?: string[] };
    expect(requestArg.fileIds).toEqual(['file-1', 'file-2']);
  });
});
