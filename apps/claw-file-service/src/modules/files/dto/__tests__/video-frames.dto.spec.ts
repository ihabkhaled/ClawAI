// Multimodal batch 7 — the frames endpoint body, and the guard on its route.

import 'reflect-metadata';
import { describe, expect, it, vi } from 'vitest';
import { type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { videoFramesSchema } from '../video-frames.dto';
import { FilesInternalController } from '../../controllers/files-internal.controller';
import { ServiceTokenGuard } from '../../../../app/guards/service-token.guard';

vi.mock('../../../../app/config/app.config', () => ({
  AppConfig: {
    get: vi.fn(() => ({ INTER_SERVICE_AUTH_TOKEN: 'service-secret-token-0000000000' })),
  },
}));

describe('videoFramesSchema', () => {
  it('accepts 1..8 integer timestamps and an owner', () => {
    expect(videoFramesSchema.safeParse({ userId: 'u1', timestampsMs: [0] }).success).toBe(true);
    expect(
      videoFramesSchema.safeParse({ userId: 'u1', timestampsMs: [0, 1, 2, 3, 4, 5, 6, 7] }).success,
    ).toBe(true);
  });

  it.each([
    ['zero timestamps', { userId: 'u1', timestampsMs: [] }],
    ['nine timestamps', { userId: 'u1', timestampsMs: [0, 1, 2, 3, 4, 5, 6, 7, 8] }],
    ['a negative timestamp', { userId: 'u1', timestampsMs: [-1] }],
    ['a fractional timestamp', { userId: 'u1', timestampsMs: [1.5] }],
    ['a string timestamp', { userId: 'u1', timestampsMs: ['1000'] }],
    ['past the global duration cap', { userId: 'u1', timestampsMs: [30 * 60 * 1000 + 1] }],
    ['no owner', { timestampsMs: [0] }],
    ['an empty owner', { userId: '', timestampsMs: [0] }],
    ['an unknown key', { userId: 'u1', timestampsMs: [0], path: '/etc/passwd' }],
  ])('rejects %s', (_label, body) => {
    expect(videoFramesSchema.safeParse(body).success).toBe(false);
  });
});

describe('POST /internal/files/:id/video-frames guard', () => {
  const contextWith = (authorization?: string): ExecutionContext =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ headers: { authorization } }) }),
    }) as unknown as ExecutionContext;

  it('is guarded by the service token', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      FilesInternalController.prototype.getVideoFrames,
    ) as unknown[];
    expect(guards).toContain(ServiceTokenGuard);
  });

  it('401s without a token, and with the wrong one', () => {
    const guard = new ServiceTokenGuard();
    expect(() => guard.canActivate(contextWith())).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(contextWith('Bearer user-jwt'))).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(contextWith('Service wrong-token-000000000000000'))).toThrow(
      UnauthorizedException,
    );
    expect(guard.canActivate(contextWith('Service service-secret-token-0000000000'))).toBe(true);
  });
});
