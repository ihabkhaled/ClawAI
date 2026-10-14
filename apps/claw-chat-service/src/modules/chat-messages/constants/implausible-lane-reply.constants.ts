/** A prompt at least this long is a real question, not a one-word exchange. */
export const LANE_LONG_PROMPT_MIN_CHARS = 200;

/** A reply this short (about one token) cannot answer a long prompt. */
export const LANE_IMPLAUSIBLY_SHORT_REPLY_MAX_CHARS = 5;

export const LANE_IMPLAUSIBLY_SHORT_REPLY_CODE = 'LANE_REPLY_IMPLAUSIBLY_SHORT';

export const LANE_IMPLAUSIBLY_SHORT_REPLY_MESSAGE =
  'This model returned only a fragment instead of an answer. Try it again.';

/**
 * Phrases (lower-case) that ask for a deliberately short answer. A prompt that
 * contains one is allowed a one-word reply (round-3 N-2: "reply with the single
 * word OK"). en, ar, de, es, fr, ja, zh.
 */
export const SHORT_ANSWER_REQUEST_CUES: readonly string[] = [
  'single word',
  'one word',
  'one-word',
  'a word only',
  'yes or no',
  'yes/no',
  'only answer',
  'answer only',
  'just say',
  'reply with only',
  'كلمة واحدة',
  'بكلمة',
  'نعم أو لا',
  'نعم او لا',
  'ein wort',
  'einem wort',
  'ja oder nein',
  'nur mit',
  'una palabra',
  'una sola palabra',
  'sí o no',
  'si o no',
  'un mot',
  'un seul mot',
  'oui ou non',
  'répondez uniquement',
  'reponds uniquement',
  '一言',
  '一語',
  '一単語',
  'はいかいいえ',
  'はい か いいえ',
  '一个字',
  '一个词',
  '一个单词',
  '是或否',
  '是还是不是',
  '只回答',
  '只回复',
];
