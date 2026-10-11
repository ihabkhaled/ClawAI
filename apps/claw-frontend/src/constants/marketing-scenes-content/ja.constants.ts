import { MarketingSceneId } from '@/enums/marketing-scene-id.enum';
import type { MarketingScenesLocaleContent } from '@/types/marketing-scenes.types';

export const JA_MARKETING_SCENES_CONTENT: MarketingScenesLocaleContent = {
  heading: 'アプリで見る',
  scenes: {
    [MarketingSceneId.CHAT_CONVERSATION]: {
      alt: '質問、文章での回答、回答したモデル名のバッジ、回答の下のルーティング情報が表示されたClawAIのチャット。',
      caption: 'すべての回答に、どのモデルが、なぜ答えたかが表示されます。',
    },
    [MarketingSceneId.CHAT_MODEL_PICKER]: {
      alt: '選べるモデルの一覧を表示したモデル選択を開いた状態のClawAIのメッセージ欄。',
      caption: 'モデルは自分で選ぶことも、AUTOに任せることもできます。',
    },
    [MarketingSceneId.CHAT_RESEARCH]: {
      alt: 'Webリサーチをオンにし、検索プロバイダーの選択が表示されているメッセージ欄。',
      caption: 'Webリサーチをオンにして、検索方法を選べます。',
    },
    [MarketingSceneId.CHAT_CONTEXT_MENU]: {
      alt: 'コンテキストメニューを開き、メモリとコンテキストパックが表示されているメッセージ欄。',
      caption: 'メモリとコンテキストパックをどのチャットにも持ち込めます。',
    },
    [MarketingSceneId.CHAT_SHARE_DIALOG]: {
      alt: '会話の上に開いた「このチャットを共有」ダイアログと、共有方法の選択肢。',
      caption: 'リンクでチャットを、自分の条件で共有できます。',
    },
    [MarketingSceneId.COMPARE_SETUP]: {
      alt: '3つのモデルを選び、送信できる状態でプロンプトを入力した比較ページ。',
      caption: '1つの質問で、3つのモデルの回答を並べて見られます。',
    },
    [MarketingSceneId.LABS_CONSENSUS]: {
      alt: '複数のモデルが同じ質問に答え、1つの合意した結果に近づくコンセンサスのページ。',
      caption: '複数のモデルに答えさせ、合意した1つの答えを得ます。',
    },
    [MarketingSceneId.FILES]: {
      alt: 'アップロードしたファイルと、ClawAIが作成したファイルが一覧で並ぶファイルページ。',
      caption: 'アップロードも生成されたファイルも、1か所に。',
    },
    [MarketingSceneId.MEMORY]: {
      alt: 'ClawAIがあなたについて覚えている内容を表示し、確認や編集ができるメモリページ。',
      caption: 'ClawAIが覚えている内容を確認し、管理できます。',
    },
    [MarketingSceneId.CONTEXT_PACKS]: {
      alt: 'チャットに添付できる再利用可能なコンテキストパックを一覧にしたコンテキストページ。',
      caption: '繰り返す作業のための、再利用できるコンテキストパック。',
    },
    [MarketingSceneId.CONNECTORS]: {
      alt: 'ワークスペースに連携できるサービスを一覧にしたコネクターページ。',
      caption: 'ツールを連携して、AIがそれらを使えるようにします。',
    },
    [MarketingSceneId.BILLING_PLANS]: {
      alt: '利用できるプランと現在のプランを表示した請求ページ。',
      caption: 'わかりやすいプランで、今のプランが常に見えます。',
    },
    [MarketingSceneId.PLAN_OVERVIEW]: {
      alt: 'プランに含まれる内容と、どれだけ使ったかを表示したプランページ。',
      caption: 'プランに何が含まれるかを正確に確認できます。',
    },
    [MarketingSceneId.USAGE]: {
      alt: '時間の経過に伴うトークン使用量をグラフで示した使用状況ページ。',
      caption: '使用状況をリアルタイムで確認できます。',
    },
    [MarketingSceneId.SETTINGS]: {
      alt: '通知カードとそのスイッチまでスクロールした設定ページ。',
      caption: '受け取る通知を選べます。',
    },
    [MarketingSceneId.THREADS_LIST]: {
      alt: 'Threadの一覧と、それぞれの状態を表示したThreadsページ。',
      caption: 'すべてのThreadと、それぞれの進み具合。',
    },
    [MarketingSceneId.THREAD_REVIEW]: {
      alt: '公開前のThreadの下書きを開いたレビューページ。',
      caption: '何かを公開する前に、下書きを確認できます。',
    },
    [MarketingSceneId.NOTIFICATIONS_PANEL]: {
      alt: 'ベルから開いた通知パネルと、最近の通知がいくつか。',
      caption: '準備ができた瞬間にわかります。',
    },
    [MarketingSceneId.TOUR_CARD]: {
      alt: 'チャットページで開いた、機能を指し示す短いプロダクトツアーのカード。',
      caption: '短いツアーがアプリを案内します。',
    },
    [MarketingSceneId.DASHBOARD]: {
      alt: '最近のアクティビティと使用状況の概要を表示したClawAIのダッシュボード。',
      caption: 'ワークスペースをひと目で。',
    },
    [MarketingSceneId.OBSERVABILITY_CONSUMPTION]: {
      alt: 'モデルの使用量をグラフで示す、管理者向けオブザーバビリティの「消費」タブ。',
      caption: '管理者は消費量をグラフで確認できます。',
    },
    [MarketingSceneId.MOBILE_CHAT]: {
      alt: 'スマートフォンの画面に表示されたClawAIのチャットの会話。',
      caption: '同じチャットを、スマートフォンで。',
    },
    [MarketingSceneId.MOBILE_DASHBOARD]: {
      alt: 'スマートフォンの画面に表示されたClawAIのダッシュボード。',
      caption: 'ダッシュボードは小さな画面にも収まります。',
    },
  },
};
