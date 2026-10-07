import { Locale } from '@/enums/locale.enum';
import type { CreditFallbackLocaleTranslation } from '@/types/i18n.types';

/**
 * What the user sees when a credit model could not be used (connector credit or
 * free credit-model requests used up) and a model that needs no credit answered
 * instead. One file imported by every locale, so a missing locale is a type error
 * rather than a raw key (`t()` takes a plain string). `{original}` and
 * `{answered}` are model display names.
 */
export const CREDIT_FALLBACK_TRANSLATIONS: Record<Locale, CreditFallbackLocaleTranslation> = {
  [Locale.EN]: {
    creditExhausted:
      'Your connector credit is used up, so {answered} answered instead. No credit was used.',
    freeAllowanceExhausted:
      'You have used all your free credit-model requests this month, so {answered} answered instead. No credit was used.',
    promptTooExpensive:
      '{original} costs more than the credit you have left, so {answered} answered instead. No credit was used.',
    modelNotInFreeAllowance:
      '{original} costs more than the free plan covers, so {answered} answered instead. No credit was used.',
    topUp: 'Add credit or upgrade your plan to use {original} again.',
  },
  [Locale.AR]: {
    creditExhausted:
      'انتهى رصيد الموصّلات لديك، لذلك أجاب {answered} بدلًا منه. لم يُستهلك أي رصيد.',
    freeAllowanceExhausted:
      'استخدمت كل طلباتك المجانية للنماذج المدفوعة هذا الشهر، لذلك أجاب {answered} بدلًا منه. لم يُستهلك أي رصيد.',
    promptTooExpensive:
      'تكلفة {original} أعلى من الرصيد المتبقي لديك، لذلك أجاب {answered} بدلًا منه. لم يُستهلك أي رصيد.',
    modelNotInFreeAllowance:
      'تكلفة {original} أعلى مما تغطيه الخطة المجانية، لذلك أجاب {answered} بدلاً منه. لم يُستهلك أي رصيد.',
    topUp: 'أضف رصيدًا أو رقِّ خطتك لاستخدام {original} مرة أخرى.',
  },
  [Locale.DE]: {
    creditExhausted:
      'Dein Connector-Guthaben ist aufgebraucht, daher hat {answered} geantwortet. Es wurde kein Guthaben verbraucht.',
    freeAllowanceExhausted:
      'Du hast alle kostenlosen Anfragen an Guthaben-Modelle in diesem Monat verbraucht, daher hat {answered} geantwortet. Es wurde kein Guthaben verbraucht.',
    promptTooExpensive:
      '{original} kostet mehr als dein restliches Guthaben, daher hat {answered} geantwortet. Es wurde kein Guthaben verbraucht.',
    modelNotInFreeAllowance:
      '{original} kostet mehr, als der kostenlose Tarif abdeckt, daher hat {answered} geantwortet. Es wurde kein Guthaben verbraucht.',
    topUp: 'Lade Guthaben auf oder wechsle den Tarif, um {original} wieder zu nutzen.',
  },
  [Locale.ES]: {
    creditExhausted:
      'Tu crédito de conectores se agotó, así que respondió {answered}. No se usó crédito.',
    freeAllowanceExhausted:
      'Has usado todas tus solicitudes gratuitas a modelos de crédito este mes, así que respondió {answered}. No se usó crédito.',
    promptTooExpensive:
      '{original} cuesta más que el crédito que te queda, así que respondió {answered}. No se usó crédito.',
    modelNotInFreeAllowance:
      '{original} cuesta más de lo que cubre el plan gratuito, así que respondió {answered}. No se usó crédito.',
    topUp: 'Añade crédito o mejora tu plan para volver a usar {original}.',
  },
  [Locale.FA]: {
    creditExhausted:
      'اعتبار اتصال‌دهنده‌های شما تمام شده است، بنابراین {answered} پاسخ داد. هیچ اعتباری مصرف نشد.',
    freeAllowanceExhausted:
      'تمام درخواست‌های رایگان شما به مدل‌های اعتباری در این ماه مصرف شده است، بنابراین {answered} پاسخ داد. هیچ اعتباری مصرف نشد.',
    promptTooExpensive:
      'هزینهٔ {original} از اعتبار باقی‌مانده شما بیشتر است، بنابراین {answered} پاسخ داد. هیچ اعتباری مصرف نشد.',
    modelNotInFreeAllowance:
      'هزینه {original} بیشتر از پوشش طرح رایگان است، پس {answered} پاسخ داد. هیچ اعتباری مصرف نشد.',
    topUp: 'برای استفادهٔ دوباره از {original} اعتبار اضافه کنید یا طرح خود را ارتقا دهید.',
  },
  [Locale.FR]: {
    creditExhausted:
      'Votre crédit de connecteurs est épuisé, donc {answered} a répondu. Aucun crédit n’a été utilisé.',
    freeAllowanceExhausted:
      'Vous avez utilisé toutes vos requêtes gratuites vers les modèles à crédit ce mois-ci, donc {answered} a répondu. Aucun crédit n’a été utilisé.',
    promptTooExpensive:
      '{original} coûte plus que le crédit qu’il vous reste, donc {answered} a répondu. Aucun crédit n’a été utilisé.',
    modelNotInFreeAllowance:
      '{original} coûte plus que ce que couvre l’offre gratuite, donc {answered} a répondu à la place. Aucun crédit n’a été utilisé.',
    topUp: 'Ajoutez du crédit ou changez d’offre pour réutiliser {original}.',
  },
  [Locale.HI]: {
    creditExhausted:
      'आपका कनेक्टर क्रेडिट समाप्त हो गया है, इसलिए {answered} ने जवाब दिया। कोई क्रेडिट खर्च नहीं हुआ।',
    freeAllowanceExhausted:
      'आपने इस महीने क्रेडिट मॉडल के सभी मुफ़्त अनुरोध इस्तेमाल कर लिए हैं, इसलिए {answered} ने जवाब दिया। कोई क्रेडिट खर्च नहीं हुआ।',
    promptTooExpensive:
      '{original} की लागत आपके बचे क्रेडिट से ज़्यादा है, इसलिए {answered} ने जवाब दिया। कोई क्रेडिट खर्च नहीं हुआ।',
    modelNotInFreeAllowance:
      '{original} की लागत मुफ़्त प्लान की सीमा से अधिक है, इसलिए {answered} ने जवाब दिया। कोई क्रेडिट इस्तेमाल नहीं हुआ।',
    topUp: '{original} दोबारा इस्तेमाल करने के लिए क्रेडिट जोड़ें या प्लान अपग्रेड करें।',
  },
  [Locale.IT]: {
    creditExhausted:
      'Il tuo credito dei connettori è esaurito, quindi ha risposto {answered}. Nessun credito è stato usato.',
    freeAllowanceExhausted:
      'Hai usato tutte le richieste gratuite ai modelli a credito di questo mese, quindi ha risposto {answered}. Nessun credito è stato usato.',
    promptTooExpensive:
      '{original} costa più del credito che ti resta, quindi ha risposto {answered}. Nessun credito è stato usato.',
    modelNotInFreeAllowance:
      '{original} costa più di quanto copre il piano gratuito, quindi ha risposto {answered}. Non è stato usato credito.',
    topUp: 'Aggiungi credito o passa a un piano superiore per usare di nuovo {original}.',
  },
  [Locale.JA]: {
    creditExhausted:
      'コネクターのクレジットを使い切ったため、{answered} が代わりに回答しました。クレジットは消費されていません。',
    freeAllowanceExhausted:
      '今月のクレジットモデルの無料リクエストを使い切ったため、{answered} が代わりに回答しました。クレジットは消費されていません。',
    promptTooExpensive:
      '{original} は残りのクレジットを上回るため、{answered} が代わりに回答しました。クレジットは消費されていません。',
    modelNotInFreeAllowance:
      '{original} の費用が無料プランの対象を超えるため、代わりに {answered} が回答しました。クレジットは使われていません。',
    topUp: '{original} を再び使うには、クレジットを追加するかプランをアップグレードしてください。',
  },
  [Locale.PT]: {
    creditExhausted:
      'Seu crédito de conectores acabou, então {answered} respondeu. Nenhum crédito foi usado.',
    freeAllowanceExhausted:
      'Você usou todas as solicitações gratuitas a modelos de crédito neste mês, então {answered} respondeu. Nenhum crédito foi usado.',
    promptTooExpensive:
      '{original} custa mais do que o crédito que resta, então {answered} respondeu. Nenhum crédito foi usado.',
    modelNotInFreeAllowance:
      '{original} custa mais do que o plano grátis cobre, então {answered} respondeu. Nenhum crédito foi usado.',
    topUp: 'Adicione crédito ou faça upgrade do plano para usar {original} novamente.',
  },
  [Locale.RU]: {
    creditExhausted:
      'Кредит коннекторов закончился, поэтому ответила модель {answered}. Кредит не потрачен.',
    freeAllowanceExhausted:
      'Вы использовали все бесплатные запросы к кредитным моделям в этом месяце, поэтому ответила модель {answered}. Кредит не потрачен.',
    promptTooExpensive:
      '{original} стоит больше оставшегося кредита, поэтому ответила модель {answered}. Кредит не потрачен.',
    modelNotInFreeAllowance:
      '{original} стоит дороже, чем покрывает бесплатный тариф, поэтому ответил {answered}. Кредит не использовался.',
    topUp: 'Пополните кредит или перейдите на другой тариф, чтобы снова использовать {original}.',
  },
  [Locale.TH]: {
    creditExhausted: 'เครดิตตัวเชื่อมต่อของคุณหมดแล้ว {answered} จึงตอบแทน ไม่มีการใช้เครดิต',
    freeAllowanceExhausted:
      'คุณใช้คำขอฟรีสำหรับโมเดลแบบใช้เครดิตครบแล้วในเดือนนี้ {answered} จึงตอบแทน ไม่มีการใช้เครดิต',
    promptTooExpensive:
      '{original} มีค่าใช้จ่ายสูงกว่าเครดิตที่เหลือ {answered} จึงตอบแทน ไม่มีการใช้เครดิต',
    modelNotInFreeAllowance:
      '{original} มีต้นทุนสูงกว่าที่แพ็กเกจฟรีครอบคลุม จึงให้ {answered} ตอบแทน ไม่มีการใช้เครดิต',
    topUp: 'เติมเครดิตหรืออัปเกรดแพ็กเกจเพื่อใช้ {original} อีกครั้ง',
  },
  [Locale.ZH]: {
    creditExhausted: '你的连接器额度已用完，因此由 {answered} 回答。未消耗任何额度。',
    freeAllowanceExhausted:
      '你本月的免费额度模型请求已用完，因此由 {answered} 回答。未消耗任何额度。',
    promptTooExpensive:
      '{original} 的费用超过你剩余的额度，因此由 {answered} 回答。未消耗任何额度。',
    modelNotInFreeAllowance:
      '{original} 的费用超出免费套餐覆盖范围，因此由 {answered} 回答。未使用任何额度。',
    topUp: '充值或升级套餐后即可再次使用 {original}。',
  },
};
