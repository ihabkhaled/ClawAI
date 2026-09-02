#!/usr/bin/env bash
# =============================================================================
# ClawAI production deployment — exact-SHA, selective, non-destructive
# =============================================================================
# Deploys the EXACT commit CI tested, rebuilds only the Docker services that
# commit actually touches, recreates only those containers, waits for their
# healthchecks, and records the deployed SHA only after health passes.
#
# Usage:
#   ./scripts/deploy-prod.sh <target-commit-sha>
#   ./scripts/deploy-prod.sh --plan [--changed-files <file>] [--first-deployment]
#   ./scripts/deploy-prod.sh --help
#
# Environment:
#   CLAW_DEPLOY_ROOT            production checkout (default: this script's repo root)
#   CLAW_DEPLOY_LOCK_WAIT       seconds to wait for the deploy lock (default 1800)
#   CLAW_DEPLOY_HEALTH_TIMEOUT  seconds to wait per service healthcheck (default 420)
#   CLAW_DEPLOY_CRASH_LOOP_RESTARTS  container restarts before the rollout is
#                               failed as a crash loop instead of waiting out
#                               the health timeout (default 3)
#   CLAW_DEPLOY_BUILD_TIMEOUT   seconds the whole image build may take before it
#                               is aborted (default 3600). A wedged BuildKit step
#                               must never hold the deploy lock indefinitely.
#   CLAW_DEPLOY_ORPHAN_GUARD    1 = abort as soon as the SSH session that started
#                               this deployment disappears. The CI workflow sets
#                               it; an operator running the script by hand, or
#                               under nohup, deliberately does not.
#   CLAW_DEPLOY_ORPHAN_GUARD_INTERVAL  seconds between orphan checks (default 30)
#   CLAW_DEPLOY_LOCK_HEARTBEAT  seconds between "still waiting for the lock"
#                               progress lines (default 15)
#   CLAW_DEPLOY_ALLOW_ROLLBACK  1 = permit deploying a commit older than the one
#                               currently deployed (emergency rollback)
#   COMPOSE_PARALLEL_LIMIT      concurrent service image builds (default 2,
#                               accepted range 1-4)
#   CLAW_LOCAL_AI               true|false override for the local-AI profile;
#                               default reads the production .env, the same
#                               precedence rule scripts/claw.sh applies
#   CLAW_DEPLOY_WORKFLOW_URL     optional https://github.com/... Actions run URL
#                               recorded as non-secret deployment metadata
#   CLAW_DEPLOY_TRIGGER         auto|manual — which lane started this rollout.
#                               'auto' (the default, used by the release
#                               workflow) obeys the automatic-deploy switch in
#                               .deploy/automation.json that an admin toggles
#                               from the deployment page; 'manual' always
#                               proceeds, so pausing the automatic lane can
#                               never lock an operator out of production.
#
# What this script will NEVER do:
#   * `docker compose down`, `docker volume rm`, `docker system prune`
#   * `docker rm` on anything except ONE replica of the service being deployed,
#     during a rolling rollout, with the id taken from `compose ps -q <service>`.
#     Compose cannot replace a single replica of a scaled service outside swarm,
#     so a zero-downtime rollout cannot be expressed without it; sourcing the id
#     from the service's own containers is what keeps a database out of reach.
#   * pass `--remove-orphans` — the databases live in a SEPARATE compose file
#     under the same `claw` project, so compose would treat every database as an
#     orphan and delete it. Never add that flag here.
#   * stop or recreate a PostgreSQL, MongoDB, Redis, RabbitMQ or ClamAV container
#   * `git clean`, `git reset --hard`, or anything else that removes the
#     untracked host state this box owns (.env, certs/, .deploy/,
#     infra/nginx/public-tls/*.conf)
#   * reverse a Prisma migration — the prod entrypoint runs `migrate deploy`
#     forward only (scripts/docker-entrypoint.prod.sh)
#   * print .env or any secret
#
# After every successful application deployment, unused BuildKit cache is
# bounded to 20 GB. This does not remove images, containers, networks, or
# volumes; it only evicts rebuildable cache after every selected service is
# healthy.
#
# Requires bash 4.4+ (empty-array expansion under `set -u`), git, docker,
# docker compose v2. flock is used when present; a POSIX mkdir lock is the
# fallback.
# =============================================================================

set -Eeuo pipefail

# ─── Self-copy re-exec ───────────────────────────────────────────────────────
# This script lives inside the very checkout it is about to move to another
# commit. bash reads a script lazily, by byte offset, so rewriting
# scripts/deploy-prod.sh mid-run makes the interpreter resume at a garbage
# offset in the new file. Running from a private copy makes the checkout
# harmless. A deploy therefore always executes the deployer that was on disk
# when it was invoked; the next deploy picks up the new one.
case "${1:-}" in
  --plan | --help | -h | '') ;;
  *)
    if [ "${CLAW_DEPLOY_REEXEC:-0}" != "1" ]; then
      _self_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
      _self="${_self_dir}/$(basename "${BASH_SOURCE[0]}")"
      _copy="$(mktemp "${TMPDIR:-/tmp}/claw-deploy-prod.XXXXXXXX")"
      cat "$_self" >"$_copy"
      chmod 700 "$_copy"
      export CLAW_DEPLOY_REEXEC=1
      export CLAW_DEPLOY_SELF="$_self"
      exec bash "$_copy" "$@"
    fi
    ;;
esac

# ─── Paths ───────────────────────────────────────────────────────────────────
ORIGIN_SELF="${CLAW_DEPLOY_SELF:-${BASH_SOURCE[0]}}"
DEFAULT_ROOT="$(cd "$(dirname "$ORIGIN_SELF")/.." && pwd)"
PROJECT_ROOT="${CLAW_DEPLOY_ROOT:-$DEFAULT_ROOT}"

ENV_FILE="$PROJECT_ROOT/.env"
STATE_DIR="$PROJECT_ROOT/.deploy"
STATE_FILE="$STATE_DIR/deployed-sha"
DEPLOYMENT_STATUS_FILE="$STATE_DIR/status.json"
AUTOMATION_FILE="$STATE_DIR/automation.json"
HISTORY_FILE="$STATE_DIR/history.log"
LOCK_FILE="$STATE_DIR/deploy.lock"
LOCK_DIR="$STATE_DIR/deploy.lock.d"

SVC_COMPOSE_REL="docker/docker-compose.prod.services.yml"
DEP_GRAPH_REL=".ai/manifests/workspace-dependency-graph.json"

LOCK_WAIT_SECONDS="${CLAW_DEPLOY_LOCK_WAIT:-1800}"
HEALTH_TIMEOUT_SECONDS="${CLAW_DEPLOY_HEALTH_TIMEOUT:-420}"
# Restarts before a container is declared crash-looping instead of slow. Three,
# not one: a single restart can be a transient dependency race at boot, while
# three consecutive exits is a broken image. A fast crash reaches three within
# ~30s, so this is what keeps a doomed rollout from burning the full timeout.
CRASH_LOOP_RESTARTS="${CLAW_DEPLOY_CRASH_LOOP_RESTARTS:-3}"
BUILD_TIMEOUT_SECONDS="${CLAW_DEPLOY_BUILD_TIMEOUT:-3600}"
BUILD_PARALLEL_LIMIT="${COMPOSE_PARALLEL_LIMIT:-2}"
BUILD_RETRY_DELAYS=(10 30)

# A blocked deployer must keep talking. Total silence on the SSH channel is what
# lets a stateful firewall drop the connection, and a dropped connection used to
# leave the remote deploy running — holding the lock — with nobody watching.
LOCK_HEARTBEAT_SECONDS="${CLAW_DEPLOY_LOCK_HEARTBEAT:-15}"
ORPHAN_GUARD="${CLAW_DEPLOY_ORPHAN_GUARD:-0}"
ORPHAN_GUARD_INTERVAL="${CLAW_DEPLOY_ORPHAN_GUARD_INTERVAL:-30}"
ORPHAN_GUARD_PID=""

# Files that reach EVERY application image. Each service Dockerfile does
# `COPY package.json`, `COPY .npmrc` and `COPY packages/`, and the build context
# is the repo root filtered by .dockerignore — so a change to any of these can
# alter every image regardless of which workspace it sits next to.
# Deliberately NOT here: eslint config (never runs inside an image) and
# docs/ rules/ tools/ .github/ .ai/ (never copied into an image).
BROAD_IMPACT_PATHS=(
  'package.json'
  'package-lock.json'
  '.npmrc'
  '.dockerignore'
  'scripts/docker-entrypoint.prod.sh'
  "$SVC_COMPOSE_REL"
)

TMP_DIR=""
LOCK_DIR_HELD=0
SELF_COPY=""
if [ "${CLAW_DEPLOY_REEXEC:-0}" = "1" ]; then
  SELF_COPY="${BASH_SOURCE[0]}"
fi

# Plan outputs, populated by compute_plan.
PLAN_SERVICES=()
PLAN_INFRA_MANUAL=()
PLAN_NGINX_RELOAD=0
PLAN_REASON=""
PLAN_SELECTED='|'

# Safe deployment-status projection. Raw errors and command output never enter
# this state; failureCode is deliberately bounded and machine-readable.
DEPLOYMENT_STATUS_ACTIVE=0
DEPLOYMENT_STATUS_STATE="running"
DEPLOYMENT_PHASE="preparing"
DEPLOYMENT_TARGET_SHA=""
DEPLOYMENT_PREVIOUS_SHA=""
DEPLOYMENT_VERSION=""
DEPLOYMENT_SERVICES=""
DEPLOYMENT_CURRENT_SERVICE=""
DEPLOYMENT_STARTED_AT=""
DEPLOYMENT_COMPLETED_AT=""
DEPLOYMENT_FAILURE_CODE="DEPLOYMENT_FAILED"
DEPLOYMENT_WORKFLOW_URL="${CLAW_DEPLOY_WORKFLOW_URL:-}"

cleanup() {
  local status=$?
  trap - EXIT
  stop_orphan_guard
  if [ "$status" -ne 0 ] && [ "$DEPLOYMENT_STATUS_ACTIVE" = "1" ]; then
    record_failed_deployment || true
  fi
  if [ "$LOCK_DIR_HELD" = "1" ]; then
    rm -f "$LOCK_DIR/pid" 2>/dev/null || true
    rmdir "$LOCK_DIR" 2>/dev/null || true
  fi
  if [ -n "$TMP_DIR" ]; then
    rm -rf "$TMP_DIR" 2>/dev/null || true
  fi
  if [ -n "$SELF_COPY" ]; then
    rm -f "$SELF_COPY" 2>/dev/null || true
  fi
  exit "$status"
}
trap cleanup EXIT

# Without an explicit signal trap bash dies from SIGTERM without running the EXIT
# trap, so an aborted deployment would leave `.deploy/status.json` claiming it is
# still running. Trapping the signal turns it into an ordinary exit, which runs
# cleanup, records the failure, and releases the lock.
on_terminating_signal() {
  err ""
  err "Deployment aborted by SIG$1."
  exit $((128 + $2))
}
trap 'on_terminating_signal TERM 15' TERM
trap 'on_terminating_signal INT 2' INT
trap 'on_terminating_signal HUP 1' HUP

log() { printf '%s\n' "$*"; }
err() { printf '%s\n' "$*" >&2; }
section() { printf '\n%s\n' "$*"; }

die() {
  err ""
  err "DEPLOYMENT FAILED: $*"
  err ""
  exit 1
}

# =============================================================================
# Orphan guard
# =============================================================================
# A CI deployment runs as a child of the sshd process that owns the connection.
# When that connection dies, sshd exits and everything left in the session is
# reparented to init — which is how a deployment from 2026-08-20 kept a wedged
# `docker compose build` alive for two days, holding the deploy lock and
# silently blocking every release after it. The guard watches for exactly that
# reparenting and terminates the whole process group, so a lost connection can
# never leave a deployment running unattended.
start_orphan_guard() {
  [ "$ORPHAN_GUARD" = "1" ] || return 0

  local pgid watched
  pgid="$(ps -o pgid= -p $$ 2>/dev/null | tr -d '[:space:]')"
  if [ -z "$pgid" ]; then
    err "Orphan guard disabled: ps does not report a process group on this host."
    return 0
  fi
  # The owner is the process that started the process group — under CI, the sshd
  # process that owns the connection. A group with nothing above it (nohup,
  # setsid) is watched through its own leader instead.
  watched="$(ps -o ppid= -p "$pgid" 2>/dev/null | tr -d '[:space:]')"
  if [ -z "$watched" ] || [ "$watched" = "1" ]; then
    watched="$pgid"
  fi

  (
    # The connection this guard watches is the one it would report through, so a
    # broken pipe must not kill the guard before it can stop the deployment.
    trap '' PIPE
    while sleep "$ORPHAN_GUARD_INTERVAL"; do
      if ! kill -0 "$watched" 2>/dev/null; then
        err "" || true
        err "The session that started this deployment is gone; aborting so the deploy lock is released." || true
        kill -TERM "-$pgid" 2>/dev/null || true
        exit 0
      fi
    done
  ) &
  ORPHAN_GUARD_PID=$!
  log "Orphan guard active: this deployment aborts if session $watched disappears."
}

stop_orphan_guard() {
  [ -n "$ORPHAN_GUARD_PID" ] || return 0
  kill "$ORPHAN_GUARD_PID" 2>/dev/null || true
  ORPHAN_GUARD_PID=""
}

json_string_or_null() {
  local value="${1:-}"
  if [ -z "$value" ]; then
    printf 'null'
    return 0
  fi
  value="${value//\\/\\\\}"
  value="${value//\"/\\\"}"
  value="${value//$'\n'/ }"
  value="${value//$'\r'/ }"
  printf '"%s"' "$value"
}

deployment_services_json() {
  local service first=1
  printf '['
  for service in $DEPLOYMENT_SERVICES; do
    if [ "$first" = "0" ]; then
      printf ','
    fi
    json_string_or_null "$service"
    first=0
  done
  printf ']'
}

write_deployment_status() {
  local updated_at services_json
  updated_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  services_json="$(deployment_services_json)"
  mkdir -p "$STATE_DIR"
  {
    printf '{'
    printf '"schemaVersion":1,'
    printf '"state":'; json_string_or_null "$DEPLOYMENT_STATUS_STATE"; printf ','
    printf '"phase":'; json_string_or_null "$DEPLOYMENT_PHASE"; printf ','
    printf '"targetSha":'; json_string_or_null "$DEPLOYMENT_TARGET_SHA"; printf ','
    printf '"previousSha":'; json_string_or_null "$DEPLOYMENT_PREVIOUS_SHA"; printf ','
    printf '"deployedSha":'; json_string_or_null "${DEPLOYMENT_DEPLOYED_SHA:-}"; printf ','
    printf '"version":'; json_string_or_null "$DEPLOYMENT_VERSION"; printf ','
    printf '"services":%s,' "$services_json"
    printf '"currentService":'; json_string_or_null "$DEPLOYMENT_CURRENT_SERVICE"; printf ','
    printf '"startedAt":'; json_string_or_null "$DEPLOYMENT_STARTED_AT"; printf ','
    printf '"updatedAt":'; json_string_or_null "$updated_at"; printf ','
    printf '"completedAt":'; json_string_or_null "$DEPLOYMENT_COMPLETED_AT"; printf ','
    printf '"workflowUrl":'; json_string_or_null "$DEPLOYMENT_WORKFLOW_URL"; printf ','
    printf '"failureCode":'; json_string_or_null "${DEPLOYMENT_STATUS_FAILURE_CODE:-}"
    printf '}\n'
  } >"$DEPLOYMENT_STATUS_FILE.tmp"
  mv -f "$DEPLOYMENT_STATUS_FILE.tmp" "$DEPLOYMENT_STATUS_FILE"
}

set_deployment_phase() {
  DEPLOYMENT_STATUS_STATE="running"
  DEPLOYMENT_PHASE="$1"
  DEPLOYMENT_CURRENT_SERVICE="${2:-}"
  write_deployment_status
}

notify_deployment_status() {
  local container_id
  container_id="$(docker ps --filter 'name=claw-auth-service' --filter 'status=running' --format '{{.ID}}' | head -n 1)" || true
  if [ -z "$container_id" ]; then
    err "Deployment notification skipped: auth-service is not running."
    return 0
  fi
  if docker exec "$container_id" node -e '
const https = require("node:https");
const request = https.request({ hostname: "localhost", port: 4001, path: "/api/v1/internal/deployment/notify", method: "POST", rejectUnauthorized: false, headers: { authorization: `Service ${process.env.INTER_SERVICE_AUTH_TOKEN ?? ""}` } }, (response) => {
  response.resume();
  response.on("end", () => process.exit(response.statusCode >= 200 && response.statusCode < 300 ? 0 : 1));
});
request.on("error", () => process.exit(1));
request.setTimeout(10000, () => request.destroy());
request.end();
' >/dev/null 2>&1; then
    log "Deployment notification request accepted."
  else
    err "Deployment notification could not be delivered; deployment status remains authoritative."
  fi
  return 0
}

record_failed_deployment() {
  DEPLOYMENT_STATUS_STATE="failed"
  DEPLOYMENT_COMPLETED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  DEPLOYMENT_STATUS_FAILURE_CODE="$DEPLOYMENT_FAILURE_CODE"
  write_deployment_status
  DEPLOYMENT_STATUS_ACTIVE=0
  notify_deployment_status
}

record_completed_deployment_status() {
  DEPLOYMENT_STATUS_STATE="completed"
  DEPLOYMENT_PHASE="completed"
  DEPLOYMENT_CURRENT_SERVICE=""
  DEPLOYMENT_DEPLOYED_SHA="$DEPLOYMENT_TARGET_SHA"
  DEPLOYMENT_COMPLETED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  DEPLOYMENT_STATUS_FAILURE_CODE=""
  write_deployment_status
  DEPLOYMENT_STATUS_ACTIVE=0
  notify_deployment_status
}

build_services() {
  local output_file="$TMP_DIR/build-output"
  local attempt status delay

  for attempt in 1 2 3; do
    : >"$output_file"
    set +e
    COMPOSE_PARALLEL_LIMIT="$BUILD_PARALLEL_LIMIT" compose_build_bounded "${PLAN_SERVICES[@]}" \
      2>&1 | tee "$output_file"
    status="${PIPESTATUS[0]}"
    set -e

    if [ "$status" -eq 0 ]; then
      return 0
    fi

    # 124 is `timeout` expiring; 137 is the follow-up SIGKILL landing. A build
    # that produces nothing for an hour is wedged, not slow, and a wedged build
    # is deterministic — retrying it only holds the deploy lock longer.
    if [ "$status" -eq 124 ] || [ "$status" -eq 137 ]; then
      err "docker compose build exceeded ${BUILD_TIMEOUT_SECONDS}s and was aborted; refusing to retry."
      return "$status"
    fi

    if ! grep -Eqi 'ECONNRESET|ETIMEDOUT|EAI_AGAIN|network (is )?unreachable|temporary failure in name resolution|TLS handshake timeout|connection reset by peer' "$output_file"; then
      err "docker compose build failed with a non-transient error; refusing to retry."
      return "$status"
    fi

    if [ "$attempt" -eq 3 ]; then
      err "docker compose build exhausted 3 attempts after transient network failures."
      return "$status"
    fi

    delay="${BUILD_RETRY_DELAYS[$((attempt - 1))]}"
    err "docker compose build hit a transient network failure; retrying in ${delay}s."
    sleep "$delay"
  done
}

usage() {
  sed -n '2,40p' "$ORIGIN_SELF" | sed 's/^#\{1,\} \{0,1\}//'
}

# =============================================================================
# Service catalogue — derived from the production compose file, never hardcoded
# =============================================================================
# Emits one `service|dockerfile|profiled` record per compose service.
# `dockerfile` is empty for image-only services (nginx); `profiled` is 1 when
# the service sits behind the `local-ai` compose profile.
parse_compose_services() {
  awk '
    /^[^[:space:]#]/ {
      in_services = ($0 ~ /^services:[[:space:]]*$/) ? 1 : 0
      next
    }
    in_services && /^  [A-Za-z0-9_.-]+:[[:space:]]*$/ {
      if (svc != "") print svc "|" dockerfile "|" profiled
      svc = $0
      sub(/^  /, "", svc)
      sub(/:[[:space:]]*$/, "", svc)
      dockerfile = ""
      profiled = 0
      next
    }
    in_services && svc != "" && /^[[:space:]]+dockerfile:[[:space:]]*/ {
      line = $0
      sub(/^[[:space:]]+dockerfile:[[:space:]]*/, "", line)
      gsub(/["'"'"']/, "", line)
      sub(/[[:space:]]+$/, "", line)
      dockerfile = line
      next
    }
    in_services && svc != "" && /^[[:space:]]+profiles:/ && /local-ai/ {
      profiled = 1
      next
    }
    END {
      if (svc != "") print svc "|" dockerfile "|" profiled
    }
  ' "$1"
}

# =============================================================================
# Reverse dependency closure over the generated workspace dependency graph
# =============================================================================
# Edges are `{"from": "<consumer>", "to": "<dependency>"}`. Emits `from|to`.
parse_dep_edges() {
  awk '
    /"from"[[:space:]]*:/ {
      line = $0
      sub(/^.*"from"[[:space:]]*:[[:space:]]*"/, "", line)
      sub(/".*$/, "", line)
      from = line
      next
    }
    /"to"[[:space:]]*:/ && from != "" {
      line = $0
      sub(/^.*"to"[[:space:]]*:[[:space:]]*"/, "", line)
      sub(/".*$/, "", line)
      print from "|" line
      from = ""
    }
  ' "$1"
}

# Transitive closure: every workspace that consumes the given packages, directly
# or through another package. One level is not enough — a change to
# shared-constants reaches services that only import shared-utilities.
transitive_consumers() {
  local edges_file="$1"
  shift
  local set='|'
  local pkg from to
  for pkg in "$@"; do
    case "$set" in
      *"|$pkg|"*) ;;
      *) set="${set}${pkg}|" ;;
    esac
  done

  local round=0 changed=1
  while [ "$changed" = "1" ] && [ "$round" -lt 32 ]; do
    changed=0
    round=$((round + 1))
    while IFS='|' read -r from to; do
      [ -n "$from" ] || continue
      case "$set" in
        *"|$to|"*) ;;
        *) continue ;;
      esac
      case "$set" in
        *"|$from|"*) continue ;;
      esac
      set="${set}${from}|"
      changed=1
    done <"$edges_file"
  done

  printf '%s\n' "$set" | tr '|' '\n' | grep -v '^$' || true
}

# Every package under packages/ is published under the @claw scope. The
# package.json lookup exists so a future rename cannot silently mis-map; during
# a real deploy the working tree is still at the OLD commit, so a package added
# by the target commit falls through to the scope convention.
package_name_for_dir() {
  local dir="$1"
  local pkg_json="$PROJECT_ROOT/packages/$dir/package.json"
  local name=""
  if [ -f "$pkg_json" ]; then
    name="$(sed -n 's/^[[:space:]]*"name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$pkg_json" | head -1 || true)"
  fi
  printf '%s' "${name:-@claw/$dir}"
}

# Compose services that transitively consume the given packages. Returns
# non-zero when the dependency manifest is unusable — the caller escalates that
# to a full rebuild, because a missed consumer ships stale shared code.
dependency_consumers() {
  local edges="$TMP_DIR/dep-edges"
  parse_dep_edges "$DEP_GRAPH_SNAPSHOT" >"$edges" 2>/dev/null || true
  if [ ! -s "$edges" ]; then
    return 1
  fi

  local workspaces
  workspaces="$(transitive_consumers "$edges" "$@")"

  local ws svc dockerfile profiled dir out=''
  while IFS= read -r ws; do
    [ -n "$ws" ] || continue
    case "$ws" in
      @*) continue ;; # a package, not a deployable workspace
    esac
    while IFS='|' read -r svc dockerfile profiled; do
      [ -n "$dockerfile" ] || continue
      if [ "$profiled" = "1" ] && [ "$LOCAL_AI" != "true" ]; then
        continue
      fi
      dir="${dockerfile%/*}"
      if [ "${dir##*/}" = "$ws" ]; then
        out="${out}${svc}"$'\n'
      fi
    done <"$CATALOGUE_FILE"
  done <<<"$workspaces"

  printf '%s' "$out"
}

# =============================================================================
# Deployment plan
# =============================================================================
select_service() {
  case "$PLAN_SELECTED" in
    *"|$1|"*) return 0 ;;
  esac
  PLAN_SELECTED="${PLAN_SELECTED}$1|"
}

# Inputs (globals): CHANGED_FILES_FILE, COMPOSE_SNAPSHOT, DEP_GRAPH_SNAPSHOT,
#                   FIRST_DEPLOYMENT, LOCAL_AI, TMP_DIR
# Outputs (globals): PLAN_SERVICES, PLAN_NGINX_RELOAD, PLAN_INFRA_MANUAL,
#                    PLAN_REASON
compute_plan() {
  PLAN_SERVICES=()
  PLAN_INFRA_MANUAL=()
  PLAN_NGINX_RELOAD=0
  PLAN_REASON=""
  PLAN_SELECTED='|'

  CATALOGUE_FILE="$TMP_DIR/catalogue"
  parse_compose_services "$COMPOSE_SNAPSHOT" >"$CATALOGUE_FILE"
  [ -s "$CATALOGUE_FILE" ] || die "no services found in $SVC_COMPOSE_REL — refusing to guess"

  local svc dockerfile profiled dir
  local nginx_present=0
  local dir_map="$TMP_DIR/dir-map"
  local buildable="$TMP_DIR/buildable"
  : >"$dir_map"
  : >"$buildable"

  while IFS='|' read -r svc dockerfile profiled; do
    [ -n "$svc" ] || continue
    if [ "$svc" = "nginx" ]; then
      nginx_present=1
    fi
    [ -n "$dockerfile" ] || continue
    if [ "$profiled" = "1" ] && [ "$LOCAL_AI" != "true" ]; then
      # Profiled service with local-AI disabled: that container does not exist
      # on this host and a deployment must never bring it into existence.
      continue
    fi
    printf '%s|%s\n' "${dockerfile%/*}" "$svc" >>"$dir_map"
    printf '%s\n' "$svc" >>"$buildable"
  done <"$CATALOGUE_FILE"

  if [ "$FIRST_DEPLOYMENT" = "1" ]; then
    PLAN_REASON="first automated deployment — no recorded deployed SHA, so every application service is rebuilt. Databases, volumes and persistent data are untouched."
    while IFS= read -r svc; do
      [ -n "$svc" ] && select_service "$svc"
    done <"$buildable"
    finalize_plan "$nginx_present"
    return 0
  fi

  local broad=0 matched file pkg_dir pkg_name pattern map_dir map_svc
  local changed_packages='' infra_files=''

  while IFS= read -r file; do
    [ -n "$file" ] || continue
    # A workspace's AGENTS.md is generated documentation with zero code impact
    # — the same exclusion tools/affected/index.mjs makes.
    case "$file" in
      AGENTS.md | */AGENTS.md) continue ;;
    esac

    matched=0
    while IFS='|' read -r map_dir map_svc; do
      case "$file" in
        "$map_dir"/*)
          select_service "$map_svc"
          matched=1
          break
          ;;
      esac
    done <"$dir_map"
    [ "$matched" = "1" ] && continue

    case "$file" in
      packages/*/*)
        pkg_dir="${file#packages/}"
        pkg_dir="${pkg_dir%%/*}"
        pkg_name="$(package_name_for_dir "$pkg_dir")"
        case "$changed_packages" in
          *" $pkg_name "*) ;;
          *) changed_packages="${changed_packages} ${pkg_name} " ;;
        esac
        continue
        ;;
      infra/nginx/nginx.conf | infra/nginx/locations.conf | infra/nginx/public-tls/maintenance.html)
        PLAN_NGINX_RELOAD=1
        continue
        ;;
      docker/docker-compose.prod.databases.yml | \
        docker/docker-compose.prod.ollama.yml | \
        docker/docker-compose.prod.ollama.gpu-nvidia.yml)
        infra_files="${infra_files}${file}"$'\n'
        continue
        ;;
      docker/docker-compose.prod.gpu-*.yml)
        # GPU overlays shape llamacpp-service only, and only under local-AI.
        if [ "$LOCAL_AI" = "true" ]; then
          select_service "llamacpp-service"
        fi
        continue
        ;;
      tsconfig*.json)
        broad=1
        PLAN_REASON="broad-impact change: $file"
        continue
        ;;
    esac

    for pattern in "${BROAD_IMPACT_PATHS[@]}"; do
      if [ "$file" = "$pattern" ]; then
        broad=1
        PLAN_REASON="broad-impact change: $file"
        break
      fi
    done
  done <"$CHANGED_FILES_FILE"

  if [ -n "$changed_packages" ]; then
    local consumers
    # Unquoted on purpose: the accumulated package names are split into
    # separate arguments. Package names never contain whitespace.
    # shellcheck disable=SC2086
    if consumers="$(dependency_consumers $changed_packages)"; then
      while IFS= read -r svc; do
        [ -n "$svc" ] && select_service "$svc"
      done <<<"$consumers"
    else
      broad=1
      PLAN_REASON="shared-package impact could not be resolved from $DEP_GRAPH_REL — rebuilding every application service (correctness over build count)"
    fi
  fi

  if [ "$broad" = "1" ]; then
    PLAN_SELECTED='|'
    while IFS= read -r svc; do
      [ -n "$svc" ] && select_service "$svc"
    done <"$buildable"
  fi

  while IFS= read -r file; do
    [ -n "$file" ] && PLAN_INFRA_MANUAL+=("$file")
  done <<<"$(printf '%s' "$infra_files")"

  finalize_plan "$nginx_present"
}

# Orders the selection the way the target commit's compose file declares it and
# drops anything that is not a buildable service there.
finalize_plan() {
  local nginx_present="$1"
  local svc dockerfile profiled
  while IFS='|' read -r svc dockerfile profiled; do
    [ -n "$svc" ] || continue
    [ -n "$dockerfile" ] || continue
    case "$PLAN_SELECTED" in
      *"|$svc|"*) PLAN_SERVICES+=("$svc") ;;
    esac
  done <"$CATALOGUE_FILE"
  if [ "$PLAN_NGINX_RELOAD" = "1" ] && [ "$nginx_present" != "1" ]; then
    PLAN_NGINX_RELOAD=0
  fi
}

# =============================================================================
# Local-AI + GPU resolution — same precedence rules as scripts/claw.sh
# =============================================================================
resolve_local_ai() {
  local value="${CLAW_LOCAL_AI:-}"
  if [ -z "$value" ] && [ -f "$ENV_FILE" ]; then
    value="$(grep -E '^CLAW_LOCAL_AI=' "$ENV_FILE" 2>/dev/null | tail -1 | cut -d= -f2- | tr -d '\r' | tr '[:upper:]' '[:lower:]' || true)"
  fi
  case "$value" in
    true | 1 | yes) LOCAL_AI="true" ;;
    *) LOCAL_AI="false" ;;
  esac
}

# The GPU overlays exist solely to give llamacpp-service device access, so they
# are only consulted when the local-AI profile is live. Recreating that
# container without the overlay would silently strip its GPU passthrough.
resolve_gpu_overlay() {
  GPU_OVERLAY_FILE=""
  GPU_VENDOR="none"
  [ "$LOCAL_AI" = "true" ] || return 0

  local nvidia="$PROJECT_ROOT/docker/docker-compose.prod.gpu-nvidia.yml"
  local rocm="$PROJECT_ROOT/docker/docker-compose.prod.gpu-rocm.yml"
  local vulkan="$PROJECT_ROOT/docker/docker-compose.prod.gpu-vulkan.yml"

  if command -v nvidia-smi >/dev/null 2>&1 && nvidia-smi -L >/dev/null 2>&1 && [ -f "$nvidia" ]; then
    GPU_VENDOR="nvidia"
    GPU_OVERLAY_FILE="$nvidia"
  elif [ -e /dev/kfd ] && [ -d /dev/dri ] && [ -f "$rocm" ]; then
    GPU_VENDOR="rocm"
    GPU_OVERLAY_FILE="$rocm"
  elif [ -d /dev/dri ] && ls /dev/dri/render* >/dev/null 2>&1 && [ -f "$vulkan" ]; then
    GPU_VENDOR="vulkan"
    GPU_OVERLAY_FILE="$vulkan"
  fi
}

# =============================================================================
# Locking — two deployments must never run against this host at once
# =============================================================================
# What the lock holder was doing, read from the status document it maintains.
# Purely diagnostic: a missing or half-written file degrades to "unknown".
lock_holder_hint() {
  local target phase started
  if [ ! -f "$DEPLOYMENT_STATUS_FILE" ]; then
    printf 'holder unknown — no deployment status recorded'
    return 0
  fi
  target="$(sed -nE 's/.*"targetSha":"([^"]*)".*/\1/p' "$DEPLOYMENT_STATUS_FILE" | head -n 1)"
  phase="$(sed -nE 's/.*"phase":"([^"]*)".*/\1/p' "$DEPLOYMENT_STATUS_FILE" | head -n 1)"
  started="$(sed -nE 's/.*"startedAt":"([^"]*)".*/\1/p' "$DEPLOYMENT_STATUS_FILE" | head -n 1)"
  printf 'holder: target=%s phase=%s started=%s' \
    "${target:-unknown}" "${phase:-unknown}" "${started:-unknown}"
}

acquire_lock() {
  mkdir -p "$STATE_DIR"
  if command -v flock >/dev/null 2>&1; then
    exec 200>"$LOCK_FILE"
    # Never one long silent block: waiting in short slices keeps the SSH channel
    # alive and tells the operator what is holding the lock. Silence here is
    # what made a stuck deployment look like a dead connection.
    local waited=0 slice="$LOCK_HEARTBEAT_SECONDS"
    if [ "$LOCK_WAIT_SECONDS" -lt "$slice" ]; then
      slice="$LOCK_WAIT_SECONDS"
    fi
    while ! flock -w "$slice" 200; do
      waited=$((waited + slice))
      if [ "$waited" -ge "$LOCK_WAIT_SECONDS" ]; then
        die "another deployment holds $LOCK_FILE (waited ${LOCK_WAIT_SECONDS}s) — $(lock_holder_hint)"
      fi
      log "Waiting for the deploy lock: ${waited}s of ${LOCK_WAIT_SECONDS}s — $(lock_holder_hint)"
    done
    return 0
  fi

  # flock is not installed. mkdir is atomic on every POSIX filesystem, so it is
  # a correct substitute; the recorded PID lets a crashed deploy be reclaimed.
  local waited=0 holder
  until mkdir "$LOCK_DIR" 2>/dev/null; do
    holder="$(cat "$LOCK_DIR/pid" 2>/dev/null || true)"
    if [ -n "$holder" ] && ! kill -0 "$holder" 2>/dev/null; then
      err "reclaiming the deploy lock from dead process $holder"
      rm -f "$LOCK_DIR/pid" 2>/dev/null || true
      rmdir "$LOCK_DIR" 2>/dev/null || true
      continue
    fi
    if [ "$waited" -ge "$LOCK_WAIT_SECONDS" ]; then
      die "another deployment holds $LOCK_DIR (waited ${LOCK_WAIT_SECONDS}s) — $(lock_holder_hint)"
    fi
    sleep 5
    waited=$((waited + 5))
    if [ "$LOCK_HEARTBEAT_SECONDS" -gt 0 ] && [ $((waited % LOCK_HEARTBEAT_SECONDS)) -eq 0 ]; then
      log "Waiting for the deploy lock: ${waited}s of ${LOCK_WAIT_SECONDS}s — $(lock_holder_hint)"
    fi
  done
  printf '%s\n' "$$" >"$LOCK_DIR/pid"
  LOCK_DIR_HELD=1
}

# =============================================================================
# Preflight
# =============================================================================
preflight() {
  [ -d "$PROJECT_ROOT" ] || die "production checkout $PROJECT_ROOT does not exist"
  git -C "$PROJECT_ROOT" rev-parse --git-dir >/dev/null 2>&1 ||
    die "$PROJECT_ROOT is not a git repository"
  [ -f "$PROJECT_ROOT/$SVC_COMPOSE_REL" ] ||
    die "$PROJECT_ROOT/$SVC_COMPOSE_REL is missing — wrong checkout?"
  [ -f "$ENV_FILE" ] ||
    die "$ENV_FILE is missing. Production configuration is host-local and never committed; restore it before deploying."
  [ -r "$ENV_FILE" ] || die "$ENV_FILE exists but is not readable by $(id -un)"

  case "$DEPLOYMENT_WORKFLOW_URL" in
    '' | https://github.com/*) ;;
    *) die "CLAW_DEPLOY_WORKFLOW_URL must be an https://github.com/ URL" ;;
  esac

  command -v timeout >/dev/null 2>&1 || die "timeout (GNU coreutils) is not installed"
  command -v docker >/dev/null 2>&1 || die "docker is not installed"
  docker version >/dev/null 2>&1 ||
    die "cannot reach the Docker daemon as $(id -un) — is the user in the docker group?"
  docker compose version >/dev/null 2>&1 ||
    die "docker compose v2 is unavailable (\`docker compose version\` failed)"
}

# Refuse to run over unexpected TRACKED modifications. Untracked files are the
# normal state of this host — .env, certs/, .deploy/ and the generated
# infra/nginx/public-tls/*.conf all live here and must survive untouched — so
# they are deliberately NOT treated as dirt. Submodules are ignored: no compose
# service builds from apps/claw-coding-agent.
assert_clean_tree() {
  local dirty
  dirty="$(git -C "$PROJECT_ROOT" status --porcelain --untracked-files=no --ignore-submodules=all)"
  if [ -n "$dirty" ]; then
    err ""
    err "The production checkout has uncommitted changes to TRACKED files:"
    err ""
    printf '%s\n' "$dirty" >&2
    err ""
    err "Deployment will not overwrite them. Inspect and resolve on the server:"
    err "  cd $PROJECT_ROOT && git diff"
    die "dirty working tree"
  fi
}

# =============================================================================
# Compose wrapper + health verification
# =============================================================================
# Every docker invocation closes fd 200, the deploy lock. bash hands open file
# descriptors to its children, so without this a build that outlives the
# deployment keeps holding the lock — which is precisely how one wedged build
# blocked production releases for two days.
compose() {
  docker compose "${COMPOSE_ARGS[@]}" "$@" 200>&-
}

# `timeout` cannot run a shell function, so this mirrors compose() instead of
# wrapping it. The cap is on the whole build, not on one step: BuildKit can wedge
# a single RUN layer with no output and no worker process, and the deployment
# holds the lock for as long as compose refuses to return.
#
# --foreground keeps the build in this deployment's process group. Without it
# `timeout` moves the build into a group of its own, where the orphan guard's
# group signal cannot reach it.
compose_build_bounded() {
  timeout --foreground --kill-after=60 "$BUILD_TIMEOUT_SECONDS" \
    docker compose "${COMPOSE_ARGS[@]}" build "$@" 200>&-
}

container_state() {
  docker inspect \
    --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}nohealth:{{.State.Status}}{{end}}' \
    "$1" 2>/dev/null 200>&- || printf 'missing'
}

# Docker increments RestartCount only when the main process EXITED and the
# restart policy brought it back. A container that boots correctly never
# increments it, so a rising count is decisive evidence of a crash loop rather
# than a slow start.
#
# This matters because a crash-looping container with a declared healthcheck
# reports health "starting" forever — never "unhealthy" — so the poll below had
# no way to tell it apart from a service that is merely slow, and burned the
# whole 420s timeout per service. A chat-service replica dying on an ESM
# ReferenceError restarts every ~2s, so the deploy spent 20+ minutes to report a
# failure that was certain within 30 seconds (2026-09-02).
container_restart_count() {
  docker inspect --format '{{.State.RestartCount}}' "$1" 2>/dev/null 200>&- || printf '0'
}

# Every replica of a service, newest last. One line per container id.
service_container_ids() {
  compose ps -q "$1" 2>/dev/null || true
}

# Waits for EVERY replica, not just the first.
#
# This used to take `head -1`, which on a scaled service reported the whole
# deployment healthy as soon as replica 1 came up — the other replicas could be
# crash-looping on a bad image and the rollout would still be recorded a success.
wait_for_service_health() {
  local service="$1"
  local deadline=$(($(date +%s) + HEALTH_TIMEOUT_SECONDS))
  local cid state='unknown' stable=0 ids total ready saw_nohealth restarts

  while [ "$(date +%s)" -lt "$deadline" ]; do
    ids="$(service_container_ids "$service")"
    if [ -z "$ids" ]; then
      sleep 3
      continue
    fi

    total=0
    ready=0
    saw_nohealth=0
    for cid in $ids; do
      total=$((total + 1))

      # Fail fast on a crash loop. A container that has exited and been
      # restarted this many times is not starting slowly, and waiting out the
      # remaining timeout only delays a certain failure.
      restarts="$(container_restart_count "$cid")"
      if [ "${restarts:-0}" -ge "$CRASH_LOOP_RESTARTS" ]; then
        printf '%s -> crash-looping (%s restarted %s times)\n' "$service" "$cid" "$restarts"
        printf '  last log lines from %s:\n' "$cid"
        docker logs --tail 20 "$cid" 2>&1 200>&- | sed 's/^/    /' || true
        return 1
      fi

      state="$(container_state "$cid")"
      case "$state" in
        healthy) ready=$((ready + 1)) ;;
        unhealthy)
          printf '%s -> unhealthy (%s)\n' "$service" "$cid"
          return 1
          ;;
        nohealth:running)
          ready=$((ready + 1))
          saw_nohealth=1
          ;;
        *) ;;
      esac
    done

    if [ "$ready" -eq "$total" ] && [ "$total" -gt 0 ]; then
      if [ "$saw_nohealth" = "1" ]; then
        # No healthcheck declared (nginx). "Running" is not evidence on its own
        # — a crash-looping container is momentarily running too — so require
        # the state to hold across two consecutive polls.
        stable=$((stable + 1))
        if [ "$stable" -ge 2 ]; then
          printf '%s -> running, %s replica(s) (no healthcheck declared)\n' "$service" "$total"
          return 0
        fi
      else
        printf '%s -> healthy, %s replica(s)\n' "$service" "$total"
        return 0
      fi
    else
      stable=0
    fi
    sleep 5
  done

  printf '%s -> TIMEOUT after %ss (last state: %s)\n' "$service" "$HEALTH_TIMEOUT_SECONDS" "$state"
  return 1
}

# Replaces a scaled service's containers ONE AT A TIME.
#
# Compose has no rolling restart outside swarm: `up -d` recreates every replica
# together, which drops every in-flight stream and makes chat unavailable on
# every release. Removing one container and letting compose refill the gap with
# `--no-recreate` leaves the surviving replicas serving traffic throughout, so
# the only cost is a slower rollout.
rolling_recreate_service() {
  local service="$1"
  local ids id index=0 total
  ids="$(service_container_ids "$service")"
  total="$(printf '%s\n' "$ids" | grep -c . || true)"

  log "Rolling $service across $total replica(s), one at a time."
  for id in $ids; do
    index=$((index + 1))
    log "  replica $index/$total: replacing $id"
    docker rm -f "$id" >/dev/null 2>&1 || true
    # --no-recreate leaves the replicas still serving traffic untouched;
    # compose creates only the missing one, on the new image.
    if ! compose up -d --no-deps --no-build --no-recreate "$service"; then
      dump_diagnostics "$service"
      return 1
    fi
    if ! wait_for_service_health "$service"; then
      dump_diagnostics "$service"
      return 1
    fi
  done
  return 0
}

dump_diagnostics() {
  local service="$1"
  err ""
  err "─── docker compose ps ───────────────────────────────────────────────"
  compose ps >&2 || true
  err ""
  err "─── last 200 log lines: $service ────────────────────────────────────"
  compose logs --tail=200 --no-color "$service" >&2 || true
  err ""
}

# nginx's configuration arrives through SINGLE-FILE bind mounts, and a file bind
# mount binds the INODE, not the path. `git pull` does not edit these files in
# place — it writes a replacement and renames it over the original, which is a
# new inode. The running container stays attached to the old, now-unlinked one,
# so the new configuration is NOT visible inside the container and `nginx -s
# reload` faithfully reloads the previous content while reporting success.
#
# That is not hypothetical: production served an Aug 7 locations.conf for nearly
# three weeks while every deployment reported a healthy reload, and /api/v1/feedback
# 404'd because the route existed only in the host's copy of the file.
#
# So the reload is now evidence-based: compare what the container can actually
# see against the host, take the cheap zero-downtime reload when they match, and
# recreate the container when they do not. Recreating blips TLS termination for a
# moment, which is strictly better than serving a stale configuration silently.
NGINX_CONFIG_MOUNTS="/etc/nginx/nginx.conf:infra/nginx/nginx.conf /etc/nginx/claw/locations.conf:infra/nginx/locations.conf"

# 0 when every mounted config file inside the container matches the host copy.
nginx_sees_current_config() {
  local cid="$1" pair container_path host_path host_sum container_sum
  for pair in $NGINX_CONFIG_MOUNTS; do
    container_path="${pair%%:*}"
    host_path="${pair#*:}"
    [ -f "$host_path" ] || continue
    host_sum="$(sha256sum "$host_path" 2>/dev/null | awk '{print $1}')"
    container_sum="$(docker exec "$cid" sha256sum "$container_path" 2>/dev/null | awk '{print $1}')"
    if [ -z "$container_sum" ] || [ "$host_sum" != "$container_sum" ]; then
      log "nginx cannot see the current $host_path (stale bind mount)."
      return 1
    fi
  done
  return 0
}

reload_nginx() {
  section "Reloading nginx configuration..."
  local cid
  cid="$(compose ps -q nginx 2>/dev/null | head -1 || true)"
  if [ -z "$cid" ]; then
    log "nginx is not running — starting it."
    compose up -d --no-deps --no-build nginx || die "could not start nginx"
    return 0
  fi

  if ! nginx_sees_current_config "$cid"; then
    log "Recreating nginx so the bind mounts re-resolve to the current files."
    compose up -d --no-deps --no-build --force-recreate nginx ||
      die "could not recreate nginx"
    cid="$(compose ps -q nginx 2>/dev/null | head -1 || true)"
    [ -n "$cid" ] || die "nginx did not come back after recreation"
    if ! nginx_sees_current_config "$cid"; then
      die "nginx still cannot see the current configuration after recreation"
    fi
    if ! docker exec "$cid" nginx -t; then
      die "the new nginx configuration is invalid"
    fi
    log "nginx recreated with the current configuration."
    return 0
  fi

  if ! docker exec "$cid" nginx -t; then
    die "the new nginx configuration is invalid — the running configuration was left in place"
  fi
  docker exec "$cid" nginx -s reload || die "nginx reload failed"
  log "nginx configuration reloaded."
}

# Written ONLY after every affected service reports healthy. Atomic rename, so a
# crash mid-write can never leave a truncated SHA behind.
record_deployment() {
  local sha="$1"
  local services="${2:-(none)}"
  mkdir -p "$STATE_DIR"
  printf '%s\n' "$sha" >"$STATE_FILE.tmp"
  mv -f "$STATE_FILE.tmp" "$STATE_FILE"
  printf '%s %s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$sha" "$services" >>"$HISTORY_FILE"
  record_completed_deployment_status
}

# Docker Compose builds can create hundreds of gigabytes of short-lived
# BuildKit layers during a multi-service release. Keep a useful warm cache for
# the next deployment without allowing those rebuildable layers to consume the
# host disk. Cleanup is deliberately post-health and excludes every persistent
# Docker resource. A cleanup failure is loud but must not turn a healthy
# production rollout into a failed deployment.
cleanup_build_cache() {
  section "Cleaning Docker build cache..."
  if docker builder prune --all --force --keep-storage 20GB 200>&-; then
    log "Docker build cache is bounded to 20 GB."
  else
    err "WARNING: Docker build cache cleanup failed; production remains healthy."
  fi
}

# =============================================================================
# Plan-only mode — no git, no docker. Used by the test suite and by an operator
# who wants to know what a commit would touch before deploying it.
# =============================================================================
run_plan_mode() {
  local changed_files_arg=""
  FIRST_DEPLOYMENT=0
  shift # --plan
  while [ $# -gt 0 ]; do
    case "$1" in
      --changed-files)
        changed_files_arg="${2:-}"
        shift 2
        ;;
      --first-deployment)
        FIRST_DEPLOYMENT=1
        shift
        ;;
      *) die "unknown --plan option: $1" ;;
    esac
  done

  TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/claw-deploy-plan.XXXXXXXX")"
  CHANGED_FILES_FILE="$TMP_DIR/changed"
  if [ -n "$changed_files_arg" ]; then
    [ -f "$changed_files_arg" ] || die "changed-files list not found: $changed_files_arg"
    cat "$changed_files_arg" >"$CHANGED_FILES_FILE"
  else
    cat >"$CHANGED_FILES_FILE"
  fi

  COMPOSE_SNAPSHOT="$PROJECT_ROOT/$SVC_COMPOSE_REL"
  DEP_GRAPH_SNAPSHOT="$PROJECT_ROOT/$DEP_GRAPH_REL"
  [ -f "$COMPOSE_SNAPSHOT" ] || die "$COMPOSE_SNAPSHOT not found"
  resolve_local_ai
  compute_plan

  log "local-ai: $LOCAL_AI"
  if [ -n "$PLAN_REASON" ]; then
    log "reason: $PLAN_REASON"
  fi
  log "services:"
  if [ "${#PLAN_SERVICES[@]}" -eq 0 ]; then
    log "  (none)"
  else
    printf '  %s\n' "${PLAN_SERVICES[@]}"
  fi
  log "nginx-reload: $PLAN_NGINX_RELOAD"
  if [ "${#PLAN_INFRA_MANUAL[@]}" -gt 0 ]; then
    log "infra-manual:"
    printf '  %s\n' "${PLAN_INFRA_MANUAL[@]}"
  fi
}

# ─── Automatic-deploy switch ─────────────────────────────────────────────────
# auth-service writes .deploy/automation.json when an admin pauses or resumes
# the automatic lane from the deployment page. Only an automatic rollout reads
# it; a manual dispatch is the operator overriding their own pause, so it never
# consults the file. Anything unreadable, absent or unrecognised means the lane
# is on — the shipped default, and the safe one: a pause must be an explicit,
# well-formed statement, never the result of a truncated or missing file.
automatic_deploy_paused() {
  [ -f "$AUTOMATION_FILE" ] || return 1
  grep -Eq '"enabled"[[:space:]]*:[[:space:]]*false' "$AUTOMATION_FILE" 2>/dev/null
}

assert_lane_allowed() {
  local trigger="${CLAW_DEPLOY_TRIGGER:-auto}"
  case "$trigger" in
    auto | manual) ;;
    *) die "CLAW_DEPLOY_TRIGGER must be 'auto' or 'manual', got '$trigger'" ;;
  esac
  if [ "$trigger" = "auto" ] && automatic_deploy_paused; then
    log "Automatic deployment is paused; skipping this rollout."
    log "Resume it from the admin deployment page, or deploy manually from there."
    exit 0
  fi
}

# =============================================================================
# Deployment
# =============================================================================
main() {
  case "${1:-}" in
    --help | -h | '')
      usage
      exit 0
      ;;
    --plan)
      run_plan_mode "$@"
      exit 0
      ;;
  esac

  if [ $# -gt 1 ]; then
    die "expected exactly one argument (the target commit SHA), got $#"
  fi

  case "$BUILD_PARALLEL_LIMIT" in
    1 | 2 | 3 | 4) ;;
    *) die "COMPOSE_PARALLEL_LIMIT must be an integer from 1 to 4" ;;
  esac

  case "$BUILD_TIMEOUT_SECONDS" in
    '' | *[!0-9]*) die "CLAW_DEPLOY_BUILD_TIMEOUT must be a whole number of seconds" ;;
  esac
  if [ "$BUILD_TIMEOUT_SECONDS" -lt 1 ]; then
    die "CLAW_DEPLOY_BUILD_TIMEOUT must be at least 1 second"
  fi

  local target_rev="$1"
  case "$target_rev" in
    *[!0-9a-fA-F]* | '') die "not a commit SHA: '$target_rev' (expected 7-40 hex characters)" ;;
  esac
  if [ "${#target_rev}" -lt 7 ] || [ "${#target_rev}" -gt 40 ]; then
    die "not a commit SHA: '$target_rev' (expected 7-40 hex characters)"
  fi
  target_rev="$(printf '%s' "$target_rev" | tr '[:upper:]' '[:lower:]')"

  # The lane gate first: a rollout the operator has paused should not start an
  # orphan guard, take the lock, or touch the checkout at all.
  assert_lane_allowed
  # Before the lock, not after: waiting for a lock held by a deployment whose
  # own session died is exactly the case this guards.
  start_orphan_guard
  preflight
  acquire_lock
  cd "$PROJECT_ROOT"

  TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/claw-deploy.XXXXXXXX")"

  section "ClawAI Production Deployment"
  log ""
  log "Checkout:  $PROJECT_ROOT"
  log "Requested: $target_rev"

  assert_clean_tree

  # ─── Fetch the exact commit ────────────────────────────────────────────────
  # Never `git pull`: a pull deploys whatever main happens to point at right
  # now, which is not necessarily the commit CI proved green.
  if ! git fetch --no-tags --quiet origin "$target_rev" 2>/dev/null; then
    git fetch --no-tags --prune --quiet origin || die "git fetch from origin failed"
  fi
  git cat-file -e "${target_rev}^{commit}" 2>/dev/null ||
    die "commit $target_rev does not exist on origin"

  local new_sha old_sha=''
  new_sha="$(git rev-parse "${target_rev}^{commit}")"

  # ─── Previous deployment ───────────────────────────────────────────────────
  FIRST_DEPLOYMENT=0
  if [ -f "$STATE_FILE" ]; then
    old_sha="$(tr -d '[:space:]' <"$STATE_FILE")"
  fi
  if [ -z "$old_sha" ]; then
    FIRST_DEPLOYMENT=1
  elif ! git cat-file -e "${old_sha}^{commit}" 2>/dev/null; then
    err "Recorded deployed SHA $old_sha is not a known commit (history rewritten?)."
    err "Falling back to a full application deployment."
    FIRST_DEPLOYMENT=1
    old_sha=''
  fi

  log "Previous:  ${old_sha:-<none — first automated deployment>}"
  log "Target:    $new_sha"

  DEPLOYMENT_TARGET_SHA="$new_sha"
  DEPLOYMENT_PREVIOUS_SHA="$old_sha"
  DEPLOYMENT_DEPLOYED_SHA="$old_sha"
  DEPLOYMENT_VERSION="$(git show "$new_sha:package.json" | sed -nE 's/.*"version"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/p' | head -n 1)"
  DEPLOYMENT_STARTED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  DEPLOYMENT_STATUS_ACTIVE=1
  set_deployment_phase "preparing"

  # Ordering guard. A CI run that finishes late must not overwrite a newer
  # deployment with an older commit. Rollback stays possible, but only when an
  # operator asks for it explicitly.
  if [ -n "$old_sha" ] && [ "$old_sha" != "$new_sha" ] &&
    git merge-base --is-ancestor "$new_sha" "$old_sha" 2>/dev/null; then
    if [ "${CLAW_DEPLOY_ALLOW_ROLLBACK:-0}" != "1" ]; then
      die "$new_sha is an ancestor of the deployed commit $old_sha — deploying it would roll production BACKWARDS. Re-run with CLAW_DEPLOY_ALLOW_ROLLBACK=1 if that is intended."
    fi
    log ""
    log "ROLLBACK: the target is older than the deployed commit (CLAW_DEPLOY_ALLOW_ROLLBACK=1)."
    log "          Database migrations are NOT reversed — see docs/PRODUCTION_DEPLOYMENT.md."
  fi

  # ─── Changed files ─────────────────────────────────────────────────────────
  set_deployment_phase "planning"
  CHANGED_FILES_FILE="$TMP_DIR/changed"
  if [ "$FIRST_DEPLOYMENT" = "1" ]; then
    : >"$CHANGED_FILES_FILE"
  else
    # --no-renames so a moved file reports BOTH paths; a rename across a
    # workspace boundary has to mark the source service as well as the target.
    git diff --name-only --no-renames "$old_sha" "$new_sha" >"$CHANGED_FILES_FILE"
  fi

  # ─── Affected services ─────────────────────────────────────────────────────
  # Read the compose file and dependency manifest AS OF THE TARGET COMMIT, so a
  # service this very commit introduces is deployable and one it removes is not
  # resurrected.
  COMPOSE_SNAPSHOT="$TMP_DIR/compose.yml"
  DEP_GRAPH_SNAPSHOT="$TMP_DIR/dep-graph.json"
  git show "$new_sha:$SVC_COMPOSE_REL" >"$COMPOSE_SNAPSHOT" ||
    die "the target commit has no $SVC_COMPOSE_REL"
  git show "$new_sha:$DEP_GRAPH_REL" >"$DEP_GRAPH_SNAPSHOT" 2>/dev/null || : >"$DEP_GRAPH_SNAPSHOT"

  resolve_local_ai
  compute_plan
  warn_removed_services "$old_sha" "$new_sha"
  DEPLOYMENT_SERVICES="${PLAN_SERVICES[*]}"
  if [ "$PLAN_NGINX_RELOAD" = "1" ]; then
    DEPLOYMENT_SERVICES="${DEPLOYMENT_SERVICES:+$DEPLOYMENT_SERVICES }nginx"
  fi
  set_deployment_phase "planning"

  section "Changed files:"
  if [ "$FIRST_DEPLOYMENT" = "1" ]; then
    log "  (not computed — first automated deployment)"
  elif [ ! -s "$CHANGED_FILES_FILE" ]; then
    log "  (none)"
  else
    sed -n '1,50p' "$CHANGED_FILES_FILE" | sed 's/^/  /'
    local total
    total="$(wc -l <"$CHANGED_FILES_FILE" | tr -d '[:space:]')"
    if [ "$total" -gt 50 ]; then
      log "  ... and $((total - 50)) more"
    fi
  fi

  section "Affected services:"
  if [ "${#PLAN_SERVICES[@]}" -eq 0 ]; then
    log "  (none)"
  else
    printf -- '- %s\n' "${PLAN_SERVICES[@]}"
  fi
  if [ -n "$PLAN_REASON" ]; then
    log "  ($PLAN_REASON)"
  fi
  if [ "$PLAN_NGINX_RELOAD" = "1" ]; then
    log "- nginx (configuration reload only, no rebuild)"
  fi
  if [ "${#PLAN_INFRA_MANUAL[@]}" -gt 0 ]; then
    log ""
    log "NOTE: infrastructure compose files changed. Automated deployment never"
    log "      touches databases or the local-AI runtime; apply these by hand:"
    printf '        %s\n' "${PLAN_INFRA_MANUAL[@]}"
  fi

  # ─── Switch the tracked source to the exact target commit ──────────────────
  section "Checking out $new_sha..."
  git checkout --detach --quiet "$new_sha" ||
    die "git checkout of $new_sha failed — resolve it on the server; nothing was rebuilt"

  local head_sha
  head_sha="$(git rev-parse HEAD)"
  if [ "$head_sha" != "$new_sha" ]; then
    die "HEAD is $head_sha but the target is $new_sha — refusing to build"
  fi
  log "HEAD is $head_sha"

  # ─── Compose invocation ────────────────────────────────────────────────────
  resolve_gpu_overlay
  COMPOSE_ARGS=(--env-file "$ENV_FILE" -p claw -f "$PROJECT_ROOT/$SVC_COMPOSE_REL")
  if [ -n "$GPU_OVERLAY_FILE" ]; then
    COMPOSE_ARGS+=(-f "$GPU_OVERLAY_FILE")
    log "GPU overlay: $GPU_VENDOR"
  fi
  if [ "$LOCAL_AI" = "true" ]; then
    export COMPOSE_PROFILES=local-ai
  else
    unset COMPOSE_PROFILES
  fi

  local svc
  if [ "${#PLAN_SERVICES[@]}" -eq 0 ]; then
    if [ "$PLAN_NGINX_RELOAD" = "1" ]; then
      set_deployment_phase "reloading_nginx"
      reload_nginx
      set_deployment_phase "finalizing"
      record_deployment "$new_sha" "nginx-reload"
    else
      log ""
      log "No service is affected by this commit — nothing to build or recreate."
      set_deployment_phase "finalizing"
      record_deployment "$new_sha" "(no service impact)"
    fi
    log ""
    log "Deployment successful."
    log "Recorded deployed SHA: $new_sha"
    return 0
  fi

  # ─── Build first, recreate second ──────────────────────────────────────────
  # A failed build must leave production running. Nothing below touches a
  # container until the build succeeds, so a compile error costs a red workflow
  # and zero downtime.
  section "Building services..."
  log ""
  set_deployment_phase "building"
  # Compose otherwise builds every selected image concurrently. A broad-impact
  # release can fan out to all application services and exhaust VPS CPU long
  # enough for the controlling SSH connection to time out. Keep the default
  # deliberately conservative; operators may choose a value from 1 to 4.
  if ! build_services; then
    err ""
    err "Build failed. No container was recreated; production is still serving"
    err "the previously deployed commit ${old_sha:-<unknown>}."
    die "docker compose build failed"
  fi

  section "Deploying services..."
  log ""
  set_deployment_phase "deploying"
  # --no-deps: recreate ONLY these services. Without it compose walks nginx's
  #            depends_on chain and restarts healthy, unrelated containers.
  # --no-build: use exactly the images the step above produced.
  # Never --remove-orphans: the databases live in a different compose file.
  # Scaled services roll one replica at a time so the service stays available;
  # single-replica services take the original bulk path, which is faster and
  # has nothing to keep serving.
  BULK_SERVICES=()
  for svc in "${PLAN_SERVICES[@]}"; do
    if [ "$(service_container_ids "$svc" | grep -c . || true)" -gt 1 ]; then
      if ! rolling_recreate_service "$svc"; then
        die "rolling deployment of $svc failed"
      fi
    else
      BULK_SERVICES+=("$svc")
    fi
  done

  if [ "${#BULK_SERVICES[@]}" -gt 0 ]; then
    if ! compose up -d --no-deps --no-build "${BULK_SERVICES[@]}"; then
      err ""
      for svc in "${BULK_SERVICES[@]}"; do
        dump_diagnostics "$svc"
      done
      die "docker compose up failed"
    fi
  fi

  if [ "$PLAN_NGINX_RELOAD" = "1" ]; then
    set_deployment_phase "reloading_nginx"
    reload_nginx
  fi

  # ─── Health ────────────────────────────────────────────────────────────────
  section "Health:"
  set_deployment_phase "verifying"
  local failed=()
  for svc in "${PLAN_SERVICES[@]}"; do
    set_deployment_phase "verifying" "$svc"
    if ! wait_for_service_health "$svc"; then
      failed+=("$svc")
    fi
  done

  if [ "${#failed[@]}" -gt 0 ]; then
    err ""
    err "Unhealthy after deployment: ${failed[*]}"
    for svc in "${failed[@]}"; do
      dump_diagnostics "$svc"
    done
    err "The recorded deployed SHA is unchanged (${old_sha:-<none>}); databases and"
    err "volumes were not touched, and no migration was reversed."
    die "health verification failed"
  fi

  set_deployment_phase "finalizing"
  cleanup_build_cache
  record_deployment "$new_sha" "${PLAN_SERVICES[*]}"

  log ""
  log "Deployment successful."
  log "Recorded deployed SHA: $new_sha"
}

# A service deleted between the two commits leaves a container behind that keeps
# serving the old image. Removing containers is destructive, so this only
# reports it — the operator decides.
warn_removed_services() {
  local old="$1" new="$2"
  [ -n "$old" ] || return 0
  local old_compose="$TMP_DIR/compose.old.yml"
  git show "$old:$SVC_COMPOSE_REL" >"$old_compose" 2>/dev/null || return 0

  local svc dockerfile profiled removed=''
  while IFS='|' read -r svc dockerfile profiled; do
    [ -n "$svc" ] || continue
    if ! grep -q "^${svc}|" "$CATALOGUE_FILE"; then
      removed="${removed} ${svc}"
    fi
  done <<<"$(parse_compose_services "$old_compose")"

  if [ -n "$removed" ]; then
    log ""
    log "NOTE: these services no longer exist in the target commit:${removed}"
    log "      Their containers are still running the old image. Deployment does"
    log "      not remove containers; stop them deliberately when you are ready."
  fi
}

main "$@"
