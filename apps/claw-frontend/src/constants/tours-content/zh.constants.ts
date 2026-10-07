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
    launcherMore: '更多导览',
    launcherDone: '已完成',
    launcherStart: '开始',
    launcherRestart: '重看',
    offerTitle: '第一次来？花 1 分钟看看导览',
    offerStart: '带我看看',
    offerLater: '以后再说',
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
  },
};
