import { request } from '../api/client.js';
import * as log from '../utils/logger.js';

async function listDevices(asJson) {
  const page = await request('/api/v1/agent/devices?page=1&pageSize=50');
  if (asJson) {
    console.log(JSON.stringify(page, null, 2));
    return;
  }
  if (page.total === 0) {
    log.warn('No devices.');
    return;
  }
  for (const device of page.data) {
    log.info(`${device.name} (${device.id})  ${device.status}`);
    log.dim(`  host: ${device.hostname}  os: ${device.os}  version: ${device.agentVersion}`);
    log.dim(`  scopes: ${device.scopes.join(', ')}`);
    log.dim(`  lastSeen: ${device.lastSeenAt ?? 'never'}`);
  }
}

async function revokeDevice(id, asJson) {
  await request(`/api/v1/agent/devices/${encodeURIComponent(id)}/revoke`, {
    method: 'POST',
    body: { reason: 'cli_revoke' },
  });
  if (asJson) console.log(JSON.stringify({ ok: true, deviceId: id }, null, 2));
  else log.success(`Device ${id} revoked.`);
}

async function renameDevice(id, newName, asJson) {
  const result = await request(`/api/v1/agent/devices/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: { name: newName },
  });
  if (asJson) console.log(JSON.stringify(result, null, 2));
  else log.success(`Device ${id} renamed to "${newName}".`);
}

export async function runDevices(flags, positional) {
  const asJson = flags['--json'] === true;
  try {
    if (flags['--revoke'] !== undefined) {
      await revokeDevice(flags['--revoke'], asJson);
      return;
    }
    if (flags['--rename'] !== undefined) {
      const [id, ...rest] = [flags['--rename'], ...positional];
      const newName = rest.join(' ');
      if (newName.length === 0) {
        log.error('Usage: claw-agent devices --rename <id> <new-name>');
        process.exitCode = 1;
        return;
      }
      await renameDevice(id, newName, asJson);
      return;
    }
    await listDevices(asJson);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (asJson) console.log(JSON.stringify({ ok: false, error: message }, null, 2));
    else log.error(message);
    process.exitCode = 1;
  }
}
