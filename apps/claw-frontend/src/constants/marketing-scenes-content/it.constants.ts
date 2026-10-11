import { MarketingSceneId } from '@/enums/marketing-scene-id.enum';
import type { MarketingScenesLocaleContent } from '@/types/marketing-scenes.types';

export const IT_MARKETING_SCENES_CONTENT: MarketingScenesLocaleContent = {
  heading: 'Guardalo nell’app',
  scenes: {
    [MarketingSceneId.CHAT_CONVERSATION]: {
      alt: 'Una chat di ClawAI con una domanda, la risposta scritta, un badge che indica il modello che ha risposto e i dettagli di instradamento sotto la risposta.',
      caption: 'Ogni risposta mostra quale modello l’ha scritta e perché.',
    },
    [MarketingSceneId.CHAT_MODEL_PICKER]: {
      alt: 'La casella di messaggio di ClawAI con il selettore del modello aperto, che elenca i modelli tra cui scegliere.',
      caption: 'Scegli tu il modello, oppure lascia scegliere ad AUTO.',
    },
    [MarketingSceneId.CHAT_RESEARCH]: {
      alt: 'La casella di messaggio con la ricerca web attiva e il selettore del provider di ricerca visibile.',
      caption: 'Attiva la ricerca web e scegli come cercare.',
    },
    [MarketingSceneId.CHAT_CONTEXT_MENU]: {
      alt: 'La casella di messaggio con il menu Contesto aperto, che offre la tua memoria e i tuoi pacchetti di contesto.',
      caption: 'Porta la tua memoria e i pacchetti di contesto in qualsiasi chat.',
    },
    [MarketingSceneId.CHAT_SHARE_DIALOG]: {
      alt: 'La finestra «Condividi questa chat» aperta su una conversazione, con le opzioni di condivisione.',
      caption: 'Condividi una chat con un link, alle tue condizioni.',
    },
    [MarketingSceneId.COMPARE_SETUP]: {
      alt: 'La pagina Confronta con tre modelli selezionati e un prompt scritto, pronto per essere inviato.',
      caption: 'Fai una domanda e guarda tre modelli rispondere fianco a fianco.',
    },
    [MarketingSceneId.LABS_CONSENSUS]: {
      alt: 'La pagina Consenso, dove più modelli rispondono alla stessa domanda e puntano a un risultato condiviso.',
      caption: 'Lascia rispondere più modelli, poi ottieni una risposta condivisa.',
    },
    [MarketingSceneId.FILES]: {
      alt: 'La pagina File con i file che hai caricato e quelli che ClawAI ha creato per te.',
      caption: 'I tuoi caricamenti e i file generati, in un unico posto.',
    },
    [MarketingSceneId.MEMORY]: {
      alt: 'La pagina Memoria, che mostra ciò che ClawAI ricorda di te e che puoi rivedere e modificare.',
      caption: 'Vedi e controlla ciò che ClawAI ricorda.',
    },
    [MarketingSceneId.CONTEXT_PACKS]: {
      alt: 'La pagina Contesto con pacchetti di contesto riutilizzabili che puoi allegare alle chat.',
      caption: 'Pacchetti di contesto riutilizzabili per il lavoro che ripeti.',
    },
    [MarketingSceneId.CONNECTORS]: {
      alt: 'La pagina Connettori con i servizi che puoi collegare al tuo spazio di lavoro.',
      caption: 'Collega i tuoi strumenti perché l’IA possa lavorarci.',
    },
    [MarketingSceneId.BILLING_PLANS]: {
      alt: 'La pagina Fatturazione con i piani disponibili e quello attuale.',
      caption: 'Piani chiari, e vedi sempre quale stai usando.',
    },
    [MarketingSceneId.PLAN_OVERVIEW]: {
      alt: 'La pagina Piano, che mostra cosa include il tuo piano e quanto ne hai usato.',
      caption: 'Vedi esattamente cosa include il tuo piano.',
    },
    [MarketingSceneId.USAGE]: {
      alt: 'La pagina Utilizzo con grafici di quanti token hai usato nel tempo.',
      caption: 'Segui il tuo utilizzo in tempo reale.',
    },
    [MarketingSceneId.SETTINGS]: {
      alt: 'La pagina Impostazioni scorsa fino alla scheda delle notifiche, con i suoi interruttori.',
      caption: 'Scegli quali notifiche ricevere.',
    },
    [MarketingSceneId.THREADS_LIST]: {
      alt: 'La pagina Threads con l’elenco dei tuoi Thread e lo stato di ciascuno.',
      caption: 'Tutti i tuoi Thread e a che punto è ciascuno.',
    },
    [MarketingSceneId.THREAD_REVIEW]: {
      alt: 'La bozza di un Thread aperta nella pagina di revisione, prima della pubblicazione.',
      caption: 'Rivedi una bozza prima che qualcosa diventi pubblico.',
    },
    [MarketingSceneId.NOTIFICATIONS_PANEL]: {
      alt: 'Il pannello delle notifiche aperto dalla campanella, con alcune notifiche recenti.',
      caption: 'Scopri subito quando qualcosa è pronto.',
    },
    [MarketingSceneId.TOUR_CARD]: {
      alt: 'Una breve scheda del tour del prodotto aperta sulla pagina della chat, che indica una funzione.',
      caption: 'Un breve tour ti mostra l’app.',
    },
    [MarketingSceneId.DASHBOARD]: {
      alt: 'La dashboard di ClawAI con una panoramica della tua attività e del tuo utilizzo recenti.',
      caption: 'Il tuo spazio di lavoro a colpo d’occhio.',
    },
    [MarketingSceneId.OBSERVABILITY_CONSUMPTION]: {
      alt: 'La vista Osservabilità per amministratori, scheda Consumo, con grafici di quanto sono stati usati i modelli.',
      caption: 'Gli amministratori vedono il consumo nei grafici.',
    },
    [MarketingSceneId.MOBILE_CHAT]: {
      alt: 'Una conversazione in chat di ClawAI sullo schermo di un telefono.',
      caption: 'La stessa chat, sul tuo telefono.',
    },
    [MarketingSceneId.MOBILE_DASHBOARD]: {
      alt: 'La dashboard di ClawAI sullo schermo di un telefono.',
      caption: 'La tua dashboard sta anche su uno schermo piccolo.',
    },
  },
};
