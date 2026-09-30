import { vi } from 'vitest';
import { ContextAssemblyManager } from '../context-assembly.manager';
import { ContextComposerManager } from '../context-composer.manager';
import { CrossThreadRetrievalManager } from '../cross-thread-retrieval.manager';
import { receiptFromAssembledContext } from '../../../../common/utilities/receipt-from-context.utility';

const { appConfigGet, httpRequest } = vi.hoisted(() => ({
  appConfigGet: vi.fn(),
  httpRequest: vi.fn(),
}));

vi.mock('../../../../common/utilities', () => ({
  buildInterServiceAuthHeader: vi.fn(() => 'Service t'),
  httpRequest,
  mapResearchModeToWorkflow: vi.fn(),
  runResearch: vi.fn(),
}));
vi.mock('../../../../app/config/app.config', () => ({ AppConfig: { get: appConfigGet } }));

const SPEC_SECTION = '## Documentation Date\n\n`Documentation Date cannot be in the future.`\n';
const FILLER = Array.from(
  { length: 150 },
  (_, i) => `## Section ${String(i)}\n\nWearable sync notes for the care pathway team.\n`,
).join('\n');
const PACK_BODY = `# MYONCARE QA CONTEXT PACK\n\nThe user's name is Ihab.\n\n${FILLER}\n${SPEC_SECTION}\n${FILLER}`;

function manager(): ContextAssemblyManager {
  return new ContextAssemblyManager(
    new ContextComposerManager(),
    new CrossThreadRetrievalManager({
      findBranchRoot: async () => Promise.resolve(null),
      findCandidateThreads: async () => Promise.resolve([]),
      findMessagesForThreads: async () => Promise.resolve([]),
    } as never),
    { needsWeb: async () => ({ needsWeb: false, reason: 'test' }) } as never,
    { hasResearchAccess: async () => true } as never,
  );
}

const question = (content: string) => [
  {
    id: 'm1',
    threadId: 'thread-7',
    role: 'USER',
    content,
    metadata: null,
    createdAt: new Date(Date.UTC(2026, 8, 29)),
  },
];

describe('context packs reach chat (owner bugs 4, 5, 6)', () => {
  beforeEach(() => {
    httpRequest.mockReset();
    appConfigGet.mockReturnValue({
      FILE_SERVICE_URL: 'http://file',
      MEMORY_SERVICE_URL: 'http://memory',
      WORKSPACE_SERVICE_URL: 'http://workspace',
      RESEARCH_SERVICE_URL: 'http://research',
      INTER_SERVICE_AUTH_TOKEN: 't',
    });
    httpRequest.mockImplementation(({ url }: { url: string }) => {
      if (url.endsWith('/internal/context-packs/for-chat')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          data: {
            packs: [
              {
                id: 'pack-auto',
                name: 'Myoncare QA',
                autoApplied: true,
                items: [{ id: 'item-1', itemType: 'MARKDOWN', content: PACK_BODY }],
              },
            ],
          },
        });
      }
      return url.includes('/internal/memories/retrieve')
        ? Promise.resolve({ ok: true, status: 200, data: { memories: [] } })
        : Promise.resolve({ ok: true, status: 200, data: [] });
    });
  });

  it("asks memory-service for the user's packs with the service token even when none is attached", async () => {
    await manager().assemble(
      'user-A',
      question('What is the exact error when Documentation Date is in the future?') as never,
      { contextWindowTokens: 32_768, maxTokens: 1_024 } as never,
      undefined,
    );
    const call = httpRequest.mock.calls.find(([arg]) =>
      String((arg as { url: string }).url).endsWith('/for-chat'),
    )?.[0] as { method: string; headers: Record<string, string>; body: Record<string, unknown> };
    expect(call.method).toBe('POST');
    expect(call.headers.Authorization).toBe('Service t');
    expect(call.body).toEqual({ userId: 'user-A', threadId: 'thread-7', packIds: [] });
  });

  it('puts the answering section of a large pack into the prompt and names the pack', async () => {
    const context = await manager().assemble(
      'user-A',
      question('What is the exact error when Documentation Date is in the future?') as never,
      { contextWindowTokens: 32_768, maxTokens: 1_024 } as never,
      ['pack-auto'],
    );
    expect(PACK_BODY.length).toBeGreaterThan(10_000);
    const prompt = JSON.stringify(manager().buildChatMessages(context));
    expect(prompt).toContain('Documentation Date cannot be in the future.');
    expect(prompt).toContain('### Myoncare QA');
    expect(prompt).toContain('it is not a request to create anything');
    // Arabic question, English error message: quote it, never translate it.
    expect(prompt).toContain('quote it verbatim in its original language');

    const receipt = receiptFromAssembledContext(context, 100);
    expect(receipt.packItems).toHaveLength(1);
    expect(receipt.packItems[0]?.contextPackId).toBe('pack-auto');
    expect(receipt.packItems[0]?.id).toBe('item-1');
  });

  it('does not fetch packs when the thread switched context off', async () => {
    const context = await manager().assemble(
      'user-A',
      question('What is the exact error when Documentation Date is in the future?') as never,
      { contextWindowTokens: 32_768, useContext: false } as never,
      ['pack-auto'],
    );
    expect(context.contextPackItems).toEqual([]);
    expect(
      httpRequest.mock.calls.some(([arg]) =>
        String((arg as { url: string }).url).includes('context-packs'),
      ),
    ).toBe(false);
  });

  it('does not fetch memories when the thread switched memory off', async () => {
    await manager().assemble(
      'user-A',
      question('What is my name and what do I work on?') as never,
      { contextWindowTokens: 32_768, useMemory: false } as never,
    );
    expect(
      httpRequest.mock.calls.some(([arg]) =>
        String((arg as { url: string }).url).includes('/memories/retrieve'),
      ),
    ).toBe(false);
  });

  it('a large FACT memory delivers its buried answer, not its first page', async () => {
    httpRequest.mockImplementation(({ url }: { url: string }) =>
      url.includes('/internal/memories/retrieve')
        ? Promise.resolve({
            ok: true,
            status: 200,
            data: { memories: [{ id: 'mem-big', type: 'FACT', content: PACK_BODY, reason: 'X' }] },
          })
        : Promise.resolve({ ok: true, status: 200, data: { packs: [] } }),
    );
    const context = await manager().assemble(
      'user-A',
      question('What is the exact error when Documentation Date is in the future?') as never,
      { contextWindowTokens: 32_768, maxTokens: 1_024 } as never,
    );
    expect(PACK_BODY.indexOf('cannot be in the future')).toBeGreaterThan(5_000);
    const prompt = JSON.stringify(manager().buildChatMessages(context));
    expect(prompt).toContain('Documentation Date cannot be in the future.');
  });

  it('continues without packs when memory-service fails', async () => {
    httpRequest.mockImplementation(({ url }: { url: string }) =>
      url.endsWith('/for-chat')
        ? Promise.resolve({ ok: false, status: 503, data: {} })
        : Promise.resolve({ ok: true, status: 200, data: { memories: [] } }),
    );
    const context = await manager().assemble(
      'user-A',
      question('What is the exact error when Documentation Date is in the future?') as never,
      { contextWindowTokens: 32_768 } as never,
      ['pack-auto'],
    );
    expect(context.contextPackItems).toEqual([]);
  });
});
