/** Letters, digits and combining marks: what makes two characters part of one word. */
export const CUE_WORD_CHARS = String.raw`\p{L}\p{N}\p{M}`;

/** A cue must start where a word starts ("assegna" does not contain the word "segna"). */
export const CUE_LEFT_BOUNDARY = `(?<![${CUE_WORD_CHARS}])`;

/** A whole-word cue must also end where a word ends ("segna" is not "segnale"). */
export const CUE_RIGHT_BOUNDARY = `(?![${CUE_WORD_CHARS}])`;

/** A cue written with this last character must match a whole word. */
export const CUE_WHOLE_WORD_MARK = '$';

/**
 * Arabic and Persian glue one-letter conjunctions and the article onto the word
 * ("واحفظ", "بالذاكرة"), so a left boundary may sit before them. Written in the
 * folded form (`normalizeForCues` turns kaf into the Persian kaf).
 */
export const CUE_ARABIC_PREFIX = '(?:وال|بال|ال|[وفبکل])?';

/** Start of the message, or right after punctuation or a space. */
export const CUE_ANCHOR = String.raw`(?:^|[\p{P}\p{Z}\s])`;

/** Chinese, Japanese and Thai are written without spaces between words. */
export const CUE_UNSPACED_SCRIPT = /[฀-๿぀-ヿ㐀-鿿ｦ-ﾟ]/u;

export const CUE_ARABIC_SCRIPT = /[؀-ۿ]/u;

/** Trailing punctuation and space allowed after a whole-message command. */
export const CUE_MESSAGE_TAIL = String.raw`[\s\p{P}]*$`;

/** How many DIFFERENT generic words must appear before they count as a save request. */
export const CUE_WEAK_MIN_DISTINCT = 2;
