#!/usr/bin/env bash
# =============================================================================
# Sandboxed end-to-end rehearsal for scripts/deploy-prod.sh
# =============================================================================
# Builds a throwaway git repository with a fake origin and a stub `docker`
# binary, then drives the real deployment script through every branch that
# needs git or Docker: first deployment, selective deployment, no-op,
# invalid/unknown SHA, dirty tree, build failure, health failure, the rollback
# guard, the deploy lock, and exact-SHA checkout.
#
# Nothing here touches a real Docker daemon, a real registry, or the production
# host: `docker` is a shell stub on PATH and every path lives under a temp dir.
#
# Driven by tools/__tests__/deploy-prod.test.mjs; runnable directly:
#   bash tools/__tests__/deploy-prod-e2e.sh
# =============================================================================

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DEPLOY_SCRIPT="$REPO_ROOT/scripts/deploy-prod.sh"

WORK="$(mktemp -d "${TMPDIR:-/tmp}/claw-deploy-e2e.XXXXXXXX")"
trap 'rm -rf "$WORK"' EXIT

PASS=0
FAIL=0

ok() {
  PASS=$((PASS + 1))
  printf '  ok   %s\n' "$1"
}

bad() {
  FAIL=$((FAIL + 1))
  printf '  FAIL %s\n' "$1"
  if [ -n "${2:-}" ]; then
    printf '%s\n' "$2" | sed 's/^/       /'
  fi
}

assert_contains() {
  case "$2" in
    *"$3"*) ok "$1" ;;
    *) bad "$1" "expected to contain: $3"$'\n'"actual:"$'\n'"$2" ;;
  esac
}

assert_not_contains() {
  case "$2" in
    *"$3"*) bad "$1" "expected NOT to contain: $3"$'\n'"actual:"$'\n'"$2" ;;
    *) ok "$1" ;;
  esac
}

assert_equals() {
  if [ "$2" = "$3" ]; then
    ok "$1"
  else
    bad "$1" "expected: $3"$'\n'"actual:   $2"
  fi
}

# ─── Stub docker ─────────────────────────────────────────────────────────────
STUB_BIN="$WORK/bin"
mkdir -p "$STUB_BIN"
cat >"$STUB_BIN/docker" <<'STUB'
#!/usr/bin/env bash
# Records every invocation and answers just enough for deploy-prod.sh.
printf '%s\n' "$*" >>"$CLAW_STUB_LOG"
case "${1:-}" in
  version) exit 0 ;;
  inspect) printf '%s\n' "${CLAW_STUB_HEALTH:-healthy}"; exit 0 ;;
  exec) exit 0 ;;
  compose)
    shift
    while [ $# -gt 0 ]; do
      case "$1" in
        --env-file | -p | -f) shift 2 ;;
        *) break ;;
      esac
    done
    case "${1:-}" in
      version) exit 0 ;;
      build)
        if [ "${CLAW_STUB_BUILD_FAIL:-0}" = "1" ]; then exit 1; fi
        exit 0
        ;;
      up)
        if [ "${CLAW_STUB_UP_FAIL:-0}" = "1" ]; then exit 1; fi
        exit 0
        ;;
      ps)
        shift
        if [ "${1:-}" = "-q" ]; then
          printf 'cid-%s\n' "${2:-unknown}"
        else
          printf 'NAME STATE\n'
        fi
        exit 0
        ;;
      logs) printf '(stub logs)\n'; exit 0 ;;
      *) exit 0 ;;
    esac
    ;;
esac
exit 0
STUB
chmod +x "$STUB_BIN/docker"
export PATH="$STUB_BIN:$PATH"
export CLAW_STUB_LOG="$WORK/docker.log"
: >"$CLAW_STUB_LOG"

# ─── Fake production checkout ────────────────────────────────────────────────
ORIGIN="$WORK/origin.git"
SRC="$WORK/src"
PROD="$WORK/prod"

git init --quiet --bare "$ORIGIN"
git init --quiet "$SRC"
git -C "$SRC" config user.email "e2e@example.invalid"
git -C "$SRC" config user.name "deploy e2e"
git -C "$SRC" config commit.gpgsign false

mkdir -p "$SRC/docker" "$SRC/scripts" "$SRC/.ai/manifests" "$SRC/apps/claw-payment-service/src" \
  "$SRC/apps/claw-frontend/src" "$SRC/packages/shared-auth/src" "$SRC/docs" "$SRC/infra/nginx"

cp "$REPO_ROOT/docker/docker-compose.prod.services.yml" "$SRC/docker/"
cp "$REPO_ROOT/.ai/manifests/workspace-dependency-graph.json" "$SRC/.ai/manifests/"
cp "$DEPLOY_SCRIPT" "$SRC/scripts/deploy-prod.sh"
chmod +x "$SRC/scripts/deploy-prod.sh"
printf 'entry\n' >"$SRC/scripts/docker-entrypoint.prod.sh"
printf '{ "name": "claw-e2e", "version": "9.8.7" }\n' >"$SRC/package.json"
printf '{ "name": "@claw/shared-auth" }\n' >"$SRC/packages/shared-auth/package.json"
printf 'v1\n' >"$SRC/apps/claw-payment-service/src/main.ts"
printf 'v1\n' >"$SRC/apps/claw-frontend/src/page.tsx"
printf 'v1\n' >"$SRC/packages/shared-auth/src/index.ts"
printf 'v1\n' >"$SRC/docs/notes.md"
printf 'v1\n' >"$SRC/infra/nginx/locations.conf"

git -C "$SRC" add -A >/dev/null
git -C "$SRC" commit --quiet --no-verify -m "base" >/dev/null
git -C "$SRC" remote add origin "$ORIGIN"
git -C "$SRC" push --quiet origin HEAD:refs/heads/main >/dev/null 2>&1
SHA_BASE="$(git -C "$SRC" rev-parse HEAD)"

commit_change() {
  local path="$1" message="$2"
  mkdir -p "$(dirname "$SRC/$path")"
  printf '%s\n' "$message" >>"$SRC/$path"
  git -C "$SRC" add -A >/dev/null
  git -C "$SRC" commit --quiet --no-verify -m "$message" >/dev/null
  git -C "$SRC" push --quiet origin HEAD:refs/heads/main >/dev/null 2>&1
  git -C "$SRC" rev-parse HEAD
}

SHA_PAYMENT="$(commit_change apps/claw-payment-service/src/main.ts 'payment only')"
SHA_DOCS="$(commit_change docs/notes.md 'docs only')"
SHA_SHARED="$(commit_change packages/shared-auth/src/index.ts 'shared-auth change')"

git clone --quiet "$ORIGIN" "$PROD" >/dev/null
git -C "$PROD" config user.email "e2e@example.invalid"
git -C "$PROD" config user.name "deploy e2e"
git -C "$PROD" checkout --quiet "$SHA_BASE"
printf 'CLAW_LOCAL_AI=false\nJWT_SECRET=not-a-real-secret\n' >"$PROD/.env"

export CLAW_DEPLOY_ROOT="$PROD"
export CLAW_DEPLOY_HEALTH_TIMEOUT=20
export CLAW_DEPLOY_LOCK_WAIT=5
export CLAW_LOCAL_AI=false

deploy() {
  ( cd "$PROD" && bash "$PROD/scripts/deploy-prod.sh" "$@" 2>&1 )
}

deployed_sha() {
  cat "$PROD/.deploy/deployed-sha" 2>/dev/null || printf '<none>'
}

reset_docker_log() { : >"$CLAW_STUB_LOG"; }

echo "deploy-prod.sh end-to-end rehearsal"

# ─── Argument validation ─────────────────────────────────────────────────────
out="$(deploy 'not-a-sha')"
assert_contains "rejects a non-hex argument" "$out" "not a commit SHA"
out="$(deploy 'abc')"
assert_contains "rejects a too-short SHA" "$out" "not a commit SHA"
out="$(deploy "$SHA_BASE" "$SHA_PAYMENT")"
assert_contains "rejects more than one argument" "$out" "expected exactly one argument"
out="$(deploy 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef')"
assert_contains "rejects a well-formed but unknown SHA" "$out" "does not exist on origin"
assert_equals "unknown SHA leaves no deployment state" "$(deployed_sha)" "<none>"

# ─── Missing .env ────────────────────────────────────────────────────────────
mv "$PROD/.env" "$PROD/.env.hidden"
out="$(deploy "$SHA_PAYMENT")"
assert_contains "refuses to deploy without .env" "$out" ".env is missing"
mv "$PROD/.env.hidden" "$PROD/.env"

# ─── Dirty tracked working tree ──────────────────────────────────────────────
printf 'local hack\n' >>"$PROD/docs/notes.md"
out="$(deploy "$SHA_PAYMENT")"
assert_contains "refuses to deploy over tracked modifications" "$out" "dirty working tree"
assert_contains "names the dirty file" "$out" "docs/notes.md"
git -C "$PROD" checkout --quiet -- docs/notes.md

# Untracked host state must NOT count as dirt.
mkdir -p "$PROD/certs"
printf 'fake\n' >"$PROD/certs/claw.crt"

# ─── First deployment ────────────────────────────────────────────────────────
reset_docker_log
out="$(deploy "$SHA_BASE")"
assert_contains "first deployment reports no previous SHA" "$out" "first automated deployment"
assert_contains "first deployment succeeds" "$out" "Deployment successful"
assert_equals "first deployment records the SHA" "$(deployed_sha)" "$SHA_BASE"
assert_contains "first deployment records completed status" "$(cat "$PROD/.deploy/status.json")" '"state":"completed"'
assert_contains "deployment status records the target version" "$(cat "$PROD/.deploy/status.json")" '"version":"9.8.7"'
assert_equals "first deployment checks out the exact SHA" "$(git -C "$PROD" rev-parse HEAD)" "$SHA_BASE"
build_line="$(grep -m1 ' build ' "$CLAW_STUB_LOG" || true)"
assert_contains "first deployment builds auth-service" "$build_line" "auth-service"
assert_contains "first deployment builds the frontend" "$build_line" "frontend"
assert_not_contains "first deployment never runs compose down" "$(cat "$CLAW_STUB_LOG")" "compose down"
assert_not_contains "first deployment never removes volumes" "$(cat "$CLAW_STUB_LOG")" "volume rm"
assert_not_contains "first deployment never passes --remove-orphans" "$(cat "$CLAW_STUB_LOG")" "--remove-orphans"
assert_contains "first deployment recreates with --no-deps" "$(cat "$CLAW_STUB_LOG")" "up -d --no-deps --no-build"

# ─── Selective deployment ────────────────────────────────────────────────────
reset_docker_log
out="$(deploy "$SHA_PAYMENT")"
assert_contains "selective deployment succeeds" "$out" "Deployment successful"
assert_contains "selective deployment names payment-service" "$out" "- payment-service"
assert_not_contains "selective deployment leaves the frontend alone" "$out" "- frontend"
build_line="$(grep -m1 ' build ' "$CLAW_STUB_LOG" || true)"
assert_equals "only payment-service is built" "${build_line##* build }" "payment-service"
assert_equals "selective deployment records the SHA" "$(deployed_sha)" "$SHA_PAYMENT"

# ─── Shared-package fan-out ──────────────────────────────────────────────────
reset_docker_log
out="$(deploy "$SHA_SHARED")"
assert_contains "shared-package deployment succeeds" "$out" "Deployment successful"
build_line="$(grep -m1 ' build ' "$CLAW_STUB_LOG" || true)"
for consumer in payment-service workspace-service agent-service research-service; do
  assert_contains "shared-auth change rebuilds $consumer" "$build_line" "$consumer"
done
assert_not_contains "shared-auth change spares chat-service" "$build_line" "chat-service"

# ─── No-op (docs only) ───────────────────────────────────────────────────────
# Deploy the docs commit on top of the payment commit by rewinding state.
printf '%s\n' "$SHA_PAYMENT" >"$PROD/.deploy/deployed-sha"
reset_docker_log
out="$(deploy "$SHA_DOCS")"
assert_contains "docs-only deployment is a no-op" "$out" "No service is affected"
assert_contains "docs-only deployment still succeeds" "$out" "Deployment successful"
assert_equals "docs-only deployment records the SHA" "$(deployed_sha)" "$SHA_DOCS"
assert_not_contains "docs-only deployment builds nothing" "$(cat "$CLAW_STUB_LOG")" " build "

# ─── Idempotent re-deploy of the same SHA ────────────────────────────────────
reset_docker_log
out="$(deploy "$SHA_DOCS")"
assert_contains "re-deploying the same SHA succeeds" "$out" "Deployment successful"
assert_not_contains "re-deploying the same SHA builds nothing" "$(cat "$CLAW_STUB_LOG")" " build "

# ─── Rollback guard ──────────────────────────────────────────────────────────
out="$(deploy "$SHA_BASE")"
assert_contains "refuses to roll production backwards" "$out" "roll production BACKWARDS"
assert_equals "refused rollback leaves the recorded SHA alone" "$(deployed_sha)" "$SHA_DOCS"

reset_docker_log
out="$(CLAW_DEPLOY_ALLOW_ROLLBACK=1 deploy "$SHA_BASE")"
assert_contains "explicit rollback is allowed" "$out" "ROLLBACK:"
assert_contains "explicit rollback warns about migrations" "$out" "migrations are NOT reversed"
assert_equals "explicit rollback records the older SHA" "$(deployed_sha)" "$SHA_BASE"

# ─── Build failure leaves production untouched ───────────────────────────────
printf '%s\n' "$SHA_BASE" >"$PROD/.deploy/deployed-sha"
reset_docker_log
out="$(CLAW_STUB_BUILD_FAIL=1 deploy "$SHA_PAYMENT")"
assert_contains "a failed build fails the deployment" "$out" "docker compose build failed"
assert_contains "a failed build says production is untouched" "$out" "production is still serving"
assert_not_contains "a failed build never reaches compose up" "$(cat "$CLAW_STUB_LOG")" "up -d"
assert_equals "a failed build leaves the recorded SHA alone" "$(deployed_sha)" "$SHA_BASE"
assert_contains "a failed build records failed status" "$(cat "$PROD/.deploy/status.json")" '"state":"failed"'
assert_contains "a failed build records a bounded failure code" "$(cat "$PROD/.deploy/status.json")" '"failureCode":"DEPLOYMENT_FAILED"'

# ─── Health failure leaves the recorded SHA alone ────────────────────────────
reset_docker_log
out="$(CLAW_STUB_HEALTH=unhealthy deploy "$SHA_PAYMENT")"
assert_contains "an unhealthy service fails the deployment" "$out" "health verification failed"
assert_contains "an unhealthy service is named" "$out" "payment-service -> unhealthy"
assert_contains "failure dumps container logs" "$out" "last 200 log lines"
assert_equals "an unhealthy deployment does not record the SHA" "$(deployed_sha)" "$SHA_BASE"

# ─── Deploy lock ─────────────────────────────────────────────────────────────
if command -v flock >/dev/null 2>&1; then
  (
    exec 201>"$PROD/.deploy/deploy.lock"
    flock 201
    CLAW_DEPLOY_LOCK_WAIT=0 deploy "$SHA_PAYMENT" >"$WORK/locked.out" 2>&1
  ) &
  wait $! >/dev/null 2>&1
  assert_contains "a held lock blocks a second deployment" "$(cat "$WORK/locked.out")" "another deployment holds"
else
  ok "deploy lock (skipped — flock unavailable)"
fi

# ─── Summary ─────────────────────────────────────────────────────────────────
printf '\n%s passed, %s failed\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ]
