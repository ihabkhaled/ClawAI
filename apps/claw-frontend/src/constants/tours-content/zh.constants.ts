import { TourId } from '@/enums/tour-id.enum';
import type { TourDictionary } from '@/types/tour.types';

export const ZH_TOURS_CONTENT: TourDictionary = {
  ui: {
    next: '下一步',
    back: '上一步',
    skip: '跳过导览',
    done: '完成',
    stepOf: '第 {current} 步，共 {total} 步',
    dialogLabel: '产品导览',
    launcherLabel: '导览与帮助',
    launcherTitle: '产品导览',
    launcherHint: '简要带你看看这个页面上的内容。',
    launcherHere: '本页',
    launcherDone: '已完成',
    launcherStart: '开始',
    launcherRestart: '重看',
    offerTitle: '第一次来？花 1 分钟看看导览',
    offerStart: '带我看看',
    offerLater: '以后再说',
    offerNever: '不再显示导览',
    launcherNoneHere: '本页暂时没有导览。',
    launcherStopOffers: '不再推荐导览',
    launcherResumeOffers: '重新推荐导览',
    launcherOffersStopped: '导览推荐已关闭。你仍可在这里重看本页的任何导览。',
    missingTarget: '这一部分目前不在屏幕上。请先打开它，再重新开始导览。',
  },
  tours: {
    [TourId.ThreadsIntro]: {
      title: '认识 Threads',
      description: '把聊天变成经过调研、附有来源的公开文章。',
      steps: {
        welcome: {
          title: '一分钟了解 Threads',
          body: 'Thread 是根据你的某次聊天撰写的公开文章：在实时网络上调研，由多个模型撰写，由评审和评论者审阅，只有你批准后才会发布。',
        },
        list: {
          title: '你的 Threads',
          body: '你启动的每个 Thread 都会连同状态显示在这里。打开一个，可以在运行时跟进、审阅草稿、批准、导出或分享。',
        },
        create: {
          title: '创建 Thread',
          body: '选择来源聊天，说明文章主题并选择模型。你也可以从任意聊天通过“转为公开 Thread”开始。',
        },
        process: {
          title: '接下来会发生什么',
          body: 'ClawAI 调研主题，三到五位作者独立写作，就一份草稿达成一致，然后评审和评论者最多审阅三轮。',
        },
        approve: {
          title: '由你决定',
          body: '在你阅读并批准草稿之前，任何内容都不会公开。你可以随时取消发布，你设定的支出上限会限制费用。',
        },
      },
    },
    [TourId.ThreadCreate]: {
      title: '填写 Thread 表单',
      description: '开始前每个字段的作用。',
      steps: {
        topic: {
          title: '主题',
          body: '说明文章要解释或回答什么。清晰的问题会给作者和调研一个清晰的目标。',
        },
        kind: {
          title: '类型与语言',
          body: '选择文章、研究文章、指南或技术讲解，以及公开页面使用的语言。',
        },
        cap: {
          title: '最高支出',
          body: '这个 Thread 最多能花多少。每次模型调用都先与它核对，任务宁可停止也不会超出。',
        },
        models: {
          title: '作者、评审和评论者',
          body: '用与聊天相同的选择器选出三到五位作者、一位评审和一位评论者。不同的提供商会带来更多样的草稿和独立的审阅。',
        },
        consent: {
          title: '你的同意',
          body: '勾选以确认你了解最终文章将公开且可被搜索。勾选之前，开始按钮保持禁用。',
        },
        start: {
          title: '开始生成',
          body: 'ClawAI 启动任务并打开审阅页面，你可以在那里查看每个阶段，并随时取消。',
        },
      },
    },
    [TourId.ThreadReview]: {
      title: '审阅 Thread',
      description: '跟进、阅读、批准、导出、分享。',
      steps: {
        status: {
          title: '实时进度',
          body: '任务运行时，这一行会说明正在发生什么：调研、作者写作、就一份草稿达成一致、评审和评论者。取消会停止任务并退回未使用的额度。',
        },
        draft: {
          title: '草稿及其来源',
          body: '审阅通过后，草稿会连同编号来源一起出现。请仔细阅读：在任何内容公开之前，你可以编辑或要求修改。',
        },
        approve: {
          title: '批准并发布',
          body: '只有获批的草稿才会成为公开页面。取消发布会把它从页面、搜索、站点地图和订阅源中移除。',
        },
        export: {
          title: '下载',
          body: '勾选一种或多种格式，一起下载为一个 ZIP，或通过浏览器的打印窗口保存 PDF。',
        },
        share: {
          title: '分享',
          body: '复制链接，使用设备的分享菜单，或在发布后发到 WhatsApp、Facebook、LinkedIn、X、Telegram、Reddit 或邮件。',
        },
      },
    },
    [TourId.ChatIntro]: {
      title: '聊天导览',
      description: '消息框周围的一切，一分钟看完。',
      steps: {
        input: {
          title: '在这里输入',
          body: '输入消息，按 Enter 发送。Shift+Enter 换行。你也可以粘贴图片和文件。',
        },
        context: {
          title: '上下文',
          body: '添加上下文包，预览模型将看到的内容，并使用你的记忆，让回答立足于你的资料。',
        },
        model: {
          title: '哪个模型回答',
          body: '保持 Auto，ClawAI 会为每条消息选择模型；也可以选择指定的模型。',
        },
        attach: {
          title: '附加文件',
          body: '上传文档、图片、音频或视频。文本会被提取出来，任何模型都能读取。',
        },
        research: { title: '搜索网络', body: '当回答需要最新事实和来源时，打开网络调研。' },
        prompts: {
          title: '提示词库',
          body: '适用于常见任务的可复用提示词。选一个即可填入消息框。',
        },
        send: { title: '发送', body: '发送你的消息。回答会逐步到达，你可以随时停止。' },
        rail: {
          title: '此聊天的工具',
          body: '在多个模型间比较同一提示词，请评审裁决，搜索此聊天，分享，或打开更多操作。',
        },
      },
    },
    [TourId.ChatModels]: {
      title: '如何选择模型',
      description: '自动路由、手动选择，以及徽章的含义。',
      steps: {
        model: {
          title: '打开模型选择器',
          body: '这个按钮显示将回答你下一条消息的模型。打开它，可看到按提供商分组并带搜索框的所有模型。',
        },
        auto: {
          title: 'Auto 或指定模型',
          body: '自动路由会在你的套餐允许的范围内为每条消息选择模型。选择某个模型会把此聊天固定在它上面。',
        },
        badges: {
          title: '额度徽章',
          body: '“使用额度”表示该模型会消耗你的连接器额度或免费请求。已包含的模型从不使用额度。',
        },
        credit: {
          title: '你的额度',
          body: '显示你能花多少。当额度或免费请求用完时，ClawAI 会切换到已包含的模型并告知你。',
        },
      },
    },
    [TourId.ChatResearch]: {
      title: '如何调研',
      description: '获得带实时来源的回答。',
      steps: {
        toggle: {
          title: '打开网络调研',
          body: '发送前打开调研。ClawAI 会搜索网络，阅读最好的页面，并根据找到的内容回答。',
        },
        provider: {
          title: '选择搜索提供商',
          body: '选择使用哪个搜索提供商。Auto 会选一个你可用的。',
        },
        sources: {
          title: '核对来源',
          body: '回答会显示来源，方便你打开并核实说法。长时间的调查请使用调研页面。',
        },
      },
    },
    [TourId.ChatContext]: {
      title: '如何添加上下文',
      description: '让回答立足于你自己的资料。',
      steps: {
        context: {
          title: '上下文按钮',
          body: '打开它可附加上下文包、查看已附加内容，并为此聊天开启或关闭记忆。',
        },
        preview: {
          title: '发送前预览',
          body: '准确查看模型将从你的历史、上下文包、记忆和文件中收到什么，不会有意外内容被带上。',
        },
        packs: {
          title: '创建你自己的包',
          body: '上下文包是可复用的参考资料。在上下文页面创建一个，并附加到任意聊天。',
        },
      },
    },
    [TourId.ChatToThread]: {
      title: '把聊天变成 Thread',
      description: '连同来源发布你学到的东西。',
      steps: {
        more: {
          title: '打开更多操作',
          body: '工具栏末尾的菜单包含导出、转为公开 Thread、Thread 设置和删除。',
        },
        create: {
          title: '选择转为公开 Thread',
          body: '会打开一个以此聊天为来源的表单。检查主题，选择模型，设定支出上限并表示同意。',
        },
        after: {
          title: '跟进并批准',
          body: '你会进入审阅页面。审阅通过后，阅读草稿并批准以发布。',
        },
      },
    },
    [TourId.CompareIntro]: {
      title: 'Compare 导览',
      description: '把一个提示词发给多个模型。',
      steps: {
        prompt: {
          title: '一个提示词，多个模型',
          body: '只需写一次提示词。Compare 会把它发给你选择的每个模型，并并排显示回答。',
        },
        models: {
          title: '选择模型',
          body: '用与聊天相同的选择器最多选五个模型。混合不同提供商，看它们有何不同。',
        },
        judge: {
          title: '评审与评论者',
          body: '请评审给回答排名，请评论者指出薄弱之处，两者都会给出理由。',
        },
      },
    },
    [TourId.ContextPacks]: {
      title: '如何创建上下文',
      description: '构建可复用的参考资料。',
      steps: {
        create: {
          title: '创建一个包',
          body: '给它起个名字，添加笔记、文本或文件。包属于你，不会进入其他人的聊天。',
        },
        use: {
          title: '在任意聊天中使用',
          body: '在聊天中打开上下文按钮并附加该包。之后模型会在看着这些资料的情况下回答。',
        },
      },
    },
    [TourId.ChatList]: {
      title: '你的聊天',
      description: '查找、开始并整理你的对话。',
      steps: {
        new: { title: '开始聊天', body: '开始一段新对话。在手机上请使用底部的圆形按钮。' },
        search: { title: '搜索聊天', body: '输入文字，按标题查找聊天。' },
        tabs: {
          title: '全部、已置顶、已归档',
          body: '置顶的聊天会保留在最上方。归档聊天可整理列表而不删除它。',
        },
        items: { title: '你的对话', body: '打开一个对话即可继续。使用每行的菜单可置顶或归档。' },
      },
    },
    [TourId.ChatMessages]: {
      title: '消息与回答',
      description: '每条消息和每个回答都能做什么。',
      steps: {
        yours: {
          title: '你的消息',
          body: '将鼠标悬停或聚焦在消息上，可复制、编辑，或从这里分出新的聊天分支。',
        },
        meta: {
          title: '哪个模型回答的',
          body: '每个回答都会显示撰写它的模型、选择方式，以及它用到的内容，例如记忆或文件。',
        },
        actions: {
          title: '处理回答',
          body: '可复制、评价、用同一模型或其他模型重新生成、朗读、存入记忆、导出，或放大查看。',
        },
        more: {
          title: '回答背后',
          body: '打开“为什么选这个模型”可查看选择原因；当回答用到研究时，可查看来源面板。选中回答中的任意文字，即可在下一条消息中引用。',
        },
      },
    },
    [TourId.ChatHeader]: {
      title: '聊天标题栏和工具',
      description: '搜索、质量、导出等。',
      steps: {
        more: {
          title: '更多操作',
          body: '可在此聊天中搜索、检查质量、比较模型、分享、导出、转成 Thread，或打开设置。',
        },
        rail: {
          title: '快捷操作',
          body: '最常用的在这里：比较模型、检查质量，以及在此聊天内搜索。',
        },
        keep: {
          title: '保留一份副本',
          body: '导出会把这段对话保存为文件。分支出来的聊天会显示一个返回原聊天的栏。',
        },
      },
    },
    [TourId.ChatShare]: {
      title: '分享聊天',
      description: '安全地发布一个只读链接。',
      steps: {
        open: {
          title: '分享聊天',
          body: '打开“更多操作”并选择“分享”，即可把这段对话的只读副本发布到公开链接。',
        },
        warning: {
          title: '发布前请阅读',
          body: '任何拥有链接的人无需登录即可阅读。副本包含对话当前的样子；之后的消息仍然保持私密。切勿分享机密或个人数据。',
        },
        link: {
          title: '链接与搜索引擎',
          body: '复制公开链接，或在新标签页中打开。只有希望被搜索到时才允许搜索引擎收录；否则只有拿到链接的人才能找到。',
        },
        manage: {
          title: '更新或停止',
          body: '更新共享版本以发布较新的消息；旧链接泄露时生成新链接；或停止分享，立即让链接失效。',
        },
      },
    },
    [TourId.ChatSettings]: {
      title: '会话设置',
      description: '调整单个聊天：模型、提示词和上下文。',
      steps: {
        open: { title: '会话设置', body: '打开“更多操作”并选择“设置”，即可只改变这个聊天的行为。' },
        model: {
          title: '模型与指令',
          body: '为此聊天选择偏好的模型，并撰写系统提示词来设定其角色和语气。',
        },
        tuning: {
          title: '创造力与长度',
          body: '温度让回答更可预测或更多样。最大令牌数限制回答的长度。',
        },
        context: {
          title: '此聊天的上下文',
          body: '附加上下文包，并仅为这段对话开启或关闭记忆、聊天上下文和其他聊天的上下文。',
        },
      },
    },
    [TourId.CompareResults]: {
      title: '阅读比较结果',
      description: '卡片、Judge，以及你能对回答做什么。',
      steps: {
        results: { title: '并排查看', body: '每个模型在自己的卡片中回答，方便你并排阅读。' },
        judge: {
          title: 'Judge 和 Critic',
          body: '开启 Judge 可为回答排序并解释原因。加上 Critic 可质疑 Judge 的选择。',
        },
        actions: {
          title: '使用回答',
          body: '每张卡片上都可以在格式化文本和原始文本之间切换、复制、导出为 Markdown，或放大查看。',
        },
      },
    },
    [TourId.LabsIntro]: {
      title: '编排实验室',
      description: '让一个提示词按固定模式依次经过多个模型。',
      steps: {
        what: {
          title: '实验室做什么',
          body: '每个实验室都会让你的提示词按固定模式经过多个模型：共识、升级、N 选最佳、成本组合、拆解、流水线、修复、角色包或核验。',
        },
        how: {
          title: '如何使用',
          body: '选择模型，写下提示词并发送。可像普通聊天一样附加文件、上下文包和已保存的提示词。结果会以卡片形式显示在下方。',
        },
      },
    },
    [TourId.DashboardIntro]: {
      title: '你的仪表盘',
      description: '快速了解你的工作区。',
      steps: {
        header: { title: '仪表盘', body: '你的总览：你有多少、连接了什么，以及一切是否正常。' },
        stats: { title: '关键数字', body: '聊天总数、已启用的连接器和本地模型一目了然。' },
        actions: { title: '快捷操作', body: '一键开始聊天、添加连接器或设置路由。' },
      },
    },
    [TourId.PlanIntro]: {
      title: '你的套餐',
      description: '你的订阅包含什么。',
      steps: {
        header: { title: '我的套餐', body: '你当前的套餐、其功能以及你可以使用的模型。' },
        quota: { title: '每日令牌额度', body: '你每天的使用额度。' },
        models: { title: '可用模型', body: '你的套餐允许使用的模型。升级可解锁更多。' },
      },
    },
    [TourId.BillingIntro]: {
      title: '账单',
      description: '套餐、价格和付款。',
      steps: {
        header: { title: '账单', body: '管理你的订阅，并查看各套餐的价格。' },
        plans: { title: '选择套餐', body: '比较套餐，并在按月和按年计费之间切换。' },
      },
    },
    [TourId.UsageIntro]: {
      title: '用量',
      description: '查看你用了多少。',
      steps: {
        header: { title: '用量', body: '对照你的套餐，查看每日令牌用量。' },
        card: {
          title: '每日令牌用量',
          body: '进度条显示你已用掉今日额度的多少；如果你的套餐含连接器额度，也会一并显示。',
        },
      },
    },
    [TourId.FilesIntro]: {
      title: '你的文件',
      description: '上传文件，为 AI 提供上下文。',
      steps: {
        header: { title: '文件', body: '你上传的所有内容都在这里，随时可在聊天中用作上下文。' },
        upload: {
          title: '上传文件',
          body: '把文件拖到这里，或点击选择。文件在使用前会先经过扫描。',
        },
      },
    },
    [TourId.SettingsIntro]: {
      title: '设置',
      description: '你的账户和偏好。',
      steps: {
        header: { title: '设置', body: '管理你的个人资料、安全、语言和外观。' },
        language: { title: '语言', body: '选择整个应用的语言。' },
        appearance: { title: '外观', body: '在浅色、深色和跟随系统主题之间切换。' },
        danger: { title: '删除账户', body: '永久删除你的账户，并退出所有会话。此操作无法撤销。' },
      },
    },
    [TourId.MemoryIntro]: {
      title: '记忆',
      description: 'AI 记住了你的哪些信息。',
      steps: {
        header: { title: '记忆', body: '记忆记录为 AI 提供关于你和你工作的长期上下文。' },
        tabs: {
          title: '已保存与建议',
          body: '已保存的记忆会用于你的聊天。建议是 AI 提出、供你审阅的新记忆。',
        },
      },
    },
    [TourId.ConnectorsIntro]: {
      title: '连接器',
      description: '你与 AI 提供商的连接。',
      steps: {
        header: {
          title: '连接器',
          body: '连接器使用你自己的密钥，把 ClawAI 与某个 AI 提供商连接起来。',
        },
        actions: {
          title: '添加连接器',
          body: '创建一个，即可使用该提供商的模型。之后可以测试连接并同步其模型。',
        },
      },
    },
  },
};
