import { HttpStatus, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import helmet from 'helmet';
import { vi } from 'vitest';
import { BusinessException } from '../../../../common/errors';
import { ArtifactErrorCode } from '../../enums/artifact-error-code.enum';
import { ArtifactsService } from '../../services/artifacts.service';
import { PublicArtifactsController } from '../public-artifacts.controller';

/**
 * Real HTTP through Nest + express + helmet (as main.ts mounts it), so the
 * headers asserted are the headers a browser receives, not decorator metadata.
 */
describe('PublicArtifactsController (HTTP)', () => {
  let app: INestApplication;
  let baseUrl: string;
  const service = { readPublic: vi.fn() };
  const publicId = 'A'.repeat(32);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [PublicArtifactsController],
      providers: [{ provide: ArtifactsService, useValue: service }],
    }).compile();
    app = moduleRef.createNestApplication();
    app.use(helmet());
    app.setGlobalPrefix('api/v1');
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('serves stored HTML as inert text/plain with no-script headers', async () => {
    service.readPublic.mockResolvedValue('<script>alert(1)</script>');

    const response = await fetch(`${baseUrl}/api/v1/public/artifacts/${publicId}`);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('<script>alert(1)</script>');
    expect(response.headers.get('content-type')).toBe('text/plain; charset=utf-8');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('content-security-policy')).toBe(
      "default-src 'none'; sandbox; frame-ancestors 'none'",
    );
    expect(response.headers.get('x-frame-options')).toBe('DENY');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('referrer-policy')).toBe('no-referrer');
    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow, noarchive');
    expect(service.readPublic).toHaveBeenCalledWith(publicId);
  });

  it('answers 404 for an unknown public id', async () => {
    service.readPublic.mockRejectedValue(
      new BusinessException(
        'Artifact not found',
        ArtifactErrorCode.NOT_FOUND,
        HttpStatus.NOT_FOUND,
      ),
    );
    const response = await fetch(`${baseUrl}/api/v1/public/artifacts/${publicId}`);
    expect(response.status).toBe(404);
  });

  it('rejects a malformed public id before any lookup', async () => {
    const response = await fetch(`${baseUrl}/api/v1/public/artifacts/short`);
    expect(response.status).toBe(400);
    expect(service.readPublic).not.toHaveBeenCalled();
  });

  it('has no write verbs', async () => {
    const response = await fetch(`${baseUrl}/api/v1/public/artifacts/${publicId}`, {
      method: 'DELETE',
    });
    expect(response.status).toBe(404);
  });
});
