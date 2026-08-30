import { LearnTopic } from '@/enums/learn-topic.enum';
import type { LearnDictionary } from '@/types/learn.types';

export const DE_LEARN_CONTENT: LearnDictionary = {
  labels: {
    onThisPage: 'Auf dieser Seite',
    faqTitle: 'Häufige Fragen',
    relatedTitle: 'Wie es weitergeht',
    lastReviewed: 'Zuletzt geprüft',
    backToHub: 'Alle Erklärungen',
    ctaTitle: 'Ausprobieren statt darüber lesen',
    ctaBody:
      'ClawAI bündelt diese Techniken in einem Arbeitsbereich, sodass Sie denselben Prompt durch mehrere Modelle schicken und den Unterschied selbst sehen können.',
    startFree: 'Mit dem kostenlosen Tarif starten',
    seeFeatures: 'Ansehen, was ClawAI kann',
  },
  hub: {
    seo: {
      title: 'Wissen: Multi-Modell-KI, Routing und Orchestrierung',
      description:
        'Verständliche Erklärungen der Techniken hinter Multi-Modell-KI — Routing, Konsens, Verifikation, RAG, Gedächtnis und Open-Weight-Modelle auf eigener Hardware.',
      keywords: ['LLM-Orchestrierung', 'KI-Modell-Routing', 'Multi-Modell-KI'],
    },
    eyebrow: 'Erklärungen',
    title: 'Wie Multi-Modell-KI wirklich funktioniert',
    summary:
      'Kurze, praktische Erklärungen der Ideen dahinter, einen Prompt an mehr als ein Modell zu geben: was jede Technik leistet, wann sie ihre Kosten wert ist und wann ein einzelnes Modell die bessere Antwort ist. Keine Hersteller-Benchmarks, keine erfundenen Zahlen.',
    topicsHeading: 'Ein Thema wählen',
    cardSummaries: {
      [LearnTopic.WHAT_IS_MULTI_MODEL_AI]:
        'Mehrere Modelle in einem Arbeitsablauf nutzen, statt sich auf eines festzulegen.',
      [LearnTopic.WHAT_IS_LLM_ORCHESTRATION]:
        'Die Schicht, die entscheidet, welches Modell läuft, in welcher Reihenfolge und was mit dem Ergebnis geschieht.',
      [LearnTopic.WHAT_IS_AI_MODEL_ROUTING]:
        'Jede Anfrage an ein Modell schicken, das nach Aufgabe, Kosten, Datenschutz oder Latenz gewählt wurde.',
      [LearnTopic.WHAT_IS_MODEL_FALLBACK]:
        'Was passieren soll, wenn das erste Modell ausfällt, gedrosselt wird oder ablehnt.',
      [LearnTopic.WHAT_IS_AI_CONSENSUS]:
        'Mehreren Modellen dieselbe Frage stellen und ihre Übereinstimmung als Signal nutzen.',
      [LearnTopic.WHAT_IS_BEST_OF_N]: 'Mehrere Antwortkandidaten erzeugen und den besten behalten.',
      [LearnTopic.WHAT_IS_AN_AI_JUDGE]:
        'Ein Modell die Antworten anderer bewerten lassen — und wo das scheitert.',
      [LearnTopic.WHAT_IS_AI_ANSWER_VERIFICATION]:
        'Eine Antwort gegen etwas anderes prüfen als gegen das Modell, das sie erzeugt hat.',
      [LearnTopic.WHAT_IS_A_CONTEXT_WINDOW]:
        'Der Arbeitsspeicher einer einzelnen Anfrage — und warum das kein Gedächtnis ist.',
      [LearnTopic.WHAT_IS_RAG]: 'Eigene Dokumente abrufen und dem Modell vorlegen.',
      [LearnTopic.WHAT_IS_AI_MEMORY]:
        'Was zwischen Gesprächen bestehen bleibt — und was es kostet.',
      [LearnTopic.WHAT_ARE_CONTEXT_PACKS]:
        'Wiederverwendbare Kontextpakete, die Sie einem Gespräch bewusst beilegen.',
      [LearnTopic.WHAT_IS_LOCAL_AI]:
        'Ein Modell auf eigener Hardware betreiben — und was sich dadurch wirklich ändert.',
      [LearnTopic.WHAT_ARE_OPEN_WEIGHT_MODELS]:
        'Modelle, deren Gewichte herunterladbar sind — und was „offen“ bedeutet und was nicht.',
      [LearnTopic.WHAT_IS_SELF_HOSTED_AI]:
        'Die gesamte Anwendung selbst betreiben, nicht nur das Modell.',
      [LearnTopic.OLLAMA_VS_LLAMACPP]:
        'Zwei Wege, Open-Weight-Modelle lokal auszuführen — und wofür sich welcher eignet.',
      [LearnTopic.CLOUD_AI_VS_LOCAL_AI]:
        'Der eigentliche Handel: Leistung und Bequemlichkeit gegen Kontrolle und Kostenform.',
      [LearnTopic.AI_AGENT_VS_AI_CHATBOT]:
        'Der Unterschied zwischen antworten und für Sie handeln.',
    },
  },
  topics: {
    [LearnTopic.WHAT_IS_MULTI_MODEL_AI]: {
      seo: {
        title: 'Was ist Multi-Modell-KI?',
        description:
          'Multi-Modell-KI bedeutet, mehrere Sprachmodelle in einem Ablauf zu nutzen, statt sich auf eines festzulegen. Was sie löst, was sie kostet, wann eines genügt.',
        keywords: ['Multi-Modell-KI', 'mehrere KI-Modelle', 'Modellauswahl'],
      },
      eyebrow: 'Grundlagen',
      title: 'Was ist Multi-Modell-KI?',
      summary:
        'Multi-Modell-KI behandelt Sprachmodelle als austauschbare Teile, statt eines auszuwählen und alles darum herum zu bauen. Dieselbe Frage kann an ein schnelles günstiges Modell gehen, an ein schweres Reasoning-Modell oder an eines auf Ihrer eigenen Hardware — entschieden pro Anfrage statt einmalig beim Kauf.',
      sections: [
        {
          id: 'the-problem',
          heading: 'Das Problem dahinter',
          paragraphs: [
            'Modelle sind nicht gleichmäßig besser oder schlechter als andere. Eines schreibt saubereren Code, ein anderes folgt langen Dokumenten treuer, ein drittes antwortet in einem Bruchteil der Zeit zu einem Bruchteil der Kosten. Sich auf einen Anbieter festzulegen heißt, dessen schwächste Seite bei jeder Aufgabe hinzunehmen.',
            'Es heißt auch, dessen Ausfälle, Ratenbegrenzungen, Preisänderungen und Abkündigungen hinzunehmen. Wird ein Modell abgeschaltet, von dem Sie abhängen, muss ein Ein-Modell-Ablauf umgebaut werden. Ein Multi-Modell-Ablauf ändert eine Einstellung.',
          ],
        },
        {
          id: 'what-it-looks-like',
          heading: 'Wie das in der Praxis aussieht',
          paragraphs: [
            'Am einfachsten ist Multi-Modell-KI ein Auswahlfeld: Sie wählen das Modell pro Gespräch. Das ist bereits nützlich, und dort fangen die meisten an.',
            'Interessanter wird es, wenn die Wahl automatisch geschieht — wenn ein Router die Anfrage liest und passend weiterleitet — und noch interessanter, wenn mehrere Modelle gleichzeitig antworten und ihre Antworten verglichen, bewertet oder zusammengeführt werden. Das sind eigene Techniken mit eigenen Kosten, jede mit einer eigenen Seite hier.',
          ],
        },
        {
          id: 'the-cost',
          heading: 'Was es kostet',
          paragraphs: [
            'Jedes zusätzliche Modell bedeutet ein weiteres Anbieterkonto, weitere Zugangsdaten, eine weitere Abrechnungsbeziehung und ein weiteres Format für Nutzungsdaten. Dieser Aufwand ist das ehrliche Gegenargument, und deshalb macht das kaum jemand von Hand.',
            'Mehrere Modelle auf denselben Prompt zu schicken vervielfacht dessen Token-Kosten. Techniken wie Konsens oder Best-of-N sind ihren Preis bei wichtigen Entscheidungen wert und Verschwendung bei Routinefragen. Das zu unterscheiden ist der größte Teil des Handwerks.',
          ],
        },
        {
          id: 'when-one-is-enough',
          heading: 'Wann ein Modell die richtige Antwort ist',
          paragraphs: [
            'Ist Ihre Arbeitslast eng und ein Modell erledigt sie gut, sind weitere nur Komplexität ohne Nutzen. Multi-Modell-Ansätze zahlen sich aus, wenn die Aufgaben vielfältig sind, wenn die Kosten pro Aufgabe über Ihre Anfragen hinweg um eine Größenordnung schwanken, oder wenn Teile Ihrer Daten überhaupt nicht zu Dritten dürfen.',
          ],
        },
      ],
      faq: [
        {
          question: 'Ist Multi-Modell-KI nicht einfach ein API-Gateway?',
          answer:
            'Ein Gateway gibt Ihnen einen Endpunkt für mehrere Anbieter und löst damit die Verkabelung. Multi-Modell-KI ist, was Sie damit tun: pro Anfrage wählen, Antworten vergleichen, bei Fehlern ausweichen. Das Gateway ist Voraussetzung, nicht die Technik.',
        },
        {
          question: 'Werden Antworten durch mehrere Modelle genauer?',
          answer:
            'Nicht von allein. Ein Prompt an drei Modelle liefert drei Antworten, keine bessere. Die Genauigkeit steigt erst, wenn Sie eine Auswahlmethode ergänzen — Übereinstimmung, Bewertung oder eine externe Prüfung — und jede davon hat eigene Schwächen.',
        },
        {
          question: 'Brauche ich mehrere Abonnements?',
          answer:
            'Wenn Sie direkt zu jedem Anbieter gehen, ja. Plattformen, die Anbieter bündeln, existieren auch deshalb. ClawAI ist eine davon: {cloudProviderCount} Cloud-Anbieter plus lokale Runtimes unter einem Konto.',
        },
      ],
      productNote:
        'ClawAI ist um genau diese Idee gebaut: {cloudProviderCount} Cloud-Anbieter und lokale Open-Weight-Modelle in einem Arbeitsbereich, mit dem antwortenden Modell an jeder Nachricht vermerkt.',
    },
    [LearnTopic.WHAT_IS_LLM_ORCHESTRATION]: {
      seo: {
        title: 'Was ist LLM-Orchestrierung?',
        description:
          'LLM-Orchestrierung ist die Schicht, die entscheidet, welches Modell läuft, in welcher Reihenfolge und was mit der Ausgabe geschieht. Der Unterschied zu Prompting und Agenten.',
        keywords: ['LLM-Orchestrierung', 'KI-Orchestrierung', 'Modell-Pipeline'],
      },
      eyebrow: 'Grundlagen',
      title: 'Was ist LLM-Orchestrierung?',
      summary:
        'Orchestrierung ist alles rund um den Modellaufruf. Auswählen, welches Modell läuft, entscheiden, ob ein Aufruf genügt, Ausgaben von einem Schritt in den nächsten geben und festlegen, was bei einem Fehler passiert. Der Prompt ist eine Anweisung; die Orchestrierung ist das Programm, in dem sie läuft.',
      sections: [
        {
          id: 'not-prompting',
          heading: 'Es ist kein Prompt-Engineering',
          paragraphs: [
            'Prompt-Engineering verbessert einen einzelnen Aufruf. Orchestrierung entscheidet, wie viele Aufrufe es gibt, welche Modelle sie ausführen und wie ihre Ausgaben zusammenkommen. Man kann hervorragende Prompts und keine Orchestrierung haben — das Ergebnis fällt aus, sobald ein Anbieter eine schlechte Stunde hat.',
            'Der Unterschied zählt, weil beide anders optimiert werden. Ein besserer Prompt ist günstig und hebt die Qualität etwas. Bessere Orchestrierung kostet Token und hebt die Verlässlichkeit deutlich.',
          ],
        },
        {
          id: 'what-it-decides',
          heading: 'Was eine Orchestrierungsschicht entscheidet',
          paragraphs: [
            'Welches Modell. Ob mehr als eines gefragt wird. Ob die Antwort vor der Rückgabe geprüft wird. Was bei einer Ablehnung, einer Zeitüberschreitung oder einer Ratenbegrenzung geschieht. Ob die Ausgabe dieses Schritts die Eingabe des nächsten wird. Ob das Ganze bezahlbar ist, bevor es beginnt.',
            'Jede dieser Fragen ist eine Richtlinie, und jede kann unabhängig falsch sein. Deshalb lohnt es sich, Orchestrierung als eigene Schicht zu benennen, statt die Entscheidungen über den Anwendungscode zu verstreuen.',
          ],
        },
        {
          id: 'techniques',
          heading: 'Die gängigen Techniken',
          paragraphs: [
            'Routing schickt eine Anfrage an ein passendes Modell. Fallback behandelt Fehler. Konsens fragt mehrere und betrachtet die Übereinstimmung. Best-of-N erzeugt Kandidaten und behält einen. Ein Judge bewertet Antworten. Verifikation prüft eine Aussage gegen etwas außerhalb des Modells. Pipelines verketten Schritte. Aufgabenzerlegung teilt eine große Anfrage in kleinere.',
            'ClawAI setzt neun davon als eigene Orchestrierungsmodi um, dazu Judge und Vergleich als eigene Flächen. Zu jeder gibt es hier eine Seite, die erklärt, was sie ist, bevor Sie entscheiden, ob Sie sie wollen.',
          ],
        },
        {
          id: 'when-not-to',
          heading: 'Wann nicht orchestriert werden sollte',
          paragraphs: [
            'Orchestrierung vervielfacht Kosten und Latenz. Ein Konsens über drei Modelle kostet etwa das Dreifache an Token und dauert so lange wie das langsamste. Für eine Frage, deren Antwort Sie auf einen Blick prüfen, ist das ein schlechter Handel.',
            'Die Faustregel, die hält: orchestrieren Sie, wenn Irren teuer und Prüfen schwer ist. Sonst schicken Sie eine Anfrage an ein Modell und lesen die Antwort.',
          ],
        },
      ],
      faq: [
        {
          question: 'Ist Orchestrierung dasselbe wie ein Agenten-Framework?',
          answer:
            'Überschneidend, aber nicht identisch. Ein Agent entscheidet seinen nächsten Schritt selbst, meist mit Werkzeugen. Orchestrierung ist die umgebende Richtlinie — welches Modell, wie viele, was bei Fehlern — und gilt genauso für einen Ablauf ganz ohne Agent.',
        },
        {
          question: 'Braucht Orchestrierung ein Framework?',
          answer:
            'Nein. Ein Wiederholungsversuch mit einem anderen Modell ist bereits Orchestrierung. Frameworks helfen, wenn die Richtlinien so zahlreich werden, dass Sie sie sonst pro Funktion neu bauen würden.',
        },
        {
          question: 'Wie viel kostet das?',
          answer:
            'In Token etwa proportional dazu, wie viele Modellaufrufe die Richtlinie macht. Ein einzelner gerouteter Aufruf kostet ungefähr so viel wie ein ungerouteter; ein Konsens über drei Modelle etwa das Dreifache. Die Kosten sind vorhersehbar, und genau das macht es zu einer Budgetentscheidung statt zu einem Glücksspiel.',
        },
      ],
      productNote:
        'ClawAI führt {orchestrationLabCount} Orchestrierungsmodi neben dem normalen Chat aus und protokolliert, welche Modelle ein Lauf verwendet hat — die Kosten einer Technik sind sichtbar statt geschätzt.',
    },
    [LearnTopic.WHAT_IS_AI_MODEL_ROUTING]: {
      seo: {
        title: 'Was ist KI-Modell-Routing?',
        description:
          'Routing schickt jede Anfrage an ein Modell, das nach Aufgabe, Kosten, Datenschutz oder Latenz gewählt wurde, statt eines für alles zu nutzen. Wie Router entscheiden und wie sie scheitern.',
        keywords: ['KI-Modell-Routing', 'LLM-Router', 'Modellauswahl'],
      },
      eyebrow: 'Routing',
      title: 'Was ist KI-Modell-Routing?',
      summary:
        'Ein Router betrachtet eine Anfrage, bevor sie läuft, und wählt das antwortende Modell. Der Punkt ist, dass das richtige Modell je nach Anfrage variiert: eine einzeilige Frage und ein Refactoring über tausend Zeilen verdienen nicht dasselbe Modell, und für beides Frontier-Preise zu zahlen entscheidet niemand bewusst.',
      sections: [
        {
          id: 'how-decisions-are-made',
          heading: 'Worüber ein Router entscheidet',
          paragraphs: [
            'Die meisten Router kombinieren einige Signale: welche Art Aufgabe es zu sein scheint, wie lang die Eingabe ist, wie sensibel die Daten sind, wie schnell die Antwort gebraucht wird und wie viel die Anfrage kosten darf.',
            'Diese Signale widersprechen einander. Das schnellste Modell ist selten das stärkste; die datenschutzfreundlichste Option selten die leistungsfähigste. Ein Router ist eigentlich eine Richtlinie darüber, worauf verzichtet wird — die nützlichen lassen Sie sagen, was Ihnen wichtig ist, statt zu raten.',
          ],
        },
        {
          id: 'automatic-vs-explicit',
          heading: 'Automatisches und ausdrückliches Routing',
          paragraphs: [
            'Automatisches Routing liest die Anfrage und entscheidet. Das ist bequem und gelegentlich falsch, und Falschheit ist schwer zu bemerken, wenn das System nicht sagt, welches Modell geantwortet hat.',
            'Ausdrückliches Routing heißt, Sie geben die Priorität vor — das bleibt lokal, das bleibt günstig, dafür das stärkste Reasoning — und der Router hält sich daran. In der Praxis wollen die meisten beides: eine sinnvolle Voreinstellung und die Möglichkeit, sie für die Anfrage vor sich zu übergehen.',
          ],
        },
        {
          id: 'failure-modes',
          heading: 'Wie Routing schiefgeht',
          paragraphs: [
            'Die beiden häufigen Fehler sind stille Herabstufungen und unsichtbare Entscheidungen. Eine stille Herabstufung ist ein Router, der Ihre sorgfältige Anfrage klammheimlich an ein billiges Modell gibt. Eine unsichtbare Entscheidung ist jedes Routing, das Sie im Nachhinein nicht prüfen können.',
            'Beides hat dieselbe Lösung: Das System muss festhalten, welches Modell tatsächlich geantwortet hat, und es anzeigen. Ein Router, den Sie nicht prüfen können, ist von einem kaputten nicht zu unterscheiden.',
          ],
        },
        {
          id: 'in-clawai',
          heading: 'Wie ClawAI es macht',
          paragraphs: [
            'ClawAI hat {routingModeCount} Routing-Modi. Auto liest die Anfrage und wählt. Manuell fixiert ein Modell. Nur-lokal hält die gesamte Kette auf Modellen, die auf Ihrer Hardware laufen. Datenschutz zuerst bevorzugt lokal und weigert sich, das stillschweigend zu verlassen. Die übrigen neigen die Wahl zu geringerer Latenz, stärkerem Reasoning oder niedrigeren Kosten.',
            'Jede Antwort hält das Modell fest, das sie erzeugt hat — eine automatische Entscheidung ist prüfbar statt Vertrauenssache.',
          ],
        },
      ],
      faq: [
        {
          question: 'Verschlechtert Routing die Antwortqualität?',
          answer:
            'Es kann, wenn die Richtlinie nicht zur Anfrage passt. Deshalb wählen Sie den Modus und deshalb wird das antwortende Modell angezeigt. Routing, das Sie sehen und übergehen können, ist eine Kostenkontrolle; Routing, das Sie nicht sehen, ist eine Herabstufung.',
        },
        {
          question: 'Kann ein Router Daten vollständig von Cloud-Anbietern fernhalten?',
          answer:
            'Nur wenn er ablehnen darf, statt auszuweichen. Ein Nur-lokal-Modus, dessen Fallback-Kette einen Cloud-Anbieter erreicht, ist keine Datenschutzkontrolle. ClawAIs Nur-lokal-Modus hält seine Kette auf lokalen Anbietern.',
        },
        {
          question: 'Lohnt sich Routing für eine Einzelperson?',
          answer:
            'Meist ja, eher wegen der Kosten als wegen der Verlässlichkeit. Die meisten individuellen Arbeitslasten bestehen überwiegend aus Routinefragen mit wenigen schweren; die Routinefragen an ein günstigeres Modell zu geben ist der größte Hebel auf eine persönliche KI-Rechnung.',
        },
      ],
      productNote:
        'ClawAI liefert {routingModeCount} Routing-Modi und zeigt das gewählte Modell an jeder Nachricht — Sie können den Router prüfen, statt ihm zu vertrauen.',
    },
    [LearnTopic.WHAT_IS_MODEL_FALLBACK]: {
      seo: {
        title: 'Was ist Modell-Fallback?',
        description:
          'Fallback ist, was geschieht, wenn das erste Modell ausfällt — offline, gedrosselt oder ablehnend. Wie Fallback-Ketten arbeiten und warum stiller Fallback gefährlich ist.',
        keywords: ['Modell-Fallback', 'LLM-Failover', 'KI-Verlässlichkeit'],
      },
      eyebrow: 'Routing',
      title: 'Was ist Modell-Fallback?',
      summary:
        'Fallback ist die Antwort auf „was passiert, wenn das gewünschte Modell nicht verfügbar ist“. Anbieter haben Ausfälle, Ratenbegrenzungen, inhaltliche Ablehnungen und Zeitüberschreitungen. Eine Fallback-Kette ist eine geordnete Liste dessen, was als Nächstes versucht wird — und diese Reihenfolge kodiert, worauf Sie zu verzichten bereit sind.',
      sections: [
        {
          id: 'why-needed',
          heading: 'Warum das nicht optional ist',
          paragraphs: [
            'Ein Ablauf mit einem einzigen Anbieter erbt dessen Verfügbarkeit exakt. Besonders Ratenbegrenzungen sind keine seltenen Ereignisse — sie sind die normale Folge einer belebten Stunde — und ein Ablauf ohne Fallback bleibt schlicht stehen.',
            'Fallback verwandelt einen harten Fehler in eine verschlechterte Antwort. Ob das eine Verbesserung ist, hängt vollständig davon ab, ob man es Ihnen sagt.',
          ],
        },
        {
          id: 'what-to-fall-back-to',
          heading: 'Die Reihenfolge wählen',
          paragraphs: [
            'Die naheliegende Reihenfolge ist „das nächstbeste Modell“, aber die ist oft falsch. Scheiterte die erste Wahl, weil die Anfrage zu lang war, scheitert ein kleineres Modell ebenso. Lehnte sie aus inhaltlichen Gründen ab, lehnt ein ähnliches ähnlich ab.',
            'Eine nützlichere Reihenfolge ändert etwas Strukturelles: einen ganz anderen Anbieter oder ein lokales Modell mit anderen Regeln statt eines Geschwisters, das genauso scheitert.',
          ],
        },
        {
          id: 'silent-fallback',
          heading: 'Die gefährliche Variante',
          paragraphs: [
            'Stiller Fallback ist ein System, das klammheimlich mit einem anderen Modell antwortet und nichts sagt. Sie bekommen eine schlechtere Antwort, schreiben sie in Gedanken dem gewählten Modell zu und ziehen einen falschen Schluss über dieses Modell.',
            'Überschreitet der Fallback eine Datenschutzgrenze, ist es schlimmer als ein falscher Schluss. Von einem lokalen Modell zu einem Cloud-Anbieter zu wechseln schickt Daten genau dorthin, wohin die Nutzerin sie ausdrücklich nicht schicken wollte. Eine Kette, die die lokale Ausführung verlassen kann, sollte eine sein, der ausdrücklich zugestimmt wurde.',
          ],
        },
        {
          id: 'in-clawai',
          heading: 'Wie ClawAI es macht',
          paragraphs: [
            'Routing-Modi definieren eigene Ketten, und der Nur-lokal-Modus hält seine auf lokalen Anbietern, statt nach einem Cloud-Modell zu greifen, wenn das lokale ausgelastet ist. Jede Nachricht hält das tatsächlich antwortende Modell fest, sodass ein Fallback im Nachhinein sichtbar ist statt aus einem Tonwechsel erschlossen.',
          ],
        },
      ],
      faq: [
        {
          question: 'Ist Fallback dasselbe wie ein Wiederholungsversuch?',
          answer:
            'Ein Wiederholungsversuch schickt dieselbe Anfrage an dasselbe Modell, was bei einem vorübergehenden Fehler hilft. Fallback wechselt das Modell, was hilft, wenn das erste die Anfrage überhaupt nicht bedienen kann. Robuste Systeme tun beides, in dieser Reihenfolge.',
        },
        {
          question: 'Sollte Fallback jemals von lokal in die Cloud wechseln?',
          answer:
            'Nur wenn die Nutzerin darum gebeten hat. Lokale Ausführung wird meist aus einem Grund gewählt, den ein Fallback nicht wahren kann — sicher ist daher, zu scheitern und es zu sagen, statt woanders zu gelingen.',
        },
        {
          question: 'Wie viele Modelle sollte eine Kette haben?',
          answer:
            'Zwei oder drei genügen meist. Lange Ketten fügen vor allem Latenz hinzu, weil jeder gescheiterte Versuch in Zeit bezahlt wird, bevor der nächste beginnt.',
        },
      ],
      productNote:
        'ClawAIs Routing-Modi tragen eigene Fallback-Ketten, und Nur-lokal hält seine lokal, statt stillschweigend einen Cloud-Anbieter zu erreichen.',
    },
    [LearnTopic.WHAT_IS_AI_CONSENSUS]: {
      seo: {
        title: 'Was ist KI-Konsens?',
        description:
          'Konsens stellt mehreren Modellen dieselbe Frage und wertet ihre Übereinstimmung als Signal. Was Übereinstimmung aussagt und was nicht, und wann die Kosten gerechtfertigt sind.',
        keywords: ['KI-Konsens', 'Modell-Übereinstimmung', 'LLM-Ensemble'],
      },
      eyebrow: 'Orchestrierung',
      title: 'Was ist KI-Konsens?',
      summary:
        'Konsens schickt einen Prompt durch mehrere Modelle und vergleicht die Antworten. Wo sie übereinstimmen, haben Sie ein schwaches Signal, dass die Antwort kein Artefakt eines einzelnen Modells ist. Wo sie auseinandergehen, haben Sie etwas Nützlicheres: einen Hinweis, dass die Frage schwerer war als sie aussah.',
      sections: [
        {
          id: 'what-agreement-means',
          heading: 'Was Übereinstimmung wirklich aussagt',
          paragraphs: [
            'Übereinstimmung ist ein Beleg, kein Beweis. Modelle, die auf überlappenden Daten trainiert wurden, teilen Verzerrungen und können selbstbewusst in dieselbe Richtung falsch liegen. Dass drei Modelle sich auf eine falsche Tatsache einigen, ist ein häufiges Ergebnis, kein seltenes.',
            'Das Signal ist stärker, wenn die Modelle wirklich verschieden sind — andere Anbieter, anderes Training, andere Größe. Konsens über drei Varianten derselben Familie ist beinahe wertlos.',
          ],
        },
        {
          id: 'disagreement-is-the-value',
          heading: 'Uneinigkeit ist die nützlichere Ausgabe',
          paragraphs: [
            'Der praktische Wert von Konsens liegt meist im negativen Fall. Wenn Modelle auseinandergehen, haben Sie eine Frage gefunden, die einen Menschen braucht — und die günstig zu finden ist mehr wert als ein marginaler Zuwachs an Zuversicht bei den ohnehin leichten Fragen.',
            'Das verschiebt, wann man ihn einsetzt. Konsens ist keine Qualitätsverbesserung für alles; er ist ein Triage-Werkzeug für die Stellen, an denen Irren teuer ist.',
          ],
        },
        {
          id: 'the-cost',
          heading: 'Die Kosten',
          paragraphs: [
            'Drei Modelle zu betreiben kostet etwa das Dreifache an Token und dauert so lange wie das langsamste. Bei einer Routinefrage ist das reine Verschwendung. Bei einer Vertragsklausel, einem Migrationsplan oder einer medizinischen Zusammenfassung, nach der Sie handeln wollen, ist es günstig.',
          ],
        },
        {
          id: 'when-not-to',
          heading: 'Wann man ihn nicht nutzt',
          paragraphs: [
            'Nutzen Sie keinen Konsens für Fragen mit prüfbarer Antwort. Wenn Code entweder kompiliert oder nicht, führen Sie ihn aus — das ist ein stärkeres Signal als drei übereinstimmende Modelle. Konsens ist für Ermessensfragen, für die es keine günstige externe Prüfung gibt.',
          ],
        },
      ],
      faq: [
        {
          question: 'Wie viele Modelle brauche ich?',
          answer:
            'Drei ist die übliche Wahl, weil zwei nur übereinstimmen oder nicht können, während drei die Form einer Uneinigkeit zeigen. Mehr als drei ändert selten die Entscheidung und vervielfacht die Rechnung.',
        },
        {
          question: 'Verhindert Konsens Halluzinationen?',
          answer:
            'Nein. Er fängt Halluzinationen ab, die einem Modell eigen sind, und übersieht jene, die mehrere teilen. Er ist ein Filter, keine Garantie.',
        },
        {
          question: 'Ist das dasselbe wie Best-of-N?',
          answer:
            'Nein. Konsens vergleicht Antworten verschiedener Modelle auf Übereinstimmung. Best-of-N erzeugt mehrere Kandidaten und wählt einen. Konsens misst Übereinstimmung; Best-of-N wählt Qualität.',
        },
      ],
      productNote:
        'Konsens ist einer von ClawAIs {orchestrationLabCount} Orchestrierungsmodi, und jeder Lauf hält fest, welche Modelle er nutzte und was er kostete.',
    },
    [LearnTopic.WHAT_IS_BEST_OF_N]: {
      seo: {
        title: 'Was ist Best-of-N-Sampling?',
        description:
          'Best-of-N erzeugt mehrere Antwortkandidaten und behält den besten. Wie Kandidaten gewählt werden, warum der Selektor wichtiger ist als N und wann es einen guten Prompt schlägt.',
        keywords: ['Best of N', 'Kandidaten-Sampling', 'Antwortauswahl'],
      },
      eyebrow: 'Orchestrierung',
      title: 'Was ist Best-of-N?',
      summary:
        'Best-of-N fordert mehrere Antworten auf denselben Prompt an und behält eine. Es nutzt aus, dass Modellausgaben zwischen Läufen schwanken: Ein Modell, das sieben von zehn Mal gut antwortet, liefert bei drei Versuchen meist mindestens eine gute Antwort. Die Technik steht und fällt damit, wie Sie den Sieger wählen.',
      sections: [
        {
          id: 'why-it-works',
          heading: 'Warum es überhaupt funktioniert',
          paragraphs: [
            'Die Ausgabe eines Sprachmodells wird gesampelt, nicht deterministisch erzeugt. Zwei Läufe desselben Prompts liefern unterschiedliche Antworten unterschiedlicher Qualität. Überwiegen die guten Antworten des Modells die schlechten, erhöht mehrfaches Sampling die Chance, dass mindestens eine gut ist.',
            'Das ist der ganze Mechanismus. Er macht das Modell nicht klüger; er gibt Ihnen mehr Versuche auf dessen bestehendes Können.',
          ],
        },
        {
          id: 'the-selector',
          heading: 'Den Sieger zu wählen ist der schwere Teil',
          paragraphs: [
            'Kandidaten zu erzeugen ist leicht. Zwischen ihnen zu wählen ist das eigentliche Problem, und dort liegt der meiste Wert der Technik und ihr meistes Scheitern.',
            'Auswahl durch eine automatische Prüfung — kompiliert es, bestehen die Tests, erfüllt es das Schema — ist mit Abstand am verlässlichsten, weil die Prüfung unabhängig vom Modell ist. Auswahl durch ein anderes Modell ist ein Judge mit allen Vorbehalten jener Seite. Auswahl durch einen Menschen ist am genauesten und am wenigsten skalierbar.',
          ],
        },
        {
          id: 'choosing-n',
          heading: 'N wählen',
          paragraphs: [
            'Der Ertrag fällt schnell ab. Von einem Kandidaten auf drei ist eine große Verbesserung; von drei auf zehn eine kleine zum mehr als dreifachen Preis. Die meisten praktischen Anwendungen liegen bei drei bis fünf.',
            'N vervielfacht die Kosten exakt. Fünf Kandidaten sind fünfmal die Generierungstoken, plus was die Auswahl kostet.',
          ],
        },
        {
          id: 'when-not-to',
          heading: 'Wann man es nicht nutzt',
          paragraphs: [
            'Haben Sie keine Möglichkeit, eine gute von einer schlechten Antwort zu unterscheiden, kann Best-of-N Ihnen nicht helfen — Sie wählen zufällig aus einem größeren Topf und zahlen mehr dafür. Sein natürliches Zuhause ist Arbeit mit objektiver Prüfung: Code, strukturierte Ausgaben, alles, was entweder parst oder nicht.',
          ],
        },
      ],
      faq: [
        {
          question: 'Ist Best-of-N dasselbe wie eine höhere Temperatur?',
          answer:
            'Nein, auch wenn beides zusammenwirkt. Temperatur steuert, wie unterschiedlich jede Antwort ausfällt. Best-of-N geht darum, wie viele Sie nehmen und wie Sie wählen. Etwas Vielfalt hilft, denn identische Kandidaten geben nichts zu wählen.',
        },
        {
          question: 'Kann ich verschiedene Modelle für die Kandidaten nutzen?',
          answer:
            'Ja, und es hilft oft — Modelle scheitern unterschiedlich, der Topf ist also vielfältiger als wiederholte Stichproben aus einem. An dem Punkt sind Sie nahe am Konsens, mit Auswahl statt Übereinstimmung.',
        },
        {
          question: 'Hilft es bei faktischer Genauigkeit?',
          answer:
            'Nur wenn Ihr Selektor faktische Fehler erkennen kann. Ohne externe Prüfung wählen Sie zwischen selbstbewussten Antworten, und Selbstbewusstsein ist nicht Genauigkeit.',
        },
      ],
      productNote:
        'Best-of-N ist einer von ClawAIs {orchestrationLabCount} Orchestrierungsmodi, und jeder erzeugte Kandidat wird gegen die Kosten des Laufs festgehalten.',
    },
    [LearnTopic.WHAT_IS_AN_AI_JUDGE]: {
      seo: {
        title: 'Was ist ein KI-Judge?',
        description:
          'Ein KI-Judge ist ein Modell, das die Antworten anderer Modelle bewertet. Wozu er dient, welche Verzerrungen er trägt und warum er keine echte Prüfung ersetzt.',
        keywords: ['KI-Judge', 'LLM als Judge', 'Antwortbewertung'],
      },
      eyebrow: 'Orchestrierung',
      title: 'Was ist ein KI-Judge?',
      summary:
        'Ein Judge ist ein Modell mit einer anderen Aufgabe: Statt die Frage zu beantworten, liest es Antworten und bewertet sie. So wird die meiste automatische Auswahl zwischen Kandidaten getroffen — und er trägt eine Reihe gut dokumentierter und leicht vergessener Verzerrungen.',
      sections: [
        {
          id: 'what-it-does',
          heading: 'Was ein Judge tut',
          paragraphs: [
            'Ein Judge erhält die ursprüngliche Frage und zwei oder mehr Antworten und liefert eine Rangfolge oder Bewertung, meist mit Begründung. Er ist der Auswahlschritt bei Best-of-N und der Schlichtungsschritt, wenn Modelle uneins sind.',
            'Der Reiz liegt auf der Hand: Er skaliert, wie menschliche Prüfung es nicht tut, und ist weit günstiger als die Person, für die er einspringt.',
          ],
        },
        {
          id: 'the-biases',
          heading: 'Die Verzerrungen, die konsistent sind',
          paragraphs: [
            'Judges bevorzugen längere Antworten gegenüber kürzeren, selbst wenn die kürzere vollständig ist. Sie bevorzugen selbstsichere Formulierungen gegenüber vorsichtigen, ob berechtigt oder nicht. Sie reagieren auf die Reihenfolge, in der Kandidaten präsentiert werden. Und ein Modell, das seine eigene Ausgabe bewerten soll, neigt dazu, sie zu bevorzugen.',
            'Nichts davon ist subtil, und alles ist beherrschbar — Reihenfolge mischen, ein anderes Modell als Judge und als Autor einsetzen, konkrete Kriterien statt einer allgemeinen Präferenz verlangen. Aber es muss bewusst gesteuert werden, denn die Standardkonfiguration zeigt alle vier.',
          ],
        },
        {
          id: 'not-a-check',
          heading: 'Ein Judge ist kein Verifizierer',
          paragraphs: [
            'Ein Judge vergleicht Antworten miteinander. Er vergleicht sie nicht mit der Wirklichkeit. Bei drei falschen Antworten wird er sie selbstbewusst ordnen, und der Sieger bleibt falsch.',
            'Wo eine externe Prüfung existiert — Tests, ein Schema, eine Suche — schlägt diese Prüfung einen Judge, weil sie unabhängig vom Geprüften ist. Ein Judge ist das, was Sie nutzen, wenn es keine solche Prüfung gibt.',
          ],
        },
      ],
      faq: [
        {
          question: 'Sollte der Judge das stärkste Modell sein?',
          answer:
            'Meist ein starkes, und vorzugsweise nicht dasselbe, das die Kandidaten geschrieben hat. Selbstbevorzugung ist real, und die günstigste Abhilfe ist ein anderes Modell.',
        },
        {
          question: 'Kann ein Judge eine einzelne Antwort bewerten?',
          answer:
            'Er kann, aber vergleichendes Urteilen ist verlässlicher als absolutes Bewerten. Modelle sind besser bei „welche davon ist besser“ als bei „ist das eine 7 oder eine 8“.',
        },
        {
          question: 'Woher weiß ich, dass der Judge richtig liegt?',
          answer:
            'Prüfen Sie ihn stichprobenartig gegen Ihr eigenes Urteil. Wenn Sie nie prüfen, haben Sie das Vertrauen verschoben statt es verdient.',
        },
      ],
      productNote:
        'ClawAI führt das Judging als eigene Fläche über einem Vergleichslauf aus — eine bewertete Antwort hält sowohl die Modelle fest, die die Kandidaten schrieben, als auch das, welches sie bewertete.',
    },
    [LearnTopic.WHAT_IS_AI_ANSWER_VERIFICATION]: {
      seo: {
        title: 'Was ist Antwortverifikation bei KI?',
        description:
          'Verifikation prüft eine Antwort gegen etwas anderes als das Modell, das sie erzeugt hat. Warum Unabhängigkeit alles ist und was eine Selbstprüfung wirklich wert ist.',
        keywords: ['KI-Verifikation', 'Antworten prüfen', 'LLM-Genauigkeit'],
      },
      eyebrow: 'Orchestrierung',
      title: 'Was ist Antwortverifikation bei KI?',
      summary:
        'Verifikation heißt, eine erzeugte Antwort gegen eine Quelle zu prüfen, die nicht der Erzeuger ist. Das Schlüsselwort ist unabhängig: Ein Modell, das seine eigene Antwort prüft, teilt die Überlegung, die den Fehler hervorbrachte — deshalb fangen Selbstprüfungen weit weniger ab, als man erwartet.',
      sections: [
        {
          id: 'independence',
          heading: 'Unabhängigkeit ist die ganze Idee',
          paragraphs: [
            'Erfindet ein Modell eine Tatsache aufgrund von etwas in seinem Training, dann befragt die Frage an dasselbe Modell, ob die Tatsache stimmt, genau die Quelle, die sie erfunden hat. Prüfung und Fehler haben eine gemeinsame Ursache, also besteht die Prüfung.',
            'Ein nützlicher Verifizierer ändert etwas. Ein anderes Modell, eine Suche in echten Dokumenten, ein Compiler, eine Testsuite, ein Schemavalidator. Je verschiedener der Prüfer vom Erzeuger ist, desto mehr kann er abfangen.',
          ],
        },
        {
          id: 'kinds',
          heading: 'Arten der Verifikation, von schwach nach stark',
          paragraphs: [
            'Selbstprüfung: Das Modell liest seine Antwort erneut. Günstig, fängt vor allem Formatierung und innere Widersprüche ab. Modellübergreifende Prüfung: Ein anderes Modell prüft. Besser, fängt Fehler ab, die dem ersten eigen sind. Retrieval: Die Aussage wird gegen abgerufene Dokumente geprüft. Stark bei Tatsachenaussagen. Ausführung: Der Code läuft, das Schema validiert, die Tests bestehen. Am stärksten, und nur verfügbar, wo die Antwort ausführbar ist.',
            'Das Muster: Stärke folgt der Unabhängigkeit vom Modell, Verfügbarkeit läuft in die andere Richtung — die stärksten Prüfungen gibt es nur für bestimmte Arten von Arbeit.',
          ],
        },
        {
          id: 'repair',
          heading: 'Verifikation und Reparatur',
          paragraphs: [
            'Ein Verifizierer, der nur ein Problem meldet, lässt Sie dort, wo Sie waren. In der Praxis wird Verifikation meist mit Reparatur gepaart: Der Fehler und sein Grund gehen zurück an ein Modell, das eine korrigierte Antwort erzeugt, die erneut geprüft wird.',
            'Diese Schleife braucht eine Grenze. Ohne sie erzeugt ein Modell, das das Problem nicht lösen kann, immer weiter Varianten derselben falschen Antwort zum vollen Preis.',
          ],
        },
      ],
      faq: [
        {
          question: 'Hilft es, ein Modell um Gegenprüfung zu bitten?',
          answer:
            'Ein wenig, und vor allem bei innerer Widersprüchlichkeit statt bei Tatsachenfehlern. Es ist die schwächste Form der Verifikation und die, der man am leichtesten zu viel zutraut.',
        },
        {
          question: 'Ist Retrieval-Verifikation dasselbe wie RAG?',
          answer:
            'Sie nutzen dieselbe Mechanik in entgegengesetzter Richtung. RAG ruft vor dem Erzeugen ab, um die Antwort zu informieren. Retrieval-Verifikation ruft danach ab, um sie zu prüfen.',
        },
        {
          question: 'Wie viele Reparaturversuche sind sinnvoll?',
          answer:
            'Ein oder zwei. Hat ein Modell es beim zweiten nicht behoben, sind weitere Versuche meist Umformulierungen desselben Fehlers, und ein Mensch sollte hinsehen.',
        },
      ],
      productNote:
        'Verifikation und Reparatur sind zwei von ClawAIs {orchestrationLabCount} Orchestrierungsmodi, und beide werden pro Versuch gemessen — eine Reparaturschleife kann keine unsichtbare Rechnung auflaufen lassen.',
    },
    [LearnTopic.WHAT_IS_A_CONTEXT_WINDOW]: {
      seo: {
        title: 'Was ist ein Kontextfenster?',
        description:
          'Ein Kontextfenster ist, wie viel Text ein Modell in einer Anfrage berücksichtigen kann. Warum es kein Gedächtnis ist, warum Füllen die Qualität senkt und wie es die Kosten treibt.',
        keywords: ['Kontextfenster', 'LLM-Token', 'langer Kontext'],
      },
      eyebrow: 'Kontext',
      title: 'Was ist ein Kontextfenster?',
      summary:
        'Das Kontextfenster ist die gesamte Textmenge, die ein Modell in einer einzelnen Anfrage halten kann — Ihr Prompt, das bisherige Gespräch, angehängte Dokumente und die entstehende Antwort. Es wird in Token gemessen und setzt sich zwischen Anfragen vollständig zurück.',
      sections: [
        {
          id: 'not-memory',
          heading: 'Es ist kein Gedächtnis',
          paragraphs: [
            'Ein Modell erinnert sich nicht an Ihr letztes Gespräch. Die Illusion von Gedächtnis entsteht, weil die Anwendung die früheren Nachrichten bei jeder neuen Anfrage erneut mitschickt. Das Fenster ist Arbeitsfläche für einen Aufruf, kein Speicher.',
            'Daraus folgt unmittelbar etwas, das viele überrascht: Ein langes Gespräch wird mit jeder Nachricht teurer, weil der gesamte Verlauf jedes Mal erneut gesendet und erneut berechnet wird.',
          ],
        },
        {
          id: 'filling-it',
          heading: 'Ein volles Fenster ist kein gut genutztes',
          paragraphs: [
            'Ein großes Fenster ist ein Spielraum, kein Ziel. Modelle achten über einen langen Kontext hinweg ungleichmäßig: Material in der Mitte einer sehr langen Eingabe wird eher beiläufig behandelt als Material an beiden Enden.',
            'In der Praxis schlagen zehn fokussierte Seiten meist zweihundert unfokussierte. Retrieval existiert genau dafür — diese zehn Seiten auszuwählen, statt alles zu schicken und zu hoffen.',
          ],
        },
        {
          id: 'cost',
          heading: 'Wie es die Kosten treibt',
          paragraphs: [
            'Fast alle Anbieter rechnen pro Token ab, Eingabe und Ausgabe getrennt, wobei Eingabe meist günstiger ist. Ein großes Dokument, das an jede Nachricht eines langen Gesprächs angehängt ist, wird bei jeder Nachricht berechnet, nicht einmal.',
            'Das ist die häufigste Ursache einer überraschenden Rechnung, und die Lösung ist strukturell: Hängen Sie an, was die Frage braucht, statt alles, was relevant sein könnte.',
          ],
        },
      ],
      faq: [
        {
          question: 'Ist ein größeres Kontextfenster immer besser?',
          answer:
            'Es nimmt eine Grenze weg, was gut ist, verbessert aber nicht, wie gut das Modell nutzt, was es bekommt. Ein größeres Fenster erkauft vor allem die Möglichkeit, einen teureren Fehler zu machen.',
        },
        {
          question: 'Was ist ein Token?',
          answer:
            'Ungefähr ein Wortfragment. Englischer Text ergibt im Schnitt etwa drei Viertel Wort pro Token, tausend Token sind also rund siebenhundertfünfzig Wörter — das schwankt aber nach Sprache, und nicht-lateinische Schriften brauchen oft mehr Token pro Wort.',
        },
        {
          question: 'Was passiert, wenn ich es überschreite?',
          answer:
            'Die Anfrage schlägt fehl, oder die Anwendung verwirft still die ältesten Nachrichten. Letzteres ist häufiger und verwirrender, weil das Modell etwas zu vergessen scheint, das Sie gesagt haben.',
        },
      ],
      productNote:
        'ClawAI hält fest, wie viele Token jede Nachricht verbraucht hat — ein Gespräch, das teuer wird, ist vor der Rechnung sichtbar statt danach.',
    },
    [LearnTopic.WHAT_IS_RAG]: {
      seo: {
        title: 'Was ist RAG (Retrieval-Augmented Generation)?',
        description:
          'RAG ruft passende Passagen aus Ihren Dokumenten ab und legt sie dem Modell vor. Wie Chunking und Retrieval-Qualität entscheiden, ob es funktioniert.',
        keywords: ['RAG', 'Retrieval-Augmented Generation', 'Dokumenten-KI'],
      },
      eyebrow: 'Kontext',
      title: 'Was ist Retrieval-Augmented Generation?',
      summary:
        'RAG heißt, in eigenen Dokumenten nach Passagen zu suchen, die zu einer Frage passen, und diese Passagen in die Anfrage aufzunehmen. Das Modell antwortet aus Material, das Sie geliefert haben, statt aus dem Gedächtnis — deshalb kann es über Dokumente sprechen, mit denen es nie trainiert wurde.',
      sections: [
        {
          id: 'how-it-works',
          heading: 'Wie es funktioniert',
          paragraphs: [
            'Dokumente werden in Abschnitte geteilt, und jeder Abschnitt wird in einen Vektor umgewandelt — eine numerische Darstellung seiner Bedeutung. Die Frage wird genauso umgewandelt, und die Abschnitte mit den nächstliegenden Vektoren werden abgerufen.',
            'Diese Abschnitte werden in den Prompt eingefügt, meist mit der Anweisung, daraus zu antworten. Das Modell leistet die Sprachar­beit; das Retrieval leistet das Wissen.',
          ],
        },
        {
          id: 'retrieval-quality',
          heading: 'Die Retrieval-Qualität ist das ganze System',
          paragraphs: [
            'Wird die richtige Passage nicht abgerufen, kann kein Modell die Antwort retten — es antwortet aus Allgemeinwissen und klingt genauso selbstsicher. Die meisten enttäuschenden RAG-Systeme sind Retrieval-Probleme im Generierungskostüm.',
            'Beim Chunking entscheidet sich das. Zu kleine Abschnitte verlieren den Kontext, der sie bedeutsam machte; zu große verwässern jeweils die Übereinstimmung. Nach Dokumentstruktur zu teilen — Abschnitte, Überschriften — schlägt meist das Teilen nach fester Länge.',
          ],
        },
        {
          id: 'what-it-fixes',
          heading: 'Was es behebt und was nicht',
          paragraphs: [
            'RAG behebt „das Modell hat meine Dokumente nie gesehen“. Es verringert Halluzinationen bei Fragen, die die Dokumente beantworten, weil die Antwort dem Modell vorliegt.',
            'Es behebt kein Reasoning und hindert das Modell nicht daran, aus dem Gedächtnis zu antworten, wenn das Retrieval nichts Brauchbares liefert. Erdung ist eine starke Tendenz, keine Garantie, und der Fehlerfall ist eine selbstsichere Antwort ohne Quelle.',
          ],
        },
      ],
      faq: [
        {
          question: 'Ist RAG dasselbe wie Fine-Tuning?',
          answer:
            'Nein, und beide lösen andere Probleme. Fine-Tuning ändert, wie sich ein Modell verhält; RAG ändert, was es für eine Anfrage weiß. Für „beantworte Fragen zu meinen Dokumenten“ ist RAG fast immer das richtige Werkzeug und weit günstiger aktuell zu halten.',
        },
        {
          question: 'Machen große Kontextfenster RAG überflüssig?',
          answer:
            'Nein. Sie können mehr hineinkopieren, zahlen aber jedes Token bei jeder Nachricht, und Modelle achten bei sehr langen Eingaben ungleichmäßig. Retrieval ist zudem der einzige Ansatz, der über das hinausskaliert, was in irgendein Fenster passt.',
        },
        {
          question: 'Schickt RAG meine Dokumente an den Modellanbieter?',
          answer:
            'Die abgerufenen Passagen ja — so sieht das Modell sie. Ist das inakzeptabel, muss das Modell an einem Ort laufen, den Sie kontrollieren, und genau dafür gibt es lokale Ausführung.',
        },
      ],
      productNote:
        'ClawAI ruft aus Dateien ab, die Sie anhängen, und kombiniert das mit lokaler Ausführung, sodass die abgerufenen Passagen auf Ihrer eigenen Hardware bleiben können.',
    },
    [LearnTopic.WHAT_IS_AI_MEMORY]: {
      seo: {
        title: 'Was ist KI-Gedächtnis?',
        description:
          'KI-Gedächtnis ist, was ein Assistent zwischen Gesprächen behält. Der Unterschied zum Kontextfenster, was es an Token kostet und welche Datenschutzfrage es aufwirft.',
        keywords: ['KI-Gedächtnis', 'persistenter Kontext', 'Assistenten-Gedächtnis'],
      },
      eyebrow: 'Kontext',
      title: 'Was ist KI-Gedächtnis?',
      summary:
        'Gedächtnis ist die Anwendung, die Tatsachen über Sie speichert und sie in spätere Gespräche wieder einbringt. Das Modell selbst erinnert sich zwischen Anfragen an nichts; Gedächtnis ist eine Funktion darum herum, mit Kosten und einer Datenschutzform, die man vor dem Einschalten verstehen sollte.',
      sections: [
        {
          id: 'mechanism',
          heading: 'Wie es tatsächlich funktioniert',
          paragraphs: [
            'Die Anwendung entscheidet, dass etwas behaltenswert ist — eine Vorliebe, eine Tatsache, eine dauerhafte Anweisung — und schreibt es auf. In einem späteren Gespräch wählt sie die passenden Einträge und fügt sie der Anfrage hinzu, bevor das Modell sie sieht.',
            'Gedächtnis ist also Retrieval über einem Speicher von Tatsachen über Sie, nicht etwas, das im Modell geschieht. Das heißt, es ist nur so gut wie die Entscheidungen darüber, was behalten und was wieder eingebracht wird.',
          ],
        },
        {
          id: 'cost',
          heading: 'Es ist nicht kostenlos',
          paragraphs: [
            'Jede erinnerte Tatsache, die in ein Gespräch zurückkommt, sind Eingabe-Token, berechnet bei jeder Nachricht, die sie trägt. Ein großes Gedächtnis, das wahllos eingespielt wird, ist eine dauerhafte Steuer auf jedes Gespräch.',
            'Gute Umsetzungen sind wählerisch: Sie bringen zurück, was für dieses Gespräch relevant ist, statt alles, was sie wissen.',
          ],
        },
        {
          id: 'privacy',
          heading: 'Die Datenschutzfrage',
          paragraphs: [
            'Gedächtnis bedeutet einen dauerhaften Speicher persönlicher Tatsachen — eine andere Datenschutzlage als ein Gespräch, das Sie löschen können. Die lohnenden Fragen sind, wo er liegt, ob Sie ihn vollständig lesen können, ob Sie einzelne Einträge löschen können und ob er beim Wiedereinbringen an einen Modellanbieter geht.',
            'Die letzte wird übersehen. Eine erinnerte Tatsache, die in einen Prompt eingefügt wird, geht dorthin, wohin dieser Prompt geht.',
          ],
        },
      ],
      faq: [
        {
          question: 'Trainiert Gedächtnis das Modell mit meinen Daten?',
          answer:
            'Für sich genommen nicht. Gedächtnis setzt Text in einen Prompt; Training ändert Modellgewichte. Ob ein Anbieter auf Prompts trainiert, ist eine eigene Frage und hängt von dessen Bedingungen ab.',
        },
        {
          question: 'Warum erinnert der Assistent etwas falsch?',
          answer:
            'Weil er etwas notiert hat, das einmal stimmte, oder eine beiläufige Bemerkung als dauerhafte Vorliebe gelesen hat. Den Speicher direkt lesen und bearbeiten zu können ist die einzige echte Abhilfe.',
        },
        {
          question: 'Ist Gedächtnis dasselbe wie ein langes Gespräch?',
          answer:
            'Nein. Ein langes Gespräch behält alles und bezahlt bei jeder Nachricht dafür. Gedächtnis behält ausgewählte Tatsachen und überdauert das Ende des Gesprächs.',
        },
      ],
      productNote:
        'Gedächtnis in ClawAI ist eine gespeicherte, einsehbare Menge von Einträgen statt eines undurchsichtigen Profils und lässt sich mit lokaler Ausführung koppeln, sodass Erinnertes auf Ihrer Hardware bleibt.',
    },
    [LearnTopic.WHAT_ARE_CONTEXT_PACKS]: {
      seo: {
        title: 'Was sind Kontextpakete?',
        description:
          'Kontextpakete sind wiederverwendbare Bündel, die Sie einem Gespräch bewusst beilegen. Der Unterschied zu Gedächtnis und RAG, und wann ein kuratiertes Bündel gewinnt.',
        keywords: ['Kontextpakete', 'wiederverwendbarer KI-Kontext', 'Prompt-Kontext'],
      },
      eyebrow: 'Kontext',
      title: 'Was sind Kontextpakete?',
      summary:
        'Ein Kontextpaket ist ein benanntes, wiederverwendbares Bündel aus Material — Anweisungen, Referenztexte, Dateien, Links — das Sie einem Gespräch bewusst beilegen. Es steht zwischen Gedächtnis, das das System für Sie wählt, und einem einmaligen Anhang, den Sie jedes Mal neu zusammenstellen.',
      sections: [
        {
          id: 'the-gap',
          heading: 'Die Lücke, die sie füllen',
          paragraphs: [
            'Gedächtnis ist automatisch: Das System entscheidet, was behalten und wann eingebracht wird — bequem und ungenau. Ein einmaliger Anhang ist genau und wegwerfbar: Nächste Woche sammeln Sie dieselben fünf Dokumente erneut.',
            'Ein Paket ist die Mitte: einmal bewusst zusammengestellt und angewandt, wenn Sie es wollen. Ihre Coding-Standards, die Terminologie Ihres Produkts, die Einschränkungen, die eine Arbeit einhalten muss.',
          ],
        },
        {
          id: 'what-goes-in',
          heading: 'Was hineingehört',
          paragraphs: [
            'Material, das stabil ist und das Sie sonst wieder erklären müssten: Hausstil, Fachvokabular, dauerhafte Vorgaben, die Form einer Ausgabe, die Sie immer wollen.',
            'Nicht hinein gehört alles, was sich pro Frage ändert. Ein Paket, das Sie bei jeder Nutzung bearbeiten, ist ein Prompt mit Zwischenschritten.',
          ],
        },
        {
          id: 'cost-and-discipline',
          heading: 'Kosten und Disziplin',
          paragraphs: [
            'Ein Paket sind Eingabe-Token bei jeder Nachricht, an der es hängt — ein großes, überall angewandtes Paket ist das Kostenproblem des Kontextfensters in neuer Form. Mehrere kleine, spezifische Pakete schlagen ein großes allgemeines.',
            'Weil ein Paket ausdrücklich ist, ist es auch prüfbar: Sie können genau lesen, was gesendet wird — was für ein Gedächtnis, das sich selbst zusammenstellt, nicht gilt.',
          ],
        },
      ],
      faq: [
        {
          question: 'Wie unterscheidet sich das von einem System-Prompt?',
          answer:
            'Ein System-Prompt ist meist ein einmal gesetzter Block von Anweisungen. Ein Paket ist ein benanntes Bündel, das Sie pro Gespräch anhängen und lösen, und es kann neben Anweisungen auch Dateien und Referenzen tragen.',
        },
        {
          question: 'Kann ich mehrere gleichzeitig nutzen?',
          answer:
            'Ja, und kleine zu kombinieren ist genau der Sinn — ein Sprachpaket plus ein Hausstil-Paket statt eines Bündels pro Projekt.',
        },
        {
          question: 'Ersetzen Pakete RAG?',
          answer:
            'Nein. Ein Paket wird von Hand kuratiert und immer mitgeschickt; Retrieval wählt pro Frage aus einem großen Korpus. Pakete passen zu stabilem Material, Retrieval zu Material, das zu groß zum Anhängen ist.',
        },
      ],
      productNote:
        'Kontextpakete in ClawAI sind wiederverwendbare Bündel, die Sie pro Gespräch anhängen — was das Modell erhält, ist etwas, das Sie zusammengestellt haben, nicht etwas über Sie Erschlossenes.',
    },
    [LearnTopic.WHAT_IS_LOCAL_AI]: {
      seo: {
        title: 'Was ist lokale KI?',
        description:
          'Lokale KI betreibt ein Modell auf Hardware, die Sie kontrollieren. Was sich bei Datenschutz und Kosten ändert, was sie an Hardware verlangt und wo sie wirklich mithält.',
        keywords: ['lokale KI', 'On-Premise-KI', 'private KI'],
      },
      eyebrow: 'Lokal und privat',
      title: 'Was ist lokale KI?',
      summary:
        'Lokale KI heißt, das Modell läuft auf einer Maschine, die Sie kontrollieren — Ihrem Laptop, Ihrem Server, Ihrem Rack — statt als Aufruf an fremde APIs. Der Prompt verlässt die Hardware nicht, was die Datenschutzfrage vollständig verändert und die Kostenfrage auf eine oft missverstandene Weise.',
      sections: [
        {
          id: 'what-changes',
          heading: 'Was sich ändert',
          paragraphs: [
            'Daten sind der eigentliche Grund. Ein Prompt an ein gehostetes Modell wird von diesem Anbieter unter dessen Bedingungen verarbeitet. Ein Prompt an ein lokales Modell wird nirgendwohin geschickt — die einzige Fassung dieser Zusage, die nicht von fremder Politik abhängt.',
            'Es entfällt zudem die Abrechnung pro Token, es entfallen Ratenbegrenzungen und die Möglichkeit, dass ein Modell unter Ihnen abgeschaltet wird. Ein heruntergeladenes Modell funktioniert weiter.',
          ],
        },
        {
          id: 'the-cost-shape',
          heading: 'Die Kostenform, nicht die Kosten',
          paragraphs: [
            'Lokale KI ist nicht automatisch günstiger. Sie wandelt variable Kosten in fixe: Sie kaufen oder mieten Hardware, danach ist Inferenz am Rand nahezu kostenlos.',
            'Bei hohem, stetigem Volumen ist das ein guter Handel, bei gelegentlicher Nutzung ein schlechter. Eine GPU, die den halben Tag stillsteht, ist teurer als die API-Aufrufe, die sie ersetzte.',
          ],
        },
        {
          id: 'the-honest-limits',
          heading: 'Die ehrlichen Grenzen',
          paragraphs: [
            'Modelle, die auf einer einzelnen Maschine bequem laufen, sind in der Regel nicht die größten verfügbaren. Bei den schwersten Reasoning-Aufgaben ist der Abstand zu einem gehosteten Frontier-Modell real.',
            'Für sehr viele Alltagsaufgaben — Zusammenfassen, Entwerfen, Extrahieren, Klassifizieren, Routine-Code — ist der Abstand viel kleiner als angenommen, und die Datenschutz- und Kosteneigenschaften wiegen oft schwerer als das letzte Stück Leistungsfähigkeit.',
          ],
        },
        {
          id: 'hybrid',
          heading: 'Am nützlichsten als Hybrid',
          paragraphs: [
            'Das übliche Muster ist weder nur lokal noch nur Cloud. Es ist lokal für alles Sensible oder Volumenstarke, gehostet für die schwersten Fragen, und eine Richtlinie, die entscheidet, was was ist — genau wofür ein Router da ist.',
          ],
        },
      ],
      faq: [
        {
          question: 'Welche Hardware brauche ich?',
          answer:
            'Das hängt ganz von Modellgröße und Quantisierung ab, und wer Ihnen eine einzelne Zahl nennt, rät. Die bestimmende Grenze ist der verfügbare Speicher: Die Gewichte müssen hineinpassen, und was hineinpasst, bestimmt, was Sie ausführen können.',
        },
        {
          question: 'Ist lokale KI per Definition privat?',
          answer:
            'Der Modellaufruf ja. Der Rest der Anwendung womöglich nicht — Suche, Telemetrie und andere Integrationen können weiterhin nach außen gehen. Datenschutz ist eine Eigenschaft des Gesamtsystems, nicht einer Komponente.',
        },
        {
          question: 'Können lokale Modelle meine Dokumente nutzen?',
          answer:
            'Ja. Retrieval funktioniert genauso, und wenn Retrieval und Modell lokal sind, verlassen die Dokumente Ihre Hardware zu keinem Zeitpunkt.',
        },
      ],
      productNote:
        'ClawAI betreibt lokale Modelle über Ollama und llama.cpp, und der Nur-lokal-Routing-Modus hält die gesamte Fallback-Kette bei lokalen Anbietern, statt nach einem Cloud-Modell zu greifen.',
    },
    [LearnTopic.WHAT_ARE_OPEN_WEIGHT_MODELS]: {
      seo: {
        title: 'Was sind Open-Weight-Modelle?',
        description:
          'Open-Weight-Modelle veröffentlichen ihre trainierten Parameter, sodass Sie sie selbst betreiben können. Was „offen“ abdeckt, was nicht und warum sich Lizenzen stark unterscheiden.',
        keywords: ['Open-Weight-Modelle', 'Open-Source-LLM', 'herunterladbare Modelle'],
      },
      eyebrow: 'Lokal und privat',
      title: 'Was sind Open-Weight-Modelle?',
      summary:
        'Ein Open-Weight-Modell ist eines, dessen trainierte Parameter veröffentlicht sind, sodass Sie es herunterladen und auf eigener Hardware betreiben können. Der Begriff ist präzise und bewusst enger als „Open Source“ — verfügbare Gewichte sagen nichts über Trainingsdaten, Code oder das, was die Lizenz erlaubt.',
      sections: [
        {
          id: 'what-open-covers',
          heading: 'Was „offen“ hier abdeckt',
          paragraphs: [
            'Offene Gewichte heißt, die Zahlen, die das trainierte Modell ausmachen, sind herunterladbar. Das genügt, um es auszuführen, feinzutunen, zu untersuchen und am Laufen zu halten, unabhängig davon, was der Herausgeber später tut.',
            'Es umfasst meist nicht die Trainingsdaten und oft nicht den Trainingscode. Ein Open-Weight-Modell ist also in dem Sinn reproduzierbar, dass Sie es ausführen können, nicht in dem, dass Sie es nachbauen könnten.',
          ],
        },
        {
          id: 'licences',
          heading: 'Die Lizenzen unterscheiden sich wirklich',
          paragraphs: [
            'Manche Open-Weight-Modelle tragen gewöhnliche permissive Lizenzen. Andere tragen Bedingungen: Beschränkungen kommerzieller Nutzung oberhalb einer Größenschwelle, Verbote bestimmter Anwendungen oder Auflagen zu Nennung und abgeleiteten Modellen.',
            'Das ist kommerziell bedeutsam und leicht zu überspringen. „Wir können es herunterladen“ und „wir dürfen es in unserem Produkt nutzen“ sind verschiedene Fragen, und nur die Lizenz beantwortet die zweite.',
          ],
        },
        {
          id: 'why-they-matter',
          heading: 'Warum sie zählen',
          paragraphs: [
            'Sie sind die einzigen Modelle, die Sie vollständig auf eigener Hardware betreiben können, und damit die Grundlage jedes lokalen und privaten Betriebs. Sie können Ihnen auch nicht unter den Füßen abgeschaltet werden — ein heruntergeladenes Modell läuft, solange Sie es behalten.',
            'Der Leistungsabstand zu den besten gehosteten Modellen ist real und deutlich kleiner geworden. Für einen großen Teil der Alltagsarbeit ist er nicht mehr ausschlaggebend.',
          ],
        },
      ],
      faq: [
        {
          question: 'Ist Open Weight dasselbe wie Open Source?',
          answer:
            'Nein. Open Source impliziert den Quelltext und die Freiheit, ihn zu nutzen und zu ändern. Open Weight heißt, die Parameter sind veröffentlicht — unter welcher Lizenz auch immer der Herausgeber gewählt hat, und die ist manchmal restriktiv.',
        },
        {
          question: 'Kann ich ein Open-Weight-Modell feintunen?',
          answer:
            'Technisch ja, das ist einer der Hauptgründe, die Gewichte zu wollen. Ob Sie dürfen und was Sie mit dem Ergebnis tun dürfen, ist eine Lizenzfrage und variiert je Modell.',
        },
        {
          question: 'Sind sie kommerziell unbedenklich?',
          answer:
            'Viele ja, manche nicht ohne Auflagen. Lesen Sie die konkrete Lizenz des konkreten Modells — das ist das Einzige in diesem Bereich, das sich wirklich nicht verallgemeinern lässt.',
        },
      ],
      productNote:
        'ClawAI betreibt Open-Weight-Modelle über Ollama und llama.cpp auf Ihrer Hardware, neben {cloudProviderCount} Cloud-Anbietern, wobei das Routing entscheidet, wer was übernimmt.',
    },
    [LearnTopic.WHAT_IS_SELF_HOSTED_AI]: {
      seo: {
        title: 'Was ist selbstgehostete KI?',
        description:
          'Selbstgehostete KI heißt, die gesamte Anwendung selbst zu betreiben, nicht nur das Modell. Was sie umfasst, was sie operativ verlangt und wie sie sich von lokalen Modellen unterscheidet.',
        keywords: ['selbstgehostete KI', 'On-Premise-KI-Plattform', 'privater Betrieb'],
      },
      eyebrow: 'Lokal und privat',
      title: 'Was ist selbstgehostete KI?',
      summary:
        'Selbst hosten heißt, die Anwendung läuft auf Infrastruktur, die Sie kontrollieren — die Oberfläche, die Datenbanken, die Warteschlangen, die Orchestrierung — nicht nur das Modell. Das ist eine größere Verpflichtung als ein lokales Modell und beantwortet eine andere Frage: nicht nur „wo geschieht die Inferenz“, sondern „wer hält die Daten im Ruhezustand“.',
      sections: [
        {
          id: 'more-than-the-model',
          heading: 'Es ist mehr als das Modell',
          paragraphs: [
            'Ein lokales Modell zu betreiben lässt Gespräche, Dateien, Gedächtnis und Kontodaten weiterhin in der genutzten Anwendung. Selbst hosten verlagert all das auf Ihre eigene Infrastruktur.',
            'Der Unterschied zählt für alle, deren Pflichten sich auf gespeicherte Daten beziehen und nicht auf Inferenz. Wo das Modell läuft und wo der Verlauf liegt, sind getrennte Fragen, und nur Selbsthosting beantwortet die zweite.',
          ],
        },
        {
          id: 'what-it-costs-you',
          heading: 'Was es operativ kostet',
          paragraphs: [
            'Sie übernehmen Upgrades, Backups, Monitoring, TLS und die Fehlersuche, wenn zur Unzeit etwas bricht. Das sind reale, laufende Kosten, gemessen in Aufmerksamkeit statt in Geld.',
            'Es lohnt sich, wenn die Daten wirklich nirgendwo anders liegen dürfen oder der Betrieb jede Anbieterbeziehung überdauern muss. Als allgemeine Vorsichtsmaßnahme lohnt es sich nicht.',
          ],
        },
        {
          id: 'hybrid-is-normal',
          heading: 'Selbstgehostet heißt nicht abgekoppelt',
          paragraphs: [
            'Ein selbstgehosteter Betrieb kann weiterhin gehostete Modelle aufrufen. Viele tun das: Plattform und Daten gehören Ihnen, und Cloud-Anbieter werden dort genutzt, wo ihre Leistung es wert ist, dass Daten das Haus verlassen.',
            'Die Kombination, die externe Verarbeitung vollständig beseitigt, ist Selbsthosting plus lokale Modelle — eine bewusste Konfiguration, nicht die Voreinstellung.',
          ],
        },
      ],
      faq: [
        {
          question: 'Ist Selbsthosting dasselbe wie lokale KI?',
          answer:
            'Nein. Lokale KI betrifft, wo das Modell läuft. Selbsthosting betrifft, wo Anwendung und Daten leben. Sie können das eine ohne das andere haben, und die stärkste Datenschutzposition braucht beides.',
        },
        {
          question: 'Macht Selbsthosting uns compliant?',
          answer:
            'Nein. Es kann ein Baustein einer Compliance-Erzählung sein, aber Compliance besteht aus Verträgen, Kontrollen, Nachweisen und Audits. Wo die Software läuft, ist eine Eingangsgröße von vielen.',
        },
        {
          question: 'Was braucht es zum Betrieb?',
          answer:
            'Bei den meisten Plattformen Container, eine Datenbank und einen Ort, um sie laufen zu lassen — plus eine Person, die den Upgrade-Pfad verantwortet. Letzteres wird am häufigsten unterschätzt.',
        },
      ],
      productNote:
        'ClawAI läuft auf Ihrer eigenen Infrastruktur — der gesamte Stack, nicht ein gehosteter Tarif mit lokaler Option — und der Quellcode steht zur technischen Prüfung bereit.',
    },
    [LearnTopic.OLLAMA_VS_LLAMACPP]: {
      seo: {
        title: 'Ollama oder llama.cpp: was wofür?',
        description:
          'Ollama und llama.cpp führen beide Open-Weight-Modelle lokal aus. Wie sie zusammenhängen, wofür sich welches eignet und warum beides zu nutzen normal ist.',
        keywords: ['Ollama oder llama.cpp', 'lokale Modell-Runtime', 'LLM lokal ausführen'],
      },
      eyebrow: 'Lokal und privat',
      title: 'Ollama oder llama.cpp',
      summary:
        'Sie sind nicht wirklich Konkurrenten. llama.cpp ist die Inferenz-Engine, die es praktikabel machte, Sprachmodelle auf gewöhnlicher Hardware zu betreiben; Ollama ist ein Modellmanager und Server auf dieser Linie. Die Frage ist meist nicht, welches man wählt, sondern auf welcher Ebene man arbeiten will.',
      sections: [
        {
          id: 'what-each-is',
          heading: 'Was beide sind',
          paragraphs: [
            'llama.cpp ist eine C++-Inferenz-Engine. Sie führt quantisierte Modelle effizient auf CPUs und GPUs aus und bietet feingranulare Kontrolle darüber, wie ein Modell geladen und ausgeführt wird. Sie ist die untere Ebene, und ein Großteil des lokalen KI-Ökosystems baut darauf auf.',
            'Ollama hüllt eine solche Engine in Bequemlichkeit: Modell per Name holen, Server starten, HTTP-API bekommen, Modelldateien und Speicher verwalten lassen. Es optimiert darauf, ein Modell in einer Minute zum Laufen zu bringen.',
          ],
        },
        {
          id: 'choosing',
          heading: 'Wie man wählt',
          paragraphs: [
            'Wählen Sie Ollama, wenn Sie Modelle schnell mit vernünftigen Voreinstellungen laufen lassen wollen, wenn Sie zwischen mehreren Modellen wechseln oder eine stabile lokale API ohne Feinjustierung brauchen.',
            'Wählen Sie llama.cpp direkt, wenn Sie Kontrolle brauchen — eine bestimmte Quantisierung, ein bestimmtes Layer-Offloading, ungewöhnliche Hardware oder Inferenz eingebettet in Ihr eigenes Binary. Der Preis ist, dass Sie die Details selbst verwalten.',
          ],
        },
        {
          id: 'both',
          heading: 'Beides zu nutzen ist normal',
          paragraphs: [
            'Üblich ist Ollama für den täglichen interaktiven Einsatz und llama.cpp für eine bewusst optimierte Arbeitslast. Sie schließen einander nicht aus, und eine Plattform, die beide unterstützt, lässt die Entscheidung pro Betrieb fallen statt ein für alle Mal.',
          ],
        },
      ],
      faq: [
        {
          question: 'Ist Ollama nur ein Wrapper?',
          answer:
            'Das wird ihm nicht gerecht. Modellverwaltung, Speicherhandhabung und eine konsistente API sind genau die Teile, die lokale Modelle im Alltag praktikabel machen, und sie sind echte Arbeit, gleich welche Engine darunterliegt.',
        },
        {
          question: 'Was ist schneller?',
          answer:
            'Bei gleichem Modell, gleicher Quantisierung und gleicher Hardware liegen sie nah beieinander, weil die schwere Arbeit dieselbe ist. Unterschiede in der Praxis kommen meist von der Konfiguration, nicht vom Werkzeug.',
        },
        {
          question: 'Was ist Quantisierung?',
          answer:
            'Modellgewichte mit geringerer Präzision zu speichern, damit sie weniger Speicher brauchen. Das macht große Modelle auf gewöhnlicher Hardware möglich und tauscht ein wenig Qualität gegen viel Praktikabilität.',
        },
      ],
      productNote:
        'ClawAI unterstützt beide als lokale Runtimes — ein Betrieb kann Ollamas Bequemlichkeit, llama.cpps Kontrolle oder beides zugleich nutzen.',
    },
    [LearnTopic.CLOUD_AI_VS_LOCAL_AI]: {
      seo: {
        title: 'Cloud-KI oder lokale KI: wie man wählt',
        description:
          'Cloud-Modelle bieten Leistung ohne Hardware; lokale Modelle bieten Kontrolle und flache Kosten. Die Abwägungen, die wirklich entscheiden, und warum die meisten beides nutzen.',
        keywords: ['Cloud-KI oder lokale KI', 'lokales oder gehostetes LLM', 'privater KI-Betrieb'],
      },
      eyebrow: 'Lokal und privat',
      title: 'Cloud-KI oder lokale KI',
      summary:
        'Die ehrliche Zusammenfassung: Cloud-Modelle sind an der Spitze leistungsfähiger und verlangen nichts von Ihnen; lokale Modelle halten Ihre Daten auf Ihrer Hardware und machen aus einer variablen Rechnung eine feste. Fast niemand sollte eines für alles wählen, und die interessante Frage ist, wo die Linie verläuft.',
      sections: [
        {
          id: 'capability',
          heading: 'Leistungsfähigkeit',
          paragraphs: [
            'Die größten und stärksten Modelle sind gehostet, und bei wirklich schwerem Reasoning ist der Unterschied real. Wird Ihre Arbeit von den schwersten Fragen bestimmt, zählt das mehr als alles andere auf dieser Seite.',
            'Bei Zusammenfassen, Entwerfen, Extrahieren, Klassifizieren und Routine-Code ist der Abstand so weit geschrumpft, dass er selten den Ausschlag gibt.',
          ],
        },
        {
          id: 'data',
          heading: 'Daten',
          paragraphs: [
            'Das entscheidet meist tatsächlich. Ein Prompt an ein gehostetes Modell wird von diesem Anbieter unter dessen Bedingungen verarbeitet. Für die meisten Inhalte ist das in Ordnung. Für manche — regulierte Unterlagen, unveröffentlichte Arbeit, vertrauliches Material Dritter — nicht, und keine vertragliche Zusicherung ist so stark wie Daten, die nicht das Haus verlassen.',
            'Deshalb ist die Aufteilung selten Alles-oder-nichts. Sie wird meist je Datenart entschieden, nicht je Organisation.',
          ],
        },
        {
          id: 'cost',
          heading: 'Kosten',
          paragraphs: [
            'Cloud ist variabel: keine Anfangsinvestition und eine Rechnung proportional zur Nutzung, die mit dem Erfolg wächst. Lokal ist fix: Hardware vorab, danach nahezu keine Grenzkosten.',
            'Der Schnittpunkt hängt vom Volumen ab. Gelegentliche Nutzung ist gehostet günstiger. Starke, stetige, planbare Nutzung ist meist lokal günstiger, und der Break-even kommt früher als erwartet, sobald die Nutzung durchgängig ist.',
          ],
        },
        {
          id: 'the-answer',
          heading: 'Die meisten enden bei beidem',
          paragraphs: [
            'Lokal für Sensibles und Volumenstarkes, gehostet für die schwersten Fragen, und eine Routing-Richtlinie, die pro Anfrage entscheidet. Das verlangt ein System, in dem die Entscheidung ausdrücklich und prüfbar ist — sonst ist „Sensibles bleibt lokal“ eine Absicht und keine Kontrolle.',
          ],
        },
      ],
      faq: [
        {
          question: 'Ist lokale KI günstiger?',
          answer:
            'Bei anhaltendem Volumen meist ja. Bei geringem oder schwankendem Volumen meist nicht — stillstehende Hardware kostet Geld, ob Sie sie nutzen oder nicht.',
        },
        {
          question: 'Kann ich gehostet starten und später wechseln?',
          answer:
            'Ja, und das ist eine sinnvolle Reihenfolge: den Ablauf mit gehosteten Modellen belegen, dann die Teile verlagern, deren Volumen oder Sensibilität die Hardware rechtfertigt. Auf einer Plattform, die beides bereits unterstützt, ist das deutlich leichter.',
        },
        {
          question: 'Ist hybrid kompliziert?',
          answer:
            'Wenn Sie es selbst bauen, ja, weil Sie zwei Pfade pflegen. Unkompliziert, wenn die Routing-Schicht lokale und gehostete Modelle bereits als austauschbare Ziele behandelt.',
        },
      ],
      productNote:
        'ClawAI behandelt lokale und Cloud-Modelle als dieselbe Art Ziel, und die Modi Datenschutz zuerst und Nur-lokal machen aus „Sensibles bleibt lokal“ eine Einstellung statt einer Gewohnheit.',
    },
    [LearnTopic.AI_AGENT_VS_AI_CHATBOT]: {
      seo: {
        title: 'KI-Agent oder Chatbot: was ist der Unterschied?',
        description:
          'Ein Chatbot antwortet; ein Agent handelt. Was sich ändert, wenn ein Modell Werkzeuge nutzt, warum das den Einsatz erhöht und was man vor dem Handeln prüft.',
        keywords: ['KI-Agent oder Chatbot', 'was ist ein KI-Agent', 'Werkzeugnutzung'],
      },
      eyebrow: 'Grundlagen',
      title: 'KI-Agent oder Chatbot',
      summary:
        'Ein Chatbot erzeugt Text, und Sie entscheiden, was damit geschieht. Ein Agent bekommt Werkzeuge und ein Ziel und macht eigenständig Schritte — Dateien lesen, APIs aufrufen, Befehle ausführen — bis er sich für fertig hält. Der Unterschied ist nicht Intelligenz; er liegt darin, ob die Ausgabe ein Vorschlag oder eine Handlung ist.',
      sections: [
        {
          id: 'the-difference',
          heading: 'Der eigentliche Unterschied',
          paragraphs: [
            'Der Mechanismus ist Werkzeugnutzung. Ein Agent ist ein Modell in einer Schleife mit Werkzeugen, die es aufrufen darf, und jedes Ergebnis fließt in die nächste Entscheidung. Nehmen Sie Werkzeuge und Schleife weg, haben Sie einen Chatbot.',
            'Diese Schleife macht Agenten nützlich und riskant. Ein Chatbot, der falsch liegt, kostet Sie Zeit. Ein Agent, der falsch liegt, hat bereits etwas getan.',
          ],
        },
        {
          id: 'what-agents-are-good-at',
          heading: 'Wo Agenten sich lohnen',
          paragraphs: [
            'Mehrschrittige Arbeit mit prüfbarem Endzustand. Tests ausführen, Fehler lesen, Code ändern, erneut ausführen. Die Prüfung schließt die Schleife, und der Agent kann feststellen, ob er Erfolg hatte.',
            'Sie tun sich schwer, wo Erfolg Ermessenssache ist, weil ihnen nichts sagt aufzuhören. Ein Agent ohne Möglichkeit, den eigenen Fortschritt zu prüfen, macht selbstbewusst weiter.',
          ],
        },
        {
          id: 'what-to-check',
          heading: 'Was vor dem Handeln zu prüfen ist',
          paragraphs: [
            'Welche Werkzeuge er hat und was diese Werkzeuge erreichen können. Ob zerstörerische Aktionen eine Freigabe brauchen. Ob Sie die Schritte sehen und nicht nur das Ergebnis. Und ob er mittendrin gestoppt werden kann.',
            'Die Schritte zählen am meisten. Ein Agent, dessen Überlegungen Sie nicht einsehen können, ist einer, den Sie im Ganzen annehmen oder ablehnen müssen — die schlechteste Position, aus der man Arbeit prüft.',
          ],
        },
      ],
      faq: [
        {
          question: 'Ist ein Chatbot mit Suche ein Agent?',
          answer:
            'Das ist die Grenze. Sobald er selbst entscheidet, ob gesucht wird und was mit den Ergebnissen geschieht, hat er die Schleife. Die meisten nützlichen Assistenten liegen heute irgendwo auf diesem Spektrum statt an einem Ende.',
        },
        {
          question: 'Brauchen Agenten die stärksten Modelle?',
          answer:
            'Sie profitieren mehr als Chatbots, weil sich Fehler über Schritte hinweg aufsummieren. Ein kleiner Fehler früh kann den ganzen Lauf ins Nutzlose führen.',
        },
        {
          question: 'Ist es sicher, einen Agenten auf einer Codebasis laufen zu lassen?',
          answer:
            'Mit Versionskontrolle, eingegrenzten Rechten und einem Review-Schritt ja — das ist ein etablierter Einsatz. Ohne das nimmt ein Agent ungeprüfte Änderungen an Ihrer Arbeit vor.',
        },
      ],
      productNote:
        'ClawAIs Coding-Agent läuft in Ihrem Editor mit sichtbaren Schritten und Ihrer Modellwahl — ein Lauf ist prüfbar statt ein Alles-oder-nichts-Ergebnis.',
    },
  },
};
