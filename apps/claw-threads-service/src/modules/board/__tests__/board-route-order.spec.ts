import 'reflect-metadata';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PATH_METADATA } from '@nestjs/common/constants';

import { PublicationsModule } from '../../publications/publications.module';
import { BoardModule } from '../board.module';
import { PublicationOwnerController } from '../../publications/controllers/publication-owner.controller';
import { PublicationRecommendedTeamController } from '../../publications/controllers/publication-recommended-team.controller';

describe('guest Board route order', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('registers BoardModule before PublicationsModule so public/board is not read as a slug', async () => {
    vi.stubEnv('JWT_SECRET', 'x'.repeat(32));
    vi.stubEnv('THREADS_SERVICE_PORT', '4019');
    vi.stubEnv('THREADS_DATABASE_URL', 'postgresql://localhost:5432/claw_threads');
    vi.stubEnv('AUTH_SERVICE_URL', 'https://auth-service:4001');
    vi.stubEnv('THREAD_GENERATION_SERVICE_URL', 'https://thread-generation-service:4020');
    vi.stubEnv('INTER_SERVICE_AUTH_TOKEN', 'x'.repeat(32));
    vi.stubEnv('RABBITMQ_URL', 'amqp://rabbitmq:5672');
    const { AppModule } = await import('../../../app/app.module');
    const imports = Reflect.getMetadata('imports', AppModule) as unknown[];
    expect(imports.indexOf(BoardModule)).toBeGreaterThan(-1);
    expect(imports.indexOf(BoardModule)).toBeLessThan(imports.indexOf(PublicationsModule));
  });

  it('registers the recommended-team route once and nothing shadows it', () => {
    const controllers = Reflect.getMetadata('controllers', PublicationsModule) as unknown[];
    expect(controllers.filter((c) => c === PublicationRecommendedTeamController)).toHaveLength(1);
    const prefixes = controllers.map((c) =>
      String(Reflect.getMetadata(PATH_METADATA, c as object)),
    );
    expect(prefixes.filter((p) => p === 'thread-publications/recommended-team')).toHaveLength(1);
    // The owner controller owns `thread-publications/:publicationId`; it must not answer a bare GET.
    const ownerGetRoot = Object.getOwnPropertyNames(PublicationOwnerController.prototype).some(
      (name) =>
        name !== 'constructor' &&
        Reflect.getMetadata(
          'method',
          PublicationOwnerController.prototype[name as 'constructor'],
        ) === 0 &&
        Reflect.getMetadata(
          PATH_METADATA,
          PublicationOwnerController.prototype[name as 'constructor'],
        ) === '/',
    );
    expect(ownerGetRoot).toBe(false);
  });
});
