import { ConflictException, NotFoundException } from '@nestjs/common';

import { EmailTemplateService } from '../email-template.service';

const makeTpl = (overrides: Record<string, unknown> = {}): unknown => ({
  id: overrides['id'] ?? 'tpl-1',
  userId: overrides['userId'] ?? 'u1',
  name: overrides['name'] ?? 'Follow-up',
  subject: overrides['subject'] ?? 'Following up on {{topic}}',
  body: overrides['body'] ?? 'Hi {{name}},\n\nJust circling back...',
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

describe('EmailTemplateService', () => {
  describe('list', () => {
    it('returns all templates for the user', async () => {
      const repo = makeRepo({ listForUser: jest.fn().mockResolvedValue([makeTpl()]) });
      const service = new EmailTemplateService(repo as never);
      const result = await service.list('u1');
      expect(result).toHaveLength(1);
      expect(repo['listForUser']).toHaveBeenCalledWith('u1');
    });
  });

  describe('getOwn', () => {
    it('returns the template when owned', async () => {
      const tpl = makeTpl();
      const repo = makeRepo({ findById: jest.fn().mockResolvedValue(tpl) });
      const service = new EmailTemplateService(repo as never);
      expect(await service.getOwn('u1', 'tpl-1')).toEqual(tpl);
    });

    it('404s when the template belongs to another user', async () => {
      const repo = makeRepo({
        findById: jest.fn().mockResolvedValue(makeTpl({ userId: 'bob' })),
      });
      const service = new EmailTemplateService(repo as never);
      await expect(service.getOwn('alice', 'tpl-1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('404s when the template does not exist', async () => {
      const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
      const service = new EmailTemplateService(repo as never);
      await expect(service.getOwn('u1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('getDefault', () => {
    it('returns the default template for the user', async () => {
      const tpl = makeTpl({ isDefault: true });
      const repo = makeRepo({ findDefaultForUser: jest.fn().mockResolvedValue(tpl) });
      const service = new EmailTemplateService(repo as never);
      expect(await service.getDefault('u1')).toEqual(tpl);
    });

    it('returns null when no default is set', async () => {
      const repo = makeRepo({ findDefaultForUser: jest.fn().mockResolvedValue(null) });
      const service = new EmailTemplateService(repo as never);
      expect(await service.getDefault('u1')).toBeNull();
    });
  });

  describe('create', () => {
    it('creates a new template when the name is unique', async () => {
      const created = makeTpl();
      const repo = makeRepo({
        findByName: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(created),
      });
      const service = new EmailTemplateService(repo as never);
      const result = await service.create('u1', {
        name: 'Follow-up',
        subject: 'Following up on {{topic}}',
        body: 'Hi {{name}},\n\nJust circling back...',
      });
      expect(result).toEqual(created);
      expect(repo['clearDefaultsForUser']).not.toHaveBeenCalled();
    });

    it('clears other defaults when creating with isDefault=true', async () => {
      const created = makeTpl({ isDefault: true }) as { id: string };
      const repo = makeRepo({
        findByName: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(created),
      });
      const service = new EmailTemplateService(repo as never);
      await service.create('u1', {
        name: 'Follow-up',
        subject: 'S',
        body: 'B',
        isDefault: true,
      });
      expect(repo['clearDefaultsForUser']).toHaveBeenCalledWith('u1', created.id);
    });

    it('409s when the name is already taken for the user', async () => {
      const repo = makeRepo({ findByName: jest.fn().mockResolvedValue(makeTpl()) });
      const service = new EmailTemplateService(repo as never);
      await expect(
        service.create('u1', { name: 'Follow-up', subject: 'S', body: 'B' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(repo['create']).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('updates fields and clears other defaults when promoting to default', async () => {
      const repo = makeRepo({
        findById: jest.fn().mockResolvedValue(makeTpl()),
        findByName: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue(makeTpl({ isDefault: true })),
      });
      const service = new EmailTemplateService(repo as never);
      await service.update('u1', 'tpl-1', { isDefault: true, subject: 'New subject' });
      expect(repo['update']).toHaveBeenCalledWith('tpl-1', {
        subject: 'New subject',
        isDefault: true,
      });
      expect(repo['clearDefaultsForUser']).toHaveBeenCalledWith('u1', 'tpl-1');
    });

    it('blocks rename when the new name is taken by another row', async () => {
      const repo = makeRepo({
        findById: jest.fn().mockResolvedValue(makeTpl()),
        findByName: jest.fn().mockResolvedValue(makeTpl({ id: 'tpl-other' })),
      });
      const service = new EmailTemplateService(repo as never);
      await expect(
        service.update('u1', 'tpl-1', { name: 'Conflict' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(repo['update']).not.toHaveBeenCalled();
    });

    it('allows renaming to a name that is taken by the SAME row', async () => {
      const repo = makeRepo({
        findById: jest.fn().mockResolvedValue(makeTpl()),
        findByName: jest.fn().mockResolvedValue(makeTpl()),
        update: jest.fn().mockResolvedValue(makeTpl()),
      });
      const service = new EmailTemplateService(repo as never);
      await service.update('u1', 'tpl-1', { name: 'Follow-up' });
      expect(repo['update']).toHaveBeenCalled();
    });
  });

  describe('deleteById', () => {
    it('deletes only when owned', async () => {
      const repo = makeRepo({
        findById: jest.fn().mockResolvedValue(makeTpl()),
        deleteById: jest.fn().mockResolvedValue(undefined),
      });
      const service = new EmailTemplateService(repo as never);
      await service.deleteById('u1', 'tpl-1');
      expect(repo['deleteById']).toHaveBeenCalledWith('tpl-1');
    });

    it('404s before deleting when the row is not owned', async () => {
      const repo = makeRepo({
        findById: jest.fn().mockResolvedValue(makeTpl({ userId: 'bob' })),
      });
      const service = new EmailTemplateService(repo as never);
      await expect(service.deleteById('alice', 'tpl-1')).rejects.toBeInstanceOf(NotFoundException);
      expect(repo['deleteById']).not.toHaveBeenCalled();
    });
  });
});
