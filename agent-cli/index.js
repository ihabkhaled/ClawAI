#!/usr/bin/env node
/**
 * Claw Desktop Agent CLI
 *
 * Usage:
 *   claw-agent register --url http://localhost:4000 --key <userApiKey>
 *   claw-agent start
 *   claw-agent stop
 *
 * Environment variables:
 *   CLAW_API_URL   - Override the API base URL (default: http://localhost:4000)
 *   CLAW_USER_KEY  - User JWT token for initial registration
 */

import { createInterface } from 'node:readline';
import { hostname, platform, release } from 'node:os';
import { watch } from 'chokidar';
import { loadConfig, saveConfig } from './config.js';

const VERSION = '1.0.0';
const DEFAULT_API_URL = process.env['CLAW_API_URL'] ?? 'http://localhost:4000';
const HEARTBEAT_INTERVAL_MS = 30_000;
const POLL_INTERVAL_MS = 3_000;

/**
 * POST helper with JSON body.
 * @param {string} url
 * @param {unknown} body
 * @param {string} [authToken]
 * @returns {Promise<unknown>}
 */
async function post(url, body, authToken) {
  const { default: fetch } = await import('node-fetch');
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken !== undefined ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST ${url} failed ${res.status}: ${text}`);
  }
  return res.json();
}

/**
 * GET helper.
 * @param {string} url
 * @param {string} authToken
 * @returns {Promise<unknown>}
 */
async function get(url, authToken) {
  const { default: fetch } = await import('node-fetch');
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  if (!res.ok) {
    throw new Error(`GET ${url} failed ${res.status}`);
  }
  return res.json();
}

/**
 * Normalize Node platform names to the API's canonical labels where needed.
 * @param {NodeJS.Platform} value
 * @returns {string}
 */
function normalizePlatformName(value) {
  if (value === 'win32' || value === 'cygwin') {
    return 'windows';
  }

  return value;
}

/**
 * Register a new agent session with the Claw server.
 * @param {string} apiUrl
 * @param {string} userJwt
 */
async function register(apiUrl, userJwt) {
  console.log(`Registering with ${apiUrl}...`);
  const detectedPlatform = platform();
  const body = {
    hostname: hostname(),
    platform: normalizePlatformName(detectedPlatform),
    agentVersion: VERSION,
    metadata: {
      osRelease: release(),
      nodePlatform: detectedPlatform,
    },
  };
  const result = await post(`${apiUrl}/api/v1/agent/sessions`, body, userJwt);
  const session = /** @type {any} */ (result);
  saveConfig({
    sessionKey: session.sessionKey,
    sessionId: session.id,
    apiBaseUrl: apiUrl,
  });
  console.log(`Registered! Session ID: ${session.id}`);
  console.log('Session key saved to ~/.claw-agent/config.json');
}

/**
 * Execute a shell command and return stdout/stderr.
 * @param {string} command
 * @param {string} [workingDir]
 * @returns {Promise<{exitCode: number, stdout: string, stderr: string}>}
 */
async function executeCommand(command, workingDir) {
  const { exec } = await import('node:child_process');
  return new Promise((resolve) => {
    exec(command, { cwd: workingDir ?? process.cwd() }, (err, stdout, stderr) => {
      resolve({
        exitCode: err?.code ?? 0,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      });
    });
  });
}

/**
 * Start the agent loop: heartbeat + command polling + file watching.
 */
async function start() {
  const config = loadConfig();
  if (config === null || config.sessionKey === undefined) {
    console.error('Not registered. Run: claw-agent register --url <url> --key <jwt>');
    process.exit(1);
  }

  const { sessionKey, sessionId, apiBaseUrl } = config;
  console.log(`Starting Claw Agent v${VERSION}`);
  console.log(`Session: ${sessionId}`);
  console.log(`API: ${apiBaseUrl}`);
  console.log('Polling for commands every 3s... (Ctrl+C to stop)');

  // Heartbeat loop
  const heartbeatTimer = setInterval(async () => {
    try {
      await post(`${apiBaseUrl}/api/v1/agent/sessions/${sessionId}/heartbeat`, {}, sessionKey);
    } catch (err) {
      console.warn(`Heartbeat failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, HEARTBEAT_INTERVAL_MS);

  // Command poll loop
  const pollTimer = setInterval(async () => {
    try {
      const commands = /** @type {any[]} */ (
        await get(`${apiBaseUrl}/api/v1/agent/commands/pending`, sessionKey)
      );
      for (const cmd of commands) {
        console.log(`Executing: ${cmd.command}`);
        const result = await executeCommand(cmd.command, cmd.workingDir ?? undefined);
        await post(
          `${apiBaseUrl}/api/v1/agent/commands/${cmd.id}/complete`,
          {
            exitCode: result.exitCode,
            stdout: result.stdout.slice(0, 10_000),
            stderr: result.stderr.slice(0, 5_000),
          },
          sessionKey,
        );
        console.log(`Completed: ${cmd.id} (exit ${result.exitCode})`);
      }
    } catch (err) {
      console.warn(`Poll failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, POLL_INTERVAL_MS);

  // File watcher (reports to server)
  const watcher = watch(process.cwd(), {
    ignored: /node_modules|\.git|dist|\.next/,
    ignoreInitial: true,
    depth: 5,
  });

  let eventBatch = /** @type {Array<{eventType: string, filePath: string}>} */ ([]);
  let flushTimer = /** @type {ReturnType<typeof setTimeout>|null} */ (null);

  const flushEvents = async () => {
    if (eventBatch.length === 0) {
      return;
    }
    const batch = eventBatch.splice(0);
    try {
      await post(`${apiBaseUrl}/api/v1/agent/events`, { events: batch }, sessionKey);
    } catch {
      // Non-critical: events may fail silently
    }
  };

  const queueEvent = (type, filePath) => {
    eventBatch.push({ eventType: type, filePath });
    if (flushTimer !== null) {
      clearTimeout(flushTimer);
    }
    flushTimer = setTimeout(() => {
      void flushEvents();
    }, 2_000);
  };

  watcher
    .on('add', (fp) => queueEvent('CREATED', fp))
    .on('change', (fp) => queueEvent('MODIFIED', fp))
    .on('unlink', (fp) => queueEvent('DELETED', fp));

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down agent...');
    clearInterval(heartbeatTimer);
    clearInterval(pollTimer);
    await watcher.close();
    try {
      await post(`${apiBaseUrl}/api/v1/agent/sessions/${sessionId}/disconnect`, {}, sessionKey);
    } catch {
      // Best-effort disconnect
    }
    console.log('Agent stopped.');
    process.exit(0);
  });
}

// ─── CLI entry point ──────────────────────────────────────────────────────────
const [, , command, ...args] = process.argv;

if (command === 'register') {
  const urlIndex = args.indexOf('--url');
  const keyIndex = args.indexOf('--key');
  const apiUrl = urlIndex !== -1 ? args[urlIndex + 1] : DEFAULT_API_URL;
  const userJwt = keyIndex !== -1 ? args[keyIndex + 1] : process.env['CLAW_USER_KEY'];
  if (userJwt === undefined || userJwt === '') {
    console.error('Missing JWT. Use: claw-agent register --url <url> --key <jwt>');
    process.exit(1);
  }
  register(apiUrl ?? DEFAULT_API_URL, userJwt).catch(console.error);
} else if (command === 'start') {
  start().catch(console.error);
} else if (command === 'status') {
  const config = loadConfig();
  if (config === null || config.sessionKey === undefined) {
    console.log('Not registered.');
  } else {
    console.log(`Session: ${config.sessionId}`);
    console.log(`API: ${config.apiBaseUrl}`);
  }
} else {
  console.log(`Claw Desktop Agent v${VERSION}`);
  console.log('');
  console.log('Commands:');
  console.log('  register --url <api-url> --key <jwt>  Register this machine');
  console.log('  start                                  Start the agent loop');
  console.log('  status                                 Show current config');
}
