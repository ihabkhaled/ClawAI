vi.mock('@myriaddreamin/typst-ts-node-compiler', () => ({ NodeCompiler: { create: vi.fn() } }));
import { of } from 'rxjs';
import { type Mock, vi } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import { FileGenerationController } from '../file-generation.controller';
import { InternalFileGenerationController } from '../internal-file-generation.controller';
import { FileGenerationService } from '../../services/file-generation.service';
import { FileGenerationEventsService } from '../../services/file-generation-events.service';
import { PdfRenderService } from '../../services/pdf-render.service';

describe('FileGenerationController', () => {
  let controller: FileGenerationController;
  let serviceMock: {
    listByUser: Mock;
    getByIdForUser: Mock;
    getViewForUser: Mock;
    retryGeneration: Mock;
    retryGenerationForUser: Mock;
    openAssetForUser: Mock;
    rebuildForUser: Mock;
    exportForUser: Mock;
  };
  let eventsMock: { subscribe: Mock };

  beforeEach(async () => {
    serviceMock = {
      listByUser: vi.fn(),
      getByIdForUser: vi.fn(),
      getViewForUser: vi.fn(),
      retryGeneration: vi.fn(),
      retryGenerationForUser: vi.fn(),
      openAssetForUser: vi.fn(),
      rebuildForUser: vi.fn(),
      exportForUser: vi.fn(),
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
    // The user-facing read is the view without storage keys.
    expect(serviceMock.getViewForUser).toHaveBeenCalledWith('gen-1', 'u1');
  });

  // Owner-scoped: retry used to take any id (IDOR).
  it('retry is scoped to the calling user', async () => {
    serviceMock.retryGenerationForUser.mockResolvedValue({ id: 'gen-1', status: 'QUEUED' });
    const result = await controller.retry('gen-1', user as never);
    expect(serviceMock.retryGenerationForUser).toHaveBeenCalledWith('gen-1', 'u1');
    expect(serviceMock.retryGeneration).not.toHaveBeenCalled();
    expect(result).toEqual({ generationId: 'gen-1', status: 'QUEUED' });
  });

  // The browser sees an asset path, never a storage id; the response must not
  // be cached by anything shared and must not be sniffed into another type.
  it('download streams the file with attachment, no-store and nosniff headers', async () => {
    const pipe = vi.fn();
    serviceMock.openAssetForUser.mockResolvedValue({
      stream: { pipe },
      mimeType: 'application/pdf',
      filename: 'Report.pdf',
      unicodeFilename: 'تقرير الربع.pdf',
      sizeBytes: 10,
    });
    const headers: Record<string, string> = {};
    const res = { setHeader: (k: string, v: string) => (headers[k] = v) };

    await controller.download('gen-1', 'asset-1', user as never, res as never);

    expect(serviceMock.openAssetForUser).toHaveBeenCalledWith('gen-1', 'asset-1', 'u1');
    expect(headers).toEqual({
      'Content-Type': 'application/pdf',
      // RFC 5987: the Arabic name survives, beside an ASCII fallback.
      'Content-Disposition':
        'attachment; filename="Report.pdf"; filename*=UTF-8\'\'%D8%AA%D9%82%D8%B1%D9%8A%D8%B1%20%D8%A7%D9%84%D8%B1%D8%A8%D8%B9.pdf',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    expect(pipe).toHaveBeenCalledWith(res);
  });

  it('export queues the text for the calling user', async () => {
    serviceMock.exportForUser.mockResolvedValue({ id: 'g9', status: 'QUEUED' });
    await expect(
      controller.export(user as never, { content: 'x', format: 'PDF' } as never),
    ).resolves.toEqual({ generationId: 'g9', status: 'QUEUED' });
    expect(serviceMock.exportForUser).toHaveBeenCalledWith('u1', { content: 'x', format: 'PDF' });
  });

  it('rebuild is scoped to the calling user', async () => {
    serviceMock.rebuildForUser.mockResolvedValue({ id: 'gen-1', status: 'QUEUED' });
    await expect(controller.rebuild('gen-1', user as never)).resolves.toEqual({
      generationId: 'gen-1',
      status: 'QUEUED',
    });
    expect(serviceMock.rebuildForUser).toHaveBeenCalledWith('gen-1', 'u1');
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
  let pdfMock: { render: Mock };

  beforeEach(async () => {
    serviceMock = {
      enqueueGeneration: vi.fn(),
      getById: vi.fn(),
      retryGeneration: vi.fn(),
    };
    eventsMock = { subscribe: vi.fn() };
    pdfMock = { render: vi.fn().mockReturnValue(Buffer.from('%PDF-1.7')) };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InternalFileGenerationController],
      providers: [
        { provide: FileGenerationService, useValue: serviceMock },
        { provide: FileGenerationEventsService, useValue: eventsMock },
        { provide: PdfRenderService, useValue: pdfMock },
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

  it('render-pdf streams the rendered bytes with no-store and stores nothing', () => {
    const response = { setHeader: vi.fn(), send: vi.fn() };
    controller.renderPdf({ content: '# History', title: 'Keynote' }, response as never);
    expect(pdfMock.render).toHaveBeenCalledWith('# History', 'Keynote');
    expect(response.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    expect(response.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store');
    expect(response.send).toHaveBeenCalledWith(Buffer.from('%PDF-1.7'));
    expect(serviceMock.enqueueGeneration).not.toHaveBeenCalled();
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
