import type { CodingAgentDictionary } from '@/types/coding-agent-content.types';

/**
 * Die deutsche Fassung der beiden Coding-Agent-Seiten.
 *
 * Jede Aussage hier stammt aus der README und dem Manifest der Erweiterung in
 * `apps/claw-coding-agent`, nicht aus Marketingwünschen. Die Erweiterung ist ein
 * schlanker Client — Anmeldung, Berechtigungen, Kontingente, Verlauf,
 * Anbieter-Zugangsdaten, Routing und Inferenz bleiben auf der Plattform — und der
 * Text sagt das auch, denn wer sie in der Erwartung eines Offline-Codemodells
 * installiert, deinstalliert sie binnen einer Minute.
 */
export const DE_CODING_AGENT_CONTENT: CodingAgentDictionary = {
  overview: {
    eyebrow: 'ClawAI in Ihrem Editor',
    title: 'Der ClawAI Coding Agent für VS Code',
    intro:
      'Jedes Modell Ihres ClawAI-Abonnements, in dem Editor, den Sie ohnehin nutzen. Die Erweiterung ist ein schlanker Client: Ihr Konto, Ihre Kontingente, Ihre Anbieter-Zugangsdaten und Ihr Gesprächsverlauf bleiben auf der Plattform — derselbe Faden, den Sie im Browser begonnen haben, geht in VS Code weiter.',
    installCta: 'Aus dem Marketplace installieren',
    marketplaceCta: 'Im Marketplace ansehen',
    capabilitiesTitle: 'Was sie kann',
    capabilities: [
      {
        title: 'Jedes Modell, ein Abonnement',
        body: 'Neun führende Modellfamilien und Ihre lokalen offenen Modelle, aus dem Editor erreichbar, ohne einen API-Schlüssel einzufügen. Das Routing passiert auf der Plattform, der Editor hält also nie Anbieter-Zugangsdaten.',
      },
      {
        title: 'Automatisches oder manuelles Routing',
        body: 'Lassen Sie den Router für jede Nachricht das Modell wählen, oder heften Sie ein Gespräch an ein bestimmtes. Es ist dieselbe Wahl, die auch die Web-App trifft, weil sie an derselben Stelle getroffen wird.',
      },
      {
        title: 'Vergleichen und bewerten, im Editor',
        body: 'Schicken Sie einen Prompt gleichzeitig an mehrere Modelle und lesen Sie die Antworten nebeneinander, optional mit einem Bewertungsdurchlauf — derselbe Vergleichsablauf wie in der Web-App, angewendet auf den Code, den Sie offen haben.',
      },
      {
        title: 'Vorschau vor dem Übernehmen',
        body: 'Änderungen kommen als prüfbares Diff an, nicht als überraschender Schreibvorgang. Nichts berührt Ihr Arbeitsverzeichnis, bevor Sie es annehmen.',
      },
      {
        title: 'Kontext, den Sie einsehen können',
        body: 'Jede Antwort trägt einen Beleg: welche Dateien gelesen wurden, welches Modell geantwortet hat und was es von Ihrem Kontingent gekostet hat. Wenn eine Antwort falsch ist, sehen Sie, worauf sie sich gestützt hat.',
      },
      {
        title: 'Gleichzeitige Gespräche',
        body: 'Mehrere benannte Chat-Tabs auf einmal, zwei davon gleichzeitig gegen verschiedene Modelle laufend, mit an Ort und Stelle wiederhergestelltem Verlauf aus dem Backend.',
      },
    ],
    requirementsTitle: 'Was Sie brauchen',
    requirementsBody:
      'VS Code 1.98 oder neuer und ein ClawAI-Konto. Die Erweiterung verbindet sich mit ClawAIs gehosteter Plattform oder mit Ihrer eigenen selbst betriebenen Installation — Sie entscheiden das bei der Anmeldung.',
    faqTitle: 'Häufige Fragen',
    faq: [
      {
        question: 'Brauche ich für die Erweiterung ein eigenes Abonnement?',
        answer:
          'Nein. Die Erweiterung nutzt das ClawAI-Konto, das Sie bereits haben, und zieht dasselbe Kontingent wie die Web-App. Es gibt nichts zusätzlich zu kaufen.',
      },
      {
        question: 'Wird mein Code an einen Modellanbieter geschickt?',
        answer:
          'Nur das, was eine Anfrage braucht, und nur an das Modell, das sie beantwortet — der Beleg an jeder Antwort nennt dieses Modell. Heften Sie ein Gespräch an ein lokales offenes Modell oder richten Sie die Erweiterung auf eine selbst betriebene Installation, und nichts erreicht einen externen Anbieter.',
      },
      {
        question: 'Funktioniert sie mit einem selbst betriebenen ClawAI?',
        answer:
          'Ja. Die Erweiterung fragt bei der Anmeldung nach der Backend-URL und arbeitet daher mit ClawAIs gehosteter Plattform ebenso wie mit einer Installation, die vollständig auf Ihrer eigenen Infrastruktur läuft.',
      },
      {
        question: 'Kann ich die Web-App weiterhin nutzen?',
        answer:
          'Ja, und dieselben Gespräche erscheinen in beiden. Der Verlauf liegt auf der Plattform — ein im Browser begonnener Faden geht im Editor weiter und wieder zurück.',
      },
    ],
  },
  install: {
    eyebrow: 'Installation',
    title: 'Den ClawAI Coding Agent installieren',
    intro:
      'Drei Schritte, etwa eine Minute. Die Erweiterung ist im Visual Studio Marketplace unter dem verifizierten Herausgeber ClawAI veröffentlicht.',
    stepsTitle: 'Aus VS Code heraus',
    steps: [
      {
        title: 'Die Extensions-Ansicht öffnen',
        body: 'Drücken Sie Ctrl+Shift+X unter Windows und Linux oder Cmd+Shift+X unter macOS. Sie lässt sich auch über die Aktivitätsleiste am linken Rand öffnen.',
      },
      {
        title: 'Nach ClawAI Coding Agent suchen',
        body: 'Tippen Sie „ClawAI“ in das Suchfeld. Achten Sie auf den Eintrag des Herausgebers ClawAI — der Name des Herausgebers trägt ein Verifiziert-Abzeichen.',
      },
      {
        title: 'Installieren und anmelden',
        body: 'Klicken Sie auf Install, öffnen Sie dann das ClawAI-Panel und melden Sie sich an. Sie werden nach Ihrer Backend-URL gefragt — lassen Sie den Standard stehen, um ClawAIs gehostete Plattform zu nutzen, oder tragen Sie Ihre eigene ein, wenn Sie selbst betreiben.',
      },
    ],
    cliTitle: 'Über die Kommandozeile',
    cliBody:
      'Wenn Sie Erweiterungen aus einem Terminal oder einem Setup-Skript installieren, genügt ein einziger Befehl. Er funktioniert überall dort, wo der Befehl `code` im PATH liegt.',
    signInTitle: 'Die Anmeldung',
    signInBody:
      'Die Anmeldung läuft in Ihrem Browser und gibt ein eng begrenztes Token an den Editor zurück. Die Erweiterung speichert nie Ihr Passwort und hält nie den API-Schlüssel eines Modellanbieters — diese bleiben auf der Plattform.',
    troubleshootingTitle: 'Wenn etwas nicht klappt',
    troubleshooting: [
      {
        question: 'Die Erweiterung taucht in der Suche nicht auf',
        answer:
          'Prüfen Sie Ihre VS-Code-Version — die Erweiterung setzt 1.98 oder neuer voraus. Auf älteren Builds blendet der Marketplace sie aus, statt eine inkompatible Installation anzubieten.',
      },
      {
        question: 'Der Installationslink tut nichts',
        answer:
          'Der Ein-Klick-Link nutzt das `vscode:`-Protokoll, und das funktioniert nur, wenn VS Code auf dem Rechner installiert ist, von dem aus Sie gerade surfen. Nutzen Sie stattdessen die Marketplace-Seite oder die Kommandozeile.',
      },
      {
        question: 'Die Anmeldung klappt, aber es werden keine Modelle angezeigt',
        answer:
          'Der Modellzugang folgt Ihrem Tarif. Prüfen Sie die Modelle-Seite in der Web-App; fehlt ein Modell auch dort, ist es für Ihr Konto nicht freigegeben und nicht etwa in der Erweiterung verloren gegangen.',
      },
      {
        question: 'Meine selbst betriebene Installation ist nicht erreichbar',
        answer:
          'Die Backend-URL muss von Ihrem Rechner aus erreichbar sein und ein Zertifikat vorweisen, dem Ihr Editor vertraut. Ein selbstsigniertes Zertifikat, das der Browser nach einer Warnung akzeptiert hat, wird hier trotzdem abgelehnt.',
      },
    ],
    marketplaceCta: 'Marketplace-Eintrag öffnen',
    openInEditorCta: 'In VS Code öffnen',
  },
};
