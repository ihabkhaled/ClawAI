import { describe, expect, it } from 'vitest';

import { MediaCapabilityState } from '../../../../common/enums/media-capability-state.enum';
import type { ChatMessage } from '../../../../generated/prisma';
import { NO_VISION_IMAGE_WITHOUT_TEXT_NOTE } from '../../constants/attachment-delivery.constants';
import type { AssembledContext, FileContentResponse } from '../../types/context.types';
import type { ModelMediaCapabilities } from '../../types/model-capability.types';
import type { OpenAiChatMessage } from '../../types/execution.types';
import {
  disabledCrossThreadResult,
  emptyConversationManifest,
  fallbackModelTokenBudget,
} from '../../utilities/assembled-context.utility';
import { AttachmentDeliveryManager } from '../attachment-delivery.manager';
import { ContextAssemblyManager } from '../context-assembly.manager';
import { ContextComposerManager } from '../context-composer.manager';
import { CrossThreadRetrievalManager } from '../cross-thread-retrieval.manager';

// F030: a screenshot a Runtime V2 tool returned rides the tool-result message
// (the last user-role turn of a continuation) for a seeing lane, and becomes
// the honest no-vision note for a blind one.

const { SUPPORTED, UNSUPPORTED, UNKNOWN } = MediaCapabilityState;
const SCREENSHOT_BYTES = Buffer.from('png-bytes-of-a-page').toString('base64');

const assembly = new ContextAssemblyManager(
  new ContextComposerManager(),
  new CrossThreadRetrievalManager({
    findCandidateThreads: async () => Promise.resolve([]),
    findMessagesForThreads: async () => Promise.resolve([]),
  } as never),
  { needsWeb: async () => ({ needsWeb: false, reason: 'test' }) } as never,
  { hasResearchAccess: async () => true } as never,
);

function delivery(
  table: Record<string, Partial<ModelMediaCapabilities>>,
): AttachmentDeliveryManager {
  const client = {
    resolve: async (provider: string, model: string): Promise<ModelMediaCapabilities> =>
      Promise.resolve({
        vision: UNKNOWN,
        audioInput: UNKNOWN,
        videoInput: UNKNOWN,
        ...(table[`${provider}/${model}`] ?? {}),
      }),
    listVideoCapableModels: async () => Promise.resolve(null),
  };
  return new AttachmentDeliveryManager(client as never);
}

const screenshot: FileContentResponse = {
  id: 'shot-1',
  filename: 'observe.png',
  mimeType: 'image/png',
  content: SCREENSHOT_BYTES,
  extractedText: null,
  ingestionStatus: 'COMPLETED',
  extractionError: null,
};

const message = (id: string, role: string, content: string, kind?: string): ChatMessage =>
  ({
    id,
    threadId: 'thread-1',
    role,
    content,
    metadata: kind === undefined ? null : { runtimeV2: { kind } },
    createdAt: new Date('2026-09-30T00:00:00.000Z'),
  }) as ChatMessage;

function continuation(): AssembledContext {
  return {
    userId: 'user-1',
    systemPrompt: null,
    threadMessages: [
      message('m1', 'USER', 'Check the login page renders.'),
      message('m2', 'TOOL', '{"kind":"tool","operation":"observe"}', 'tool-request'),
      message('m3', 'TOOL', '{"status":"succeeded","fileIds":["shot-1"]}', 'tool-result'),
    ],
    memories: [],
    contextPackItems: [],
    fileContents: [screenshot],
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

const lanes = delivery({
  'OPENAI/gpt-4o': { vision: SUPPORTED },
  'DEEPSEEK/deepseek-chat': { vision: UNSUPPORTED },
});

describe('a tool-result screenshot in the provider payload', () => {
  it('rides the tool-result message as an image part for a vision lane', async () => {
    const lane = await lanes.applyToContext(continuation(), 'OPENAI', 'gpt-4o');
    const messages: OpenAiChatMessage[] = assembly.buildChatMessages(lane);
    const last = messages.at(-1);

    expect(last?.role).toBe('user');
    expect(last?.content).toEqual([
      { type: 'text', text: '{"status":"succeeded","fileIds":["shot-1"]}' },
      { type: 'image_url', image_url: { url: `data:image/png;base64,${SCREENSHOT_BYTES}` } },
    ]);
  });

  it('is replaced by the no-vision note for a blind lane', async () => {
    const lane = await lanes.applyToContext(continuation(), 'DEEPSEEK', 'deepseek-chat');
    const payload = JSON.stringify(assembly.buildChatMessages(lane));

    expect(payload).not.toContain('image_url');
    expect(payload).not.toContain(SCREENSHOT_BYTES);
    expect(payload).toContain(NO_VISION_IMAGE_WITHOUT_TEXT_NOTE);
  });
});
