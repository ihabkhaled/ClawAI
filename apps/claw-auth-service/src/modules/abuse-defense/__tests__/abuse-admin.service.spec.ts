import { vi } from 'vitest';

import { type UsersRepository } from '../../users/repositories/users.repository';
import { AbuseSignalCode } from '../enums/abuse-signal-code.enum';
import { type AbuseSignalRepository } from '../repositories/abuse-signal.repository';
import { type AbuseSuspensionRepository } from '../repositories/abuse-suspension.repository';
import { AbuseAdminService } from '../services/abuse-admin.service';
import { type AbuseSettingsService } from '../services/abuse-settings.service';

const NOW = new Date('2026-11-28T10:00:00.000Z');

function build(overrides: { user?: object | null; enabled?: boolean } = {}) {
  const suspensions = {
    listRecent: vi.fn().mockResolvedValue([
      {
        id: 's-active',
        userId: 'user-1',
        level: 2,
        reasonCode: 'RATE_LIMIT_TRIPPED',
        evidence: { RATE_LIMIT_TRIPPED: 312, injected: 'x' },
        startedAt: new Date('2026-11-28T09:00:00.000Z'),
        endsAt: new Date('2026-11-29T09:00:00.000Z'),
        liftedAt: null,
        liftedByUserId: null,
      },
      {
        id: 's-lifted',
        userId: 'user-1',
        level: 1,
        reasonCode: 'FORBIDDEN_PROBE',
        evidence: { FORBIDDEN_PROBE: 205 },
        startedAt: new Date('2026-11-20T09:00:00.000Z'),
        endsAt: new Date('2026-11-20T10:00:00.000Z'),
        liftedAt: new Date('2026-11-20T09:20:00.000Z'),
        liftedByUserId: 'admin-1',
      },
      {
        id: 's-served',
        userId: 'user-1',
        level: 1,
        reasonCode: 'SSRF_REFUSED',
        evidence: {},
        startedAt: new Date('2026-11-10T09:00:00.000Z'),
        endsAt: new Date('2026-11-10T10:00:00.000Z'),
        liftedAt: null,
        liftedByUserId: null,
      },
    ]),
  };
  const signals = {
    listRecent: vi.fn().mockResolvedValue([
      {
        code: 'RATE_LIMIT_TRIPPED',
        source: 'auth.http',
        count: 312,
        counted: true,
        bucketStart: new Date('2026-11-28T08:59:00.000Z'),
      },
    ]),
    totalFor: vi.fn(async (_id: string, code: AbuseSignalCode) =>
      Promise.resolve(code === AbuseSignalCode.BANNED_DEVICE_SIGNIN ? 4 : 1),
    ),
  };
  const users = {
    findById: vi
      .fn()
      .mockResolvedValue(overrides.user === undefined ? { id: 'user-1' } : overrides.user),
  };
  const settings = { resolve: vi.fn().mockResolvedValue({ enabled: overrides.enabled ?? true }) };
  const service = new AbuseAdminService(
    users as unknown as UsersRepository,
    settings as unknown as AbuseSettingsService,
    suspensions as unknown as AbuseSuspensionRepository,
    signals as unknown as AbuseSignalRepository,
  );
  return { service, users };
}

describe('AbuseAdminService', () => {
  it('shows which suspension is running, which an administrator lifted and which was served', async () => {
    const { service } = build();
    const view = await service.view('user-1', NOW);
    expect(view.suspensions.map((s) => [s.id, s.active])).toEqual([
      ['s-active', true],
      ['s-lifted', false],
      ['s-served', false],
    ]);
    expect(view.suspensions[1]).toMatchObject({
      liftedAt: '2026-11-20T09:20:00.000Z',
      liftedByUserId: 'admin-1',
    });
  });

  it('returns counts per counted code only, dropping anything else stored in the evidence', async () => {
    const view = await build().service.view('user-1', NOW);
    expect(view.suspensions[0]?.evidence).toEqual({ RATE_LIMIT_TRIPPED: 312 });
  });

  it('carries the two flags that never suspend, and the stored signal buckets', async () => {
    const view = await build().service.view('user-1', NOW);
    expect(view.bannedDeviceSignins).toBe(4);
    expect(view.tokenReuseEvents).toBe(1);
    expect(view.signals).toEqual([
      {
        code: 'RATE_LIMIT_TRIPPED',
        source: 'auth.http',
        count: 312,
        counted: true,
        bucketStart: '2026-11-28T08:59:00.000Z',
      },
    ]);
  });

  it('says whether auto-suspension is on', async () => {
    expect((await build({ enabled: false }).service.view('user-1', NOW)).autoSuspendEnabled).toBe(
      false,
    );
  });

  it('answers 404 for an account that does not exist, and reads nothing else', async () => {
    const { service } = build({ user: null });
    await expect(service.view('ghost', NOW)).rejects.toMatchObject({ status: 404 });
  });

  it('puts no address, token, fingerprint or reason text in the view', async () => {
    const view = JSON.stringify(await build().service.view('user-1', NOW));
    expect(view).not.toMatch(/fingerprint|password|ipAddress|banReason|refreshToken|accessToken/i);
  });
});
