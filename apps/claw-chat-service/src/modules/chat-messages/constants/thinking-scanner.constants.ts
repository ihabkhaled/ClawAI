// Model-emitted reasoning tags recognized by the streaming scanner. Matched
// case-insensitively. These are VISIBLE thinking blocks the model itself
// writes (e.g. DeepSeek-R1 / qwen <think>), not hidden chain-of-thought.
export const THINKING_OPEN_TAGS = ['<think>', '<thinking>', '<reasoning>', '<thought>'] as const;

export const THINKING_CLOSE_TAGS = [
  '</think>',
  '</thinking>',
  '</reasoning>',
  '</thought>',
] as const;

// Longest recognized tag is '</reasoning>' (12 chars). A trailing buffer can
// never exceed this while still being a possible partial-tag prefix.
export const THINKING_MAX_TAG_LENGTH = 12;

// A tag written right after this character is being QUOTED in inline code
// ("ends with `</think>`"), not closing a reasoning block.
export const THINKING_INLINE_CODE_MARK = '`';

// How much answer text a TRUE stream holds back at its start while it cannot
// yet tell answer from reasoning (rule 56). GLM-style output starts inside
// the reasoning with no opening tag; only a later bare `</think>` (or a
// reasoning FIELD delta) proves it. Until one of: a closing tag, an opening
// tag, a reasoning-field delta, the end of the stream, or this many chars —
// nothing is emitted as answer. 512 chars is ~128 tokens: well under 2 s of
// first-token delay at ordinary speeds, and it covers the short "notes to
// self" GLM writes before a reply. Longer reasoning past the bound is still
// kept out of the STORED answer by the end-of-stream re-split.
// Not "until the first blank line": GLM reasoning spans paragraphs, so that
// release point would leak exactly the text this hold exists for.
export const THINKING_STREAM_HOLD_MAX_CHARS = 512;

// Joins reasoning recovered from more than one place in one response.
export const THINKING_REASONING_SEPARATOR = '\n\n';
