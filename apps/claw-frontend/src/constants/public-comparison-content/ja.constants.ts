import { ComparisonDimension } from '@/enums/comparison-dimension.enum';
import { ComparisonRival } from '@/enums/comparison-rival.enum';
import type { ComparisonDictionary } from '@/types/public-comparison.types';

export const JA_COMPARISON_CONTENT: ComparisonDictionary = {
  labels: {
    onThisPage: 'このページの内容',
    atAGlance: '要点',
    tableCaption: 'ClawAI と {rival} を機能ごとに比較',
    capabilityColumn: '機能',
    clawColumn: 'ClawAI',
    strengthTitle: '{rival} が強いところ',
    differenceTitle: 'ClawAI の働き方が違うところ',
    chooseTitle: 'どちらを選ぶか',
    chooseRivalLabel: 'こんなときは {rival}',
    chooseClawLabel: 'こんなときは ClawAI',
    faqTitle: 'よくある質問',
    lastReviewed: '公開情報に基づく比較、最終確認日',
    independence:
      'ClawAI は独立した製品です。このページに登場するどの assistant とも資本関係はなく、推奨も受けておらず、再販もしていません。記載はすべて上記の日付時点における各社の公開ドキュメントに基づいており、これらの製品は速く変わります。判断の前に各社のページをご確認ください。',
    otherComparisons: 'ClawAI を別のアシスタントと比較する',
    startFree: '無料プランで始める',
    seePricing: '料金を見る',
  },
  hub: {
    eyebrow: '比較',
    intro:
      'ClawAI は「より優れた単一のアシスタント」を目指していません。9 つのフロンティアモデルファミリーを 1 つのサブスクリプションの下に置き、メッセージごとに適したモデルへ送ります。これらのページは、その考え方を実際に使われているアシスタントと、毎回同じ 8 つの機能で突き合わせます。',
    cardsTitle: '比較するアシスタントを選ぶ',
    cardCta: '{rival} と比較する',
    coversTitle: '各比較が扱う範囲',
    coversBody:
      'どのページでも同じ 8 つの機能を同じ順に扱います。モデル選択、ルーティング、並列回答、ローカルモデル、セルフホスト、メモリとファイル、ワークスペース連携、回答ごとの利用記録。全員に同じ問いを立てているので、2 つのページを並べて読めます。',
  },
  dimensionLabels: {
    [ComparisonDimension.MODEL_CHOICE]: 'モデル選択',
    [ComparisonDimension.ROUTING]: 'ルーティング',
    [ComparisonDimension.SIDE_BY_SIDE]: '並列回答',
    [ComparisonDimension.LOCAL_MODELS]: 'ローカル／オープンウェイトモデル',
    [ComparisonDimension.SELF_HOSTING]: 'セルフホスト',
    [ComparisonDimension.MEMORY_AND_FILES]: 'メモリとファイル',
    [ComparisonDimension.CONNECTORS]: 'ワークスペース連携',
    [ComparisonDimension.RECEIPTS]: '利用記録',
  },
  clawCells: {
    [ComparisonDimension.MODEL_CHOICE]:
      '1 つのサブスクリプションで 9 つのフロンティアモデルファミリー',
    [ComparisonDimension.ROUTING]: 'メッセージ単位の自動ルーティングを含む 5 つのモード',
    [ComparisonDimension.SIDE_BY_SIDE]:
      '1 つのプロンプトを複数モデルへ同時送信し、回答を並べて表示',
    [ComparisonDimension.LOCAL_MODELS]:
      '自前の GPU 上でオープンウェイトモデルを Ollama または llama.cpp 経由で実行',
    [ComparisonDimension.SELF_HOSTING]:
      'スタック全体が自社サーバーで動作し、ソースは GitHub に公開',
    [ComparisonDimension.MEMORY_AND_FILES]: '会話をまたいで残るメモリと、ファイルコンテキスト',
    [ComparisonDimension.CONNECTORS]: '12 種類のワークスペースコネクター',
    [ComparisonDimension.RECEIPTS]: 'すべての回答がモデル・コスト・消費した割当量を記録',
  },
  rivals: {
    [ComparisonRival.CHATGPT]: {
      name: 'ChatGPT',
      vendor: 'OpenAI',
      eyebrow: 'ClawAI と ChatGPT の比較',
      intro:
        '多くの人が「AI」と言うとき念頭にあるのが ChatGPT です。完成度が高く、速く、OpenAI 自身のフロンティアモデルに支えられています。ClawAI は形が違います。1 つのサブスクリプションで OpenAI のモデルに加えて 8 つのモデルファミリーへ届き、メッセージごとに適したモデルへ送ります。',
      theirStrength:
        '極めてよくできた単一の製品です。音声、画像生成、コード実行、ディープリサーチが最初から組み込まれ、互いに連携します。モバイルアプリは優秀で、土台のモデルは妥協ではなくフロンティアモデルです。',
      ourDifference:
        'ClawAI は「より優れた単一のアシスタント」を目指しません。単一ベンダーという前提そのものを外します。同じ会話が OpenAI、Anthropic、Google ほか 6 ファミリーの間を移動でき、データを社外に出せない場面ではローカルのオープンウェイトモデルに切り替え、どのモデルが答えたかを記録します。',
      chooseRival:
        '完成度の高いアシスタントを 1 つ使いたく、OpenAI のモデルでほぼ事足り、内蔵の音声・画像ツールに価値を感じる場合。',
      chooseClaw:
        '単一ベンダーの限界に何度もぶつかる、1 つ目の回答を 2 つ目のモデルに検証させたい、あるいは一部の作業を自社ハードウェア上に留めたい場合。',
      cells: {
        [ComparisonDimension.MODEL_CHOICE]: 'OpenAI のモデルのみ',
        [ComparisonDimension.ROUTING]: 'OpenAI 自社ラインナップ内での自動選択',
        [ComparisonDimension.SIDE_BY_SIDE]: '一度に 1 つの回答',
        [ComparisonDimension.LOCAL_MODELS]: 'クラウドのみ',
        [ComparisonDimension.SELF_HOSTING]: '提供なし',
        [ComparisonDimension.MEMORY_AND_FILES]: 'メモリ、プロジェクト、ファイルアップロード',
        [ComparisonDimension.CONNECTORS]: '有料プランでのアプリとコネクター',
        [ComparisonDimension.RECEIPTS]: 'プラン単位の利用量、回答ごとのコストはなし',
      },
      faq: [
        {
          question: 'ClawAI は ChatGPT と同じ OpenAI のモデルを使えますか。',
          answer:
            'ClawAI は 9 つのモデルファミリーの 1 つとして OpenAI のモデルへルーティングします。OpenAI のアカウント作成も API キーの貼り付けも不要で、モデルへのアクセスはサブスクリプションに含まれます。',
        },
        {
          question: 'ClawAI は ChatGPT のクライアントですか。',
          answer:
            'いいえ。ClawAI はルーティング、メモリ、比較、オーケストレーションの各レイヤーを自前で持つ独立したプラットフォームです。OpenAI はメッセージの送信先の 1 つであり、土台となる製品ではありません。',
        },
        {
          question: 'OpenAI に何も送らずに ClawAI を使えますか。',
          answer:
            'はい。会話をローカルのオープンウェイトモデルに固定するか、スタック全体をセルフホストして自社 GPU 上のモデルだけを実行すれば、外部プロバイダーへの通信は一切発生しません。',
        },
      ],
    },
    [ComparisonRival.CLAUDE]: {
      name: 'Claude',
      vendor: 'Anthropic',
      eyebrow: 'ClawAI と Claude の比較',
      intro:
        '長く、丁寧で、書く作業のときに多くの人が選ぶのが Claude です。ClawAI も Anthropic のモデルに届きます。ほかの 8 ファミリーと並んで扱い、1 つ目の回答を 2 つ目のモデルに検証させられます。',
      theirStrength:
        '長い文書に対する丁寧な推論、この分野で最も安定した指示遵守、そして質の高いコードレビュー。プロジェクト、アーティファクト、MCP コネクターにより、腰を据えた執筆作業の場として実際に優れています。',
      ourDifference:
        'ClawAI は Anthropic を「強い選択肢の 1 つ」として扱い、唯一の選択肢とはしません。同じスレッドから Claude と他 4 モデルへ同時にプロンプトを送り、あるモデルに別のモデルの回答を評価させ、プロバイダー障害時には自動で切り替えます。',
      chooseRival:
        '作業のほとんどが長文推論かコードレビューで、優れたモデルが 1 つあれば足りる場合。',
      chooseClaw:
        'Claude の回答とセカンドオピニオンの両方が欲しい、機微な作業にローカルモデルが要る、あるいはベンダーごとに契約を抱えたくない場合。',
      cells: {
        [ComparisonDimension.MODEL_CHOICE]: 'Anthropic のモデルのみ',
        [ComparisonDimension.ROUTING]: 'モデルは利用者が選択',
        [ComparisonDimension.SIDE_BY_SIDE]: '一度に 1 つの回答',
        [ComparisonDimension.LOCAL_MODELS]: 'クラウドのみ',
        [ComparisonDimension.SELF_HOSTING]: '提供なし',
        [ComparisonDimension.MEMORY_AND_FILES]: 'プロジェクト、ファイル、メモリ',
        [ComparisonDimension.CONNECTORS]: 'MCP コネクターとデスクトップ拡張',
        [ComparisonDimension.RECEIPTS]: 'プラン単位の利用量、回答ごとのコストはなし',
      },
      faq: [
        {
          question: 'ClawAI に Claude のモデルは含まれますか。',
          answer:
            'はい。Anthropic はラインナップの 9 モデルファミリーの 1 つで、Anthropic の個別アカウントやキーなしにどの会話からでも利用できます。',
        },
        {
          question: 'あるモデルが別のモデルの回答を検証できますか。',
          answer:
            'はい。Verify、Judge、Critic が 1 つ目の出力に 2 つ目のモデルを当てます。自信ありげな誤答のリスクは下がりますが、なくなりはしません。重要な判断には引き続き人の確認が必要です。',
        },
        {
          question: 'ClawAI は Anthropic の関連会社ですか。',
          answer:
            'いいえ。ClawAI は独立しています。他の 8 プロバイダーと同じように Anthropic のモデルへルーティングしているだけで、いずれの推奨も提携も受けていません。',
        },
      ],
    },
    [ComparisonRival.GEMINI]: {
      name: 'Gemini',
      vendor: 'Google',
      eyebrow: 'ClawAI と Gemini の比較',
      intro:
        '手元の文書が Google Workspace にあるなら、Gemini はその文書に最も近いアシスタントです。ClawAI は反対側から来ます。ベンダー中立で、Google のモデルは 9 ファミリーのうちの 1 つです。',
      theirStrength:
        '非常に大きなコンテキストウィンドウ、画像・音声・動画のネイティブ処理、速い応答、そして Gmail・Drive・Docs との、第三者には並べない統合。',
      ourDifference:
        'ClawAI は特定のオフィススイートにも、特定ベンダーのロードマップにも縛られません。1 つではなく 12 の業務ツールに接続し、タスクに応じてメッセージをルーティングし、機微な作業をローカルのオープンウェイトモデルに留められます。',
      chooseRival: '組織が Google Workspace 上で回っていて、その内側にアシスタントを置きたい場合。',
      chooseClaw:
        '複数ベンダーのツールを使っている、決める前にモデルを比較したい、あるいは外部通信を一切行わない導入形態が必要な場合。',
      cells: {
        [ComparisonDimension.MODEL_CHOICE]: 'Google のモデルのみ',
        [ComparisonDimension.ROUTING]: 'Google 自社ラインナップ内での自動選択',
        [ComparisonDimension.SIDE_BY_SIDE]: '一度に 1 つの回答',
        [ComparisonDimension.LOCAL_MODELS]: 'Google ホストのみ',
        [ComparisonDimension.SELF_HOSTING]: '提供なし',
        [ComparisonDimension.MEMORY_AND_FILES]: 'ファイル、Drive、Workspace のコンテキスト',
        [ComparisonDimension.CONNECTORS]: '深い Google Workspace 統合',
        [ComparisonDimension.RECEIPTS]: 'プラン単位の利用量、回答ごとのコストはなし',
      },
      faq: [
        {
          question: 'ClawAI で Gemini のモデルを使えますか。',
          answer:
            'はい。Google はラインナップの 9 モデルファミリーの 1 つで、同じサブスクリプションのままどの会話でも利用できます。',
        },
        {
          question: 'ClawAI は Google Workspace に接続しますか。',
          answer:
            'ClawAI は課題管理、チャット、ドキュメントをカバーする 12 のコネクターを備えます。Google との連携はコネクターであり自社ネイティブ面ではありません。ベンダー横断では広く、Google 内部では浅い作りです。',
        },
        {
          question: '非常に長い文書にはどちらが向きますか。',
          answer:
            'どちらも十分に扱えます。Google の最大コンテキストウィンドウは現行でも最大級です。ClawAI の違いは、同じ長文を 2 つのモデルに送り、結論を突き合わせられる点にあります。',
        },
      ],
    },
    [ComparisonRival.PERPLEXITY]: {
      name: 'Perplexity',
      vendor: 'Perplexity AI',
      eyebrow: 'ClawAI と Perplexity の比較',
      intro:
        'Perplexity は 1 つの仕事を軸に作られています。最新のウェブから出典付きで質問に答えることです。ClawAI は別の仕事を軸にしています。いま手元にある作業に適切なモデルを当てること。リサーチもその一部です。',
      theirStrength:
        '検索型の問いに対して最もよく設計された製品です。回答には出典が付き、追加の質問でも文脈が保たれ、インターフェース全体が「その主張はどこから来たか」を確かめるために作られています。',
      ourDifference:
        'ClawAI は回答エンジンではなくワークスペースです。リサーチはモードの 1 つで、モデル比較、永続メモリ、ファイルコンテキスト、コーディングエージェント、ローカルモデルと並びます。そして回答ごとに、生成したモデルが記録されます。',
      chooseRival: '質問の大半が「いま何が正しく、誰がそう言っているか」である場合。',
      chooseClaw:
        'リサーチは作業の一部にすぎず、コード、長文執筆、モデル比較、自社ハードウェアで動くモデルも必要な場合。',
      cells: {
        [ComparisonDimension.MODEL_CHOICE]: '上位プランで複数ベンダーのモデル',
        [ComparisonDimension.ROUTING]: '検索と回答の品質を基準に選択',
        [ComparisonDimension.SIDE_BY_SIDE]: '一度に 1 つの回答',
        [ComparisonDimension.LOCAL_MODELS]: 'クラウドのみ',
        [ComparisonDimension.SELF_HOSTING]: '提供なし',
        [ComparisonDimension.MEMORY_AND_FILES]: 'スペース、スレッド、ファイルアップロード',
        [ComparisonDimension.CONNECTORS]: 'ビジネスプランでのコネクター',
        [ComparisonDimension.RECEIPTS]: 'プラン単位の利用量、回答ごとのコストはなし',
      },
      faq: [
        {
          question: 'ClawAI はウェブを検索しますか。',
          answer:
            'はい。リサーチは多段のウェブ検索を実行し、出典付きの回答を返します。これはワークスペース内の 1 機能であり、製品全体ではありません。',
        },
        {
          question: '出典の扱いはどちらが優れていますか。',
          answer:
            'Perplexity は出典付き回答のために作られており、ほぼすべての主張に出典を示します。ClawAI はリサーチ結果に出典を付けますが、純粋な「探して引用する」問いには専用の回答エンジンのほうが鋭い道具です。',
        },
        {
          question: '両方使えますか。',
          answer:
            '多くの人がそうしています。本当の論点は、専用の回答エンジンが欲しいのか、汎用のマルチモデルワークスペースが欲しいのか、あるいは両方かです。',
        },
      ],
    },
    [ComparisonRival.COPILOT]: {
      name: 'Microsoft Copilot',
      vendor: 'Microsoft',
      eyebrow: 'ClawAI と Microsoft Copilot の比較',
      intro:
        'Copilot は、アシスタントが編み込まれた Microsoft 365 です。ClawAI は独立したワークスペースで、9 つのモデルファミリーに届き、すべてを自社サーバー上で動かせます。',
      theirStrength:
        '組織がすでに持つ Microsoft のデータに、これほど近い位置に座るものは他にありません。Word・Excel・Outlook・Teams のコンテキストが設定なしで届き、ライセンス、テナンシー、コンプライアンスは情報システム部門が既に結んでいる Microsoft 365 契約に従います。',
      ourDifference:
        'ClawAI はベンダー中立で、どこにでも配置できます。1 社の品揃えではなく 9 つのモデルファミリーへルーティングし、回答ごとのコストを示し、オープンウェイトモデルとともに外部通信なしで自社ネットワーク内に導入できます。',
      chooseRival:
        '組織が Microsoft 365 上で動いており、既存文書の内側にアシスタントがあること自体が価値である場合。',
      chooseClaw:
        'プロバイダーを選べること、回答ごとのコストが見えること、あるいは自社インフラから一切出ない導入形態を求める場合。',
      cells: {
        [ComparisonDimension.MODEL_CHOICE]: 'OpenAI のモデルと Microsoft 自社モデル',
        [ComparisonDimension.ROUTING]: '面ごとに Microsoft が選択',
        [ComparisonDimension.SIDE_BY_SIDE]: '一度に 1 つの回答',
        [ComparisonDimension.LOCAL_MODELS]: 'クラウドのみ',
        [ComparisonDimension.SELF_HOSTING]: '提供なし',
        [ComparisonDimension.MEMORY_AND_FILES]: 'Microsoft 365 のファイルと組織コンテキスト',
        [ComparisonDimension.CONNECTORS]: '最も深い Microsoft 365 統合',
        [ComparisonDimension.RECEIPTS]: 'ユーザー単位のライセンス、回答ごとのコストはなし',
      },
      faq: [
        {
          question: 'ClawAI は自社ネットワーク内に導入できますか。',
          answer:
            'はい。スタック全体が自社サーバーで動き、自社 GPU 上のオープンウェイトモデルを使い、外部プロバイダーへの通信は発生しません。オンラインで購入するプランではなく、範囲を定めた個別導入になります。',
        },
        {
          question: 'ClawAI は Microsoft 365 と連携しますか。',
          answer:
            'ClawAI は課題管理、チャット、ドキュメントをカバーする 12 のコネクターを備えます。ベンダー横断では Copilot より広く、Microsoft 自社アプリの内部では浅い作りです。',
        },
        {
          question: '利用料はどのように計算されますか。',
          answer:
            'ユーザー単位ではなく、コスト正規化トークンを日次・月次の割当量に対して計上します。すべての回答にモデル、コスト、消費した割当量が表示されます。',
        },
      ],
    },
  },
};
