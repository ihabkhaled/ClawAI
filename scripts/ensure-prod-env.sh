#!/usr/bin/env bash
# =============================================================================
# ClawAI — make sure the production .env has what the services need
# =============================================================================
# Reads scripts/prod-required-env.manifest and, for every rule:
#
#   * value present and valid  -> left exactly as it is
#   * value missing            -> generated and APPENDED to the .env (ensure mode)
#                                 or reported (--check mode)
#   * value present but weak   -> reported, NEVER modified (an existing secret is
#                                 never overwritten: a rotated encryption key
#                                 orphans every row encrypted under the old one)
#
# Usage:
#   bash scripts/ensure-prod-env.sh --env /srv/clawai/.env            # add what is missing
#   bash scripts/ensure-prod-env.sh --env /srv/clawai/.env --check    # read-only
#   bash scripts/ensure-prod-env.sh --env FILE --services "a b"       # only these services
#   bash scripts/ensure-prod-env.sh --env FILE --manifest FILE        # another manifest
#
# Exit status: 0 everything valid (or added), 1 something missing in --check
# mode or something invalid, 2 usage or file error.
#
# Secret values are NEVER printed: output names variables only.
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE=""
MANIFEST="$SCRIPT_DIR/prod-required-env.manifest"
SERVICES=""
CHECK_ONLY=0

usage() {
  sed -n '2,24p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
}

fail_usage() {
  printf 'ensure-prod-env: %s\n' "$*" >&2
  exit 2
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --env)
      [ "$#" -ge 2 ] || fail_usage "--env needs a file"
      ENV_FILE="$2"
      shift 2
      ;;
    --manifest)
      [ "$#" -ge 2 ] || fail_usage "--manifest needs a file"
      MANIFEST="$2"
      shift 2
      ;;
    --services)
      [ "$#" -ge 2 ] || fail_usage "--services needs a space-separated list"
      SERVICES="$2"
      shift 2
      ;;
    --check)
      CHECK_ONLY=1
      shift
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *) fail_usage "unknown argument: $1" ;;
  esac
done

[ -n "$ENV_FILE" ] || fail_usage "--env <file> is required"
[ -f "$ENV_FILE" ] || fail_usage "$ENV_FILE does not exist"
[ -r "$ENV_FILE" ] || fail_usage "$ENV_FILE is not readable"
[ -f "$MANIFEST" ] || fail_usage "manifest $MANIFEST does not exist"
if [ "$CHECK_ONLY" = "0" ] && [ ! -w "$ENV_FILE" ]; then
  fail_usage "$ENV_FILE is not writable (use --check for a read-only run)"
fi

# Last assignment wins, like docker compose; CR and one layer of quotes dropped.
env_value() {
  local name="$1" raw
  raw="$(grep -E "^${name}=" "$ENV_FILE" 2>/dev/null | tail -n 1 | cut -d= -f2- | tr -d '\r' || true)"
  case "$raw" in
    \"*\") raw="${raw#\"}"; raw="${raw%\"}" ;;
    \'*\') raw="${raw#\'}"; raw="${raw%\'}" ;;
  esac
  printf '%s' "$raw"
}

random_hex() {
  local bytes="$1"
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex "$bytes"
  else
    od -An -N"$bytes" -tx1 /dev/urandom | tr -d ' \n'
  fi
}

service_selected() {
  [ -z "$SERVICES" ] && return 0
  case " $SERVICES " in
    *" $1 "*) return 0 ;;
  esac
  return 1
}

# Replaces every {NAME} in a template by that variable's value in the .env.
# Prints nothing and fails when a referenced variable is empty.
expand_template() {
  local template="$1" name value
  while [[ "$template" =~ \{([A-Z0-9_]+)\} ]]; do
    name="${BASH_REMATCH[1]}"
    value="$(env_value "$name")"
    [ -n "$value" ] || return 1
    template="${template//\{$name\}/"$value"}"
  done
  printf '%s' "$template"
}

is_valid() {
  local kind="$1" value="$2" arg="$3" expected
  case "$kind" in
    hex64)
      [[ "$value" =~ ^[0-9a-fA-F]{64}$ ]] && ! [[ "$value" =~ ^0+$ ]]
      ;;
    password)
      [ "${#value}" -ge 24 ] && [ "$value" != "claw_secret" ]
      ;;
    derived)
      expected="$(expand_template "$arg")" || return 1
      [ "$value" = "$expected" ]
      ;;
    literal)
      [ "$value" = "$arg" ]
      ;;
    *) return 1 ;;
  esac
}

generate_value() {
  local kind="$1" arg="$2"
  case "$kind" in
    hex64) random_hex 32 ;;
    password) random_hex 24 ;;
    derived) expand_template "$arg" ;;
    literal) printf '%s' "$arg" ;;
  esac
}

HEADER_WRITTEN=0
append_value() {
  local name="$1" value="$2"
  if [ "$HEADER_WRITTEN" = "0" ]; then
    # A file without a trailing newline would glue the first name onto its last line.
    if [ -s "$ENV_FILE" ] && [ -n "$(tail -c 1 "$ENV_FILE")" ]; then
      printf '\n' >>"$ENV_FILE"
    fi
    printf '\n# Added by scripts/ensure-prod-env.sh on %s\n' "$(date -u +%Y-%m-%d)" >>"$ENV_FILE"
    HEADER_WRITTEN=1
  fi
  printf '%s=%s\n' "$name" "$value" >>"$ENV_FILE"
}

PROBLEMS=0
ADDED=0

while IFS='|' read -r service name kind arg || [ -n "${service:-}" ]; do
  case "${service:-}" in '' | \#*) continue ;; esac
  # Not .env values: the deploy checks these against Docker and the certificate.
  [ "$kind" = "database" ] && continue
  [ "$kind" = "cert-san" ] && continue
  service_selected "$service" || continue

  current="$(env_value "$name")"
  if [ -n "$current" ]; then
    if is_valid "$kind" "$current" "$arg"; then
      printf 'ok       %s (%s)\n' "$name" "$service"
    else
      printf 'INVALID  %s (%s) - present but not acceptable (%s); it is NOT changed, fix it by hand\n' \
        "$name" "$service" "$kind"
      PROBLEMS=$((PROBLEMS + 1))
    fi
    continue
  fi

  if [ "$CHECK_ONLY" = "1" ]; then
    printf 'MISSING  %s (%s) - run: bash scripts/ensure-prod-env.sh --env %s\n' \
      "$name" "$service" "$ENV_FILE"
    PROBLEMS=$((PROBLEMS + 1))
    continue
  fi

  if value="$(generate_value "$kind" "$arg")" && [ -n "$value" ]; then
    append_value "$name" "$value"
    printf 'added    %s (%s)\n' "$name" "$service"
    ADDED=$((ADDED + 1))
  else
    printf 'MISSING  %s (%s) - could not be generated (a variable it derives from is missing)\n' \
      "$name" "$service"
    PROBLEMS=$((PROBLEMS + 1))
  fi
done <"$MANIFEST"

if [ "$PROBLEMS" -gt 0 ]; then
  printf 'ensure-prod-env: %d problem(s) in %s\n' "$PROBLEMS" "$ENV_FILE" >&2
  exit 1
fi
if [ "$ADDED" -gt 0 ]; then
  printf 'ensure-prod-env: added %d value(s); existing values were left untouched\n' "$ADDED"
fi
exit 0
