import { FeatureCapability } from '@/enums/feature-capability.enum';
import type { FeaturesClusterDictionary } from '@/types/features-cluster.types';

export const ZH_FEATURES_CLUSTER_CONTENT: FeaturesClusterDictionary = {
  labels: {
    onThisPage: '本页内容',
    faqTitle: '常见问题',
    relatedTitle: '接下来可以看看',
    lastReviewed: '最近审核',
    backToHub: '所有功能',
    ctaTitle: '与其相信我们的话，不如亲自试试',
    ctaBody:
      'ClawAI 会把每次对话导向适合任务的模型和工具，覆盖它连接的每个提供商，全部在一个工作区中完成。',
    startFree: '从免费方案开始',
    seeUseCases: '看看它在真实任务中的应用',
  },
  hub: {
    capabilitiesHeading: '深入了解某项具体功能',
    capabilitiesIntro:
      '上面九个部分是简要版本。下面六项功能中的每一项都有完整页面：底层功能到底做什么、哪个方案能解锁它，以及你自己可以在哪里核实其机制。',
    cardSummaries: {
      [FeatureCapability.MODEL_ROUTING_AND_ORCHESTRATION]:
        '七种路由模式决定由哪个模型作答，九种编排原语让多个模型协同处理同一个问题。',
      [FeatureCapability.MEMORY_AND_CONTEXT]:
        '在对话之间保持的记忆，以及为任务承载参考资料的上下文包。',
      [FeatureCapability.WORKSPACE_CONNECTORS]:
        '十四个工作区连接器让请求可以读取或操作团队已在使用的工具。',
      [FeatureCapability.FILE_AND_DOCUMENT_HANDLING]:
        '输入端是上传、分块与 OCR；输出端是图像、文档与调研生成。',
      [FeatureCapability.OBSERVABILITY_AND_TRANSPARENCY]:
        '每个回答都会记录是哪个模型处理的、原因是什么，以及消耗了你多少额度。',
      [FeatureCapability.SECURITY_AND_DATA_HANDLING]:
        '具体机制——身份验证、基于角色的访问控制、凭据加密、传输加密——以简明方式说明。',
    },
  },
  capabilities: {
    [FeatureCapability.MODEL_ROUTING_AND_ORCHESTRATION]: {
      seo: {
        title: 'ClawAI 中的模型路由与编排',
        description:
          '决定由哪个模型回答消息的七种路由模式，以及让多个模型协同处理同一问题的九种编排原语，均按 ClawAI 的实际实现详细说明，不含任何虚构的性能数据或夸大的营销措辞。',
        keywords: ['AI 模型路由模式', '多模型编排', 'AI 路由透明度'],
      },
      eyebrow: '功能',
      title: '模型路由与编排',
      summary:
        '路由决定由哪一个模型回答消息；编排决定当单个模型不够时该怎么办。ClawAI 将两者作为独立的、依赖方案的机制提供，而不是单一的隐藏默认设置——七种路由模式和九种编排原语，全部可在你收到的回答中查看。',
      sections: [
        {
          id: 'seven-routing-modes',
          heading: '七种路由模式，而非单一隐藏默认',
          paragraphs: [
            'ClawAI 会对每条消息分类，并可自动将其发送给合适的模型，你也可以自行设定规则。这些模式包括：Auto（按任务分类并为该类别选择强模型）、Manual Model（为对话固定一个模型）、Local-Only（每个请求都通过 Ollama 或 llama.cpp 留在你控制的硬件上）、Privacy-First（一个独立模式，有自己的优先级，把请求排除在通用云路径之外）、Low Latency（优先选择响应最快的模型）、High Reasoning（不论速度或成本，优先选择推理能力最强的模型）以及 Cost Saver（优先选择仍能处理请求的最便宜模型）。路由器的一般工作原理请参见下方链接的“什么是 AI 模型路由”。',
          ],
        },
        {
          id: 'nine-orchestration-primitives',
          heading: '让多个模型协同处理一个问题的九种方式',
          paragraphs: [
            '当单个模型不够时，ClawAI 的编排原语——在账本中记录于与普通聊天不同的 ORCHESTRATION 维度下——包括 Compare（最多五个模型并列处理同一提示词）、Consensus（从多个模型的一致之处综合出一个答案，并标记分歧点）、Escalation（从便宜的模型开始，仅在质量不足时自动升级）、Best-of-N（生成多个候选答案并保留最强的一个）、Repair（修复现有答案中的特定缺陷，而不是整体重新生成）、Verify（由第二个模型以可配置的修订轮数上限核查正确性）、Role packs（一小队按角色专精的模型依次交接）、Pipelines（把多个这样的阶段串联成一个可重复运行的命名工作流）以及 Judge 与 Critic（由独立模型按明确标准为答案打分，并由 Critic 阶段就薄弱之处给出书面反馈）。Compare 和 Judge 各自单独受方案限制（COMPARE_MODE、JUDGE_MODE、CRITIC_REVIEW）；评估本身的运作方式请参见下方链接的“什么是 AI 共识”和“什么是 AI 裁判”。',
          ],
        },
        {
          id: 'automatic-fallback-on-provider-failure',
          heading: '当提供商在请求中途失败时会发生什么',
          paragraphs: [
            '路由决策不是一次性的赌注：如果请求发送到的提供商或模型在处理中途失败，ClawAI 可以自动切换到另一个模型，回答中会记录实际接手的模型，而不仅仅是最初选定的模型。该切换决策的做出方式请参见下方链接的“什么是模型故障转移”。',
          ],
        },
      ],
      faq: [
        {
          question: 'ClawAI 有多少种路由模式？',
          answer:
            '七种：Auto、Manual Model、Local-Only、Privacy-First、Low Latency、High Reasoning 和 Cost Saver。Auto 是默认模式；其余六种适用于你想自行决定路由，或将其导向特定方向的情况。',
        },
        {
          question: 'Compare 和 Consensus 有什么区别？',
          answer:
            'Compare 会并列展示每个模型对同一提示词的回答，附带每个模型的延迟和令牌数，阅读交由你决定。Consensus 则从模型的一致之处综合出一个答案，并标记分歧点。',
        },
        {
          question: '我能看到实际是哪个模型作答，以及原因吗？',
          answer:
            '可以——每个回答都带有生成它的提供商和模型、路由选择背后的理由，以及从你额度中扣除的成本。如果某个提供商失败而由另一个模型接手，这一点也会被记录下来。',
        },
      ],
      productNote:
        '七种路由模式和九种编排原语是 ClawAI 中真实已上线的机制，而非单一隐藏默认设置——Compare、Judge 和 Critic 各自单独受方案限制，并在各自的账本维度上单独计量。',
    },
    [FeatureCapability.MEMORY_AND_CONTEXT]: {
      seo: {
        title: 'ClawAI 中的记忆与上下文',
        description:
          'ClawAI 的记忆和上下文包如何运作——带置信度评分的已批准记忆记录、限定范围的存储，以及带版本管理的参考资料包，均为已上线且依赖方案的真实功能，而非营销概念或空泛承诺。',
        keywords: ['AI 记忆功能', 'AI 上下文包', '持久的 AI 对话记忆'],
      },
      eyebrow: '功能',
      title: '记忆与上下文',
      summary:
        '记忆与上下文包是两个独立的、依赖方案的功能（MEMORY 和 CONTEXT_PACKS），解决不同的问题：记忆保留 ClawAI 在多次会话间对你的了解，而上下文包为特定任务汇集参考资料。两者都是按对话开关的功能，而非全局管理的东西。',
      sections: [
        {
          id: 'memory-records-and-approval',
          heading: '记忆记录，以及先于它们的审批队列',
          paragraphs: [
            '一条记忆记录是一个事实、偏好、指示或摘要，连同类别、置信度评分和来源记录一起存储。没有任何内容会被悄悄记住：候选项进入一个由你批准或拒绝的队列，只有高置信度且不敏感的项目才会按你自己设定的阈值自动获批。一般运作方式请参见下方链接的“什么是 AI 记忆”。',
          ],
        },
        {
          id: 'context-packs-for-reference-material',
          heading: '为任务需要随时可见的资料而设的上下文包',
          paragraphs: [
            '上下文包把可复用的文本、文件、链接和记忆引用汇集成一个命名的、带版本管理的单元，你可以将其附加到任何对话中——这样一份风格简报、一组来源文档或长期指示就无需每次会话重新粘贴。包是带版本管理的，因此你可以查看变化并回滚。一般运作方式请参见下方链接的“什么是上下文包”。',
          ],
        },
        {
          id: 'scopes-receipts-and-controls',
          heading: '范围、上下文凭证与控制项',
          paragraphs: [
            '记忆可以限定在你自己、单个对话、某个项目或某个工作区，以防止工作上下文渗入私人聊天。任何使用记忆或上下文包的回答都会生成一份上下文凭证——记录哪些内容以什么顺序进入了提示词，以及各自消耗了多少令牌预算——控制项则允许暂停全部记忆或单个条目、设置到期日、将某项标记为敏感以进行遮蔽，或彻底删除，每次更改都会写入审计日志。这种令牌预算核算的重要性请参见下方链接的“什么是上下文窗口”。',
          ],
        },
      ],
      faq: [
        {
          question: 'ClawAI 会不经询问就记住关于我的事情吗？',
          answer:
            '不会——候选项会进入一个由你自己审核的审批队列。只有高置信度且不敏感的项目会按你设定的阈值自动获批，对记忆记录的任何更改都会写入审计日志。',
        },
        {
          question: '记忆和上下文包有什么区别？',
          answer:
            '记忆在多次会话间保留 ClawAI 对你偏好的了解。上下文包则是一个带版本管理的参考资料包——文本、文件、链接——你将其附加到特定任务，而非长期偏好。两者是两个独立的、依赖方案的功能。',
        },
        {
          question: '我能只为一个问题关闭记忆吗？',
          answer:
            '可以——记忆和上下文包都是按对话开关的功能。为一次性提问关闭它们，提示词中就只会包含你实际输入的内容。',
        },
      ],
      productNote:
        '记忆和上下文包是 ClawAI 两个独立的、依赖方案的功能（MEMORY、CONTEXT_PACKS）——带置信度评分的已批准记录，以及带版本管理的参考资料包，两者都限定范围且可审计，而非一个混杂的记忆块。',
    },
    [FeatureCapability.WORKSPACE_CONNECTORS]: {
      seo: {
        title: 'ClawAI 中的工作区连接器',
        description:
          'ClawAI 已上线的 14 个工作区连接器——GitHub、Slack、Jira、Google Drive 等——以及依赖方案的工作区操作如何读取或操作它们，附带每个连接器的具体范围。',
        keywords: ['AI 工作区连接器', '将 AI 连接到 GitHub 和 Slack', 'AI 工具集成'],
      },
      eyebrow: '功能',
      title: '工作区连接器',
      summary:
        '工作区连接器让 ClawAI 的请求可以读取或操作团队已在使用的工具，而不必手动来回复制信息。ClawAI 目前拥有 14 个工作区连接器，工作区访问是一个独立的、依赖方案的功能（WORKSPACES），有自己独立计量的使用维度（WORKSPACE_ACTION）。',
      sections: [
        {
          id: 'the-fourteen-connectors',
          heading: '按类别划分的十四个连接器',
          paragraphs: [
            '代码托管：GitHub、GitLab、Bitbucket。消息与跟踪：Slack、Jira、Confluence、ClickUp。设计：Figma。文档与存储：Google Drive、Gmail、Microsoft SharePoint、Microsoft OneDrive。日历：Google Calendar、Outlook Calendar。每个连接器都通过 OAuth 连接一次，凭据在静止时加密，绑定到你的账户，并可一键撤销。',
          ],
        },
        {
          id: 'what-a-connected-workspace-can-do',
          heading: '已连接的工作区实际能让请求做什么',
          paragraphs: [
            '连接后，ClawAI 可以在工具中搜索、将其中的上下文提取到对话中，并在你批准后对其进行操作——一个 Jira 工单、一条 Slack 消息线程、Google Drive 中的一个文件，都可以直接引用或修改，而不必手动粘贴。连接会按计划和通过 webhook 同步，使搜索结果保持最新，你能保持多少个连接取决于你的方案。',
          ],
        },
        {
          id: 'multi-model-review-inside-a-workspace-action',
          heading: '同一计量维度内的多模型审核',
          paragraphs: [
            '工作区操作不限于单次模型调用——链式起草或交接步骤，或在结果被执行前进行的多模型审核，使用的是下方链接的模型路由与编排页面所述的相同路由与编排基础设施，只是应用在涉及已连接工具的操作上，而不是普通聊天消息上。',
          ],
        },
      ],
      faq: [
        {
          question: 'ClawAI 连接了多少个工具？',
          answer:
            '十四个工作区连接器：GitHub、GitLab、Bitbucket、Slack、Jira、Confluence、ClickUp、Figma、Google Drive、Gmail、Microsoft SharePoint、Microsoft OneDrive、Google Calendar 和 Outlook Calendar。',
        },
        {
          question: '我的连接器凭据安全吗？',
          answer:
            '凭据在静止时加密，绑定到你的账户，且从不返回到浏览器——底层机制请参见下方链接的安全与数据处理页面。',
        },
        {
          question: '工作区操作是否与普通聊天消息分开计量？',
          answer:
            '是的——工作区操作有自己独立计量的维度（WORKSPACE_ACTION），与普通聊天消息的令牌额度分开。当前额度请在定价页面确认。',
        },
      ],
      productNote:
        'ClawAI 目前连接 14 个工作区工具——代码托管、消息、项目跟踪、设计、文档、存储和日历——都位于一个依赖方案的 WORKSPACES 功能之下，有自己独立计量的操作维度。',
    },
    [FeatureCapability.FILE_AND_DOCUMENT_HANDLING]: {
      seo: {
        title: 'ClawAI 中的文件与文档处理',
        description:
          'ClawAI 如何摄取文件——上传、分块、OCR、上传检查——并将其重新生成为图像、文档和带引用来源的调研结果，两个方向均已上线且分开计量，不含任何虚构的能力或夸大的说法。',
        keywords: ['AI 文件上传与 OCR', 'AI 文档生成', 'AI 文档导出格式'],
      },
      eyebrow: '功能',
      title: '文件与文档处理',
      summary:
        '文件在 ClawAI 中双向流动：向内，作为被分块并索引的上传内容，让模型根据你的内容而非仅凭训练数据作答；向外，作为生成的图像、导出的文档，或带引用来源的调研结果。两个方向都真实存在、已经上线，并分开计量。',
      sections: [
        {
          id: 'upload-chunking-and-retrieval',
          heading: '上传、分块与按模型交付',
          paragraphs: [
            'ClawAI 接受 PDF、DOCX、电子表格、CSV、JSON、Markdown、纯文本、代码文件和图像。文件会被切分为片段并建立索引，因此只有与问题相关的部分会进入提示词，每个模型都会收到它处理最可靠的形式——原生图像、原生 PDF 或提取出的文本——每条消息都会显示每个模型实际收到的是哪种形式。文件可以按消息附加，包括在 Compare 运行中，从而可以同时询问多个模型关于同一份文档的问题。',
          ],
        },
        {
          id: 'ocr-and-upload-checks',
          heading: '针对扫描文档的 OCR，以及每次上传的检查',
          paragraphs: [
            '没有文本层的扫描 PDF 在到达模型之前会先经过 OCR 处理，识别置信度较低时会被标记。每次上传都会进行病毒扫描，与声明的文件类型进行核对，检查是否存在危险文件名，如果压缩包被证实是解压炸弹则会被拒绝——上传会计入方案的文件大小和存储限额，文件会按保留计划被移除，或你随时可以自行删除。',
          ],
        },
        {
          id: 'generating-images-documents-and-research',
          heading: '生成图像、文档和带引用的调研结果',
          paragraphs: [
            '在输出端，ClawAI 可以根据描述生成图像，将任意回答或整段对话导出为 PDF、DOCX、CSV、HTML、Markdown、TXT 或 JSON 格式的文件，并执行搜索网络、抓取并阅读页面、以实际使用的来源作答的调研任务。图像生成、文件生成和调研各自独立计量（IMAGE、FILE_GENERATION，以及 RESEARCH_MODE / WEB_SEARCH / WEB_FETCH / WEB_EXTRACT 额度），与普通聊天的令牌使用分开。特定输出形式背后的机制请参见下方链接的“AI 工具调用的工作原理”和“什么是结构化 AI 输出”。',
          ],
        },
      ],
      faq: [
        {
          question: '我可以上传哪些类型的文件？',
          answer:
            'PDF、DOCX、电子表格、CSV、JSON、Markdown、纯文本、代码文件和图像。每个模型都会收到它处理最可靠的形式，消息会显示每个模型实际收到的是哪种形式。',
        },
        {
          question: 'ClawAI 能读取没有文本层的扫描文档吗？',
          answer: '可以——扫描的 PDF 在到达模型之前会先经过 OCR 处理，识别置信度较低时会被标记。',
        },
        {
          question: '我可以将文档导出为哪些格式？',
          answer:
            'PDF、DOCX、CSV、HTML、Markdown、TXT 和 JSON。文档导出是一个独立计量的维度，与普通聊天和调研使用分开。',
        },
      ],
      productNote:
        '输入端的上传、分块、OCR 和上传检查；输出端的图像生成、文档导出和带引用的调研结果——这些都是真实、已上线且分开计量的功能，而不是一个混杂的文件模式。',
    },
    [FeatureCapability.OBSERVABILITY_AND_TRANSPARENCY]: {
      seo: {
        title: 'ClawAI 中的可观测性与透明度',
        description:
          'ClawAI 如何展示一次请求消耗了什么——使用情况仪表盘、每次回答的路由详情、审计日志和实时进度——使使用情况永远不是一个黑箱，全部有据可查，且随时可自行核实。',
        keywords: ['AI 使用透明度', 'AI 路由审计日志', 'AI 成本可观测性'],
      },
      eyebrow: '功能',
      title: '可观测性与透明度',
      summary:
        'ClawAI 中的使用情况是被计量、可归因且可见的，而不是一个黑箱：使用情况仪表盘、每次回答的路由详情、审计日志，以及模型工作时的实时进度，是同一原则下四个独立且已上线的部分——你始终能看到一次请求做了什么、花费了多少。',
      sections: [
        {
          id: 'usage-dashboard-and-per-answer-detail',
          heading: '使用情况仪表盘，以及每次回答的路由详情',
          paragraphs: [
            '使用情况仪表盘按模型细分显示今天和本月已消耗的额度，剩余余额以方案计价所用的相同单位显示。在此之下，每个单独的回答都带有生成它的模型、被选中的原因、耗时、使用的令牌数，以及从额度中扣除的成本——如果原始提供商在请求中途失败，还会包括接手的是哪个模型。该路由决策本身是如何做出的，请参见下方链接的“什么是 AI 模型路由”和“什么是模型故障转移”。',
          ],
        },
        {
          id: 'the-audit-log',
          heading: '登录、方案变更和连接器活动的审计日志',
          paragraphs: [
            '登录、方案变更、连接器活动、记忆编辑和生成的内容都各自附带时间戳和操作者被记录下来，使账户的历史可以被重建，而不仅仅是在发生那一刻可见。这与下方链接的记忆与上下文和安全与数据处理页面所引用的是同一份审计轨迹，记录着这些功能各自写入其中的操作。',
          ],
        },
        {
          id: 'live-progress-and-limit-warnings',
          heading: '模型工作时的实时进度，以及清晰的限额提醒',
          paragraphs: [
            '在模型工作期间，你能看到它所处的阶段、随着到达而显示的文本、它公开时的推理过程，以及实时的令牌与耗时计数器——绝不会是无声的等待。当请求达到方案限额时，ClawAI 会说明是哪一项限额、其他窗口还剩多少，以及何时重置，而不是无解释地直接中断请求。',
          ],
        },
      ],
      faq: [
        {
          question: '我能看到某条具体消息是哪个模型回答的，以及原因吗？',
          answer:
            '可以——每个回答都会记录生成它的提供商和模型、路由选择背后的理由、耗时、使用的令牌数，以及从你额度中扣除的成本。',
        },
        {
          question: '审计日志实际记录了什么？',
          answer:
            '登录、方案变更、连接器活动、记忆编辑和生成的内容，各自附带时间戳和操作者，使账户历史可以在事后被重建。',
        },
        {
          question: '当我达到使用限额时会发生什么？',
          answer:
            'ClawAI 会说明具体达到了哪一项限额、你其他使用窗口还剩多少额度，以及限额何时重置——不会有任何内容被无声中断。',
        },
      ],
      productNote:
        '使用情况仪表盘、每次回答的路由详情、审计日志和实时进度，是同一原则下四个真实且已上线的部分：ClawAI 中的使用情况被计量、可归因且可见，绝不是黑箱。',
    },
    [FeatureCapability.SECURITY_AND_DATA_HANDLING]: {
      seo: {
        title: 'ClawAI 中的安全与数据处理',
        description:
          'ClawAI 账户与数据安全背后的具体机制——Argon2 密码哈希、轮换的刷新令牌、基于角色的访问控制、AES-256-GCM 凭据加密、TLS 和服务隔离——以简明方式说明，不作任何合规声明。',
        keywords: ['AI 平台安全', 'AI 凭据加密', 'AI 基于角色的访问控制'],
      },
      eyebrow: '功能',
      title: '安全与数据处理',
      summary:
        '本页以简明方式描述产品今天实际存在的机制，而非合规声明。账户、凭据、传输和服务之间的边界，各自都有一个具体、可核实的机制作为支撑——在请求必须留在你所控制的硬件上、而不是根本不接触云提供商的场景下，Local-Only 和 Privacy-First 路由就是对应的答案，而不是安全认证。',
      sections: [
        {
          id: 'accounts-sessions-and-access-control',
          heading: '账户、会话与基于角色的访问',
          paragraphs: [
            '密码使用 Argon2 哈希；访问令牌是短期有效的，刷新令牌在每次使用时轮换，因此被盗令牌可以被检测到。每个账户都带有一个角色和一组明确的权限，会在界面中和每个后端端点上再次检查——基于角色的访问控制应用在两个层面，而不仅仅是界面碰巧展示出来的地方。',
          ],
        },
        {
          id: 'credential-and-transport-encryption',
          heading: '凭据加密与传输加密',
          paragraphs: [
            '提供商和连接器凭据在静止时使用 AES-256-GCM 加密，且从不返回到浏览器。传输采用从浏览器到边缘的 TLS，以及每个内部服务之间再次使用的 TLS，并在每一跳验证证书——因此凭据在静止和传输过程中都受到保护。',
          ],
        },
        {
          id: 'service-isolation-and-what-is-not-claimed',
          heading: '服务隔离、速率限制，以及此处未作出的声明',
          paragraphs: [
            '每个后端服务都拥有自己的数据库，无法读取其他服务的数据库，因此图像生成中的故障无法波及你的对话；按账户设置的速率限制既保护你的额度，也保护平台免受失控循环的影响。ClawAI 目前不持有任何合规认证，托管应用按第三方模型提供商自己的条款向其发送请求——如果这无法满足某个组织的需求，在你自己网络内、仅运行开放权重模型的私有部署会按个案商定；请联系我们讨论。对于必须默认留在你所控制硬件上的请求，请参见下方链接的私有与本地部署。',
          ],
        },
      ],
      faq: [
        {
          question: '我的密码和登录令牌是如何受保护的？',
          answer:
            '密码使用 Argon2 哈希。访问令牌是短期有效的，刷新令牌在每次使用时轮换，因此被盗的刷新令牌可以被检测到，而不会被悄悄重复使用。',
        },
        {
          question: '我已连接工具的凭据是如何存储的？',
          answer:
            '无论是哪个工作区连接器，提供商和连接器凭据在静止时都使用 AES-256-GCM 加密，且从不返回到浏览器。',
        },
        {
          question: 'ClawAI 是否持有第三方合规认证？',
          answer:
            '没有——ClawAI 目前不持有任何合规认证。对于托管应用无法满足的要求，在你自己网络内的私有部署会按个案商定；请参见下方链接的本地与私有部署用例。',
        },
      ],
      productNote:
        'Argon2 密码哈希、轮换的刷新令牌、在每个后端端点检查的基于角色的访问控制、AES-256-GCM 凭据加密、每一跳的 TLS，以及按服务隔离的数据库——具体机制，以简明方式说明，未声明任何合规认证。',
    },
  },
};
