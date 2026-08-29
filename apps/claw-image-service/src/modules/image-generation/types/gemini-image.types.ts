export type GeminiInlineData = {
  mimeType: string;
  data: string;
};

export type GeminiPart = {
  text?: string;
  inlineData?: GeminiInlineData;
};

export type GeminiContent = {
  parts: GeminiPart[];
};

export type GeminiCandidate = {
  content: GeminiContent;
};

export type GeminiGenerateContentRequest = {
  contents: Array<{ parts: GeminiPart[] }>;
  generationConfig: { responseModalities: string[] };
  systemInstruction?: { parts: Array<{ text: string }> };
};

/**
 * Gemini's per-call token accounting, returned on `:generateContent` for image
 * requests exactly as it is for text ones.
 *
 * Declared here rather than read off an `unknown` so the shape is documented at
 * the boundary. `extractGeminiUsage` still does the reading and the clamping —
 * notably that `thoughtsTokenCount` is NOT included in `candidatesTokenCount`
 * and has to be added back, and that `cachedContentTokenCount` IS already inside
 * `promptTokenCount`.
 */
export type GeminiUsageMetadata = {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  cachedContentTokenCount?: number;
  thoughtsTokenCount?: number;
  totalTokenCount?: number;
};

export type GeminiGenerateContentResponse = {
  candidates?: GeminiCandidate[];
  usageMetadata?: GeminiUsageMetadata;
};
