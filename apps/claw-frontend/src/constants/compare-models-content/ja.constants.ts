import { ModelFamilyPair } from '@/enums/model-family-pair.enum';
import type { CompareModelsDictionary } from '@/types/compare-models.types';

export const JA_COMPARE_MODELS_CONTENT: CompareModelsDictionary = {
  labels: {
    onThisPage: 'このページの内容',
    faqTitle: 'よくある質問',
    relatedTitle: '次に読むべきページ',
    lastReviewed: '最終確認日',
    backToHub: 'すべてのペア',
    ctaTitle: '説明を読むより、実際に試してみてください',
    ctaBody:
      'ClawAIは、接続しているすべてのプロバイダーの中から、会話に適したモデルへ1つのワークスペースからルーティングします。',
    startFree: '無料プランで始める',
    seeFeatures: 'ClawAIの機能を見る',
    seePricing: '料金ページで最新のカタログを確認する',
  },
  hub: {
    seo: {
      title: 'ClawAIがモデルファミリー間をどうルーティングするか',
      description:
        'ClawAI自身のルーターが、あるリクエストに対して2つのプロバイダーファミリーのどちらを選ぶか――コストクラス、必要なコンテキスト、リクエストをローカルに留めるべきかどうか――を解説します。特定の製品同士のランキングや架空のベンチマークは掲載していません。',
      keywords: [
        'ClawAIがモデルプロバイダー間をどうルーティングするか',
        'AIモデルファミリーの選び方',
        'OpenAI vs Anthropic vs Google ルーティング',
      ],
    },
    eyebrow: 'モデルルーティング',
    title: 'ClawAIがモデルファミリー間をどうルーティングするか',
    summary:
      'このハブページは、OpenAI、Anthropic、Google、DeepSeek、xAIを互いに順位付けするものではありません――それはClawAIのルーターが実際に答えている問いとは別の問いです。ルーターが行っているのは、あるリクエストに対してどちらのファミリーへそのリクエストを送るかを、コストクラス、リクエストが必要とするコンテキストの量、ワークロードを自分の管理下にあるハードウェアに留める必要があるかどうか、そして選択しているルーティングモードを踏まえて選ぶことです。以下の各ページは、この選択を1つのファミリーペアごとに、ベンチマークスコアではなく、ClawAI自身のルーティングモードとモデルカタログの定性的なコスト帯に基づいて解説します。',
    pairsHeading: 'ペアを選ぶ',
    cardSummaries: {
      [ModelFamilyPair.OPENAI_VS_ANTHROPIC]:
        'ルーターがOpenAIとAnthropicのカタログの間でリクエストをどう判断するか。',
      [ModelFamilyPair.OPENAI_VS_GOOGLE]:
        'ルーターがOpenAIとGoogleのカタログの間でリクエストをどう判断するか。',
      [ModelFamilyPair.ANTHROPIC_VS_GOOGLE]:
        'ルーターがAnthropicとGoogleのカタログの間でリクエストをどう判断するか。',
      [ModelFamilyPair.OPENAI_VS_DEEPSEEK]:
        'コストクラスが、OpenAIとDeepSeekの間でのルーターの選択をどう左右するか。',
      [ModelFamilyPair.OPENAI_VS_XAI]:
        'ルーターがOpenAIとxAIのカタログの間でリクエストをどう判断するか。',
      [ModelFamilyPair.CLOUD_VS_LOCAL]:
        'リクエストをどのクラウドプロバイダーでもなく自分の管理下にあるハードウェアに留める場合、何が変わるか。',
    },
  },
  pairs: {
    [ModelFamilyPair.OPENAI_VS_ANTHROPIC]: {
      seo: {
        title: 'OpenAI vs Anthropic: ClawAIはどうルーティングするか',
        description:
          'ClawAIのルーターが、あるリクエストに対してOpenAIとAnthropicのモデルカタログのどちらを選ぶか――コストクラス、推論モードとの適合性、手動固定――を解説します。勝者は宣言していません。プランを選ぶ前に必ず最新のカタログを確認してください。',
        keywords: [
          'OpenAI vs Anthropic',
          'ClawAI ルーター OpenAI Anthropic',
          'OpenAIとClaudeモデルの選び方',
        ],
      },
      eyebrow: 'モデルルーティング',
      title: 'OpenAI vs Anthropic: ClawAIはどうルーティングするか',
      summary:
        'OpenAIとAnthropicはどちらも、安価で即座に回答する低価格帯のモデルから、より難しい問題向けに作られたプレミアムおよび最上位ティアまで、複数のコストクラスにまたがるカタログを公開しています。このページは一方のファミリーをもう一方より上に位置づけるものではありません――リクエストがどちらに送られてもおかしくない場合に、ClawAIのルーターが実際に何を検討しているのか、そしてその判断を自分自身でどう上書きできるのかを解説します。',
      sections: [
        {
          id: 'cost-class-across-both-catalogs',
          heading: 'コストクラスは1ベンダー1ティアではなく、両方のカタログにまたがる',
          paragraphs: [
            'ClawAIのモデルカタログは、seed済みのすべてのモデルに、正確な価格ではなく定性的なコストクラス――budget、standard、premium、highest――を付与しています。OpenAIのカタログはbudgetからpremiumまでを、Anthropicのカタログはstandardからhighestまでをカバーしています。安価な側も高価な側も、どちらか一方のベンダーが独占しているわけではないため、コストに基づくルーターの判断は、どちらのベンダーが総じて安いかを前提にするのではなく、両方のカタログにある具体的なモデルを見る必要があります。',
          ],
        },
        {
          id: 'routing-modes-that-touch-this-pair',
          heading: 'このペアに関わるルーティングモード',
          paragraphs: [
            'Autoルーティングのもとでは、ClawAIのルーターはリクエストが必要とするものに応じて、どちらのカタログのモデルへもリクエストを送ることができます。High Reasoningルーティングは、問題を段階的に処理することに特化したモデルを優先しますが、OpenAIとAnthropicのどちらもそうした形のモデルを公開しています。Cost Saverルーティングはより低いコストクラスのモデルを優先しますが、これも両方のカタログに存在します。Manual Modelモードでは、どちらのベンダーの特定のモデルも直接固定できます。これは、どのモデルが適しているかすでにわかっている繰り返しタスクのための意図的な上書き手段です。',
          ],
        },
        {
          id: 'what-this-page-does-not-claim',
          heading: 'このページが主張しないこと',
          paragraphs: [
            '当サイトのどのページも、この2つのベンダーを比較するベンチマークスコアや速度に関する主張を掲載しておらず、このページも同様です。自分のワークロードに対する適性を、ランキングを鵜呑みにするのではなく確認する方法については、下記リンクの「AIベンチマークの読み方」および「AIモデルの評価方法」をご覧ください。',
          ],
        },
      ],
      faq: [
        {
          question: 'OpenAIとAnthropicではどちらが優れていますか?',
          answer:
            'このページでは答えません――どちらも複数のコストクラスと用途にまたがるモデルを公開しており、あらゆるタスクに通用する信頼できるベンチマークは存在しないためです。自分のワークロードに適用できる方法については、下記リンクの「AIモデルの評価方法」をご覧ください。',
        },
        {
          question: 'ClawAIのルーターはOpenAIとAnthropicを自動的に選び分けますか?',
          answer:
            'Auto、High Reasoning、Cost Saverのいずれのルーティングでも、はい――ルーターはリクエストが必要とするものに応じて、どちらのカタログのモデルへもリクエストを送ることができます。Manual Modelモードでどちらかのベンダーの特定のモデルを固定することもできます。',
        },
        {
          question: '同じワークスペースでOpenAIとAnthropicの両方のモデルを使えますか?',
          answer:
            'はい――ClawAIは両方を別々のプロバイダーとして接続しており、Autoルーティングはリクエストに応じてどちらも利用できます。Manual Modelモードでタスクごとに特定のモデルを固定することも可能です。',
        },
      ],
      productNote:
        'ClawAIのAutoおよびHigh Reasoningルーティングは、あるリクエストに対してOpenAIまたはAnthropicのどちらのカタログも利用できます。Manual Modelモードで直接固定することも可能です。',
      catalogDisclaimer:
        'モデルの利用可否と利用枠は、このページではなく、あなたのプランと最新のカタログによって管理されています。特定のモデルを前提としたプランを選ぶ前に、料金ページで最新のカタログを確認してください。',
    },
    [ModelFamilyPair.OPENAI_VS_GOOGLE]: {
      seo: {
        title: 'OpenAI vs Google: ClawAIはどうルーティングするか',
        description:
          'ClawAIのルーターが、あるリクエストに対してOpenAIとGoogleのモデルカタログのどちらを選ぶか――コストクラス、必要なコンテキスト、手動固定――を解説します。勝者は宣言していません。プランを選ぶ前に必ず最新のカタログを確認してください。',
        keywords: [
          'OpenAI vs Google Gemini',
          'ClawAI ルーター OpenAI Google',
          'OpenAIとGeminiモデルの選び方',
        ],
      },
      eyebrow: 'モデルルーティング',
      title: 'OpenAI vs Google: ClawAIはどうルーティングするか',
      summary:
        'OpenAIとGoogle Geminiはどちらも、安価で即座に回答するモデルからプレミアムティアまでをカバーするカタログを公開しています。このページは勝者を挙げるものではなく、リクエストがどちらのファミリーに送られてもおかしくない場合にClawAIのルーターが何を検討するか、そしてその判断をどう上書きできるかを解説します。',
      sections: [
        {
          id: 'cost-class-and-catalog-shape',
          heading: 'コストクラスとカタログの構成',
          paragraphs: [
            'OpenAIのseed済みカタログはbudgetからpremiumまでをカバーしており、GoogleのGeminiカタログも同様にbudgetからpremiumまでをカバーし、独自の低価格帯ティアも備えています。コストクラスを重視するルーターの判断は、どちらのベンダーも単一の固定価格ではなく幅を持つ範囲を公開しているため、それぞれのファミリー内でリクエストの予算に合う具体的なモデルを見る必要があります。',
          ],
        },
        {
          id: 'context-window-considerations',
          heading: 'コンテキストウィンドウはベンダー単位ではなくモデル単位のプロパティ',
          paragraphs: [
            'モデルが一度に視野に収められる量は、これら2つのベンダーのどちらに由来するかではなく、選んだ具体的なモデルによって変わります。この制限が何を意味するのか、そして大規模な文書や長い会話履歴を推論する必要のあるリクエストが、どちらのベンダーのモデルも一様に大きいと決めつけるのではなく、なぜ直接確認すべきなのかについては、下記リンクの「コンテキストウィンドウとは」をご覧ください。',
          ],
        },
        {
          id: 'how-clawai-routes-this-pair',
          heading: 'ClawAIがこのペアの間でリクエストをどうルーティングするか',
          paragraphs: [
            'Autoルーティングのもとでは、ClawAIのルーターはどちらのカタログからも適したモデルへリクエストを送ることができます。Cost Saverルーティングは、この2つのベンダーのどちらに由来するかにかかわらず、より低いコストクラスのモデルを優先します。Manual Modelモードでは、適性がすでにわかっている繰り返しタスクのために、特定のOpenAIまたはGoogleのモデルを直接固定できます。',
          ],
        },
      ],
      faq: [
        {
          question: 'OpenAIとGoogle Geminiではどちらが優れていますか?',
          answer:
            'このページでは答えません――どちらも複数のコストクラスにまたがるモデルを公開しており、適性はタスクによって変わります。自分のワークロードに対して確認する再現性のある方法については、下記リンクの「AIモデルの評価方法」をご覧ください。',
        },
        {
          question: 'ClawAIはOpenAIとGoogleのモデルを自動的にルーティングしますか?',
          answer:
            'AutoまたはCost Saverのルーティングのもとでは、ルーターはどちらのカタログからも適したモデルへリクエストを送ることができます。Manual Modelモードでどちらかのベンダーの特定のモデルを固定することもできます。',
        },
        {
          question: 'コンテキストウィンドウが大きいのはどちらのベンダーですか?',
          answer:
            'それはベンダー単位で一様に決まるのではなく、具体的なモデルによって変わります。大規模な文書や長い会話で信頼して使う前に、特定のモデルの制限をどう確認するかについては、下記リンクの「コンテキストウィンドウとは」をご覧ください。',
        },
      ],
      productNote:
        'ClawAIのAutoおよびCost Saverルーティングは、あるリクエストに対してOpenAIまたはGoogleのどちらのカタログも利用できます。Manual Modelモードで直接固定することも可能です。',
      catalogDisclaimer:
        'モデルの利用可否と利用枠は、このページではなく、あなたのプランと最新のカタログによって管理されています。特定のモデルを前提としたプランを選ぶ前に、料金ページで最新のカタログを確認してください。',
    },
    [ModelFamilyPair.ANTHROPIC_VS_GOOGLE]: {
      seo: {
        title: 'Anthropic vs Google: ClawAIはどうルーティングするか',
        description:
          'ClawAIのルーターが、あるリクエストに対してAnthropicとGoogleのモデルカタログのどちらを選ぶか――コストクラス、推論モードとの適合性、手動固定――を解説します。勝者は宣言していません。プランを選ぶ前に必ず最新のカタログを確認してください。',
        keywords: [
          'Anthropic vs Google Gemini',
          'ClawAI ルーター Anthropic Google',
          'ClaudeとGeminiモデルの選び方',
        ],
      },
      eyebrow: 'モデルルーティング',
      title: 'Anthropic vs Google: ClawAIはどうルーティングするか',
      summary:
        'Anthropicのカタログはstandardから最上位のコストティアまでをカバーし、GoogleのGeminiカタログはbudgetからpremiumまでをカバーしています。このページは、どちらが優れているかではなく、この構成の違いがClawAIのルーターの判断にどう影響するかを解説します。',
      sections: [
        {
          id: 'cost-tier-shape-differs',
          heading: '2つのカタログはコスト範囲の異なる部分をカバーする',
          paragraphs: [
            'Anthropicのseed済みモデルは、standard、premium、highestのコストクラスに位置しており、現時点でbudgetティアのモデルはありません。GoogleのGeminiカタログはbudgetティアまで届いています。この構成の違いは能力の優劣を示すものではなく、リクエストの予算が厳しいか、コストがあまり問題にならないかによって、コストを意識したルーティングの判断が考慮する1つの要素です。',
          ],
        },
        {
          id: 'reasoning-focused-models-in-both',
          heading: 'どちらのカタログにも推論に特化したモデルがある',
          paragraphs: [
            'AnthropicとGoogleはどちらも、即座に回答するのではなく段階を踏んで問題に取り組むことを目的としたモデルを、少なくとも1つカタログに公開しています。ClawAIのHigh Reasoningルーティングモードは、この種のリクエストに対してどちらのファミリーからも適したモデルを優先できます。実際にどちらを選ぶかは、一方のベンダーへの固定的な優先ではなく、利用可能性とリクエストの他の要件によって決まります。',
          ],
        },
        {
          id: 'overriding-the-router',
          heading: 'ルーターの判断を自分自身で上書きする',
          paragraphs: [
            'Manual Modelモードでは、特定のAnthropicまたはGoogleのモデルを直接固定できます。これは、文書化されたワークフロー、決まったスタイル、特定の連携など、どのモデルが適しているかすでにわかっている繰り返しタスクにとって、毎回自動ルーティングに任せるよりも適切な選択です。',
          ],
        },
      ],
      faq: [
        {
          question: 'AnthropicとGoogle Geminiではどちらが優れていますか?',
          answer:
            'このページでは一方を挙げません――2つのカタログはコスト範囲の異なる部分をカバーしており、どちらも推論に特化したモデルを含んでいます。自分のワークロードに対する適性を確認する方法については、下記リンクの「AIモデルの評価方法」をご覧ください。',
        },
        {
          question: 'ClawAIのHigh Reasoningモードはこれらのベンダーの一方を優先しますか?',
          answer:
            '固定的な優先はありません――High Reasoningルーティングは、利用可能性とリクエストの要件に応じて、どちらのカタログからも適したモデルを優先できます。',
        },
        {
          question: '特定の繰り返しタスクにClaudeまたはGeminiのモデルを固定できますか?',
          answer:
            'はい――Manual Modelモードでは、どちらのベンダーの特定のモデルも直接固定できます。タスクの適性がわかった段階では、毎回自動ルーティングに任せるよりも妥当な選択です。',
        },
      ],
      productNote:
        'ClawAIのHigh Reasoningルーティングは、AnthropicまたはGoogleのどちらのカタログからも適したモデルを優先できます。Manual Modelモードで直接固定することも可能です。',
      catalogDisclaimer:
        'モデルの利用可否と利用枠は、このページではなく、あなたのプランと最新のカタログによって管理されています。特定のモデルを前提としたプランを選ぶ前に、料金ページで最新のカタログを確認してください。',
    },
    [ModelFamilyPair.OPENAI_VS_DEEPSEEK]: {
      seo: {
        title: 'OpenAI vs DeepSeek: ClawAIはどうルーティングするか',
        description:
          'コストクラスがOpenAIとDeepSeekの間でClawAIのルーターの判断をどう左右するか、Cost Saverルーティングとマニュアル固定がこのペアにどう合致するかを解説します。勝者は宣言していません。プランを選ぶ前に必ず最新のカタログを確認してください。',
        keywords: [
          'OpenAI vs DeepSeek',
          'ClawAI ルーター OpenAI DeepSeek',
          'OpenAIより安いAIモデルの代替',
        ],
      },
      eyebrow: 'モデルルーティング',
      title: 'OpenAI vs DeepSeek: ClawAIはどうルーティングするか',
      summary:
        'OpenAIのカタログはbudgetからpremiumまでをカバーし、DeepSeekのseed済みモデルはstandardのコストクラスに位置しています。このページは、どちらが優れたベンダーかを宣言することなく、このコストクラスの違いが2つの間でリクエストをルーティングする際に何を意味するかを解説します。',
      sections: [
        {
          id: 'cost-class-is-the-headline-difference',
          heading: 'コストクラスがこの2つのカタログの最も明確な違い',
          paragraphs: [
            'DeepSeekのseed済みモデル2つ――汎用チャットモデルと推論に特化したモデル――は、どちらもClawAIのstandardコストクラスに位置しています。OpenAIのカタログはbudgetからpremiumまでより広い範囲をカバーしています。コストに敏感なリクエストであれば、DeepSeekのカタログは妥当な出発点になりますが、OpenAI自身のbudgetティアのモデルも同じコストクラスにあり、あわせて検討する価値があります――比較すべきはコストクラス同士であって、ベンダー全体ではありません。',
          ],
        },
        {
          id: 'cost-saver-routing',
          heading: 'ClawAIのCost Saverルーティングモード',
          paragraphs: [
            'Cost SaverはClawAIが持つ7つのルーティングモードの1つで、リクエストがプレミアムモデルを必要としない場合に、より低いコストクラスのモデルを優先するために作られています。このモードは、名前でどちらかのベンダーを既定にするのではなく、そのコストクラスで実際にリクエストに適したモデルに応じて、どちらのカタログにも入り込むことができます。',
          ],
        },
        {
          id: 'reasoning-focused-option-in-both',
          heading: 'どちらのカタログにも推論に特化した選択肢がある',
          paragraphs: [
            'DeepSeekは、汎用チャットモデルと同じstandardコストクラスで、段階を踏んで問題に取り組むことに特化したモデルを公開しています。OpenAIもstandardとpremiumのティアにまたがって推論に特化したモデルを公開しています。High Reasoningルーティングはどちらにも到達できますが、特定の複数ステップのタスクにどちらが適しているかは、コストクラスだけから決めつけるのではなく、直接確認する価値があります。',
          ],
        },
      ],
      faq: [
        {
          question: 'DeepSeekはOpenAIより安い代替ですか?',
          answer:
            'DeepSeekのseed済みモデルはClawAIのstandardコストクラスに位置しており、OpenAIもbudgetおよびstandardティアのモデルを公開しています――つまり公正な比較はベンダー同士ではなくコストクラス同士です。特定のモデルの現在の価格は料金ページで確認してください。',
        },
        {
          question: 'ClawAIのCost SaverモードはDeepSeekを優先しますか?',
          answer:
            '固定的な優先はありません――Cost Saverルーティングは、どちらのカタログからでも、リクエストに対してより低いコストクラスに適した利用可能なモデルを優先します。',
        },
        {
          question: 'DeepSeekにもOpenAIのような推論特化モデルはありますか?',
          answer:
            'はい――DeepSeekは、汎用チャットモデルと同じコストクラスで、段階を踏んで問題に取り組むことに特化したモデルを公開しています。OpenAIもより広いコスト範囲にまたがって推論特化モデルを公開しています。',
        },
      ],
      productNote:
        'ClawAIのCost Saverルーティングは、OpenAIまたはDeepSeekのどちらのカタログからも、より低いコストクラスのモデルを優先できます。Manual Modelモードで直接固定することも可能です。',
      catalogDisclaimer:
        'モデルの利用可否と利用枠は、このページではなく、あなたのプランと最新のカタログによって管理されています。特定のモデルを前提としたプランを選ぶ前に、料金ページで最新のカタログを確認してください。',
    },
    [ModelFamilyPair.OPENAI_VS_XAI]: {
      seo: {
        title: 'OpenAI vs xAI: ClawAIはどうルーティングするか',
        description:
          'ClawAIのルーターが、あるリクエストに対してOpenAIとxAIのGrokカタログのどちらを選ぶか――コストクラスと手動固定――を解説します。勝者は宣言していません。プランを選ぶ前に必ず最新のカタログを確認してください。',
        keywords: ['OpenAI vs xAI Grok', 'ClawAI ルーター OpenAI xAI', 'GPTとGrokモデルの選び方'],
      },
      eyebrow: 'モデルルーティング',
      title: 'OpenAI vs xAI: ClawAIはどうルーティングするか',
      summary:
        'OpenAIのカタログはbudgetからpremiumまでをカバーし、ClawAI内のxAIのGrokカタログも同様にbudgetからpremiumまでをカバーしていますが、seed済みモデルの総数は少なめです。このページは、どちらが優れたベンダーかを挙げることなく、ClawAIのルーターがこの2つの間で何を検討するかを解説します。',
      sections: [
        {
          id: 'catalog-size-and-cost-class',
          heading: 'カタログが小さいことはコスト範囲が狭いことを意味しない',
          paragraphs: [
            'ClawAI内のxAIのseed済みカタログはOpenAIより小規模です――OpenAIの6モデルに対して2モデルです――が、それでもbudgetティアとpremiumティアのモデルをカバーしており、これはOpenAI自身のカタログが両極端でカバーするのと同じコストクラスの範囲です。2つの間のルーターの判断は、どちらかのベンダーのカタログの規模ではなく、具体的なモデルのコストクラスとリクエストの予算を比較検討します。',
          ],
        },
        {
          id: 'how-clawai-routes-this-pair',
          heading: 'ClawAIがこのペアの間でリクエストをどうルーティングするか',
          paragraphs: [
            'Autoルーティングのもとでは、ClawAIのルーターはどちらのカタログからも適したモデルへリクエストを送ることができます。Cost Saverルーティングは、ベンダーにかかわらずより低いコストクラスの選択肢を優先します。Manual Modelモードでは、タスクにどのモデルが必要かすでにわかっている場合、特定のOpenAIまたはxAIのモデルを直接固定できます。',
          ],
        },
        {
          id: 'what-this-page-does-not-claim',
          heading: 'このページが主張しないこと',
          paragraphs: [
            'このページは、この2つのベンダーの間で速度に関する主張や能力の順位付けを一切行っていません――当サイトのどのページも同様です。自分のワークロードに対する適性を確認する方法については、下記リンクの「AIモデルの評価方法」をご覧ください。',
          ],
        },
      ],
      faq: [
        {
          question: 'OpenAIとxAI Grokではどちらが優れていますか?',
          answer:
            'このページでは答えません――どちらも似たようなコストクラスの範囲にまたがるモデルを公開しており、あらゆるタスクに通用する信頼できるベンチマークは存在しません。下記リンクの「AIモデルの評価方法」をご覧ください。',
        },
        {
          question: 'ClawAIはOpenAIとxAIのモデルを自動的にルーティングしますか?',
          answer:
            'AutoまたはCost Saverのルーティングのもとでは、はい――ルーターはどちらのカタログからも適したモデルへリクエストを送ることができます。Manual Modelモードでどちらかのベンダーの特定のモデルを固定することもできます。',
        },
        {
          question: 'xAIはClawAIのカタログ内でOpenAIと同じ数だけモデルがありますか?',
          answer:
            'いいえ――xAIのseed済みカタログはより小規模で、OpenAIの6モデルに対して2モデルですが、似たようなコストクラスの範囲はカバーしています。最新のカタログは料金ページで確認してください。',
        },
      ],
      productNote:
        'ClawAIのAutoおよびCost Saverルーティングは、あるリクエストに対してOpenAIまたはxAIのどちらのカタログも利用できます。Manual Modelモードで直接固定することも可能です。',
      catalogDisclaimer:
        'モデルの利用可否と利用枠は、このページではなく、あなたのプランと最新のカタログによって管理されています。特定のモデルを前提としたプランを選ぶ前に、料金ページで最新のカタログを確認してください。',
    },
    [ModelFamilyPair.CLOUD_VS_LOCAL]: {
      seo: {
        title: 'クラウド vs ローカル: ClawAIはどうルーティングするか',
        description:
          'リクエストをクラウドプロバイダーではなく自分の管理下にあるハードウェアに留める場合に何が変わるか、そしてClawAIのLocal-OnlyおよびPrivacy-Firstルーティングモードがその選択にどう合致するかを解説します。勝者は宣言していません。プランを選ぶ前に必ず最新のカタログを確認してください。',
        keywords: [
          'クラウドAI vs ローカルAI',
          'ClawAI Local-Onlyルーティング',
          'モデルをクラウドではなくローカルで実行すべき場合',
        ],
      },
      eyebrow: 'モデルルーティング',
      title: 'クラウド vs ローカル: ClawAIはどうルーティングするか',
      summary:
        'このクラスターの中で、これだけはベンダーの違いではなく、リクエストがどこで実行されるかによって定義されるペアです。ClawAIが接続するすべてのクラウドファミリー――OpenAI、Anthropic、Google、DeepSeek、xAI――は自社のインフラストラクチャ上でモデルを実行します。一方Ollamaとllama.cppは、オープンウェイトのモデルを自分の管理下にあるハードウェアで実行します。このページは、それによって何が変わるか、そしてClawAI自身のローカルファースト設計を踏まえてルーターがこの選択をどう扱うかを解説します。',
      sections: [
        {
          id: 'what-changes-when-a-request-stays-local',
          heading: 'リクエストがローカルに留まると実際に何が変わるか',
          paragraphs: [
            'クラウドプロバイダーは自社のインフラストラクチャ上でモデルを実行し、リクエストごとに課金します。一方Ollamaとllama.cppは、オープンウェイトのモデルを自分の管理下にあるハードウェアに読み込むため、リクエストはクラウドプロバイダーに一切到達しません。これによって変わるのは誰がリクエストを見られるかであり、特定のモデルの能力そのものではありません――仕組みの全体については、モデルプロバイダーページの「ローカルAI」をご覧ください。',
          ],
        },
        {
          id: 'local-only-and-privacy-first-routing',
          heading: 'ClawAIのLocal-OnlyとPrivacy-Firstルーティングモードはこの選択のために存在する',
          paragraphs: [
            'Local-Onlyルーティングは、すべてのリクエストをOllamaまたはllama.cpp経由で自分の管理下にあるハードウェアに留め、このクラスターが扱う5つのクラウドファミリーのいずれにも到達しません。Privacy-Firstルーティングは、独自の優先事項を持つ別のモードです。この2つが存在するのは、すべてのワークロードがAutoルーティング――リクエストに応じてクラウドかローカルかを問わず接続済みの任意のプロバイダーに到達しうる――を既定とすべきではないからに他なりません。',
          ],
        },
        {
          id: 'when-a-workload-should-stay-local',
          heading: 'ワークロードがローカルに留まる候補となる場合',
          paragraphs: [
            'リクエストがLocal-OnlyまたはPrivacy-Firstルーティングの妥当な候補となるのは、それが自分の管理下にあるハードウェアから決して出てはならないという要件がある場合です――コンプライアンス上の境界、クライアントの機密保持要件、あるいは単に特定のデータを外部のベンダーへ送りたくないという方針などです。自分で実行するオープンウェイトモデルとクラウドプロバイダーのカタログとの間のトレードオフをどう考えるかについては、下記リンクの「ローカルファーストAIとは」をご覧ください。',
          ],
        },
      ],
      faq: [
        {
          question: 'ローカルモデルはクラウドモデルと同じくらい高性能ですか?',
          answer:
            'このページではそれらを順位付けしません――能力は、あなたが実行することを選ぶ具体的なオープンウェイトモデルによって決まり、それはあなた自身の判断であって、このページが責任を持って下せる固定的な比較ではないためです。下記リンクの「ローカルファーストAIとは」をご覧ください。',
        },
        {
          question: 'ClawAIはリクエストをローカルに留めるかどうかをどう判断しますか?',
          answer:
            '既定ではあなたに代わって判断しません――Local-Onlyルーティングはすべてのリクエストを自分の管理下にあるハードウェアに留め、Privacy-Firstルーティングは独自の優先事項を適用します。Autoルーティングは、クラウドかローカルかを問わず接続済みの任意のプロバイダーに到達できます。どのモードをワークスペースやリクエストに使うかはあなたが選びます。',
        },
        {
          question: 'ClawAIを通じてモデルをローカルで実行することに費用はかかりますか?',
          answer:
            'ClawAIは、クラウドプロバイダーの場合のようにローカルで実行するモデルにトークン単価を課金しません。課金対象となるクラウドプロバイダーが存在しないためで、コストはすでにあなたが所有しているハードウェアです。現在のプランの挙動については料金ページで確認してください。',
        },
      ],
      productNote:
        'ClawAIのLocal-Onlyルーティングモードは、Ollamaまたはllama.cppを介して、すべてのリクエストを自分の管理下にあるハードウェアに留めます――これは実際に提供済みのコネクタであり、ロードマップ上の予定ではありません。あわせて、独自の優先事項を持つPrivacy-Firstルーティングも用意されています。',
      catalogDisclaimer:
        'ここで特定のクラウドモデルやローカルモデルをあえて順位付けしていません。オープンウェイトモデルとすべてのクラウドカタログはそれぞれ独自のスケジュールで変化し、どれを実行または接続するかはあなた自身が選ぶものだからです。ローカルなワークロードに関するプランの挙動については料金ページで確認してください。',
    },
  },
};
