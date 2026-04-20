import { request } from '../api/client.js';
import { readSecrets } from '../auth/auth-store.js';
import * as log from '../utils/logger.js';

export async function runWhoami(flags) {
  const asJson = flags['--json'] === true;
  const secrets = readSecrets();
  if (secrets === null) {
    if (asJson) console.log(JSON.stringify({ ok: false, error: 'not_logged_in' }, null, 2));
    else log.warn('Not logged in. Run `claw-agent login`.');
    process.exitCode = 1;
    return;
  }
  try {
    const page = await request('/api/v1/agent/devices?page=1&pageSize=1');
    const device = Array.isArray(page?.data) && page.data.length > 0 ? page.data[0] : null;
    if (asJson) {
      console.log(
        JSON.stringify({ ok: true, device, lastRefreshAt: secrets.lastRefreshAt ?? null }, null, 2),
      );
      return;
    }
    if (device === null) {
      log.warn('Logged in but no devices found for this account.');
      return;
    }
    log.info(`Device: ${device.name}  (${device.id})`);
    log.dim(`Hostname: ${device.hostname}`);
    log.dim(`OS: ${device.os}  ${device.platform}`);
    log.dim(`Agent version: ${device.agentVersion}`);
    log.dim(`Scopes: ${device.scopes.join(', ')}`);
    log.dim(`Status: ${device.status}`);
    log.dim(`Last seen: ${device.lastSeenAt ?? 'never'}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (asJson) console.log(JSON.stringify({ ok: false, error: message }, null, 2));
    else log.error(message);
    process.exitCode = 1;
  }
}
