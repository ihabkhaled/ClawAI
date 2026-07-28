import { isAllowedVscodeCallback } from '../vscode-authorization.utility';

describe('isAllowedVscodeCallback', () => {
  it('accepts the extension URI and a fixed-path non-privileged IPv4 loopback callback', () => {
    expect(isAllowedVscodeCallback('vscode://clawai.clawai-coding-agent/auth/callback')).toBe(true);
    expect(
      isAllowedVscodeCallback('vscode-insiders://clawai.clawai-coding-agent/auth/callback'),
    ).toBe(true);
    expect(isAllowedVscodeCallback('http://127.0.0.1:49152/auth/callback')).toBe(true);
  });

  it.each([
    'http://localhost:49152/auth/callback',
    'http://[::1]:49152/auth/callback',
    'http://127.0.0.1:80/auth/callback',
    'http://127.0.0.1:49152/other',
    'http://127.0.0.1:49152/auth/callback?next=https://evil.example',
    'https://127.0.0.1:49152/auth/callback',
  ])('rejects unsafe loopback callback shape %s', (callback) => {
    expect(isAllowedVscodeCallback(callback)).toBe(false);
  });
});
