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
      [LearnTopic.HOW_LANGUAGE_MODELS_GENERATE_ANSWERS]:
        'Wie aus einer Eingabe Tokens, Wahrscheinlichkeiten und eine erzeugte Antwort werden.',
      [LearnTopic.WHAT_ARE_AI_TOKENS]:
        'Die Einheit, die ein Modell tatsächlich liest und schreibt — und warum eine exakte Zahl seinen eigenen Tokenizer braucht.',
      [LearnTopic.TEMPERATURE_TOP_P_AND_RANDOMNESS]:
        'Was Temperatur und Top-p an einer Antwort wirklich ändern — und was sie nicht ändern können.',
      [LearnTopic.WHAT_ARE_EMBEDDINGS]:
        'Wie Text zu einem Zahlenvektor wird — und warum das Suche nach Bedeutung erst möglich macht.',
      [LearnTopic.PROMPTING_VS_RAG_VS_FINE_TUNING]:
        'Drei verschiedene Lösungen für drei verschiedene Probleme — und warum viele Produkte die dritte nie brauchen.',
      [LearnTopic.HOW_AI_TOOL_CALLING_WORKS]:
        'Das Modell führt nie etwas aus — es schlägt einen Aufruf vor, und Ihre Anwendung entscheidet, was als Nächstes passiert.',
      [LearnTopic.WHAT_ARE_STRUCTURED_AI_OUTPUTS]:
        'Ein Modell um JSON zu bitten ist eine Anfrage; nur manche Mechanismen garantieren wirklich, dass es zu Ihrem Schema passt.',
      [LearnTopic.WHY_AI_HALLUCINATES]:
        'Warum ein Modell eine falsche Antwort mit derselben Sicherheit äußert wie eine richtige — und was das tatsächlich verringert.',
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
      [LearnTopic.HOW_TO_EVALUATE_AI_MODELS]:
        'Was Sie wirklich testen sollten, bevor Sie einem Modell Ihre Arbeit anvertrauen — keine Bestenlisten-Zahl.',
      [LearnTopic.HOW_TO_READ_AI_BENCHMARKS]:
        'Was eine Benchmark-Zahl wirklich misst, und wie sie Sie in die Irre führen kann, bevor Sie überhaupt zu testen beginnen.',
      [LearnTopic.WHAT_IS_PROMPT_INJECTION]:
        'Text, der nicht von Ihnen stammt, kann dem Modell trotzdem Anweisungen geben — was das bedeutet und warum ein klügeres Modell es nicht vollständig lösen kann.',
    },
  },
  topics: {
    [LearnTopic.HOW_LANGUAGE_MODELS_GENERATE_ANSWERS]: {
      seo: {
        title: 'Wie erzeugen Sprachmodelle Antworten?',
        description:
          'So zerlegen Sprachmodelle Text in Tokens, sagen das nächste Token aus dem Kontext voraus und wählen Ausgaben aus — einschließlich ihrer Grenzen.',
        keywords: [
          'Funktionsweise von Sprachmodellen',
          'Next-Token-Vorhersage',
          'LLM-Antwortgenerierung',
        ],
      },
      eyebrow: 'Grundlagen',
      title: 'Wie Sprachmodelle Antworten erzeugen',
      summary:
        'Ein Sprachmodell erzeugt eine Antwort Token für Token. Es zerlegt die Eingabe, berechnet aus dem aktuellen Kontext Wahrscheinlichkeiten für mögliche nächste Tokens, wählt eines aus und wiederholt den Vorgang. Das Ergebnis wirkt geplant, entsteht aber aus erlernten statistischen Mustern und ist kein fertig gespeicherter Datensatz.',
      sections: [
        {
          id: 'tokenization',
          heading: 'Text wird zu Tokens',
          paragraphs: [
            'Vor der Generierung zerlegt ein Tokenizer Anweisungen, Gesprächsverlauf, Werkzeugergebnisse und weiteren Kontext in Tokens. Ein Token kann ein Wort, ein Wortteil oder ein Satzzeichen sein. Das Modell verarbeitet ihre Kennungen statt sichtbarer Sätze; deshalb beeinflussen Schreibweise, Formatierung und Sprache den Platzbedarf im Kontextfenster.',
          ],
        },
        {
          id: 'next-token-prediction',
          heading: 'Das Modell sagt jeweils ein Token voraus',
          paragraphs: [
            'Für die bisherige Sequenz weist das Netz jedem möglichen nächsten Token eine Wahrscheinlichkeit zu. Eine Decodierregel wählt eines aus, hängt es an und startet die Berechnung erneut. Diese Schleife endet bei einem Stopptoken oder einem gesetzten Limit; normalerweise wird keine vorab gespeicherte vollständige Antwort abgerufen.',
          ],
        },
        {
          id: 'context-and-probability',
          heading: 'Kontext formt Wahrscheinlichkeiten',
          paragraphs: [
            'Systemanweisungen, Nutzerfrage, frühere Nachrichten und bereitgestellte Dokumente verschieben die Wahrscheinlichkeiten, solange sie in den aktiven Kontext passen. Die wahrscheinlichste Auswahl ist meist wiederholbarer; Sampling aus mehreren plausiblen Tokens erzeugt mehr Variation. Temperatur und ähnliche Regler ändern die Auswahl, liefern aber keine zusätzlichen Fakten.',
          ],
        },
        {
          id: 'not-database-retrieval',
          heading: 'Generierung ist keine Datenbanksuche',
          paragraphs: [
            'Training verteilt Textmuster über viele numerische Gewichte. Diese Gewichte sind kein Verzeichnis von Quellen mit verlässlichen Adressen. Ohne getrennte Suche oder ein Werkzeug kann das Modell keinen Quelldatensatz öffnen und eine Aussage belegen. Flüssige Formulierungen können daher eine Behauptung ohne faktische Grundlage zusammensetzen.',
          ],
        },
        {
          id: 'practical-limitations',
          heading: 'Praktische Grenzen',
          paragraphs: [
            'Modelle können Details erfinden, mehrdeutige Aufgaben falsch auslegen, Informationen außerhalb des Kontexts verpassen, Verzerrungen aus Trainingsmaterial wiederholen und bei Rechnungen oder mehrstufigen Schlüssen scheitern. Wichtige Ausgaben sind Entwürfe: passenden Kontext geben, aktuelle Fakten per Suche oder Werkzeug beschaffen und folgenreiche Aussagen unabhängig prüfen.',
          ],
        },
      ],
      faq: [
        {
          question: 'Versteht ein Sprachmodell seine Antwort?',
          answer:
            'Es kann komplexe Beziehungen abbilden und schlussfolgernd wirkenden Text erzeugen. Menschliches Verstehen daraus abzuleiten, geht jedoch über den nachweisbaren Mechanismus hinaus: operativ sagt es Tokens aus Parametern und Kontext voraus.',
        },
        {
          question: 'Warum entstehen bei derselben Eingabe verschiedene Antworten?',
          answer:
            'Beim Sampling kann schon eine frühe andere Tokenwahl alle folgenden Wahrscheinlichkeiten verändern. Deterministische Einstellungen verringern die Streuung, garantieren aber nicht die Richtigkeit der wiederholten Antwort.',
        },
        {
          question: 'Kann das Modell seine Quellen nennen?',
          answer:
            'Nur wenn Quellen über Kontext, Suche oder ein Werkzeug bereitgestellt werden und die Verbindung erhalten bleibt. Eine allein aus Modellgewichten erzeugte Quellenangabe kann erfunden sein und muss geprüft werden.',
        },
      ],
      productNote:
        'ClawAI leitet Eingaben an konfigurierte Cloud- oder lokale Modelle weiter und kann Vergleichs- und Prüfabläufe ausführen; das gewählte Modell generiert weiterhin probabilistisch, daher garantiert Routing allein keine Wahrheit.',
    },
    [LearnTopic.WHAT_ARE_AI_TOKENS]: {
      seo: {
        title: 'Was sind KI-Token?',
        description:
          'Token sind die Einheiten, die ein Sprachmodell tatsächlich liest und schreibt — keine Wörter oder Zeichen. Wie Tokenisierung funktioniert, wie Eingabe und Ausgabe gezählt werden, und warum nur der eigene Tokenizer des Modells eine exakte Zahl liefert.',
        keywords: ['was ist ein KI-Token', 'LLM-Tokenisierung', 'Eingabe- und Ausgabe-Token'],
      },
      eyebrow: 'Grundlagen',
      title: 'Was sind KI-Token?',
      summary:
        'Ein Token ist die Einheit, die ein Sprachmodell tatsächlich liest und schreibt: ein Textfragment, das entsteht, wenn der eigene Tokenizer des Modells die Eingabe zerlegt. Es ist kein Wort und kein Zeichen, und wie viele Token ein Textstück ergibt, hängt von der Sprache, der Formatierung und dem zählenden Tokenizer ab.',
      sections: [
        {
          id: 'tokens-vs-words-and-characters',
          heading: 'Ein Token ist kein Wort und kein Zeichen',
          paragraphs: [
            'Ein Tokenizer zerlegt Text in Stücke aus einem festen Vokabular, das er beim Training gelernt hat. Ein kurzes, gebräuchliches Wort ist oft genau ein Token; ein längeres oder selteneres Wort kann in zwei oder drei zerfallen; ein einzelnes ungewöhnliches Symbol kann selbst mehr als ein Token beanspruchen. Satzzeichen, Leerzeichen und Zeilenumbrüche sind ebenfalls Token und nicht kostenlos.',
            'Deshalb entwickeln sich Tokenanzahl, Wortanzahl und Zeichenanzahl unabhängig voneinander. Zwei Sätze mit gleicher Wortzahl können unterschiedlich viele Token benötigen, und ein Satz mit kürzeren, gebräuchlicheren Wörtern kann seine Tokenanzahl senken, ohne als Text kürzer zu werden.',
          ],
        },
        {
          id: 'tokenization-differs-by-language-and-model',
          heading: 'Tokenisierung unterscheidet sich je nach Sprache und Modell',
          paragraphs: [
            'Jedes Modell bringt seinen eigenen Tokenizer und sein eigenes festes Vokabular mit, aufgebaut aus dem Text, mit dem es trainiert wurde. Formulierungen, die in diesem Trainingstext häufig vorkamen, verdichten sich zu wenigen, längeren Token; seltene Formulierungen zerfallen eher in mehrere, kürzere Stücke.',
            'Daraus folgen zwei Dinge unmittelbar. Erstens kann derselbe Satz je nach Sprache eine merklich andere Tokenzahl kosten, weil kein Vokabular zwei Sprachen gleich gut abbildet. Zweitens kann derselbe Satz bei zwei verschiedenen Modellen unterschiedlich viele Token kosten, weil jedes ein eigenes Vokabular hat — eine Zählung aus dem Tokenizer eines Modells ist keine verlässliche Schätzung für ein anderes.',
          ],
        },
        {
          id: 'input-and-output-tokens',
          heading: 'Eine Anfrage verbraucht Eingabe-Token und Ausgabe-Token',
          paragraphs: [
            'Jede Anfrage hat zwei Token-Pools, die getrennt gezählt und meist getrennt bepreist werden. Eingabe-Token sind alles, was an das Modell geschickt wird: Anweisungen, der sichtbare Gesprächsverlauf, angehängte Dokumente und Werkzeugergebnisse. Ausgabe-Token sind alles, was das Modell im Gegenzug erzeugt.',
            'Eingabe-Token sind in einem mehrstufigen Gespräch kein einmaliger Posten. Weil jede neue Anfrage den bisherigen Verlauf erneut mitschickt, zählen frühere Nachrichten und angehängtes Material bei jedem Zug erneut als Eingabe — nicht nur in dem Zug, in dem sie zuerst hinzukamen.',
          ],
        },
        {
          id: 'tokens-and-the-context-window',
          heading: 'Token sind die Einheit, in der ein Kontextfenster gemessen wird',
          paragraphs: [
            'Ein Kontextfenster ist ein in Token ausgedrücktes Budget, das sich Eingabe und Ausgabe einer einzelnen Anfrage teilen. „Was ist ein Kontextfenster?“ erklärt, wie sich dieses Budget in der Praxis verhält; hier zählt nur die Einheit — das Fenster wird nicht in Wörtern, Zeichen oder Nachrichten gemessen, sondern in Token, und Eingabe wie Ausgabe schöpfen aus derselben Gesamtmenge.',
          ],
        },
        {
          id: 'estimating-cost-without-a-price-table',
          heading: 'Kosten schätzen ohne feste Zahl',
          paragraphs: [
            'Tokenbasierte Kosten sind eine Multiplikation: verbrauchte Token mal ein je Modell festgelegter Satz. Anbieter legen diese Sätze nach eigenem Zeitplan fest und ändern sie; ein leistungsfähigeres Modell kostet pro Token typischerweise mehr als ein kleineres, und Ausgabe-Token werden meist höher bepreist als Eingabe-Token. Nichts davon macht eine konkrete Zahl an dieser Stelle sinnvoll — ein hier abgedruckter Satz wäre binnen Monaten falsch.',
            'Unabhängig von der aktuellen Preistabelle bleibt die Form der Kosten gleich: kürzere, fokussiertere Prompts und kürzere, fokussiertere Antworten verbrauchen weniger Token, und große Anhänge bei jedem Zug eines langen Gesprächs erneut mitzuschicken, ist einer der häufigsten Wege, wie der Tokenverbrauch wächst, ohne dass es jemand so entschieden hätte.',
          ],
        },
        {
          id: 'exact-counts-need-the-tokenizer',
          heading: 'Eine exakte Zahl braucht den eigenen Tokenizer des Modells',
          paragraphs: [
            'Eine Faustregel zu Token pro Wort ist eine Näherung für eine Sprache, verarbeitet von einem Tokenizer, und überträgt sich nicht auf eine andere Sprache, eine andere Schrift oder ein anderes Modell. Auch die Formatierung ändert die Zahl: Code, JSON und stark interpunktierter Text tokenisieren meist weniger effizient als dieselbe Information als schlichter Fließtext.',
            'Wenn eine exakte Zahl wichtig ist — weil eine Anfrage nahe an einem Kontextlimit liegt oder weil Kosten genau vorhergesagt werden müssen —, ist die einzig verlässliche Methode, den tatsächlichen Text vor dem Senden durch den eigenen Tokenizer oder eine Zähl-Schnittstelle des jeweiligen Modells laufen zu lassen. Eine auf Wörtern oder Zeichen basierende Schätzung ist eine als Zahl verkleidete Vermutung.',
          ],
        },
      ],
      faq: [
        {
          question: 'Ist ein Token dasselbe wie ein Wort?',
          answer:
            'Nein. Ein kurzes, gebräuchliches Wort ist oft ein Token, aber ein längeres oder selteneres Wort kann in mehrere zerfallen, und Satzzeichen, Leerzeichen und Zeilenumbrüche zählen selbst als Token. Tokenanzahl und Wortanzahl laufen bestenfalls lose parallel.',
        },
        {
          question:
            'Warum benötigt derselbe Satz in verschiedenen Werkzeugen unterschiedlich viele Token?',
          answer:
            'Jedes Werkzeug meldet meist die Zählung aus dem Tokenizer eines bestimmten Modells, und jedes Modell hat sein eigenes, aus eigenem Trainingstext aufgebautes Vokabular. Eine für den Tokenizer eines Modells korrekte Zählung ist für ein anderes nur eine Schätzung.',
        },
        {
          question: 'Verbraucht Formatierung wie Code oder JSON mehr Token als reiner Text?',
          answer:
            'Oft ja. Einrückung, Satzzeichen und wiederholte Symbole sind selbst Token, sodass ein stark strukturiertes Format merklich mehr Token verbrauchen kann als dieselbe Information in schlichten Sätzen.',
        },
        {
          question: 'Wie finde ich die exakte Tokenzahl einer Anfrage, bevor ich sie sende?',
          answer:
            'Lassen Sie den genauen Text durch den eigenen Tokenizer des jeweiligen Modells oder eine von ihm bereitgestellte Zähl-Schnittstelle laufen. Jede auf Wort- oder Zeichenzahl basierende Schätzung ist ungefähr, und der Fehler wächst mit Unterschieden in Sprache, Schrift und Formatierung.',
        },
      ],
      productNote:
        'ClawAI zählt die tatsächlich verbrauchten Eingabe- und Ausgabe-Token einer Anfrage, sobald die Antwort erzeugt ist, und zeigt die Kosten und das dafür beanspruchte Guthaben zu dieser Antwort an, statt eine vorab geschätzte Zahl.',
    },
    [LearnTopic.TEMPERATURE_TOP_P_AND_RANDOMNESS]: {
      seo: {
        title: 'Was steuern Temperatur und Top-p?',
        description:
          'Temperatur und Top-p entscheiden, wie ein Modell sein nächstes Token wählt, nicht was es weiß. Was jede Einstellung wirklich ändert, warum niedriger nicht automatisch besser ist, und warum Temperatur null immer noch nicht perfekt wiederholbar ist.',
        keywords: [
          'Temperature Top-p erklärt',
          'LLM-Sampling-Parameter',
          'Zufälligkeit bei KI-Ausgaben',
        ],
      },
      eyebrow: 'Grundlagen',
      title: 'Was steuern Temperatur und Top-p?',
      summary:
        'Temperatur und Top-p sind Decodier-Einstellungen, die ändern, wie ein Modell aus den bereits berechneten Wahrscheinlichkeiten sein nächstes Token wählt. Sie steuern Zufälligkeit in Wortwahl und Formulierung, nicht Genauigkeit, Wissen oder Schlussfolgerungsfähigkeit — und keine der beiden garantiert exakt wiederholbare Ausgaben, selbst bei der konservativsten Einstellung.',
      sections: [
        {
          id: 'what-these-settings-actually-change',
          heading: 'Sie formen eine Auswahl um, nicht das Wissen des Modells',
          paragraphs: [
            'Bis Temperatur oder Top-p greifen, hat das Modell für jedes mögliche nächste Token bereits eine Wahrscheinlichkeit anhand des aktuellen Kontexts berechnet. Keine der beiden Einstellungen ändert, woher diese Wahrscheinlichkeiten stammen — die gelernten Parameter des Modells und der gegebene Kontext. Sie ändern nur, wie ein Token aus der bereits erzeugten Verteilung ausgewählt wird.',
          ],
        },
        {
          id: 'temperature-and-the-shape-of-the-distribution',
          heading: 'Temperatur bestimmt, wie scharf oder flach diese Verteilung ist',
          paragraphs: [
            'Eine niedrigere Temperatur macht die wahrscheinlichsten Token noch wahrscheinlicher, sodass die Ausgabe zur einzelnen wahrscheinlichsten Fortsetzung tendiert und sich über getrennte Durchläufe hinweg stärker wiederholt. Eine höhere Temperatur flacht die Verteilung ab und gibt Token mit geringerer Wahrscheinlichkeit eine realistischere Chance, gewählt zu werden, was vielfältigere Formulierungen erzeugt — und mehr Raum für ein unwahrscheinliches, manchmal seltsames Token, das durchrutscht.',
            'Temperatur fügt keine Information hinzu, die das Modell nicht hat. Sie kann eine falsche Vermutung nicht in eine richtige verwandeln; sie ändert nur, wie stark sich das Modell auf die Vermutung festlegt, die es bereits bevorzugt.',
          ],
        },
        {
          id: 'top-p-and-the-candidate-pool',
          heading: 'Top-p begrenzt, welche Token überhaupt infrage kommen',
          paragraphs: [
            'Top-p, auch Nucleus-Sampling genannt, funktioniert anders als Temperatur: Statt jede Wahrscheinlichkeit umzuformen, grenzt es zunächst auf die kleinste Menge der besten Token ein, deren Wahrscheinlichkeiten sich zu einem gewählten Schwellenwert summieren, und wählt dann nur aus dieser Menge aus. Ein niedriger Top-p-Wert behält nur die Handvoll Token, bei denen sich das Modell am sichersten ist; ein hoher Top-p-Wert lässt eine breitere Streuung plausibler Alternativen zu. Temperatur und Top-p werden meist zusammen angewendet, nacheinander, statt sich gegenseitig zu ersetzen.',
          ],
        },
        {
          id: 'why-temperature-zero-is-not-perfectly-repeatable',
          heading: 'Temperatur null ist nahezu deterministisch, nicht exakt deterministisch',
          paragraphs: [
            'Eine Temperatur von null, oder eine gleichwertige Einstellung „immer das wahrscheinlichste Token wählen“, entfernt den Sampling-Schritt und sollte im Prinzip bei identischer Eingabe reproduzierbare Ausgaben liefern. In der Praxis ist Gleitkomma-Arithmetik auf GPUs nicht strikt reihenfolgeunabhängig, und die Infrastruktur der Anbieter kann Berechnungen zwischen Anfragen bündeln oder anders anordnen. Das Ergebnis ist, dass derselbe Prompt zweimal bei der deterministischsten Einstellung gesendet gelegentlich trotzdem unterschiedlich zurückkommen kann, besonders wenn zwei Kandidaten-Token fast gleichauf lagen.',
          ],
        },
        {
          id: 'lower-is-not-the-same-as-better',
          heading: 'Eine niedrigere Einstellung ist nicht automatisch eine bessere',
          paragraphs: [
            'Weniger Zufälligkeit macht die Ausgabe wiederholbarer, nicht richtiger. Eine überzeugt falsche Fortsetzung bleibt bei niedriger Temperatur überzeugt falsch, und sehr niedrige Einstellungen können bei längeren Ausgaben auch merklich repetitive oder steife Formulierungen erzeugen, weil das Modell immer wieder dieselben sicheren, wahrscheinlichen Token auswählt.',
          ],
        },
        {
          id: 'choosing-a-setting-for-the-task',
          heading: 'Die richtige Einstellung hängt davon ab, wofür die Ausgabe gedacht ist',
          paragraphs: [
            'Aufgaben mit im Wesentlichen einer richtigen Antwort — einen Wert extrahieren, ein strenges Format einhalten, Code schreiben, der kompilieren muss — profitieren im Allgemeinen von weniger Zufälligkeit, weil Konsistenz wichtiger ist als Vielfalt. Aufgaben, bei denen mehrere unterschiedliche Antworten gut sein könnten — Brainstorming, alternative Formulierungen entwerfen, offenes Schreiben — profitieren von mehr Zufälligkeit, weil es genau um die Vielfalt geht. Keine der beiden Einstellungen ersetzt einen besseren Kontext für das Modell, und keine ersetzt die Prüfung einer Antwort, auf die es wirklich ankommt.',
          ],
        },
      ],
      faq: [
        {
          question: 'Macht Temperatur null die Ausgabe deterministisch?',
          answer:
            'Fast, aber nicht garantiert. Sie entfernt die beabsichtigte Zufälligkeit des Samplings, aber Gleitkommaberechnungen und anbieterseitiges Batching können bei einem exakten Gleichstand oder einer sehr knappen Entscheidung gelegentlich trotzdem ein anderes Token liefern, sodass identische Anfragen meistens — nicht immer — identisch ausfallen.',
        },
        {
          question: 'Was ist der Unterschied zwischen Temperatur und Top-p?',
          answer:
            'Temperatur formt die Wahrscheinlichkeit jedes möglichen nächsten Tokens um. Top-p grenzt zuerst auf die kleinste Menge der besten Kandidaten ein, deren Wahrscheinlichkeiten einen Schwellenwert überschreiten, und wählt dann nur aus dieser Menge. Beide wirken auf dieselbe Verteilung, aber auf unterschiedliche Weise, und werden oft kombiniert.',
        },
        {
          question: 'Macht eine höhere Temperatur ein Modell kreativer oder wissender?',
          answer:
            'Sie ändert die Vielfalt der Formulierung, nicht Wissen oder Schlussfolgerung. Eine höhere Temperatur kann vielfältigere Formulierungen erzeugen, schöpft aber weiterhin aus denselben gelernten Parametern und kann ebenso leicht eine unwahrscheinlichere, schlechtere Fortsetzung zutage fördern.',
        },
        {
          question:
            'Sollte ich für faktenbasierte Aufgaben immer die niedrigste Einstellung wählen?',
          answer:
            'Eine niedrigere Einstellung macht die Ausgabe konsistenter, was hilft, wenn Konsistenz selbst das Ziel ist, behebt aber keine zugrunde liegende falsche Antwort — eine Ausgabe bei niedriger Temperatur kann überzeugt und wiederholbar falsch sein. Eine Tatsachenbehauptung zu prüfen erfordert weiterhin eine unabhängige Quelle oder Kontrolle.',
        },
      ],
      productNote:
        'ClawAI stellt pro Gespräch eine Temperatur-Einstellung bereit, die auf den jeweils zuständigen Anbieter angewendet wird; Top-p wird nicht als Einstellung angeboten, sodass Nucleus-Sampling beim jeweiligen Standardwert des Anbieters bleibt.',
    },
    [LearnTopic.WHAT_ARE_EMBEDDINGS]: {
      seo: {
        title: 'Was sind Embeddings?',
        description:
          'Ein Embedding verwandelt Text in einen Zahlenvektor, der dessen Bedeutung darstellt — das macht Suche nach Bedeutung statt nach exaktem Wortlaut erst möglich. Wie Ähnlichkeit gemessen wird und warum Embeddings verschiedener Modelle sich nicht mischen lassen.',
        keywords: [
          'was ist ein Embedding',
          'Vektor-Embeddings erklärt',
          'semantische Suche Bedeutung',
        ],
      },
      eyebrow: 'Grundlagen',
      title: 'Was sind Embeddings?',
      summary:
        'Ein Embedding ist eine von einem Embedding-Modell erzeugte Liste von Zahlen, die die Bedeutung eines Textstücks als Position in einem hochdimensionalen Raum darstellt. Text mit ähnlicher Bedeutung landet bei nah beieinanderliegenden Vektoren — genau diese Eigenschaft macht Suche oder Abgleich nach Bedeutung statt nach exaktem Wortlaut überhaupt erst möglich.',
      sections: [
        {
          id: 'what-an-embedding-actually-is',
          heading: 'Eine Zahlenliste als Stellvertreter für Bedeutung',
          paragraphs: [
            'Ein Embedding-Modell liest ein Textstück — ein Wort, einen Satz, einen Absatz, manchmal ein ganzes Dokument — und gibt einen Vektor fester Länge aus: eine geordnete Liste von Zahlen, typischerweise Hunderte oder Tausende lang. Dieser Vektor ist keine für Menschen lesbare Zusammenfassung; er ist eine Position in einem mathematischen Raum, den das Modell beim Training gelernt hat, so angeordnet, dass Texte mit verwandter Bedeutung nah beieinander liegen.',
          ],
        },
        {
          id: 'why-similar-meaning-lands-nearby',
          heading: 'Ähnliche Bedeutung landet nah beieinander, nicht ähnliche Schreibweise',
          paragraphs: [
            'Zwei Sätze, die fast keine Wörter teilen, aber ungefähr dasselbe bedeuten, können nah beieinanderliegende Vektoren erzeugen, weil das Embedding-Modell beim Training Zusammenhänge zwischen Konzepten gelernt hat, nicht nur, welche Buchstaben vorkommen. Umgekehrt können zwei Sätze mit vielen gemeinsamen Wörtern, aber unterschiedlicher Bedeutung weit auseinanderliegen. Das ist der zentrale Unterschied zwischen embeddingbasierter Suche und Abgleich nach exakten Schlagwörtern.',
          ],
        },
        {
          id: 'how-similarity-is-measured',
          heading: 'Nähe wird gemessen, nicht geschätzt',
          paragraphs: [
            'Sobald Text als Vektor dargestellt ist, wird der Bedeutungsvergleich zu einem geometrischen Problem: ein zwischen zwei Vektoren berechneter Ähnlichkeitswert, meist danach, wie nah sie in dieselbe Richtung zeigen. Eine große Sammlung zu durchsuchen bedeutet, diesen Wert zwischen einem Anfragevektor und jedem gespeicherten Vektor zu berechnen und dann die nächstliegenden Treffer zurückzugeben — dieselbe Operation, ob die Sammlung hundert oder hundert Millionen Einträge hat.',
          ],
        },
        {
          id: 'embeddings-are-model-specific',
          heading: 'Embeddings verschiedener Modelle lassen sich nicht mischen',
          paragraphs: [
            'Wie das Vokabular eines Tokenizers ist der Vektorraum eines Embedding-Modells spezifisch für dieses Modell und dessen Training. Ein von einem Embedding-Modell erzeugter Vektor lässt sich nicht sinnvoll mit einem von einem anderen Modell erzeugten Vektor vergleichen, selbst wenn beide dieselbe Anzahl Dimensionen haben. Ein Wechsel des Embedding-Modells bedeutet, alles bereits Gespeicherte neu einzubetten, nicht nur künftige neue Inhalte.',
          ],
        },
        {
          id: 'not-the-same-job-as-a-language-model',
          heading:
            'Die Aufgabe eines Embedding-Modells unterscheidet sich von der eines Sprachmodells',
          paragraphs: [
            'Ein Sprachmodell erzeugt Text, Token für Token, aus einem Prompt. Ein Embedding-Modell erzeugt nichts — es wandelt Text in einen Vektor um und ist damit fertig. Manche Systeme nutzen dasselbe Basismodell für beide Aufgaben, andere zwei völlig getrennte Modelle; so oder so ist der von einem Embedding-Schritt ausgegebene Vektor selbst keine Antwort, sondern nur etwas, das ein Such- oder Abgleichsschritt vergleichen kann.',
          ],
        },
        {
          id: 'where-embeddings-show-up-in-practice',
          heading: 'Wo das in der Praxis vorkommt',
          paragraphs: [
            'Embeddings machen Retrieval-Augmented Generation erst möglich — siehe Was ist RAG? dazu, wie Retrieval mit einem Sprachmodell zusammenspielt —, aber dieselbe Technik steht auch hinter semantischer Suche in Support-Tickets oder Dokumentation, dem Abgleich ähnlicher vergangener Gespräche, dem Entfernen nahezu identischer Inhalte und dem Gruppieren verwandter Elemente, ohne dass jemand Kategorien von Hand vergibt.',
          ],
        },
      ],
      faq: [
        {
          question: 'Ist ein Embedding dasselbe wie ein Token?',
          answer:
            'Nein. Ein Token ist eine diskrete Texteinheit, die ein Sprachmodell einzeln liest oder schreibt. Ein Embedding ist ein kontinuierlicher Vektor, der die Bedeutung eines größeren Textstücks darstellt, erzeugt durch einen separaten Schritt, der nichts generiert.',
        },
        {
          question: 'Kann ich Embeddings zweier verschiedener Modelle vergleichen?',
          answer:
            'Nicht sinnvoll. Jedes Embedding-Modell definiert beim Training seinen eigenen Vektorraum, sodass ein Abstand, der im Raum eines Modells „sehr ähnlich“ bedeutet, im Raum eines anderen Modells keine definierte Bedeutung hat, selbst bei gleicher Vektorlänge.',
        },
        {
          question: 'Bedeutet ein größerer Embedding-Vektor bessere Suchqualität?',
          answer:
            'Nicht allein dadurch. Mehr Dimensionen können mehr Nuancen erfassen, aber die Qualität hängt davon ab, worauf das Modell trainiert wurde und wie gut das zu Ihren Inhalten passt, nicht allein von der Dimensionszahl.',
        },
        {
          question: 'Kann jemand aus einem Embedding den Originaltext wiederherstellen?',
          answer:
            'Eine exakte Wiederherstellung ist in der Regel unpraktikabel, aber ein Embedding stammt trotzdem direkt aus Ihren Inhalten und kann bei manchen Angriffen bedeutsame Informationen darüber preisgeben. Behandeln Sie gespeicherte Embeddings sensibler Texte mit derselben Sorgfalt wie den Text selbst, nicht als wären sie bereits anonymisiert.',
        },
      ],
      productNote:
        'ClawAIs Gedächtnis- und Kontextpaket-Funktionen erzeugen Embeddings lokal über Ollama und speichern sie in einer Vektordatenbank für die Ähnlichkeitssuche, statt Ihre Inhalte dafür an eine separate Cloud-Embedding-API zu senden.',
    },
    [LearnTopic.PROMPTING_VS_RAG_VS_FINE_TUNING]: {
      seo: {
        title: 'Prompting vs. RAG vs. Fine-Tuning: Was ist der Unterschied?',
        description:
          'Drei verschiedene Wege, um zu ändern, was ein Modell liefert: bessere Anweisungen, abgerufener Kontext oder ein verändertes Modell. Was jede Methode wirklich behebt, was sie nicht kann, und warum viele Produkte die dritte nie brauchen.',
        keywords: [
          'Prompting vs RAG vs Fine-Tuning',
          'wann ein LLM fine-tunen',
          'RAG oder Fine-Tuning',
        ],
      },
      eyebrow: 'Grundlagen',
      title: 'Prompting vs. RAG vs. Fine-Tuning: Was ist der Unterschied?',
      summary:
        'Prompting, Retrieval-Augmented Generation (RAG) und Fine-Tuning sind drei verschiedene Antworten auf dieselbe Grundfrage: Wie bringt man ein Modell dazu, das zu liefern, was man wirklich braucht? Jede Methode verändert einen anderen Teil des Systems — die Anfrage, den Kontext oder das Modell selbst — und behebt eine andere Art von Lücke. Die falsche Methode für das eigentliche Problem zu wählen, ist der häufigste Grund, warum ein Projekt ins Stocken gerät.',
      sections: [
        {
          id: 'three-different-fixes-for-three-different-problems',
          heading: 'Drei verschiedene Lösungen für drei verschiedene Probleme',
          paragraphs: [
            'Prompting ändert, was Sie dem Modell für eine Anfrage mitteilen: Anweisungen, Beispiele, Formatierungsregeln. Retrieval-Augmented Generation, kurz RAG, ändert, was das Modell für eine Anfrage sehen kann, indem relevantes Material abgerufen und dem Kontext hinzugefügt wird — siehe Was ist RAG? dazu, wie dieser Abrufschritt funktioniert. Fine-Tuning ändert das Modell selbst, indem seine Gewichte angepasst werden, sodass ein Muster fest verankert ist und ohne Wiederholung verfügbar bleibt. Das sind keine drei Schwierigkeitsgrade derselben Lösung; sie reagieren auf drei verschiedene Arten von Lücken.',
          ],
        },
        {
          id: 'prompting-changes-only-the-request',
          heading: 'Prompting ändert nur die Anfrage, um die es gerade geht',
          paragraphs: [
            'Ein Prompt besteht aus Anweisungen, Beispielen und Einschränkungen, die einer einzelnen Anfrage beigefügt werden. Davon bleibt nichts bestehen, sobald die Antwort zurückkommt — die nächste Anfrage startet wieder bei null, sofern Sie dieselben Anweisungen nicht erneut mitgeben. Das macht Prompting zur günstigsten und schnellsten Methode zum Iterieren: eine Formulierungsänderung lässt sich in Sekunden testen, ohne Infrastruktur und ohne erneutes Training.',
            'Prompting ist auch das Erste, was es auszuschöpfen lohnt, bevor man zu etwas anderem greift. Ein überraschend großer Teil der „das Modell kann X nicht“-Probleme sind eigentlich „die Anweisungen haben nie gesagt, X zu tun“-Probleme.',
          ],
        },
        {
          id: 'rag-adds-facts-without-touching-the-model',
          heading: 'RAG fügt Fakten und Dokumente hinzu, ohne das Modell anzurühren',
          paragraphs: [
            'RAG löst ein anderes Problem: Informationen, auf die das Modell nie trainiert wurde, oder Informationen, die sich zu schnell ändern, als dass Training damit Schritt halten könnte — Ihre eigenen Dokumente, aktuelle Datensätze, alles Private. Statt dem Modell diese Informationen beizubringen, findet ein Abrufschritt relevante Passagen und legt sie direkt als Kontext in die Anfrage, mithilfe von Embeddings, um nach Bedeutung statt nach exaktem Wortlaut zu suchen — siehe Was sind Embeddings? dazu, wie diese Suche darunter funktioniert.',
            'Da sich am Modell nichts ändert, aktualisiert eine Änderung der zugrunde liegenden Dokumente sofort, was das System beantworten kann, ganz ohne erneutes Training. Der Kompromiss ist, dass die Antwortqualität durch die Abrufqualität begrenzt ist: Wird die richtige Passage nie gefunden, kann das Modell eine Information nicht nutzen, die es nie gesehen hat.',
          ],
        },
        {
          id: 'fine-tuning-changes-the-model-itself',
          heading: 'Fine-Tuning ändert das Modell selbst',
          paragraphs: [
            'Fine-Tuning passt die Gewichte eines Modells anhand zusätzlicher Trainingsbeispiele an, sodass ein Verhaltensmuster — ein Tonfall, ein Antwortformat, eine in den Beispielen gezeigte Spezialfähigkeit — Teil des Modells wird, statt etwas, das Sie in jedem Prompt wiederholen oder per Abruf liefern müssen. Einmal trainiert, verhält sich das Modell standardmäßig so, bei jeder Anfrage, ohne zusätzliche Anweisungen.',
            'Es hat auch echte Kosten, die Prompting und RAG nicht haben: Trainingsbeispiele müssen vorbereitet und kuratiert werden, ein Trainingslauf muss durchgeführt und bewertet werden, und das Ergebnis ist ein bestimmtes Modellartefakt, das gehostet und mit der Verbesserung von Basismodellen synchron gehalten werden muss. Fine-Tuning fügt auch keine aktuellen oder sich ändernden Fakten hinzu — es verankert ein Muster aus einem festen Trainingsdatensatz und veraltet auf dieselbe Weise wie jedes statische Training.',
          ],
        },
        {
          id: 'matching-the-technique-to-the-failure',
          heading: 'Die Methode zum tatsächlichen Fehler passen, nicht zur ausgefeiltesten Option',
          paragraphs: [
            'Falscher Tonfall, falsches Format, übersehene Anweisungen: meist ein Prompting-Problem. Falsche oder fehlende Fakten, besonders zu eigenem oder sich schnell änderndem Material: meist ein Abrufproblem. Ein spezialisiertes Verhalten, das konsequent bei jeder Anfrage angewendet werden soll, ohne es jedes Mal neu zu erklären: genau dafür ist Fine-Tuning gemacht. Diese schließen sich nicht gegenseitig aus — ein feinabgestimmtes Modell kann weiterhin einen Prompt und abgerufenen Kontext erhalten —, aber jede Methode behebt nur den Fehler, für den sie gebaut ist, und die falsche zu wählen lässt das eigentliche Problem ungelöst und fügt Kosten und Komplexität hinzu.',
          ],
        },
        {
          id: 'why-many-products-skip-fine-tuning',
          heading: 'Warum viele Produkte nie zu Fine-Tuning greifen',
          paragraphs: [
            'Prompting und RAG lassen das zugrunde liegende Modell unangetastet, sodass ein Wechsel zu einem neueren oder besseren Basismodell meist eine reine Konfigurationsänderung ist. Ein feinabgestimmtes Modell ist an das Basismodell gebunden, aus dem es trainiert wurde — ein bedeutsames Basismodell-Upgrade bedeutet meist, Daten neu vorzubereiten und neu zu trainieren, statt einfach umzuschalten. Deshalb lösen viele Produkte ihr gesamtes Problem mit Prompting plus Abruf und greifen erst zu Fine-Tuning, wenn ein bestimmtes, klar definiertes Verhalten über ein enormes Anfragevolumen hinweg konsistent sein muss, ohne die Kosten, Anweisungen und Kontext jedes Mal zu wiederholen.',
          ],
        },
      ],
      faq: [
        {
          question: 'Aktualisiert RAG das Wissen des Modells dauerhaft?',
          answer:
            'Nein. RAG ändert, was im Kontext einer Anfrage enthalten ist; das zugrunde liegende Modell wird nie verändert. Die nächste Anfrage, die dasselbe Material nicht abruft, startet ohne es, genau wie jeder andere Prompt.',
        },
        {
          question: 'Ist Fine-Tuning immer genauer als Prompting oder RAG?',
          answer:
            'Nein. Fine-Tuning verankert ein Muster aus seinen Trainingsbeispielen, fügt aber keine Fakten hinzu, die in diesen Trainingsdaten fehlen, und hält Fakten nicht so aktuell wie Abruf es kann. Ein feinabgestimmtes Modell kann bei allem außerhalb seines Trainings weiterhin überzeugt falschliegen.',
        },
        {
          question: 'Können Prompting, RAG und Fine-Tuning kombiniert werden?',
          answer:
            'Ja. Sie ändern verschiedene Teile des Systems, sodass ein feinabgestimmtes Modell weiterhin abgerufenen Kontext und explizite Anweisungen in derselben Anfrage erhalten kann. Eine Kombination ist üblich; sie als sich gegenseitig ausschließende Wahl zu behandeln ist nicht nötig.',
        },
        {
          question: 'Was sollte ich zuerst ausprobieren?',
          answer:
            'Fast immer Prompting. Es braucht keine Infrastruktur, und eine Formulierungsänderung lässt sich in Sekunden testen. Wechseln Sie zu Abruf, wenn die Lücke fehlende oder veraltete Informationen sind, und ziehen Sie Fine-Tuning erst in Betracht, wenn ein bestimmtes, klar definiertes Verhalten über ein Anfragevolumen hinweg konsistent sein muss, das groß genug ist, um die Trainings- und Wartungskosten zu rechtfertigen.',
        },
      ],
      productNote:
        'ClawAIs Kontextpakete sowie Datei- und Workspace-Abruf fügen einer Anfrage relevantes Material hinzu, ohne das zugrunde liegende Modell anzurühren; ClawAI bietet kein Fine-Tuning von Modellen — die Cloud- und lokalen Modelle, an die weitergeleitet wird, werden als bereits trainiert verwendet.',
    },
    [LearnTopic.HOW_AI_TOOL_CALLING_WORKS]: {
      seo: {
        title: 'Wie funktioniert Tool-Aufruf bei KI wirklich?',
        description:
          'Ein Modell, das ein Tool aufruft, führt nie selbst etwas aus — es schlägt einen Namen und Argumente vor, und Ihre Anwendung entscheidet, ob der Aufruf ausgeführt wird. Wie die Anfrage-Antwort-Schleife funktioniert, und warum der Vorschlag eine Vermutung ist, keine Garantie.',
        keywords: [
          'wie Tool-Aufruf funktioniert',
          'LLM Function Calling erklärt',
          'Mechanismus der KI-Werkzeugnutzung',
        ],
      },
      eyebrow: 'Grundlagen',
      title: 'Wie funktioniert Tool-Aufruf bei KI wirklich?',
      summary:
        'Tool-Aufruf, manchmal Function Calling genannt, lässt ein Modell darum bitten, dass etwas in seinem Namen erledigt wird: eine Datenbank durchsuchen, eine API aufrufen, eine Berechnung ausführen. Was Menschen überrascht, ist, was das Modell in diesem Moment tatsächlich tut — es führt nichts aus. Es gibt eine strukturierte Anfrage aus, die ein Tool und dessen Argumente benennt, und Ihre Anwendung entscheidet, ob und wie darauf reagiert wird.',
      sections: [
        {
          id: 'what-tool-calling-actually-is',
          heading: 'Das Modell bekommt eine Speisekarte, keine Tastatur',
          paragraphs: [
            'Bevor eine Anfrage gesendet wird, beschreibt die Anwendung dem Modell die verfügbaren Tools: einen Namen, eine Beschreibung dessen, was jedes tut, und ein Schema für die erwarteten Argumente. Das Modell erhält keinen funktionierenden Code und keine aktive Verbindung zu irgendetwas — es erhält eine Beschreibung, so wie eine Person eine Speisekarte liest, ohne Zugang zur Küche zu haben.',
          ],
        },
        {
          id: 'the-model-never-executes-anything',
          heading: 'Das Modell führt nie selbst etwas aus',
          paragraphs: [
            'Wenn ein Modell entscheidet, dass ein Tool helfen würde, erzeugt es eine strukturierte Ausgabe — typischerweise einen Tool-Namen und eine Reihe von Argumenten — und hört dort auf. Es wurde noch nichts durchsucht, aufgerufen oder verändert. Die Anwendung, die die Anfrage gesendet hat, liest diese strukturierte Ausgabe, entscheidet, ob sie darauf reagiert, und führt gegebenenfalls die echte Funktion oder den API-Aufruf auf ihrer eigenen Infrastruktur aus.',
          ],
        },
        {
          id: 'the-loop-request-response-continue',
          heading: 'Ein vollständiger Austausch ist eine Schleife, kein einzelner Schritt',
          paragraphs: [
            'Der typische Ablauf: Die Anwendung sendet einen Prompt plus die Liste verfügbarer Tools; das Modell antwortet entweder mit einer Antwort oder einem vorgeschlagenen Tool-Aufruf; handelt es sich um einen Tool-Aufruf, führt die Anwendung ihn aus und sendet das Ergebnis als Teil des Gesprächs zurück; das Modell fährt dann fort, oft mit einer endgültigen Antwort, die dieses Ergebnis nutzt. Mehrstufige Aufgaben können diese Schleife mehrmals wiederholen, bevor eine Antwort den Nutzer erreicht.',
          ],
        },
        {
          id: 'a-proposed-call-is-a-guess-not-a-guarantee',
          heading:
            'Ein vorgeschlagener Aufruf ist eine plausible Vermutung, keine garantiert richtige',
          paragraphs: [
            'Ein Modell kann das falsche Tool vorschlagen, ein Argument erfinden, das nie im Schema stand, oder ein Tool aufrufen, obwohl gar nichts aufzurufen war — dieselbe probabilistische Generierung, die jede andere Ausgabe erzeugt, erzeugt auch einen Tool-Aufruf. Nichts am Mechanismus macht einen vorgeschlagenen Aufruf von sich aus sicher auszuführen. Eine Anwendung, die Argumente ausführt, ohne sie gegen das Schema zu prüfen, und ohne zu autorisieren, worauf der Aufruf tatsächlich zugreifen darf, vertraut einer Vermutung echten Zugriff an.',
          ],
        },
        {
          id: 'the-schema-is-the-interface-the-model-sees',
          heading: 'Das Schema ist die einzige Schnittstelle, die das Modell tatsächlich sieht',
          paragraphs: [
            'Name, Beschreibung und Argumentschema eines Tools sind die gesamte Spezifikation, mit der das Modell arbeiten muss — es hat keine andere Möglichkeit zu lernen, was ein Tool tut oder wie seine Parameter korrekt auszufüllen sind. Dieselbe zugrunde liegende Funktion, klar und eng beschrieben, wird tendenziell weit häufiger korrekt aufgerufen als eine vage beschriebene oder mit fachfremden Optionen gebündelte, weil das Modell Auswahl und Argumente allein aus dieser Beschreibung ableitet.',
          ],
        },
        {
          id: 'why-this-differs-from-the-model-writing-code',
          heading: 'Warum das anders ist, als ein Modell Code schreiben zu lassen',
          paragraphs: [
            'Ein Modell zu bitten, ein funktionierendes Skript zu erzeugen, und es zu bitten, ein vordefiniertes Tool aufzurufen, sind nicht dieselbe Anfrage. Ein Tool-Aufruf ist auf einen Namen und Argumente beschränkt, mit denen Ihre Anwendung bereits sicher umzugehen weiß; frei generierter Code kann versuchen, alles zu tun, was die Ausführungsumgebung erlaubt — ein viel größeres und andersartiges Sicherheitsproblem. Tool-Aufruf begrenzt das, worum ein Modell bitten kann, auf eine feste, überprüfbare Menge von Optionen.',
          ],
        },
      ],
      faq: [
        {
          question: 'Führt das Modell das Tool selbst aus?',
          answer:
            'Nein. Das Modell gibt eine strukturierte Anfrage aus, die ein Tool und dessen Argumente benennt. Die Anwendung, die die Anfrage gesendet hat, entscheidet, ob sie ausgeführt wird, und der eigentliche Funktions- oder API-Aufruf läuft auf der eigenen Infrastruktur der Anwendung, nicht im Modell.',
        },
        {
          question: 'Kann ein Modell ein Tool mit erfundenen Argumenten aufrufen?',
          answer:
            'Ja. Ein Modell kann einen Wert liefern, der nie Teil des Schemas war oder für das Tool keinen Sinn ergibt, weil der Aufruf genauso erzeugt wird wie jede andere Ausgabe. Argumente vor der Ausführung von etwas Echtem zu prüfen ist Aufgabe der Anwendung, nicht etwas, das das Modell garantiert.',
        },
        {
          question: 'Was passiert, wenn das Modell das falsche Tool aufruft?',
          answer:
            'Das hängt vollständig davon ab, wie die Anwendung gebaut ist. Eine gut gebaute prüft, ob der Aufruf sinnvoll ist, bevor sie ihn ausführt, und kann einen Fehler oder ein klärendes Ergebnis an das Modell zurückgeben, statt auf eine unpassende Anfrage zu reagieren; eine schlecht gebaute führt aus, was sie erhält.',
        },
        {
          question: 'Ist Tool-Aufruf dasselbe wie ein KI-Agent?',
          answer:
            'Nein, aber Agenten bauen meist darauf auf. Tool-Aufruf ist der zugrunde liegende Anfrage-Antwort-Mechanismus; ein Agent wiederholt diese Schleife typischerweise mehrfach, mit zusätzlicher Logik, die anhand jedes Ergebnisses entscheidet, was als Nächstes zu versuchen ist.',
        },
      ],
      productNote:
        'ClawAI stellt Modellen Workspace-Connectoren und andere Aktionen während einer Chat-Anfrage als aufrufbare Tools bereit; ein vorgeschlagener Aufruf wird gegen sein Schema geprüft, bevor ClawAI in Ihrem Namen etwas gegen einen echten Connector ausführt.',
    },
    [LearnTopic.WHAT_ARE_STRUCTURED_AI_OUTPUTS]: {
      seo: {
        title: 'Was sind strukturierte KI-Ausgaben?',
        description:
          'Ein Modell zu bitten, in JSON zu antworten, ist eine Anfrage, keine Garantie — die Antwort kann trotzdem fehlerhaft zurückkommen. Was eine Modellausgabe wirklich einschränkt, warum manche Mechanismen es erzwingen und andere nur bitten, und warum Validierung so oder so wichtig bleibt.',
        keywords: [
          'was sind strukturierte Ausgaben',
          'LLM JSON-Modus erklärt',
          'schema-eingeschränkte KI-Generierung',
        ],
      },
      eyebrow: 'Grundlagen',
      title: 'Was sind strukturierte KI-Ausgaben?',
      summary:
        'Eine strukturierte Ausgabe ist eine Modellantwort, die in ein bestimmtes Format passt — meist JSON gemäß einem definierten Schema — statt freier Fließtext, damit Code sie ohne Rätselraten parsen kann. Was Menschen überrascht: „das Modell bitten, JSON zurückzugeben“ und „das Modell garantiert gültiges JSON“ sind zwei verschiedene Aussagen, und nur manche Mechanismen liefern tatsächlich die zweite.',
      sections: [
        {
          id: 'what-structured-output-means',
          heading: 'Struktur bedeutet, dass sich nachgelagerter Code auf die Form verlassen kann',
          paragraphs: [
            'Eine strukturierte Ausgabe zwingt eine Antwort in eine definierte Form — feste Felder, bestimmte Typen, eine Aufzählung erlaubter Werte — statt eines Fließtextabsatzes. Es geht nicht um Stil; ein Programm, das die Antwort liest, kann einen Wert an einem bekannten Pfad abgreifen, statt Sätze zu parsen und die Bedeutung zu erraten.',
          ],
        },
        {
          id: 'two-ways-to-ask-for-structure',
          heading: 'Es gibt zwei verschiedene Wege, danach zu fragen',
          paragraphs: [
            'Der erste ist promptbasiert: Anweisungen sagen dem Modell, ausschließlich in JSON gemäß einer beschriebenen Form zu antworten. Das funktioniert mit praktisch jedem Modell und braucht keine besondere API-Unterstützung, ist aber eine Anfrage, die das Modell weiterhin ignorieren, teilweise falsch machen oder in nicht angeforderten Erklärtext einwickeln kann. Der zweite ist anbieterseitig erzwungen: Manche Anbieter bieten einen Modus, oft strukturierte Ausgaben oder JSON-Modus genannt, bei dem die Generierung selbst so eingeschränkt wird, dass bei jedem Schritt nur schemakonforme Token erzeugt werden können. Das ist ein stärkerer Mechanismus als eine Anweisung, nicht nur ein strenger klingender — und es ist ein eigenständiges Feature gegenüber Tool-Aufruf (siehe Wie funktioniert Tool-Aufruf?), der die Argumente einer benannten Funktion formt, nicht die eigentliche Antwort des Modells.',
          ],
        },
        {
          id: 'a-prompt-instruction-is-a-request-not-a-guarantee',
          heading: 'Eine Prompt-Anweisung ist eine Anfrage, keine Garantie',
          paragraphs: [
            'Kommt Struktur nur aus der Prompt-Formulierung, kann das Modell weiterhin eine nicht passende Ausgabe erzeugen — ein zusätzliches Feld, ein fehlendes, Fließtext vor dem JSON, einen Wert falschen Typs. Jedes System, das sich allein auf Prompt-Struktur verlässt, braucht einen echten Plan für den Fall, dass das Parsen fehlschlägt, nicht die Annahme, dass es nie passiert.',
          ],
        },
        {
          id: 'provider-enforced-output-is-a-different-guarantee',
          heading: 'Anbieterseitig erzwungene Struktur ist eine andere Art von Garantie',
          paragraphs: [
            'Erzwingt ein Anbieter die Generierung direkt gegen ein Schema, ist die Ausgabe weit zuverlässiger wohlgeformt, weil fehlerhafte Token von vornherein von der Erzeugung ausgeschlossen sind, statt nur davon abgeraten zu werden. Welche Anbieter und Modelle genau das unterstützen und wie strikt, variiert und ändert sich mit der Zeit — behandeln Sie promptbasierte und anbieterseitig erzwungene Struktur als unterschiedliche Zuverlässigkeitsstufen, nicht als austauschbare Wege zum selben Ergebnis.',
          ],
        },
        {
          id: 'schema-design-still-affects-quality',
          heading: 'Eine gültige Form ist nicht dasselbe wie eine richtige Antwort',
          paragraphs: [
            'Selbst bei stärkster Durchsetzung schränkt das Schema nur die Form ein, nicht die Bedeutung. Ein summary-Feld kann syntaktisch gültiges JSON sein und trotzdem drei ausschweifende Sätze statt einem enthalten, oder eine überzeugt falsche Zahl in einem als Zähler bezeichneten Feld. Ein vages oder zu großzügiges Schema erzeugt tendenziell technisch gültige, aber weiterhin unzuverlässig nutzbare Ausgaben.',
          ],
        },
        {
          id: 'validate-before-you-trust-it',
          heading: 'Erfolgreiches Parsen ist nicht dasselbe wie vertrauenswürdig',
          paragraphs: [
            'Ob Struktur aus einem Prompt oder aus anbieterseitiger Durchsetzung stammt — eine erfolgreich geparste Antwort bestätigt nur, dass die Form eingehalten wurde, nicht ob die Feldwerte korrekt, im gültigen Bereich oder sinnvoll sind. Ein geparstes Objekt als geprüfte Daten statt als zu prüfende Behauptung zu behandeln ist der häufigste Fehler von strukturierten Ausgabesystemen im Produktivbetrieb.',
          ],
        },
      ],
      faq: [
        {
          question: 'Ist eine strukturierte Ausgabe dasselbe wie ein Tool-Aufruf?',
          answer:
            'Nein. Tool-Aufruf schlägt eine benannte Funktion und ihre Argumente vor, die Ihre Anwendung möglicherweise ausführt; eine strukturierte Ausgabe formt die eigentliche Antwort des Modells in ein definiertes Format. Beide Mechanismen können unabhängig oder zusammen genutzt werden.',
        },
        {
          question: 'Garantiert die Bitte um JSON im Prompt, dass gültiges JSON zurückkommt?',
          answer:
            'Nein. Es ist eine Anfrage, die das Modell weiterhin falsch machen kann — zusätzlicher Text, ein fehlendes Feld, ein falscher Typ. Systeme, die sich allein auf die Prompt-Formulierung verlassen, brauchen einen definierten Rückfall für den Fall eines Parse-Fehlers, nicht die Annahme, dass er immer gelingt.',
        },
        {
          question: 'Ist das Ergebnis garantiert korrekt, wenn ein Anbieter ein Schema erzwingt?',
          answer:
            'Es ist garantiert wohlgeformt gemäß dem Schema — die richtigen Felder, die richtigen Typen. Nicht garantiert ist, dass die Werte in diesen Feldern korrekt oder sinnvoll sind; Erzwingung schränkt die Form ein, nicht die Wahrheit.',
        },
        {
          question: 'Muss ich eine strukturierte Antwort trotzdem validieren, bevor ich sie nutze?',
          answer:
            'Ja. Erfolgreiches Parsen bestätigt, dass die Form passte, nicht dass der Inhalt korrekt ist. Bereichs-, Typ- und Plausibilitätsprüfungen der Werte bleiben nötig, unabhängig davon, wie die Struktur erzeugt wurde.',
        },
      ],
      productNote:
        'ClawAIs Judge-Funktion bittet ein Modell per Prompt-Anweisung um eine bestimmte JSON-Form und fällt auf einen definierten „Parsen fehlgeschlagen“-Zustand zurück, statt zu raten, wenn eine Antwort nicht passt — ein direktes, funktionierendes Beispiel dafür, dass ein in einem Prompt angefordertes Schema eine Anfrage ist, keine Garantie.',
    },
    [LearnTopic.WHY_AI_HALLUCINATES]: {
      seo: {
        title: 'Warum halluziniert KI?',
        description:
          'Ein Sprachmodell äußert eine falsche Antwort mit demselben sicheren Ton wie eine richtige, weil es nie trainiert wurde zu wissen, was es nicht weiß. Warum Halluzination entsteht, warum sie sich nicht ganz beseitigen lässt, und was sie tatsächlich verringert.',
        keywords: ['warum halluziniert KI', 'LLM-Halluzination erklärt', 'KI erfindet Dinge'],
      },
      eyebrow: 'Grundlagen',
      title: 'Warum halluziniert KI?',
      summary:
        'Eine Halluzination ist, wenn ein Modell etwas Falsches als Tatsache äußert, ohne Einschränkung und ohne Anzeichen, dass es rät. Das passiert, weil ein Sprachmodell darauf trainiert ist, das statistisch wahrscheinlichste nächste Token zu erzeugen, nicht eine Behauptung gegen die Wirklichkeit zu prüfen — ein flüssiger, sicherer, falscher Satz und ein flüssiger, sicherer, richtiger entstehen durch genau denselben Prozess.',
      sections: [
        {
          id: 'a-confident-wrong-answer-not-a-crash',
          heading: 'Eine sichere falsche Antwort, kein Fehler, den das Modell melden kann',
          paragraphs: [
            'Ein Modell hat keinen getrennten „Ich weiß es nicht“-Modus, auf den es zurückfällt. Jede Antwort, richtig oder falsch, entsteht aus demselben Vorhersageprozess für das nächste Token, sodass ein erfundenes Zitat oder eine nicht existierende Funktion mit derselben flüssigen Sicherheit klingt wie eine richtige. Das unterscheidet Halluzination von einem gewöhnlichen Softwarefehler — keine Ausnahme wird ausgelöst, kein Signal gesetzt, nichts, das man abfangen könnte. Die Ausgabe wirkt gleich vertrauenswürdig, egal ob sie richtig oder falsch ist.',
          ],
        },
        {
          id: 'why-it-happens-training-and-prediction',
          heading: 'Warum es passiert: Vorhersage, kein Nachschlagen',
          paragraphs: [
            'Ein Sprachmodell ist darauf trainiert, plausible Fortsetzungen von Text vorherzusagen, gelernt aus Mustern in seinen Trainingsdaten. Es speichert Fakten nicht in abrufbarer, prüfbarer Form wie eine Datenbank — es speichert die statistische Form der Sprache, einschließlich der Fakten, die im Training häufig genug vorkamen, um diese Form zu prägen. Wenn ein Prompt nach etwas fragt, das das Modell selten, widersprüchlich oder nie gesehen hat, scheitert es nicht daran zu antworten; es erzeugt trotzdem die plausibelste Fortsetzung, denn das ist alles, was es zu tun weiß.',
            'Das erklärt auch, warum Halluzination bei spezifischen, seltenen oder aktuellen Details zunimmt — ein echt klingender, aber erfundener Gerichtsfall, eine plausible, aber falsche Versionsnummer, ein Zitat, das wie ein echter Papertitel klingt. Je spezifischer die Behauptung, desto wahrscheinlicher füllt das Modell eine Lücke mit etwas nur Plausiblem statt etwas Bekanntem.',
          ],
        },
        {
          id: 'grounding-narrows-it-does-not-remove-it',
          heading: 'Grounding verkleinert die Lücke, schließt sie aber nicht',
          paragraphs: [
            'Echten Quelltext vor das Modell zu legen, bevor es antwortet — Retrieval, siehe was RAG ist — verringert Halluzination bei Fragen, die diese Quellen tatsächlich abdecken, messbar, weil das Modell wiedergeben kann, was es gerade gelesen hat, statt allein aus Trainingsdaten vorherzusagen. Aber es ist eine starke Tendenz, keine Garantie: Liefert das Retrieval nichts Brauchbares oder sind die Quellen unvollständig, kann das Modell trotzdem flüssig aus dem Gedächtnis antworten, statt zuzugeben, dass die Quellen nicht geholfen haben.',
          ],
        },
        {
          id: 'multiple-models-and-a-judge-are-a-filter-not-a-cure',
          heading: 'Gegenprüfung ist ein Filter, keine Heilung',
          paragraphs: [
            'Dieselbe Frage mehreren Modellen zu stellen und die Antworten zu vergleichen, fängt Halluzinationen ab, die für das Training oder die Eigenheiten eines Modells spezifisch sind — erfindet nur eines von drei Modellen ein Detail, ist diese Uneinigkeit ein Signal. Es fängt keine Halluzination ab, die die meisten Modelle teilen, weil sich Trainingsdaten zwischen Anbietern überschneiden. Dieselbe Grenze gilt, wenn ein separates Modell als Judge eine Antwort bewertet: Ein Judge-Modell kann von derselben Art flüssigem, sicherem, falschem Text getäuscht werden, den es eigentlich prüfen soll.',
          ],
        },
        {
          id: 'what-actually-reduces-it',
          heading: 'Was Halluzination in der Praxis tatsächlich verringert',
          paragraphs: [
            'Keine einzelne Technik beseitigt Halluzination, weil sie eine Eigenschaft der Art ist, wie diese Modelle Text erzeugen, kein Fehler, der nur ein Modell oder einen Anbieter betrifft. Messbar hilft, die Aufgabe des Modells einzugrenzen: Antworten für Fragen, die die Quellen abdecken, in abgerufenem Quelltext verankern, Anfragen spezifisch statt offen halten, und die eigenen Zitate, Zahlen und konkreten Angaben des Modells als zu prüfende Behauptungen behandeln statt als bereits geprüfte Fakten. Techniken zu kombinieren — Grounding plus Gegenprüfung plus Verifikation gegen eine Quelle — verringert die Fehlerfläche mehr als jede einzelne für sich.',
          ],
        },
        {
          id: 'why-lower-temperature-does-not-fix-it',
          heading: 'Warum weniger Zufälligkeit das Problem nicht löst',
          paragraphs: [
            'Es ist eine verbreitete Annahme, dass eine niedrigere Temperature-Einstellung (siehe Temperature und Top-p) ein Modell wahrheitsgetreuer macht, weil die Ausgabe vorsichtiger und deterministischer wirkt. Temperature steuert, wie das Modell unter wahrscheinlichen nächsten Tokens auswählt — sie ändert nicht, was das Modell weiß, und fügt keinen Faktencheck hinzu. Ein Modell kann bei Temperature null genauso sicher halluzinieren wie bei eins; eine niedrigere Einstellung lässt es nur dieselbe falsche Antwort konsistenter halluzinieren.',
          ],
        },
      ],
      faq: [
        {
          question: 'Lässt sich Halluzination vollständig beheben?',
          answer:
            'Nein, nicht mit heutigen Sprachmodell-Architekturen. Sie entsteht daraus, wie diese Modelle Text erzeugen — plausible Fortsetzungen vorhersagen statt Fakten zu prüfen —, lässt sich also durch Grounding, Gegenprüfung und Verifikation verringern, aber nicht als Kategorie beseitigen.',
        },
        {
          question: 'Halluziniert ein größeres oder neueres Modell weniger?',
          answer:
            'Oft weniger bei verbreitetem Wissen, weil mehr davon im Training gut vertreten war. Das beseitigt nicht den zugrunde liegenden Mechanismus — ein neueres Modell kann bei seltenen, spezifischen oder aktuellen Details, für die es nicht gut trainiert wurde, weiterhin sicher halluzinieren.',
        },
        {
          question: 'Ist Halluzination dasselbe wie Lügen des Modells?',
          answer:
            'Nein. Lügen setzt voraus, die Wahrheit zu kennen und trotzdem etwas anderes zu sagen. Ein Modell hat keinen getrennten Kanal für „die Wahrheit“, mit dem es seine Ausgabe vergleicht — es erzeugt die statistisch plausibelste Fortsetzung, ob die nun zufällig zutrifft oder nicht.',
        },
        {
          question: 'Stoppt es Halluzination, dem Modell eigene Dokumente zu geben?',
          answer:
            'Es verringert sie deutlich bei Fragen, die diese Dokumente tatsächlich beantworten, weil das Modell abgerufenen Text wiedergeben kann statt aus Trainingsdaten vorherzusagen. Es hindert das Modell aber nicht daran, flüssig aus dem Gedächtnis zu antworten, wenn das Retrieval nichts Relevantes findet.',
        },
      ],
      productNote:
        'ClawAI behauptet nicht, Halluzination zu beseitigen — kein Produkt kann das ehrlich. Was es liefert, sind die Maßnahmen, die sie messbar eingrenzen: retrieval-gestützte Antworten, verankert in Ihren eigenen Dokumenten (siehe was RAG ist), Multi-Modell-Konsens, der Uneinigkeit zwischen Modellen sichtbar macht (siehe was KI-Konsens ist), und ein KI-Judge, der Antworten nach definierten Kriterien bewertet (siehe was ein KI-Judge ist) — drei echte, unabhängige Funktionen, jede ein Teilfilter, keine Garantie.',
    },
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
    [LearnTopic.HOW_TO_EVALUATE_AI_MODELS]: {
      seo: {
        title: 'KI-Modelle für den eigenen Einsatz bewerten',
        description:
          'Eine Bestenlisten-Zahl sagt Ihnen, wie ein Modell bei fremden Aufgaben abgeschnitten hat. Was tatsächlich vorhersagt, ob es für Ihre funktioniert — und die Abwägungen aus Qualität, Kosten, Latenz und Datenschutz, die eine einzelne Zahl nicht zeigen kann.',
        keywords: [
          'KI-Modelle bewerten',
          'KI-Modell auswählen',
          'Kriterien für den Modellvergleich',
        ],
      },
      eyebrow: 'Grundlagen',
      title: 'KI-Modelle für den eigenen Einsatz bewerten',
      summary:
        'Ein Modell für die eigene Arbeit zu bewerten heißt, es an den eigenen Aufgaben zu testen, statt einem Wert zu vertrauen, der an fremden Aufgaben berechnet wurde. Ein Modell, das eine öffentliche Bestenliste anführt, kann trotzdem die falsche Wahl für eine konkrete Aufgabe sein, sobald man Qualität gegen Kosten, Latenz und die Frage abwägt, was man ihm überhaupt schicken darf.',
      sections: [
        {
          id: 'a-leaderboard-score-is-not-your-score',
          heading: 'Eine Bestenlisten-Zahl ist nicht Ihre Zahl',
          paragraphs: [
            'Öffentliche Benchmarks messen die Leistung an einer festen Aufgabenmenge, die selten mit Ihrer identisch ist — anderer Bereich, anderes Format, andere Fehlerarten, die Ihnen wichtig sind. Ein Modell kann in einem allgemeinen Benchmark ganz oben stehen und trotzdem bei Ihrer speziellen Art von Anfrage schlechter abschneiden als ein kleineres, weil der Benchmark nie etwas Ähnliches getestet hat.',
            'Benchmark-Werte veralten zudem schnell und können davon beeinflusst sein, wie vertraut die Trainingsdaten eines Modells mit den genauen Benchmark-Fragen sind — ein hoher Wert ist also ein Hinweis, den man prüfen sollte, kein Urteil, dem man blind vertrauen sollte.',
          ],
        },
        {
          id: 'test-on-your-own-tasks',
          heading: 'Der einzige verlässliche Test ist Ihre eigene Aufgabe',
          paragraphs: [
            'Nehmen Sie eine repräsentative Stichprobe echter Anfragen aus Ihrem tatsächlichen Einsatzfall — keine vereinfachten Beispiele — und lassen Sie sie durch die infrage kommenden Modelle laufen. Bewerten Sie die Ausgaben danach, was Sie tatsächlich akzeptieren würden, nicht nach einer allgemeinen Vorstellung von einer guten Antwort. Ein Modell, das eleganten Text schreibt, aber die Fachbegriffe Ihres Bereichs falsch verwendet, passt schlecht, auch wenn es sich schön liest.',
          ],
        },
        {
          id: 'quality-is-not-the-only-dimension',
          heading:
            'Qualität ist nur eine von mehreren Dimensionen, die sich gegenseitig ausschließen',
          paragraphs: [
            'Das Modell mit der besten Qualitätsbewertung ist oft auch das langsamste und teuerste pro Anfrage. Ob sich dieser Tausch lohnt, hängt von der Aufgabe ab: Ein Batch-Prozess im Hintergrund kann sich meist ein langsameres, günstigeres Modell leisten; eine interaktive Chat-Antwort meist kein langsames, egal wie gut es ist. Ein Modell isoliert nur nach Qualität zu bewerten, übergeht genau die Abwägung, die tatsächlich entscheidet, ob es in Ihrem Produkt einsetzbar ist.',
          ],
        },
        {
          id: 'privacy-and-data-handling-are-evaluation-criteria-too',
          heading: 'Was Sie ihm schicken dürfen, ist auch ein Bewertungskriterium',
          paragraphs: [
            'Ein Modell, das gut abschneidet, aber verlangt, sensible Daten an Dritte über das offene Internet zu schicken, kann für eine bestimmte Aufgabe unabhängig von der Qualität ungeeignet sein — diese Einschränkung muss geprüft werden, bevor Qualität überhaupt relevant wird, nicht erst, nachdem Sie schon einen Favoriten gewählt haben. Betrifft eine Aufgabe Daten, die Sie nicht aus Ihrer eigenen Infrastruktur herausschicken dürfen, engt der lokale Betrieb (siehe lokale KI) oder Self-Hosting das Feld ein, bevor Benchmarks überhaupt ins Spiel kommen.',
          ],
        },
        {
          id: 'know-a-models-known-weaknesses',
          heading:
            'Jedes Modell hat bekannte Schwachstellen — finden Sie Ihre, bevor Sie sich darauf verlassen',
          paragraphs: [
            'Die bekannte Halluzinationsneigung eines Modells bei fachfremden Fragen oder seine Konsistenz bei Aufgaben, die sorgfältiges schrittweises Denken erfordern, sind mindestens so wichtig wie sein Durchschnittswert. Berührt Ihr Einsatzfall einen Bereich, in dem das Modell zum Raten neigt, bewerten Sie genau das, statt anzunehmen, ein starker Durchschnittswert decke es ab — siehe warum KI halluziniert dafür, warum die durchschnittliche Leistung das Verhalten an einer bestimmten Schwachstelle nicht vorhersagt.',
          ],
        },
        {
          id: 'reevaluate-not-just-at-launch',
          heading: 'Bewertung ist keine einmalige Entscheidung',
          paragraphs: [
            'Anbieter aktualisieren Modelle — manchmal stillschweigend, unter demselben Namen und Endpunkt —, und Preise sowie Ratenlimits ändern sich. Ein Modell, das zum Zeitpunkt Ihrer Bewertung die richtige Wahl war, kann später nicht mehr passen. Die Modellwahl als regelmäßig zu überprüfende Entscheidung zu behandeln, statt als einmal beim Start festgelegt, fängt diese Verschiebung ab, bevor sie zum Produktionsproblem wird.',
          ],
        },
      ],
      faq: [
        {
          question: 'Ist eine höhere Benchmark-Zahl immer die bessere Wahl?',
          answer:
            'Nicht unbedingt. Benchmarks testen eine feste Aufgabenmenge, die Ihrer vielleicht nicht ähnelt, und eine höhere Zahl geht oft mit höheren Kosten oder Latenz einher. Der einzige Weg, es zu wissen, ist, das Modell an Ihren eigenen repräsentativen Aufgaben zu testen.',
        },
        {
          question: 'Wie viele Testfälle brauche ich, um ein Modell richtig zu bewerten?',
          answer:
            'Genug, um die Bandbreite der Anfragen abzudecken, die Ihr Einsatzfall tatsächlich erzeugt, einschließlich Grenzfällen und der Art von Eingaben, die typischerweise schiefgehen. Ein paar einfache Beispiele lassen fast jedes Modell gut aussehen; die schwierigeren, repräsentativeren Fälle zeigen die echten Unterschiede.',
        },
        {
          question: 'Sollte ich ein Modell neu bewerten, nachdem ich es bereits gewählt habe?',
          answer:
            'Ja. Anbieter aktualisieren Modelle unter demselben Namen, Preise und Ratenlimits ändern sich, und Ihr eigener Einsatzfall entwickelt sich weiter. Behandeln Sie die Wahl als regelmäßig überprüft statt als beim Start dauerhaft festgelegt.',
        },
        {
          question: 'Muss ich Datenschutz und Datenverarbeitung getrennt von der Qualität prüfen?',
          answer:
            'Ja, und das sollte zuerst kommen, wenn es eine Option ausschließt. Die Qualitätsbewertung eines Modells ist irrelevant, wenn die Aufgabe Daten betrifft, die Sie diesem Anbieter überhaupt nicht schicken dürfen.',
        },
      ],
      productNote:
        'Statt eine Chat-Antwort auf eine einzelne Zahl zu reduzieren, zeigt ClawAIs Routing-Transparenz-Panel die Kostenklasse, die Latenzklasse, die Routing-Konfidenz und ob für diese konkrete Antwort ein Fallback- oder Judge-Modell verwendet wurde — Bewertungssignal an die tatsächliche Anfrage gebunden, keine allgemeine Bestenlisten-Zahl.',
    },
    [LearnTopic.HOW_TO_READ_AI_BENCHMARKS]: {
      seo: {
        title: 'KI-Benchmarks richtig lesen, ohne sich täuschen zu lassen',
        description:
          'Eine Benchmark-Zahl wirkt präzise, was es leicht macht, ihr zu viel zu vertrauen. Was ein Wert wie MMLU oder HumanEval tatsächlich misst, die üblichen Arten, wie Benchmark-Zahlen in die Irre führen, und was Sie prüfen sollten, bevor Sie einen als aussagekräftig für Ihren Fall behandeln.',
        keywords: [
          'KI-Benchmarks richtig lesen',
          'KI-Benchmark-Werte erklärt',
          'LLM-Benchmarks verstehen',
        ],
      },
      eyebrow: 'Grundlagen',
      title: 'KI-Benchmarks richtig lesen, ohne sich täuschen zu lassen',
      summary:
        'Ein Benchmark-Wert misst die Leistung auf einer einzigen, festen Menge von Testfragen — nicht mehr und nicht weniger. Die Zahl wirkt präzise und objektiv, und genau deshalb ist es leicht, ihr zu viel zu vertrauen: Eine einzelne Zahl kann nicht zeigen, was der Test abgedeckt hat, wie das Modell befragt wurde, oder ob die Fragen in die Trainingsdaten eingesickert sind, bevor das Modell sie je real zu Gesicht bekam.',
      sections: [
        {
          id: 'a-benchmark-is-one-fixed-test-not-a-general-measure',
          heading: 'Ein Benchmark ist ein fester Test, kein allgemeines Fähigkeitsmaß',
          paragraphs: [
            'Bekannte Benchmarks wie MMLU (allgemeines Wissen als Multiple-Choice), HumanEval (kurze Programmieraufgaben) oder GSM8K (Textaufgaben aus der Grundschulmathematik) testen jeweils eine enge, spezifische Fähigkeit in einem bestimmten Format. Ein Modell kann bei einem gut abschneiden und bei einer Aufgabe schlecht, die einem Menschen ähnlich vorkommt, aber anders strukturiert ist — etwa umfangreiches Programmieren statt kurzer isolierter Funktionen, oder offenes Schreiben statt Multiple-Choice-Erinnerung.',
          ],
        },
        {
          id: 'contamination-benchmark-questions-leak-into-training-data',
          heading: 'Benchmark-Fragen können in Trainingsdaten einsickern',
          paragraphs: [
            'Beliebte Benchmarks sind öffentlich, und ihre Fragen zirkulieren weit im Web, in Papern und in Forendiskussionen — genau die Art von Text, mit der große Modelle trainiert werden. Wenn ein Modell die Antwort effektiv schon einmal gesehen hat, spiegelt sein Wert Auswendiglernen bei diesem konkreten Test wider, nicht die allgemeine Fähigkeit, die der Benchmark eigentlich abbilden soll. Das nennt man Kontamination, und für Außenstehende ist sie allein an der Zahl schwer zu erkennen.',
          ],
        },
        {
          id: 'scores-can-depend-heavily-on-how-the-model-was-prompted',
          heading: 'Der berichtete Wert kann stark davon abhängen, wie das Modell befragt wurde',
          paragraphs: [
            'Dasselbe Modell kann je nach Prompt-Format, Anzahl der vorgeführten Beispiele vor der eigentlichen Frage und ob schrittweises Denken vor der Antwort erlaubt war, sehr unterschiedliche Werte erzielen. Ein Anbieter, der sein bestes Ergebnis unter großzügigen Bedingungen meldet, lügt nicht — aber diese Zahl entspricht möglicherweise nicht dem, was Sie bei einem schlichten, alltäglichen Prompt bekommen.',
          ],
        },
        {
          id: 'benchmarks-saturate-and-stop-being-useful',
          heading:
            'Benchmarks sättigen sich — und werden nutzlos, sobald die meisten Modelle sie bestehen',
          paragraphs: [
            'Sobald die meisten führenden Modelle bei einem Benchmark nah am Maximum liegen, unterscheidet er sie nicht mehr sinnvoll, auch wenn die ältere Zahl oft weiter zitiert wird. Ein nahezu perfekter Wert bei einem gesättigten Benchmark sagt weniger aus als früher; neuere, schwierigere Benchmarks lösen ihn meist ab, und ein Marketingvergleich, der sich auf eine alte, gesättigte Zahl stützt, verdient einen zweiten Blick.',
          ],
        },
        {
          id: 'a-single-average-hides-where-a-model-actually-struggles',
          heading:
            'Ein einzelner Durchschnittswert verbirgt genau die Stellen, an denen ein Modell schwächelt',
          paragraphs: [
            'Ein Gesamt-Benchmark-Wert ist ein Durchschnitt über viele Fragen unterschiedlicher Schwierigkeit und Art. Ein Modell kann im Schnitt gut abschneiden und trotzdem in einer bestimmten Unterkategorie unzuverlässig sein, die Ihnen wichtig ist — eine bestimmte Art von Schlussfolgern, ein bestimmter Bereich, eine bestimmte Aufgabenlänge. Der Durchschnitt ist eine Zusammenfassung, und Zusammenfassungen verwerfen genau die Details, die für eine reale Entscheidung meist am wichtigsten sind.',
          ],
        },
        {
          id: 'treat-a-benchmark-as-a-starting-point-not-a-verdict',
          heading: 'Behandeln Sie einen Benchmark als Ausgangspunkt, nicht als Urteil',
          paragraphs: [
            'Ein Benchmark-Wert ist am nützlichsten als grober erster Filter — um ein Modell klar auszuschließen oder eine Vorauswahl fürs weitere Testen zu treffen — nicht als letztes Wort darüber, welches Modell zu verwenden ist. Siehe KI-Modelle bewerten dafür, was tatsächlich Eignung vorhersagt, sobald Sie eine Vorauswahl getroffen haben: das Testen an eigenen repräsentativen Aufgaben, das kein veröffentlichter Benchmark ersetzen kann.',
          ],
        },
      ],
      faq: [
        {
          question: 'Was testet ein Benchmark wie MMLU oder HumanEval eigentlich?',
          answer:
            'Eine feste, spezifische Menge von Fragen in einem bestimmten Format — MMLU ist allgemeines Wissen als Multiple-Choice, HumanEval sind kurze Programmieraufgaben. Jeder misst eine enge Fähigkeit, keine allgemeine Intelligenz oder Fähigkeit über jede Aufgabe hinweg.',
        },
        {
          question: 'Warum wirken Benchmark-Werte verschiedener Anbieter manchmal widersprüchlich?',
          answer:
            'Werte können vom Prompt-Format, der Anzahl gezeigter Beispiele vor der eigentlichen Frage und davon abhängen, ob schrittweises Denken erlaubt war. Unterschiedliche Berichtsbedingungen ergeben unterschiedliche Zahlen für dasselbe zugrundeliegende Modell.',
        },
        {
          question: 'Was ist Benchmark-Kontamination?',
          answer:
            'Wenn die öffentlichen Fragen eines Benchmarks in den Trainingsdaten eines Modells landen, sodass das Modell die Antworten effektiv schon vor dem Test gesehen hat. Der resultierende Wert spiegelt Auswendiglernen wider, nicht die Fähigkeit, die der Benchmark eigentlich messen sollte.',
        },
        {
          question: 'Sollte ich Benchmark-Werte komplett ignorieren?',
          answer:
            'Nein — sie sind ein vernünftiger erster Filter, um klar ungeeignete Modelle auszuschließen oder eine Vorauswahl zu treffen. Behandeln Sie die endgültige Zahl nur nicht als Urteil; testen Sie die Vorauswahl an eigenen repräsentativen Aufgaben, bevor Sie entscheiden.',
        },
      ],
      productNote:
        'ClawAI veröffentlicht keine eigene Benchmark-Bestenliste und beansprucht keinen proprietären Wert für irgendein Modell — stattdessen zeigt das Routing-Transparenz-Panel die tatsächliche Kostenklasse, Latenzklasse und Routing-Konfidenz hinter einer konkreten Antwort, sodass Sie eine Antwort an Ihrer eigenen Anfrage messen können statt an einem veröffentlichten Testset, das Sie nicht einsehen können.',
    },
    [LearnTopic.WHAT_IS_PROMPT_INJECTION]: {
      seo: {
        title: 'Was ist Prompt Injection?',
        description:
          'Ein Sprachmodell kann nicht zuverlässig zwischen Ihren Anweisungen und Anweisungen unterscheiden, die im Inhalt versteckt sind, den es liest — einer Webseite, einem Dokument, einem Tool-Ergebnis. Was Prompt Injection wirklich ist, warum ein klügeres Modell es nicht vollständig löst, und was den Schaden begrenzt, wenn es passiert.',
        keywords: [
          'was ist Prompt Injection',
          'Prompt-Injection-Angriff erklärt',
          'indirekte Prompt Injection',
        ],
      },
      eyebrow: 'Grundlagen',
      title: 'Was ist Prompt Injection?',
      summary:
        'Prompt Injection ist Text, der nicht von Ihnen stammt und dem Modell trotzdem Anweisungen gibt — versteckt in einer Webseite, die es liest, einem Dokument, das es zusammenfasst, oder dem Ergebnis eines Tools, das es aufruft. Ein Sprachmodell hat keine zuverlässige, eingebaute Möglichkeit, „die Anweisungen des Nutzers“ von „Text, der zufällig wie Anweisungen aussieht“ zu unterscheiden, denn beides kommt als dieselbe Art von Eingabe an: Wörter im Kontextfenster.',
      sections: [
        {
          id: 'direct-vs-indirect-injection',
          heading: 'Zwei Formen: direkt und indirekt',
          paragraphs: [
            'Direkte Injection bedeutet, dass jemand Anweisungen direkt in den Chat tippt, um das beabsichtigte Verhalten des Systems zu überschreiben — das Modell bitten, seine Anweisungen zu ignorieren, versteckte Konfiguration preiszugeben, oder außerhalb seines vorgesehenen Umfangs zu handeln. Indirekte Injection ist die folgenreichere Form: Anweisungen, die in Inhalten platziert wurden, die das Modell in Ihrem Namen liest — eine Webseite, eine E-Mail, eine Datei, eine API-Antwort —, die nie als Befehle gedacht waren, die das Modell aber nicht zuverlässig davon unterscheiden kann.',
          ],
        },
        {
          id: 'why-a-smarter-model-does-not-solve-it',
          heading: 'Warum ein klügeres Modell das nicht von selbst löst',
          paragraphs: [
            'Das Problem ist nicht, dass Modelle nicht intelligent genug sind — es ist architektonisch bedingt. Alles, was ein Modell sieht, ob Ihre Anfrage oder aus einer nicht vertrauenswürdigen Quelle geholter Text, wird zur selben Art von Token-Sequenz, sobald es ins Kontextfenster gelangt. Es gibt keinen separaten, manipulationssicheren Kanal für „vertrauenswürdige Anweisungen“ gegenüber „zu lesendem Inhalt“. Ein leistungsfähigeres Modell kann besser darin werden, gängige Injection-Formulierungen zu erkennen, aber eine ausreichend getarnte Anweisung — über Text verteilt, indirekt formuliert, in Formatierung versteckt — kann trotzdem durchrutschen, weil die zugrunde liegende Architektur keine harte Grenze durchsetzt.',
          ],
        },
        {
          id: 'why-tool-calling-raises-the-stakes',
          heading: 'Das Risiko steigt stark, sobald ein Modell Tools aufrufen kann',
          paragraphs: [
            'Ein Chatbot, der nur Text erzeugt, begrenzt Injection auf schlechte oder irreführende Ausgabe — ärgerlich, aber eingegrenzt. Sobald ein Modell Tools aufrufen kann (siehe wie Tool-Aufrufe funktionieren) — eine E-Mail senden, einen Befehl ausführen, eine Datei ändern —, kann eine erfolgreiche Injection zu einer unerwünschten realen Aktion werden, nicht nur zu einem schlechten Satz. Deshalb tragen Systeme, die Web-Browsing oder Dokumentenlesen mit Tool-Zugriff kombinieren, deutlich mehr Injection-Risiko als ein einfacher Chatbot.',
          ],
        },
        {
          id: 'output-filtering-and-scope-limit-not-eliminate',
          heading: 'Filterung und Eingrenzung verringern das Risiko; keine der beiden beseitigt es',
          paragraphs: [
            'Das Scannen abgerufener Inhalte auf bekannte Injection-Muster fängt manche Versuche ab, aber jede feste Musterliste lässt sich umgehen, indem die Anweisung anders formuliert wird — das ist ein Filter, keine Garantie. Was tatsächlichen Schaden zuverlässiger verringert, ist zu begrenzen, was ein Modell tun darf, unabhängig davon, was ihm gesagt wurde: Tool-Zugriff eng eingrenzen, eine Bestätigung vor einer destruktiven oder nach außen wirkenden Aktion verlangen, und einem Modell nie dauerhafte Berechtigungen einräumen, die über die konkrete Aufgabe vor ihm hinausgehen.',
          ],
        },
        {
          id: 'treat-fetched-content-as-untrusted-input',
          heading:
            'Der Inhalt, den ein Modell liest, ist nicht vertrauenswürdige Eingabe, keine neutrale Faktenquelle',
          paragraphs: [
            'Jedes System, das einem Modell erlaubt, externen Inhalt zu lesen — ein Suchergebnis, eine gescrapte Seite, ein von einem Nutzer hochgeladenes Dokument —, setzt es Anweisungen aus, um die niemand gebeten hat. Die praktische Konsequenz ist, diesen Inhalt so zu behandeln wie unvalidierte Nutzereingaben in jeder anderen Software: davon ausgehen, dass er etwas Feindliches enthalten kann, und das umgebende System so gestalten, dass eine erfolgreiche Injection begrenzte Reichweite hat, statt anzunehmen, dass Injection nicht vorkommt.',
          ],
        },
      ],
      faq: [
        {
          question: 'Kann Prompt Injection vollständig verhindert werden?',
          answer:
            'Nein, nicht mit aktuellen Modellarchitekturen. Es gibt keine eingebaute, manipulationssichere Trennung zwischen den Anweisungen eines Nutzers und Text, den ein Modell anderswoher liest, sodass Filterung und Eingrenzung das Risiko verringern und Schaden begrenzen, aber keine Verhinderung garantieren können.',
        },
        {
          question: 'Ist Prompt Injection dasselbe wie Jailbreaking?',
          answer:
            'Sie überschneiden sich, sind aber nicht identisch. Jailbreaking bedeutet meist, dass ein Nutzer direkt versucht, ein Modell dazu zu bringen, seine eigenen Richtlinien zu umgehen. Prompt Injection bezeichnet häufiger Anweisungen, die in Inhalten versteckt sind, die das Modell im Namen des Nutzers liest, ohne dessen Wissen.',
        },
        {
          question: 'Spielt Prompt Injection bei einem Chatbot ohne Tool-Nutzung eine Rolle?',
          answer:
            'Das Risiko ist kleiner — eine erfolgreiche Injection kann eine irreführende oder manipulierte Antwort erzeugen, aber keine Handlung über die Texterzeugung hinaus auslösen. Das Risiko steigt erheblich, sobald ein Modell Tools aufrufen kann, die etwas außerhalb des Gesprächs bewirken.',
        },
        {
          question: 'Reicht das Scannen von Inhalten nach Injection-Mustern als Schutz aus?',
          answer:
            'Es fängt bekannte, erkennbare Versuche ab, aber jede feste Musterliste lässt sich durch Umformulierung umgehen. Echter Schutz kommt auch daher, zu begrenzen, was ein Modell tun darf — enger Tool-Umfang und erforderliche Bestätigung für folgenreiche Aktionen — nicht allein aus Erkennung.',
        },
      ],
      productNote:
        'ClawAIs Recherche-Dienst scannt abgerufene Webinhalte auf bekannte Prompt-Injection-Muster und schwärzt geheim aussehende Tokens, bevor dieser Inhalt ein Modell erreicht — er protokolliert, was er erkennt, statt stillschweigend zu blockieren, da keine feste Musterliste jeden Versuch erfassen kann. Diese Erkennungsschicht ist ein Teil einer Verteidigung, die auch davon abhängt, welche Tools ein Modell überhaupt aufrufen darf.',
    },
  },
};
