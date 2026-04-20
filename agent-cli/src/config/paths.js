import { homedir, platform } from 'node:os';
import { join } from 'node:path';

export const APP_DIR_NAME = '.claw-agent';

export function getConfigDir() {
  return join(homedir(), APP_DIR_NAME);
}

export function getConfigFile() {
  return join(getConfigDir(), 'config.json');
}

export function getSecretsFile() {
  return join(getConfigDir(), 'secrets.enc');
}

export function getLegacyConfigFile() {
  return join(homedir(), APP_DIR_NAME, 'config.json');
}

export function getPlatform() {
  const p = platform();
  if (p === 'win32' || p === 'cygwin') return 'windows';
  return p;
}
