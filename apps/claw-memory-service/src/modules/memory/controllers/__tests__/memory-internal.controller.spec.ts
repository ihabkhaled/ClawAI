import { Test, type TestingModule } from '@nestjs/testing';
import { MemoryInternalController } from '../memory-internal.controller';
import { MemoryService } from '../../services/memory.service';

describe('MemoryInternalController', () => {
  let controller: MemoryInternalController;
  let serviceMock: jest.Mocked<{ getMemoriesForContext: jest.Mock }>;

  beforeEach(async () => {
    serviceMock = { getMemoriesForContext: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MemoryInternalController],
      providers: [{ provide: MemoryService, useValue: serviceMock }],
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
