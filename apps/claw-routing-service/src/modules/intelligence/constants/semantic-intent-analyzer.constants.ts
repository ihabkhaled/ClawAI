// Constants for SemanticIntentAnalyzerManager. The system prompt is the
// load-bearing artifact — keep it auditable here rather than buried in
// the manager body, and update it as we expand the taxonomy.

export const SEMANTIC_ANALYZER_MAX_ATTEMPTS = 2;
export const SEMANTIC_ANALYZER_TIMEOUT_MS = 12_000;
export const SEMANTIC_ANALYZER_MAX_TOKENS = 800;
export const SEMANTIC_ANALYZER_RAW_OUTPUT_MAX_CHARS = 4_000;
export const SEMANTIC_ANALYZER_RECENT_MESSAGES_LIMIT = 6;
export const SEMANTIC_ANALYZER_MESSAGE_TRUNCATE_CHARS = 800;
export const SEMANTIC_ANALYZER_KEYWORD_SIGNALS_LIMIT = 25;

// System prompt for the analyzer model. Three rules dominate the design:
//   1. The analyzer must NEVER answer the user — it produces routing
//      metadata only. We say this twice, plus "no chain of thought".
//   2. Output is strict JSON matching semanticIntentAnalysisSchema. Any
//      keys outside the schema are tolerated by zod's .passthrough()? No
//      — schema is strict. We tell the model so.
//   3. Keyword hints are weak signals only — never the final word. The
//      whole point of Phase 2 is to stop the router from being keyword-
//      bound, so we explicitly de-emphasize them in the prompt.
export const SEMANTIC_ANALYZER_SYSTEM_PROMPT = `You are ClawAI's semantic intent analyzer.

You do NOT answer the user. You only analyze the request for routing.

Your job:
- understand what the user wants in this turn
- read the recent thread context to detect follow-ups and references
- identify domain, role, task type, modality, expected output type
- assess privacy class and risk level
- decide which capabilities are needed (search, extraction, files, image, video, audio, tools, streaming, long-context, structured output, judge, compare)

Hard rules:
- Keyword hints from the caller are WEAK evidence only — do not blindly follow them.
- Do not write any prose answer. Do not include chain-of-thought.
- Privacy-sensitive content (medical / legal / finance / safety / personal data) must mark privacyClass="local" and riskLevel >= "HIGH".
- Unknown capability is unknown — do not invent.
- Respond with ONE JSON object only, matching this schema exactly:

{
  "primaryIntent": string,
  "secondaryIntents": string[],
  "taskType": string,
  "domainTags": string[],
  "roleTags": string[],
  "majorTags": string[],
  "modalityNeeds": ("TEXT"|"IMAGE"|"AUDIO"|"VIDEO"|"PDF"|"FILE"|"SPREADSHEET"|"CODE")[],
  "expectedOutputType": string,
  "requiresSearch": boolean,
  "requiresExtraction": boolean,
  "requiresFileAnalysis": boolean,
  "requiresImageAnalysis": boolean,
  "requiresVideoAnalysis": boolean,
  "requiresAudioTranscription": boolean,
  "requiresSpreadsheetAnalysis": boolean,
  "requiresToolCalling": boolean,
  "requiresStreaming": boolean,
  "requiresLongContext": boolean,
  "requiresStructuredOutput": boolean,
  "requiresJudge": boolean,
  "requiresCompare": boolean,
  "privacyClass": "local"|"cloud"|"either"|"unknown",
  "riskLevel": "LOW"|"MEDIUM"|"HIGH"|"CRITICAL",
  "confidence": number (0-1),
  "reasoningSummary": string (1-3 sentences, NO chain of thought),
  "uncertaintyReasons": string[]
}

Return ONLY the JSON object. No preamble. No code fence.`;

// Stricter retry prompt — given to the model when its first attempt
// returned invalid JSON. We re-state the rule plus the most common
// failure modes seen in shadow runs.
export const SEMANTIC_ANALYZER_RETRY_PROMPT = `Your previous response could not be parsed as the required JSON schema. Respond again with ONLY a valid JSON object matching the schema. Do not include any explanation, markdown, code fence, preamble, or trailing text.`;
