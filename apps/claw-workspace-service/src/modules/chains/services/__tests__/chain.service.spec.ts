import { ConflictException, NotFoundException } from '@nestjs/common';

import { ChainService } from '../chain.service';

const sampleDsl = {
  steps: [{ id: 's1', connectorId: 'c1', actionType: 'CREATE_TICKET', payload: {} }],
};

const makeChain = (overrides: Record<string, unknown> = {}): unknown => ({
  id: overrides['id'] ?? 'chain-1',
  userId: overrides['userId'] ?? 'u1',
  name: overrides['name'] ?? 'Triage flow',
  description: null,
  dsl: overrides['dsl'] ?? sampleDsl,
  isEnabled: overrides['isEnabled'] ?? true,
  version: overrides['version'] ?? 1,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const makeRepo = (overrides: Record<string, jest.Mock> = {}): Record<string, jest.Mock> => ({
  listForUser: jest.fn(),
  findById: jest.fn(),
  findByName: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  deleteById: jest.fn(),
  ...overrides,
});

describe('ChainService', () => {
  describe('getOwn', () => {
    it('returns the chain when owned', async () => {
      const chain = makeChain();
      const repo = makeRepo({ findById: jest.fn().mockResolvedValue(chain) });
      const service = new ChainService(repo as never);
      expect(await service.getOwn('u1', 'chain-1')).toEqual(chain);
    });

    it('404s when the chain belongs to another user', async () => {
      const repo = makeRepo({
        findById: jest.fn().mockResolvedValue(makeChain({ userId: 'bob' })),
      });
      const service = new ChainService(repo as never);
      await expect(service.getOwn('alice', 'chain-1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('404s when the chain does not exist', async () => {
      const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
      const service = new ChainService(repo as never);
      await expect(service.getOwn('u1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('create', () => {
    it('creates a chain when the name is unique', async () => {
      const created = makeChain();
      const repo = makeRepo({
        findByName: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(created),
      });
      const service = new ChainService(repo as never);
      const result = await service.create('u1', { name: 'Triage flow', dsl: sampleDsl });
      expect(result).toEqual(created);
      expect(repo['create']).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'u1', version: 1, isEnabled: true }),
      );
    });

    it('409s when the name is already taken', async () => {
      const repo = makeRepo({ findByName: jest.fn().mockResolvedValue(makeChain()) });
      const service = new ChainService(repo as never);
      await expect(
        service.create('u1', { name: 'Triage flow', dsl: sampleDsl }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(repo['create']).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('bumps version when the DSL changes', async () => {
      const existing = makeChain();
      const repo = makeRepo({
        findById: jest.fn().mockResolvedValue(existing),
        update: jest.fn().mockResolvedValue(existing),
      });
      const service = new ChainService(repo as never);
      const newDsl = {
        steps: [
          { id: 's1', connectorId: 'c1', actionType: 'CREATE_TICKET', payload: {} },
          { id: 's2', connectorId: 'c2', actionType: 'SEND_SLACK', payload: {} },
        ],
      };
      await service.update('u1', 'chain-1', { dsl: newDsl });
      expect(repo['update']).toHaveBeenCalledWith(
        'chain-1',
        expect.objectContaining({ version: { increment: 1 } }),
      );
    });

    it('does NOT bump version when only isEnabled toggles', async () => {
      const existing = makeChain();
      const repo = makeRepo({
        findById: jest.fn().mockResolvedValue(existing),
        update: jest.fn().mockResolvedValue(existing),
      });
      const service = new ChainService(repo as never);
      await service.update('u1', 'chain-1', { isEnabled: false });
      const updateMock = repo['update'] as jest.Mock;
      const updateArg = (updateMock.mock.calls[0]?.[1] ?? {}) as Record<string, unknown>;
      expect(updateArg['version']).toBeUndefined();
      expect(updateArg['isEnabled']).toBe(false);
    });

    it('409s when renaming to a name owned by a different chain', async () => {
      const existing = makeChain({ id: 'chain-1', name: 'Old' });
      const repo = makeRepo({
        findById: jest.fn().mockResolvedValue(existing),
        findByName: jest.fn().mockResolvedValue(makeChain({ id: 'chain-other', name: 'Taken' })),
      });
      const service = new ChainService(repo as never);
      await expect(
        service.update('u1', 'chain-1', { name: 'Taken' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(repo['update']).not.toHaveBeenCalled();
    });
  });

  describe('deleteById', () => {
    it('deletes only when owned', async () => {
      const repo = makeRepo({
        findById: jest.fn().mockResolvedValue(makeChain()),
        deleteById: jest.fn().mockResolvedValue(undefined),
      });
      const service = new ChainService(repo as never);
      await service.deleteById('u1', 'chain-1');
      expect(repo['deleteById']).toHaveBeenCalledWith('chain-1');
    });

    it('404s before deleting when not owned', async () => {
      const repo = makeRepo({
        findById: jest.fn().mockResolvedValue(makeChain({ userId: 'bob' })),
      });
      const service = new ChainService(repo as never);
      await expect(service.deleteById('alice', 'chain-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repo['deleteById']).not.toHaveBeenCalled();
    });
  });
});
