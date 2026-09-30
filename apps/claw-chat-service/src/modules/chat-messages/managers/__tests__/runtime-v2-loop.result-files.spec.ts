import { describe, expect, it, vi } from 'vitest';

import { RUNTIME_V2_RESULT_FILES_NOTE_PREFIX } from '../../constants/runtime-v2-result-files.constants';
import type { RuntimeResultDto } from '../../dto/runtime-v2.dto';
import type { RuntimeV2BoundInput } from '../../types/runtime-v2-store.types';
import { RuntimeV2LoopManager } from '../runtime-v2-loop.manager';

// F030: the continuation after a result that carried images asks the context
// gateway for them (alongside the prompt's own attachments), records them on
// the tool-result transcript row, and names them in the system prompt.

const binding: RuntimeV2BoundInput = {
  ownerId: 'owner-1',
  threadId: 'thread-1',
  messageId: 'origin-1',
  clientRequestId: 'client-1',
  startIdempotencyKey: 'start-1',
  runId: 'run-1',
  generation: 'generation-1',
  epochs: { account: 1, workspace: 1, target: 1, policy: 1 },
  manifestHash: `sha256:${'a'.repeat(64)}`,
  toolCatalogHash: `sha256:${'b'.repeat(64)}`,
  toolDefinitions: [],
  provider: 'OPENAI',
  model: 'gpt-4o',
  claimId: 'claim-1',
  ttlSeconds: 900,
};

function command(fileIds?: string[]): RuntimeResultDto {
  return {
    generation: 'generation-1',
    idempotencyKey: 'result-key-1',
    epochs: binding.epochs,
    result: {
      schemaVersion: '2.0',
      invocationId: 'invocation-1',
      status: 'succeeded',
      structured: { observed: true },
      ...(fileIds === undefined ? {} : { fileIds }),
      receipt: {
        schemaVersion: '2.0',
        receiptId: 'receipt-1',
        invocationId: 'invocation-1',
        argumentHash: `sha256:${'c'.repeat(64)}`,
        startedAt: '2026-09-30T10:00:00.000Z',
        completedAt: '2026-09-30T10:00:01.000Z',
        durationMs: 1_000,
        outputBytes: 10,
        truncated: false,
        redactionApplied: false,
      },
      continuation: { action: 'continue', nextTurnId: 'turn-2' },
    },
  };
}

function loop(): {
  manager: RuntimeV2LoopManager;
  build: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  callProvider: ReturnType<typeof vi.fn>;
} {
  const origin = {
    id: 'origin-1',
    role: 'USER',
    content: 'Check the page.',
    metadata: { fileIds: ['prompt-file'] },
  };
  const create = vi
    .fn()
    .mockImplementation(async (data: Record<string, unknown>) =>
      Promise.resolve({ ...data, id: 'row' }),
    );
  const messages = {
    create,
    findRecentByThreadId: vi.fn().mockResolvedValue([origin]),
    findById: vi.fn().mockResolvedValue(origin),
  };
  const build = vi
    .fn()
    .mockResolvedValue({ context: { systemPrompt: 'base', threadMessages: [] } });
  const callProvider = vi.fn().mockResolvedValue({
    content: '{"kind":"final","content":"The page renders."}',
    provider: 'OPENAI',
    model: 'gpt-4o',
    latencyMs: 1,
  });
  const store = {
    appendModelOutput: vi.fn().mockResolvedValue(undefined),
    terminalize: vi.fn().mockResolvedValue(undefined),
  };
  const manager = new RuntimeV2LoopManager(
    messages as never,
    { findById: vi.fn().mockResolvedValue({ userId: 'owner-1' }) } as never,
    store as never,
    { build } as never,
    { callProvider } as never,
  );
  return { manager, build, create, callProvider };
}

describe('RuntimeV2LoopManager continuation with result images', () => {
  it('asks for the prompt files and the result images, and names the images', async () => {
    const { manager, build, create, callProvider } = loop();

    await manager.continueAfterResult(binding, command(['shot-1']));

    expect(build).toHaveBeenCalledWith(
      expect.objectContaining({ fileIds: ['prompt-file', 'shot-1'] }),
    );
    const toolResultRow = create.mock.calls
      .map(([data]) => data as { role: string; metadata: { runtimeV2?: { kind?: string } } })
      .find((data) => data.metadata.runtimeV2?.kind === 'tool-result');
    expect(toolResultRow?.metadata.runtimeV2).toMatchObject({ fileIds: ['shot-1'] });
    const context = callProvider.mock.calls[0]?.[2] as { systemPrompt: string };
    expect(context.systemPrompt).toContain(`${RUNTIME_V2_RESULT_FILES_NOTE_PREFIX} shot-1.`);
  });

  it('changes nothing for a result without images', async () => {
    const { manager, build, callProvider } = loop();

    await manager.continueAfterResult(binding, command());

    const request = build.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(request).not.toHaveProperty('fileIds');
    const context = callProvider.mock.calls[0]?.[2] as { systemPrompt: string };
    expect(context.systemPrompt).not.toContain(RUNTIME_V2_RESULT_FILES_NOTE_PREFIX);
  });
});
