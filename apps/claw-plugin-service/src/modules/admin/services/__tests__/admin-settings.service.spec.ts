import { BadRequestException } from '@nestjs/common';

import { PLUGIN_SETTING_DEFAULTS } from '../../../seeding/constants/plugin-setting-defaults.constants';
import { AdminSettingsService } from '../admin-settings.service';

const STORED_AT = new Date('2026-10-13T12:00:00.000Z');

function buildService(rows: Array<{ key: string; value: unknown; updatedAt: Date }> = []) {
  const repository = {
    findAll: vi.fn().mockResolvedValue(rows),
    upsertMany: vi.fn().mockResolvedValue(undefined),
  };
  return { repository, service: new AdminSettingsService(repository as never) };
}

async function failureOf(work: Promise<unknown>): Promise<BadRequestException> {
  const failure = await work.catch((error: unknown) => error);
  expect(failure).toBeInstanceOf(BadRequestException);
  return failure as BadRequestException;
}

describe('AdminSettingsService', () => {
  describe('list', () => {
    it('returns every known setting with its default when nothing is stored', async () => {
      const { service } = buildService();

      const settings = await service.list();

      expect(settings).toHaveLength(PLUGIN_SETTING_DEFAULTS.length);
      expect(settings).toContainEqual({ key: 'loop.maxRounds', value: 5, updatedAt: null });
      expect(settings).toContainEqual({
        key: 'userServers.requireApproval',
        value: false,
        updatedAt: null,
      });
    });

    it('returns the stored value and its update time', async () => {
      const { service } = buildService([{ key: 'loop.maxRounds', value: 8, updatedAt: STORED_AT }]);

      expect(await service.list()).toContainEqual({
        key: 'loop.maxRounds',
        value: 8,
        updatedAt: STORED_AT.toISOString(),
      });
    });

    it('falls back to the default for a stored value that is no longer valid', async () => {
      const { service } = buildService([
        { key: 'loop.maxRounds', value: 'many', updatedAt: STORED_AT },
        { key: 'call.timeoutMs', value: 5, updatedAt: STORED_AT },
        { key: 'userServers.enabled', value: 1, updatedAt: STORED_AT },
        { key: 'unknown.key', value: 1, updatedAt: STORED_AT },
      ]);

      const settings = await service.list();

      expect(settings).toContainEqual({ key: 'loop.maxRounds', value: 5, updatedAt: null });
      expect(settings).toContainEqual({ key: 'call.timeoutMs', value: 30_000, updatedAt: null });
      expect(settings).toContainEqual({ key: 'userServers.enabled', value: true, updatedAt: null });
      expect(settings.some((setting) => setting.key === 'unknown.key')).toBe(false);
    });
  });

  describe('update', () => {
    it('writes valid values together and returns the fresh list', async () => {
      const { service, repository } = buildService();

      const settings = await service.update('admin-1', {
        values: { 'userServers.requireApproval': true, 'loop.maxRounds': 3 },
      });

      expect(repository.upsertMany).toHaveBeenCalledWith(
        { 'userServers.requireApproval': true, 'loop.maxRounds': 3 },
        'admin-1',
      );
      expect(settings).toHaveLength(PLUGIN_SETTING_DEFAULTS.length);
    });

    it('accepts the bounds of a range', async () => {
      const { service, repository } = buildService();

      await service.update('admin-1', {
        values: { 'loop.maxRounds': 1, 'rate.perUserPerMinute': 600 },
      });

      expect(repository.upsertMany).toHaveBeenCalled();
    });

    it.each([
      ['an unknown key', { 'made.up': 1 }, 'unknown setting'],
      ['a prototype key', { constructor: 1 }, 'unknown setting'],
      [
        'a number for a boolean',
        { 'userServers.enabled': 1 },
        'value is not allowed for this setting',
      ],
      [
        'a boolean for a number',
        { 'loop.maxRounds': true },
        'value is not allowed for this setting',
      ],
      ['a fraction', { 'loop.maxRounds': 2.5 }, 'value is not allowed for this setting'],
      ['a value below the range', { 'loop.maxRounds': 0 }, 'value is not allowed for this setting'],
      [
        'a value above the range',
        { 'loop.maxRounds': 11 },
        'value is not allowed for this setting',
      ],
      [
        'a timeout below one second',
        { 'call.timeoutMs': 999 },
        'value is not allowed for this setting',
      ],
      [
        'a result cap above the hard limit',
        { 'call.maxResultBytes': 262_145 },
        'value is not allowed for this setting',
      ],
      [
        'zero retention days',
        { 'invocations.retentionDays': 0 },
        'value is not allowed for this setting',
      ],
    ])(
      'answers 400 PLUGIN_SETTING_INVALID for %s and writes nothing',
      async (_label, values, message) => {
        const { service, repository } = buildService();

        const failure = await failureOf(service.update('admin-1', { values }));

        expect(failure.getResponse()).toMatchObject({
          errorCode: 'PLUGIN_SETTING_INVALID',
          errors: [{ field: Object.keys(values)[0], message }],
        });
        expect(repository.upsertMany).not.toHaveBeenCalled();
      },
    );

    it('is all-or-nothing: one bad value rejects the good ones too', async () => {
      const { service, repository } = buildService();

      await failureOf(
        service.update('admin-1', { values: { 'loop.maxRounds': 3, 'loop.maxCallsPerTurn': 99 } }),
      );

      expect(repository.upsertMany).not.toHaveBeenCalled();
    });
  });
});
