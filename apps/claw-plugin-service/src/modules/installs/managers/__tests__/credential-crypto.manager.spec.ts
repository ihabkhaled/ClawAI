import { decryptWithAad } from '@claw/shared-utilities';

import { AppConfig } from '../../../../app/config/app.config';
import { CURRENT_KEY_VERSION } from '../../constants/installs.constants';
import { credentialAad } from '../../utilities/credential-aad.utility';
import { CredentialCryptoManager } from '../credential-crypto.manager';

const KEY = 'e5'.repeat(32);

describe('CredentialCryptoManager', () => {
  beforeEach(() => {
    vi.stubEnv('JWT_SECRET', 'x'.repeat(32));
    vi.stubEnv('PLUGIN_DATABASE_URL', 'postgresql://localhost:5432/claw_plugin');
    vi.stubEnv('AUTH_SERVICE_URL', 'https://auth-service:4001');
    vi.stubEnv('INTER_SERVICE_AUTH_TOKEN', 'y'.repeat(32));
    vi.stubEnv('PLUGIN_ENCRYPTION_KEY', KEY);
    AppConfig.validate();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('seals with PLUGIN_ENCRYPTION_KEY bound to the owner and the install', () => {
    const sealed = new CredentialCryptoManager().seal('sk-secret', 'user-1', 'install-1');

    expect(sealed.keyVersion).toBe(CURRENT_KEY_VERSION);
    expect(decryptWithAad(sealed.ciphertext, KEY, credentialAad('user-1', 'install-1'))).toBe(
      'sk-secret',
    );
  });

  it('stores nothing that contains the plaintext', () => {
    const sealed = new CredentialCryptoManager().seal('sk-SENTINEL-secret', 'user-1', 'install-1');

    expect(sealed.ciphertext).not.toContain('SENTINEL');
    expect(Buffer.from(sealed.ciphertext, 'base64').toString('utf8')).not.toContain('SENTINEL');
  });

  it('cannot be opened for another install or another user', () => {
    const { ciphertext } = new CredentialCryptoManager().seal('sk-secret', 'user-1', 'install-1');

    expect(() => decryptWithAad(ciphertext, KEY, credentialAad('user-1', 'install-2'))).toThrow();
    expect(() => decryptWithAad(ciphertext, KEY, credentialAad('user-2', 'install-1'))).toThrow();
  });

  it('seals the same value to different bytes each time', () => {
    const manager = new CredentialCryptoManager();

    expect(manager.seal('same', 'user-1', 'install-1').ciphertext).not.toBe(
      manager.seal('same', 'user-1', 'install-1').ciphertext,
    );
  });
  describe('open', () => {
    it('returns the plaintext for the same user and owner', () => {
      const manager = new CredentialCryptoManager();
      const { ciphertext } = manager.seal('sk-secret', 'user-1', 'server-1');

      expect(manager.open(ciphertext, 'user-1', 'server-1')).toBe('sk-secret');
    });

    it('returns null for another owner, another user, tampered bytes and garbage', () => {
      const manager = new CredentialCryptoManager();
      const { ciphertext } = manager.seal('sk-secret', 'user-1', 'server-1');
      const tampered = Buffer.from(ciphertext, 'base64');
      tampered[tampered.length - 1] = (tampered.at(-1) ?? 0) ^ 0xff;

      expect(manager.open(ciphertext, 'user-1', 'server-2')).toBeNull();
      expect(manager.open(ciphertext, 'user-2', 'server-1')).toBeNull();
      expect(manager.open(tampered.toString('base64'), 'user-1', 'server-1')).toBeNull();
      expect(manager.open('not-base64!!', 'user-1', 'server-1')).toBeNull();
    });
  });
});
