import { ModelProviderPage } from '@/enums/model-provider-page.enum';
import type { ModelsDictionary } from '@/types/models.types';

export const ZH_MODELS_CONTENT: ModelsDictionary = {
  labels: {
    onThisPage: '本页内容',
    faqTitle: '常见问题',
    relatedTitle: '接下来可以看看',
    lastReviewed: '最近更新',
    backToHub: '所有提供商',
    ctaTitle: '不必只听我们说,亲自试试看',
    ctaBody: 'ClawAI 会把对话路由到最合适的模型,覆盖下面每一家提供商,全部在一个工作区里完成。',
    startFree: '开始使用免费套餐',
    seeFeatures: '了解 ClawAI 能做什么',
    catalogHeading: 'ClawAI 可路由到的模型',
    costBandLabel: '费用等级',
    seePricing: '请在定价页确认实时目录',
    sourceLabel: '来源',
    costBandNames: {
      budget: '经济型',
      standard: '标准型',
      premium: '高级型',
      highest: '最高级',
    },
  },
  hub: {
    seo: {
      title: 'ClawAI 接入的 AI 模型提供商',
      description:
        'ClawAI 可以将对话路由到的每一家模型提供商——OpenAI、Anthropic、Google Gemini、DeepSeek、xAI Grok,以及本地开放权重模型——附带定性的费用等级,不包含任何编造的基准数据。',
      keywords: ['AI 模型提供商', 'ClawAI 支持哪些 AI 模型', '对比 AI 提供商'],
    },
    eyebrow: '模型提供商',
    title: 'ClawAI 背后的模型提供商',
    summary:
      'ClawAI 本身不构建模型——它会根据任务、成本或隐私需求,把你的对话路由到多家提供商中的某一个。本页列出了目前有实时适配器接入的提供商家族、各自的大致定位,以及一个定性的费用等级。本页不对它们进行排名,也不能替代你在确定套餐前查看实时目录。',
    topicsHeading: '选择一家提供商',
    cardSummaries: {
      [ModelProviderPage.OPENAI]: 'GPT-5、o3,以及 OpenAI 当前阵容中的其他模型。',
      [ModelProviderPage.ANTHROPIC]: 'Claude Opus、Sonnet 和 Haiku 家族。',
      [ModelProviderPage.GOOGLE]: 'Gemini 2.5 Pro、Flash 和 Flash-Lite。',
      [ModelProviderPage.DEEPSEEK]: 'DeepSeek Chat 和 DeepSeek Reasoner。',
      [ModelProviderPage.XAI]: 'xAI 的 Grok 4 和 Grok 3 mini。',
      [ModelProviderPage.LOCAL_AI]: '通过 Ollama 或 llama.cpp 自行运行的开放权重模型。',
    },
  },
  providers: {
    [ModelProviderPage.OPENAI]: {
      seo: {
        title: 'ClawAI 中的 OpenAI 模型——GPT-5、o3 等',
        description:
          'ClawAI 可以将对话路由到哪些 OpenAI 模型、每个模型各自适合什么场景,以及一个定性的费用等级评价。在选择套餐之前,请务必先到定价页面确认当前的实时模型目录。',
        keywords: ['ClawAI 中的 OpenAI 模型', 'ClawAI 里的 GPT-5', '该用哪个 OpenAI 模型'],
      },
      eyebrow: '模型提供商',
      title: 'OpenAI',
      summary:
        'ClawAI 已接入 OpenAI 的实时适配器,因此一次对话可以根据任务类型、费用等级和你的路由模式,被路由到多个 OpenAI 模型中的一个。本页列出了 ClawAI 目前能够触达的模型;它不能替代定价页上的实时目录。',
      sections: [
        {
          id: 'the-lineup',
          heading: 'OpenAI 阵容都包含什么',
          paragraphs: [
            'OpenAI 目前的阵容覆盖了一个旗舰级、兼顾推理与通用能力的层级(GPT-5)、一个更轻量的同系列产品(GPT-5 mini)、一个多模态通用模型(GPT-4o 和 GPT-4o mini),以及两个专门针对分步推理任务打造的模型(o3 和 o4-mini)。ClawAI 的路由器可以按每次请求在它们之间做选择,而不会把你整个账号固定绑死在某一个模型上。',
          ],
        },
        {
          id: 'when-openai-fits',
          heading: '什么情况下适合用 OpenAI 模型',
          paragraphs: [
            'OpenAI 模型是通用写作、编程辅助和日常问答的一个合理默认选择,而 o 系列模型是专门为多步推理问题打造的,这类问题需要模型逐步推导而不是直接给出答案。哪一个模型在你的任务上实际表现最好,值得你自己去验证——见下方“如何评估 AI 模型”——而不是仅凭宣传文案下结论,包括本页在内。',
          ],
        },
        {
          id: 'routing-and-cost',
          heading: 'ClawAI 如何路由到它',
          paragraphs: [
            'ClawAI 的路由器可以在自动路由或省钱路由模式下自动把请求发给某个 OpenAI 模型,你也可以在手动选择模型模式下固定使用某一个。下方的费用等级是定性的——更便宜的模型每次请求的成本确实明显更低,但具体费率随 OpenAI 自身的定价变化,而不受 ClawAI 控制。',
          ],
        },
      ],
      faq: [
        {
          question: 'ClawAI 与 OpenAI 有直接合作关系吗?',
          answer:
            '没有。ClawAI 接入 OpenAI 的公开 API,方式和任何持有 API 密钥的应用一样。本页不代表存在任何特殊安排。',
        },
        {
          question: '写代码该用哪个 OpenAI 模型?',
          answer:
            '这取决于具体任务和你所在的工作区——见下方链接的“如何评估 AI 模型”,那里提供的是一种方法,而不是单一的推荐结论。本页刻意不声称某个模型是最好的。',
        },
        {
          question: '我的套餐里是否始终能用 GPT-5?',
          answer:
            '模型是否可用由你的套餐和实时目录决定,而不是由本页决定。选择针对某个模型的套餐前,请在定价页确认当前阵容。',
        },
      ],
      productNote:
        'ClawAI 可以自动把请求路由到某个 OpenAI 模型,你也可以直接固定选用某一个——选择权在你手里,不会被锁定在单一供应商上。',
      catalogDisclaimer:
        '此列表反映的是截至上方审核日期,ClawAI 已定价的 OpenAI 模型,并非实时数据。模型可用性会发生变化。',
    },
    [ModelProviderPage.ANTHROPIC]: {
      seo: {
        title: 'ClawAI 中的 Anthropic Claude 模型',
        description:
          'ClawAI 可以将对话路由到的 Claude 模型——Opus、Sonnet 和 Haiku——各自的定位,以及一个定性的费用等级。选择套餐前请先确认实时目录。',
        keywords: [
          'ClawAI 中的 Claude 模型',
          'ClawAI 里的 Anthropic',
          'Claude Opus 与 Sonnet 与 Haiku 对比',
        ],
      },
      eyebrow: '模型提供商',
      title: 'Anthropic',
      summary:
        'ClawAI 已接入 Anthropic 的实时适配器,因此一次对话可以根据任务类型、费用等级和你的路由模式,被路由到某个 Claude 模型。本页列出了 ClawAI 目前能够触达的模型;它不能替代定价页上的实时目录。',
      sections: [
        {
          id: 'the-lineup',
          heading: 'Claude 阵容都包含什么',
          paragraphs: [
            'Anthropic 目前的阵容分为三个层级:处于顶端、为最复杂和最繁重任务打造的 Claude Opus 4;作为通用中间层级的 Claude Sonnet 4;以及为较简单请求提供的快速、低成本选项 Claude Haiku 4.5。ClawAI 的路由器可以按每次请求在它们之间切换。',
          ],
        },
        {
          id: 'when-anthropic-fits',
          heading: '什么情况下适合用 Claude 模型',
          paragraphs: [
            'Claude 模型常被用于长文档处理、需要细致逐步推进的写作,以及需要严格遵循详细指令的编程辅助任务。和任何提供商一样,某个具体任务该用哪个模型,值得你结合自己的实际工作负载去验证——见下方“如何解读 AI 基准测试”,了解一个已发布的数字能说明什么、不能说明什么。',
          ],
        },
        {
          id: 'routing-and-cost',
          heading: 'ClawAI 如何路由到它',
          paragraphs: [
            'ClawAI 的路由器可以在自动路由、高推理路由或省钱路由模式下自动把请求发给某个 Claude 模型,你也可以在手动选择模型模式下固定使用某一个。Anthropic 是本页中唯一一家单独公布缓存写入费率的提供商,这是一个计费细节,而不是能力上的差异——它不会改变模型能做什么。',
          ],
        },
      ],
      faq: [
        {
          question: 'Opus、Sonnet 和 Haiku 有什么区别?',
          answer:
            '它们是同一模型家族的三个费用与能力层级——Opus 是最高层级,Sonnet 是中间层级,Haiku 是最快、成本最低的层级。ClawAI 的路由器可以在它们之间自动选择,你也可以手动指定。',
        },
        {
          question: 'ClawAI 与 Anthropic 有直接合作关系吗?',
          answer: '没有。ClawAI 接入 Anthropic 的公开 API,方式和任何持有 API 密钥的应用一样。',
        },
        {
          question: '所有套餐都能使用 Claude Opus 4 吗?',
          answer:
            '模型是否可用由你的套餐和实时目录决定,而不是由本页决定。选择针对某个模型的套餐前,请在定价页确认当前阵容。',
        },
      ],
      productNote:
        'ClawAI 可以自动把请求路由到某个 Claude 模型,你也可以直接固定选用某一个——选择权在你手里,不会被锁定在单一供应商上。',
      catalogDisclaimer:
        '此列表反映的是截至上方审核日期,ClawAI 已定价的 Claude 模型,并非实时数据。模型可用性会发生变化。',
    },
    [ModelProviderPage.GOOGLE]: {
      seo: {
        title: 'ClawAI 中的 Google Gemini 模型',
        description:
          'ClawAI 可以将对话路由到的 Gemini 模型——2.5 Pro、Flash 和 Flash-Lite——各自的定位,以及一个定性的费用等级。选择套餐前请先确认实时目录。',
        keywords: ['ClawAI 中的 Gemini 模型', 'ClawAI 里的 Google AI', 'Gemini Pro 与 Flash 对比'],
      },
      eyebrow: '模型提供商',
      title: 'Google Gemini',
      summary:
        'ClawAI 已接入 Google Gemini 的实时适配器,因此一次对话可以根据任务类型、费用等级和你的路由模式,被路由到某个 Gemini 模型。本页列出了 ClawAI 目前能够触达的模型;它不能替代定价页上的实时目录。',
      sections: [
        {
          id: 'the-lineup',
          heading: 'Gemini 阵容都包含什么',
          paragraphs: [
            'Google 目前的阵容分为三个层级:面向最高要求请求的 Gemini 2.5 Pro、作为通用中间层级的 Gemini 2.5 Flash,以及快速、低成本的 Gemini 2.5 Flash-Lite。ClawAI 的路由器可以按每次请求在它们之间切换。',
          ],
        },
        {
          id: 'when-google-fits',
          heading: '什么情况下适合用 Gemini 模型',
          paragraphs: [
            'Gemini 模型常被用于需要处理大量原始材料的任务,因为这一系列的设计重点就是长上下文处理。某个具体层级是否适合你的实际工作负载,值得你自己去验证——见下方“如何评估 AI 模型”,那里提供的是一种可重复的方法,而不是一句笼统的断言。',
          ],
        },
        {
          id: 'routing-and-cost',
          heading: 'ClawAI 如何路由到它',
          paragraphs: [
            'ClawAI 的路由器可以在自动路由或省钱路由模式下自动把请求发给某个 Gemini 模型,你也可以在手动选择模型模式下固定使用某一个。Gemini 公布的定价在超过某个长上下文阈值后会上升,本页的费用等级并不尝试对此建模——单一的定性等级不足以精确表达一个分层费率,所以请把它当作一个起点,而不是账单。',
          ],
        },
      ],
      faq: [
        {
          question: 'ClawAI 与 Google 有直接合作关系吗?',
          answer: '没有。ClawAI 接入 Gemini API,方式和任何持有 API 密钥的应用一样。',
        },
        {
          question: '哪个 Gemini 模型最擅长处理长文档?',
          answer:
            '整个系列在各个层级上普遍都是为长上下文处理设计的;具体的上限和费用取决于具体模型和请求内容。请查看实时目录,而不要假设一个固定的数字。',
        },
        {
          question: '所有套餐都能使用 Gemini 2.5 Pro 吗?',
          answer:
            '模型是否可用由你的套餐和实时目录决定,而不是由本页决定。选择针对某个模型的套餐前,请在定价页确认当前阵容。',
        },
      ],
      productNote:
        'ClawAI 可以自动把请求路由到某个 Gemini 模型,你也可以直接固定选用某一个——选择权在你手里,不会被锁定在单一供应商上。',
      catalogDisclaimer:
        '此列表反映的是截至上方审核日期,ClawAI 已定价的 Gemini 模型,并非实时数据。模型可用性会发生变化。',
    },
    [ModelProviderPage.DEEPSEEK]: {
      seo: {
        title: 'ClawAI 中的 DeepSeek 模型',
        description:
          'ClawAI 可以将对话路由到的 DeepSeek 模型——DeepSeek Chat 和 DeepSeek Reasoner——各自的定位,以及一个定性的费用等级。选择套餐前请先确认实时目录。',
        keywords: [
          'ClawAI 中的 DeepSeek 模型',
          'ClawAI 里的 DeepSeek',
          'DeepSeek Chat 与 Reasoner 对比',
        ],
      },
      eyebrow: '模型提供商',
      title: 'DeepSeek',
      summary:
        'ClawAI 已接入 DeepSeek 的实时适配器,因此一次对话可以根据任务类型、费用等级和你的路由模式,被路由到某个 DeepSeek 模型。本页列出了 ClawAI 目前能够触达的模型;它不能替代定价页上的实时目录。',
      sections: [
        {
          id: 'the-lineup',
          heading: 'DeepSeek 阵容都包含什么',
          paragraphs: [
            'DeepSeek 目前的阵容包含两个模型:通用模型 DeepSeek Chat,以及专门为需要模型分步推导后再作答的任务打造的 DeepSeek Reasoner。两者的定价都明显低于本页其他多家提供商,这也是省钱路由模式更常选用 DeepSeek 的部分原因。',
          ],
        },
        {
          id: 'when-deepseek-fits',
          heading: '什么情况下适合用 DeepSeek 模型',
          paragraphs: [
            '当每次请求的成本比榨取最后一点能力更重要时,DeepSeek 是一个合理的选择,而 DeepSeek Reasoner 则专门适用于多步推理任务。和任何提供商一样,请结合自己的实际工作负载去验证,而不要凭一句笼统的说法下结论——见下方“如何解读 AI 基准测试”。',
          ],
        },
        {
          id: 'routing-and-cost',
          heading: 'ClawAI 如何路由到它',
          paragraphs: [
            'ClawAI 的路由器可以在省钱路由或自动路由模式下自动把请求发给某个 DeepSeek 模型,你也可以在手动选择模型模式下固定使用某一个。本页中两个 DeepSeek 模型都属于标准费用等级——相对于本站其他高级层级来说确实便宜不少,但本页并不因此声称一个精确费率。',
          ],
        },
      ],
      faq: [
        {
          question: 'DeepSeek 比其他提供商更便宜吗?',
          answer:
            '本页中两个 DeepSeek 模型都属于标准费用等级,通常低于其他提供商的高级层级模型——但具体价格随 DeepSeek 自己公布的费率变化,而不受本页控制。',
        },
        {
          question: 'DeepSeek Reasoner 是用来做什么的?',
          answer:
            '它是为需要模型分步推导后再给出答案的任务打造的,在设计意图上与其他提供商推出的推理专用模型类似。',
        },
        {
          question: 'ClawAI 与 DeepSeek 有直接合作关系吗?',
          answer: '没有。ClawAI 接入 DeepSeek 的公开 API,方式和任何持有 API 密钥的应用一样。',
        },
      ],
      productNote:
        'ClawAI 可以自动把请求路由到某个 DeepSeek 模型,你也可以直接固定选用某一个——选择权在你手里,不会被锁定在单一供应商上。',
      catalogDisclaimer:
        '此列表反映的是截至上方审核日期,ClawAI 已定价的 DeepSeek 模型,并非实时数据。模型可用性会发生变化。',
    },
    [ModelProviderPage.XAI]: {
      seo: {
        title: 'ClawAI 中的 xAI Grok 模型',
        description:
          'ClawAI 可以将对话路由到的 xAI Grok 模型——Grok 4 和 Grok 3 mini——各自的定位,以及一个定性的费用等级。选择套餐前请先确认实时目录。',
        keywords: ['ClawAI 中的 Grok 模型', 'ClawAI 里的 xAI', 'ClawAI 中的 Grok 4'],
      },
      eyebrow: '模型提供商',
      title: 'xAI',
      summary:
        'ClawAI 已接入 xAI 的实时适配器,因此一次对话可以根据任务类型、费用等级和你的路由模式,被路由到某个 Grok 模型。本页列出了 ClawAI 目前能够触达的模型;它不能替代定价页上的实时目录。',
      sections: [
        {
          id: 'the-lineup',
          heading: 'Grok 阵容都包含什么',
          paragraphs: [
            'xAI 目前通过 ClawAI 可用的阵容包含两个模型:能力更高的层级 Grok 4,以及更快、成本更低的 Grok 3 mini。ClawAI 的路由器可以按每次请求在它们之间切换。',
          ],
        },
        {
          id: 'when-xai-fits',
          heading: '什么情况下适合用 Grok 模型',
          paragraphs: [
            '在本页列出的各家提供商中,Grok 模型是一个合理的通用选择。哪一个在具体任务上表现最好,值得你自己去验证——见下方“如何评估 AI 模型”,那里提供的方法不依赖任何单一供应商的宣传内容。',
          ],
        },
        {
          id: 'routing-and-cost',
          heading: 'ClawAI 如何路由到它',
          paragraphs: [
            'ClawAI 的路由器可以在自动路由或省钱路由模式下自动把请求发给某个 Grok 模型,你也可以在手动选择模型模式下固定使用某一个。Grok 3 mini 在本页属于经济费用等级;Grok 4 属于高级费用等级。',
          ],
        },
      ],
      faq: [
        {
          question: 'ClawAI 与 xAI 有直接合作关系吗?',
          answer: '没有。ClawAI 接入 xAI 的公开 API,方式和任何持有 API 密钥的应用一样。',
        },
        {
          question: 'Grok 4 和 Grok 3 mini 有什么区别?',
          answer:
            '它们分别是同一模型家族中能力更高的层级,以及更快、成本更低的层级。ClawAI 的路由器可以在它们之间自动选择,你也可以手动指定。',
        },
        {
          question: '所有套餐都能使用 Grok 4 吗?',
          answer:
            '模型是否可用由你的套餐和实时目录决定,而不是由本页决定。选择针对某个模型的套餐前,请在定价页确认当前阵容。',
        },
      ],
      productNote:
        'ClawAI 可以自动把请求路由到某个 Grok 模型,你也可以直接固定选用某一个——选择权在你手里,不会被锁定在单一供应商上。',
      catalogDisclaimer:
        '此列表反映的是截至上方审核日期,ClawAI 已定价的 Grok 模型,并非实时数据。模型可用性会发生变化。',
    },
    [ModelProviderPage.LOCAL_AI]: {
      seo: {
        title: 'ClawAI 中的本地开放权重 AI 模型',
        description:
          '通过 ClawAI,用 Ollama 或 llama.cpp 自行运行开放权重模型,而不是把请求发送给云端提供商。这一机制是什么,以及它与本页其他云端提供商有何不同。',
        keywords: ['ClawAI 本地 AI 模型', 'ClawAI 中的 Ollama', '本地运行 AI 模型'],
      },
      eyebrow: '模型提供商',
      title: '本地 AI',
      summary:
        'ClawAI 已接入 Ollama 和 llama.cpp 的实时适配器,这是在你自己掌控的硬件上运行开放权重模型的两种方式,而不是把请求发送给云端提供商。与本系列其他页面不同,这里没有固定目录可列——这些模型是开放权重的,由你自己选择运行哪一个。',
      sections: [
        {
          id: 'what-changes',
          heading: '本地运行模型究竟改变了什么',
          paragraphs: [
            '本站的云端提供商在自己的基础设施上运行模型,并按请求收费。而 Ollama 和 llama.cpp 是把一个开放权重模型加载到你自己掌控的硬件上——你自己的电脑,或者你运营的服务器——这样请求就不会离开这台设备。这改变的是谁能看到这个请求,而不是模型的能力本身;本地运行的开放权重模型,和本系列其他页面列出的任何云端提供商都是不同性质的东西,不能简单地互相替代。',
          ],
        },
        {
          id: 'ollama-vs-llamacpp',
          heading: 'Ollama 和 llama.cpp 是两个不同的工具',
          paragraphs: [
            '两者都是 ClawAI 真实接入的适配器,但适用的场景不同——Ollama 的重点是用合理的默认设置轻松拉取和运行模型,而 llama.cpp 则以更繁琐的手动配置为代价,提供对模型运行方式更直接的控制。完整对比见下方链接的“Ollama 与 llama.cpp 对比”,这里不再重复。',
          ],
        },
        {
          id: 'choosing-a-model',
          heading: '该运行哪个开放权重模型',
          paragraphs: [
            '本页刻意不指名任何具体的开放权重模型,因为这个领域的变化速度超过了一个静态页面能够跟上的程度,一条过时的推荐比没有推荐更糟。下方链接的“什么是本地优先 AI”对开放权重模型,以及与云端提供商之间的取舍,做了比产品页面更深入的说明。',
          ],
        },
      ],
      faq: [
        {
          question: '通过 ClawAI 使用本地 AI 需要付费吗?',
          answer:
            'ClawAI 不会像对云端提供商那样,对本地运行的模型按 token 收费,因为这里并没有被计费的云端提供商——成本就是你本来就在使用的那部分硬件。具体套餐规则请在定价页确认。',
        },
        {
          question: '我该运行哪个开放权重模型?',
          answer:
            '本页不做推荐——见下方链接的“什么是本地优先 AI”,了解该如何思考这个选择,因为哪个模型合适取决于你的硬件和任务,这不是一个静态页面能够负责任地持续跟踪的。',
        },
        {
          question: '本地运行的模型能力比得上云端模型吗?',
          answer:
            '这完全取决于具体的开放权重模型和你的硬件,本页不会给出笼统的定论。见下方链接的“如何评估 AI 模型”,了解如何针对你自己的工作负载去检验。',
        },
      ],
      productNote:
        'ClawAI 的 Ollama 和 llama.cpp 适配器都是真实上线的连接器——仅本地路由模式会让每一次请求都留在你自己掌控的硬件上。',
      catalogDisclaimer:
        '这里刻意不指名任何具体模型——开放权重模型及其能力变化很快,由你自己选择运行哪些。本地模型的具体套餐规则请在定价页确认。',
    },
  },
};
