import { Logger } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BusinessException } from '../../../../common/errors';
import { ZERO_RETENTION_REDACTED_CONTENT } from '../../constants/zero-retention.constants';
import { RuntimeV2RedisStateMachine } from '../../repositories/__tests__/runtime-v2-redis-state-machine.fake';
import { RuntimeV2Store } from '../../repositories/runtime-v2.store';
import { ZeroRetentionMarkerStore } from '../../repositories/zero-retention-marker.store';
import { ZeroRetentionRepository } from '../../repositories/zero-retention.repository';
import type {
  ZeroRetentionMessageRow,
  ZeroRetentionPrismaPort,
  ZeroRetentionRedisPort,
} from '../../types/zero-retention.types';
import type { RuntimeV2TerminalNotice } from '../../types/runtime-v2-terminal-listener.types';
import { ZeroRetentionService } from '../zero-retention.service';

interface Harness {
  readonly service: ZeroRetentionService;
  readonly markers: Map<string, string>;
  readonly findMany: ReturnType<typeof vi.fn<ZeroRetentionPrismaPort['chatMessage']['findMany']>>;
  readonly update: ReturnType<typeof vi.fn<ZeroRetentionPrismaPort['chatMessage']['update']>>;
  readonly redis: { failSet: boolean; failGet: boolean };
  readonly logs: string[];
}

function harness(rows: ZeroRetentionMessageRow[] = [{ id: 'msg-1', metadata: null }]): Harness {
  const markers = new Map<string, string>();
  const redisFaults = { failSet: false, failGet: false };
  const redis: ZeroRetentionRedisPort = {
    get: async (key) => {
      if (redisFaults.failGet) throw new Error('ECONNRESET user prompt text');
      return markers.get(key) ?? null;
    },
    set: async (key, value) => {
      if (redisFaults.failSet) throw new Error('ECONNRESET user prompt text');
      markers.set(key, value);
    },
  };
  const findMany = vi.fn<ZeroRetentionPrismaPort['chatMessage']['findMany']>(async () => rows);
  const update = vi.fn<ZeroRetentionPrismaPort['chatMessage']['update']>(async () => ({}));
  const service = new ZeroRetentionService(
    new ZeroRetentionMarkerStore(redis),
    new ZeroRetentionRepository({ chatMessage: { findMany, update } }),
    new RuntimeV2Store(new RuntimeV2RedisStateMachine()),
  );
  const logs: string[] = [];
  const capture = (message: unknown): void => {
    logs.push(String(message));
  };
  vi.spyOn(Logger.prototype, 'error').mockImplementation(capture);
  vi.spyOn(Logger.prototype, 'log').mockImplementation(capture);
  return { service, markers, findMany, update, redis: redisFaults, logs };
}

function notice(status: RuntimeV2TerminalNotice['status']): RuntimeV2TerminalNotice {
  return { ownerId: 'user-1', threadId: 'thread-1', runId: 'run-1', status };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ZeroRetentionService — chat turns', () => {
  it('marks a turn, then purges it on demand', async () => {
    const h = harness();

    await h.service.markChatTurn('thread-1', 'msg-1');
    await expect(h.service.isChatTurnMarked('msg-1')).resolves.toBe(true);
    await h.service.purgeChatTurn('thread-1', 'msg-1');

    expect(h.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'msg-1' },
        data: expect.objectContaining({ content: ZERO_RETENTION_REDACTED_CONTENT }),
      }),
    );
  });

  it('an unmarked turn is not zero-retention', async () => {
    const h = harness();

    await expect(h.service.isChatTurnMarked('msg-9')).resolves.toBe(false);
  });

  it('refuses a turn it cannot mark, and redacts its prompt at once', async () => {
    const h = harness();
    h.redis.failSet = true;

    await expect(h.service.markChatTurn('thread-1', 'msg-1')).rejects.toMatchObject({
      code: 'ZERO_RETENTION_UNAVAILABLE',
    });
    await expect(h.service.markChatTurn('thread-1', 'msg-1')).rejects.toBeInstanceOf(
      BusinessException,
    );
    expect(h.update).toHaveBeenCalled();
  });

  it('reads a failed lookup as "not marked" and logs no error text', async () => {
    const h = harness();
    h.redis.failGet = true;

    await expect(h.service.isChatTurnMarked('msg-1')).resolves.toBe(false);
    expect(h.logs.join('\n')).not.toContain('prompt text');
    expect(h.logs.join('\n')).toContain('Error');
  });

  it('never throws from a purge, and logs ids and counts only', async () => {
    const h = harness();
    h.findMany.mockRejectedValueOnce(new Error('value "secret prompt" violates'));

    await expect(h.service.purgeChatTurn('thread-1', 'msg-1')).resolves.toBeUndefined();
    await h.service.purgeChatTurn('thread-1', 'msg-1');
    const logged = h.logs.join('\n');
    expect(logged).not.toContain('secret prompt');
    expect(logged).toContain('redacted 1 message(s) of turn msg-1');
  });
});

describe('ZeroRetentionService — Runtime V2 runs', () => {
  it('refuses to start a run it cannot mark', async () => {
    const h = harness();
    h.redis.failSet = true;

    await expect(h.service.markRuntimeRun('run-1')).rejects.toMatchObject({
      code: 'ZERO_RETENTION_UNAVAILABLE',
    });
  });

  it.each(['completed', 'failed', 'cancelled'] as const)(
    'purges a marked run that ended as %s',
    async (status) => {
      const h = harness();
      await h.service.markRuntimeRun('run-1');

      await h.service.purgeRuntimeRun(notice(status));
      expect(h.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            threadId: 'thread-1',
            metadata: { path: ['runtimeV2', 'runId'], equals: 'run-1' },
          },
        }),
      );
      expect(h.update).toHaveBeenCalledTimes(1);
    },
  );

  it('keeps a paused run whole: it resumes from its transcript', async () => {
    const h = harness();
    await h.service.markRuntimeRun('run-1');

    await h.service.purgeRuntimeRun(notice('paused'));
    expect(h.findMany).not.toHaveBeenCalled();
  });

  it('leaves an unmarked run alone', async () => {
    const h = harness();

    await h.service.purgeRuntimeRun(notice('completed'));
    expect(h.findMany).not.toHaveBeenCalled();
  });

  it('keeps the run when the mark cannot be read, without throwing', async () => {
    const h = harness();
    await h.service.markRuntimeRun('run-1');
    h.redis.failGet = true;

    await expect(h.service.purgeRuntimeRun(notice('completed'))).resolves.toBeUndefined();
    expect(h.findMany).not.toHaveBeenCalled();
  });
});
