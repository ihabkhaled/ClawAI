// ADR-227 end to end inside ChatMessagesService: a reply that only promises a search is stored as its own message,
// the search runs (when the user and the plan allow the web), and the model answers again in a second message.
import { type Mock, vi } from 'vitest';

import {
  SEARCH_CONTINUATION_NOTE_EMPTY,
  SEARCH_CONTINUATION_NOTE_FOUND,
  SEARCH_CONTINUATION_NOTE_OFF,
  SEARCH_NOT_AVAILABLE_NOTE,
} from '../constants/search-continuation.constants';
import { ChatMessagesService } from '../services/chat-messages.service';
import type { PendingSearch } from '../types/search-continuation.types';

const { httpRequest } = vi.hoisted(() => ({ httpRequest: vi.fn() }));
vi.mock('../../../common/utilities', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  httpRequest,
  buildInterServiceAuthHeader: vi.fn(() => 'Service test-token'),
}));

const { appConfigGet } = vi.hoisted(() => ({ appConfigGet: vi.fn() }));
vi.mock('../../../app/config/app.config', () => ({ AppConfig: { get: appConfigGet } }));

const userMessage = (metadata: Record<string, unknown> | null): Record<string, unknown> => ({
  id: 'msg-1',
  threadId: 'thread-1',
  role: 'USER',
  content: 'who sang this line?',
  provider: null,
  model: null,
  routingMode: 'AUTO',
  routerModel: null,
  usedFallback: false,
  inputTokens: null,
  outputTokens: null,
  estimatedCost: null,
  latencyMs: null,
  feedback: null,
  metadata,
  createdAt: new Date(),
});

const THREAD = {
  id: 'thread-1',
  userId: 'user-1',
  title: 'Lyrics',
  routingMode: 'AUTO',
  preferredProvider: null,
  preferredModel: null,
  systemPrompt: null,
  temperature: 0.7,
  maxTokens: null,
  contextPackIds: null,
};

const ROUTED = {
  messageId: 'msg-1',
  threadId: 'thread-1',
  selectedProvider: 'OLLAMA_CLOUD',
  selectedModel: 'some-model',
  routingMode: 'AUTO',
  timestamp: new Date().toISOString(),
};

const reply = (content: string): Record<string, unknown> => ({
  content,
  provider: 'OLLAMA_CLOUD',
  model: 'some-model',
  inputTokens: 10,
  outputTokens: 5,
  latencyMs: 20,
  usedFallback: false,
  finishReason: 'stop',
});

const RUN = {
  id: 'run-1',
  workflow: 'SEARCH_THEN_FETCH',
  bundle: {
    mode: 'SEARCH_THEN_FETCH',
    items: [
      { id: 'a', title: 'Song page', url: 'https://a.example', snippet: 's', source: 'SEARCH' },
    ],
    warnings: [],
    toolsUsed: ['web_search'],
  },
};

type Options = {
  pending: PendingSearch | null;
  userMetadata?: Record<string, unknown> | null;
  researchAccess?: boolean;
  run?: unknown;
  longInput?: unknown;
  longOutput?: unknown;
};

type Harness = {
  service: ChatMessagesService;
  execute: Mock;
  create: Mock;
  updateMetadata: Mock;
  searchPromised: Mock;
  stream: Record<string, Mock>;
};

function build(options: Options): Harness {
  const user = userMessage(
    options.userMetadata === undefined ? { researchMode: 'AUTO' } : options.userMetadata,
  );
  const context = {
    userId: 'user-1',
    systemPrompt: null,
    threadMessages: [user],
    memories: [],
    contextPackItems: [],
    fileContents: [],
    workspaceCitations: [],
    researchEvidence: [],
    researchRequested: false,
    tokenBudget: 4096,
  };
  const contextAssembly = {
    injectedMemories: vi.fn().mockReturnValue([]),
    assemble: vi.fn().mockResolvedValue(context),
  };
  const stream = {
    emitRequestAccepted: vi.fn(),
    emitCompletion: vi.fn(),
    emitError: vi.fn(),
    emitSearchContinuation: vi.fn(),
    emitResearchStarted: vi.fn(),
    emitResearchCompleted: vi.fn(),
  };
  const execute = vi
    .fn()
    .mockResolvedValueOnce(reply('I will search for that song now.'))
    .mockResolvedValueOnce(reply('It is "Masarah wa Sima" by Omdan El Nour [1].'));
  const create = vi.fn(async (data: Record<string, unknown>) => ({
    ...data,
    id: `stored-${String(create.mock.calls.length)}`,
  }));
  const updateMetadata = vi.fn().mockResolvedValue(undefined);
  const searchPromised = vi.fn().mockResolvedValue(options.run === undefined ? RUN : options.run);
  const access = {
    hasResearchAccess: vi.fn().mockResolvedValue(options.researchAccess ?? true),
  };
  const service = new ChatMessagesService(
    {
      create,
      findById: vi.fn().mockResolvedValue(user),
      findRecentByThreadId: vi.fn().mockResolvedValue([user]),
      updateMetadata,
    } as never,
    {
      findById: vi.fn().mockResolvedValue(THREAD),
      update: vi.fn().mockResolvedValue(undefined),
    } as never,
    { execute } as never,
    contextAssembly as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    stream as never,
    { render: vi.fn().mockReturnValue(0) } as never,
    { publish: vi.fn().mockResolvedValue(undefined) } as never,
    { write: vi.fn().mockResolvedValue(undefined), getByMessageId: vi.fn() } as never,
    access as never,
    { tryHandleRouted: vi.fn().mockResolvedValue(false) } as never,
    { run: vi.fn().mockResolvedValue(null), searchPromised, standaloneQuery: vi.fn() } as never,
    {
      reset: vi.fn().mockResolvedValue(undefined),
      append: vi.fn().mockResolvedValue(undefined),
      read: vi.fn().mockResolvedValue([]),
    } as never,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    { inspect: vi.fn().mockResolvedValue(options.pending) } as never,
    options.longInput as never,
    options.longOutput as never,
  );
  return { service, execute, create, updateMetadata, searchPromised, stream };
}

const assistantRows = (create: Mock): Array<Record<string, unknown>> =>
  create.mock.calls
    .map((args: unknown[]) => args[0] as Record<string, unknown>)
    .filter((row) => row['role'] === 'ASSISTANT');

const secondPrompt = (execute: Mock): string =>
  String((execute.mock.calls[1]?.[1] as { systemPrompt: string | null }).systemPrompt);

describe('a reply that only promised a search (ADR-227)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    httpRequest.mockReset();
    appConfigGet.mockReturnValue({ PUBLIC_SITE_URL: 'https://claw.local' });
  });

  it('stores the promise, runs the search and stores the answer as a second message', async () => {
    const h = build({ pending: { signal: 'judge', query: 'masarah wa sima lyrics' } });

    await h.service.handleMessageRouted(ROUTED);

    const rows = assistantRows(h.create);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.['content']).toBe('I will search for that song now.');
    expect(rows[0]?.['metadata']).toEqual(
      expect.objectContaining({
        searchContinuation: { status: 'pending', query: 'masarah wa sima lyrics' },
      }),
    );
    expect(rows[1]?.['content']).toContain('Omdan El Nour');
    expect(rows[1]?.['metadata']).not.toHaveProperty('searchContinuation');
    expect(h.searchPromised).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', threadId: 'thread-1' }),
      'masarah wa sima lyrics',
    );
    expect(h.execute).toHaveBeenCalledTimes(2);
    expect(secondPrompt(h.execute)).toContain(SEARCH_CONTINUATION_NOTE_FOUND);
    expect(h.stream['emitSearchContinuation']).toHaveBeenCalledTimes(1);
    expect(h.stream['emitCompletion']).toHaveBeenCalledTimes(1);
    expect(h.updateMetadata).toHaveBeenCalledWith(
      'msg-1',
      expect.objectContaining({ research: expect.objectContaining({ runId: 'run-1' }) }),
    );
    expect(h.updateMetadata).toHaveBeenCalledWith(
      'stored-1',
      expect.objectContaining({
        searchContinuation: { status: 'done', query: 'masarah wa sima lyrics' },
      }),
    );
  });

  it('answers without searching, and says so, when the user turned the web off', async () => {
    const h = build({ pending: { signal: 'judge', query: 'x y' }, userMetadata: null });

    await h.service.handleMessageRouted(ROUTED);

    expect(h.searchPromised).not.toHaveBeenCalled();
    expect(assistantRows(h.create)).toHaveLength(2);
    expect(secondPrompt(h.execute)).toContain(SEARCH_CONTINUATION_NOTE_OFF);
  });

  it('answers without searching when the plan has no research', async () => {
    const h = build({ pending: { signal: 'judge', query: 'x y' }, researchAccess: false });

    await h.service.handleMessageRouted(ROUTED);

    expect(h.searchPromised).not.toHaveBeenCalled();
    expect(secondPrompt(h.execute)).toContain(SEARCH_CONTINUATION_NOTE_OFF);
    const firstPrompt = String(
      (h.execute.mock.calls[0]?.[1] as { systemPrompt: string | null }).systemPrompt,
    );
    expect(firstPrompt).toContain(SEARCH_NOT_AVAILABLE_NOTE);
  });

  it('says the search found nothing when it read no page', async () => {
    const h = build({ pending: { signal: 'tool-call', query: 'x y' }, run: null });

    await h.service.handleMessageRouted(ROUTED);

    expect(secondPrompt(h.execute)).toContain(SEARCH_CONTINUATION_NOTE_EMPTY);
  });

  it('does not store bare tool markup as a message, but still searches and answers', async () => {
    const h = build({ pending: { signal: 'markup', query: 'x y' } });

    await h.service.handleMessageRouted(ROUTED);

    const rows = assistantRows(h.create);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.['content']).toContain('Omdan El Nour');
    expect(h.execute).toHaveBeenCalledTimes(2);
  });

  it('stores a real answer once and never searches', async () => {
    const h = build({ pending: null });

    await h.service.handleMessageRouted(ROUTED);

    expect(h.execute).toHaveBeenCalledTimes(1);
    expect(assistantRows(h.create)).toHaveLength(1);
    expect(h.searchPromised).not.toHaveBeenCalled();
    expect(h.stream['emitSearchContinuation']).not.toHaveBeenCalled();
  });
});

describe('read it all, write it all (ADR-231)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    appConfigGet.mockReturnValue({ PUBLIC_SITE_URL: 'https://claw.local' });
  });

  it('reads an oversized file before answering and continues a cut answer', async () => {
    const readAll = vi.fn(async (input: { context: Record<string, unknown> }) => ({
      context: { ...input.context, systemPrompt: 'NOTES READ' },
      answer: null,
    }));
    const complete = vi.fn(async () => ({
      content: 'one two three',
      provider: 'OLLAMA_CLOUD',
      model: 'some-model',
      inputTokens: 1,
      outputTokens: 3,
      latencyMs: 3,
      usedFallback: false,
      finishReason: 'stop',
    }));
    const h = build({
      pending: null,
      longInput: { readAll },
      longOutput: { isCut: vi.fn().mockReturnValue(true), complete },
    });
    // The assembled context reports one oversized file.
    const assemble = (
      h.service as unknown as {
        contextAssemblyManager: {
          assemble: (() => Promise<unknown>) & { mockResolvedValue: (value: unknown) => void };
        };
      }
    ).contextAssemblyManager.assemble;
    const base = (await assemble()) as Record<string, unknown>;
    assemble.mockResolvedValue({
      ...base,
      oversizedFiles: [{ fileId: 'f', filename: 'big.txt', text: 'x' }],
    });

    await h.service.handleMessageRouted(ROUTED);

    expect(readAll).toHaveBeenCalledTimes(1);
    expect((h.execute.mock.calls[0]?.[1] as { systemPrompt: string }).systemPrompt).toBe(
      'NOTES READ',
    );
    expect(complete).toHaveBeenCalledTimes(1);
    const rows = assistantRows(h.create);
    expect(rows.at(-1)?.['content']).toBe('one two three');
  });
});
