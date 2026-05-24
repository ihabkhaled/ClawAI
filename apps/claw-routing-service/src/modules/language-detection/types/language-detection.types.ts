// SCAFFOLD: stream R.7 (08-r7-i18n-non-english)

export type LanguageDetectionResult = {
  detectedLanguage: string;       // ISO-639-1, e.g. 'en', 'ar', 'es'
  languageConfidence: number;     // 0..1
  isCodeMixed: boolean;
  secondaryLanguage?: string;
  secondaryConfidence?: number;
  isRtl: boolean;
};

export type LanguageStrength = Record<string, number>;  // { en: 1.0, ar: 0.92, ... }
