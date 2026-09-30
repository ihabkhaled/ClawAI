import { HttpStatus } from '@nestjs/common';
import { vi } from 'vitest';

import { BusinessException, EntityNotFoundException } from '../../../../common/errors';
import { MessageRole } from '../../../../generated/prisma';
import { RUNTIME_V2_ACTIVITY_READ_CURSOR } from '../../constants/runtime-v2-thread-activity.constants';
import { RuntimeV2ThreadActivityService } from '../runtime-v2-thread-activity.service';

const OWNER = 'owner-1';
const THREAD = 'thread-1';
const RUN = 'run:0123456789abcdef';
const GENERATION = 'gen:0123456789abcdef';
const STARTED = new Date('2026-09-30T10:00:00.000Z');

function runtimePrompt(): object {
  return {
    id: 'msg_1',
    createdAt: STARTED,
    metadata: {
      runtimeV2: {
        runId: RUN,
        generation: GENERATION,
        clientRequestId: 'client-request-1',
        publicationState: 'confirmed',
      },
    },
  };
}

function harness(options: {
  thread?: object | null;
  prompt?: object | null;
  terminal?: boolean;
  resolveError?: Error;
}) {
  const findById = vi
    .fn()
    .mockResolvedValue(
      options.thread === undefined ? { id: THREAD, userId: OWNER } : options.thread,
    );
  const findLatestByThreadIdAndRole = vi
    .fn()
    .mockResolvedValue(options.prompt === undefined ? runtimePrompt() : options.prompt);
  const binding = { ownerId: OWNER, threadId: THREAD, runId: RUN, generation: GENERATION };
  const resolveBinding =
    options.resolveError === undefined
      ? vi.fn().mockResolvedValue(binding)
      : vi.fn().mockRejectedValue(options.resolveError);
  const readEvents = vi
    .fn()
    .mockResolvedValue({ runId: RUN, terminal: options.terminal ?? false, events: [] });
  const service = new RuntimeV2ThreadActivityService(
    { findById } as never,
    { findLatestByThreadIdAndRole } as never,
    { resolveBinding, readEvents } as never,
  );
  return { service, findLatestByThreadIdAndRole, resolveBinding, readEvents };
}

describe('RuntimeV2ThreadActivityService', () => {
  it('reports a live run with its id and start time, and nothing else', async () => {
    const { service, findLatestByThreadIdAndRole, resolveBinding, readEvents } = harness({});

    await expect(service.getActiveRun(OWNER, THREAD)).resolves.toEqual({
      active: true,
      runId: RUN,
      startedAt: STARTED.toISOString(),
    });
    expect(findLatestByThreadIdAndRole).toHaveBeenCalledWith(THREAD, MessageRole.USER);
    expect(resolveBinding).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerId: OWNER,
        threadId: THREAD,
        runId: RUN,
        generation: GENERATION,
      }),
    );
    // Read past the end: the terminal flag, no events, no content.
    expect(readEvents).toHaveBeenCalledWith(
      expect.objectContaining({ after: RUNTIME_V2_ACTIVITY_READ_CURSOR }),
    );
  });

  it('reports a finished run as inactive', async () => {
    const { service } = harness({ terminal: true });

    await expect(service.getActiveRun(OWNER, THREAD)).resolves.toEqual({ active: false });
  });

  it('reports an expired run as inactive rather than failing', async () => {
    const { service } = harness({
      resolveError: new BusinessException(
        'Runtime run was not found',
        'RUNTIME_RUN_NOT_FOUND',
        HttpStatus.NOT_FOUND,
      ),
    });

    await expect(service.getActiveRun(OWNER, THREAD)).resolves.toEqual({ active: false });
  });

  it('does not hide a store outage as "not running"', async () => {
    const outage = new BusinessException(
      'Runtime state is unavailable',
      'RUNTIME_STATE_UNAVAILABLE',
      HttpStatus.SERVICE_UNAVAILABLE,
    );
    const { service } = harness({ resolveError: outage });

    await expect(service.getActiveRun(OWNER, THREAD)).rejects.toBe(outage);
  });

  it('is inactive when the newest turn was ordinary chat, without touching the store', async () => {
    const { service, resolveBinding } = harness({
      prompt: { id: 'm', createdAt: STARTED, metadata: null },
    });

    await expect(service.getActiveRun(OWNER, THREAD)).resolves.toEqual({ active: false });
    expect(resolveBinding).not.toHaveBeenCalled();
  });

  it('is inactive on a thread with no prompt yet', async () => {
    const { service } = harness({ prompt: null });

    await expect(service.getActiveRun(OWNER, THREAD)).resolves.toEqual({ active: false });
  });

  it("answers another owner's thread as not found, before reading anything", async () => {
    const { service, findLatestByThreadIdAndRole } = harness({
      thread: { id: THREAD, userId: 'someone-else' },
    });

    await expect(service.getActiveRun(OWNER, THREAD)).rejects.toBeInstanceOf(
      EntityNotFoundException,
    );
    expect(findLatestByThreadIdAndRole).not.toHaveBeenCalled();
  });

  it('answers a missing thread the same way', async () => {
    const { service } = harness({ thread: null });

    await expect(service.getActiveRun(OWNER, THREAD)).rejects.toBeInstanceOf(
      EntityNotFoundException,
    );
  });
});
