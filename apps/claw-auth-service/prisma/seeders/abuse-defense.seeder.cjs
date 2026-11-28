// Abuse auto-suspension settings and the banned-device backfill (ADR-233, 2026-11-28).
//
// 1. SETTINGS. Makes the nine `security.abuse.*` thresholds, durations and the kill switch VISIBLE as
//    system_settings rows, so an administrator can read and edit them from the settings API without
//    knowing the key names. The code reads the same values as defaults when a row is absent, so this
//    seeder changes nothing about behaviour: it only creates rows that do not exist yet. An
//    administrator's edited value is never overwritten (skipDuplicates on the unique key), and a
//    cleared value ('') still reads as the default.
// 2. BACKFILL. Every account ALREADY banned for life gets its device hashes marked, so a new sign-up
//    from those devices is refused from the first deploy. ON CONFLICT DO NOTHING makes a rerun a no-op.
//    A timed ban marks nothing: a cooling-off is not a verdict on the machine.
//
// The numbers below are the conservative defaults the ADR states; keep them equal to
// abuse-defense.constants.ts (a spec compares the two).

const SETTING_DEFAULTS = Object.freeze({
  'security.abuse.autoSuspendEnabled': 'true',
  'security.abuse.windowMinutes': '15',
  'security.abuse.rateLimitTrips': '300',
  'security.abuse.forbiddenProbes': '200',
  'security.abuse.ssrfRefusals': '10',
  'security.abuse.firstSuspensionMinutes': '60',
  'security.abuse.secondSuspensionMinutes': '1440',
  'security.abuse.thirdSuspensionMinutes': '10080',
  'security.abuse.escalationWindowDays': '30',
});

const BACKFILL_REASON = 'BACKFILL_LIFETIME_BAN';

const BACKFILL_SQL = (kind, column) => `
  INSERT INTO "banned_device_marks" ("id", "hash_kind", "hash_value", "source_user_id", "reason_code", "created_at")
  SELECT gen_random_uuid()::text, '${kind}', d."${column}", u."id", '${BACKFILL_REASON}', NOW()
  FROM "user_devices" d
  JOIN "users" u ON u."id" = d."user_id"
  WHERE u."banned_at" IS NOT NULL AND u."banned_until" IS NULL
  ON CONFLICT ("hash_kind", "hash_value", "source_user_id") DO NOTHING`;

async function run(prisma) {
  const created = await prisma.systemSetting.createMany({
    data: Object.entries(SETTING_DEFAULTS).map(([key, value]) => ({ key, value })),
    skipDuplicates: true,
  });
  const fingerprintMarks = await prisma.$executeRawUnsafe(
    BACKFILL_SQL('FINGERPRINT', 'fingerprint_hash'),
  );
  const deviceIdMarks = await prisma.$executeRawUnsafe(BACKFILL_SQL('DEVICE_ID', 'device_id_hash'));
  console.warn(
    `[seed] abuse-defense: settings=${created.count} fingerprintMarks=${fingerprintMarks} deviceIdMarks=${deviceIdMarks}`,
  );
  return { settings: created.count, fingerprintMarks, deviceIdMarks };
}

module.exports = {
  name: 'abuse-defense',
  version: 1,
  payload: { settings: SETTING_DEFAULTS, backfillReason: BACKFILL_REASON },
  run,
  SETTING_DEFAULTS,
  BACKFILL_REASON,
};
