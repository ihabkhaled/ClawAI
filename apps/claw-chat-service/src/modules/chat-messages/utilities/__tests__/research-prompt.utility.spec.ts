import { type ChatMessage } from '../../../../generated/prisma';
import {
  disabledCrossThreadResult,
  emptyConversationManifest,
  fallbackModelTokenBudget,
} from '../assembled-context.utility';
import { type AssembledContext } from '../../types/context.types';
import { injectResearchEvidenceIntoContext } from '../research-prompt.utility';

function baseContext(systemPrompt: string | null): AssembledContext {
  return {
    userId: 'user-1',
    systemPrompt,
    threadMessages: [] as ChatMessage[],
    memories: [],
    contextPackItems: [],
    fileContents: [],
    workspaceCitations: [],
    researchEvidence: [],
    researchRunId: null,
    researchWarnings: [],
    researchRequested: false,
    researchToolsUsed: [],
    tokenBudget: 512,
    modelBudget: fallbackModelTokenBudget(),
    conversationManifest: emptyConversationManifest(),
    crossThread: disabledCrossThreadResult(),
  };
}

describe('injectResearchEvidenceIntoContext', () => {
  // Shared by compare, consensus and escalation — previously each manager
  // carried its own byte-identical copy of this merge, and none of them set
  // researchGroundingInjected, so ContextAssemblyManager's final-user-turn
  // grounding reminder silently never fired for any orchestration mode. See
  // the field's doc comment in context.types.ts.
  it('returns the context unchanged, including the grounding flag, when evidence is empty', () => {
    const context = baseContext('existing system prompt');

    const result = injectResearchEvidenceIntoContext(context, '');

    expect(result).toBe(context);
    expect(result.researchGroundingInjected).toBeUndefined();
  });

  it('prepends evidence to an existing system prompt and sets the grounding flag', () => {
    const context = baseContext('existing system prompt');

    const result = injectResearchEvidenceIntoContext(context, '## Web research evidence');

    expect(result.systemPrompt).toBe('## Web research evidence\n\nexisting system prompt');
    expect(result.researchGroundingInjected).toBe(true);
  });

  it('uses the evidence as the whole system prompt when there was none', () => {
    const context = baseContext(null);

    const result = injectResearchEvidenceIntoContext(context, '## Web research evidence');

    expect(result.systemPrompt).toBe('## Web research evidence');
    expect(result.researchGroundingInjected).toBe(true);
  });

  it('trims a blank existing system prompt before deciding whether to prepend', () => {
    const context = baseContext('   ');

    const result = injectResearchEvidenceIntoContext(context, '## Web research evidence');

    expect(result.systemPrompt).toBe('## Web research evidence');
  });
});
