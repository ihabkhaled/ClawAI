import { version } from '../../../../package.json';

/**
 * The version this service reports on `/health`.
 *
 * Read from `package.json` rather than written here. A hardcoded copy is a second
 * source of truth that nothing keeps in step: this one still said `0.1.0` at the
 * 1.0.0 release, so the health endpoint was reporting a version the service had not
 * been for a long time — and nothing failed, because no gate compares the two.
 */
export const SERVICE_VERSION: string = version;
