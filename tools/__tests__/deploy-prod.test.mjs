import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { repoPath } from '../lib/repo.mjs';

const script = readFileSync(repoPath('scripts/deploy-prod.sh'), 'utf8');
const gitignore = readFileSync(repoPath('.gitignore'), 'utf8');
const prodCompose = readFileSync(repoPath('docker/docker-compose.prod.services.yml'), 'utf8');
const devCompose = readFileSync(repoPath('docker/docker-compose.dev.services.yml'), 'utf8');
const bashInstaller = readFileSync(repoPath('scripts/install.sh'), 'utf8');
const powershellInstaller = readFileSync(repoPath('scripts/install.ps1'), 'utf8');
const envExample = readFileSync(repoPath('.env.example'), 'utf8');

test('deploy-prod.sh is syntactically valid bash', () => {
  const result = spawnSync('bash', ['-n', 'scripts/deploy-prod.sh'], {
    encoding: 'utf8',
    cwd: repoPath(),
  });
  assert.equal(result.status, 0, result.stderr);
});

test('deploy-prod.sh runs under a strict shell mode', () => {
  assert.match(script, /^set -Eeuo pipefail$/mu);
});

test('deploy-prod.sh never runs a destructive Docker or git operation', () => {
  // Read literally, not just "grep-absent": these strings must not appear
  // anywhere outside a comment that explicitly disclaims them (the file's own
  // "What this script will NEVER do" header quotes several of these on
  // purpose, so the assertion only looks at non-comment lines).
  const codeLines = script
    .split('\n')
    .filter((line) => !/^\s*#/u.test(line))
    .join('\n');

  assert.doesNotMatch(codeLines, /docker compose[^\n]*\bdown\b/u);
  // `docker rm` is permitted in exactly one shape: removing a single replica
  // during a rolling deployment. Compose cannot replace one replica of a scaled
  // service outside swarm, so a zero-downtime rollout cannot be expressed
  // without it. The safety property is unchanged - the id comes from
  // `compose ps -q <service>`, so it is provably a replica of the service being
  // deployed and never a database, which lives in a different compose file.
  const dockerRemovals = codeLines
    .split(String.fromCharCode(10))
    .filter((line) => line.includes('docker rm'));
  assert.equal(dockerRemovals.length, 1);
  assert.ok(dockerRemovals[0].includes('-f "$id"'));
  assert.ok(script.includes('service_container_ids "$service"'));
  assert.doesNotMatch(codeLines, /\bdocker volume rm\b/u);
  assert.doesNotMatch(codeLines, /\bdocker system prune\b/u);
  assert.doesNotMatch(codeLines, /--remove-orphans/u);
  assert.doesNotMatch(codeLines, /\bgit clean\b/u);
  assert.doesNotMatch(codeLines, /\bgit reset --hard\b/u);
  assert.doesNotMatch(codeLines, /\bmigrate reset\b/u);
});

test('deploy-prod.sh never pulls with a plain `git pull`', () => {
  assert.doesNotMatch(script, /(?<!#[^\n]*)\bgit pull\b/u);
});

test('deploy-prod.sh never echoes or cats the .env file', () => {
  assert.doesNotMatch(script, /\b(?:cat|echo)\s+"?\$ENV_FILE"?/u);
});

test('deploy-prod.sh recreates containers with --no-deps so unrelated healthy services are left alone', () => {
  assert.match(script, /compose up -d --no-deps --no-build/u);
});

test('deploy-prod.sh bounds Docker Compose build concurrency with a conservative override', () => {
  assert.match(script, /BUILD_PARALLEL_LIMIT="\$\{COMPOSE_PARALLEL_LIMIT:-2\}"/u);
  assert.match(script, /COMPOSE_PARALLEL_LIMIT="\$BUILD_PARALLEL_LIMIT" compose_build_bounded/u);
  assert.match(script, /must be an integer from 1 to 4/u);
});

test('deploy-prod.sh bounds the whole image build so a wedged BuildKit step cannot hold the lock', () => {
  assert.match(script, /BUILD_TIMEOUT_SECONDS="\$\{CLAW_DEPLOY_BUILD_TIMEOUT:-3600\}"/u);
  assert.match(script, /timeout --foreground --kill-after=60 "\$BUILD_TIMEOUT_SECONDS"/u);
  assert.match(script, /command -v timeout >\/dev\/null 2>&1 \|\| die/u);
  // 124 is `timeout` expiring, 137 the follow-up SIGKILL; neither may be retried.
  assert.match(script, /\[ "\$status" -eq 124 \] \|\| \[ "\$status" -eq 137 \]/u);
  assert.match(script, /exceeded \$\{BUILD_TIMEOUT_SECONDS\}s and was aborted; refusing to retry/u);
});

test('deploy-prod.sh never lets a child process inherit the deploy lock', () => {
  // bash passes open descriptors to children, so a build that outlives the
  // deployment would keep holding fd 200 — the two-day outage of 2026-08-20.
  // Every docker call that can outlive the deployment closes it: the compose
  // wrapper, the bounded build, the health inspection, the cache prune. The
  // `docker version` probes in preflight run before the lock is ever opened.
  assert.match(script, /docker compose "\$\{COMPOSE_ARGS\[@\]\}" "\$@" 200>&-/u);
  assert.match(script, /docker compose "\$\{COMPOSE_ARGS\[@\]\}" build "\$@" 200>&-/u);
  assert.match(script, /docker inspect[\s\S]{0,240}?2>\/dev\/null 200>&-/u);
  assert.match(script, /docker builder prune[^\n]*200>&-/u);
  // `docker logs` on a crash-looping container streams from a live container
  // and can outlive the deployment exactly like the others.
  assert.match(script, /docker logs[^\n]*200>&-/u);

  // And no new long-running docker call slips in without the same treatment.
  const dockerLines = script
    .split('\n')
    .filter((line) => !/^\s*#/u.test(line))
    .filter((line) => /\bdocker (?:compose|inspect|builder|logs)\b/u.test(line))
    .filter((line) => !/\bversion\b/u.test(line))
    .filter((line) => !/^\s*(?:err|log|die) /u.test(line));
  assert.equal(dockerLines.length, 8, dockerLines.join('\n'));
});

test('deploy-prod.sh aborts when the session that started it disappears', () => {
  assert.match(script, /ORPHAN_GUARD="\$\{CLAW_DEPLOY_ORPHAN_GUARD:-0\}"/u);
  assert.match(script, /start_orphan_guard\(\)/u);
  assert.match(script, /kill -0 "\$watched"/u);
  assert.match(script, /kill -TERM "-\$pgid"/u);
  assert.match(script, /session that started this deployment is gone/u);
  // The guard must be armed before the lock wait: waiting on a lock held by a
  // dead deployment is exactly the case it exists for.
  const body = script.split('main() {')[1] ?? '';
  const guardIndex = body.indexOf('start_orphan_guard');
  const lockIndex = body.indexOf('acquire_lock');
  assert.ok(guardIndex > -1 && lockIndex > -1);
  assert.ok(guardIndex < lockIndex, 'the orphan guard starts after the lock is taken');
});

test('deploy-prod.sh turns a terminating signal into a recorded failure', () => {
  assert.match(script, /trap 'on_terminating_signal TERM 15' TERM/u);
  assert.match(script, /trap 'on_terminating_signal INT 2' INT/u);
  assert.match(script, /trap 'on_terminating_signal HUP 1' HUP/u);
  assert.match(script, /Deployment aborted by SIG\$1/u);
});

test('deploy-prod.sh reports progress instead of blocking silently on the deploy lock', () => {
  assert.match(script, /LOCK_HEARTBEAT_SECONDS="\$\{CLAW_DEPLOY_LOCK_HEARTBEAT:-15\}"/u);
  assert.match(script, /while ! flock -w "\$slice" 200; do/u);
  assert.match(script, /Waiting for the deploy lock: \$\{waited\}s of \$\{LOCK_WAIT_SECONDS\}s/u);
  assert.match(script, /lock_holder_hint\(\)/u);
});

test('deploy-prod.sh retries only transient build-network failures with bounded backoff', () => {
  assert.match(script, /BUILD_RETRY_DELAYS=\(10 30\)/u);
  assert.match(script, /for attempt in 1 2 3/u);
  assert.match(script, /ECONNRESET\|ETIMEDOUT\|EAI_AGAIN/u);
  assert.match(script, /docker compose build failed with a non-transient error/u);
  assert.match(script, /transient network failure; retrying in/u);
});

test('deploy-prod.sh reloads nginx when the tracked maintenance asset changes', () => {
  assert.match(
    script,
    /infra\/nginx\/nginx\.conf \| infra\/nginx\/locations\.conf \| infra\/nginx\/public-tls\/maintenance\.html/u,
  );
});

test('deploy-prod.sh writes the deployed SHA only via the atomic record_deployment helper', () => {
  const writesToStateFile = [...script.matchAll(/>\s*"?\$STATE_FILE"?(?!\.tmp)/gu)];
  assert.deepEqual(writesToStateFile, [], 'a direct, non-atomic write to $STATE_FILE was found');
  assert.match(script, /printf '%s\\n' "\$sha" >"\$STATE_FILE\.tmp"/u);
  assert.match(script, /mv -f "\$STATE_FILE\.tmp" "\$STATE_FILE"/u);
});

test('deploy-prod.sh only calls record_deployment after health has been verified for every service', () => {
  const body = script.split('main() {')[1] ?? '';
  const healthIndex = body.indexOf('wait_for_service_health');
  const recordIndex = body.lastIndexOf('record_deployment');
  assert.ok(healthIndex > -1 && recordIndex > -1);
  assert.ok(
    healthIndex < recordIndex,
    'record_deployment appears before health verification in main()',
  );
});

test('deploy-prod.sh bounds unused Docker build cache only after health succeeds', () => {
  const body = script.split('main() {')[1] ?? '';
  const healthIndex = body.lastIndexOf('wait_for_service_health');
  const cleanupIndex = body.lastIndexOf('cleanup_build_cache');
  const recordIndex = body.lastIndexOf('record_deployment');

  assert.match(
    script,
    /docker builder prune --all --force --keep-storage 20GB/u,
    'expected a bounded build-cache cleanup',
  );
  assert.ok(healthIndex > -1 && cleanupIndex > -1 && recordIndex > -1);
  assert.ok(healthIndex < cleanupIndex, 'build cache cleanup appears before health verification');
  assert.ok(cleanupIndex < recordIndex, 'deployment is recorded before build cache cleanup runs');
});

test('deploy-prod.sh validates the target argument as a hex commit SHA before doing anything else', () => {
  assert.match(script, /\*\[!0-9a-fA-F\]\* \| ''\)/u);
});

test('deploy-prod.sh refuses to deploy over tracked working-tree modifications', () => {
  assert.match(
    script,
    /git -C "\$PROJECT_ROOT" status --porcelain --untracked-files=no --ignore-submodules=all/u,
  );
});

test('deploy-prod.sh guards against deploying an older commit without an explicit opt-in', () => {
  assert.match(script, /CLAW_DEPLOY_ALLOW_ROLLBACK/u);
  assert.match(script, /merge-base --is-ancestor "\$new_sha" "\$old_sha"/u);
});

test('deploy-prod.sh takes a deploy lock before touching the checkout', () => {
  assert.match(script, /acquire_lock/u);
  assert.match(script, /flock/u);
});

test('deployment host state is explicitly ignored by git', () => {
  assert.match(gitignore, /^\.deploy\/$/mu);
});

test('deploy-prod.sh writes a bounded status document atomically', () => {
  assert.match(script, /DEPLOYMENT_STATUS_FILE="\$STATE_DIR\/status\.json"/u);
  assert.match(script, /write_deployment_status\(\)/u);
  assert.match(script, />"\$DEPLOYMENT_STATUS_FILE\.tmp"/u);
  assert.match(script, /mv -f "\$DEPLOYMENT_STATUS_FILE\.tmp" "\$DEPLOYMENT_STATUS_FILE"/u);
  assert.match(script, /"schemaVersion":1/u);
  assert.doesNotMatch(script, /"(?:error|logs|output)":/u);
});

test('deploy-prod.sh records phases, verification heartbeats, and bounded failure state', () => {
  for (const phase of [
    'preparing',
    'planning',
    'building',
    'deploying',
    'reloading_nginx',
    'verifying',
    'finalizing',
  ]) {
    assert.match(script, new RegExp(`set_deployment_phase "${phase}"`, 'u'), phase);
  }
  assert.match(script, /DEPLOYMENT_PHASE="completed"/u);
  assert.match(script, /set_deployment_phase "verifying" "\$svc"/u);
  assert.match(script, /DEPLOYMENT_FAILURE_CODE="DEPLOYMENT_FAILED"/u);
  assert.match(script, /record_failed_deployment/u);
});

test('deploy-prod.sh accepts only a GitHub workflow URL as optional status metadata', () => {
  assert.match(script, /CLAW_DEPLOY_WORKFLOW_URL/u);
  assert.match(script, /https:\/\/github\.com\//u);
});

test('auth-service receives the host-owned deployment state directory', () => {
  // Writable, unlike auth-service's other binds: the admin deployment page
  // clears a stuck rollout and pauses the automatic lane by writing
  // status.json and automation.json. deployed-sha and history.log stay owned
  // by deploy-prod.sh, which simply overwrites status.json on its next phase.
  assert.match(prodCompose, /auth-service:[\s\S]*?- \.\.\/\.deploy:\/app\/\.deploy\r?\n/u);
  assert.match(devCompose, /auth-service:[\s\S]*?- \.\.\/\.deploy:\/app\/\.deploy\r?\n/u);
  assert.doesNotMatch(prodCompose, /\.deploy:\/app\/\.deploy:ro/u);
  assert.doesNotMatch(devCompose, /\.deploy:\/app\/\.deploy:ro/u);
  assert.match(bashInstaller, /mkdir -p "\$PROJECT_ROOT\/\.deploy"/u);
  assert.match(powershellInstaller, /New-Item[^\n]+\.deploy[^\n]+-Force/u);
  assert.match(envExample, /^DEPLOYMENT_STATUS_FILE=\/app\/\.deploy\/status\.json$/mu);
  assert.match(envExample, /^DEPLOYMENT_AUTOMATION_FILE=\/app\/\.deploy\/automation\.json$/mu);
});

test('the manual deployment credential set is documented as all-or-nothing', () => {
  for (const key of ['GITHUB_DEPLOY_TOKEN', 'GITHUB_DEPLOY_REPOSITORY', 'GITHUB_DEPLOY_REF']) {
    assert.match(envExample, new RegExp(`^${key}=`, 'mu'), key);
    assert.match(bashInstaller, new RegExp(`^${key}=`, 'mu'), key);
    assert.match(powershellInstaller, new RegExp(`^${key}=`, 'mu'), key);
  }
  assert.doesNotMatch(envExample, /^GITHUB_DEPLOY_TOKEN=.+$/mu);
});

test('deploy-prod.sh obeys the automatic-deploy switch only on the automatic lane', () => {
  assert.match(script, /AUTOMATION_FILE="\$STATE_DIR\/automation\.json"/u);
  assert.match(script, /automatic_deploy_paused\(\)/u);
  assert.match(script, /CLAW_DEPLOY_TRIGGER:-auto/u);
  assert.match(script, /\[ "\$trigger" = "auto" \] && automatic_deploy_paused/u);
  // The gate runs first of all: before the orphan guard, before the lock, and
  // before anything touches the checkout. A paused rollout does no work at all.
  assert.match(
    script,
    /assert_lane_allowed\n(?:\s*#[^\n]*\n)*\s+start_orphan_guard\n\s+preflight\n\s+acquire_lock/u,
  );
});

test('terminal deployment status triggers a best-effort internal notification', () => {
  assert.match(script, /notify_deployment_status\(\)/u);
  assert.match(script, /internal\/deployment\/notify/u);
  assert.match(script, /process\.env\.INTER_SERVICE_AUTH_TOKEN/u);
  assert.doesNotMatch(script, /Authorization: Service \$INTER_SERVICE_AUTH_TOKEN/u);
  assert.match(script, /record_failed_deployment\(\)[\s\S]*notify_deployment_status/u);
  assert.match(script, /record_completed_deployment_status\(\)[\s\S]*notify_deployment_status/u);
});

test('the end-to-end rehearsal detaches from an inherited git environment', () => {
  // git exports GIT_DIR (absolute, in a linked worktree) to its hooks, and it
  // outranks `git -C <dir>`. Without this unset, running the gates from a
  // pre-push hook inside a `git worktree` made the rehearsal commit its fake
  // history onto the developer's real branch and replace their index.
  const e2e = readFileSync(repoPath('tools/__tests__/deploy-prod-e2e.sh'), 'utf8');
  const beforeFirstGit = e2e.slice(0, e2e.search(/^\s*git /mu));

  for (const variable of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR']) {
    assert.match(beforeFirstGit, new RegExp(`\\b${variable}\\b`, 'u'), variable);
  }
  assert.match(beforeFirstGit, /^unset GIT_DIR /mu);
});

test(
  'end-to-end rehearsal: first deploy, selective deploy, shared-package fan-out, no-op, rollback guard, build/health failure, locking',
  {
    timeout: 120_000,
    skip:
      process.platform === 'win32'
        ? 'Unix deployment rehearsal is unsafe with Windows Git and bash /tmp paths'
        : false,
  },
  () => {
    const result = spawnSync('bash', ['tools/__tests__/deploy-prod-e2e.sh'], {
      encoding: 'utf8',
      cwd: repoPath(),
    });
    if (result.status !== 0) {
      process.stderr.write(result.stdout ?? '');
      process.stderr.write(result.stderr ?? '');
    }
    assert.equal(
      result.status,
      0,
      'deploy-prod-e2e.sh reported at least one failing assertion — see output above',
    );
    assert.doesNotMatch(result.stdout ?? '', /FAIL/u);
  },
);

// A crash-looping container with a declared healthcheck reports health
// "starting" forever and never "unhealthy", so the health poll could not tell
// it apart from a slow boot and waited out the full CLAW_DEPLOY_HEALTH_TIMEOUT
// (420s) per service. The 2026-09-02 chat-service rollout therefore took 23
// minutes to report a failure that was certain within 30 seconds. RestartCount
// is the decisive signal: Docker increments it only when the main process
// exited and the restart policy brought it back.
test('deploy-prod.sh fails a rollout fast on a crash loop instead of waiting out the health timeout', () => {
  assert.match(
    script,
    /container_restart_count\(\)/u,
    'no container_restart_count helper — the health poll cannot see a crash loop',
  );
  assert.match(
    script,
    /--format '\{\{\.State\.RestartCount\}\}'/u,
    'crash-loop detection must read .State.RestartCount, the only decisive signal',
  );

  const body = script.slice(script.indexOf('wait_for_service_health()'));
  const restartCheck = body.indexOf('container_restart_count');
  const healthCheck = body.indexOf('container_state');
  assert.ok(restartCheck > -1, 'wait_for_service_health does not check the restart count');
  assert.ok(
    restartCheck < healthCheck,
    'the crash-loop check must run BEFORE the health state read, or a "starting" container still costs the full timeout',
  );
  assert.match(
    body.slice(restartCheck, restartCheck + 600),
    /docker logs --tail/u,
    'a crash-loop failure must print the container log, or the operator has to go find it by hand',
  );
});

test('the crash-loop restart threshold is tunable and tolerates a single transient restart', () => {
  const match = /CRASH_LOOP_RESTARTS="\$\{CLAW_DEPLOY_CRASH_LOOP_RESTARTS:-(\d+)\}"/u.exec(script);
  assert.ok(match, 'CRASH_LOOP_RESTARTS must be overridable via CLAW_DEPLOY_CRASH_LOOP_RESTARTS');
  const threshold = Number(match[1]);
  assert.ok(
    threshold >= 2,
    `threshold ${threshold} would fail a rollout on one transient boot-order restart`,
  );
  assert.ok(threshold <= 5, `threshold ${threshold} is high enough to waste most of the timeout`);
  assert.match(script, /^#\s+CLAW_DEPLOY_CRASH_LOOP_RESTARTS/mu, 'the new knob is undocumented');
});

// A rolling replace must judge the replica it just created, never the whole
// service. Mid-rollout the untouched replicas still run the OLD image, so a
// whole-service health wait lets a not-yet-replaced broken replica abort the
// rollout — which deadlocks the exact situation a deploy exists to resolve:
// production cannot be repaired by deploying the fix. On 2026-09-02 a
// chat-service rollout failed one second after creating a healthy new replica,
// because a surviving old one was unhealthy.
test('rolling_recreate_service waits on the NEW replica, not on the whole service', () => {
  const start = script.indexOf('rolling_recreate_service()');
  assert.ok(start > -1, 'rolling_recreate_service is gone');
  const body = script.slice(start, script.indexOf('\n}', start));

  assert.match(
    body,
    /wait_for_container_health "\$fresh"/u,
    'the rolling loop must wait on the newly created container id',
  );

  const loopEnd = body.indexOf('  done');
  assert.ok(loopEnd > -1, 'cannot find the end of the per-replica loop');
  const insideLoop = body.slice(0, loopEnd);
  assert.doesNotMatch(
    insideLoop,
    /wait_for_service_health/u,
    'a whole-service health wait INSIDE the loop lets an old replica veto the rollout',
  );

  // The whole-service assertion still has to happen — once, after every replica
  // is on the new image. Dropping it would let a rollout pass while a replica
  // it already replaced had since died.
  assert.match(
    body.slice(loopEnd),
    /wait_for_service_health "\$service"/u,
    'the rollout must still prove the whole service healthy after the loop',
  );
});

test('wait_for_container_health judges exactly one container and reports its log', () => {
  const start = script.indexOf('wait_for_container_health()');
  assert.ok(start > -1, 'wait_for_container_health is missing');
  const body = script.slice(start, script.indexOf('\nwait_for_service_health()', start));

  assert.doesNotMatch(
    body,
    /service_container_ids/u,
    'it must not enumerate the service — that is the whole-service check it exists to avoid',
  );
  for (const outcome of ['healthy', 'unhealthy', 'missing']) {
    assert.ok(body.includes(`${outcome})`), `no case branch for "${outcome}"`);
  }
  assert.match(body, /docker logs --tail/u, 'an unhealthy replica must report its log');
});
