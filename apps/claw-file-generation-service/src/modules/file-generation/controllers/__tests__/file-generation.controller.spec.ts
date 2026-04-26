import { Test, type TestingModule } from '@nestjs/testing';
import { FileGenerationController } from '../file-generation.controller';
import { InternalFileGenerationController } from '../internal-file-generation.controller';
import { FileGenerationService } from '../../services/file-generation.service';
import { FileGenerationEventsService } from '../../services/file-generation-events.service';

describe('FileGenerationController', () => {
  let controller: FileGenerationController;
  let serviceMock: jest.Mocked<{
    listByUser: jest.Mock;
    getByIdForUser: jest.Mock;
    retryGeneration: jest.Mock;
  }>;
  let eventsMock: jest.Mocked<{ subscribe: jest.Mock }>;

  beforeEach(async () => {
    serviceMock = {
      listByUser: jest.fn(),
      getByIdForUser: jest.fn(),
      retryGeneration: jest.fn(),
    };
    eventsMock = { subscribe: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FileGenerationController],
      providers: [
        { provide: FileGenerationService, useValue: serviceMock },
        { provide: FileGenerationEventsService, useValue: eventsMock },
      ],
    }).compile();
    controller = module.get<FileGenerationController>(FileGenerationController);
  });

  const user = { id: 'u1', email: 'a@b', role: 'OPERATOR' };

  it('list forwards user.id and query', async () => {
    serviceMock.listByUser.mockResolvedValue({ data: [], meta: {} });
    await controller.list(user as never, { page: 1, limit: 20 } as never);
    expect(serviceMock.listByUser).toHaveBeenCalledWith('u1', { page: 1, limit: 20 });
  });

  it('getById forwards id and user.id', async () => {
    await controller.getById('gen-1', user as never);
    expect(serviceMock.getByIdForUser).toHaveBeenCalledWith('gen-1', 'u1');
  });

  it('retry returns generationId and status from service result', async () => {
    serviceMock.retryGeneration.mockResolvedValue({ id: 'gen-1', status: 'QUEUED' });
    const result = await controller.retry('gen-1', user as never);
    expect(serviceMock.retryGeneration).toHaveBeenCalledWith('gen-1');
    expect(result).toEqual({ generationId: 'gen-1', status: 'QUEUED' });
  });

  it('events subscribes to events service for a generation', () => {
    const obs = { subscribe: jest.fn() };
    eventsMock.subscribe.mockReturnValue(obs);
    const result = controller.events('gen-1');
    expect(eventsMock.subscribe).toHaveBeenCalledWith('gen-1');
    expect(result).toBe(obs);
  });
});

describe('InternalFileGenerationController', () => {
  let controller: InternalFileGenerationController;
  let serviceMock: jest.Mocked<{
    enqueueGeneration: jest.Mock;
    getById: jest.Mock;
    retryGeneration: jest.Mock;
  }>;
  let eventsMock: jest.Mocked<{ subscribe: jest.Mock }>;

  beforeEach(async () => {
    serviceMock = {
      enqueueGeneration: jest.fn(),
      getById: jest.fn(),
      retryGeneration: jest.fn(),
    };
    eventsMock = { subscribe: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InternalFileGenerationController],
      providers: [
        { provide: FileGenerationService, useValue: serviceMock },
        { provide: FileGenerationEventsService, useValue: eventsMock },
      ],
    }).compile();
    controller = module.get<InternalFileGenerationController>(InternalFileGenerationController);
  });

  it('generate returns id/status/format from service', async () => {
    serviceMock.enqueueGeneration.mockResolvedValue({
      id: 'g1',
      status: 'QUEUED',
      format: 'PDF',
    });
    const result = await controller.generate({ format: 'PDF', content: 'hi' } as never);
    expect(result).toEqual({ generationId: 'g1', status: 'QUEUED', format: 'PDF' });
  });

  it('getGeneration forwards id', async () => {
    await controller.getGeneration('g1');
    expect(serviceMock.getById).toHaveBeenCalledWith('g1');
  });

  it('retry forwards id and returns minimal result', async () => {
    serviceMock.retryGeneration.mockResolvedValue({ id: 'g1', status: 'QUEUED' });
    const result = await controller.retry('g1');
    expect(result).toEqual({ generationId: 'g1', status: 'QUEUED' });
  });

  it('events subscribes via eventsService', () => {
    eventsMock.subscribe.mockReturnValue({ subscribe: jest.fn() });
    controller.events('g1');
    expect(eventsMock.subscribe).toHaveBeenCalledWith('g1');
  });
});
