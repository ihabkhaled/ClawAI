import { PUBLIC_CONTACT_EMAIL } from '@/constants/public-contact.constants';
import { PublicLaunchPageSlug } from '@/enums/public-launch-page-slug.enum';
import type { PublicCommercePolicyLocaleContent } from '@/types/public-launch-content.types';

export const DE_PUBLIC_COMMERCE_POLICY_CONTENT: PublicCommercePolicyLocaleContent = {
  pages: {
    [PublicLaunchPageSlug.DELIVERY_SHIPPING]: {
      eyebrow: 'Liefer- und Versandrichtlinie',
      sections: [
        {
          id: 'digital-service',
          title: 'ClawAI ist ein digitaler Dienst',
          body: 'ClawAI ist ein Online-Softwaredienst, der im Webbrowser und in unterstützten Apps genutzt wird. Es gibt kein physisches Produkt: Nichts wird verpackt, per Post geschickt oder versendet, und es wird keine Lieferadresse erfasst. Alles, was ein Tarif enthält, wird über das Internet an das Konto geliefert, das ihn gekauft hat.',
        },
        {
          id: 'instant-access',
          title: 'Der Zugang ist online und sofort verfügbar',
          body: 'Ein kostenloses Konto ist bereit, sobald die Registrierung abgeschlossen ist. Wird ein kostenpflichtiger Tarif gekauft, wird er dem Konto zugewiesen, sobald die Zahlung bestätigt ist, in der Regel sofort, und Sie können sich anmelden und ihn direkt nutzen. Über diese sofortige Kontoaktivierung hinaus gibt es weder Wartezeit noch Lieferzeitplan.',
        },
        {
          id: 'no-fees',
          title: 'Keine Versand- oder Liefergebühren',
          body: 'Da nichts Physisches verschickt wird, berechnet ClawAI niemals Versand-, Bearbeitungs-, Zoll- oder Liefergebühren. Der Preis eines Tarifs ist der beim Bezahlen angezeigte Betrag. Dateien, die Sie im Produkt erstellen, etwa Dokumente oder Bilder, laden Sie aus Ihrem Konto herunter; sie werden Ihnen nicht zugeschickt.',
        },
        {
          id: 'access-problems',
          title: 'Wenn Sie nicht auf das Bezahlte zugreifen können',
          body: `Wenn eine Zahlung erfolgreich war, der Tarif aber nicht in Ihrem Konto erscheint oder Sie sich nicht anmelden können, schreiben Sie an ${PUBLIC_CONTACT_EMAIL} und nennen Sie die E-Mail-Adresse des Kontos sowie, falls vorhanden, die Zahlungsreferenz. Wir prüfen Zahlung und Konto und stellen den Zugang zu dem her, was Sie bezahlt haben.`,
        },
      ],
      evidence:
        'ClawAI wird online von Kairo, Ägypten, aus betrieben. Die Lieferung eines Abonnements bedeutet die Aktivierung des Kontos, für das es gekauft wurde, und der gehostete Checkout zeigt den aktiven Preis vor der Zahlung.',
    },
    [PublicLaunchPageSlug.REFUND_CANCELLATION]: {
      eyebrow: 'Erstattungs- und Kündigungsrichtlinie',
      sections: [
        {
          id: 'cancel',
          title: 'Jederzeit im Konto kündigen',
          body: 'Sie können ein kostenpflichtiges Abonnement jederzeit in den Abrechnungseinstellungen Ihres Kontos kündigen. Die Kündigung beendet die Verlängerung des Abonnements, sodass Ihnen der nächste Abrechnungszeitraum nicht berechnet wird. Sie müssen dafür niemandem schreiben und keinen Grund angeben.',
        },
        {
          id: 'access-after-cancel',
          title: 'Der Zugang bleibt bis zum Ende des bezahlten Zeitraums',
          body: 'Nach der Kündigung bleibt der Tarif bis zum Ende des bereits bezahlten Zeitraums aktiv, ob das ein Monat oder eine längere Laufzeit ist. Ihre kostenpflichtigen Funktionen bleiben bis zu diesem Datum verfügbar, danach endet das Abonnement, statt sich zu verlängern und erneut abzurechnen.',
        },
        {
          id: 'refunds',
          title: 'Wann eine Erstattung erfolgt',
          body: 'Der laufende bezahlte Zeitraum und jeder bereits genutzte Zeitraum werden nicht erstattet, weil der Zugang zum Dienst bereits bereitgestellt wurde. Erstattungen gibt es nur bei einem Abrechnungsfehler unsererseits, etwa einer doppelten oder falschen Belastung, oder wenn das für Sie geltende Recht es verlangt. Wird eine Zahlung vollständig erstattet, endet der damit gekaufte bezahlte Zugang.',
        },
        {
          id: 'trial-and-requests',
          title: 'Kostenlose Testphase und Erstattungsanfragen',
          body: `Die 90-tägige kostenlose Testphase erfordert keine Zahlungskarte, daher wird nichts belastet und es gibt nichts zu erstatten, während Sie ClawAI ausprobieren. Um einen Abrechnungsfehler zu melden oder eine Erstattung anzufragen, schreiben Sie an ${PUBLIC_CONTACT_EMAIL} mit der E-Mail-Adresse des Kontos, Datum und Betrag der Belastung und, falls vorhanden, der Zahlungsreferenz.`,
        },
      ],
      evidence:
        'Diese Richtlinie ergänzt die Nutzungsbedingungen, nach denen sich die Zahlungsbedingungen nach den Angaben im Checkout und dem geltenden Recht richten. Der aktive Preis und das Abrechnungsintervall werden im gehosteten Checkout vor der Zahlung angezeigt.',
    },
  },
  labels: {
    onThisPage: 'Auf dieser Seite',
    evidence: 'Nachprüfbarer Hinweis',
    lastReviewed: 'Zuletzt geprüft',
    effectiveDate: 'Gültig ab',
    startFree: 'Kostenloses Konto erstellen',
    contactTeam: 'Team kontaktieren',
    companyDetailsTitle: 'Unternehmensangaben',
    emailLabel: 'E-Mail',
    phoneLabel: 'Telefon',
    addressLabel: 'Adresse',
    addressNote:
      'ClawAI ist ein Online-Dienst. Es gibt kein Büro für Besucher, bitte kontaktieren Sie uns per E-Mail.',
  },
  seo: {
    [PublicLaunchPageSlug.DELIVERY_SHIPPING]: {
      title: 'Liefer- und Versandrichtlinie',
      description:
        'ClawAI ist ein digitaler Dienst: Der Zugang erfolgt online und beginnt, sobald Registrierung oder Zahlung bestätigt sind. Nichts wird versendet, es fallen keine Liefergebühren an.',
      keywords: ['Lieferrichtlinie', 'Versandrichtlinie', 'Zugang zu einem digitalen Dienst'],
    },
    [PublicLaunchPageSlug.REFUND_CANCELLATION]: {
      title: 'Erstattungs- und Kündigungsrichtlinie',
      description:
        'Kündigen Sie ein ClawAI-Abo jederzeit in den Abrechnungseinstellungen. Der Zugang läuft bis zum Ende des bezahlten Zeitraums; Erstattung bei Abrechnungsfehlern oder gesetzlicher Pflicht.',
      keywords: ['Erstattungsrichtlinie', 'Kündigungsrichtlinie', 'Abo kündigen'],
    },
  },
};
