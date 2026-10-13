import {
  decryptWithAad,
  encryptWithAad,
  isAes256HexKey,
  isStrongAes256HexKey,
} from '../aes-gcm.utility';

const KEY = 'a1'.repeat(32);
const OTHER_KEY = 'b2'.repeat(32);
const AAD = 'user-1:install-1';

describe('AES-256-GCM with AAD', () => {
  it('round-trips, including multi-byte text', () => {
    for (const text of ['hunter2', 'пароль-密码-🔑', 'x'.repeat(8192)]) {
      expect(decryptWithAad(encryptWithAad(text, KEY, AAD), KEY, AAD)).toBe(text);
    }
  });

  it('uses a fresh nonce per call', () => {
    expect(encryptWithAad('same', KEY, AAD)).not.toBe(encryptWithAad('same', KEY, AAD));
  });

  it('never stores the plaintext in the sealed form', () => {
    const sealed = encryptWithAad('SENTINEL-plaintext', KEY, AAD);
    expect(Buffer.from(sealed, 'base64').toString('utf8')).not.toContain('SENTINEL');
  });

  it.each(['user-2:install-1', 'user-1:install-2', ''])(
    'refuses a ciphertext moved to AAD "%s"',
    (aad) => {
      const sealed = encryptWithAad('top-secret', KEY, AAD);
      expect(() => decryptWithAad(sealed, KEY, aad)).toThrow();
    },
  );

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
      expect(message).toBe('encryption key must be a 64-character hex string');
      if (badKey.length > 0) expect(message).not.toContain(badKey);
    },
  );

  it('rejects an invalid key on decrypt too', () => {
    expect(() => decryptWithAad('AAAA', 'short', AAD)).toThrow('64-character hex');
  });

  it('errors never carry the plaintext or the key', () => {
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

describe('key shape checks', () => {
  it('accepts 64 hex characters in either case', () => {
    expect(isAes256HexKey(KEY)).toBe(true);
    expect(isAes256HexKey(KEY.toUpperCase())).toBe(true);
  });

  it.each(['', 'abc', 'zz'.repeat(32), 'a1'.repeat(31)])('rejects malformed key %#', (key) => {
    expect(isAes256HexKey(key)).toBe(false);
    expect(isStrongAes256HexKey(key)).toBe(false);
  });

  it('treats the all-zero key as shaped right but not strong', () => {
    const zero = '0'.repeat(64);
    expect(isAes256HexKey(zero)).toBe(true);
    expect(isStrongAes256HexKey(zero)).toBe(false);
    expect(isStrongAes256HexKey(KEY)).toBe(true);
  });
});
