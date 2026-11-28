import { describe, expect, it, vi } from 'vitest';

import {
  RESEARCH_SOURCE_RETENTION_MS,
  THREAD_MEMORY_MAX_SOURCES,
  THREAD_MEMORY_WINDOW_MS,
} from '../../../../common/constants/research-engine.constants';
import { ResearchWorkflowKind } from '../../../../common/enums/research-workflow-kind.enum';
import { ResearchSourceRepository } from '../../repositories/research-source.repository';
import { ResearchEvidenceStoreService } from '../research-evidence-store.service';
import { ResearchSourceRetentionService } from '../research-source-retention.service';
import type { PersistSourcesInput } from '../../types/research-engine.types';

const NOW = new Date('2026-11-28T12:00:00.000Z');

const input = (items: PersistSourcesInput['items']): PersistSourcesInput => ({
  runId: 'run-1',
  userId: 'u1',
  threadId: 't1',
  round: 1,
  workflow: ResearchWorkflowKind.SEARCH_THEN_FETCH,
  items,
  directKeys: new Set(),
  now: NOW,
});

const anItem = {
  id: 'i',
  title: 'T',
  url: 'https://a.example/p',
  snippet: 'body',
  source: 'fetch' as const,
  providerKind: null,
  publishedAt: null,
  fetchedAt: null,
  confidence: 0.7,
};

describe('ResearchEvidenceStoreService', () => {
  it('writes one row per item', async () => {
    const createMany = vi.fn().mockResolvedValue(2);
    const store = new ResearchEvidenceStoreService({ createMany } as never);

    await expect(
      store.persist(input([anItem, { ...anItem, url: 'https://b.example/q' }])),
    ).resolves.toBe(2);
    expect(createMany).toHaveBeenCalledWith([
      expect.objectContaining({ runId: 'run-1', canonicalKey: 'a.example/p', threadId: 't1' }),
      expect.objectContaining({ canonicalKey: 'b.example/q' }),
    ]);
  });

  it('writes nothing for an empty bundle', async () => {
    const createMany = vi.fn();
    const store = new ResearchEvidenceStoreService({ createMany } as never);

    await expect(store.persist(input([]))).resolves.toBe(0);
    expect(createMany).not.toHaveBeenCalled();
  });

  it('a failed write is logged and resolves 0, never rejects', async () => {
    const store = new ResearchEvidenceStoreService({
      createMany: vi.fn().mockRejectedValue(new Error('db down')),
    } as never);
    const warn = vi.spyOn((store as unknown as { logger: { warn: () => void } }).logger, 'warn');

    await expect(store.persist(input([anItem]))).resolves.toBe(0);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('research.sources.persist_failed'));
  });

  it('persistInBackground returns at once and swallows a failure', async () => {
    const createMany = vi.fn().mockRejectedValue(new Error('db down'));
    const store = new ResearchEvidenceStoreService({ createMany } as never);

    expect(store.persistInBackground(input([anItem]))).toBeUndefined();
    await vi.waitFor(() => expect(createMany).toHaveBeenCalledTimes(1));
  });

  it('loads this user + thread for the last 24 h, cap 50', async () => {
    const findRecentByThread = vi.fn().mockResolvedValue([{ id: 's1' }]);
    const store = new ResearchEvidenceStoreService({ findRecentByThread } as never);

    await expect(store.loadThreadSources('u1', 't1', NOW)).resolves.toEqual([{ id: 's1' }]);
    expect(findRecentByThread).toHaveBeenCalledWith(
      'u1',
      't1',
      new Date(NOW.getTime() - THREAD_MEMORY_WINDOW_MS),
      THREAD_MEMORY_MAX_SOURCES,
    );
  });

  it('a failed load is an empty memory', async () => {
    const store = new ResearchEvidenceStoreService({
      findRecentByThread: vi.fn().mockRejectedValue(new Error('db down')),
    } as never);

    await expect(store.loadThreadSources('u1', 't1', NOW)).resolves.toEqual([]);
  });
});

describe('ResearchSourceRepository', () => {
  it('scopes thread reads by user AND thread, newest first', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const repo = new ResearchSourceRepository({ researchSource: { findMany } } as never);
    const since = new Date(0);

    await repo.findRecentByThread('u1', 't1', since, 50);

    expect(findMany).toHaveBeenCalledWith({
      where: { userId: 'u1', threadId: 't1', createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  });

  it('creates many and deletes by age, returning counts', async () => {
    const createMany = vi.fn().mockResolvedValue({ count: 3 });
    const deleteMany = vi.fn().mockResolvedValue({ count: 4 });
    const repo = new ResearchSourceRepository({
      researchSource: { createMany, deleteMany },
    } as never);
    const cutoff = new Date(1);

    await expect(repo.createMany([])).resolves.toBe(3);
    await expect(repo.deleteOlderThan(cutoff)).resolves.toBe(4);
    expect(deleteMany).toHaveBeenCalledWith({ where: { createdAt: { lt: cutoff } } });
  });
});

describe('ResearchSourceRetentionService', () => {
  it('sweep deletes rows older than 30 days and logs the count', async () => {
    const deleteOlderThan = vi.fn().mockResolvedValue(5);
    const service = new ResearchSourceRetentionService({ deleteOlderThan } as never);
    const log = vi.spyOn((service as unknown as { logger: { log: () => void } }).logger, 'log');

    await expect(service.sweep(NOW)).resolves.toBe(5);
    expect(deleteOlderThan).toHaveBeenCalledWith(
      new Date(NOW.getTime() - RESEARCH_SOURCE_RETENTION_MS),
    );
    expect(RESEARCH_SOURCE_RETENTION_MS).toBe(30 * 24 * 60 * 60 * 1000);
    expect(log).toHaveBeenCalledWith('research.sources.swept deleted=5 retentionDays=30');
  });

  it('starts an unref-ed hourly timer on init, sweeps at boot, and clears it on destroy', async () => {
    vi.useFakeTimers();
    try {
      const deleteOlderThan = vi.fn().mockResolvedValue(0);
      const service = new ResearchSourceRetentionService({ deleteOlderThan } as never);

      service.onModuleInit();
      await vi.advanceTimersByTimeAsync(0);
      expect(deleteOlderThan).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
      expect(deleteOlderThan).toHaveBeenCalledTimes(2);

      service.onModuleDestroy();
      await vi.advanceTimersByTimeAsync(2 * 60 * 60 * 1000);
      expect(deleteOlderThan).toHaveBeenCalledTimes(2);
      service.onModuleDestroy();
    } finally {
      vi.useRealTimers();
    }
  });

  it('a failed sweep is logged, never thrown out of the timer', async () => {
    vi.useFakeTimers();
    try {
      const service = new ResearchSourceRetentionService({
        deleteOlderThan: vi.fn().mockRejectedValue(new Error('db down')),
      } as never);
      const warn = vi.spyOn(
        (service as unknown as { logger: { warn: () => void } }).logger,
        'warn',
      );

      service.onModuleInit();
      await vi.advanceTimersByTimeAsync(0);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('research.sources.sweep_failed'));
      service.onModuleDestroy();
    } finally {
      vi.useRealTimers();
    }
  });
});
