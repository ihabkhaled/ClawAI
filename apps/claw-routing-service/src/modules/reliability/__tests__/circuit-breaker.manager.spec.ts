import { Test, type TestingModule } from '@nestjs/testing';
import { CircuitBreakerState } from '../../../common/enums';
import { CB_OPEN_DURATION_MS } from '../constants/reliability.constants';
import { CircuitBreakerManager } from '../managers/circuit-breaker.manager';
import { CircuitBreakerRepository } from '../repositories/circuit-breaker.repository';
import { type CircuitBreakerRecord } from '../types/reliability.types';

function makeRecord(overrides: Partial<CircuitBreakerRecord> = {}): CircuitBreakerRecord {
  return {
    id: 'r1',
    scope: 'ANTHROPIC',
    state: CircuitBreakerState.CLOSED,
    failureCount: 0,
    openedAt: null,
    lastTransitionAt: new Date('2026-05-11T00:00:00Z'),
    createdAt: new Date('2026-05-01T00:00:00Z'),
    updatedAt: new Date('2026-05-11T00:00:00Z'),
    ...overrides,
  };
}

describe('CircuitBreakerManager', () => {
  let manager: CircuitBreakerManager;
  let repo: jest.Mocked<CircuitBreakerRepository>;

  beforeEach(async () => {
    repo = {
      findByScope: jest.fn(),
      listAll: jest.fn(),
      upsert: jest.fn(),
    } as unknown as jest.Mocked<CircuitBreakerRepository>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [CircuitBreakerManager, { provide: CircuitBreakerRepository, useValue: repo }],
    }).compile();

    manager = module.get<CircuitBreakerManager>(CircuitBreakerManager);
  });

  describe('getState', () => {
    it('returns CLOSED + available when no record exists', async () => {
      repo.findByScope.mockResolvedValue(null);
      const snap = await manager.getState('ANTHROPIC');
      expect(snap.state).toBe(CircuitBreakerState.CLOSED);
      expect(snap.isAvailable).toBe(true);
    });

    it('returns isAvailable=false when OPEN', async () => {
      repo.findByScope.mockResolvedValue(
        makeRecord({ state: CircuitBreakerState.OPEN, failureCount: 3, openedAt: new Date() }),
      );
      const snap = await manager.getState('ANTHROPIC');
      expect(snap.state).toBe(CircuitBreakerState.OPEN);
      expect(snap.isAvailable).toBe(false);
    });

    it('auto-flips OPEN to HALF_OPEN after CB_OPEN_DURATION_MS', async () => {
      const openedAt = new Date('2026-05-11T00:00:00Z');
      repo.findByScope.mockResolvedValue(
        makeRecord({ state: CircuitBreakerState.OPEN, failureCount: 3, openedAt }),
      );
      const later = new Date(openedAt.getTime() + CB_OPEN_DURATION_MS + 1000);
      const snap = await manager.getState('ANTHROPIC', later);
      expect(snap.state).toBe(CircuitBreakerState.HALF_OPEN);
    });
  });

  describe('recordFailure', () => {
    it('first failure creates CLOSED record with count=1', async () => {
      repo.findByScope.mockResolvedValue(null);
      repo.upsert.mockResolvedValue(makeRecord({ failureCount: 1 }));
      const snap = await manager.recordFailure('ANTHROPIC');
      expect(repo.upsert).toHaveBeenCalledWith('ANTHROPIC', CircuitBreakerState.CLOSED, 1, null);
      expect(snap.state).toBe(CircuitBreakerState.CLOSED);
    });

    it('opens after 3 consecutive failures within window', async () => {
      const now = new Date('2026-05-11T00:00:30Z');
      repo.findByScope.mockResolvedValue(
        makeRecord({ failureCount: 2, lastTransitionAt: new Date('2026-05-11T00:00:00Z') }),
      );
      repo.upsert.mockResolvedValue(
        makeRecord({ state: CircuitBreakerState.OPEN, failureCount: 3, openedAt: now }),
      );
      const snap = await manager.recordFailure('ANTHROPIC', now);
      expect(snap.state).toBe(CircuitBreakerState.OPEN);
      expect(repo.upsert).toHaveBeenCalledWith('ANTHROPIC', CircuitBreakerState.OPEN, 3, now);
    });

    it('failure during HALF_OPEN re-opens', async () => {
      const openedAt = new Date('2026-05-11T00:00:00Z');
      const now = new Date(openedAt.getTime() + CB_OPEN_DURATION_MS + 1000);
      repo.findByScope.mockResolvedValue(
        makeRecord({ state: CircuitBreakerState.OPEN, failureCount: 3, openedAt }),
      );
      repo.upsert.mockResolvedValue(
        makeRecord({ state: CircuitBreakerState.OPEN, failureCount: 3, openedAt: now }),
      );
      const snap = await manager.recordFailure('ANTHROPIC', now);
      expect(snap.state).toBe(CircuitBreakerState.OPEN);
    });

    it('resets count when failures fall outside window', async () => {
      const now = new Date('2026-05-11T00:05:00Z');
      repo.findByScope.mockResolvedValue(
        makeRecord({ failureCount: 2, lastTransitionAt: new Date('2026-05-11T00:00:00Z') }),
      );
      repo.upsert.mockResolvedValue(makeRecord({ failureCount: 1 }));
      await manager.recordFailure('ANTHROPIC', now);
      expect(repo.upsert).toHaveBeenCalledWith('ANTHROPIC', CircuitBreakerState.CLOSED, 1, null);
    });
  });

  describe('recordSuccess', () => {
    it('resets failure count to 0', async () => {
      repo.findByScope.mockResolvedValue(makeRecord({ failureCount: 2 }));
      repo.upsert.mockResolvedValue(makeRecord({ failureCount: 0 }));
      const snap = await manager.recordSuccess('ANTHROPIC');
      expect(snap.failureCount).toBe(0);
      expect(repo.upsert).toHaveBeenCalledWith('ANTHROPIC', CircuitBreakerState.CLOSED, 0, null);
    });

    it('no-ops when no record exists', async () => {
      repo.findByScope.mockResolvedValue(null);
      const snap = await manager.recordSuccess('UNKNOWN');
      expect(snap.state).toBe(CircuitBreakerState.CLOSED);
      expect(repo.upsert).not.toHaveBeenCalled();
    });
  });

  describe('manualReset', () => {
    it('forces CLOSED + count=0', async () => {
      repo.upsert.mockResolvedValue(makeRecord({ failureCount: 0 }));
      await manager.manualReset('ANTHROPIC');
      expect(repo.upsert).toHaveBeenCalledWith('ANTHROPIC', CircuitBreakerState.CLOSED, 0, null);
    });
  });

  describe('listAll', () => {
    it('returns snapshots with auto-flipped HALF_OPEN', async () => {
      const openedAt = new Date(Date.now() - CB_OPEN_DURATION_MS - 10_000);
      repo.listAll.mockResolvedValue([
        makeRecord({ scope: 'A', state: CircuitBreakerState.OPEN, openedAt }),
        makeRecord({ scope: 'B' }),
      ]);
      const snaps = await manager.listAll();
      expect(snaps[0]!.state).toBe(CircuitBreakerState.HALF_OPEN);
      expect(snaps[1]!.state).toBe(CircuitBreakerState.CLOSED);
    });
  });
});
