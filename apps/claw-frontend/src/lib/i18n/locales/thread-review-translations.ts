import { Locale } from '@/enums/locale.enum';
import type { ThreadReviewLocaleTranslation } from '@/types/i18n.types';

/**
 * Words for the owner's review screen and the formatting step log: the long-suggestion toggle,
 * the "already answered" note, the reader-suggestion card beside the editor, and one friendly
 * sentence per `FORMAT_*` skip code (a skip is a safe outcome, not an error). One file imported
 * by every locale, so a missing locale or key is a type error. `{code}` must be kept as it is.
 */
export const THREAD_REVIEW_TRANSLATIONS: Record<Locale, ThreadReviewLocaleTranslation> = {
  [Locale.EN]: {
    authorAgreement:
      'Author preference agreement: {percentage}%. The Judge makes the final choice.',
    formatNotFormattable: 'This Thread has no generated article to format yet.',
    showMore: 'Show more',
    showLess: 'Show less',
    alreadyAnswered: 'This request was already answered; your first reply was kept.',
    editorSuggestionTitle: 'Reader suggestion you are applying',
    editorSuggestionDismiss: 'Hide suggestion',
    formatAlreadyPretty: 'This article is already well formatted. Nothing was changed.',
    formatSkippedBudget:
      'Formatting was skipped to stay within your spending limit. Your article was left as it was.',
    formatFailed: 'Formatting could not be completed. Your article was left as it was.',
    formatReplyInvalid: 'The AI reply could not be read, so your article was left as it was.',
    formatModelError: 'The formatting model had a problem, so your article was left as it was.',
    formatEmpty: 'The AI returned no text, so your article was left as it was.',
    formatRawHtml:
      'The AI added raw HTML, which is not allowed, so your article was left as it was.',
    formatCitationLost: 'The AI removed a source citation, so your article was left as it was.',
    formatCitationAdded:
      'The AI added a source that was not in your article, so your article was left as it was.',
    formatNumberChanged: 'The AI changed a number, so your article was left as it was.',
    formatUrlAdded:
      'The AI added a link that was not in your article, so your article was left as it was.',
    formatLengthDrift:
      'The AI changed the length of the text too much, so your article was left as it was.',
    formatHeadingLanguage:
      'The AI wrote headings in a different language, so your article was left as it was.',
    formatStructure: 'The AI changed the structure too much, so your article was left as it was.',
    formatTableLost: 'The AI dropped a table, so your article was left as it was.',
    formatUnknown: 'Formatting was skipped ({code}). Your article was left as it was.',
  },
  [Locale.AR]: {
    authorAgreement: 'توافق تفضيلات الكتّاب: {percentage}%. المحكّم يتخذ القرار النهائي.',
    formatNotFormattable: 'ليس لهذا الـ Thread مقال مُنشأ بعد لتنسيقه.',
    showMore: 'عرض المزيد',
    showLess: 'عرض أقل',
    alreadyAnswered: 'تم الرد على هذا الطلب مسبقًا، وبقي ردك الأول كما هو.',
    editorSuggestionTitle: 'اقتراح القارئ الذي تطبّقه',
    editorSuggestionDismiss: 'إخفاء الاقتراح',
    formatAlreadyPretty: 'هذا المقال منسّق جيدًا بالفعل. لم يتغير شيء.',
    formatSkippedBudget: 'تم تخطي التنسيق للبقاء ضمن حد إنفاقك. تُرك المقال كما هو.',
    formatFailed: 'تعذّر إكمال التنسيق. تُرك المقال كما هو.',
    formatReplyInvalid: 'تعذّرت قراءة رد الذكاء الاصطناعي، لذا تُرك المقال كما هو.',
    formatModelError: 'حدثت مشكلة في نموذج التنسيق، لذا تُرك المقال كما هو.',
    formatEmpty: 'لم يُرجع الذكاء الاصطناعي أي نص، لذا تُرك المقال كما هو.',
    formatRawHtml: 'أضاف الذكاء الاصطناعي HTML خامًا وهذا غير مسموح، لذا تُرك المقال كما هو.',
    formatCitationLost: 'حذف الذكاء الاصطناعي مصدرًا مذكورًا، لذا تُرك المقال كما هو.',
    formatCitationAdded: 'أضاف الذكاء الاصطناعي مصدرًا ليس في مقالك، لذا تُرك المقال كما هو.',
    formatNumberChanged: 'غيّر الذكاء الاصطناعي رقمًا، لذا تُرك المقال كما هو.',
    formatUrlAdded: 'أضاف الذكاء الاصطناعي رابطًا ليس في مقالك، لذا تُرك المقال كما هو.',
    formatLengthDrift: 'غيّر الذكاء الاصطناعي طول النص كثيرًا، لذا تُرك المقال كما هو.',
    formatHeadingLanguage: 'كتب الذكاء الاصطناعي العناوين بلغة مختلفة، لذا تُرك المقال كما هو.',
    formatStructure: 'غيّر الذكاء الاصطناعي البنية كثيرًا، لذا تُرك المقال كما هو.',
    formatTableLost: 'حذف الذكاء الاصطناعي جدولًا، لذا تُرك المقال كما هو.',
    formatUnknown: 'تم تخطي التنسيق ({code}). تُرك المقال كما هو.',
  },
  [Locale.FR]: {
    authorAgreement:
      'Accord sur les préférences des auteurs : {percentage} %. Le juge prend la décision finale.',
    formatNotFormattable: 'Ce Thread n’a pas encore d’article généré à mettre en forme.',
    showMore: 'Afficher plus',
    showLess: 'Afficher moins',
    alreadyAnswered:
      'Cette demande a déjà reçu une réponse ; votre première réponse a été conservée.',
    editorSuggestionTitle: 'Suggestion du lecteur que vous appliquez',
    editorSuggestionDismiss: 'Masquer la suggestion',
    formatAlreadyPretty: 'Cet article est déjà bien mis en forme. Rien n’a été modifié.',
    formatSkippedBudget:
      'La mise en forme a été ignorée pour respecter votre limite de dépenses. Votre article est resté tel quel.',
    formatFailed: 'La mise en forme n’a pas pu aboutir. Votre article est resté tel quel.',
    formatReplyInvalid:
      'La réponse de l’IA était illisible, votre article est donc resté tel quel.',
    formatModelError:
      'Le modèle de mise en forme a rencontré un problème, votre article est donc resté tel quel.',
    formatEmpty: 'L’IA n’a renvoyé aucun texte, votre article est donc resté tel quel.',
    formatRawHtml:
      'L’IA a ajouté du HTML brut, ce qui n’est pas autorisé, votre article est donc resté tel quel.',
    formatCitationLost: 'L’IA a supprimé une source citée, votre article est donc resté tel quel.',
    formatCitationAdded:
      'L’IA a ajouté une source absente de votre article, il est donc resté tel quel.',
    formatNumberChanged: 'L’IA a modifié un nombre, votre article est donc resté tel quel.',
    formatUrlAdded: 'L’IA a ajouté un lien absent de votre article, il est donc resté tel quel.',
    formatLengthDrift:
      'L’IA a trop modifié la longueur du texte, votre article est donc resté tel quel.',
    formatHeadingLanguage:
      'L’IA a rédigé les titres dans une autre langue, votre article est donc resté tel quel.',
    formatStructure: 'L’IA a trop modifié la structure, votre article est donc resté tel quel.',
    formatTableLost: 'L’IA a supprimé un tableau, votre article est donc resté tel quel.',
    formatUnknown: 'La mise en forme a été ignorée ({code}). Votre article est resté tel quel.',
  },
  [Locale.IT]: {
    authorAgreement:
      'Accordo sulle preferenze degli autori: {percentage}%. La scelta finale spetta al giudice.',
    formatNotFormattable: 'Questo Thread non ha ancora un articolo generato da formattare.',
    showMore: 'Mostra di più',
    showLess: 'Mostra meno',
    alreadyAnswered:
      'A questa richiesta è già stata data risposta; la tua prima risposta è stata mantenuta.',
    editorSuggestionTitle: 'Suggerimento del lettore che stai applicando',
    editorSuggestionDismiss: 'Nascondi il suggerimento',
    formatAlreadyPretty: 'Questo articolo è già ben formattato. Non è stato cambiato nulla.',
    formatSkippedBudget:
      'La formattazione è stata saltata per restare entro il tuo limite di spesa. L’articolo è rimasto com’era.',
    formatFailed:
      'Non è stato possibile completare la formattazione. L’articolo è rimasto com’era.',
    formatReplyInvalid:
      'La risposta dell’IA non era leggibile, quindi l’articolo è rimasto com’era.',
    formatModelError:
      'Il modello di formattazione ha avuto un problema, quindi l’articolo è rimasto com’era.',
    formatEmpty: 'L’IA non ha restituito testo, quindi l’articolo è rimasto com’era.',
    formatRawHtml:
      'L’IA ha aggiunto HTML grezzo, che non è consentito, quindi l’articolo è rimasto com’era.',
    formatCitationLost: 'L’IA ha rimosso una fonte citata, quindi l’articolo è rimasto com’era.',
    formatCitationAdded:
      'L’IA ha aggiunto una fonte non presente nel tuo articolo, quindi è rimasto com’era.',
    formatNumberChanged: 'L’IA ha cambiato un numero, quindi l’articolo è rimasto com’era.',
    formatUrlAdded:
      'L’IA ha aggiunto un link non presente nel tuo articolo, quindi è rimasto com’era.',
    formatLengthDrift:
      'L’IA ha cambiato troppo la lunghezza del testo, quindi l’articolo è rimasto com’era.',
    formatHeadingLanguage:
      'L’IA ha scritto i titoli in un’altra lingua, quindi l’articolo è rimasto com’era.',
    formatStructure: 'L’IA ha cambiato troppo la struttura, quindi l’articolo è rimasto com’era.',
    formatTableLost: 'L’IA ha eliminato una tabella, quindi l’articolo è rimasto com’era.',
    formatUnknown: 'La formattazione è stata saltata ({code}). L’articolo è rimasto com’era.',
  },
  [Locale.DE]: {
    authorAgreement:
      'Übereinstimmung der Autorenpräferenzen: {percentage} %. Der Judge entscheidet endgültig.',
    formatNotFormattable: 'Dieser Thread hat noch keinen erzeugten Artikel zum Formatieren.',
    showMore: 'Mehr anzeigen',
    showLess: 'Weniger anzeigen',
    alreadyAnswered: 'Diese Anfrage wurde bereits beantwortet; Ihre erste Antwort bleibt erhalten.',
    editorSuggestionTitle: 'Vorschlag des Lesers, den Sie umsetzen',
    editorSuggestionDismiss: 'Vorschlag ausblenden',
    formatAlreadyPretty: 'Dieser Artikel ist bereits gut formatiert. Es wurde nichts geändert.',
    formatSkippedBudget:
      'Die Formatierung wurde übersprungen, um Ihr Ausgabenlimit einzuhalten. Ihr Artikel blieb unverändert.',
    formatFailed:
      'Die Formatierung konnte nicht abgeschlossen werden. Ihr Artikel blieb unverändert.',
    formatReplyInvalid: 'Die Antwort der KI war nicht lesbar, daher blieb Ihr Artikel unverändert.',
    formatModelError:
      'Das Formatierungsmodell hatte ein Problem, daher blieb Ihr Artikel unverändert.',
    formatEmpty: 'Die KI hat keinen Text geliefert, daher blieb Ihr Artikel unverändert.',
    formatRawHtml:
      'Die KI hat rohes HTML hinzugefügt, was nicht erlaubt ist, daher blieb Ihr Artikel unverändert.',
    formatCitationLost:
      'Die KI hat eine Quellenangabe entfernt, daher blieb Ihr Artikel unverändert.',
    formatCitationAdded:
      'Die KI hat eine Quelle hinzugefügt, die nicht in Ihrem Artikel stand, daher blieb er unverändert.',
    formatNumberChanged: 'Die KI hat eine Zahl geändert, daher blieb Ihr Artikel unverändert.',
    formatUrlAdded:
      'Die KI hat einen Link hinzugefügt, der nicht in Ihrem Artikel stand, daher blieb er unverändert.',
    formatLengthDrift:
      'Die KI hat die Länge des Textes zu stark verändert, daher blieb Ihr Artikel unverändert.',
    formatHeadingLanguage:
      'Die KI hat Überschriften in einer anderen Sprache geschrieben, daher blieb Ihr Artikel unverändert.',
    formatStructure:
      'Die KI hat die Struktur zu stark verändert, daher blieb Ihr Artikel unverändert.',
    formatTableLost: 'Die KI hat eine Tabelle entfernt, daher blieb Ihr Artikel unverändert.',
    formatUnknown: 'Die Formatierung wurde übersprungen ({code}). Ihr Artikel blieb unverändert.',
  },
  [Locale.ES]: {
    authorAgreement:
      'Acuerdo de preferencia de los autores: {percentage} %. El juez toma la decisión final.',
    formatNotFormattable: 'Este Thread aún no tiene un artículo generado para dar formato.',
    showMore: 'Mostrar más',
    showLess: 'Mostrar menos',
    alreadyAnswered: 'Esta solicitud ya fue respondida; se conservó tu primera respuesta.',
    editorSuggestionTitle: 'Sugerencia del lector que estás aplicando',
    editorSuggestionDismiss: 'Ocultar la sugerencia',
    formatAlreadyPretty: 'Este artículo ya tiene buen formato. No se cambió nada.',
    formatSkippedBudget:
      'Se omitió el formato para no superar tu límite de gasto. Tu artículo quedó como estaba.',
    formatFailed: 'No se pudo completar el formato. Tu artículo quedó como estaba.',
    formatReplyInvalid:
      'No se pudo leer la respuesta de la IA, así que tu artículo quedó como estaba.',
    formatModelError:
      'El modelo de formato tuvo un problema, así que tu artículo quedó como estaba.',
    formatEmpty: 'La IA no devolvió texto, así que tu artículo quedó como estaba.',
    formatRawHtml:
      'La IA añadió HTML sin procesar, lo cual no está permitido, así que tu artículo quedó como estaba.',
    formatCitationLost: 'La IA eliminó una fuente citada, así que tu artículo quedó como estaba.',
    formatCitationAdded:
      'La IA añadió una fuente que no estaba en tu artículo, así que quedó como estaba.',
    formatNumberChanged: 'La IA cambió un número, así que tu artículo quedó como estaba.',
    formatUrlAdded:
      'La IA añadió un enlace que no estaba en tu artículo, así que quedó como estaba.',
    formatLengthDrift:
      'La IA cambió demasiado la longitud del texto, así que tu artículo quedó como estaba.',
    formatHeadingLanguage:
      'La IA escribió los títulos en otro idioma, así que tu artículo quedó como estaba.',
    formatStructure: 'La IA cambió demasiado la estructura, así que tu artículo quedó como estaba.',
    formatTableLost: 'La IA eliminó una tabla, así que tu artículo quedó como estaba.',
    formatUnknown: 'Se omitió el formato ({code}). Tu artículo quedó como estaba.',
  },
  [Locale.RU]: {
    authorAgreement:
      'Совпадение предпочтений авторов: {percentage}%. Окончательный выбор делает судья.',
    formatNotFormattable: 'У этого Thread пока нет созданной статьи для форматирования.',
    showMore: 'Показать больше',
    showLess: 'Показать меньше',
    alreadyAnswered: 'На этот запрос уже ответили; ваш первый ответ сохранён.',
    editorSuggestionTitle: 'Предложение читателя, которое вы применяете',
    editorSuggestionDismiss: 'Скрыть предложение',
    formatAlreadyPretty: 'Эта статья уже хорошо оформлена. Ничего не изменено.',
    formatSkippedBudget:
      'Форматирование пропущено, чтобы не превысить ваш лимит расходов. Статья осталась без изменений.',
    formatFailed: 'Не удалось завершить форматирование. Статья осталась без изменений.',
    formatReplyInvalid: 'Ответ ИИ не удалось прочитать, поэтому статья осталась без изменений.',
    formatModelError:
      'У модели форматирования возникла проблема, поэтому статья осталась без изменений.',
    formatEmpty: 'ИИ не вернул текст, поэтому статья осталась без изменений.',
    formatRawHtml:
      'ИИ добавил необработанный HTML, что запрещено, поэтому статья осталась без изменений.',
    formatCitationLost: 'ИИ удалил ссылку на источник, поэтому статья осталась без изменений.',
    formatCitationAdded:
      'ИИ добавил источник, которого не было в статье, поэтому она осталась без изменений.',
    formatNumberChanged: 'ИИ изменил число, поэтому статья осталась без изменений.',
    formatUrlAdded:
      'ИИ добавил ссылку, которой не было в статье, поэтому она осталась без изменений.',
    formatLengthDrift:
      'ИИ слишком сильно изменил длину текста, поэтому статья осталась без изменений.',
    formatHeadingLanguage:
      'ИИ написал заголовки на другом языке, поэтому статья осталась без изменений.',
    formatStructure: 'ИИ слишком сильно изменил структуру, поэтому статья осталась без изменений.',
    formatTableLost: 'ИИ удалил таблицу, поэтому статья осталась без изменений.',
    formatUnknown: 'Форматирование пропущено ({code}). Статья осталась без изменений.',
  },
  [Locale.PT]: {
    authorAgreement:
      'Concordância das preferências dos autores: {percentage}%. O juiz toma a decisão final.',
    formatNotFormattable: 'Este Thread ainda não tem um artigo gerado para formatar.',
    showMore: 'Mostrar mais',
    showLess: 'Mostrar menos',
    alreadyAnswered: 'Este pedido já foi respondido; a sua primeira resposta foi mantida.',
    editorSuggestionTitle: 'Sugestão do leitor que está a aplicar',
    editorSuggestionDismiss: 'Ocultar a sugestão',
    formatAlreadyPretty: 'Este artigo já está bem formatado. Nada foi alterado.',
    formatSkippedBudget:
      'A formatação foi ignorada para respeitar o seu limite de gastos. O artigo ficou como estava.',
    formatFailed: 'Não foi possível concluir a formatação. O artigo ficou como estava.',
    formatReplyInvalid: 'A resposta da IA não pôde ser lida, por isso o artigo ficou como estava.',
    formatModelError:
      'O modelo de formatação teve um problema, por isso o artigo ficou como estava.',
    formatEmpty: 'A IA não devolveu texto, por isso o artigo ficou como estava.',
    formatRawHtml:
      'A IA adicionou HTML bruto, o que não é permitido, por isso o artigo ficou como estava.',
    formatCitationLost: 'A IA removeu uma fonte citada, por isso o artigo ficou como estava.',
    formatCitationAdded:
      'A IA adicionou uma fonte que não estava no artigo, por isso ele ficou como estava.',
    formatNumberChanged: 'A IA alterou um número, por isso o artigo ficou como estava.',
    formatUrlAdded:
      'A IA adicionou um link que não estava no artigo, por isso ele ficou como estava.',
    formatLengthDrift:
      'A IA alterou demasiado o tamanho do texto, por isso o artigo ficou como estava.',
    formatHeadingLanguage:
      'A IA escreveu os títulos noutro idioma, por isso o artigo ficou como estava.',
    formatStructure: 'A IA alterou demasiado a estrutura, por isso o artigo ficou como estava.',
    formatTableLost: 'A IA removeu uma tabela, por isso o artigo ficou como estava.',
    formatUnknown: 'A formatação foi ignorada ({code}). O artigo ficou como estava.',
  },
  [Locale.HI]: {
    authorAgreement: 'लेखकों की पसंद में सहमति: {percentage}%. अंतिम चयन निर्णायक करता है।',
    formatNotFormattable: 'इस Thread में अभी फ़ॉर्मैट करने के लिए कोई तैयार लेख नहीं है।',
    showMore: 'और दिखाएँ',
    showLess: 'कम दिखाएँ',
    alreadyAnswered: 'इस अनुरोध का उत्तर पहले ही दिया जा चुका है; आपका पहला उत्तर रखा गया है।',
    editorSuggestionTitle: 'पाठक का सुझाव जिसे आप लागू कर रहे हैं',
    editorSuggestionDismiss: 'सुझाव छिपाएँ',
    formatAlreadyPretty: 'यह लेख पहले से अच्छी तरह फ़ॉर्मैट है। कुछ नहीं बदला।',
    formatSkippedBudget:
      'आपकी खर्च सीमा में रहने के लिए फ़ॉर्मैटिंग छोड़ दी गई। आपका लेख जैसा था वैसा ही रहा।',
    formatFailed: 'फ़ॉर्मैटिंग पूरी नहीं हो सकी। आपका लेख जैसा था वैसा ही रहा।',
    formatReplyInvalid: 'AI का उत्तर पढ़ा नहीं जा सका, इसलिए आपका लेख जैसा था वैसा ही रहा।',
    formatModelError: 'फ़ॉर्मैटिंग मॉडल में समस्या आई, इसलिए आपका लेख जैसा था वैसा ही रहा।',
    formatEmpty: 'AI ने कोई पाठ नहीं लौटाया, इसलिए आपका लेख जैसा था वैसा ही रहा।',
    formatRawHtml: 'AI ने कच्चा HTML जोड़ा, जो अनुमत नहीं है, इसलिए आपका लेख जैसा था वैसा ही रहा।',
    formatCitationLost: 'AI ने एक स्रोत-उद्धरण हटा दिया, इसलिए आपका लेख जैसा था वैसा ही रहा।',
    formatCitationAdded:
      'AI ने ऐसा स्रोत जोड़ा जो आपके लेख में नहीं था, इसलिए लेख जैसा था वैसा ही रहा।',
    formatNumberChanged: 'AI ने एक संख्या बदल दी, इसलिए आपका लेख जैसा था वैसा ही रहा।',
    formatUrlAdded: 'AI ने ऐसा लिंक जोड़ा जो आपके लेख में नहीं था, इसलिए लेख जैसा था वैसा ही रहा।',
    formatLengthDrift: 'AI ने पाठ की लंबाई बहुत बदल दी, इसलिए आपका लेख जैसा था वैसा ही रहा।',
    formatHeadingLanguage:
      'AI ने शीर्षक किसी दूसरी भाषा में लिखे, इसलिए आपका लेख जैसा था वैसा ही रहा।',
    formatStructure: 'AI ने संरचना बहुत बदल दी, इसलिए आपका लेख जैसा था वैसा ही रहा।',
    formatTableLost: 'AI ने एक तालिका हटा दी, इसलिए आपका लेख जैसा था वैसा ही रहा।',
    formatUnknown: 'फ़ॉर्मैटिंग छोड़ दी गई ({code})। आपका लेख जैसा था वैसा ही रहा।',
  },
  [Locale.JA]: {
    authorAgreement: '著者の選好一致率: {percentage}%。最終判断はジャッジが行います。',
    formatNotFormattable: 'このThreadには、整形できる生成済みの記事がまだありません。',
    showMore: 'もっと見る',
    showLess: '閉じる',
    alreadyAnswered: 'このリクエストにはすでに回答済みです。最初の返信がそのまま保持されました。',
    editorSuggestionTitle: '適用中の読者の提案',
    editorSuggestionDismiss: '提案を隠す',
    formatAlreadyPretty: 'この記事はすでに整った書式です。何も変更していません。',
    formatSkippedBudget:
      '利用上限内に収めるため、書式の整形をスキップしました。記事はそのままです。',
    formatFailed: '書式の整形を完了できませんでした。記事はそのままです。',
    formatReplyInvalid: 'AIの返答を読み取れなかったため、記事はそのままです。',
    formatModelError: '整形モデルで問題が発生したため、記事はそのままです。',
    formatEmpty: 'AIがテキストを返さなかったため、記事はそのままです。',
    formatRawHtml: 'AIが許可されていない生のHTMLを追加したため、記事はそのままです。',
    formatCitationLost: 'AIが出典の引用を削除したため、記事はそのままです。',
    formatCitationAdded: 'AIが記事にない出典を追加したため、記事はそのままです。',
    formatNumberChanged: 'AIが数値を変更したため、記事はそのままです。',
    formatUrlAdded: 'AIが記事にないリンクを追加したため、記事はそのままです。',
    formatLengthDrift: 'AIが文章の長さを大きく変えたため、記事はそのままです。',
    formatHeadingLanguage: 'AIが見出しを別の言語で書いたため、記事はそのままです。',
    formatStructure: 'AIが構成を大きく変えたため、記事はそのままです。',
    formatTableLost: 'AIが表を削除したため、記事はそのままです。',
    formatUnknown: '書式の整形をスキップしました（{code}）。記事はそのままです。',
  },
  [Locale.TH]: {
    authorAgreement: 'ความเห็นตรงกันของผู้เขียน: {percentage}% ผู้ตัดสินเป็นผู้เลือกขั้นสุดท้าย',
    formatNotFormattable: 'Thread นี้ยังไม่มีบทความที่สร้างขึ้นให้จัดรูปแบบ',
    showMore: 'แสดงเพิ่มเติม',
    showLess: 'แสดงน้อยลง',
    alreadyAnswered: 'คำขอนี้ได้รับการตอบแล้ว ระบบเก็บคำตอบแรกของคุณไว้',
    editorSuggestionTitle: 'ข้อเสนอแนะของผู้อ่านที่คุณกำลังนำไปใช้',
    editorSuggestionDismiss: 'ซ่อนข้อเสนอแนะ',
    formatAlreadyPretty: 'บทความนี้จัดรูปแบบดีอยู่แล้ว ไม่มีอะไรเปลี่ยนแปลง',
    formatSkippedBudget: 'ข้ามการจัดรูปแบบเพื่อให้อยู่ในวงเงินใช้จ่ายของคุณ บทความยังคงเหมือนเดิม',
    formatFailed: 'ไม่สามารถจัดรูปแบบให้เสร็จได้ บทความยังคงเหมือนเดิม',
    formatReplyInvalid: 'อ่านคำตอบของ AI ไม่ได้ บทความจึงยังคงเหมือนเดิม',
    formatModelError: 'โมเดลจัดรูปแบบเกิดปัญหา บทความจึงยังคงเหมือนเดิม',
    formatEmpty: 'AI ไม่ได้ส่งข้อความกลับมา บทความจึงยังคงเหมือนเดิม',
    formatRawHtml: 'AI เพิ่ม HTML ดิบซึ่งไม่อนุญาต บทความจึงยังคงเหมือนเดิม',
    formatCitationLost: 'AI ลบการอ้างอิงแหล่งที่มา บทความจึงยังคงเหมือนเดิม',
    formatCitationAdded: 'AI เพิ่มแหล่งที่มาที่ไม่มีในบทความของคุณ บทความจึงยังคงเหมือนเดิม',
    formatNumberChanged: 'AI เปลี่ยนตัวเลข บทความจึงยังคงเหมือนเดิม',
    formatUrlAdded: 'AI เพิ่มลิงก์ที่ไม่มีในบทความของคุณ บทความจึงยังคงเหมือนเดิม',
    formatLengthDrift: 'AI เปลี่ยนความยาวของข้อความมากเกินไป บทความจึงยังคงเหมือนเดิม',
    formatHeadingLanguage: 'AI เขียนหัวข้อเป็นภาษาอื่น บทความจึงยังคงเหมือนเดิม',
    formatStructure: 'AI เปลี่ยนโครงสร้างมากเกินไป บทความจึงยังคงเหมือนเดิม',
    formatTableLost: 'AI ลบตาราง บทความจึงยังคงเหมือนเดิม',
    formatUnknown: 'ข้ามการจัดรูปแบบ ({code}) บทความยังคงเหมือนเดิม',
  },
  [Locale.FA]: {
    authorAgreement: 'میزان توافق ترجیح نویسندگان: {percentage}٪. داور تصمیم نهایی را می‌گیرد.',
    formatNotFormattable: 'این Thread هنوز مقاله تولیدشده‌ای برای قالب‌بندی ندارد.',
    showMore: 'نمایش بیشتر',
    showLess: 'نمایش کمتر',
    alreadyAnswered: 'به این درخواست قبلاً پاسخ داده شده است؛ پاسخ اول شما حفظ شد.',
    editorSuggestionTitle: 'پیشنهاد خواننده که اعمال می‌کنید',
    editorSuggestionDismiss: 'پنهان کردن پیشنهاد',
    formatAlreadyPretty: 'این مقاله از قبل قالب‌بندی خوبی دارد. چیزی تغییر نکرد.',
    formatSkippedBudget: 'قالب‌بندی برای ماندن در سقف هزینه شما رد شد. مقاله همان‌طور که بود ماند.',
    formatFailed: 'قالب‌بندی کامل نشد. مقاله همان‌طور که بود ماند.',
    formatReplyInvalid: 'پاسخ هوش مصنوعی قابل خواندن نبود، پس مقاله همان‌طور که بود ماند.',
    formatModelError: 'مدل قالب‌بندی مشکل داشت، پس مقاله همان‌طور که بود ماند.',
    formatEmpty: 'هوش مصنوعی متنی برنگرداند، پس مقاله همان‌طور که بود ماند.',
    formatRawHtml: 'هوش مصنوعی HTML خام اضافه کرد که مجاز نیست، پس مقاله همان‌طور که بود ماند.',
    formatCitationLost: 'هوش مصنوعی یک منبع را حذف کرد، پس مقاله همان‌طور که بود ماند.',
    formatCitationAdded:
      'هوش مصنوعی منبعی اضافه کرد که در مقاله شما نبود، پس مقاله همان‌طور که بود ماند.',
    formatNumberChanged: 'هوش مصنوعی یک عدد را تغییر داد، پس مقاله همان‌طور که بود ماند.',
    formatUrlAdded:
      'هوش مصنوعی پیوندی اضافه کرد که در مقاله شما نبود، پس مقاله همان‌طور که بود ماند.',
    formatLengthDrift: 'هوش مصنوعی طول متن را بیش از حد تغییر داد، پس مقاله همان‌طور که بود ماند.',
    formatHeadingLanguage:
      'هوش مصنوعی عنوان‌ها را به زبان دیگری نوشت، پس مقاله همان‌طور که بود ماند.',
    formatStructure: 'هوش مصنوعی ساختار را بیش از حد تغییر داد، پس مقاله همان‌طور که بود ماند.',
    formatTableLost: 'هوش مصنوعی یک جدول را حذف کرد، پس مقاله همان‌طور که بود ماند.',
    formatUnknown: 'قالب‌بندی رد شد ({code}). مقاله همان‌طور که بود ماند.',
  },
  [Locale.ZH]: {
    authorAgreement: '作者偏好一致度：{percentage}%。最终选择由评审决定。',
    formatNotFormattable: '此 Thread 还没有可排版的已生成文章。',
    showMore: '显示更多',
    showLess: '收起',
    alreadyAnswered: '此请求已答复；已保留您的第一次回复。',
    editorSuggestionTitle: '您正在采纳的读者建议',
    editorSuggestionDismiss: '隐藏建议',
    formatAlreadyPretty: '这篇文章的格式已经很好，未做任何更改。',
    formatSkippedBudget: '为了不超出您的支出上限，已跳过排版。文章保持原样。',
    formatFailed: '排版未能完成。文章保持原样。',
    formatReplyInvalid: '无法读取 AI 的回复，因此文章保持原样。',
    formatModelError: '排版模型出现问题，因此文章保持原样。',
    formatEmpty: 'AI 没有返回任何文字，因此文章保持原样。',
    formatRawHtml: 'AI 添加了不允许的原始 HTML，因此文章保持原样。',
    formatCitationLost: 'AI 删除了一处来源引用，因此文章保持原样。',
    formatCitationAdded: 'AI 添加了文章中没有的来源，因此文章保持原样。',
    formatNumberChanged: 'AI 更改了一个数字，因此文章保持原样。',
    formatUrlAdded: 'AI 添加了文章中没有的链接，因此文章保持原样。',
    formatLengthDrift: 'AI 对文字长度改动过大，因此文章保持原样。',
    formatHeadingLanguage: 'AI 用另一种语言撰写了标题，因此文章保持原样。',
    formatStructure: 'AI 对结构改动过大，因此文章保持原样。',
    formatTableLost: 'AI 删除了一个表格，因此文章保持原样。',
    formatUnknown: '已跳过排版（{code}）。文章保持原样。',
  },
};
