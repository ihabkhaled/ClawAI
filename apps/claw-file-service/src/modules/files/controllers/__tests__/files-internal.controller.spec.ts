import { Test, type TestingModule } from '@nestjs/testing';
import { FilesInternalController } from '../files-internal.controller';
import { FileChunksRepository } from '../../repositories/file-chunks.repository';
import { FilesRepository } from '../../repositories/files.repository';
import { FilesService } from '../../services/files.service';

describe('FilesInternalController', () => {
  let controller: FilesInternalController;
  let chunksMock: jest.Mocked<{ findByFileId: jest.Mock }>;
  let filesRepoMock: jest.Mocked<{ findById: jest.Mock }>;
  let serviceMock: jest.Mocked<{ downloadFilePublic: jest.Mock; storeImage: jest.Mock }>;

  beforeEach(async () => {
    chunksMock = { findByFileId: jest.fn() };
    filesRepoMock = { findById: jest.fn() };
    serviceMock = { downloadFilePublic: jest.fn(), storeImage: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FilesInternalController],
      providers: [
        { provide: FileChunksRepository, useValue: chunksMock },
        { provide: FilesRepository, useValue: filesRepoMock },
        { provide: FilesService, useValue: serviceMock },
      ],
    }).compile();
    controller = module.get<FilesInternalController>(FilesInternalController);
  });

  it('getChunks delegates to FileChunksRepository.findByFileId', async () => {
    chunksMock.findByFileId.mockResolvedValue([{ id: 'c1' }]);
    const result = await controller.getChunks('f1');
    expect(chunksMock.findByFileId).toHaveBeenCalledWith('f1');
    expect(result).toEqual([{ id: 'c1' }]);
  });

  it('getContent returns file metadata + content when found', async () => {
    filesRepoMock.findById.mockResolvedValue({
      id: 'f1',
      filename: 'a.pdf',
      mimeType: 'application/pdf',
      content: 'hello',
    });
    const result = await controller.getContent('f1');
    expect(result).toEqual({
      id: 'f1',
      filename: 'a.pdf',
      mimeType: 'application/pdf',
      content: 'hello',
    });
  });

  it('getContent returns empty stub when not found', async () => {
    filesRepoMock.findById.mockResolvedValue(null);
    const result = await controller.getContent('missing');
    expect(result).toEqual({ id: 'missing', filename: '', mimeType: '', content: null });
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
