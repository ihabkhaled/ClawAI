import {
  IMAGE_EDIT_PATTERNS,
  IMAGE_INTENT_COMBO_WINDOW,
  IMAGE_INTENT_DOCUMENT_FORMAT,
  IMAGE_INTENT_POLITE_PREFIX,
  IMAGE_INTENT_POLITE_PREFIX_PASSES,
  IMAGE_MIME_TYPE_PREFIX,
  IMAGE_QUESTION_MARKS,
  IMAGE_QUESTION_START,
  NO_IMAGE_SIGNALS,
} from './image-intent.constants';
import {
  IMAGE_GENERATION_ART_STYLES,
  IMAGE_GENERATION_KEYWORDS,
  IMAGE_GENERATION_REFERENCE_NOUNS,
  IMAGE_GENERATION_REFERENCE_VERBS,
  IMAGE_GENERATION_STRONG_NOUNS,
  IMAGE_GENERATION_VERBS,
  IMAGE_GENERATION_WORDS,
} from './image-generation-keywords.constants';
import { generationRequestText } from '../generation-request/generation-request.utility';
import {
  containsAnyImageTerm,
  hasTermPairWithin,
  isExplicitImageRequest,
  isSupplementOrWritingText,
  normaliseImageText,
} from './image-term-match.utility';
import { type ImageGenerationSignals } from './image-intent.types';
import { MultimodalImageIntent } from './multimodal-image-intent.enum';

/**
 * Which image-GENERATION signals a message carries. Lowercase substring
 * matching, exactly as routing-service's `ImageDetectionManager` always did —
 * that manager now delegates here, so there is one table.
 */
export function detectImageGenerationSignals(message: string): ImageGenerationSignals {
  // Only the part that can be a request: no negated clauses ("do not
  // generate an image"), no pasted-document body, nothing for a "save this
  // as memory" command. A pasted context pack generated an image before.
  const lower = normaliseImageText(generationRequestText(message));
  if (isSupplementOrWritingText(lower)) {
    // "Say also talk to models with audio/video, create files … 1-2 words each"
    // is material for a post, not a drawing request; so is "write a post about
    // our logo". Only an unmistakable request counts here.
    const explicit = isExplicitImageRequest(lower);
    return { ...NO_IMAGE_SIGNALS, matched: explicit, verbPlusImageWord: explicit };
  }
  const has = (words: readonly string[]): boolean => containsAnyImageTerm(lower, words);
  const exactKeyword = has(IMAGE_GENERATION_KEYWORDS);
  const verbPlusImageWord = hasTermPairWithin(
    lower,
    IMAGE_GENERATION_VERBS,
    IMAGE_GENERATION_WORDS,
    IMAGE_INTENT_COMBO_WINDOW,
  );
  const strongImageNoun =
    has(IMAGE_GENERATION_STRONG_NOUNS) &&
    (has(IMAGE_GENERATION_WORDS) || has(IMAGE_GENERATION_VERBS));
  const artStyle = has(IMAGE_GENERATION_ART_STYLES);
  const reference = has(IMAGE_GENERATION_REFERENCE_VERBS) && has(IMAGE_GENERATION_REFERENCE_NOUNS);
  return {
    matched: exactKeyword || verbPlusImageWord || strongImageNoun || artStyle || reference,
    exactKeyword,
    verbPlusImageWord,
    strongImageNoun,
    artStyle,
    reference,
  };
}

/** True when any attachment mime type is an image. */
export function hasAttachedImageMime(mimeTypes: readonly string[] | undefined): boolean {
  return (mimeTypes ?? []).some((mime) =>
    mime.trim().toLowerCase().startsWith(IMAGE_MIME_TYPE_PREFIX),
  );
}

/**
 * GENERATE / EDIT / ANALYZE / NONE for one message (pack §10/§81/§88).
 *
 * Without an attached image the answer is GENERATE exactly when the
 * generation tables match, otherwise NONE — the behaviour routing always had.
 * With one:
 * 1. a document format → ANALYZE (a file job, never an image edit);
 * 2. an edit instruction at the start → EDIT, even phrased as a question;
 * 3. a question → ANALYZE ("what is this?", "how do I remove the background?");
 * 4. an edit instruction anywhere, or a generation request → EDIT (the
 *    attachment becomes the reference);
 * 5. anything else → ANALYZE.
 */
export function classifyImageIntent(
  message: string,
  hasAttachedImage: boolean,
): MultimodalImageIntent {
  const text = message.trim().toLowerCase().replaceAll(/\s+/gu, ' ');
  if (!hasAttachedImage) {
    // The raw message, exactly as routing always scanned it.
    return text.length > 0 && detectImageGenerationSignals(message).matched
      ? MultimodalImageIntent.GENERATE
      : MultimodalImageIntent.NONE;
  }
  if (IMAGE_INTENT_DOCUMENT_FORMAT.test(text)) return MultimodalImageIntent.ANALYZE;
  let request = text;
  for (let pass = 0; pass < IMAGE_INTENT_POLITE_PREFIX_PASSES; pass += 1) {
    request = request.replace(IMAGE_INTENT_POLITE_PREFIX, '');
  }
  const editAt = firstEditMatchIndex(request);
  if (editAt === 0) return MultimodalImageIntent.EDIT;
  if (isQuestion(request)) return MultimodalImageIntent.ANALYZE;
  return editAt !== undefined || detectImageGenerationSignals(request).matched
    ? MultimodalImageIntent.EDIT
    : MultimodalImageIntent.ANALYZE;
}

/** Where the earliest edit instruction starts, or undefined when none does. */
function firstEditMatchIndex(text: string): number | undefined {
  const indexes = IMAGE_EDIT_PATTERNS.map((pattern) => pattern.exec(text)?.index).filter(
    (index): index is number => index !== undefined,
  );
  return indexes.length === 0 ? undefined : Math.min(...indexes);
}

function isQuestion(text: string): boolean {
  return (
    IMAGE_QUESTION_START.test(text) || IMAGE_QUESTION_MARKS.some((mark) => text.includes(mark))
  );
}
