-- Add Hindi (HI) to the UserLanguagePreference enum. The frontend already
-- offered Hindi as a locale and the language switcher sent "HI", which the
-- auth service rejected with a 400 because this Postgres enum lacked the
-- value. This backfills the missing value so a user's Hindi selection can
-- persist server-side.
ALTER TYPE "UserLanguagePreference" ADD VALUE IF NOT EXISTS 'HI';
