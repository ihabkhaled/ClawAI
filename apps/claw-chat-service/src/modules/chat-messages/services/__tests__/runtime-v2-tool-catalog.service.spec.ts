import { describe, expect, it, vi } from 'vitest';
import type { ChatThreadsRepository } from '../../../chat-threads/repositories/chat-threads.repository';
import type { RedisService } from '../../../../infrastructure/redis/redis.service';
import type { ToolDefinitionDto } from '../../dto/runtime-v2.dto';
import { RuntimeV2ToolCatalogStore } from '../../repositories/runtime-v2-tool-catalog.store';
import type { RuntimeV2Store } from '../../repositories/runtime-v2.store';
import type { RuntimeV2BoundInput } from '../../types/runtime-v2-store.types';
import { deferredDefinitionHash } from '../../utilities/runtime-v2-deferred-tools.utility';
import { RuntimeV2ToolCatalogService } from '../runtime-v2-tool-catalog.service';

const full: ToolDefinitionDto = {
  schemaVersion: '2.0',
  name: 'workspace.database',
  version: '2.0.0',
  description: 'Query a configured database profile.',
  operations: ['query'],
  riskClasses: ['inspect'],
  targetIds: ['target:workspace'],
  inputSchema: { type: 'object', properties: { sql: { type: 'string' } } },
};
const stub: ToolDefinitionDto = {
  ...full,
  description: 'Query a database.',
  inputSchema: { type: 'object' },
  deferred: { definitionHash: deferredDefinitionHash(full) },
};

const binding: RuntimeV2BoundInput = {
  ownerId: 'user_1',
  threadId: 'thread_0001',
  messageId: 'msg_1',
  clientRequestId: 'request_0001',
  startIdempotencyKey: 'start_0001',
  runId: 'run_00000001',
  generation: 'generation_0001',
  epochs: { account: 0, workspace: 0, target: 0, policy: 0 },
  manifestHash: `sha256:${'a'.repeat(64)}`,
  toolCatalogHash: `sha256:${'b'.repeat(64)}`,
  toolDefinitions: [stub],
  provider: 'gemini',
  model: 'gemini-pro',
  ttlSeconds: 600,
};

/** A Redis double that keeps the loaded-tools hash the scripts operate on. */
function fakeRedis(): { redis: RedisService; hash: Map<string, string>; keys: string[] } {
  const hash = new Map<string, string>();
  const keys: string[] = [];
  const evalFailFast = vi.fn(
    (script: string, scriptKeys: readonly string[], args: readonly string[]) => {
      keys.push(...scriptKeys);
      if (script.includes('load-tools')) {
        for (let index = 0; index < args.length - 1; index += 2) {
          hash.set(String(args[index]), String(args[index + 1]));
        }
      }
      return Promise.resolve([...hash.entries()].flat());
    },
  );
  return { redis: { evalFailFast } as unknown as RedisService, hash, keys };
}

function service(threadOwner: string | null) {
  const doubles = fakeRedis();
  const store = new RuntimeV2ToolCatalogStore(doubles.redis);
  const threads = {
    findById: vi.fn(() => Promise.resolve(threadOwner === null ? null : { userId: threadOwner })),
  } as unknown as ChatThreadsRepository;
  const runs = {
    resolveBinding: vi.fn(() => Promise.resolve(binding)),
  } as unknown as RuntimeV2Store;
  return { ...doubles, store, catalog: new RuntimeV2ToolCatalogService(threads, runs, store) };
}

describe('RuntimeV2ToolCatalogService (F028)', () => {
  it('loads a committed deferred definition and records a new catalog version', async () => {
    const { catalog, hash, keys } = service('user_1');
    const ack = await catalog.load('user_1', 'thread_0001', 'run_00000001', {
      generation: 'generation_0001',
      definitions: [full],
    });
    expect(ack).toMatchObject({
      runId: 'run_00000001',
      catalogVersion: 2,
      loaded: [{ name: 'workspace.database', version: '2.0.0' }],
    });
    expect(ack.effectiveCatalogHash).toMatch(/^sha256:[a-f0-9]{64}$/u);
    expect(hash.get('workspace.database@2.0.0')).toBe(JSON.stringify(full));
    expect(keys[0]).toContain(':run:run_00000001:loaded-tools');
  });

  it('refuses another user and never touches Redis', async () => {
    const { catalog, hash } = service('user_2');
    await expect(
      catalog.load('user_1', 'thread_0001', 'run_00000001', {
        generation: 'generation_0001',
        definitions: [full],
      }),
    ).rejects.toThrow();
    expect(hash.size).toBe(0);
  });

  it('refuses a definition that was not committed and stores nothing', async () => {
    const { catalog, hash } = service('user_1');
    await expect(
      catalog.load('user_1', 'thread_0001', 'run_00000001', {
        generation: 'generation_0001',
        definitions: [{ ...full, operations: ['query', 'drop'] }],
      }),
    ).rejects.toMatchObject({ code: 'RUNTIME_DEFERRED_TOOL_MISMATCH' });
    expect(hash.size).toBe(0);
  });

  it('hands the next turn the loaded schema in place of the stub', async () => {
    const { catalog, store } = service('user_1');
    expect((await store.effectiveBinding(binding)).toolDefinitions).toEqual([stub]);
    await catalog.load('user_1', 'thread_0001', 'run_00000001', {
      generation: 'generation_0001',
      definitions: [full],
    });
    const effective = await store.effectiveBinding(binding);
    expect(effective.toolDefinitions).toEqual([full]);
    // The admitted hash is the binding's identity and must never move.
    expect(effective.toolCatalogHash).toBe(binding.toolCatalogHash);
  });

  it('skips Redis entirely for a run with nothing deferred', async () => {
    const { store, keys } = service('user_1');
    const eager = { ...binding, toolDefinitions: [full] };
    expect(await store.effectiveBinding(eager)).toBe(eager);
    expect(keys).toEqual([]);
  });
});
