import { Test, type TestingModule } from '@nestjs/testing';
import { FilesController } from '../files.controller';
import { FilesService } from '../../services/files.service';

describe('FilesController', () => {
  let controller: FilesController;
  let serviceMock: jest.Mocked<{
    uploadFile: jest.Mock;
    getFiles: jest.Mock;
    getFile: jest.Mock;
    deleteFile: jest.Mock;
    downloadFile: jest.Mock;
    getChunks: jest.Mock;
  }>;

  beforeEach(async () => {
    serviceMock = {
      uploadFile: jest.fn(),
      getFiles: jest.fn(),
      getFile: jest.fn(),
      deleteFile: jest.fn(),
      downloadFile: jest.fn(),
      getChunks: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FilesController],
      providers: [{ provide: FilesService, useValue: serviceMock }],
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

  it('getChunks forwards id and user.id', async () => {
    serviceMock.getChunks.mockResolvedValue([{ id: 'c1' }]);
    await controller.getChunks('f1', user as never);
    expect(serviceMock.getChunks).toHaveBeenCalledWith('f1', 'u1');
  });
});
