import { ContextAssemblyManager } from '../managers/context-assembly.manager';
import type { ChatMessage } from '../../../generated/prisma';
import { MemoryRecordType } from '../../../common/enums/memory-record-type.enum';
import type { AssembledContext, MemoryRecordResponse } from '../types/context.types';
import {
  disabledCrossThreadResult,
  emptyConversationManifest,
  fallbackModelTokenBudget,
} from '../utilities/assembled-context.utility';
import { ContextComposerManager } from '../managers/context-composer.manager';
import { CrossThreadRetrievalManager } from '../managers/cross-thread-retrieval.manager';

/**
 * A repository that owns no data. These specs exercise prompt shaping, not
 * retrieval, and a thread with `useCrossThreadContext` false never reaches the
 * repository at all — the stub proves that rather than hiding it.
 */
function stubCrossThreadRepository(): ConstructorParameters<typeof CrossThreadRetrievalManager>[0] {
  return {
    findCandidateThreads: async () => Promise.resolve([]),
    findMessagesForThreads: async () => Promise.resolve([]),
  } as unknown as ConstructorParameters<typeof CrossThreadRetrievalManager>[0];
}

describe('ContextAssemblyManager', () => {
  const manager = new ContextAssemblyManager(
    new ContextComposerManager(),
    new CrossThreadRetrievalManager(stubCrossThreadRepository()),
  );

  const buildContext = (): AssembledContext => ({
    userId: 'user-1',
    systemPrompt: null,
    threadMessages: [
      {
        id: 'msg-1',
        threadId: 'thread-1',
        role: 'USER',
        content: 'Find the latest Windows 11 24H2 issues.',
        provider: null,
        model: null,
        routingMode: null,
        routerModel: null,
        usedFallback: false,
        inputTokens: null,
        outputTokens: null,
        estimatedCost: null,
        latencyMs: null,
        feedback: null,
        metadata: null,
        createdAt: new Date('2026-04-21T06:00:00.000Z'),
      } as ChatMessage,
    ],
    memories: [],
    contextPackItems: [],
    fileContents: [],
    workspaceCitations: [],
    researchEvidence: [],
    researchRunId: 'run-1',
    researchWarnings: [
      'Search results were withheld because the returned pages were too weakly matched to the request.',
    ],
    // The shared fixture keeps the PRE-CHANGE trigger: warnings alone. Tests
    // that care about the requested-but-empty case set it themselves, so this
    // one keeps proving the old behaviour is untouched.
    researchRequested: false,
    researchToolsUsed: ['web_search', 'search:ollama_web'],
    tokenBudget: 512,
    modelBudget: fallbackModelTokenBudget(),
    conversationManifest: emptyConversationManifest(),
    crossThread: disabledCrossThreadResult(),
  });

  it('includes research warnings even when no evidence items survive filtering', () => {
    const prompt = manager.buildPromptString(buildContext());

    // Wording changed 2026-09-10 from "No reliable search evidence passed
    // relevance validation" — which described a filter — to a statement about
    // the ATTEMPT, because the block is now emitted for runs that produced
    // nothing at all and "passed validation" would be a lie about those.
    expect(prompt).toContain('This run produced NO usable web evidence');
    expect(prompt).toContain('Do not invent facts');
    expect(prompt).toContain('WARNINGS:');
    expect(prompt).toContain('too weakly matched');
  });

  // Behaviour change, ADR-086. This test used to assert that a prior ASSISTANT
  // message was DROPPED when the next prompt looked self-contained. That rule
  // is the defect: measured live, it removed a planted fact whenever the
  // question was rephrased, and recall fell from 83% to 0% on the same fact at
  // the same distance. Assistant output is conversational state and stays.
  // Memory filtering below is unchanged — a topical memory is still filtered
  // by relevance, a standing PREFERENCE is still always injected.
  it('keeps prior assistant content, and still filters topical memories, for self-contained prompts', () => {
    const context = buildContext();
    context.threadMessages = [
      {
        ...context.threadMessages[0],
        id: 'msg-old-user',
        content: 'Design a geometric logo for a privacy startup.',
      } as ChatMessage,
      {
        ...context.threadMessages[0],
        id: 'msg-old-assistant',
        role: 'ASSISTANT',
        content: 'Semi-Circle Shape Concept with heart symbol and mascot directions.',
      } as ChatMessage,
      {
        ...context.threadMessages[0],
        id: 'msg-new-user',
        content:
          'Refactor a callback-heavy handler into async await with structured error handling.',
      } as ChatMessage,
    ];
    context.memories = [
      {
        id: 'mem-1',
        userId: 'user-1',
        type: 'NOTE',
        content: 'The user likes logo concepts with circles and mascots.',
        isEnabled: true,
      },
      {
        id: 'mem-2',
        userId: 'user-1',
        type: 'PREFERENCE',
        content: 'The user prefers concise technical answers.',
        isEnabled: true,
      },
    ];

    const prompt = manager.buildPromptString(context);

    expect(prompt).toContain('Semi-Circle Shape Concept');
    expect(prompt).not.toContain('likes logo concepts');
    expect(prompt).toContain('prefers concise technical answers');
    expect(prompt).toContain('Refactor a callback-heavy handler');
  });

  it('keeps recent context for clear follow-up prompts', () => {
    const context = buildContext();
    context.threadMessages = [
      {
        ...context.threadMessages[0],
        id: 'msg-old-user',
        content: 'Design a geometric logo for a privacy startup.',
      } as ChatMessage,
      {
        ...context.threadMessages[0],
        id: 'msg-old-assistant',
        role: 'ASSISTANT',
        content: 'Semi-Circle Shape Concept with heart symbol and mascot directions.',
      } as ChatMessage,
      {
        ...context.threadMessages[0],
        id: 'msg-new-user',
        content: 'Make that shorter and keep the same style.',
      } as ChatMessage,
    ];

    const prompt = manager.buildPromptString(context);

    expect(prompt).toContain('Semi-Circle Shape Concept');
    expect(prompt).toContain('Make that shorter and keep the same style.');
  });

  // Behaviour change, ADR-086. Previously asserted that an unrelated prior turn
  // was dropped. Whether a turn is "unrelated" is exactly the judgement the old
  // selector got wrong, so it no longer gates inclusion — the token budget does.
  // The role-prefix normalisation this test was written for still matters, but
  // it now only affects RANKING, never removal.
  it('keeps prior turns whose only overlap with the prompt is a role prefix', () => {
    const context = buildContext();
    context.threadMessages = [
      {
        ...context.threadMessages[0],
        id: 'msg-old-user',
        content:
          'As Associate backend engineer, describe a TypeScript service that retries SSE requests with backoff, logging, and tests.',
      } as ChatMessage,
      {
        ...context.threadMessages[0],
        id: 'msg-old-assistant',
        role: 'ASSISTANT',
        content:
          'Build an SseClientService with retry policies, logging hooks, and reconnection tests.',
      } as ChatMessage,
      {
        ...context.threadMessages[0],
        id: 'msg-new-user',
        content:
          'As Senior backend engineer, review this API design for race conditions and suggest a cleaner async flow.',
      } as ChatMessage,
    ];

    const prompt = manager.buildPromptString(context);

    expect(prompt).toContain('SseClientService');
    expect(prompt).toContain('review this API design for race conditions');
  });

  it('never decodes a video attachment as UTF-8 prompt text', () => {
    const context = buildContext();
    const rawVideoMarker = 'raw-video-secret-that-must-not-enter-the-prompt';
    context.fileContents = [
      {
        id: 'video-1',
        filename: 'demo.mp4',
        mimeType: 'video/mp4',
        content: Buffer.from(rawVideoMarker).toString('base64'),
      },
    ];

    const prompt = manager.buildPromptString(context);

    // The invariant is that the BYTES never reach the prompt. The placeholder
    // wording changed with ADR-093; asserting on the exact sentence pinned the
    // message rather than the guarantee.
    expect(prompt).not.toContain(rawVideoMarker);
    expect(prompt).toContain('Video file "demo.mp4"');
    expect(prompt).toContain('video/mp4');
  });

  it('keeps video bytes out of provider-neutral chat messages', () => {
    const context = buildContext();
    const videoBase64 = Buffer.from('provider-neutral-video').toString('base64');
    context.fileContents = [
      {
        id: 'video-1',
        filename: 'demo.mp4',
        mimeType: 'video/mp4',
        content: videoBase64,
      },
    ];

    const messages = manager.buildChatMessages(context);

    // Same invariant as above: the bytes stay out of the prompt. The
    // placeholder wording is ADR-093's, not the old "not extractable as text".
    expect(JSON.stringify(messages)).not.toContain(`data:video/mp4;base64,${videoBase64}`);
    expect(JSON.stringify(messages)).toContain('video has no text to extract');
  });

  it('renders Runtime V2 requests and results as an assistant-user exchange', () => {
    const context = buildContext();
    context.researchRunId = null;
    context.researchWarnings = [];
    context.threadMessages = [
      context.threadMessages[0] as ChatMessage,
      {
        ...context.threadMessages[0],
        id: 'tool-request-1',
        role: 'TOOL',
        content: '{"kind":"tool","toolName":"workspace.files"}',
        metadata: { runtimeV2: { kind: 'tool-request' } },
      } as ChatMessage,
      {
        ...context.threadMessages[0],
        id: 'tool-result-1',
        role: 'TOOL',
        content: '{"status":"succeeded","structured":{"path":"README.md"}}',
        metadata: { runtimeV2: { kind: 'tool-result' } },
      } as ChatMessage,
    ];

    const messages = manager.buildChatMessages(context);
    const prompt = manager.buildPromptString(context);

    expect(messages.map((message) => message.role)).toEqual(['user', 'assistant', 'user']);
    expect(prompt).toContain('ASSISTANT: {"kind":"tool"');
    expect(prompt).toContain('USER: {"status":"succeeded"');
  });

  it('adds video attachments to the latest user message only for Gemini-native requests', () => {
    const context = buildContext();
    const videoBase64 = Buffer.from('gemini-video').toString('base64');
    context.fileContents = [
      {
        id: 'video-1',
        filename: 'demo.mp4',
        mimeType: 'video/mp4',
        content: videoBase64,
      },
    ];

    const messages = manager.buildGeminiChatMessages(context);
    const userMessage = messages.find((message) => message.role === 'user');
    const parts = userMessage?.content as Array<Record<string, unknown>>;

    // The shared fixture carries a research warning, so the grounding reminder
    // is appended to this same turn — asserted on the START of the text rather
    // than on equality, because the two features deliberately share the last
    // user message.
    expect(parts[0]?.['type']).toBe('text');
    expect(String(parts[0]?.['text'])).toContain('Find the latest Windows 11 24H2 issues.');
    expect(parts[1]).toEqual({
      type: 'image_url',
      image_url: { url: `data:video/mp4;base64,${videoBase64}` },
    });
    expect(parts).toHaveLength(2);
  });

  describe('telling the model the truth about the web', () => {
    // The refusal was loudest exactly when research had FAILED. The capability
    // block used to be attached only when evidence or warnings existed; a run
    // that failed cleanly produced neither, so the model heard nothing about
    // the web and answered "I can't browse the web" from its training prior.
    it('states the capability when research was requested but produced nothing at all', () => {
      const context = buildContext();
      context.researchEvidence = [];
      context.researchWarnings = [];
      context.researchRequested = true;
      context.researchToolsUsed = [];

      const prompt = manager.buildPromptString(context);

      expect(prompt).toContain("Do not say that you can't browse the web");
      expect(prompt).toContain('the attempt was made and it did not succeed');
    });

    it('says nothing about the web when research was never requested', () => {
      const context = buildContext();
      context.researchEvidence = [];
      context.researchWarnings = [];
      context.researchRequested = false;
      context.researchToolsUsed = [];

      const prompt = manager.buildPromptString(context);

      expect(prompt).not.toContain("Do not say that you can't browse the web");
    });

    it('names the tools that ran, so evidence arrives with provenance', () => {
      // Without this the model cannot tell a page it was handed from a search
      // snippet ABOUT that page, and writes "according to the article" over a
      // snippet it never read.
      const context = buildContext();
      context.researchRequested = true;
      context.researchToolsUsed = ['web_search', 'web_fetch', 'web_extract'];

      const prompt = manager.buildPromptString(context);

      expect(prompt).toContain('Tools that ran on this turn');
      expect(prompt).toContain('searched the web');
      expect(prompt).toContain('web_extract');
    });

    it('distinguishes opening the user link from opening a search hit', () => {
      // The question a user is really asking when they paste a link: was MY
      // page opened, or did something merely search for it?
      const context = buildContext();
      context.researchRequested = true;
      context.researchToolsUsed = ['web_search', 'web_fetch', 'web_fetch:user_url'];

      const prompt = manager.buildPromptString(context);

      expect(prompt).toContain('opened the exact link(s) in the request');
    });

    it('does not claim the user link was opened when only search hits were fetched', () => {
      const context = buildContext();
      context.researchRequested = true;
      context.researchToolsUsed = ['web_search', 'web_fetch'];

      const prompt = manager.buildPromptString(context);

      expect(prompt).toContain('opened pages found by that search');
      expect(prompt).not.toContain('opened the exact link(s) in the request');
    });

    it('admits when no web tool reported completing', () => {
      const context = buildContext();
      context.researchRequested = true;
      context.researchToolsUsed = [];

      const prompt = manager.buildPromptString(context);

      expect(prompt).toContain('No web tool reported completing on this run.');
    });
  });

  describe('the grounding reminder on the last user turn', () => {
    // Measured 2026-09-11: a run with ELEVEN evidence items in the prompt, the
    // capability statement included and `web_fetch:user_url` among the tools,
    // still produced "I am sorry, but I cannot access external websites" from
    // gemini-2.5-flash-lite. The pipeline was correct end to end and the answer
    // was still wrong, because the instruction sat in front of the memories and
    // the whole conversation while the model attends to the end.
    it('appends the reminder to the final user message when evidence exists', () => {
      const context = buildContext();
      context.researchEvidence = [];
      context.researchWarnings = [];
      context.researchRequested = true;

      const messages = manager.buildGeminiChatMessages(context);
      const lastUser = [...messages].reverse().find((message) => message.role === 'user');

      expect(String(lastUser?.content)).toContain('already fetched for you by this platform');
    });

    it('does not touch the conversation when there is no web evidence', () => {
      const context = buildContext();
      context.researchEvidence = [];
      context.researchWarnings = [];
      context.researchRequested = false;

      const messages = manager.buildGeminiChatMessages(context);
      const lastUser = [...messages].reverse().find((message) => message.role === 'user');

      expect(String(lastUser?.content)).not.toContain('already fetched for you');
    });

    it('marks the reminder as not written by the user', () => {
      // The model is reading it inside a user turn, so it has to be able to
      // tell the difference between an instruction and something the person
      // actually said.
      const context = buildContext();
      context.researchRequested = true;

      const messages = manager.buildGeminiChatMessages(context);
      const lastUser = [...messages].reverse().find((message) => message.role === 'user');

      expect(String(lastUser?.content)).toContain('not written by the user');
    });

    it('never appends the reminder twice', () => {
      // A message replayed into a later turn must not accumulate copies.
      const context = buildContext();
      context.researchRequested = true;
      const messages = manager.buildGeminiChatMessages(context);
      const lastUser = [...messages].reverse().find((message) => message.role === 'user');
      const content = String(lastUser?.content);

      expect(content.split('already fetched for you by this platform')).toHaveLength(2);
    });

    it('reaches the single-string prompt too, not only provider messages', () => {
      const context = buildContext();
      context.researchRequested = true;

      expect(manager.buildPromptString(context)).toContain(
        'already fetched for you by this platform',
      );
    });
  });
});

describe('ContextAssemblyManager memory selection', () => {
  const manager = new ContextAssemblyManager(
    new ContextComposerManager(),
    new CrossThreadRetrievalManager(stubCrossThreadRepository()),
  );

  const memory = (
    id: string,
    type: string,
    content: string,
    pinned = false,
  ): MemoryRecordResponse => ({
    id,
    userId: 'user-1',
    type,
    content,
    isEnabled: true,
    pinned,
  });

  // Reproduced against the running stack before this was written:
  // scripts/regression/context-memory-regression.mjs showed an INSTRUCTION
  // memory silently absent from the answer, and five saved facts arriving as
  // three.
  it('keeps a standing instruction that shares no words with the question', () => {
    const instruction = memory(
      'm1',
      MemoryRecordType.INSTRUCTION,
      'Always end every reply with the exact marker BUTTERFLY.',
    );

    const selected = manager.selectMemoriesForPrompt(
      [instruction],
      'what is a database index used for',
    );

    // Vocabulary overlap here is zero. An instruction that applies only when
    // you happen to ask about instructions is not an instruction.
    expect(selected).toHaveLength(1);
    expect(selected[0]?.id).toBe('m1');
  });

  it('keeps a preference regardless of the question', () => {
    const preference = memory('m2', MemoryRecordType.PREFERENCE, 'Answer in British English.');

    expect(manager.selectMemoriesForPrompt([preference], 'explain postgres vacuum')).toHaveLength(
      1,
    );
  });

  it('keeps a pinned fact even when it is off topic', () => {
    // Pinning is an explicit "always use this" and outranks the topic test.
    const pinned = memory('m3', MemoryRecordType.FACT, 'The office is in Cairo.', true);

    expect(manager.selectMemoriesForPrompt([pinned], 'explain postgres vacuum')).toHaveLength(1);
  });

  it('still drops an unrelated topical fact', () => {
    // The filter is not removed, only narrowed: an off-topic fact is still
    // noise, and letting everything through would crowd out the thread itself.
    const unrelated = memory('m4', MemoryRecordType.FACT, 'The office is in Cairo.');

    expect(manager.selectMemoriesForPrompt([unrelated], 'explain postgres vacuum')).toHaveLength(0);
  });

  it('keeps a topical fact that matches the question', () => {
    const relevant = memory('m5', MemoryRecordType.FACT, 'Postgres vacuum reclaims dead tuples.');

    expect(
      manager.selectMemoriesForPrompt([relevant], 'explain postgres vacuum please'),
    ).toHaveLength(1);
  });

  it('carries more than three relevant memories', () => {
    // The old cap was three, applied across every kind at once. Five saved
    // codenames reached the model as three, which is the measured failure.
    const facts = Array.from({ length: 5 }, (_, i) =>
      memory(`f${String(i)}`, MemoryRecordType.FACT, `Registered codename number ${String(i)}.`),
    );

    const selected = manager.selectMemoriesForPrompt(
      facts,
      'list every registered codename number you know',
    );

    expect(selected).toHaveLength(5);
  });

  it('never lets topical facts crowd out standing memories', () => {
    const instruction = memory('i1', MemoryRecordType.INSTRUCTION, 'Always reply in bullets.');
    const facts = Array.from({ length: 12 }, (_, i) =>
      memory(`f${String(i)}`, MemoryRecordType.FACT, `Registered codename number ${String(i)}.`),
    );

    const selected = manager.selectMemoriesForPrompt(
      [...facts, instruction],
      'list every registered codename number you know',
    );

    expect(selected.some((m) => m.id === 'i1')).toBe(true);
  });

  it('returns an empty list unchanged', () => {
    expect(manager.selectMemoriesForPrompt([], 'anything')).toEqual([]);
  });
});
