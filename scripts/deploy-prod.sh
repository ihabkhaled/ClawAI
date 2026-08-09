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
#   CLAW_DEPLOY_ALLOW_ROLLBACK  1 = permit deploying a commit older than the one
#                               currently deployed (emergency rollback)
#   CLAW_LOCAL_AI               true|false override for the local-AI profile;
#                               default reads the production .env, the same
#                               precedence rule scripts/claw.sh applies
#
# What this script will NEVER do:
#   * `docker compose down`, `docker rm`, `docker volume rm`, `docker system prune`
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
HISTORY_FILE="$STATE_DIR/history.log"
LOCK_FILE="$STATE_DIR/deploy.lock"
LOCK_DIR="$STATE_DIR/deploy.lock.d"

SVC_COMPOSE_REL="docker/docker-compose.prod.services.yml"
DEP_GRAPH_REL=".ai/manifests/workspace-dependency-graph.json"

LOCK_WAIT_SECONDS="${CLAW_DEPLOY_LOCK_WAIT:-1800}"
HEALTH_TIMEOUT_SECONDS="${CLAW_DEPLOY_HEALTH_TIMEOUT:-420}"

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

cleanup() {
  local status=$?
  trap - EXIT
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

log() { printf '%s\n' "$*"; }
err() { printf '%s\n' "$*" >&2; }
section() { printf '\n%s\n' "$*"; }

die() {
  err ""
  err "DEPLOYMENT FAILED: $*"
  err ""
  exit 1
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
      infra/nginx/nginx.conf | infra/nginx/locations.conf)
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
acquire_lock() {
  mkdir -p "$STATE_DIR"
  if command -v flock >/dev/null 2>&1; then
    exec 200>"$LOCK_FILE"
    if ! flock -w "$LOCK_WAIT_SECONDS" 200; then
      die "another deployment holds $LOCK_FILE (waited ${LOCK_WAIT_SECONDS}s)"
    fi
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
      die "another deployment holds $LOCK_DIR (waited ${LOCK_WAIT_SECONDS}s)"
    fi
    sleep 5
    waited=$((waited + 5))
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
compose() {
  docker compose "${COMPOSE_ARGS[@]}" "$@"
}

container_state() {
  docker inspect \
    --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}nohealth:{{.State.Status}}{{end}}' \
    "$1" 2>/dev/null || printf 'missing'
}

wait_for_service_health() {
  local service="$1"
  local deadline=$(($(date +%s) + HEALTH_TIMEOUT_SECONDS))
  local cid state='unknown' stable=0

  while [ "$(date +%s)" -lt "$deadline" ]; do
    cid="$(compose ps -q "$service" 2>/dev/null | head -1 || true)"
    if [ -z "$cid" ]; then
      sleep 3
      continue
    fi
    state="$(container_state "$cid")"
    case "$state" in
      healthy)
        printf '%s -> healthy\n' "$service"
        return 0
        ;;
      nohealth:running)
        # No healthcheck declared (nginx). "Running" on its own is not evidence
        # — a crash-looping container is momentarily running too — so require
        # the state to hold across two consecutive polls.
        stable=$((stable + 1))
        if [ "$stable" -ge 2 ]; then
          printf '%s -> running (no healthcheck declared)\n' "$service"
          return 0
        fi
        ;;
      unhealthy)
        printf '%s -> unhealthy\n' "$service"
        return 1
        ;;
      *)
        stable=0
        ;;
    esac
    sleep 5
  done

  printf '%s -> TIMEOUT after %ss (last state: %s)\n' "$service" "$HEALTH_TIMEOUT_SECONDS" "$state"
  return 1
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

# nginx serves its configuration from a read-only bind mount, so the new file is
# already visible inside the running container. `nginx -s reload` swaps workers
# without dropping a connection — strictly better than recreating the container,
# which would blip TLS termination for the whole site.
reload_nginx() {
  section "Reloading nginx configuration..."
  local cid
  cid="$(compose ps -q nginx 2>/dev/null | head -1 || true)"
  if [ -z "$cid" ]; then
    log "nginx is not running — starting it."
    compose up -d --no-deps --no-build nginx || die "could not start nginx"
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
}

# Docker Compose builds can create hundreds of gigabytes of short-lived
# BuildKit layers during a multi-service release. Keep a useful warm cache for
# the next deployment without allowing those rebuildable layers to consume the
# host disk. Cleanup is deliberately post-health and excludes every persistent
# Docker resource. A cleanup failure is loud but must not turn a healthy
# production rollout into a failed deployment.
cleanup_build_cache() {
  section "Cleaning Docker build cache..."
  if docker builder prune --all --force --keep-storage 20GB; then
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

  local target_rev="$1"
  case "$target_rev" in
    *[!0-9a-fA-F]* | '') die "not a commit SHA: '$target_rev' (expected 7-40 hex characters)" ;;
  esac
  if [ "${#target_rev}" -lt 7 ] || [ "${#target_rev}" -gt 40 ]; then
    die "not a commit SHA: '$target_rev' (expected 7-40 hex characters)"
  fi
  target_rev="$(printf '%s' "$target_rev" | tr '[:upper:]' '[:lower:]')"

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
      reload_nginx
      record_deployment "$new_sha" "nginx-reload"
    else
      log ""
      log "No service is affected by this commit — nothing to build or recreate."
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
  if ! compose build "${PLAN_SERVICES[@]}"; then
    err ""
    err "Build failed. No container was recreated; production is still serving"
    err "the previously deployed commit ${old_sha:-<unknown>}."
    die "docker compose build failed"
  fi

  section "Deploying services..."
  log ""
  # --no-deps: recreate ONLY these services. Without it compose walks nginx's
  #            depends_on chain and restarts healthy, unrelated containers.
  # --no-build: use exactly the images the step above produced.
  # Never --remove-orphans: the databases live in a different compose file.
  if ! compose up -d --no-deps --no-build "${PLAN_SERVICES[@]}"; then
    err ""
    for svc in "${PLAN_SERVICES[@]}"; do
      dump_diagnostics "$svc"
    done
    die "docker compose up failed"
  fi

  if [ "$PLAN_NGINX_RELOAD" = "1" ]; then
    reload_nginx
  fi

  # ─── Health ────────────────────────────────────────────────────────────────
  section "Health:"
  local failed=()
  for svc in "${PLAN_SERVICES[@]}"; do
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
