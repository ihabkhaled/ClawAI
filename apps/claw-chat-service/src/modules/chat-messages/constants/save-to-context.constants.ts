import type { ConfirmationLocale, SaveConfirmationTemplates } from '../types/save-to-context.types';

/** memory-service internal routes (service token; owner-scoped; idempotent). */
export const SAVE_MEMORY_FROM_CHAT_PATH = '/api/v1/internal/memories/save-from-chat';
export const SAVE_PACK_FROM_CHAT_PATH = '/api/v1/internal/context-packs/save-from-chat';
export const SAVE_FROM_CHAT_TIMEOUT_MS = 15_000;

/** Where the user manages what was saved (frontend portal routes). */
export const MEMORY_PAGE_LINK = '/memory';
export const CONTEXT_PAGE_LINK = '/context';

/** Reported to the stream and stored as the reply's provider/model. */
export const SAVE_TO_CONTEXT_PROVIDER = 'CLAW';
export const SAVE_TO_CONTEXT_MODEL = 'save-to-context';

export const SAVE_PREVIEW_MAX_CHARS = 80;
export const SAVED_PACK_NAME_MAX_CHARS = 120;
export const SAVED_PACK_FALLBACK_NAME = 'Saved from chat';

/** memory-service error codes that mean "your plan", not "our outage". */
export const SAVE_PLAN_ERROR_CODES: ReadonlySet<string> = new Set(['PLAN_FEATURE_DISABLED']);
export const SAVE_LIMIT_ERROR_CODES: ReadonlySet<string> = new Set([
  'PLAN_MEMORY_ITEM_LIMIT_EXCEEDED',
  'PLAN_CONTEXT_PACK_LIMIT_EXCEEDED',
]);

/** Script → locale, checked in order. Latin falls through to word hints. */
export const LOCALE_SCRIPT_TESTS: ReadonlyArray<{ locale: ConfirmationLocale; test: RegExp }> = [
  { locale: 'fa', test: /[پچژگ]|بسپار|یادت/u },
  { locale: 'ar', test: /\p{Script=Arabic}/u },
  { locale: 'hi', test: /\p{Script=Devanagari}/u },
  { locale: 'th', test: /\p{Script=Thai}/u },
  { locale: 'ja', test: /[\p{Script=Hiragana}\p{Script=Katakana}]/u },
  { locale: 'zh', test: /\p{Script=Han}/u },
  { locale: 'ru', test: /\p{Script=Cyrillic}/u },
];

export const LOCALE_LATIN_HINTS: ReadonlyArray<{ locale: ConfirmationLocale; test: RegExp }> = [
  { locale: 'de', test: /\b(?:merk|merke|speichere|füge|bitte|dir das)\b/iu },
  {
    locale: 'fr',
    test: /\b(?:souviens|rappelle|retiens|enregistre|sauvegarde|ajoute|ceci|cela)\b/iu,
  },
  { locale: 'es', test: /\b(?:recuerda|guarda|añade|agrega|esto)\b/iu },
  { locale: 'it', test: /\b(?:ricorda|salva|aggiungi|questo|questa)\b/iu },
  { locale: 'pt', test: /\b(?:lembre|lembra|salve|guarde|adicione|disso|isso)\b/iu },
];

/**
 * The reply to a "save this" turn, in the 13 UI locales. Placeholders:
 * {type} {size} {preview} {name} {link} {reason}.
 */
export const SAVE_CONFIRMATIONS: Record<ConfirmationLocale, SaveConfirmationTemplates> = {
  en: {
    memory:
      'Saved to your memory as **{type}** ({size} characters): "{preview}". Manage it in [Memory]({link}).',
    pack: 'Saved as the context pack **"{name}"** ({size} characters). It is on for all your chats. Manage it in [Context]({link}).',
    ask: 'What should I save? Put the text after the command, for example: "Remember this: I prefer short answers."',
    failed: 'I could not save that: {reason}',
    reasons: {
      PLAN: 'your plan does not include this feature.',
      LIMIT: 'you have reached your plan limit.',
      UNAVAILABLE: 'the memory service is not available right now. Please try again.',
    },
    types: {
      FACT: 'Fact',
      PREFERENCE: 'Preference',
      INSTRUCTION: 'Instruction',
      SUMMARY: 'Summary',
    },
  },
  ar: {
    memory:
      'تم الحفظ في ذاكرتك بنوع **{type}** ({size} حرفًا): "{preview}". يمكنك إدارتها من [الذاكرة]({link}).',
    pack: 'تم الحفظ كحزمة سياق **"{name}"** ({size} حرفًا). وهي مفعّلة في كل محادثاتك. يمكنك إدارتها من [السياق]({link}).',
    ask: 'ما الذي تريد حفظه؟ اكتب النص بعد الأمر، مثلًا: "تذكر هذا: أفضّل الإجابات القصيرة."',
    failed: 'تعذّر الحفظ: {reason}',
    reasons: {
      PLAN: 'خطتك لا تتضمن هذه الميزة.',
      LIMIT: 'لقد بلغت الحد المسموح في خطتك.',
      UNAVAILABLE: 'خدمة الذاكرة غير متاحة حاليًا. حاول مرة أخرى.',
    },
    types: { FACT: 'حقيقة', PREFERENCE: 'تفضيل', INSTRUCTION: 'تعليمات', SUMMARY: 'ملخص' },
  },
  de: {
    memory:
      'Als **{type}** in deinem Gedächtnis gespeichert ({size} Zeichen): "{preview}". Verwalten unter [Gedächtnis]({link}).',
    pack: 'Als Kontextpaket **"{name}"** gespeichert ({size} Zeichen). Es ist in allen deinen Chats aktiv. Verwalten unter [Kontext]({link}).',
    ask: 'Was soll ich speichern? Schreib den Text hinter den Befehl, zum Beispiel: "Merk dir das: Ich mag kurze Antworten."',
    failed: 'Das konnte ich nicht speichern: {reason}',
    reasons: {
      PLAN: 'Dein Tarif enthält diese Funktion nicht.',
      LIMIT: 'Du hast das Limit deines Tarifs erreicht.',
      UNAVAILABLE: 'Der Gedächtnisdienst ist gerade nicht erreichbar. Bitte versuch es erneut.',
    },
    types: {
      FACT: 'Fakt',
      PREFERENCE: 'Präferenz',
      INSTRUCTION: 'Anweisung',
      SUMMARY: 'Zusammenfassung',
    },
  },
  es: {
    memory:
      'Guardado en tu memoria como **{type}** ({size} caracteres): "{preview}". Gestiónalo en [Memoria]({link}).',
    pack: 'Guardado como el paquete de contexto **"{name}"** ({size} caracteres). Está activo en todos tus chats. Gestiónalo en [Contexto]({link}).',
    ask: '¿Qué debo guardar? Escribe el texto después del comando, por ejemplo: "Recuerda esto: prefiero respuestas cortas."',
    failed: 'No pude guardarlo: {reason}',
    reasons: {
      PLAN: 'tu plan no incluye esta función.',
      LIMIT: 'has alcanzado el límite de tu plan.',
      UNAVAILABLE: 'el servicio de memoria no está disponible ahora. Inténtalo de nuevo.',
    },
    types: {
      FACT: 'Hecho',
      PREFERENCE: 'Preferencia',
      INSTRUCTION: 'Instrucción',
      SUMMARY: 'Resumen',
    },
  },
  fa: {
    memory:
      'در حافظه‌ات به‌عنوان **{type}** ذخیره شد ({size} نویسه): "{preview}". مدیریت در [حافظه]({link}).',
    pack: 'به‌عنوان بستهٔ زمینه **"{name}"** ذخیره شد ({size} نویسه). در همهٔ گفتگوهایت فعال است. مدیریت در [زمینه]({link}).',
    ask: 'چه چیزی را ذخیره کنم؟ متن را بعد از دستور بنویس، مثلاً: "این را به خاطر بسپار: پاسخ‌های کوتاه را ترجیح می‌دهم."',
    failed: 'نتوانستم ذخیره کنم: {reason}',
    reasons: {
      PLAN: 'طرح تو این قابلیت را ندارد.',
      LIMIT: 'به سقف طرح خود رسیده‌ای.',
      UNAVAILABLE: 'سرویس حافظه اکنون در دسترس نیست. دوباره تلاش کن.',
    },
    types: { FACT: 'واقعیت', PREFERENCE: 'ترجیح', INSTRUCTION: 'دستورالعمل', SUMMARY: 'خلاصه' },
  },
  fr: {
    memory:
      'Enregistré dans ta mémoire comme **{type}** ({size} caractères) : « {preview} ». Gère-le dans [Mémoire]({link}).',
    pack: 'Enregistré comme pack de contexte **« {name} »** ({size} caractères). Il est actif dans toutes tes conversations. Gère-le dans [Contexte]({link}).',
    ask: 'Que dois-je enregistrer ? Écris le texte après la commande, par exemple : « Souviens-toi de ça : je préfère les réponses courtes. »',
    failed: "Je n'ai pas pu l'enregistrer : {reason}",
    reasons: {
      PLAN: "ton forfait n'inclut pas cette fonctionnalité.",
      LIMIT: 'tu as atteint la limite de ton forfait.',
      UNAVAILABLE: "le service de mémoire n'est pas disponible pour le moment. Réessaie.",
    },
    types: {
      FACT: 'Fait',
      PREFERENCE: 'Préférence',
      INSTRUCTION: 'Instruction',
      SUMMARY: 'Résumé',
    },
  },
  hi: {
    memory:
      'आपकी मेमोरी में **{type}** के रूप में सहेजा गया ({size} अक्षर): "{preview}"। इसे [मेमोरी]({link}) में प्रबंधित करें।',
    pack: 'संदर्भ पैक **"{name}"** के रूप में सहेजा गया ({size} अक्षर)। यह आपकी सभी चैट में चालू है। इसे [संदर्भ]({link}) में प्रबंधित करें।',
    ask: 'मैं क्या सहेजूँ? कमांड के बाद टेक्स्ट लिखें, जैसे: "इसे याद रखो: मुझे छोटे जवाब पसंद हैं।"',
    failed: 'मैं इसे सहेज नहीं सका: {reason}',
    reasons: {
      PLAN: 'आपके प्लान में यह सुविधा शामिल नहीं है।',
      LIMIT: 'आप अपने प्लान की सीमा तक पहुँच गए हैं।',
      UNAVAILABLE: 'मेमोरी सेवा अभी उपलब्ध नहीं है। कृपया फिर से कोशिश करें।',
    },
    types: { FACT: 'तथ्य', PREFERENCE: 'पसंद', INSTRUCTION: 'निर्देश', SUMMARY: 'सारांश' },
  },
  it: {
    memory:
      'Salvato nella tua memoria come **{type}** ({size} caratteri): "{preview}". Gestiscilo in [Memoria]({link}).',
    pack: 'Salvato come pacchetto di contesto **"{name}"** ({size} caratteri). È attivo in tutte le tue chat. Gestiscilo in [Contesto]({link}).',
    ask: 'Cosa devo salvare? Scrivi il testo dopo il comando, per esempio: "Ricorda questo: preferisco risposte brevi."',
    failed: 'Non sono riuscito a salvarlo: {reason}',
    reasons: {
      PLAN: 'il tuo piano non include questa funzione.',
      LIMIT: 'hai raggiunto il limite del tuo piano.',
      UNAVAILABLE: 'il servizio di memoria non è disponibile al momento. Riprova.',
    },
    types: {
      FACT: 'Fatto',
      PREFERENCE: 'Preferenza',
      INSTRUCTION: 'Istruzione',
      SUMMARY: 'Riassunto',
    },
  },
  ja: {
    memory:
      '**{type}**としてメモリに保存しました（{size}文字）：「{preview}」。[メモリ]({link})で管理できます。',
    pack: 'コンテキストパック**「{name}」**として保存しました（{size}文字）。すべてのチャットで有効です。[コンテキスト]({link})で管理できます。',
    ask: '何を保存しますか？コマンドの後にテキストを書いてください。例：「これを覚えて：短い回答が好きです。」',
    failed: '保存できませんでした：{reason}',
    reasons: {
      PLAN: 'ご利用のプランにはこの機能が含まれていません。',
      LIMIT: 'プランの上限に達しました。',
      UNAVAILABLE: 'メモリサービスは現在利用できません。もう一度お試しください。',
    },
    types: { FACT: '事実', PREFERENCE: '好み', INSTRUCTION: '指示', SUMMARY: '要約' },
  },
  pt: {
    memory:
      'Salvo na sua memória como **{type}** ({size} caracteres): "{preview}". Gerencie em [Memória]({link}).',
    pack: 'Salvo como o pacote de contexto **"{name}"** ({size} caracteres). Ele está ativo em todas as suas conversas. Gerencie em [Contexto]({link}).',
    ask: 'O que devo salvar? Escreva o texto depois do comando, por exemplo: "Lembre-se disso: prefiro respostas curtas."',
    failed: 'Não consegui salvar: {reason}',
    reasons: {
      PLAN: 'seu plano não inclui este recurso.',
      LIMIT: 'você atingiu o limite do seu plano.',
      UNAVAILABLE: 'o serviço de memória não está disponível agora. Tente novamente.',
    },
    types: { FACT: 'Fato', PREFERENCE: 'Preferência', INSTRUCTION: 'Instrução', SUMMARY: 'Resumo' },
  },
  ru: {
    memory:
      'Сохранено в вашу память как **{type}** ({size} символов): «{preview}». Управлять можно в разделе [Память]({link}).',
    pack: 'Сохранено как пакет контекста **«{name}»** ({size} символов). Он включён во всех ваших чатах. Управлять можно в разделе [Контекст]({link}).',
    ask: 'Что сохранить? Напишите текст после команды, например: «Запомни это: я предпочитаю короткие ответы.»',
    failed: 'Не удалось сохранить: {reason}',
    reasons: {
      PLAN: 'ваш тариф не включает эту функцию.',
      LIMIT: 'вы достигли лимита тарифа.',
      UNAVAILABLE: 'сервис памяти сейчас недоступен. Попробуйте ещё раз.',
    },
    types: {
      FACT: 'Факт',
      PREFERENCE: 'Предпочтение',
      INSTRUCTION: 'Инструкция',
      SUMMARY: 'Сводка',
    },
  },
  th: {
    memory:
      'บันทึกลงความจำของคุณเป็น **{type}** แล้ว ({size} ตัวอักษร): "{preview}" จัดการได้ที่ [ความจำ]({link})',
    pack: 'บันทึกเป็นชุดบริบท **"{name}"** แล้ว ({size} ตัวอักษร) เปิดใช้ในทุกแชทของคุณ จัดการได้ที่ [บริบท]({link})',
    ask: 'ต้องการให้บันทึกอะไร? พิมพ์ข้อความต่อจากคำสั่ง เช่น "จำสิ่งนี้ไว้: ฉันชอบคำตอบสั้นๆ"',
    failed: 'บันทึกไม่สำเร็จ: {reason}',
    reasons: {
      PLAN: 'แพ็กเกจของคุณไม่มีฟีเจอร์นี้',
      LIMIT: 'คุณใช้ครบขีดจำกัดของแพ็กเกจแล้ว',
      UNAVAILABLE: 'บริการความจำไม่พร้อมใช้งานในขณะนี้ โปรดลองอีกครั้ง',
    },
    types: { FACT: 'ข้อเท็จจริง', PREFERENCE: 'ความชอบ', INSTRUCTION: 'คำสั่ง', SUMMARY: 'สรุป' },
  },
  zh: {
    memory:
      '已作为**{type}**保存到你的记忆（{size} 个字符）：“{preview}”。可在[记忆]({link})中管理。',
    pack: '已保存为上下文包**“{name}”**（{size} 个字符），并在你的所有对话中启用。可在[上下文]({link})中管理。',
    ask: '要保存什么？请把内容写在指令后面，例如：“记住这个：我喜欢简短的回答。”',
    failed: '无法保存：{reason}',
    reasons: {
      PLAN: '你的套餐不包含此功能。',
      LIMIT: '你已达到套餐上限。',
      UNAVAILABLE: '记忆服务暂时不可用，请重试。',
    },
    types: { FACT: '事实', PREFERENCE: '偏好', INSTRUCTION: '指令', SUMMARY: '摘要' },
  },
};
