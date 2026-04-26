import { Test, type TestingModule } from '@nestjs/testing';
import { ImageGenerationController } from '../image-generation.controller';
import { InternalImageController } from '../internal-image.controller';
import { ImageGenerationService } from '../../services/image-generation.service';
import { ImageGenerationEventsService } from '../../services/image-generation-events.service';

const buildServiceMock = (): jest.Mocked<{
  enqueueGeneration: jest.Mock;
  getById: jest.Mock;
  getByIdForUser: jest.Mock;
  listByUser: jest.Mock;
  retryGeneration: jest.Mock;
  retryWithAlternateModel: jest.Mock;
}> => ({
  enqueueGeneration: jest.fn(),
  getById: jest.fn(),
  getByIdForUser: jest.fn(),
  listByUser: jest.fn(),
  retryGeneration: jest.fn(),
  retryWithAlternateModel: jest.fn(),
});

describe('ImageGenerationController', () => {
  let controller: ImageGenerationController;
  let serviceMock: ReturnType<typeof buildServiceMock>;
  let eventsMock: jest.Mocked<{ subscribe: jest.Mock }>;

  beforeEach(async () => {
    serviceMock = buildServiceMock();
    eventsMock = { subscribe: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ImageGenerationController],
      providers: [
        { provide: ImageGenerationService, useValue: serviceMock },
        { provide: ImageGenerationEventsService, useValue: eventsMock },
      ],
    }).compile();
    controller = module.get<ImageGenerationController>(ImageGenerationController);
  });

  const user = { id: 'u1', email: 'a@b', role: 'OPERATOR' };

  it('list forwards user.id and query', async () => {
    serviceMock.listByUser.mockResolvedValue({ data: [], meta: {} });
    await controller.list(user as never, { page: 1, limit: 20 } as never);
    expect(serviceMock.listByUser).toHaveBeenCalledWith('u1', { page: 1, limit: 20 });
  });

  it('getById forwards id and user.id', async () => {
    await controller.getById('g1', user as never);
    expect(serviceMock.getByIdForUser).toHaveBeenCalledWith('g1', 'u1');
  });

  it('retry returns { generationId, status }', async () => {
    serviceMock.retryGeneration.mockResolvedValue({ id: 'g1', status: 'QUEUED' });
    const result = await controller.retry('g1', user as never);
    expect(result).toEqual({ generationId: 'g1', status: 'QUEUED' });
  });

  it('retryAlternate forwards provider/model from body', async () => {
    serviceMock.retryWithAlternateModel.mockResolvedValue({
      id: 'g2',
      status: 'QUEUED',
      provider: 'gemini',
      model: 'imagen-3',
    });
    const result = await controller.retryAlternate('g1', user as never, {
      provider: 'gemini',
      model: 'imagen-3',
    });
    expect(serviceMock.retryWithAlternateModel).toHaveBeenCalledWith('g1', 'gemini', 'imagen-3');
    expect(result.provider).toBe('gemini');
  });

  it('retryAlternate works without body', async () => {
    serviceMock.retryWithAlternateModel.mockResolvedValue({
      id: 'g2',
      status: 'QUEUED',
      provider: 'auto',
      model: 'auto',
    });
    await controller.retryAlternate('g1', user as never);
    expect(serviceMock.retryWithAlternateModel).toHaveBeenCalledWith('g1', undefined, undefined);
  });

  it('events subscribes via eventsService', () => {
    const obs = { subscribe: jest.fn() };
    eventsMock.subscribe.mockReturnValue(obs);
    expect(controller.events('g1')).toBe(obs);
    expect(eventsMock.subscribe).toHaveBeenCalledWith('g1');
  });
});

describe('InternalImageController', () => {
  let controller: InternalImageController;
  let serviceMock: ReturnType<typeof buildServiceMock>;
  let eventsMock: jest.Mocked<{ subscribe: jest.Mock }>;

  beforeEach(async () => {
    serviceMock = buildServiceMock();
    eventsMock = { subscribe: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InternalImageController],
      providers: [
        { provide: ImageGenerationService, useValue: serviceMock },
        { provide: ImageGenerationEventsService, useValue: eventsMock },
      ],
    }).compile();
    controller = module.get<InternalImageController>(InternalImageController);
  });

  it('generate returns { id, status, provider, model }', async () => {
    serviceMock.enqueueGeneration.mockResolvedValue({
      id: 'g1',
      status: 'QUEUED',
      provider: 'openai',
      model: 'dall-e-3',
    });
    const result = await controller.generate({ prompt: 'cat', userId: 'u1' } as never);
    expect(result).toEqual({
      generationId: 'g1',
      status: 'QUEUED',
      provider: 'openai',
      model: 'dall-e-3',
    });
  });

  it('getGeneration forwards id', async () => {
    await controller.getGeneration('g1');
    expect(serviceMock.getById).toHaveBeenCalledWith('g1');
  });

  it('retry forwards id', async () => {
    serviceMock.retryGeneration.mockResolvedValue({ id: 'g1', status: 'QUEUED' });
    const result = await controller.retry('g1');
    expect(result).toEqual({ generationId: 'g1', status: 'QUEUED' });
  });

  it('retryAlternate forwards body provider/model', async () => {
    serviceMock.retryWithAlternateModel.mockResolvedValue({
      id: 'g2',
      status: 'QUEUED',
      provider: 'gemini',
      model: 'imagen-3',
    });
    await controller.retryAlternate('g1', { provider: 'gemini', model: 'imagen-3' });
    expect(serviceMock.retryWithAlternateModel).toHaveBeenCalledWith('g1', 'gemini', 'imagen-3');
  });

  it('events subscribes via eventsService', () => {
    const obs = { subscribe: jest.fn() };
    eventsMock.subscribe.mockReturnValue(obs);
    expect(controller.events('g1')).toBe(obs);
  });
});
