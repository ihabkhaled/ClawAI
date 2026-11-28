import { spawnSync } from 'node:child_process';
import process from 'node:process';

// Throwaway-container helpers for the Docker-backed tests (nginx-edge-docker, fail2ban-docker). They run when
// CLAW_DOCKER_TESTS=1 (opt-in: they pull images and take about a minute, so the pre-push hook and a plain
// `npm run knowledge:test` skip them; add the variable to a CI job to run them there), and only when a Docker
// daemon answers; otherwise they skip with the reason.
// They never touch a running container: every name is unique to the test process and removed afterwards.

/** @param {string[]} args @param {{ input?: string, timeout?: number }} [options] */
export function docker(args, options = {}) {
  const result = spawnSync('docker', args, {
    encoding: 'utf8',
    input: options.input,
    timeout: options.timeout ?? 180_000,
    maxBuffer: 256 * 1024 * 1024,
  });
  return {
    status: result.status ?? -1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    output: `${result.stdout ?? ''}${result.stderr ?? ''}`,
  };
}

/** The reason to skip a Docker-backed test, or false when it should run. */
export function dockerSkipReason() {
  if (process.env.CLAW_DOCKER_TESTS !== '1')
    return 'set CLAW_DOCKER_TESTS=1 to run the throwaway-container tests';
  const info = docker(['info', '--format', '{{.ServerVersion}}'], { timeout: 20_000 });
  return info.status === 0 ? false : 'no Docker daemon answers';
}

/** A name that cannot collide with a real container: the pid keeps parallel test runs apart. */
export const uniqueName = (label) => `claw-test-${label}-${process.pid}`;
