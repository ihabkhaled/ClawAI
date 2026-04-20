import { hostname, platform, release } from 'node:os';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import chokidar from 'chokidar';
import { request, ApiError } from '../api/client.js';
import { readSecrets } from '../auth/auth-store.js';
import { AGENT_VERSION } from '../auth/pairing.js';
import { getPlatform } from '../config/paths.js';
import * as log from '../utils/logger.js';

const execAsync = promisify(exec);

const HEARTBEAT_INTERVAL_MS = 30_000;
const POLL_INTERVAL_MS = 3_000;
const EVENT_BATCH_WINDOW_MS = 2_000;
const EXEC_TIMEOUT_MS = 60_000;
const STDOUT_MAX_BYTES = 10 * 1024;
const STDERR_MAX_BYTES = 5 * 1024;
const WATCH_DEPTH = 5;
const WATCH_IGNORES = /(^|[\/\\])(node_modules|\.git|dist|\.next|\.turbo|\.cache)/;
const FILE_EVENT_MAP = {
  add: 'CREATED',
  change: 'MODIFIED',
  unlink: 'DELETED',
};

async function attach() {
  const body = {
    hostname: hostname(),
    platform: `${platform()}/${release()}`.slice(0, 64),
    agentVersion: AGENT_VERSION,
    metadata: { os: getPlatform() },
  };
  return request('/api/v1/agent/sessions/attach', { method: 'POST', body });
}

async function heartbeat(sessionId) {
  try {
    await request(`/api/v1/agent/sessions/${encodeURIComponent(sessionId)}/heartbeat`, {
      method: 'POST',
    });
  } catch (err) {
    log.warn(`Heartbeat failed: ${err instanceof Error ? err.message : 'unknown'}`);
  }
}

async function executeShellCommand(command, workingDir) {
  const cwd = workingDir && workingDir.length > 0 ? workingDir : process.cwd();
  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd,
      timeout: EXEC_TIMEOUT_MS,
      maxBuffer: 16 * 1024 * 1024,
    });
    return {
      stdout: String(stdout ?? '').slice(0, STDOUT_MAX_BYTES),
      stderr: String(stderr ?? '').slice(0, STDERR_MAX_BYTES),
      exitCode: 0,
    };
  } catch (err) {
    const stdout = String(err?.stdout ?? '').slice(0, STDOUT_MAX_BYTES);
    const stderr = String(err?.stderr ?? err?.message ?? '').slice(0, STDERR_MAX_BYTES);
    const exitCode = typeof err?.code === 'number' ? err.code : 1;
    return { stdout, stderr, exitCode };
  }
}

async function pollAndRunCommands(sessionId) {
  let commands;
  try {
    commands = await request(
      `/api/v1/agent/commands/pending?sessionId=${encodeURIComponent(sessionId)}`,
      { method: 'GET' },
    );
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
      throw err;
    }
    log.warn(`Poll failed: ${err instanceof Error ? err.message : 'unknown'}`);
    return;
  }
  if (!Array.isArray(commands) || commands.length === 0) return;
  for (const cmd of commands) {
    log.info(`Executing command ${cmd.id} (risk=${cmd.riskLabel ?? 'LOW'})`);
    const result = await executeShellCommand(cmd.command, cmd.workingDir);
    try {
      await request(
        `/api/v1/agent/commands/${encodeURIComponent(cmd.id)}/complete?sessionId=${encodeURIComponent(sessionId)}`,
        { method: 'POST', body: result },
      );
      log.dim(`  ↳ exit=${result.exitCode}`);
    } catch (err) {
      log.warn(`Complete failed: ${err instanceof Error ? err.message : 'unknown'}`);
    }
  }
}

function startWatcher(sessionId, pushEvent) {
  const watcher = chokidar.watch(process.cwd(), {
    ignored: WATCH_IGNORES,
    depth: WATCH_DEPTH,
    ignoreInitial: true,
    persistent: true,
  });
  for (const kind of ['add', 'change', 'unlink']) {
    watcher.on(kind, (path) => pushEvent({ eventType: FILE_EVENT_MAP[kind], filePath: path }));
  }
  return watcher;
}

function createEventBatcher(sessionId) {
  const queue = [];
  let timer = null;
  const flush = async () => {
    if (queue.length === 0) {
      timer = null;
      return;
    }
    const events = queue.splice(0, queue.length);
    try {
      await request('/api/v1/agent/events', {
        method: 'POST',
        body: { sessionId, events },
      });
    } catch (err) {
      log.warn(`Event push failed: ${err instanceof Error ? err.message : 'unknown'}`);
    }
    timer = null;
  };
  return {
    push(event) {
      queue.push(event);
      if (timer === null) timer = setTimeout(flush, EVENT_BATCH_WINDOW_MS);
    },
    async drain() {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      await flush();
    },
  };
}

export async function runStart(flags) {
  const asJson = flags['--json'] === true;
  const secrets = readSecrets();
  if (secrets === null) {
    log.error('Not logged in. Run `claw-agent login` first.');
    process.exitCode = 1;
    return;
  }
  log.info('Attaching session to this device…');
  let session;
  try {
    session = await attach();
  } catch (err) {
    log.error(`Attach failed: ${err instanceof Error ? err.message : 'unknown'}`);
    process.exitCode = 1;
    return;
  }
  if (asJson) console.log(JSON.stringify(session, null, 2));
  else log.success(`Session ${session.sessionId} attached.`);
  const batcher = createEventBatcher(session.sessionId);
  const watcher =
    flags['--no-watch'] === true ? null : startWatcher(session.sessionId, batcher.push);
  const heartbeatTimer = setInterval(
    () => void heartbeat(session.sessionId),
    HEARTBEAT_INTERVAL_MS,
  );
  await heartbeat(session.sessionId);
  let running = true;
  const shutdown = async () => {
    if (!running) return;
    running = false;
    log.info('Shutting down…');
    clearInterval(heartbeatTimer);
    if (watcher !== null) await watcher.close().catch(() => {});
    await batcher.drain();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
  while (running) {
    try {
      await pollAndRunCommands(session.sessionId);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        log.error('Device revoked or token invalid. Exiting.');
        break;
      }
      log.warn(err instanceof Error ? err.message : String(err));
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  await shutdown();
}
