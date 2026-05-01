import { HttpStatus } from '@nestjs/common';

import { CapabilityClass } from '../../../../common/enums/capability-class.enum';
import { CapabilityOperation } from '../../../../common/enums/capability-operation.enum';
import { BusinessException } from '../../../../common/errors/business.exception';
import { EntityNotFoundException } from '../../../../common/errors/entity-not-found.exception';
import { RecipeService } from '../recipe.service';
import type { RecipeRepository } from '../../repositories/recipe.repository';
import type { CreateRecipeDto } from '../../dto/create-recipe.dto';
import type { Recipe } from '../../../../generated/prisma';

const minimalDsl = {
  schemaVersion: '1' as const,
  metadata: { title: 'Test Recipe' },
  steps: [
    {
      id: 'step1',
      capabilityClass: CapabilityClass.FILESYSTEM,
      capabilityOperation: CapabilityOperation.READ,
      target: { path: '/home/x.txt' },
    },
  ],
};

function fakeRecipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: 'r1',
    userId: 'u1',
    name: 'My Recipe',
    description: null,
    dsl: minimalDsl as never,
    isEnabled: true,
    version: 1,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Recipe;
}

function fakeRepo(): jest.Mocked<RecipeRepository> {
  return {
    create: jest.fn(),
    findByIdForUser: jest.fn(),
    findByNameForUser: jest.fn(),
    update: jest.fn(),
    deleteById: jest.fn(),
    list: jest.fn(),
  } as unknown as jest.Mocked<RecipeRepository>;
}

describe('RecipeService', () => {
  describe('create', () => {
    it('creates a recipe when name is unique', async () => {
      const repo = fakeRepo();
      repo.findByNameForUser.mockResolvedValue(null);
      const expected = fakeRecipe();
      repo.create.mockResolvedValue(expected);
      const service = new RecipeService(repo);

      const dto: CreateRecipeDto = {
        name: 'My Recipe',
        dsl: minimalDsl,
        isEnabled: true,
      };
      const result = await service.create('u1', dto);

      expect(result).toBe(expected);
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'u1', name: 'My Recipe', isEnabled: true }),
      );
    });

    it('rejects with 409 when a recipe with same name already exists for user', async () => {
      const repo = fakeRepo();
      repo.findByNameForUser.mockResolvedValue(fakeRecipe());
      const service = new RecipeService(repo);

      const dto: CreateRecipeDto = {
        name: 'My Recipe',
        dsl: minimalDsl,
        isEnabled: true,
      };
      await expect(service.create('u1', dto)).rejects.toThrow(BusinessException);
      try {
        await service.create('u1', dto);
      } catch (e) {
        expect((e as BusinessException).getStatus()).toBe(HttpStatus.CONFLICT);
      }
      expect(repo.create).not.toHaveBeenCalled();
    });
  });

  describe('getById / update / delete', () => {
    it('getById throws 404 when recipe missing', async () => {
      const repo = fakeRepo();
      repo.findByIdForUser.mockResolvedValue(null);
      const service = new RecipeService(repo);

      await expect(service.getById('u1', 'r-missing')).rejects.toThrow(EntityNotFoundException);
    });

    it('update bumps version when dsl changes and forwards other fields verbatim', async () => {
      const repo = fakeRepo();
      repo.findByIdForUser.mockResolvedValue(fakeRecipe());
      repo.update.mockResolvedValue(fakeRecipe({ version: 2 }));
      const service = new RecipeService(repo);

      await service.update('u1', 'r1', { name: 'New Name', dsl: minimalDsl });

      expect(repo.update).toHaveBeenCalledWith(
        'r1',
        expect.objectContaining({ name: 'New Name', version: { increment: 1 } }),
      );
    });

    it('update without dsl does NOT bump version', async () => {
      const repo = fakeRepo();
      repo.findByIdForUser.mockResolvedValue(fakeRecipe());
      repo.update.mockResolvedValue(fakeRecipe());
      const service = new RecipeService(repo);

      await service.update('u1', 'r1', { isEnabled: false });

      const callArg = repo.update.mock.calls[0]?.[1];
      expect(callArg).toBeDefined();
      expect(callArg).not.toHaveProperty('version');
      expect(callArg).toHaveProperty('isEnabled', false);
    });

    it('delete throws 404 if not owned', async () => {
      const repo = fakeRepo();
      repo.findByIdForUser.mockResolvedValue(null);
      const service = new RecipeService(repo);

      await expect(service.delete('u1', 'r-missing')).rejects.toThrow(EntityNotFoundException);
      expect(repo.deleteById).not.toHaveBeenCalled();
    });

    it('delete removes recipe when owned', async () => {
      const repo = fakeRepo();
      repo.findByIdForUser.mockResolvedValue(fakeRecipe());
      repo.deleteById.mockResolvedValue();
      const service = new RecipeService(repo);

      await service.delete('u1', 'r1');

      expect(repo.deleteById).toHaveBeenCalledWith('r1');
    });
  });

  describe('list', () => {
    it('passes the query through to repo and returns its result', async () => {
      const repo = fakeRepo();
      const expected = { data: [fakeRecipe()], total: 1, page: 1, pageSize: 20 };
      repo.list.mockResolvedValue(expected);
      const service = new RecipeService(repo);

      const result = await service.list('u1', { page: 1, pageSize: 20 });

      expect(result).toBe(expected);
      expect(repo.list).toHaveBeenCalledWith({ page: 1, pageSize: 20 }, 'u1');
    });
  });
});
