import { ModelFitTask } from '@/enums/model-fit-task.enum';
import type { ModelFitDictionary } from '@/types/model-fit.types';

export const DE_MODEL_FIT_CONTENT: ModelFitDictionary = {
  labels: {
    onThisPage: 'Auf dieser Seite',
    faqTitle: 'Häufig gestellte Fragen',
    relatedTitle: 'Wie es weitergeht',
    lastReviewed: 'Zuletzt geprüft',
    backToHub: 'Alle Aufgaben',
    ctaTitle: 'Selbst ausprobieren statt uns nur zu glauben',
    ctaBody:
      'ClawAI leitet eine Unterhaltung an das passende Modell weiter, über alle angebundenen Anbieter hinweg, aus einem einzigen Workspace heraus.',
    startFree: 'Kostenlos starten',
    seeFeatures: 'Was ClawAI kann',
    seePricing: 'Aktuellen Katalog auf der Preisseite prüfen',
  },
  hub: {
    seo: {
      title: 'Das richtige Modell für Ihre Aufgabe wählen',
      description:
        'Worauf es wirklich ankommt, wenn Sie ein Modell für Programmieren, komplexes Schlussfolgern, Schreiben, recherchebasierte Antworten oder private und lokale Workloads auswählen — keine Ranglisten, keine erfundenen Benchmarks.',
      keywords: [
        'Modell für eine Aufgabe wählen',
        'welches KI-Modell passt zu meiner Aufgabe',
        'Modell für Programmieren vs. Schreiben',
      ],
    },
    eyebrow: 'Modellauswahl',
    title: 'Das richtige Modell für Ihre Aufgabe wählen',
    summary:
      'Es gibt kein einzelnes bestes Modell — es gibt ein Modell, das zu einer bestimmten Aufgabe passt, und diese Passung ändert sich mit dem, was die Aufgabe braucht: wie tief das Schlussfolgern gehen muss, wie viel Kontext gehalten werden muss, wie empfindlich die Kosten sind und ob die Anfrage auf Hardware bleiben muss, die Sie selbst kontrollieren. Dieser Übersichtsbereich stellt keine Rangliste von Modellen auf; er geht durch, was bei fünf gängigen Arten von Arbeit abzuwägen ist, und verlinkt auf die Anbieterseiten und Bewertungsleitfäden, mit denen Sie selbst nachprüfen können.',
    topicsHeading: 'Aufgabe auswählen',
    cardSummaries: {
      [ModelFitTask.CODING]: 'Worauf es ankommt, wenn ein Modell Code schreibt oder bearbeitet.',
      [ModelFitTask.COMPLEX_REASONING]:
        'Mehrstufige Probleme, bei denen sich das Modell Schritt für Schritt durcharbeiten muss.',
      [ModelFitTask.WRITING_AND_EDITING]:
        'Längere Textentwürfe, Überarbeitung und das Einhalten einer Stilvorgabe.',
      [ModelFitTask.RESEARCH_WITH_SOURCES]:
        'Antworten, die auf vom Modell recherchierten Quellen beruhen, nicht nur auf Trainingsdaten.',
      [ModelFitTask.PRIVATE_LOCAL_WORKLOADS]:
        'Eine Anfrage auf selbst kontrollierter Hardware halten statt bei einem Cloud-Anbieter.',
    },
  },
  tasks: {
    [ModelFitTask.CODING]: {
      seo: {
        title: 'Das richtige Modell für Programmieraufgaben wählen',
        description:
          'Was bei der Modellauswahl für Programmieraufgaben in ClawAI abzuwägen ist — Befolgen von Anweisungen, Kontextfenster und Kosten pro Anfrage. Keine Ranglisten, keine erfundenen Benchmarks. Vor der Planwahl den aktuellen Katalog prüfen.',
        keywords: [
          'Modell für Programmieren wählen',
          'welches Modell für Programmieren nutzen',
          'KI-Modell für Softwareentwicklung',
        ],
      },
      eyebrow: 'Modellauswahl',
      title: 'Das richtige Modell für Programmieraufgaben wählen',
      summary:
        'Programmierarbeit reicht von einer einzeiligen Korrektur über ein Refactoring mit mehreren Dateien bis zu einer Funktion von Grund auf — und das passende Modell ändert sich mit Umfang und Art dieser Arbeit. Diese Seite geht durch, was abzuwägen ist, statt einen einzelnen Gewinner zu benennen; der Router von ClawAI kann das meiste davon bereits automatisch übernehmen, oder Sie wählen manuell.',
      sections: [
        {
          id: 'what-coding-needs',
          heading: 'Was eine Programmieraufgabe von einem Modell tatsächlich braucht',
          paragraphs: [
            'Programmieraufgaben stützen sich auf die Fähigkeit eines Modells, detaillierte, strukturierte Anweisungen zu befolgen und eine Änderung über eine Datei oder mehrere Dateien hinweg in sich konsistent zu halten — das ähnelt eher sorgfältigem, schrittweisem Schreiben als einem offenen Gespräch. Mehrere Anbieter im Katalog von ClawAI veröffentlichen Modelle, die speziell dafür gebaut sind, ein Problem in Schritten durchzuarbeiten statt sofort zu antworten, was für eine nicht triviale Änderung eine sinnvolle Wahl ist; eine einfache, klar spezifizierte Änderung braucht das selten.',
          ],
        },
        {
          id: 'context-and-cost',
          heading: 'Kontextfenster und Kosten, nicht nur Fähigkeiten',
          paragraphs: [
            'Eine große Codebasis, oder eine Aufgabe, die mehrere Dateien gleichzeitig geöffnet braucht, ist vor allem ein Kontextfenster-Problem — ein Modell muss den relevanten Code im Blick behalten können, um korrekt darüber zu schlussfolgern. Auch die Kostenempfindlichkeit schwankt innerhalb eines einzelnen Arbeitsablaufs: Eine Aufgabe mit hohem Volumen wie das Erzeugen von Boilerplate oder einfachen Vervollständigungen ist ein sinnvoller Ort für ein günstigeres Modell, während ein sorgfältiges Refactoring an einem kritischen Pfad ein sinnvoller Ort ist, um mehr auszugeben. Jede Programmieranfrage unabhängig von ihrer Größe gleich zu behandeln, ist meist die falsche Grundeinstellung.',
          ],
        },
        {
          id: 'how-clawai-routes-coding',
          heading: 'Wie ClawAI eine Programmieranfrage weiterleiten kann',
          paragraphs: [
            'Der Router von ClawAI kann eine Programmieranfrage unter Auto- oder High-Reasoning-Routing automatisch an ein passendes Modell senden, oder Sie legen im Manual-Model-Modus ein bestimmtes fest, wenn Sie genau wissen, welches Modell eine Aufgabe braucht. Auf der Seite mit den Modellanbietern finden Sie jede Anbieterfamilie, an die ClawAI eine Anfrage weiterleiten kann, und auf der Preisseite können Sie den aktuellen Katalog prüfen, bevor Sie einen Plan wählen, der auf ein bestimmtes Modell zugeschnitten ist — Verfügbarkeit und Kontingente werden dort durchgesetzt, nicht auf dieser Seite.',
          ],
        },
      ],
      faq: [
        {
          question: 'Welches Modell ist das beste für Programmieren?',
          answer:
            'Diese Seite wird keins benennen — „das beste“ hängt von Umfang und Art der Aufgabe ab, und kein verlässlicher Benchmark klärt das für jeden Fall. Im verlinkten Leitfaden zur Bewertung von KI-Modellen finden Sie stattdessen eine wiederholbare Methode für Ihre eigene Arbeitslast.',
        },
        {
          question: 'Wählt ClawAI für Programmieraufgaben automatisch ein anderes Modell?',
          answer:
            'Unter Auto- oder High-Reasoning-Routing kann der Router von ClawAI eine Anfrage an ein Modell senden, das er als zur Aufgabe passend einschätzt, auch für Programmieraufgaben. Sie können auch selbst ein bestimmtes Modell im Manual-Model-Modus festlegen.',
        },
        {
          question:
            'Ist ein auf Schlussfolgern ausgerichtetes Modell für Programmieren immer die richtige Wahl?',
          answer:
            'Nicht unbedingt — eine einfache, klar spezifizierte Änderung braucht oft keins, während ein mehrstufiges Refactoring naturgemäß besser passt. Prüfen Sie den aktuellen Katalog auf der Preisseite, bevor Sie einen Plan rund um ein bestimmtes Modell wählen.',
        },
      ],
      productNote:
        'ClawAI kann eine Programmieranfrage automatisch an ein passendes Modell weiterleiten, oder Sie legen direkt im Manual-Model-Modus eins fest — die Wahl liegt bei Ihnen, nicht bei einem einzelnen Anbieter.',
      catalogDisclaimer:
        'Modellverfügbarkeit und Kontingente werden von Ihrem Plan und dem aktuellen Katalog durchgesetzt, nicht von dieser Seite. Prüfen Sie den aktuellen Katalog auf der Preisseite, bevor Sie einen Plan wählen, der auf ein bestimmtes Modell zugeschnitten ist.',
    },
    [ModelFitTask.COMPLEX_REASONING]: {
      seo: {
        title: 'Das richtige Modell für komplexes Schlussfolgern wählen',
        description:
          'Was bei der Modellauswahl für mehrstufige Schlussfolgerungsaufgaben in ClawAI abzuwägen ist — Tiefe des Schlussfolgerns, Routing-Modi und wie Sie ein Modell an Ihrem eigenen Problem prüfen. Vor der Planwahl den aktuellen Katalog prüfen.',
        keywords: [
          'Modell für Schlussfolgern wählen',
          'KI-Modell für komplexe Probleme',
          'Modell für mehrstufiges Schlussfolgern',
        ],
      },
      eyebrow: 'Modellauswahl',
      title: 'Das richtige Modell für komplexes Schlussfolgern wählen',
      summary:
        'Eine komplexe Schlussfolgerungsaufgabe verlangt von einem Modell, sich durch mehrere Schritte zu arbeiten — ein Problem zerlegen, Zwischenergebnisse prüfen, vor der Antwort noch einmal überarbeiten — statt eine erste Antwort auf Anhieb zu liefern. Diese Seite geht durch, was das für die Modellauswahl bedeutet, ohne einen einzelnen Gewinner zu benennen oder einen Benchmark-Wert anzuführen.',
      sections: [
        {
          id: 'what-reasoning-tasks-need',
          heading: 'Was eine mehrstufige Schlussfolgerungsaufgabe braucht',
          paragraphs: [
            'Mehrere Anbieter im Katalog von ClawAI veröffentlichen Modelle, die speziell dafür gebaut sind, sich Schritt für Schritt durch ein Problem zu arbeiten, bevor eine endgültige Antwort entsteht, statt sofort zu antworten — ein sinnvoller Ausgangspunkt für eine Aufgabe mit mehreren voneinander abhängigen Schritten, mehreren gleichzeitig zu erfüllenden Bedingungen oder einem Ergebnis, das vor der Fertigstellung geprüft werden muss. Eine kurze Frage mit nur einem Schritt profitiert selten von dieser Art Modell; die Passung richtet sich nach der Struktur der Aufgabe, nicht nach einer allgemeinen Vorstellung davon, welches Modell „stärker“ ist.',
          ],
        },
        {
          id: 'high-reasoning-routing',
          heading: 'Der High-Reasoning-Routing-Modus von ClawAI',
          paragraphs: [
            'High Reasoning ist einer der sieben Routing-Modi von ClawAI, gebaut genau für diese Art von Anfrage: Der Router bevorzugt ein Modell, das dafür geeignet ist, ein Problem in Schritten zu durchdenken, statt sofort zu antworten. Auch Auto-Routing kann auf eines dieser Modelle zurückgreifen, wenn es eine Anfrage entsprechend einschätzt; im Manual-Model-Modus können Sie eins direkt festlegen, wenn Sie bereits wissen, welches Modell eine wiederkehrende Aufgabe braucht.',
          ],
        },
        {
          id: 'evaluating-reasoning-models',
          heading: 'Die Schlussfolgerungsfähigkeit eines Modells selbst prüfen',
          paragraphs: [
            'Keine Seite auf dieser Website veröffentlicht einen Benchmark-Wert, weil eine veröffentlichte Zahl selten widerspiegelt, wie ein Modell bei Ihrem konkreten Problem abschneidet — im verlinkten Leitfaden zum Lesen von KI-Benchmarks erfahren Sie, was ein veröffentlichter Wert zeigt und was nicht. Der ebenfalls verlinkte Leitfaden zur Bewertung von KI-Modellen zeigt stattdessen einen wiederholbaren Weg, ein Modell an Ihren eigenen Schlussfolgerungsaufgaben zu prüfen.',
          ],
        },
      ],
      faq: [
        {
          question: 'Welches Modell ist am besten im Schlussfolgern?',
          answer:
            'Diese Seite benennt keins — die Modelle, die für mehrstufiges Schlussfolgern gebaut sind, unterscheiden sich je nach Anbieter, und wie gut eines bei Ihrem konkreten Problem abschneidet, sollten Sie selbst prüfen statt sich auf einen veröffentlichten Wert zu verlassen. Siehe den verlinkten Leitfaden zur Bewertung von KI-Modellen.',
        },
        {
          question: 'Was macht der High-Reasoning-Routing-Modus von ClawAI?',
          answer:
            'Er ist einer der sieben Routing-Modi von ClawAI; bei Auswahl bevorzugt der Router ein Modell, das dafür geeignet ist, ein Problem in Schritten zu durchdenken, statt sofort zu antworten.',
        },
        {
          question: 'Sollte ich immer ein auf Schlussfolgern ausgerichtetes Modell verwenden?',
          answer:
            'Nein — eine kurze Frage mit nur einem Schritt braucht selten eins, und auf Schlussfolgern ausgerichtete Modelle gibt es bei ClawAI in jeder Preisklasse. Prüfen Sie den aktuellen Katalog auf der Preisseite, bevor Sie einen Plan rund um ein bestimmtes Modell wählen.',
        },
      ],
      productNote:
        'Der High-Reasoning-Routing-Modus von ClawAI kann eine Anfrage an ein Modell senden, das für schrittweises Durchdenken geeignet ist, oder Sie legen direkt im Manual-Model-Modus eins fest.',
      catalogDisclaimer:
        'Modellverfügbarkeit und Kontingente werden von Ihrem Plan und dem aktuellen Katalog durchgesetzt, nicht von dieser Seite. Prüfen Sie den aktuellen Katalog auf der Preisseite, bevor Sie einen Plan wählen, der auf ein bestimmtes Modell zugeschnitten ist.',
    },
    [ModelFitTask.WRITING_AND_EDITING]: {
      seo: {
        title: 'Das richtige Modell für Schreiben und Überarbeiten wählen',
        description:
          'Was bei der Modellauswahl für Textentwürfe, Überarbeitung und längere Texte in ClawAI abzuwägen ist — Kontextfenster, Einhalten einer Stilvorgabe und Kosten über einen Arbeitsablauf hinweg. Vor der Planwahl den aktuellen Katalog prüfen.',
        keywords: [
          'Modell für Schreiben wählen',
          'KI-Modell für Überarbeitung',
          'Modell für lange Texte',
        ],
      },
      eyebrow: 'Modellauswahl',
      title: 'Das richtige Modell für Schreiben und Überarbeiten wählen',
      summary:
        'Schreiben und Überarbeiten decken ein breites Spektrum an Aufgaben ab — eine kurze Umformulierung, ein langes Dokument, das auf Konsistenz überarbeitet wird, ein vollständiger Entwurf nach einer Stilvorgabe — und was ein Modell dafür gut können muss, ändert sich über dieses Spektrum hinweg. Diese Seite geht durch, was abzuwägen ist, statt ein einzelnes Modell als Antwort zu benennen.',
      sections: [
        {
          id: 'what-writing-tasks-need',
          heading: 'Was eine Schreib- oder Überarbeitungsaufgabe von einem Modell braucht',
          paragraphs: [
            'Sorgfältige Schreibarbeit stützt sich auf die Fähigkeit eines Modells, detaillierte Anweisungen zu befolgen und einen konsistenten Ton sowie eine konsistente Struktur über ein ganzes Stück hinweg zu halten — das entspricht eher dem, wofür mehrere Anbieter ihre Allzweck- und höheren Modellstufen als geeignet beschreiben. Eine kurze Umformulierung oder ein einzelner Absatz braucht selten dasselbe Modell wie ein langes Dokument, das von der ersten bis zur letzten Seite konsistent bleiben muss.',
          ],
        },
        {
          id: 'context-window-for-long-documents',
          heading: 'Das Kontextfenster ist bei langen Dokumenten entscheidend',
          paragraphs: [
            'Ein langes Dokument zu überarbeiten, oder einen Entwurf nach einer umfangreichen Stilvorgabe und mit Referenzmaterial zu erstellen, ist vor allem ein Kontextfenster-Problem — das Modell muss das gesamte Dokument, oder genug davon, im Blick behalten können, um Terminologie, Ton und Struktur konsistent zu halten. Im verlinkten Beitrag „Was ist ein Kontextfenster“ erfahren Sie, was dieses Limit tatsächlich bedeutet und woher es kommt.',
          ],
        },
        {
          id: 'how-clawai-routes-writing',
          heading: 'Wie ClawAI eine Schreibanfrage weiterleiten kann',
          paragraphs: [
            'Der Router von ClawAI kann eine Schreib- oder Überarbeitungsanfrage unter Auto- oder Cost-Saver-Routing automatisch an ein passendes Modell senden, oder Sie legen im Manual-Model-Modus ein bestimmtes für eine wiederkehrende Aufgabe mit bekannter Stilvorgabe fest. Auf der Seite mit den Modellanbietern finden Sie jede Anbieterfamilie, an die ClawAI weiterleiten kann, und auf der Preisseite können Sie den aktuellen Katalog prüfen, bevor Sie einen Plan wählen, der auf ein bestimmtes Modell zugeschnitten ist.',
          ],
        },
      ],
      faq: [
        {
          question: 'Welches Modell schreibt am besten?',
          answer:
            'Diese Seite wird keins benennen — Schreibqualität wird von jedem Leser und jeder Aufgabe anders beurteilt, und kein Benchmark klärt das. Im verlinkten Leitfaden zur Bewertung von KI-Modellen finden Sie stattdessen eine Methode, die an Ihrem eigenen Material prüft.',
        },
        {
          question: 'Welches Modell sollte ich für ein langes Dokument verwenden?',
          answer:
            'Achten Sie zuerst auf die Größe des Kontextfensters, da ein langes Dokument im Blick bleiben muss, damit das Modell über seine gesamte Länge konsistent bleibt. Im verlinkten Beitrag „Was ist ein Kontextfenster“ erfahren Sie, wie dieses Limit funktioniert.',
        },
        {
          question: 'Kann ich für eine wiederkehrende Schreibaufgabe dasselbe Modell behalten?',
          answer:
            'Ja — legen Sie eins im Manual-Model-Modus fest, wenn eine wiederkehrende Aufgabe eine bekannte Stilvorgabe hat und Sie jedes Mal dasselbe Modell verwenden möchten, statt es dem automatischen Routing zu überlassen.',
        },
      ],
      productNote:
        'ClawAI kann eine Schreibanfrage automatisch an ein passendes Modell weiterleiten, oder Sie legen direkt im Manual-Model-Modus eins für eine wiederkehrende Aufgabe mit bekannter Stilvorgabe fest.',
      catalogDisclaimer:
        'Modellverfügbarkeit und Kontingente werden von Ihrem Plan und dem aktuellen Katalog durchgesetzt, nicht von dieser Seite. Prüfen Sie den aktuellen Katalog auf der Preisseite, bevor Sie einen Plan wählen, der auf ein bestimmtes Modell zugeschnitten ist.',
    },
    [ModelFitTask.RESEARCH_WITH_SOURCES]: {
      seo: {
        title: 'Das richtige Modell für recherchebasierte Antworten mit Quellen wählen',
        description:
          'Wie der Research-Modus von ClawAI eine Antwort auf recherchierten Quellen aufbaut, wie das getrennt vom Modellguthaben abgerechnet wird und was trotzdem von der Modellwahl abhängt. Vor der Planwahl den aktuellen Katalog prüfen.',
        keywords: [
          'KI-Recherche mit Quellen',
          'quellenbasierte Antworten KI-Modell',
          'Modell für Recherche wählen',
        ],
      },
      eyebrow: 'Modellauswahl',
      title: 'Das richtige Modell für recherchebasierte Antworten mit Quellen wählen',
      summary:
        'Eine Rechercheaufgabe verlangt eine Antwort, die auf Quellen beruht, die das Modell tatsächlich recherchiert hat, nicht nur auf dem, was es während des Trainings gelernt hat. Der Research-Modus von ClawAI ist eine reale, bereits ausgelieferte Funktion genau dafür; diese Seite erklärt, was er tut, wie er abgerechnet wird und was eine Modellwahl trotzdem verändert, sobald Quellen im Spiel sind.',
      sections: [
        {
          id: 'what-research-mode-does',
          heading: 'Was der Research-Modus von ClawAI tut',
          paragraphs: [
            'Der Research-Modus lässt eine Anfrage das Web durchsuchen, eine Seite abrufen oder strukturierte Inhalte aus einer Seite abrufen und extrahieren, bevor das Modell eine Antwort erstellt — sodass die Antwort Quellen zitieren kann, die es für genau diese Frage recherchiert hat, statt sich nur auf das zu verlassen, was das zugrunde liegende Modell im Training gelernt hat. Es handelt sich um eine planabhängige Funktion mit drei Tiefenstufen: nur Suche, Suche plus Abruf, oder Suche plus Abruf und Extraktion.',
          ],
        },
        {
          id: 'billed-separately-from-model-credit',
          heading: 'Recherche wird separat abgerechnet, nicht aus Ihrem Modellguthaben',
          paragraphs: [
            'Der Recherchezugriff wird als eigene Nutzung gemessen — Websuche, Seitenabrufe und Extraktion — getrennt vom Token-Kontingent, das eine Chat-Nachricht in Anspruch nimmt. Die Behauptung, „Recherche nutzt Ihr Modellguthaben“, wäre falsch: Beides wird als unterschiedliche Größe erfasst und abgerechnet, und das Recherche-Kontingent Ihres Plans ist eine eigene Position, getrennt vom Token-Kontingent des Modells.',
          ],
        },
        {
          id: 'what-the-model-still-changes',
          heading: 'Was das zugrunde liegende Modell trotzdem verändert',
          paragraphs: [
            'Der Research-Modus ändert, was das Modell vor seiner Antwort sehen kann, nicht wie gut es über das Abgerufene schlussfolgert — ein Modell muss die abgerufenen Quellen weiterhin lesen, gegeneinander abwägen und eine Antwort schreiben, die sie korrekt wiedergibt. Dieselben Überlegungen wie bei komplexen Schlussfolgerungsaufgaben gelten auch hier: Ein Modell, das für das Durcharbeiten mehrerer Schritte gebaut ist, ist eine sinnvolle Wahl, um mehrere Quellen miteinander in Einklang zu bringen, und das lohnt sich, an Ihrem eigenen Material zu prüfen, statt es anzunehmen.',
          ],
        },
      ],
      faq: [
        {
          question: 'Nutzt Recherche mein Modellguthaben?',
          answer:
            'Nein. Der Recherchezugriff — Websuche, Seitenabrufe und Extraktion — wird getrennt vom Token-Kontingent gemessen, das eine Chat-Nachricht in Anspruch nimmt. Beide Kontingente können Sie auf der Preisseite prüfen.',
        },
        {
          question: 'Was ist der Unterschied zwischen den drei Tiefenstufen des Research-Modus?',
          answer:
            'Nur Suche liefert Ergebnisse aus einer Websuche; Suche plus Abruf ruft zusätzlich den Seiteninhalt ab; Suche plus Abruf und Extraktion zieht darüber hinaus strukturierte Inhalte aus dem Abgerufenen. Welche Stufe eine Anfrage nutzt, hängt von ihrer Konfiguration ab.',
        },
        {
          question: 'Spielt das gewählte Modell eine Rolle, wenn der Research-Modus aktiv ist?',
          answer:
            'Ja — der Research-Modus ändert, welche Quellen das Modell sehen kann, nicht wie gut es sie liest und miteinander in Einklang bringt. Im verlinkten Leitfaden zur Bewertung von KI-Modellen erfahren Sie, wie Sie das an Ihrer eigenen Arbeitslast prüfen.',
        },
      ],
      productNote:
        'Der Research-Modus von ClawAI kann suchen, abrufen sowie abrufen und extrahieren, bevor ein Modell antwortet — eine reale, bereits ausgelieferte Funktion, getrennt von Ihrem Modell-Token-Guthaben gemessen.',
      catalogDisclaimer:
        'Modellverfügbarkeit und Kontingente werden von Ihrem Plan und dem aktuellen Katalog durchgesetzt, nicht von dieser Seite. Prüfen Sie den aktuellen Katalog auf der Preisseite, bevor Sie einen Plan wählen, der auf ein bestimmtes Modell zugeschnitten ist.',
    },
    [ModelFitTask.PRIVATE_LOCAL_WORKLOADS]: {
      seo: {
        title: 'Das richtige Modell für private, lokale Workloads wählen',
        description:
          'Was sich ändert, wenn eine Anfrage auf selbst kontrollierter Hardware bleibt statt bei einem Cloud-Anbieter, und wie die Routing-Modi Local-Only und Privacy-First von ClawAI zu privaten Workloads passen. Vor der Planwahl den aktuellen Katalog prüfen.',
        keywords: [
          'private KI-Modell-Workloads',
          'lokale KI-Modellwahl',
          'KI-Modelle auf eigener Hardware ausführen',
        ],
      },
      eyebrow: 'Modellauswahl',
      title: 'Das richtige Modell für private, lokale Workloads wählen',
      summary:
        'Ein privater oder lokaler Workload wird dadurch definiert, wo die Anfrage läuft, nicht dadurch, um welche Art von Aufgabe es sich handelt — die Anforderung ist, dass sie auf selbst kontrollierter Hardware bleibt, statt einen Cloud-Anbieter zu erreichen. ClawAI verfügt über produktiv laufende Anbindungen an Ollama und llama.cpp genau für diesen Zweck, dazu Routing-Modi, die eine Anfrage standardmäßig lokal halten.',
      sections: [
        {
          id: 'what-changes-locally',
          heading: 'Was das lokale Ausführen eines Modells tatsächlich ändert',
          paragraphs: [
            'Ein Cloud-Anbieter an anderer Stelle im Katalog von ClawAI führt ein Modell auf seiner eigenen Infrastruktur aus und berechnet pro Anfrage; Ollama und llama.cpp laden stattdessen ein offenes Modell auf Hardware, die Sie selbst kontrollieren, sodass die Anfrage diese nie verlässt. Das ändert, wer die Anfrage sehen kann, nicht, wozu ein gegebenes Modell fähig ist — den vollständigen Mechanismus finden Sie unter „Lokale KI“ auf der Seite mit den Modellanbietern, statt ihn hier zu wiederholen.',
          ],
        },
        {
          id: 'local-only-and-privacy-first-routing',
          heading: 'Die Routing-Modi Local-Only und Privacy-First von ClawAI',
          paragraphs: [
            'Local-Only-Routing hält jede Anfrage auf selbst kontrollierter Hardware, über Ollama oder llama.cpp statt über einen Cloud-Anbieter. Privacy-First-Routing ist ein eigener Modus mit eigenen Prioritäten; beide existieren gerade deshalb, weil nicht jeder Workload standardmäßig auf Auto-Routing gehören sollte. Zwischen beiden zu wählen, oder im Manual-Model-Modus ein bestimmtes lokales Modell festzulegen, ist eine Workload-Entscheidung, die es wert ist, bewusst getroffen zu werden, statt sie einer Allzweck-Voreinstellung zu überlassen.',
          ],
        },
        {
          id: 'choosing-which-open-weight-model',
          heading: 'Welches offene Modell Sie ausführen sollten',
          paragraphs: [
            'Diese Seite nennt bewusst kein bestimmtes offenes Modell, aus demselben Grund, aus dem die Anbieterseite für lokale KI es auch nicht tut: Das Feld bewegt sich schneller, als eine statische Seite es nachverfolgen kann, und eine veraltete Empfehlung ist schlimmer als keine. Im verlinkten Beitrag „Was ist Local-First-KI“ erfahren Sie, wie Sie den Kompromiss zwischen einem selbst betriebenen offenen Modell und einem Cloud-Anbieter abwägen.',
          ],
        },
      ],
      faq: [
        {
          question: 'Welches offene Modell sollte ich für einen privaten Workload ausführen?',
          answer:
            'Diese Seite empfiehlt keins — im verlinkten Beitrag „Was ist Local-First-KI“ erfahren Sie, wie Sie diese Wahl angehen, da das richtige Modell von Ihrer Hardware und Aufgabe abhängt, in einer Weise, die eine statische Seite nicht verantwortungsvoll nachverfolgen kann.',
        },
        {
          question: 'Was ist der Unterschied zwischen Local-Only- und Privacy-First-Routing?',
          answer:
            'Local-Only hält jede Anfrage über Ollama oder llama.cpp auf selbst kontrollierter Hardware; Privacy-First ist ein eigener Routing-Modus mit eigenen Prioritäten. Beide existieren, weil nicht jeder Workload standardmäßig auf Auto-Routing gehören sollte.',
        },
        {
          question: 'Kostet das lokale Ausführen eines Modells über ClawAI etwas?',
          answer:
            'ClawAI berechnet für ein lokal ausgeführtes Modell keinen Preis pro Token, wie es das bei einem Cloud-Anbieter tut, da hier kein Cloud-Anbieter abgerechnet wird — die Kosten sind die Hardware, die Sie ohnehin bereits betreiben. Das aktuelle Planverhalten können Sie auf der Preisseite prüfen.',
        },
      ],
      productNote:
        'Der Local-Only-Routing-Modus von ClawAI hält jede Anfrage über Ollama oder llama.cpp auf selbst kontrollierter Hardware — eine reale, bereits ausgelieferte Anbindung, kein Vorhaben auf der Roadmap.',
      catalogDisclaimer:
        'Hier wird absichtlich kein bestimmtes Modell genannt — offene Modelle und ihre Fähigkeiten ändern sich schnell, und Sie entscheiden selbst, welche Sie ausführen. Das Planverhalten für lokale Workloads können Sie auf der Preisseite prüfen.',
    },
  },
};
