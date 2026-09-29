import { vi } from 'vitest';
// Rule 41 §16 / ADR-133 contract: the [n] the research block prints and the
// index toStoredCitations stores are the SAME number for the same source. If
// either side is renumbered alone, an answer's [3] opens the wrong page.
import { ContextAssemblyManager } from '../context-assembly.manager';
import { toStoredCitations } from '../../utilities/stored-citations.utility';
import { type ChatMessage } from '../../../../generated/prisma';
import { type AssembledContext, type ResearchEvidenceCitation } from '../../types/context.types';

const evidence = (title: string, url: string): ResearchEvidenceCitation =>
  ({
    id: url,
    title,
    url,
    snippet: `${title} snippet`,
    source: 'web',
    providerKind: null,
    publishedAt: null,
    confidence: 0.9,
  }) as ResearchEvidenceCitation;

const contextWith = (researchEvidence: ResearchEvidenceCitation[]): AssembledContext =>
  ({
    userId: 'u1',
    systemPrompt: null,
    threadMessages: [
      {
        id: 'm1',
        threadId: 't1',
        role: 'USER',
        content: 'What changed?',
        metadata: null,
      } as ChatMessage,
    ],
    memories: [],
    contextPackItems: [],
    fileContents: [],
    workspaceCitations: [],
    researchEvidence,
    researchRunId: 'run-1',
    researchWarnings: [],
    researchRequested: true,
    researchToolsUsed: [],
    tokenBudget: 100_000,
    modelBudget: {} as never,
    conversationManifest: {} as never,
    crossThread: { selections: [] } as never,
  }) as AssembledContext;

describe('research block numbering equals stored citation numbering', () => {
  it('prints "[n] title — url" for exactly the index and url toStoredCitations stores', () => {
    const manager = new ContextAssemblyManager(
      { select: vi.fn() } as never,
      { retrieve: vi.fn() } as never,
      { needsWeb: vi.fn() } as never,
      { hasResearchAccess: vi.fn() } as never,
    );
    const items = [
      evidence('RATP news', 'https://ratp.example/news'),
      evidence('Metro map', 'https://map.example'),
      evidence('Council vote', 'https://council.example/vote'),
    ];

    const prompt = manager.buildPromptString(contextWith(items));

    for (const citation of toStoredCitations(items)) {
      expect(prompt).toContain(
        `[${String(citation.index)}] ${citation.title ?? ''} — ${citation.url}`,
      );
    }
  });
});
