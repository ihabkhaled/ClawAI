import { GUARDS_METADATA } from '@nestjs/common/constants';
import { describe, expect, it } from 'vitest';

import { IS_PUBLIC_KEY } from '../../../../app/decorators/public.decorator';
import { ServiceTokenGuard } from '../../../../app/guards/service-token.guard';
import { ThreadSnapshotInternalController } from '../thread-snapshot-internal.controller';

describe('ThreadSnapshotInternalController', () => {
  it('bypasses user JWT auth only for the route, then requires the service-token guard', () => {
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, ThreadSnapshotInternalController)).toBe(true);
    expect(Reflect.getMetadata(GUARDS_METADATA, ThreadSnapshotInternalController)).toContain(
      ServiceTokenGuard,
    );
  });
});
