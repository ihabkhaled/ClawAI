import { type Mock, vi } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import { FilesInternalController } from '../files-internal.controller';
import { FileChunksRepository } from '../../repositories/file-chunks.repository';
import { FilesRepository } from '../../repositories/files.repository';
import { FilesService } from '../../services/files.service';
import { VideoFramesService } from '../../services/video-frames.service';

describe('FilesInternalController', () => {
  let controller: FilesInternalController;
  let chunksMock: { findByFileId: Mock };
  let filesRepoMock: { findById: Mock };
  let serviceMock: {
    downloadFilePublic: Mock;
    getFileContent: Mock;
    storeImage: Mock;
    deleteFile: Mock;
  };

  beforeEach(async () => {
    chunksMock = { findByFileId: vi.fn() };
    filesRepoMock = { findById: vi.fn() };
    serviceMock = {
      downloadFilePublic: vi.fn(),
      getFileContent: vi.fn(),
      storeImage: vi.fn(),
      deleteFile: vi.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FilesInternalController],
      providers: [
        { provide: FileChunksRepository, useValue: chunksMock },
        { provide: FilesRepository, useValue: filesRepoMock },
        { provide: FilesService, useValue: serviceMock },
        { provide: VideoFramesService, useValue: { getFrames: vi.fn() } },
      ],
    }).compile();
    controller = module.get<FilesInternalController>(FilesInternalController);
  });

  // file-generation expires generated files after an hour through this; the
  // owner check stays in FilesService.deleteFile, so a service can only
  // delete a file for the user it names.
  it('deleteInternal deletes as the named owner', async () => {
    serviceMock.deleteFile.mockResolvedValue({ id: 'f1' });
    await expect(
      controller.deleteInternal('f1', { userId: 'u1' } as never),
    ).resolves.toBeUndefined();
    expect(serviceMock.deleteFile).toHaveBeenCalledWith('f1', 'u1');
  });

  it("deleteInternal surfaces the service's ownership refusal", async () => {
    serviceMock.deleteFile.mockRejectedValue(new Error('Forbidden'));
    await expect(controller.deleteInternal('f1', { userId: 'u2' } as never)).rejects.toThrow(
      'Forbidden',
    );
  });

  it('getChunks delegates to FileChunksRepository.findByFileId', async () => {
    chunksMock.findByFileId.mockResolvedValue([{ id: 'c1' }]);
    const result = await controller.getChunks('f1');
    expect(chunksMock.findByFileId).toHaveBeenCalledWith('f1');
    expect(result).toEqual([{ id: 'c1' }]);
  });

  it('getContent delegates ownership enforcement to FilesService', async () => {
    serviceMock.getFileContent.mockResolvedValue({
      id: 'f1',
      filename: 'a.pdf',
      mimeType: 'application/pdf',
      content: 'hello',
    });
    const result = await controller.getContent('f1', { userId: 'user-1' });

    expect(serviceMock.getFileContent).toHaveBeenCalledWith('f1', 'user-1', {
      includeContent: true,
    });
    expect(filesRepoMock.findById).not.toHaveBeenCalled();
    expect(result).toEqual({
      id: 'f1',
      filename: 'a.pdf',
      mimeType: 'application/pdf',
      content: 'hello',
    });
  });

  it('getContent leaves the bytes out when the caller asks for text only', async () => {
    serviceMock.getFileContent.mockResolvedValue({ id: 'f1', content: null });
    await controller.getContent('f1', { userId: 'user-1', includeContent: 'false' });

    expect(serviceMock.getFileContent).toHaveBeenCalledWith('f1', 'user-1', {
      includeContent: false,
    });
  });

  it('download delegates to FilesService.downloadFilePublic', async () => {
    const res = {} as never;
    await controller.download('f1', res);
    expect(serviceMock.downloadFilePublic).toHaveBeenCalledWith('f1', res);
  });

  it('storeImage delegates to FilesService.storeImage', async () => {
    serviceMock.storeImage.mockResolvedValue({ fileId: 'f1' });
    const body = { userId: 'u1', filename: 'a.png', mimeType: 'image/png', base64Data: 'AAAA' };
    const result = await controller.storeImage(body);
    expect(serviceMock.storeImage).toHaveBeenCalledWith(body);
    expect(result).toEqual({ fileId: 'f1' });
  });
});
