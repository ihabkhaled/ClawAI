import { Locale } from '@/enums/locale.enum';
import type { PickedModelLocaleTranslation } from '@/types/i18n.types';

/**
 * What the user sees when the model they PICKED fails: the label on an answer
 * that a substitute wrote, and the "try one of these" recovery under a reply
 * where every model failed. All 13 locales, real translations.
 *
 * One file, imported by each locale, so a missing locale is a type error rather
 * than a key rendering raw (`t()` takes a plain string and is not checked).
 * `{original}`, `{answered}` and `{model}` are model display names.
 */
export const PICKED_MODEL_TRANSLATIONS: Record<Locale, PickedModelLocaleTranslation> = {
  [Locale.EN]: {
    failedMessage:
      'The model you picked could not answer, and neither could the backups we tried. Pick another model to try again.',
    fallbackNotice: '{original} failed, so {answered} answered instead.',
    costlierNote: '{answered} can cost more than {original}.',
    suggestionsTitle: 'Try again with',
    tryModel: 'Try {model}',
    chooseAnother: 'Choose another model',
  },
  [Locale.AR]: {
    failedMessage:
      'تعذّر على النموذج الذي اخترته الإجابة، وكذلك النماذج البديلة التي جرّبناها. اختر نموذجًا آخر لإعادة المحاولة.',
    fallbackNotice: 'تعذّر على {original} الإجابة، لذلك أجاب {answered} بدلًا منه.',
    costlierNote: 'قد تكون تكلفة {answered} أعلى من {original}.',
    suggestionsTitle: 'أعد المحاولة باستخدام',
    tryModel: 'جرّب {model}',
    chooseAnother: 'اختر نموذجًا آخر',
  },
  [Locale.DE]: {
    failedMessage:
      'Das gewählte Modell konnte nicht antworten, und die Ersatzmodelle, die wir versucht haben, ebenfalls nicht. Wähle ein anderes Modell, um es erneut zu versuchen.',
    fallbackNotice: '{original} ist ausgefallen, daher hat {answered} geantwortet.',
    costlierNote: '{answered} kann mehr kosten als {original}.',
    suggestionsTitle: 'Erneut versuchen mit',
    tryModel: '{model} versuchen',
    chooseAnother: 'Anderes Modell wählen',
  },
  [Locale.ES]: {
    failedMessage:
      'El modelo que elegiste no pudo responder, ni tampoco los modelos de respaldo que probamos. Elige otro modelo para intentarlo de nuevo.',
    fallbackNotice: '{original} falló, así que respondió {answered}.',
    costlierNote: '{answered} puede costar más que {original}.',
    suggestionsTitle: 'Intentar de nuevo con',
    tryModel: 'Probar {model}',
    chooseAnother: 'Elegir otro modelo',
  },
  [Locale.FA]: {
    failedMessage:
      'مدلی که انتخاب کردید نتوانست پاسخ دهد و مدل‌های جایگزینی که امتحان کردیم هم نتوانستند. برای تلاش دوباره، مدل دیگری انتخاب کنید.',
    fallbackNotice: '{original} با خطا مواجه شد، بنابراین {answered} پاسخ داد.',
    costlierNote: 'هزینه {answered} ممکن است بیشتر از {original} باشد.',
    suggestionsTitle: 'تلاش دوباره با',
    tryModel: 'امتحان {model}',
    chooseAnother: 'انتخاب مدل دیگر',
  },
  [Locale.FR]: {
    failedMessage:
      'Le modèle choisi n’a pas pu répondre, pas plus que les modèles de secours essayés. Choisissez un autre modèle pour réessayer.',
    fallbackNotice: '{original} a échoué, c’est donc {answered} qui a répondu.',
    costlierNote: '{answered} peut coûter plus cher que {original}.',
    suggestionsTitle: 'Réessayer avec',
    tryModel: 'Essayer {model}',
    chooseAnother: 'Choisir un autre modèle',
  },
  [Locale.HI]: {
    failedMessage:
      'आपका चुना हुआ मॉडल जवाब नहीं दे सका, और हमारे आज़माए गए बैकअप मॉडल भी नहीं दे सके। दोबारा कोशिश करने के लिए कोई दूसरा मॉडल चुनें।',
    fallbackNotice: '{original} विफल रहा, इसलिए {answered} ने जवाब दिया।',
    costlierNote: '{answered} की लागत {original} से ज़्यादा हो सकती है।',
    suggestionsTitle: 'इनके साथ दोबारा कोशिश करें',
    tryModel: '{model} आज़माएँ',
    chooseAnother: 'दूसरा मॉडल चुनें',
  },
  [Locale.IT]: {
    failedMessage:
      'Il modello scelto non ha potuto rispondere, e nemmeno i modelli di riserva provati. Scegli un altro modello per riprovare.',
    fallbackNotice: '{original} non ha funzionato, quindi ha risposto {answered}.',
    costlierNote: '{answered} può costare più di {original}.',
    suggestionsTitle: 'Riprova con',
    tryModel: 'Prova {model}',
    chooseAnother: 'Scegli un altro modello',
  },
  [Locale.JA]: {
    failedMessage:
      '選択したモデルは応答できず、試した代替モデルも応答できませんでした。別のモデルを選んで、もう一度お試しください。',
    fallbackNotice: '{original} が失敗したため、代わりに {answered} が回答しました。',
    costlierNote: '{answered} は {original} より料金が高くなる場合があります。',
    suggestionsTitle: '次のモデルでもう一度試す',
    tryModel: '{model} を試す',
    chooseAnother: '別のモデルを選ぶ',
  },
  [Locale.PT]: {
    failedMessage:
      'O modelo que você escolheu não conseguiu responder, nem os modelos de reserva que tentamos. Escolha outro modelo para tentar de novo.',
    fallbackNotice: '{original} falhou, então {answered} respondeu no lugar.',
    costlierNote: '{answered} pode custar mais do que {original}.',
    suggestionsTitle: 'Tentar de novo com',
    tryModel: 'Tentar {model}',
    chooseAnother: 'Escolher outro modelo',
  },
  [Locale.RU]: {
    failedMessage:
      'Выбранная вами модель не смогла ответить, как и запасные модели, которые мы пробовали. Выберите другую модель и повторите попытку.',
    fallbackNotice: '{original} дала сбой, поэтому ответила {answered}.',
    costlierNote: '{answered} может стоить дороже, чем {original}.',
    suggestionsTitle: 'Повторить с моделью',
    tryModel: 'Попробовать {model}',
    chooseAnother: 'Выбрать другую модель',
  },
  [Locale.TH]: {
    failedMessage:
      'โมเดลที่คุณเลือกตอบไม่ได้ และโมเดลสำรองที่เราลองก็ตอบไม่ได้เช่นกัน เลือกโมเดลอื่นเพื่อลองอีกครั้ง',
    fallbackNotice: '{original} ล้มเหลว จึงให้ {answered} ตอบแทน',
    costlierNote: '{answered} อาจมีค่าใช้จ่ายสูงกว่า {original}',
    suggestionsTitle: 'ลองอีกครั้งด้วย',
    tryModel: 'ลอง {model}',
    chooseAnother: 'เลือกโมเดลอื่น',
  },
  [Locale.ZH]: {
    failedMessage: '你选择的模型无法回答，我们尝试的备用模型也都无法回答。请选择其他模型重试。',
    fallbackNotice: '{original} 失败了，因此由 {answered} 作答。',
    costlierNote: '{answered} 的费用可能高于 {original}。',
    suggestionsTitle: '改用以下模型重试',
    tryModel: '试用 {model}',
    chooseAnother: '选择其他模型',
  },
};
