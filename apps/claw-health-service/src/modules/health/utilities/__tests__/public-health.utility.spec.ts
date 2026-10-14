import { type Mock, vi } from 'vitest';
import { ServiceStatus, UserRole } from '@claw/shared-types';
import { verifyUserAccessToken } from '@claw/shared-utilities';

import { AggregatedHealthStatus } from '../../enums/aggregated-health-status.enum';
import { type AggregatedHealth } from '../../types/health.types';
import { isAdminAuthorization, toPublicHealth } from '../public-health.utility';

vi.mock('@claw/shared-utilities', () => ({ verifyUserAccessToken: vi.fn() }));

const verifyMock = verifyUserAccessToken as unknown as Mock;

const FULL: AggregatedHealth = {
  status: AggregatedHealthStatus.DEGRADED,
  timestamp: '2026-10-14T00:00:00.000Z',
  services: [
    { name: 'auth-service', status: ServiceStatus.UP, responseTimeMs: 12, error: null },
    {
      name: 'chat-service',
      status: ServiceStatus.DOWN,
      responseTimeMs: null,
      error: 'getaddrinfo ENOTFOUND chat-service',
    },
  ],
  summary: { total: 2, up: 1, down: 1 },
  disabledDependencies: ['clamav'],
};

describe('toPublicHealth', () => {
  it('keeps status, names, up/down and counts', () => {
    const result = toPublicHealth(FULL);
    expect(result.status).toBe(AggregatedHealthStatus.DEGRADED);
    expect(result.summary).toEqual({ total: 2, up: 1, down: 1 });
    expect(result.services.map((s) => [s.name, s.status])).toEqual([
      ['auth-service', ServiceStatus.UP],
      ['chat-service', ServiceStatus.DOWN],
    ]);
  });

  it('drops error text, timings and the dependency list', () => {
    const serialised = JSON.stringify(toPublicHealth(FULL));
    expect(serialised).not.toContain('ENOTFOUND');
    expect(serialised).not.toContain('disabledDependencies');
    expect(serialised).not.toContain('12');
    for (const service of toPublicHealth(FULL).services) {
      expect(service.error).toBeNull();
      expect(service.responseTimeMs).toBeNull();
    }
  });
});

describe('isAdminAuthorization', () => {
  beforeEach(() => {
    verifyMock.mockReset();
  });

  it('is true for a valid admin token', () => {
    verifyMock.mockReturnValue({ role: UserRole.ADMIN });
    expect(isAdminAuthorization('Bearer tok', 's')).toBe(true);
    expect(verifyMock).toHaveBeenCalledWith('tok', 's');
  });

  it('is false for a non-admin token', () => {
    verifyMock.mockReturnValue({ role: UserRole.USER });
    expect(isAdminAuthorization('Bearer tok', 's')).toBe(false);
  });

  it('is false when the token fails verification', () => {
    verifyMock.mockImplementation(() => {
      throw new Error('bad');
    });
    expect(isAdminAuthorization('Bearer tok', 's')).toBe(false);
  });

  it.each([
    [undefined, 's'],
    ['', 's'],
    ['Basic abc', 's'],
    ['Bearer', 's'],
    ['Bearer a b', 's'],
    ['Bearer tok', undefined],
  ])('is false without verifying for %s / %s', (header, secret) => {
    expect(isAdminAuthorization(header, secret)).toBe(false);
    expect(verifyMock).not.toHaveBeenCalled();
  });
});
