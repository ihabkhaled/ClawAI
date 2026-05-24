#!/usr/bin/env bash
# =============================================================================
# Claw — Local TLS / SSL Cert Generator (Mac + Linux)
# -----------------------------------------------------------------------------
# Installs mkcert, generates a local root CA, installs it into the OS trust
# store, and issues a single wildcard leaf cert that covers:
#   - localhost / 127.0.0.1 / ::1
#   - Every internal Docker hostname (nginx + 17 service hostnames)
#
# Idempotent: rerunning regenerates the leaf cert + rootCA copy under certs/
# without re-installing mkcert or re-trusting the CA if both already done.
#
# Called automatically by scripts/install.sh — never prompts.
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

# ─── Detect OS / install mkcert if needed ──────────────────────────────────
OS_KIND="$(uname -s)"

install_mkcert_mac() {
  if command -v brew >/dev/null 2>&1; then
    info "Installing mkcert + nss via Homebrew"
    brew install mkcert nss >/dev/null
  else
    fail "Homebrew not found. Install brew first: https://brew.sh"
    exit 1
  fi
}

install_mkcert_linux() {
  info "Installing mkcert + libnss3-tools"
  if command -v apt-get >/dev/null 2>&1; then
    sudo apt-get update -qq
    sudo apt-get install -y -qq libnss3-tools curl ca-certificates >/dev/null
  elif command -v dnf >/dev/null 2>&1; then
    sudo dnf install -y nss-tools curl ca-certificates >/dev/null
  elif command -v pacman >/dev/null 2>&1; then
    sudo pacman -Sy --noconfirm nss curl ca-certificates >/dev/null
  fi

  ARCH="$(uname -m)"
  case "$ARCH" in
    x86_64) MKCERT_ARCH="amd64" ;;
    aarch64|arm64) MKCERT_ARCH="arm64" ;;
    *) fail "Unsupported Linux arch: $ARCH"; exit 1 ;;
  esac
  info "Downloading mkcert binary (linux/$MKCERT_ARCH)"
  curl -fsSL -o /tmp/mkcert "https://dl.filippo.io/mkcert/latest?for=linux/$MKCERT_ARCH"
  chmod +x /tmp/mkcert
  sudo mv /tmp/mkcert /usr/local/bin/mkcert
}

if ! command -v mkcert >/dev/null 2>&1; then
  case "$OS_KIND" in
    Darwin) install_mkcert_mac ;;
    Linux)  install_mkcert_linux ;;
    *) fail "Unsupported OS: $OS_KIND (use install-tls.ps1 on Windows)"; exit 1 ;;
  esac
fi

MKCERT_VER="$(mkcert -version 2>/dev/null || echo 'unknown')"
ok "mkcert installed ($MKCERT_VER)"

# ─── Install local CA into the OS trust store ──────────────────────────────
# `mkcert -install` is idempotent — it no-ops when the CA is already trusted,
# so we can call it every run without an extra UAC prompt or sudo cost.
info "Ensuring local root CA is trusted (mkcert -install)"
mkcert -install >/dev/null 2>&1 || {
  fail "mkcert -install failed. On Linux you may need to install libnss3-tools and rerun."
  exit 1
}
ok "Local root CA trusted in OS / browser trust stores"

# ─── Issue the wildcard leaf cert ──────────────────────────────────────────
info "Issuing leaf cert for ${#HOSTS[@]} hostnames"
(
  cd "$CERTS_DIR"
  mkcert -cert-file claw.crt -key-file claw.key "${HOSTS[@]}" >/dev/null 2>&1
)
ok "Leaf cert written: certs/claw.crt + certs/claw.key"

# ─── Copy the rootCA.pem alongside so containers can NODE_EXTRA_CA_CERTS it
ROOT_CA_DIR="$(mkcert -CAROOT 2>/dev/null)"
if [ -n "$ROOT_CA_DIR" ] && [ -f "$ROOT_CA_DIR/rootCA.pem" ]; then
  cp -f "$ROOT_CA_DIR/rootCA.pem" "$CERTS_DIR/rootCA.pem"
  ok "Root CA copied: certs/rootCA.pem"
else
  warn "Could not locate mkcert root CA — node services may fail to verify HTTPS"
fi

echo ""
printf "${BOLD}${GREEN}TLS install complete.${NC}\n"
echo "  certs/claw.crt     leaf cert (mounted into every container)"
echo "  certs/claw.key     leaf private key (mounted read-only)"
echo "  certs/rootCA.pem   local CA — used as NODE_EXTRA_CA_CERTS"
echo ""
