/**
 * Patterns for `classifyImageIntent`. Deterministic on purpose: no LLM call
 * decides whether an attached image is edited or described.
 *
 * Every word pattern uses Unicode letter lookarounds instead of `\b`, because
 * JavaScript's `\b` is ASCII-only and would never fire around "qué" or Arabic.
 * Add a case to `image-intent.utility.spec.ts` with every new word — a
 * "stays ANALYZE" case first when the word is also ordinary conversation.
 */

/**
 * One courtesy word stripped before looking at how the request starts. Applied
 * `IMAGE_INTENT_POLITE_PREFIX_PASSES` times ("please can you …") instead of a
 * nested quantifier, which would be a backtracking hazard.
 */
export const IMAGE_INTENT_POLITE_PREFIX =
  /^(?:please|pls|kindly|can you|could you|would you|will you|can u|por favor|puedes|podrías|من فضلك|لو سمحت|ممكن)[\s,]+/u;
export const IMAGE_INTENT_POLITE_PREFIX_PASSES = 2;

/**
 * Edit instructions. Matching one at the START of the (courtesy-stripped)
 * request is an imperative and wins even when the sentence ends in "?"
 * ("can you remove the background?"); matching one later counts only when the
 * message is not a question.
 */
export const IMAGE_EDIT_PATTERNS: readonly RegExp[] = [
  // en — remove / erase something
  /(?<![\p{L}\p{N}])(?:remov(?:e|ed|ing)|eras(?:e|ed|ing)|delete|get rid of|cut out|clean up)(?![\p{L}\p{N}])/u,
  // en — add something ("add a hat", "put sunglasses on him")
  /(?<![\p{L}\p{N}])(?:add|put|place|insert)\s+(?:a|an|some|more|the|text|sunglasses|glasses|snow|rain|color|colour)(?![\p{L}\p{N}])/u,
  // en — "make it blue", "make the sky purple", "make him look older"
  /(?<![\p{L}\p{N}])make\s+(?:it|this|that|him|her|them|me|us|everything|the\s+[\p{L}]+)\s+[\p{L}]+/u,
  // en — "turn it into a watercolor", "turn the car red"
  /(?<![\p{L}\p{N}])turn\s+(?:it|this|that|him|her|them|me|us|the\s+[\p{L}]+)\s+[\p{L}]+/u,
  // en — change / replace / swap something named
  /(?<![\p{L}\p{N}])(?:change|replace|swap)\s+(?:the|his|her|its|their|this|that|it|them)(?![\p{L}\p{N}])/u,
  // en — single-verb photo edits
  /(?<![\p{L}\p{N}])(?:recolou?r|repaint|colou?ri[sz]e|blur|sharpen|crop|upscale|enhance|restore|retouch|brighten|darken|inpaint|outpaint|edit|modify)(?![\p{L}\p{N}])/u,
  // en — the reference phrases chat-service used to keep as IMAGE_INTENT_PHRASES
  /(?<![\p{L}\p{N}])(?:similar|like this|like the attached|looks like this|recreate|reproduce|remake|replicate|imitate|same style|style of this|same kind|same type|version of this|based on this|inspired by|variation|same as this|another like this|one more like|(?:modify|edit|change|transform|convert|make|redo) this)(?![\p{L}\p{N}])/u,
  // es
  /(?<![\p{L}\p{N}])(?:quita|quitar|quítale|elimina|eliminar|borra|borrar|añade|añadir|agrega|agregar|ponle|cambia|cambiar|reemplaza|haz(?:lo|la|los|las)|conviértel[oa]|conviérte(?:lo|la))(?![\p{L}\p{N}])/u,
  // fr / de (cheap, common)
  /(?<![\p{L}\p{N}])(?:enlève|supprime|ajoute|rends-le|rends-la|entferne|füge|mach es|mache es)(?![\p{L}\p{N}])/u,
  // ar — delete/remove, add, change, make, turn into
  /(?<![\p{L}\p{N}])(?:احذف|أزل|ازل|امسح|أضف|اضف|ضع|غيّر|غير لون|اجعل|اجعله|اجعلها|حوّل|حول الصورة)(?![\p{L}\p{N}])/u,
];

/** The request opens as a question or asks to read/explain the image. */
export const IMAGE_QUESTION_START =
  /^(?:what|what's|whats|who|whom|whose|which|where|when|why|how|is|are|was|were|does|do|did|describe|explain|identify|tell me|read|translate|extract|transcribe|summari[sz]e|analy[sz]e|count|list|qué|que|quién|cuál|cómo|dónde|por qué|describe|explica|qu'est-ce|was ist|ما|ماذا|من|أين|اين|لماذا|كيف|هل|صف|اشرح)(?![\p{L}\p{N}])/u;

/** Any of these marks makes the message a question. */
export const IMAGE_QUESTION_MARKS: readonly string[] = ['?', '¿', '؟'];

/**
 * A document format in the request makes it a FILE job (rule 51 items 8/12),
 * never an image edit: "convert this to a PDF" must not be read as "convert
 * this" the image.
 */
export const IMAGE_INTENT_DOCUMENT_FORMAT =
  /(?<![\p{L}\p{N}])(?:pdf|docx?|xlsx?|csv|pptx?|txt|json|markdown|spreadsheet|excel|word document)(?![\p{L}\p{N}])/u;

/** An attachment is an image when its mime type starts with this. */
export const IMAGE_MIME_TYPE_PREFIX = 'image/';
