import { UseCaseTask } from '@/enums/use-case-task.enum';
import type { UseCasesClusterDictionary } from '@/types/use-cases-cluster.types';

export const ZH_USE_CASES_CLUSTER_CONTENT: UseCasesClusterDictionary = {
  labels: {
    onThisPage: '本页内容',
    faqTitle: '常见问题',
    relatedTitle: '接下来可以看看',
    lastReviewed: '最近更新',
    backToHub: '全部使用场景',
    ctaTitle: '不必只听我们说,亲自试试看',
    ctaBody: 'ClawAI 会在一个工作区里,把对话路由到与之匹配的模型和工具,覆盖它接入的每一个提供方。',
    startFree: '从免费方案开始',
    seeFeatures: '了解 ClawAI 能做什么',
  },
  hub: {
    tasksHeading: '深入了解某一类具体工作',
    tasksIntro:
      '上面列出的只是简要版本。下面这七类工作各自有一整篇独立页面:这项工作实际需要什么、由 ClawAI 的哪个功能或路由模式来处理,以及可以去哪里自行核实细节。',
    cardSummaries: {
      [UseCaseTask.CODING_AND_DEVELOPMENT]: '编写、编辑和审查代码,多步骤改动交给编码智能体来处理。',
      [UseCaseTask.RESEARCH_AND_FACT_FINDING]:
        '答案基于 ClawAI 实际查阅到的来源,而不只是训练数据。',
      [UseCaseTask.WRITING_AND_EDITING]: '长文起草与编辑,在整篇文档中保持一致。',
      [UseCaseTask.COMPARING_MODEL_ANSWERS]:
        '让同一个提示在多个模型间并排运行,再由其中一个来评判结果。',
      [UseCaseTask.WORKSPACE_AUTOMATION]:
        '接入你的团队已经在用的工具,让 ClawAI 能在其中直接执行操作。',
      [UseCaseTask.STRUCTURED_DATA_EXTRACTION]:
        '把杂乱的文本或页面转换成你自己系统能够使用的结构化输出。',
      [UseCaseTask.PRIVATE_AND_LOCAL_DEPLOYMENT]:
        '让请求留在你自己控制的硬件上,而不是交给云端提供方。',
    },
  },
  tasks: {
    [UseCaseTask.CODING_AND_DEVELOPMENT]: {
      seo: {
        title: '用 ClawAI 做编码与开发',
        description:
          'ClawAI 如何支持编码工作——用普通聊天快速修复一个小问题、解释一段报错,或者把跨越多个文件的复杂改动交给编码智能体处理。所有说明都基于产品实际已上线的功能,不包含任何编造的基准测试数据或排名。',
        keywords: ['AI 编码', '编码智能体使用场景', 'AI 结对编程工作流'],
      },
      eyebrow: '使用场景',
      title: '编码与开发',
      summary:
        'ClawAI 中的编码工作分为两种形态:一次简短的提问或单文件修改,在普通聊天里就能完成;而涉及多个文件、需要规划和审查的多步骤改动,则交给编码智能体处理。两者底层用的是同一套路由和提供方目录。',
      sections: [
        {
          id: 'quick-fixes-in-chat',
          heading: '在普通聊天中快速修复与提问',
          paragraphs: [
            '单文件修改、解释一个报错,或者一次简短的重构,和其他任何 ClawAI 聊天消息一样,只是普通对话。在 Auto 或 High Reasoning 路由模式下,路由器可以把它发送给适合该任务的模型;如果你已经知道某类重复出现的问题该用哪个模型,也可以在 Manual Model 模式下直接指定——下方链接的"如何为编码选择模型"说明了具体该权衡什么。',
          ],
        },
        {
          id: 'multi-step-changes-with-the-coding-agent',
          heading: '用编码智能体处理多步骤改动',
          paragraphs: [
            '对于跨越多个文件或多个步骤的改动——一项新功能、一次数据迁移、一次带规划的重构——ClawAI 的编码智能体会针对你的代码库运行一个基于回合的循环,而不是在单条消息中作答,它有自己独立于普通聊天的计量用量。下方链接的编码智能体页面说明了它具体做什么、如何安装。',
          ],
        },
        {
          id: 'connecting-your-repository',
          heading: '连接这项工作涉及的代码仓库',
          paragraphs: [
            '编码工作往往需要看到代码仓库本身,而不只是粘贴过来的片段——ClawAI 把 GitHub、GitLab 和 Bitbucket 作为工作区连接器接入,让请求可以直接引用它正在处理的实际代码、issue 或 pull request,而不用你手动逐个文件复制。下方链接的集成页面列出了完整的连接器清单。',
          ],
        },
      ],
      faq: [
        {
          question: 'ClawAI 会自动帮我写代码吗?',
          answer:
            '对于规范明确的小改动,一条普通聊天消息通常就能完成。对于跨越多个文件的多步骤改动,编码智能体会针对你的代码库运行一个基于回合的循环,而不是一次性作答——详见下方链接的编码智能体页面。',
        },
        {
          question: 'ClawAI 能看到我实际的代码仓库吗?',
          answer:
            '可以,一旦你完成连接——ClawAI 为 GitHub、GitLab 和 Bitbucket 提供工作区连接器,让编码请求可以引用真实的文件、issue 和 pull request,而不是粘贴过来的片段。',
        },
        {
          question: '编码任务该用哪种模型?',
          answer:
            '这个页面不会指定某一个——下方链接的"如何为编码选择模型"说明了该权衡什么,而不是给出一份排名。',
        },
      ],
      productNote:
        'ClawAI 会自动把普通的编码提问路由到合适的模型,并把多步骤改动交给编码智能体处理——这是一项真实上线、有独立计量用量的功能,不是聊天技巧。',
    },
    [UseCaseTask.RESEARCH_AND_FACT_FINDING]: {
      seo: {
        title: '用 ClawAI 做研究与事实核查',
        description:
          'ClawAI 的 Research 模式如何搜索网页、抓取页面并提取结构化内容,让每个答案都能引用它为这个具体问题实际查阅到的来源,其用量与聊天所用的模型额度分开计费,互不影响。',
        keywords: ['AI 研究助手', '用 AI 做事实核查', '带来源的 AI 答案'],
      },
      eyebrow: '使用场景',
      title: '研究与事实核查',
      summary:
        '研究类任务要求答案基于针对这个具体问题查阅到的来源,而不仅仅是模型训练阶段学到的内容。ClawAI 的 Research 模式正是为此而生、已经正式上线的功能,提供三种深度,并有自己独立于普通聊天的计量方式。',
      sections: [
        {
          id: 'what-research-mode-does',
          heading: 'Research 模式实际做什么',
          paragraphs: [
            'Research 模式让一次请求在 ClawAI 给出答案之前,先进行网页搜索、抓取某个页面,或抓取并提取其中的结构化内容——这样答案就能引用为这个问题实际检索到的来源,而不只是依赖训练数据。这是一项受方案控制的功能,提供三种深度:仅搜索、搜索加抓取,以及搜索加抓取并提取。',
          ],
        },
        {
          id: 'billed-separately-from-model-credit',
          heading: '与你的模型额度分开计量',
          paragraphs: [
            'Research 的使用量——网页搜索、页面抓取和内容提取——是单独计量的,与普通聊天消息所消耗的 token 额度分开。你的方案中,研究额度和模型 token 额度是两条独立的项目,而不是共用一个池子,所以运行研究不会占用编码或写作任务要用到的额度。',
          ],
        },
        {
          id: 'picking-a-depth-for-the-question',
          heading: '根据问题选择合适的深度',
          paragraphs: [
            '一次简单的事实核查通常只需要仅搜索这一档深度;如果问题的关键在于某个具体页面到底写了什么,就需要搜索加抓取;而要一次性从多个页面中提取结构化数据,搜索加抓取并提取才能体现出它的价值。让深度匹配问题本身,能让研究用量保持合理,而不是每次都默认选用最贵的选项。',
          ],
        },
      ],
      faq: [
        {
          question: '使用研究功能会占用我的模型 token 额度吗?',
          answer:
            '不会。研究功能的使用量——网页搜索、页面抓取和内容提取——是与普通聊天消息所消耗的 token 额度分开计量的。请在定价页分别确认这两项额度。',
        },
        {
          question: 'Research 模式的三种深度有什么区别?',
          answer:
            '仅搜索只返回网页搜索的结果;搜索加抓取还会取回页面内容;搜索加抓取并提取则进一步从抓取到的内容中提取出结构化信息。',
        },
        {
          question: '我选择的模型会影响研究质量吗?',
          answer:
            '会——Research 模式改变的是模型能看到哪些来源,而不是它阅读和整合这些来源的能力。参见下方链接的"如何为带来源的研究选择模型"。',
        },
      ],
      productNote:
        'ClawAI 的 Research 模式可以在模型作答之前进行网页搜索、抓取,以及抓取并提取——这是一项真实上线的功能,与你的模型 token 额度分开计量。',
    },
    [UseCaseTask.WRITING_AND_EDITING]: {
      seo: {
        title: '用 ClawAI 做写作与编辑',
        description:
          'ClawAI 如何支持长文起草与编辑工作——用上下文包在整个对话过程中保存风格简报和参考素材,用记忆功能长期保持一贯的写作风格,并把请求自动路由到最合适的模型来处理。',
        keywords: ['AI 写作助手', 'AI 编辑工作流', '用 AI 做长文起草'],
      },
      eyebrow: '使用场景',
      title: '写作与编辑',
      summary:
        'ClawAI 中的写作和编辑工作,范围从一次简短的改写,到一篇必须从第一页到最后一页都保持一致的长文档。当文档变长时,主要靠两项功能支撑:用上下文包保存参考素材,用记忆功能让风格在多次会话之间持续保持。',
      sections: [
        {
          id: 'reference-material-with-context-packs',
          heading: '用上下文包让参考素材始终在场',
          paragraphs: [
            '一份风格简报、过去的草稿,或者一篇文章必须保持一致的原始素材,本质上首先是一个上下文问题,而不只是写作问题——ClawAI 的上下文包是一项受方案控制的功能,能让这些素材在整个对话中持续可用,而不用你每次会话都重新粘贴一遍。下方链接的"什么是上下文包"说明了这项功能具体如何运作。',
          ],
        },
        {
          id: 'memory-for-a-recurring-voice',
          heading: '用记忆功能保持一贯的语气',
          paragraphs: [
            '一项重复出现的写作任务——一份通讯、一篇周报、一套文档风格——会因为 ClawAI 能在多次会话之间记住已经确定的偏好而受益,不必每次都重新说明一遍。记忆是一项独立于上下文包的受方案控制功能:上下文包保存的是某项任务的参考素材,记忆保存的则是 ClawAI 了解到的、关于你希望内容如何呈现的偏好。',
          ],
        },
        {
          id: 'routing-a-writing-request',
          heading: '把写作请求路由到合适的模型',
          paragraphs: [
            '在 Auto 或 Cost Saver 路由模式下,ClawAI 的路由器可以自动把写作或编辑请求发送给合适的模型;对于已知风格要求的重复性任务,你也可以在 Manual Model 模式下直接指定一个。下方链接的"如何为写作和编辑选择模型"说明了主动选择时该权衡什么。',
          ],
        },
      ],
      faq: [
        {
          question: 'ClawAI 能在整个编辑过程中记住一份风格简报吗?',
          answer:
            '可以——上下文包正是为此而生,能让风格简报或源文档这类参考素材在对话中持续可用,而不用你反复粘贴。参见下方链接的"什么是上下文包"。',
        },
        {
          question: 'ClawAI 会记住我喜欢的写作方式吗?',
          answer:
            '记忆功能可以在多次会话之间保留一项重复性写作任务已经确定的偏好,这与上下文包是分开的——后者保存的是某项任务的参考素材,而不是长期偏好。',
        },
        {
          question: '写作任务该用哪种模型?',
          answer:
            '这个页面不会指定某一个——下方链接的"如何为写作和编辑选择模型"说明了该权衡什么,而不是给出一份排名。',
        },
      ],
      productNote:
        'ClawAI 可以用上下文包保存参考素材、用记忆功能保持一贯的写作风格——两者都是真实上线、受方案控制的功能,而不是聊天技巧。',
    },
    [UseCaseTask.COMPARING_MODEL_ANSWERS]: {
      seo: {
        title: '用 ClawAI 比较不同模型的答案',
        description:
          'ClawAI 的 Compare 和 Judge 模式如何让同一个提示在多个模型间并排运行,并由一个评判模型评估结果——所有说明都基于已上线的功能,不包含编造的排名。',
        keywords: ['比较 AI 模型答案', 'AI 模型共识', 'AI 多选优选'],
      },
      eyebrow: '使用场景',
      title: '比较不同模型的答案',
      summary:
        '有时候正确的做法不是提前选定一个模型,而是让同一个提示在多个模型间运行,再看看各自返回了什么。ClawAI 的 Compare 模式正是为此而生,Judge 模式还可以让另一个模型来评估这些结果,而不用你逐条自己阅读。',
      sections: [
        {
          id: 'what-compare-mode-does',
          heading: 'Compare 模式做什么',
          paragraphs: [
            'Compare 模式把同一个提示同时发送给多个模型,并把它们的回答并排展示,让一个重要的决定——一次判断、一个含糊不清的请求、一个某个模型的理解可能出错的场景——能得到不止一种视角。这是一项受方案控制的功能,按对比的通道而不是按单次运行计量,所以成本会随你比较的模型数量而变化。',
          ],
        },
        {
          id: 'consensus-and-best-of-n',
          heading: '说清楚共识和多选优选',
          paragraphs: [
            '拿到多个答案之后,有两种思路描述你接下来该怎么处理它们:共识,即模型之间达成一致这件事本身就有参考价值;以及多选优选,即生成多个候选答案,再挑选或综合出最佳的一个。下方链接的"什么是 AI 共识"和"什么是多选优选"分别说明了两者实际是如何运作的,而不是营销话术。',
          ],
        },
        {
          id: 'judge-mode-and-critic-review',
          heading: '让一个模型来评判其他模型',
          paragraphs: [
            'Judge 模式是一项独立的受方案控制功能,会对一次 Compare 运行的结果再执行一轮评估,由一个模型来评判其他模型的回答,而不用你逐条手动阅读。评审(Critic review)是一项相关但独立的功能,用于对单个答案再看一遍,而不是跨模型比较——下方链接的"什么是 AI 评判"说明了这项评估具体如何进行。',
          ],
        },
      ],
      faq: [
        {
          question: 'Compare 模式和 Judge 模式有什么区别?',
          answer:
            'Compare 模式把同一个提示发送给多个模型,并把每一个回答并排展示。Judge 模式是一项独立的、受方案控制的第二轮评估,由一个模型来评判 Compare 运行的结果,而不用你逐条阅读。',
        },
        {
          question: '使用 Compare 模式会比普通聊天消息更贵吗?',
          answer:
            'Compare 的用量是按通道计量的,而不是按单次运行——用更多模型运行同一个提示,成本会相应增加。具体额度请在定价页确认。',
        },
        {
          question: '什么是多选优选,它和共识是一回事吗?',
          answer:
            '不是——共识把多个模型答案之间的一致性本身视为有参考价值的信号,而多选优选是生成多个候选答案,再挑选或综合出最佳的一个。参见下方链接的"什么是 AI 共识"和"什么是多选优选"。',
        },
      ],
      productNote:
        'ClawAI 的 Compare 和 Judge 模式是真实上线、受方案控制的功能——同一个提示可以在多个模型间运行,还可以选择让另一个模型来评估结果。',
    },
    [UseCaseTask.WORKSPACE_AUTOMATION]: {
      seo: {
        title: '用 ClawAI 实现工作区自动化',
        description:
          'ClawAI 如何接入团队已经在用的工具——GitHub、Slack、Jira、Google Drive 等等——让请求可以在其中直接执行操作,而不只是谈论它们。',
        keywords: ['AI 工作区自动化', 'AI 工具连接器', '把 AI 接入 Slack 和 Jira'],
      },
      eyebrow: '使用场景',
      title: '工作区自动化',
      summary:
        '工作区连接器让 ClawAI 的请求能够读取或操作你团队已经在使用的工具,而不用你手动来回复制信息。ClawAI 目前有 14 个工作区连接器,涵盖代码托管、聊天沟通、项目跟踪、文档和日历。',
      sections: [
        {
          id: 'what-a-workspace-connector-is',
          heading: '工作区连接器实际做什么',
          paragraphs: [
            '接入的工作区让请求可以引用或操作该工具里的真实数据——一张 Jira 工单、一条 Slack 消息串、一份 Google Drive 里的文件——而不用你把内容粘贴进对话。工作区访问是一项受方案控制的功能,连接器的操作有自己独立于普通聊天的计量方式。',
          ],
        },
        {
          id: 'which-tools-connect',
          heading: 'ClawAI 能接入哪些工具',
          paragraphs: [
            'ClawAI 的连接器涵盖代码托管(GitHub、GitLab、Bitbucket)、消息与跟踪(Slack、Jira、Confluence、ClickUp)、设计(Figma)、文档与存储(Google Drive、Gmail、Microsoft SharePoint、Microsoft OneDrive)以及日历(Google Calendar、Outlook Calendar)。下方链接的集成页面说明了每一个连接器具体能做什么。',
          ],
        },
        {
          id: 'multi-model-review-and-handoff',
          heading: '工作区操作中的多模型审查与交接',
          paragraphs: [
            '一次工作区操作可能不止涉及一次模型调用——一次链式起草或交接步骤,或者在结果被采纳之前先经过多模型审查,都属于同一套计量范围的一部分,而不是需要你另外开启的独立功能。这与 ClawAI 其他地方使用的是同一套路由基础设施,只是应用到了涉及已连接工具的操作上。',
          ],
        },
      ],
      faq: [
        {
          question: 'ClawAI 能接入多少个工具?',
          answer:
            '目前有十四个工作区连接器,涵盖代码托管、消息沟通、项目跟踪、设计、文档、存储和日历。下方链接的集成页面列出了完整清单。',
        },
        {
          question: 'ClawAI 能在已连接的工具中执行操作,还是只能读取?',
          answer:
            '工作区操作可以在已连接的工具中执行操作,而不只是读取——具体能做什么取决于连接器本身和你方案中的工作区额度。',
        },
        {
          question: '工作区自动化是否与普通聊天分开计量?',
          answer:
            '是的——连接器操作有自己独立的用量计量方式,与普通聊天消息所消耗的 token 额度分开。具体额度请在定价页确认。',
        },
      ],
      productNote:
        'ClawAI 目前接入了 14 个工作区工具——涵盖代码托管、消息沟通、项目跟踪、设计、文档和日历——在其中执行操作有自己独立的计量方式。',
    },
    [UseCaseTask.STRUCTURED_DATA_EXTRACTION]: {
      seo: {
        title: '用 ClawAI 做结构化数据提取',
        description:
          'ClawAI 如何把杂乱的文本、文档和网页转换成结构化输出——用工具调用生成事先定义好的 JSON 结构,并用 Research 模式的提取深度从网页中拉取结构化内容。',
        keywords: ['AI 结构化数据提取', 'AI JSON 输出', '用 AI 从文本中提取数据'],
      },
      eyebrow: '使用场景',
      title: '结构化数据提取',
      summary:
        '把杂乱的文本、一份文档,或一个网页转换成你自己系统能够使用的确定结构,和写散文是不同性质的工作——它依赖工具调用生成固定结构,而当来源是网页时,还会用到 ClawAI Research 模式的提取深度。',
      sections: [
        {
          id: 'tool-calling-for-a-defined-schema',
          heading: '用工具调用生成定义好的输出结构',
          paragraphs: [
            '当一次请求需要输出符合特定形状——一组固定字段,一个定义好的 JSON 结构——ClawAI 的工具调用机制正是让这一点变得可靠的关键,而不是寄希望于一段纯文本答案恰好能被正确解析。下方链接的"AI 工具调用是如何工作的"和"什么是结构化 AI 输出"说明了这一机制具体是如何运作的。',
          ],
        },
        {
          id: 'extracting-from-a-web-page',
          heading: '从网页中提取结构化内容',
          paragraphs: [
            '当来源是一个实时网页,而不是你已经拥有的文本时,Research 模式的搜索加抓取并提取深度会从抓取到的内容中提取出结构化信息,这是用于带来源研究的同一项功能的一部分。它按研究用量计量,与普通聊天消息所消耗的 token 额度分开。',
          ],
        },
        {
          id: 'file-generation-for-the-output',
          heading: '把提取结果生成为文件',
          paragraphs: [
            '数据提取完成后,ClawAI 的文档与文件生成功能可以把它转换成一份可下载的文件,而不是只留在聊天记录里——这是它自己独立的计量范围,与普通聊天和研究功能都分开。',
          ],
        },
      ],
      faq: [
        {
          question: 'ClawAI 能保证输出有效的 JSON 吗?',
          answer:
            '用工具调用生成定义好的结构,是让结构化输出变得可靠的关键,而不是事后解析一段纯文本答案。这一机制详见下方链接的"AI 工具调用是如何工作的"。',
        },
        {
          question: 'ClawAI 能从网页中提取结构化数据,而不只是我粘贴的文本吗?',
          answer:
            '可以——Research 模式的搜索加抓取并提取深度会从它抓取的网页中提取出结构化内容,按研究用量计量,与普通聊天分开。',
        },
        {
          question: '提取结果能生成为文件,而不只是聊天中的文字吗?',
          answer:
            '可以——文档与文件生成功能可以把提取结果转换成一份可下载的文件,有它自己独立的计量方式。',
        },
      ],
      productNote:
        'ClawAI 用工具调用生成定义好的结构,并用 Research 模式的提取深度处理网页内容——这些都是支撑结构化数据提取的真实上线功能,而不是靠单条提示词取巧。',
    },
    [UseCaseTask.PRIVATE_AND_LOCAL_DEPLOYMENT]: {
      seo: {
        title: '用 ClawAI 做私有本地部署',
        description:
          'ClawAI 的 Local-Only 和 Privacy-First 路由模式如何借助 Ollama 和 llama.cpp 连接器,让请求留在你自己控制的硬件上,而不经过任何云端提供方。',
        keywords: ['私有 AI 部署', '本地 AI 工作负载', '在自有硬件上运行 AI 模型'],
      },
      eyebrow: '使用场景',
      title: '私有本地部署',
      summary:
        '有些工作必须留在你自己控制的硬件上,完全不能到达云端提供方。ClawAI 已经上线了对接 Ollama 和 llama.cpp 的连接器,专门用于这种场景,并配有能按策略、而不是靠意外把请求留在本地的路由模式。',
      sections: [
        {
          id: 'what-local-deployment-changes',
          heading: '在本地运行究竟改变了什么',
          paragraphs: [
            'ClawAI 目录中其他地方的云端提供方,是在自己的基础设施上运行模型并按请求收费;Ollama 和 llama.cpp 则不同,它们把一个开放权重模型加载到你自己控制的硬件上,请求因此不会离开这台硬件。这改变的是谁能够看到这个请求,而不是某个具体模型的能力上限。',
          ],
        },
        {
          id: 'local-only-and-privacy-first-routing',
          heading: 'Local-Only 和 Privacy-First 路由模式',
          paragraphs: [
            'Local-Only 路由让每一次请求都留在你控制的硬件上,使用 Ollama 或 llama.cpp,而不经过任何云端提供方。Privacy-First 路由是另一种独立模式,有它自己的优先级考量;这两种模式的存在,正是因为并非每种工作负载都应该默认走 Auto 路由,在两者之间做选择,是一个值得郑重决定的问题,而不是可以不假思索沿用的默认设置。',
          ],
        },
        {
          id: 'when-private-deployment-fits',
          heading: '什么情况适合私有或本地部署',
          paragraphs: [
            '私有或本地工作负载的界定标准是请求运行在哪里,而不是任务本身是什么类型——只要要求是任何内容都不能离开你自己控制的硬件,编码、写作或研究都可以用这种方式运行。下方链接的"如何为私有本地工作负载选择模型"和"什么是本地优先 AI"说明了其中需要权衡的取舍。',
          ],
        },
      ],
      faq: [
        {
          question: 'Local-Only 和 Privacy-First 路由有什么区别?',
          answer:
            'Local-Only 通过 Ollama 或 llama.cpp,让每一次请求都留在你控制的硬件上;Privacy-First 是另一种独立的路由模式,有它自己的优先级考量。两者的存在都是因为并非每种工作负载都应该默认走 Auto 路由。',
        },
        {
          question: '本地应该运行哪个开放权重模型?',
          answer:
            '这个页面不会推荐具体的模型——参见下方链接的"什么是本地优先 AI",了解该如何思考这个选择,因为合适的模型取决于你的硬件和任务。',
        },
        {
          question: '是不是所有任务都能在本地运行,还是只有某几类?',
          answer:
            '私有或本地工作负载的界定标准是请求运行在哪里,而不是任务本身——只要留在你控制的硬件上比任务类型更重要,编码、写作或研究都可以用这种方式运行。',
        },
      ],
      productNote:
        'ClawAI 的 Local-Only 和 Privacy-First 路由模式借助 Ollama 和 llama.cpp 连接器,让请求留在你自己控制的硬件上——这是真实上线的连接器,不是路线图上的计划项。',
    },
  },
};
