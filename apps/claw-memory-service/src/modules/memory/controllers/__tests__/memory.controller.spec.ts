import { Test, type TestingModule } from '@nestjs/testing';
import { MemoryController } from '../memory.controller';
import { MemoryService } from '../../services/memory.service';

describe('MemoryController', () => {
  let controller: MemoryController;
  let serviceMock: jest.Mocked<{
    createMemory: jest.Mock;
    getMemories: jest.Mock;
    getMemory: jest.Mock;
    updateMemory: jest.Mock;
    deleteMemory: jest.Mock;
    toggleMemory: jest.Mock;
  }>;

  beforeEach(async () => {
    serviceMock = {
      createMemory: jest.fn(),
      getMemories: jest.fn(),
      getMemory: jest.fn(),
      updateMemory: jest.fn(),
      deleteMemory: jest.fn(),
      toggleMemory: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MemoryController],
      providers: [{ provide: MemoryService, useValue: serviceMock }],
    }).compile();
    controller = module.get<MemoryController>(MemoryController);
  });

  const user = { id: 'u1', email: 'a@b', role: 'OPERATOR' };

  it('create forwards user.id and dto', async () => {
    serviceMock.createMemory.mockResolvedValue({ id: 'm1' });
    await controller.create(user as never, { content: 'x', type: 'FACT' } as never);
    expect(serviceMock.createMemory).toHaveBeenCalledWith('u1', { content: 'x', type: 'FACT' });
  });

  it('findAll forwards user.id and query', async () => {
    serviceMock.getMemories.mockResolvedValue({ data: [], meta: {} });
    await controller.findAll(user as never, { page: 1, limit: 20 } as never);
    expect(serviceMock.getMemories).toHaveBeenCalledWith('u1', { page: 1, limit: 20 });
  });

  it('findOne forwards id and user.id', async () => {
    await controller.findOne('m1', user as never);
    expect(serviceMock.getMemory).toHaveBeenCalledWith('m1', 'u1');
  });

  it('update forwards id, user.id, dto', async () => {
    await controller.update('m1', user as never, { content: 'new' } as never);
    expect(serviceMock.updateMemory).toHaveBeenCalledWith('m1', 'u1', { content: 'new' });
  });

  it('remove forwards id and user.id', async () => {
    await controller.remove('m1', user as never);
    expect(serviceMock.deleteMemory).toHaveBeenCalledWith('m1', 'u1');
  });

  it('toggle forwards id and user.id', async () => {
    await controller.toggle('m1', user as never);
    expect(serviceMock.toggleMemory).toHaveBeenCalledWith('m1', 'u1');
  });
});
