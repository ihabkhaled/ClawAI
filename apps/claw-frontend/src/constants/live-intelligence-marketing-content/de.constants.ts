import type { LiveIntelligenceMarketingDictionary } from '@/types/live-intelligence-marketing-content.types';

/** German copy for the public Live Intelligence page. Same claims as the English source. */
export const DE_LIVE_INTELLIGENCE_MARKETING_CONTENT: LiveIntelligenceMarketingDictionary = {
  eyebrow: 'Neu in ClawAI',
  title: 'Live Intelligence: Untertitel, Zusammenfassungen und Highlights für einen Livestream',
  intro:
    'Füge den Link zu einem Livestream ein und sieh ihn dir in ClawAI an. Während er läuft, macht ClawAI aus der Sprache Untertitel in der Sprache deiner Wahl, hält kurze Zusammenfassungskarten aktuell, wenn das Thema wechselt, und markiert wichtige Momente auf einer Zeitleiste. Schließt du das Fenster, bleibt das Gesehene in deinem Verlauf, bereit zum Verfeinern und Exportieren.',
  openCta: 'Live Intelligence öffnen',
  pricingCta: 'Tarife und Preise ansehen',
  howItWorksCta: 'So funktioniert es',
  whatTitle: 'Was Live Intelligence ist',
  whatParagraphs: [
    'Einem Livestream zu folgen ist schwer, wenn er lang, schnell oder in einer Sprache ist, die du nicht sprichst. Live Intelligence sitzt neben dem Video und macht die Notizen: Untertitel in deiner Sprache, eine laufende Zusammenfassung und eine Liste der Highlights, damit du auch mal wegsehen kannst.',
    'Alles läuft in einem Fenster innerhalb von ClawAI, Stream und Analyse sind auf einem Bildschirm. Vor dem Start wählst du die Untertitelsprache und einen Analysemodus. Pausieren, Fortsetzen und Spulen funktionieren dort, wo der Stream es erlaubt. Bei einer Pause friert der Feed ein und die Abrechnung stoppt.',
    'Viele Personen können denselben Stream sehen, ohne dass dieselbe Arbeit mehrfach bezahlt wird. ClawAI verarbeitet einen Stream einmal und teilt die Analyse mit allen Zuschauern. Die Analyse, die du tatsächlich gesehen hast, wird in deinem Verlauf gespeichert, bis du sie löschst.',
  ],
  stepsTitle: 'So funktioniert es, in fünf Schritten',
  stepsIntro:
    'Vom eingefügten Link zur exportierten Zusammenfassung. Jeder Schritt ist etwas, das du tust, oder etwas, das ClawAI für dich übernimmt.',
  steps: [
    {
      title: 'Link einfügen',
      body: 'Öffne Live Intelligence und füge die Adresse eines Livestreams ein. ClawAI prüft, ob die Quelle unterstützt wird, bevor etwas analysiert oder berechnet wird, und sagt dir klar, wenn nicht.',
    },
    {
      title: 'Sprache und Modus wählen',
      body: 'Wähle die Sprache für Untertitel und Zusammenfassungen und einen von drei Modi: Audio, Audio + Vision oder Smart Auto. Vor dem Start bestätigst du, dass du die Rechte zur Analyse des Streams hast.',
    },
    {
      title: 'Ansehen mit Untertiteln, Karten und Highlights',
      body: 'Untertitel erscheinen einige Sekunden nach der Sprache, etwa 7 bis 12 Sekunden später. Zusammenfassungskarten ändern sich mit den Themen, erkannte Highlights liegen auf einer anklickbaren Zeitleiste.',
    },
    {
      title: 'Pausieren, fortsetzen, spulen',
      body: 'Pausiere, um den Feed einzufrieren und den Zähler anzuhalten. Setze dort fort, wo du aufgehört hast, oder springe zum Live-Punkt, mit klar angezeigter Lücke. Spulen funktioniert, wo der Stream es zulässt.',
    },
    {
      title: 'Schließen, zurückkehren, verfeinern, exportieren',
      body: 'Beim Schließen bleibt das Gesehene im Verlauf. Später kannst du jede Karte mit einem Modell deiner Wahl verfeinern und den Verlauf als PDF, Markdown oder TXT exportieren.',
    },
  ],
  featuresTitle: 'Was du bekommst',
  features: [
    {
      title: 'Live-Untertitel in deiner Sprache',
      body: 'Sprache wird transkribiert und in die gewählte Sprache übersetzt. Untertitel kommen einige Sekunden nach dem Sprecher: nicht sofort, und die Oberfläche sagt das auch.',
    },
    {
      title: 'Zusammenfassungskarten, die Schritt halten',
      body: 'Kurze Karten fassen den Stream zusammen und werden bei Themenwechsel aktualisiert, die neueste Karte zeigt, wo der Stream gerade steht.',
    },
    {
      title: 'Automatische Highlights auf einer Zeitleiste',
      body: 'Sehenswerte Momente werden erkannt und auf einer Zeitleiste markiert. Ein Klick springt dorthin, wo der Stream Spulen erlaubt.',
    },
    {
      title: 'Pausieren, fortsetzen, spulen',
      body: 'Steuere die Wiedergabe wie eine Aufnahme, wo die Quelle es unterstützt. Während der Pause ist der Feed eingefroren und nichts wird berechnet.',
    },
    {
      title: 'Ein Verlauf unter deiner Kontrolle',
      body: 'Die gesehene Analyse bleibt in einem seitenweise durchblätterbaren Verlauf, bis du sie löschst. Löschen entfernt sie.',
    },
    {
      title: 'Karten mit einem Modell deiner Wahl verfeinern',
      body: 'Wähle ein verfügbares Modell, um eine Karte umzuformulieren oder zu vertiefen. Die Verfeinerung wird zu den tatsächlichen Kosten des gewählten Modells berechnet.',
    },
    {
      title: 'Export als PDF, Markdown oder TXT',
      body: 'Nimm deinen Verlauf in dem Format aus ClawAI mit, das für den nächsten Schritt passt.',
    },
    {
      title: 'Geteilte Verarbeitung',
      body: 'Viele Zuschauer, eine Analyse. Derselbe Stream wird einmal verarbeitet und geteilt, sodass Aufwand und Kosten nicht mit dem Publikum wachsen.',
    },
  ],
  modesTitle: 'Drei Analysemodi',
  modesIntro:
    'Der Modus bestimmt, worauf ClawAI achtet. Du wählst ihn vor dem Start, und die Kosten folgen dieser Wahl.',
  modes: [
    {
      title: 'Audio',
      body: 'Untertitel, Zusammenfassungen und Highlights aus dem Gesprochenen. Der einfachste Modus, passend für Vorträge, Briefings, Vorlesungen und Interviews.',
    },
    {
      title: 'Audio + Vision',
      body: 'Ergänzt, was auf dem Bildschirm gezeigt wird, etwa Folien, Diagramme oder eine Demo. ClawAI entnimmt dem Stream Einzelbilder und behält jene, die sich verändert haben. Vision wird zu den tatsächlichen Kosten des verwendeten Modells berechnet.',
    },
    {
      title: 'Smart Auto',
      body: 'Beginnt mit Audio und schaltet Vision nur dazu, wenn der Stream still wird oder sich das Bild ändert, sodass du Vision dann bezahlst, wenn sie wahrscheinlich zählt.',
    },
  ],
  sourcesTitle: 'Was analysiert werden kann und was nicht',
  sourcesIntro:
    'Wir nennen dir die Grenzen lieber jetzt, als dass du sie mitten im Stream entdeckst.',
  sources: [
    {
      title: 'KI-Analyse funktioniert bei HLS-Livestreams',
      body: 'Live Intelligence analysiert HLS-Livestreams, deren Analyse dir erlaubt ist. Beim Start bestätigst du das.',
    },
    {
      title: 'YouTube-Links werden abgespielt, aber nicht analysiert',
      body: 'Du kannst einen YouTube-Link einfügen und ihn in ClawAI ansehen, aber es gibt keine KI-Analyse für YouTube-Streams. Die Nutzungsbedingungen von YouTube erlauben das Erfassen von Audio oder Untertiteln nicht, deshalb tut ClawAI es nicht, und das Fenster sagt es.',
    },
    {
      title: 'Untertitel hinken einige Sekunden hinterher',
      body: 'Sprache wird in kurzen Abschnitten transkribiert, daher erscheinen Untertitel etwa 7 bis 12 Sekunden später. Das ist keine Echtzeit-Untertitelung.',
    },
    {
      title: 'Ehrliche Zustände, nie ein falscher Erfolg',
      body: 'Das Fenster zeigt an, wenn es verbindet, verzögert ist, sich erholt, keine Freiminuten mehr hat, auf deine Zustimmung wartet, ausgelastet ist oder der Stream beendet wurde.',
    },
  ],
  plansTitle: 'Freiminuten und Preise',
  plansIntro:
    'Jeder Tarif enthält jeden Monat kostenlose Analyseminuten. Das sind die Standardwerte, sie können angepasst werden.',
  planMinutesUnit: 'Freiminuten pro Monat',
  planProAndAbove: 'Pro und höher',
  plansBody:
    'Nach den Freiminuten kostet die Analyse {price} pro Minute, und nur nach deiner Bestätigung. Du kannst eine Ausgabengrenze setzen. Ist dein Guthaben aufgebraucht, bekommst du eine einmalige Kulanzfrist von 60 Sekunden. Vision wird zu den tatsächlichen Kosten des verwendeten Modells berechnet, und eine Pause stoppt den Zähler.',
  faqTitle: 'Häufige Fragen',
  faq: [
    {
      question: 'Funktioniert Live Intelligence mit YouTube-Livestreams?',
      answer:
        'Du kannst einen YouTube-Link in ClawAI ansehen, aber es gibt dafür keine KI-Analyse. Die Bedingungen von YouTube erlauben das Erfassen von Audio oder Untertiteln nicht, daher gibt es für YouTube-Streams keine Untertitel, Zusammenfassungen oder Highlights.',
    },
    {
      question: 'Welche Streams können analysiert werden?',
      answer:
        'HLS-Livestreams, zu deren Analyse du berechtigt bist. Das bestätigst du beim Start. Ein Stream, den der Dienst nicht lesen kann, wird als nicht unterstützt gemeldet, statt stillschweigend zu scheitern.',
    },
    {
      question: 'Sind die Untertitel in Echtzeit?',
      answer:
        'Nein. Sie erscheinen etwa 7 bis 12 Sekunden nach der Sprache, weil Audio in kurzen Abschnitten transkribiert wird. Zusammenfassungen und Highlights folgen den Untertiteln.',
    },
    {
      question: 'Was kostet es?',
      answer:
        'Jeder Tarif enthält jeden Monat Freiminuten: 30 bei Free, 120 bei Starter, 300 bei Plus und 600 bei Pro und höher. Danach 0,02 $ pro Minute, nur nach deiner Bestätigung und mit optionaler Ausgabengrenze. Vision wird zu den tatsächlichen Modellkosten berechnet.',
    },
    {
      question: 'Was passiert, wenn mein Guthaben mitten im Stream aufgebraucht ist?',
      answer:
        'Du bekommst eine einmalige Kulanzfrist von 60 Sekunden, danach stoppt die Analyse, bis du Guthaben hinzufügst.',
    },
    {
      question: 'Kostet eine Pause etwas?',
      answer:
        'Nein. Bei einer Pause friert der Feed ein und die Abrechnung stoppt. Setze dort fort, wo du warst, oder springe zum Live-Punkt.',
    },
    {
      question: 'Was passiert mit meinem Verlauf?',
      answer:
        'Die Analyse, die du tatsächlich gesehen hast, bleibt bis zum Löschen erhalten. Du kannst sie durchblättern, eine Karte mit einem Modell deiner Wahl verfeinern und als PDF, Markdown oder TXT exportieren.',
    },
    {
      question: 'Kann ich dem Stream Fragen stellen?',
      answer:
        'Nicht in dieser ersten Version. Live Intelligence liefert Untertitel, Zusammenfassungskarten und Highlights; Fragen zu einem Stream sind noch nicht enthalten.',
    },
  ],
  closingTitle: 'Verfolge den nächsten Livestream, ohne jede Minute zu sehen',
  closingBody:
    'Füge einen HLS-Link ein, dessen Analyse dir erlaubt ist, wähle deine Sprache und starte. Deine Freiminuten warten.',
};
