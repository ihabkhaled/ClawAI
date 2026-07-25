#!/usr/bin/env bash
# =============================================================================
# Claw — Local TLS / SSL Cert Generator (Mac + Linux)
# -----------------------------------------------------------------------------
# Two-tier strategy — picks whichever works without user interaction:
#
#   Tier 1 — mkcert (browser-trusted): installs mkcert via brew/apt/binary,
#            installs a local root CA into the OS trust store, issues a leaf
#            cert covering localhost + every internal docker hostname + the
#            user-configured CLAW_HOSTNAME (default claw.local, can be a
#            domain or bare IP). Browser shows green-lock automatically.
#
#   Tier 2 — openssl self-signed (fallback): if mkcert install fails for any
#            reason, generates a self-signed leaf cert via a one-shot
#            `docker run alpine openssl ...`. Browser shows a one-time
#            "Not Secure" warning but inter-service TLS works fully via
#            NODE_EXTRA_CA_CERTS.
#
# Hosts file: appends `127.0.0.1 ${CLAW_HOSTNAME}` to /etc/hosts (idempotent;
# skipped when CLAW_HOSTNAME is an IP address). Requires sudo for the hosts
# file write — script offers it, never demands.
#
# Hostname source: CLAW_HOSTNAME env var → .env file → claw.local default.
# Re-run any time you change CLAW_HOSTNAME in .env to reissue the cert.
#
# Idempotent. Forced on by scripts/install.sh — never prompts the user.
# =============================================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'
info()  { printf "${BLUE}[TLS]${NC}   %s\n" "$1"; }
ok()    { printf "${GREEN}[TLS]${NC}   %s\n" "$1"; }
warn()  { printf "${YELLOW}[TLS]${NC}   %s\n" "$1"; }
fail()  { printf "${RED}[TLS]${NC}   %s\n" "$1"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CERTS_DIR="$PROJECT_ROOT/certs"
ENV_FILE="$PROJECT_ROOT/.env"
mkdir -p "$CERTS_DIR"

# ─── Resolve the public hostname ────────────────────────────────────────────
# Precedence: CLAW_HOSTNAME env var → .env file → claw.local default.
# install.sh exports CLAW_HOSTNAME before invoking us; standalone re-runs
# read it from .env so the cert always tracks whatever the app is serving.
resolve_hostname() {
  if [ -n "${CLAW_HOSTNAME:-}" ]; then
    echo "$CLAW_HOSTNAME"
    return
  fi
  if [ -f "$ENV_FILE" ]; then
    local from_env
    from_env="$(awk -F= '/^CLAW_HOSTNAME=/ {sub(/^[^=]*=/, "", $0); print; exit}' "$ENV_FILE")"
    if [ -n "$from_env" ]; then echo "$from_env"; return; fi
  fi
  echo "claw.local"
}

CLAW_HOSTNAME="$(resolve_hostname)"

# IPv4-shaped check (e.g. 192.168.1.50 vs. claw.local / claw.example.com)
is_ipv4() {
  [[ "$1" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]]
}

# Every internal docker hostname that any service (or nginx) might present,
# plus the user-configured public hostname (and its wildcard form for
# domains). Re-run this script whenever a new service is added so its
# hostname becomes a SAN.
HOSTS=(
  localhost
  127.0.0.1
  ::1
  nginx
  auth-service
  chat-service
  connector-service
  routing-service
  memory-service
  file-service
  audit-service
  ollama-service
  health-service
  client-logs-service
  server-logs-service
  image-service
  file-generation-service
  workspace-service
  agent-service
  research-service
  llamacpp-service
  payment-service
)

# Append the user-configured hostname. mkcert handles both DNS names and
# IP-shaped SANs natively — no special-casing required for the cert call.
HOSTS+=("$CLAW_HOSTNAME")
if ! is_ipv4 "$CLAW_HOSTNAME"; then
  HOSTS+=("*.${CLAW_HOSTNAME}")
fi

info "Cert will cover: $CLAW_HOSTNAME (and ${#HOSTS[@]} other SANs)"

# ─── Tier 1: try mkcert ────────────────────────────────────────────────────
OS_KIND="$(uname -s)"

install_mkcert_mac() {
  if command -v brew >/dev/null 2>&1; then
    info "Installing mkcert + nss via Homebrew"
    brew install mkcert nss >/dev/null 2>&1 || return 1
    return 0
  fi
  warn "Homebrew not found — skipping mkcert install (will fall back to openssl)"
  return 1
}

install_mkcert_linux() {
  info "Installing mkcert + libnss3-tools"
  if command -v apt-get >/dev/null 2>&1; then
    sudo -n apt-get update -qq >/dev/null 2>&1 || sudo apt-get update -qq
    sudo apt-get install -y -qq libnss3-tools curl ca-certificates >/dev/null 2>&1 || true
  elif command -v dnf >/dev/null 2>&1; then
    sudo dnf install -y nss-tools curl ca-certificates >/dev/null 2>&1 || true
  elif command -v pacman >/dev/null 2>&1; then
    sudo pacman -Sy --noconfirm nss curl ca-certificates >/dev/null 2>&1 || true
  fi
  ARCH="$(uname -m)"
  case "$ARCH" in
    x86_64) MKCERT_ARCH="amd64" ;;
    aarch64|arm64) MKCERT_ARCH="arm64" ;;
    *) return 1 ;;
  esac
  info "Downloading mkcert binary (linux/$MKCERT_ARCH)"
  curl -fsSL -o /tmp/mkcert "https://dl.filippo.io/mkcert/latest?for=linux/$MKCERT_ARCH" 2>/dev/null || return 1
  chmod +x /tmp/mkcert
  sudo mv /tmp/mkcert /usr/local/bin/mkcert 2>/dev/null || return 1
  return 0
}

try_mkcert() {
  if command -v mkcert >/dev/null 2>&1; then return 0; fi
  case "$OS_KIND" in
    Darwin) install_mkcert_mac ;;
    Linux)  install_mkcert_linux ;;
    *) return 1 ;;
  esac
}

# ─── Tier 2: openssl via docker (no install, no admin) ────────────────────
generate_self_signed_via_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    fail "docker not available — cannot generate certs"
    return 1
  fi
  info "Generating self-signed cert via docker openssl (no admin needed)"
  cat > "$CERTS_DIR/openssl.cnf" <<EOF
[req]
default_bits = 4096
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = req_ext
x509_extensions = v3_ca

[dn]
CN = ClawAI Local Dev CA
O  = ClawAI Local
C  = US

[req_ext]
subjectAltName = @alt_names

[v3_ca]
basicConstraints = critical, CA:TRUE
keyUsage = critical, digitalSignature, keyCertSign, cRLSign
subjectAltName = @alt_names

[alt_names]
$(i=0; for h in "${HOSTS[@]}"; do
  case "$h" in
    127.0.0.1) echo "IP.1 = 127.0.0.1" ;;
    ::1)       echo "IP.2 = ::1" ;;
    *)         i=$((i+1)); echo "DNS.$i = $h" ;;
  esac
done)
EOF

  # Capture stderr to a temp file so we can replay it if the docker run fails.
  # The original `>/dev/null 2>&1` mask hid every failure mode (missing docker
  # rights, alpine pull failed, openssl config typo, …) and made
  # install.sh proceed past a silently-broken TLS step.
  local docker_stderr
  docker_stderr="$(mktemp)"
  local rc=0
  docker run --rm -v "$CERTS_DIR:/certs" -w /certs alpine:3.20 sh -c '
    set -e
    apk add --no-cache openssl >/dev/null 2>&1
    openssl req -x509 -nodes -newkey rsa:4096 -days 825 \
      -keyout claw.key -out claw.crt \
      -config openssl.cnf -extensions v3_ca
    cp claw.crt rootCA.pem
    chmod 644 claw.crt rootCA.pem
    # 0644 (not 0600) on the key because every prod backend container
    # runs as a non-root user (nestjs uid 1001) and bind-mounts certs/
    # read-only. A 0600 root-owned key fails with EACCES inside the
    # container — the service then falls back to HTTP, but the
    # healthcheck still hits HTTPS and the container goes unhealthy.
    chmod 644 claw.key
  ' 2>"$docker_stderr" >/dev/null || rc=$?
  rm -f "$CERTS_DIR/openssl.cnf"
  if [ "$rc" -ne 0 ]; then
    fail "openssl cert generation failed (exit $rc). Output below:"
    cat "$docker_stderr" >&2 || true
    rm -f "$docker_stderr"
    return 1
  fi
  rm -f "$docker_stderr"
  return 0
}

# ─── Hosts file: CLAW_HOSTNAME → 127.0.0.1 (idempotent) ───────────────────
# Skipped when CLAW_HOSTNAME is an IPv4 address (no resolution needed) or
# when the entry already exists.
ensure_hosts_entry() {
  local hosts_file="/etc/hosts"
  if is_ipv4 "$CLAW_HOSTNAME"; then
    ok "Hostname is an IP ($CLAW_HOSTNAME) — no /etc/hosts entry needed"
    return 0
  fi
  local escaped
  escaped="$(printf '%s\n' "$CLAW_HOSTNAME" | sed 's/[][\.*^$/]/\\&/g')"
  if grep -qE "^[^#]*\b${escaped}\b" "$hosts_file" 2>/dev/null; then
    ok "$CLAW_HOSTNAME already in /etc/hosts"
    return 0
  fi
  info "Adding $CLAW_HOSTNAME → 127.0.0.1 to /etc/hosts (sudo required)"
  if echo "127.0.0.1 $CLAW_HOSTNAME" | sudo tee -a "$hosts_file" >/dev/null 2>&1; then
    ok "$CLAW_HOSTNAME added to /etc/hosts"
  else
    warn "Could not write /etc/hosts — add manually:  127.0.0.1 $CLAW_HOSTNAME"
  fi
}

# =============================================================================
# Run Tier 1 → fall back to Tier 2
# =============================================================================
USED_MKCERT=0

if try_mkcert && command -v mkcert >/dev/null 2>&1; then
  ok "mkcert installed ($(mkcert -version 2>/dev/null || echo 'unknown'))"
  mkcert_install_log="$(mktemp)"
  if mkcert -install >"$mkcert_install_log" 2>&1; then
    ok "Local root CA trusted in OS / browser trust stores"
    mkcert_leaf_log="$(mktemp)"
    leaf_rc=0
    (
      cd "$CERTS_DIR"
      mkcert -cert-file claw.crt -key-file claw.key "${HOSTS[@]}"
    ) >"$mkcert_leaf_log" 2>&1 || leaf_rc=$?
    if [ "$leaf_rc" -eq 0 ] && [ -f "$CERTS_DIR/claw.crt" ] && [ -f "$CERTS_DIR/claw.key" ]; then
      ROOT_CA_DIR="$(mkcert -CAROOT 2>/dev/null)"
      if [ -n "$ROOT_CA_DIR" ] && [ -f "$ROOT_CA_DIR/rootCA.pem" ]; then
        cp -f "$ROOT_CA_DIR/rootCA.pem" "$CERTS_DIR/rootCA.pem"
      fi
      # mkcert writes the key 0600 by default. Loosen to 0644 so the
      # non-root user inside every prod container (nestjs uid 1001) can
      # read it; otherwise services log EACCES and fall back to HTTP
      # while the healthcheck keeps hitting HTTPS → unhealthy.
      chmod 644 "$CERTS_DIR/claw.crt" "$CERTS_DIR/claw.key" "$CERTS_DIR/rootCA.pem" 2>/dev/null || true
      USED_MKCERT=1
      ok "Browser-trusted cert issued via mkcert"
    else
      warn "mkcert leaf-cert issuance failed (rc=$leaf_rc) — falling back to openssl. Output:"
      cat "$mkcert_leaf_log" >&2 || true
    fi
    rm -f "$mkcert_leaf_log"
  else
    warn "mkcert -install failed — falling back to openssl self-signed. Output:"
    cat "$mkcert_install_log" >&2 || true
  fi
  rm -f "$mkcert_install_log"
fi

if [ "$USED_MKCERT" -eq 0 ]; then
  if generate_self_signed_via_docker; then
    ok "Self-signed cert issued via openssl (browser will show one-time warning)"
  else
    fail "Both cert generators failed. Manual recovery: install mkcert or openssl."
    exit 1
  fi
fi

# Final assertion: cert files MUST exist at the paths the containers mount.
# If either generator silently produced no output, this is where we surface it
# so install.sh doesn't move on with a half-broken TLS state.
for required in claw.crt claw.key rootCA.pem; do
  if [ ! -f "$CERTS_DIR/$required" ]; then
    fail "$CERTS_DIR/$required is missing after cert generation — install.sh should not proceed."
    fail "Run scripts/install-tls.sh manually and inspect the output."
    exit 1
  fi
done

ensure_hosts_entry

echo ""
printf "${BOLD}${GREEN}TLS install complete.${NC}\n"
if [ "$USED_MKCERT" -eq 1 ]; then
  echo "  Cert type:         mkcert (browser-trusted, no warning)"
else
  echo "  Cert type:         openssl self-signed (one-time 'Not Secure' click-through)"
fi
echo "  certs/claw.crt     leaf cert (mounted into every container)"
echo "  certs/claw.key     leaf private key (mounted read-only)"
echo "  certs/rootCA.pem   root CA — used as NODE_EXTRA_CA_CERTS"
if is_ipv4 "$CLAW_HOSTNAME"; then
  echo "  hosts entry:       (skipped — IP) try: https://$CLAW_HOSTNAME"
else
  echo "  hosts entry:       127.0.0.1 $CLAW_HOSTNAME (try: https://$CLAW_HOSTNAME)"
fi
echo ""
