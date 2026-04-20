import { readSecrets } from '../auth/auth-store.js';
import { readConfig } from '../config/config-store.js';
import * as log from '../utils/logger.js';

export function runStatus(flags) {
  const asJson = flags['--json'] === true;
  const config = readConfig();
  const secrets = readSecrets();
  const loggedIn = secrets !== null;
  if (asJson) {
    console.log(
      JSON.stringify(
        {
          loggedIn,
          apiUrl: config.apiUrl,
          lastRefreshAt: secrets?.lastRefreshAt ?? null,
          storageBackend: 'encrypted-file',
        },
        null,
        2,
      ),
    );
    return;
  }
  if (loggedIn) log.success('Logged in');
  else log.warn('Not logged in');
  log.dim(`apiUrl: ${config.apiUrl}`);
  log.dim(`lastRefreshAt: ${secrets?.lastRefreshAt ?? 'never'}`);
  log.dim(`storage: encrypted-file (keychain backend lands in Phase B)`);
}
