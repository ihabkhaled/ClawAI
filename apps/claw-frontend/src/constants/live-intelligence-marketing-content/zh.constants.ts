import type { LiveIntelligenceMarketingDictionary } from '@/types/live-intelligence-marketing-content.types';

/** Chinese (Simplified) copy for the public Live Intelligence page. Same claims as the English source. */
export const ZH_LIVE_INTELLIGENCE_MARKETING_CONTENT: LiveIntelligenceMarketingDictionary = {
  eyebrow: 'ClawAI 新功能',
  title: 'Live Intelligence：直播的字幕、摘要与精彩片段',
  intro:
    '粘贴直播链接，就能在 ClawAI 里观看。播放期间，ClawAI 会把语音转成你所选语言的字幕，话题变化时更新简短的摘要卡片，并把重要时刻标在时间轴上。关闭窗口后，你看过的内容会保留在历史记录里，之后可以增强和导出。',
  openCta: '打开 Live Intelligence',
  pricingCta: '查看套餐与价格',
  howItWorksCta: '了解使用方式',
  whatTitle: '什么是 Live Intelligence',
  whatParagraphs: [
    '直播很长、很快，或者使用你不懂的语言时，很难跟得上。Live Intelligence 在视频旁边帮你做笔记：翻译成你的语言的字幕、持续更新的摘要和一份精彩片段列表，让你移开视线也不会错过内容。',
    '一切都在 ClawAI 内的窗口里完成，直播和分析在同一个屏幕上。开始前你选择字幕语言和分析模式；在直播允许的范围内，可以暂停、继续和拖动进度。暂停时画面冻结，计费也随之停止。',
    '许多人观看同一场直播，不必为同一份工作重复付费。ClawAI 对同一路直播只处理一次，并把分析结果共享给所有观看者。你实际看过的分析会保存到你的历史记录中，直到你删除为止。',
  ],
  stepsTitle: '五步上手',
  stepsIntro: '从粘贴链接到导出摘要。每一步要么由你完成，要么由 ClawAI 替你完成。',
  steps: [
    {
      title: '粘贴链接',
      body: '打开 Live Intelligence，粘贴直播地址。在分析或计费之前，ClawAI 会先检查该来源是否受支持，不支持时会明确告诉你。',
    },
    {
      title: '选择语言和模式',
      body: '选择字幕与摘要的语言，以及三种分析模式之一：音频、音频 + 视觉或 Smart Auto。开始前，你需要确认自己有权分析这路直播。',
    },
    {
      title: '观看字幕、卡片和精彩片段',
      body: '字幕在说话几秒后出现，大约延迟 7 到 12 秒。摘要卡片随话题变化更新，检测到的精彩片段会放在可点击的时间轴上。',
    },
    {
      title: '暂停、继续和拖动',
      body: '暂停会冻结画面并停止计量。可以从暂停处继续，也可以跳到直播最新位置，中间的间隔会清楚显示。拖动进度在直播本身允许时可用。',
    },
    {
      title: '关闭、回来、增强、导出',
      body: '关闭窗口后，你看过的内容保留在历史记录中。之后可以用你选择的模型增强任意卡片，并把历史记录导出为 PDF、Markdown 或 TXT。',
    },
  ],
  featuresTitle: '你能得到什么',
  features: [
    {
      title: '你所用语言的实时字幕',
      body: '语音会被转写并翻译成所选语言。字幕比说话人晚几秒到达，并非即时，界面上也会这样说明。',
    },
    {
      title: '紧跟节奏的摘要卡片',
      body: '简短的卡片概括直播内容，并在话题变化时更新，所以最新的一张会告诉你直播现在进行到哪里。',
    },
    {
      title: '时间轴上的自动精彩片段',
      body: '值得回看的时刻会被检测出来并标在时间轴上。在直播允许拖动的情况下，点击即可跳转。',
    },
    {
      title: '暂停、继续和拖动',
      body: '来源支持时，可以像操作录像一样控制播放。暂停期间画面冻结，不产生费用。',
    },
    {
      title: '由你掌控的历史记录',
      body: '你看过的分析保存在分页的历史记录中，直到你删除。删除即彻底移除。',
    },
    {
      title: '用你选的模型增强卡片',
      body: '选择任何可用模型来改写或深化一张卡片。增强按所选模型的实际成本计费。',
    },
    {
      title: '导出为 PDF、Markdown 或 TXT',
      body: '按下一步需要的格式，把历史记录带出 ClawAI。',
    },
    {
      title: '共享处理',
      body: '多位观看者，一份分析。同一路直播只处理一次并共享，工作量和成本不会随观众数量成倍增加。',
    },
  ],
  modesTitle: '三种分析模式',
  modesIntro: '模式决定 ClawAI 关注什么。你在开始前选择，费用随选择而定。',
  modes: [
    {
      title: '音频',
      body: '根据所说的内容生成字幕、摘要和精彩片段。最简单的模式，适合演讲、发布会、讲座和访谈。',
    },
    {
      title: '音频 + 视觉',
      body: '加入屏幕上展示的内容，例如幻灯片、图表或演示。ClawAI 会从直播中抽取画面，并保留发生变化的部分。视觉按所用模型的实际成本计费。',
    },
    {
      title: 'Smart Auto',
      body: '从音频开始，只在直播变安静或画面发生变化时才加入视觉，让你在视觉可能有用时才为它付费。',
    },
  ],
  sourcesTitle: '能分析什么，不能分析什么',
  sourcesIntro: '我们宁愿现在就告诉你限制，也不想让你在直播途中才发现。',
  sources: [
    {
      title: 'AI 分析适用于 HLS 直播',
      body: 'Live Intelligence 分析的是你有权分析的 HLS 直播。开始时，你需要确认自己有这项权利。',
    },
    {
      title: 'YouTube 链接可以播放，但不做分析',
      body: '你可以粘贴 YouTube 链接并在 ClawAI 内观看，但 YouTube 直播没有 AI 分析。YouTube 的条款不允许获取其音频或字幕，因此 ClawAI 不会这样做，窗口中也会如实说明。',
    },
    {
      title: '字幕会延迟几秒',
      body: '语音按短片段转写，因此字幕大约在 7 到 12 秒后到达。这不是实时字幕。',
    },
    {
      title: '如实的状态，绝无虚假成功',
      body: '窗口会显示正在连接、延迟、恢复中、免费分钟已用完、等待你确认、已达容量上限或直播已结束等状态。',
    },
  ],
  plansTitle: '免费分钟与价格',
  plansIntro: '每个套餐每月都包含免费分析分钟数。以下为默认值，可以调整。',
  planMinutesUnit: '免费分钟／月',
  planProAndAbove: 'Pro 及以上',
  plansBody:
    '免费分钟用完后，分析每分钟 {price}，并且只在你确认之后才计费。你可以设置消费上限。额度用尽时，会有一次 60 秒的宽限期。视觉按所用模型的实际成本计费，暂停会停止计量。',
  faqTitle: '常见问题',
  faq: [
    {
      question: 'Live Intelligence 能用于 YouTube 直播吗？',
      answer:
        '你可以在 ClawAI 内观看 YouTube 链接，但没有 AI 分析。YouTube 的条款不允许获取其音频或字幕，因此 YouTube 直播没有字幕、摘要或精彩片段。',
    },
    {
      question: '它能分析哪些直播？',
      answer:
        '你有权分析的 HLS 直播。开始时由你确认。服务无法读取的直播会被标记为不支持，而不是悄悄失败。',
    },
    {
      question: '字幕是实时的吗？',
      answer:
        '不是。因为音频按短片段转写，字幕大约在说话后 7 到 12 秒到达。摘要和精彩片段跟在字幕之后。',
    },
    {
      question: '费用是多少？',
      answer:
        '每个套餐每月都含免费分钟：Free 30 分钟，Starter 120 分钟，Plus 300 分钟，Pro 及以上 600 分钟。之后每分钟 0.02 美元，仅在你确认后计费，并可设置消费上限。视觉按模型实际成本计费。',
    },
    {
      question: '直播中途额度用完了会怎样？',
      answer: '你会有一次 60 秒的宽限期，之后分析会停止，直到你充值。',
    },
    {
      question: '暂停会产生费用吗？',
      answer: '不会。暂停时画面冻结，计费也停止。可以从暂停处继续，或回到直播最新位置。',
    },
    {
      question: '我的历史记录会怎样？',
      answer:
        '你实际看过的分析会保存到你删除为止。你可以浏览、用自己选的模型增强卡片，并导出为 PDF、Markdown 或 TXT。',
    },
    {
      question: '我可以向直播提问吗？',
      answer:
        '首个版本不支持。Live Intelligence 提供字幕、摘要卡片和精彩片段；针对直播的提问功能暂未包含。',
    },
  ],
  closingTitle: '不必每分钟都盯着，也能跟上下一场直播',
  closingBody: '粘贴一个你有权分析的 HLS 链接，选择语言，开始吧。你的免费分钟已经备好。',
};
