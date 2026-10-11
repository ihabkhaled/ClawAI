import { MarketingSceneId } from '@/enums/marketing-scene-id.enum';
import type { MarketingScenesLocaleContent } from '@/types/marketing-scenes.types';

export const ZH_MARKETING_SCENES_CONTENT: MarketingScenesLocaleContent = {
  heading: '在应用中查看',
  scenes: {
    [MarketingSceneId.CHAT_CONVERSATION]: {
      alt: 'ClawAI 中的一段对话，包含一个问题、文字回答、标明回答模型的徽章，以及回答下方的路由详情。',
      caption: '每个回答都会显示由哪个模型撰写以及原因。',
    },
    [MarketingSceneId.CHAT_MODEL_PICKER]: {
      alt: 'ClawAI 的消息输入框，模型选择器已展开，列出了可选择的模型。',
      caption: '自己选择模型，或让 AUTO 来选。',
    },
    [MarketingSceneId.CHAT_RESEARCH]: {
      alt: '已开启网络研究的消息输入框，并显示了搜索提供方的选择项。',
      caption: '开启网络研究，并选择搜索方式。',
    },
    [MarketingSceneId.CHAT_CONTEXT_MENU]: {
      alt: '已展开上下文菜单的消息输入框，可选择你的记忆和上下文包。',
      caption: '把你的记忆和上下文包带入任何对话。',
    },
    [MarketingSceneId.CHAT_SHARE_DIALOG]: {
      alt: '在对话上方打开的“分享此对话”对话框，列出了分享方式的选项。',
      caption: '用链接分享对话，条件由你决定。',
    },
    [MarketingSceneId.COMPARE_SETUP]: {
      alt: '对比页面，已选择三个模型并输入了待发送的提示词。',
      caption: '问一个问题，并排查看三个模型的回答。',
    },
    [MarketingSceneId.LABS_CONSENSUS]: {
      alt: '共识页面：多个模型回答同一个问题，并逐步得出一致的结果。',
      caption: '让多个模型作答，再得到一个共同认可的答案。',
    },
    [MarketingSceneId.FILES]: {
      alt: '文件页面，列出了你上传的文件和 ClawAI 为你生成的文件。',
      caption: '你上传的和生成的文件，集中在一处。',
    },
    [MarketingSceneId.MEMORY]: {
      alt: '记忆页面，显示 ClawAI 记住的关于你的内容，你可以查看和编辑。',
      caption: '查看并掌控 ClawAI 记住的内容。',
    },
    [MarketingSceneId.CONTEXT_PACKS]: {
      alt: '上下文页面，列出了可附加到对话的可复用上下文包。',
      caption: '为重复性工作准备的可复用上下文包。',
    },
    [MarketingSceneId.CONNECTORS]: {
      alt: '连接器页面，列出了可以关联到你的工作区的服务。',
      caption: '连接你的工具，让 AI 能够配合使用。',
    },
    [MarketingSceneId.BILLING_PLANS]: {
      alt: '账单页面，显示可选的套餐以及当前套餐。',
      caption: '套餐清晰明了，你始终知道自己用的是哪一个。',
    },
    [MarketingSceneId.PLAN_OVERVIEW]: {
      alt: '套餐页面，显示你的套餐包含的内容以及已使用的用量。',
      caption: '清楚看到你的套餐包含什么。',
    },
    [MarketingSceneId.USAGE]: {
      alt: '用量页面，用图表展示你随时间消耗的令牌数量。',
      caption: '实时跟踪你的用量。',
    },
    [MarketingSceneId.SETTINGS]: {
      alt: '设置页面，已滚动到带有开关的通知卡片。',
      caption: '选择你要接收的通知。',
    },
    [MarketingSceneId.THREADS_LIST]: {
      alt: 'Threads 页面，列出了你的 Thread 及各自的状态。',
      caption: '你所有的 Thread，以及每一个进行到哪一步。',
    },
    [MarketingSceneId.THREAD_REVIEW]: {
      alt: '在审阅页面中打开的 Thread 草稿，尚未发布。',
      caption: '在任何内容公开之前先审阅草稿。',
    },
    [MarketingSceneId.NOTIFICATIONS_PANEL]: {
      alt: '从铃铛图标打开的通知面板，显示几条最近的通知。',
      caption: '一有结果就第一时间知道。',
    },
    [MarketingSceneId.TOUR_CARD]: {
      alt: '聊天页面上打开的简短产品导览卡片，指向某项功能。',
      caption: '一段简短的导览带你熟悉应用。',
    },
    [MarketingSceneId.DASHBOARD]: {
      alt: 'ClawAI 仪表盘，概览你最近的活动和用量。',
      caption: '工作区一目了然。',
    },
    [MarketingSceneId.OBSERVABILITY_CONSUMPTION]: {
      alt: '管理员的可观测性视图，位于“消耗”标签页，用图表展示模型的使用量。',
      caption: '管理员可以用图表查看消耗情况。',
    },
    [MarketingSceneId.MOBILE_CHAT]: {
      alt: '手机屏幕上的 ClawAI 聊天对话。',
      caption: '同样的对话，在你的手机上。',
    },
    [MarketingSceneId.MOBILE_DASHBOARD]: {
      alt: '手机屏幕上的 ClawAI 仪表盘。',
      caption: '你的仪表盘在小屏幕上同样适配。',
    },
  },
};
