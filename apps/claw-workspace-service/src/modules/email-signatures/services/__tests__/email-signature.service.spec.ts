import { ConflictException, NotFoundException } from '@nestjs/common';

import { EmailSignatureService } from '../email-signature.service';

const makeSig = (overrides: Record<string, unknown> = {}): unknown => ({
  id: overrides['id'] ?? 'sig-1',
  userId: overrides['userId'] ?? 'u1',
  name: overrides['name'] ?? 'Work',
  body: overrides['body'] ?? 'Best,\nAlice',
  isDefault: overrides['isDefault'] ?? false,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const makeRepo = (overrides: Record<string, jest.Mock> = {}): Record<string, jest.Mock> => ({
  listForUser: jest.fn(),
  findById: jest.fn(),
  findByName: jest.fn(),
  findDefaultForUser: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  deleteById: jest.fn(),
  clearDefaultsForUser: jest.fn(),
  ...overrides,
});

describe('EmailSignatureService', () => {
  describe('list', () => {
    it('returns all signatures for the user', async () => {
      const repo = makeRepo({ listForUser: jest.fn().mockResolvedValue([makeSig()]) });
      const service = new EmailSignatureService(repo as any);
      const result = await service.list('u1');
      expect(result).toHaveLength(1);
      expect(repo['listForUser']).toHaveBeenCalledWith('u1');
    });
  });

  describe('getOwn', () => {
    it('returns the signature when owned', async () => {
      const sig = makeSig();
      const repo = makeRepo({ findById: jest.fn().mockResolvedValue(sig) });
      const service = new EmailSignatureService(repo as any);
      const result = await service.getOwn('u1', 'sig-1');
      expect(result).toEqual(sig);
    });

    it('404s when the signature belongs to a different user', async () => {
      const repo = makeRepo({
        findById: jest.fn().mockResolvedValue(makeSig({ userId: 'bob' })),
      });
      const service = new EmailSignatureService(repo as any);
      await expect(service.getOwn('alice', 'sig-1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('404s when the signature does not exist', async () => {
      const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
      const service = new EmailSignatureService(repo as any);
      await expect(service.getOwn('u1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('getDefault', () => {
    it('returns the default signature for the user', async () => {
      const sig = makeSig({ isDefault: true });
      const repo = makeRepo({ findDefaultForUser: jest.fn().mockResolvedValue(sig) });
      const service = new EmailSignatureService(repo as any);
      const result = await service.getDefault('u1');
      expect(result).toEqual(sig);
    });

    it('returns null when no default is set', async () => {
      const repo = makeRepo({ findDefaultForUser: jest.fn().mockResolvedValue(null) });
      const service = new EmailSignatureService(repo as any);
      expect(await service.getDefault('u1')).toBeNull();
    });
  });

  describe('create', () => {
    it('creates a new signature when the name is unique', async () => {
      const created = makeSig();
      const repo = makeRepo({
        findByName: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(created),
      });
      const service = new EmailSignatureService(repo as any);
      const result = await service.create('u1', { name: 'Work', body: 'Best,\nAlice' });
      expect(result).toEqual(created);
      expect(repo['clearDefaultsForUser']).not.toHaveBeenCalled();
    });

    it('clears other defaults when creating with isDefault=true', async () => {
      const created = makeSig({ isDefault: true }) as { id: string };
      const repo = makeRepo({
        findByName: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(created),
      });
      const service = new EmailSignatureService(repo as any);
      await service.create('u1', { name: 'Work', body: 'Best,\nAlice', isDefault: true });
      expect(repo['clearDefaultsForUser']).toHaveBeenCalledWith('u1', created.id);
    });

    it('409s when the name is already taken for the user', async () => {
      const repo = makeRepo({ findByName: jest.fn().mockResolvedValue(makeSig()) });
      const service = new EmailSignatureService(repo as any);
      await expect(service.create('u1', { name: 'Work', body: 'x' })).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(repo['create']).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('updates fields and clears other defaults when promoting to default', async () => {
      const repo = makeRepo({
        findById: jest.fn().mockResolvedValue(makeSig()),
        findByName: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue(makeSig({ isDefault: true })),
      });
      const service = new EmailSignatureService(repo as any);
      await service.update('u1', 'sig-1', { isDefault: true });
      expect(repo['clearDefaultsForUser']).toHaveBeenCalledWith('u1', 'sig-1');
    });

    it('blocks rename when the new name is taken by another row', async () => {
      const repo = makeRepo({
        findById: jest.fn().mockResolvedValue(makeSig()),
        findByName: jest.fn().mockResolvedValue(makeSig({ id: 'sig-other' })),
      });
      const service = new EmailSignatureService(repo as any);
      await expect(service.update('u1', 'sig-1', { name: 'Conflict' })).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(repo['update']).not.toHaveBeenCalled();
    });

    it('allows renaming to a name that is taken by the SAME row', async () => {
      const repo = makeRepo({
        findById: jest.fn().mockResolvedValue(makeSig()),
        findByName: jest.fn().mockResolvedValue(makeSig()),
        update: jest.fn().mockResolvedValue(makeSig()),
      });
      const service = new EmailSignatureService(repo as any);
      await service.update('u1', 'sig-1', { name: 'Work' });
      expect(repo['update']).toHaveBeenCalled();
    });
  });

  describe('deleteById', () => {
    it('deletes only when owned', async () => {
      const repo = makeRepo({
        findById: jest.fn().mockResolvedValue(makeSig()),
        deleteById: jest.fn().mockResolvedValue(undefined),
      });
      const service = new EmailSignatureService(repo as any);
      await service.deleteById('u1', 'sig-1');
      expect(repo['deleteById']).toHaveBeenCalledWith('sig-1');
    });

    it('404s before deleting when the row is not owned', async () => {
      const repo = makeRepo({
        findById: jest.fn().mockResolvedValue(makeSig({ userId: 'bob' })),
      });
      const service = new EmailSignatureService(repo as any);
      await expect(service.deleteById('alice', 'sig-1')).rejects.toBeInstanceOf(NotFoundException);
      expect(repo['deleteById']).not.toHaveBeenCalled();
    });
  });
});
