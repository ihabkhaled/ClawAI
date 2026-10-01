# Runbook: spam on the public feedback form

Symptom: `source=PUBLIC` tickets that are junk, or many `429 FEEDBACK_RATE_LIMITED`.
`POST /api/v1/feedback/public` has no login, so it is protected only by the honeypot,
Redis limits (5/hour per address, 3/hour per email, keys hashed under `feedback:public:`)
and nginx `limit_req zone=public_feedback`. Triage in the admin list with `?source=PUBLIC`
and close junk as spam. A honeypot hit logs `public feedback honeypot tripped` and stores
nothing. If junk gets past the limits, lower the zone `rate` in `infra/nginx/nginx.conf`
(and the distributed template) and restart nginx (it bind-mounts single files, see
[runbook-nginx-stale-config.md](runbook-nginx-stale-config.md)); if Redis is down the
limiter fails open and nginx is the only brake. Do not reveal in any reply whether an email
belongs to an account (rule 43). See [ADR-141](../13-adr/adr-141-public-and-authenticated-feedback-apis.md).
