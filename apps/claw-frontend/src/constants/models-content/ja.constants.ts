import { ModelProviderPage } from '@/enums/model-provider-page.enum';
import type { ModelsDictionary } from '@/types/models.types';

export const JA_MODELS_CONTENT: ModelsDictionary = {
  labels: {
    onThisPage: 'このページの内容',
    faqTitle: 'よくある質問',
    relatedTitle: '次に読むべきページ',
    lastReviewed: '最終確認日',
    backToHub: 'すべてのプロバイダー',
    ctaTitle: '説明を読むより、実際に試してみてください',
    ctaBody:
      'ClawAIは、以下のすべてのプロバイダーの中から会話に合ったモデルへ、ひとつのワークスペースからルーティングします。',
    startFree: '無料プランで始める',
    seeFeatures: 'ClawAIの機能を見る',
    catalogHeading: 'ClawAIがルーティングできるモデル',
    costBandLabel: 'コスト帯',
    seePricing: '料金ページで最新のカタログを確認してください',
    sourceLabel: '出典',
    costBandNames: {
      budget: 'エコノミー',
      standard: 'スタンダード',
      premium: 'プレミアム',
      highest: '最上位',
    },
  },
  hub: {
    seo: {
      title: 'ClawAIが接続するAIモデルプロバイダー',
      description:
        'ClawAIが会話をルーティングできるすべてのモデルプロバイダー — OpenAI、Anthropic、Google Gemini、DeepSeek、xAI Grok、そしてローカルで動かすオープンウェイトモデル。定性的なコスト帯のみを示し、架空のベンチマークは掲載していません。',
      keywords: ['AIモデル プロバイダー', 'ClawAI 対応 AIモデル', 'AIプロバイダー 比較'],
    },
    eyebrow: 'モデルプロバイダー',
    title: 'ClawAIを支えるモデルプロバイダー',
    summary:
      'ClawAIは自らモデルを開発しているわけではなく、タスクやコスト、プライバシーに応じて複数のプロバイダーの中から選んだモデルへ会話をルーティングします。このページでは、現在アダプターが稼働しているプロバイダーの系列、それぞれが一般的に何に向いているか、そして定性的なコスト帯を紹介します。優劣を順位付けするものではなく、プランを決める前に最新のカタログを確認する代わりにはなりません。',
    topicsHeading: 'プロバイダーを選ぶ',
    cardSummaries: {
      [ModelProviderPage.OPENAI]: 'GPT-5、o3など、OpenAIの現行ラインナップ。',
      [ModelProviderPage.ANTHROPIC]: 'Claude Opus、Sonnet、Haikuのファミリー。',
      [ModelProviderPage.GOOGLE]: 'Gemini 2.5 Pro、Flash、Flash-Lite。',
      [ModelProviderPage.DEEPSEEK]: 'DeepSeek ChatとDeepSeek Reasoner。',
      [ModelProviderPage.XAI]: 'xAIのGrok 4とGrok 3 mini。',
      [ModelProviderPage.LOCAL_AI]: 'Ollamaやllama.cppで自分で動かすオープンウェイトモデル。',
    },
  },
  providers: {
    [ModelProviderPage.OPENAI]: {
      seo: {
        title: 'ClawAIのOpenAIモデル — GPT-5、o3ほか',
        description:
          'ClawAIが会話をルーティングできるOpenAIモデルの一覧、それぞれがどのような用途に向いているか、そして定性的なコスト帯を紹介します。プランを選ぶ前に、必ず料金ページで最新のモデルカタログを確認してください。',
        keywords: ['ClawAI OpenAIモデル', 'ClawAI GPT-5', 'OpenAI どのモデルを使うべきか'],
      },
      eyebrow: 'モデルプロバイダー',
      title: 'OpenAI',
      summary:
        'ClawAIはOpenAIへのアダプターを稼働させており、タスクやコスト帯、ルーティングモードに応じて会話を複数のOpenAIモデルのいずれかへルーティングできます。このページでは現時点でClawAIが到達できるモデルを紹介しますが、料金ページの最新カタログの代わりにはなりません。',
      sections: [
        {
          id: 'the-lineup',
          heading: 'OpenAIのラインナップが対象とする範囲',
          paragraphs: [
            'OpenAIの現行ラインナップには、推論と汎用処理の両方を担うフラッグシップ級（GPT-5）、より軽量な兄弟モデル（GPT-5 mini）、マルチモーダルな汎用モデル（GPT-4oおよびGPT-4o mini）、そして段階的な推論タスク専用に設計された2つのモデル（o3とo4-mini）が含まれます。ClawAIのルーターはリクエストごとにこれらを使い分けることができ、アカウント全体をひとつのモデルに固定することはありません。',
          ],
        },
        {
          id: 'when-openai-fits',
          heading: 'どんなタスクにOpenAIモデルが向くか',
          paragraphs: [
            'OpenAIのモデルは、一般的な文章作成、コーディング支援、日常的な質疑応答において妥当な既定の選択肢です。またoシリーズのモデルは、モデルが即答するのではなく段階を踏んで問題を解くことが期待される多段階の推論問題向けに設計されています。どのモデルが実際に自分のタスクで最も適しているかは、下記の「AIモデルの評価方法」を参照しながら、このページを含むどんな宣伝文句からも鵜呑みにせず自分自身で確かめるべきことです。',
          ],
        },
        {
          id: 'routing-and-cost',
          heading: 'ClawAIがどのようにルーティングするか',
          paragraphs: [
            'ClawAIのルーターは、AutoまたはCost Saverのルーティングでは自動的にリクエストをOpenAIモデルへ送ることができ、Manual Modelモードでは特定のモデルを固定して指定することもできます。以下のコスト帯はあくまで定性的なもので、安価なモデルはリクエストあたりの費用が明確に低くなりますが、正確な単価はOpenAI自身の価格設定によって変動し、ClawAIが管理するものではありません。',
          ],
        },
      ],
      faq: [
        {
          question: 'ClawAIはOpenAIと直接提携していますか?',
          answer:
            'いいえ。ClawAIは、APIキーを持つ他のあらゆるアプリケーションと同じ方法でOpenAIの公開APIに接続しています。このページによって特別な提携関係が示唆されるものではありません。',
        },
        {
          question: 'コーディングにはどのOpenAIモデルを使うべきですか?',
          answer:
            'それはタスクの内容と作業環境によって異なります。単一の推奨モデルではなく、判断の方法として下記の「AIモデルの評価方法」を参照してください。このページは意図的に特定のモデルを最良とは断定していません。',
        },
        {
          question: 'GPT-5は自分のプランで常に利用できますか?',
          answer:
            'モデルの利用可否は、このページではなく契約プランと最新のカタログによって決まります。特定のモデルを目的にプランを選ぶ前に、料金ページで現行のラインナップを確認してください。',
        },
      ],
      productNote:
        'ClawAIはリクエストを自動的にOpenAIモデルへルーティングすることも、特定のモデルを直接固定することもできます — 選択はあなた次第で、特定のベンダーに縛られることはありません。',
      catalogDisclaimer:
        'この一覧は、上記の確認日時点でClawAIが料金設定を行ったOpenAIモデルを反映したものであり、リアルタイムのフィードではありません。モデルの提供状況は変わることがあります。',
    },
    [ModelProviderPage.ANTHROPIC]: {
      seo: {
        title: 'ClawAIのAnthropic Claudeモデル',
        description:
          'ClawAIが会話をルーティングできるClaudeモデル — Opus、Sonnet、Haiku — それぞれの用途、そして定性的なコスト帯。プランを選ぶ前に最新のカタログを確認してください。',
        keywords: ['ClawAI Claudeモデル', 'ClawAI Anthropic', 'Claude Opus Sonnet Haiku 比較'],
      },
      eyebrow: 'モデルプロバイダー',
      title: 'Anthropic',
      summary:
        'ClawAIはAnthropicへのアダプターを稼働させており、タスクやコスト帯、ルーティングモードに応じて会話をClaudeモデルへルーティングできます。このページでは現時点でClawAIが到達できるモデルを紹介しますが、料金ページの最新カタログの代わりにはなりません。',
      sections: [
        {
          id: 'the-lineup',
          heading: 'Claudeのラインナップが対象とする範囲',
          paragraphs: [
            'Anthropicの現行ラインナップには3つの階層があります。最も難易度が高く複雑なタスク向けの最上位モデルClaude Opus 4、汎用的な用途に対応する中間層のClaude Sonnet 4、そしてより単純なリクエスト向けに高速・低コストなClaude Haiku 4.5です。ClawAIのルーターはリクエストごとにこれらを切り替えられます。',
          ],
        },
        {
          id: 'when-anthropic-fits',
          heading: 'どんなタスクにClaudeモデルが向くか',
          paragraphs: [
            'Claudeのモデルは、長文の資料を扱う作業、慎重に段階を踏んだ文章作成、そして詳細な指示への追従が重要になるコーディング支援でよく利用されます。どのプロバイダーでも同様ですが、特定のタスクにどのモデルが最適かは、自分自身のワークロードに照らして確かめる価値があります。公開されている数値が何を語り、何を語らないかについては、下記の「AIベンチマークの読み方」を参照してください。',
          ],
        },
        {
          id: 'routing-and-cost',
          heading: 'ClawAIがどのようにルーティングするか',
          paragraphs: [
            'ClawAIのルーターは、Auto、High ReasoningまたはCost Saverのルーティングでは自動的にリクエストをClaudeモデルへ送ることができ、Manual Modelモードでは特定のモデルを固定することもできます。Anthropicは、このリストの中で唯一キャッシュ書き込み用の別料金を公開しているプロバイダーですが、これは課金上の詳細であって能力の違いではなく、モデルにできることを変えるものではありません。',
          ],
        },
      ],
      faq: [
        {
          question: 'Opus、Sonnet、Haikuの違いは何ですか?',
          answer:
            'これらは同じモデルファミリーの中の3つのコスト・性能階層です — Opusが最上位、Sonnetが中間層、Haikuが最も高速で低コストな階層です。ClawAIのルーターがこれらを使い分けることも、手動で選択することもできます。',
        },
        {
          question: 'ClawAIはAnthropicと直接提携していますか?',
          answer:
            'いいえ。ClawAIは、APIキーを持つ他のあらゆるアプリケーションと同じ方法でAnthropicの公開APIに接続しています。',
        },
        {
          question: 'Claude Opus 4はすべてのプランで利用できますか?',
          answer:
            'モデルの利用可否は、このページではなく契約プランと最新のカタログによって決まります。特定のモデルを目的にプランを選ぶ前に、料金ページで現行のラインナップを確認してください。',
        },
      ],
      productNote:
        'ClawAIはリクエストを自動的にClaudeモデルへルーティングすることも、特定のモデルを直接固定することもできます — 選択はあなた次第で、特定のベンダーに縛られることはありません。',
      catalogDisclaimer:
        'この一覧は、上記の確認日時点でClawAIが料金設定を行ったClaudeモデルを反映したものであり、リアルタイムのフィードではありません。モデルの提供状況は変わることがあります。',
    },
    [ModelProviderPage.GOOGLE]: {
      seo: {
        title: 'ClawAIのGoogle Geminiモデル',
        description:
          'ClawAIが会話をルーティングできるGeminiモデル — 2.5 Pro、Flash、Flash-Lite — それぞれの用途、そして定性的なコスト帯。プランを選ぶ前に最新のカタログを確認してください。',
        keywords: ['ClawAI Geminiモデル', 'ClawAI Google AI', 'Gemini Pro Flash 比較'],
      },
      eyebrow: 'モデルプロバイダー',
      title: 'Google Gemini',
      summary:
        'ClawAIはGoogle Geminiへのアダプターを稼働させており、タスクやコスト帯、ルーティングモードに応じて会話をGeminiモデルへルーティングできます。このページでは現時点でClawAIが到達できるモデルを紹介しますが、料金ページの最新カタログの代わりにはなりません。',
      sections: [
        {
          id: 'the-lineup',
          heading: 'Geminiのラインナップが対象とする範囲',
          paragraphs: [
            'Googleの現行ラインナップには3つの階層があります。最も要求水準の高いリクエスト向けのGemini 2.5 Pro、汎用的な用途に対応する中間層のGemini 2.5 Flash、そして高速・低コストなGemini 2.5 Flash-Liteです。ClawAIのルーターはリクエストごとにこれらを切り替えられます。',
          ],
        },
        {
          id: 'when-google-fits',
          heading: 'どんなタスクにGeminiモデルが向くか',
          paragraphs: [
            'Geminiのモデルは、参照すべき素材の量が多いタスクでよく選ばれます。このファミリーは長いコンテキストを扱うことを前提に設計されているためです。特定の階層が自分のワークロードに合っているかどうかは、自分自身で確かめる価値があります。断定的な一文ではなく、繰り返し使える確認方法については下記の「AIモデルの評価方法」を参照してください。',
          ],
        },
        {
          id: 'routing-and-cost',
          heading: 'ClawAIがどのようにルーティングするか',
          paragraphs: [
            'ClawAIのルーターは、AutoまたはCost Saverのルーティングでは自動的にリクエストをGeminiモデルへ送ることができ、Manual Modelモードでは特定のモデルを固定することもできます。Geminiの公開価格は、長いコンテキストのしきい値を超えると上昇しますが、このページのコスト帯はその段階的な料金までは表現していません。単一の定性的な区分では段階制の料金を正確に示すには不十分なため、あくまで出発点として扱い、請求額そのものとは見なさないでください。',
          ],
        },
      ],
      faq: [
        {
          question: 'ClawAIはGoogleと直接提携していますか?',
          answer:
            'いいえ。ClawAIは、APIキーを持つ他のあらゆるアプリケーションと同じ方法でGemini APIに接続しています。',
        },
        {
          question: '長い文書を扱うのに最も適したGeminiモデルはどれですか?',
          answer:
            'このファミリーは各階層とも一般的に長いコンテキストの処理を前提に設計されていますが、正確な上限とコストは具体的なモデルとリクエストによって異なります。固定された数値を前提にせず、最新のカタログを確認してください。',
        },
        {
          question: 'Gemini 2.5 Proはすべてのプランで利用できますか?',
          answer:
            'モデルの利用可否は、このページではなく契約プランと最新のカタログによって決まります。特定のモデルを目的にプランを選ぶ前に、料金ページで現行のラインナップを確認してください。',
        },
      ],
      productNote:
        'ClawAIはリクエストを自動的にGeminiモデルへルーティングすることも、特定のモデルを直接固定することもできます — 選択はあなた次第で、特定のベンダーに縛られることはありません。',
      catalogDisclaimer:
        'この一覧は、上記の確認日時点でClawAIが料金設定を行ったGeminiモデルを反映したものであり、リアルタイムのフィードではありません。モデルの提供状況は変わることがあります。',
    },
    [ModelProviderPage.DEEPSEEK]: {
      seo: {
        title: 'ClawAIのDeepSeekモデル',
        description:
          'ClawAIが会話をルーティングできるDeepSeekモデル — DeepSeek ChatとDeepSeek Reasoner — それぞれの用途、そして定性的なコスト帯。プランを選ぶ前に最新のカタログを確認してください。',
        keywords: ['ClawAI DeepSeekモデル', 'ClawAI DeepSeek', 'DeepSeek Chat Reasoner 比較'],
      },
      eyebrow: 'モデルプロバイダー',
      title: 'DeepSeek',
      summary:
        'ClawAIはDeepSeekへのアダプターを稼働させており、タスクやコスト帯、ルーティングモードに応じて会話をDeepSeekモデルへルーティングできます。このページでは現時点でClawAIが到達できるモデルを紹介しますが、料金ページの最新カタログの代わりにはなりません。',
      sections: [
        {
          id: 'the-lineup',
          heading: 'DeepSeekのラインナップが対象とする範囲',
          paragraphs: [
            'DeepSeekの現行ラインナップには2つのモデルがあります。汎用モデルのDeepSeek Chatと、モデルが答えを出す前に複数の段階を経ることが想定されるタスク専用に設計されたDeepSeek Reasonerです。両方とも、このページに掲載されている他の複数のプロバイダーより明確に低価格で、Cost Saverルーティングモードがより頻繁にDeepSeekを選ぶ理由のひとつになっています。',
          ],
        },
        {
          id: 'when-deepseek-fits',
          heading: 'どんなタスクにDeepSeekモデルが向くか',
          paragraphs: [
            'DeepSeekは、能力の最後の一段を追い求めるより、リクエストあたりのコストを重視する場合に妥当な選択肢であり、特にDeepSeek Reasonerは多段階の推論タスクに向いています。どのプロバイダーでも同様ですが、一般的な主張ではなく自分自身のワークロードに照らして確かめてください。下記の「AIベンチマークの読み方」も参照してください。',
          ],
        },
        {
          id: 'routing-and-cost',
          heading: 'ClawAIがどのようにルーティングするか',
          paragraphs: [
            'ClawAIのルーターは、Cost SaverまたはAutoのルーティングでは自動的にリクエストをDeepSeekモデルへ送ることができ、Manual Modelモードでは特定のモデルを固定することもできます。両方のDeepSeekモデルは、このページではスタンダードのコスト帯に位置づけられており、このサイトの他のプレミアム階層と比べて実際に低価格ですが、このページが正確な単価を主張するものではありません。',
          ],
        },
      ],
      faq: [
        {
          question: 'DeepSeekは他のプロバイダーより安いですか?',
          answer:
            '両方のDeepSeekモデルは、ここではスタンダードのコスト帯に位置づけられており、一般的に他プロバイダーのプレミアム階層のモデルより低価格です。ただし正確な料金はDeepSeek自身の公開レートによって変動し、このページによって決まるものではありません。',
        },
        {
          question: 'DeepSeek Reasonerは何のためのモデルですか?',
          answer:
            'モデルが答えを出す前に複数の段階を経て処理するタスク向けに設計されており、他プロバイダーが公開している推論特化モデルと意図の面で似ています。',
        },
        {
          question: 'ClawAIはDeepSeekと直接提携していますか?',
          answer:
            'いいえ。ClawAIは、APIキーを持つ他のあらゆるアプリケーションと同じ方法でDeepSeekの公開APIに接続しています。',
        },
      ],
      productNote:
        'ClawAIはリクエストを自動的にDeepSeekモデルへルーティングすることも、特定のモデルを直接固定することもできます — 選択はあなた次第で、特定のベンダーに縛られることはありません。',
      catalogDisclaimer:
        'この一覧は、上記の確認日時点でClawAIが料金設定を行ったDeepSeekモデルを反映したものであり、リアルタイムのフィードではありません。モデルの提供状況は変わることがあります。',
    },
    [ModelProviderPage.XAI]: {
      seo: {
        title: 'ClawAIのxAI Grokモデル',
        description:
          'ClawAIが会話をルーティングできるxAI Grokモデル — Grok 4とGrok 3 mini — それぞれの用途、そして定性的なコスト帯。プランを選ぶ前に最新のカタログを確認してください。',
        keywords: ['ClawAI Grokモデル', 'ClawAI xAI', 'ClawAI Grok 4'],
      },
      eyebrow: 'モデルプロバイダー',
      title: 'xAI',
      summary:
        'ClawAIはxAIへのアダプターを稼働させており、タスクやコスト帯、ルーティングモードに応じて会話をGrokモデルへルーティングできます。このページでは現時点でClawAIが到達できるモデルを紹介しますが、料金ページの最新カタログの代わりにはなりません。',
      sections: [
        {
          id: 'the-lineup',
          heading: 'Grokのラインナップが対象とする範囲',
          paragraphs: [
            'xAIの現行ラインナップには、ClawAIから利用できる2つのモデルがあります。より高い能力を持つ階層のGrok 4と、より高速で低コストなGrok 3 miniです。ClawAIのルーターはリクエストごとにこれらを切り替えられます。',
          ],
        },
        {
          id: 'when-xai-fits',
          heading: 'どんなタスクにGrokモデルが向くか',
          paragraphs: [
            'Grokのモデルは、このページの他のプロバイダーと並ぶ妥当な汎用の選択肢です。特定のタスクにどのモデルが最も適しているかは、自分自身で確かめる価値があります。特定のベンダーの宣伝文句に頼らない確認方法については下記の「AIモデルの評価方法」を参照してください。',
          ],
        },
        {
          id: 'routing-and-cost',
          heading: 'ClawAIがどのようにルーティングするか',
          paragraphs: [
            'ClawAIのルーターは、AutoまたはCost Saverのルーティングでは自動的にリクエストをGrokモデルへ送ることができ、Manual Modelモードでは特定のモデルを固定することもできます。Grok 3 miniはこのページではエコノミーのコスト帯に、Grok 4はプレミアムのコスト帯に位置づけられています。',
          ],
        },
      ],
      faq: [
        {
          question: 'ClawAIはxAIと直接提携していますか?',
          answer:
            'いいえ。ClawAIは、APIキーを持つ他のあらゆるアプリケーションと同じ方法でxAIの公開APIに接続しています。',
        },
        {
          question: 'Grok 4とGrok 3 miniの違いは何ですか?',
          answer:
            'これらは同じモデルファミリーの、より高い能力を持つ階層と、より高速で低コストな階層です。ClawAIのルーターがこれらを使い分けることも、手動で選択することもできます。',
        },
        {
          question: 'Grok 4はすべてのプランで利用できますか?',
          answer:
            'モデルの利用可否は、このページではなく契約プランと最新のカタログによって決まります。特定のモデルを目的にプランを選ぶ前に、料金ページで現行のラインナップを確認してください。',
        },
      ],
      productNote:
        'ClawAIはリクエストを自動的にGrokモデルへルーティングすることも、特定のモデルを直接固定することもできます — 選択はあなた次第で、特定のベンダーに縛られることはありません。',
      catalogDisclaimer:
        'この一覧は、上記の確認日時点でClawAIが料金設定を行ったGrokモデルを反映したものであり、リアルタイムのフィードではありません。モデルの提供状況は変わることがあります。',
    },
    [ModelProviderPage.LOCAL_AI]: {
      seo: {
        title: 'ClawAIのローカル・オープンウェイトAIモデル',
        description:
          'ClawAIを通じて、Ollamaやllama.cppでオープンウェイトモデルを自分自身で動かし、クラウドプロバイダーへリクエストを送らずに済む仕組み。その仕組みと、このページに掲載されているクラウドプロバイダーとの違い。',
        keywords: ['ClawAI ローカルAIモデル', 'ClawAI Ollama', 'AIモデル ローカル実行'],
      },
      eyebrow: 'モデルプロバイダー',
      title: 'ローカルAI',
      summary:
        'ClawAIはOllamaとllama.cppへのアダプターを稼働させています。これらは、クラウドプロバイダーへリクエストを送る代わりに、自分が管理するハードウェア上でオープンウェイトモデルを動かす2つの方法です。このクラスターの他のページと異なり、固定されたカタログを示すことはできません — モデルはオープンウェイトであり、どれを動かすかはあなた自身が選びます。',
      sections: [
        {
          id: 'what-changes',
          heading: 'モデルをローカルで動かすと実際に何が変わるか',
          paragraphs: [
            'このサイトに掲載されているクラウドプロバイダーは、自社のインフラ上でモデルを動かし、リクエストごとに課金します。一方Ollamaとllama.cppは、オープンウェイトモデルをあなたが管理するハードウェア — 自分のマシンや、自分で運用するサーバー — に読み込ませるため、リクエストがそこから外に出ることはありません。これによって変わるのは、リクエストを誰が見られるかであって、モデルにできることそのものではありません。ローカルで動かすオープンウェイトモデルは、このクラスターの他のページで挙げられているクラウドプロバイダーのいずれとも異なる種類のものであり、そのまま置き換えられるものではありません。',
          ],
        },
        {
          id: 'ollama-vs-llamacpp',
          heading: 'Ollamaとllama.cppは異なる2つのツールです',
          paragraphs: [
            'どちらもClawAIの実在するアダプターですが、適した状況が異なります。Ollamaはモデルを手軽に取得して妥当な既定値で動かせることに重点を置いており、llama.cppはより手間のかかる手動セットアップと引き換えに、モデルの動かし方をより直接的に制御できます。詳しい比較は、ここで繰り返す代わりに、下記の「Ollama対llama.cpp」に掲載しています。',
          ],
        },
        {
          id: 'choosing-a-model',
          heading: 'どのオープンウェイトモデルを動かすか選ぶ',
          paragraphs: [
            'このページでは意図的に特定のオープンウェイトモデルを名指ししていません。この分野は静的なページが追いつけないほど速く動いており、古くなった推奨は何も示さないより悪い結果になるためです。下記の「ローカルファーストAIとは」では、オープンウェイトモデルとクラウドプロバイダーとのトレードオフを、製品ページで扱うべき以上に詳しく説明しています。',
          ],
        },
      ],
      faq: [
        {
          question: 'ClawAIを通じたローカルAIの利用に費用はかかりますか?',
          answer:
            'ClawAIは、クラウドプロバイダーに対して行うようなトークン単価の課金をローカルで動かすモデルには行いません。課金対象となるクラウドプロバイダーが存在しないためで、コストはすでに自分が保有しているハードウェアそのものです。現在のプランでの扱いは料金ページで確認してください。',
        },
        {
          question: 'どのオープンウェイトモデルを動かすべきですか?',
          answer:
            'このページでは特定のモデルを推奨していません。判断の考え方については下記の「ローカルファーストAIとは」を参照してください。適したモデルはあなたのハードウェアとタスクによって異なり、静的なページが責任を持って追跡できるものではないためです。',
        },
        {
          question: 'ローカルで動かすモデルはクラウドのモデルと同等の能力がありますか?',
          answer:
            'それは完全に、具体的なオープンウェイトモデルとあなたのハードウェア次第であり、このページはどちらの方向にも一律の主張をしません。自分のワークロードで確認する方法については下記の「AIモデルの評価方法」を参照してください。',
        },
      ],
      productNote:
        'ClawAIのOllamaおよびllama.cppアダプターは実際に提供されている接続機能です — Local-Onlyルーティングモードは、すべてのリクエストをあなたが管理するハードウェア上にとどめます。',
      catalogDisclaimer:
        'ここで特定のモデルを名指ししていないのは意図的なものです。オープンウェイトモデルとその能力は急速に変化し、どれを動かすかはあなた自身が選びます。ローカルモデルに関するプランの扱いは料金ページで確認してください。',
    },
  },
};
