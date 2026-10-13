/**
 * Extra recall cues for the save-intent pre-filter (ADR-134, ADR-168).
 *
 * `SAVE_PREFILTER_WORDS` held the words "memory / context / remember". Real people
 * say "from now on always...", "call me X", "put this in my notes", "don't forget"
 * without any of them, and in 12 other languages the verb forms (rappelle-toi,
 * lembre-se, ricordati) missed the stems. These cues widen the NET only: the planner
 * model stays the precision stage and may still answer save=false.
 *
 * Matching (see `save-cue-matcher.utility.ts`) is on lowercased text with Arabic
 * diacritics, Persian ZWNJ (folded to a space) and curly apostrophes normalised, so
 * write cues in that plain form. Scripts written with spaces match at a word START
 * (so "assegna" never fires "segna"); a trailing `$` also requires the word END
 * ("segna$" does not fire on "segnale"). Chinese, Japanese and Thai have no spaces
 * and match as plain substrings, except the ANCHORED list below. Generic words live
 * in the WEAK list and count only in pairs. Keep cues specific: a cue that fires on
 * ordinary questions makes every turn pay for a pack listing and a planner call.
 */
export const SAVE_PREFILTER_CUES: readonly string[] = [
  // en
  'jot ',
  'from here on',
  'henceforth',
  'hereafter',
  'stop using',
  'always answer',
  'always respond',
  'always reply',
  'put this in',
  'put that in',
  'add it to my',
  'to my pack',
  'bear in mind',
  'make a note',
  'please note',
  'never forget',
  'for next time',
  'next time i',
  // ar
  'من الان',
  'احتفظ',
  'دون ان',
  'دون هذا',
  'اضف هذا',
  'اضف هذه',
  'ضع هذا',
  'ضع هذه',
  'ملاحظاتي',
  'بعد الان',
  'ناديني',
  'نادني',
  'في اعتبارك',
  'سجل عندك',
  'سجل ان',
  'لا تنس',
  'خزن',
  'للمرة القادمة',
  // de
  'ab jetzt',
  'ab sofort',
  'kunftig',
  'künftig',
  'heb das',
  'heb es',
  'halte fest',
  'fuge das',
  'füge das',
  'füge dies',
  'füge es',
  'pack das',
  'nenn mich',
  'nenne mich',
  'denk daran',
  'denke daran',
  'schreib dir',
  'schreibe dir',
  'vergiss nicht',
  'leg das',
  'leg diese',
  'meine notizen',
  'meinen notizen',
  'nächste mal',
  'nachste mal',
  'behalt',
  // es
  'a partir de ahora',
  'de ahora en adelante',
  'a partir de hoy',
  'apunta que$',
  'apunta esto$',
  'apunta eso$',
  'dejalo apuntado',
  'déjalo apuntado',
  'añade esto',
  'añade eso',
  'agrega esto',
  'agrega eso',
  'pon esto en',
  'mis notas',
  'no me uses',
  'llámame',
  'llamame',
  'ten en cuenta',
  'toma nota',
  'no olvides',
  'almacena',
  'próxima vez',
  'proxima vez',
  'tenlo presente',
  // fa
  'از این به بعد',
  'نگه دار',
  'نگهدار',
  'یادداشت',
  'به بسته',
  'در بسته',
  'ایموجی',
  'صدا کن',
  'در نظر داشته باش',
  'این را بنویس',
  'فراموش نکن',
  'دفعه بعد',
  'دفعه ی بعد',
  'دیگه برام',
  'دیگر برایم',
  // fr
  'désormais',
  'desormais',
  'dorénavant',
  'à partir de maintenant',
  'garde ça',
  'garde ca',
  'garde cela',
  'garde-le',
  'note que',
  'sauvegarde',
  'ajoute ça',
  'ajoute ca',
  'ajoute cela',
  'mon pack',
  'mes notes',
  'rappelle-toi',
  'rappelle toi',
  "ne m'envoie plus",
  'appelle-moi',
  'appelle moi',
  'garde en tête',
  'écris ça',
  'ecris ca',
  "n'oublie pas",
  'prochaine fois',
  'range cette',
  'range ça',
  // hi
  'अब से',
  'आगे से',
  'रख लो',
  'रख दो',
  'सेव कर लो',
  'सेव कर दो',
  'सेव करो$',
  'सेव कीजिए$',
  'सेव कर देना',
  'नोट कर',
  'नोट्स',
  'जोड़ दो',
  'इमोजी',
  'कॉन्टेक्स्ट',
  'बुलाना',
  'ध्यान रखना',
  'लिख लो',
  'भूलना मत',
  'अगली बार',
  // it
  "d'ora in poi",
  'da adesso',
  'da ora in poi',
  'tienilo',
  'tieni questo',
  'tieni presente',
  'segna che$',
  'segna questo$',
  'segna quello$',
  'aggiungi questo',
  'aggiungi questa',
  'appunti',
  'non usare più',
  'non usare piu',
  'chiamami',
  'prendi nota',
  'non dimenticare',
  'ricordati',
  'prossima volta',
  'conserva',
  'metti questo',
  // ja
  '取っておいて',
  'とっておいて',
  'メモし',
  '絵文字',
  'と呼んで',
  '頭に入れ',
  '書き留め',
  '忘れないで',
  '入れておいて',
  '次回',
  // pt
  'a partir de agora',
  'daqui em diante',
  'daqui pra frente',
  'daqui para frente',
  'guarda isso',
  'guarda isto',
  'guarde',
  'adicione isto',
  'adicione isso',
  'anota',
  'lembre-se',
  'lembra-te',
  'não use mais',
  'nao use mais',
  'me chame',
  'chame-me',
  'tenha em mente',
  'escreva isso',
  'escreva isto',
  'não esqueça',
  'nao esqueca',
  'próxima vez',
  'proxima vez',
  // ru
  'отныне',
  'с этого момента',
  'учти',
  'заметк',
  'больше не используй',
  'называй меня',
  'имей в виду',
  'запиш',
  'занеси',
  'не забывай',
  'не забудь',
  'следующий раз',
  // th
  'ต่อจากนี้',
  'เซฟ',
  'จดไว้',
  'จดบันทึก',
  'เก็บไว้',
  'ใส่อันนี้ไว้',
  'ใส่ไว้ใน',
  'โน้ต',
  'เพิ่มอันนี้',
  'เพิ่มสิ่งนี้',
  'เพิ่มลงใน',
  'เรียกฉัน',
  'คำนึง',
  'อย่าลืม',
  'คราวหน้า',
  'ตั้งแต่ตอนนี้',
  // zh
  '从现在起',
  '留着',
  '记一下',
  '记下',
  '存下来',
  '别再',
  '叫我',
  '注意我',
  '写下来',
  '别忘',
  '不要忘',
  '记得',
  '表情符号',
];

/**
 * Generic words that appear in ordinary requests ("install the package", "call me
 * back", "never use var"). One alone is NOT a save request; two DIFFERENT ones in
 * the same message are ("add this to my package"). Ending in `$` means whole word.
 */
export const SAVE_PREFILTER_WEAK_CUES: readonly string[] = [
  // en
  'call me',
  'never use',
  // ar
  'حزمة',
  // es
  'apunta$',
  // hi
  'सेव$',
  'पैक$',
  // it
  'segna$',
  'pacchett',
  // ja
  'ノート',
  'パック',
  '追加して',
  // pt
  'pacote',
  // ru
  'пакет',
  'добавь',
  'оставь',
  // th
  'ต่อไปนี้',
  'เก็บ',
  'แพ็ก',
  'อย่าใช้',
  // zh
  '放到',
  '加到',
  '放进',
  '资料包',
  '笔记',
];

/**
 * Standing-instruction openers in scripts without spaces. They count only at the
 * START of the message or right after punctuation or a space ("以后叫我小明"),
 * never inside a sentence ("运行以后会报错").
 */
export const SAVE_PREFILTER_ANCHORED_CUES: readonly string[] = [
  // ja
  'これからは',
  '今後は',
  '以後',
  // zh
  '以后',
  '今后',
];

/**
 * Save verbs that are a request ONLY when they are the whole message ("save
 * that", "keep it", "guárdalo"): the object is the answer just above. An English
 * verb may be followed by one object word from SAVE_ANAPHORIC_OBJECTS.
 */
export const SAVE_ANAPHORIC_WORDS: readonly string[] = [
  'save',
  'keep',
  'store',
  'guárdalo',
  'guardalo',
  'guárdala',
  'garde-le',
  'garde-la',
  'sauvegarde-le',
  'speichere',
  'merk es',
  'salvalo',
  'tienila',
  'salve isso',
  'guarde isso',
  'сохрани',
  'запомни',
  'احفظه',
  'احفظها',
  'सेव',
  '保存',
  '存',
  'เซฟ',
  '保存して',
];

/** The one object word an anaphoric save verb may carry ("save THAT"). */
export const SAVE_ANAPHORIC_OBJECTS: readonly string[] = [
  'it',
  'that',
  'this',
  'esto',
  'eso',
  'isto',
  'isso',
  'questo',
  'ça',
  'ca',
  'cela',
  'das',
  'dies',
  'это',
];

/**
 * "Save it / that / this" as the whole message is a save request even with no
 * assistant message above it. (Keep and store need the assistant message.)
 */
export const SAVE_WHOLE_MESSAGE_WORDS: readonly string[] = ['save'];
