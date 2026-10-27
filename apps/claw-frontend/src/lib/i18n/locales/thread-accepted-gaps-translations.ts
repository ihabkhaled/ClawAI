import { Locale } from '@/enums/locale.enum';
import type { ThreadAcceptedGapsLocaleTranslation } from '@/types/i18n.types';

/**
 * "Accept these gaps" (ADR-194): the recovery remedy, the checkbox list in the retry dialog, the
 * notice readers see at the top of an article written with accepted gaps, and the step wording.
 * Spread flat into `chat` in every locale (read as `chat.threadGaps<Name>`), so a missing locale
 * or key is a type error. No placeholders.
 */
export const THREAD_ACCEPTED_GAPS_TRANSLATIONS: Record<
  Locale,
  ThreadAcceptedGapsLocaleTranslation
> = {
  [Locale.EN]: {
    threadGapsRemedyAccept: 'Accept these gaps and write it honestly',
    threadGapsLegend: 'Gaps you accept',
    threadGapsExplain:
      'The article will say clearly what could not be found. Reviewers will still check everything else.',
    threadGapsPickHint: 'Nothing is accepted unless you tick it.',
    threadGapsNoticeTitle: 'Some requested sources could not be found',
    threadGapsNoticeBody:
      'The author accepted these gaps. They are listed under Limitations in this article. Read that section before relying on it.',
    threadGapsStepAccepted: 'The owner accepted these gaps',
    threadGapsStepWaived: 'Blockers about the accepted gaps were set aside.',
    threadGapsStepMissing:
      'The limitations section is missing or incomplete. The authors are asked to add it.',
  },
  [Locale.AR]: {
    threadGapsRemedyAccept: 'اقبل هذه الفجوات واكتب المقال بصدق',
    threadGapsLegend: 'الفجوات التي تقبلها',
    threadGapsExplain: 'سيذكر المقال بوضوح ما تعذّر العثور عليه. وسيواصل المراجعون فحص كل شيء آخر.',
    threadGapsPickHint: 'لا يُقبل أي شيء ما لم تحدده.',
    threadGapsNoticeTitle: 'تعذّر العثور على بعض المصادر المطلوبة',
    threadGapsNoticeBody:
      'قبل صاحب المقال هذه الفجوات، وهي مذكورة في قسم القيود. اقرأ ذلك القسم قبل الاعتماد على المقال.',
    threadGapsStepAccepted: 'قبل صاحب المقال هذه الفجوات',
    threadGapsStepWaived: 'تم تجاوز العوائق المتعلقة بالفجوات المقبولة.',
    threadGapsStepMissing: 'قسم القيود ناقص أو غير مكتمل. نطلب من الكتّاب إضافته.',
  },
  [Locale.DE]: {
    threadGapsRemedyAccept: 'Diese Lücken akzeptieren und ehrlich schreiben',
    threadGapsLegend: 'Lücken, die Sie akzeptieren',
    threadGapsExplain:
      'Der Artikel sagt klar, was nicht gefunden werden konnte. Die Prüfer kontrollieren weiterhin alles andere.',
    threadGapsPickHint: 'Nichts wird akzeptiert, solange Sie es nicht anhaken.',
    threadGapsNoticeTitle: 'Einige gewünschte Quellen konnten nicht gefunden werden',
    threadGapsNoticeBody:
      'Der Verfasser hat diese Lücken akzeptiert. Sie stehen im Abschnitt „Einschränkungen“. Lesen Sie ihn, bevor Sie sich auf den Artikel verlassen.',
    threadGapsStepAccepted: 'Der Verfasser hat diese Lücken akzeptiert',
    threadGapsStepWaived: 'Beanstandungen zu den akzeptierten Lücken wurden zurückgestellt.',
    threadGapsStepMissing:
      'Der Abschnitt zu den Einschränkungen fehlt oder ist unvollständig. Die Autoren werden gebeten, ihn zu ergänzen.',
  },
  [Locale.ES]: {
    threadGapsRemedyAccept: 'Aceptar estas lagunas y escribirlo con honestidad',
    threadGapsLegend: 'Lagunas que aceptas',
    threadGapsExplain:
      'El artículo dirá con claridad lo que no se pudo encontrar. Los revisores seguirán comprobando todo lo demás.',
    threadGapsPickHint: 'No se acepta nada que no marques.',
    threadGapsNoticeTitle: 'No se pudieron encontrar algunas fuentes solicitadas',
    threadGapsNoticeBody:
      'El autor aceptó estas lagunas. Aparecen en la sección «Limitaciones». Léela antes de fiarte de este artículo.',
    threadGapsStepAccepted: 'El autor aceptó estas lagunas',
    threadGapsStepWaived: 'Se dejaron de lado los bloqueos sobre las lagunas aceptadas.',
    threadGapsStepMissing:
      'Falta la sección de limitaciones o está incompleta. Se pide a los autores que la añadan.',
  },
  [Locale.FA]: {
    threadGapsRemedyAccept: 'این شکاف‌ها را بپذیر و صادقانه بنویس',
    threadGapsLegend: 'شکاف‌هایی که می‌پذیرید',
    threadGapsExplain:
      'مقاله به‌روشنی می‌گوید چه چیزی پیدا نشد. داوران همچنان همه‌چیز دیگر را بررسی می‌کنند.',
    threadGapsPickHint: 'تا چیزی را علامت نزنید پذیرفته نمی‌شود.',
    threadGapsNoticeTitle: 'برخی منابع درخواستی پیدا نشد',
    threadGapsNoticeBody:
      'نویسنده این شکاف‌ها را پذیرفته است. آن‌ها در بخش «محدودیت‌ها» آمده‌اند. پیش از اتکا به این مقاله آن را بخوانید.',
    threadGapsStepAccepted: 'نویسنده این شکاف‌ها را پذیرفت',
    threadGapsStepWaived: 'ایرادهای مربوط به شکاف‌های پذیرفته‌شده کنار گذاشته شد.',
    threadGapsStepMissing:
      'بخش محدودیت‌ها وجود ندارد یا ناقص است. از نویسندگان خواسته می‌شود آن را اضافه کنند.',
  },
  [Locale.FR]: {
    threadGapsRemedyAccept: 'Accepter ces lacunes et écrire honnêtement',
    threadGapsLegend: 'Lacunes que vous acceptez',
    threadGapsExplain:
      "L'article dira clairement ce qui n'a pas pu être trouvé. Les relecteurs vérifieront toujours tout le reste.",
    threadGapsPickHint: "Rien n'est accepté sans que vous cochiez la case.",
    threadGapsNoticeTitle: "Certaines sources demandées n'ont pas pu être trouvées",
    threadGapsNoticeBody:
      "L'auteur a accepté ces lacunes. Elles figurent dans la section « Limites ». Lisez-la avant de vous fier à cet article.",
    threadGapsStepAccepted: "L'auteur a accepté ces lacunes",
    threadGapsStepWaived: 'Les blocages liés aux lacunes acceptées ont été écartés.',
    threadGapsStepMissing:
      "La section sur les limites est absente ou incomplète. Les auteurs sont invités à l'ajouter.",
  },
  [Locale.HI]: {
    threadGapsRemedyAccept: 'इन कमियों को स्वीकार करें और ईमानदारी से लिखें',
    threadGapsLegend: 'वे कमियाँ जिन्हें आप स्वीकार करते हैं',
    threadGapsExplain:
      'लेख साफ़ बताएगा कि क्या नहीं मिल सका। समीक्षक बाकी सब कुछ पहले की तरह जाँचेंगे।',
    threadGapsPickHint: 'जब तक आप चुनते नहीं, कुछ भी स्वीकार नहीं किया जाता।',
    threadGapsNoticeTitle: 'माँगे गए कुछ स्रोत नहीं मिल सके',
    threadGapsNoticeBody:
      'लेखक ने इन कमियों को स्वीकार किया है। वे «सीमाएँ» अनुभाग में दी गई हैं। इस लेख पर भरोसा करने से पहले उसे पढ़ें।',
    threadGapsStepAccepted: 'लेखक ने इन कमियों को स्वीकार किया',
    threadGapsStepWaived: 'स्वीकार की गई कमियों से जुड़ी रुकावटें अलग रखी गईं।',
    threadGapsStepMissing:
      'सीमाओं वाला अनुभाग गायब या अधूरा है। लेखकों से उसे जोड़ने को कहा जा रहा है।',
  },
  [Locale.IT]: {
    threadGapsRemedyAccept: 'Accetta queste lacune e scrivilo con onestà',
    threadGapsLegend: 'Lacune che accetti',
    threadGapsExplain:
      "L'articolo dirà chiaramente cosa non è stato possibile trovare. I revisori continueranno a controllare tutto il resto.",
    threadGapsPickHint: 'Non viene accettato nulla che tu non abbia spuntato.',
    threadGapsNoticeTitle: 'Alcune fonti richieste non sono state trovate',
    threadGapsNoticeBody:
      "L'autore ha accettato queste lacune. Sono elencate nella sezione «Limiti». Leggila prima di fare affidamento su questo articolo.",
    threadGapsStepAccepted: "L'autore ha accettato queste lacune",
    threadGapsStepWaived: 'Gli ostacoli relativi alle lacune accettate sono stati messi da parte.',
    threadGapsStepMissing:
      'La sezione sui limiti manca o è incompleta. Si chiede agli autori di aggiungerla.',
  },
  [Locale.JA]: {
    threadGapsRemedyAccept: 'これらの不足を受け入れて正直に書く',
    threadGapsLegend: '受け入れる不足',
    threadGapsExplain:
      '記事は、見つからなかったものを明確に述べます。審査者はそれ以外のすべてを引き続き確認します。',
    threadGapsPickHint: 'チェックを入れないものは受け入れられません。',
    threadGapsNoticeTitle: '求められた一部の出典が見つかりませんでした',
    threadGapsNoticeBody:
      '投稿者はこれらの不足を受け入れました。記事内の「制限事項」に記載されています。この記事に頼る前にお読みください。',
    threadGapsStepAccepted: '投稿者がこれらの不足を受け入れました',
    threadGapsStepWaived: '受け入れた不足に関する指摘は保留されました。',
    threadGapsStepMissing: '制限事項の節がないか不完全です。執筆者に追加を依頼しています。',
  },
  [Locale.PT]: {
    threadGapsRemedyAccept: 'Aceitar estas lacunas e escrever com honestidade',
    threadGapsLegend: 'Lacunas que você aceita',
    threadGapsExplain:
      'O artigo dirá com clareza o que não foi possível encontrar. Os revisores continuarão verificando todo o resto.',
    threadGapsPickHint: 'Nada é aceito sem que você marque.',
    threadGapsNoticeTitle: 'Algumas fontes solicitadas não foram encontradas',
    threadGapsNoticeBody:
      'O autor aceitou estas lacunas. Elas estão na seção «Limitações». Leia-a antes de confiar neste artigo.',
    threadGapsStepAccepted: 'O autor aceitou estas lacunas',
    threadGapsStepWaived: 'Os bloqueios sobre as lacunas aceitas foram deixados de lado.',
    threadGapsStepMissing:
      'A seção de limitações está ausente ou incompleta. Os autores foram solicitados a adicioná-la.',
  },
  [Locale.RU]: {
    threadGapsRemedyAccept: 'Принять эти пробелы и написать честно',
    threadGapsLegend: 'Пробелы, которые вы принимаете',
    threadGapsExplain:
      'В статье будет ясно сказано, что найти не удалось. Рецензенты по-прежнему проверят всё остальное.',
    threadGapsPickHint: 'Ничего не принимается, пока вы не отметите.',
    threadGapsNoticeTitle: 'Часть запрошенных источников найти не удалось',
    threadGapsNoticeBody:
      'Автор принял эти пробелы. Они описаны в разделе «Ограничения». Прочитайте его, прежде чем полагаться на статью.',
    threadGapsStepAccepted: 'Автор принял эти пробелы',
    threadGapsStepWaived: 'Замечания по принятым пробелам отложены.',
    threadGapsStepMissing:
      'Раздел об ограничениях отсутствует или неполон. Авторов просят его добавить.',
  },
  [Locale.TH]: {
    threadGapsRemedyAccept: 'ยอมรับช่องว่างเหล่านี้และเขียนอย่างตรงไปตรงมา',
    threadGapsLegend: 'ช่องว่างที่คุณยอมรับ',
    threadGapsExplain: 'บทความจะบอกชัดเจนว่าอะไรที่หาไม่พบ ผู้ตรวจยังคงตรวจสิ่งอื่นทั้งหมดตามปกติ',
    threadGapsPickHint: 'จะไม่มีสิ่งใดถูกยอมรับ หากคุณไม่ได้ติ๊กเลือก',
    threadGapsNoticeTitle: 'ไม่พบแหล่งที่มาบางส่วนที่ขอไว้',
    threadGapsNoticeBody:
      'เจ้าของบทความยอมรับช่องว่างเหล่านี้ ซึ่งระบุไว้ในส่วน “ข้อจำกัด” โปรดอ่านก่อนใช้บทความนี้เป็นที่พึ่ง',
    threadGapsStepAccepted: 'เจ้าของบทความยอมรับช่องว่างเหล่านี้',
    threadGapsStepWaived: 'ข้อขัดข้องที่เกี่ยวกับช่องว่างที่ยอมรับถูกพักไว้',
    threadGapsStepMissing: 'ส่วนข้อจำกัดหายไปหรือไม่ครบ กำลังขอให้ผู้เขียนเพิ่ม',
  },
  [Locale.ZH]: {
    threadGapsRemedyAccept: '接受这些缺口并如实撰写',
    threadGapsLegend: '您接受的缺口',
    threadGapsExplain: '文章会清楚说明哪些内容未能找到。审阅者仍会检查其他所有内容。',
    threadGapsPickHint: '未勾选的内容不会被接受。',
    threadGapsNoticeTitle: '部分所需来源未能找到',
    threadGapsNoticeBody:
      '作者已接受这些缺口，并列在文章的“局限性”部分。使用本文前请先阅读该部分。',
    threadGapsStepAccepted: '作者已接受这些缺口',
    threadGapsStepWaived: '与已接受缺口相关的阻止项已搁置。',
    threadGapsStepMissing: '缺少局限性部分或内容不完整。正在请作者补充。',
  },
};
