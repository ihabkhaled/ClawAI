-- Extend the existing preference enum in place. Existing rows and the EN
-- default remain unchanged.
ALTER TYPE "UserLanguagePreference" ADD VALUE IF NOT EXISTS 'JA';
ALTER TYPE "UserLanguagePreference" ADD VALUE IF NOT EXISTS 'TH';
ALTER TYPE "UserLanguagePreference" ADD VALUE IF NOT EXISTS 'FA';
ALTER TYPE "UserLanguagePreference" ADD VALUE IF NOT EXISTS 'ZH';
