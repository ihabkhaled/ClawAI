import { spawn } from 'node:child_process';
import { request } from '../api/client.js';
import { getPlatform } from '../config/paths.js';
import * as log from '../utils/logger.js';

const CANCEL_POLL_INTERVAL_MS = 1_000;
const SIGTERM_GRACE_MS = 5_000;
const CHUNK_FLUSH_INTERVAL_MS = 500;
const CHUNK_MAX_BYTES = 32 * 1024;
const DEFAULT_TIMEOUT_MS = 300_000;
const STDOUT_MAX_BYTES = 64 * 1024;
const STDERR_MAX_BYTES = 32 * 1024;

function getShell() {
  return getPlatform() === 'windows'
    ? { cmd: 'cmd.exe', args: ['/d', '/s', '/c'] }
    : { cmd: '/bin/sh', args: ['-c'] };
}

async function pushChunks(commandId, chunks) {
  try {
    const result = await request(`/api/v1/agent/commands/${encodeURIComponent(commandId)}/chunks`, {
      method: 'POST',
      body: { chunks },
    });
    return result?.cancelRequested === true;
  } catch (err) {
    log.warn(`Chunk push failed: ${err instanceof Error ? err.message : 'unknown'}`);
    return false;
  }
}

function createChunkBatcher(commandId) {
  let buffer = [];
  let timer = null;
  let cancelDetected = false;
  const flush = async () => {
    timer = null;
    if (buffer.length === 0) return;
    const batch = buffer.splice(0, buffer.length);
    const cancelled = await pushChunks(commandId, batch);
    if (cancelled) cancelDetected = true;
  };
  const push = (type, data) => {
    if (data.length === 0) return;
    const truncated = data.length > CHUNK_MAX_BYTES ? data.slice(0, CHUNK_MAX_BYTES) : data;
    buffer.push({ type, data: truncated, timestamp: new Date().toISOString() });
    if (timer === null) timer = setTimeout(() => void flush(), CHUNK_FLUSH_INTERVAL_MS);
  };
  return {
    push,
    async drain() {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      await flush();
    },
    get cancelRequested() {
      return cancelDetected;
    },
  };
}

export async function runWithStream(commandId, commandString, workingDir, timeoutSeconds) {
  const shell = getShell();
  const cwd = workingDir && workingDir.length > 0 ? workingDir : process.cwd();
  const child = spawn(shell.cmd, [...shell.args, commandString], {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  const timeoutMs =
    typeof timeoutSeconds === 'number' && timeoutSeconds > 0
      ? timeoutSeconds * 1_000
      : DEFAULT_TIMEOUT_MS;
  const batcher = createChunkBatcher(commandId);
  let stdoutAgg = '';
  let stderrAgg = '';
  child.stdout?.on('data', (chunk) => {
    const text = chunk.toString('utf8');
    batcher.push('stdout', text);
    if (stdoutAgg.length < STDOUT_MAX_BYTES) {
      stdoutAgg = (stdoutAgg + text).slice(0, STDOUT_MAX_BYTES);
    }
  });
  child.stderr?.on('data', (chunk) => {
    const text = chunk.toString('utf8');
    batcher.push('stderr', text);
    if (stderrAgg.length < STDERR_MAX_BYTES) {
      stderrAgg = (stderrAgg + text).slice(0, STDERR_MAX_BYTES);
    }
  });
  let killedBy = null;
  const cancelPoll = setInterval(() => {
    if (batcher.cancelRequested && killedBy === null) {
      killedBy = 'cancel';
      child.kill('SIGTERM');
      setTimeout(() => {
        if (child.exitCode === null) {
          try {
            child.kill('SIGKILL');
          } catch {
            // best-effort
          }
        }
      }, SIGTERM_GRACE_MS);
    }
  }, CANCEL_POLL_INTERVAL_MS);
  const timeoutTimer = setTimeout(() => {
    if (killedBy === null) {
      killedBy = 'timeout';
      child.kill('SIGTERM');
      setTimeout(() => {
        if (child.exitCode === null) {
          try {
            child.kill('SIGKILL');
          } catch {
            // best-effort
          }
        }
      }, SIGTERM_GRACE_MS);
    }
  }, timeoutMs);
  const exitInfo = await new Promise((resolve) => {
    child.on('close', (code, signal) => {
      clearInterval(cancelPoll);
      clearTimeout(timeoutTimer);
      resolve({ code: typeof code === 'number' ? code : 1, signal });
    });
  });
  await batcher.drain();
  return {
    stdout: stdoutAgg,
    stderr: stderrAgg,
    exitCode: exitInfo.code,
    killedBy,
    signal: exitInfo.signal,
  };
}
