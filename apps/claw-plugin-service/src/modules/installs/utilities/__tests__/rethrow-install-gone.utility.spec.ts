import { NotFoundException } from '@nestjs/common';

import { installNotFound } from '../install-not-found.utility';
import { isForeignKeyViolation } from '../is-foreign-key-violation.utility';
import { rethrowInstallGone } from '../rethrow-install-gone.utility';

describe('isForeignKeyViolation', () => {
  it('is true only for the Prisma P2003 code', () => {
    expect(isForeignKeyViolation({ code: 'P2003' })).toBe(true);
    expect(isForeignKeyViolation({ code: 'P2002' })).toBe(false);
    expect(isForeignKeyViolation(new Error('x'))).toBe(false);
    expect(isForeignKeyViolation(null)).toBe(false);
    expect(isForeignKeyViolation('P2003')).toBe(false);
  });
});

describe('installNotFound', () => {
  it('is a 404 carrying PLUGIN_INSTALL_NOT_FOUND', () => {
    const error = installNotFound();

    expect(error).toBeInstanceOf(NotFoundException);
    expect(error.getResponse()).toMatchObject({ errorCode: 'PLUGIN_INSTALL_NOT_FOUND' });
  });
});

describe('rethrowInstallGone', () => {
  it('turns a foreign key failure into the install 404', () => {
    expect(() => rethrowInstallGone({ code: 'P2003' })).toThrow(NotFoundException);
  });

  it('rethrows anything else as it came', () => {
    const boom = new Error('db down');

    expect(() => rethrowInstallGone(boom)).toThrow(boom);
  });
});
