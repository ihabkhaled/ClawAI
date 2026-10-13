// Git primitives for the gate tooling. Every helper here FAILS LOUDLY: a git
// error is never turned into an empty result, because an empty file list reads
// as "nothing changed" and lets a gate pass without checking anything. Callers
// that genuinely accept an empty answer say so at the call site.
import { execFileSync } from 'node:child_process';

export const ZERO_SHA = '0000000000000000000000000000000000000000';

/** Run git and return trimmed stdout; throws with git's own message on failure. */
export function git(args, options = {}) {
  try {
    return execFileSync('git', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      ...options,
    }).trim();
  } catch (error) {
    const stderr = String(error.stderr ?? '').trim();
    throw new Error(`git ${args.join(' ')} failed${stderr ? `: ${stderr}` : ''}`);
  }
}

/** Non-empty output lines of a git command. Throws when git fails. */
export function gitLines(args) {
  return git(args).split('\n').filter(Boolean);
}

/** The commit sha `ref` points at, or null when it does not resolve to a commit. */
export function resolveCommit(ref) {
  try {
    return git(['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]);
  } catch {
    // `rev-parse --verify --quiet` exits non-zero for an unknown ref: that is
    // the answer to the question, not an error to propagate.
    return null;
  }
}

/** Throws a clear error when `ref` is not a commit this clone knows about. */
export function assertCommit(ref) {
  const sha = resolveCommit(ref);
  if (sha === null) {
    throw new Error(
      `comparison base "${ref}" does not resolve to a commit in this clone. ` +
        'Fetch it (git fetch origin) or pass an existing --base=<ref>.',
    );
  }
  return sha;
}

/** Tree hash of a commit-ish. */
export function treeOf(ref) {
  return git(['rev-parse', '--verify', `${ref}^{tree}`]);
}

/**
 * The base the local hooks compare against: CLAW_GATE_BASE when set, else
 * origin/HEAD, then origin/main,
 * then main. A missing remote ref is fetched once before falling through.
 * Throws when none resolves — a hook must never guess.
 */
export function resolveDefaultBase({ fetch = true, env = process.env } = {}) {
  // A stacked branch compares against its parent branch, not main.
  if (env.CLAW_GATE_BASE) {
    assertCommit(env.CLAW_GATE_BASE);
    return env.CLAW_GATE_BASE;
  }
  const candidates = ['origin/HEAD', 'origin/main', 'main'];
  for (const ref of candidates) {
    if (resolveCommit(ref) !== null) return ref;
  }
  if (fetch) {
    try {
      git(['fetch', '--quiet', 'origin', 'main']);
    } catch {
      // Offline or no remote: fall through to the loud error below.
    }
    for (const ref of candidates) {
      if (resolveCommit(ref) !== null) return ref;
    }
  }
  throw new Error(
    `no comparison base resolves (tried ${candidates.join(', ')}). ` +
      'Run `git fetch origin` or pass --base=<ref>.',
  );
}

/**
 * Parse the ref list git writes to a pre-push hook's stdin:
 * `<local ref> <local sha> <remote ref> <remote sha>` per line.
 * Deletions (local sha all zeros) are dropped — there is no tree to validate.
 */
export function parsePrePushRefs(stdinText) {
  return stdinText
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [localRef, localSha, remoteRef, remoteSha] = line.split(/\s+/u);
      return { localRef, localSha, remoteRef, remoteSha };
    })
    .filter((ref) => ref.localSha && ref.localSha !== ZERO_SHA);
}
