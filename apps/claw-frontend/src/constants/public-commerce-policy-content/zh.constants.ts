import { PUBLIC_CONTACT_EMAIL } from '@/constants/public-contact.constants';
import { PublicLaunchPageSlug } from '@/enums/public-launch-page-slug.enum';
import type { PublicCommercePolicyLocaleContent } from '@/types/public-launch-content.types';

export const ZH_PUBLIC_COMMERCE_POLICY_CONTENT: PublicCommercePolicyLocaleContent = {
  pages: {
    [PublicLaunchPageSlug.DELIVERY_SHIPPING]: {
      eyebrow: '交付与配送政策',
      sections: [
        {
          id: 'digital-service',
          title: 'ClawAI 是一项数字服务',
          body: 'ClawAI 是一项在线软件服务，可在网页浏览器和受支持的应用中使用。它没有任何实体商品：不会打包、邮寄或发货，也不会收集任何收货地址。套餐所包含的全部内容，都会通过互联网交付给购买该套餐的账户，您无需等待任何实物送达。',
        },
        {
          id: 'instant-access',
          title: '在线访问，即时开通',
          body: '注册完成后，免费账户即可立即使用。购买付费套餐后，一旦付款得到确认（通常是即时的），套餐就会应用到您的账户上，您可以马上登录并开始使用。除了这一即时的账户开通之外，没有任何等待期，也没有任何配送时间安排。',
        },
        {
          id: 'no-fees',
          title: '不收取运费或配送费',
          body: '由于不寄送任何实物，ClawAI 从不额外收取运费、手续费、关税或配送费。套餐的价格就是结账时显示的金额。您在产品中创建的文件，例如文档或图片，都从您自己的账户中下载，不会通过邮寄方式发送给您。',
        },
        {
          id: 'access-problems',
          title: '如果您无法使用已付费的内容',
          body: `如果付款已经成功，但套餐没有出现在您的账户中，或者您无法登录，请发送电子邮件至 ${PUBLIC_CONTACT_EMAIL}，并注明账户的电子邮件地址以及付款参考号（如有）。我们会核查付款和账户情况，并解决您对已付费内容的访问问题。`,
        },
      ],
      evidence:
        'ClawAI 由埃及开罗在线运营。订阅的交付即为所购账户的开通；托管结账页面会在您付款前显示当前生效的价格。',
    },
    [PublicLaunchPageSlug.REFUND_CANCELLATION]: {
      eyebrow: '退款与取消政策',
      sections: [
        {
          id: 'cancel',
          title: '随时在账户中取消',
          body: '您可以随时在账户的账单设置中取消付费订阅。取消后订阅将停止续订，因此不会向您收取下一个计费周期的费用。取消订阅时，您无需给任何人发送邮件，也无需说明任何理由，整个过程完全由您自己在账户中完成。',
        },
        {
          id: 'access-after-cancel',
          title: '访问权限持续到已付费周期结束',
          body: '取消后，套餐会一直保持有效，直到您已付费周期结束为止，无论该周期是一个月还是更长的期限。在此日期之前，您的付费功能仍可正常使用；到期后订阅将直接结束，而不会自动续订并再次向您收费。',
        },
        {
          id: 'refunds',
          title: '何时提供退款',
          body: '当前已付费的周期以及任何已使用的周期均不予退款，因为服务的访问权限已经提供给您。只有在我们出现账单错误（例如重复扣款或扣款金额有误），或适用于您的法律要求退款时，才会提供退款。当一笔付款被全额退款时，该付款所购买的付费访问权限也将随之终止。',
        },
        {
          id: 'trial-and-requests',
          title: '免费试用及如何申请退款',
          body: `为期 90 天的免费试用无需绑定支付卡，因此在您试用 ClawAI 期间不会产生任何费用，也不存在需要退款的款项。如需报告账单错误或申请退款，请发送电子邮件至 ${PUBLIC_CONTACT_EMAIL}，并注明账户的电子邮件地址、扣款日期和金额，以及付款参考号（如有）。`,
        },
      ],
      evidence:
        '本政策与使用条款共同适用；根据使用条款，付款条件以结账页面的披露内容和适用法律为准。当前生效的价格和计费周期会在您付款前显示在托管结账页面上。',
    },
  },
  labels: {
    onThisPage: '本页内容',
    evidence: '可核实的说明',
    lastReviewed: '最近审核',
    effectiveDate: '生效日期',
    startFree: '创建免费账户',
    contactTeam: '联系团队',
    companyDetailsTitle: '公司信息',
    emailLabel: '电子邮件',
    phoneLabel: '电话',
    addressLabel: '地址',
    addressNote: 'ClawAI 是一项在线服务，没有对外接待访客的办公室，请通过电子邮件联系我们。',
  },
  seo: {
    [PublicLaunchPageSlug.DELIVERY_SHIPPING]: {
      title: '交付与配送政策',
      description:
        'ClawAI 是一项数字服务：注册或付款一经确认，即可在线立即开始使用全部已开通的功能。我们不寄送任何实物，不需要填写收货地址，也不收取任何运费、手续费或配送费用。套餐价格即结账时显示的金额。',
      keywords: ['交付政策', '配送政策', '数字服务开通'],
    },
    [PublicLaunchPageSlug.REFUND_CANCELLATION]: {
      title: '退款与取消政策',
      description:
        '您可以随时在账户的账单设置中取消 ClawAI 订阅，取消后不会再自动续订。访问权限会持续到已付费周期结束；仅在出现重复扣款等账单错误或法律要求时才会退款，申请请发送电子邮件。',
      keywords: ['退款政策', '取消政策', '取消订阅'],
    },
  },
};
