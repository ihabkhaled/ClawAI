import { ModelFamilyPair } from '@/enums/model-family-pair.enum';
import type { CompareModelsDictionary } from '@/types/compare-models.types';

export const DE_COMPARE_MODELS_CONTENT: CompareModelsDictionary = {
  labels: {
    onThisPage: 'Auf dieser Seite',
    faqTitle: 'Häufig gestellte Fragen',
    relatedTitle: 'Wie es weitergeht',
    lastReviewed: 'Zuletzt geprüft',
    backToHub: 'Alle Paarungen',
    ctaTitle: 'Selbst ausprobieren statt uns nur zu glauben',
    ctaBody:
      'ClawAI leitet eine Unterhaltung an das passende Modell weiter, über alle angebundenen Anbieter hinweg, aus einem einzigen Workspace heraus.',
    startFree: 'Kostenlos starten',
    seeFeatures: 'Was ClawAI kann',
    seePricing: 'Aktuellen Katalog auf der Preisseite prüfen',
  },
  hub: {
    seo: {
      title: 'Wie ClawAI zwischen Modellfamilien weiterleitet',
      description:
        'Wie der eigene Router von ClawAI für eine bestimmte Anfrage zwischen zwei Anbieterfamilien wählt — Kostenklasse, Kontextbedarf und ob eine Anfrage lokal bleiben muss. Keine Rangliste zwischen genannten Produkten, keine erfundenen Benchmarks.',
      keywords: [
        'wie ClawAI zwischen Modellanbietern weiterleitet',
        'zwischen KI-Modellfamilien wählen',
        'Routing zwischen OpenAI, Anthropic und Google',
      ],
    },
    eyebrow: 'Modell-Routing',
    title: 'Wie ClawAI zwischen Modellfamilien weiterleitet',
    summary:
      'Dieser Übersichtsbereich stellt OpenAI, Anthropic, Google, DeepSeek und xAI nicht gegeneinander in eine Rangliste — das ist eine andere Frage als die, die der Router von ClawAI tatsächlich beantwortet. Was der Router tut, ist, für eine bestimmte Anfrage zu wählen, an welche Familie er sie sendet, und dabei Kostenklasse, wie viel Kontext die Anfrage braucht, ob der Workload auf selbst kontrollierter Hardware bleiben muss, und den von Ihnen gewählten Routing-Modus abzuwägen. Jede Seite unten erklärt diese Wahl für ein Paar von Familien, gestützt auf die eigenen Routing-Modi von ClawAI und die qualitativen Kostenklassen im Modellkatalog — nie auf einen Benchmark-Wert.',
    pairsHeading: 'Paarung auswählen',
    cardSummaries: {
      [ModelFamilyPair.OPENAI_VS_ANTHROPIC]:
        'Wie der Router eine Anfrage zwischen den Katalogen von OpenAI und Anthropic abwägt.',
      [ModelFamilyPair.OPENAI_VS_GOOGLE]:
        'Wie der Router eine Anfrage zwischen den Katalogen von OpenAI und Google abwägt.',
      [ModelFamilyPair.ANTHROPIC_VS_GOOGLE]:
        'Wie der Router eine Anfrage zwischen den Katalogen von Anthropic und Google abwägt.',
      [ModelFamilyPair.OPENAI_VS_DEEPSEEK]:
        'Wie die Kostenklasse die Wahl des Routers zwischen OpenAI und DeepSeek verschiebt.',
      [ModelFamilyPair.OPENAI_VS_XAI]:
        'Wie der Router eine Anfrage zwischen den Katalogen von OpenAI und xAI abwägt.',
      [ModelFamilyPair.CLOUD_VS_LOCAL]:
        'Was sich ändert, wenn eine Anfrage auf selbst kontrollierter Hardware bleiben muss statt bei einem Cloud-Anbieter.',
    },
  },
  pairs: {
    [ModelFamilyPair.OPENAI_VS_ANTHROPIC]: {
      seo: {
        title: 'OpenAI vs. Anthropic: Wie ClawAI zwischen ihnen weiterleitet',
        description:
          'Wie der Router von ClawAI für eine bestimmte Anfrage zwischen den Modellkatalogen von OpenAI und Anthropic wählt — Kostenklasse, Passung zum Reasoning-Modus und manuelles Festlegen. Kein Gewinner benannt. Vor der Planwahl den aktuellen Katalog prüfen.',
        keywords: [
          'OpenAI vs. Anthropic',
          'ClawAI Router OpenAI Anthropic',
          'zwischen OpenAI- und Claude-Modellen wählen',
        ],
      },
      eyebrow: 'Modell-Routing',
      title: 'OpenAI vs. Anthropic: Wie ClawAI zwischen ihnen weiterleitet',
      summary:
        'OpenAI und Anthropic veröffentlichen beide Kataloge, die mehrere Kostenklassen umfassen, von günstigen, schnell antwortenden Modellen bis zu Premium- und höchsten Stufen für schwierigere Probleme. Diese Seite stellt keine der beiden Familien über die andere — sie erklärt, was der Router von ClawAI tatsächlich abwägt, wenn eine Anfrage plausibel an beide gehen könnte, und wie Sie diese Wahl selbst überschreiben können.',
      sections: [
        {
          id: 'cost-class-across-both-catalogs',
          heading:
            'Die Kostenklasse verteilt sich über beide Kataloge, nicht auf je eine Stufe pro Anbieter',
          paragraphs: [
            'Der Modellkatalog von ClawAI versieht jedes hinterlegte Modell mit einer qualitativen Kostenklasse — Budget, Standard, Premium oder Höchststufe — statt mit einem genauen Preis. Der Katalog von OpenAI reicht von Budget bis Premium; der von Anthropic von Standard bis zur höchsten Stufe. Kein Anbieter besetzt das günstige oder das teure Ende allein, sodass eine kostenbasierte Router-Entscheidung die konkreten Modelle betrachten muss, die in beiden Katalogen verfügbar sind, statt anzunehmen, ein Anbieter sei durchgängig günstiger.',
          ],
        },
        {
          id: 'routing-modes-that-touch-this-pair',
          heading: 'Die Routing-Modi, die diese Paarung betreffen',
          paragraphs: [
            'Unter Auto-Routing kann der Router von ClawAI eine Anfrage an ein Modell aus beiden Katalogen senden, je nachdem, was die Anfrage braucht. High-Reasoning-Routing bevorzugt ein Modell, das dafür gebaut ist, ein Problem in Schritten zu durchdenken, und sowohl OpenAI als auch Anthropic veröffentlichen Modelle dieser Art; Cost-Saver-Routing bevorzugt ein Modell mit niedrigerer Kostenklasse, das ebenfalls in beiden Katalogen existiert. Im Manual-Model-Modus können Sie ein bestimmtes Modell von beiden Anbietern direkt festlegen — die bewusste Überschreibung für eine wiederkehrende Aufgabe, bei der Sie bereits wissen, welches passt.',
          ],
        },
        {
          id: 'what-this-page-does-not-claim',
          heading: 'Was diese Seite nicht behauptet',
          paragraphs: [
            'Keine Seite auf dieser Website veröffentlicht einen Benchmark-Wert oder eine Geschwindigkeitsangabe zum Vergleich dieser beiden Anbieter, und diese hier macht damit keinen Anfang. Im verlinkten Leitfaden zum Lesen von KI-Benchmarks und im Leitfaden zur Bewertung von KI-Modellen erfahren Sie, wie Sie eine Passung an Ihrer eigenen Arbeitslast prüfen, statt eine Rangfolge von irgendwo zu übernehmen, auch nicht von dieser Seite.',
          ],
        },
      ],
      faq: [
        {
          question: 'Ist OpenAI oder Anthropic besser?',
          answer:
            'Diese Seite wird das nicht sagen — beide veröffentlichen Modelle über mehrere Kostenklassen und Einsatzzwecke hinweg, und kein verlässlicher Benchmark klärt das für jede Aufgabe. Im verlinkten Leitfaden zur Bewertung von KI-Modellen finden Sie eine Methode, die Sie an Ihrer eigenen Arbeitslast anwenden können.',
        },
        {
          question: 'Wählt der Router von ClawAI automatisch zwischen OpenAI und Anthropic?',
          answer:
            'Unter Auto-, High-Reasoning- oder Cost-Saver-Routing ja — der Router kann eine Anfrage an ein Modell aus beiden Katalogen senden, je nachdem, was die Anfrage braucht. Sie können auch im Manual-Model-Modus ein bestimmtes Modell von beiden Anbietern festlegen.',
        },
        {
          question: 'Kann ich OpenAI- und Anthropic-Modelle im selben Workspace nutzen?',
          answer:
            'Ja — ClawAI bindet beide als getrennte Anbieter an, und Auto-Routing kann je nach Anfrage auf beide zurückgreifen, oder Sie legen im Manual-Model-Modus für unterschiedliche Aufgaben ein bestimmtes Modell von jedem fest.',
        },
      ],
      productNote:
        'Das Auto- und das High-Reasoning-Routing von ClawAI können für eine bestimmte Anfrage auf den Katalog von OpenAI oder den von Anthropic zurückgreifen, oder Sie legen direkt im Manual-Model-Modus eins fest.',
      catalogDisclaimer:
        'Modellverfügbarkeit und Kontingente werden von Ihrem Plan und dem aktuellen Katalog durchgesetzt, nicht von dieser Seite. Prüfen Sie den aktuellen Katalog auf der Preisseite, bevor Sie einen Plan wählen, der auf ein bestimmtes Modell zugeschnitten ist.',
    },
    [ModelFamilyPair.OPENAI_VS_GOOGLE]: {
      seo: {
        title: 'OpenAI vs. Google: Wie ClawAI zwischen ihnen weiterleitet',
        description:
          'Wie der Router von ClawAI für eine bestimmte Anfrage zwischen den Modellkatalogen von OpenAI und Google wählt — Kostenklasse, Kontextbedarf und manuelles Festlegen. Kein Gewinner benannt. Vor der Planwahl den aktuellen Katalog prüfen.',
        keywords: [
          'OpenAI vs. Google Gemini',
          'ClawAI Router OpenAI Google',
          'zwischen OpenAI- und Gemini-Modellen wählen',
        ],
      },
      eyebrow: 'Modell-Routing',
      title: 'OpenAI vs. Google: Wie ClawAI zwischen ihnen weiterleitet',
      summary:
        'OpenAI und Google Gemini veröffentlichen beide Kataloge, die von günstigen, schnell antwortenden Modellen bis zu Premium-Stufen reichen. Diese Seite benennt keinen Gewinner — sie erklärt, was der Router von ClawAI abwägt, wenn eine Anfrage plausibel an beide Familien gehen könnte, und wie Sie diese Wahl überschreiben.',
      sections: [
        {
          id: 'cost-class-and-catalog-shape',
          heading: 'Kostenklasse und Katalogform',
          paragraphs: [
            'Der hinterlegte Katalog von OpenAI reicht von Budget bis Premium; der Gemini-Katalog von Google deckt ebenfalls Budget bis Premium ab, mit einer eigenen günstigen Stufe. Eine Router-Entscheidung, die die Kostenklasse abwägt, muss das konkrete Modell innerhalb jeder Familie betrachten, das zum Budget einer Anfrage passt, da beide Anbieter eine Spanne statt eines einzelnen festen Preispunkts veröffentlichen.',
          ],
        },
        {
          id: 'context-window-considerations',
          heading: 'Das Kontextfenster ist eine Eigenschaft je Modell, nicht je Anbieter',
          paragraphs: [
            'Wie viel ein Modell gleichzeitig im Blick behalten kann, hängt vom konkret gewählten Modell ab, nicht davon, von welchem der beiden Anbieter es stammt. Im verlinkten Beitrag „Was ist ein Kontextfenster“ erfahren Sie, was dieses Limit bedeutet und warum eine Anfrage, die über ein großes Dokument oder eine lange Gesprächshistorie schlussfolgern muss, es direkt prüfen sollte, statt anzunehmen, die Modelle eines der beiden Anbieter seien durchgängig größer.',
          ],
        },
        {
          id: 'how-clawai-routes-this-pair',
          heading: 'Wie ClawAI eine Anfrage zwischen ihnen weiterleitet',
          paragraphs: [
            'Unter Auto-Routing kann der Router von ClawAI eine Anfrage an ein passendes Modell aus beiden Katalogen senden. Cost-Saver-Routing bevorzugt ein Modell mit niedrigerer Kostenklasse, unabhängig davon, von welchem der beiden Anbieter es stammt. Im Manual-Model-Modus können Sie ein bestimmtes OpenAI- oder Google-Modell direkt für eine wiederkehrende Aufgabe mit bekannter Passung festlegen.',
          ],
        },
      ],
      faq: [
        {
          question: 'Ist OpenAI oder Google Gemini besser?',
          answer:
            'Diese Seite sagt das nicht — beide veröffentlichen Modelle über mehrere Kostenklassen hinweg, und die Passung hängt von der Aufgabe ab. Im verlinkten Leitfaden zur Bewertung von KI-Modellen finden Sie einen wiederholbaren Weg, dies an Ihrer eigenen Arbeitslast zu prüfen.',
        },
        {
          question: 'Leitet ClawAI automatisch zwischen OpenAI- und Google-Modellen weiter?',
          answer:
            'Unter Auto- oder Cost-Saver-Routing kann der Router eine Anfrage an ein passendes Modell aus beiden Katalogen senden. Sie können auch im Manual-Model-Modus ein bestimmtes Modell von beiden Anbietern festlegen.',
        },
        {
          question: 'Welcher Anbieter hat das größere Kontextfenster?',
          answer:
            'Das hängt vom konkreten Modell ab, nicht einheitlich vom Anbieter. Im verlinkten Beitrag „Was ist ein Kontextfenster“ erfahren Sie, wie Sie das Limit eines bestimmten Modells prüfen, bevor Sie sich für ein großes Dokument oder eine lange Unterhaltung darauf verlassen.',
        },
      ],
      productNote:
        'Das Auto- und das Cost-Saver-Routing von ClawAI können für eine bestimmte Anfrage auf den Katalog von OpenAI oder den von Google zurückgreifen, oder Sie legen direkt im Manual-Model-Modus eins fest.',
      catalogDisclaimer:
        'Modellverfügbarkeit und Kontingente werden von Ihrem Plan und dem aktuellen Katalog durchgesetzt, nicht von dieser Seite. Prüfen Sie den aktuellen Katalog auf der Preisseite, bevor Sie einen Plan wählen, der auf ein bestimmtes Modell zugeschnitten ist.',
    },
    [ModelFamilyPair.ANTHROPIC_VS_GOOGLE]: {
      seo: {
        title: 'Anthropic vs. Google: Wie ClawAI zwischen ihnen weiterleitet',
        description:
          'Wie der Router von ClawAI für eine bestimmte Anfrage zwischen den Modellkatalogen von Anthropic und Google wählt — Kostenklasse, Passung zum Reasoning-Modus und manuelles Festlegen. Kein Gewinner benannt. Vor der Planwahl den aktuellen Katalog prüfen.',
        keywords: [
          'Anthropic vs. Google Gemini',
          'ClawAI Router Anthropic Google',
          'zwischen Claude- und Gemini-Modellen wählen',
        ],
      },
      eyebrow: 'Modell-Routing',
      title: 'Anthropic vs. Google: Wie ClawAI zwischen ihnen weiterleitet',
      summary:
        'Der Katalog von Anthropic reicht von Standard bis zur höchsten Kostenstufe; der Gemini-Katalog von Google deckt Budget bis Premium ab. Diese Seite erklärt, was dieser Unterschied in der Katalogform für die Wahl des Routers von ClawAI zwischen den beiden bedeutet — nicht, welcher besser ist.',
      sections: [
        {
          id: 'cost-tier-shape-differs',
          heading: 'Die beiden Kataloge decken unterschiedliche Teile der Kostenspanne ab',
          paragraphs: [
            'Die hinterlegten Modelle von Anthropic liegen in den Kostenklassen Standard, Premium und Höchststufe, ohne einen Eintrag in der Budgetstufe; der Gemini-Katalog von Google reicht bis in eine Budgetstufe hinunter. Dieser Formunterschied — kein Fähigkeitsurteil — ist ein Faktor, den eine kostenbewusste Routing-Entscheidung abwägt, wenn eine Anfrage ein enges Budget hat gegenüber einer, bei der die Kosten weniger wichtig sind.',
          ],
        },
        {
          id: 'reasoning-focused-models-in-both',
          heading: 'Beide Kataloge enthalten auf Schlussfolgern ausgerichtete Modelle',
          paragraphs: [
            'Sowohl Anthropic als auch Google veröffentlichen in ihrem Katalog mindestens ein Modell, das dafür gebaut ist, ein Problem in Schritten zu durchdenken, statt sofort zu antworten. Der High-Reasoning-Routing-Modus von ClawAI kann für diese Art von Anfrage ein passendes Modell aus beiden Familien bevorzugen; welches konkrete Modell dabei gewählt wird, hängt von der Verfügbarkeit und den übrigen Anforderungen der Anfrage ab, nicht von einer festen Vorliebe für einen Anbieter.',
          ],
        },
        {
          id: 'overriding-the-router',
          heading: 'Den Router selbst überschreiben',
          paragraphs: [
            'Im Manual-Model-Modus können Sie ein bestimmtes Anthropic- oder Google-Modell direkt festlegen — die richtige Wahl für eine wiederkehrende Aufgabe, bei der Sie bereits wissen, welches passt: ein dokumentierter Arbeitsablauf, ein bekannter Stil, eine bestimmte Integration — statt es jedes Mal dem automatischen Routing zu überlassen.',
          ],
        },
      ],
      faq: [
        {
          question: 'Ist Anthropic oder Google Gemini besser?',
          answer:
            'Diese Seite benennt keinen — die beiden Kataloge decken unterschiedliche Teile der Kostenspanne ab, und beide enthalten auf Schlussfolgern ausgerichtete Modelle. Im verlinkten Leitfaden zur Bewertung von KI-Modellen erfahren Sie, wie Sie die Passung an Ihrer eigenen Arbeitslast prüfen.',
        },
        {
          question: 'Bevorzugt der High-Reasoning-Modus von ClawAI einen dieser Anbieter?',
          answer:
            'Keine feste Vorliebe — High-Reasoning-Routing kann je nach Verfügbarkeit und Anforderungen der Anfrage ein passendes Modell aus beiden Katalogen bevorzugen.',
        },
        {
          question:
            'Kann ich ein Claude- oder Gemini-Modell für eine bestimmte wiederkehrende Aufgabe festlegen?',
          answer:
            'Ja — im Manual-Model-Modus können Sie ein bestimmtes Modell von beiden Anbietern direkt festlegen, was sich lohnt, sobald Sie die Passung einer Aufgabe kennen, statt sich jedes Mal auf automatisches Routing zu verlassen.',
        },
      ],
      productNote:
        'Das High-Reasoning-Routing von ClawAI kann ein passendes Modell aus dem Katalog von Anthropic oder dem von Google bevorzugen, oder Sie legen direkt im Manual-Model-Modus eins fest.',
      catalogDisclaimer:
        'Modellverfügbarkeit und Kontingente werden von Ihrem Plan und dem aktuellen Katalog durchgesetzt, nicht von dieser Seite. Prüfen Sie den aktuellen Katalog auf der Preisseite, bevor Sie einen Plan wählen, der auf ein bestimmtes Modell zugeschnitten ist.',
    },
    [ModelFamilyPair.OPENAI_VS_DEEPSEEK]: {
      seo: {
        title: 'OpenAI vs. DeepSeek: Wie ClawAI zwischen ihnen weiterleitet',
        description:
          'Wie die Kostenklasse den Router von ClawAI zwischen den Katalogen von OpenAI und DeepSeek verschiebt, und wie Cost-Saver-Routing und der Manual-Model-Modus zu dieser Paarung passen. Kein Gewinner benannt. Vor der Planwahl den aktuellen Katalog prüfen.',
        keywords: [
          'OpenAI vs. DeepSeek',
          'ClawAI Router OpenAI DeepSeek',
          'günstigere KI-Modell-Alternative zu OpenAI',
        ],
      },
      eyebrow: 'Modell-Routing',
      title: 'OpenAI vs. DeepSeek: Wie ClawAI zwischen ihnen weiterleitet',
      summary:
        'Der Katalog von OpenAI reicht von Budget bis Premium; die hinterlegten Modelle von DeepSeek liegen in der Standard-Kostenklasse. Diese Seite geht durch, was dieser Unterschied in der Kostenklasse für das Weiterleiten einer Anfrage zwischen den beiden bedeutet, ohne einen der beiden zum besseren Anbieter zu erklären.',
      sections: [
        {
          id: 'cost-class-is-the-headline-difference',
          heading:
            'Die Kostenklasse ist der deutlichste Unterschied zwischen diesen beiden Katalogen',
          paragraphs: [
            'Die beiden hinterlegten Modelle von DeepSeek — ein allgemeines Chat-Modell und ein auf Schlussfolgern ausgerichtetes Modell — liegen beide in der Standard-Kostenklasse von ClawAI. Der Katalog von OpenAI deckt eine breitere Spanne ab, von einer Budgetstufe bis hinauf zu Premium. Für eine kostensensible Anfrage macht das den Katalog von DeepSeek zu einem sinnvollen Ausgangspunkt, wobei auch die eigenen Budget-Modelle von OpenAI in derselben Kostenklasse liegen und es wert sind, mit abgewogen zu werden — der Vergleich verläuft zwischen Kostenklassen, nicht zwischen den Anbietern insgesamt.',
          ],
        },
        {
          id: 'cost-saver-routing',
          heading: 'Der Cost-Saver-Routing-Modus von ClawAI',
          paragraphs: [
            'Cost Saver ist einer der sieben Routing-Modi von ClawAI, gebaut, um ein Modell mit niedrigerer Kostenklasse zu bevorzugen, wenn eine Anfrage kein Premium-Modell braucht. Er kann in beide Kataloge greifen, je nachdem, welches Modell zur Anfrage in dieser Kostenklasse tatsächlich passt, statt standardmäßig einen bestimmten Anbieter zu bevorzugen.',
          ],
        },
        {
          id: 'reasoning-focused-option-in-both',
          heading: 'Eine auf Schlussfolgern ausgerichtete Option gibt es in beiden Katalogen',
          paragraphs: [
            'DeepSeek veröffentlicht ein Modell, das speziell dafür gebaut ist, sich Schritt für Schritt durch ein Problem zu arbeiten, in derselben Standard-Kostenklasse wie sein allgemeines Chat-Modell; OpenAI veröffentlicht auf Schlussfolgern ausgerichtete Modelle in seiner Standard- und Premiumstufe. High-Reasoning-Routing kann beide erreichen, und welches Modell zu einer bestimmten mehrstufigen Aufgabe passt, lohnt es sich, direkt zu prüfen, statt es allein aus der Kostenklasse abzuleiten.',
          ],
        },
      ],
      faq: [
        {
          question: 'Ist DeepSeek eine günstigere Alternative zu OpenAI?',
          answer:
            'Die hinterlegten Modelle von DeepSeek liegen in der Standard-Kostenklasse von ClawAI, und auch OpenAI veröffentlicht Modelle in der Budget- und Standardstufe — der faire Vergleich verläuft also nach Kostenklasse, nicht nach Anbieter. Aktuelle Preise für ein bestimmtes Modell finden Sie auf der Preisseite.',
        },
        {
          question: 'Bevorzugt der Cost-Saver-Modus von ClawAI DeepSeek?',
          answer:
            'Keine feste Vorliebe — Cost-Saver-Routing bevorzugt für die Anfrage, aus beiden Katalogen, jeweils das verfügbare Modell, das zu einer niedrigeren Kostenklasse passt.',
        },
        {
          question: 'Hat DeepSeek ein auf Schlussfolgern ausgerichtetes Modell wie OpenAI?',
          answer:
            'Ja — DeepSeek veröffentlicht ein Modell, das dafür gebaut ist, ein Problem in Schritten zu durchdenken, in derselben Kostenklasse wie sein allgemeines Chat-Modell. Auch OpenAI veröffentlicht auf Schlussfolgern ausgerichtete Modelle, über eine breitere Kostenspanne hinweg.',
        },
      ],
      productNote:
        'Das Cost-Saver-Routing von ClawAI kann ein Modell mit niedrigerer Kostenklasse aus dem Katalog von OpenAI oder dem von DeepSeek bevorzugen, oder Sie legen direkt im Manual-Model-Modus eins fest.',
      catalogDisclaimer:
        'Modellverfügbarkeit und Kontingente werden von Ihrem Plan und dem aktuellen Katalog durchgesetzt, nicht von dieser Seite. Prüfen Sie den aktuellen Katalog auf der Preisseite, bevor Sie einen Plan wählen, der auf ein bestimmtes Modell zugeschnitten ist.',
    },
    [ModelFamilyPair.OPENAI_VS_XAI]: {
      seo: {
        title: 'OpenAI vs. xAI: Wie ClawAI zwischen ihnen weiterleitet',
        description:
          'Wie der Router von ClawAI für eine bestimmte Anfrage zwischen den Katalogen von OpenAI und dem Grok-Katalog von xAI wählt — Kostenklasse und manuelles Festlegen. Kein Gewinner benannt. Vor der Planwahl den aktuellen Katalog prüfen.',
        keywords: [
          'OpenAI vs. xAI Grok',
          'ClawAI Router OpenAI xAI',
          'zwischen GPT- und Grok-Modellen wählen',
        ],
      },
      eyebrow: 'Modell-Routing',
      title: 'OpenAI vs. xAI: Wie ClawAI zwischen ihnen weiterleitet',
      summary:
        'Der Katalog von OpenAI reicht von Budget bis Premium; der Grok-Katalog von xAI in ClawAI deckt ebenfalls Budget bis Premium ab, mit insgesamt weniger hinterlegten Modellen. Diese Seite erklärt, was der Router von ClawAI zwischen den beiden abwägt, ohne einen der beiden zum besseren Anbieter zu erklären.',
      sections: [
        {
          id: 'catalog-size-and-cost-class',
          heading: 'Ein kleinerer Katalog bedeutet keine schmalere Kostenspanne',
          paragraphs: [
            'Der in ClawAI hinterlegte Katalog von xAI ist kleiner als der von OpenAI — zwei Modelle gegenüber sechs bei OpenAI —, deckt aber dennoch eine Budget- und eine Premiumstufe ab, dieselbe Kostenklassenspanne, die der Katalog von OpenAI an seinen äußeren Enden abdeckt. Eine Router-Entscheidung zwischen den beiden wägt die Kostenklasse des konkreten Modells gegen das Budget der Anfrage ab, nicht die Größe des jeweiligen Katalogs.',
          ],
        },
        {
          id: 'how-clawai-routes-this-pair',
          heading: 'Wie ClawAI eine Anfrage zwischen ihnen weiterleitet',
          paragraphs: [
            'Unter Auto-Routing kann der Router von ClawAI eine Anfrage an ein passendes Modell aus beiden Katalogen senden. Cost-Saver-Routing bevorzugt die Option mit der niedrigeren Kostenklasse, unabhängig vom Anbieter. Im Manual-Model-Modus können Sie ein bestimmtes OpenAI- oder xAI-Modell direkt festlegen, wenn Sie bereits wissen, welches eine Aufgabe braucht.',
          ],
        },
        {
          id: 'what-this-page-does-not-claim',
          heading: 'Was diese Seite nicht behauptet',
          paragraphs: [
            'Diese Seite macht weder eine Geschwindigkeitsangabe noch eine Fähigkeits-Rangliste zwischen diesen beiden Anbietern — keine Seite auf dieser Website tut das. Im verlinkten Leitfaden zur Bewertung von KI-Modellen finden Sie stattdessen eine Methode, um die Passung an Ihrer eigenen Arbeitslast zu prüfen.',
          ],
        },
      ],
      faq: [
        {
          question: 'Ist OpenAI oder xAI Grok besser?',
          answer:
            'Diese Seite sagt das nicht — beide veröffentlichen Modelle über eine ähnliche Kostenklassenspanne hinweg, und kein verlässlicher Benchmark klärt die Passung für jede Aufgabe. Siehe den verlinkten Leitfaden zur Bewertung von KI-Modellen.',
        },
        {
          question: 'Leitet ClawAI automatisch zwischen OpenAI- und xAI-Modellen weiter?',
          answer:
            'Unter Auto- oder Cost-Saver-Routing ja — der Router kann eine Anfrage an ein passendes Modell aus beiden Katalogen senden. Sie können auch im Manual-Model-Modus ein bestimmtes Modell von beiden Anbietern festlegen.',
        },
        {
          question: 'Hat xAI so viele Modelle im Katalog von ClawAI wie OpenAI?',
          answer:
            'Nein — der hinterlegte Katalog von xAI ist kleiner, zwei Modelle gegenüber sechs bei OpenAI, deckt aber dennoch eine ähnliche Kostenklassenspanne ab. Prüfen Sie den aktuellen Katalog auf der Preisseite.',
        },
      ],
      productNote:
        'Das Auto- und das Cost-Saver-Routing von ClawAI können für eine bestimmte Anfrage auf den Katalog von OpenAI oder den von xAI zurückgreifen, oder Sie legen direkt im Manual-Model-Modus eins fest.',
      catalogDisclaimer:
        'Modellverfügbarkeit und Kontingente werden von Ihrem Plan und dem aktuellen Katalog durchgesetzt, nicht von dieser Seite. Prüfen Sie den aktuellen Katalog auf der Preisseite, bevor Sie einen Plan wählen, der auf ein bestimmtes Modell zugeschnitten ist.',
    },
    [ModelFamilyPair.CLOUD_VS_LOCAL]: {
      seo: {
        title: 'Cloud vs. lokal: Wie ClawAI zwischen ihnen weiterleitet',
        description:
          'Was sich ändert, wenn eine Anfrage auf selbst kontrollierter Hardware bleibt statt bei einem Cloud-Anbieter, und wie die Routing-Modi Local-Only und Privacy-First von ClawAI zu dieser Wahl passen. Kein Gewinner benannt. Vor der Planwahl den aktuellen Katalog prüfen.',
        keywords: [
          'Cloud-KI vs. lokale KI',
          'ClawAI Local-Only-Routing',
          'wann ein Modell lokal statt in der Cloud ausführen',
        ],
      },
      eyebrow: 'Modell-Routing',
      title: 'Cloud vs. lokal: Wie ClawAI zwischen ihnen weiterleitet',
      summary:
        'Das ist die einzige Paarung in diesem Themenbereich, die dadurch definiert wird, wo eine Anfrage läuft, nicht davon, welcher Anbieter sie beantwortet. Jede Cloud-Familie, die ClawAI anbindet — OpenAI, Anthropic, Google, DeepSeek, xAI — führt ein Modell auf ihrer eigenen Infrastruktur aus; Ollama und llama.cpp führen stattdessen ein offenes Modell auf Hardware aus, die Sie selbst kontrollieren. Diese Seite erklärt, was sich dadurch ändert und wie der Router von ClawAI diese Wahl behandelt, angesichts des lokal-first-Designs von ClawAI.',
      sections: [
        {
          id: 'what-changes-when-a-request-stays-local',
          heading: 'Was sich tatsächlich ändert, wenn eine Anfrage lokal bleibt',
          paragraphs: [
            'Ein Cloud-Anbieter führt ein Modell auf seiner eigenen Infrastruktur aus und berechnet pro Anfrage; Ollama und llama.cpp laden stattdessen ein offenes Modell auf Hardware, die Sie selbst kontrollieren, sodass die Anfrage einen Cloud-Anbieter gar nicht erst erreicht. Das ändert, wer die Anfrage sehen kann, nicht, wozu ein bestimmtes Modell fähig ist — den vollständigen Mechanismus finden Sie unter „Lokale KI“ auf der Seite mit den Modellanbietern.',
          ],
        },
        {
          id: 'local-only-and-privacy-first-routing',
          heading:
            'Die Routing-Modi Local-Only und Privacy-First von ClawAI existieren für diese Wahl',
          paragraphs: [
            'Local-Only-Routing hält jede Anfrage auf selbst kontrollierter Hardware, über Ollama oder llama.cpp, und erreicht keine der fünf Cloud-Familien, die dieser Themenbereich abdeckt. Privacy-First-Routing ist ein eigener Modus mit eigenen Prioritäten. Beide existieren gerade deshalb, weil nicht jeder Workload standardmäßig auf Auto-Routing gehören sollte, das je nach Anfrage jeden angebundenen Anbieter erreichen kann, ob Cloud oder lokal.',
          ],
        },
        {
          id: 'when-a-workload-should-stay-local',
          heading: 'Wann ein Workload ein Kandidat dafür ist, lokal zu bleiben',
          paragraphs: [
            'Eine Anfrage ist ein sinnvoller Kandidat für Local-Only- oder Privacy-First-Routing, wenn die Anforderung ist, dass sie niemals Hardware verlässt, die Sie selbst kontrollieren — eine Compliance-Vorgabe, eine Vertraulichkeitsanforderung gegenüber einem Kunden, oder schlicht eine Präferenz, bestimmte Daten keinem externen Anbieter zu senden. Im verlinkten Beitrag „Was ist Local-First-KI“ erfahren Sie, wie Sie den Kompromiss zwischen einem selbst betriebenen offenen Modell und dem Katalog eines Cloud-Anbieters abwägen.',
          ],
        },
      ],
      faq: [
        {
          question: 'Ist ein lokales Modell so fähig wie ein Cloud-Modell?',
          answer:
            'Diese Seite stellt sie nicht in eine Rangfolge — die Fähigkeit hängt vom konkreten offenen Modell ab, das Sie ausführen möchten, und das ist Ihre Entscheidung, kein fester Vergleich, den diese Seite verantwortungsvoll ziehen könnte. Siehe den verlinkten Beitrag „Was ist Local-First-KI“.',
        },
        {
          question: 'Wie entscheidet ClawAI, ob eine Anfrage lokal bleibt?',
          answer:
            'Standardmäßig entscheidet das nicht ClawAI für Sie — Local-Only-Routing hält jede Anfrage auf selbst kontrollierter Hardware, und Privacy-First-Routing wendet eigene Prioritäten an; Auto-Routing kann jeden angebundenen Anbieter erreichen, ob Cloud oder lokal. Sie wählen, welchen Modus ein Workspace oder eine Anfrage nutzt.',
        },
        {
          question: 'Kostet das lokale Ausführen eines Modells über ClawAI etwas?',
          answer:
            'ClawAI berechnet für ein lokal ausgeführtes Modell keinen Preis pro Token, wie es das bei einem Cloud-Anbieter tut, da hier kein Cloud-Anbieter abgerechnet wird — die Kosten sind die Hardware, die Sie ohnehin bereits betreiben. Das aktuelle Planverhalten können Sie auf der Preisseite prüfen.',
        },
      ],
      productNote:
        'Der Local-Only-Routing-Modus von ClawAI hält jede Anfrage über Ollama oder llama.cpp auf selbst kontrollierter Hardware — eine reale, bereits ausgelieferte Anbindung, kein Vorhaben auf der Roadmap — neben Privacy-First-Routing für einen eigenen Satz von Prioritäten.',
      catalogDisclaimer:
        'Hier wird absichtlich kein bestimmtes Cloud- oder lokales Modell in eine Rangfolge gestellt — offene Modelle und jeder Cloud-Katalog ändern sich nach ihrem eigenen Zeitplan, und Sie entscheiden, welche Sie ausführen oder anbinden. Das Planverhalten für lokale Workloads können Sie auf der Preisseite prüfen.',
    },
  },
};
