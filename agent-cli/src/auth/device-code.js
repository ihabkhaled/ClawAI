import { publicRequest, ApiError } from '../api/client.js';
import { writeSecrets } from './auth-store.js';
import { updateConfig } from '../config/config-store.js';
import { buildDeviceHint } from './pairing.js';
import * as log from '../utils/logger.js';

async function poll(deviceCode, intervalSeconds, deadline) {
  let interval = Math.max(2, intervalSeconds);
  while (Date.now() < deadline) {
    const response = await publicRequest('/api/v1/agent/auth/device-code/token', {
      method: 'POST',
      body: { deviceCode },
    }).catch((err) => {
      if (err instanceof ApiError && err.status === 200) return err.body;
      throw err;
    });
    if (response.accessToken !== undefined) return response;
    if (response.error === 'slow_down') {
      interval += 5;
    } else if (response.error === 'expired_token') {
      throw new Error('Device code expired');
    } else if (response.error === 'access_denied') {
      throw new Error('Access denied by user');
    }
    await new Promise((r) => setTimeout(r, interval * 1_000));
  }
  throw new Error('Device code polling timed out');
}

export async function loginDeviceCode({ deviceName } = {}) {
  const deviceHint = buildDeviceHint(deviceName);
  const init = await publicRequest('/api/v1/agent/auth/device-code/create', {
    method: 'POST',
    body: { deviceHint },
  });
  log.info(`Visit ${init.verificationUri} and enter code ${init.userCode}`);
  log.dim(`Or open: ${init.verificationUriComplete}`);
  log.dim(`Waiting for approval…`);
  const tokens = await poll(
    init.deviceCode,
    init.intervalSeconds,
    Date.now() + init.expiresIn * 1_000,
  );
  writeSecrets({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    lastRefreshAt: new Date().toISOString(),
  });
  updateConfig({ lastRefreshAt: new Date().toISOString() });
  return tokens;
}
