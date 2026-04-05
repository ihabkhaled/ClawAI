-- CreateEnum
CREATE TYPE "UserLanguagePreference" AS ENUM ('EN', 'AR', 'FR', 'IT', 'DE', 'ES', 'RU', 'PT');

-- CreateEnum
CREATE TYPE "UserAppearancePreference" AS ENUM ('SYSTEM', 'LIGHT', 'DARK');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "appearance_preference" "UserAppearancePreference" NOT NULL DEFAULT 'SYSTEM',
ADD COLUMN     "language_preference" "UserLanguagePreference" NOT NULL DEFAULT 'EN';
