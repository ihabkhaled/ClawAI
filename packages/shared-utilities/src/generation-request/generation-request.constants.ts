/**
 * Which part of a message can be a request to GENERATE something (image or
 * file), in the 13 UI locales: ar de en es fa fr hi it ja pt ru th zh.
 *
 * Owner bug 2026-09-29: pasting a context pack that says "DO NOT generate an
 * image, diagram, document…" generated an image. The keyword scan matched
 * words inside a negation and inside a 45K-char pasted body.
 */

/** A message at least this long is treated as pasted material, not a prompt. */
export const PASTED_DOCUMENT_MIN_CHARS = 1_500;

/** Shorter messages with this many markdown headings are pasted material too. */
export const PASTED_DOCUMENT_MIN_HEADINGS = 2;
export const PASTED_DOCUMENT_HEADINGS_MIN_CHARS = 600;

/** The instruction around a pasted body ("Draw this:") is short. */
export const REQUEST_ENVELOPE_MAX_CHARS = 300;

export const MARKDOWN_HEADING_LINE = /^#{1,6}\s/gmu;
export const PARAGRAPH_SPLIT = /\n\s*\n/u;
/** A paragraph that is document structure, not an instruction to the assistant. */
export const STRUCTURAL_PARAGRAPH = /^\s*(?:#{1,6}\s|[-*+]\s|\d+[.)]\s|\||>|```|---)/u;

/** Clause boundaries: sentence ends, commas, semicolons, newlines, in every script. */
// A period splits only before whitespace or the end, so "notes.md" and
// "v1.2" stay one clause.
export const CLAUSE_SPLIT = /[.!?](?=\s|$)|[;,\n،؛؟、。！，；？।]/u;

/** Whole-word negations (scripts that separate words with spaces). */
export const NEGATION_WORDS: ReadonlySet<string> = new Set([
  // en
  'not',
  'no',
  'never',
  "don't",
  'dont',
  "doesn't",
  "won't",
  "shouldn't",
  'cannot',
  "can't",
  'without',
  'avoid',
  // ar
  'لا',
  'لن',
  'ليس',
  'بدون',
  'دون',
  'مش',
  'ممنوع',
  'عدم',
  // de
  'nicht',
  'kein',
  'keine',
  'keinen',
  'keinem',
  'keiner',
  'nie',
  'niemals',
  'ohne',
  'nichts',
  // es
  'nunca',
  'sin',
  'jamás',
  'ni',
  // fa
  'نه',
  'نکن',
  'نساز',
  'نکش',
  'هرگز',
  // fr
  'ne',
  'pas',
  'jamais',
  'sans',
  'aucun',
  'aucune',
  // hi
  'नहीं',
  'मत',
  'न',
  'बिना',
  // it
  'non',
  'mai',
  'senza',
  // pt
  'não',
  'nem',
  'sem',
  // ru
  'не',
  'нет',
  'никогда',
  'без',
  'нельзя',
]);

/** Substring negations (scripts without spaces, and bound prefixes). */
export const NEGATION_SUBSTRINGS: readonly string[] = [
  // ja
  'ないで',
  'しないで',
  'いらない',
  '禁止',
  '不要',
  // th
  'ไม่',
  'ห้าม',
  'อย่า',
  // zh — not a bare 不, which also means "different" (不一样) and "very" idioms
  '不要',
  '别',
  '勿',
  '不用',
  '不需要',
  '不生成',
  '不画',
  '不创建',
];

/**
 * A closing paragraph is an instruction about the pasted body only when it
 * points back at it ("draw a diagram of the above"). Otherwise it is just the
 * document's own last paragraph.
 */
export const BACK_REFERENCE_WORDS: readonly string[] = [
  'above',
  'أعلاه',
  'ما سبق',
  'oben',
  'arriba',
  'anterior',
  'بالا',
  'ci-dessus',
  'ऊपर',
  'sopra',
  '上記',
  'acima',
  'выше',
  'ข้างต้น',
  'ข้างบน',
  '上面',
  '以上',
];

/**
 * "Save / remember this" commands. Each pattern must match at the START of a
 * line (after optional politeness) so "what do you remember" and "can you
 * save the file" never fire. Group `rest` is the payload after the command.
 */
export const SAVE_INTENT_PATTERNS: readonly RegExp[] = [
  // en
  /^(?:please\s+|can you\s+|could you\s+)?(?:save|store|add|put|keep)\s+(?:this|that|it|the following)\s+(?:as|in|into|to)\s+(?:a\s+|an\s+|my\s+)?(?:new\s+)?(?:memory|memories|context(?:\s+pack)?|instruction|fact|preference|summary)\b[\s:.\-–—]*(?<rest>[\s\S]*)$/iu,
  /^(?:please\s+)?(?:remember|memorize|memorise)\s+(?:this|that|the following)\b[\s:.\-–—]*(?<rest>[\s\S]*)$/iu,
  // ar
  /^(?:من فضلك\s+|رجاء\s+)?(?:احفظ|خزّن|خزن|أضف|اضف|ضع)\s+(?:هذا|هذه|ذلك)?\s*(?:ك|في|إلى|الى|ضمن)\s*(?:ال)?(?:ذاكرة|ذاكرتي|سياق|السياق|حزمة السياق|تعليمات|تعليمة|حقيقة|تفضيل|ملخص)[\s:.\-–—]*(?<rest>[\s\S]*)$/u,
  /^(?:من فضلك\s+)?(?:تذكر|تذكّر|احفظ في ذاكرتك)\s+(?:هذا|هذه|ذلك|التالي)[\s:.\-–—]*(?<rest>[\s\S]*)$/u,
  // de
  /^(?:bitte\s+)?(?:merk dir|merke dir)\s+(?:das|dies|folgendes)[\s:.\-–—]*(?<rest>[\s\S]*)$/iu,
  /^(?:bitte\s+)?(?:speichere|füge)\s+(?:das|dies|folgendes)\s+(?:als|zu|zum|zur|in)\s+(?:meinem\s+|meiner\s+)?(?:erinnerung|gedächtnis|kontext|kontextpaket|anweisung|fakt|präferenz|zusammenfassung)\w*[\s:.\-–—]*(?<rest>[\s\S]*)$/iu,
  // es
  /^(?:por favor\s+)?(?:recuerda|memoriza)\s+(?:esto|eso|lo siguiente)[\s:.\-–—]*(?<rest>[\s\S]*)$/iu,
  /^(?:por favor\s+)?(?:guarda|añade|agrega)\s+(?:esto|eso)\s+(?:como|en|a)\s+(?:mi\s+)?(?:memoria|contexto|instrucción|hecho|preferencia|resumen)[\s:.\-–—]*(?<rest>[\s\S]*)$/iu,
  // fa
  /^(?:لطفا\s+)?(?:این(?:و| را)?\s+)?(?:به خاطر بسپار|یادت باشه|یادت بماند)[\s:.\-–—]*(?<rest>[\s\S]*)$/u,
  /^(?:لطفا\s+)?(?:این(?:و| را)?\s+)(?:به عنوان|در)\s+(?:حافظه|زمینه|بافت)\s+(?:ذخیره کن|ذخیره)[\s:.\-–—]*(?<rest>[\s\S]*)$/u,
  // fr
  /^(?:s'il te plaît\s+|s'il vous plaît\s+)?(?:souviens-toi|rappelle-toi|retiens|mémorise)\s+(?:de\s+)?(?:ça|cela|ceci)[\s:.\-–—]*(?<rest>[\s\S]*)$/iu,
  /^(?:s'il te plaît\s+)?(?:enregistre|sauvegarde|ajoute)\s+(?:ça|cela|ceci)\s+(?:comme|en|à|au|dans)\s+(?:ma\s+|mon\s+)?(?:mémoire|contexte|instruction|fait|préférence|résumé)[\s:.\-–—]*(?<rest>[\s\S]*)$/iu,
  // hi
  /^(?:कृपया\s+)?(?:इसे|यह)\s+(?:याद रखो|याद रखें|याद रखना|याद कर लो)[\s:।.\-–—]*(?<rest>[\s\S]*)$/u,
  /^(?:कृपया\s+)?(?:इसे|यह)\s+(?:मेमोरी|संदर्भ|कॉन्टेक्स्ट)\s+(?:में|के रूप में)\s+(?:सेव|सहेज)\S*[\s:।.\-–—]*(?<rest>[\s\S]*)$/u,
  // it
  /^(?:per favore\s+)?(?:ricorda|memorizza)\s+(?:questo|questa|ciò|quanto segue)[\s:.\-–—]*(?<rest>[\s\S]*)$/iu,
  /^(?:per favore\s+)?(?:salva|aggiungi)\s+(?:questo|questa)\s+(?:come|nella|alla|al|nel)\s+(?:mia\s+|mio\s+)?(?:memoria|contesto|istruzione|fatto|preferenza|riassunto)[\s:.\-–—]*(?<rest>[\s\S]*)$/iu,
  // ja
  /^(?:これを|以下を)?(?:覚えて|覚えておいて|記憶して)(?:ください|おいて)?[\s:：。、\-–—]*(?<rest>[\s\S]*)$/u,
  /^(?:これを|以下を)(?:メモリ|コンテキスト|記憶)(?:に|として)(?:保存|追加)(?:して)?(?:ください)?[\s:：。、\-–—]*(?<rest>[\s\S]*)$/u,
  // pt
  /^(?:por favor\s+)?(?:lembre-se|lembra|memorize)\s+(?:disso|disto|isso|isto|do seguinte)[\s:.\-–—]*(?<rest>[\s\S]*)$/iu,
  /^(?:por favor\s+)?(?:salve|guarde|adicione)\s+(?:isso|isto)\s+(?:como|na|à|a|no|ao)\s+(?:minha\s+|meu\s+)?(?:memória|contexto|instrução|fato|preferência|resumo)[\s:.\-–—]*(?<rest>[\s\S]*)$/iu,
  // ru
  /^(?:пожалуйста[,\s]+)?(?:запомни|запомните)(?:\s+(?:это|следующее))?[\s:.\-–—]*(?<rest>[\s\S]*)$/iu,
  /^(?:пожалуйста[,\s]+)?(?:сохрани|добавь)\s+(?:это\s+)?(?:как|в)\s+(?:мою\s+)?(?:память|памяти|контекст|инструкци\S*|факт|предпочтени\S*|резюме)[\s:.\-–—]*(?<rest>[\s\S]*)$/iu,
  // th
  /^(?:ช่วย)?(?:จำสิ่งนี้|จำไว้|จำข้อมูลนี้)(?:ไว้)?(?:นะ|ด้วย)?[\s:.\-–—]*(?<rest>[\s\S]*)$/u,
  /^(?:ช่วย)?บันทึก(?:สิ่งนี้)?(?:เป็น|ไว้ใน)(?:ความจำ|บริบท)[\s:.\-–—]*(?<rest>[\s\S]*)$/u,
  // zh
  /^(?:请)?(?:记住|记下)(?:这个|这些|以下内容|以下)?[\s:：。，\-–—]*(?<rest>[\s\S]*)$/u,
  /^(?:请)?(?:把这个|将这个|把以下内容)?(?:保存为|保存到|添加到)(?:记忆|上下文|上下文包)[\s:：。，\-–—]*(?<rest>[\s\S]*)$/u,
];

/** Words meaning "context / context pack" — the save goes to a pack. */
export const SAVE_TARGET_CONTEXT_WORDS: readonly string[] = [
  'context',
  'سياق',
  'kontext',
  'contexte',
  'contexto',
  'contesto',
  'контекст',
  'زمینه',
  'بافت',
  'संदर्भ',
  'कॉन्टेक्स्ट',
  'コンテキスト',
  '上下文',
  'บริบท',
];

export const SAVE_TYPE_INSTRUCTION_WORDS: readonly string[] = [
  'instruction',
  'always',
  'rule',
  'تعليمات',
  'تعليمة',
  'دائما',
  'دائمًا',
  'anweisung',
  'immer',
  'siempre',
  'instrucción',
  'همیشه',
  'دستور',
  'toujours',
  'hamesha',
  'हमेशा',
  'निर्देश',
  'sempre',
  'istruzione',
  'いつも',
  '常に',
  '指示',
  'instrução',
  'всегда',
  'инструкци',
  'เสมอ',
  '总是',
  '始终',
  '指令',
];

export const SAVE_TYPE_PREFERENCE_WORDS: readonly string[] = [
  'preference',
  'prefer',
  'i like',
  'favorite',
  'favourite',
  'تفضيل',
  'أفضل',
  'افضل',
  'präferenz',
  'bevorzuge',
  'preferencia',
  'prefiero',
  'ترجیح',
  'préférence',
  'préfère',
  'पसंद',
  'preferenza',
  'preferisco',
  '好み',
  '好き',
  'preferência',
  'prefiro',
  'предпочт',
  'ชอบ',
  '偏好',
  '喜欢',
];

export const SAVE_TYPE_SUMMARY_WORDS: readonly string[] = [
  'summary',
  'ملخص',
  'zusammenfassung',
  'resumen',
  'خلاصه',
  'résumé',
  'सारांश',
  'riassunto',
  '要約',
  'resumo',
  'резюме',
  'สรุป',
  '总结',
  '摘要',
];

/** How much of a long payload is read to guess the memory type. */
export const TYPE_HINT_PAYLOAD_CHARS = 200;
