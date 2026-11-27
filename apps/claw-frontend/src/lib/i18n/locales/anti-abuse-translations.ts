import { Locale } from '@/enums/locale.enum';
import type { AntiAbuseLocaleTranslation } from '@/types/anti-abuse-i18n.types';

/**
 * Anti-abuse copy (security incident 2026-11-27): the browser check on sign-up
 * and sign-in, the refusal codes (BOT_CHECK_REQUIRED, BOT_CHECK_FAILED,
 * DISPOSABLE_EMAIL, EMAIL_DOMAIN_UNDELIVERABLE, SIGNUP_TEMPORARILY_LIMITED), the
 * admin "Sign-up protection" page and the admin linked-accounts view.
 */
export const ANTI_ABUSE_TRANSLATIONS: Record<Locale, AntiAbuseLocaleTranslation> = {
  [Locale.EN]: {
    navigationLabel: 'Sign-up protection',
    auth: {
      checking: 'Checking your browser…',
      widgetLabel: 'Security check',
      requiredTitle: "We couldn't check your browser",
      requiredDescription:
        'Reload the page and try again. The security check needs JavaScript and must not be blocked by an extension.',
      failedTitle: "Your browser didn't pass the security check",
      failedDescription:
        'Reload the page and try again. A VPN, proxy or strict privacy extension can cause this.',
      disposableEmail:
        "Temporary or disposable email addresses can't be used. Use a permanent address.",
      emailUndeliverable: "This email domain can't receive mail. Check the address for typos.",
      signupLimitedTitle: 'Sign-ups are paused for a moment',
      signupLimitedInMinutes:
        'Many accounts were created in a short time. Try again in {minutes} minutes.',
      signupLimitedInOneMinute:
        'Many accounts were created in a short time. Try again in a minute.',
      signupLimitedFallback:
        'Many accounts were created in a short time. Try again a little later.',
    },
    admin: {
      title: 'Sign-up protection',
      description: 'Bot checks, email domain rules and sign-up limits for new accounts.',
      loading: 'Loading security settings…',
      loadFailed: 'The security settings could not be loaded.',
      readOnly: 'You can view these settings but not change them.',
      save: 'Save changes',
      saving: 'Saving…',
      saved: 'Security settings saved',
      saveFailed: 'Some settings were not saved. Check them and try again.',
      invalid: 'Fix the highlighted fields first.',
      groups: {
        powTitle: 'Proof of work',
        powDescription:
          'Always on. Every sign-up makes the browser solve a small puzzle first, which costs a bot farm far more than a person.',
        turnstileTitle: 'Cloudflare Turnstile',
        turnstileDescription:
          'Shown on sign-up, and on sign-in after repeated failures. Off until both keys are saved.',
        recaptchaTitle: 'Google reCAPTCHA v3',
        recaptchaDescription:
          'Scores each sign-up in the background without a puzzle. Off until both keys are saved.',
        emailTitle: 'Email domains',
        emailDescription:
          'Disposable email domains are refused from a built-in list. Add your own blocks and exceptions here.',
        velocityTitle: 'Sign-up limits',
        velocityDescription: 'Pauses sign-ups when too many accounts are created at once.',
      },
      fields: {
        siteKey: 'Site key',
        secretKey: 'Secret key',
        secretHelp:
          'Write-only. A saved secret is never shown again; type a new one to replace it.',
        secretConfigured: 'Configured. Type to replace.',
        secretNotConfigured: 'Not configured',
        minScore: 'Minimum score',
        minScoreHelp: 'From 0 to 1. Sign-ups scoring lower are refused. Default 0.5.',
        powDifficulty: 'Difficulty',
        powDifficultyHelp:
          'From 12 to 24. 18 takes about a second in a normal browser; each step up doubles the work.',
        blockedDomains: 'Blocked domains',
        blockedDomainsHelp:
          'Comma-separated, for example spam.example, junk.test. Subdomains are blocked too.',
        allowedDomains: 'Allowed domains',
        allowedDomainsHelp:
          'Comma-separated. These are accepted even if the built-in list calls them disposable.',
        maxPer10Min: 'Sign-ups per 10 minutes',
        maxPer10MinHelp: 'Across the whole platform. Default 30.',
        maxPerDevicePerDay: 'Sign-ups per device per day',
        maxPerDevicePerDayHelp: 'Default 3.',
        defaultPlaceholder: 'Default: {value}',
      },
      errors: {
        integerRange: 'Enter a whole number from {min} to {max}.',
        scoreRange: 'Enter a number from 0 to 1, such as 0.5.',
        domainList: 'Enter domains like example.com, separated by commas.',
        tooLong: 'This value is too long.',
      },
      linkedAccounts: {
        open: 'Linked accounts',
        title: 'Linked accounts',
        description: 'Other accounts that share a device or a sign-up network with {email}.',
        loading: 'Loading linked accounts…',
        loadFailed: 'Linked accounts could not be loaded.',
        empty: 'No other account shares a device or sign-up network with this one.',
        reasonDevice: 'Same device',
        reasonDeviceId: 'Same device ID',
        reasonRegistrationIp: 'Same sign-up network',
        banned: 'Banned',
        registered: 'Registered {date}',
      },
    },
  },
  [Locale.AR]: {
    navigationLabel: 'حماية التسجيل',
    auth: {
      checking: 'جارٍ فحص متصفحك…',
      widgetLabel: 'فحص أمني',
      requiredTitle: 'تعذّر فحص متصفحك',
      requiredDescription:
        'أعد تحميل الصفحة وحاول مرة أخرى. يحتاج الفحص الأمني إلى JavaScript ويجب ألا تحظره أي إضافة.',
      failedTitle: 'لم يجتز متصفحك الفحص الأمني',
      failedDescription:
        'أعد تحميل الصفحة وحاول مرة أخرى. قد يسبب ذلك استخدامُ VPN أو وكيل أو إضافة خصوصية صارمة.',
      disposableEmail: 'لا يمكن استخدام عناوين البريد المؤقتة أو المستهلكة. استخدم عنوانًا دائمًا.',
      emailUndeliverable: 'نطاق هذا البريد لا يستقبل الرسائل. تحقّق من العنوان بحثًا عن أخطاء.',
      signupLimitedTitle: 'التسجيل متوقف مؤقتًا',
      signupLimitedInMinutes:
        'أُنشئ عدد كبير من الحسابات في وقت قصير. حاول مرة أخرى بعد {minutes} دقيقة.',
      signupLimitedInOneMinute: 'أُنشئ عدد كبير من الحسابات في وقت قصير. حاول مرة أخرى بعد دقيقة.',
      signupLimitedFallback: 'أُنشئ عدد كبير من الحسابات في وقت قصير. حاول مرة أخرى بعد قليل.',
    },
    admin: {
      title: 'حماية التسجيل',
      description: 'فحوص الروبوتات وقواعد نطاقات البريد وحدود التسجيل للحسابات الجديدة.',
      loading: 'جارٍ تحميل إعدادات الأمان…',
      loadFailed: 'تعذّر تحميل إعدادات الأمان.',
      readOnly: 'يمكنك عرض هذه الإعدادات دون تغييرها.',
      save: 'حفظ التغييرات',
      saving: 'جارٍ الحفظ…',
      saved: 'تم حفظ إعدادات الأمان',
      saveFailed: 'لم تُحفظ بعض الإعدادات. راجعها وحاول مرة أخرى.',
      invalid: 'صحّح الحقول المميّزة أولًا.',
      groups: {
        powTitle: 'إثبات العمل',
        powDescription:
          'مفعّل دائمًا. يحل المتصفح لغزًا صغيرًا قبل كل تسجيل، وهذا يكلّف مزارع الروبوتات أكثر بكثير مما يكلّف الإنسان.',
        turnstileTitle: 'Cloudflare Turnstile',
        turnstileDescription:
          'يظهر عند التسجيل، وعند تسجيل الدخول بعد محاولات فاشلة متكررة. معطّل حتى يُحفظ المفتاحان.',
        recaptchaTitle: 'Google reCAPTCHA v3',
        recaptchaDescription: 'يقيّم كل تسجيل في الخلفية دون لغز. معطّل حتى يُحفظ المفتاحان.',
        emailTitle: 'نطاقات البريد',
        emailDescription:
          'تُرفض نطاقات البريد المؤقت وفق قائمة مدمجة. أضف هنا نطاقات محظورة واستثناءات خاصة بك.',
        velocityTitle: 'حدود التسجيل',
        velocityDescription: 'يوقف التسجيل مؤقتًا عند إنشاء عدد كبير من الحسابات دفعة واحدة.',
      },
      fields: {
        siteKey: 'مفتاح الموقع',
        secretKey: 'المفتاح السري',
        secretHelp:
          'للكتابة فقط. لا يُعرض المفتاح السري المحفوظ مرة أخرى؛ اكتب مفتاحًا جديدًا لاستبداله.',
        secretConfigured: 'مُعدّ. اكتب للاستبدال.',
        secretNotConfigured: 'غير مُعدّ',
        minScore: 'أدنى درجة',
        minScoreHelp: 'من 0 إلى 1. يُرفض التسجيل الأقل درجة. الافتراضي 0.5.',
        powDifficulty: 'الصعوبة',
        powDifficultyHelp:
          'من 12 إلى 24. تستغرق 18 نحو ثانية في متصفح عادي؛ وكل درجة إضافية تضاعف العمل.',
        blockedDomains: 'النطاقات المحظورة',
        blockedDomainsHelp:
          'مفصولة بفواصل، مثل spam.example, junk.test. تُحظر النطاقات الفرعية أيضًا.',
        allowedDomains: 'النطاقات المسموح بها',
        allowedDomainsHelp: 'مفصولة بفواصل. تُقبل حتى لو صنّفتها القائمة المدمجة كبريد مؤقت.',
        maxPer10Min: 'عمليات التسجيل كل 10 دقائق',
        maxPer10MinHelp: 'على مستوى المنصة كلها. الافتراضي 30.',
        maxPerDevicePerDay: 'عمليات التسجيل لكل جهاز يوميًا',
        maxPerDevicePerDayHelp: 'الافتراضي 3.',
        defaultPlaceholder: 'الافتراضي: {value}',
      },
      errors: {
        integerRange: 'أدخل عددًا صحيحًا من {min} إلى {max}.',
        scoreRange: 'أدخل رقمًا من 0 إلى 1، مثل 0.5.',
        domainList: 'أدخل نطاقات مثل example.com مفصولة بفواصل.',
        tooLong: 'هذه القيمة طويلة جدًا.',
      },
      linkedAccounts: {
        open: 'الحسابات المرتبطة',
        title: 'الحسابات المرتبطة',
        description: 'حسابات أخرى تشترك في جهاز أو شبكة تسجيل مع {email}.',
        loading: 'جارٍ تحميل الحسابات المرتبطة…',
        loadFailed: 'تعذّر تحميل الحسابات المرتبطة.',
        empty: 'لا يشترك أي حساب آخر في جهاز أو شبكة تسجيل مع هذا الحساب.',
        reasonDevice: 'الجهاز نفسه',
        reasonDeviceId: 'معرّف الجهاز نفسه',
        reasonRegistrationIp: 'شبكة التسجيل نفسها',
        banned: 'محظور',
        registered: 'سُجّل في {date}',
      },
    },
  },
  [Locale.DE]: {
    navigationLabel: 'Registrierungsschutz',
    auth: {
      checking: 'Browser wird geprüft…',
      widgetLabel: 'Sicherheitsprüfung',
      requiredTitle: 'Dein Browser konnte nicht geprüft werden',
      requiredDescription:
        'Lade die Seite neu und versuche es erneut. Die Sicherheitsprüfung braucht JavaScript und darf von keiner Erweiterung blockiert werden.',
      failedTitle: 'Dein Browser hat die Sicherheitsprüfung nicht bestanden',
      failedDescription:
        'Lade die Seite neu und versuche es erneut. Ein VPN, ein Proxy oder eine strenge Datenschutz-Erweiterung kann die Ursache sein.',
      disposableEmail:
        'Temporäre oder Wegwerf-E-Mail-Adressen sind nicht erlaubt. Verwende eine dauerhafte Adresse.',
      emailUndeliverable:
        'Diese E-Mail-Domain kann keine Nachrichten empfangen. Prüfe die Adresse auf Tippfehler.',
      signupLimitedTitle: 'Registrierungen sind kurz pausiert',
      signupLimitedInMinutes:
        'In kurzer Zeit wurden sehr viele Konten erstellt. Versuche es in {minutes} Minuten erneut.',
      signupLimitedInOneMinute:
        'In kurzer Zeit wurden sehr viele Konten erstellt. Versuche es in einer Minute erneut.',
      signupLimitedFallback:
        'In kurzer Zeit wurden sehr viele Konten erstellt. Versuche es etwas später erneut.',
    },
    admin: {
      title: 'Registrierungsschutz',
      description:
        'Bot-Prüfungen, Regeln für E-Mail-Domains und Registrierungslimits für neue Konten.',
      loading: 'Sicherheitseinstellungen werden geladen…',
      loadFailed: 'Die Sicherheitseinstellungen konnten nicht geladen werden.',
      readOnly: 'Du kannst diese Einstellungen ansehen, aber nicht ändern.',
      save: 'Änderungen speichern',
      saving: 'Wird gespeichert…',
      saved: 'Sicherheitseinstellungen gespeichert',
      saveFailed:
        'Einige Einstellungen wurden nicht gespeichert. Prüfe sie und versuche es erneut.',
      invalid: 'Korrigiere zuerst die markierten Felder.',
      groups: {
        powTitle: 'Arbeitsnachweis',
        powDescription:
          'Immer aktiv. Vor jeder Registrierung löst der Browser ein kleines Rätsel – für eine Bot-Farm viel teurer als für einen Menschen.',
        turnstileTitle: 'Cloudflare Turnstile',
        turnstileDescription:
          'Wird bei der Registrierung angezeigt und bei der Anmeldung nach wiederholten Fehlversuchen. Aus, bis beide Schlüssel gespeichert sind.',
        recaptchaTitle: 'Google reCAPTCHA v3',
        recaptchaDescription:
          'Bewertet jede Registrierung im Hintergrund, ohne Rätsel. Aus, bis beide Schlüssel gespeichert sind.',
        emailTitle: 'E-Mail-Domains',
        emailDescription:
          'Wegwerf-Domains werden anhand einer integrierten Liste abgelehnt. Hier fügst du eigene Sperren und Ausnahmen hinzu.',
        velocityTitle: 'Registrierungslimits',
        velocityDescription:
          'Pausiert Registrierungen, wenn zu viele Konten auf einmal erstellt werden.',
      },
      fields: {
        siteKey: 'Websiteschlüssel',
        secretKey: 'Geheimer Schlüssel',
        secretHelp:
          'Nur schreibbar. Ein gespeichertes Geheimnis wird nie wieder angezeigt; gib ein neues ein, um es zu ersetzen.',
        secretConfigured: 'Eingerichtet. Zum Ersetzen neu eingeben.',
        secretNotConfigured: 'Nicht eingerichtet',
        minScore: 'Mindestwert',
        minScoreHelp:
          'Von 0 bis 1. Registrierungen mit niedrigerem Wert werden abgelehnt. Standard 0.5.',
        powDifficulty: 'Schwierigkeit',
        powDifficultyHelp:
          'Von 12 bis 24. 18 dauert in einem normalen Browser etwa eine Sekunde; jede Stufe mehr verdoppelt den Aufwand.',
        blockedDomains: 'Gesperrte Domains',
        blockedDomainsHelp:
          'Durch Kommas getrennt, z. B. spam.example, junk.test. Subdomains werden mitgesperrt.',
        allowedDomains: 'Erlaubte Domains',
        allowedDomainsHelp:
          'Durch Kommas getrennt. Werden akzeptiert, auch wenn die integrierte Liste sie als Wegwerf-Domain führt.',
        maxPer10Min: 'Registrierungen pro 10 Minuten',
        maxPer10MinHelp: 'Für die gesamte Plattform. Standard 30.',
        maxPerDevicePerDay: 'Registrierungen pro Gerät und Tag',
        maxPerDevicePerDayHelp: 'Standard 3.',
        defaultPlaceholder: 'Standard: {value}',
      },
      errors: {
        integerRange: 'Gib eine ganze Zahl von {min} bis {max} ein.',
        scoreRange: 'Gib eine Zahl von 0 bis 1 ein, z. B. 0.5.',
        domainList: 'Gib Domains wie example.com ein, durch Kommas getrennt.',
        tooLong: 'Dieser Wert ist zu lang.',
      },
      linkedAccounts: {
        open: 'Verknüpfte Konten',
        title: 'Verknüpfte Konten',
        description: 'Andere Konten, die ein Gerät oder ein Registrierungsnetz mit {email} teilen.',
        loading: 'Verknüpfte Konten werden geladen…',
        loadFailed: 'Die verknüpften Konten konnten nicht geladen werden.',
        empty: 'Kein anderes Konto teilt ein Gerät oder Registrierungsnetz mit diesem.',
        reasonDevice: 'Gleiches Gerät',
        reasonDeviceId: 'Gleiche Geräte-ID',
        reasonRegistrationIp: 'Gleiches Registrierungsnetz',
        banned: 'Gesperrt',
        registered: 'Registriert am {date}',
      },
    },
  },
  [Locale.ES]: {
    navigationLabel: 'Protección del registro',
    auth: {
      checking: 'Comprobando tu navegador…',
      widgetLabel: 'Comprobación de seguridad',
      requiredTitle: 'No pudimos comprobar tu navegador',
      requiredDescription:
        'Recarga la página y vuelve a intentarlo. La comprobación de seguridad necesita JavaScript y ninguna extensión debe bloquearla.',
      failedTitle: 'Tu navegador no superó la comprobación de seguridad',
      failedDescription:
        'Recarga la página y vuelve a intentarlo. Una VPN, un proxy o una extensión de privacidad estricta pueden causarlo.',
      disposableEmail:
        'No se permiten direcciones de correo temporales o desechables. Usa una dirección permanente.',
      emailUndeliverable:
        'Este dominio de correo no puede recibir mensajes. Revisa si la dirección tiene errores.',
      signupLimitedTitle: 'Los registros están en pausa por un momento',
      signupLimitedInMinutes:
        'Se crearon muchas cuentas en poco tiempo. Vuelve a intentarlo en {minutes} minutos.',
      signupLimitedInOneMinute:
        'Se crearon muchas cuentas en poco tiempo. Vuelve a intentarlo en un minuto.',
      signupLimitedFallback:
        'Se crearon muchas cuentas en poco tiempo. Vuelve a intentarlo un poco más tarde.',
    },
    admin: {
      title: 'Protección del registro',
      description:
        'Comprobaciones antibots, reglas de dominios de correo y límites de registro para cuentas nuevas.',
      loading: 'Cargando la configuración de seguridad…',
      loadFailed: 'No se pudo cargar la configuración de seguridad.',
      readOnly: 'Puedes ver esta configuración, pero no cambiarla.',
      save: 'Guardar cambios',
      saving: 'Guardando…',
      saved: 'Configuración de seguridad guardada',
      saveFailed: 'Algunos ajustes no se guardaron. Revísalos y vuelve a intentarlo.',
      invalid: 'Corrige primero los campos resaltados.',
      groups: {
        powTitle: 'Prueba de trabajo',
        powDescription:
          'Siempre activa. Antes de cada registro, el navegador resuelve un pequeño acertijo, que a una granja de bots le cuesta mucho más que a una persona.',
        turnstileTitle: 'Cloudflare Turnstile',
        turnstileDescription:
          'Se muestra en el registro y en el inicio de sesión tras varios fallos. Desactivado hasta guardar ambas claves.',
        recaptchaTitle: 'Google reCAPTCHA v3',
        recaptchaDescription:
          'Puntúa cada registro en segundo plano, sin acertijos. Desactivado hasta guardar ambas claves.',
        emailTitle: 'Dominios de correo',
        emailDescription:
          'Los dominios desechables se rechazan según una lista integrada. Añade aquí tus propios bloqueos y excepciones.',
        velocityTitle: 'Límites de registro',
        velocityDescription: 'Pausa los registros cuando se crean demasiadas cuentas a la vez.',
      },
      fields: {
        siteKey: 'Clave del sitio',
        secretKey: 'Clave secreta',
        secretHelp:
          'Solo escritura. Una clave secreta guardada nunca se vuelve a mostrar; escribe una nueva para reemplazarla.',
        secretConfigured: 'Configurada. Escribe para reemplazarla.',
        secretNotConfigured: 'Sin configurar',
        minScore: 'Puntuación mínima',
        minScoreHelp:
          'De 0 a 1. Se rechazan los registros con menor puntuación. Predeterminado 0.5.',
        powDifficulty: 'Dificultad',
        powDifficultyHelp:
          'De 12 a 24. Con 18 tarda alrededor de un segundo en un navegador normal; cada paso más duplica el trabajo.',
        blockedDomains: 'Dominios bloqueados',
        blockedDomainsHelp:
          'Separados por comas, por ejemplo spam.example, junk.test. También se bloquean los subdominios.',
        allowedDomains: 'Dominios permitidos',
        allowedDomainsHelp:
          'Separados por comas. Se aceptan aunque la lista integrada los considere desechables.',
        maxPer10Min: 'Registros cada 10 minutos',
        maxPer10MinHelp: 'En toda la plataforma. Predeterminado 30.',
        maxPerDevicePerDay: 'Registros por dispositivo al día',
        maxPerDevicePerDayHelp: 'Predeterminado 3.',
        defaultPlaceholder: 'Predeterminado: {value}',
      },
      errors: {
        integerRange: 'Introduce un número entero de {min} a {max}.',
        scoreRange: 'Introduce un número de 0 a 1, como 0.5.',
        domainList: 'Introduce dominios como example.com, separados por comas.',
        tooLong: 'Este valor es demasiado largo.',
      },
      linkedAccounts: {
        open: 'Cuentas vinculadas',
        title: 'Cuentas vinculadas',
        description:
          'Otras cuentas que comparten un dispositivo o una red de registro con {email}.',
        loading: 'Cargando cuentas vinculadas…',
        loadFailed: 'No se pudieron cargar las cuentas vinculadas.',
        empty: 'Ninguna otra cuenta comparte un dispositivo o una red de registro con esta.',
        reasonDevice: 'Mismo dispositivo',
        reasonDeviceId: 'Mismo ID de dispositivo',
        reasonRegistrationIp: 'Misma red de registro',
        banned: 'Bloqueada',
        registered: 'Registrada el {date}',
      },
    },
  },
  [Locale.FA]: {
    navigationLabel: 'محافظت از ثبت‌نام',
    auth: {
      checking: 'در حال بررسی مرورگر شما…',
      widgetLabel: 'بررسی امنیتی',
      requiredTitle: 'نتوانستیم مرورگر شما را بررسی کنیم',
      requiredDescription:
        'صفحه را دوباره بارگذاری کنید و دوباره تلاش کنید. بررسی امنیتی به JavaScript نیاز دارد و نباید هیچ افزونه‌ای آن را مسدود کند.',
      failedTitle: 'مرورگر شما از بررسی امنیتی عبور نکرد',
      failedDescription:
        'صفحه را دوباره بارگذاری کنید و دوباره تلاش کنید. VPN، پراکسی یا افزونهٔ سخت‌گیر حریم خصوصی می‌تواند علت آن باشد.',
      disposableEmail:
        'نشانی‌های ایمیل موقت یا یک‌بارمصرف پذیرفته نمی‌شوند. از یک نشانی دائمی استفاده کنید.',
      emailUndeliverable:
        'این دامنهٔ ایمیل نمی‌تواند نامه دریافت کند. نشانی را از نظر غلط تایپی بررسی کنید.',
      signupLimitedTitle: 'ثبت‌نام برای مدتی کوتاه متوقف شده است',
      signupLimitedInMinutes:
        'در مدت کوتاهی حساب‌های زیادی ساخته شد. {minutes} دقیقه دیگر دوباره تلاش کنید.',
      signupLimitedInOneMinute:
        'در مدت کوتاهی حساب‌های زیادی ساخته شد. یک دقیقه دیگر دوباره تلاش کنید.',
      signupLimitedFallback: 'در مدت کوتاهی حساب‌های زیادی ساخته شد. کمی بعد دوباره تلاش کنید.',
    },
    admin: {
      title: 'محافظت از ثبت‌نام',
      description: 'بررسی ربات‌ها، قواعد دامنهٔ ایمیل و محدودیت‌های ثبت‌نام برای حساب‌های جدید.',
      loading: 'در حال بارگذاری تنظیمات امنیتی…',
      loadFailed: 'تنظیمات امنیتی بارگذاری نشد.',
      readOnly: 'می‌توانید این تنظیمات را ببینید اما نمی‌توانید تغییرشان دهید.',
      save: 'ذخیرهٔ تغییرات',
      saving: 'در حال ذخیره…',
      saved: 'تنظیمات امنیتی ذخیره شد',
      saveFailed: 'برخی تنظیمات ذخیره نشد. آن‌ها را بررسی کنید و دوباره تلاش کنید.',
      invalid: 'ابتدا فیلدهای مشخص‌شده را اصلاح کنید.',
      groups: {
        powTitle: 'اثبات کار',
        powDescription:
          'همیشه فعال است. پیش از هر ثبت‌نام، مرورگر یک معمای کوچک حل می‌کند که برای مزرعهٔ ربات‌ها بسیار پرهزینه‌تر از یک انسان است.',
        turnstileTitle: 'Cloudflare Turnstile (ضدربات)',
        turnstileDescription:
          'هنگام ثبت‌نام و پس از چند ورود ناموفق نمایش داده می‌شود. تا ذخیرهٔ هر دو کلید خاموش است.',
        recaptchaTitle: 'Google reCAPTCHA v3 (ضدربات)',
        recaptchaDescription:
          'هر ثبت‌نام را بدون معما و در پس‌زمینه امتیازدهی می‌کند. تا ذخیرهٔ هر دو کلید خاموش است.',
        emailTitle: 'دامنه‌های ایمیل',
        emailDescription:
          'دامنه‌های یک‌بارمصرف بر اساس فهرستی داخلی رد می‌شوند. مسدودسازی‌ها و استثناهای خود را اینجا اضافه کنید.',
        velocityTitle: 'محدودیت‌های ثبت‌نام',
        velocityDescription: 'وقتی هم‌زمان حساب‌های زیادی ساخته شود، ثبت‌نام را متوقف می‌کند.',
      },
      fields: {
        siteKey: 'کلید سایت',
        secretKey: 'کلید محرمانه',
        secretHelp:
          'فقط‌نوشتنی. کلید محرمانهٔ ذخیره‌شده دیگر نمایش داده نمی‌شود؛ برای جایگزینی، کلید جدیدی وارد کنید.',
        secretConfigured: 'پیکربندی شده. برای جایگزینی تایپ کنید.',
        secretNotConfigured: 'پیکربندی نشده',
        minScore: 'حداقل امتیاز',
        minScoreHelp: 'از 0 تا 1. ثبت‌نام‌هایی با امتیاز کمتر رد می‌شوند. پیش‌فرض 0.5.',
        powDifficulty: 'دشواری',
        powDifficultyHelp:
          'از 12 تا 24. با 18 در یک مرورگر معمولی حدود یک ثانیه طول می‌کشد؛ هر پله بالاتر کار را دو برابر می‌کند.',
        blockedDomains: 'دامنه‌های مسدود',
        blockedDomainsHelp:
          'با ویرگول جدا کنید، مثلاً spam.example, junk.test. زیردامنه‌ها هم مسدود می‌شوند.',
        allowedDomains: 'دامنه‌های مجاز',
        allowedDomainsHelp:
          'با ویرگول جدا کنید. حتی اگر فهرست داخلی آن‌ها را یک‌بارمصرف بداند، پذیرفته می‌شوند.',
        maxPer10Min: 'ثبت‌نام در هر 10 دقیقه',
        maxPer10MinHelp: 'در کل پلتفرم. پیش‌فرض 30.',
        maxPerDevicePerDay: 'ثبت‌نام برای هر دستگاه در روز',
        maxPerDevicePerDayHelp: 'پیش‌فرض 3.',
        defaultPlaceholder: 'پیش‌فرض: {value}',
      },
      errors: {
        integerRange: 'یک عدد صحیح از {min} تا {max} وارد کنید.',
        scoreRange: 'عددی از 0 تا 1 وارد کنید، مثلاً 0.5.',
        domainList: 'دامنه‌هایی مانند example.com را با ویرگول جدا کنید.',
        tooLong: 'این مقدار بیش از حد طولانی است.',
      },
      linkedAccounts: {
        open: 'حساب‌های مرتبط',
        title: 'حساب‌های مرتبط',
        description: 'حساب‌های دیگری که دستگاه یا شبکهٔ ثبت‌نام مشترکی با {email} دارند.',
        loading: 'در حال بارگذاری حساب‌های مرتبط…',
        loadFailed: 'حساب‌های مرتبط بارگذاری نشد.',
        empty: 'هیچ حساب دیگری دستگاه یا شبکهٔ ثبت‌نام مشترکی با این حساب ندارد.',
        reasonDevice: 'همان دستگاه',
        reasonDeviceId: 'همان شناسهٔ دستگاه',
        reasonRegistrationIp: 'همان شبکهٔ ثبت‌نام',
        banned: 'مسدود',
        registered: 'ثبت‌نام در {date}',
      },
    },
  },
  [Locale.FR]: {
    navigationLabel: 'Protection des inscriptions',
    auth: {
      checking: 'Vérification de votre navigateur…',
      widgetLabel: 'Vérification de sécurité',
      requiredTitle: "Nous n'avons pas pu vérifier votre navigateur",
      requiredDescription:
        'Rechargez la page et réessayez. La vérification de sécurité a besoin de JavaScript et ne doit être bloquée par aucune extension.',
      failedTitle: "Votre navigateur n'a pas réussi la vérification de sécurité",
      failedDescription:
        'Rechargez la page et réessayez. Un VPN, un proxy ou une extension de confidentialité stricte peut en être la cause.',
      disposableEmail:
        'Les adresses e-mail temporaires ou jetables ne sont pas acceptées. Utilisez une adresse permanente.',
      emailUndeliverable:
        "Ce domaine de messagerie ne peut pas recevoir d'e-mails. Vérifiez l'adresse.",
      signupLimitedTitle: 'Les inscriptions sont suspendues un instant',
      signupLimitedInMinutes:
        'De nombreux comptes ont été créés en peu de temps. Réessayez dans {minutes} minutes.',
      signupLimitedInOneMinute:
        'De nombreux comptes ont été créés en peu de temps. Réessayez dans une minute.',
      signupLimitedFallback:
        'De nombreux comptes ont été créés en peu de temps. Réessayez un peu plus tard.',
    },
    admin: {
      title: 'Protection des inscriptions',
      description:
        "Vérifications anti-bots, règles de domaines e-mail et limites d'inscription pour les nouveaux comptes.",
      loading: 'Chargement des paramètres de sécurité…',
      loadFailed: "Les paramètres de sécurité n'ont pas pu être chargés.",
      readOnly: 'Vous pouvez consulter ces paramètres, mais pas les modifier.',
      save: 'Enregistrer les modifications',
      saving: 'Enregistrement…',
      saved: 'Paramètres de sécurité enregistrés',
      saveFailed: "Certains paramètres n'ont pas été enregistrés. Vérifiez-les et réessayez.",
      invalid: "Corrigez d'abord les champs signalés.",
      groups: {
        powTitle: 'Preuve de travail',
        powDescription:
          'Toujours active. Avant chaque inscription, le navigateur résout une petite énigme, bien plus coûteuse pour une ferme de bots que pour une personne.',
        turnstileTitle: 'Cloudflare Turnstile',
        turnstileDescription:
          "Affiché à l'inscription, et à la connexion après plusieurs échecs. Désactivé tant que les deux clés ne sont pas enregistrées.",
        recaptchaTitle: 'Google reCAPTCHA v3',
        recaptchaDescription:
          'Note chaque inscription en arrière-plan, sans énigme. Désactivé tant que les deux clés ne sont pas enregistrées.',
        emailTitle: 'Domaines e-mail',
        emailDescription:
          'Les domaines jetables sont refusés grâce à une liste intégrée. Ajoutez ici vos propres blocages et exceptions.',
        velocityTitle: "Limites d'inscription",
        velocityDescription:
          'Suspend les inscriptions quand trop de comptes sont créés en même temps.',
      },
      fields: {
        siteKey: 'Clé du site',
        secretKey: 'Clé secrète',
        secretHelp:
          "Écriture seule. Un secret enregistré n'est plus jamais affiché ; saisissez-en un nouveau pour le remplacer.",
        secretConfigured: 'Configurée. Saisissez pour remplacer.',
        secretNotConfigured: 'Non configurée',
        minScore: 'Score minimal',
        minScoreHelp:
          'De 0 à 1. Les inscriptions au score inférieur sont refusées. Par défaut 0.5.',
        powDifficulty: 'Difficulté',
        powDifficultyHelp:
          'De 12 à 24. 18 prend environ une seconde dans un navigateur normal ; chaque cran de plus double le travail.',
        blockedDomains: 'Domaines bloqués',
        blockedDomainsHelp:
          'Séparés par des virgules, par exemple spam.example, junk.test. Les sous-domaines sont aussi bloqués.',
        allowedDomains: 'Domaines autorisés',
        allowedDomainsHelp:
          'Séparés par des virgules. Acceptés même si la liste intégrée les classe comme jetables.',
        maxPer10Min: 'Inscriptions par tranche de 10 minutes',
        maxPer10MinHelp: 'Sur toute la plateforme. Par défaut 30.',
        maxPerDevicePerDay: 'Inscriptions par appareil et par jour',
        maxPerDevicePerDayHelp: 'Par défaut 3.',
        defaultPlaceholder: 'Par défaut : {value}',
      },
      errors: {
        integerRange: 'Saisissez un nombre entier de {min} à {max}.',
        scoreRange: 'Saisissez un nombre de 0 à 1, par exemple 0.5.',
        domainList: 'Saisissez des domaines comme example.com, séparés par des virgules.',
        tooLong: 'Cette valeur est trop longue.',
      },
      linkedAccounts: {
        open: 'Comptes liés',
        title: 'Comptes liés',
        description:
          "D'autres comptes qui partagent un appareil ou un réseau d'inscription avec {email}.",
        loading: 'Chargement des comptes liés…',
        loadFailed: "Les comptes liés n'ont pas pu être chargés.",
        empty: "Aucun autre compte ne partage d'appareil ou de réseau d'inscription avec celui-ci.",
        reasonDevice: 'Même appareil',
        reasonDeviceId: "Même identifiant d'appareil",
        reasonRegistrationIp: "Même réseau d'inscription",
        banned: 'Banni',
        registered: 'Inscrit le {date}',
      },
    },
  },
  [Locale.HI]: {
    navigationLabel: 'साइन-अप सुरक्षा',
    auth: {
      checking: 'आपका ब्राउज़र जाँचा जा रहा है…',
      widgetLabel: 'सुरक्षा जाँच',
      requiredTitle: 'हम आपका ब्राउज़र नहीं जाँच सके',
      requiredDescription:
        'पेज दोबारा लोड करें और फिर से कोशिश करें। सुरक्षा जाँच को JavaScript चाहिए और कोई एक्सटेंशन इसे ब्लॉक न करे।',
      failedTitle: 'आपका ब्राउज़र सुरक्षा जाँच में पास नहीं हुआ',
      failedDescription:
        'पेज दोबारा लोड करें और फिर से कोशिश करें। VPN, प्रॉक्सी या सख़्त प्राइवेसी एक्सटेंशन इसकी वजह हो सकते हैं।',
      disposableEmail: 'अस्थायी या डिस्पोज़ेबल ईमेल पते स्वीकार नहीं किए जाते। कोई स्थायी पता इस्तेमाल करें।',
      emailUndeliverable: 'यह ईमेल डोमेन मेल प्राप्त नहीं कर सकता। पते में टाइपिंग की गलती जाँचें।',
      signupLimitedTitle: 'साइन-अप कुछ देर के लिए रुके हैं',
      signupLimitedInMinutes: 'कम समय में बहुत सारे खाते बनाए गए। {minutes} मिनट बाद फिर से कोशिश करें।',
      signupLimitedInOneMinute: 'कम समय में बहुत सारे खाते बनाए गए। एक मिनट बाद फिर से कोशिश करें।',
      signupLimitedFallback: 'कम समय में बहुत सारे खाते बनाए गए। थोड़ी देर बाद फिर से कोशिश करें।',
    },
    admin: {
      title: 'साइन-अप सुरक्षा',
      description: 'नए खातों के लिए बॉट जाँच, ईमेल डोमेन नियम और साइन-अप सीमाएँ।',
      loading: 'सुरक्षा सेटिंग्स लोड हो रही हैं…',
      loadFailed: 'सुरक्षा सेटिंग्स लोड नहीं हो सकीं।',
      readOnly: 'आप ये सेटिंग्स देख सकते हैं, पर बदल नहीं सकते।',
      save: 'बदलाव सहेजें',
      saving: 'सहेजा जा रहा है…',
      saved: 'सुरक्षा सेटिंग्स सहेजी गईं',
      saveFailed: 'कुछ सेटिंग्स सहेजी नहीं गईं। उन्हें जाँचें और फिर से कोशिश करें।',
      invalid: 'पहले चिह्नित फ़ील्ड ठीक करें।',
      groups: {
        powTitle: 'प्रूफ़ ऑफ़ वर्क',
        powDescription:
          'हमेशा चालू। हर साइन-अप से पहले ब्राउज़र एक छोटी पहेली हल करता है, जो बॉट फ़ार्म को इंसान से कहीं ज़्यादा महँगी पड़ती है।',
        turnstileTitle: 'Cloudflare Turnstile',
        turnstileDescription:
          'साइन-अप पर, और बार-बार विफल होने के बाद साइन-इन पर दिखता है। दोनों कुंजियाँ सहेजे जाने तक बंद रहता है।',
        recaptchaTitle: 'Google reCAPTCHA v3',
        recaptchaDescription:
          'हर साइन-अप को बिना पहेली के पृष्ठभूमि में स्कोर करता है। दोनों कुंजियाँ सहेजे जाने तक बंद रहता है।',
        emailTitle: 'ईमेल डोमेन',
        emailDescription:
          'डिस्पोज़ेबल डोमेन एक बिल्ट-इन सूची के आधार पर अस्वीकार होते हैं। अपने ब्लॉक और अपवाद यहाँ जोड़ें।',
        velocityTitle: 'साइन-अप सीमाएँ',
        velocityDescription: 'एक साथ बहुत सारे खाते बनने पर साइन-अप रोक देता है।',
      },
      fields: {
        siteKey: 'साइट कुंजी',
        secretKey: 'गुप्त कुंजी',
        secretHelp: 'केवल लिखने के लिए। सहेजी गई गुप्त कुंजी फिर कभी नहीं दिखती; बदलने के लिए नई कुंजी लिखें।',
        secretConfigured: 'कॉन्फ़िगर है। बदलने के लिए लिखें।',
        secretNotConfigured: 'कॉन्फ़िगर नहीं है',
        minScore: 'न्यूनतम स्कोर',
        minScoreHelp: '0 से 1 तक। इससे कम स्कोर वाले साइन-अप अस्वीकार होते हैं। डिफ़ॉल्ट 0.5।',
        powDifficulty: 'कठिनाई',
        powDifficultyHelp:
          '12 से 24 तक। 18 पर सामान्य ब्राउज़र में लगभग एक सेकंड लगता है; हर अगला स्तर काम दोगुना करता है।',
        blockedDomains: 'ब्लॉक किए गए डोमेन',
        blockedDomainsHelp: 'कॉमा से अलग करें, जैसे spam.example, junk.test। सबडोमेन भी ब्लॉक होते हैं।',
        allowedDomains: 'अनुमत डोमेन',
        allowedDomainsHelp: 'कॉमा से अलग करें। बिल्ट-इन सूची इन्हें डिस्पोज़ेबल माने तब भी ये स्वीकार होते हैं।',
        maxPer10Min: 'हर 10 मिनट में साइन-अप',
        maxPer10MinHelp: 'पूरे प्लेटफ़ॉर्म पर। डिफ़ॉल्ट 30।',
        maxPerDevicePerDay: 'प्रति डिवाइस प्रति दिन साइन-अप',
        maxPerDevicePerDayHelp: 'डिफ़ॉल्ट 3।',
        defaultPlaceholder: 'डिफ़ॉल्ट: {value}',
      },
      errors: {
        integerRange: '{min} से {max} तक कोई पूर्ण संख्या डालें।',
        scoreRange: '0 से 1 तक कोई संख्या डालें, जैसे 0.5।',
        domainList: 'example.com जैसे डोमेन कॉमा से अलग करके डालें।',
        tooLong: 'यह मान बहुत लंबा है।',
      },
      linkedAccounts: {
        open: 'जुड़े हुए खाते',
        title: 'जुड़े हुए खाते',
        description: 'अन्य खाते जो {email} के साथ कोई डिवाइस या साइन-अप नेटवर्क साझा करते हैं।',
        loading: 'जुड़े हुए खाते लोड हो रहे हैं…',
        loadFailed: 'जुड़े हुए खाते लोड नहीं हो सके।',
        empty: 'कोई अन्य खाता इस खाते के साथ डिवाइस या साइन-अप नेटवर्क साझा नहीं करता।',
        reasonDevice: 'वही डिवाइस',
        reasonDeviceId: 'वही डिवाइस ID',
        reasonRegistrationIp: 'वही साइन-अप नेटवर्क',
        banned: 'प्रतिबंधित',
        registered: '{date} को पंजीकृत',
      },
    },
  },
  [Locale.IT]: {
    navigationLabel: 'Protezione delle registrazioni',
    auth: {
      checking: 'Verifica del browser in corso…',
      widgetLabel: 'Controllo di sicurezza',
      requiredTitle: 'Non siamo riusciti a verificare il tuo browser',
      requiredDescription:
        'Ricarica la pagina e riprova. Il controllo di sicurezza richiede JavaScript e nessuna estensione deve bloccarlo.',
      failedTitle: 'Il tuo browser non ha superato il controllo di sicurezza',
      failedDescription:
        "Ricarica la pagina e riprova. Una VPN, un proxy o un'estensione per la privacy molto restrittiva possono causarlo.",
      disposableEmail:
        'Gli indirizzi email temporanei o usa e getta non sono ammessi. Usa un indirizzo permanente.',
      emailUndeliverable:
        "Questo dominio email non può ricevere messaggi. Controlla che l'indirizzo sia corretto.",
      signupLimitedTitle: 'Le registrazioni sono in pausa per un momento',
      signupLimitedInMinutes:
        'Sono stati creati molti account in poco tempo. Riprova tra {minutes} minuti.',
      signupLimitedInOneMinute:
        'Sono stati creati molti account in poco tempo. Riprova tra un minuto.',
      signupLimitedFallback:
        "Sono stati creati molti account in poco tempo. Riprova un po' più tardi.",
    },
    admin: {
      title: 'Protezione delle registrazioni',
      description:
        'Controlli anti-bot, regole sui domini email e limiti di registrazione per i nuovi account.',
      loading: 'Caricamento delle impostazioni di sicurezza…',
      loadFailed: 'Impossibile caricare le impostazioni di sicurezza.',
      readOnly: 'Puoi vedere queste impostazioni, ma non modificarle.',
      save: 'Salva modifiche',
      saving: 'Salvataggio…',
      saved: 'Impostazioni di sicurezza salvate',
      saveFailed: 'Alcune impostazioni non sono state salvate. Controllale e riprova.',
      invalid: 'Correggi prima i campi evidenziati.',
      groups: {
        powTitle: 'Prova di lavoro',
        powDescription:
          'Sempre attiva. Prima di ogni registrazione il browser risolve un piccolo enigma, che costa molto di più a una farm di bot che a una persona.',
        turnstileTitle: 'Cloudflare Turnstile',
        turnstileDescription:
          "Mostrato alla registrazione e all'accesso dopo ripetuti errori. Disattivato finché non salvi entrambe le chiavi.",
        recaptchaTitle: 'Google reCAPTCHA v3',
        recaptchaDescription:
          'Valuta ogni registrazione in background, senza enigmi. Disattivato finché non salvi entrambe le chiavi.',
        emailTitle: 'Domini email',
        emailDescription:
          'I domini usa e getta vengono rifiutati in base a un elenco integrato. Aggiungi qui blocchi ed eccezioni personalizzati.',
        velocityTitle: 'Limiti di registrazione',
        velocityDescription:
          'Mette in pausa le registrazioni quando vengono creati troppi account insieme.',
      },
      fields: {
        siteKey: 'Chiave del sito',
        secretKey: 'Chiave segreta',
        secretHelp:
          'Solo scrittura. Un segreto salvato non viene mai più mostrato; inseriscine uno nuovo per sostituirlo.',
        secretConfigured: 'Configurata. Scrivi per sostituirla.',
        secretNotConfigured: 'Non configurata',
        minScore: 'Punteggio minimo',
        minScoreHelp:
          'Da 0 a 1. Le registrazioni con punteggio inferiore vengono rifiutate. Predefinito 0.5.',
        powDifficulty: 'Difficoltà',
        powDifficultyHelp:
          'Da 12 a 24. Con 18 serve circa un secondo in un browser normale; ogni livello in più raddoppia il lavoro.',
        blockedDomains: 'Domini bloccati',
        blockedDomainsHelp:
          'Separati da virgole, ad esempio spam.example, junk.test. Vengono bloccati anche i sottodomini.',
        allowedDomains: 'Domini consentiti',
        allowedDomainsHelp:
          "Separati da virgole. Accettati anche se l'elenco integrato li considera usa e getta.",
        maxPer10Min: 'Registrazioni ogni 10 minuti',
        maxPer10MinHelp: 'Su tutta la piattaforma. Predefinito 30.',
        maxPerDevicePerDay: 'Registrazioni per dispositivo al giorno',
        maxPerDevicePerDayHelp: 'Predefinito 3.',
        defaultPlaceholder: 'Predefinito: {value}',
      },
      errors: {
        integerRange: 'Inserisci un numero intero da {min} a {max}.',
        scoreRange: 'Inserisci un numero da 0 a 1, ad esempio 0.5.',
        domainList: 'Inserisci domini come example.com, separati da virgole.',
        tooLong: 'Questo valore è troppo lungo.',
      },
      linkedAccounts: {
        open: 'Account collegati',
        title: 'Account collegati',
        description:
          'Altri account che condividono un dispositivo o una rete di registrazione con {email}.',
        loading: 'Caricamento degli account collegati…',
        loadFailed: 'Impossibile caricare gli account collegati.',
        empty:
          'Nessun altro account condivide un dispositivo o una rete di registrazione con questo.',
        reasonDevice: 'Stesso dispositivo',
        reasonDeviceId: 'Stesso ID dispositivo',
        reasonRegistrationIp: 'Stessa rete di registrazione',
        banned: 'Bannato',
        registered: 'Registrato il {date}',
      },
    },
  },
  [Locale.JA]: {
    navigationLabel: '登録保護',
    auth: {
      checking: 'ブラウザーを確認しています…',
      widgetLabel: 'セキュリティチェック',
      requiredTitle: 'ブラウザーを確認できませんでした',
      requiredDescription:
        'ページを再読み込みして、もう一度お試しください。セキュリティチェックには JavaScript が必要で、拡張機能でブロックしないでください。',
      failedTitle: 'ブラウザーがセキュリティチェックを通過しませんでした',
      failedDescription:
        'ページを再読み込みして、もう一度お試しください。VPN、プロキシ、厳しいプライバシー拡張機能が原因の場合があります。',
      disposableEmail:
        '一時的なメールアドレスや使い捨てメールアドレスは使用できません。継続して使うアドレスを入力してください。',
      emailUndeliverable:
        'このメールドメインはメールを受信できません。アドレスに入力ミスがないか確認してください。',
      signupLimitedTitle: '新規登録を一時停止しています',
      signupLimitedInMinutes:
        '短時間に多くのアカウントが作成されました。{minutes}分後にもう一度お試しください。',
      signupLimitedInOneMinute:
        '短時間に多くのアカウントが作成されました。1分後にもう一度お試しください。',
      signupLimitedFallback:
        '短時間に多くのアカウントが作成されました。しばらくしてからもう一度お試しください。',
    },
    admin: {
      title: '登録保護',
      description: '新規アカウントのボット対策、メールドメインのルール、登録数の上限。',
      loading: 'セキュリティ設定を読み込んでいます…',
      loadFailed: 'セキュリティ設定を読み込めませんでした。',
      readOnly: 'これらの設定は閲覧のみ可能で、変更はできません。',
      save: '変更を保存',
      saving: '保存しています…',
      saved: 'セキュリティ設定を保存しました',
      saveFailed: '一部の設定を保存できませんでした。内容を確認して、もう一度お試しください。',
      invalid: '先に強調表示された項目を修正してください。',
      groups: {
        powTitle: 'プルーフ・オブ・ワーク',
        powDescription:
          '常に有効です。登録のたびにブラウザーが小さなパズルを解くため、人よりもボットファームに大きな負担がかかります。',
        turnstileTitle: 'Cloudflare Turnstile（ボット対策）',
        turnstileDescription:
          '新規登録時と、失敗が続いた後のサインイン時に表示されます。両方のキーを保存するまで無効です。',
        recaptchaTitle: 'Google reCAPTCHA v3（ボット対策）',
        recaptchaDescription:
          'パズルなしで、登録ごとにバックグラウンドでスコアを付けます。両方のキーを保存するまで無効です。',
        emailTitle: 'メールドメイン',
        emailDescription:
          '使い捨てドメインは組み込みリストで拒否されます。独自のブロックと例外をここで追加できます。',
        velocityTitle: '登録数の上限',
        velocityDescription: '一度に多くのアカウントが作成されたときに新規登録を一時停止します。',
      },
      fields: {
        siteKey: 'サイトキー',
        secretKey: 'シークレットキー',
        secretHelp:
          '書き込み専用です。保存したシークレットは二度と表示されません。置き換えるには新しい値を入力してください。',
        secretConfigured: '設定済み。入力すると置き換えます。',
        secretNotConfigured: '未設定',
        minScore: '最低スコア',
        minScoreHelp: '0〜1。これより低いスコアの登録は拒否されます。既定値は 0.5。',
        powDifficulty: '難易度',
        powDifficultyHelp:
          '12〜24。18 なら通常のブラウザーで約1秒です。1段階上げるごとに作業量は2倍になります。',
        blockedDomains: 'ブロックするドメイン',
        blockedDomainsHelp:
          'カンマ区切り（例: spam.example, junk.test）。サブドメインもブロックされます。',
        allowedDomains: '許可するドメイン',
        allowedDomainsHelp: 'カンマ区切り。組み込みリストで使い捨てと判定されても受け付けます。',
        maxPer10Min: '10分あたりの登録数',
        maxPer10MinHelp: 'プラットフォーム全体での上限。既定値は 30。',
        maxPerDevicePerDay: '1デバイス1日あたりの登録数',
        maxPerDevicePerDayHelp: '既定値は 3。',
        defaultPlaceholder: '既定値: {value}',
      },
      errors: {
        integerRange: '{min}〜{max} の整数を入力してください。',
        scoreRange: '0〜1 の数値を入力してください（例: 0.5）。',
        domainList: 'example.com のようなドメインをカンマ区切りで入力してください。',
        tooLong: '値が長すぎます。',
      },
      linkedAccounts: {
        open: '関連アカウント',
        title: '関連アカウント',
        description: '{email} とデバイスまたは登録ネットワークを共有している他のアカウント。',
        loading: '関連アカウントを読み込んでいます…',
        loadFailed: '関連アカウントを読み込めませんでした。',
        empty: 'このアカウントとデバイスや登録ネットワークを共有するアカウントはありません。',
        reasonDevice: '同じデバイス',
        reasonDeviceId: '同じデバイス ID',
        reasonRegistrationIp: '同じ登録ネットワーク',
        banned: '利用停止',
        registered: '{date} に登録',
      },
    },
  },
  [Locale.PT]: {
    navigationLabel: 'Proteção de cadastro',
    auth: {
      checking: 'Verificando seu navegador…',
      widgetLabel: 'Verificação de segurança',
      requiredTitle: 'Não conseguimos verificar seu navegador',
      requiredDescription:
        'Recarregue a página e tente novamente. A verificação de segurança precisa de JavaScript e não pode ser bloqueada por nenhuma extensão.',
      failedTitle: 'Seu navegador não passou na verificação de segurança',
      failedDescription:
        'Recarregue a página e tente novamente. Uma VPN, um proxy ou uma extensão de privacidade rígida podem causar isso.',
      disposableEmail:
        'Endereços de e-mail temporários ou descartáveis não são aceitos. Use um endereço permanente.',
      emailUndeliverable:
        'Este domínio de e-mail não pode receber mensagens. Verifique se há erros no endereço.',
      signupLimitedTitle: 'Os cadastros estão pausados por um momento',
      signupLimitedInMinutes:
        'Muitas contas foram criadas em pouco tempo. Tente novamente em {minutes} minutos.',
      signupLimitedInOneMinute:
        'Muitas contas foram criadas em pouco tempo. Tente novamente em um minuto.',
      signupLimitedFallback:
        'Muitas contas foram criadas em pouco tempo. Tente novamente um pouco mais tarde.',
    },
    admin: {
      title: 'Proteção de cadastro',
      description:
        'Verificações antibots, regras de domínios de e-mail e limites de cadastro para novas contas.',
      loading: 'Carregando as configurações de segurança…',
      loadFailed: 'Não foi possível carregar as configurações de segurança.',
      readOnly: 'Você pode ver estas configurações, mas não alterá-las.',
      save: 'Salvar alterações',
      saving: 'Salvando…',
      saved: 'Configurações de segurança salvas',
      saveFailed: 'Algumas configurações não foram salvas. Verifique-as e tente novamente.',
      invalid: 'Corrija primeiro os campos destacados.',
      groups: {
        powTitle: 'Prova de trabalho',
        powDescription:
          'Sempre ativa. Antes de cada cadastro, o navegador resolve um pequeno desafio, que custa muito mais a uma fazenda de bots do que a uma pessoa.',
        turnstileTitle: 'Cloudflare Turnstile',
        turnstileDescription:
          'Exibido no cadastro e no login após falhas repetidas. Desativado até que as duas chaves sejam salvas.',
        recaptchaTitle: 'Google reCAPTCHA v3',
        recaptchaDescription:
          'Pontua cada cadastro em segundo plano, sem desafios. Desativado até que as duas chaves sejam salvas.',
        emailTitle: 'Domínios de e-mail',
        emailDescription:
          'Domínios descartáveis são recusados com base em uma lista integrada. Adicione aqui seus próprios bloqueios e exceções.',
        velocityTitle: 'Limites de cadastro',
        velocityDescription: 'Pausa os cadastros quando muitas contas são criadas de uma vez.',
      },
      fields: {
        siteKey: 'Chave do site',
        secretKey: 'Chave secreta',
        secretHelp:
          'Somente gravação. Um segredo salvo nunca é mostrado de novo; digite um novo para substituí-lo.',
        secretConfigured: 'Configurada. Digite para substituir.',
        secretNotConfigured: 'Não configurada',
        minScore: 'Pontuação mínima',
        minScoreHelp: 'De 0 a 1. Cadastros com pontuação menor são recusados. Padrão 0.5.',
        powDifficulty: 'Dificuldade',
        powDifficultyHelp:
          'De 12 a 24. Com 18 leva cerca de um segundo em um navegador comum; cada nível a mais dobra o trabalho.',
        blockedDomains: 'Domínios bloqueados',
        blockedDomainsHelp:
          'Separados por vírgulas, por exemplo spam.example, junk.test. Subdomínios também são bloqueados.',
        allowedDomains: 'Domínios permitidos',
        allowedDomainsHelp:
          'Separados por vírgulas. São aceitos mesmo que a lista integrada os considere descartáveis.',
        maxPer10Min: 'Cadastros a cada 10 minutos',
        maxPer10MinHelp: 'Em toda a plataforma. Padrão 30.',
        maxPerDevicePerDay: 'Cadastros por dispositivo por dia',
        maxPerDevicePerDayHelp: 'Padrão 3.',
        defaultPlaceholder: 'Padrão: {value}',
      },
      errors: {
        integerRange: 'Digite um número inteiro de {min} a {max}.',
        scoreRange: 'Digite um número de 0 a 1, como 0.5.',
        domainList: 'Digite domínios como example.com, separados por vírgulas.',
        tooLong: 'Este valor é longo demais.',
      },
      linkedAccounts: {
        open: 'Contas vinculadas',
        title: 'Contas vinculadas',
        description:
          'Outras contas que compartilham um dispositivo ou uma rede de cadastro com {email}.',
        loading: 'Carregando contas vinculadas…',
        loadFailed: 'Não foi possível carregar as contas vinculadas.',
        empty: 'Nenhuma outra conta compartilha um dispositivo ou uma rede de cadastro com esta.',
        reasonDevice: 'Mesmo dispositivo',
        reasonDeviceId: 'Mesmo ID de dispositivo',
        reasonRegistrationIp: 'Mesma rede de cadastro',
        banned: 'Banida',
        registered: 'Cadastrada em {date}',
      },
    },
  },
  [Locale.RU]: {
    navigationLabel: 'Защита регистрации',
    auth: {
      checking: 'Проверяем ваш браузер…',
      widgetLabel: 'Проверка безопасности',
      requiredTitle: 'Не удалось проверить ваш браузер',
      requiredDescription:
        'Перезагрузите страницу и попробуйте снова. Для проверки безопасности нужен JavaScript, и её не должно блокировать расширение.',
      failedTitle: 'Ваш браузер не прошёл проверку безопасности',
      failedDescription:
        'Перезагрузите страницу и попробуйте снова. Причиной может быть VPN, прокси или строгое расширение для приватности.',
      disposableEmail:
        'Временные и одноразовые адреса почты не принимаются. Укажите постоянный адрес.',
      emailUndeliverable:
        'Этот почтовый домен не может принимать письма. Проверьте адрес на опечатки.',
      signupLimitedTitle: 'Регистрация ненадолго приостановлена',
      signupLimitedInMinutes:
        'За короткое время создано слишком много аккаунтов. Повторите через {minutes} мин.',
      signupLimitedInOneMinute:
        'За короткое время создано слишком много аккаунтов. Повторите через минуту.',
      signupLimitedFallback:
        'За короткое время создано слишком много аккаунтов. Повторите чуть позже.',
    },
    admin: {
      title: 'Защита регистрации',
      description:
        'Проверки на ботов, правила почтовых доменов и лимиты регистрации новых аккаунтов.',
      loading: 'Загрузка настроек безопасности…',
      loadFailed: 'Не удалось загрузить настройки безопасности.',
      readOnly: 'Вы можете просматривать эти настройки, но не изменять их.',
      save: 'Сохранить изменения',
      saving: 'Сохранение…',
      saved: 'Настройки безопасности сохранены',
      saveFailed: 'Некоторые настройки не сохранились. Проверьте их и попробуйте снова.',
      invalid: 'Сначала исправьте отмеченные поля.',
      groups: {
        powTitle: 'Доказательство работы',
        powDescription:
          'Включено всегда. Перед каждой регистрацией браузер решает небольшую задачу — для фермы ботов это намного дороже, чем для человека.',
        turnstileTitle: 'Cloudflare Turnstile',
        turnstileDescription:
          'Показывается при регистрации и при входе после нескольких неудачных попыток. Выключено, пока не сохранены оба ключа.',
        recaptchaTitle: 'Google reCAPTCHA v3',
        recaptchaDescription:
          'Незаметно оценивает каждую регистрацию, без задач. Выключено, пока не сохранены оба ключа.',
        emailTitle: 'Почтовые домены',
        emailDescription:
          'Одноразовые домены отклоняются по встроенному списку. Здесь можно добавить свои блокировки и исключения.',
        velocityTitle: 'Лимиты регистрации',
        velocityDescription:
          'Приостанавливает регистрацию, когда одновременно создаётся слишком много аккаунтов.',
      },
      fields: {
        siteKey: 'Ключ сайта',
        secretKey: 'Секретный ключ',
        secretHelp:
          'Только запись. Сохранённый секрет больше не показывается; введите новый, чтобы заменить его.',
        secretConfigured: 'Настроен. Введите новый для замены.',
        secretNotConfigured: 'Не настроен',
        minScore: 'Минимальная оценка',
        minScoreHelp: 'От 0 до 1. Регистрации с меньшей оценкой отклоняются. По умолчанию 0.5.',
        powDifficulty: 'Сложность',
        powDifficultyHelp:
          'От 12 до 24. При 18 обычный браузер тратит около секунды; каждый шаг вверх удваивает работу.',
        blockedDomains: 'Заблокированные домены',
        blockedDomainsHelp:
          'Через запятую, например spam.example, junk.test. Поддомены тоже блокируются.',
        allowedDomains: 'Разрешённые домены',
        allowedDomainsHelp:
          'Через запятую. Принимаются, даже если встроенный список считает их одноразовыми.',
        maxPer10Min: 'Регистраций за 10 минут',
        maxPer10MinHelp: 'По всей платформе. По умолчанию 30.',
        maxPerDevicePerDay: 'Регистраций с одного устройства в день',
        maxPerDevicePerDayHelp: 'По умолчанию 3.',
        defaultPlaceholder: 'По умолчанию: {value}',
      },
      errors: {
        integerRange: 'Введите целое число от {min} до {max}.',
        scoreRange: 'Введите число от 0 до 1, например 0.5.',
        domainList: 'Введите домены вида example.com через запятую.',
        tooLong: 'Слишком длинное значение.',
      },
      linkedAccounts: {
        open: 'Связанные аккаунты',
        title: 'Связанные аккаунты',
        description: 'Другие аккаунты с тем же устройством или сетью регистрации, что и у {email}.',
        loading: 'Загрузка связанных аккаунтов…',
        loadFailed: 'Не удалось загрузить связанные аккаунты.',
        empty: 'Ни один другой аккаунт не использует то же устройство или сеть регистрации.',
        reasonDevice: 'То же устройство',
        reasonDeviceId: 'Тот же ID устройства',
        reasonRegistrationIp: 'Та же сеть регистрации',
        banned: 'Заблокирован',
        registered: 'Зарегистрирован {date}',
      },
    },
  },
  [Locale.TH]: {
    navigationLabel: 'การป้องกันการสมัคร',
    auth: {
      checking: 'กำลังตรวจสอบเบราว์เซอร์ของคุณ…',
      widgetLabel: 'การตรวจสอบความปลอดภัย',
      requiredTitle: 'ไม่สามารถตรวจสอบเบราว์เซอร์ของคุณได้',
      requiredDescription:
        'โหลดหน้านี้ใหม่แล้วลองอีกครั้ง การตรวจสอบความปลอดภัยต้องใช้ JavaScript และต้องไม่ถูกส่วนขยายใดบล็อก',
      failedTitle: 'เบราว์เซอร์ของคุณไม่ผ่านการตรวจสอบความปลอดภัย',
      failedDescription:
        'โหลดหน้านี้ใหม่แล้วลองอีกครั้ง VPN พร็อกซี หรือส่วนขยายความเป็นส่วนตัวที่เข้มงวดอาจเป็นสาเหตุ',
      disposableEmail: 'ไม่รับที่อยู่อีเมลชั่วคราวหรืออีเมลแบบใช้แล้วทิ้ง โปรดใช้ที่อยู่ถาวร',
      emailUndeliverable: 'โดเมนอีเมลนี้รับอีเมลไม่ได้ โปรดตรวจสอบว่าพิมพ์ที่อยู่ถูกต้อง',
      signupLimitedTitle: 'หยุดรับสมัครชั่วคราว',
      signupLimitedInMinutes: 'มีการสร้างบัญชีจำนวนมากในเวลาสั้นๆ ลองอีกครั้งใน {minutes} นาที',
      signupLimitedInOneMinute: 'มีการสร้างบัญชีจำนวนมากในเวลาสั้นๆ ลองอีกครั้งในหนึ่งนาที',
      signupLimitedFallback: 'มีการสร้างบัญชีจำนวนมากในเวลาสั้นๆ ลองอีกครั้งในภายหลัง',
    },
    admin: {
      title: 'การป้องกันการสมัคร',
      description: 'การตรวจจับบอต กฎโดเมนอีเมล และขีดจำกัดการสมัครสำหรับบัญชีใหม่',
      loading: 'กำลังโหลดการตั้งค่าความปลอดภัย…',
      loadFailed: 'โหลดการตั้งค่าความปลอดภัยไม่ได้',
      readOnly: 'คุณดูการตั้งค่าเหล่านี้ได้ แต่เปลี่ยนแปลงไม่ได้',
      save: 'บันทึกการเปลี่ยนแปลง',
      saving: 'กำลังบันทึก…',
      saved: 'บันทึกการตั้งค่าความปลอดภัยแล้ว',
      saveFailed: 'บางการตั้งค่าไม่ได้ถูกบันทึก โปรดตรวจสอบแล้วลองอีกครั้ง',
      invalid: 'โปรดแก้ไขช่องที่ไฮไลต์ก่อน',
      groups: {
        powTitle: 'การพิสูจน์การทำงาน',
        powDescription:
          'เปิดอยู่เสมอ ก่อนการสมัครแต่ละครั้ง เบราว์เซอร์จะแก้โจทย์เล็กๆ ซึ่งทำให้ฟาร์มบอตเสียต้นทุนมากกว่าคนทั่วไปมาก',
        turnstileTitle: 'Cloudflare Turnstile (ป้องกันบอต)',
        turnstileDescription: 'แสดงตอนสมัคร และตอนเข้าสู่ระบบหลังล้มเหลวหลายครั้ง ปิดอยู่จนกว่าจะบันทึกคีย์ทั้งสอง',
        recaptchaTitle: 'Google reCAPTCHA v3 (ป้องกันบอต)',
        recaptchaDescription: 'ให้คะแนนการสมัครแต่ละครั้งเบื้องหลังโดยไม่มีโจทย์ ปิดอยู่จนกว่าจะบันทึกคีย์ทั้งสอง',
        emailTitle: 'โดเมนอีเมล',
        emailDescription:
          'โดเมนอีเมลแบบใช้แล้วทิ้งจะถูกปฏิเสธตามรายการในตัว เพิ่มการบล็อกและข้อยกเว้นของคุณเองได้ที่นี่',
        velocityTitle: 'ขีดจำกัดการสมัคร',
        velocityDescription: 'หยุดรับสมัครชั่วคราวเมื่อมีการสร้างบัญชีมากเกินไปพร้อมกัน',
      },
      fields: {
        siteKey: 'คีย์เว็บไซต์',
        secretKey: 'คีย์ลับ',
        secretHelp: 'เขียนได้อย่างเดียว คีย์ลับที่บันทึกแล้วจะไม่แสดงอีก พิมพ์คีย์ใหม่เพื่อแทนที่',
        secretConfigured: 'ตั้งค่าแล้ว พิมพ์เพื่อแทนที่',
        secretNotConfigured: 'ยังไม่ได้ตั้งค่า',
        minScore: 'คะแนนขั้นต่ำ',
        minScoreHelp: 'ตั้งแต่ 0 ถึง 1 การสมัครที่ได้คะแนนต่ำกว่าจะถูกปฏิเสธ ค่าเริ่มต้น 0.5',
        powDifficulty: 'ความยาก',
        powDifficultyHelp:
          'ตั้งแต่ 12 ถึง 24 ที่ 18 เบราว์เซอร์ทั่วไปใช้เวลาราวหนึ่งวินาที แต่ละระดับที่เพิ่มขึ้นจะเพิ่มงานเป็นสองเท่า',
        blockedDomains: 'โดเมนที่บล็อก',
        blockedDomainsHelp: 'คั่นด้วยจุลภาค เช่น spam.example, junk.test โดเมนย่อยจะถูกบล็อกด้วย',
        allowedDomains: 'โดเมนที่อนุญาต',
        allowedDomainsHelp: 'คั่นด้วยจุลภาค ยอมรับได้แม้รายการในตัวจะถือว่าเป็นแบบใช้แล้วทิ้ง',
        maxPer10Min: 'จำนวนการสมัครต่อ 10 นาที',
        maxPer10MinHelp: 'ทั้งแพลตฟอร์ม ค่าเริ่มต้น 30',
        maxPerDevicePerDay: 'จำนวนการสมัครต่ออุปกรณ์ต่อวัน',
        maxPerDevicePerDayHelp: 'ค่าเริ่มต้น 3',
        defaultPlaceholder: 'ค่าเริ่มต้น: {value}',
      },
      errors: {
        integerRange: 'ป้อนจำนวนเต็มตั้งแต่ {min} ถึง {max}',
        scoreRange: 'ป้อนตัวเลขตั้งแต่ 0 ถึง 1 เช่น 0.5',
        domainList: 'ป้อนโดเมนอย่าง example.com คั่นด้วยจุลภาค',
        tooLong: 'ค่านี้ยาวเกินไป',
      },
      linkedAccounts: {
        open: 'บัญชีที่เชื่อมโยง',
        title: 'บัญชีที่เชื่อมโยง',
        description: 'บัญชีอื่นที่ใช้อุปกรณ์หรือเครือข่ายการสมัครเดียวกับ {email}',
        loading: 'กำลังโหลดบัญชีที่เชื่อมโยง…',
        loadFailed: 'โหลดบัญชีที่เชื่อมโยงไม่ได้',
        empty: 'ไม่มีบัญชีอื่นที่ใช้อุปกรณ์หรือเครือข่ายการสมัครเดียวกับบัญชีนี้',
        reasonDevice: 'อุปกรณ์เดียวกัน',
        reasonDeviceId: 'รหัสอุปกรณ์เดียวกัน',
        reasonRegistrationIp: 'เครือข่ายการสมัครเดียวกัน',
        banned: 'ถูกแบน',
        registered: 'สมัครเมื่อ {date}',
      },
    },
  },
  [Locale.ZH]: {
    navigationLabel: '注册保护',
    auth: {
      checking: '正在检查您的浏览器…',
      widgetLabel: '安全验证',
      requiredTitle: '无法检查您的浏览器',
      requiredDescription: '请刷新页面后重试。安全验证需要 JavaScript，且不能被任何扩展程序拦截。',
      failedTitle: '您的浏览器未通过安全验证',
      failedDescription: '请刷新页面后重试。VPN、代理或严格的隐私扩展程序可能导致此问题。',
      disposableEmail: '不接受临时或一次性邮箱地址。请使用长期有效的邮箱地址。',
      emailUndeliverable: '该邮箱域名无法接收邮件。请检查地址是否有拼写错误。',
      signupLimitedTitle: '注册暂时暂停',
      signupLimitedInMinutes: '短时间内创建了大量账户。请在 {minutes} 分钟后重试。',
      signupLimitedInOneMinute: '短时间内创建了大量账户。请在 1 分钟后重试。',
      signupLimitedFallback: '短时间内创建了大量账户。请稍后再试。',
    },
    admin: {
      title: '注册保护',
      description: '新账户的机器人检查、邮箱域名规则和注册限制。',
      loading: '正在加载安全设置…',
      loadFailed: '无法加载安全设置。',
      readOnly: '您可以查看这些设置，但不能修改。',
      save: '保存更改',
      saving: '正在保存…',
      saved: '安全设置已保存',
      saveFailed: '部分设置未能保存。请检查后重试。',
      invalid: '请先修正标出的字段。',
      groups: {
        powTitle: '工作量证明',
        powDescription:
          '始终开启。每次注册前浏览器都要解一道小难题，这对机器人农场的成本远高于对真人。',
        turnstileTitle: 'Cloudflare Turnstile 人机验证',
        turnstileDescription: '在注册时显示，以及在多次登录失败后显示。保存两个密钥之前保持关闭。',
        recaptchaTitle: 'Google reCAPTCHA v3 人机验证',
        recaptchaDescription: '在后台为每次注册打分，无需解题。保存两个密钥之前保持关闭。',
        emailTitle: '邮箱域名',
        emailDescription: '一次性邮箱域名会根据内置列表被拒绝。可在此添加您自己的屏蔽项和例外。',
        velocityTitle: '注册限制',
        velocityDescription: '同一时间创建的账户过多时暂停注册。',
      },
      fields: {
        siteKey: '站点密钥',
        secretKey: '私密密钥',
        secretHelp: '只写。已保存的私密密钥不会再显示；输入新值即可替换。',
        secretConfigured: '已配置。输入以替换。',
        secretNotConfigured: '未配置',
        minScore: '最低分数',
        minScoreHelp: '0 到 1。分数更低的注册将被拒绝。默认 0.5。',
        powDifficulty: '难度',
        powDifficultyHelp: '12 到 24。设为 18 时普通浏览器约需 1 秒；每提高一级工作量翻倍。',
        blockedDomains: '屏蔽的域名',
        blockedDomainsHelp: '用逗号分隔，例如 spam.example, junk.test。子域名也会被屏蔽。',
        allowedDomains: '允许的域名',
        allowedDomainsHelp: '用逗号分隔。即使内置列表将其视为一次性邮箱也会接受。',
        maxPer10Min: '每 10 分钟注册数',
        maxPer10MinHelp: '整个平台范围。默认 30。',
        maxPerDevicePerDay: '每台设备每天注册数',
        maxPerDevicePerDayHelp: '默认 3。',
        defaultPlaceholder: '默认：{value}',
      },
      errors: {
        integerRange: '请输入 {min} 到 {max} 之间的整数。',
        scoreRange: '请输入 0 到 1 之间的数字，例如 0.5。',
        domainList: '请输入以逗号分隔的域名，例如 example.com。',
        tooLong: '该值过长。',
      },
      linkedAccounts: {
        open: '关联账户',
        title: '关联账户',
        description: '与 {email} 共用设备或注册网络的其他账户。',
        loading: '正在加载关联账户…',
        loadFailed: '无法加载关联账户。',
        empty: '没有其他账户与此账户共用设备或注册网络。',
        reasonDevice: '同一设备',
        reasonDeviceId: '同一设备 ID',
        reasonRegistrationIp: '同一注册网络',
        banned: '已封禁',
        registered: '注册于 {date}',
      },
    },
  },
};
