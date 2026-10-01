import { decryptWithAad, encryptWithAad } from '../aes-gcm.utility';
import { routineSecretAad } from '../routine-secret-aad.utility';

const KEY = 'a1'.repeat(32);
const OTHER_KEY = 'b2'.repeat(32);
const AAD = routineSecretAad('routine-1', 'user-1', 'API_KEY');

describe('AES-256-GCM with AAD (routine secrets)', () => {
  it('round-trips, including multi-byte text and the 8 KB limit', () => {
    for (const text of ['hunter2', 'пароль-密码-🔑', 'x'.repeat(8192)]) {
      expect(decryptWithAad(encryptWithAad(text, KEY, AAD), KEY, AAD)).toBe(text);
    }
  });

  it('uses a fresh nonce per call: the same plaintext never seals to the same bytes', () => {
    const first = encryptWithAad('same', KEY, AAD);
    const second = encryptWithAad('same', KEY, AAD);
    expect(first).not.toBe(second);
    expect(Buffer.from(first, 'base64').subarray(0, 16)).not.toEqual(
      Buffer.from(second, 'base64').subarray(0, 16),
    );
  });

  it('never stores the plaintext in the sealed form', () => {
    const sealed = encryptWithAad('SENTINEL-plaintext-value', KEY, AAD);
    expect(Buffer.from(sealed, 'base64').toString('utf8')).not.toContain('SENTINEL');
    expect(sealed).not.toContain('SENTINEL');
  });

  it.each([
    ['another routine', routineSecretAad('routine-2', 'user-1', 'API_KEY')],
    ['another user', routineSecretAad('routine-1', 'user-2', 'API_KEY')],
    ['another name', routineSecretAad('routine-1', 'user-1', 'OTHER_KEY')],
    ['no AAD at all', ''],
  ])('refuses to open a ciphertext moved to %s', (_label, aad) => {
    const sealed = encryptWithAad('top-secret', KEY, AAD);
    expect(() => decryptWithAad(sealed, KEY, aad)).toThrow();
  });

  it('refuses a wrong key and a tampered ciphertext', () => {
    const sealed = encryptWithAad('top-secret', KEY, AAD);
    expect(() => decryptWithAad(sealed, OTHER_KEY, AAD)).toThrow();
    const bytes = Buffer.from(sealed, 'base64');
    bytes[bytes.length - 1] = (bytes.at(-1) ?? 0) ^ 0x01;
    expect(() => decryptWithAad(bytes.toString('base64'), KEY, AAD)).toThrow();
  });

  it('refuses a ciphertext too short to hold a nonce and a tag', () => {
    expect(() => decryptWithAad(Buffer.alloc(10).toString('base64'), KEY, AAD)).toThrow(
      'ciphertext is malformed',
    );
  });

  it.each(['', 'abc', 'zz'.repeat(32), 'a1'.repeat(31), 'a1'.repeat(33)])(
    'rejects an invalid key without echoing it (%#)',
    (badKey) => {
      let message = '';
      try {
        encryptWithAad('v', badKey, AAD);
      } catch (error) {
        message = error instanceof Error ? error.message : '';
      }
      expect(message).toBe('ENCRYPTION_KEY must be a 64-character hex string');
      if (badKey.length > 0) expect(message).not.toContain(badKey);
    },
  );

  it('errors never carry the plaintext', () => {
    const sealed = encryptWithAad('SENTINEL-in-error', KEY, AAD);
    let message = '';
    try {
      decryptWithAad(sealed, OTHER_KEY, AAD);
    } catch (error) {
      message = error instanceof Error ? error.message : '';
    }
    expect(message).not.toContain('SENTINEL');
    expect(message).not.toContain(KEY);
  });
});

describe('routineSecretAad', () => {
  it('cannot be made to collide by moving a delimiter between fields', () => {
    expect(routineSecretAad('a', 'b:c', 'N')).not.toBe(routineSecretAad('a:b', 'c', 'N'));
    expect(routineSecretAad('a', 'b', 'c')).not.toBe(routineSecretAad('a', 'bc', ''));
  });

  it('is stable for the same triple', () => {
    expect(routineSecretAad('r', 'u', 'N')).toBe(routineSecretAad('r', 'u', 'N'));
  });
});
