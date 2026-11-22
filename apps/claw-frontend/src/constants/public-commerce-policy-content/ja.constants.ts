import { PUBLIC_CONTACT_EMAIL } from '@/constants/public-contact.constants';
import { PublicLaunchPageSlug } from '@/enums/public-launch-page-slug.enum';
import type { PublicCommercePolicyLocaleContent } from '@/types/public-launch-content.types';

export const JA_PUBLIC_COMMERCE_POLICY_CONTENT: PublicCommercePolicyLocaleContent = {
  pages: {
    [PublicLaunchPageSlug.DELIVERY_SHIPPING]: {
      eyebrow: '提供・配送ポリシー',
      sections: [
        {
          id: 'digital-service',
          title: 'ClawAI はデジタルサービスです',
          body: 'ClawAI は、ウェブブラウザや対応アプリで利用するオンラインのソフトウェアサービスです。物理的な商品はありません。梱包、郵送、発送されるものは一切なく、配送先住所をお伺いすることもありません。プランに含まれるすべての内容は、そのプランを購入したアカウントに対してインターネット経由で提供されます。',
        },
        {
          id: 'instant-access',
          title: 'オンラインですぐに利用できます',
          body: '無料アカウントは登録が完了した時点ですぐに利用できます。有料プランを購入した場合は、支払いが確認され次第（通常は即時に）アカウントへ適用され、そのままサインインしてすぐに使い始められます。この即時のアカウント有効化のほかに、待ち時間や配送スケジュールはありません。',
        },
        {
          id: 'no-fees',
          title: '送料や配送料はかかりません',
          body: '物理的に送るものがないため、ClawAI が送料、手数料、関税、配送料を加算することは一切ありません。プランの価格は、お支払い画面に表示される金額です。製品内で作成した文書や画像などのファイルは、ご自身のアカウントからダウンロードするもので、郵送されることはありません。',
        },
        {
          id: 'access-problems',
          title: '支払った内容を利用できない場合',
          body: `支払いが完了したのにプランがアカウントに表示されない場合や、サインインできない場合は、アカウントのメールアドレスと、お手元にあれば支払いの参照番号を添えて ${PUBLIC_CONTACT_EMAIL} までご連絡ください。支払いとアカウントを確認し、お支払いいただいた内容を利用できるよう対応します。`,
        },
      ],
      evidence:
        'ClawAI はエジプトのカイロからオンラインで運営されています。サブスクリプションの提供とは、購入対象のアカウントを有効化することを意味し、ホスト型の決済画面では支払い前に適用される価格が表示されます。',
    },
    [PublicLaunchPageSlug.REFUND_CANCELLATION]: {
      eyebrow: '返金・解約ポリシー',
      sections: [
        {
          id: 'cancel',
          title: 'アカウントからいつでも解約できます',
          body: '有料サブスクリプションは、アカウントの請求設定からいつでも解約できます。解約するとサブスクリプションの自動更新が止まるため、次の請求期間の料金は請求されません。解約のために誰かへメールを送ったり、理由を伝えたりする必要はありません。',
        },
        {
          id: 'access-after-cancel',
          title: '支払済み期間の終了まで利用できます',
          body: '解約後も、すでに支払った期間の終了日までプランは有効です。1か月の場合も、より長い期間の場合も同じです。有料機能はその日まで引き続き利用でき、その後サブスクリプションは更新されて再度請求されることなく終了します。',
        },
        {
          id: 'refunds',
          title: '返金が行われる場合',
          body: '現在の支払済み期間と、すでに利用した期間の料金は返金されません。サービスへのアクセスがすでに提供されているためです。返金は、二重請求や誤った請求など当社の請求の誤りがあった場合、またはお客様に適用される法律で求められる場合に限り行います。支払いが全額返金された場合、その支払いで購入した有料アクセスは終了します。',
        },
        {
          id: 'trial-and-requests',
          title: '無料トライアルと返金の申請方法',
          body: `90 日間の無料トライアルには支払いカードが不要なため、ClawAI をお試しいただく間に料金が発生することはなく、返金の対象もありません。請求の誤りの報告や返金の申請は、アカウントのメールアドレス、請求の日付と金額、お手元にあれば支払いの参照番号を添えて ${PUBLIC_CONTACT_EMAIL} までメールでお送りください。`,
        },
      ],
      evidence:
        'このポリシーは利用規約とあわせて適用されます。利用規約では、支払い条件は決済時の表示と適用される法律に従うと定めています。適用される価格と請求間隔は、お支払い前にホスト型の決済画面に表示されます。',
    },
  },
  labels: {
    onThisPage: 'このページの内容',
    evidence: '確認可能な注記',
    lastReviewed: '最終確認日',
    effectiveDate: '発効日',
    startFree: '無料アカウントを作成',
    contactTeam: 'チームに問い合わせる',
    companyDetailsTitle: '会社情報',
    emailLabel: 'メール',
    phoneLabel: '電話',
    addressLabel: '所在地',
    addressNote:
      'ClawAI はオンラインサービスです。来訪者向けのオフィスはありませんので、メールでお問い合わせください。',
  },
  seo: {
    [PublicLaunchPageSlug.DELIVERY_SHIPPING]: {
      title: '提供・配送ポリシー',
      description:
        'ClawAI はデジタルサービスです。登録または支払いが確認されると、すぐにオンラインで利用を開始できます。物品の発送や配送先住所の入力はなく、送料や配送料も一切かかりません。',
      keywords: ['提供ポリシー', '配送ポリシー', 'デジタルサービスの利用開始'],
    },
    [PublicLaunchPageSlug.REFUND_CANCELLATION]: {
      title: '返金・解約ポリシー',
      description:
        'ClawAI のサブスクリプションは、アカウントの請求設定からいつでも解約できます。支払済み期間の終了まで利用でき、返金は請求の誤りがある場合または法律で求められる場合に限ります。',
      keywords: ['返金ポリシー', '解約ポリシー', 'サブスクリプションの解約'],
    },
  },
};
