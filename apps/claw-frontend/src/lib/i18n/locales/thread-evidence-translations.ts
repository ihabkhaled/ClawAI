import { Locale } from '@/enums/locale.enum';
import type { ThreadEvidenceLocaleTranslation } from '@/types/i18n.types';

/**
 * Thread review-failure messages (ADR-193): a review blocked by an unmet requirement is no longer
 * called "scored too low", the extra research pass has its own step wording, and the "Research
 * more" and "Narrow the claims" remedies. Spread flat into `chat` in every locale (read as
 * `chat.threadEvidence<Name>`), so a missing locale or key is a type error. Keep `{reviewer}`,
 * `{score}`, `{min}` and `{count}` as they are.
 */
export const THREAD_EVIDENCE_TRANSLATIONS: Record<Locale, ThreadEvidenceLocaleTranslation> = {
  [Locale.EN]: {
    threadEvidenceReasonGap: 'The reviewers asked for sources that the research could not find.',
    threadEvidenceReasonBlocked:
      'The score was high enough, but the reviewer blocked the draft on an unmet requirement.',
    threadEvidenceRemedyResearchMore: 'Research more',
    threadEvidenceRemedyNarrow: 'Narrow the claims',
    threadEvidenceBlockedTitle: 'Blocked by an unmet requirement',
    threadEvidenceBlockedLead: 'The {reviewer} listed what is still missing:',
    threadEvidenceLowLead: 'The {reviewer} listed these problems:',
    threadEvidenceScoreLine: '{score} of 100, needs {min} and no blockers',
    threadEvidenceBlockerLabel: 'The reviewer wrote',
    threadEvidenceStepBlocked:
      'The score was high enough, but the reviewer blocked the draft on an unmet requirement.',
    threadEvidenceHintBlocked:
      'Read the quoted blocker below, then research more or narrow the claims.',
    threadEvidenceStepLooking: 'Looking for the missing sources',
    threadEvidenceStepFound: 'Found {count} new sources.',
    threadEvidenceStepEmpty:
      'No new sources were found. Continuing with the sources already collected.',
    threadEvidenceStepFailed:
      'The extra research did not work. Continuing with the sources already collected.',
    threadEvidenceStepSpend: 'Extra research skipped: most of the spend cap is already used.',
    threadEvidenceResearchMoreLabel: 'Research more before writing',
    threadEvidenceResearchMoreHint: 'Runs a fresh research pass instead of reusing the saved one.',
    threadEvidenceNarrowHint:
      'The reviewers asked for sources that could not be found. Remove or soften the demand for sources in the topic and the blocker goes away.',
  },
  [Locale.AR]: {
    threadEvidenceReasonGap: 'طلب المراجعون مصادر لم يستطع البحث العثور عليها.',
    threadEvidenceReasonBlocked: 'كانت الدرجة كافية، لكن المراجع منع المسودة بسبب شرط لم يتحقق.',
    threadEvidenceRemedyResearchMore: 'ابحث أكثر',
    threadEvidenceRemedyNarrow: 'ضيّق الادعاءات',
    threadEvidenceBlockedTitle: 'محجوبة بسبب شرط لم يتحقق',
    threadEvidenceBlockedLead: 'ذكر {reviewer} ما ما زال ناقصاً:',
    threadEvidenceLowLead: 'ذكر {reviewer} هذه المشكلات:',
    threadEvidenceScoreLine: '{score} من 100، والمطلوب {min} وبلا أي عوائق',
    threadEvidenceBlockerLabel: 'كتب المراجع',
    threadEvidenceStepBlocked: 'كانت الدرجة كافية، لكن المراجع منع المسودة بسبب شرط لم يتحقق.',
    threadEvidenceHintBlocked: 'اقرأ العائق المقتبس أدناه، ثم ابحث أكثر أو ضيّق الادعاءات.',
    threadEvidenceStepLooking: 'جارٍ البحث عن المصادر الناقصة',
    threadEvidenceStepFound: 'تم العثور على {count} مصادر جديدة.',
    threadEvidenceStepEmpty: 'لم يُعثر على مصادر جديدة. نتابع بالمصادر التي جُمعت.',
    threadEvidenceStepFailed: 'لم ينجح البحث الإضافي. نتابع بالمصادر التي جُمعت.',
    threadEvidenceStepSpend: 'تم تخطي البحث الإضافي: معظم حد الإنفاق مستخدم بالفعل.',
    threadEvidenceResearchMoreLabel: 'ابحث أكثر قبل الكتابة',
    threadEvidenceResearchMoreHint: 'يُجري بحثاً جديداً بدلاً من إعادة استخدام البحث المحفوظ.',
    threadEvidenceNarrowHint:
      'طلب المراجعون مصادر لم يمكن العثور عليها. أزل أو خفف طلب المصادر في الموضوع وسيزول العائق.',
  },
  [Locale.DE]: {
    threadEvidenceReasonGap:
      'Die Prüfer verlangten Quellen, die die Recherche nicht finden konnte.',
    threadEvidenceReasonBlocked:
      'Die Punktzahl reichte, aber der Prüfer hat den Entwurf wegen einer unerfüllten Anforderung blockiert.',
    threadEvidenceRemedyResearchMore: 'Mehr recherchieren',
    threadEvidenceRemedyNarrow: 'Aussagen eingrenzen',
    threadEvidenceBlockedTitle: 'Durch eine unerfüllte Anforderung blockiert',
    threadEvidenceBlockedLead: '{reviewer} nennt, was noch fehlt:',
    threadEvidenceLowLead: '{reviewer} nennt diese Probleme:',
    threadEvidenceScoreLine: '{score} von 100, erforderlich sind {min} und keine Blocker',
    threadEvidenceBlockerLabel: 'Der Prüfer schrieb',
    threadEvidenceStepBlocked:
      'Die Punktzahl reichte, aber der Prüfer hat den Entwurf wegen einer unerfüllten Anforderung blockiert.',
    threadEvidenceHintBlocked:
      'Lies den zitierten Blocker unten und recherchiere dann mehr oder grenze die Aussagen ein.',
    threadEvidenceStepLooking: 'Suche nach den fehlenden Quellen',
    threadEvidenceStepFound: '{count} neue Quellen gefunden.',
    threadEvidenceStepEmpty:
      'Keine neuen Quellen gefunden. Es geht mit den bisherigen Quellen weiter.',
    threadEvidenceStepFailed:
      'Die zusätzliche Recherche hat nicht funktioniert. Es geht mit den bisherigen Quellen weiter.',
    threadEvidenceStepSpend:
      'Zusätzliche Recherche übersprungen: Der größte Teil des Ausgabenlimits ist schon verbraucht.',
    threadEvidenceResearchMoreLabel: 'Vor dem Schreiben mehr recherchieren',
    threadEvidenceResearchMoreHint:
      'Startet eine neue Recherche, statt die gespeicherte wiederzuverwenden.',
    threadEvidenceNarrowHint:
      'Die Prüfer verlangten Quellen, die nicht gefunden wurden. Streiche oder entschärfe die Quellenforderung im Thema, dann entfällt der Blocker.',
  },
  [Locale.ES]: {
    threadEvidenceReasonGap:
      'Los revisores pidieron fuentes que la investigación no pudo encontrar.',
    threadEvidenceReasonBlocked:
      'La puntuación bastó, pero el revisor bloqueó el borrador por un requisito sin cumplir.',
    threadEvidenceRemedyResearchMore: 'Investigar más',
    threadEvidenceRemedyNarrow: 'Acotar las afirmaciones',
    threadEvidenceBlockedTitle: 'Bloqueado por un requisito sin cumplir',
    threadEvidenceBlockedLead: '{reviewer} indicó lo que aún falta:',
    threadEvidenceLowLead: '{reviewer} indicó estos problemas:',
    threadEvidenceScoreLine: '{score} de 100, se necesita {min} y ningún bloqueo',
    threadEvidenceBlockerLabel: 'El revisor escribió',
    threadEvidenceStepBlocked:
      'La puntuación bastó, pero el revisor bloqueó el borrador por un requisito sin cumplir.',
    threadEvidenceHintBlocked:
      'Lee el bloqueo citado abajo y luego investiga más o acota las afirmaciones.',
    threadEvidenceStepLooking: 'Buscando las fuentes que faltan',
    threadEvidenceStepFound: 'Se encontraron {count} fuentes nuevas.',
    threadEvidenceStepEmpty:
      'No se encontraron fuentes nuevas. Se continúa con las fuentes ya reunidas.',
    threadEvidenceStepFailed:
      'La investigación adicional no funcionó. Se continúa con las fuentes ya reunidas.',
    threadEvidenceStepSpend:
      'Investigación adicional omitida: ya se usó la mayor parte del límite de gasto.',
    threadEvidenceResearchMoreLabel: 'Investigar más antes de escribir',
    threadEvidenceResearchMoreHint:
      'Hace una investigación nueva en lugar de reutilizar la guardada.',
    threadEvidenceNarrowHint:
      'Los revisores pidieron fuentes que no se encontraron. Quita o suaviza la exigencia de fuentes en el tema y el bloqueo desaparece.',
  },
  [Locale.FA]: {
    threadEvidenceReasonGap: 'بازبین‌ها منابعی خواستند که پژوهش نتوانست پیدا کند.',
    threadEvidenceReasonBlocked:
      'امتیاز کافی بود، اما بازبین پیش‌نویس را به‌خاطر یک الزام برآورده‌نشده مسدود کرد.',
    threadEvidenceRemedyResearchMore: 'پژوهش بیشتر',
    threadEvidenceRemedyNarrow: 'محدود کردن ادعاها',
    threadEvidenceBlockedTitle: 'مسدود شده به‌خاطر یک الزام برآورده‌نشده',
    threadEvidenceBlockedLead: '{reviewer} آنچه هنوز کم است را فهرست کرد:',
    threadEvidenceLowLead: '{reviewer} این مشکلات را فهرست کرد:',
    threadEvidenceScoreLine: '{score} از 100، نیاز به {min} و بدون هیچ مانعی',
    threadEvidenceBlockerLabel: 'بازبین نوشت',
    threadEvidenceStepBlocked:
      'امتیاز کافی بود، اما بازبین پیش‌نویس را به‌خاطر یک الزام برآورده‌نشده مسدود کرد.',
    threadEvidenceHintBlocked:
      'مانع نقل‌شده در پایین را بخوانید، سپس پژوهش بیشتری انجام دهید یا ادعاها را محدود کنید.',
    threadEvidenceStepLooking: 'در حال جست‌وجوی منابع گم‌شده',
    threadEvidenceStepFound: '{count} منبع جدید پیدا شد.',
    threadEvidenceStepEmpty: 'منبع جدیدی پیدا نشد. با منابع جمع‌آوری‌شده ادامه می‌دهیم.',
    threadEvidenceStepFailed: 'پژوهش اضافی کار نکرد. با منابع جمع‌آوری‌شده ادامه می‌دهیم.',
    threadEvidenceStepSpend: 'پژوهش اضافی رد شد: بیشتر سقف هزینه مصرف شده است.',
    threadEvidenceResearchMoreLabel: 'پیش از نوشتن، پژوهش بیشتری انجام بده',
    threadEvidenceResearchMoreHint:
      'به‌جای استفاده از پژوهش ذخیره‌شده، یک پژوهش تازه انجام می‌دهد.',
    threadEvidenceNarrowHint:
      'بازبین‌ها منابعی خواستند که پیدا نشد. خواست منبع را از موضوع حذف یا نرم کنید تا مانع برداشته شود.',
  },
  [Locale.FR]: {
    threadEvidenceReasonGap:
      'Les relecteurs ont demandé des sources que la recherche n’a pas pu trouver.',
    threadEvidenceReasonBlocked:
      'Le score suffisait, mais le relecteur a bloqué le brouillon à cause d’une exigence non satisfaite.',
    threadEvidenceRemedyResearchMore: 'Rechercher davantage',
    threadEvidenceRemedyNarrow: 'Restreindre les affirmations',
    threadEvidenceBlockedTitle: 'Bloqué par une exigence non satisfaite',
    threadEvidenceBlockedLead: '{reviewer} a indiqué ce qui manque encore :',
    threadEvidenceLowLead: '{reviewer} a indiqué ces problèmes :',
    threadEvidenceScoreLine: '{score} sur 100, il faut {min} et aucun blocage',
    threadEvidenceBlockerLabel: 'Le relecteur a écrit',
    threadEvidenceStepBlocked:
      'Le score suffisait, mais le relecteur a bloqué le brouillon à cause d’une exigence non satisfaite.',
    threadEvidenceHintBlocked:
      'Lisez le blocage cité ci-dessous, puis recherchez davantage ou restreignez les affirmations.',
    threadEvidenceStepLooking: 'Recherche des sources manquantes',
    threadEvidenceStepFound: '{count} nouvelles sources trouvées.',
    threadEvidenceStepEmpty:
      'Aucune nouvelle source trouvée. On continue avec les sources déjà réunies.',
    threadEvidenceStepFailed:
      'La recherche supplémentaire a échoué. On continue avec les sources déjà réunies.',
    threadEvidenceStepSpend:
      'Recherche supplémentaire ignorée : la plus grande partie du plafond de dépenses est déjà utilisée.',
    threadEvidenceResearchMoreLabel: 'Rechercher davantage avant d’écrire',
    threadEvidenceResearchMoreHint:
      'Lance une nouvelle recherche au lieu de réutiliser celle qui est enregistrée.',
    threadEvidenceNarrowHint:
      'Les relecteurs ont demandé des sources introuvables. Retirez ou adoucissez l’exigence de sources dans le sujet et le blocage disparaît.',
  },
  [Locale.HI]: {
    threadEvidenceReasonGap: 'समीक्षकों ने ऐसे स्रोत माँगे जो शोध में नहीं मिल सके।',
    threadEvidenceReasonBlocked:
      'स्कोर काफ़ी था, पर समीक्षक ने एक अधूरी शर्त के कारण ड्राफ़्ट रोक दिया।',
    threadEvidenceRemedyResearchMore: 'और शोध करें',
    threadEvidenceRemedyNarrow: 'दावे सीमित करें',
    threadEvidenceBlockedTitle: 'एक अधूरी शर्त के कारण रोका गया',
    threadEvidenceBlockedLead: '{reviewer} ने बताया कि अभी क्या कमी है:',
    threadEvidenceLowLead: '{reviewer} ने ये समस्याएँ बताईं:',
    threadEvidenceScoreLine: '100 में से {score}, ज़रूरत {min} और कोई रुकावट नहीं',
    threadEvidenceBlockerLabel: 'समीक्षक ने लिखा',
    threadEvidenceStepBlocked:
      'स्कोर काफ़ी था, पर समीक्षक ने एक अधूरी शर्त के कारण ड्राफ़्ट रोक दिया।',
    threadEvidenceHintBlocked: 'नीचे उद्धृत रुकावट पढ़ें, फिर और शोध करें या दावे सीमित करें।',
    threadEvidenceStepLooking: 'छूटे हुए स्रोत खोजे जा रहे हैं',
    threadEvidenceStepFound: '{count} नए स्रोत मिले।',
    threadEvidenceStepEmpty: 'कोई नया स्रोत नहीं मिला। अब तक जुटाए स्रोतों के साथ आगे बढ़ रहे हैं।',
    threadEvidenceStepFailed:
      'अतिरिक्त शोध सफल नहीं हुआ। अब तक जुटाए स्रोतों के साथ आगे बढ़ रहे हैं।',
    threadEvidenceStepSpend:
      'अतिरिक्त शोध छोड़ा गया: खर्च सीमा का ज़्यादातर हिस्सा पहले ही इस्तेमाल हो चुका है।',
    threadEvidenceResearchMoreLabel: 'लिखने से पहले और शोध करें',
    threadEvidenceResearchMoreHint: 'सहेजे गए शोध को दोबारा इस्तेमाल करने की जगह नया शोध चलाता है।',
    threadEvidenceNarrowHint:
      'समीक्षकों ने ऐसे स्रोत माँगे जो नहीं मिले। विषय से स्रोतों की माँग हटाएँ या नरम करें, रुकावट हट जाएगी।',
  },
  [Locale.IT]: {
    threadEvidenceReasonGap: 'I revisori hanno chiesto fonti che la ricerca non ha trovato.',
    threadEvidenceReasonBlocked:
      'Il punteggio bastava, ma il revisore ha bloccato la bozza per un requisito non soddisfatto.',
    threadEvidenceRemedyResearchMore: 'Cerca di più',
    threadEvidenceRemedyNarrow: 'Restringi le affermazioni',
    threadEvidenceBlockedTitle: 'Bloccata da un requisito non soddisfatto',
    threadEvidenceBlockedLead: '{reviewer} ha indicato cosa manca ancora:',
    threadEvidenceLowLead: '{reviewer} ha indicato questi problemi:',
    threadEvidenceScoreLine: '{score} su 100, servono {min} e nessun blocco',
    threadEvidenceBlockerLabel: 'Il revisore ha scritto',
    threadEvidenceStepBlocked:
      'Il punteggio bastava, ma il revisore ha bloccato la bozza per un requisito non soddisfatto.',
    threadEvidenceHintBlocked:
      'Leggi il blocco citato qui sotto, poi cerca di più o restringi le affermazioni.',
    threadEvidenceStepLooking: 'Cerco le fonti mancanti',
    threadEvidenceStepFound: 'Trovate {count} nuove fonti.',
    threadEvidenceStepEmpty: 'Nessuna nuova fonte trovata. Si prosegue con le fonti già raccolte.',
    threadEvidenceStepFailed:
      'La ricerca extra non ha funzionato. Si prosegue con le fonti già raccolte.',
    threadEvidenceStepSpend: 'Ricerca extra saltata: gran parte del limite di spesa è già usata.',
    threadEvidenceResearchMoreLabel: 'Cerca di più prima di scrivere',
    threadEvidenceResearchMoreHint: 'Esegue una nuova ricerca invece di riusare quella salvata.',
    threadEvidenceNarrowHint:
      'I revisori hanno chiesto fonti non trovate. Togli o attenua la richiesta di fonti nell’argomento e il blocco scompare.',
  },
  [Locale.JA]: {
    threadEvidenceReasonGap: '査読者が求めた出典を、調査では見つけられませんでした。',
    threadEvidenceReasonBlocked:
      'スコアは足りていましたが、満たされていない要件のため査読者が下書きを止めました。',
    threadEvidenceRemedyResearchMore: 'さらに調査する',
    threadEvidenceRemedyNarrow: '主張を絞る',
    threadEvidenceBlockedTitle: '満たされていない要件によって止められました',
    threadEvidenceBlockedLead: '{reviewer}が、まだ足りない点を挙げました:',
    threadEvidenceLowLead: '{reviewer}が次の問題を挙げました:',
    threadEvidenceScoreLine: '100点中{score}点、必要なのは{min}点以上かつ阻害要因なし',
    threadEvidenceBlockerLabel: '査読者の記述',
    threadEvidenceStepBlocked:
      'スコアは足りていましたが、満たされていない要件のため査読者が下書きを止めました。',
    threadEvidenceHintBlocked: '下に引用した阻害要因を読み、さらに調査するか主張を絞ってください。',
    threadEvidenceStepLooking: '不足している出典を探しています',
    threadEvidenceStepFound: '新しい出典を{count}件見つけました。',
    threadEvidenceStepEmpty: '新しい出典は見つかりませんでした。集めた出典で続けます。',
    threadEvidenceStepFailed: '追加調査はうまくいきませんでした。集めた出典で続けます。',
    threadEvidenceStepSpend: '追加調査を省略しました: 支出上限の大半をすでに使っています。',
    threadEvidenceResearchMoreLabel: '書く前にさらに調査する',
    threadEvidenceResearchMoreHint: '保存済みの調査を再利用せず、新しく調査します。',
    threadEvidenceNarrowHint:
      '査読者が求めた出典は見つかりませんでした。トピックから出典の要求を外すか弱めると、阻害要因はなくなります。',
  },
  [Locale.PT]: {
    threadEvidenceReasonGap: 'Os revisores pediram fontes que a pesquisa não conseguiu encontrar.',
    threadEvidenceReasonBlocked:
      'A nota bastou, mas o revisor bloqueou o rascunho por um requisito não atendido.',
    threadEvidenceRemedyResearchMore: 'Pesquisar mais',
    threadEvidenceRemedyNarrow: 'Restringir as afirmações',
    threadEvidenceBlockedTitle: 'Bloqueado por um requisito não atendido',
    threadEvidenceBlockedLead: '{reviewer} apontou o que ainda falta:',
    threadEvidenceLowLead: '{reviewer} apontou estes problemas:',
    threadEvidenceScoreLine: '{score} de 100, é preciso {min} e nenhum bloqueio',
    threadEvidenceBlockerLabel: 'O revisor escreveu',
    threadEvidenceStepBlocked:
      'A nota bastou, mas o revisor bloqueou o rascunho por um requisito não atendido.',
    threadEvidenceHintBlocked:
      'Leia o bloqueio citado abaixo e depois pesquise mais ou restrinja as afirmações.',
    threadEvidenceStepLooking: 'Procurando as fontes que faltam',
    threadEvidenceStepFound: '{count} novas fontes encontradas.',
    threadEvidenceStepEmpty: 'Nenhuma fonte nova encontrada. Seguimos com as fontes já reunidas.',
    threadEvidenceStepFailed: 'A pesquisa extra não funcionou. Seguimos com as fontes já reunidas.',
    threadEvidenceStepSpend:
      'Pesquisa extra ignorada: a maior parte do limite de gastos já foi usada.',
    threadEvidenceResearchMoreLabel: 'Pesquisar mais antes de escrever',
    threadEvidenceResearchMoreHint: 'Faz uma pesquisa nova em vez de reutilizar a salva.',
    threadEvidenceNarrowHint:
      'Os revisores pediram fontes que não foram encontradas. Remova ou suavize a exigência de fontes no tema e o bloqueio some.',
  },
  [Locale.RU]: {
    threadEvidenceReasonGap: 'Рецензенты запросили источники, которые поиск не смог найти.',
    threadEvidenceReasonBlocked:
      'Оценки хватило, но рецензент заблокировал черновик из-за невыполненного требования.',
    threadEvidenceRemedyResearchMore: 'Искать больше',
    threadEvidenceRemedyNarrow: 'Сузить утверждения',
    threadEvidenceBlockedTitle: 'Заблокировано невыполненным требованием',
    threadEvidenceBlockedLead: '{reviewer} указал, чего ещё не хватает:',
    threadEvidenceLowLead: '{reviewer} указал на такие проблемы:',
    threadEvidenceScoreLine: '{score} из 100, нужно {min} и ни одной блокировки',
    threadEvidenceBlockerLabel: 'Рецензент написал',
    threadEvidenceStepBlocked:
      'Оценки хватило, но рецензент заблокировал черновик из-за невыполненного требования.',
    threadEvidenceHintBlocked:
      'Прочитайте процитированную ниже блокировку, затем поищите больше или сузьте утверждения.',
    threadEvidenceStepLooking: 'Ищем недостающие источники',
    threadEvidenceStepFound: 'Найдено новых источников: {count}.',
    threadEvidenceStepEmpty: 'Новых источников не найдено. Продолжаем с уже собранными.',
    threadEvidenceStepFailed:
      'Дополнительный поиск не удался. Продолжаем с уже собранными источниками.',
    threadEvidenceStepSpend:
      'Дополнительный поиск пропущен: большая часть лимита расходов уже использована.',
    threadEvidenceResearchMoreLabel: 'Искать больше перед написанием',
    threadEvidenceResearchMoreHint:
      'Запускает новый поиск вместо повторного использования сохранённого.',
    threadEvidenceNarrowHint:
      'Рецензенты запросили источники, которых не нашли. Уберите или смягчите требование источников в теме, и блокировка исчезнет.',
  },
  [Locale.TH]: {
    threadEvidenceReasonGap: 'ผู้ตรวจต้องการแหล่งที่มาที่การค้นคว้าหาไม่พบ',
    threadEvidenceReasonBlocked: 'คะแนนผ่านแล้ว แต่ผู้ตรวจระงับฉบับร่างเพราะข้อกำหนดที่ยังไม่ครบ',
    threadEvidenceRemedyResearchMore: 'ค้นคว้าเพิ่ม',
    threadEvidenceRemedyNarrow: 'จำกัดขอบเขตข้อกล่าวอ้าง',
    threadEvidenceBlockedTitle: 'ถูกระงับเพราะข้อกำหนดที่ยังไม่ครบ',
    threadEvidenceBlockedLead: '{reviewer} ระบุสิ่งที่ยังขาด:',
    threadEvidenceLowLead: '{reviewer} ระบุปัญหาเหล่านี้:',
    threadEvidenceScoreLine: '{score} จาก 100 ต้องได้ {min} และไม่มีข้อติดขัด',
    threadEvidenceBlockerLabel: 'ผู้ตรวจเขียนว่า',
    threadEvidenceStepBlocked: 'คะแนนผ่านแล้ว แต่ผู้ตรวจระงับฉบับร่างเพราะข้อกำหนดที่ยังไม่ครบ',
    threadEvidenceHintBlocked:
      'อ่านข้อติดขัดที่อ้างไว้ด้านล่าง แล้วค้นคว้าเพิ่มหรือจำกัดขอบเขตข้อกล่าวอ้าง',
    threadEvidenceStepLooking: 'กำลังหาแหล่งที่มาที่ขาด',
    threadEvidenceStepFound: 'พบแหล่งที่มาใหม่ {count} แหล่ง',
    threadEvidenceStepEmpty: 'ไม่พบแหล่งที่มาใหม่ ดำเนินการต่อด้วยแหล่งที่มาที่รวบรวมไว้',
    threadEvidenceStepFailed: 'การค้นคว้าเพิ่มไม่สำเร็จ ดำเนินการต่อด้วยแหล่งที่มาที่รวบรวมไว้',
    threadEvidenceStepSpend: 'ข้ามการค้นคว้าเพิ่ม: ใช้วงเงินค่าใช้จ่ายไปเกือบหมดแล้ว',
    threadEvidenceResearchMoreLabel: 'ค้นคว้าเพิ่มก่อนเขียน',
    threadEvidenceResearchMoreHint: 'ค้นคว้าใหม่แทนการใช้ผลที่บันทึกไว้',
    threadEvidenceNarrowHint:
      'ผู้ตรวจต้องการแหล่งที่มาที่หาไม่พบ ลบหรือลดการเรียกร้องแหล่งที่มาออกจากหัวข้อ ข้อติดขัดจะหายไป',
  },
  [Locale.ZH]: {
    threadEvidenceReasonGap: '审阅者要求的来源，研究没有找到。',
    threadEvidenceReasonBlocked: '分数够了，但审阅者因一项未满足的要求拦下了草稿。',
    threadEvidenceRemedyResearchMore: '继续研究',
    threadEvidenceRemedyNarrow: '收窄论断',
    threadEvidenceBlockedTitle: '被一项未满足的要求拦下',
    threadEvidenceBlockedLead: '{reviewer}列出了仍然缺少的内容：',
    threadEvidenceLowLead: '{reviewer}列出了这些问题：',
    threadEvidenceScoreLine: '{score}/100，需要 {min} 分且没有阻碍项',
    threadEvidenceBlockerLabel: '审阅者写道',
    threadEvidenceStepBlocked: '分数够了，但审阅者因一项未满足的要求拦下了草稿。',
    threadEvidenceHintBlocked: '请阅读下方引用的阻碍项，然后继续研究或收窄论断。',
    threadEvidenceStepLooking: '正在寻找缺少的来源',
    threadEvidenceStepFound: '找到了 {count} 个新来源。',
    threadEvidenceStepEmpty: '没有找到新来源。将使用已收集的来源继续。',
    threadEvidenceStepFailed: '额外研究没有成功。将使用已收集的来源继续。',
    threadEvidenceStepSpend: '已跳过额外研究：支出上限的大部分已用完。',
    threadEvidenceResearchMoreLabel: '写作前继续研究',
    threadEvidenceResearchMoreHint: '重新做一次研究，而不是复用已保存的研究。',
    threadEvidenceNarrowHint:
      '审阅者要求的来源没有找到。去掉或放宽主题里对来源的要求，阻碍项就会消失。',
  },
};
