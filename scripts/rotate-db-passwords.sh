#!/usr/bin/env bash
# =============================================================================
# ClawAI — give every data store its own fresh password (rules/68, incident 2026-11-27)
# =============================================================================
# Every Postgres (one per service), MongoDB, RabbitMQ, Redis and the Firecrawl Postgres, Redis and RabbitMQ get a NEW, UNIQUE
# password. Installs made before per-database passwords shared ONE password across 14 databases, and Redis had
# none; a single leaked connection string then opened every database.
#
# Modes
#   live (default)  For a running install. 1) checks that each running store accepts the password .env has;
#                   2) changes the password INSIDE each store (Postgres ALTER USER, MongoDB changeUserPassword,
#                   rabbitmqctl change_password, Redis CONFIG SET requirepass); 3) backs .env up and writes the new
#                   values (the *_PASSWORD keys and every URL that embeds them, matched by host); 4) recreates the
#                   data-store containers and every running app container so they reconnect; 5) checks the new
#                   passwords and waits for every container to be healthy. A failure in step 1-2 puts every store
#                   it already changed back to its old password and leaves .env untouched.
#   --fresh         For a new .env whose databases do not exist yet (setup.sh, install.sh): writes unique values
#                   to .env only and touches no container.
#
# Values are never printed, never passed on a command line (they travel through environment variables and
# stdin), and the backup keeps the file's owner and mode.
#
# Usage
#   sudo bash scripts/rotate-db-passwords.sh --env /srv/clawai/.env --yes            # production, everything
#   bash scripts/rotate-db-passwords.sh --env .env --dry-run                         # show the plan only
#   bash scripts/rotate-db-passwords.sh --env .env --only REDIS,AUTH --yes           # some stores only
#   bash scripts/rotate-db-passwords.sh --env .env --fresh --yes                     # new install, .env only
#   --compose-file F (repeatable; default the two production files), --project NAME (default claw),
#   --health-timeout SECONDS (default 600)
# Runbook: docs/11-runbooks/runbook-production-host-hardening.md (section 4).
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT/.env"
PROJECT="claw"
COMPOSE_FILES=()
ONLY=""
MODE="live"
DRY_RUN=0
ASSUME_YES=0
HEALTH_TIMEOUT_SECONDS=600

# Must match PG_DB_KEYS in scripts/install.sh and the pg-* services of docker/docker-compose.*.databases.yml.
PG_DB_KEYS="AUTH CHAT CONNECTOR ROUTING MEMORY FILES OLLAMA IMAGES FILE_GENERATIONS WORKSPACE AGENT RESEARCH PAYMENTS LLAMACPP THREAD_GENERATION THREADS PLUGIN LIVE"
OTHER_KEYS="MONGO RABBITMQ REDIS FIRECRAWL FIRECRAWL_REDIS FIRECRAWL_RABBITMQ"

log() { printf '%s\n' "$*"; }
die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

while [ $# -gt 0 ]; do
  case "$1" in
    --env) ENV_FILE="$2"; shift 2 ;;
    --project) PROJECT="$2"; shift 2 ;;
    --compose-file) COMPOSE_FILES+=("$2"); shift 2 ;;
    --only) ONLY=",$(printf '%s' "$2" | tr '[:lower:]' '[:upper:]'),"; shift 2 ;;
    --fresh) MODE="fresh"; shift ;;
    --dry-run) DRY_RUN=1; shift ;;
    --yes) ASSUME_YES=1; shift ;;
    --health-timeout) HEALTH_TIMEOUT_SECONDS="$2"; shift 2 ;;
    -h | --help) sed -n '2,33p' "$0"; exit 0 ;;
    *) die "unknown option: $1 (see --help)" ;;
  esac
done
[ ${#COMPOSE_FILES[@]} -gt 0 ] || COMPOSE_FILES=("$ROOT/docker/docker-compose.prod.databases.yml" "$ROOT/docker/docker-compose.prod.services.yml")
[ -f "$ENV_FILE" ] || die "$ENV_FILE does not exist"
[ "$DRY_RUN" -eq 1 ] || [ "$ASSUME_YES" -eq 1 ] || die "this changes live passwords; re-run with --yes (or --dry-run to see the plan)"

env_value() { # the raw value of KEY in the .env file, empty when absent
  awk -v k="$1" 'index($0, k "=") == 1 { print substr($0, length(k) + 2); exit }' "$ENV_FILE"
}
new_secret() { # 48 hex characters: URL-safe, so it can sit inside a connection string as is
  if command -v openssl >/dev/null 2>&1; then openssl rand -hex 24; else head -c 24 /dev/urandom | od -An -tx1 | tr -d ' \n'; fi
}
selected() { [ -z "$ONLY" ] || case "$ONLY" in *",$1,"*) return 0 ;; *) return 1 ;; esac; }
container_running() { [ "$(docker inspect --format '{{.State.Running}}' "$1" 2>/dev/null || true)" = "true" ]; }
slug() { printf '%s' "$1" | tr '[:upper:]_' '[:lower:]-'; }

# --- the stores: key -> password variable, container, URL host, user -------------------------------------
declare -A PW_VAR CONTAINER HOST USER_NAME KIND OLD NEW
for key in $PG_DB_KEYS; do
  PW_VAR[$key]="PG_${key}_PASSWORD"; CONTAINER[$key]="claw-pg-$(slug "$key")"; HOST[$key]="pg-$(slug "$key")"
  USER_NAME[$key]="$(env_value "PG_${key}_USER")"; USER_NAME[$key]="${USER_NAME[$key]:-claw}"; KIND[$key]=postgres
done
PW_VAR[MONGO]=MONGO_PASSWORD; CONTAINER[MONGO]=claw-mongodb; HOST[MONGO]=mongodb; KIND[MONGO]=mongo
USER_NAME[MONGO]="$(env_value MONGO_USER)"; USER_NAME[MONGO]="${USER_NAME[MONGO]:-claw}"
PW_VAR[RABBITMQ]=RABBITMQ_PASSWORD; CONTAINER[RABBITMQ]=claw-rabbitmq; HOST[RABBITMQ]=rabbitmq; KIND[RABBITMQ]=rabbitmq
USER_NAME[RABBITMQ]="$(env_value RABBITMQ_USER)"; USER_NAME[RABBITMQ]="${USER_NAME[RABBITMQ]:-claw}"
PW_VAR[REDIS]=REDIS_PASSWORD; CONTAINER[REDIS]=claw-redis; HOST[REDIS]=redis; USER_NAME[REDIS]=""; KIND[REDIS]=redis
PW_VAR[FIRECRAWL]=FIRECRAWL_POSTGRES_PASSWORD; CONTAINER[FIRECRAWL]=claw-firecrawl-postgres; HOST[FIRECRAWL]=firecrawl-postgres
USER_NAME[FIRECRAWL]=firecrawl; KIND[FIRECRAWL]=postgres
# The Firecrawl sidecar's own Redis and RabbitMQ (claw-scrapers network). Its RabbitMQ user is `firecrawl`, there is no guest.
PW_VAR[FIRECRAWL_REDIS]=FIRECRAWL_REDIS_PASSWORD; CONTAINER[FIRECRAWL_REDIS]=claw-firecrawl-redis; HOST[FIRECRAWL_REDIS]=firecrawl-redis
USER_NAME[FIRECRAWL_REDIS]=""; KIND[FIRECRAWL_REDIS]=redis
PW_VAR[FIRECRAWL_RABBITMQ]=FIRECRAWL_RABBITMQ_PASSWORD; CONTAINER[FIRECRAWL_RABBITMQ]=claw-firecrawl-rabbitmq; HOST[FIRECRAWL_RABBITMQ]=firecrawl-rabbitmq
USER_NAME[FIRECRAWL_RABBITMQ]=firecrawl; KIND[FIRECRAWL_RABBITMQ]=rabbitmq

TARGETS=()
for key in $PG_DB_KEYS $OTHER_KEYS; do
  selected "$key" || continue
  OLD[$key]="$(env_value "${PW_VAR[$key]}")"
  [ "$key" = FIRECRAWL ] && [ -z "${OLD[$key]}" ] && OLD[$key]="firecrawl-internal" # the compose default
  if [ "$MODE" = live ] && ! container_running "${CONTAINER[$key]}"; then
    log "  skip $key: ${CONTAINER[$key]} is not running (its .env value is kept)"
    continue
  fi
  TARGETS+=("$key")
done
[ ${#TARGETS[@]} -gt 0 ] || die "nothing to rotate"

log "Plan ($MODE): ${#TARGETS[@]} store(s): ${TARGETS[*]}"
log "  .env: $ENV_FILE  project: $PROJECT"
[ "$DRY_RUN" -eq 0 ] || { log "Dry run: nothing changed."; exit 0; }

# --- per-store operations (values travel through env vars and stdin, never argv) ------------------------
check_password() { # KEY PASSWORD -> 0 when the store accepts it
  local key="$1" c="${CONTAINER[$1]}" u="${USER_NAME[$1]}"
  case "${KIND[$key]}" in
    postgres) CHECK_PW="$2" docker exec -e CHECK_PW -e PGU="$u" "$c" sh -c 'PGPASSWORD="$CHECK_PW" psql -h 127.0.0.1 -U "$PGU" -d postgres -tAc "select 1"' >/dev/null 2>&1 ;;
    mongo) CHECK_PW="$2" docker exec -e CHECK_PW -e MU="$u" "$c" sh -c 'mongosh --quiet --norc "mongodb://127.0.0.1:27017/admin" --eval "db.auth(process.env.MU, process.env.CHECK_PW) ? quit(0) : quit(1)"' >/dev/null 2>&1 ;;
    rabbitmq) docker exec -i -e RU="$u" "$c" sh -c 'IFS= read -r p; rabbitmqctl authenticate_user "$RU" "$p"' <<<"$2" >/dev/null 2>&1 ;;
    redis)
      if [ -z "$2" ]; then docker exec "$c" redis-cli ping 2>/dev/null | grep -q PONG
      else REDISCLI_AUTH="$2" docker exec -e REDISCLI_AUTH "$c" redis-cli ping 2>/dev/null | grep -q PONG; fi ;;
  esac
}
set_password() { # KEY CURRENT NEW
  local key="$1" c="${CONTAINER[$1]}" u="${USER_NAME[$1]}"
  case "${KIND[$key]}" in
    postgres) NEW_PW="$3" docker exec -i -e NEW_PW -e PGU="$u" "$c" sh -c \
      'printf "ALTER USER \"%s\" WITH PASSWORD '"'"'%s'"'"';\n" "$PGU" "$NEW_PW" | psql -v ON_ERROR_STOP=1 -q -U "$PGU" -d postgres' >/dev/null ;;
    mongo) OLD_PW="$2" NEW_PW="$3" docker exec -e OLD_PW -e NEW_PW -e MU="$u" "$c" sh -c \
      'mongosh --quiet --norc "mongodb://127.0.0.1:27017/admin" --eval "if (!db.auth(process.env.MU, process.env.OLD_PW)) quit(1); db.changeUserPassword(process.env.MU, process.env.NEW_PW)"' >/dev/null ;;
    rabbitmq) printf '%s\n' "$3" | docker exec -i -e RU="$u" "$c" sh -c 'IFS= read -r p; rabbitmqctl change_password "$RU" "$p"' >/dev/null ;;
    redis)
      if [ -n "$2" ]; then printf '%s' "$3" | REDISCLI_AUTH="$2" docker exec -i -e REDISCLI_AUTH "$c" redis-cli -x CONFIG SET requirepass >/dev/null
      else printf '%s' "$3" | docker exec -i "$c" redis-cli -x CONFIG SET requirepass >/dev/null; fi ;;
  esac
}

# --- .env rewrite: password keys, and every URL whose host is a rotated store --------------------------
write_env() {
  local tmp map_vars="" map_hosts=""
  tmp="$(mktemp)"
  for key in "${TARGETS[@]}"; do
    map_vars+="${PW_VAR[$key]}=${NEW[$key]}"$'\n'
    map_hosts+="${HOST[$key]}=${NEW[$key]}"$'\n'
  done
  MAP_VARS="$map_vars" MAP_HOSTS="$map_hosts" awk '
    BEGIN {
      n = split(ENVIRON["MAP_VARS"], a, "\n"); for (i = 1; i <= n; i++) if (a[i] != "") { p = index(a[i], "="); vars[substr(a[i], 1, p - 1)] = substr(a[i], p + 1) }
      n = split(ENVIRON["MAP_HOSTS"], b, "\n"); for (i = 1; i <= n; i++) if (b[i] != "") { p = index(b[i], "="); hosts[substr(b[i], 1, p - 1)] = substr(b[i], p + 1) }
    }
    {
      eq = index($0, "=")
      if (eq > 1 && substr($0, 1, 1) != "#") {
        name = substr($0, 1, eq - 1); value = substr($0, eq + 1)
        if (name in vars) { print name "=" vars[name]; seen[name] = 1; next }
        if (match(value, /^[a-z+]+:\/\//)) {
          scheme = substr(value, 1, RLENGTH); rest = substr(value, RLENGTH + 1)
          at = index(rest, "@"); slash = index(rest, "/"); if (slash == 0) slash = length(rest) + 1
          if (at > 0 && at < slash) { cred = substr(rest, 1, at - 1); hostpart = substr(rest, at + 1) } else { cred = ""; hostpart = rest }
          host = hostpart; sub(/[:\/?].*$/, "", host)
          if (host in hosts) {
            user = cred; c = index(cred, ":"); if (c > 0) user = substr(cred, 1, c - 1)
            print name "=" scheme user ":" hosts[host] "@" hostpart; next
          }
        }
      }
      print
    }
    END { for (v in vars) if (!(v in seen)) print v "=" vars[v] }
  ' "$ENV_FILE" >"$tmp"
  cat "$tmp" >"$ENV_FILE" # same inode, owner and mode
  rm -f "$tmp"
}

for key in "${TARGETS[@]}"; do NEW[$key]="$(new_secret)"; done

if [ "$MODE" = fresh ]; then
  write_env
  log "Wrote ${#TARGETS[@]} unique password(s) to $ENV_FILE (no container touched)."
  exit 0
fi

command -v docker >/dev/null 2>&1 || die "docker is not installed"
compose() { local args=(); for f in "${COMPOSE_FILES[@]}"; do args+=(-f "$f"); done; docker compose --env-file "$ENV_FILE" -p "$PROJECT" "${args[@]}" "$@"; }

log "1/5 Checking that every store accepts the password .env has..."
for key in "${TARGETS[@]}"; do
  check_password "$key" "${OLD[$key]}" || die "$key (${CONTAINER[$key]}) refuses the password in .env; nothing was changed. Fix that drift first."
done

log "2/5 Changing the password inside each store..."
CHANGED=()
revert() {
  log "Reverting ${#CHANGED[@]} store(s) to their old password..."
  for key in "${CHANGED[@]}"; do set_password "$key" "${NEW[$key]}" "${OLD[$key]}" || log "  could not revert $key: fix by hand"; done
}
for key in "${TARGETS[@]}"; do
  if ! set_password "$key" "${OLD[$key]}" "${NEW[$key]}" || ! check_password "$key" "${NEW[$key]}"; then
    revert
    die "changing $key failed; every store is back on its old password and .env is untouched"
  fi
  CHANGED+=("$key")
  log "  $key ok"
done

BACKUP="$ENV_FILE.bak-$(date +%Y%m%d-%H%M%S)-rotation"
cp -p "$ENV_FILE" "$BACKUP"
log "3/5 Writing .env (backup: $BACKUP)..."
write_env

log "4/5 Recreating the data stores and every running app container..."
STORE_SERVICES=()
for key in "${TARGETS[@]}"; do STORE_SERVICES+=("${HOST[$key]}"); done
compose up -d --no-build --no-deps --force-recreate "${STORE_SERVICES[@]}" ||
  log "  WARNING: recreating the data stores reported an error; the health check below decides"
# Only services of the given compose files: another file (local AI, GPU) can run under the same project name,
# and compose refuses a service it does not define. Taken BEFORE the recreate, so it is what was running.
mapfile -t APP_SERVICES < <(comm -12 \
  <(docker ps --filter "label=com.docker.compose.project=$PROJECT" --format '{{.Label "com.docker.compose.service"}}' | sort -u) \
  <(compose --profile '*' config --services 2>/dev/null | sort -u) |
  grep -vxF -f <(printf '%s\n' "${STORE_SERVICES[@]}") || true)
# A dependency that turns unhealthy for an unrelated reason makes compose stop and leave its dependents in
# "Created"; carry on, start them, and let the health check below report what is really wrong.
if [ ${#APP_SERVICES[@]} -gt 0 ]; then
  compose up -d --no-build --no-deps --force-recreate "${APP_SERVICES[@]}" ||
    log "  WARNING: recreating the app containers reported an error; starting any left in Created"
  docker ps -a --filter "label=com.docker.compose.project=$PROJECT" --filter status=created --format '{{.Names}}' |
    while IFS= read -r name; do docker start "$name" >/dev/null && log "  started $name"; done
fi

log "5/5 Waiting for every container to be healthy (up to ${HEALTH_TIMEOUT_SECONDS}s)..."
deadline=$(( $(date +%s) + HEALTH_TIMEOUT_SECONDS ))
while :; do
  pending="$(docker ps -a --filter "label=com.docker.compose.project=$PROJECT" --format '{{.Names}} {{.Status}}' |
    grep -E '\((health: starting|unhealthy)\)|Restarting|^[^ ]+ Created' || true)"
  [ -z "$pending" ] && break
  [ "$(date +%s)" -lt "$deadline" ] || { log "Still not healthy:"; log "$pending"; die "rotation applied but some containers are not healthy; the old .env is $BACKUP"; }
  sleep 5
done
for key in "${TARGETS[@]}"; do check_password "$key" "${NEW[$key]}" || die "$key does not accept its new password after the restart"; done
log "Done: ${#TARGETS[@]} store(s) on unique new passwords, every container healthy. Old .env: $BACKUP (delete it once you are satisfied)."
