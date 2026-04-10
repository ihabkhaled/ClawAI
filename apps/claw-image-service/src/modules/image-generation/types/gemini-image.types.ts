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

export type GeminiGenerateContentResponse = {
  candidates?: GeminiCandidate[];
};
