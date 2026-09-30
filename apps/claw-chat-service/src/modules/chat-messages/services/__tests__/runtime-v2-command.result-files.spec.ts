import { describe, expect, it, vi } from 'vitest';

import {
  RUNTIME_V2_RESULT_FILE_NOT_IMAGE_CODE,
  RUNTIME_V2_RESULT_FILE_UNAVAILABLE_CODE,
} from '../../constants/runtime-v2-result-files.constants';
import type { RuntimeResultDto } from '../../dto/runtime-v2.dto';
import { RuntimeV2CommandService } from '../runtime-v2-command.service';

// F030: a tool result may only name images the same account uploaded.

const OWNER = 'owner-1';

function command(fileIds?: string[]): RuntimeResultDto {
  return {
    generation: 'generation_1',
    idempotencyKey: 'result_key_1',
    epochs: { account: 1, workspace: 1, target: 1, policy: 1 },
    result: {
      schemaVersion: '2.0',
      invocationId: 'invocation_1',
      status: 'succeeded',
      structured: { observed: true },
      ...(fileIds === undefined ? {} : { fileIds }),
      receipt: {
        schemaVersion: '2.0',
        receiptId: 'receipt_1',
        invocationId: 'invocation_1',
        argumentHash: `sha256:${'a'.repeat(64)}`,
        startedAt: '2026-09-30T10:00:00.000Z',
        completedAt: '2026-09-30T10:00:01.000Z',
        durationMs: 1_000,
        outputBytes: 10,
        truncated: false,
        redactionApplied: false,
      },
      continuation: { action: 'final' },
    },
  };
}

function service(mimeByFile: Record<string, string>): {
  commands: RuntimeV2CommandService;
  submitResult: ReturnType<typeof vi.fn>;
  mimeTypes: ReturnType<typeof vi.fn>;
} {
  const submitResult = vi.fn().mockResolvedValue({ replayed: true, sequence: 1 });
  const store = {
    resolveBinding: vi.fn().mockResolvedValue({ ownerId: OWNER, threadId: 'thread-1' }),
    submitResult,
    terminalize: vi.fn(),
  };
  // file-service answers per owner; an unknown or foreign id yields nothing.
  const mimeTypes = vi.fn(async (ids: readonly string[], userId: string) => {
    const mime = userId === OWNER ? mimeByFile[ids[0] ?? ''] : undefined;
    return Promise.resolve(mime === undefined ? [] : [mime]);
  });
  const commands = new RuntimeV2CommandService(
    { findById: vi.fn().mockResolvedValue({ userId: OWNER }) } as never,
    store as never,
    { continueAfterResult: vi.fn() } as never,
    { effectiveBinding: vi.fn() } as never,
    { mimeTypes } as never,
  );
  return { commands, submitResult, mimeTypes };
}

describe('RuntimeV2CommandService result file ownership', () => {
  it('does not look anything up for a result without files', async () => {
    const { commands, submitResult, mimeTypes } = service({});

    await commands.submitResult(OWNER, 'thread-1', 'run-1', command());

    expect(mimeTypes).not.toHaveBeenCalled();
    expect(submitResult).toHaveBeenCalledTimes(1);
  });

  it('accepts images the owner uploaded, checked as that owner', async () => {
    const { commands, submitResult, mimeTypes } = service({ 'shot-1': 'image/png' });

    await commands.submitResult(OWNER, 'thread-1', 'run-1', command(['shot-1']));

    expect(mimeTypes).toHaveBeenCalledWith(['shot-1'], OWNER);
    expect(submitResult).toHaveBeenCalledTimes(1);
  });

  it('refuses a file the owner does not have, before recording the result', async () => {
    const { commands, submitResult } = service({ 'shot-1': 'image/png' });

    await expect(
      commands.submitResult(OWNER, 'thread-1', 'run-1', command(['shot-1', 'someone-elses'])),
    ).rejects.toMatchObject({ code: RUNTIME_V2_RESULT_FILE_UNAVAILABLE_CODE });
    expect(submitResult).not.toHaveBeenCalled();
  });

  it('refuses a file that is not an image', async () => {
    const { commands, submitResult } = service({ 'doc-1': 'application/pdf' });

    await expect(
      commands.submitResult(OWNER, 'thread-1', 'run-1', command(['doc-1'])),
    ).rejects.toMatchObject({ code: RUNTIME_V2_RESULT_FILE_NOT_IMAGE_CODE });
    expect(submitResult).not.toHaveBeenCalled();
  });
});
