import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { getConfigDir, getConfigFile } from './paths.js';

const DEFAULT_CONFIG = {
  apiUrl: 'http://localhost:4000',
  deviceId: null,
  lastRefreshAt: null,
  storageBackend: 'encrypted-file',
  logLevel: 'info',
};

function ensureDir() {
  const dir = getConfigDir();
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

export function readConfig() {
  const file = getConfigFile();
  if (!existsSync(file)) return { ...DEFAULT_CONFIG };
  try {
    const raw = readFileSync(file, 'utf8');
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function writeConfig(config) {
  ensureDir();
  writeFileSync(getConfigFile(), JSON.stringify(config, null, 2), { mode: 0o600 });
}

export function updateConfig(patch) {
  const current = readConfig();
  const next = { ...current, ...patch };
  writeConfig(next);
  return next;
}

export function clearConfig() {
  writeConfig({ ...DEFAULT_CONFIG });
}

export function getApiUrl() {
  return process.env.CLAW_API_URL ?? readConfig().apiUrl;
}

export const ALLOWED_CONFIG_KEYS = ['apiUrl', 'logLevel'];
