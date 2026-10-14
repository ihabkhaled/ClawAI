import { Locale } from '@/enums/locale.enum';
import type { ThreadFixesLocaleTranslation } from '@/types/i18n.types';

/**
 * Thread owner messages added with the production bug batch (ADR-183): the script-aware topic
 * minimum, the "sensitive details found" editor notice and the "waiting for a worker" queue text.
 * Spread flat into `chat` in every locale (read as `chat.threadFix<Name>`), so a missing locale
 * or key is a type error. `{count}` must be kept as it is; "Thread" is the product's word.
 */
export const THREAD_FIXES_TRANSLATIONS: Record<Locale, ThreadFixesLocaleTranslation> = {
  [Locale.EN]: {
    threadFixTopicTooShort:
      'Describe the topic in at least 10 letters or numbers (4 for Chinese, Japanese or Korean).',
    threadFixSafetyTitle: 'Sensitive details were found in this draft',
    threadFixSafetyHint:
      'It cannot be published until these passages are removed. Edit the text, remove them, then save the edit to check it again.',
    threadFixSafetyKindSecret: 'Possible secret or key',
    threadFixSafetyKindEmail: 'Email address',
    threadFixSafetyKindCard: 'Possible card number',
    threadFixSafetyKindSsn: 'Possible ID number',
    threadFixSafetyKindIban: 'Possible bank account number',
    threadFixQueueNext: 'Waiting for a free worker. You are next.',
    threadFixQueueAhead: 'Waiting for a free worker. {count} jobs are ahead of yours.',
    threadFixModelDegraded: 'failing often right now',
    threadFixQueueWaiting: 'Waiting for a free worker.',
  },
  [Locale.AR]: {
    threadFixTopicTooShort:
      'صِف الموضوع في 10 أحرف أو أرقام على الأقل (4 للصينية أو اليابانية أو الكورية).',
    threadFixSafetyTitle: 'تم العثور على بيانات حساسة في هذه المسودة',
    threadFixSafetyHint:
      'لا يمكن نشرها قبل حذف هذه المقاطع. عدّل النص واحذفها ثم احفظ التعديل ليُفحص مرة أخرى.',
    threadFixSafetyKindSecret: 'سر أو مفتاح محتمل',
    threadFixSafetyKindEmail: 'عنوان بريد إلكتروني',
    threadFixSafetyKindCard: 'رقم بطاقة محتمل',
    threadFixSafetyKindSsn: 'رقم هوية محتمل',
    threadFixSafetyKindIban: 'رقم حساب مصرفي محتمل',
    threadFixQueueNext: 'في انتظار عامل متاح. دورك هو التالي.',
    threadFixQueueAhead: 'في انتظار عامل متاح. يسبق طلبك {count} طلبات.',
    threadFixModelDegraded: 'يفشل كثيراً الآن',
    threadFixQueueWaiting: 'في انتظار عامل متاح.',
  },
  [Locale.DE]: {
    threadFixTopicTooShort:
      'Beschreibe das Thema mit mindestens 10 Buchstaben oder Ziffern (4 bei Chinesisch, Japanisch oder Koreanisch).',
    threadFixSafetyTitle: 'In diesem Entwurf wurden sensible Angaben gefunden',
    threadFixSafetyHint:
      'Er kann erst veröffentlicht werden, wenn diese Stellen entfernt sind. Bearbeite den Text, entferne sie und speichere die Änderung zur erneuten Prüfung.',
    threadFixSafetyKindSecret: 'Mögliches Geheimnis oder Schlüssel',
    threadFixSafetyKindEmail: 'E-Mail-Adresse',
    threadFixSafetyKindCard: 'Mögliche Kartennummer',
    threadFixSafetyKindSsn: 'Mögliche Ausweisnummer',
    threadFixSafetyKindIban: 'Mögliche Kontonummer',
    threadFixQueueNext: 'Warte auf einen freien Worker. Du bist als Nächstes dran.',
    threadFixQueueAhead: 'Warte auf einen freien Worker. {count} Aufträge sind vor deinem.',
    threadFixModelDegraded: 'fällt gerade oft aus',
    threadFixQueueWaiting: 'Warte auf einen freien Worker.',
  },
  [Locale.ES]: {
    threadFixTopicTooShort:
      'Describe el tema con al menos 10 letras o números (4 en chino, japonés o coreano).',
    threadFixSafetyTitle: 'Se encontraron datos sensibles en este borrador',
    threadFixSafetyHint:
      'No se puede publicar hasta quitar estos pasajes. Edita el texto, quítalos y guarda la edición para comprobarlo de nuevo.',
    threadFixSafetyKindSecret: 'Posible secreto o clave',
    threadFixSafetyKindEmail: 'Dirección de correo electrónico',
    threadFixSafetyKindCard: 'Posible número de tarjeta',
    threadFixSafetyKindSsn: 'Posible número de identificación',
    threadFixSafetyKindIban: 'Posible número de cuenta bancaria',
    threadFixQueueNext: 'Esperando un trabajador libre. Eres el siguiente.',
    threadFixQueueAhead: 'Esperando un trabajador libre. Hay {count} trabajos antes que el tuyo.',
    threadFixModelDegraded: 'falla mucho ahora',
    threadFixQueueWaiting: 'Esperando un trabajador libre.',
  },
  [Locale.FA]: {
    threadFixTopicTooShort:
      'موضوع را دست‌کم با ۱۰ حرف یا عدد شرح دهید (۴ برای چینی، ژاپنی یا کره‌ای).',
    threadFixSafetyTitle: 'در این پیش‌نویس اطلاعات حساس پیدا شد',
    threadFixSafetyHint:
      'تا زمانی که این بخش‌ها حذف نشوند منتشر نمی‌شود. متن را ویرایش کنید، آن‌ها را حذف کنید و ویرایش را ذخیره کنید تا دوباره بررسی شود.',
    threadFixSafetyKindSecret: 'راز یا کلید احتمالی',
    threadFixSafetyKindEmail: 'نشانی ایمیل',
    threadFixSafetyKindCard: 'شمارهٔ کارت احتمالی',
    threadFixSafetyKindSsn: 'شمارهٔ شناسایی احتمالی',
    threadFixSafetyKindIban: 'شمارهٔ حساب بانکی احتمالی',
    threadFixQueueNext: 'در انتظار یک پردازشگر آزاد. نوبت شما بعدی است.',
    threadFixQueueAhead: 'در انتظار یک پردازشگر آزاد. {count} کار پیش از کار شما هستند.',
    threadFixModelDegraded: 'اکنون اغلب شکست می‌خورد',
    threadFixQueueWaiting: 'در انتظار یک پردازشگر آزاد.',
  },
  [Locale.FR]: {
    threadFixTopicTooShort:
      'Décrivez le sujet avec au moins 10 lettres ou chiffres (4 pour le chinois, le japonais ou le coréen).',
    threadFixSafetyTitle: 'Des informations sensibles ont été trouvées dans ce brouillon',
    threadFixSafetyHint:
      'Il ne peut pas être publié tant que ces passages ne sont pas supprimés. Modifiez le texte, supprimez-les, puis enregistrez la modification pour une nouvelle vérification.',
    threadFixSafetyKindSecret: 'Secret ou clé possible',
    threadFixSafetyKindEmail: 'Adresse e-mail',
    threadFixSafetyKindCard: 'Numéro de carte possible',
    threadFixSafetyKindSsn: 'Numéro d’identité possible',
    threadFixSafetyKindIban: 'Numéro de compte bancaire possible',
    threadFixQueueNext: 'En attente d’un worker libre. Vous êtes le suivant.',
    threadFixQueueAhead: 'En attente d’un worker libre. {count} tâches passent avant la vôtre.',
    threadFixModelDegraded: 'échoue souvent en ce moment',
    threadFixQueueWaiting: 'En attente d’un worker libre.',
  },
  [Locale.HI]: {
    threadFixTopicTooShort:
      'विषय को कम से कम 10 अक्षरों या अंकों में बताएँ (चीनी, जापानी या कोरियाई के लिए 4)।',
    threadFixSafetyTitle: 'इस ड्राफ़्ट में संवेदनशील जानकारी मिली',
    threadFixSafetyHint:
      'ये अंश हटाए बिना इसे प्रकाशित नहीं किया जा सकता। पाठ संपादित करें, इन्हें हटाएँ, फिर दोबारा जाँच के लिए संपादन सहेजें।',
    threadFixSafetyKindSecret: 'संभावित गोपनीय कुंजी',
    threadFixSafetyKindEmail: 'ईमेल पता',
    threadFixSafetyKindCard: 'संभावित कार्ड नंबर',
    threadFixSafetyKindSsn: 'संभावित पहचान संख्या',
    threadFixSafetyKindIban: 'संभावित बैंक खाता संख्या',
    threadFixQueueNext: 'खाली वर्कर की प्रतीक्षा है। अगली बारी आपकी है।',
    threadFixQueueAhead: 'खाली वर्कर की प्रतीक्षा है। आपसे पहले {count} कार्य हैं।',
    threadFixModelDegraded: 'अभी अक्सर विफल हो रहा है',
    threadFixQueueWaiting: 'खाली वर्कर की प्रतीक्षा है।',
  },
  [Locale.IT]: {
    threadFixTopicTooShort:
      'Descrivi l’argomento con almeno 10 lettere o numeri (4 per cinese, giapponese o coreano).',
    threadFixSafetyTitle: 'In questa bozza sono stati trovati dati sensibili',
    threadFixSafetyHint:
      'Non può essere pubblicata finché questi passaggi non vengono rimossi. Modifica il testo, rimuovili e salva la modifica per ricontrollarla.',
    threadFixSafetyKindSecret: 'Possibile segreto o chiave',
    threadFixSafetyKindEmail: 'Indirizzo e-mail',
    threadFixSafetyKindCard: 'Possibile numero di carta',
    threadFixSafetyKindSsn: 'Possibile numero di identificazione',
    threadFixSafetyKindIban: 'Possibile numero di conto bancario',
    threadFixQueueNext: 'In attesa di un worker libero. Sei il prossimo.',
    threadFixQueueAhead: 'In attesa di un worker libero. Ci sono {count} lavori prima del tuo.',
    threadFixModelDegraded: 'sta fallendo spesso ora',
    threadFixQueueWaiting: 'In attesa di un worker libero.',
  },
  [Locale.JA]: {
    threadFixTopicTooShort:
      'トピックは10文字以上の文字または数字で入力してください（中国語・日本語・韓国語は4文字以上）。',
    threadFixSafetyTitle: 'この下書きに機密情報が見つかりました',
    threadFixSafetyHint:
      'これらの箇所を削除するまで公開できません。本文を編集して削除し、編集を保存して再確認してください。',
    threadFixSafetyKindSecret: 'シークレットやキーの可能性',
    threadFixSafetyKindEmail: 'メールアドレス',
    threadFixSafetyKindCard: 'カード番号の可能性',
    threadFixSafetyKindSsn: '個人識別番号の可能性',
    threadFixSafetyKindIban: '銀行口座番号の可能性',
    threadFixQueueNext: '空いているワーカーを待っています。次はあなたの番です。',
    threadFixQueueAhead: '空いているワーカーを待っています。あなたの前に{count}件あります。',
    threadFixModelDegraded: '現在よく失敗しています',
    threadFixQueueWaiting: '空いているワーカーを待っています。',
  },
  [Locale.PT]: {
    threadFixTopicTooShort:
      'Descreva o tema com pelo menos 10 letras ou números (4 para chinês, japonês ou coreano).',
    threadFixSafetyTitle: 'Foram encontrados dados sensíveis neste rascunho',
    threadFixSafetyHint:
      'Ele não pode ser publicado até que estes trechos sejam removidos. Edite o texto, remova-os e salve a edição para verificar de novo.',
    threadFixSafetyKindSecret: 'Possível segredo ou chave',
    threadFixSafetyKindEmail: 'Endereço de e-mail',
    threadFixSafetyKindCard: 'Possível número de cartão',
    threadFixSafetyKindSsn: 'Possível número de identificação',
    threadFixSafetyKindIban: 'Possível número de conta bancária',
    threadFixQueueNext: 'Aguardando um worker livre. Você é o próximo.',
    threadFixQueueAhead: 'Aguardando um worker livre. Há {count} trabalhos antes do seu.',
    threadFixModelDegraded: 'falhando com frequência agora',
    threadFixQueueWaiting: 'Aguardando um worker livre.',
  },
  [Locale.RU]: {
    threadFixTopicTooShort:
      'Опишите тему как минимум 10 буквами или цифрами (4 для китайского, японского или корейского).',
    threadFixSafetyTitle: 'В этом черновике найдены конфиденциальные данные',
    threadFixSafetyHint:
      'Его нельзя опубликовать, пока эти фрагменты не удалены. Измените текст, удалите их и сохраните правку для повторной проверки.',
    threadFixSafetyKindSecret: 'Возможный секрет или ключ',
    threadFixSafetyKindEmail: 'Адрес электронной почты',
    threadFixSafetyKindCard: 'Возможный номер карты',
    threadFixSafetyKindSsn: 'Возможный идентификационный номер',
    threadFixSafetyKindIban: 'Возможный номер банковского счёта',
    threadFixQueueNext: 'Ожидание свободного обработчика. Вы следующий.',
    threadFixQueueAhead: 'Ожидание свободного обработчика. Перед вашей задачей: {count}.',
    threadFixModelDegraded: 'сейчас часто даёт сбои',
    threadFixQueueWaiting: 'Ожидание свободного обработчика.',
  },
  [Locale.TH]: {
    threadFixTopicTooShort:
      'อธิบายหัวข้ออย่างน้อย 10 ตัวอักษรหรือตัวเลข (4 ตัวสำหรับภาษาจีน ญี่ปุ่น หรือเกาหลี)',
    threadFixSafetyTitle: 'พบข้อมูลที่ละเอียดอ่อนในฉบับร่างนี้',
    threadFixSafetyHint:
      'ยังเผยแพร่ไม่ได้จนกว่าจะลบข้อความเหล่านี้ แก้ไขข้อความ ลบส่วนดังกล่าว แล้วบันทึกการแก้ไขเพื่อตรวจสอบอีกครั้ง',
    threadFixSafetyKindSecret: 'อาจเป็นความลับหรือคีย์',
    threadFixSafetyKindEmail: 'ที่อยู่อีเมล',
    threadFixSafetyKindCard: 'อาจเป็นหมายเลขบัตร',
    threadFixSafetyKindSsn: 'อาจเป็นหมายเลขประจำตัว',
    threadFixSafetyKindIban: 'อาจเป็นหมายเลขบัญชีธนาคาร',
    threadFixQueueNext: 'กำลังรอตัวประมวลผลที่ว่าง ถึงคิวของคุณเป็นลำดับถัดไป',
    threadFixQueueAhead: 'กำลังรอตัวประมวลผลที่ว่าง มี {count} งานก่อนหน้างานของคุณ',
    threadFixModelDegraded: 'ล้มเหลวบ่อยในขณะนี้',
    threadFixQueueWaiting: 'กำลังรอตัวประมวลผลที่ว่าง',
  },
  [Locale.ZH]: {
    threadFixTopicTooShort: '请用至少 10 个字母或数字描述主题（中文、日文、韩文至少 4 个字）。',
    threadFixSafetyTitle: '此草稿中发现了敏感信息',
    threadFixSafetyHint: '删除这些内容之前无法发布。请编辑文本，删除它们，然后保存修改以重新检查。',
    threadFixSafetyKindSecret: '可能的密钥或机密',
    threadFixSafetyKindEmail: '电子邮件地址',
    threadFixSafetyKindCard: '可能的银行卡号',
    threadFixSafetyKindSsn: '可能的身份证号',
    threadFixSafetyKindIban: '可能的银行账号',
    threadFixQueueNext: '正在等待空闲的工作进程。下一个就轮到你。',
    threadFixQueueAhead: '正在等待空闲的工作进程。你的任务前面还有 {count} 个。',
    threadFixModelDegraded: '目前经常失败',
    threadFixQueueWaiting: '正在等待空闲的工作进程。',
  },
};
