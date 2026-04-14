import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const CONFIG_DIR = join(homedir(), '.claw-agent');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

/**
 * @typedef {Object} AgentConfig
 * @property {string} sessionKey - The session key returned on registration
 * @property {string} sessionId - The session ID
 * @property {string} apiBaseUrl - The Claw API base URL
 */

/**
 * Load config from disk.
 * @returns {AgentConfig|null}
 */
export function loadConfig() {
  if (!existsSync(CONFIG_FILE)) {
    return null;
  }
  try {
    const raw = readFileSync(CONFIG_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Save config to disk.
 * @param {AgentConfig} config
 */
export function saveConfig(config) {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * Clear saved config (logout).
 */
export function clearConfig() {
  if (existsSync(CONFIG_FILE)) {
    writeFileSync(CONFIG_FILE, '{}', 'utf-8');
  }
}
