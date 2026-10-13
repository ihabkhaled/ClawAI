import { BadRequestException, NotFoundException } from '@nestjs/common';

import { RiskLevel } from '../../../../common/enums/risk-level.enum';
import {
  buildInstallRecord,
  INSTALL_ID,
  KEYED_MANIFEST,
  OWNER_ID,
} from '../../__tests__/install-record.fixture';
import { PluginConsentsService } from '../plugin-consents.service';

function buildService() {
  const installs = {
    requireOwned: vi.fn().mockResolvedValue(buildInstallRecord({}, KEYED_MANIFEST)),
  };
  const secrets = {
    deleteConsent: vi.fn().mockResolvedValue(true),
    saveConsent: vi.fn(async (_installId: string, toolName: string, level: RiskLevel) => ({
      toolName,
      level,
      grantedAt: new Date('2026-10-13T12:00:00.000Z'),
    })),
  };
  return {
    service: new PluginConsentsService(installs as never, secrets as never),
    installs,
    secrets,
  };
}

async function failureOf(work: Promise<unknown>): Promise<unknown> {
  return work.catch((error: unknown) => error);
}

describe('PluginConsentsService', () => {
  it('stores a WRITE grant for a WRITE tool', async () => {
    const { service, secrets } = buildService();

    const view = await service.grant(OWNER_ID, INSTALL_ID, {
      toolName: 'write_note',
      level: RiskLevel.WRITE,
    });

    expect(secrets.saveConsent).toHaveBeenCalledWith(INSTALL_ID, 'write_note', RiskLevel.WRITE);
    expect(view).toEqual({
      toolName: 'write_note',
      level: 'WRITE',
      grantedAt: '2026-10-13T12:00:00.000Z',
    });
  });

  it('stores a DESTRUCTIVE grant for a DESTRUCTIVE tool', async () => {
    const { service, secrets } = buildService();

    await service.grant(OWNER_ID, INSTALL_ID, {
      toolName: 'delete_note',
      level: RiskLevel.DESTRUCTIVE,
    });

    expect(secrets.saveConsent).toHaveBeenCalledWith(
      INSTALL_ID,
      'delete_note',
      RiskLevel.DESTRUCTIVE,
    );
  });

  it('answers 400 PLUGIN_CONSENT_NOT_REQUIRED for a READ tool', async () => {
    const { service, secrets } = buildService();

    const failure = await failureOf(
      service.grant(OWNER_ID, INSTALL_ID, { toolName: 'read_note', level: RiskLevel.WRITE }),
    );

    expect(failure).toBeInstanceOf(BadRequestException);
    expect((failure as BadRequestException).getResponse()).toMatchObject({
      errorCode: 'PLUGIN_CONSENT_NOT_REQUIRED',
    });
    expect(secrets.saveConsent).not.toHaveBeenCalled();
  });

  const mismatches: Array<[string, string, RiskLevel.WRITE | RiskLevel.DESTRUCTIVE]> = [
    ['a WRITE grant on a DESTRUCTIVE tool', 'delete_note', RiskLevel.WRITE],
    ['a DESTRUCTIVE grant on a WRITE tool', 'write_note', RiskLevel.DESTRUCTIVE],
  ];

  it.each(mismatches)(
    'answers 400 PLUGIN_CONSENT_LEVEL_MISMATCH for %s',
    async (_label, toolName, level) => {
      const { service, secrets } = buildService();

      const failure = await failureOf(service.grant(OWNER_ID, INSTALL_ID, { toolName, level }));

      expect(failure).toBeInstanceOf(BadRequestException);
      expect((failure as BadRequestException).getResponse()).toMatchObject({
        errorCode: 'PLUGIN_CONSENT_LEVEL_MISMATCH',
      });
      expect(secrets.saveConsent).not.toHaveBeenCalled();
    },
  );

  it('answers 404 PLUGIN_TOOL_NOT_FOUND for a tool the plugin does not have', async () => {
    const { service, secrets } = buildService();

    const failure = await failureOf(
      service.grant(OWNER_ID, INSTALL_ID, { toolName: 'nope', level: RiskLevel.WRITE }),
    );

    expect(failure).toBeInstanceOf(NotFoundException);
    expect((failure as NotFoundException).getResponse()).toMatchObject({
      errorCode: 'PLUGIN_TOOL_NOT_FOUND',
    });
    expect(secrets.saveConsent).not.toHaveBeenCalled();
  });

  it('answers 404 PLUGIN_TOOL_NOT_FOUND when the stored manifest is unreadable', async () => {
    const { service, installs } = buildService();
    installs.requireOwned.mockResolvedValue({
      ...buildInstallRecord({}, KEYED_MANIFEST),
      version: { id: 'v', version: '1.0.0', manifest: { broken: true } },
    });

    await expect(
      service.grant(OWNER_ID, INSTALL_ID, { toolName: 'write_note', level: RiskLevel.WRITE }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("answers 404 for another user's install and stores nothing", async () => {
    const { service, installs, secrets } = buildService();
    installs.requireOwned.mockRejectedValue(new NotFoundException());

    await expect(
      service.grant('intruder', INSTALL_ID, { toolName: 'write_note', level: RiskLevel.WRITE }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(installs.requireOwned).toHaveBeenCalledWith(INSTALL_ID, 'intruder');
    expect(secrets.saveConsent).not.toHaveBeenCalled();
  });

  it('answers 404 PLUGIN_INSTALL_NOT_FOUND when an uninstall wins the race (P2003)', async () => {
    const { service, secrets } = buildService();
    secrets.saveConsent.mockRejectedValue({ code: 'P2003' });

    const failure = await failureOf(
      service.grant(OWNER_ID, INSTALL_ID, { toolName: 'write_note', level: RiskLevel.WRITE }),
    );

    expect(failure).toBeInstanceOf(NotFoundException);
    expect((failure as NotFoundException).getResponse()).toMatchObject({
      errorCode: 'PLUGIN_INSTALL_NOT_FOUND',
    });
  });

  it('lets any other storage failure through untouched', async () => {
    const { service, secrets } = buildService();
    const boom = new Error('db down');
    secrets.saveConsent.mockRejectedValue(boom);

    await expect(
      service.grant(OWNER_ID, INSTALL_ID, { toolName: 'write_note', level: RiskLevel.WRITE }),
    ).rejects.toBe(boom);
  });

  describe('revoke', () => {
    it('deletes the remembered grant for an install the caller owns', async () => {
      const { service, installs, secrets } = buildService();

      await expect(service.revoke(OWNER_ID, INSTALL_ID, 'write_note')).resolves.toBeUndefined();

      expect(installs.requireOwned).toHaveBeenCalledWith(INSTALL_ID, OWNER_ID);
      expect(secrets.deleteConsent).toHaveBeenCalledWith(INSTALL_ID, 'write_note');
    });

    it('is idempotent: a tool with no grant is still a clean success', async () => {
      const { service, secrets } = buildService();
      secrets.deleteConsent.mockResolvedValue(false);

      await expect(service.revoke(OWNER_ID, INSTALL_ID, 'write_note')).resolves.toBeUndefined();
    });

    it("answers 404 for another user's install and deletes nothing", async () => {
      const { service, installs, secrets } = buildService();
      installs.requireOwned.mockRejectedValue(new NotFoundException());

      await expect(service.revoke('intruder', INSTALL_ID, 'write_note')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(installs.requireOwned).toHaveBeenCalledWith(INSTALL_ID, 'intruder');
      expect(secrets.deleteConsent).not.toHaveBeenCalled();
    });
  });
});
