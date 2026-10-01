import { IncomingMessage } from 'node:http';
import { Socket } from 'node:net';
import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { AuthGuard } from '@claw/shared-auth';
import { DeviceTokenClass, MobileDeviceScope } from '@claw/shared-types';
import { AgentKeyGuard } from '../../common/guards/agent-key.guard';
import { CompatAgentGuard } from '../../common/guards/compat-agent.guard';
import { DeviceAccessGuard } from '../../common/guards/device-access.guard';
import { RunnerTokenGuard } from '../../common/guards/runner-token.guard';
import { ServiceTokenGuard } from '../../common/guards/service-token.guard';
import { TEST_JWT_SECRET, useAgentTestConfig } from '../../common/testing/agent-test-env';
import { discoverRoutes } from '../../common/testing/route-inventory';
import { AgentSessionRepository } from '../../modules/agent/repositories/agent-session.repository';
import { DeviceRepository } from '../../modules/agent/repositories/device.repository';
import { RunnerCredentialRepository } from '../../modules/agent/repositories/runner-credential.repository';
import { RevocationCacheService } from '../../modules/agent/services/revocation-cache.service';
import { TokenService } from '../../modules/agent/services/token.service';
import type { RouteDescriptor } from '../../common/testing/route-inventory.types';
import type { AgentRequest } from '../../common/types/auth.types';
import type { Device } from '../../generated/prisma';

/**
 * F097 default-deny proof. Every HTTP handler of every controller in this
 * service is enumerated from its own decorators, sorted by the credential it
 * asks for, and then driven with a REAL mobile token through the REAL guard
 * for that credential. The mobile allow-list is the explicit list below and
 * nothing else; a new route is closed to a phone until it is added here on
 * purpose, and a new kind of guard fails the test until it is classified.
 */

const MOBILE_ROUTES = [
  'GET /agent/mobile/commands',
  'GET /agent/mobile/commands/:id',
  'POST /agent/mobile/commands/:id/approve',
  'POST /agent/mobile/commands/:id/reject',
  'POST /agent/mobile/commands/:id/cancel',
  'GET /agent/mobile/capabilities',
  'GET /agent/mobile/capabilities/:id',
  'POST /agent/mobile/capabilities/:id/approve',
  'POST /agent/mobile/capabilities/:id/reject',
  'POST /agent/mobile/capabilities/:id/cancel',
].sort();

/**
 * Routes that ask for no bearer at all. A phone gains nothing there (a mobile token is neither needed
 * nor read), and a new one needs a human look. They authenticate by other means: a one-time pairing
 * or device code, a refresh token, an HMAC signature, a SAML assertion, or the nginx block on
 * `/api/v1/internal/*` (the seed-command route has no service-token guard of its own; tracked in
 * the F097 ADR as a follow-up, unrelated to mobile).
 */
const ANONYMOUS_ROUTES: string[] = [
  'GET /health',
  'POST /agent/auth/device-code/create',
  'POST /agent/auth/device-code/token',
  'POST /agent/auth/pair/init',
  'POST /agent/auth/pair/poll',
  'POST /agent/auth/refresh',
  'POST /agent/channels/inbound/:userId',
  'POST /agent/organizations/:slug/sso/callback',
  'POST /agent/routines/webhook/:routineId',
  'POST /internal/agent/terminal/seed-command',
];

const ALL_MOBILE_SCOPES = Object.values(MobileDeviceScope);

const tokens = new TokenService();

function mobileDeviceRow(): Device {
  return {
    id: 'device-1',
    userId: 'user-1',
    orgId: null,
    name: 'Phone',
    hostname: 'phone',
    os: 'ios',
    platform: 'ios',
    agentVersion: '1.0.0',
    scopesCsv: ALL_MOBILE_SCOPES.join(','),
    tokenClass: 'mobile',
    status: 'ACTIVE',
    lastSeenAt: null,
    lastIp: null,
    revokedAt: null,
    revokeReason: null,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function mobileBearer(scopes = ALL_MOBILE_SCOPES): string {
  return tokens.issuePair('user-1', 'device-1', scopes, null, DeviceTokenClass.MOBILE).pair
    .accessToken;
}

function contextFor(
  route: RouteDescriptor,
  token: string,
): {
  context: ExecutionContextHost;
  request: AgentRequest;
} {
  const request: AgentRequest = Object.assign(new IncomingMessage(new Socket()), {});
  request.headers['authorization'] = `Bearer ${token}`;
  return {
    context: new ExecutionContextHost([request, {}], route.controller, route.handler),
    request,
  };
}

function deviceGuard(): DeviceAccessGuard {
  return new DeviceAccessGuard(
    tokens,
    Object.assign(Object.create(DeviceRepository.prototype) as DeviceRepository, {
      findById: vi.fn().mockResolvedValue(mobileDeviceRow()),
    }),
    Object.assign(Object.create(RevocationCacheService.prototype) as RevocationCacheService, {
      isJtiRevoked: vi.fn().mockResolvedValue(false),
      isDeviceRevoked: vi.fn().mockResolvedValue(false),
    }),
    new Reflector(),
  );
}

function compatGuard(): CompatAgentGuard {
  return new CompatAgentGuard(
    deviceGuard(),
    Object.assign(Object.create(AgentKeyGuard.prototype) as AgentKeyGuard, {
      canActivate: vi.fn().mockRejectedValue(new UnauthorizedException('no such session key')),
    }),
    Object.assign(Object.create(AgentSessionRepository.prototype) as AgentSessionRepository, {
      findById: vi.fn().mockResolvedValue(null),
    }),
  );
}

describe('mobile token default-deny route inventory (F097)', () => {
  let routes: RouteDescriptor[] = [];
  let controllerNames: string[] = [];

  beforeAll(() => {
    useAgentTestConfig();
    process.env['JWT_SECRET'] = TEST_JWT_SECRET;
    ({ controllers: controllerNames, routes } = discoverRoutes());
  });

  it('enumerates the whole controller surface, not an empty or partial one', () => {
    expect(controllerNames.length).toBeGreaterThanOrEqual(20);
    expect(routes.length).toBeGreaterThanOrEqual(80);
    for (const expected of [
      'AgentCommandController',
      'AgentRunnerController',
      'AgentDeviceController',
      'AgentAuthController',
      'CapabilityController',
      'FleetController',
      'AgentMobileController',
    ]) {
      expect(controllerNames).toContain(expected);
    }
  });

  it('classifies every route by a credential this test knows how to drive', () => {
    const unclassified = routes.filter((r) => r.authKind === 'unclassified');
    expect(unclassified.map((r) => `${r.signature} guards=${r.guardNames.join(',')}`)).toEqual([]);
  });

  it('marks exactly the ten agreed routes as mobile routes, on one controller', () => {
    const marked = routes.filter((r) => r.mobileRoute);
    expect(marked.map((r) => r.signature).sort()).toEqual(MOBILE_ROUTES);
    expect(new Set(marked.map((r) => r.controllerName))).toEqual(
      new Set(['AgentMobileController']),
    );
  });

  it('gives every mobile route a device guard and a scope list drawn only from the mobile scopes', () => {
    for (const route of routes.filter((r) => r.mobileRoute)) {
      expect(route.authKind, route.signature).toBe('device-token');
      expect(route.guardNames, route.signature).toEqual(['DeviceAccessGuard', 'ScopeGuard']);
      expect(route.requiredScopes.length, route.signature).toBeGreaterThan(0);
      for (const scope of route.requiredScopes) {
        expect(ALL_MOBILE_SCOPES as string[], route.signature).toContain(scope);
      }
    }
  });

  it('leaves no unlisted route that asks for no credential', () => {
    const anonymous = routes.filter((r) => r.authKind === 'anonymous').map((r) => r.signature);
    expect(anonymous.sort()).toEqual([...ANONYMOUS_ROUTES].sort());
  });

  it('rejects a real mobile token on every user-JWT route (the global AuthGuard)', () => {
    const guard = new AuthGuard(new Reflector());
    const userRoutes = routes.filter((r) => r.authKind === 'user-jwt');
    expect(userRoutes.length).toBeGreaterThan(40);
    for (const route of userRoutes) {
      const { context } = contextFor(route, mobileBearer());
      expect(() => guard.canActivate(context), route.signature).toThrow(UnauthorizedException);
    }
  });

  it('rejects a real mobile token on every non-mobile device-token route with a 403', async () => {
    const deviceRoutes = routes.filter((r) => r.authKind === 'device-token' && !r.mobileRoute);
    expect(deviceRoutes.length).toBeGreaterThan(5);
    for (const route of deviceRoutes) {
      const guard = route.guardNames.includes('CompatAgentGuard') ? compatGuard() : deviceGuard();
      const { context } = contextFor(route, mobileBearer());
      await expect(guard.canActivate(context), route.signature).rejects.toMatchObject({
        status: 403,
      });
    }
  });

  it('rejects a real mobile token on every runner-token route', async () => {
    const guard = new RunnerTokenGuard(
      Object.assign(
        Object.create(RunnerCredentialRepository.prototype) as RunnerCredentialRepository,
        {
          findActiveByHash: vi.fn().mockResolvedValue(null),
        },
      ),
    );
    const runnerRoutes = routes.filter((r) => r.authKind === 'runner-token');
    expect(runnerRoutes.length).toBeGreaterThan(0);
    for (const route of runnerRoutes) {
      const { context } = contextFor(route, mobileBearer());
      await expect(guard.canActivate(context), route.signature).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    }
  });

  it('rejects a real mobile token on every service-token route', () => {
    const guard = new ServiceTokenGuard();
    const serviceRoutes = routes.filter((r) => r.authKind === 'service-token');
    expect(serviceRoutes.length).toBeGreaterThan(0);
    for (const route of serviceRoutes) {
      const { context } = contextFor(route, mobileBearer());
      expect(() => guard.canActivate(context), route.signature).toThrow(UnauthorizedException);
    }
  });

  it('admits a mobile token on each mobile route only with the scope that route names', async () => {
    for (const route of routes.filter((r) => r.mobileRoute)) {
      const holding = contextFor(route, mobileBearer(route.requiredScopes as MobileDeviceScope[]));
      await expect(deviceGuard().canActivate(holding.context), route.signature).resolves.toBe(true);
      expect(holding.request.deviceContext?.scopes, route.signature).toEqual(route.requiredScopes);
    }
  });

  it('refuses a desktop device token on every mobile route', async () => {
    const desktop = tokens.issuePair('user-1', 'device-1', [], null, DeviceTokenClass.DEVICE).pair
      .accessToken;
    const desktopRow = { ...mobileDeviceRow(), tokenClass: 'device', scopesCsv: 'shell:exec' };
    const guard = new DeviceAccessGuard(
      tokens,
      Object.assign(Object.create(DeviceRepository.prototype) as DeviceRepository, {
        findById: vi.fn().mockResolvedValue(desktopRow),
      }),
      Object.assign(Object.create(RevocationCacheService.prototype) as RevocationCacheService, {
        isJtiRevoked: vi.fn().mockResolvedValue(false),
        isDeviceRevoked: vi.fn().mockResolvedValue(false),
      }),
      new Reflector(),
    );
    for (const route of routes.filter((r) => r.mobileRoute)) {
      const { context } = contextFor(route, desktop);
      await expect(guard.canActivate(context), route.signature).rejects.toMatchObject({
        status: 403,
      });
    }
  });
});
