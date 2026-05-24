#!/usr/bin/env bash
# =============================================================================
# Claw — Local TLS / SSL Cert Generator (Mac + Linux)
# -----------------------------------------------------------------------------
# Two-tier strategy — picks whichever works without user interaction:
#
#   Tier 1 — mkcert (browser-trusted): installs mkcert via brew/apt/binary,
#            installs a local root CA into the OS trust store, issues a leaf
#            cert covering localhost + every internal docker hostname + the
#            claw.local alias. Browser shows green-lock automatically.
#
#   Tier 2 — openssl self-signed (fallback): if mkcert install fails for any
#            reason, generates a self-signed leaf cert via a one-shot
#            `docker run alpine openssl ...`. Browser shows a one-time
#            "Not Secure" warning but inter-service TLS works fully via
#            NODE_EXTRA_CA_CERTS.
#
# Hosts file: appends `127.0.0.1 claw.local` to /etc/hosts (idempotent).
# Requires sudo for the hosts file write — script offers it, never demands.
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
mkdir -p "$CERTS_DIR"

# Every internal docker hostname that any service (or nginx) might present.
# Keep in sync with docker-compose service names — re-run install-tls.sh
# whenever a new service is added so its hostname becomes a SAN.
HOSTS=(
  localhost
  127.0.0.1
  ::1
  claw.local
  "*.claw.local"
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
)

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

  docker run --rm -v "$CERTS_DIR:/certs" -w /certs alpine:3.20 sh -c '
    apk add --no-cache openssl >/dev/null 2>&1
    openssl req -x509 -nodes -newkey rsa:4096 -days 825 \
      -keyout claw.key -out claw.crt \
      -config openssl.cnf -extensions v3_ca >/dev/null 2>&1
    cp claw.crt rootCA.pem
    chmod 644 claw.crt rootCA.pem
    chmod 600 claw.key
  ' >/dev/null 2>&1
  rm -f "$CERTS_DIR/openssl.cnf"
}

# ─── Hosts file: claw.local 127.0.0.1 (idempotent) ────────────────────────
ensure_hosts_entry() {
  local hosts_file="/etc/hosts"
  if grep -qE "^[^#]*\bclaw\.local\b" "$hosts_file" 2>/dev/null; then
    ok "claw.local already in /etc/hosts"
    return 0
  fi
  info "Adding claw.local → 127.0.0.1 to /etc/hosts (sudo required)"
  if echo "127.0.0.1 claw.local" | sudo tee -a "$hosts_file" >/dev/null 2>&1; then
    ok "claw.local added to /etc/hosts"
  else
    warn "Could not write /etc/hosts — add manually:  127.0.0.1 claw.local"
  fi
}

# =============================================================================
# Run Tier 1 → fall back to Tier 2
# =============================================================================
USED_MKCERT=0

if try_mkcert && command -v mkcert >/dev/null 2>&1; then
  ok "mkcert installed ($(mkcert -version 2>/dev/null || echo 'unknown'))"
  if mkcert -install >/dev/null 2>&1; then
    ok "Local root CA trusted in OS / browser trust stores"
    (
      cd "$CERTS_DIR"
      mkcert -cert-file claw.crt -key-file claw.key "${HOSTS[@]}" >/dev/null 2>&1
    )
    ROOT_CA_DIR="$(mkcert -CAROOT 2>/dev/null)"
    if [ -n "$ROOT_CA_DIR" ] && [ -f "$ROOT_CA_DIR/rootCA.pem" ]; then
      cp -f "$ROOT_CA_DIR/rootCA.pem" "$CERTS_DIR/rootCA.pem"
    fi
    USED_MKCERT=1
    ok "Browser-trusted cert issued via mkcert"
  else
    warn "mkcert -install failed — falling back to openssl self-signed"
  fi
fi

if [ "$USED_MKCERT" -eq 0 ]; then
  if generate_self_signed_via_docker; then
    ok "Self-signed cert issued via openssl (browser will show one-time warning)"
  else
    fail "Both cert generators failed. Manual recovery: install mkcert or openssl."
    exit 1
  fi
fi

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
echo "  hosts entry:       127.0.0.1 claw.local (try: https://claw.local)"
echo ""
