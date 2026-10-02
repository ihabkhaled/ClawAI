-- ADR-142 update 2026-10-02: the free credit-connector allowance is ONE total per
-- user per UTC month across every credit connector, not one counter per provider.
-- The total lives in the same table under the reserved provider key '*'. Existing
-- per-provider rows are summed into it and removed. Idempotent: a re-run finds no
-- per-provider rows and changes nothing; an existing '*' row is added to, never reset.
INSERT INTO credit_free_allowance_usage (id, user_id, provider, period_key, used_count, created_at, updated_at)
SELECT 'fat_' || md5(user_id || ':' || period_key), user_id, '*', period_key, SUM(used_count)::int, now(), now()
FROM credit_free_allowance_usage
WHERE provider <> '*'
GROUP BY user_id, period_key
ON CONFLICT (user_id, provider, period_key)
DO UPDATE SET used_count = credit_free_allowance_usage.used_count + EXCLUDED.used_count,
              updated_at = now();

DELETE FROM credit_free_allowance_usage WHERE provider <> '*';
