import { readSecrets, clearSecrets } from '../auth/auth-store.js';
import { request, ApiError } from '../api/client.js';
import * as log from '../utils/logger.js';

export async function runLogout(flags) {
  const asJson = flags['--json'] === true;
  const secrets = readSecrets();
  let deviceId = null;
  if (secrets !== null) {
    try {
      const me = await request('/api/v1/agent/devices?page=1&pageSize=1');
      deviceId = Array.isArray(me?.data) && me.data.length > 0 ? me.data[0].id : null;
    } catch {
      deviceId = null;
    }
    if (deviceId !== null) {
      try {
        await request(`/api/v1/agent/devices/${deviceId}/revoke`, {
          method: 'POST',
          body: { reason: 'user_logout' },
        });
      } catch (err) {
        if (!(err instanceof ApiError) || err.status !== 401) {
          log.warn(`Could not revoke on server: ${err instanceof Error ? err.message : 'unknown'}`);
        }
      }
    }
  }
  clearSecrets();
  if (asJson) {
    console.log(JSON.stringify({ ok: true }, null, 2));
  } else {
    log.success('Logged out. Credentials cleared.');
  }
}
