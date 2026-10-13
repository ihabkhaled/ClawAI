import { installNotFound } from './install-not-found.utility';
import { isForeignKeyViolation } from './is-foreign-key-violation.utility';

/**
 * Catch handler for a write keyed by an install id. An uninstall that lands between the ownership
 * check and the write drops the install row, so the foreign key fails: that is a 404, not a 500.
 */
export function rethrowInstallGone(error: unknown): never {
  throw isForeignKeyViolation(error) ? installNotFound() : error;
}
