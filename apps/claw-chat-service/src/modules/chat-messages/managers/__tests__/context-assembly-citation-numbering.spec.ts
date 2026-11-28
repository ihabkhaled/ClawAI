import { vi } from 'vitest';
// Rule 41 §16 / ADR-133 contract: the [n] the research block prints and the
// index toStoredCitations stores are the SAME number for the same source. If
// either side is renumbered alone, an answer's [3] opens the wrong page.
import { ContextAssemblyManager } from '../context-assembly.manager';
import { RESEARCH_TEXT_MATCH_INSTRUCTION } from '../../constants/research-grounding.constants';
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
  // Research engine B1: the source is printed in an untrusted fence whose n attribute is the [n] the model cites.
  it('fences each source as n="index" url="url" for exactly what toStoredCitations stores', () => {
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
        `<web_source n="${String(citation.index)}" url="${citation.url}" trust="untrusted">\nTitle: ${citation.title ?? ''}`,
      );
    }
    // Plain brackets, said outright: gpt-oss otherwise cites as 【n】, which the UI cannot link.
    expect(prompt).toContain('Cite a block by its n attribute as [n]: plain square brackets');
    // A lyric or quote that differs by spelling is the same text (owner report 2026-11-28).
    expect(prompt).toContain(RESEARCH_TEXT_MATCH_INSTRUCTION);
  });
});
