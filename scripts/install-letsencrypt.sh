#!/usr/bin/env bash
# =============================================================================
# Claw — Public TLS certificate (Let's Encrypt) for a real server + domain
# -----------------------------------------------------------------------------
# Replaces the mkcert leaf *at the edge* with a browser-trusted certificate.
#
# WHY THIS IS NOT `certbot --nginx`
# ---------------------------------
# The documented one-liner for this job is `certbot --nginx -d example.com`.
# It cannot work here, for two independent reasons:
#
#   1. nginx is not installed on the host. It runs as the `claw-nginx`
#      container from nginx:alpine, and its configuration is bind-mounted from
#      this repository. The --nginx plugin looks for a host nginx binary and
#      rewrites /etc/nginx/sites-*; there is nothing there to find or rewrite,
#      and anything it did write would be discarded on the next container
#      recreate.
#   2. The plugin edits config in place. This repo's nginx.conf is version
#      controlled and mounted read-only, so an in-place edit is either
#      impossible or immediately lost.
#
# So this script uses the `webroot` authenticator instead: certbot writes the
# HTTP-01 token into /var/www/certbot, the running nginx container serves it
# from the ACME location in infra/nginx/nginx.conf, and the certificate is then
# wired in by GENERATING a server block into infra/nginx/public-tls/ — a
# directory nginx.conf includes with a wildcard. Renewal uses the same path
# with no downtime, which `--standalone` could not offer once nginx owns :80.
#
# WHY MKCERT DOES NOT GO AWAY
# ---------------------------
# The mkcert leaf is the stack's INTERNAL identity. Every backend service
# presents certs/claw.crt on its own HTTPS listener and nginx verifies those
# upstreams against certs/rootCA.pem. Its SANs are container hostnames —
# auth-service, chat-service, ... — which no public CA will ever issue. Deleting
# it or overwriting it with the Let's Encrypt leaf breaks every service-to-
# service hop in the stack. Public TLS is layered ON TOP of it, never instead
# of it: browsers get Let's Encrypt, containers keep mkcert.
#
# Usage:
#   bash scripts/install-letsencrypt.sh                       # domain from .env
#   bash scripts/install-letsencrypt.sh --domain claw-ai.co --email you@x.com
#   bash scripts/install-letsencrypt.sh --domain a.com --domain www.a.com
#   bash scripts/install-letsencrypt.sh --staging              # LE staging CA
#   bash scripts/install-letsencrypt.sh --skip-dns-check       # split-horizon DNS
#   bash scripts/install-letsencrypt.sh --verify-renewal       # + renew --dry-run
#   bash scripts/install-letsencrypt.sh --force-renewal        # reissue early
#
# Idempotent: re-running with a valid certificate in place re-writes the nginx
# block and reloads, but does not ask the CA for a new certificate.
# =============================================================================
set -euo pipefail

# ANSI-C quoting, not plain single quotes: these are printed by both printf
# (which would expand \033 itself) and echo (which would not), and a literal
# "\033[1m" in the output is the tell that the wrong quoting was used.
RED=$'\033[0;31m'; GREEN=$'\033[0;32m'; YELLOW=$'\033[1;33m'
BLUE=$'\033[0;34m'; BOLD=$'\033[1m'; NC=$'\033[0m'
info()  { printf "${BLUE}[LE]${NC}    %s\n" "$1"; }
ok()    { printf "${GREEN}[LE]${NC}    %s\n" "$1"; }
warn()  { printf "${YELLOW}[LE]${NC}    %s\n" "$1"; }
fail()  { printf "${RED}[LE]${NC}    %s\n" "$1"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$PROJECT_ROOT/.env"
PUBLIC_TLS_DIR="$PROJECT_ROOT/infra/nginx/public-tls"
WEBROOT="/var/www/certbot"
NGINX_CONTAINER="${NGINX_CONTAINER:-claw-nginx}"

# ─── Arguments ──────────────────────────────────────────────────────────────
CLI_DOMAINS=()
CLI_EMAIL=""
STAGING="false"
SKIP_DNS_CHECK="false"
VERIFY_RENEWAL="false"
FORCE_RENEWAL="false"

while [ $# -gt 0 ]; do
  case "$1" in
    --domain)          CLI_DOMAINS+=("${2:-}"); shift 2 ;;
    --domain=*)        CLI_DOMAINS+=("${1#*=}"); shift ;;
    --email)           CLI_EMAIL="${2:-}"; shift 2 ;;
    --email=*)         CLI_EMAIL="${1#*=}"; shift ;;
    --staging)         STAGING="true"; shift ;;
    --skip-dns-check)  SKIP_DNS_CHECK="true"; shift ;;
    --verify-renewal)  VERIFY_RENEWAL="true"; shift ;;
    --force-renewal)   FORCE_RENEWAL="true"; shift ;;
    -h|--help)         sed -n '1,52p' "$0"; exit 0 ;;
    *)                 fail "Unknown argument: $1"; exit 2 ;;
  esac
done

# ─── Privilege ──────────────────────────────────────────────────────────────
# certbot writes to /etc/letsencrypt and binds nothing; the webroot lives under
# /var/www. Both need root. Never run the whole script as root when a plain
# sudo works — the generated nginx block must stay owned by the repo user.
SUDO=""
if [ "$(id -u)" -ne 0 ]; then
  if command -v sudo >/dev/null 2>&1; then
    SUDO="sudo"
  else
    fail "Root privileges are required (certbot writes /etc/letsencrypt) and sudo is not installed."
    exit 1
  fi
fi

# ─── Resolve the domain(s) ──────────────────────────────────────────────────
# Precedence: --domain flags → CLAW_HOSTNAME env → .env. install.sh exports
# CLAW_HOSTNAME before calling us, so an install and a standalone re-run always
# agree on what the certificate is for.
read_env_value() {
  [ -f "$ENV_FILE" ] || return 0
  awk -F= -v key="$1" '$0 ~ "^"key"=" { sub(/^[^=]*=/, "", $0); print; exit }' "$ENV_FILE"
}

resolve_hostname() {
  if [ -n "${CLAW_HOSTNAME:-}" ]; then printf '%s\n' "$CLAW_HOSTNAME"; return; fi
  local from_env; from_env="$(read_env_value CLAW_HOSTNAME)"
  if [ -n "$from_env" ]; then printf '%s\n' "$from_env"; return; fi
  printf '\n'
}

is_ipv4() { [[ "$1" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]]; }

# Resolve a name the way Let's Encrypt will: from PUBLIC DNS.
#
# The local resolver is the wrong oracle here. scripts/install-tls.sh writes
# `127.0.0.1 <CLAW_HOSTNAME>` into /etc/hosts so the stack can reach itself by
# its public name, which means getent/curl answer 127.0.0.1 for the domain on
# every correctly configured Claw server. Believing that answer would reject a
# perfectly good A record on exactly the hosts this script is written for.
#
# Prints space-separated IPv4 addresses; returns 1 when no DNS tool exists.
resolve_public_a() {
  local d="$1" ns out
  if command -v dig >/dev/null 2>&1; then
    for ns in 1.1.1.1 8.8.8.8; do
      out="$(dig +short +time=3 +tries=1 A "$d" "@$ns" 2>/dev/null \
             | grep -E '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$' | sort -u | tr '\n' ' ')"
      [ -n "$out" ] && { printf '%s' "$out"; return 0; }
    done
    # dig exists and answered with nothing: the name genuinely has no A record.
    printf ''; return 0
  fi
  if command -v host >/dev/null 2>&1; then
    out="$(host -W 3 -t A "$d" 1.1.1.1 2>/dev/null \
           | awk '/has address/ {print $NF}' | sort -u | tr '\n' ' ')"
    printf '%s' "$out"; return 0
  fi
  if command -v nslookup >/dev/null 2>&1; then
    out="$(nslookup -type=A -timeout=3 "$d" 1.1.1.1 2>/dev/null \
           | awk '/^Address: /{print $2}' \
           | grep -E '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$' | sort -u | tr '\n' ' ')"
    printf '%s' "$out"; return 0
  fi
  return 1
}

# A name a public CA is allowed to validate. Everything rejected here is a name
# that resolves only inside a LAN or a hosts file, and asking Let's Encrypt for
# it produces a hard failure plus a wasted rate-limit slot.
is_public_domain() {
  local d="$1"
  [ -n "$d" ]                          || return 1
  is_ipv4 "$d"                         && return 1
  [[ "$d" == *.* ]]                    || return 1   # single-label ("intranet")
  case "$d" in
    localhost|*.localhost) return 1 ;;
    *.local|*.internal|*.lan|*.home|*.corp|*.test|*.example|*.invalid) return 1 ;;
  esac
  return 0
}

PRIMARY_DOMAIN=""
DOMAINS=()
if [ "${#CLI_DOMAINS[@]}" -gt 0 ]; then
  DOMAINS=("${CLI_DOMAINS[@]}")
  PRIMARY_DOMAIN="${DOMAINS[0]}"
else
  PRIMARY_DOMAIN="$(resolve_hostname)"
  [ -n "$PRIMARY_DOMAIN" ] && DOMAINS=("$PRIMARY_DOMAIN")
fi

if [ "${#DOMAINS[@]}" -eq 0 ]; then
  fail "No domain to certify. Pass --domain, or set CLAW_HOSTNAME in .env."
  exit 1
fi

# Not an error, and not a reason to stop an install: a laptop on claw.local is
# a supported, complete configuration. It just keeps the mkcert edge cert.
if ! is_public_domain "$PRIMARY_DOMAIN"; then
  warn "'$PRIMARY_DOMAIN' is not a publicly resolvable domain — skipping Let's Encrypt."
  info "  A public CA can only validate a name it can reach over the internet."
  info "  The mkcert certificate stays in place and the stack is fully functional;"
  info "  browsers will show a warning until you install the local root CA."
  info "  Re-run this script after pointing a real domain at this host:"
  info "    bash scripts/install-letsencrypt.sh --domain example.com --email you@example.com"
  exit 0
fi

# Add the www form for an apex domain when it resolves. A certificate that
# covers only the apex means every visitor who types www gets a name-mismatch
# error, which looks exactly like the problem this script exists to fix.
if [ "${#CLI_DOMAINS[@]}" -eq 0 ]; then
  LABEL_COUNT="$(printf '%s' "$PRIMARY_DOMAIN" | awk -F. '{print NF}')"
  if [ "$LABEL_COUNT" -eq 2 ] && [ -n "$(resolve_public_a "www.$PRIMARY_DOMAIN" || true)" ]; then
    DOMAINS+=("www.$PRIMARY_DOMAIN")
    info "www.$PRIMARY_DOMAIN resolves publicly — including it in the certificate."
  fi
fi

echo ""
echo "${BOLD}Public TLS certificate (Let's Encrypt)${NC}"
echo ""
info "Domains:   ${DOMAINS[*]}"
info "Webroot:   $WEBROOT"
info "nginx:     container '$NGINX_CONTAINER'"
[ "$STAGING" = "true" ] && warn "Staging CA — the issued certificate will NOT be publicly trusted."

# ─── Contact email ──────────────────────────────────────────────────────────
# Let's Encrypt uses it only for expiry warnings, but an unreachable address is
# worse than none: it silently drops the one warning that catches a broken
# renewal before the certificate expires.
LE_EMAIL="$CLI_EMAIL"
[ -n "$LE_EMAIL" ] || LE_EMAIL="${LETSENCRYPT_EMAIL:-}"
[ -n "$LE_EMAIL" ] || LE_EMAIL="$(read_env_value LETSENCRYPT_EMAIL)"
EMAIL_ARGS=()
if [ -n "$LE_EMAIL" ] && [[ "$LE_EMAIL" == *@* ]] && ! is_public_domain "${LE_EMAIL##*@}" ; then
  warn "Ignoring contact address '$LE_EMAIL' — '${LE_EMAIL##*@}' is not a real mail domain."
  LE_EMAIL=""
fi
if [ -n "$LE_EMAIL" ]; then
  EMAIL_ARGS=(--email "$LE_EMAIL")
  info "Contact:   $LE_EMAIL"
else
  EMAIL_ARGS=(--register-unsafely-without-email)
  warn "No contact address — registering without one. You will NOT get expiry warnings."
  info "  Set LETSENCRYPT_EMAIL in .env or pass --email to fix this."
fi

# ─── Firewall: allow HTTP + HTTPS ───────────────────────────────────────────
# HTTP-01 validation is only ever performed against port 80; there is no way to
# move it. If ufw is inactive these rules are recorded and take effect when it
# is enabled later, which is why they are added either way.
if command -v ufw >/dev/null 2>&1; then
  # 'Nginx Full' is an application profile shipped by the nginx APT package.
  # This host runs nginx in a container, so the profile usually does not exist
  # and the documented `ufw allow 'Nginx Full'` fails. Fall back to the ports
  # the profile would have opened.
  if $SUDO ufw app info "Nginx Full" >/dev/null 2>&1; then
    $SUDO ufw allow 'Nginx Full' >/dev/null 2>&1 && ok "ufw: allowed 'Nginx Full' (80,443/tcp)"
  else
    $SUDO ufw allow 80/tcp  >/dev/null 2>&1 && ok "ufw: allowed 80/tcp"
    $SUDO ufw allow 443/tcp >/dev/null 2>&1 && ok "ufw: allowed 443/tcp"
  fi
  UFW_STATE="$($SUDO ufw status 2>/dev/null | awk 'NR==1{print $2}')"
  [ "$UFW_STATE" = "inactive" ] && info "ufw is inactive — rules recorded for whenever it is enabled."
else
  info "ufw not installed — skipping firewall rules."
fi

# ─── Install certbot ────────────────────────────────────────────────────────
# snap is the packaging Let's Encrypt itself recommends: the distro package
# lags, and a stale certbot eventually fails against ACME protocol changes.
install_certbot() {
  if command -v certbot >/dev/null 2>&1; then
    ok "certbot already installed ($(certbot --version 2>&1 | head -1))"
    return 0
  fi
  if command -v snap >/dev/null 2>&1; then
    info "Installing certbot via snap"
    if $SUDO snap install --classic certbot >/dev/null 2>&1; then
      # certbot lands in /snap/bin, which is not always on a non-login PATH.
      $SUDO ln -sf /snap/bin/certbot /usr/bin/certbot 2>/dev/null || true
      command -v certbot >/dev/null 2>&1 && { ok "certbot installed via snap"; return 0; }
    fi
    warn "snap install failed — falling back to the distro package"
  fi
  if command -v apt-get >/dev/null 2>&1; then
    $SUDO apt-get update -qq >/dev/null 2>&1 || true
    $SUDO apt-get install -y -qq certbot >/dev/null 2>&1 || true
  elif command -v dnf >/dev/null 2>&1; then
    $SUDO dnf install -y -q certbot >/dev/null 2>&1 || true
  fi
  command -v certbot >/dev/null 2>&1 && { ok "certbot installed"; return 0; }
  fail "Could not install certbot. Install it manually and re-run this script."
  return 1
}
install_certbot || exit 1

# ─── Webroot ────────────────────────────────────────────────────────────────
# Shared with the nginx container read-only. World-readable on purpose: the
# challenge token is public by design and nginx serves it to an anonymous CA.
$SUDO mkdir -p "$WEBROOT/.well-known/acme-challenge"
$SUDO chmod -R 755 "$WEBROOT"
ok "Webroot ready at $WEBROOT"

# ─── DNS precheck ───────────────────────────────────────────────────────────
# Let's Encrypt rate-limits failed authorisations. Catching a wrong A record
# here costs a DNS lookup; catching it at the CA costs one of five failures per
# hostname per hour.
if [ "$SKIP_DNS_CHECK" != "true" ]; then
  SERVER_IP="$(curl -fsS --max-time 10 https://api.ipify.org 2>/dev/null || true)"
  [ -n "$SERVER_IP" ] || SERVER_IP="$(curl -fsS --max-time 10 https://ifconfig.me 2>/dev/null || true)"
  if [ -z "$SERVER_IP" ]; then
    warn "Could not determine this host's public IP — skipping the DNS match check."
  else
    info "This host's public IP: $SERVER_IP"
    DNS_OK="true"
    for d in "${DOMAINS[@]}"; do
      if ! RESOLVED="$(resolve_public_a "$d")"; then
        warn "  no DNS client (dig/host/nslookup) installed — cannot verify $d."
        info "        Skipping the check rather than trusting /etc/hosts."
        DNS_OK="true"
        break
      fi
      if [ -z "$RESOLVED" ]; then
        fail "  $d has no public A record."
        DNS_OK="false"
      elif ! printf '%s' "$RESOLVED" | grep -qw "$SERVER_IP"; then
        fail "  $d resolves publicly to [${RESOLVED% }], not $SERVER_IP."
        DNS_OK="false"
      else
        ok "  $d -> $SERVER_IP (public DNS)"
      fi
    done
    if [ "$DNS_OK" != "true" ]; then
      echo ""
      fail "Public DNS does not point at this server. Let's Encrypt would fail validation."
      info "  Create an A record for each name above pointing to $SERVER_IP, wait for"
      info "  the TTL to lapse, then re-run. If the names are behind a proxy or CDN"
      info "  that terminates TLS elsewhere, re-run with --skip-dns-check."
      exit 1
    fi
  fi
fi

# ─── Challenge-path preflight ───────────────────────────────────────────────
# Proves the whole HTTP-01 chain — public :80 → container → webroot — before
# the CA depends on it. Without this, a missing port publish shows up as an
# opaque "Invalid response ... 404" from the ACME server.
PROBE_NAME="claw-preflight-$$"
PROBE_FILE="$WEBROOT/.well-known/acme-challenge/$PROBE_NAME"
printf 'claw-acme-preflight\n' | $SUDO tee "$PROBE_FILE" >/dev/null
$SUDO chmod 644 "$PROBE_FILE"
PROBE_OK="false"
for d in "${DOMAINS[@]}"; do
  BODY="$(curl -fsS --max-time 15 "http://$d/.well-known/acme-challenge/$PROBE_NAME" 2>/dev/null || true)"
  if [ "$BODY" = "claw-acme-preflight" ]; then
    ok "  HTTP-01 path reachable on $d"
    PROBE_OK="true"
  else
    fail "  HTTP-01 path NOT reachable on http://$d/.well-known/acme-challenge/"
    PROBE_OK="false"
    break
  fi
done
$SUDO rm -f "$PROBE_FILE"

if [ "$PROBE_OK" != "true" ]; then
  echo ""
  fail "The ACME challenge path is not being served on port 80."
  echo ""
  info "  The nginx container must publish host port 80 and mount the webroot."
  info "  Both are in docker/docker-compose.prod.services.yml; an older container"
  info "  predates them and has to be recreated:"
  info "    ./scripts/claw.sh --prod up"
  info "  Then check nothing else holds :80 —  sudo ss -tlnp '( sport = :80 )'"
  echo ""
  exit 1
fi

# ─── Request the certificate ────────────────────────────────────────────────
CERTBOT_ARGS=(
  certonly
  --webroot -w "$WEBROOT"
  --non-interactive
  --agree-tos
  --keep-until-expiring
  --cert-name "$PRIMARY_DOMAIN"
)
for d in "${DOMAINS[@]}"; do CERTBOT_ARGS+=(-d "$d"); done
CERTBOT_ARGS+=("${EMAIL_ARGS[@]}")
[ "$STAGING" = "true" ]       && CERTBOT_ARGS+=(--staging)
[ "$FORCE_RENEWAL" = "true" ] && CERTBOT_ARGS+=(--force-renewal)

echo ""
info "Requesting certificate from Let's Encrypt..."
if ! $SUDO certbot "${CERTBOT_ARGS[@]}"; then
  echo ""
  fail "certbot could not issue a certificate for ${DOMAINS[*]}."
  info "  Full log: /var/log/letsencrypt/letsencrypt.log"
  info "  The stack keeps serving the mkcert certificate, so nothing is down —"
  info "  browsers just continue to show the untrusted-certificate warning."
  exit 1
fi

LIVE_DIR="/etc/letsencrypt/live/$PRIMARY_DOMAIN"
if ! $SUDO test -f "$LIVE_DIR/fullchain.pem"; then
  fail "certbot reported success but $LIVE_DIR/fullchain.pem is missing."
  exit 1
fi
ok "Certificate stored at $LIVE_DIR"

# ─── Generate the nginx server block ────────────────────────────────────────
# Written into the wildcard-included drop-in directory rather than edited into
# nginx.conf, so the version-controlled config stays identical on every host and
# this file can be regenerated or deleted without a merge conflict.
mkdir -p "$PUBLIC_TLS_DIR"
DROPIN="$PUBLIC_TLS_DIR/$PRIMARY_DOMAIN.conf"
{
  echo "# =============================================================================="
  echo "# GENERATED by scripts/install-letsencrypt.sh — do not edit by hand."
  echo "# Re-running that script rewrites this file."
  echo "#"
  echo "# Publicly trusted TLS for: ${DOMAINS[*]}"
  echo "#"
  echo "# Included by infra/nginx/nginx.conf via"
  echo "#   include /etc/nginx/claw/public-tls/*.conf;"
  echo "# and it shares the routing table with the default mkcert block, so a route"
  echo "# added in locations.conf is served under both certificates automatically."
  echo "#"
  echo "# The paths below are read through the read-only /etc/letsencrypt mount, not"
  echo "# copied, so a renewed certificate is picked up by an nginx reload alone."
  echo "# =============================================================================="
  echo "server {"
  echo "    listen 443 ssl;"
  echo "    http2 on;"
  echo "    server_name ${DOMAINS[*]};"
  echo ""
  echo "    ssl_certificate         $LIVE_DIR/fullchain.pem;"
  echo "    ssl_certificate_key     $LIVE_DIR/privkey.pem;"
  echo "    ssl_trusted_certificate $LIVE_DIR/chain.pem;"
  echo ""
  echo "    include /etc/nginx/claw/locations.conf;"
  echo "}"
} > "$DROPIN"
ok "Wrote nginx server block: infra/nginx/public-tls/$PRIMARY_DOMAIN.conf"

# ─── Renewal deploy hook ────────────────────────────────────────────────────
# certbot renews without restarting anything, so nginx would keep the expired
# leaf in memory until something else reloaded it — the classic "renewed weeks
# ago, still serving the old certificate" outage. The hook runs only on an
# actual renewal.
HOOK_DIR="/etc/letsencrypt/renewal-hooks/deploy"
HOOK_FILE="$HOOK_DIR/00-claw-reload-nginx.sh"
$SUDO mkdir -p "$HOOK_DIR"
$SUDO tee "$HOOK_FILE" >/dev/null <<HOOK
#!/bin/sh
# Generated by scripts/install-letsencrypt.sh
# Reload the Claw nginx container so a renewed certificate is actually served.
# Never fail the renewal because the container happens to be down: the cert on
# disk is still valid and the next start picks it up.
docker exec $NGINX_CONTAINER nginx -s reload >/dev/null 2>&1 || true
HOOK
$SUDO chmod +x "$HOOK_FILE"
ok "Renewal deploy hook installed at $HOOK_FILE"

# ─── Reload nginx ───────────────────────────────────────────────────────────
if docker ps --format '{{.Names}}' 2>/dev/null | grep -qx "$NGINX_CONTAINER"; then
  if docker exec "$NGINX_CONTAINER" nginx -t >/dev/null 2>&1; then
    docker exec "$NGINX_CONTAINER" nginx -s reload >/dev/null 2>&1
    ok "nginx reloaded — $PRIMARY_DOMAIN now served with the Let's Encrypt certificate"
  else
    fail "nginx rejected the new configuration; NOT reloading. Output:"
    docker exec "$NGINX_CONTAINER" nginx -t || true
    info "  The running config is untouched, so the site stays up on mkcert."
    info "  If the drop-in is at fault, remove it and reload:"
    info "    rm '$DROPIN' && docker exec $NGINX_CONTAINER nginx -s reload"
    exit 1
  fi
else
  warn "Container '$NGINX_CONTAINER' is not running — the block applies on next start."
  info "  If it has never been started since port 80 was added to the compose file,"
  info "  recreate it rather than restarting:  ./scripts/claw.sh --prod up"
fi

# ─── Verify what a browser will actually get ────────────────────────────────
echo ""
info "Verifying the served certificate..."
# `nginx -s reload` returns as soon as the master accepts the signal. Old
# workers keep accepting connections until they finish draining, so a handshake
# opened in the next moment can still be answered with the PREVIOUS config and
# the mkcert leaf. Retry briefly rather than reporting that race as a failure.
#
# Names are resolved by this host, where scripts/install-tls.sh may have mapped
# the domain to 127.0.0.1 — that still exercises the same nginx, and the check
# is about which certificate a given SNI selects, not about routing.
for d in "${DOMAINS[@]}"; do
  SERVED=""
  for attempt in 1 2 3 4 5; do
    SERVED="$(echo | openssl s_client -connect "$d:443" -servername "$d" 2>/dev/null \
              | openssl x509 -noout -issuer -dates 2>/dev/null || true)"
    printf '%s' "$SERVED" | grep -qi "let's encrypt" && break
    sleep 1
  done
  if printf '%s' "$SERVED" | grep -qi "let's encrypt"; then
    ok "  $d -> $(printf '%s' "$SERVED" | awk -F'notAfter=' '/notAfter/{print "expires "$2}')"
  elif [ -n "$SERVED" ]; then
    warn "  $d is still being served a non-Let's-Encrypt certificate:"
    printf '%s\n' "$SERVED" | sed 's/^/            /'
    info "        If this persists, check that the SNI name appears in"
    info "        infra/nginx/public-tls/$PRIMARY_DOMAIN.conf's server_name."
  else
    warn "  $d — could not complete a TLS handshake from this host."
  fi
done

# ─── Renewal ────────────────────────────────────────────────────────────────
# The snap and the distro package both install their own timer; certbot only
# acts when a certificate is inside its 30-day renewal window.
echo ""
if systemctl list-timers 2>/dev/null | grep -q 'snap\.certbot\.renew\|certbot'; then
  ok "Automatic renewal timer is active."
else
  warn "No certbot renewal timer found — renewals will not happen automatically."
  info "  Add one:  echo '0 3 * * * root certbot renew -q' | sudo tee /etc/cron.d/certbot"
fi

if [ "$VERIFY_RENEWAL" = "true" ]; then
  info "Testing renewal (dry run — no rate limit is consumed)..."
  if $SUDO certbot renew --dry-run; then
    ok "Renewal dry run passed."
  else
    fail "Renewal dry run FAILED — this certificate will not renew itself."
    info "  Fix it now; a failure discovered at expiry is an outage."
    exit 1
  fi
fi

echo ""
ok "${BOLD}Public TLS is live for ${DOMAINS[*]}${NC}"
info "  Browsers:   trusted Let's Encrypt certificate (auto-renewing)"
info "  Containers: unchanged mkcert certificate for service-to-service TLS"
echo ""
