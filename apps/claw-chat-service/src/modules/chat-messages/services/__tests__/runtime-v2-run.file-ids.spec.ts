import { describe, expect, it, vi } from 'vitest';

import type { RuntimeStartDto } from '../../dto/runtime-v2.dto';
import { runtimeV2Sha256 } from '../../utilities/runtime-v2-identity.utility';
import { RuntimeV2RunService } from '../runtime-v2-run.service';

/**
 * Image delivery regression: markPublished used to REPLACE the message
 * metadata with `{ runtimeV2 }`, wiping the `fileIds` stored at create time, so
 * the context assembler found no attachment and every model answered "I cannot
 * see an image". The stored metadata after publish must still carry them.
 */
const ownerId = 'runtime_owner_000001';
const toolDefinitions = [
  {
    schemaVersion: '2.0' as const,
    name: 'workspace.read',
    version: '1.0.0',
    description: 'Read a bounded fixture.',
    operations: ['read'],
    riskClasses: ['inspect' as const],
    targetIds: ['runtime_target_00001'],
    inputSchema: { type: 'object', additionalProperties: false },
  },
];
const request = (fileIds?: string[]): RuntimeStartDto => ({
  schemaVersion: '2.0',
  threadId: 'runtime_thread_00001',
  clientRequestId: 'runtime_request_00001',
  idempotencyKey: 'runtime_idempotency_1',
  prompt: 'What is in this image?',
  ...(fileIds === undefined ? {} : { fileIds }),
  manifestHash: `sha256:${'a'.repeat(64)}`,
  toolCatalogHash: runtimeV2Sha256(JSON.stringify(toolDefinitions)),
  toolDefinitions,
  provider: 'OLLAMA',
  model: 'qwen3:1.7b',
  epochs: { account: 1, workspace: 2, target: 3, policy: 4 },
  budget: {
    maxModelTurns: 4,
    maxToolCalls: 4,
    maxToolRounds: 2,
    maxRepairAttempts: 1,
    maxRuntimeMs: 60_000,
    maxOutputBytes: 65_536,
    maxToolResultBytes: 32_768,
  },
});

const ack = (replayed: boolean) => ({
  runId: 'runtime_run_000001',
  generation: 'runtime_generation_1',
  messageId: 'msg_1',
  sequence: 0,
  replayed,
});

function build(replayed: boolean, existingMetadata: unknown = null) {
  const store: Record<string, unknown> = {};
  const messages = {
    create: vi.fn(async (data: { metadata: Record<string, unknown> }) => {
      store['metadata'] = data.metadata;
    }),
    findById: vi.fn(async () =>
      existingMetadata === null ? null : { id: 'msg_1', metadata: existingMetadata },
    ),
    updateMetadata: vi.fn(async (_id: string, metadata: Record<string, unknown>) => {
      store['metadata'] = metadata;
    }),
    deleteById: vi.fn(),
  };
  const service = new RuntimeV2RunService(
    { findById: vi.fn(async () => ({ id: 't', userId: ownerId })) } as never,
    messages as never,
    { reserveStart: vi.fn(), releaseStart: vi.fn() } as never,
    { start: vi.fn(async () => ack(replayed)), cancel: vi.fn() } as never,
    { publishConfirmed: vi.fn(() => Promise.resolve()) } as never,
  );
  return { service, store, messages };
}

describe('RuntimeV2RunService publish keeps attachments', () => {
  it('stores fileIds that survive the publication mark', async () => {
    const { service, store } = build(false);
    await service.start(ownerId, request(['file_image_1', 'file_image_2']));
    expect(store['metadata']).toMatchObject({
      fileIds: ['file_image_1', 'file_image_2'],
      runtimeV2: { publicationState: 'confirmed' },
    });
  });

  it('adds no fileIds key when the run has none', async () => {
    const { service, store } = build(false);
    await service.start(ownerId, request());
    expect(store['metadata']).not.toHaveProperty('fileIds');
    expect(store['metadata']).toMatchObject({ runtimeV2: { publicationState: 'confirmed' } });
  });

  it('keeps stored metadata when a replay finishes a pending publish', async () => {
    const pending = {
      fileIds: ['file_image_1'],
      runtimeV2: {
        runId: 'runtime_run_000001',
        generation: 'runtime_generation_1',
        clientRequestId: 'runtime_request_00001',
        publicationState: 'pending',
      },
    };
    const { service, store } = build(true, pending);
    await service.start(ownerId, request(['file_image_1']));
    expect(store['metadata']).toMatchObject({
      fileIds: ['file_image_1'],
      runtimeV2: { publicationState: 'confirmed' },
    });
  });
});
