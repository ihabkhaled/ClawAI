// Native Gemini generateContent + Files API request shapes. See
// https://ai.google.dev/api/rest/v1beta/models/generateContent and
// https://ai.google.dev/api/rest/v1beta/files for the wire formats.
//
// A content part is either inline text, inline base64 bytes (`inline_data`),
// or a reference to a previously-uploaded file (`file_data`). Files API
// entries persist for 48h on Google's side; we cache the URI for half that
// window to be safe.

export type GeminiTextPart = {
  text: string;
};

export type GeminiInlineDataPart = {
  inline_data: {
    mime_type: string;
    data: string;
  };
};

export type GeminiFileDataPart = {
  file_data: {
    mime_type: string;
    file_uri: string;
  };
};

export type GeminiContentPart = GeminiTextPart | GeminiInlineDataPart | GeminiFileDataPart;

export type GeminiContent = {
  role: string;
  parts: GeminiContentPart[];
};

export type GeminiRequestBody = {
  contents: GeminiContent[];
  systemInstruction?: { parts: GeminiTextPart[] };
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
  };
};

export type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      role?: string;
      parts?: Array<{ text?: string }>;
    };
    finishReason?: string;
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
};

// Result of a single Files API upload — file_uri is the canonical reference
// the generateContent endpoint uses; expiresAt is filled from server response
// when available, else from the configured TTL.
export type GeminiFilesApiUploadResult = {
  fileUri: string;
  fileName?: string;
  state?: GeminiFileState;
  expiresAt: Date;
  sizeBytes: number;
  mimeType: string;
};

export type GeminiFileState = 'STATE_UNSPECIFIED' | 'PROCESSING' | 'ACTIVE' | 'FAILED';

// Internal cache entry used by GeminiFilesApiManager.
export type GeminiFilesApiCacheEntry = {
  fileUri: string;
  uploadedAt: Date;
  expiresAt: Date;
  sizeBytes: number;
  mimeType: string;
};

// Signature of the file-upload function callers inject into the request
// builder. Returns the canonical `file_uri` to be referenced in a file_data
// part. Implementations may cache and throttle uploads.
export type GeminiFileUploadFn = (data: Buffer, mimeType: string) => Promise<string>;

export type GeminiRequestShapeWarningReason =
  'MALFORMED_DATA_URL' | 'NON_DATA_URL_IMAGE' | 'EMPTY_IMAGE_PAYLOAD';

export type GeminiRequestShapeWarning = {
  reason: GeminiRequestShapeWarningReason;
  detail: string;
};

export type GeminiRequestBuildResult = {
  body: GeminiRequestBody;
  inlineCount: number;
  fileDataCount: number;
  warnings: GeminiRequestShapeWarning[];
};

// Internal per-message transform result.
export type GeminiTransformedMessage = {
  content: GeminiContent;
  inlineDelta: number;
  fileDataDelta: number;
  inlineBytesDelta: number;
};

// Internal per-part transform result.
export type GeminiBuiltPart = {
  part: GeminiContentPart;
  inlineDelta: number;
  fileDataDelta: number;
  inlineBytesDelta: number;
};

// Internal "system-vs-conversation" partition shape.
export type GeminiSystemTextFilter = { type: 'text'; text: string };

// Native Gemini Files API response shapes. Documented at
// https://ai.google.dev/api/rest/v1beta/files#File — the manager only reads
// Upload responses wrap the resource in `file`; GET returns it top-level.
export type GeminiFileResource = {
  uri?: string;
  name?: string;
  sizeBytes?: string | number;
  mimeType?: string;
  expirationTime?: string;
  state?: GeminiFileState;
  error?: { message?: string };
};

export type GeminiFilesApiResponseBody = {
  file?: GeminiFileResource;
  error?: { message?: string; status?: string };
};
