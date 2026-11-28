const { assertAdminPassword } = require('../admin-password.cjs');

// The retired default, built in pieces so it is not written out in this file.
const RETIRED_DEFAULT = ['Claw', 'Admin', '123!'].join('');

describe('assertAdminPassword', () => {
  it('refuses an unset or empty ADMIN_PASSWORD and names the variable', () => {
    expect(() => assertAdminPassword(undefined)).toThrow(/ADMIN_PASSWORD/);
    expect(() => assertAdminPassword('')).toThrow(/ADMIN_PASSWORD/);
  });

  it('refuses the retired public default without printing it', () => {
    let message = '';
    try {
      assertAdminPassword(RETIRED_DEFAULT);
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toMatch(/ADMIN_PASSWORD/);
    expect(message).not.toContain(RETIRED_DEFAULT);
  });

  it('refuses a password shorter than 12 characters', () => {
    expect(() => assertAdminPassword('a'.repeat(11))).toThrow(/ADMIN_PASSWORD/);
  });

  it('accepts a 12+ character password', () => {
    expect(() => assertAdminPassword('a'.repeat(12))).not.toThrow();
  });
});
