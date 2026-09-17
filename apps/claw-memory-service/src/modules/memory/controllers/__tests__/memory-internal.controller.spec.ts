import { type Mock, vi } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import { MemoryInternalController } from '../memory-internal.controller';
import { MemoryRepository } from '../../repositories/memory.repository';
import { MemoryService } from '../../services/memory.service';

describe('MemoryInternalController', () => {
  let controller: MemoryInternalController;
  let serviceMock: { getMemoriesForContext: Mock };
  let repoMock: { findLearnedPreferences: Mock };

  beforeEach(async () => {
    serviceMock = { getMemoriesForContext: vi.fn() };
    repoMock = { findLearnedPreferences: vi.fn() };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MemoryInternalController],
      providers: [
        { provide: MemoryService, useValue: serviceMock },
        { provide: MemoryRepository, useValue: repoMock },
      ],
    }).compile();
    controller = module.get<MemoryInternalController>(MemoryInternalController);
  });

  it('getForContext parses limit and forwards', async () => {
    serviceMock.getMemoriesForContext.mockResolvedValue([{ id: 'm1' }]);
    await controller.getForContext('u1', '25');
    expect(serviceMock.getMemoriesForContext).toHaveBeenCalledWith('u1', 25);
  });

  it('getForContext defaults limit to 10 when not parseable', async () => {
    serviceMock.getMemoriesForContext.mockResolvedValue([]);
    await controller.getForContext('u1', '');
    expect(serviceMock.getMemoriesForContext).toHaveBeenCalledWith('u1', 10);
  });
});
