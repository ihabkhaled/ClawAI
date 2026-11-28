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

- **Host services too (2026-11-28).** `/usr/local/sbin/claw-host-firewall.sh` + `claw-host-firewall.service` add a
  `CLAW-INPUT` chain on `eth0` (IPv4 and IPv6; files in `infra/host/`): replies, 22, 80, 443, the hosting provider's agent `nydus-ex-api`
  on 2224 (already closed upstream; keeping it open keeps the provider's panel working), ICMP and DHCP; everything
  else is dropped. Docker-published ports go through `FORWARD`, not `INPUT`, so this guards only what runs on the
  host itself. Apply a change with a revert timer first:
  `sudo systemd-run --unit=claw-fw-revert --on-active=300 /bin/sh -c 'iptables -D INPUT -i eth0 -j CLAW-INPUT; ip6tables -D INPUT -i eth0 -j CLAW-INPUT'`,
  run the script, open a NEW SSH session and load the site, then `sudo systemctl stop claw-fw-revert.timer`.
- **nginx is published on IPv4 only** (`0.0.0.0:80:80`, `0.0.0.0:443:443`, ADR-232): through Docker's IPv6 proxy every
  visitor looks like `172.x`, which no rate limit or ban can key on. The domain has no AAAA record.

## 2. SSH

`/etc/ssh/sshd_config.d/01-claw-hardening.conf`: `PasswordAuthentication no`, `KbdInteractiveAuthentication no`,
`PermitRootLogin no`, `X11Forwarding no`, `MaxAuthTries 3`, `LoginGraceTime 30`, `AllowUsers ihabkhaled deploy`,
and since 2026-11-28 `AllowAgentForwarding no`, `ClientAliveInterval 300`, `ClientAliveCountMax 2` (backup of the earlier
file: `/root/01-claw-hardening.conf.bak-20261128`).
The name must sort before `60-cloudimg-settings.conf` (the first value wins and that file enables passwords).
After editing: `sudo sshd -t && sudo systemctl reload ssh`, then open a NEW session before closing the old one.

## 3. fail2ban (the files are in the repository: `infra/fail2ban/`, ADR-232)

- `claw-nginx-logtap.service` copies `docker logs -f claw-nginx` to `/var/log/claw-nginx/access.log` (logrotate daily, 14 days,
  `copytruncate`; both files are in `infra/fail2ban/` for a rebuild). A line is nginx's "combined" format plus two trailing fields:
  `… "<user agent>" crawler=<who the User-Agent claims> verdict=<none|verified|fake|unchecked>`.
- Jails (every web jail bans in `DOCKER-USER`: web traffic is forwarded, an `INPUT` ban would not stop it). `ignoreip` is
  `127.0.0.1/8 ::1 172.16.0.0/12`. The web jails raise the ban for a repeat offender (`bantime.increment`, each jail's multipliers and
  ceiling are in `jail.d/claw-nginx.local`); `dbpurgeage = 35d` makes fail2ban remember them.

  | Jail                       | Trigger                                                                      | Ban                                        |
  | -------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------ |
  | `sshd`                     | 4 failures in 10 min                                                         | 24 h, increasing                           |
  | `claw-nginx-scan`          | 2 probes (`.env`, `.git`, `wp-*`, `docker-compose.yml`, traversal, …) in 1 h | 7 d, then 14 d, 28 d (max 30 d)            |
  | `claw-nginx-flood`         | 40 × HTTP 429 in 5 min (not from a verified crawler)                         | 1 h, doubling to 7 d                       |
  | `claw-nginx-auth`          | 25 failed sign-in / sign-up / bot-check answers in 10 min                    | 6 h, doubling to 7 d                       |
  | `claw-nginx-fakebot`       | ONE request claiming Google, Bing, … from outside its ranges                 | 24 h, then 48 h, 96 h (max 7 d)            |
  | `claw-nginx-crawler-abuse` | 60 × 429 in 10 min for a VERIFIED crawler that ignores them                  | 1 h, never more, no increment              |
  | `recidive`                 | banned 3 times in a day by any jail except crawler-abuse                     | 7 d on every port, `DOCKER-USER` + `INPUT` |

- **Install / update** (a new server, or after a change under `infra/fail2ban/`; nothing in it needs nginx to be new first):

  ```bash
  cd /srv/clawai
  sudo install -m 0644 infra/fail2ban/filter.d/*.conf /etc/fail2ban/filter.d/
  sudo install -m 0644 infra/fail2ban/jail.d/claw-nginx.local infra/fail2ban/jail.d/claw-recidive.local infra/fail2ban/jail.d/claw-sshd.local /etc/fail2ban/jail.d/
  sudo install -d /etc/fail2ban/fail2ban.d && sudo install -m 0644 infra/fail2ban/fail2ban.d/claw.local /etc/fail2ban/fail2ban.d/
  sudo fail2ban-client -t && sudo systemctl reload fail2ban     # -t first: a bad file must never reach the running daemon
  sudo fail2ban-client status        # sshd, claw-nginx-scan, -flood, -auth, -fakebot, -crawler-abuse, recidive
  ```

- Status: `sudo fail2ban-client status claw-nginx-fakebot`. Unban: `sudo fail2ban-client set <jail> unbanip <ip>`; a banned
  address is also in the ban list of `recidive` (unban it there too), and `sudo iptables -S DOCKER-USER | grep <ip>` shows it.
- **Test a filter on the live log:** `sudo fail2ban-regex /var/log/claw-nginx/access.log /etc/fail2ban/filter.d/claw-nginx-fakebot.conf`.
- **Test every filter on lines you control** (counts measured with fail2ban 1.0.2; the repository runs the same check in a
  throwaway container, `tools/__tests__/fail2ban-docker.test.mjs`):

  ```bash
  cat > /tmp/f2b-sample.log <<'LOG'
  203.0.113.7 - - [28/Nov/2026:12:00:00 +0000] "GET /.env HTTP/2.0" 404 146 "-" "curl/8" crawler= verdict=none
  203.0.113.7 - - [28/Nov/2026:12:00:01 +0000] "GET /docker-compose.yml HTTP/2.0" 404 146 "-" "curl/8" crawler= verdict=none
  203.0.113.7 - - [28/Nov/2026:12:00:02 +0000] "POST /api/v1/auth/login HTTP/2.0" 401 90 "-" "curl/8" crawler= verdict=none
  203.0.113.7 - - [28/Nov/2026:12:00:03 +0000] "GET /api/v1/models HTTP/2.0" 429 146 "-" "Mozilla/5.0" crawler= verdict=none
  198.51.100.9 - - [28/Nov/2026:12:00:04 +0000] "GET / HTTP/2.0" 403 146 "-" "Googlebot/2.1" crawler=google verdict=fake
  66.249.64.1 - - [28/Nov/2026:12:00:05 +0000] "GET /wp-login.php HTTP/2.0" 404 146 "-" "Googlebot/2.1" crawler=google verdict=verified
  66.249.64.1 - - [28/Nov/2026:12:00:06 +0000] "GET /learn/x HTTP/2.0" 429 146 "-" "Googlebot/2.1" crawler=google verdict=verified
  203.0.113.8 - - [28/Nov/2026:12:00:07 +0000] "GET /robots.txt HTTP/2.0" 200 100 "-" "Mozilla/5.0" crawler= verdict=none
  LOG
  for f in scan flood auth fakebot crawler-abuse; do echo "claw-nginx-$f:"; sudo fail2ban-regex /tmp/f2b-sample.log /etc/fail2ban/filter.d/claw-nginx-$f.conf | grep '^Lines:'; done
  ```

  Expected `Lines:` — scan `2 ignored, 2 matched` (the verified crawler's wp-login is ignored) · flood `1 ignored, 1 matched` ·
  auth `1 matched` · fakebot `1 matched` (only the fake) · crawler-abuse `1 matched` (only the verified 429).
  recidive reads fail2ban's own log:
  `printf '2026-11-28 12:00:00,123 fail2ban.actions        [101]: NOTICE  [claw-nginx-scan] Ban 203.0.113.9\n2026-11-28 12:10:00,123 fail2ban.actions        [101]: NOTICE  [claw-nginx-crawler-abuse] Ban 66.249.64.1\n2026-11-28 12:20:00,123 fail2ban.actions        [101]: NOTICE  [recidive] Ban 203.0.113.9\n' > /tmp/rec.log; sudo fail2ban-regex /tmp/rec.log /etc/fail2ban/filter.d/claw-recidive.conf | grep '^Lines:'`
  → `1 matched, 2 missed` (a crawler-abuse ban and recidive's own ban never count).

- **A real crawler was banned or refused.** Prove it with reverse DNS before trusting either side:
  `host 66.249.66.1` must answer a name under `googlebot.com` or `google.com`, and `host <that name>` must give the same address (Bing:
  `search.msn.com`). If it is real, its address is missing from the ranges: run `sudo bash infra/host/refresh-crawler-ranges.sh` (section 7),
  unban it, and check Search Console. Never test the fake-crawler path from an address you need: `curl -A Googlebot https://<site>/`
  bans YOUR address for 24 h (unban it: `sudo fail2ban-client set claw-nginx-fakebot unbanip <your ip>`).

## 4. Data-store passwords (every store its own, rotated in one window)

Installs made before per-database passwords shared ONE password across 14 Postgres databases, and Redis had none
(2026-11-27). Every store now has its own random password, and the production compose files refuse to start a store
without one (`${VAR:?...}`, `tools/__tests__/prod-compose-internal-ports-loopback.test.mjs`).

- **Rotate** (all stores, ~2-5 min of restarts): `cd /srv/clawai && sudo bash scripts/rotate-db-passwords.sh --env
.env --yes`. Plan only: `--dry-run`. Some stores only: `--only REDIS,AUTH`. Installers: `bash scripts/install.sh
--rotate-db-passwords` / `.\scripts\install.ps1 -RotateDbPasswords` (same script, the install's compose files).
- The Firecrawl sidecar's Redis and RabbitMQ are rotated with the rest (`--only FIRECRAWL_REDIS,FIRECRAWL_RABBITMQ`); their first
  adoption is section 8.
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

- **Security updates** install daily by themselves (`APT::Periodic::Unattended-Upgrade "1"`; `/etc/apt/apt.conf.d/52claw-unattended`:
  no automatic reboot, Docker packages blacklisted so containers never restart on their own). A pending reboot shows
  as `/var/run/reboot-required`; reboot in a quiet window after asking the owner. Run one by hand:
  `sudo systemd-run --unit=claw-sec-upgrade --setenv=NEEDRESTART_SUSPEND=1 /usr/bin/unattended-upgrade -v`.
- **Kernel network settings**: `/etc/sysctl.d/90-claw-hardening.conf` (no ICMP redirects sent or accepted, martians logged).
- **Secrets on disk**: `/srv/clawai/.env` and every `.env.bak*` are mode 600, owner `deploy`
  (`stat -c '%a %U %n' /srv/clawai/.env*`); two old backups were 644/664 until 2026-11-28.

- `sudo journalctl -u ssh --since "1 day ago" | grep Accepted` — only `ihabkhaled` (owner) and `deploy` (GitHub
  Actions ranges from `api.github.com/meta`).
- `docker exec claw-redis redis-cli --scan | grep -vE '^(quota|display-fx|claw:)'` — no unexpected keys.
- Sign-ups by email domain per day (auth DB `users`): a spike on one unknown domain is a farm.

## 7. Verified crawlers and edge limits (ADR-232)

nginx proves a crawler by the address it comes from (the operators' own published range files), never by its User-Agent: see
[nginx-reference](../08-runtime-devops/nginx-reference.md#edge-policy-verified-crawlers-smart-limits-scanner-404s-tls-adr-232).
The committed baseline is `infra/nginx/verified-crawlers/ranges.conf` and works with no host setup. To refresh it every night WITHOUT
dirtying the checkout (the deploy refuses a dirty tree), keep the live copy in a host directory outside it:

```bash
sudo install -d -m 0755 /var/lib/claw/verified-crawlers
sudo cp /srv/clawai/infra/nginx/verified-crawlers/ranges.conf /var/lib/claw/verified-crawlers/ranges.conf
echo 'NGINX_CRAWLER_RANGES_DIR=/var/lib/claw/verified-crawlers' | sudo tee -a /srv/clawai/.env >/dev/null     # once
cd /srv/clawai && sudo docker compose --env-file .env -p claw -f docker/docker-compose.prod.databases.yml -f docker/docker-compose.prod.services.yml \
  up -d --no-build --no-deps --force-recreate nginx         # the mount changed: a reload would keep the old one
sudo bash infra/host/refresh-crawler-ranges.sh --dry-run    # downloads and compares, writes nothing
sudo install -m 0644 infra/host/claw-crawler-ranges.service infra/host/claw-crawler-ranges.timer /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now claw-crawler-ranges.timer
systemctl list-timers claw-crawler-ranges.timer
```

- The timer runs at 03:17 (+ up to 30 min) every night: a real crawler on a new range is refused until the file catches up, so not
  weekly. Look at it with `journalctl -u claw-crawler-ranges --since yesterday`. Exit 3 means "refreshed, but a source is stale": the header
  of the file says which (`# stale …`), and that operator keeps its previous ranges.
- The script keeps `ranges.conf.prev`, runs `nginx -t` inside `claw-nginx`, puts the old file back if it fails, reloads, then compares
  the checksum nginx sees with the host file. "nginx does not see …" means the container was created before
  `NGINX_CRAWLER_RANGES_DIR` was set: recreate it (the command above).
- Update the committed baseline from a dev machine with `node tools/crawlers/update-verified-crawler-ranges.mjs`, review the diff and commit.
- **A source that stops working** (URL moved, file empty): the updater keeps the old ranges and reports it; fix the URL in
  `tools/crawlers/crawler-sources.mjs`. Operators that only support reverse DNS are ordinary visitors by design.
- **Limits that bite a real user** (an office behind one address): look for `limiting requests` and `429` in `docker logs claw-nginx`, and for
  `claw-nginx-flood` bans; raise `claw_general` in the policy block of `nginx.conf` (and the template), restart nginx.
- **Outside-in checks after a deploy** (from a machine whose address you do not need; the first one bans it for a day):
  `curl -sk -o /dev/null -w '%{http_code}\n' -A 'Googlebot/2.1' https://<site>/` → 403 · `curl -sk -o /dev/null -w '%{http_code} %{size_download}\n' https://<site>/.env` →
  `404 148` (not 470 KB) · `curl -sk -o /dev/null -w '%{http_code}\n' https://<site>/robots.txt` → 200 · `echo | openssl s_client -tls1_2 -cipher AES128-SHA -connect <site>:443`
  must fail and `-cipher ECDHE-RSA-AES128-GCM-SHA256` must work.

## 8. Firecrawl stores (security audit 2026-11-28)

The Firecrawl sidecar (profile `firecrawl`) has its own Postgres, Redis and RabbitMQ on `claw-scrapers`, the network it shares with
crawl4ai, flaresolverr and the headless browsers that load untrusted pages. Its Redis used to answer `PONG` to anyone and its RabbitMQ
still had the default `guest` user. Now `firecrawl-redis` has `--requirepass`, `firecrawl-rabbitmq` has the user `firecrawl` (no `guest`), the
Firecrawl API connects with both, and the production compose files require the passwords (`FIRECRAWL_REDIS_PASSWORD`,
`FIRECRAWL_RABBITMQ_PASSWORD`, `${VAR:?…}`). None of the three stores publishes a port.

**First adoption on a host where the sidecar already runs** (a compose file that requires a variable breaks every compose command
when `.env` lacks it, so `.env` comes FIRST, before the deploy):

```bash
cd /srv/clawai
for v in FIRECRAWL_REDIS_PASSWORD FIRECRAWL_RABBITMQ_PASSWORD; do
  grep -q "^$v=" .env || printf '%s=%s\n' "$v" "$(openssl rand -hex 24)" | sudo tee -a .env >/dev/null
done                                                  # prints nothing; the values never appear on screen
# ... deploy the release as usual ...
C="sudo docker compose --env-file .env -p claw --profile firecrawl -f docker/docker-compose.prod.databases.yml -f docker/docker-compose.prod.services.yml"
$C up -d --no-build --no-deps --force-recreate -V firecrawl-rabbitmq   # -V: a fresh volume, so RabbitMQ creates the new user
$C up -d --no-build --no-deps --force-recreate firecrawl-redis firecrawl-api
```

RabbitMQ creates `RABBITMQ_DEFAULT_USER` only on an empty data directory, so the fresh volume is what drops `guest`; queued Firecrawl
jobs are lost (their state is in Firecrawl's Postgres). Verify: `docker exec claw-firecrawl-redis redis-cli ping` → `NOAUTH`;
`docker exec claw-firecrawl-rabbitmq rabbitmqctl -q list_users` → only `firecrawl`; `docker logs --since 10m claw-firecrawl-api | grep -ciE 'NOAUTH|ACCESS_REFUSED'` → 0;
`docker ps` healthy. Later rotations are `scripts/rotate-db-passwords.sh --only FIRECRAWL_REDIS,FIRECRAWL_RABBITMQ --yes` (section 4).
