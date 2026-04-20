import { readConfig, updateConfig, ALLOWED_CONFIG_KEYS } from '../config/config-store.js';
import * as log from '../utils/logger.js';

export function runConfig(flags, positional) {
  const asJson = flags['--json'] === true;
  const [sub, key, ...rest] = positional;
  const value = rest.join(' ');
  if (sub === 'get') {
    const config = readConfig();
    if (key === undefined) {
      if (asJson) console.log(JSON.stringify(config, null, 2));
      else {
        for (const k of Object.keys(config)) log.info(`${k}=${JSON.stringify(config[k])}`);
      }
      return;
    }
    if (asJson) console.log(JSON.stringify({ [key]: config[key] ?? null }, null, 2));
    else log.info(`${key}=${JSON.stringify(config[key] ?? null)}`);
    return;
  }
  if (sub === 'set') {
    if (key === undefined || value.length === 0) {
      log.error('Usage: claw-agent config set <key> <value>');
      process.exitCode = 1;
      return;
    }
    if (!ALLOWED_CONFIG_KEYS.includes(key)) {
      log.error(`Key "${key}" is not settable. Allowed: ${ALLOWED_CONFIG_KEYS.join(', ')}`);
      process.exitCode = 1;
      return;
    }
    const next = updateConfig({ [key]: value });
    if (asJson) console.log(JSON.stringify({ ok: true, [key]: next[key] }, null, 2));
    else log.success(`Set ${key}=${value}`);
    return;
  }
  log.error('Usage: claw-agent config get [key]  |  claw-agent config set <key> <value>');
  process.exitCode = 1;
}
