# Skill: expose Grok, Claude (or any connector model) for local testing

**Local dev stack only. Never change a production seed for this.**

## Symptom

`use grok to …` answered by another model with no word about it, or a manual pick of a Grok / Claude
model returns `403 MODEL_NOT_EXPOSED`, or the notice says `NOT_CONFIGURED` / `NOT_IN_PLAN`.

## How exposure works (three layers, all admin-driven)

1. **Connector service** (`claw_connectors.connector_models.exposure`): `EXPOSED` / `UNEXPOSED`.
   Admin UI: Admin → Connectors → models, or `PATCH` through connector-service. A model must be
   `EXPOSED` and `lifecycle=ACTIVE` before anything can route to it.
2. **Routing service** (`claw_routing.router_model_registry` then `model_deployments`): AUTO and named-model
   routing only know models that have a `ModelDeployment` row. These are created by two admin calls,
   not by exposure alone.
3. **Plan access** (`claw_auth.plans.model_access_mode` + `plan_model_access`): `ALLOW_ALL` plans (every
   local plan) need nothing; a restricted plan lists `PROVIDER/model` pairs.

## Steps

```bash
# 0. what is exposed? (connector DB)
docker exec claw-pg-connector psql -U claw -d claw_connectors -c \
  "select provider, exposure, count(*) from connector_models where provider in ('GROK','ANTHROPIC') group by 1,2"

# 1. expose in the LOCAL DB when a model you need is UNEXPOSED (grok / claude chat models)
docker exec claw-pg-connector psql -U claw -d claw_connectors -c \
  "update connector_models set exposure='EXPOSED' where provider in ('GROK','ANTHROPIC') and kind='CHAT' and lifecycle='ACTIVE'"

# 2. let routing see them (admin token; both endpoints are admin-only)
T=$(curl -sk -X POST https://claw.local/api/v1/auth/login -H 'content-type: application/json' \
  -d '{"email":"admin@claw.local","password":"ClawAdmin123!"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).tokens.accessToken')
curl -sk -X POST https://claw.local/api/v1/routing/models/sync          -H "authorization: Bearer $T"
curl -sk -X POST https://claw.local/api/v1/routing/models/discovery/run -H "authorization: Bearer $T"

# 3. drop deployments you did not mean to enable (discovery creates one per registry row,
#    including ~450 OPENROUTER models that have no published price and answer "cannot be billed")
docker exec claw-pg-routing psql -U claw -d claw_routing -c "delete from model_deployments where provider='OPENROUTER'"

# 4. prove it
docker exec claw-pg-routing psql -U claw -d claw_routing -c \
  "select provider, count(*) from model_deployments group by 1 order by 1"
docker logs --since 2m claw-routing-service 2>&1 | grep "NamedModelRequestManager"
```

Expected log for `use grok to explain recursion`: `resolve: "grok" → GROK/<model> (CHAT)`. For a
provider with nothing configured: `named DEEPSEEK but it cannot answer (NOT_CONFIGURED)`, and the answer opens
with one sentence saying so.

## Traps

- A dev container bakes `packages/shared-*`: after changing `shared-types` or `shared-utilities`,
  `docker cp packages/<pkg>/dist/. <container>:/app/packages/<pkg>/dist/` for `claw-routing-service` and
  `claw-chat-service-1`, then `docker restart` both (a crashed nodemon waits for a file change).
- Auth login is rate limited: cache the token across API calls instead of logging in per request.
- A new test user needs `status='ACTIVE'` and `email_verified_at` set in `claw_auth.users` before login works.
- Production is unaffected: the registry sync and discovery run there on their own schedule.
