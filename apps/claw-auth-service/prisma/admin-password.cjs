'use strict';

const MIN_ADMIN_PASSWORD_LENGTH = 12;
// Built in pieces so the retired default never appears as one string in this repository.
const RETIRED_DEFAULT_ADMIN_PASSWORD = ['Claw', 'Admin', '123!'].join('');

/**
 * Throws when ADMIN_PASSWORD may not be used to create the admin account.
 * The message names the env var and never the value.
 */
function assertAdminPassword(value) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(
      'ADMIN_PASSWORD is not set. Set it to a long unique password (12+ characters) before seeding the admin account.',
    );
  }
  if (value === RETIRED_DEFAULT_ADMIN_PASSWORD) {
    throw new Error(
      'ADMIN_PASSWORD is the retired public default. Set a long unique password (12+ characters).',
    );
  }
  if (value.length < MIN_ADMIN_PASSWORD_LENGTH) {
    throw new Error(
      `ADMIN_PASSWORD is shorter than ${MIN_ADMIN_PASSWORD_LENGTH} characters. Set a longer unique password.`,
    );
  }
}

module.exports = { assertAdminPassword, MIN_ADMIN_PASSWORD_LENGTH };
