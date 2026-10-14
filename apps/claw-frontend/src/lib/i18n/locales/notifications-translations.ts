import { Locale } from '@/enums/locale.enum';
import type { NotificationsLocaleTranslation } from '@/types/i18n.types';

/**
 * In-app notifications (the bell in the top bar and the notification settings), in all 13
 * locales. One file, like usage-analytics-translations.ts: each locale file imports from here,
 * so a missing locale is a compile error. Real translations, not English placeholders.
 * `{placeholders}` must be kept as they are; "Thread" is the product's own word.
 */
export const NOTIFICATIONS_TRANSLATIONS: Record<Locale, NotificationsLocaleTranslation> = {
  [Locale.EN]: {
    bellLabel: 'Notifications',
    title: 'Notifications',
    empty: 'Nothing new yet. We will tell you here when a Thread is ready, published or fails.',
    loading: 'Loading…',
    error: 'Could not load notifications.',
    retry: 'Try again',
    markAllRead: 'Mark all as read',
    showOlder: 'Show older',
    settings: 'Notification settings',
    unreadCount: '{count} unread',
    kinds: {
      THREAD_READY_FOR_REVIEW: {
        title: 'Your Thread is ready for review',
        body: 'The draft is saved privately. Open it to review and approve.',
      },
      THREAD_PUBLISHED: {
        title: 'Your Thread is now public',
        body: 'Readers can open it now.',
      },
      THREAD_FAILED: {
        title: 'Your Thread could not be finished',
        body: 'The reserved spend was released. You can try again.',
      },
      THREAD_COMMENTED: {
        title: '{actorName} commented on your Thread',
        body: '@{actorUsername} wrote: {excerpt}',
      },
      THREAD_COMMENT_REPLIED: {
        title: '{actorName} replied to your comment',
        body: '@{actorUsername} wrote: {excerpt}',
      },
      THREAD_MENTIONED: {
        title: '{actorName} mentioned you',
        body: '@{actorUsername} wrote: {excerpt}',
      },
      THREAD_REACTED: {
        title: '{actorName} reacted to your Thread',
        body: 'From @{actorUsername}.',
      },
      THREAD_COMMENT_REACTED: {
        title: '{actorName} reacted to your comment',
        body: 'Your comment: {excerpt}',
      },
      THREAD_CHANGE_REQUESTED: {
        title: '{actorName} suggested a change to your Thread',
        body: '@{actorUsername} wrote: {excerpt}',
      },
      MCP_SERVER_APPROVED: {
        title: 'Your MCP server was approved',
        body: 'It is ready to use in chat.',
      },
      MCP_SERVER_REJECTED: {
        title: 'Your MCP server was not approved',
        body: 'Reason: {excerpt}',
      },
    },
    preferences: {
      title: 'Notifications',
      description: 'Choose how we tell you when a Thread is ready, published or fails.',
      inApp: 'In the app',
      inAppHint: 'A bell in the top bar.',
      email: 'By email',
      emailHint: 'Sent to your verified address.',
      saveFailed: 'Could not save your choice. Try again.',
      push: 'Push notifications',
      pushHint: 'A pop-up on this device, even when ClawAI is closed.',
      pushBlocked:
        'Notifications are blocked for this site. Allow them in your browser settings, then try again.',
      pushFailed: 'Could not turn on push notifications. Try again.',
    },
  },
  [Locale.AR]: {
    bellLabel: 'الإشعارات',
    title: 'الإشعارات',
    empty: 'لا جديد حتى الآن. سنخبرك هنا عندما يصبح Thread جاهزًا أو يُنشر أو يتعذّر إكماله.',
    loading: 'جارٍ التحميل…',
    error: 'تعذّر تحميل الإشعارات.',
    retry: 'حاول مرة أخرى',
    markAllRead: 'تعليم الكل كمقروء',
    showOlder: 'عرض الأقدم',
    settings: 'إعدادات الإشعارات',
    unreadCount: '{count} غير مقروء',
    kinds: {
      THREAD_READY_FOR_REVIEW: {
        title: 'Thread الخاص بك جاهز للمراجعة',
        body: 'المسودة محفوظة بشكل خاص. افتحها للمراجعة والموافقة.',
      },
      THREAD_PUBLISHED: {
        title: 'أصبح Thread الخاص بك عامًا',
        body: 'يمكن للقرّاء فتحه الآن.',
      },
      THREAD_FAILED: {
        title: 'تعذّر إكمال Thread الخاص بك',
        body: 'أُفرج عن المبلغ المحجوز. يمكنك المحاولة مرة أخرى.',
      },
      THREAD_COMMENTED: {
        title: 'علّق {actorName} على Thread الخاص بك',
        body: '@{actorUsername} كتب: {excerpt}',
      },
      THREAD_COMMENT_REPLIED: {
        title: 'ردّ {actorName} على تعليقك',
        body: '@{actorUsername} كتب: {excerpt}',
      },
      THREAD_MENTIONED: {
        title: 'أشار إليك {actorName}',
        body: '@{actorUsername} كتب: {excerpt}',
      },
      THREAD_REACTED: {
        title: 'تفاعل {actorName} مع Thread الخاص بك',
        body: 'من @{actorUsername}.',
      },
      THREAD_COMMENT_REACTED: {
        title: 'تفاعل {actorName} مع تعليقك',
        body: 'تعليقك: {excerpt}',
      },
      THREAD_CHANGE_REQUESTED: {
        title: 'اقترح {actorName} تعديلاً على Thread الخاص بك',
        body: '@{actorUsername} كتب: {excerpt}',
      },
      MCP_SERVER_APPROVED: {
        title: 'تمت الموافقة على خادم MCP الخاص بك',
        body: 'جاهز للاستخدام في المحادثة.',
      },
      MCP_SERVER_REJECTED: {
        title: 'لم تتم الموافقة على خادم MCP الخاص بك',
        body: 'السبب: {excerpt}',
      },
    },
    preferences: {
      title: 'الإشعارات',
      description: 'اختر كيف نخبرك عندما يصبح Thread جاهزًا أو يُنشر أو يتعذّر إكماله.',
      inApp: 'داخل التطبيق',
      inAppHint: 'جرس في الشريط العلوي.',
      email: 'بالبريد الإلكتروني',
      emailHint: 'يُرسل إلى عنوانك الموثّق.',
      saveFailed: 'تعذّر حفظ اختيارك. حاول مرة أخرى.',
      push: 'إشعارات فورية',
      pushHint: 'إشعار منبثق على هذا الجهاز حتى عندما يكون ClawAI مغلقًا.',
      pushBlocked: 'الإشعارات محظورة لهذا الموقع. اسمح بها من إعدادات المتصفح ثم حاول مرة أخرى.',
      pushFailed: 'تعذّر تفعيل الإشعارات الفورية. حاول مرة أخرى.',
    },
  },
  [Locale.FR]: {
    bellLabel: 'Notifications',
    title: 'Notifications',
    empty:
      'Rien de nouveau. Nous vous le dirons ici quand un Thread sera prêt, publié ou en échec.',
    loading: 'Chargement…',
    error: 'Impossible de charger les notifications.',
    retry: 'Réessayer',
    markAllRead: 'Tout marquer comme lu',
    showOlder: 'Afficher les plus anciennes',
    settings: 'Paramètres de notification',
    unreadCount: '{count} non lues',
    kinds: {
      THREAD_READY_FOR_REVIEW: {
        title: 'Votre Thread est prêt à être relu',
        body: 'Le brouillon est enregistré en privé. Ouvrez-le pour le relire et l’approuver.',
      },
      THREAD_PUBLISHED: {
        title: 'Votre Thread est maintenant public',
        body: 'Les lecteurs peuvent l’ouvrir dès maintenant.',
      },
      THREAD_FAILED: {
        title: 'Votre Thread n’a pas pu être terminé',
        body: 'La dépense réservée a été libérée. Vous pouvez réessayer.',
      },
      THREAD_COMMENTED: {
        title: '{actorName} a commenté votre Thread',
        body: '@{actorUsername} a écrit : {excerpt}',
      },
      THREAD_COMMENT_REPLIED: {
        title: '{actorName} a répondu à votre commentaire',
        body: '@{actorUsername} a écrit : {excerpt}',
      },
      THREAD_MENTIONED: {
        title: '{actorName} vous a mentionné',
        body: '@{actorUsername} a écrit : {excerpt}',
      },
      THREAD_REACTED: {
        title: '{actorName} a réagi à votre Thread',
        body: 'De @{actorUsername}.',
      },
      THREAD_COMMENT_REACTED: {
        title: '{actorName} a réagi à votre commentaire',
        body: 'Votre commentaire : {excerpt}',
      },
      THREAD_CHANGE_REQUESTED: {
        title: '{actorName} a suggéré une modification de votre Thread',
        body: '@{actorUsername} a écrit : {excerpt}',
      },
      MCP_SERVER_APPROVED: {
        title: 'Votre serveur MCP a été approuvé',
        body: 'Il est prêt à être utilisé dans le chat.',
      },
      MCP_SERVER_REJECTED: {
        title: "Votre serveur MCP n'a pas été approuvé",
        body: 'Raison : {excerpt}',
      },
    },
    preferences: {
      title: 'Notifications',
      description:
        'Choisissez comment nous vous prévenons quand un Thread est prêt, publié ou en échec.',
      inApp: 'Dans l’application',
      inAppHint: 'Une cloche dans la barre du haut.',
      email: 'Par e-mail',
      emailHint: 'Envoyé à votre adresse vérifiée.',
      saveFailed: 'Impossible d’enregistrer votre choix. Réessayez.',
      push: 'Notifications push',
      pushHint: 'Une alerte sur cet appareil, même quand ClawAI est fermé.',
      pushBlocked:
        'Les notifications sont bloquées pour ce site. Autorisez-les dans les réglages du navigateur, puis réessayez.',
      pushFailed: "Impossible d'activer les notifications push. Réessayez.",
    },
  },
  [Locale.IT]: {
    bellLabel: 'Notifiche',
    title: 'Notifiche',
    empty: 'Niente di nuovo. Ti avviseremo qui quando un Thread sarà pronto, pubblicato o fallito.',
    loading: 'Caricamento…',
    error: 'Impossibile caricare le notifiche.',
    retry: 'Riprova',
    markAllRead: 'Segna tutto come letto',
    showOlder: 'Mostra le più vecchie',
    settings: 'Impostazioni delle notifiche',
    unreadCount: '{count} non lette',
    kinds: {
      THREAD_READY_FOR_REVIEW: {
        title: 'Il tuo Thread è pronto per la revisione',
        body: 'La bozza è salvata in privato. Aprila per rivederla e approvarla.',
      },
      THREAD_PUBLISHED: {
        title: 'Il tuo Thread è ora pubblico',
        body: 'I lettori possono aprirlo adesso.',
      },
      THREAD_FAILED: {
        title: 'Non è stato possibile completare il tuo Thread',
        body: 'La spesa riservata è stata rilasciata. Puoi riprovare.',
      },
      THREAD_COMMENTED: {
        title: '{actorName} ha commentato il tuo Thread',
        body: '@{actorUsername} ha scritto: {excerpt}',
      },
      THREAD_COMMENT_REPLIED: {
        title: '{actorName} ha risposto al tuo commento',
        body: '@{actorUsername} ha scritto: {excerpt}',
      },
      THREAD_MENTIONED: {
        title: '{actorName} ti ha menzionato',
        body: '@{actorUsername} ha scritto: {excerpt}',
      },
      THREAD_REACTED: {
        title: '{actorName} ha reagito al tuo Thread',
        body: 'Da @{actorUsername}.',
      },
      THREAD_COMMENT_REACTED: {
        title: '{actorName} ha reagito al tuo commento',
        body: 'Il tuo commento: {excerpt}',
      },
      THREAD_CHANGE_REQUESTED: {
        title: '{actorName} ha suggerito una modifica al tuo Thread',
        body: '@{actorUsername} ha scritto: {excerpt}',
      },
      MCP_SERVER_APPROVED: {
        title: 'Il tuo server MCP è stato approvato',
        body: "È pronto all'uso in chat.",
      },
      MCP_SERVER_REJECTED: {
        title: 'Il tuo server MCP non è stato approvato',
        body: 'Motivo: {excerpt}',
      },
    },
    preferences: {
      title: 'Notifiche',
      description: 'Scegli come avvisarti quando un Thread è pronto, pubblicato o fallito.',
      inApp: 'Nell’app',
      inAppHint: 'Una campanella nella barra in alto.',
      email: 'Per e-mail',
      emailHint: 'Inviata al tuo indirizzo verificato.',
      saveFailed: 'Impossibile salvare la tua scelta. Riprova.',
      push: 'Notifiche push',
      pushHint: 'Un avviso su questo dispositivo, anche quando ClawAI è chiuso.',
      pushBlocked:
        'Le notifiche sono bloccate per questo sito. Consentile nelle impostazioni del browser e riprova.',
      pushFailed: 'Impossibile attivare le notifiche push. Riprova.',
    },
  },
  [Locale.DE]: {
    bellLabel: 'Benachrichtigungen',
    title: 'Benachrichtigungen',
    empty:
      'Noch nichts Neues. Wir sagen dir hier Bescheid, wenn ein Thread fertig, veröffentlicht oder fehlgeschlagen ist.',
    loading: 'Wird geladen…',
    error: 'Benachrichtigungen konnten nicht geladen werden.',
    retry: 'Erneut versuchen',
    markAllRead: 'Alle als gelesen markieren',
    showOlder: 'Ältere anzeigen',
    settings: 'Benachrichtigungseinstellungen',
    unreadCount: '{count} ungelesen',
    kinds: {
      THREAD_READY_FOR_REVIEW: {
        title: 'Dein Thread ist bereit zur Prüfung',
        body: 'Der Entwurf ist privat gespeichert. Öffne ihn, um ihn zu prüfen und zu genehmigen.',
      },
      THREAD_PUBLISHED: {
        title: 'Dein Thread ist jetzt öffentlich',
        body: 'Leser können ihn jetzt öffnen.',
      },
      THREAD_FAILED: {
        title: 'Dein Thread konnte nicht fertiggestellt werden',
        body: 'Der reservierte Betrag wurde freigegeben. Du kannst es erneut versuchen.',
      },
      THREAD_COMMENTED: {
        title: '{actorName} hat deinen Thread kommentiert',
        body: '@{actorUsername} schrieb: {excerpt}',
      },
      THREAD_COMMENT_REPLIED: {
        title: '{actorName} hat auf deinen Kommentar geantwortet',
        body: '@{actorUsername} schrieb: {excerpt}',
      },
      THREAD_MENTIONED: {
        title: '{actorName} hat dich erwähnt',
        body: '@{actorUsername} schrieb: {excerpt}',
      },
      THREAD_REACTED: {
        title: '{actorName} hat auf deinen Thread reagiert',
        body: 'Von @{actorUsername}.',
      },
      THREAD_COMMENT_REACTED: {
        title: '{actorName} hat auf deinen Kommentar reagiert',
        body: 'Dein Kommentar: {excerpt}',
      },
      THREAD_CHANGE_REQUESTED: {
        title: '{actorName} hat eine Änderung an deinem Thread vorgeschlagen',
        body: '@{actorUsername} schrieb: {excerpt}',
      },
      MCP_SERVER_APPROVED: {
        title: 'Ihr MCP-Server wurde genehmigt',
        body: 'Er ist im Chat einsatzbereit.',
      },
      MCP_SERVER_REJECTED: {
        title: 'Ihr MCP-Server wurde nicht genehmigt',
        body: 'Grund: {excerpt}',
      },
    },
    preferences: {
      title: 'Benachrichtigungen',
      description:
        'Lege fest, wie wir dir Bescheid geben, wenn ein Thread fertig, veröffentlicht oder fehlgeschlagen ist.',
      inApp: 'In der App',
      inAppHint: 'Eine Glocke in der oberen Leiste.',
      email: 'Per E-Mail',
      emailHint: 'An deine bestätigte Adresse gesendet.',
      saveFailed: 'Deine Auswahl konnte nicht gespeichert werden. Versuche es erneut.',
      push: 'Push-Benachrichtigungen',
      pushHint: 'Ein Hinweis auf diesem Gerät, auch wenn ClawAI geschlossen ist.',
      pushBlocked:
        'Benachrichtigungen sind für diese Website blockiert. Erlauben Sie sie in den Browser-Einstellungen und versuchen Sie es erneut.',
      pushFailed:
        'Push-Benachrichtigungen konnten nicht aktiviert werden. Versuchen Sie es erneut.',
    },
  },
  [Locale.ES]: {
    bellLabel: 'Notificaciones',
    title: 'Notificaciones',
    empty: 'Nada nuevo todavía. Te avisaremos aquí cuando un Thread esté listo, publicado o falle.',
    loading: 'Cargando…',
    error: 'No se pudieron cargar las notificaciones.',
    retry: 'Reintentar',
    markAllRead: 'Marcar todo como leído',
    showOlder: 'Mostrar anteriores',
    settings: 'Ajustes de notificaciones',
    unreadCount: '{count} sin leer',
    kinds: {
      THREAD_READY_FOR_REVIEW: {
        title: 'Tu Thread está listo para revisión',
        body: 'El borrador está guardado en privado. Ábrelo para revisarlo y aprobarlo.',
      },
      THREAD_PUBLISHED: {
        title: 'Tu Thread ya es público',
        body: 'Los lectores ya pueden abrirlo.',
      },
      THREAD_FAILED: {
        title: 'No se pudo terminar tu Thread',
        body: 'Se liberó el gasto reservado. Puedes intentarlo de nuevo.',
      },
      THREAD_COMMENTED: {
        title: '{actorName} comentó tu Thread',
        body: '@{actorUsername} escribió: {excerpt}',
      },
      THREAD_COMMENT_REPLIED: {
        title: '{actorName} respondió a tu comentario',
        body: '@{actorUsername} escribió: {excerpt}',
      },
      THREAD_MENTIONED: {
        title: '{actorName} te mencionó',
        body: '@{actorUsername} escribió: {excerpt}',
      },
      THREAD_REACTED: {
        title: '{actorName} reaccionó a tu Thread',
        body: 'De @{actorUsername}.',
      },
      THREAD_COMMENT_REACTED: {
        title: '{actorName} reaccionó a tu comentario',
        body: 'Tu comentario: {excerpt}',
      },
      THREAD_CHANGE_REQUESTED: {
        title: '{actorName} sugirió un cambio en tu Thread',
        body: '@{actorUsername} escribió: {excerpt}',
      },
      MCP_SERVER_APPROVED: {
        title: 'Tu servidor MCP fue aprobado',
        body: 'Ya está listo para usar en el chat.',
      },
      MCP_SERVER_REJECTED: {
        title: 'Tu servidor MCP no fue aprobado',
        body: 'Motivo: {excerpt}',
      },
    },
    preferences: {
      title: 'Notificaciones',
      description: 'Elige cómo te avisamos cuando un Thread esté listo, publicado o falle.',
      inApp: 'En la aplicación',
      inAppHint: 'Una campana en la barra superior.',
      email: 'Por correo',
      emailHint: 'Se envía a tu dirección verificada.',
      saveFailed: 'No se pudo guardar tu elección. Inténtalo de nuevo.',
      push: 'Notificaciones push',
      pushHint: 'Un aviso en este dispositivo, incluso con ClawAI cerrado.',
      pushBlocked:
        'Las notificaciones están bloqueadas para este sitio. Permítelas en los ajustes del navegador e inténtalo de nuevo.',
      pushFailed: 'No se pudieron activar las notificaciones push. Inténtalo de nuevo.',
    },
  },
  [Locale.PT]: {
    bellLabel: 'Notificações',
    title: 'Notificações',
    empty:
      'Nada de novo ainda. Avisaremos aqui quando um Thread estiver pronto, publicado ou falhar.',
    loading: 'Carregando…',
    error: 'Não foi possível carregar as notificações.',
    retry: 'Tentar de novo',
    markAllRead: 'Marcar tudo como lido',
    showOlder: 'Mostrar mais antigas',
    settings: 'Configurações de notificações',
    unreadCount: '{count} não lidas',
    kinds: {
      THREAD_READY_FOR_REVIEW: {
        title: 'Seu Thread está pronto para revisão',
        body: 'O rascunho está salvo em particular. Abra para revisar e aprovar.',
      },
      THREAD_PUBLISHED: {
        title: 'Seu Thread já é público',
        body: 'Os leitores já podem abri-lo.',
      },
      THREAD_FAILED: {
        title: 'Não foi possível concluir seu Thread',
        body: 'O valor reservado foi liberado. Você pode tentar de novo.',
      },
      THREAD_COMMENTED: {
        title: '{actorName} comentou o seu Thread',
        body: '@{actorUsername} escreveu: {excerpt}',
      },
      THREAD_COMMENT_REPLIED: {
        title: '{actorName} respondeu ao seu comentário',
        body: '@{actorUsername} escreveu: {excerpt}',
      },
      THREAD_MENTIONED: {
        title: '{actorName} mencionou-o',
        body: '@{actorUsername} escreveu: {excerpt}',
      },
      THREAD_REACTED: {
        title: '{actorName} reagiu ao seu Thread',
        body: 'De @{actorUsername}.',
      },
      THREAD_COMMENT_REACTED: {
        title: '{actorName} reagiu ao seu comentário',
        body: 'O seu comentário: {excerpt}',
      },
      THREAD_CHANGE_REQUESTED: {
        title: '{actorName} sugeriu uma alteração ao seu Thread',
        body: '@{actorUsername} escreveu: {excerpt}',
      },
      MCP_SERVER_APPROVED: {
        title: 'O seu servidor MCP foi aprovado',
        body: 'Já está pronto a usar no chat.',
      },
      MCP_SERVER_REJECTED: {
        title: 'O seu servidor MCP não foi aprovado',
        body: 'Motivo: {excerpt}',
      },
    },
    preferences: {
      title: 'Notificações',
      description: 'Escolha como avisamos quando um Thread estiver pronto, publicado ou falhar.',
      inApp: 'No aplicativo',
      inAppHint: 'Um sino na barra superior.',
      email: 'Por e-mail',
      emailHint: 'Enviado ao seu endereço verificado.',
      saveFailed: 'Não foi possível salvar sua escolha. Tente de novo.',
      push: 'Notificações push',
      pushHint: 'Um aviso neste dispositivo, mesmo com o ClawAI fechado.',
      pushBlocked:
        'As notificações estão bloqueadas para este site. Permita-as nas configurações do navegador e tente novamente.',
      pushFailed: 'Não foi possível ativar as notificações push. Tente novamente.',
    },
  },
  [Locale.RU]: {
    bellLabel: 'Уведомления',
    title: 'Уведомления',
    empty:
      'Пока ничего нового. Мы сообщим здесь, когда Thread будет готов, опубликован или не удастся.',
    loading: 'Загрузка…',
    error: 'Не удалось загрузить уведомления.',
    retry: 'Повторить',
    markAllRead: 'Отметить все как прочитанные',
    showOlder: 'Показать более старые',
    settings: 'Настройки уведомлений',
    unreadCount: 'Непрочитанных: {count}',
    kinds: {
      THREAD_READY_FOR_REVIEW: {
        title: 'Ваш Thread готов к проверке',
        body: 'Черновик сохранён приватно. Откройте его, чтобы проверить и одобрить.',
      },
      THREAD_PUBLISHED: {
        title: 'Ваш Thread теперь общедоступен',
        body: 'Читатели уже могут его открыть.',
      },
      THREAD_FAILED: {
        title: 'Не удалось завершить ваш Thread',
        body: 'Зарезервированная сумма освобождена. Вы можете попробовать снова.',
      },
      THREAD_COMMENTED: {
        title: '{actorName} прокомментировал(а) ваш Thread',
        body: '@{actorUsername} написал(а): {excerpt}',
      },
      THREAD_COMMENT_REPLIED: {
        title: '{actorName} ответил(а) на ваш комментарий',
        body: '@{actorUsername} написал(а): {excerpt}',
      },
      THREAD_MENTIONED: {
        title: '{actorName} упомянул(а) вас',
        body: '@{actorUsername} написал(а): {excerpt}',
      },
      THREAD_REACTED: {
        title: '{actorName} отреагировал(а) на ваш Thread',
        body: 'От @{actorUsername}.',
      },
      THREAD_COMMENT_REACTED: {
        title: '{actorName} отреагировал(а) на ваш комментарий',
        body: 'Ваш комментарий: {excerpt}',
      },
      THREAD_CHANGE_REQUESTED: {
        title: '{actorName} предложил(а) изменение в вашем Thread',
        body: '@{actorUsername} написал(а): {excerpt}',
      },
      MCP_SERVER_APPROVED: {
        title: 'Ваш MCP-сервер одобрен',
        body: 'Его можно использовать в чате.',
      },
      MCP_SERVER_REJECTED: {
        title: 'Ваш MCP-сервер не одобрен',
        body: 'Причина: {excerpt}',
      },
    },
    preferences: {
      title: 'Уведомления',
      description: 'Выберите, как сообщать вам, когда Thread готов, опубликован или не удался.',
      inApp: 'В приложении',
      inAppHint: 'Колокольчик в верхней панели.',
      email: 'По электронной почте',
      emailHint: 'Отправляется на ваш подтверждённый адрес.',
      saveFailed: 'Не удалось сохранить выбор. Попробуйте снова.',
      push: 'Push-уведомления',
      pushHint: 'Всплывающее уведомление на этом устройстве, даже когда ClawAI закрыт.',
      pushBlocked:
        'Уведомления для этого сайта заблокированы. Разрешите их в настройках браузера и повторите попытку.',
      pushFailed: 'Не удалось включить push-уведомления. Повторите попытку.',
    },
  },
  [Locale.ZH]: {
    bellLabel: '通知',
    title: '通知',
    empty: '暂时没有新消息。当 Thread 准备好、已发布或失败时，我们会在这里告诉你。',
    loading: '加载中…',
    error: '无法加载通知。',
    retry: '重试',
    markAllRead: '全部标为已读',
    showOlder: '显示更早的',
    settings: '通知设置',
    unreadCount: '{count} 条未读',
    kinds: {
      THREAD_READY_FOR_REVIEW: {
        title: '你的 Thread 已准备好审阅',
        body: '草稿已私密保存。打开即可审阅并批准。',
      },
      THREAD_PUBLISHED: {
        title: '你的 Thread 现已公开',
        body: '读者现在即可打开阅读。',
      },
      THREAD_FAILED: {
        title: '你的 Thread 未能完成',
        body: '为其预留的费用已释放。你可以再试一次。',
      },
      THREAD_COMMENTED: {
        title: '{actorName} 评论了你的 Thread',
        body: '@{actorUsername} 写道：{excerpt}',
      },
      THREAD_COMMENT_REPLIED: {
        title: '{actorName} 回复了你的评论',
        body: '@{actorUsername} 写道：{excerpt}',
      },
      THREAD_MENTIONED: {
        title: '{actorName} 提到了你',
        body: '@{actorUsername} 写道：{excerpt}',
      },
      THREAD_REACTED: {
        title: '{actorName} 对你的 Thread 做出了回应',
        body: '来自 @{actorUsername}。',
      },
      THREAD_COMMENT_REACTED: {
        title: '{actorName} 对你的评论做出了回应',
        body: '你的评论：{excerpt}',
      },
      THREAD_CHANGE_REQUESTED: {
        title: '{actorName} 建议修改你的 Thread',
        body: '@{actorUsername} 写道：{excerpt}',
      },
      MCP_SERVER_APPROVED: {
        title: '你的 MCP 服务器已获批准',
        body: '现在可以在聊天中使用。',
      },
      MCP_SERVER_REJECTED: {
        title: '你的 MCP 服务器未获批准',
        body: '原因：{excerpt}',
      },
    },
    preferences: {
      title: '通知',
      description: '选择当 Thread 准备好、已发布或失败时，我们如何通知你。',
      inApp: '应用内',
      inAppHint: '顶部栏中的铃铛。',
      email: '通过邮件',
      emailHint: '发送到你已验证的地址。',
      saveFailed: '无法保存你的选择。请重试。',
      push: '推送通知',
      pushHint: '即使 ClawAI 已关闭，也会在此设备上弹出提醒。',
      pushBlocked: '此网站的通知已被屏蔽。请在浏览器设置中允许通知，然后重试。',
      pushFailed: '无法开启推送通知，请重试。',
    },
  },
  [Locale.JA]: {
    bellLabel: '通知',
    title: '通知',
    empty: 'まだ新しいものはありません。Thread の準備完了・公開・失敗をここでお知らせします。',
    loading: '読み込み中…',
    error: '通知を読み込めませんでした。',
    retry: '再試行',
    markAllRead: 'すべて既読にする',
    showOlder: '古いものを表示',
    settings: '通知設定',
    unreadCount: '未読 {count} 件',
    kinds: {
      THREAD_READY_FOR_REVIEW: {
        title: 'Thread の確認準備ができました',
        body: '下書きは非公開で保存されています。開いて確認し、承認してください。',
      },
      THREAD_PUBLISHED: {
        title: 'Thread が公開されました',
        body: '読者がすぐに開けるようになりました。',
      },
      THREAD_FAILED: {
        title: 'Thread を完成できませんでした',
        body: '確保していた利用額は解放されました。もう一度お試しください。',
      },
      THREAD_COMMENTED: {
        title: '{actorName} さんがあなたの Thread にコメントしました',
        body: '@{actorUsername} さんの投稿: {excerpt}',
      },
      THREAD_COMMENT_REPLIED: {
        title: '{actorName} さんがあなたのコメントに返信しました',
        body: '@{actorUsername} さんの投稿: {excerpt}',
      },
      THREAD_MENTIONED: {
        title: '{actorName} さんがあなたをメンションしました',
        body: '@{actorUsername} さんの投稿: {excerpt}',
      },
      THREAD_REACTED: {
        title: '{actorName} さんがあなたの Thread にリアクションしました',
        body: '@{actorUsername} さんから。',
      },
      THREAD_COMMENT_REACTED: {
        title: '{actorName} さんがあなたのコメントにリアクションしました',
        body: 'あなたのコメント: {excerpt}',
      },
      THREAD_CHANGE_REQUESTED: {
        title: '{actorName} さんがあなたの Thread への変更を提案しました',
        body: '@{actorUsername} さんの投稿: {excerpt}',
      },
      MCP_SERVER_APPROVED: {
        title: 'MCP サーバーが承認されました',
        body: 'チャットで使えます。',
      },
      MCP_SERVER_REJECTED: {
        title: 'MCP サーバーは承認されませんでした',
        body: '理由: {excerpt}',
      },
    },
    preferences: {
      title: '通知',
      description: 'Thread の準備完了・公開・失敗をどのようにお知らせするかを選びます。',
      inApp: 'アプリ内',
      inAppHint: '上部バーのベルで表示します。',
      email: 'メール',
      emailHint: '確認済みのアドレスに送信します。',
      saveFailed: '選択を保存できませんでした。もう一度お試しください。',
      push: 'プッシュ通知',
      pushHint: 'ClawAI を閉じていても、この端末にポップアップで知らせます。',
      pushBlocked:
        'このサイトの通知はブロックされています。ブラウザの設定で許可してから、もう一度お試しください。',
      pushFailed: 'プッシュ通知をオンにできませんでした。もう一度お試しください。',
    },
  },
  [Locale.HI]: {
    bellLabel: 'सूचनाएँ',
    title: 'सूचनाएँ',
    empty: 'अभी कुछ नया नहीं है। Thread तैयार, प्रकाशित या विफल होने पर हम यहीं बताएँगे।',
    loading: 'लोड हो रहा है…',
    error: 'सूचनाएँ लोड नहीं हो सकीं।',
    retry: 'फिर कोशिश करें',
    markAllRead: 'सभी को पढ़ा हुआ चिह्नित करें',
    showOlder: 'पुरानी दिखाएँ',
    settings: 'सूचना सेटिंग',
    unreadCount: '{count} अपठित',
    kinds: {
      THREAD_READY_FOR_REVIEW: {
        title: 'आपका Thread समीक्षा के लिए तैयार है',
        body: 'ड्राफ़्ट निजी रूप से सहेजा गया है। समीक्षा और स्वीकृति के लिए इसे खोलें।',
      },
      THREAD_PUBLISHED: {
        title: 'आपका Thread अब सार्वजनिक है',
        body: 'पाठक अब इसे खोल सकते हैं।',
      },
      THREAD_FAILED: {
        title: 'आपका Thread पूरा नहीं हो सका',
        body: 'आरक्षित खर्च वापस कर दिया गया है। आप फिर कोशिश कर सकते हैं।',
      },
      THREAD_COMMENTED: {
        title: '{actorName} ने आपके Thread पर कमेंट किया',
        body: '@{actorUsername} ने लिखा: {excerpt}',
      },
      THREAD_COMMENT_REPLIED: {
        title: '{actorName} ने आपके कमेंट का जवाब दिया',
        body: '@{actorUsername} ने लिखा: {excerpt}',
      },
      THREAD_MENTIONED: {
        title: '{actorName} ने आपको मेंशन किया',
        body: '@{actorUsername} ने लिखा: {excerpt}',
      },
      THREAD_REACTED: {
        title: '{actorName} ने आपके Thread पर प्रतिक्रिया दी',
        body: '@{actorUsername} की ओर से।',
      },
      THREAD_COMMENT_REACTED: {
        title: '{actorName} ने आपके कमेंट पर प्रतिक्रिया दी',
        body: 'आपका कमेंट: {excerpt}',
      },
      THREAD_CHANGE_REQUESTED: {
        title: '{actorName} ने आपके Thread में बदलाव सुझाया',
        body: '@{actorUsername} ने लिखा: {excerpt}',
      },
      MCP_SERVER_APPROVED: {
        title: 'आपका MCP सर्वर स्वीकृत हो गया',
        body: 'यह चैट में इस्तेमाल के लिए तैयार है।',
      },
      MCP_SERVER_REJECTED: {
        title: 'आपका MCP सर्वर स्वीकृत नहीं हुआ',
        body: 'कारण: {excerpt}',
      },
    },
    preferences: {
      title: 'सूचनाएँ',
      description: 'चुनें कि Thread तैयार, प्रकाशित या विफल होने पर हम आपको कैसे बताएँ।',
      inApp: 'ऐप में',
      inAppHint: 'ऊपरी बार में एक घंटी।',
      email: 'ईमेल से',
      emailHint: 'आपके सत्यापित पते पर भेजा जाता है।',
      saveFailed: 'आपकी पसंद सहेजी नहीं जा सकी। फिर कोशिश करें।',
      push: 'पुश सूचनाएँ',
      pushHint: 'ClawAI बंद होने पर भी इस डिवाइस पर एक पॉप-अप।',
      pushBlocked:
        'इस साइट के लिए सूचनाएँ ब्लॉक हैं। ब्राउज़र सेटिंग में उन्हें अनुमति दें, फिर दोबारा कोशिश करें।',
      pushFailed: 'पुश सूचनाएँ चालू नहीं हो सकीं। फिर से कोशिश करें।',
    },
  },
  [Locale.TH]: {
    bellLabel: 'การแจ้งเตือน',
    title: 'การแจ้งเตือน',
    empty: 'ยังไม่มีอะไรใหม่ เราจะแจ้งที่นี่เมื่อ Thread พร้อม เผยแพร่ หรือล้มเหลว',
    loading: 'กำลังโหลด…',
    error: 'โหลดการแจ้งเตือนไม่ได้',
    retry: 'ลองอีกครั้ง',
    markAllRead: 'ทำเครื่องหมายว่าอ่านทั้งหมด',
    showOlder: 'แสดงรายการเก่ากว่า',
    settings: 'การตั้งค่าการแจ้งเตือน',
    unreadCount: 'ยังไม่ได้อ่าน {count}',
    kinds: {
      THREAD_READY_FOR_REVIEW: {
        title: 'Thread ของคุณพร้อมให้ตรวจสอบ',
        body: 'ฉบับร่างถูกบันทึกเป็นส่วนตัว เปิดเพื่อตรวจและอนุมัติ',
      },
      THREAD_PUBLISHED: {
        title: 'Thread ของคุณเป็นสาธารณะแล้ว',
        body: 'ผู้อ่านเปิดอ่านได้ทันที',
      },
      THREAD_FAILED: {
        title: 'ไม่สามารถทำ Thread ของคุณให้เสร็จได้',
        body: 'ยอดที่กันไว้ถูกคืนแล้ว คุณลองใหม่ได้',
      },
      THREAD_COMMENTED: {
        title: '{actorName} แสดงความคิดเห็นใน Thread ของคุณ',
        body: '@{actorUsername} เขียนว่า: {excerpt}',
      },
      THREAD_COMMENT_REPLIED: {
        title: '{actorName} ตอบกลับความคิดเห็นของคุณ',
        body: '@{actorUsername} เขียนว่า: {excerpt}',
      },
      THREAD_MENTIONED: {
        title: '{actorName} กล่าวถึงคุณ',
        body: '@{actorUsername} เขียนว่า: {excerpt}',
      },
      THREAD_REACTED: {
        title: '{actorName} แสดงปฏิกิริยาต่อ Thread ของคุณ',
        body: 'จาก @{actorUsername}',
      },
      THREAD_COMMENT_REACTED: {
        title: '{actorName} แสดงปฏิกิริยาต่อความคิดเห็นของคุณ',
        body: 'ความคิดเห็นของคุณ: {excerpt}',
      },
      THREAD_CHANGE_REQUESTED: {
        title: '{actorName} เสนอการแก้ไข Thread ของคุณ',
        body: '@{actorUsername} เขียนว่า: {excerpt}',
      },
      MCP_SERVER_APPROVED: {
        title: 'เซิร์ฟเวอร์ MCP ของคุณได้รับการอนุมัติแล้ว',
        body: 'พร้อมใช้งานในแชทแล้ว',
      },
      MCP_SERVER_REJECTED: {
        title: 'เซิร์ฟเวอร์ MCP ของคุณไม่ได้รับการอนุมัติ',
        body: 'เหตุผล: {excerpt}',
      },
    },
    preferences: {
      title: 'การแจ้งเตือน',
      description: 'เลือกวิธีที่เราแจ้งคุณเมื่อ Thread พร้อม เผยแพร่ หรือล้มเหลว',
      inApp: 'ในแอป',
      inAppHint: 'กระดิ่งในแถบด้านบน',
      email: 'ทางอีเมล',
      emailHint: 'ส่งไปยังที่อยู่ที่ยืนยันแล้วของคุณ',
      saveFailed: 'บันทึกตัวเลือกไม่ได้ ลองอีกครั้ง',
      push: 'การแจ้งเตือนแบบพุช',
      pushHint: 'ป๊อปอัปบนอุปกรณ์นี้ แม้ปิด ClawAI อยู่',
      pushBlocked:
        'การแจ้งเตือนของเว็บไซต์นี้ถูกบล็อก โปรดอนุญาตในการตั้งค่าเบราว์เซอร์แล้วลองอีกครั้ง',
      pushFailed: 'เปิดการแจ้งเตือนแบบพุชไม่สำเร็จ โปรดลองอีกครั้ง',
    },
  },
  [Locale.FA]: {
    bellLabel: 'اعلان‌ها',
    title: 'اعلان‌ها',
    empty: 'هنوز چیز تازه‌ای نیست. وقتی Thread آماده، منتشر یا ناموفق شود همین‌جا خبرتان می‌کنیم.',
    loading: 'در حال بارگذاری…',
    error: 'بارگذاری اعلان‌ها ممکن نشد.',
    retry: 'دوباره تلاش کنید',
    markAllRead: 'علامت‌گذاری همه به‌عنوان خوانده‌شده',
    showOlder: 'نمایش قدیمی‌تر',
    settings: 'تنظیمات اعلان‌ها',
    unreadCount: '{count} خوانده‌نشده',
    kinds: {
      THREAD_READY_FOR_REVIEW: {
        title: 'Thread شما آمادهٔ بررسی است',
        body: 'پیش‌نویس به‌صورت خصوصی ذخیره شده است. برای بررسی و تأیید آن را باز کنید.',
      },
      THREAD_PUBLISHED: {
        title: 'Thread شما اکنون عمومی است',
        body: 'خوانندگان اکنون می‌توانند آن را باز کنند.',
      },
      THREAD_FAILED: {
        title: 'Thread شما به پایان نرسید',
        body: 'هزینهٔ رزروشده آزاد شد. می‌توانید دوباره تلاش کنید.',
      },
      THREAD_COMMENTED: {
        title: '{actorName} برای Thread شما نظر گذاشت',
        body: '@{actorUsername} نوشت: {excerpt}',
      },
      THREAD_COMMENT_REPLIED: {
        title: '{actorName} به نظر شما پاسخ داد',
        body: '@{actorUsername} نوشت: {excerpt}',
      },
      THREAD_MENTIONED: {
        title: '{actorName} شما را نام برد',
        body: '@{actorUsername} نوشت: {excerpt}',
      },
      THREAD_REACTED: {
        title: '{actorName} به Thread شما واکنش نشان داد',
        body: 'از @{actorUsername}.',
      },
      THREAD_COMMENT_REACTED: {
        title: '{actorName} به نظر شما واکنش نشان داد',
        body: 'نظر شما: {excerpt}',
      },
      THREAD_CHANGE_REQUESTED: {
        title: '{actorName} تغییری را برای Thread شما پیشنهاد کرد',
        body: '@{actorUsername} نوشت: {excerpt}',
      },
      MCP_SERVER_APPROVED: {
        title: 'سرور MCP شما تأیید شد',
        body: 'در گفتگو آماده استفاده است.',
      },
      MCP_SERVER_REJECTED: {
        title: 'سرور MCP شما تأیید نشد',
        body: 'دلیل: {excerpt}',
      },
    },
    preferences: {
      title: 'اعلان‌ها',
      description: 'انتخاب کنید وقتی Thread آماده، منتشر یا ناموفق شد چگونه خبرتان کنیم.',
      inApp: 'در برنامه',
      inAppHint: 'یک زنگ در نوار بالا.',
      email: 'با ایمیل',
      emailHint: 'به نشانی تأییدشدهٔ شما فرستاده می‌شود.',
      saveFailed: 'ذخیرهٔ انتخاب شما ممکن نشد. دوباره تلاش کنید.',
      push: 'اعلان‌های فوری',
      pushHint: 'یک اعلان پاپ‌آپ روی این دستگاه، حتی وقتی ClawAI بسته است.',
      pushBlocked:
        'اعلان‌ها برای این سایت مسدود شده‌اند. در تنظیمات مرورگر آن‌ها را مجاز کنید و دوباره تلاش کنید.',
      pushFailed: 'روشن کردن اعلان‌های فوری ممکن نشد. دوباره تلاش کنید.',
    },
  },
};
