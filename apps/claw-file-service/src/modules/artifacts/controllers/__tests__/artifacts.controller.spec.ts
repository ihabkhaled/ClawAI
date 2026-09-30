import { Test } from '@nestjs/testing';
import { vi } from 'vitest';
import { UserRole } from '../../../../common/enums';
import { ArtifactsService } from '../../services/artifacts.service';
import { ArtifactsController } from '../artifacts.controller';

const user = { id: 'user_1', email: 'u@claw.local', role: UserRole.VIEWER };

describe('ArtifactsController', () => {
  let controller: ArtifactsController;
  const service = { publish: vi.fn(), list: vi.fn(), remove: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [ArtifactsController],
      providers: [{ provide: ArtifactsService, useValue: service }],
    }).compile();
    controller = moduleRef.get(ArtifactsController);
  });

  const dto = {
    filename: 'a.md',
    mimeType: 'text/markdown' as const,
    content: 'x',
    sha256: 'f'.repeat(64),
  };

  it('publishes for the caller with zero retention off when the header is absent', async () => {
    service.publish.mockResolvedValue({ id: 'art_1', url: 'https://claw.local/x' });
    await expect(controller.publish(user, undefined, dto)).resolves.toEqual({
      id: 'art_1',
      url: 'https://claw.local/x',
    });
    expect(service.publish).toHaveBeenCalledWith('user_1', dto, false);
  });

  it('passes zero retention through when the extension sends the header', async () => {
    await controller.publish(user, '1', dto);
    expect(service.publish).toHaveBeenCalledWith('user_1', dto, true);
  });

  it('lists the caller artifacts with the parsed page', async () => {
    service.list.mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
    });
    await controller.list(user, { page: 1, limit: 20 });
    expect(service.list).toHaveBeenCalledWith('user_1', 1, 20);
  });

  it('deletes scoped to the caller', async () => {
    service.remove.mockResolvedValue(undefined);
    await expect(controller.remove(user, { id: 'art_1' })).resolves.toBeUndefined();
    expect(service.remove).toHaveBeenCalledWith('user_1', 'art_1');
  });
});
