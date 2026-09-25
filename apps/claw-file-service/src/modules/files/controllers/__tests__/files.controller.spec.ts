import { type Mock, vi } from 'vitest';
import { HttpStatus, RequestMethod } from '@nestjs/common';
import { HTTP_CODE_METADATA, METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { Test, type TestingModule } from '@nestjs/testing';
import { FilesController } from '../files.controller';
import { FilesService } from '../../services/files.service';
import { VideoCancellationService } from '../../services/video-cancellation.service';

describe('FilesController', () => {
  let controller: FilesController;
  let serviceMock: {
    uploadFile: Mock;
    getFiles: Mock;
    getFile: Mock;
    deleteFile: Mock;
    downloadFile: Mock;
    getChunks: Mock;
  };
  let cancelMock: { cancelProcessing: Mock };

  beforeEach(async () => {
    serviceMock = {
      uploadFile: vi.fn(),
      getFiles: vi.fn(),
      getFile: vi.fn(),
      deleteFile: vi.fn(),
      downloadFile: vi.fn(),
      getChunks: vi.fn(),
    };
    cancelMock = { cancelProcessing: vi.fn() };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FilesController],
      providers: [
        { provide: FilesService, useValue: serviceMock },
        { provide: VideoCancellationService, useValue: cancelMock },
      ],
    }).compile();
    controller = module.get<FilesController>(FilesController);
  });

  const user = { id: 'u1', email: 'a@b', role: 'OPERATOR' };

  it('upload forwards user.id and dto', async () => {
    serviceMock.uploadFile.mockResolvedValue({ id: 'f1' });
    await controller.upload(user as never, { filename: 'a.pdf', content: 'YQ==' } as never);
    expect(serviceMock.uploadFile).toHaveBeenCalledWith('u1', {
      filename: 'a.pdf',
      content: 'YQ==',
    });
  });

  it('findAll forwards user.id and query', async () => {
    serviceMock.getFiles.mockResolvedValue({ data: [], meta: {} });
    await controller.findAll(user as never, { page: 1, limit: 20 } as never);
    expect(serviceMock.getFiles).toHaveBeenCalledWith('u1', { page: 1, limit: 20 });
  });

  it('findOne forwards id and user.id', async () => {
    await controller.findOne('f1', user as never);
    expect(serviceMock.getFile).toHaveBeenCalledWith('f1', 'u1');
  });

  it('remove forwards id and user.id', async () => {
    await controller.remove('f1', user as never);
    expect(serviceMock.deleteFile).toHaveBeenCalledWith('f1', 'u1');
  });

  it('download forwards id, user.id, and response', async () => {
    const res = {} as never;
    await controller.download('f1', user as never, res);
    expect(serviceMock.downloadFile).toHaveBeenCalledWith('f1', 'u1', res);
  });

  describe('POST files/:id/processing/cancel (pack section 72)', () => {
    it('is POST :id/processing/cancel under /files, answering 200 (not 201)', () => {
      const handler = Object.getOwnPropertyDescriptor(FilesController.prototype, 'cancelProcessing')
        ?.value as object;
      expect(Reflect.getMetadata(PATH_METADATA, FilesController)).toBe('files');
      expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(':id/processing/cancel');
      expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(RequestMethod.POST);
      expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler)).toBe(HttpStatus.OK);
    });

    it('forwards id and user.id and returns { fileId, ingestionStatus, cancelled } as-is', async () => {
      const body = { fileId: 'f1', ingestionStatus: 'FAILED', cancelled: true };
      cancelMock.cancelProcessing.mockResolvedValue(body);
      await expect(controller.cancelProcessing('f1', user as never)).resolves.toEqual(body);
      expect(cancelMock.cancelProcessing).toHaveBeenCalledWith('f1', 'u1');
      expect(Object.keys(body).sort()).toEqual(['cancelled', 'fileId', 'ingestionStatus']);
    });
  });

  it('getChunks forwards id and user.id', async () => {
    serviceMock.getChunks.mockResolvedValue([{ id: 'c1' }]);
    await controller.getChunks('f1', user as never);
    expect(serviceMock.getChunks).toHaveBeenCalledWith('f1', 'u1');
  });
});
