import { IntegrationTopic } from '@/enums/integration-topic.enum';
import type { IntegrationsDictionary } from '@/types/integrations.types';

export const ZH_INTEGRATIONS_CONTENT: IntegrationsDictionary = {
  labels: {
    onThisPage: '本页内容',
    faqTitle: '大家常问的问题',
    relatedTitle: '接下来可以看看',
    lastReviewed: '最近核实',
    backToHub: '全部集成',
    ctaTitle: '连接它，亲自看看效果',
    ctaBody: '每一款连接器都包含在所有付费方案中，在工作区设置里即可完成连接。',
    startFree: '从免费方案开始',
    seeFeatures: '看看 ClawAI 能做什么',
    capabilitiesHeading: '这款连接器能做什么',
    readLabel: 'ClawAI 可以读取',
    writeLabel: 'ClawAI 可以写入',
    syncLabel: '同步方式',
    realTimeLabel: '实时更新',
    pollBasedLabel: '按计划同步，非实时',
  },
  hub: {
    seo: {
      title: '集成：把 ClawAI 连接到你的工具',
      description:
        'ClawAI 目前已经连接了 14 款常用工作工具——包括 GitHub、Slack、Jira、Google Drive、Gmail 等等——让同一段对话既能读取你手头正在处理的工作内容，又能直接替你把动作执行出来，而不只是纸上谈兵地聊聊而已。',
      keywords: ['ClawAI 集成', 'AI 工作区连接器', 'AI 工具集成'],
    },
    eyebrow: '集成',
    title: '把 ClawAI 连接到你已经在用的工具',
    summary:
      '下面列出的每一款连接器都是已经上线的真实功能，不是路线图上的画饼——它能读取什么、能写入什么、是实时更新还是按计划同步，全部数据都直接来自产品本身运行所依赖的同一份连接器注册表。',
    topicsHeading: '选一款连接器',
    cardSummaries: {
      [IntegrationTopic.GITHUB]: '仓库、议题、拉取请求——读取、评论、审查、批准。',
      [IntegrationTopic.GITLAB]: '项目、合并请求、议题——评论、批准、提出修改建议。',
      [IntegrationTopic.BITBUCKET]: '仓库和拉取请求——评论、批准、创建议题。',
      [IntegrationTopic.SLACK]: '频道和消息——读取上下文，发送和回复消息。',
      [IntegrationTopic.JIRA]: '议题和项目——创建工单、更新工单、发表评论。',
      [IntegrationTopic.CONFLUENCE]: '页面和空间——读取文档，创建和编辑页面。',
      [IntegrationTopic.CLICKUP]: '任务、空间、文件夹——创建、更新任务并发表评论。',
      [IntegrationTopic.FIGMA]: '文件和评论——读取设计，发表评论，并转交给 Jira。',
      [IntegrationTopic.GOOGLE_DRIVE]: '文件和文件夹——读取文档和电子表格，上传和移动文件。',
      [IntegrationTopic.GMAIL]: '邮件会话和消息——读取邮件，发送、回复并生成草稿。',
      [IntegrationTopic.MICROSOFT_SHAREPOINT]: '站点、文档、列表——读取和上传文档，管理列表条目。',
      [IntegrationTopic.MICROSOFT_ONEDRIVE]: '文件和文件夹——读取、上传并移动文件。',
      [IntegrationTopic.GOOGLE_CALENDAR]: '会议和日程——读取日历，创建日程事件。',
      [IntegrationTopic.OUTLOOK_CALENDAR]: '会议和日程——读取日历，创建日程事件。',
    },
  },
  topics: {
    [IntegrationTopic.GITHUB]: {
      seo: {
        title: 'AI GitHub 集成 — ClawAI',
        description:
          '把 GitHub 连接到 ClawAI，就能在对话里直接读取仓库内容、议题和拉取请求，还可以起草 PR 描述、发表评论、给出具体的代码修改建议，并完成审批通过，全程都不用离开聊天窗口。',
        keywords: ['AI GitHub 集成', 'AI 代码审查 GitHub', '对话式操作 GitHub 仓库'],
      },
      eyebrow: '代码托管',
      title: 'GitHub',
      summary:
        '连接一个 GitHub 账号或组织，ClawAI 就能读取你的仓库、议题和拉取请求内容，并直接对它们采取行动——在对话内部起草描述、留下评论、提出修改建议、完成审查批准。',
      sections: [
        {
          id: 'what-it-covers',
          heading: '连接器覆盖的范围',
          paragraphs: [
            '连接完成后，ClawAI 可以读取仓库内容、议题、拉取请求和评论。它支持实时更新——通过 webhook 在有变化时主动通知 ClawAI，而不用等待下一次轮询——并且采用增量同步，重新读取一个大型仓库不必每次都从头读起。',
            '在写入方面，ClawAI 可以创建议题、对议题发表评论、起草拉取请求描述、对拉取请求发表评论、提出具体的代码修改建议，以及批准拉取请求。每一次写入都是你明确要求、并且可以审查的动作，不会在后台悄悄发生。',
          ],
        },
        {
          id: 'how-it-fits-coding-agent',
          heading: '它和 Coding Agent 是什么关系',
          paragraphs: [
            'GitHub 连接器和 Coding Agent 解决的是相关但不同的问题。Coding Agent 在你的编辑器里，针对本地检出的仓库工作；GitHub 连接器则在 ClawAI 对话内部，直接面向 GitHub 托管的数据——议题、拉取请求和审查评论——运作，不需要任何人在本地打开这个仓库。',
            '一种常见的用法是：用连接器在聊天里分诊议题、起草 PR 描述，而真正需要动手写代码、运行代码时，再切换到 Coding Agent。',
          ],
        },
        {
          id: 'authentication',
          heading: '如何完成连接',
          paragraphs: [
            'GitHub 支持 OAuth 授权（默认方式——用 GitHub 账号登录，授予有限范围的访问权限），也支持使用个人访问令牌，适合更倾向于用令牌的账号或自动化场景。只需把连接器指向你自己实例的 API 地址，而不是 github.com，就能支持 GitHub Enterprise。',
          ],
        },
      ],
      faq: [
        {
          question: 'ClawAI 会自动给我的拉取请求写评论吗？',
          answer:
            '只有在你要求的时候，它才会留下评论——查看代码差异并给出反馈，或者在确认没问题后完成批准。它不会未经提示就自行发表评论；每一次写入都是你主动请求的动作。',
        },
        {
          question: '它支持私有仓库吗？',
          answer:
            '支持，前提是你在连接时授予了相应的访问权限。ClawAI 只能看到所连接账号或令牌本身能看到的内容。',
        },
        {
          question: '它能取代 Coding Agent 吗？',
          answer:
            '不能——两者面向的场景不同。连接器是从聊天里访问 GitHub 托管的议题和拉取请求；Coding Agent 则是在你的编辑器里，直接处理本地检出的代码。',
        },
      ],
      productNote:
        'GitHub 连接器是 ClawAI {connectorCount} 款工作区连接器之一，它执行的每一次写入操作，都是你明确要求的。',
    },
    [IntegrationTopic.GITLAB]: {
      seo: {
        title: 'AI GitLab 集成 — ClawAI',
        description:
          '把 GitLab 连接到 ClawAI，即可在对话中读取项目、合并请求和议题的内容，还能发表评论、提出具体的代码修改建议、更新合并请求描述，并直接完成审批，一切都通过聊天就能完成。',
        keywords: ['AI GitLab 集成', 'AI 合并请求审查', 'GitLab AI 助手'],
      },
      eyebrow: '代码托管',
      title: 'GitLab',
      summary:
        '连接一个 GitLab 账号或自建实例，ClawAI 就能读取你的项目、合并请求和议题内容，并直接在对话里对它们采取行动——发表评论、提出修改建议、更新描述，以及完成批准。',
      sections: [
        {
          id: 'what-it-covers',
          heading: '连接器覆盖的范围',
          paragraphs: [
            'ClawAI 可以读取项目、议题、合并请求和评论内容，并通过 webhook 实现实时更新。同步方式是每次全量重新读取，而不是增量同步——这一点对超大型项目的影响，会比对小项目明显得多。',
            '在写入方面：对合并请求发表评论、完成批准、更新其描述、提出具体的代码修改建议、在图片上添加行内评论、创建议题，以及对议题发表评论。每一项都是你明确请求的动作。',
          ],
        },
        {
          id: 'self-managed',
          heading: '自建 GitLab',
          paragraphs: [
            '连接器并不局限于 gitlab.com——在设置时把它指向你自己实例的地址，ClawAI 连接自建 GitLab 的方式，和连接官方托管服务完全一样。',
          ],
        },
        {
          id: 'authentication',
          heading: '如何完成连接',
          paragraphs: [
            'GitLab 支持 OAuth 授权，也支持个人访问令牌。两种方式的访问范围都取决于你在连接时授予的权限——ClawAI 拥有的访问权限，绝不会超出令牌或 OAuth 授权本身允许的范围。',
          ],
        },
      ],
      faq: [
        {
          question: '它支持自建 GitLab 吗？',
          answer:
            '支持——在连接时填写你的实例地址，ClawAI 就会对接你自己部署的 GitLab，而不是 gitlab.com。',
        },
        {
          question: '它能给出具体的代码修改建议，而不只是发评论吗？',
          answer:
            '可以，通过「建议修改」这个动作，它会在合并请求上发布一个具体、可以直接应用的差异修改建议，而不只是一段纯文本评论。',
        },
        {
          question: '合并请求的同步是实时的吗？',
          answer:
            '是的——连接器支持 webhook，变化发生时 ClawAI 会直接收到通知，而不需要靠轮询去发现。',
        },
      ],
      productNote:
        'GitLab 是 ClawAI {connectorCount} 款工作区连接器之一，每一款连接器的读取和写入能力，都在各自的页面上有详细说明。',
    },
    [IntegrationTopic.BITBUCKET]: {
      seo: {
        title: 'AI Bitbucket 集成 — ClawAI',
        description:
          '把 Bitbucket Cloud 连接到 ClawAI，就能在对话里读取仓库和拉取请求的内容，还可以对拉取请求发表评论、完成审批，并直接创建新的议题，整个过程都无需离开聊天界面去手动操作。',
        keywords: ['AI Bitbucket 集成', 'Bitbucket AI 助手', 'AI 代码仓库搜索'],
      },
      eyebrow: '代码托管',
      title: 'Bitbucket',
      summary:
        '连接一个 Bitbucket Cloud 账号，ClawAI 就能读取你的仓库和拉取请求内容，并直接在对话里对它们采取行动——发表评论、完成批准，以及创建新的议题。',
      sections: [
        {
          id: 'what-it-covers',
          heading: '连接器覆盖的范围',
          paragraphs: [
            'ClawAI 可以读取仓库和拉取请求内容，并支持通过 webhook 实现实时更新。同步方式是每次全量重新读取，而不是增量式的差异同步。',
            '在写入方面：对拉取请求发表评论、批准拉取请求，以及创建新的议题。每一项都是明确的动作，ClawAI 不会自作主张地去做。',
          ],
        },
        {
          id: 'authentication',
          heading: '如何完成连接',
          paragraphs: [
            'Bitbucket 通过 OAuth 完成连接——用你的 Atlassian 账号登录，并授予对你选定的工作区和仓库的有限访问权限。',
          ],
        },
      ],
      faq: [
        {
          question: '支持 Bitbucket Server 或 Data Center 吗？',
          answer:
            '连接器目前只面向 Bitbucket Cloud。自托管的 Bitbucket Server 或 Data Center 暂不支持。',
        },
        {
          question: '它能替我批准拉取请求吗？',
          answer:
            '可以，前提是你在查看完差异内容后主动要求它这样做——批准是你明确请求的动作，不是自动完成的步骤。',
        },
      ],
      productNote: 'Bitbucket 是 ClawAI {connectorCount} 款工作区连接器之一。',
    },
    [IntegrationTopic.SLACK]: {
      seo: {
        title: 'AI Slack 集成 — ClawAI',
        description:
          '把 Slack 连接到 ClawAI，就能在对话中搜索频道和消息内容，还能直接发送新消息或回复已有的对话串，让一次对话真正针对团队正在讨论的事情采取行动，而不只是被动地阅读记录。',
        keywords: ['AI Slack 助手', 'AI 搜索 Slack 消息', 'Slack AI 集成'],
      },
      eyebrow: '沟通协作',
      title: 'Slack',
      summary:
        '连接一个 Slack 工作区，ClawAI 就能读取频道、消息和用户信息，并代替你发送或回复消息——把原本要在零散对话串里翻找的事情，变成一句就能问出来的问题。',
      sections: [
        {
          id: 'what-it-covers',
          heading: '连接器覆盖的范围',
          paragraphs: [
            'ClawAI 可以读取消息、频道和用户信息，并通过 Slack 的事件 webhook 实现实时更新——新消息一到达就能被看到，不用等到下一次轮询。',
            '在写入方面：向某个频道发送消息，以及在对话串内回复消息。这两项都需要你明确提出要求；ClawAI 绝不会未经提示就自行往 Slack 发消息。',
          ],
        },
        {
          id: 'what-it-is-good-for',
          heading: '它适合用在哪里',
          paragraphs: [
            '比如找出三周前埋在某个对话串里的一个决定、在开会前总结一个频道的讨论内容，或者起草一条能引用多条消息上下文的回复——这些正是 Slack 自带搜索框做不好的事情，因为它匹配的是关键词，而不是含义。',
          ],
        },
      ],
      faq: [
        {
          question: 'ClawAI 能读取私密频道吗？',
          answer:
            '只能读取所连接账号本身已加入、并且在连接时授权访问的频道——ClawAI 能看到的工作区内容，不会超出连接账号本身能看到的范围。',
        },
        {
          question: '不经我要求，它会自己往 Slack 发消息吗？',
          answer: '不会。发送或回复消息始终是你在对话中明确请求的动作。',
        },
      ],
      productNote:
        'Slack 是 ClawAI {connectorCount} 款工作区连接器之一，通过 webhook 实现实时更新。',
    },
    [IntegrationTopic.JIRA]: {
      seo: {
        title: 'AI Jira 集成 — ClawAI',
        description:
          '把 Jira 连接到 ClawAI，就能在对话里读取议题和项目内容，还可以直接创建工单、更新已有工单并发表评论——甚至可以把一条 Figma 设计评论直接转化成一张 Jira 工单，省去手动搬运的麻烦。',
        keywords: ['AI Jira 助手', 'AI 处理 Jira 工单', 'Jira AI 集成'],
      },
      eyebrow: '项目管理',
      title: 'Jira',
      summary:
        '连接一个 Atlassian Jira 站点，ClawAI 就能读取议题、工单、项目和评论内容，并直接对它们采取行动——创建和更新工单、发表评论，还能把一条 Figma 设计评论直接转化成一张 Jira 工单或用户故事。',
      sections: [
        {
          id: 'what-it-covers',
          heading: '连接器覆盖的范围',
          paragraphs: [
            'ClawAI 可以读取议题、工单、项目和评论内容，并通过 webhook 实现实时更新。',
            '在写入方面：创建工单、直接根据一条 Figma 评论创建工单、根据一个 Figma 文件起草用户故事、更新议题，以及对工单发表评论。其中最具特色的是 Figma 到 Jira 的这几项动作——它们让设计评审和被跟踪的工作项之间直接打通，不需要手动重新输入任何内容。',
          ],
        },
        {
          id: 'authentication',
          heading: '如何完成连接',
          paragraphs: [
            'Jira 支持 OAuth 授权，也支持使用 API 令牌的基础认证方式，同时需要填写你的 Jira 站点地址。基础认证适合服务账号和自动化场景，这类场景不适合走交互式的 OAuth 流程。',
          ],
        },
      ],
      faq: [
        {
          question: '它能自动根据一条 Figma 评论创建 Jira 工单吗？',
          answer:
            '可以，前提是你主动要求它这样做——这个动作会读取 Figma 评论，一步生成对应的 Jira 工单或草拟的用户故事，不需要你在两个工具之间手动搬运细节。',
        },
        {
          question: '它支持 Jira Server，还是只支持 Jira Cloud？',
          answer:
            '连接器面向的是 Atlassian 云端 Jira 的 REST API。自托管的 Jira Server 实例目前暂不支持。',
        },
      ],
      productNote:
        'Jira 是 ClawAI {connectorCount} 款工作区连接器之一，并可以和 Figma 连接器直接搭配，实现从设计到工单的无缝交接。',
    },
    [IntegrationTopic.CONFLUENCE]: {
      seo: {
        title: 'AI Confluence 集成 — ClawAI',
        description:
          '把 Confluence 连接到 ClawAI，就能在对话里读取页面、空间和评论内容，还可以直接创建新页面或编辑已有页面——查阅文档和更新文档，都只是一句话的事，不必再另外打开一个网页去操作。',
        keywords: ['AI Confluence 助手', 'Confluence AI 集成', 'AI 文档搜索'],
      },
      eyebrow: '文档协作',
      title: 'Confluence',
      summary:
        '连接一个 Atlassian Confluence 站点，ClawAI 就能读取页面、空间和评论内容，还能直接创建或编辑页面——查找文档变成一句提问，更新文档变成一个请求。',
      sections: [
        {
          id: 'what-it-covers',
          heading: '连接器覆盖的范围',
          paragraphs: [
            'ClawAI 可以读取页面、评论，以及用来组织它们的项目（空间）结构。这款连接器不支持实时 webhook 更新——同步是在你请求时才发生，而不是靠推送通知，所以刚刚编辑过的页面，可能要等到下一次同步才会体现出来。',
            '在写入方面：创建新页面，以及编辑已有页面。这两项都是明确的动作。',
          ],
        },
      ],
      faq: [
        {
          question: 'Confluence 的同步是实时的吗？',
          answer:
            '不是——和 GitHub 或 Slack 不同，Confluence 不会主动向 ClawAI 推送更新。内容是在你请求时才同步，而不是在变化发生的那一刻。',
        },
        {
          question: '它能替我写文档，而不只是读文档吗？',
          answer: '可以——创建页面和编辑页面都是它支持的写入动作，每一次都是你明确提出的请求。',
        },
      ],
      productNote: 'Confluence 是 ClawAI {connectorCount} 款工作区连接器之一。',
    },
    [IntegrationTopic.FIGMA]: {
      seo: {
        title: 'AI Figma 集成 — ClawAI',
        description:
          '把 Figma 连接到 ClawAI，就能在对话里读取设计文件和评论内容，还可以直接发表新的评论，并把一条设计评论直接转交给 Jira，生成对应的工单或用户故事，无需手动复制粘贴设计细节。',
        keywords: ['AI Figma 助手', 'Figma AI 集成', 'Figma 到 Jira 自动化'],
      },
      eyebrow: '设计',
      title: 'Figma',
      summary:
        '连接一个 Figma 账号，ClawAI 就能读取设计文件和评论内容，还能自己发表新的评论——如果同时搭配 Jira 连接器，还可以把一条设计评论直接转化成一张被跟踪的工单或草拟的用户故事。',
      sections: [
        {
          id: 'what-it-covers',
          heading: '连接器覆盖的范围',
          paragraphs: [
            'ClawAI 可以读取 Figma 设计文件及其评论内容，并通过 webhook 实现实时更新。在写入方面，它可以在文件上发表评论。',
            'Figma 在 ClawAI 中真正的威力，来自和 Jira 搭配使用：一条设计评论可以直接变成一张 Jira 工单或一份草拟的用户故事，不需要任何人手动重新输入上下文——具体的动作说明可以在 Jira 集成页面查看。',
          ],
        },
      ],
      faq: [
        {
          question: 'ClawAI 能读取真正的设计内容，而不只是评论吗？',
          answer:
            '它可以通过 Figma API 读取文件内容和评论。至于能对视觉设计做出多有意义的总结，取决于具体文件——评论和结构信息通常是最可靠的依据。',
        },
        {
          question: '要实现从 Figma 到工单的流程，我还需要连接 Jira 吗？',
          answer:
            '需要——从 Figma 到 Jira 的这些动作实际上是 Jira 连接器提供的功能，必须同时启用这两款连接器才能使用。',
        },
      ],
      productNote:
        'Figma 是 ClawAI {connectorCount} 款工作区连接器之一，和 Jira 搭配使用时效果最好。',
    },
    [IntegrationTopic.CLICKUP]: {
      seo: {
        title: 'AI ClickUp 集成 — ClawAI',
        description:
          '把 ClickUp 连接到 ClawAI，就能在对话里读取任务、空间和文件夹内容，还可以直接创建新任务、更新已有任务的状态，并对任务发表评论，整个流程都可以在聊天窗口里一次完成，不用切换应用。',
        keywords: ['AI ClickUp 助手', 'ClickUp AI 集成', 'AI 任务管理'],
      },
      eyebrow: '项目管理',
      title: 'ClickUp',
      summary:
        '连接一个 ClickUp 工作区，ClawAI 就能读取任务、空间和文件夹内容，还可以直接在对话里创建任务、更新任务，或对任务发表评论。',
      sections: [
        {
          id: 'what-it-covers',
          heading: '连接器覆盖的范围',
          paragraphs: [
            'ClawAI 可以读取任务、空间、文件夹和评论内容。这款连接器目前不支持实时 webhook 更新——因为底层的 webhook 投递无法被验证为真实可信，所以同步是在你请求时才发生，而不是靠推送。',
            '在写入方面：创建任务、更新任务，以及对任务发表评论。',
          ],
        },
      ],
      faq: [
        {
          question: 'ClickUp 是实时更新的吗？',
          answer:
            '不是——同步是在你请求时才发生，而不是通过实时推送通知。可以把它和 Confluence 或 Google Drive 一样看待：内容是最近一次同步时的状态，而不是实时状态。',
        },
        {
          question: '它能把任务在不同状态之间移动吗？',
          answer:
            '任务更新涵盖已有任务的状态和字段变更；具体能更新哪些字段，取决于你的 ClickUp 工作区本身是如何配置的。',
        },
      ],
      productNote:
        'ClickUp 是 ClawAI {connectorCount} 款工作区连接器之一，同步方式是按计划进行，而不是实时的。',
    },
    [IntegrationTopic.GOOGLE_DRIVE]: {
      seo: {
        title: 'AI Google Drive 集成 — ClawAI',
        description:
          '把 Google Drive 连接到 ClawAI，就能在对话里读取文档和电子表格的内容，还可以直接上传新文件或把文件移动到别的文件夹——并且只同步发生变化的部分，不用每次都重新读取整个云盘。',
        keywords: ['AI Google Drive 助手', 'AI 文档搜索', 'Google Drive AI 集成'],
      },
      eyebrow: '文件',
      title: 'Google Drive',
      summary:
        '连接一个 Google Drive 账号，ClawAI 就能读取文件、文档和电子表格内容，还可以上传或移动文件——它采用增量同步，重新同步一个大容量云盘，不必每次都把所有内容重新读一遍。',
      sections: [
        {
          id: 'what-it-covers',
          heading: '连接器覆盖的范围',
          paragraphs: [
            'ClawAI 可以读取文件、文档和电子表格内容。这款连接器支持增量同步——完成第一次全量读取之后，后续的同步只会拉取真正发生变化的部分，这一点在云盘里存有成千上万个文件时格外重要。它目前不支持实时 webhook 更新；同步是在你请求时才发生。',
            '在写入方面：上传文件，以及在文件夹之间移动文件。',
          ],
        },
      ],
      faq: [
        {
          question: '连接 Drive 之后，ClawAI 能访问里面的所有内容吗？',
          answer:
            '只能访问所连接的 Google 账号在 OAuth 授权时开放的内容——通常局限于该账号本来就能打开的文件，而不是整个组织范围的授权。',
        },
        {
          question: '每次重新同步一个大容量云盘都会很慢吗？',
          answer:
            '第一次同步会读取所需的全部内容；之后由于采用增量同步，只会拉取发生变化的部分，所以只要完成了初始同步，云盘规模再扩大也不会让同步变得更慢。',
        },
      ],
      productNote:
        'Google Drive 是 ClawAI {connectorCount} 款工作区连接器之一，针对大容量文件库采用增量同步。',
    },
    [IntegrationTopic.GMAIL]: {
      seo: {
        title: 'AI Gmail 集成 — ClawAI',
        description:
          '把 Gmail 连接到 ClawAI，就能在对话里读取邮件会话和消息内容，还可以直接发送新邮件、回复已有邮件，或者先生成一份草稿留给你审核之后再发出，全部操作都不用离开聊天窗口。',
        keywords: ['AI Gmail 助手', 'AI 邮件集成', 'Gmail AI 集成'],
      },
      eyebrow: '邮件',
      title: 'Gmail',
      summary:
        '连接一个 Gmail 账号，ClawAI 就能读取邮件会话、消息和标签内容，还可以直接在对话里发送邮件、回复邮件，或生成一份草稿——它采用增量同步，不会每次检查都把整个邮箱重新读一遍。',
      sections: [
        {
          id: 'what-it-covers',
          heading: '连接器覆盖的范围',
          paragraphs: [
            'ClawAI 可以读取邮件会话、消息和标签内容，并采用增量同步。它目前不支持针对新邮件的实时推送通知，同步是在你请求时才发生。',
            '在写入方面：发送新邮件、回复已有的邮件会话，以及生成一份先不发送的草稿——当你希望 ClawAI 先替你准备好回复内容、由你审核之后再发出时，这项功能会很有用。',
          ],
        },
      ],
      faq: [
        {
          question: '没有经过我批准，ClawAI 会自己发邮件吗？',
          answer:
            '不会。发送是一个明确的动作；生成草稿这个功能，正是专门为了让你能在任何内容发出之前先审核一遍而存在的。',
        },
        {
          question: '它会持续不断地检查我的收件箱吗？',
          answer:
            '它是在你请求时才同步，而不是通过实时推送连接，所以新邮件要等到最近一次同步之后才会显示出来，不是即时可见的。',
        },
      ],
      productNote: 'Gmail 是 ClawAI {connectorCount} 款工作区连接器之一。',
    },
    [IntegrationTopic.MICROSOFT_SHAREPOINT]: {
      seo: {
        title: 'AI SharePoint 集成 — ClawAI',
        description:
          '把 Microsoft SharePoint 连接到 ClawAI，就能在对话里读取文档和站点列表的内容，还可以直接上传新文档，并对列表中的条目进行创建和更新管理，不必再单独登录 SharePoint 网站操作。',
        keywords: ['AI SharePoint 助手', 'SharePoint AI 集成', 'Microsoft AI 文档搜索'],
      },
      eyebrow: '文件',
      title: 'Microsoft SharePoint',
      summary:
        '连接一个 Microsoft SharePoint 站点，ClawAI 就能读取文档、文件和站点列表内容，还可以直接在对话里上传文档，或对列表条目进行管理。',
      sections: [
        {
          id: 'what-it-covers',
          heading: '连接器覆盖的范围',
          paragraphs: [
            'ClawAI 可以读取文档、文件，以及用来组织 SharePoint 站点的各种列表。同步是在你请求时才发生，而不是通过实时推送连接。',
            '在写入方面：上传文档、创建新的列表条目，以及更新已有的列表条目。',
          ],
        },
        {
          id: 'authentication',
          heading: '如何完成连接',
          paragraphs: [
            'SharePoint 除了 OAuth 授权外，还需要你的 Microsoft 租户 ID，这样连接器才知道该访问哪个组织的 SharePoint。',
          ],
        },
      ],
      faq: [
        {
          question: '它需要我的 Microsoft 365 租户 ID 吗？',
          answer:
            '需要——SharePoint 是按租户划分范围的，所以连接器需要知道你的租户 ID，才能确定应该连接哪个组织的 SharePoint。',
        },
        {
          question: '内容是实时更新的吗？',
          answer: '不是——同步是在你请求时才发生，而不是通过实时推送通知。',
        },
      ],
      productNote: 'SharePoint 是 ClawAI {connectorCount} 款工作区连接器之一。',
    },
    [IntegrationTopic.MICROSOFT_ONEDRIVE]: {
      seo: {
        title: 'AI OneDrive 集成 — ClawAI',
        description:
          '把 Microsoft OneDrive 连接到 ClawAI，就能在对话里读取文件和文档的内容，还可以直接上传新文件或把文件移动到别的文件夹——并且支持只同步发生变化的部分，大容量文件库也不会越用越慢。',
        keywords: ['AI OneDrive 助手', 'OneDrive AI 集成', 'Microsoft AI 文件搜索'],
      },
      eyebrow: '文件',
      title: 'Microsoft OneDrive',
      summary:
        '连接一个 Microsoft OneDrive 账号，ClawAI 就能读取文件和文档内容，还可以直接在对话里上传或移动文件——针对大容量文件库，它采用增量同步。',
      sections: [
        {
          id: 'what-it-covers',
          heading: '连接器覆盖的范围',
          paragraphs: [
            'ClawAI 可以读取文件和文档内容，并采用增量同步——完成第一次全量读取之后，后续的同步只会拉取发生变化的部分。它目前不支持实时推送通知，同步是在你请求时才发生。',
            '在写入方面：上传文件，以及在文件夹之间移动文件。',
          ],
        },
        {
          id: 'authentication',
          heading: '如何完成连接',
          paragraphs: [
            '和 SharePoint 一样，OneDrive 除了 OAuth 授权外，也需要你的 Microsoft 租户 ID。',
          ],
        },
      ],
      faq: [
        {
          question: '它需要我的 Microsoft 365 租户 ID 吗？',
          answer:
            '需要，和 SharePoint 的道理一样——面向企业的 OneDrive for Business 是按租户划分范围的。',
        },
        {
          question: '容量很大的 OneDrive 同步起来会很慢吗？',
          answer:
            '开销主要集中在第一次同步上；之后由于采用增量同步，后续同步只会拉取真正发生变化的部分。',
        },
      ],
      productNote:
        'OneDrive 是 ClawAI {connectorCount} 款工作区连接器之一，针对大容量文件库采用增量同步。',
    },
    [IntegrationTopic.GOOGLE_CALENDAR]: {
      seo: {
        title: 'AI Google Calendar 集成 — ClawAI',
        description:
          '把 Google Calendar 连接到 ClawAI，就能在对话里读取会议和日程安排的内容，还可以直接创建新的日历事件，让查看日程、安排会议这些琐事都能在聊天窗口里顺手完成，不用另开日历应用。',
        keywords: ['AI Google Calendar 助手', 'Google Calendar AI 集成', 'AI 安排会议日程'],
      },
      eyebrow: '日历',
      title: 'Google Calendar',
      summary:
        '连接一个 Google Calendar，ClawAI 就能读取你的会议和日程安排，还可以直接在对话里创建新的日历事件——它采用增量同步，让你查看日程时始终保持快速。',
      sections: [
        {
          id: 'what-it-covers',
          heading: '连接器覆盖的范围',
          paragraphs: [
            'ClawAI 可以读取会议和日程内容，并采用增量同步。它目前不支持实时推送通知。',
            '在写入方面，这款连接器目前只支持一项动作：创建日历事件。重新安排时间、删除事件，或回复已有的邀请，目前都还不是支持的写入动作——如果情况有变化，这个页面会随之更新。',
          ],
        },
      ],
      faq: [
        {
          question: 'ClawAI 能替我重新安排已有会议的时间吗？',
          answer: '目前还不能——连接器目前只支持创建新事件，不支持编辑或重新安排已有事件的时间。',
        },
        {
          question: '它能看到我的整个日历，包括我有权访问的其他日历吗？',
          answer:
            '访问范围取决于你在连接时授予的权限，通常只是你的主日历，除非你明确扩大了授权范围。',
        },
      ],
      productNote:
        'Google Calendar 是 ClawAI {connectorCount} 款工作区连接器之一，它的写入能力目前仅限于创建新事件。',
    },
    [IntegrationTopic.OUTLOOK_CALENDAR]: {
      seo: {
        title: 'AI Outlook Calendar 集成 — ClawAI',
        description:
          '把 Outlook Calendar 连接到 ClawAI，就能在对话里读取会议和日程安排的内容，还可以直接创建新的日历事件，让查看日程、安排会议这些琐事都能在聊天窗口里顺手完成，不必再单独打开 Outlook。',
        keywords: ['AI Outlook Calendar 助手', 'Outlook AI 集成', 'Microsoft AI 安排会议'],
      },
      eyebrow: '日历',
      title: 'Outlook Calendar',
      summary:
        '连接一个 Microsoft Outlook Calendar，ClawAI 就能读取你的会议和日程安排，还可以直接在对话里创建新的日历事件。',
      sections: [
        {
          id: 'what-it-covers',
          heading: '连接器覆盖的范围',
          paragraphs: [
            'ClawAI 可以读取会议和日程内容。这款连接器目前不支持增量同步，也不支持实时推送通知——每次同步都是在你请求时，按需读取内容。',
            '在写入方面，这款连接器目前只支持一项动作：创建日历事件。重新安排时间、删除事件，或回复已有的邀请，目前都还不支持。',
          ],
        },
        {
          id: 'authentication',
          heading: '如何完成连接',
          paragraphs: [
            'Outlook Calendar 支持 OAuth 授权，租户 ID 是可选项——留空则使用 Microsoft 的多租户端点，填写则针对特定组织生效。',
          ],
        },
      ],
      faq: [
        {
          question: 'ClawAI 能替我重新安排已有会议的时间吗？',
          answer: '目前还不能——当前只支持创建新事件。',
        },
        {
          question: '我需要设置租户 ID 吗？',
          answer:
            '只有当你希望连接器限定在某个特定的 Microsoft 组织范围内时才需要设置。留空则会使用多租户端点，这对大多数个人账号和组织账号都适用。',
        },
      ],
      productNote:
        'Outlook Calendar 是 ClawAI {connectorCount} 款工作区连接器之一，它的写入能力目前仅限于创建新事件。',
    },
  },
};
