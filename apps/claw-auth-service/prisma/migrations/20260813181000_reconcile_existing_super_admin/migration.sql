-- Repair deployments that were seeded before the immutable super-admin flag
-- was introduced. This is deliberately conservative: it only promotes an
-- administrator when exactly one exists and no super administrator exists.
WITH sole_admin AS (
  SELECT MIN(id) AS id
  FROM users
  WHERE role = 'ADMIN'
  HAVING COUNT(*) = 1
)
UPDATE users
SET
  is_super_admin = true,
  email_verified_at = COALESCE(email_verified_at, CURRENT_TIMESTAMP),
  status = 'ACTIVE'
WHERE id = (SELECT id FROM sole_admin)
  AND NOT EXISTS (
    SELECT 1
    FROM users
    WHERE is_super_admin = true
  );
