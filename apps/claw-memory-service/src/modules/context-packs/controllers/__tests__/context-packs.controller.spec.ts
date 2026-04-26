import { Test, type TestingModule } from '@nestjs/testing';
import { ContextPacksController } from '../context-packs.controller';
import { ContextPacksInternalController } from '../context-packs-internal.controller';
import { ContextPacksService } from '../../services/context-packs.service';

describe('ContextPacksController', () => {
  let controller: ContextPacksController;
  let serviceMock: jest.Mocked<{
    createContextPack: jest.Mock;
    getContextPacks: jest.Mock;
    getContextPack: jest.Mock;
    updateContextPack: jest.Mock;
    deleteContextPack: jest.Mock;
    addItem: jest.Mock;
    removeItem: jest.Mock;
  }>;

  beforeEach(async () => {
    serviceMock = {
      createContextPack: jest.fn(),
      getContextPacks: jest.fn(),
      getContextPack: jest.fn(),
      updateContextPack: jest.fn(),
      deleteContextPack: jest.fn(),
      addItem: jest.fn(),
      removeItem: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContextPacksController],
      providers: [{ provide: ContextPacksService, useValue: serviceMock }],
    }).compile();
    controller = module.get<ContextPacksController>(ContextPacksController);
  });

  const user = { id: 'u1', email: 'a@b', role: 'OPERATOR' };

  it('create forwards user.id and dto', async () => {
    serviceMock.createContextPack.mockResolvedValue({ id: 'cp1' });
    await controller.create(user as never, { name: 'pack' } as never);
    expect(serviceMock.createContextPack).toHaveBeenCalledWith('u1', { name: 'pack' });
  });

  it('findAll parses page/limit and forwards search', async () => {
    serviceMock.getContextPacks.mockResolvedValue({ data: [], meta: {} });
    await controller.findAll(user as never, '3', '50', 'foo');
    expect(serviceMock.getContextPacks).toHaveBeenCalledWith('u1', 3, 50, 'foo');
  });

  it('findAll defaults page=1 limit=20 when omitted', async () => {
    serviceMock.getContextPacks.mockResolvedValue({ data: [], meta: {} });
    await controller.findAll(user as never);
    expect(serviceMock.getContextPacks).toHaveBeenCalledWith('u1', 1, 20, undefined);
  });

  it('findOne forwards id and user.id', async () => {
    await controller.findOne('cp1', user as never);
    expect(serviceMock.getContextPack).toHaveBeenCalledWith('cp1', 'u1');
  });

  it('update forwards id, user.id, dto', async () => {
    await controller.update('cp1', user as never, { name: 'new' } as never);
    expect(serviceMock.updateContextPack).toHaveBeenCalledWith('cp1', 'u1', { name: 'new' });
  });

  it('remove forwards id and user.id', async () => {
    await controller.remove('cp1', user as never);
    expect(serviceMock.deleteContextPack).toHaveBeenCalledWith('cp1', 'u1');
  });

  it('addItem forwards id, user.id, dto', async () => {
    await controller.addItem('cp1', user as never, { type: 'TEXT', content: 'hello' } as never);
    expect(serviceMock.addItem).toHaveBeenCalledWith('cp1', 'u1', {
      type: 'TEXT',
      content: 'hello',
    });
  });

  it('removeItem forwards contextPackId, itemId, user.id', async () => {
    await controller.removeItem('cp1', 'item-1', user as never);
    expect(serviceMock.removeItem).toHaveBeenCalledWith('cp1', 'item-1', 'u1');
  });
});

describe('ContextPacksInternalController', () => {
  let controller: ContextPacksInternalController;
  let serviceMock: jest.Mocked<{ getContextPackItemsInternal: jest.Mock }>;

  beforeEach(async () => {
    serviceMock = { getContextPackItemsInternal: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContextPacksInternalController],
      providers: [{ provide: ContextPacksService, useValue: serviceMock }],
    }).compile();
    controller = module.get<ContextPacksInternalController>(ContextPacksInternalController);
  });

  it('getItems forwards id', async () => {
    serviceMock.getContextPackItemsInternal.mockResolvedValue({ id: 'cp1', items: [] });
    await controller.getItems('cp1');
    expect(serviceMock.getContextPackItemsInternal).toHaveBeenCalledWith('cp1');
  });
});
