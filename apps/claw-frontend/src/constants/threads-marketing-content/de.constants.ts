import type { ThreadsMarketingDictionary } from '@/types/threads-marketing-content.types';

export const DE_THREADS_MARKETING_CONTENT: ThreadsMarketingDictionary = {
  eyebrow: 'Neu in ClawAI',
  title: 'ClawAI Threads: aus einem Chat wird ein recherchierter, belegter, öffentlicher Artikel',
  intro:
    'Ein gutes Gespräch mit einer KI endet oft mit etwas, das sich zu teilen lohnt. Threads nimmt den Chat, den du schon geführt hast, recherchiert das Thema im Live-Web, lässt mehrere verschiedene Modelle unabhängig schreiben, bringt sie auf einen gemeinsamen Entwurf, lässt einen Bewerter und einen Kritiker prüfen und gibt dir das Ergebnis zurück. Du liest jedes Wort und gibst es frei. Erst dann wird daraus eine öffentliche Seite mit echten Quellen.',
  announcementBadge: 'Ankündigung',
  announcementTitle: 'Threads ist da, und für jeden Tarif offen',
  announcementBody:
    'Free, Starter, Plus und alle höheren Tarife können Threads erstellen, ebenso Administratoren. Starte in jedem Chat mit „In öffentlichen Thread umwandeln“ oder auf der Threads-Seite. Veröffentlichen bleibt immer deine Entscheidung: Nichts verlässt dein Konto, bevor du den fertigen Entwurf freigibst.',
  createCta: 'Thread erstellen',
  discoverCta: 'Veröffentlichte Threads lesen',
  howItWorksCta: 'Die sechs Schritte ansehen',
  whatTitle: 'Was ein Thread ist',
  whatParagraphs: [
    'Ein Thread ist ein öffentlicher Artikel, der aus einem deiner Chats entsteht. Er ist keine Kopie des Gesprächs und zeigt den Chat nie selbst. Er ist ein neuer Text zum Thema, gestützt auf Quellen, die ClawAI dafür nachgeschlagen hat, und von mehreren Modellen statt von einem geschrieben.',
    'Mehrere Modelle sind wichtig. Jeder Autor schreibt seinen eigenen Entwurf, ohne die anderen zu sehen. Danach müssen sich die Autoren auf einen Entwurf einigen, Wort für Wort. Ein Bewertermodell beurteilt das Ergebnis nach klaren Kriterien, ein Kritikmodell hält fest, was noch schwach ist. Sagt eines von beiden Nein, geht der Entwurf in die nächste Runde, höchstens dreimal.',
    'Du behältst die ganze Zeit die Kontrolle. Du wählst die Modelle, setzt ein Ausgabenlimit, kannst während des Laufs abbrechen und siehst den fertigen Entwurf samt Quellen, bevor etwas öffentlich wird. Nach der Veröffentlichung kannst du jederzeit zurückziehen, und die Seite verschwindet aus Suche, Sitemap und Feeds.',
  ],
  stepsTitle: 'So funktioniert es, in sechs Schritten',
  stepsIntro:
    'Derselbe Ablauf funktioniert aus einem Chat und von der Threads-Seite. Jeder Schritt ist entweder etwas, das du tust, oder etwas, das ClawAI für dich erledigt.',
  steps: [
    {
      title: 'Chat auswählen',
      body: 'Öffne den Chat, den du teilen möchtest, und wähle im Chat-Menü „In öffentlichen Thread umwandeln“. Auf der Threads-Seite wählst du den Quellchat selbst. Das Gespräch wird als Schnappschuss eingefroren, spätere Änderungen am Chat verändern also nicht, woraus der Thread entstand.',
    },
    {
      title: 'Thema nennen und zustimmen',
      body: 'Beschreibe das Thema in ein oder zwei Sätzen, wähle den Typ (Artikel, Forschungsartikel, Anleitung oder technische Erklärung) und die Sprache und setze das Häkchen, dass du weißt, dass das Ergebnis öffentlich wird. Ohne diese Zustimmung bleibt der Startknopf deaktiviert.',
    },
    {
      title: 'Modelle wählen',
      body: 'Wähle drei bis fünf Autoren, einen Bewerter und einen Kritiker mit derselben Modellauswahl wie im Chat: nach Anbieter gruppiert, durchsuchbar, mit Markierungen für Fähigkeiten und für Modelle, die Connector-Guthaben nutzen. Verschiedene Anbieter liefern wirklich verschiedene Entwürfe.',
    },
    {
      title: 'Ausgabenlimit setzen und starten',
      body: 'Lege fest, wie viel dieser Thread höchstens kosten darf. Jeder Modellaufruf wird vor der Ausführung gegen das Limit geprüft, und der Auftrag stoppt, statt es zu überschreiten. Du kannst die Phasen live verfolgen und jederzeit abbrechen.',
    },
    {
      title: 'Recherchieren, schreiben, einigen, bewerten',
      body: 'ClawAI recherchiert das Thema im Live-Web und behält die Belege. Die Autoren schreiben auf Basis dieser Belege, einigen sich auf einen Entwurf, und Bewerter und Kritiker prüfen ihn. Ein durchgefallener Entwurf wird überarbeitet und erneut geprüft, bis zu drei Runden. Besteht er danach nicht, erfährst du den Grund, und nichts wird veröffentlicht.',
    },
    {
      title: 'Prüfen, freigeben, veröffentlichen',
      body: 'Lies den Entwurf mit seinen Quellen, bitte um Änderungen oder bearbeite ihn selbst und gib ihn frei, wenn du zufrieden bist. Nur ein freigegebener Entwurf wird zur öffentlichen Seite, mit strukturierten Daten, Quellenliste, Lesezähler und Platz für Kommentare und Reaktionen. Du kannst ihn exportieren und jederzeit zurückziehen.',
    },
  ],
  trustTitle: 'Schutzmaßnahmen, die eingebaut sind, nicht versprochen',
  trustIntro:
    'Etwas unter deinem Konto zu veröffentlichen verdient mehr Sorgfalt als eine Chat-Antwort. Diese Prüfungen laufen bei jedem Thread.',
  trust: [
    {
      title: 'Nichts wird ohne deine Freigabe öffentlich',
      body: 'Gute Werte von Bewerter und Kritiker machen einen Entwurf nur reif für deine Prüfung. Sie veröffentlichen nie etwas von selbst.',
    },
    {
      title: 'Nur echte Quellen',
      body: 'Zitate müssen aus den Belegen stammen, die der Recherche-Schritt gesammelt hat. Ein Entwurf, der eine Adresse zitiert, die die Recherche nie gefunden hat, wird abgelehnt.',
    },
    {
      title: 'Zwei unabhängige Prüfer',
      body: 'Der Bewerter muss den Entwurf mit mindestens 80 von 100 bewerten, der Kritiker mit mindestens 75. Beide sind Modelle, die du wählst, also kannst du Prüfer eines anderen Anbieters als die Autoren nehmen.',
    },
    {
      title: 'Ein hartes Ausgabenlimit',
      body: 'Jeder Modellaufruf reserviert seine Kosten zuerst gegen das Limit. Ungenutzte Reservierungen werden freigegeben, und ein fehlgeschlagener oder abgebrochener Auftrag gibt sein Guthaben zurück.',
    },
    {
      title: 'Dein Gespräch bleibt deins',
      body: 'Die öffentliche Seite enthält den Artikel, nicht den Chat. Der Chat ist nur der Ausgangspunkt und wird aus einem festen Schnappschuss gelesen.',
    },
    {
      title: 'Sicherheit und Privatsphäre der Leser',
      body: 'Leser können kommentieren, reagieren, Änderungen vorschlagen und eine Seite melden. Aufrufzähler ignorieren Crawler und speichern nur anonyme, mit Schlüssel erzeugte Hashes, nie eine Adresse oder ein Konto.',
    },
  ],
  outputsTitle: 'Was du bekommst',
  outputs: [
    {
      title: 'Eine öffentliche Artikelseite',
      body: 'Eine saubere Seite mit dem Artikel, nummerierten Quellen und strukturierten Daten, damit Suchmaschinen ihn verstehen, in der Sprache deiner Wahl.',
    },
    {
      title: 'Auffindbarkeit und Feeds',
      body: 'Veröffentlichte Threads erscheinen im Threads-Hub, in der Sitemap und in den RSS-Feeds und verschwinden dort sofort wieder, wenn du sie zurückziehst.',
    },
    {
      title: 'Exporte',
      body: 'Lade einen Thread als JSON, Markdown oder TOON herunter, das kompakte Format, das sich günstig an ein anderes Modell übergeben lässt.',
    },
    {
      title: 'Eine Leser-Community',
      body: 'Angemeldete Leser können kommentieren, reagieren und Änderungen vorschlagen, die du annehmen oder ablehnen kannst. Ein Aufrufzähler zeigt die Reichweite, ohne jemanden zu verfolgen.',
    },
  ],
  useCasesTitle: 'Was Leute zu Threads machen',
  useCases: [
    {
      title: 'Ein Recherche-Chat wird zur Erklärung',
      body: 'Du hast eine Stunde lang mit der KI ein Thema verstanden. Mach daraus den Artikel, den du am Anfang gern gefunden hättest.',
    },
    {
      title: 'Eine Lösung wird zur Anleitung',
      body: 'Etwas Kniffliges im Chat gelöst? Veröffentliche die funktionierenden Schritte als Anleitung, mit den Quellen dazu.',
    },
    {
      title: 'Eine technische Frage wird zum Beitrag',
      body: 'Frage mehrere Modelle, lass sie sich einigen und veröffentliche das Ergebnis als technische Erklärung, die zweimal geprüft wurde.',
    },
    {
      title: 'Ein Vergleich wird zum Post',
      body: 'Mit Compare gesehen, wie Modelle antworten? Veröffentliche, was du gelernt hast, samt der Recherche dahinter.',
    },
  ],
  plansTitle: 'Tarife und Kosten',
  plansBody:
    'Threads ist für jeden Tarif offen. Free enthält einen Thread, Starter zwei pro Monat und Plus zehn pro Monat, höhere Tarife mehr. Das Erstellen eines Threads nutzt dasselbe Kontingent und dieselben Guthabenregeln wie der Rest von ClawAI, und dein Ausgabenlimit ist das Maximum der Kosten. Lesen, Kommentieren und Reagieren sind für jedes angemeldete Konto kostenlos.',
  faqTitle: 'Fragen, die Leute stellen',
  faq: [
    {
      question: 'Wird mein Chat öffentlich?',
      answer:
        'Nein. Öffentlich ist nur der Artikel, den du freigibst. Der Chat dient als Ausgangspunkt und wird nie auf der Seite gezeigt.',
    },
    {
      question: 'Kann ein Thread ohne mich veröffentlicht werden?',
      answer:
        'Nein. Jeder Thread wartet auf deine Freigabe, egal wie gut Bewerter und Kritiker ihn bewerten. Du kannst auch jederzeit zurückziehen.',
    },
    {
      question: 'Welche Modelle schreiben einen Thread?',
      answer:
        'Die, die du wählst: drei bis fünf Autoren, ein Bewerter und ein Kritiker, aus derselben Auswahl wie im Chat. Verschiedene Anbieter ergeben vielfältigere Entwürfe und unabhängige Prüfung.',
    },
    {
      question: 'Was passiert, wenn Bewerter oder Kritiker den Entwurf ablehnen?',
      answer:
        'Der Entwurf wird überarbeitet und erneut geprüft, bis zu drei Runden. Besteht er weiterhin nicht, endet der Auftrag mit einem klaren Grund, ungenutztes Guthaben wird freigegeben, und nichts wird veröffentlicht.',
    },
    {
      question: 'Woher weiß ich, dass die Quellen echt sind?',
      answer:
        'Zitate müssen aus den Belegen des Recherche-Schritts stammen, und ein Entwurf mit anderen Zitaten wird abgelehnt. Die nummerierte Quellenliste siehst du vor der Freigabe.',
    },
    {
      question: 'Was kostet ein Thread?',
      answer:
        'Du setzt vor dem Start ein Ausgabenlimit, das der Auftrag nicht überschreiten kann. In deinem Tarif enthaltene Modelle verbrauchen kein Guthaben; Modelle mit Connector-Guthaben belasten dein Guthaben oder dein kostenloses Kontingent, und ein fehlgeschlagener oder abgebrochener Auftrag gibt die Reservierung zurück.',
    },
    {
      question: 'Kann ich einen Thread nach der Veröffentlichung bearbeiten?',
      answer:
        'Ja. Eine Änderung wird erneut geprüft, bevor sie die öffentliche Version ersetzt, und Leser können Änderungen vorschlagen, die du annimmst oder ablehnst.',
    },
    {
      question: 'Welche Sprachen werden unterstützt?',
      answer:
        'Threads können in jeder der 13 von ClawAI unterstützten Sprachen geschrieben werden, und die öffentliche Seite nutzt die gewählte Sprache.',
    },
  ],
  closingTitle: 'Mach aus deinem nächsten guten Chat etwas, das sich zu teilen lohnt',
  closingBody:
    'Öffne einen beliebigen Chat, wähle „In öffentlichen Thread umwandeln“ und schau, was zurückkommt. Du veröffentlichst nur, was du freigibst.',
};
