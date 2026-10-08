import { AuthEmailKind } from '../../enums/auth-email-kind.enum';
import type { AuthEmailDictionary } from '../types/auth-email-copy.type';

// German (formal "Sie") translation of en.copy.ts, which remains the source of
// truth: every key, every order and every null here mirrors the English file.
export const DE_AUTH_EMAIL_DICTIONARY: AuthEmailDictionary = {
  chrome: {
    greeting: 'Hallo {value},',
    greetingFallback: 'Hallo,',
    signOff: 'Mit freundlichen Grüßen',
    teamName: 'Ihr ClawAI-Team',
    footerNote:
      'Dies ist eine automatisch versendete Nachricht zu Ihrem ClawAI-Konto. Bitte antworten Sie nicht darauf — Antworten an diese Adresse werden nicht gelesen.',
    linkLabel: 'Diesen Link öffnen',
  },
  emails: {
    [AuthEmailKind.VERIFICATION]: {
      subject: 'Bestätigen Sie Ihre E-Mail-Adresse, um Ihr ClawAI-Konto zu aktivieren',
      preheader: 'Nur noch ein Schritt: Bestätigen Sie Ihre Adresse, dann ist Ihr Konto bereit.',
      heading: 'Bestätigen Sie Ihre E-Mail-Adresse',
      intro:
        'Vielen Dank, dass Sie ein ClawAI-Konto erstellt haben. Zum Schutz Ihres Kontos müssen wir bestätigen, dass diese Adresse Ihnen gehört.',
      bodyLines: [
        'Ihr Konto wurde erstellt, ist aber noch nicht aktiv. Solange diese Adresse nicht bestätigt ist, können Sie sich nicht anmelden.',
        'Klicken Sie auf die Schaltfläche unten, um Ihre Adresse zu bestätigen und die Einrichtung Ihres Kontos abzuschließen.',
      ],
      actionLabel: 'Meine E-Mail-Adresse bestätigen',
      fallbackNote:
        'Falls die Schaltfläche nicht funktioniert, kopieren Sie die untenstehende Adresse in Ihren Browser:',
      expiryNote: 'Aus Sicherheitsgründen läuft dieser Bestätigungslink in {expiry} ab.',
      securityNote:
        'Falls Sie kein ClawAI-Konto erstellt haben, können Sie diese Nachricht bedenkenlos ignorieren — ohne diese Bestätigung wird kein Konto aktiviert.',
    },
    [AuthEmailKind.PASSWORD_RESET]: {
      subject: 'Setzen Sie Ihr ClawAI-Passwort zurück',
      preheader: 'Wählen Sie über den sicheren Link in dieser Nachricht ein neues Passwort.',
      heading: 'Passwort zurücksetzen',
      intro:
        'Wir haben eine Anfrage erhalten, das Passwort für das mit dieser Adresse verknüpfte ClawAI-Konto zurückzusetzen.',
      bodyLines: [
        'Klicken Sie auf die Schaltfläche unten, um ein neues Passwort zu wählen. Bis dahin bleibt Ihr bisheriges Passwort gültig.',
        'Zu Ihrer Sicherheit kann nach der Änderung eine erneute Anmeldung auf Ihren anderen Geräten erforderlich sein.',
      ],
      actionLabel: 'Neues Passwort wählen',
      fallbackNote:
        'Falls die Schaltfläche nicht funktioniert, kopieren Sie die untenstehende Adresse in Ihren Browser:',
      expiryNote:
        'Aus Sicherheitsgründen läuft dieser Link in {expiry} ab und kann nur einmal verwendet werden.',
      securityNote:
        'Falls Sie kein Zurücksetzen des Passworts angefordert haben, ist nichts weiter zu tun — Ihr Passwort wurde nicht geändert. Sollte dies wiederholt vorkommen, wenden Sie sich bitte an unser Support-Team.',
    },
    [AuthEmailKind.TEMPORARY_PASSWORD]: {
      subject: 'Für Ihr ClawAI-Konto wurde ein temporäres Passwort vergeben',
      preheader:
        'Melden Sie sich mit dem temporären Passwort an und vergeben Sie umgehend ein neues.',
      heading: 'Ihr temporäres Passwort',
      intro:
        'Ein Administrator hat für Ihr ClawAI-Konto ein temporäres Passwort vergeben. Ihr bisheriges Passwort ist damit ungültig.',
      bodyLines: [
        'Ihr temporäres Passwort lautet: {value}',
        'Melden Sie sich damit an; Sie werden anschließend sofort aufgefordert, ein neues Passwort zu wählen. Geben Sie dieses Passwort an niemanden weiter.',
      ],
      actionLabel: 'Bei ClawAI anmelden',
      fallbackNote:
        'Falls die Schaltfläche nicht funktioniert, kopieren Sie die untenstehende Adresse in Ihren Browser:',
      expiryNote: 'Bitte melden Sie sich an und ändern Sie dieses Passwort so bald wie möglich.',
      securityNote:
        'Falls Sie diese Nachricht nicht erwartet haben, wenden Sie sich umgehend an unser Support-Team — eine Person mit Administratorzugang hat Ihre Anmeldedaten geändert.',
    },
    [AuthEmailKind.EMAIL_CHANGE_OTP]: {
      subject: 'Ihr Bestätigungscode für die Änderung Ihrer ClawAI-E-Mail-Adresse',
      preheader: 'Geben Sie diesen Code ein, um die Adressänderung an Ihrem Konto zu bestätigen.',
      heading: 'Bestätigen Sie diese Adressänderung',
      intro:
        'Es wurde beantragt, die E-Mail-Adresse Ihres ClawAI-Kontos in {value} zu ändern. Um fortzufahren, bestätigen Sie die Änderung von Ihrer aktuellen Adresse aus.',
      bodyLines: [
        'Geben Sie diesen Bestätigungscode in dem Browserfenster ein, in dem Sie die Änderung begonnen haben.',
      ],
      actionLabel: null,
      fallbackNote: null,
      expiryNote:
        'Dieser Code läuft in {expiry} ab. Geben Sie ihn niemals an Dritte weiter, auch nicht an unsere Mitarbeitenden.',
      securityNote:
        'Falls Sie diese Änderung nicht angefordert haben, geben Sie den Code nicht ein. Ändern Sie umgehend Ihr Passwort und wenden Sie sich an unser Support-Team — möglicherweise hat eine andere Person Zugriff auf Ihr Konto.',
    },
    [AuthEmailKind.EMAIL_CHANGE_CONFIRM]: {
      subject: 'Bestätigen Sie Ihre neue ClawAI-E-Mail-Adresse',
      preheader: 'Bestätigen Sie diese Adresse, um die Umstellung Ihres Kontos abzuschließen.',
      heading: 'Bestätigen Sie Ihre neue Adresse',
      intro:
        'Diese Adresse wurde als neue E-Mail-Adresse für ein ClawAI-Konto angegeben. Eine letzte Bestätigung schließt die Änderung ab.',
      bodyLines: [
        'Nach der Bestätigung ist dies die Adresse, mit der Sie sich anmelden und an die wir Nachrichten zu Ihrem Konto senden.',
      ],
      actionLabel: 'Diese Adresse bestätigen',
      fallbackNote:
        'Falls die Schaltfläche nicht funktioniert, kopieren Sie die untenstehende Adresse in Ihren Browser:',
      expiryNote: 'Aus Sicherheitsgründen läuft dieser Bestätigungslink in {expiry} ab.',
      securityNote:
        'Falls Sie diese Nachricht nicht erwartet haben, ignorieren Sie sie bitte. Ohne diese Bestätigung kann die Änderung nicht abgeschlossen werden.',
    },
    [AuthEmailKind.EMAIL_CHANGE_COMPLETED]: {
      subject: 'Die E-Mail-Adresse Ihres ClawAI-Kontos wurde geändert',
      preheader: 'Eine Bestätigung, dass die Adresse Ihres Kontos geändert wurde.',
      heading: 'Ihre E-Mail-Adresse wurde geändert',
      intro:
        'Die E-Mail-Adresse, mit der Sie sich bei Ihrem ClawAI-Konto anmelden, wurde geändert. Diese Nachricht geht an Ihre bisherige Adresse, damit Ihnen ein Nachweis darüber vorliegt.',
      bodyLines: [
        'Nachrichten zu Ihrem Konto werden ab sofort an die neue Adresse gesendet, und auch die Anmeldung erfolgt künftig darüber.',
      ],
      actionLabel: null,
      fallbackNote: null,
      expiryNote: null,
      securityNote:
        'Falls Sie diese Änderung nicht vorgenommen haben, wenden Sie sich umgehend an unser Support-Team — möglicherweise hat eine andere Person Zugriff auf Ihr Konto.',
    },
    [AuthEmailKind.THREAD_READY_FOR_REVIEW]: {
      subject: 'Der Entwurf Ihres Threads wartet auf Ihre Prüfung',
      preheader:
        'Lesen Sie ihn und genehmigen Sie ihn zur Veröffentlichung oder fordern Sie Änderungen an.',
      heading: 'Ihr Thread ist bereit zur Prüfung',
      intro:
        'Die Autoren, der Judge und der Critic haben Ihren Thread fertiggestellt. Er ist privat gespeichert, noch ist nichts öffentlich.',
      bodyLines: [
        'Öffnen Sie ihn, um den Entwurf und seine Quellen zu lesen. Veröffentlicht wird er erst, wenn Sie ihn genehmigen.',
      ],
      actionLabel: 'Meinen Thread prüfen',
      fallbackNote:
        'Falls die Schaltfläche nicht funktioniert, kopieren Sie die untenstehende Adresse in Ihren Browser:',
      expiryNote: null,
      securityNote:
        'Sie erhalten diese Nachricht, weil Sie auf ClawAI einen Thread gestartet haben. In Ihren Benachrichtigungseinstellungen können Sie diese E-Mails abschalten.',
    },
    [AuthEmailKind.THREAD_PUBLISHED]: {
      subject: 'Ihr Thread ist jetzt öffentlich',
      preheader: 'Leser können ihn jetzt öffnen.',
      heading: 'Ihr Thread ist veröffentlicht',
      intro: '„{value}“ ist jetzt auf ClawAI veröffentlicht. Jeder mit dem Link kann ihn lesen.',
      bodyLines: [
        'Sie können ihn teilen, sehen, wie viele Personen ihn gelesen haben, oder die Veröffentlichung jederzeit auf Ihrer Threads-Seite zurücknehmen.',
      ],
      actionLabel: 'Meinen Thread öffnen',
      fallbackNote:
        'Falls die Schaltfläche nicht funktioniert, kopieren Sie die untenstehende Adresse in Ihren Browser:',
      expiryNote: null,
      securityNote:
        'Sie erhalten diese Nachricht, weil Sie auf ClawAI einen Thread gestartet haben. In Ihren Benachrichtigungseinstellungen können Sie diese E-Mails abschalten.',
    },
    [AuthEmailKind.THREAD_FAILED]: {
      subject: 'Ihr Thread konnte nicht fertiggestellt werden',
      preheader: 'Der dafür reservierte Betrag wurde freigegeben. Sie können es erneut versuchen.',
      heading: 'Ihr Thread konnte nicht fertiggestellt werden',
      intro:
        'Beim Schreiben Ihres Threads ist etwas schiefgegangen, und er konnte nicht abgeschlossen werden.',
      bodyLines: [
        'Der dafür reservierte Betrag wurde freigegeben, und unser Team wurde informiert. Sie können ihn auf Ihrer Threads-Seite erneut starten.',
      ],
      actionLabel: 'Zu meinen Threads',
      fallbackNote:
        'Falls die Schaltfläche nicht funktioniert, kopieren Sie die untenstehende Adresse in Ihren Browser:',
      expiryNote: null,
      securityNote:
        'Sie erhalten diese Nachricht, weil Sie auf ClawAI einen Thread gestartet haben. In Ihren Benachrichtigungseinstellungen können Sie diese E-Mails abschalten.',
    },
  },
};
