import { IncomingMessage } from 'node:http';
import { Socket } from 'node:net';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { DeviceTokenClass, MobileDeviceScope } from '@claw/shared-types';
import { DeviceAccessGuard } from '../device-access.guard';
import { MobileRoute } from '../../decorators/mobile-route.decorator';
import { RequireScopes } from '../../decorators/require-scopes.decorator';
import { DeviceScope } from '../../enums/device-scope.enum';
import { useAgentTestConfig } from '../../testing/agent-test-env';
import { TokenService } from '../../../modules/agent/services/token.service';
import { RevocationCacheService } from '../../../modules/agent/services/revocation-cache.service';
import { DeviceRepository } from '../../../modules/agent/repositories/device.repository';
import type { AgentRequest, AgentScope } from '../../types/auth.types';
import type { Device } from '../../../generated/prisma';

class DesktopController {
  @RequireScopes(DeviceScope.SHELL_EXEC)
  withScope(): void {}

  noScopeDeclared(): void {}
}

@MobileRoute()
class PhoneController {
  @RequireScopes(MobileDeviceScope.RUNS_READ)
  read(): void {}

  @RequireScopes(MobileDeviceScope.RUNS_APPROVE)
  approve(): void {}

  forgotItsScope(): void {}
}

const tokens = new TokenService();

function device(overrides: Partial<Device>): Device {
  return {
    id: 'device-1',
    userId: 'user-1',
    orgId: null,
    name: 'Phone',
    hostname: 'phone',
    os: 'ios',
    platform: 'ios',
    agentVersion: '1.0.0',
    scopesCsv: 'runs:read,runs:approve',
    tokenClass: 'mobile',
    status: 'ACTIVE',
    lastSeenAt: null,
    lastIp: null,
    revokedAt: null,
    revokeReason: null,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function guardFor(row: Device | null, revoked = false): DeviceAccessGuard {
  return new DeviceAccessGuard(
    tokens,
    Object.assign(Object.create(DeviceRepository.prototype) as DeviceRepository, {
      findById: vi.fn().mockResolvedValue(row),
    }),
    Object.assign(Object.create(RevocationCacheService.prototype) as RevocationCacheService, {
      isJtiRevoked: vi.fn().mockResolvedValue(false),
      isDeviceRevoked: vi.fn().mockResolvedValue(revoked),
    }),
    new Reflector(),
  );
}

function bearer(tokenClass: DeviceTokenClass, scopes: AgentScope[]): string {
  return tokens.issuePair('user-1', 'device-1', scopes, null, tokenClass).pair.accessToken;
}

function contextFor(
  token: string | null,
  controller: new () => object,
  handler: string,
): { context: ExecutionContextHost; request: AgentRequest } {
  const request: AgentRequest = Object.assign(new IncomingMessage(new Socket()), {});
  if (token !== null) request.headers['authorization'] = `Bearer ${token}`;
  const fn = (controller.prototype as Record<string, () => void>)[handler] as () => void;
  return { context: new ExecutionContextHost([request, {}], controller, fn), request };
}

const READ = MobileDeviceScope.RUNS_READ;
const APPROVE = MobileDeviceScope.RUNS_APPROVE;

describe('DeviceAccessGuard mobile allow-list (F097)', () => {
  beforeAll(() => useAgentTestConfig());

  it('admits a mobile token on a mobile route and grants only the scopes it holds', async () => {
    const token = bearer(DeviceTokenClass.MOBILE, [READ, APPROVE]);
    const { context, request } = contextFor(token, PhoneController, 'read');
    await expect(guardFor(device({})).canActivate(context)).resolves.toBe(true);
    expect(request.deviceContext?.tokenClass).toBe(DeviceTokenClass.MOBILE);
    expect(request.deviceContext?.scopes).toEqual([READ, APPROVE]);
  });

  it('refuses a mobile token on a desktop route with a 403', async () => {
    const token = bearer(DeviceTokenClass.MOBILE, [READ]);
    for (const handler of ['withScope', 'noScopeDeclared']) {
      const { context } = contextFor(token, DesktopController, handler);
      await expect(guardFor(device({})).canActivate(context)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    }
  });

  it('refuses a desktop device token on a mobile route', async () => {
    const token = bearer(DeviceTokenClass.DEVICE, [DeviceScope.SHELL_EXEC]);
    const { context } = contextFor(token, PhoneController, 'read');
    await expect(
      guardFor(device({ tokenClass: 'device', scopesCsv: 'shell:exec' })).canActivate(context),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('still admits a desktop token on a desktop route, unchanged', async () => {
    const token = bearer(DeviceTokenClass.DEVICE, [DeviceScope.SHELL_EXEC]);
    const { context, request } = contextFor(token, DesktopController, 'withScope');
    await expect(
      guardFor(device({ tokenClass: 'device', scopesCsv: 'shell:exec' })).canActivate(context),
    ).resolves.toBe(true);
    expect(request.deviceContext?.scopes).toEqual(['shell:exec']);
  });

  it('closes a mobile route that forgot to name its scope', async () => {
    const token = bearer(DeviceTokenClass.MOBILE, [READ]);
    const { context } = contextFor(token, PhoneController, 'forgotItsScope');
    await expect(guardFor(device({})).canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('drops a scope the device row no longer holds, at once', async () => {
    const token = bearer(DeviceTokenClass.MOBILE, [READ, APPROVE]);
    const { context, request } = contextFor(token, PhoneController, 'approve');
    await guardFor(device({ scopesCsv: 'runs:read' })).canActivate(context);
    expect(request.deviceContext?.scopes).toEqual([READ]);
  });

  it('never carries a non-mobile scope in a mobile context, even if the token lists one', async () => {
    const token = bearer(DeviceTokenClass.MOBILE, [READ, DeviceScope.SHELL_EXEC]);
    const { context, request } = contextFor(token, PhoneController, 'read');
    await guardFor(device({ scopesCsv: 'runs:read,shell:exec' })).canActivate(context);
    expect(request.deviceContext?.scopes).toEqual([READ]);
  });

  it('refuses when the token class and the device row disagree, or the row class is unknown', async () => {
    const mobileToken = bearer(DeviceTokenClass.MOBILE, [READ]);
    const a = contextFor(mobileToken, PhoneController, 'read');
    await expect(
      guardFor(device({ tokenClass: 'device' })).canActivate(a.context),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    const b = contextFor(mobileToken, PhoneController, 'read');
    await expect(
      guardFor(device({ tokenClass: 'admin' })).canActivate(b.context),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('refuses a revoked device, a missing device and a missing bearer', async () => {
    const token = bearer(DeviceTokenClass.MOBILE, [READ]);
    await expect(
      guardFor(device({}), true).canActivate(contextFor(token, PhoneController, 'read').context),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      guardFor(device({ status: 'REVOKED' })).canActivate(
        contextFor(token, PhoneController, 'read').context,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      guardFor(null).canActivate(contextFor(token, PhoneController, 'read').context),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      guardFor(device({})).canActivate(contextFor(null, PhoneController, 'read').context),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
