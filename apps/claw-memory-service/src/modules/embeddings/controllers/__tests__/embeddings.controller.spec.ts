import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';

import { ServiceTokenGuard } from '../../../../app/guards/service-token.guard';
import { EmbeddingsController } from '../embeddings.controller';

describe('EmbeddingsController (security audit 2026-11-27)', () => {
  it('requires the service token on every route: the body carries a userId', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, EmbeddingsController) as unknown[];
    expect(guards).toContain(ServiceTokenGuard);
  });
});
