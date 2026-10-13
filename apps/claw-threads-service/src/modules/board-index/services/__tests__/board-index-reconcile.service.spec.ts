import { describe, expect, it, vi } from 'vitest';

import type {
  BoardChangedPublication,
  BoardIndexStore,
  BoardIndexSyncer,
} from '../../types/board-index.types';
import { BoardIndexReconcileService } from '../board-index-reconcile.service';

function build(options: {
  changed?: BoardChangedPublication[][];
  stale?: string[];
  invisible?: string[];
  visible?: Set<string>;
}) {
  const changedPages = [...(options.changed ?? [])];
  const repository = {
    loadVisibleSource: vi.fn<BoardIndexStore['loadVisibleSource']>().mockResolvedValue(null),
    upsertDoc: vi.fn<BoardIndexStore['upsertDoc']>().mockResolvedValue(),
    deleteDoc: vi.fn<BoardIndexStore['deleteDoc']>().mockResolvedValue(true),
    findChangedSince: vi
      .fn<BoardIndexStore['findChangedSince']>()
      .mockImplementation(() => Promise.resolve(changedPages.shift() ?? [])),
    findStaleDocIds: vi
      .fn<BoardIndexStore['findStaleDocIds']>()
      .mockResolvedValue(options.stale ?? []),
    findInvisibleDocIds: vi
      .fn<BoardIndexStore['findInvisibleDocIds']>()
      .mockResolvedValue(options.invisible ?? []),
  } satisfies BoardIndexStore;
  const index = {
    syncPublication: vi
      .fn<BoardIndexSyncer['syncPublication']>()
      .mockImplementation((id) => Promise.resolve(options.visible?.has(id) ?? true)),
    removePublication: vi.fn<BoardIndexSyncer['removePublication']>().mockResolvedValue(),
  } satisfies BoardIndexSyncer;
  const service = new BoardIndexReconcileService(repository, index);
  return { service, repository, index };
}

describe('BoardIndexReconcileService', () => {
  it('upserts changed, refreshes stale and removes invisible rows', async () => {
    const at = new Date('2026-10-01T00:00:00Z');
    const { service, index } = build({
      changed: [[{ id: 'a', updatedAt: at }]],
      stale: ['b', 'gone'],
      invisible: ['c'],
      visible: new Set(['a', 'b']),
    });
    await expect(service.runOnce()).resolves.toEqual({ upserted: 2, removed: 2 });
    expect(index.removePublication).toHaveBeenCalledWith('c');
  });

  it('advances the cursor so the next pass starts after the last publication', async () => {
    const at = new Date('2026-10-01T00:00:00Z');
    const { service, repository } = build({ changed: [[{ id: 'a', updatedAt: at }]] });
    await service.runOnce();
    await service.runOnce();
    expect(repository.findChangedSince).toHaveBeenLastCalledWith({ updatedAt: at, id: 'a' }, 100);
  });

  it('never throws when the repository fails and can run again', async () => {
    const { service, repository } = build({});
    repository.findChangedSince.mockRejectedValueOnce(new Error('db down'));
    await expect(service.runOnce()).resolves.toEqual({ upserted: 0, removed: 0 });
    await expect(service.runOnce()).resolves.toEqual({ upserted: 0, removed: 0 });
    expect(repository.findChangedSince).toHaveBeenCalledTimes(2);
  });

  it('does not overlap itself', async () => {
    const { service, repository } = build({});
    let release: () => void = () => {};
    repository.findChangedSince.mockImplementationOnce(
      () =>
        new Promise<BoardChangedPublication[]>((resolve) => {
          release = () => resolve([]);
        }),
    );
    const first = service.runOnce();
    await expect(service.runOnce()).resolves.toEqual({ upserted: 0, removed: 0 });
    release();
    await first;
    expect(repository.findChangedSince).toHaveBeenCalledTimes(1);
  });

  it('backfill loops until no new publication is found', async () => {
    const t = (n: number) => new Date(2026, 9, n);
    const { service, repository } = build({
      changed: [[{ id: 'a', updatedAt: t(1) }], [{ id: 'b', updatedAt: t(2) }], []],
    });
    await expect(service.backfill()).resolves.toEqual({ upserted: 2, removed: 0 });
    expect(repository.findChangedSince).toHaveBeenCalledTimes(3);
  });

  it('starts and stops its timer with the module', () => {
    vi.useFakeTimers();
    const { service, repository } = build({});
    service.onModuleInit();
    vi.advanceTimersByTime(60_000);
    expect(repository.findChangedSince).toHaveBeenCalledTimes(1);
    service.onModuleDestroy();
    vi.advanceTimersByTime(120_000);
    expect(repository.findChangedSince).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
