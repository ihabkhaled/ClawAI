import { AuthEmailKind } from '../../enums/auth-email-kind.enum';
import type { AuthEmailDictionary } from '../types/auth-email-copy.type';

// Italian (formal "Lei") translation of EN_AUTH_EMAIL_DICTIONARY. Same keys, same
// order and the same placeholders as the English source of truth.
export const IT_AUTH_EMAIL_DICTIONARY: AuthEmailDictionary = {
  chrome: {
    greeting: 'Gentile {value},',
    greetingFallback: 'Gentile utente,',
    signOff: 'Cordiali saluti,',
    teamName: 'Il team di ClawAI',
    footerNote:
      'Questo è un messaggio automatico relativo al Suo account ClawAI. La preghiamo di non rispondere: le risposte inviate a questo indirizzo non vengono lette.',
    linkLabel: 'Apri questo link',
  },
  emails: {
    [AuthEmailKind.VERIFICATION]: {
      subject: 'Confermi il Suo indirizzo email per attivare il Suo account ClawAI',
      preheader: 'Manca un solo passaggio: confermi il Suo indirizzo e il Suo account sarà pronto.',
      heading: 'Confermi il Suo indirizzo email',
      intro:
        'Grazie per aver creato un account ClawAI. Per proteggere il Suo account dobbiamo verificare che questo indirizzo Le appartenga.',
      bodyLines: [
        'Il Suo account è stato creato ma non è ancora attivo. Finché questo indirizzo non sarà confermato non Le sarà possibile accedere.',
        'Selezioni il pulsante qui sotto per confermare il Suo indirizzo e completare la configurazione del Suo account.',
      ],
      actionLabel: 'Conferma il mio indirizzo email',
      fallbackNote: 'Se il pulsante non funziona, copi il seguente indirizzo nel Suo browser:',
      expiryNote: 'Per motivi di sicurezza, questo link di conferma scade tra {expiry}.',
      securityNote:
        'Se non ha creato un account ClawAI, può ignorare tranquillamente questo messaggio: nessun account verrà attivato senza questa conferma.',
    },
    [AuthEmailKind.PASSWORD_RESET]: {
      subject: 'Reimposti la Sua password ClawAI',
      preheader: 'Utilizzi il link sicuro qui accluso per scegliere una nuova password.',
      heading: 'Reimposti la Sua password',
      intro:
        "Abbiamo ricevuto una richiesta di reimpostazione della password dell'account ClawAI associato a questo indirizzo.",
      bodyLines: [
        'Selezioni il pulsante qui sotto per scegliere una nuova password. La Sua password attuale resterà valida fino a quel momento.',
        'Per la Sua sicurezza, dopo la modifica potrebbe esserLe richiesto di accedere nuovamente sugli altri Suoi dispositivi.',
      ],
      actionLabel: 'Scegli una nuova password',
      fallbackNote: 'Se il pulsante non funziona, copi il seguente indirizzo nel Suo browser:',
      expiryNote:
        'Per motivi di sicurezza, questo link di reimpostazione scade tra {expiry} e può essere utilizzato una sola volta.',
      securityNote:
        'Se non ha richiesto la reimpostazione della password, non deve fare nulla: la Sua password non è stata modificata. Se la situazione dovesse ripetersi, La preghiamo di contattare il nostro servizio di assistenza.',
    },
    [AuthEmailKind.TEMPORARY_PASSWORD]: {
      subject: 'È stata emessa una password temporanea per il Suo account ClawAI',
      preheader: 'Acceda con la password temporanea e ne imposti subito una nuova.',
      heading: 'La Sua password temporanea',
      intro:
        'Un amministratore ha emesso una password temporanea per il Suo account ClawAI. La Sua password precedente non è più valida.',
      bodyLines: [
        'La Sua password temporanea è: {value}',
        'Acceda con questa password e Le verrà chiesto di sceglierne subito una nuova. Non condivida questa password con nessuno.',
      ],
      actionLabel: 'Accedi a ClawAI',
      fallbackNote: 'Se il pulsante non funziona, copi il seguente indirizzo nel Suo browser:',
      expiryNote: 'La preghiamo di accedere e modificare questa password il prima possibile.',
      securityNote:
        'Se non si aspettava questo messaggio, contatti immediatamente il nostro servizio di assistenza: qualcuno con accesso da amministratore ha modificato le Sue credenziali di accesso.',
    },
    [AuthEmailKind.EMAIL_CHANGE_OTP]: {
      subject: 'Il Suo codice di verifica per la modifica del Suo indirizzo email ClawAI',
      preheader: 'Inserisca questo codice per confermare il cambio di indirizzo sul Suo account.',
      heading: 'Confermi questo cambio di indirizzo',
      intro:
        "È stata effettuata una richiesta di modifica dell'indirizzo email del Suo account ClawAI in {value}. Per procedere, la confermi dal Suo indirizzo attuale.",
      bodyLines: [
        'Inserisca questo codice di verifica nella finestra del browser in cui ha avviato la modifica.',
      ],
      actionLabel: null,
      fallbackNote: null,
      expiryNote:
        'Questo codice scade tra {expiry}. Non lo condivida mai con nessuno, nemmeno con il nostro personale.',
      securityNote:
        'Se non ha richiesto questa modifica, non inserisca il codice. Cambi immediatamente la Sua password e contatti il nostro servizio di assistenza: qualcuno potrebbe avere accesso al Suo account.',
    },
    [AuthEmailKind.EMAIL_CHANGE_CONFIRM]: {
      subject: 'Confermi il Suo nuovo indirizzo email ClawAI',
      preheader: 'Confermi questo indirizzo per completare il trasferimento del Suo account.',
      heading: 'Confermi il Suo nuovo indirizzo',
      intro:
        "Questo indirizzo è stato indicato come nuovo indirizzo email di un account ClawAI. Un'ultima conferma completerà la modifica.",
      bodyLines: [
        "Una volta confermato, questo indirizzo diventerà quello con cui effettuerà l'accesso e quello a cui invieremo i messaggi relativi al Suo account.",
      ],
      actionLabel: 'Conferma questo indirizzo',
      fallbackNote: 'Se il pulsante non funziona, copi il seguente indirizzo nel Suo browser:',
      expiryNote: 'Per motivi di sicurezza, questo link di conferma scade tra {expiry}.',
      securityNote:
        'Se non si aspettava questo messaggio, lo ignori. La modifica non può essere completata senza questa conferma.',
    },
    [AuthEmailKind.EMAIL_CHANGE_COMPLETED]: {
      subject: "L'indirizzo email del Suo account ClawAI è stato modificato",
      preheader: "Una conferma dell'avvenuta modifica dell'indirizzo del Suo account.",
      heading: 'Il Suo indirizzo email è stato modificato',
      intro:
        "L'indirizzo email utilizzato per accedere al Suo account ClawAI è stato modificato. Inviamo questo messaggio al Suo indirizzo precedente affinché ne conservi traccia.",
      bodyLines: [
        "I messaggi relativi al Suo account verranno ora inviati al nuovo indirizzo, che da questo momento sarà utilizzato anche per l'accesso.",
      ],
      actionLabel: null,
      fallbackNote: null,
      expiryNote: null,
      securityNote:
        'Se non ha effettuato Lei questa modifica, contatti immediatamente il nostro servizio di assistenza: qualcun altro potrebbe avere accesso al Suo account.',
    },
  },
};
