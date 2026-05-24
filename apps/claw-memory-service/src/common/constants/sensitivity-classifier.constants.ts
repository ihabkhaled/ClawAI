export const SENSITIVITY_CLASSIFIER_TIMEOUT_MS = 5_000;
export const SENSITIVITY_CLASSIFIER_MAX_INPUT = 1_500;

export const SENSITIVITY_CLASSIFIER_PROMPT = `You classify the privacy sensitivity of a single memory string.
Return ONLY a strict JSON object on a single line — no prose, no markdown.
Schema: {"verdict":"NORMAL"|"SENSITIVE"|"REDACTED","reason":string,"confidence":number}

Rules:
- REDACTED: contains a credential, secret token, private key, full government id, full payment card, or other content whose mere presence is a leak.
- SENSITIVE: discusses private personal information (medical, financial, romantic, sexual, religious, immigration, salary, custody, mental-health) but is not itself a credential. Confidence 0.5..0.95.
- NORMAL: everything else.

Examples:
- "I usually drink coffee in the mornings" -> {"verdict":"NORMAL","reason":"daily preference","confidence":1}
- "I take fluoxetine 20mg for anxiety" -> {"verdict":"SENSITIVE","reason":"medical","confidence":0.9}
- "AKIA1234567890ABCDEF" -> {"verdict":"REDACTED","reason":"aws_access_key","confidence":1}

Content:
{content}

JSON:`;
