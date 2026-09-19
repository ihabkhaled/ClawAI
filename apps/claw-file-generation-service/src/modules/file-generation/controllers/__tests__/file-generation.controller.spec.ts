import { of } from 'rxjs';
import { type Mock, vi } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import { FileGenerationController } from '../file-generation.controller';
import { InternalFileGenerationController } from '../internal-file-generation.controller';
import { FileGenerationService } from '../../services/file-generation.service';
import { FileGenerationEventsService } from '../../services/file-generation-events.service';

describe('FileGenerationController', () => {
  let controller: FileGenerationController;
  let serviceMock: {
    listByUser: Mock;
    getByIdForUser: Mock;
    retryGeneration: Mock;
    retryGenerationForUser: Mock;
  };
  let eventsMock: { subscribe: Mock };

  beforeEach(async () => {
    serviceMock = {
      listByUser: vi.fn(),
      getByIdForUser: vi.fn(),
      retryGeneration: vi.fn(),
      retryGenerationForUser: vi.fn(),
    };
    eventsMock = { subscribe: vi.fn() };
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

  // Owner-scoped: retry used to take any id (IDOR).
  it('retry is scoped to the calling user', async () => {
    serviceMock.retryGenerationForUser.mockResolvedValue({ id: 'gen-1', status: 'QUEUED' });
    const result = await controller.retry('gen-1', user as never);
    expect(serviceMock.retryGenerationForUser).toHaveBeenCalledWith('gen-1', 'u1');
    expect(serviceMock.retryGeneration).not.toHaveBeenCalled();
    expect(result).toEqual({ generationId: 'gen-1', status: 'QUEUED' });
  });

  // Ownership is enforced by FileGenerationOwnerGuard before the stream opens.
  it('events streams the generation once the guard has admitted the owner', () => {
    const obs = of({ data: { status: 'DONE' } });
    eventsMock.subscribe.mockReturnValue(obs);
    expect(controller.events('gen-1')).toBe(obs);
    expect(eventsMock.subscribe).toHaveBeenCalledWith('gen-1');
  });
});

describe('InternalFileGenerationController', () => {
  let controller: InternalFileGenerationController;
  let serviceMock: {
    enqueueGeneration: Mock;
    getById: Mock;
    retryGeneration: Mock;
  };
  let eventsMock: { subscribe: Mock };

  beforeEach(async () => {
    serviceMock = {
      enqueueGeneration: vi.fn(),
      getById: vi.fn(),
      retryGeneration: vi.fn(),
    };
    eventsMock = { subscribe: vi.fn() };
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
    eventsMock.subscribe.mockReturnValue({ subscribe: vi.fn() });
    controller.events('g1');
    expect(eventsMock.subscribe).toHaveBeenCalledWith('g1');
  });
});
