import { LiveMarketingPlatformGroup } from '@/enums/live-marketing-platform-group.enum';
import type {
  LiveIntelligenceMarketingDictionary,
  LiveIntelligenceMarketingSeo,
} from '@/types/live-intelligence-marketing-content.types';

/**
 * The Simplified Chinese copy for the public Live & Video Intelligence pages. Every claim mirrors
 * the English source in `en.constants.ts`; no price or free-minute count is written here.
 */
export const ZH_LIVE_INTELLIGENCE_MARKETING_CONTENT: LiveIntelligenceMarketingDictionary = {
  eyebrow: 'ClawAI 新功能：Live & Video Intelligence',
  title: '任何直播或视频，都能用你的语言看懂',
  intro:
    '粘贴来自 50 个以上平台的直播或录播视频链接。ClawAI 会用实时字幕和不断更新的摘要与精彩片段动态全程跟进，也可以一键把整段视频整理成一份清晰的报告。一切都在 ClawAI 的服务器上运行，因此任何设备都能用，手机也不例外。',
  openCta: '立即粘贴链接',
  signUpCta: '免费创建账户',
  howItWorksCta: '了解使用方法',
  videosTitle: '实际效果',
  videosIntro: '两段来自真实产品的短视频。点击播放即可：默认静音并循环播放，随时随地都能观看。',
  videos: [
    {
      title: '游戏直播旁的 AI 分析面板',
      body: '游戏直播播放的同时，AI 分析面板持续记录屏幕上发生的事情和主播所说的话。',
    },
    {
      title: '阿拉伯语新闻直播，在手机上配英文字幕',
      body: '用手机录下的 YouTube 新闻直播：主持人说阿拉伯语，字幕以英文显示，智能动态则概括了到目前为止的新闻内容。',
    },
  ],
  stepsTitle: '四步上手',
  stepsIntro: '从粘贴链接到得到可保存的笔记，无需安装任何东西。',
  steps: [
    {
      title: '粘贴链接',
      body: '粘贴直播或录播视频的地址：短视频、帖子、Shorts 或往期直播都可以。开始之前，ClawAI 会先确认能否读取该来源。',
    },
    {
      title: '选择语言和模式',
      body: '从应用支持的 13 种语言中选择你想阅读的语言，再选择分析模式：音频、音频 + 视觉或智能自动。',
    },
    {
      title: '边看边分析，或点击“总结视频”',
      body: '跟随字幕和智能动态观看，动态中会出现摘要、精彩片段和画面笔记。如果是录播视频，也可以直接点击“总结视频”，一次拿到完整报告。',
    },
    {
      title: '导出并分享',
      body: '所有内容都会保存在你的历史记录中。可导出为 PDF、Markdown 或 TXT，分享给需要的人。',
    },
  ],
  screenshotsTitle: '在手机上的样子',
  screenshotsIntro: '应用的真实界面，使用深色主题在手机上截取。',
  screenshots: [
    {
      title: '粘贴直播或视频链接',
      body: '一个输入框即可接收任何支持平台的链接。选择语言和模式，然后开始。',
    },
    {
      title: '带字幕、摘要和精彩片段的实时动态',
      body: '字幕比说话者慢几秒出现，智能动态则持续更新摘要、精彩片段和画面笔记。',
    },
    {
      title: '一键视频总结',
      body: '完成后的报告：整体摘要、带时间戳的关键时刻、精彩片段以及完整文字稿。',
    },
  ],
  outcomesTitle: '它能为你做什么',
  outcomes: [
    {
      title: '几分钟看完两小时的直播',
      body: '不用从头拖动进度条，读摘要和关键时刻就够了。每个关键时刻都带时间戳，可以直接跳到重要的部分。',
    },
    {
      title: '用你的语言看懂外语节目',
      body: '日语发布会、西班牙语比赛解说、阿拉伯语新闻：字幕和摘要都以你选择的语言呈现。',
    },
    {
      title: '不错过任何关键时刻',
      body: '精彩片段会随直播进行实时挑出，即使你暂时走开，也能知道刚刚发生了什么。',
    },
    {
      title: '会议、讲座、新闻和游戏的笔记',
      body: '把公开网络研讨会、录播讲座、突发新闻直播或电竞赛事变成可搜索、可保存、可导出的笔记。',
    },
    {
      title: '任何设备都能用',
      body: 'ClawAI 在自己的服务器上读取直播，你无需共享屏幕，因此在手机、平板和电脑上体验完全一样。',
    },
    {
      title: '你的历史记录，你的导出',
      body: '你看过的内容和生成的每一份摘要都保存在历史记录中，随时可导出为 PDF、Markdown 或 TXT。',
    },
  ],
  waysTitle: '两种使用方式',
  waysIntro: '可以实时跟进一场直播，也可以把录播视频交给 ClawAI，一次拿到报告。',
  ways: [
    {
      title: '实时分析：边看边跟',
      body: '字幕在说话后约 7 到 12 秒出现，智能动态持续加入摘要、精彩片段和画面笔记。带有直播聊天的平台还会显示聊天标签页。对于录播视频，ClawAI 会以正常速度从头播放，分析随之同步进行。',
    },
    {
      title: '总结视频：一键完成',
      body: '对于录播视频，ClawAI 会一次性处理整段视频，并返回完整报告：整体摘要、带时间戳的关键时刻、精彩片段以及完整文字稿。报告保存在你的历史记录中，可导出为 PDF、Markdown 或 TXT。',
    },
  ],
  waysTableCaption: '实时分析与一键总结对比',
  waysTableAspect: '你能得到什么',
  waysTableLive: '实时分析',
  waysTableSummary: '总结视频',
  waysRows: [
    {
      label: '适用于',
      live: '直播和录播视频',
      summary: '最长 3 小时的录播视频',
    },
    {
      label: '时效',
      live: '实时跟随视频，字幕延迟约 7 到 12 秒',
      summary: '整段视频一次性处理',
    },
    {
      label: '结果',
      live: '字幕，以及包含摘要、精彩片段和画面笔记的智能动态',
      summary: '整体摘要、带时间戳的关键时刻、精彩片段和完整文字稿',
    },
    {
      label: '直播聊天',
      live: '在有直播聊天的平台上提供聊天标签页',
      summary: '不需要',
    },
    {
      label: '保存',
      live: '保存在历史记录中，可导出为 PDF、Markdown 或 TXT',
      summary: '保存在历史记录中，可导出为 PDF、Markdown 或 TXT',
    },
  ],
  modesTitle: '三种分析模式',
  modesIntro: '模式决定了 ClawAI 关注什么。请在开始前选择。',
  modes: [
    {
      title: '音频',
      body: '根据所说的内容生成字幕、摘要和精彩片段。最适合演讲、访谈、播客、讲座和新闻。',
    },
    {
      title: '音频 + 视觉',
      body: '加入屏幕上显示的内容，例如幻灯片、图表、比分牌或游戏画面，让笔记既记录你听到的，也记录你看到的。',
    },
    {
      title: '智能自动',
      body: '以音频为主，在画面可能变得重要时再查看画面，例如说话者沉默或场景切换的时候。',
    },
  ],
  researchNote:
    '调研：生成摘要时可能会进行一次网页搜索来补充背景，例如说话者是谁，或某个事件指的是什么。',
  languagesTitle: '用你的语言阅读',
  languagesParagraphs: [
    '可从应用支持的 13 种语言中任选其一：英语、阿拉伯语、德语、西班牙语、波斯语、法语、印地语、意大利语、日语、葡萄牙语、俄语、泰语或中文。说话者可以使用任何语言。',
    '如果说话者本来就在说你的语言，你看到的就是他们的原话；如果不是，字幕、摘要和精彩片段会被翻译，并以译文取代原文显示。',
  ],
  platformsTitle: '支持 50 个以上平台',
  platformsBody:
    'YouTube、Twitch、Kick、Facebook、TikTok、Instagram、X (Twitter)、Bilibili、Niconico 等众多平台。直播和录播视频均可使用。',
  platformsCta: '查看所有平台',
  limitsTitle: '使用须知',
  limits: [
    {
      title: '仅限公开视频和直播',
      body: 'ClawAI 只能读取公开的视频和直播。部分平台或个别视频可能会拒绝来自服务器的访问；遇到这种情况，ClawAI 会如实告诉你，而不是假装成功。',
    },
    {
      title: '录播视频最长 3 小时',
      body: '无论是实时分析还是一键总结，录播视频最长都可达 3 小时。',
    },
    {
      title: '字幕会延迟几秒',
      body: '语音按短片段转写，因此字幕会在说话后约 7 到 12 秒出现。这并不是即时字幕。',
    },
    {
      title: '每月免费分钟数，付费分钟需经你同意',
      body: '每个套餐每月都包含免费分钟数。超出部分只有在你同意后才会计费。一键总结按视频时长计算分钟数。',
    },
  ],
  faqTitle: '常见问题',
  faq: [
    {
      question: '手机上能用吗？',
      answer:
        '能。ClawAI 在自己的服务器上读取直播或视频，你无需共享屏幕。手机、平板和电脑都能同样使用。',
    },
    {
      question: '字幕可以用哪些语言阅读？',
      answer:
        '应用支持的 13 种语言均可：英语、阿拉伯语、德语、西班牙语、波斯语、法语、印地语、意大利语、日语、葡萄牙语、俄语、泰语和中文。说话者可以使用任何语言。如果对方本来就说你的语言，你会看到原话；否则会以译文取代原文显示。',
    },
    {
      question: '只支持直播，还是也支持录播视频？',
      answer:
        '两者都支持。可以粘贴直播，也可以粘贴短视频、帖子、Shorts 或往期直播等录播视频。对于录播视频，你可以以正常速度从头边看边分析，也可以点击“总结视频”一次拿到完整报告。',
    },
    {
      question: '视频最长可以多长？',
      answer: '录播视频最长可达 3 小时。',
    },
    {
      question: '一键总结包含哪些内容？',
      answer:
        '整体摘要、带时间戳的关键时刻、精彩片段以及完整文字稿。报告保存在你的历史记录中，可导出为 PDF、Markdown 或 TXT。',
    },
    {
      question: '如何计费？',
      answer:
        '每个套餐每月都包含免费分钟数。超出后按分钟付费，而且只有在你同意后才会收费。一键总结按视频时长计算分钟数。',
    },
    {
      question: '字幕是实时的吗？',
      answer:
        '接近实时。由于音频按短片段转写，字幕会在说话后约 7 到 12 秒出现。摘要和精彩片段紧随字幕之后。',
    },
    {
      question: '支持哪些平台？',
      answer:
        '超过 50 个，包括 YouTube、Twitch、Kick、Facebook、TikTok、Instagram、X (Twitter)、Bilibili 和 Niconico。平台页面列出了全部平台。只能读取公开的视频和直播；Discord 没有公开链接，因此不受支持。',
    },
    {
      question: 'ClawAI 会代表我发帖或聊天吗？',
      answer:
        '不会。ClawAI 只读取直播，绝不会代你在任何平台上发帖、评论或聊天。直播内容及其聊天内容都被视为需要总结的不可信数据，绝不会被当作给 ClawAI 的指令。',
    },
    {
      question: '谁能看到我看过的内容？',
      answer:
        '你的历史记录只属于你。你看过的分析和生成的摘要会一直保留在你的账户中，直到你删除为止；导出或分享什么，由你决定。',
    },
  ],
  closingTitle: '粘贴你的第一个链接',
  closingBody:
    '一场比赛直播、一场发布会、一堂讲座，或是你错过的两小时直播：粘贴链接，选择语言，笔记交给 ClawAI。每个套餐每月都包含免费分钟数。',
  platformsPage: {
    eyebrow: 'ClawAI 新功能：Live & Video Intelligence',
    title: 'Live & Video Intelligence 可读取的全部平台',
    intro:
      '无论直播还是录播，粘贴这些平台中任意一个的链接即可。ClawAI 在自己的服务器上读取，因此任何设备都能用，手机也不例外。',
    openCta: '立即粘贴链接',
    backCta: '返回 Live & Video Intelligence',
    groupsTitle: '按类别浏览平台',
    groupsIntro: '平台名称均为其各自所有者的商标。ClawAI 与这些平台没有任何关联，也未获得其背书。',
    groups: {
      [LiveMarketingPlatformGroup.GLOBAL_VIDEO]: {
        title: '全球视频',
        body: '人们每天都在分享的大型视频网站，从长篇演讲和讲座到短视频和音频节目。',
      },
      [LiveMarketingPlatformGroup.GAMING_STREAMING]: {
        title: '游戏与直播',
        body: '游戏直播、电竞和创作者直播，分析旁边还有直播聊天标签页。',
      },
      [LiveMarketingPlatformGroup.SOCIAL]: {
        title: '社交',
        body: '来自社交网络和消息频道的短视频、帖子、Shorts 和直播。',
      },
      [LiveMarketingPlatformGroup.ASIA]: {
        title: '亚洲',
        body: '来自中国、日本、韩国及亚洲各地的视频和直播平台，可用应用支持的 13 种语言中任意一种阅读。',
      },
    },
    liveTag: '直播',
    videoTag: '视频',
    supportTitle: '所有平台通用的功能',
    supportIntro: '只要 ClawAI 能读取来源，这三项功能在哪里都一样可用。',
    support: [
      {
        title: '直播',
        body: '字幕比说话慢约 7 到 12 秒，智能动态包含摘要、精彩片段和画面笔记；平台有直播聊天时，还会提供聊天标签页。',
      },
      {
        title: '录播视频',
        body: '最长 3 小时的短视频、帖子、Shorts 和往期直播。ClawAI 以正常速度从头播放视频，分析随之同步进行。',
      },
      {
        title: '一键总结',
        body: '对于录播视频，点击“总结视频”，即可获得整体摘要、带时间戳的关键时刻、精彩片段以及完整文字稿。',
      },
    ],
    limitsTitle: '坦诚说明限制',
    limits: [
      {
        title: '仅限公开内容',
        body: '只能读取公开的视频和直播。私密或仅限会员的内容无法读取。',
      },
      {
        title: '平台可能拒绝访问',
        body: '部分平台或个别视频可能会拒绝来自服务器的访问。遇到这种情况，ClawAI 会如实告诉你，而不是展示虚假的结果。',
      },
      {
        title: '不支持 Discord',
        body: 'Discord 直播没有公开链接，服务器无从打开。',
      },
    ],
    faqTitle: '关于平台的问题',
    faq: [
      {
        question: '我用的平台支持吗？',
        answer:
          '只要在本页列出，粘贴链接即可，ClawAI 会在开始前先检查。如果平台或视频拒绝服务器访问，你会立刻看到提示。',
      },
      {
        question: '直播和录播视频都支持吗？',
        answer: '支持，所列的每个平台都可以。录播视频还可以一键总结，最长 3 小时。',
      },
      {
        question: '平台在列表中，为什么某个视频还是会失败？',
        answer:
          '平台可能会阻止服务器读取某个视频，即使它是公开的。遇到这种情况，ClawAI 会立刻告诉你。私密视频和直播永远无法读取。',
      },
      {
        question: '为什么没有 Discord？',
        answer: 'Discord 直播没有可供服务器打开的公开链接，因此 ClawAI 无法读取。',
      },
    ],
    closingTitle: '找到你的平台了吗？',
    closingBody: '粘贴链接，选择语言，即可开始。每个套餐每月都包含免费分钟数。',
  },
};

/** Simplified Chinese SEO copy for both pages; claims mirror the English file. */
export const ZH_LIVE_INTELLIGENCE_MARKETING_SEO: LiveIntelligenceMarketingSeo = {
  overview: {
    title: 'Live & Video Intelligence：直播实时字幕与一键视频总结',
    description:
      '粘贴来自 YouTube、Twitch、TikTok 等 50 个以上平台的直播或视频链接，即可获得你所用语言的实时字幕、包含摘要和精彩片段的智能动态，或带时间戳的一键视频总结。手机、平板、电脑等任何设备均可使用，无需安装。',
    keywords: ['直播实时字幕', 'AI 视频总结', 'YouTube 视频总结', '直播字幕翻译', '直播精彩片段'],
  },
  platforms: {
    title: 'Live & Video Intelligence 支持的平台',
    description:
      'ClawAI 可读取并提供实时字幕和视频总结的全部平台，按类别列出：YouTube、Twitch、Kick、Facebook、TikTok、Instagram、X、Bilibili、Niconico 等，直播与录播视频均可使用。',
    keywords: ['支持的视频平台', '直播平台字幕', 'B站视频总结', 'Twitch 字幕翻译'],
  },
};
