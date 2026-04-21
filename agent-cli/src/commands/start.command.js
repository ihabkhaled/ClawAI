import { hostname, platform, release } from 'node:os';
import chokidar from 'chokidar';
import { request, ApiError } from '../api/client.js';
import { readSecrets } from '../auth/auth-store.js';
import { AGENT_VERSION } from '../auth/pairing.js';
import { getPlatform } from '../config/paths.js';
import { runWithStream } from '../runtime/spawn-manager.js';
import * as log from '../utils/logger.js';

const HEARTBEAT_INTERVAL_MS = 30_000;
const POLL_INTERVAL_MS = 3_000;
const EVENT_BATCH_WINDOW_MS = 2_000;
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

async function executeShellCommand(command, workingDir, timeoutSeconds, commandId) {
  const result = await runWithStream(commandId, command, workingDir, timeoutSeconds);
  return {
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: result.exitCode,
  };
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
    const result = await executeShellCommand(
      cmd.command,
      cmd.workingDir,
      cmd.timeoutSeconds,
      cmd.id,
    );
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
