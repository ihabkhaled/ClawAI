import { loginMagicLink } from '../auth/pairing.js';
import { loginDeviceCode } from '../auth/device-code.js';
import * as log from '../utils/logger.js';

export async function runLogin(flags) {
  const deviceName = flags['--device-name'];
  const noOpen = flags['--no-open'] === true;
  const forceDeviceCode = flags['--device-code'] === true;
  const asJson = flags['--json'] === true;
  try {
    const tokens = forceDeviceCode
      ? await loginDeviceCode({ deviceName })
      : await loginMagicLink({ noOpen, deviceName });
    if (asJson) {
      console.log(JSON.stringify({ ok: true, expiresIn: tokens.expiresIn }, null, 2));
    } else {
      log.success('Device paired. You are logged in.');
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (asJson) {
      console.log(JSON.stringify({ ok: false, error: message }, null, 2));
    } else {
      log.error(`Login failed: ${message}`);
    }
    process.exitCode = 1;
  }
}
