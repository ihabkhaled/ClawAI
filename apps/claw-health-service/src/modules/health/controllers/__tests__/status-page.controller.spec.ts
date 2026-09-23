import { vi } from 'vitest';
import { type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { GUARDS_METADATA, HEADERS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { AuthGuard, ROLES_KEY, RolesGuard, SessionRevocationGuard } from '@claw/shared-auth';
import { UserRole } from '@claw/shared-types';

import { STATUS_CACHE_CONTROL } from '../../constants/status-page.constants';
import { ComponentState } from '../../enums/component-state.enum';
import { StatusPageService } from '../../services/status-page.service';
import { type StatusPageResponse } from '../../types/status-page.types';
import { StatusPageController } from '../status-page.controller';

const response: StatusPageResponse = {
  generatedAt: '2026-09-23T00:00:00.000Z',
  overall: ComponentState.UP,
  components: [],
  incidents: [],
  historyAvailable: true,
  bucketSeconds: 300,
};

/** An HTTP execution context for StatusPageController.status. */
const contextFor = (request: object): ExecutionContext =>
  ({
    getClass: () => StatusPageController,
    getHandler: () => StatusPageController.prototype.status,
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}),
      getNext: () => null,
    }),
    getArgs: () => [request],
    getArgByIndex: () => request,
    switchToRpc: () => {
      throw new Error('not rpc');
    },
    switchToWs: () => {
      throw new Error('not ws');
    },
    getType: () => 'http',
  }) as ExecutionContext;

describe('StatusPageController', () => {
  it('delegates to the service', async () => {
    const getStatus = vi.fn().mockResolvedValue(response);
    const module = await Test.createTestingModule({
      controllers: [StatusPageController],
      providers: [{ provide: StatusPageService, useValue: { getStatus } }],
    }).compile();

    await expect(module.get(StatusPageController).status()).resolves.toBe(response);
    expect(getStatus).toHaveBeenCalledOnce();
  });

  // Plan §2: operational data is admin-only.
  it('is guarded by authentication, session revocation and the ADMIN role', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, StatusPageController)).toEqual([
      AuthGuard,
      SessionRevocationGuard,
      RolesGuard,
    ]);
    expect(Reflect.getMetadata(ROLES_KEY, StatusPageController)).toEqual([UserRole.ADMIN]);
  });

  it("lets only the admin's own browser cache the answer", () => {
    expect(Reflect.getMetadata(HEADERS_METADATA, StatusPageController.prototype.status)).toEqual([
      { name: 'Cache-Control', value: STATUS_CACHE_CONTROL },
    ]);
    expect(STATUS_CACHE_CONTROL).toMatch(/^private/);
  });

  it('refuses a request with no token', () => {
    const guard = new AuthGuard(new Reflector());
    expect(() => guard.canActivate(contextFor({ headers: {} }))).toThrow(UnauthorizedException);
  });

  it('refuses a signed-in user who is not an admin, and admits an admin', () => {
    const guard = new RolesGuard(new Reflector());
    const as = (role: UserRole) =>
      guard.canActivate(
        contextFor({ headers: {}, user: { id: 'u1', email: 'a@b.c', role, sessionId: 's1' } }),
      );

    expect(as(UserRole.USER)).toBe(false);
    expect(as(UserRole.OPERATOR)).toBe(false);
    expect(as(UserRole.ADMIN)).toBe(true);
  });
});
