# Runbook: production host hardening (after the 2026-11-27 incident)

Report: [incident-2026-11-27](../security/incident-2026-11-27-open-ports-and-signup-farm.md).

Docker publishes container ports on `0.0.0.0` and inserts its own iptables rules, so `ufw` and the `INPUT` chain do
not protect containers. Everything below lives on the host, outside the repository; re-apply it on a new server.

## 1. Only 22, 80 and 443 are public

- `/usr/local/sbin/claw-docker-firewall.sh` inserts `DROP` rules into `DOCKER-USER` (IPv4 and IPv6) for traffic on
  `eth0` to 3000, 3310, 4000, 5441-5460, 5672, 6380, 15672, 27017-27018. Idempotent.
- `claw-docker-firewall.service` (oneshot, after `docker.service`) runs it at boot.
- Check from OUTSIDE the server (not over SSH on it):
  `for p in 3000 5441 6380 15672 27018; do timeout 4 bash -c "echo > /dev/tcp/92.205.176.113/$p" && echo OPEN $p; done`
  must print nothing.
- Port values in `/srv/clawai/.env` are bare numbers (`PG_THREADS_PORT=5458`): the compose files add `127.0.0.1:`.
  A value that already carries a host (`127.0.0.1:5458`) makes `docker compose` refuse every file ("invalid IP
  address: 127.0.0.1:127.0.0.1") and the deploy stops before building anything.
- A new published port needs either an nginx route (preferred) or a line in that script. The compose files bind
  internal ports to `127.0.0.1`; the database containers take that binding only when recreated (the deploy never
  recreates databases).

## 2. SSH

`/etc/ssh/sshd_config.d/01-claw-hardening.conf`: `PasswordAuthentication no`, `KbdInteractiveAuthentication no`,
`PermitRootLogin no`, `X11Forwarding no`, `MaxAuthTries 3`, `LoginGraceTime 30`, `AllowUsers ihabkhaled deploy`.
The name must sort before `60-cloudimg-settings.conf` (the first value wins and that file enables passwords).
After editing: `sudo sshd -t && sudo systemctl reload ssh`, then open a NEW session before closing the old one.

## 3. fail2ban

- `sshd` jail: 4 tries / 10 min → 24 h, increasing.
- `claw-nginx-logtap.service` copies `docker logs -f claw-nginx` to `/var/log/claw-nginx/access.log`
  (logrotate daily, 14 days, `copytruncate`).
- Jails on that file ban in `DOCKER-USER` (`banaction = iptables-allports`, `chain = DOCKER-USER`; web traffic is
  forwarded, an `INPUT` ban would not stop it):
  - `claw-nginx-scan`: 2 probes for `.env`, `.git`, `wp-*`, `actuator`, `@id/__vite`, … in 1 h → 7 days.
  - `claw-nginx-flood`: 40 × HTTP 429 in 5 min → 1 h.
  - `claw-nginx-auth`: 25 failed sign-in / sign-up / bot-check answers in 10 min → 6 h.
- Status: `sudo fail2ban-client status claw-nginx-scan`. Unban: `sudo fail2ban-client set <jail> unbanip <ip>`.
- Test a filter: `sudo fail2ban-regex /var/log/claw-nginx/access.log /etc/fail2ban/filter.d/claw-nginx-scan.conf`.

## 4. Data-store passwords (every store its own, rotated in one window)

Installs made before per-database passwords shared ONE password across 14 Postgres databases, and Redis had none
(2026-11-27). Every store now has its own random password, and the production compose files refuse to start a store
without one (`${VAR:?...}`, `tools/__tests__/prod-compose-internal-ports-loopback.test.mjs`).

- **Rotate** (all stores, ~2-5 min of restarts): `cd /srv/clawai && sudo bash scripts/rotate-db-passwords.sh --env
.env --yes`. Plan only: `--dry-run`. Some stores only: `--only REDIS,AUTH`. Installers: `bash scripts/install.sh
--rotate-db-passwords` / `.\scripts\install.ps1 -RotateDbPasswords` (same script, the install's compose files).
- What it does: checks each running store accepts the password `.env` has (stops on drift, nothing changed);
  changes the password INSIDE each store (Postgres `ALTER USER`, MongoDB `changeUserPassword`, `rabbitmqctl
change_password`, Redis `CONFIG SET requirepass`), putting every changed store back if one fails; backs `.env` up
  (`.env.bak-<time>-rotation`, same owner and mode) and rewrites each `*_PASSWORD` and every URL whose host is a
  rotated store; recreates the stores (which also applies the loopback port bindings) and every running app
  container of the given compose files; waits for every container to be healthy and checks each new password.
- Values never appear on a command line or in output; a container left in "Created" by a failed dependency is
  started and reported.
- Fresh installs: `install.sh` / `install.ps1` generate one password per store; `setup.sh` gives a copied
  `.env.example` unique values (`--fresh`) unless database volumes from an earlier install exist.
- **Roll back** only if the script stopped after writing `.env` and a service cannot recover: the old values are in
  the backup; set each one back inside its store by hand (`ALTER USER ... PASSWORD '<old>'`, `changeUserPassword`,
  `rabbitmqctl change_password`, `CONFIG SET requirepass`), `cp -p` the backup over `.env` and recreate the services.
  Running the script again mints NEW values; it is a fix-forward, not a rollback.
- Verify: `docker ps` all healthy; no `password authentication failed`, `NOAUTH`, `ACCESS_REFUSED` or `Authentication
failed` in the last minutes of any service log; `docker exec claw-redis redis-cli ping` answers `NOAUTH`.

## 5. Captcha keys (Turnstile, reCAPTCHA v3)

- Live in `/srv/clawai/.env` (`TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `RECAPTCHA_SITE_KEY`, `RECAPTCHA_SECRET_KEY`) or
  as `security.*` admin settings (a setting wins). After an `.env` change recreate auth-service only (`up -d --no-build
--no-deps auth-service`); `GET /api/v1/auth/bot-check/config?action=register` must show both providers.
- **Test before trusting a key** (2026-11-27: the first reCAPTCHA key broke sign-up for 10 minutes):
  - reCAPTCHA badge "Invalid domain for site key" = the bare domain `claw-ai.co` is missing from the key's domain list
    (google.com/recaptcha/admin → gear, or console.cloud.google.com/security/recaptcha → Edit key).
  - Turnstile error `110200` = hostname not allowed; `600010` in an automated browser is expected (it blocks bots).
  - A secret is valid when siteverify with a dummy token answers `invalid-input-response`
    (`invalid-input-secret` = wrong secret).
  - Final proof: a real (not automated) browser signs up with a `@mailinator.com` address and gets
    `DISPOSABLE_EMAIL`, which is only reached after every bot check passed. No account is created.
- **Roll back in one minute:** comment the four lines out and recreate auth-service; proof of work keeps running.

## 6. Recurring checks

- `sudo journalctl -u ssh --since "1 day ago" | grep Accepted` — only `ihabkhaled` (owner) and `deploy` (GitHub
  Actions ranges from `api.github.com/meta`).
- `docker exec claw-redis redis-cli --scan | grep -vE '^(quota|display-fx|claw:)'` — no unexpected keys.
- Sign-ups by email domain per day (auth DB `users`): a spike on one unknown domain is a farm.
