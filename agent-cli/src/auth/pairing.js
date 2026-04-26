import { createServer } from 'node:http';
import { hostname, platform, release } from 'node:os';
import { spawn } from 'node:child_process';
import { publicRequest, apiUrl, ApiError } from '../api/client.js';
import { writeSecrets } from './auth-store.js';
import { updateConfig } from '../config/config-store.js';
import { getPlatform } from '../config/paths.js';
import * as log from '../utils/logger.js';

export const AGENT_VERSION = '2.0.0-phase-a';

export function buildDeviceHint(overrideName) {
  return {
    name: overrideName,
    hostname: hostname(),
    os: getPlatform(),
    platform: `${platform()}/${release()}`.slice(0, 32),
    agentVersion: AGENT_VERSION,
  };
}

function openBrowser(url) {
  if (typeof url !== 'string' || !url.startsWith('https://')) {
    return false;
  }
  const osName = getPlatform();
  const opener =
    osName === 'windows'
      ? { cmd: 'explorer.exe', args: [url] }
      : osName === 'darwin'
        ? { cmd: 'open', args: ['--', url] }
        : { cmd: 'xdg-open', args: ['--', url] };
  try {
    const proc = spawn(opener.cmd, opener.args, { stdio: 'ignore', detached: true, shell: false });
    proc.unref();
    return true;
  } catch {
    return false;
  }
}

async function startLoopback() {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end(
        '<html><body><h2>ClawAI CLI paired</h2><p>You can close this tab and return to your terminal.</p></body></html>',
      );
    });
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address !== null ? address.port : 0;
      resolve({ server, port });
    });
    server.on('error', () => resolve({ server: null, port: 0 }));
  });
}

async function poll(pairingCode, intervalSeconds, deadline) {
  while (Date.now() < deadline) {
    const response = await publicRequest(
      `/api/v1/agent/auth/pair/poll?pairingCode=${encodeURIComponent(pairingCode)}`,
      { method: 'POST' },
    ).catch((err) => {
      if (err instanceof ApiError && err.status === 404) return { status: 'expired' };
      throw err;
    });
    if (response.status === 'approved' && response.tokens !== undefined) return response.tokens;
    if (response.status === 'denied') throw new Error('Pairing denied by user');
    if (response.status === 'expired') throw new Error('Pairing code expired');
    await new Promise((r) => setTimeout(r, Math.max(1_000, intervalSeconds * 1_000)));
  }
  throw new Error('Pairing timed out');
}

export async function loginMagicLink({ noOpen = false, deviceName } = {}) {
  const loopback = await startLoopback();
  const deviceHint = buildDeviceHint(deviceName);
  const init = await publicRequest('/api/v1/agent/auth/pair/init', {
    method: 'POST',
    body: { deviceHint, loopbackPort: loopback.port > 0 ? loopback.port : null },
  });
  const url = init.verificationUrl;
  log.info(`Opening browser to approve this device…`);
  log.dim(`If the browser does not open, visit: ${url}`);
  if (!noOpen) openBrowser(url);
  try {
    const tokens = await poll(
      init.pairingCode,
      init.intervalSeconds ?? 2,
      new Date(init.expiresAt).getTime(),
    );
    writeSecrets({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      lastRefreshAt: new Date().toISOString(),
    });
    updateConfig({ lastRefreshAt: new Date().toISOString() });
    return tokens;
  } finally {
    if (loopback.server !== null) {
      try {
        loopback.server.close();
      } catch {
        // best-effort
      }
    }
  }
}

export function pairingVerificationUrl(pairingCode) {
  return apiUrl(`/agent/connect?pairingCode=${encodeURIComponent(pairingCode)}`);
}
