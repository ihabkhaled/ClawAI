import { Locale } from '@/enums/locale.enum';
import type { PluginsStatusLocaleTranslation } from '@/types/i18n.types';

/**
 * Plugin install follow-ups: the catalog status labels an admin sees, the plan and entitlements
 * error messages, the key-not-saved message, the already-installed sentence and the minimum
 * length message of a generated settings field. One file imported by every locale, so a missing
 * locale is a type error rather than a raw key. `{min}` is a character count.
 */
export const PLUGINS_STATUS_TRANSLATIONS: Record<Locale, PluginsStatusLocaleTranslation> = {
  [Locale.EN]: {
    catalogStatus: {
      DRAFT: 'Draft',
      PUBLISHED: 'Published',
      DEPRECATED: 'Deprecated',
      HIDDEN: 'Hidden',
    },
    errors: {
      planDisabled: 'Your plan does not include plugins. See plans to add them.',
      entitlementsUnavailable: 'We could not check your plan right now. Try again in a moment.',
      credentialFailed:
        'The plugin is installed, but your key was not saved. Try the key again, or close this dialog and add it in the Installed settings.',
    },
    install: {
      alreadyInstalled: 'You already installed this plugin. Manage it from the Installed page.',
    },
    validation: {
      tooShort: 'Enter at least {min} characters.',
    },
  },
  [Locale.AR]: {
    catalogStatus: {
      DRAFT: 'مسودة',
      PUBLISHED: 'منشورة',
      DEPRECATED: 'متوقفة',
      HIDDEN: 'مخفية',
    },
    errors: {
      planDisabled: 'خطتك لا تتضمن الإضافات. اطّلع على الخطط لإضافتها.',
      entitlementsUnavailable: 'تعذّر التحقق من خطتك الآن. حاول مرة أخرى بعد قليل.',
      credentialFailed:
        'تم تثبيت الإضافة لكن لم يُحفظ مفتاحك. أعد محاولة إدخال المفتاح، أو أغلق هذه النافذة وأضفه من إعدادات الإضافات المثبّتة.',
    },
    install: {
      alreadyInstalled: 'لقد ثبّتّ هذه الإضافة بالفعل. أدرها من صفحة الإضافات المثبّتة.',
    },
    validation: {
      tooShort: 'أدخل {min} أحرف على الأقل.',
    },
  },
  [Locale.FR]: {
    catalogStatus: {
      DRAFT: 'Brouillon',
      PUBLISHED: 'Publié',
      DEPRECATED: 'Obsolète',
      HIDDEN: 'Masqué',
    },
    errors: {
      planDisabled: 'Votre offre n’inclut pas les plugins. Consultez les offres pour les ajouter.',
      entitlementsUnavailable:
        'Impossible de vérifier votre offre pour le moment. Réessayez dans un instant.',
      credentialFailed:
        'Le plugin est installé, mais votre clé n’a pas été enregistrée. Réessayez la clé, ou fermez cette fenêtre et ajoutez-la dans les réglages des plugins installés.',
    },
    install: {
      alreadyInstalled:
        'Vous avez déjà installé ce plugin. Gérez-le depuis la page des plugins installés.',
    },
    validation: {
      tooShort: 'Saisissez au moins {min} caractères.',
    },
  },
  [Locale.IT]: {
    catalogStatus: {
      DRAFT: 'Bozza',
      PUBLISHED: 'Pubblicato',
      DEPRECATED: 'Obsoleto',
      HIDDEN: 'Nascosto',
    },
    errors: {
      planDisabled: 'Il tuo piano non include i plugin. Consulta i piani per aggiungerli.',
      entitlementsUnavailable:
        'Non è stato possibile verificare il tuo piano ora. Riprova tra un attimo.',
      credentialFailed:
        'Il plugin è installato, ma la tua chiave non è stata salvata. Riprova con la chiave, oppure chiudi questa finestra e aggiungila nelle impostazioni dei plugin installati.',
    },
    install: {
      alreadyInstalled:
        'Hai già installato questo plugin. Gestiscilo dalla pagina dei plugin installati.',
    },
    validation: {
      tooShort: 'Inserisci almeno {min} caratteri.',
    },
  },
  [Locale.DE]: {
    catalogStatus: {
      DRAFT: 'Entwurf',
      PUBLISHED: 'Veröffentlicht',
      DEPRECATED: 'Veraltet',
      HIDDEN: 'Ausgeblendet',
    },
    errors: {
      planDisabled:
        'Ihr Tarif enthält keine Plugins. Sehen Sie sich die Tarife an, um sie zu erhalten.',
      entitlementsUnavailable:
        'Ihr Tarif konnte gerade nicht geprüft werden. Versuchen Sie es gleich noch einmal.',
      credentialFailed:
        'Das Plugin ist installiert, aber Ihr Schlüssel wurde nicht gespeichert. Versuchen Sie es mit dem Schlüssel erneut oder schließen Sie dieses Fenster und tragen Sie ihn in den Einstellungen der installierten Plugins ein.',
    },
    install: {
      alreadyInstalled:
        'Sie haben dieses Plugin bereits installiert. Verwalten Sie es auf der Seite der installierten Plugins.',
    },
    validation: {
      tooShort: 'Geben Sie mindestens {min} Zeichen ein.',
    },
  },
  [Locale.ES]: {
    catalogStatus: {
      DRAFT: 'Borrador',
      PUBLISHED: 'Publicado',
      DEPRECATED: 'Obsoleto',
      HIDDEN: 'Oculto',
    },
    errors: {
      planDisabled: 'Tu plan no incluye plugins. Consulta los planes para añadirlos.',
      entitlementsUnavailable:
        'No pudimos comprobar tu plan en este momento. Inténtalo de nuevo en un instante.',
      credentialFailed:
        'El plugin está instalado, pero tu clave no se guardó. Vuelve a probar la clave, o cierra este cuadro y añádela en los ajustes de los plugins instalados.',
    },
    install: {
      alreadyInstalled:
        'Ya instalaste este plugin. Gestiónalo desde la página de plugins instalados.',
    },
    validation: {
      tooShort: 'Introduce al menos {min} caracteres.',
    },
  },
  [Locale.RU]: {
    catalogStatus: {
      DRAFT: 'Черновик',
      PUBLISHED: 'Опубликован',
      DEPRECATED: 'Устарел',
      HIDDEN: 'Скрыт',
    },
    errors: {
      planDisabled: 'Ваш тариф не включает плагины. Посмотрите тарифы, чтобы добавить их.',
      entitlementsUnavailable:
        'Сейчас не удалось проверить ваш тариф. Повторите попытку через минуту.',
      credentialFailed:
        'Плагин установлен, но ваш ключ не сохранён. Повторите ввод ключа или закройте это окно и добавьте его в настройках установленных плагинов.',
    },
    install: {
      alreadyInstalled:
        'Вы уже установили этот плагин. Управляйте им на странице установленных плагинов.',
    },
    validation: {
      tooShort: 'Введите не менее {min} симв.',
    },
  },
  [Locale.PT]: {
    catalogStatus: {
      DRAFT: 'Rascunho',
      PUBLISHED: 'Publicado',
      DEPRECATED: 'Obsoleto',
      HIDDEN: 'Oculto',
    },
    errors: {
      planDisabled: 'Seu plano não inclui plugins. Veja os planos para adicioná-los.',
      entitlementsUnavailable:
        'Não foi possível verificar seu plano agora. Tente novamente em instantes.',
      credentialFailed:
        'O plugin foi instalado, mas sua chave não foi salva. Tente a chave de novo ou feche esta janela e adicione-a nas configurações dos plugins instalados.',
    },
    install: {
      alreadyInstalled: 'Você já instalou este plugin. Gerencie-o na página de plugins instalados.',
    },
    validation: {
      tooShort: 'Digite pelo menos {min} caracteres.',
    },
  },
  [Locale.HI]: {
    catalogStatus: {
      DRAFT: 'ड्राफ़्ट',
      PUBLISHED: 'प्रकाशित',
      DEPRECATED: 'अप्रचलित',
      HIDDEN: 'छिपा हुआ',
    },
    errors: {
      planDisabled: 'आपके प्लान में प्लगइन शामिल नहीं हैं। उन्हें जोड़ने के लिए प्लान देखें।',
      entitlementsUnavailable: 'अभी आपका प्लान जाँचा नहीं जा सका। थोड़ी देर बाद फिर कोशिश करें।',
      credentialFailed:
        'प्लगइन इंस्टॉल हो गया है, लेकिन आपकी कुंजी सहेजी नहीं गई। कुंजी फिर से आज़माएँ, या यह विंडो बंद करके इंस्टॉल किए गए प्लगइन की सेटिंग में उसे जोड़ें।',
    },
    install: {
      alreadyInstalled:
        'आप यह प्लगइन पहले ही इंस्टॉल कर चुके हैं। इसे इंस्टॉल किए गए पेज से प्रबंधित करें।',
    },
    validation: {
      tooShort: 'कम से कम {min} अक्षर दर्ज करें।',
    },
  },
  [Locale.JA]: {
    catalogStatus: {
      DRAFT: '下書き',
      PUBLISHED: '公開中',
      DEPRECATED: '非推奨',
      HIDDEN: '非表示',
    },
    errors: {
      planDisabled:
        'ご利用のプランにはプラグインが含まれていません。プランを確認して追加してください。',
      entitlementsUnavailable:
        '現在プランを確認できませんでした。しばらくしてからもう一度お試しください。',
      credentialFailed:
        'プラグインはインストールされましたが、キーは保存されませんでした。キーをもう一度試すか、このダイアログを閉じてインストール済みの設定で追加してください。',
    },
    install: {
      alreadyInstalled:
        'このプラグインはすでにインストール済みです。インストール済みページから管理してください。',
    },
    validation: {
      tooShort: '{min}文字以上で入力してください。',
    },
  },
  [Locale.TH]: {
    catalogStatus: {
      DRAFT: 'ฉบับร่าง',
      PUBLISHED: 'เผยแพร่แล้ว',
      DEPRECATED: 'เลิกใช้งานแล้ว',
      HIDDEN: 'ซ่อนอยู่',
    },
    errors: {
      planDisabled: 'แพ็กเกจของคุณไม่รวมปลั๊กอิน ดูแพ็กเกจเพื่อเพิ่มปลั๊กอิน',
      entitlementsUnavailable: 'ตอนนี้ตรวจสอบแพ็กเกจของคุณไม่ได้ โปรดลองอีกครั้งในอีกสักครู่',
      credentialFailed:
        'ติดตั้งปลั๊กอินแล้ว แต่ยังไม่ได้บันทึกคีย์ของคุณ ลองใส่คีย์อีกครั้ง หรือปิดหน้าต่างนี้แล้วเพิ่มคีย์ในการตั้งค่าของปลั๊กอินที่ติดตั้งแล้ว',
    },
    install: {
      alreadyInstalled: 'คุณติดตั้งปลั๊กอินนี้แล้ว จัดการได้จากหน้าที่ติดตั้งแล้ว',
    },
    validation: {
      tooShort: 'กรอกอย่างน้อย {min} ตัวอักษร',
    },
  },
  [Locale.FA]: {
    catalogStatus: {
      DRAFT: 'پیش‌نویس',
      PUBLISHED: 'منتشرشده',
      DEPRECATED: 'منسوخ',
      HIDDEN: 'پنهان',
    },
    errors: {
      planDisabled: 'پلن شما شامل افزونه‌ها نیست. برای افزودن آن‌ها پلن‌ها را ببینید.',
      entitlementsUnavailable: 'اکنون نمی‌توانیم پلن شما را بررسی کنیم. کمی بعد دوباره تلاش کنید.',
      credentialFailed:
        'افزونه نصب شد اما کلید شما ذخیره نشد. دوباره کلید را امتحان کنید، یا این پنجره را ببندید و آن را در تنظیمات افزونه‌های نصب‌شده اضافه کنید.',
    },
    install: {
      alreadyInstalled:
        'شما این افزونه را قبلاً نصب کرده‌اید. آن را از صفحه نصب‌شده‌ها مدیریت کنید.',
    },
    validation: {
      tooShort: 'دست‌کم {min} نویسه وارد کنید.',
    },
  },
  [Locale.ZH]: {
    catalogStatus: {
      DRAFT: '草稿',
      PUBLISHED: '已发布',
      DEPRECATED: '已弃用',
      HIDDEN: '已隐藏',
    },
    errors: {
      planDisabled: '您的套餐不包含插件。查看套餐以添加。',
      entitlementsUnavailable: '暂时无法检查您的套餐，请稍后再试。',
      credentialFailed:
        '插件已安装，但您的密钥未保存。请重试密钥，或关闭此对话框，在已安装插件的设置中添加。',
    },
    install: {
      alreadyInstalled: '您已安装此插件。请在“已安装”页面管理它。',
    },
    validation: {
      tooShort: '请至少输入 {min} 个字符。',
    },
  },
};
