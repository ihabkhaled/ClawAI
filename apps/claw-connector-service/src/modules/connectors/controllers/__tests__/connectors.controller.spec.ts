import { Test, type TestingModule } from '@nestjs/testing';
import { ConnectorsController } from '../connectors.controller';
import { ConnectorsService } from '../../services/connectors.service';

describe('ConnectorsController', () => {
  let controller: ConnectorsController;
  let serviceMock: jest.Mocked<{
    createConnector: jest.Mock;
    getConnectors: jest.Mock;
    getConnector: jest.Mock;
    updateConnector: jest.Mock;
    deleteConnector: jest.Mock;
    testConnector: jest.Mock;
    syncModels: jest.Mock;
    getModels: jest.Mock;
  }>;

  beforeEach(async () => {
    serviceMock = {
      createConnector: jest.fn(),
      getConnectors: jest.fn(),
      getConnector: jest.fn(),
      updateConnector: jest.fn(),
      deleteConnector: jest.fn(),
      testConnector: jest.fn(),
      syncModels: jest.fn(),
      getModels: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConnectorsController],
      providers: [{ provide: ConnectorsService, useValue: serviceMock }],
    }).compile();
    controller = module.get<ConnectorsController>(ConnectorsController);
  });

  it('create forwards dto', async () => {
    serviceMock.createConnector.mockResolvedValue({ id: 'c1' });
    await controller.create({ name: 'OpenAI', provider: 'OPENAI', apiKey: 'sk-x' } as never);
    expect(serviceMock.createConnector).toHaveBeenCalledWith({
      name: 'OpenAI',
      provider: 'OPENAI',
      apiKey: 'sk-x',
    });
  });

  it('findAll forwards query', async () => {
    serviceMock.getConnectors.mockResolvedValue({ data: [], meta: {} });
    await controller.findAll({ page: 1, limit: 20 } as never);
    expect(serviceMock.getConnectors).toHaveBeenCalledWith({ page: 1, limit: 20 });
  });

  it('findOne forwards id', async () => {
    await controller.findOne('c1');
    expect(serviceMock.getConnector).toHaveBeenCalledWith('c1');
  });

  it('update forwards id and dto', async () => {
    await controller.update('c1', { name: 'New' } as never);
    expect(serviceMock.updateConnector).toHaveBeenCalledWith('c1', { name: 'New' });
  });

  it('remove forwards id', async () => {
    await controller.remove('c1');
    expect(serviceMock.deleteConnector).toHaveBeenCalledWith('c1');
  });

  it('test forwards id', async () => {
    await controller.test('c1');
    expect(serviceMock.testConnector).toHaveBeenCalledWith('c1');
  });

  it('sync forwards id', async () => {
    await controller.sync('c1');
    expect(serviceMock.syncModels).toHaveBeenCalledWith('c1');
  });

  it('getModels forwards id', async () => {
    serviceMock.getModels.mockResolvedValue([]);
    await controller.getModels('c1');
    expect(serviceMock.getModels).toHaveBeenCalledWith('c1');
  });
});
