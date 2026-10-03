/**
 * Words that make a sentence a MENTION of generation rather than a request for
 * it (2026-10-03). A LinkedIn-post brief that said "Say also … create files,
 * documents, pdf, docx … create videos, create images" generated a txt file:
 * every detector matched the verbs in a feature list the user was only
 * describing. A request is a sentence that ASKS the assistant to make
 * something; everything else is material.
 *
 * Covered: en ar fr es de directly, plus the common verbs of it pt ru zh ja hi
 * fa th. Latin stems are matched at a word start; other scripts as substrings.
 */

/** A sentence ends at ! ? and at a lone dot before space — never at an ellipsis. */
export const MENTION_SENTENCE_SPLIT = /(?<!\.)\.(?!\.)(?=\s|$)|[!?؟。！？।]|\n/u;

/** A bullet or numbered marker opening a line. */
export const MENTION_LIST_MARKER = /^\s*(?:[-*•–—]|\d{1,3}[.)])\s+/u;

const LATIN_VERB_STEMS: readonly string[] = [
  // en
  'creat',
  'generat',
  'produc',
  'mak(?:e|es|ing)\\b',
  'draw',
  'design',
  'render',
  'build',
  'compos',
  'prepar',
  'export',
  'convert',
  // fr
  'cré',
  'crée',
  'génèr',
  'génér',
  'produi',
  'dessin',
  'fais',
  'faire',
  'rédig',
  // es
  'cre(?:a|ar|e|es|ando)\\b',
  'gener',
  'hac(?:er|e|es)\\b',
  'dibuj',
  'diseñ',
  'elabor',
  // de
  'erstell',
  'generier',
  'zeichn',
  'erzeug',
  'mach(?:e|en|st)\\b',
  'entwirf',
  'entwerf',
  // it / pt
  'crea(?:re|)\\b',
  'genera(?:re|)\\b',
  'disegn',
  'cria(?:r|)\\b',
  'gera(?:r|)\\b',
  'desenh',
];

const OTHER_SCRIPT_VERBS: readonly string[] = [
  // ar
  'إنشاء',
  'انشاء',
  'أنشئ',
  'انشئ',
  'اصنع',
  'صنع',
  'ولد',
  'توليد',
  'ارسم',
  'صمم',
  'اعمل',
  'عمل',
  'أنشيء',
  // fa
  'بساز',
  'ایجاد',
  'تولید',
  // ru
  'созда',
  'сгенерир',
  'нарису',
  'сделай',
  // zh / ja
  '创建',
  '生成',
  '制作',
  '制作',
  '作成',
  '作って',
  '描いて',
  // hi / th
  'बनाओ',
  'बनाएं',
  'तैयार',
  'สร้าง',
];

/** Any generation verb (all scripts), global so every occurrence can be counted. */
export const MENTION_GENERATION_VERB = new RegExp(
  `(?<![\\p{L}\\p{N}])(?:${LATIN_VERB_STEMS.join('|')})|(?:${OTHER_SCRIPT_VERBS.join('|')})`,
  'gu',
);

/**
 * A sentence that opens by ADDING material to a task, in every UI language:
 * "say also …", "additional context: …", "dis aussi …", "añade también …".
 */
export const MENTION_OPENERS: readonly RegExp[] = [
  /^(?:ok(?:ay)?[\s,]+)?(?:and\s+)?(?:say\s+|mention\s+|tell\s+them\s+)?(?:also|plus|additionally|in addition|moreover|furthermore)(?![\p{L}\p{N}])/u,
  /^(?:here(?:'s| is| are)\s+)?(?:some\s+)?(?:more|additional|extra|further|supplementary|background)\s+(?:context|info|information|details|notes|points|instructions|input)(?![\p{L}\p{N}])/u,
  /^(?:context|additional context|more context|extra context|background|notes?|fyi|btw|by the way)\s*[:\-—]/u,
  /^(?:fyi|btw|by the way|one more thing|another thing|don't forget|do not forget|remember to|make sure to|keep in mind)(?![\p{L}\p{N}])/u,
  /^(?:add|include|mention|list|put|say|note|highlight|cover|talk about|write about)\s+(?:also|more|another|a few|\d+)(?![\p{L}\p{N}])/u,
  /^(?:mention|say|tell them|highlight|emphasi[sz]e|talk about)\s+(?:that|how|the fact)(?![\p{L}\p{N}])/u,
  // fr
  /^(?:dis|ajoute|mentionne|précise|note|indique)(?:-moi)?\s+(?:aussi|également|en plus|que|encore)(?![\p{L}\p{N}])/u,
  /^(?:et\s+)?(?:aussi|également|en plus|de plus|par ailleurs)(?![\p{L}\p{N}])/u,
  /^(?:contexte(?:\s+supplémentaire)?|informations?\s+supplémentaires?|pour\s+info|au\s+fait)\s*[:\-—]?/u,
  // es
  /^(?:di|añade|agrega|menciona|incluye|anota)\s+(?:también|además|que|otra)(?![\p{L}\p{N}])/u,
  /^(?:y\s+)?(?:también|además|por\s+cierto)(?![\p{L}\p{N}])/u,
  /^(?:contexto(?:\s+adicional)?|información\s+adicional|nota)\s*[:\-—]/u,
  // de
  /^(?:sag|sage|erwähne|ergänze|füge)\s+(?:auch|außerdem|zusätzlich|noch|dass)(?![\p{L}\p{N}])/u,
  /^(?:und\s+)?(?:außerdem|zusätzlich|übrigens|ebenfalls|auch)(?![\p{L}\p{N}])/u,
  /^(?:zusätzlicher\s+kontext|mehr\s+kontext|kontext|hinweis)\s*[:\-—]/u,
  // ar
  /^(?:و)?(?:قل|اذكر|أضف|اضف|أخبرهم|وضح)\s+(?:أيضا|أيضًا|ايضا|كذلك|أن|ان|بأن)/u,
  /^(?:و)?(?:أيضا|أيضًا|ايضا|كذلك|بالإضافة|علاوة)/u,
  /^(?:سياق إضافي|معلومات إضافية|ملاحظة|للعلم)\s*[:\-—]/u,
];

/**
 * A cue that what follows DESCRIBES abilities or features instead of ordering
 * them: "our app can create files", "including videos", "supports creating
 * images". "can you / could you / would you" are requests and never match.
 */
export const MENTION_CUES: readonly RegExp[] = [
  /(?<=[\p{L}\p{N}]\s)(?:can|could|will|would|may|might|should)(?![\p{L}\p{N}])(?!\s+(?:you|u|ya|please|i|we|someone|somebody|anyone)(?![\p{L}\p{N}]))/u,
  /(?<![\p{L}\p{N}])(?:able\s+to|capable\s+of|ability\s+to|abilities|capabilit(?:y|ies)|lets?\s+you|allows?\s+you|allow\s+users|supports?|support\s+for|including|includes?|such\s+as|features?|e\.g\.|for\s+example|for\s+instance|how\s+to|talks?\s+to|chat\s+with|users\s+can|offers?|provides?)(?![\p{L}\p{N}])/u,
  // fr
  /(?<![\p{L}\p{N}])(?:peut|peuvent|capable\s+de|permet\s+de|permettent\s+de|y\s+compris|comme|notamment|par\s+exemple|propose|supporte|fonctionnalités?)(?![\p{L}\p{N}])/u,
  // es
  /(?<![\p{L}\p{N}])(?:puede|pueden|capaz\s+de|permite|incluyendo|incluye|como|por\s+ejemplo|soporta|funciones?|características)(?![\p{L}\p{N}])/u,
  // de
  /(?<![\p{L}\p{N}])(?:kann|können|fähig|ermöglicht|einschließlich|inklusive|wie|zum\s+beispiel|unterstützt|funktionen?|bietet)(?![\p{L}\p{N}])/u,
  // ar
  /(?:يمكن|يستطيع|تستطيع\s+المنصة|قادر|يدعم|بما\s+في\s+ذلك|مثل|ميزات|يتيح)/u,
];

/** What an imperative request opens with once greetings and politeness are removed. */
export const MENTION_REQUEST_PREFIX =
  /^(?:(?:hi|hello|hey|ok|okay|so|now|then|and|please|kindly|just|go\s+ahead\s+and|can\s+you|could\s+you|would\s+you|will\s+you|i\s+want\s+you\s+to|i\s+need\s+you\s+to|i(?:'d|\s+would)\s+like\s+you\s+to|salut|bonjour|s'il\s+te\s+plaît|s'il\s+vous\s+plaît|peux-tu|pouvez-vous|hola|por\s+favor|puedes|hallo|bitte|kannst\s+du|könntest\s+du|مرحبا|من\s+فضلك|لو\s+سمحت|ممكن|هل\s+يمكنك)[\s,:-]+)+/u;

/**
 * A writing task: a writing verb with a written deliverable. Generation words
 * inside it are topic words ("write a post about how we create videos").
 */
export const MENTION_WRITING_VERBS =
  /(?<![\p{L}\p{N}])(?:write|draft|compose|rewrite|proofread|polish|summari[sz]e|translate|écris|écrire|rédige|rédiger|résume|escribe|redacta|resume|schreibe|verfasse|formuliere|اكتب|صغ|لخص|ترجم)(?![\p{L}\p{N}])/u;
export const MENTION_WRITTEN_DELIVERABLES =
  /(?<![\p{L}\p{N}])(?:post|posts|article|articles|email|emails|essay|caption|captions|blog|newsletter|tweet|thread|letter|speech|bio|summary|copy|script|paragraph|reply|message|announcement|press release|cover letter|linkedin|description|pitch|publication|publicación|publicaciones|beitrag|artículo|artikel|courriel|texte|text|منشور|مقال|رسالة|وصف|نبذة)(?![\p{L}\p{N}])/u;

/** Where a writing sentence hands over to a separate request: ", then draw …", "and create …". */
export const MENTION_WRITING_HANDOVER =
  /(?:[,;]\s*|\s+)(?:and\s+then|then|and\s+also|and|also|plus|et\s+puis|puis|et|y\s+luego|luego|und\s+dann|dann|und|ثم|و)\s+/u;

/** At least this many verbs, with a comma list and no opening verb, is an enumeration. */
export const MENTION_ENUMERATION_MIN_VERBS = 2;
export const MENTION_ENUMERATION_MIN_COMMAS = 2;

/**
 * Words after which a writing task's connector belongs to the TOPIC ("write an
 * article about how teams generate videos AND create reports"), not to a new
 * request. A hard break (", then", ";") still hands over.
 */
export const MENTION_TOPIC_MARKERS =
  /(?<![\p{L}\p{N}])(?:about|on|how|that|regarding|covering|explaining|describing|sur|über|sobre|acerca|comment|wie|cómo|como|que|dass|عن|حول|كيف)(?![\p{L}\p{N}])/u;

/** A connector that is a hard break between two tasks. */
export const MENTION_HARD_HANDOVER =
  /^(?:;|,\s*(?:and\s+)?then|\s+then|\s+and\s+then|,\s*(?:puis|luego|dann|ثم))/u;
