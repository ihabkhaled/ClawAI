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

// Joins reasoning recovered from more than one place in one response.
export const THINKING_REASONING_SEPARATOR = '\n\n';
