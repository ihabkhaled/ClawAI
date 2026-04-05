import { z } from "zod";
import { UserAppearancePreference, UserLanguagePreference } from "../../../generated/prisma";

export const updatePreferencesSchema = z.object({
  languagePreference: z.nativeEnum(UserLanguagePreference).optional(),
  appearancePreference: z.nativeEnum(UserAppearancePreference).optional(),
}).refine(
  (data) => data.languagePreference !== undefined || data.appearancePreference !== undefined,
  { message: "At least one preference must be provided" },
);

export type UpdatePreferencesDto = z.infer<typeof updatePreferencesSchema>;
