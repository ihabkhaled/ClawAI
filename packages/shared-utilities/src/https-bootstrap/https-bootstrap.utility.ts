import * as fs from 'node:fs';

import type { HttpsOptions } from './https-bootstrap.types';

// Single source of truth for the env-var contract — every service reads
// the same two paths so the install-tls scripts only need to populate
// one .env block. NODE_EXTRA_CA_CERTS is set independently (in the
// container env / docker-compose) so node's built-in fetch and the
// global https stack trust the mkcert root CA before any user code runs.
const HTTPS_CERT_PATH_ENV = 'HTTPS_CERT_PATH';
const HTTPS_KEY_PATH_ENV = 'HTTPS_KEY_PATH';

/**
 * Resolve the HTTPS bootstrap options for a NestJS app. Returns `undefined`
 * when HTTPS_CERT_PATH / HTTPS_KEY_PATH are not set, or when either file
 * is missing — in that case the caller boots over plain HTTP so a stale
 * cert mount or a fresh dev box without TLS installed still works.
 *
 * Wrap once in every service `main.ts`:
 *
 *   const httpsOptions = resolveHttpsOptions();
 *   const app = await NestFactory.create(AppModule, { httpsOptions, bufferLogs: true });
 *
 * The function deliberately swallows fs errors and warns to stderr so a
 * misconfigured cert path never takes a service offline at boot.
 */
export function resolveHttpsOptions(): HttpsOptions | undefined {
  const certPath = process.env[HTTPS_CERT_PATH_ENV];
  const keyPath = process.env[HTTPS_KEY_PATH_ENV];
  if (certPath === undefined || certPath === '' || keyPath === undefined || keyPath === '') {
    return undefined;
  }
  try {
    const cert = fs.readFileSync(certPath);
    const key = fs.readFileSync(keyPath);
    return { cert, key };
  } catch (error) {
    // Stderr only — pino isn't bootstrapped yet at this point.
    process.stderr.write(
      `[https-bootstrap] cert read failed at cert=${certPath} key=${keyPath}: ${
        error instanceof Error ? error.message : String(error)
      } — falling back to HTTP\n`,
    );
    return undefined;
  }
}
