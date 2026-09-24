import { type Mock, vi } from 'vitest';
import { HttpStatus } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Test, type TestingModule } from '@nestjs/testing';
import { ImageGenerationController } from '../image-generation.controller';
import { InternalImageController } from '../internal-image.controller';
import { ImageGenerationService } from '../../services/image-generation.service';
import { ImageGenerationEventsService } from '../../services/image-generation-events.service';
import { ImageGenerationOwnerGuard } from '../../guards/image-generation-owner.guard';
import { ServiceTokenGuard } from '../../../../app/guards/service-token.guard';
import { IS_PUBLIC_KEY } from '../../../../app/decorators/public.decorator';
import { BusinessException } from '../../../../common/errors';

const buildServiceMock = (): {
  enqueueGeneration: Mock;
  getById: Mock;
  getByIdForUser: Mock;
  listByUser: Mock;
  retryGeneration: Mock;
  retryGenerationForUser: Mock;
  retryWithAlternateModel: Mock;
  retryWithAlternateModelForUser: Mock;
} => ({
  enqueueGeneration: vi.fn(),
  getById: vi.fn(),
  getByIdForUser: vi.fn(),
  listByUser: vi.fn(),
  retryGeneration: vi.fn(),
  retryGenerationForUser: vi.fn(),
  retryWithAlternateModel: vi.fn(),
  retryWithAlternateModelForUser: vi.fn(),
});

describe('ImageGenerationController', () => {
  let controller: ImageGenerationController;
  let serviceMock: ReturnType<typeof buildServiceMock>;
  let eventsMock: { subscribe: Mock };

  beforeEach(async () => {
    serviceMock = buildServiceMock();
    eventsMock = { subscribe: vi.fn() };
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

  // IDOR fix: the user route must go through the owner-scoped method, never the
  // trusting one the internal route uses.
  it('retry goes through the owner-scoped service method with user.id', async () => {
    serviceMock.retryGenerationForUser.mockResolvedValue({ id: 'g1', status: 'QUEUED' });
    const result = await controller.retry('g1', user as never);
    expect(serviceMock.retryGenerationForUser).toHaveBeenCalledWith('g1', 'u1');
    expect(serviceMock.retryGeneration).not.toHaveBeenCalled();
    expect(result).toEqual({ generationId: 'g1', status: 'QUEUED' });
  });

  it('retryAlternate goes through the owner-scoped method with user.id and body', async () => {
    serviceMock.retryWithAlternateModelForUser.mockResolvedValue({
      id: 'g2',
      status: 'QUEUED',
      provider: 'IMAGE_OPENAI',
      model: 'gpt-image-1',
    });
    const result = await controller.retryAlternate('g1', user as never, {
      provider: 'IMAGE_OPENAI',
      model: 'gpt-image-1',
    });
    expect(serviceMock.retryWithAlternateModelForUser).toHaveBeenCalledWith(
      'g1',
      'u1',
      'IMAGE_OPENAI',
      'gpt-image-1',
    );
    expect(serviceMock.retryWithAlternateModel).not.toHaveBeenCalled();
    expect(result.provider).toBe('IMAGE_OPENAI');
  });

  it('retryAlternate with an empty body lets the service pick the next model', async () => {
    serviceMock.retryWithAlternateModelForUser.mockResolvedValue({
      id: 'g2',
      status: 'QUEUED',
      provider: 'auto',
      model: 'auto',
    });
    await controller.retryAlternate('g1', user as never, {});
    expect(serviceMock.retryWithAlternateModelForUser).toHaveBeenCalledWith(
      'g1',
      'u1',
      undefined,
      undefined,
    );
  });

  it('a non-owner retry surfaces the service 404 unchanged', async () => {
    const notFound = new BusinessException(
      'Image generation not found',
      'IMAGE_NOT_FOUND',
      HttpStatus.NOT_FOUND,
    );
    serviceMock.retryGenerationForUser.mockRejectedValue(notFound);
    await expect(controller.retry('g1', user as never)).rejects.toBe(notFound);
  });

  it('events is not @Public and is guarded by ImageGenerationOwnerGuard', () => {
    const handler = Object.getOwnPropertyDescriptor(ImageGenerationController.prototype, 'events');
    const guards: unknown = Reflect.getMetadata(GUARDS_METADATA, handler?.value ?? {});
    expect(guards).toEqual([ImageGenerationOwnerGuard]);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler?.value ?? {})).toBeUndefined();
  });

  it('events subscribes via eventsService', () => {
    const obs = { subscribe: vi.fn() };
    eventsMock.subscribe.mockReturnValue(obs);
    expect(controller.events('g1')).toBe(obs);
    expect(eventsMock.subscribe).toHaveBeenCalledWith('g1');
  });
});

describe('InternalImageController', () => {
  let controller: InternalImageController;
  let serviceMock: ReturnType<typeof buildServiceMock>;
  let eventsMock: { subscribe: Mock };

  beforeEach(async () => {
    serviceMock = buildServiceMock();
    eventsMock = { subscribe: vi.fn() };
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
      provider: 'IMAGE_OPENAI',
      model: 'gpt-image-1',
    });
    const result = await controller.generate({ prompt: 'cat', userId: 'u1' } as never);
    expect(result).toEqual({
      generationId: 'g1',
      status: 'QUEUED',
      provider: 'IMAGE_OPENAI',
      model: 'gpt-image-1',
    });
  });

  it('the whole internal controller is guarded by ServiceTokenGuard', () => {
    const guards: unknown = Reflect.getMetadata(GUARDS_METADATA, InternalImageController);
    expect(guards).toEqual([ServiceTokenGuard]);
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
    const obs = { subscribe: vi.fn() };
    eventsMock.subscribe.mockReturnValue(obs);
    expect(controller.events('g1')).toBe(obs);
  });
});
