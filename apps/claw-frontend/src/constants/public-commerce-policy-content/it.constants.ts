import { PUBLIC_CONTACT_EMAIL } from '@/constants/public-contact.constants';
import { PublicLaunchPageSlug } from '@/enums/public-launch-page-slug.enum';
import type { PublicCommercePolicyLocaleContent } from '@/types/public-launch-content.types';

export const IT_PUBLIC_COMMERCE_POLICY_CONTENT: PublicCommercePolicyLocaleContent = {
  pages: {
    [PublicLaunchPageSlug.DELIVERY_SHIPPING]: {
      eyebrow: 'Politica di consegna e spedizione',
      sections: [
        {
          id: 'digital-service',
          title: 'ClawAI è un servizio digitale',
          body: 'ClawAI è un servizio software online che si usa in un browser web e nelle app supportate. Non esiste un prodotto fisico: nulla viene imballato, spedito o inviato per posta e non viene richiesto alcun indirizzo di spedizione. Tutto ciò che un piano include viene fornito via internet all’account che lo ha acquistato.',
        },
        {
          id: 'instant-access',
          title: 'Accesso online e immediato',
          body: 'Un account gratuito è pronto non appena la registrazione è completata. Quando acquisti un piano a pagamento, questo viene applicato all’account appena il pagamento è confermato, di norma subito, e puoi accedere e usarlo immediatamente. Non c’è alcun periodo di attesa né un calendario di consegna oltre a questa attivazione istantanea dell’account.',
        },
        {
          id: 'no-fees',
          title: 'Nessun costo di spedizione o consegna',
          body: 'Poiché non viene inviato nulla di fisico, ClawAI non aggiunge mai costi di spedizione, gestione, dogana o consegna. Il prezzo di un piano è l’importo mostrato al pagamento. I file che crei nel prodotto, come documenti o immagini, si scaricano dal tuo account e non ti vengono spediti.',
        },
        {
          id: 'access-problems',
          title: 'Se non riesci ad accedere a ciò che hai pagato',
          body: `Se un pagamento è andato a buon fine ma il piano non compare nel tuo account, oppure non riesci ad accedere, scrivi a ${PUBLIC_CONTACT_EMAIL} indicando l’indirizzo email dell’account e, se lo hai, il riferimento del pagamento. Verificheremo il pagamento e l’account e risolveremo l’accesso a ciò che hai pagato.`,
        },
      ],
      evidence:
        'ClawAI è gestito online dal Cairo, in Egitto. La consegna di un abbonamento corrisponde all’attivazione dell’account per cui è stato acquistato, e il checkout ospitato mostra il prezzo attivo prima del pagamento.',
    },
    [PublicLaunchPageSlug.REFUND_CANCELLATION]: {
      eyebrow: 'Politica di rimborso e disdetta',
      sections: [
        {
          id: 'cancel',
          title: 'Disdici quando vuoi dal tuo account',
          body: 'Puoi disdire un abbonamento a pagamento in qualsiasi momento dalle impostazioni di fatturazione del tuo account. La disdetta interrompe il rinnovo dell’abbonamento, quindi il periodo di fatturazione successivo non ti viene addebitato. Non devi scrivere a nessuno né indicare un motivo per disdire.',
        },
        {
          id: 'access-after-cancel',
          title: 'L’accesso continua fino alla fine del periodo pagato',
          body: 'Dopo la disdetta, il piano resta attivo fino alla fine del periodo che hai già pagato, che si tratti di un mese o di una durata più lunga. Le funzioni a pagamento restano disponibili fino a quella data, poi l’abbonamento termina invece di rinnovarsi e addebitarti di nuovo.',
        },
        {
          id: 'refunds',
          title: 'Quando viene concesso un rimborso',
          body: 'Il periodo pagato in corso, e qualsiasi periodo già utilizzato, non viene rimborsato, perché l’accesso al servizio è già stato fornito. I rimborsi vengono concessi solo in caso di un nostro errore di fatturazione, come un addebito doppio o errato, oppure quando la legge che ti si applica lo richiede. Quando un pagamento viene rimborsato per intero, l’accesso a pagamento che aveva acquistato termina.',
        },
        {
          id: 'trial-and-requests',
          title: 'Prova gratuita e come chiedere un rimborso',
          body: `La prova gratuita di 90 giorni non richiede una carta di pagamento, quindi non viene addebitato nulla e non c’è nulla da rimborsare mentre provi ClawAI. Per segnalare un errore di fatturazione o chiedere un rimborso, scrivi a ${PUBLIC_CONTACT_EMAIL} indicando l’email dell’account, la data e l’importo dell’addebito e il riferimento del pagamento, se lo hai.`,
        },
      ],
      evidence:
        'Questa politica si affianca ai Termini di utilizzo, secondo cui le condizioni di pagamento seguono quanto indicato al checkout e la legge applicabile. Il prezzo attivo e l’intervallo di fatturazione sono mostrati nel checkout ospitato prima del pagamento.',
    },
  },
  labels: {
    onThisPage: 'In questa pagina',
    evidence: 'Nota verificabile',
    lastReviewed: 'Ultima revisione',
    effectiveDate: 'Data di entrata in vigore',
    startFree: 'Crea un account gratuito',
    contactTeam: 'Contatta il team',
    companyDetailsTitle: 'Dati aziendali',
    emailLabel: 'Email',
    phoneLabel: 'Telefono',
    addressLabel: 'Indirizzo',
    addressNote:
      'ClawAI è un servizio online. Non c’è un ufficio aperto al pubblico, quindi ti chiediamo di contattarci via email.',
  },
  seo: {
    [PublicLaunchPageSlug.DELIVERY_SHIPPING]: {
      title: 'Politica di consegna e spedizione',
      description:
        'ClawAI è un servizio digitale: l’accesso è online e inizia appena la registrazione o il pagamento sono confermati. Nulla viene spedito e non ci sono costi di consegna.',
      keywords: [
        'politica di consegna',
        'politica di spedizione',
        'accesso a un servizio digitale',
      ],
    },
    [PublicLaunchPageSlug.REFUND_CANCELLATION]: {
      title: 'Politica di rimborso e disdetta',
      description:
        'Disdici un abbonamento ClawAI in qualsiasi momento dalla fatturazione. L’accesso resta fino a fine periodo pagato; rimborsi solo per errori di addebito o dove la legge lo impone.',
      keywords: ['politica di rimborso', 'politica di disdetta', 'disdire l’abbonamento'],
    },
  },
};
