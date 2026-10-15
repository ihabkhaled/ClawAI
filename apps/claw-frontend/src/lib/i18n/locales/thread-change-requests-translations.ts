import { Locale } from '@/enums/locale.enum';
import type { ThreadChangeRequestsLocaleTranslation } from '@/types/i18n.types';

/**
 * Reader suggestions ("change requests") for a Thread, as the owner and the requester see them
 * (ADR-188): the owner review, the badge and bar that lead to it, the public credit line and
 * "My suggestions". Spread flat into `chat` in every locale (read as `chat.threadCr<Name>`), so a
 * missing locale or key is a type error. `{placeholders}` must be kept as they are; "Thread" is the
 * product's own word.
 */
export const THREAD_CHANGE_REQUESTS_TRANSLATIONS: Record<
  Locale,
  ThreadChangeRequestsLocaleTranslation
> = {
  [Locale.EN]: {
    threadCrRequesterUnknown: 'A reader',
    threadCrDecline: 'Decline',
    threadCrDeclineReason: 'Reason for the person (optional)',
    threadCrAcceptTitle: 'How do you want to apply it?',
    threadCrApplyWithAi: 'Apply with AI review',
    threadCrApplyWithAiHint:
      'Edit the article here with the suggestion in mind. The new version goes through the automatic review before you publish it.',
    threadCrEditMyself: 'I will edit it myself',
    threadCrEditMyselfHint:
      'Accept the suggestion and open the editor. When you publish the new version, the suggestion is marked as applied.',
    threadCrAcceptedWaiting:
      'Accepted. It is marked as applied when you publish the updated Thread.',
    threadCrStatusDeclined: 'Declined',
    threadCrStatusApplied: 'Applied',
    threadCrBadge: 'Suggestions waiting: {count}',
    threadCrOwnerBar: 'Pending change requests: {count}',
    threadCrOwnerBarReview: 'Review',
    threadCrCredits: 'Improved with suggestions from',
    threadCrMineTitle: 'My suggestions',
    threadCrMineIntro:
      'Changes you suggested to other people’s Threads, and what the owners decided.',
    threadCrMineEmpty:
      'You have not suggested any changes yet. Open a public Thread and use “Suggest a change”.',
    threadCrMineLoadFailed: 'Could not load your suggestions. Try again.',
    threadCrMineLink: 'My suggestions',
    threadCrMineOnThread: 'On: {title}',
    threadCrMineOwnerReply: 'Reply from the owner',
    threadCrMineOpenThread: 'Open the Thread',
    threadCrUntitled: 'Untitled Thread',
    threadCrErrorOwn: 'You cannot suggest a change to your own Thread.',
    threadCrErrorLimit:
      'You already have 3 suggestions waiting on this Thread, or it has too many waiting. Try again after the owner answers.',
    threadCrSectionHint:
      'Readers’ suggestions for this Thread. Accept or decline each one; the person is told.',
  },
  [Locale.AR]: {
    threadCrRequesterUnknown: 'أحد القرّاء',
    threadCrDecline: 'رفض',
    threadCrDeclineReason: 'سبب الرفض للشخص (اختياري)',
    threadCrAcceptTitle: 'كيف تريد تطبيقه؟',
    threadCrApplyWithAi: 'التطبيق مع مراجعة بالذكاء الاصطناعي',
    threadCrApplyWithAiHint:
      'عدّل المقال هنا مع وضع الاقتراح في الاعتبار. تمر النسخة الجديدة بالمراجعة التلقائية قبل أن تنشرها.',
    threadCrEditMyself: 'سأعدّله بنفسي',
    threadCrEditMyselfHint:
      'اقبل الاقتراح وافتح المحرر. عند نشر النسخة الجديدة يُعلَّم الاقتراح على أنه مُطبَّق.',
    threadCrAcceptedWaiting: 'تم القبول. يُعلَّم كمُطبَّق عند نشر Thread المحدَّث.',
    threadCrStatusDeclined: 'مرفوض',
    threadCrStatusApplied: 'مُطبَّق',
    threadCrBadge: 'اقتراحات بانتظارك: {count}',
    threadCrOwnerBar: 'طلبات تعديل معلّقة: {count}',
    threadCrOwnerBarReview: 'مراجعة',
    threadCrCredits: 'تم التحسين باقتراحات من',
    threadCrMineTitle: 'اقتراحاتي',
    threadCrMineIntro: 'التعديلات التي اقترحتها على Threads الآخرين وما قرره أصحابها.',
    threadCrMineEmpty: 'لم تقترح أي تعديل بعد. افتح Thread عامًا واستخدم «اقتراح تعديل».',
    threadCrMineLoadFailed: 'تعذّر تحميل اقتراحاتك. حاول مرة أخرى.',
    threadCrMineLink: 'اقتراحاتي',
    threadCrMineOnThread: 'على: {title}',
    threadCrMineOwnerReply: 'رد صاحب Thread',
    threadCrMineOpenThread: 'فتح Thread',
    threadCrUntitled: 'Thread بلا عنوان',
    threadCrErrorOwn: 'لا يمكنك اقتراح تعديل على Thread الخاص بك.',
    threadCrErrorLimit:
      'لديك بالفعل 3 اقتراحات بانتظار الرد على هذا Thread، أو أن عدد المعلّقة عليه كبير. حاول بعد أن يرد صاحبه.',
    threadCrSectionHint: 'اقتراحات القرّاء لهذا Thread. اقبل كل اقتراح أو ارفضه، وسيُبلَّغ صاحبه.',
  },
  [Locale.FR]: {
    threadCrRequesterUnknown: 'Un lecteur',
    threadCrDecline: 'Refuser',
    threadCrDeclineReason: 'Motif pour la personne (facultatif)',
    threadCrAcceptTitle: 'Comment voulez-vous l’appliquer ?',
    threadCrApplyWithAi: 'Appliquer avec relecture par l’IA',
    threadCrApplyWithAiHint:
      'Modifiez l’article ici en tenant compte de la suggestion. La nouvelle version passe par la relecture automatique avant publication.',
    threadCrEditMyself: 'Je le modifierai moi-même',
    threadCrEditMyselfHint:
      'Acceptez la suggestion et ouvrez l’éditeur. Quand vous publiez la nouvelle version, la suggestion est marquée comme appliquée.',
    threadCrAcceptedWaiting:
      'Acceptée. Elle est marquée comme appliquée quand vous publiez le Thread mis à jour.',
    threadCrStatusDeclined: 'Refusée',
    threadCrStatusApplied: 'Appliquée',
    threadCrBadge: 'Suggestions en attente : {count}',
    threadCrOwnerBar: 'Demandes de modification en attente : {count}',
    threadCrOwnerBarReview: 'Examiner',
    threadCrCredits: 'Amélioré grâce aux suggestions de',
    threadCrMineTitle: 'Mes suggestions',
    threadCrMineIntro:
      'Les modifications que vous avez suggérées aux Threads d’autres personnes, et la décision de leurs auteurs.',
    threadCrMineEmpty:
      'Vous n’avez encore suggéré aucune modification. Ouvrez un Thread public et utilisez « Suggérer une modification ».',
    threadCrMineLoadFailed: 'Impossible de charger vos suggestions. Réessayez.',
    threadCrMineLink: 'Mes suggestions',
    threadCrMineOnThread: 'Sur : {title}',
    threadCrMineOwnerReply: 'Réponse de l’auteur',
    threadCrMineOpenThread: 'Ouvrir le Thread',
    threadCrUntitled: 'Thread sans titre',
    threadCrErrorOwn: 'Vous ne pouvez pas suggérer une modification de votre propre Thread.',
    threadCrErrorLimit:
      'Vous avez déjà 3 suggestions en attente sur ce Thread, ou il en a trop en attente. Réessayez quand l’auteur aura répondu.',
    threadCrSectionHint:
      'Les suggestions des lecteurs pour ce Thread. Acceptez ou refusez chacune ; la personne est prévenue.',
  },
  [Locale.IT]: {
    threadCrRequesterUnknown: 'Un lettore',
    threadCrDecline: 'Rifiuta',
    threadCrDeclineReason: 'Motivo per la persona (facoltativo)',
    threadCrAcceptTitle: 'Come vuoi applicarlo?',
    threadCrApplyWithAi: 'Applica con revisione AI',
    threadCrApplyWithAiHint:
      'Modifica qui l’articolo tenendo conto del suggerimento. La nuova versione passa dalla revisione automatica prima della pubblicazione.',
    threadCrEditMyself: 'Lo modifico io',
    threadCrEditMyselfHint:
      'Accetta il suggerimento e apri l’editor. Quando pubblichi la nuova versione, il suggerimento viene segnato come applicato.',
    threadCrAcceptedWaiting:
      'Accettato. Viene segnato come applicato quando pubblichi il Thread aggiornato.',
    threadCrStatusDeclined: 'Rifiutato',
    threadCrStatusApplied: 'Applicato',
    threadCrBadge: 'Suggerimenti in attesa: {count}',
    threadCrOwnerBar: 'Richieste di modifica in attesa: {count}',
    threadCrOwnerBarReview: 'Rivedi',
    threadCrCredits: 'Migliorato con i suggerimenti di',
    threadCrMineTitle: 'I miei suggerimenti',
    threadCrMineIntro:
      'Le modifiche che hai suggerito ai Thread di altre persone e la decisione dei loro autori.',
    threadCrMineEmpty:
      'Non hai ancora suggerito modifiche. Apri un Thread pubblico e usa “Suggerisci una modifica”.',
    threadCrMineLoadFailed: 'Impossibile caricare i tuoi suggerimenti. Riprova.',
    threadCrMineLink: 'I miei suggerimenti',
    threadCrMineOnThread: 'Su: {title}',
    threadCrMineOwnerReply: 'Risposta dell’autore',
    threadCrMineOpenThread: 'Apri il Thread',
    threadCrUntitled: 'Thread senza titolo',
    threadCrErrorOwn: 'Non puoi suggerire una modifica al tuo Thread.',
    threadCrErrorLimit:
      'Hai già 3 suggerimenti in attesa su questo Thread, oppure ne ha troppi in attesa. Riprova dopo la risposta dell’autore.',
    threadCrSectionHint:
      'I suggerimenti dei lettori per questo Thread. Accetta o rifiuta ciascuno; la persona viene avvisata.',
  },
  [Locale.DE]: {
    threadCrRequesterUnknown: 'Ein Leser',
    threadCrDecline: 'Ablehnen',
    threadCrDeclineReason: 'Begründung für die Person (optional)',
    threadCrAcceptTitle: 'Wie möchtest du ihn umsetzen?',
    threadCrApplyWithAi: 'Mit KI-Prüfung umsetzen',
    threadCrApplyWithAiHint:
      'Bearbeite den Artikel hier mit dem Vorschlag im Blick. Die neue Version durchläuft die automatische Prüfung, bevor du sie veröffentlichst.',
    threadCrEditMyself: 'Ich bearbeite ihn selbst',
    threadCrEditMyselfHint:
      'Nimm den Vorschlag an und öffne den Editor. Sobald du die neue Version veröffentlichst, gilt der Vorschlag als umgesetzt.',
    threadCrAcceptedWaiting:
      'Angenommen. Er gilt als umgesetzt, sobald du den aktualisierten Thread veröffentlichst.',
    threadCrStatusDeclined: 'Abgelehnt',
    threadCrStatusApplied: 'Umgesetzt',
    threadCrBadge: 'Wartende Vorschläge: {count}',
    threadCrOwnerBar: 'Offene Änderungswünsche: {count}',
    threadCrOwnerBarReview: 'Prüfen',
    threadCrCredits: 'Verbessert mit Vorschlägen von',
    threadCrMineTitle: 'Meine Vorschläge',
    threadCrMineIntro:
      'Änderungen, die du für Threads anderer vorgeschlagen hast, und was die Autoren entschieden haben.',
    threadCrMineEmpty:
      'Du hast noch keine Änderung vorgeschlagen. Öffne einen öffentlichen Thread und nutze „Änderung vorschlagen“.',
    threadCrMineLoadFailed: 'Deine Vorschläge konnten nicht geladen werden. Versuche es erneut.',
    threadCrMineLink: 'Meine Vorschläge',
    threadCrMineOnThread: 'Zu: {title}',
    threadCrMineOwnerReply: 'Antwort des Autors',
    threadCrMineOpenThread: 'Thread öffnen',
    threadCrUntitled: 'Thread ohne Titel',
    threadCrErrorOwn: 'Du kannst keine Änderung an deinem eigenen Thread vorschlagen.',
    threadCrErrorLimit:
      'Du hast bereits 3 Vorschläge, die bei diesem Thread warten, oder er hat zu viele wartende. Versuche es nach der Antwort des Autors erneut.',
    threadCrSectionHint:
      'Vorschläge von Lesern zu diesem Thread. Nimm jeden an oder lehne ihn ab; die Person wird benachrichtigt.',
  },
  [Locale.ES]: {
    threadCrRequesterUnknown: 'Un lector',
    threadCrDecline: 'Rechazar',
    threadCrDeclineReason: 'Motivo para la persona (opcional)',
    threadCrAcceptTitle: '¿Cómo quieres aplicarla?',
    threadCrApplyWithAi: 'Aplicar con revisión de IA',
    threadCrApplyWithAiHint:
      'Edita el artículo aquí teniendo en cuenta la sugerencia. La nueva versión pasa por la revisión automática antes de publicarla.',
    threadCrEditMyself: 'La editaré yo',
    threadCrEditMyselfHint:
      'Acepta la sugerencia y abre el editor. Al publicar la nueva versión, la sugerencia se marca como aplicada.',
    threadCrAcceptedWaiting:
      'Aceptada. Se marca como aplicada cuando publicas el Thread actualizado.',
    threadCrStatusDeclined: 'Rechazada',
    threadCrStatusApplied: 'Aplicada',
    threadCrBadge: 'Sugerencias en espera: {count}',
    threadCrOwnerBar: 'Solicitudes de cambio pendientes: {count}',
    threadCrOwnerBarReview: 'Revisar',
    threadCrCredits: 'Mejorado con sugerencias de',
    threadCrMineTitle: 'Mis sugerencias',
    threadCrMineIntro:
      'Los cambios que sugeriste en Threads de otras personas y lo que decidieron sus autores.',
    threadCrMineEmpty:
      'Aún no has sugerido ningún cambio. Abre un Thread público y usa «Sugerir un cambio».',
    threadCrMineLoadFailed: 'No se pudieron cargar tus sugerencias. Inténtalo de nuevo.',
    threadCrMineLink: 'Mis sugerencias',
    threadCrMineOnThread: 'En: {title}',
    threadCrMineOwnerReply: 'Respuesta del autor',
    threadCrMineOpenThread: 'Abrir el Thread',
    threadCrUntitled: 'Thread sin título',
    threadCrErrorOwn: 'No puedes sugerir un cambio en tu propio Thread.',
    threadCrErrorLimit:
      'Ya tienes 3 sugerencias en espera en este Thread, o tiene demasiadas en espera. Inténtalo cuando el autor responda.',
    threadCrSectionHint:
      'Sugerencias de los lectores para este Thread. Acepta o rechaza cada una; la persona recibe un aviso.',
  },
  [Locale.PT]: {
    threadCrRequesterUnknown: 'Um leitor',
    threadCrDecline: 'Recusar',
    threadCrDeclineReason: 'Motivo para a pessoa (opcional)',
    threadCrAcceptTitle: 'Como quer aplicá-la?',
    threadCrApplyWithAi: 'Aplicar com revisão por IA',
    threadCrApplyWithAiHint:
      'Edite o artigo aqui tendo em conta a sugestão. A nova versão passa pela revisão automática antes de a publicar.',
    threadCrEditMyself: 'Vou editar eu mesmo',
    threadCrEditMyselfHint:
      'Aceite a sugestão e abra o editor. Quando publicar a nova versão, a sugestão fica marcada como aplicada.',
    threadCrAcceptedWaiting:
      'Aceita. Fica marcada como aplicada quando publicar o Thread atualizado.',
    threadCrStatusDeclined: 'Recusada',
    threadCrStatusApplied: 'Aplicada',
    threadCrBadge: 'Sugestões à espera: {count}',
    threadCrOwnerBar: 'Pedidos de alteração pendentes: {count}',
    threadCrOwnerBarReview: 'Rever',
    threadCrCredits: 'Melhorado com sugestões de',
    threadCrMineTitle: 'As minhas sugestões',
    threadCrMineIntro:
      'As alterações que sugeriu em Threads de outras pessoas e o que os autores decidiram.',
    threadCrMineEmpty:
      'Ainda não sugeriu nenhuma alteração. Abra um Thread público e use “Sugerir uma alteração”.',
    threadCrMineLoadFailed: 'Não foi possível carregar as suas sugestões. Tente novamente.',
    threadCrMineLink: 'As minhas sugestões',
    threadCrMineOnThread: 'Em: {title}',
    threadCrMineOwnerReply: 'Resposta do autor',
    threadCrMineOpenThread: 'Abrir o Thread',
    threadCrUntitled: 'Thread sem título',
    threadCrErrorOwn: 'Não pode sugerir uma alteração ao seu próprio Thread.',
    threadCrErrorLimit:
      'Já tem 3 sugestões à espera neste Thread, ou ele tem demasiadas à espera. Tente depois de o autor responder.',
    threadCrSectionHint:
      'Sugestões dos leitores para este Thread. Aceite ou recuse cada uma; a pessoa é avisada.',
  },
  [Locale.RU]: {
    threadCrRequesterUnknown: 'Читатель',
    threadCrDecline: 'Отклонить',
    threadCrDeclineReason: 'Причина для автора предложения (необязательно)',
    threadCrAcceptTitle: 'Как вы хотите его применить?',
    threadCrApplyWithAi: 'Применить с проверкой ИИ',
    threadCrApplyWithAiHint:
      'Отредактируйте статью здесь с учётом предложения. Новая версия пройдёт автоматическую проверку перед публикацией.',
    threadCrEditMyself: 'Я отредактирую сам(а)',
    threadCrEditMyselfHint:
      'Примите предложение и откройте редактор. Когда вы опубликуете новую версию, предложение будет отмечено как применённое.',
    threadCrAcceptedWaiting:
      'Принято. Оно будет отмечено как применённое, когда вы опубликуете обновлённый Thread.',
    threadCrStatusDeclined: 'Отклонено',
    threadCrStatusApplied: 'Применено',
    threadCrBadge: 'Предложений ждёт ответа: {count}',
    threadCrOwnerBar: 'Запросы на изменение в ожидании: {count}',
    threadCrOwnerBarReview: 'Просмотреть',
    threadCrCredits: 'Улучшено по предложениям от',
    threadCrMineTitle: 'Мои предложения',
    threadCrMineIntro: 'Изменения, которые вы предложили в чужих Thread, и решения их авторов.',
    threadCrMineEmpty:
      'Вы ещё не предлагали изменений. Откройте публичный Thread и нажмите «Предложить изменение».',
    threadCrMineLoadFailed: 'Не удалось загрузить ваши предложения. Попробуйте ещё раз.',
    threadCrMineLink: 'Мои предложения',
    threadCrMineOnThread: 'К: {title}',
    threadCrMineOwnerReply: 'Ответ автора',
    threadCrMineOpenThread: 'Открыть Thread',
    threadCrUntitled: 'Thread без названия',
    threadCrErrorOwn: 'Нельзя предлагать изменения в собственном Thread.',
    threadCrErrorLimit:
      'У вас уже есть 3 предложения, ожидающих ответа в этом Thread, или в нём слишком много ожидающих. Попробуйте после ответа автора.',
    threadCrSectionHint:
      'Предложения читателей для этого Thread. Примите или отклоните каждое; человек получит уведомление.',
  },
  [Locale.ZH]: {
    threadCrRequesterUnknown: '一位读者',
    threadCrDecline: '拒绝',
    threadCrDeclineReason: '给对方的理由（可选）',
    threadCrAcceptTitle: '你想如何应用它？',
    threadCrApplyWithAi: '应用并由 AI 审核',
    threadCrApplyWithAiHint: '在这里结合建议编辑文章。新版本发布前会先经过自动审核。',
    threadCrEditMyself: '我自己来编辑',
    threadCrEditMyselfHint: '采纳建议并打开编辑器。你发布新版本后，该建议会被标记为已应用。',
    threadCrAcceptedWaiting: '已采纳。你发布更新后的 Thread 时，它会被标记为已应用。',
    threadCrStatusDeclined: '已拒绝',
    threadCrStatusApplied: '已应用',
    threadCrBadge: '待处理的建议：{count}',
    threadCrOwnerBar: '待处理的修改请求：{count}',
    threadCrOwnerBarReview: '查看',
    threadCrCredits: '感谢以下人员的建议',
    threadCrMineTitle: '我的建议',
    threadCrMineIntro: '你向他人的 Thread 提出的修改建议，以及作者的决定。',
    threadCrMineEmpty: '你还没有提出过修改建议。打开一个公开的 Thread，使用“建议修改”。',
    threadCrMineLoadFailed: '无法加载你的建议，请重试。',
    threadCrMineLink: '我的建议',
    threadCrMineOnThread: '针对：{title}',
    threadCrMineOwnerReply: '作者的回复',
    threadCrMineOpenThread: '打开 Thread',
    threadCrUntitled: '无标题 Thread',
    threadCrErrorOwn: '你不能对自己的 Thread 提出修改建议。',
    threadCrErrorLimit:
      '你在这个 Thread 上已有 3 条待处理的建议，或它的待处理建议过多。请在作者答复后再试。',
    threadCrSectionHint: '读者对这个 Thread 提出的建议。逐条采纳或拒绝，对方会收到通知。',
  },
  [Locale.JA]: {
    threadCrRequesterUnknown: '読者',
    threadCrDecline: '見送る',
    threadCrDeclineReason: '相手への理由（任意）',
    threadCrAcceptTitle: 'どのように反映しますか？',
    threadCrApplyWithAi: 'AI レビュー付きで反映',
    threadCrApplyWithAiHint:
      '提案を踏まえてここで記事を編集します。新しい版は公開前に自動レビューを通ります。',
    threadCrEditMyself: '自分で編集する',
    threadCrEditMyselfHint:
      '提案を承認してエディターを開きます。新しい版を公開すると、提案は「反映済み」になります。',
    threadCrAcceptedWaiting: '承認済みです。更新した Thread を公開すると「反映済み」になります。',
    threadCrStatusDeclined: '見送り',
    threadCrStatusApplied: '反映済み',
    threadCrBadge: '対応待ちの提案: {count}',
    threadCrOwnerBar: '対応待ちの変更リクエスト: {count}',
    threadCrOwnerBarReview: '確認する',
    threadCrCredits: '次の方々の提案で改善されました',
    threadCrMineTitle: '自分の提案',
    threadCrMineIntro: '他の方の Thread に提案した変更と、作成者の判断です。',
    threadCrMineEmpty:
      'まだ変更を提案していません。公開 Thread を開いて「変更を提案」を使ってください。',
    threadCrMineLoadFailed: '提案を読み込めませんでした。もう一度お試しください。',
    threadCrMineLink: '自分の提案',
    threadCrMineOnThread: '対象: {title}',
    threadCrMineOwnerReply: '作成者からの返信',
    threadCrMineOpenThread: 'Thread を開く',
    threadCrUntitled: '無題の Thread',
    threadCrErrorOwn: '自分の Thread に変更を提案することはできません。',
    threadCrErrorLimit:
      'この Thread には対応待ちの提案がすでに 3 件あるか、対応待ちが多すぎます。作成者の返信後にお試しください。',
    threadCrSectionHint:
      'この Thread への読者からの提案です。それぞれ承認または見送りを選ぶと、相手に通知されます。',
  },
  [Locale.HI]: {
    threadCrRequesterUnknown: 'एक पाठक',
    threadCrDecline: 'अस्वीकार करें',
    threadCrDeclineReason: 'व्यक्ति के लिए कारण (वैकल्पिक)',
    threadCrAcceptTitle: 'इसे कैसे लागू करना चाहते हैं?',
    threadCrApplyWithAi: 'AI समीक्षा के साथ लागू करें',
    threadCrApplyWithAiHint:
      'सुझाव को ध्यान में रखकर लेख यहीं संपादित करें। नया संस्करण प्रकाशित करने से पहले स्वचालित समीक्षा से गुज़रता है।',
    threadCrEditMyself: 'मैं खुद संपादित करूँगा/करूँगी',
    threadCrEditMyselfHint:
      'सुझाव स्वीकार करें और संपादक खोलें। नया संस्करण प्रकाशित करने पर सुझाव “लागू” के रूप में चिह्नित हो जाता है।',
    threadCrAcceptedWaiting:
      'स्वीकार किया गया। अपडेट किया हुआ Thread प्रकाशित करने पर यह “लागू” चिह्नित हो जाएगा।',
    threadCrStatusDeclined: 'अस्वीकृत',
    threadCrStatusApplied: 'लागू',
    threadCrBadge: 'प्रतीक्षा में सुझाव: {count}',
    threadCrOwnerBar: 'लंबित बदलाव अनुरोध: {count}',
    threadCrOwnerBarReview: 'समीक्षा करें',
    threadCrCredits: 'इनके सुझावों से बेहतर बना',
    threadCrMineTitle: 'मेरे सुझाव',
    threadCrMineIntro: 'दूसरों के Thread में आपके सुझाए बदलाव और स्वामियों के निर्णय।',
    threadCrMineEmpty:
      'आपने अभी तक कोई बदलाव नहीं सुझाया है। कोई सार्वजनिक Thread खोलें और “बदलाव सुझाएँ” का उपयोग करें।',
    threadCrMineLoadFailed: 'आपके सुझाव लोड नहीं हो सके। फिर से कोशिश करें।',
    threadCrMineLink: 'मेरे सुझाव',
    threadCrMineOnThread: 'विषय: {title}',
    threadCrMineOwnerReply: 'स्वामी का उत्तर',
    threadCrMineOpenThread: 'Thread खोलें',
    threadCrUntitled: 'बिना शीर्षक का Thread',
    threadCrErrorOwn: 'आप अपने ही Thread में बदलाव नहीं सुझा सकते।',
    threadCrErrorLimit:
      'इस Thread पर आपके 3 सुझाव पहले से प्रतीक्षा में हैं, या इस पर बहुत ज़्यादा प्रतीक्षा में हैं। स्वामी के उत्तर के बाद फिर कोशिश करें।',
    threadCrSectionHint:
      'इस Thread के लिए पाठकों के सुझाव। हर सुझाव स्वीकार या अस्वीकार करें; व्यक्ति को सूचना मिलती है।',
  },
  [Locale.TH]: {
    threadCrRequesterUnknown: 'ผู้อ่านคนหนึ่ง',
    threadCrDecline: 'ปฏิเสธ',
    threadCrDeclineReason: 'เหตุผลสำหรับผู้เสนอ (ไม่บังคับ)',
    threadCrAcceptTitle: 'ต้องการนำไปใช้อย่างไร',
    threadCrApplyWithAi: 'นำไปใช้พร้อมการตรวจโดย AI',
    threadCrApplyWithAiHint:
      'แก้ไขบทความที่นี่โดยคำนึงถึงข้อเสนอ เวอร์ชันใหม่จะผ่านการตรวจอัตโนมัติก่อนเผยแพร่',
    threadCrEditMyself: 'ฉันจะแก้ไขเอง',
    threadCrEditMyselfHint:
      'ยอมรับข้อเสนอแล้วเปิดตัวแก้ไข เมื่อเผยแพร่เวอร์ชันใหม่ ข้อเสนอจะถูกทำเครื่องหมายว่านำไปใช้แล้ว',
    threadCrAcceptedWaiting:
      'ยอมรับแล้ว จะถูกทำเครื่องหมายว่านำไปใช้แล้วเมื่อคุณเผยแพร่ Thread ที่อัปเดต',
    threadCrStatusDeclined: 'ปฏิเสธแล้ว',
    threadCrStatusApplied: 'นำไปใช้แล้ว',
    threadCrBadge: 'ข้อเสนอที่รอดำเนินการ: {count}',
    threadCrOwnerBar: 'คำขอแก้ไขที่รอดำเนินการ: {count}',
    threadCrOwnerBarReview: 'ตรวจสอบ',
    threadCrCredits: 'ปรับปรุงด้วยข้อเสนอจาก',
    threadCrMineTitle: 'ข้อเสนอของฉัน',
    threadCrMineIntro: 'การแก้ไขที่คุณเสนอให้ Thread ของผู้อื่น และการตัดสินใจของเจ้าของ',
    threadCrMineEmpty: 'คุณยังไม่ได้เสนอการแก้ไขใด ๆ เปิด Thread สาธารณะแล้วใช้ “เสนอการแก้ไข”',
    threadCrMineLoadFailed: 'โหลดข้อเสนอของคุณไม่สำเร็จ ลองอีกครั้ง',
    threadCrMineLink: 'ข้อเสนอของฉัน',
    threadCrMineOnThread: 'เกี่ยวกับ: {title}',
    threadCrMineOwnerReply: 'คำตอบจากเจ้าของ',
    threadCrMineOpenThread: 'เปิด Thread',
    threadCrUntitled: 'Thread ไม่มีชื่อ',
    threadCrErrorOwn: 'คุณไม่สามารถเสนอการแก้ไข Thread ของตัวเองได้',
    threadCrErrorLimit:
      'คุณมีข้อเสนอที่รออยู่ใน Thread นี้ครบ 3 รายการแล้ว หรือ Thread นี้มีข้อเสนอรออยู่มากเกินไป ลองอีกครั้งหลังเจ้าของตอบ',
    threadCrSectionHint:
      'ข้อเสนอของผู้อ่านสำหรับ Thread นี้ ยอมรับหรือปฏิเสธทีละรายการ ผู้เสนอจะได้รับแจ้ง',
  },
  [Locale.FA]: {
    threadCrRequesterUnknown: 'یک خواننده',
    threadCrDecline: 'رد کردن',
    threadCrDeclineReason: 'دلیل برای فرد (اختیاری)',
    threadCrAcceptTitle: 'می‌خواهید چگونه اعمال شود؟',
    threadCrApplyWithAi: 'اعمال با بازبینی هوش مصنوعی',
    threadCrApplyWithAiHint:
      'مقاله را همین‌جا با در نظر گرفتن پیشنهاد ویرایش کنید. نسخهٔ جدید پیش از انتشار از بازبینی خودکار می‌گذرد.',
    threadCrEditMyself: 'خودم ویرایش می‌کنم',
    threadCrEditMyselfHint:
      'پیشنهاد را بپذیرید و ویرایشگر را باز کنید. وقتی نسخهٔ جدید را منتشر کنید، پیشنهاد «اعمال‌شده» علامت می‌خورد.',
    threadCrAcceptedWaiting:
      'پذیرفته شد. وقتی Thread به‌روزشده را منتشر کنید «اعمال‌شده» علامت می‌خورد.',
    threadCrStatusDeclined: 'ردشده',
    threadCrStatusApplied: 'اعمال‌شده',
    threadCrBadge: 'پیشنهادهای در انتظار: {count}',
    threadCrOwnerBar: 'درخواست‌های تغییر در انتظار: {count}',
    threadCrOwnerBarReview: 'بررسی',
    threadCrCredits: 'بهبودیافته با پیشنهاد',
    threadCrMineTitle: 'پیشنهادهای من',
    threadCrMineIntro: 'تغییرهایی که برای Threadهای دیگران پیشنهاد داده‌اید و تصمیم صاحبانشان.',
    threadCrMineEmpty:
      'هنوز تغییری پیشنهاد نداده‌اید. یک Thread عمومی را باز کنید و از «پیشنهاد تغییر» استفاده کنید.',
    threadCrMineLoadFailed: 'بارگذاری پیشنهادهای شما ممکن نشد. دوباره تلاش کنید.',
    threadCrMineLink: 'پیشنهادهای من',
    threadCrMineOnThread: 'دربارهٔ: {title}',
    threadCrMineOwnerReply: 'پاسخ صاحب Thread',
    threadCrMineOpenThread: 'باز کردن Thread',
    threadCrUntitled: 'Thread بدون عنوان',
    threadCrErrorOwn: 'نمی‌توانید برای Thread خودتان تغییر پیشنهاد دهید.',
    threadCrErrorLimit:
      'از پیش ۳ پیشنهاد در انتظار روی این Thread دارید، یا پیشنهادهای در انتظار آن بیش از حد است. بعد از پاسخ صاحب Thread دوباره تلاش کنید.',
    threadCrSectionHint:
      'پیشنهادهای خوانندگان برای این Thread. هر کدام را بپذیرید یا رد کنید؛ فرد مطلع می‌شود.',
  },
};
