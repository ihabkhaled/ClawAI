import 'reflect-metadata';
import { vi } from 'vitest';
import { HTTP_CODE_METADATA, METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { type ExecutionContext, RequestMethod } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';

import { RolesGuard } from '../../../../app/guards/roles.guard';
import { UserRole } from '../../../../common/enums';
import { type AuthenticatedUser } from '../../../../common/types';
import { providerBreakerParamsSchema } from '../../dto/provider-breaker-params.dto';
import { ProviderBreakerReason } from '../../enums/provider-breaker-reason.enum';
import { ProviderBreakerSource } from '../../enums/provider-breaker-source.enum';
import { ProviderCircuitBreakerManager } from '../../managers/provider-circuit-breaker.manager';
import { ProviderBreakerAdminService } from '../../services/provider-breaker-admin.service';
import { ProviderBreakerAdminController } from '../provider-breaker-admin.controller';

const userWithRole = (role: UserRole): AuthenticatedUser => ({
  id: `user-${role}`,
  email: `${role.toLowerCase()}@claw.local`,
  role,
});

function contextFor(
  user: AuthenticatedUser | undefined,
  handler: (...args: never[]) => unknown,
): ExecutionContext {
  return new ExecutionContextHost([{ user }], ProviderBreakerAdminController, handler);
}

// Contract: GET lists the skipped providers {source, providers[]}; DELETE
// :provider clears one and answers 200 {provider, cleared}. ADMIN only.
describe('ProviderBreakerAdminController (ADR-125 addendum)', () => {
  const controller = new ProviderBreakerAdminController(
    new ProviderBreakerAdminService(new ProviderCircuitBreakerManager()),
  );

  beforeEach(() => {
    ProviderCircuitBreakerManager.resetAll();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-25T10:00:00.000Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('GET answers the documented shape', async () => {
    await new ProviderCircuitBreakerManager().recordOutcome('OPENAI', true);
    await expect(controller.list()).resolves.toEqual({
      source: ProviderBreakerSource.MEMORY,
      providers: [
        {
          provider: 'OPENAI',
          reason: ProviderBreakerReason.ACCOUNT_CREDIT_EXHAUSTED,
          skippedUntil: '2026-09-25T10:10:00.000Z',
          trippedAt: '2026-09-25T10:00:00.000Z',
          probing: false,
        },
      ],
    });
  });

  it('DELETE clears the breaker so the provider is called again', async () => {
    const breaker = new ProviderCircuitBreakerManager();
    await breaker.recordOutcome('OPENAI', true);
    await expect(
      controller.clear({ provider: 'OPENAI' }, userWithRole(UserRole.ADMIN)),
    ).resolves.toEqual({ provider: 'OPENAI', cleared: true });
    await expect(breaker.allowsCall('OPENAI')).resolves.toBe(true);
    await expect(controller.list()).resolves.toEqual({
      source: ProviderBreakerSource.MEMORY,
      providers: [],
    });
  });

  it('mounts GET / and DELETE :provider (200) under chat-messages/admin/provider-breakers', () => {
    const proto = ProviderBreakerAdminController.prototype;
    expect(Reflect.getMetadata(PATH_METADATA, ProviderBreakerAdminController)).toBe(
      'chat-messages/admin/provider-breakers',
    );
    expect(Reflect.getMetadata(METHOD_METADATA, proto.list)).toBe(RequestMethod.GET);
    expect(Reflect.getMetadata(METHOD_METADATA, proto.clear)).toBe(RequestMethod.DELETE);
    expect(Reflect.getMetadata(PATH_METADATA, proto.clear)).toBe(':provider');
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, proto.clear)).toBe(200);
  });

  it.each([
    [UserRole.ADMIN, true],
    [UserRole.OPERATOR, false],
    [UserRole.VIEWER, false],
  ])('RBAC: %s → allowed=%s on both routes', (role, allowed) => {
    const guard = new RolesGuard(new Reflector());
    const proto = ProviderBreakerAdminController.prototype;
    expect(guard.canActivate(contextFor(userWithRole(role), proto.list))).toBe(allowed);
    expect(guard.canActivate(contextFor(userWithRole(role), proto.clear))).toBe(allowed);
  });

  it('RBAC: an anonymous request is refused', () => {
    const guard = new RolesGuard(new Reflector());
    expect(
      guard.canActivate(contextFor(undefined, ProviderBreakerAdminController.prototype.list)),
    ).toBe(false);
  });

  it.each(['OPENAI', 'OLLAMA_CLOUD', 'x-ai.v2'])('accepts provider %s', (provider) => {
    expect(providerBreakerParamsSchema.safeParse({ provider }).success).toBe(true);
  });

  it.each(['', 'OPEN AI', 'a:b', '*', 'x'.repeat(65)])('refuses provider %j', (provider) => {
    expect(providerBreakerParamsSchema.safeParse({ provider }).success).toBe(false);
  });
});
