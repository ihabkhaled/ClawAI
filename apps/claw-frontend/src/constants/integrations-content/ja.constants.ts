import { IntegrationTopic } from '@/enums/integration-topic.enum';
import type { IntegrationsDictionary } from '@/types/integrations.types';

export const JA_INTEGRATIONS_CONTENT: IntegrationsDictionary = {
  labels: {
    onThisPage: 'このページの内容',
    faqTitle: 'よくある質問',
    relatedTitle: '次に読むべきもの',
    lastReviewed: '最終確認日',
    backToHub: 'すべての連携',
    ctaTitle: '実際につないで確かめる',
    ctaBody:
      'すべてのコネクタは、どの有料プランでも利用できます。ワークスペースの設定から接続してください。',
    startFree: '無料プランで始める',
    seeFeatures: 'ClawAIの機能を見る',
    capabilitiesHeading: 'このコネクタでできること',
    readLabel: 'ClawAIが読み取れるもの',
    writeLabel: 'ClawAIが書き込めるもの',
    syncLabel: '同期',
    realTimeLabel: 'リアルタイムで更新',
    pollBasedLabel: 'リアルタイムではなく、スケジュールに沿って同期',
  },
  hub: {
    seo: {
      title: '連携機能：ClawAIを普段使うツールとつなぐ',
      description:
        'ClawAIはGitHub、Slack、Jira、Google Drive、Gmailなど、14種類のワークスペースツールと連携できます。会話の中からあなたの作業内容を読み取り、話すだけでなく実際に行動を起こせるようになります。',
      keywords: ['ClawAI連携機能', 'AIワークスペース連携', 'AIツール統合'],
    },
    eyebrow: '連携機能',
    title: '普段使うツールとClawAIをつなぐ',
    summary:
      '以下の各コネクタはロードマップ上の予定ではなく、実際に使える機能です。何を読み取れるか、何を書き込めるか、リアルタイムで更新されるかスケジュールに沿って同期されるか——すべて製品自体が参照しているのと同じレジストリから取得しています。',
    topicsHeading: 'コネクタを選ぶ',
    cardSummaries: {
      [IntegrationTopic.GITHUB]:
        'リポジトリ、Issue、プルリクエスト——読み取り、コメント、レビュー、承認まで。',
      [IntegrationTopic.GITLAB]:
        'プロジェクト、マージリクエスト、Issue——コメント、承認、変更提案まで。',
      [IntegrationTopic.BITBUCKET]: 'リポジトリとプルリクエスト——コメント、承認、Issueの起票まで。',
      [IntegrationTopic.SLACK]:
        'チャンネルとメッセージ——文脈を読み取り、メッセージの送信・返信まで。',
      [IntegrationTopic.JIRA]: 'Issueとプロジェクト——チケットの作成、更新、コメントまで。',
      [IntegrationTopic.CONFLUENCE]:
        'ページとスペース——ドキュメントの読み取り、ページの作成・編集まで。',
      [IntegrationTopic.CLICKUP]: 'タスク、スペース、フォルダ——タスクの作成、更新、コメントまで。',
      [IntegrationTopic.FIGMA]:
        'ファイルとコメント——デザインの読み取り、コメント投稿、Jiraへの引き継ぎまで。',
      [IntegrationTopic.GOOGLE_DRIVE]:
        'ファイルとフォルダ——ドキュメントやスプレッドシートの読み取り、アップロード、移動まで。',
      [IntegrationTopic.GMAIL]:
        'スレッドとメッセージ——メールの読み取り、送信、返信、下書き作成まで。',
      [IntegrationTopic.MICROSOFT_SHAREPOINT]:
        'サイト、ドキュメント、リスト——ドキュメントの読み取り・アップロード、リスト項目の管理まで。',
      [IntegrationTopic.MICROSOFT_ONEDRIVE]:
        'ファイルとフォルダ——読み取り、アップロード、移動まで。',
      [IntegrationTopic.GOOGLE_CALENDAR]: '会議と予定——カレンダーの読み取り、イベントの作成まで。',
      [IntegrationTopic.OUTLOOK_CALENDAR]: '会議と予定——カレンダーの読み取り、イベントの作成まで。',
    },
  },
  topics: {
    [IntegrationTopic.GITHUB]: {
      seo: {
        title: 'AI GitHub連携 — ClawAI',
        description:
          'GitHubをClawAIに接続すると、リポジトリやIssue、プルリクエストを読み取れるようになります。会話の中からプルリクエストの説明文を作成し、コメントを残し、変更を提案し、レビューを承認することもできます。',
        keywords: ['GitHub AI連携', 'AIによるコードレビュー GitHub', 'GitHubリポジトリ チャット'],
      },
      eyebrow: 'コードホスティング',
      title: 'GitHub',
      summary:
        'GitHubのアカウントまたは組織を接続すると、ClawAIがリポジトリやIssue、プルリクエストを読み取り、それらに対して行動できるようになります——説明文の下書き作成、コメントの投稿、変更の提案、レビューの承認まで、すべて会話の中から行えます。',
      sections: [
        {
          id: 'what-it-covers',
          heading: '連携がカバーする範囲',
          paragraphs: [
            '接続すると、ClawAIはリポジトリの内容、Issue、プルリクエスト、コメントを読み取れるようになります。リアルタイム更新に対応しており、Webhookによって変更があるとポーリングを待たずにClawAIへ通知されます。また差分同期に対応しているため、大きなリポジトリを毎回最初から読み直す必要はありません。',
            '書き込み側では、ClawAIはIssueの作成、Issueへのコメント、プルリクエストの説明文の下書き作成、プルリクエストへのコメント、具体的なコード変更の提案、プルリクエストの承認を行えます。すべての書き込みはあなたが確認できる明示的な操作として実行され、裏で黙って行われることはありません。',
          ],
        },
        {
          id: 'how-it-fits-coding-agent',
          heading: 'コーディングエージェントとの関係',
          paragraphs: [
            'GitHubコネクタとコーディングエージェントは、関連はしていますが異なる課題を解決します。コーディングエージェントはチェックアウトされたリポジトリに対してエディタの中で動作します。GitHubコネクタは、誰もローカルにリポジトリを開いていなくても、GitHub上でホストされているデータ——Issue、プルリクエスト、レビューコメント——に対してClawAIの会話の中から動作します。',
            'よくある使い分けは、チャットからIssueのトリアージやPRの説明文の下書き作成にコネクタを使い、実際にコードを書いて実行する段階になったらコーディングエージェントを使うというものです。',
          ],
        },
        {
          id: 'authentication',
          heading: '接続方法',
          paragraphs: [
            'GitHubはOAuth（既定の方法——GitHubでサインインし、スコープを絞ったアクセスを許可します）に対応しているほか、トークンを好むアカウントや自動化のためにパーソナルアクセストークンにも対応しています。GitHub Enterpriseについては、github.comの代わりに自社インスタンスのAPI URLをコネクタに指定することでサポートされます。',
          ],
        },
      ],
      faq: [
        {
          question: 'ClawAIは自動的にプルリクエストへコメントしてくれますか？',
          answer:
            'あなたが依頼したときにコメントを残せます——差分をレビューしてフィードバックを投稿したり、納得すれば承認したりします。依頼なしに勝手にコメントすることはなく、すべての書き込みはあなたが要求した操作です。',
        },
        {
          question: 'プライベートリポジトリでも使えますか？',
          answer:
            'はい、接続時に許可したアクセス範囲の範囲内で使えます。ClawAIは接続したアカウントまたはトークンが見られる範囲しか見ることができません。',
        },
        {
          question: 'これはコーディングエージェントの代わりになりますか？',
          answer:
            'いいえ——両者は異なる領域をカバーします。コネクタはチャットからGitHub上のIssueやプルリクエストにアクセスし、コーディングエージェントはエディタ内のチェックアウト済みコードに対して動作します。',
        },
      ],
      productNote:
        'GitHubコネクタはClawAIにある{connectorCount}個のワークスペースコネクタのひとつであり、実行される書き込み操作はすべてあなたが依頼したものです。',
    },
    [IntegrationTopic.GITLAB]: {
      seo: {
        title: 'AI GitLab連携 — ClawAI',
        description:
          'GitLabをClawAIに接続すると、プロジェクトやマージリクエスト、Issueを読み取れるようになります。会話の中からコメントを残し、変更を提案し、説明文を更新し、マージリクエストを承認することもできます。',
        keywords: ['GitLab AI連携', 'マージリクエスト AIレビュー', 'GitLab AIアシスタント'],
      },
      eyebrow: 'コードホスティング',
      title: 'GitLab',
      summary:
        'GitLabのアカウントまたはセルフマネージド環境を接続すると、ClawAIがプロジェクトやマージリクエスト、Issueを読み取り、会話の中からそれらに対して行動できるようになります——コメント、変更の提案、説明文の更新、承認まで行えます。',
      sections: [
        {
          id: 'what-it-covers',
          heading: '連携がカバーする範囲',
          paragraphs: [
            'ClawAIはプロジェクト、Issue、マージリクエスト、コメントを読み取れ、Webhookによるリアルタイム更新にも対応しています。同期は差分同期ではなく実行のたびに全件を読み直す方式で、これは小規模なプロジェクトよりも非常に大規模なプロジェクトで影響してきます。',
            '書き込み側では、マージリクエストへのコメント、承認、説明文の更新、具体的なコード変更の提案、画像へのインラインコメントの追加、Issueの作成、Issueへのコメントが行えます。いずれもあなたが要求した明示的な操作です。',
          ],
        },
        {
          id: 'self-managed',
          heading: 'セルフマネージドGitLab',
          paragraphs: [
            'このコネクタはgitlab.comに限定されません。セットアップ時に自社インスタンスのURLを指定することで、ホスティングされたサービスに接続するのと同じ方法でセルフマネージドのGitLabにClawAIを接続できます。',
          ],
        },
        {
          id: 'authentication',
          heading: '接続方法',
          paragraphs: [
            'GitLabはOAuthまたはパーソナルアクセストークンに対応しています。どちらも接続時に許可した範囲にスコープされ、ClawAIがトークンやOAuthの許可範囲より広いアクセス権を持つことはありません。',
          ],
        },
      ],
      faq: [
        {
          question: 'セルフマネージドのGitLabでも使えますか？',
          answer:
            'はい——接続時にインスタンスのURLを設定すれば、ClawAIはgitlab.comではなく自社のGitLabインストールと通信します。',
        },
        {
          question: 'コメントだけでなく、実際のコード変更を提案できますか？',
          answer:
            'はい、変更提案アクションを通じて可能です。これは単なるテキストコメントではなく、マージリクエスト上に具体的で適用可能な差分の提案を投稿します。',
        },
        {
          question: 'マージリクエストの同期はリアルタイムで行われますか？',
          answer:
            'はい——コネクタはWebhookに対応しているため、ClawAIはポーリングするのではなく変更があった際に通知を受け取ります。',
        },
      ],
      productNote:
        'GitLabはClawAIにある{connectorCount}個のワークスペースコネクタのひとつで、それぞれの読み取り・書き込み機能は各連携ページに記載されています。',
    },
    [IntegrationTopic.BITBUCKET]: {
      seo: {
        title: 'AI Bitbucket連携 — ClawAI',
        description:
          'Bitbucket CloudをClawAIに接続すると、リポジトリとプルリクエストを読み取れるようになります。会話の中からコメントを残し、プルリクエストを承認し、新しいIssueを起票することもできます。',
        keywords: ['Bitbucket AI連携', 'Bitbucket AIアシスタント', 'AIコードリポジトリ検索'],
      },
      eyebrow: 'コードホスティング',
      title: 'Bitbucket',
      summary:
        'Bitbucket Cloudのアカウントを接続すると、ClawAIがリポジトリとプルリクエストを読み取り、会話の中からそれらに対して行動できるようになります——コメント、承認、Issueの起票まで行えます。',
      sections: [
        {
          id: 'what-it-covers',
          heading: '連携がカバーする範囲',
          paragraphs: [
            'ClawAIはリポジトリとプルリクエストを読み取れ、リアルタイムのWebhook更新にも対応しています。同期は増分的な差分同期ではなく、実行のたびに全件を読み直す方式です。',
            '書き込み側では、プルリクエストへのコメント、プルリクエストの承認、Issueの作成が行えます。いずれもClawAIが自発的に行うものではなく、明示的な操作です。',
          ],
        },
        {
          id: 'authentication',
          heading: '接続方法',
          paragraphs: [
            'BitbucketはOAuthを通じて接続します——Atlassianアカウントでサインインし、選んだワークスペースとリポジトリに対するスコープ付きアクセスを許可します。',
          ],
        },
      ],
      faq: [
        {
          question: 'Bitbucket ServerやData Centerには対応していますか？',
          answer:
            'このコネクタが対象とするのはBitbucket Cloudです。セルフホストのBitbucket ServerやData Centerには現在対応していません。',
        },
        {
          question: '代わりにプルリクエストを承認してもらえますか？',
          answer:
            '差分をレビューした後にあなたが依頼すれば可能です——承認は自動的なステップではなく、あなたが要求する明示的な操作です。',
        },
      ],
      productNote:
        'BitbucketはClawAIにある{connectorCount}個のワークスペースコネクタのひとつです。',
    },
    [IntegrationTopic.SLACK]: {
      seo: {
        title: 'AI Slack連携 — ClawAI',
        description:
          'SlackをClawAIに接続すると、チャンネルやメッセージを横断して検索できるようになります。会話の中からメッセージを送信したり返信したりできるので、チームが話し合っている内容にそのまま対応できます。',
        keywords: ['Slack AIアシスタント', 'Slackメッセージ AI検索', 'Slack AI連携'],
      },
      eyebrow: 'コミュニケーション',
      title: 'Slack',
      summary:
        'Slackワークスペースを接続すると、ClawAIがチャンネル、メッセージ、ユーザーを読み取り、あなたに代わってメッセージの送信や返信ができるようになります——散らばったスレッドを検索して回る作業が、一度尋ねるだけの質問になります。',
      sections: [
        {
          id: 'what-it-covers',
          heading: '連携がカバーする範囲',
          paragraphs: [
            'ClawAIはメッセージ、チャンネル、ユーザーを読み取れ、SlackのイベントWebhookによるリアルタイム更新にも対応しています——新しいメッセージは次のポーリングを待つことなく、届いた時点で見えるようになります。',
            '書き込み側では、チャンネルへのメッセージ送信とスレッド内での返信が行えます。どちらもあなたの明示的な依頼が必要で、ClawAIが依頼なしにSlackへ投稿することはありません。',
          ],
        },
        {
          id: 'what-it-is-good-for',
          heading: 'こんな場面で役立つ',
          paragraphs: [
            '三週間前のスレッドに埋もれた決定事項を見つけ出したり、会議の前にチャンネルの議論を要約したり、複数のメッセージの文脈を踏まえた返信を下書きしたりする場面です。こうした検索は、キーワードには一致しても意味は捉えられないSlackの検索ボックスがうまく扱えない領域です。',
          ],
        },
      ],
      faq: [
        {
          question: 'ClawAIはプライベートチャンネルを読み取れますか？',
          answer:
            '接続したアカウントがメンバーとして参加し、接続時にアクセスを許可したチャンネルに限られます。ClawAIが接続ユーザー以上にワークスペースを見ることはありません。',
        },
        {
          question: '私が頼んでいないのにSlackへ投稿することはありますか？',
          answer:
            'ありません。メッセージの送信や返信は、常に会話の中であなたが明示的に依頼する操作です。',
        },
      ],
      productNote:
        'SlackはClawAIにある{connectorCount}個のワークスペースコネクタのひとつで、Webhookによるリアルタイム更新に対応しています。',
    },
    [IntegrationTopic.JIRA]: {
      seo: {
        title: 'AI Jira連携 — ClawAI',
        description:
          'JiraをClawAIに接続すると、Issueやプロジェクトを読み取れるようになります。会話の中からチケットを作成・更新し、コメントを残せるほか、Figmaのコメントをそのままチケットに変換することもできます。',
        keywords: ['Jira AIアシスタント', 'Jiraチケット AI活用', 'Jira AI連携'],
      },
      eyebrow: 'プロジェクト管理',
      title: 'Jira',
      summary:
        'AtlassianのJiraサイトを接続すると、ClawAIがIssue、チケット、プロジェクト、コメントを読み取り、それらに対して行動できるようになります——チケットの作成や更新、コメントの投稿に加え、Figmaのデザインコメントをそのままユーザーストーリーやチケットに変換することもできます。',
      sections: [
        {
          id: 'what-it-covers',
          heading: '連携がカバーする範囲',
          paragraphs: [
            'ClawAIはIssue、チケット、プロジェクト、コメントを読み取れ、Webhookによるリアルタイム更新にも対応しています。',
            '書き込み側では、チケットの作成、Figmaのコメントからのチケットの直接作成、Figmaファイルからのユーザーストーリーの下書き作成、Issueの更新、チケットへのコメントが行えます。中でもFigma連携によるアクションが最も特徴的で、何も手で入力し直すことなく、デザインレビューと実際に追跡されるタスクとの間をつなぎます。',
          ],
        },
        {
          id: 'authentication',
          heading: '接続方法',
          paragraphs: [
            'Jiraは、あなたのJiraサイトのURLに加えて、OAuthまたはAPIトークンによるベーシック認証に対応しています。ベーシック認証は、対話的なOAuthフローを経るべきではないサービスアカウントや自動化に適しています。',
          ],
        },
      ],
      faq: [
        {
          question: 'Figmaのコメントから自動的にJiraチケットを作成できますか？',
          answer:
            'あなたが依頼すれば可能です——このアクションはFigmaのコメントを読み取り、対応するJiraチケットまたはユーザーストーリーの下書きを一度の操作で作成します。二つのツールの間で情報を手で転記する必要はありません。',
        },
        {
          question: 'Jira Serverでも動きますか、それともJira Cloudだけですか？',
          answer:
            'このコネクタが対象とするのはAtlassianのクラウド版Jira REST APIです。セルフホストのJira Serverインスタンスには現在対応していません。',
        },
      ],
      productNote:
        'JiraはClawAIにある{connectorCount}個のワークスペースコネクタのひとつで、デザインからチケットへの受け渡しではFigmaコネクタと直接組み合わせて使えます。',
    },
    [IntegrationTopic.CONFLUENCE]: {
      seo: {
        title: 'AI Confluence連携 — ClawAI',
        description:
          'ConfluenceをClawAIに接続すると、ページやスペース、コメントを読み取れるようになります。会話の中から新しいページを作成したり既存のページを編集したりできるので、ドキュメント作業もひとつの会話で済みます。',
        keywords: ['Confluence AIアシスタント', 'Confluence AI連携', 'AIドキュメント検索'],
      },
      eyebrow: 'ドキュメント',
      title: 'Confluence',
      summary:
        'AtlassianのConfluenceサイトを接続すると、ClawAIがページ、スペース、コメントを読み取り、ページを直接作成・編集できるようになります——ドキュメントの検索が質問に、ドキュメントの更新が依頼になります。',
      sections: [
        {
          id: 'what-it-covers',
          heading: '連携がカバーする範囲',
          paragraphs: [
            'ClawAIはページ、コメント、それらを整理するプロジェクト（スペース）を読み取れます。このコネクタはWebhookによるリアルタイム更新には対応しておらず、同期はプッシュ通知ではなくリクエストに応じて行われるため、少し前に編集されたページが次の同期まで反映されないことがあります。',
            '書き込み側では、ページの作成と既存ページの編集が行えます。どちらも明示的な操作です。',
          ],
        },
      ],
      faq: [
        {
          question: 'Confluenceの同期はリアルタイムで行われますか？',
          answer:
            'いいえ——GitHubやSlackと異なり、ConfluenceはClawAIへ更新をプッシュしません。コンテンツは変更された瞬間ではなく、リクエストされたときに同期されます。',
        },
        {
          question: '読むだけでなく、代わりにドキュメントを書いてもらえますか？',
          answer:
            'はい——ページの作成と編集はいずれも対応している書き込み操作で、それぞれあなたが明示的に依頼する形で行われます。',
        },
      ],
      productNote:
        'ConfluenceはClawAIにある{connectorCount}個のワークスペースコネクタのひとつです。',
    },
    [IntegrationTopic.FIGMA]: {
      seo: {
        title: 'AI Figma連携 — ClawAI',
        description:
          'FigmaをClawAIに接続すると、ファイルとコメントを読み取れるようになります。会話の中から新しいコメントを投稿でき、Jiraと組み合わせればデザインへのコメントをそのままチケットやユーザーストーリーに変換できます。',
        keywords: ['Figma AIアシスタント', 'Figma AI連携', 'Figma Jira自動化'],
      },
      eyebrow: 'デザイン',
      title: 'Figma',
      summary:
        'Figmaアカウントを接続すると、ClawAIがファイルとコメントを読み取り、自分自身のコメントを投稿できるようになります——さらにJiraコネクタと組み合わせれば、デザインへのコメントを追跡可能なチケットやユーザーストーリーの下書きに直接変換できます。',
      sections: [
        {
          id: 'what-it-covers',
          heading: '連携がカバーする範囲',
          paragraphs: [
            'ClawAIはFigmaのファイルとそのコメントを読み取れ、Webhookによるリアルタイム更新にも対応しています。書き込み側では、ファイルにコメントを投稿できます。',
            'ClawAIにおけるFigmaの主な強みは、Jiraと組み合わせたときに生まれます。デザインへのコメントは、誰も文脈を手で入力し直すことなく、Jiraチケットやユーザーストーリーの下書きになります——具体的なアクションについてはJira連携のページを参照してください。',
          ],
        },
      ],
      faq: [
        {
          question: 'ClawAIはコメントだけでなく、実際のデザインを読み取れますか？',
          answer:
            'Figma APIを通じてファイルの内容とコメントを読み取れます。視覚的なデザインについて有意義に要約できる内容はファイルによって異なり、コメントと構造が最も信頼できる情報源です。',
        },
        {
          question: 'Figmaからチケットへのワークフローには、Jiraコネクタも必要ですか？',
          answer:
            'はい——Figmaからチケットへのアクションは Jira コネクタ側にあり、両方の接続が有効になっている必要があります。',
        },
      ],
      productNote:
        'FigmaはClawAIにある{connectorCount}個のワークスペースコネクタのひとつで、Jiraと組み合わせたときに最も役立ちます。',
    },
    [IntegrationTopic.CLICKUP]: {
      seo: {
        title: 'AI ClickUp連携 — ClawAI',
        description:
          'ClickUpをClawAIに接続すると、タスクやスペース、フォルダを読み取れるようになります。会話の中から新しいタスクを作成し、既存のタスクを更新し、コメントを残すこともできます。',
        keywords: ['ClickUp AIアシスタント', 'ClickUp AI連携', 'AIタスク管理'],
      },
      eyebrow: 'プロジェクト管理',
      title: 'ClickUp',
      summary:
        'ClickUpワークスペースを接続すると、ClawAIがタスク、スペース、フォルダを読み取り、会話の中から直接タスクの作成、更新、コメントができるようになります。',
      sections: [
        {
          id: 'what-it-covers',
          heading: '連携がカバーする範囲',
          paragraphs: [
            'ClawAIはタスク、スペース、フォルダ、コメントを読み取れます。このコネクタは現在Webhookによるリアルタイム更新には対応していません——配信されるWebhookが本物であると検証できないため、同期はプッシュ通知ではなくリクエストに応じて行われます。',
            '書き込み側では、タスクの作成、タスクの更新、タスクへのコメントが行えます。',
          ],
        },
      ],
      faq: [
        {
          question: 'ClickUpはリアルタイムで更新されますか？',
          answer:
            'いいえ——同期はライブのプッシュ通知ではなく、リクエストされたときに行われます。これはConfluenceやGoogle Driveと同じ扱いだと考えてください。最新の同期時点の状態であり、常時リアルタイムではありません。',
        },
        {
          question: 'タスクのステータスを変更できますか？',
          answer:
            'タスクの更新は既存タスクのステータスやフィールドの変更をカバーしますが、更新できるフィールドの具体的な範囲はあなたのClickUpワークスペースの設定によって異なります。',
        },
      ],
      productNote:
        'ClickUpはClawAIにある{connectorCount}個のワークスペースコネクタのひとつです。同期はリアルタイムではなく、スケジュールに沿って行われます。',
    },
    [IntegrationTopic.GOOGLE_DRIVE]: {
      seo: {
        title: 'AI Google Drive連携 — ClawAI',
        description:
          'Google DriveをClawAIに接続すると、ドキュメントやスプレッドシートを読み取れるようになります。会話の中からファイルをアップロードしたりフォルダ間で移動したりでき、変更部分だけを同期する差分同期にも対応しています。',
        keywords: ['Google Drive AIアシスタント', 'AIドキュメント検索', 'Google Drive AI連携'],
      },
      eyebrow: 'ファイル',
      title: 'Google Drive',
      summary:
        'Google Driveアカウントを接続すると、ClawAIがファイル、ドキュメント、スプレッドシートを読み取り、ファイルのアップロードや移動ができるようになります——差分同期に対応しているため、大きなDriveを再同期するたびにすべてを読み直す必要はありません。',
      sections: [
        {
          id: 'what-it-covers',
          heading: '連携がカバーする範囲',
          paragraphs: [
            'ClawAIはファイル、ドキュメント、スプレッドシートを読み取れます。このコネクタは差分同期に対応しており、最初の全件読み込みの後は、実際に変更があったものだけを取得します。これはDriveに数千ものファイルがある場合に効いてきます。現在Webhookによるリアルタイム更新には対応しておらず、同期はリクエストに応じて行われます。',
            '書き込み側では、ファイルのアップロードと、フォルダ間でのファイルの移動が行えます。',
          ],
        },
      ],
      faq: [
        {
          question: 'Driveを接続すると、ClawAIはその中身すべてにアクセスできるようになりますか？',
          answer:
            'OAuth時に接続したGoogleアカウントが許可した範囲に限られます。通常は、組織全体への付与ではなく、そのアカウントが既に開けるファイルにスコープされます。',
        },
        {
          question: '大きなDriveを再同期するたびに時間がかかりますか？',
          answer:
            '最初の同期では必要なものを読み込みますが、差分同期によって以降の同期は変更点だけを取得するため、最初の同期が終わってしまえばDriveが大きくなっても遅くなることはありません。',
        },
      ],
      productNote:
        'Google DriveはClawAIにある{connectorCount}個のワークスペースコネクタのひとつで、大規模なライブラリにも差分同期で対応します。',
    },
    [IntegrationTopic.GMAIL]: {
      seo: {
        title: 'AI Gmail連携 — ClawAI',
        description:
          'GmailをClawAIに接続すると、メールのスレッドやメッセージを読み取れるようになります。会話の中から新しいメールを送信したり、返信したり、送信前に確認できる下書きを作成したりすることもできます。',
        keywords: ['Gmail AIアシスタント', 'AIメール連携', 'Gmail AI連携'],
      },
      eyebrow: 'メール',
      title: 'Gmail',
      summary:
        'Gmailアカウントを接続すると、ClawAIがスレッド、メッセージ、ラベルを読み取り、会話の中から直接メールの送信、返信、下書き作成ができるようになります——差分同期に対応しているため、確認のたびに受信トレイ全体を読み直すことはありません。',
      sections: [
        {
          id: 'what-it-covers',
          heading: '連携がカバーする範囲',
          paragraphs: [
            'ClawAIはメールのスレッド、メッセージ、ラベルを差分同期で読み取れます。新着メールに対するリアルタイムのプッシュ通知には現在対応しておらず、同期はリクエストに応じて行われます。',
            '書き込み側では、新しいメールの送信、既存スレッドへの返信、送信せずに下書きを作成することが行えます。ClawAIに返信を用意させ、送信前に自分で確認したい場合に下書き作成は役立ちます。',
          ],
        },
      ],
      faq: [
        {
          question: '私が承認していないのに、ClawAIがメールを送信することはありますか？',
          answer:
            'ありません。送信は明示的な操作であり、下書き作成アクションは、何かを送信する前にあなたが確認したい場合のために存在しています。',
        },
        {
          question: '受信トレイを常時チェックしていますか？',
          answer:
            'ライブのプッシュ接続ではなくリクエストに応じて同期するため、新着メールは最新の同期時点で見えるようになりますが、即座にではありません。',
        },
      ],
      productNote: 'GmailはClawAIにある{connectorCount}個のワークスペースコネクタのひとつです。',
    },
    [IntegrationTopic.MICROSOFT_SHAREPOINT]: {
      seo: {
        title: 'AI SharePoint連携 — ClawAI',
        description:
          'Microsoft SharePointをClawAIに接続すると、ドキュメントやサイトのリストを読み取れるようになります。会話の中からドキュメントをアップロードしたり、リスト項目を作成・更新したりすることもできます。',
        keywords: [
          'SharePoint AIアシスタント',
          'SharePoint AI連携',
          'Microsoft AIドキュメント検索',
        ],
      },
      eyebrow: 'ファイル',
      title: 'Microsoft SharePoint',
      summary:
        'Microsoft SharePointサイトを接続すると、ClawAIがドキュメント、ファイル、サイトのリストを読み取り、会話の中から直接ドキュメントのアップロードやリスト項目の管理ができるようになります。',
      sections: [
        {
          id: 'what-it-covers',
          heading: '連携がカバーする範囲',
          paragraphs: [
            'ClawAIはドキュメント、ファイル、SharePointサイトを整理するリストを読み取れます。同期はライブのプッシュ接続ではなく、リクエストに応じて行われます。',
            '書き込み側では、ドキュメントのアップロード、リスト項目の作成、既存のリスト項目の更新が行えます。',
          ],
        },
        {
          id: 'authentication',
          heading: '接続方法',
          paragraphs: [
            'SharePointはテナントスコープのサービスであるため、OAuthに加えてMicrosoftテナントIDが必要です。これにより、コネクタがどの組織のSharePointに接続すべきかを把握できます。',
          ],
        },
      ],
      faq: [
        {
          question: 'Microsoft 365のテナントIDは必要ですか？',
          answer:
            'はい——SharePointはテナントにスコープされているため、コネクタがどの組織のSharePointに接続すべきかを知るためにテナントIDが必要です。',
        },
        {
          question: 'コンテンツはリアルタイムで更新されますか？',
          answer: 'いいえ——同期はライブのプッシュ通知ではなく、リクエストに応じて行われます。',
        },
      ],
      productNote:
        'SharePointはClawAIにある{connectorCount}個のワークスペースコネクタのひとつです。',
    },
    [IntegrationTopic.MICROSOFT_ONEDRIVE]: {
      seo: {
        title: 'AI OneDrive連携 — ClawAI',
        description:
          'Microsoft OneDriveをClawAIに接続すると、ファイルやドキュメントを読み取れるようになります。会話の中からファイルをアップロードしたりフォルダ間で移動したりでき、変更部分だけを同期する差分同期にも対応しています。',
        keywords: ['OneDrive AIアシスタント', 'OneDrive AI連携', 'Microsoft AIファイル検索'],
      },
      eyebrow: 'ファイル',
      title: 'Microsoft OneDrive',
      summary:
        'Microsoft OneDriveアカウントを接続すると、ClawAIがファイルとドキュメントを読み取り、会話の中から直接ファイルのアップロードや移動ができるようになります——大規模なライブラリにも差分同期で対応します。',
      sections: [
        {
          id: 'what-it-covers',
          heading: '連携がカバーする範囲',
          paragraphs: [
            'ClawAIはファイルとドキュメントを差分同期で読み取れます。最初の全件読み込みの後は、以降の同期で変更があったものだけを取得します。リアルタイムのプッシュ通知には現在対応しておらず、同期はリクエストに応じて行われます。',
            '書き込み側では、ファイルのアップロードと、フォルダ間でのファイルの移動が行えます。',
          ],
        },
        {
          id: 'authentication',
          heading: '接続方法',
          paragraphs: [
            'OneDriveは、SharePointと同様にOAuthに加えてMicrosoftテナントIDが必要です。',
          ],
        },
      ],
      faq: [
        {
          question: 'Microsoft 365のテナントIDは必要ですか？',
          answer:
            'はい、SharePointと同じ理由からです——ビジネス版OneDriveはテナントにスコープされています。',
        },
        {
          question: '大きなOneDriveだと同期に時間がかかりますか？',
          answer:
            '最初の同期にコストがかかりますが、差分同期によって以降の同期では実際に変更があったものだけを取得します。',
        },
      ],
      productNote:
        'OneDriveはClawAIにある{connectorCount}個のワークスペースコネクタのひとつで、大規模なライブラリにも差分同期で対応します。',
    },
    [IntegrationTopic.GOOGLE_CALENDAR]: {
      seo: {
        title: 'AI Google Calendar連携 — ClawAI',
        description:
          'Google CalendarをClawAIに接続すると、予定やイベントを読み取れるようになります。会話の中から新しいカレンダーイベントを作成できますが、書き込み側の操作は今のところこの一つに限られています。',
        keywords: [
          'Google Calendar AIアシスタント',
          'Google Calendar AI連携',
          'AIスケジュール管理',
        ],
      },
      eyebrow: 'カレンダー',
      title: 'Google Calendar',
      summary:
        'Google Calendarを接続すると、ClawAIが予定やイベントを読み取り、会話の中から直接新しいカレンダーイベントを作成できるようになります。差分同期に対応しているため、スケジュールの確認も高速なままです。',
      sections: [
        {
          id: 'what-it-covers',
          heading: '連携がカバーする範囲',
          paragraphs: [
            'ClawAIは予定やイベントを差分同期で読み取れます。リアルタイムのプッシュ通知には現在対応していません。',
            '書き込み側では、このコネクタは現在カレンダーイベントの作成という一つのアクションのみに対応しています。既存の招待の日程変更、削除、返信はまだ対応していない書き込み操作です。対応状況が変われば、このページを更新します。',
          ],
        },
      ],
      faq: [
        {
          question: 'ClawAIは既存の会議の日程を変更してくれますか？',
          answer:
            'まだできません——このコネクタは現在、新しいイベントの作成には対応していますが、既存のイベントの編集や日程変更には対応していません。',
        },
        {
          question:
            'アクセス権を持っている他のカレンダーも含め、カレンダー全体を見ることができますか？',
          answer:
            'アクセス範囲は接続時にあなたが許可した範囲にスコープされており、明示的に拡張しない限り、通常はメインのカレンダーのみが対象です。',
        },
      ],
      productNote:
        'Google CalendarはClawAIにある{connectorCount}個のワークスペースコネクタのひとつです。その書き込み操作は、現在イベントの作成に限定されています。',
    },
    [IntegrationTopic.OUTLOOK_CALENDAR]: {
      seo: {
        title: 'AI Outlook Calendar連携 — ClawAI',
        description:
          'Outlook CalendarをClawAIに接続すると、予定やイベントを読み取れるようになります。会話の中から新しいカレンダーイベントを作成できますが、書き込み側の操作は今のところこの一つに限られています。',
        keywords: [
          'Outlook Calendar AIアシスタント',
          'Outlook AI連携',
          'Microsoft AIスケジュール管理',
        ],
      },
      eyebrow: 'カレンダー',
      title: 'Outlook Calendar',
      summary:
        'Microsoft Outlook Calendarを接続すると、ClawAIが予定やイベントを読み取り、会話の中から直接新しいカレンダーイベントを作成できるようになります。',
      sections: [
        {
          id: 'what-it-covers',
          heading: '連携がカバーする範囲',
          paragraphs: [
            'ClawAIは予定やイベントを読み取れます。このコネクタは現在、差分同期にもリアルタイムのプッシュ通知にも対応しておらず、各同期はリクエストに応じて必要な内容を読み込みます。',
            '書き込み側では、このコネクタは現在カレンダーイベントの作成という一つのアクションのみに対応しています。既存の招待の日程変更、削除、返信にはまだ対応していません。',
          ],
        },
        {
          id: 'authentication',
          heading: '接続方法',
          paragraphs: [
            'Outlook Calendarは、テナントIDを任意指定できるOAuthに対応しています——空欄のままにすればMicrosoftのマルチテナントエンドポイントが使われ、特定の組織向けに設定することもできます。',
          ],
        },
      ],
      faq: [
        {
          question: 'ClawAIは既存の会議の日程を変更してくれますか？',
          answer: 'まだできません——現在対応しているのは新しいイベントの作成のみです。',
        },
        {
          question: 'テナントIDの設定は必要ですか？',
          answer:
            'コネクタを特定のMicrosoft組織にスコープしたい場合のみ必要です。空欄のままにするとマルチテナントエンドポイントが使われ、ほとんどの個人アカウントや組織アカウントで機能します。',
        },
      ],
      productNote:
        'Outlook CalendarはClawAIにある{connectorCount}個のワークスペースコネクタのひとつです。その書き込み操作は、現在イベントの作成に限定されています。',
    },
  },
};
