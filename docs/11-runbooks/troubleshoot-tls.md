# Runbook — Troubleshoot Local TLS

Quick lookup for the most common TLS failure modes after a fresh
`scripts/install.sh` or `install.ps1` run. Companion to
`docs/08-runtime-devops/tls-setup.md`.

## Symptom matrix

| Symptom | Likely cause | Fix |
|---|---|---|
| Browser shows "Your connection is not private" / NET::ERR_CERT_AUTHORITY_INVALID | Root CA not installed in OS trust store | `mkcert -install` then restart browser |
| `curl https://localhost/...` returns `SSL certificate problem: self-signed certificate in certificate chain` | curl is using its own CA bundle (default on Mac/Linux), not the OS store | Use `curl --cacert certs/rootCA.pem ...` OR install `mkcert -install` for system tools |
| Service logs: `EACCES: permission denied, open '/certs/claw.key'` | cert mount has wrong host perms | `chmod 644 certs/claw.crt && chmod 600 certs/claw.key` (Linux only) |
| Service logs: stderr warning `[https-bootstrap] cert read failed at cert=/certs/claw.crt` | certs/ missing on host OR not mounted | Run `scripts/install-tls.sh`; verify `docker compose ... config` shows `../certs:/certs:ro` for the service |
| Service logs: `Hostname/IP doesn't match certificate's altnames` | The leaf cert was issued before this service hostname was added to the SAN list | Add the hostname to `HOSTS` array in `scripts/install-tls.sh` (+ `.ps1`), rerun the install |
| Service logs: `UNABLE_TO_VERIFY_LEAF_SIGNATURE` on inter-service fetch | `NODE_EXTRA_CA_CERTS` env var not set or pointing to a missing file | Confirm `NODE_EXTRA_CA_CERTS=/certs/rootCA.pem` is in `.env` and `certs/rootCA.pem` exists |
| `nginx -t` complains `SSL: error:0200100D:system library:fopen:Permission denied` | Cert files unreadable inside nginx container | Mount must be `:ro` and host file must be world-readable: `chmod 644 certs/claw.crt` |
| `nginx -t` complains `ssl_certificate_key key values mismatch` | claw.crt and claw.key are from different mkcert runs | Delete certs/ and rerun `install-tls.sh` |
| Browser works, but Next.js SSR throws `fetch failed → cause: SELF_SIGNED_CERT_IN_CHAIN` | Frontend container doesn't have NODE_EXTRA_CA_CERTS set | Confirm frontend service block in compose has `env_file: ../.env`; rebuild container |
| Webhook from GitHub/Slack times out | Self-signed cert; provider can't reach `https://localhost` | Use `ngrok http https://localhost:443` or `cloudflared tunnel`; register the tunnel URL as the webhook target |
| Windows: `mkcert -install` silently fails | UAC was declined | Re-run install.ps1; click Yes on the elevation prompt |
| Mac: `mkcert -install` says `ERROR: failed to execute "security add-trusted-cert"` | Keychain locked | Unlock the login keychain in Keychain Access, retry |
| `docker compose up` errors with `error mounting "/host/path/certs"` | Host certs/ directory doesn't exist | Run `scripts/install-tls.sh` first — install.sh does this for you |

## Pre-flight checks

Run this from the project root any time TLS feels broken:

```bash
# 1. Certs exist on host
ls -la certs/
# Expect: claw.crt, claw.key, rootCA.pem

# 2. mkcert root CA is trusted by the OS
mkcert -CAROOT
# Expect: a directory; the rootCA.pem inside must match certs/rootCA.pem

# 3. nginx container can read its certs
docker exec claw-nginx test -r /etc/nginx/certs/claw.crt && echo OK

# 4. A service container can read its certs
docker exec claw-auth-service test -r /certs/claw.crt && echo OK

# 5. Inter-service trust works
docker exec claw-chat-service \
  curl -sSf https://auth-service:4001/api/v1/health
# Expect: {"status":"ok",...}
```

If all 5 pass, TLS is wired correctly — the bug is elsewhere.

## Nuclear reset

If certs feel corrupt or out-of-sync across services:

```bash
# Stop everything
./scripts/claw.sh down

# Wipe certs (will be regenerated)
rm -rf certs/

# Reinstall (regenerates certs, keeps the trusted root CA)
bash scripts/install-tls.sh        # Mac/Linux
# OR
powershell -ExecutionPolicy Bypass -File scripts/install-tls.ps1   # Windows

# Start fresh
./scripts/claw.sh up
```

If even that doesn't fix it, the root CA itself is the problem
(rare — usually means the OS trust store was tampered with):

```bash
mkcert -uninstall
mkcert -install
bash scripts/install-tls.sh
./scripts/claw.sh down && ./scripts/claw.sh up
```

## Disabling TLS (escape hatch)

If you need to temporarily run without TLS (debugging a non-TLS issue,
testing the HTTP fallback), edit `.env`:

```diff
- HTTPS_CERT_PATH=/certs/claw.crt
- HTTPS_KEY_PATH=/certs/claw.key
+ HTTPS_CERT_PATH=
+ HTTPS_KEY_PATH=
```

Services will boot on HTTP. **You'll also need to** edit nginx.conf to
flip upstreams back to `http://` — there's no env-driven switch for
that (TLS is the supported path). Easier to `git stash` the TLS commits
and rebuild.
