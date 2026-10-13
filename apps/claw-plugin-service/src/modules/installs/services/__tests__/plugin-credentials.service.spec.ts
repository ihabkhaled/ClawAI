import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';

import { AuthKind } from '../../../../common/enums/auth-kind.enum';
import { type PluginManifestInput } from '../../../catalog/schemas/plugin-manifest.schema';
import { WEATHER_MANIFEST } from '../../../seeding/constants/manifests/weather.manifest';
import {
  buildInstallRecord,
  INSTALL_ID,
  KEYED_MANIFEST,
  OWNER_ID,
} from '../../__tests__/install-record.fixture';
import { PluginCredentialsService } from '../plugin-credentials.service';

const SECRET = 'sk-live-SENTINEL-credential-0123456789';

function buildService(manifest: PluginManifestInput = KEYED_MANIFEST) {
  const installs = {
    requireOwned: vi.fn().mockResolvedValue(buildInstallRecord({}, manifest)),
  };
  const secrets = {
    saveCredential: vi.fn().mockResolvedValue({
      kind: AuthKind.API_KEY,
      updatedAt: new Date('2026-10-13T12:00:00.000Z'),
    }),
    deleteCredential: vi.fn().mockResolvedValue(true),
  };
  const crypto = {
    seal: vi.fn().mockReturnValue({ ciphertext: 'sealed-bytes', keyVersion: 1 }),
  };
  const service = new PluginCredentialsService(
    installs as never,
    secrets as never,
    crypto as never,
  );
  return { service, installs, secrets, crypto };
}

function captureLogs(): () => string {
  const lines: string[] = [];
  const sink = (message: unknown): void => {
    lines.push(String(message));
  };
  vi.spyOn(Logger.prototype, 'log').mockImplementation(sink);
  vi.spyOn(Logger.prototype, 'warn').mockImplementation(sink);
  vi.spyOn(Logger.prototype, 'error').mockImplementation(sink);
  vi.spyOn(Logger.prototype, 'debug').mockImplementation(sink);
  vi.spyOn(Logger.prototype, 'verbose').mockImplementation(sink);
  return () => lines.join('\n');
}

describe('PluginCredentialsService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('put', () => {
    it('seals the value, stores only the ciphertext and reports presence', async () => {
      const { service, secrets, crypto } = buildService();

      const status = await service.put(OWNER_ID, INSTALL_ID, { kind: 'API_KEY', value: SECRET });

      expect(crypto.seal).toHaveBeenCalledWith(SECRET, OWNER_ID, INSTALL_ID);
      expect(secrets.saveCredential).toHaveBeenCalledWith({
        userId: OWNER_ID,
        installId: INSTALL_ID,
        kind: AuthKind.API_KEY,
        headerName: 'X-API-Key',
        ciphertext: 'sealed-bytes',
        keyVersion: 1,
      });
      expect(JSON.stringify(secrets.saveCredential.mock.calls)).not.toContain(SECRET);
      expect(status).toEqual({
        hasCredential: true,
        kind: AuthKind.API_KEY,
        updatedAt: '2026-10-13T12:00:00.000Z',
      });
    });

    it('is write-only: the response never contains the secret, even as a substring', async () => {
      const { service } = buildService();

      const status = await service.put(OWNER_ID, INSTALL_ID, { kind: 'API_KEY', value: SECRET });

      expect(JSON.stringify(status)).not.toContain('SENTINEL');
      expect(Object.keys(status).sort()).toEqual(['hasCredential', 'kind', 'updatedAt']);
    });

    it('never writes the secret to any log level, on success or failure', async () => {
      const logs = captureLogs();
      const { service, secrets } = buildService();
      await service.put(OWNER_ID, INSTALL_ID, { kind: 'API_KEY', value: SECRET });
      secrets.saveCredential.mockRejectedValueOnce(new Error('db down'));
      await service.put(OWNER_ID, INSTALL_ID, { kind: 'API_KEY', value: SECRET }).catch(() => null);
      await service
        .put(OWNER_ID, INSTALL_ID, { kind: 'API_KEY', value: SECRET, headerName: 'Cookie' })
        .catch(() => null);
      await service.remove(OWNER_ID, INSTALL_ID);

      expect(logs()).not.toContain('SENTINEL');
      expect(logs()).not.toContain(SECRET);
      expect(logs()).toContain(`install=${INSTALL_ID}`);
    });

    it('answers 404 PLUGIN_INSTALL_NOT_FOUND when an uninstall wins the race (P2003)', async () => {
      const { service, secrets } = buildService();
      secrets.saveCredential.mockRejectedValue({ code: 'P2003' });

      const failure = await service
        .put(OWNER_ID, INSTALL_ID, { kind: 'API_KEY', value: SECRET })
        .catch((error: unknown) => error);

      expect(failure).toBeInstanceOf(NotFoundException);
      expect((failure as NotFoundException).getResponse()).toMatchObject({
        errorCode: 'PLUGIN_INSTALL_NOT_FOUND',
      });
    });

    it('lets any other storage failure through untouched', async () => {
      const { service, secrets } = buildService();
      const boom = new Error('db down');
      secrets.saveCredential.mockRejectedValue(boom);

      await expect(
        service.put(OWNER_ID, INSTALL_ID, { kind: 'API_KEY', value: SECRET }),
      ).rejects.toBe(boom);
    });

    it('replaces an existing credential through the same call', async () => {
      const { service, secrets } = buildService();

      await service.put(OWNER_ID, INSTALL_ID, { kind: 'API_KEY', value: 'first' });
      await service.put(OWNER_ID, INSTALL_ID, { kind: 'API_KEY', value: 'second' });

      expect(secrets.saveCredential).toHaveBeenCalledTimes(2);
    });

    it('accepts an allow-listed header override', async () => {
      const { service, secrets } = buildService();

      await service.put(OWNER_ID, INSTALL_ID, {
        kind: 'API_KEY',
        value: SECRET,
        headerName: 'X-Custom-Token',
      });

      expect(secrets.saveCredential.mock.calls[0]?.[0].headerName).toBe('X-Custom-Token');
    });

    it.each([
      'Cookie',
      'Host',
      'Content-Length',
      'Proxy-Authorization',
      'Mcp-Session-Id',
      'Accept',
    ])('refuses the header %s with 400 and stores nothing', async (headerName) => {
      const { service, secrets, crypto } = buildService();

      const failure = await service
        .put(OWNER_ID, INSTALL_ID, { kind: 'API_KEY', value: SECRET, headerName })
        .catch((error: unknown) => error);

      expect(failure).toBeInstanceOf(BadRequestException);
      expect((failure as BadRequestException).getResponse()).toMatchObject({
        errorCode: 'PLUGIN_CREDENTIAL_HEADER_DENIED',
      });
      expect(JSON.stringify((failure as BadRequestException).getResponse())).not.toContain(SECRET);
      expect(crypto.seal).not.toHaveBeenCalled();
      expect(secrets.saveCredential).not.toHaveBeenCalled();
    });

    it('refuses a plugin that takes no API key', async () => {
      const { service, secrets, crypto } = buildService(WEATHER_MANIFEST);

      const failure = await service
        .put(OWNER_ID, INSTALL_ID, { kind: 'API_KEY', value: SECRET })
        .catch((error: unknown) => error);

      expect(failure).toBeInstanceOf(BadRequestException);
      expect((failure as BadRequestException).getResponse()).toMatchObject({
        errorCode: 'PLUGIN_CREDENTIAL_NOT_SUPPORTED',
      });
      expect(crypto.seal).not.toHaveBeenCalled();
      expect(secrets.saveCredential).not.toHaveBeenCalled();
    });

    it('refuses an install whose stored manifest is unreadable', async () => {
      const { service, installs, secrets } = buildService();
      installs.requireOwned.mockResolvedValue({
        ...buildInstallRecord({}, KEYED_MANIFEST),
        version: { id: 'v', version: '1.0.0', manifest: { broken: true } },
      });

      await expect(
        service.put(OWNER_ID, INSTALL_ID, { kind: 'API_KEY', value: SECRET }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(secrets.saveCredential).not.toHaveBeenCalled();
    });

    it("answers 404 for another user's install and stores nothing", async () => {
      const { service, installs, secrets, crypto } = buildService();
      installs.requireOwned.mockRejectedValue(new NotFoundException());

      await expect(
        service.put('intruder', INSTALL_ID, { kind: 'API_KEY', value: SECRET }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(installs.requireOwned).toHaveBeenCalledWith(INSTALL_ID, 'intruder');
      expect(crypto.seal).not.toHaveBeenCalled();
      expect(secrets.saveCredential).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes the credential of an install the caller owns', async () => {
      const { service, secrets } = buildService();

      await expect(service.remove(OWNER_ID, INSTALL_ID)).resolves.toBeUndefined();
      expect(secrets.deleteCredential).toHaveBeenCalledWith(INSTALL_ID, OWNER_ID);
    });

    it('is idempotent when there was no credential', async () => {
      const { service, secrets } = buildService();
      secrets.deleteCredential.mockResolvedValue(false);

      await expect(service.remove(OWNER_ID, INSTALL_ID)).resolves.toBeUndefined();
    });

    it("answers 404 for another user's install and deletes nothing", async () => {
      const { service, installs, secrets } = buildService();
      installs.requireOwned.mockRejectedValue(new NotFoundException());

      await expect(service.remove('intruder', INSTALL_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(secrets.deleteCredential).not.toHaveBeenCalled();
    });
  });
});
