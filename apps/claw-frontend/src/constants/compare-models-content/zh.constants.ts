import { ModelFamilyPair } from '@/enums/model-family-pair.enum';
import type { CompareModelsDictionary } from '@/types/compare-models.types';

export const ZH_COMPARE_MODELS_CONTENT: CompareModelsDictionary = {
  labels: {
    onThisPage: '本页内容',
    faqTitle: '常见问题',
    relatedTitle: '接下来可以看看',
    lastReviewed: '最近更新',
    backToHub: '全部对比',
    ctaTitle: '不必只听我们说,亲自试试看',
    ctaBody: 'ClawAI 会在一个工作区里,把对话路由到与之匹配的模型,覆盖它接入的每一个提供方。',
    startFree: '从免费方案开始',
    seeFeatures: '了解 ClawAI 能做什么',
    seePricing: '在定价页确认实时模型目录',
  },
  hub: {
    seo: {
      title: 'ClawAI 如何在不同模型家族之间路由',
      description:
        'ClawAI 自己的路由器如何为一次具体请求,在两个提供方家族之间做出选择——权衡成本区间、上下文需求,以及请求是否必须留在你自己掌控的本地硬件上。不对具名产品排名,也不编造任何基准测试数据。',
      keywords: [
        'ClawAI 如何在模型提供方之间路由',
        '如何在不同模型家族之间选择',
        'OpenAI 与 Anthropic 与 Google 路由对比',
      ],
    },
    eyebrow: '模型路由',
    title: 'ClawAI 如何在不同模型家族之间路由',
    summary:
      '这个板块不会把 OpenAI、Anthropic、Google、DeepSeek 或 xAI 相互排名——那是与 ClawAI 路由器实际回答的问题完全不同的另一个问题。路由器真正做的事情,是针对一次具体的请求,决定把它发送给哪个家族,权衡的因素包括成本区间、这个请求需要多少上下文、这项工作是否必须留在你自己控制的硬件上,以及你选择了哪种路由模式。下面每个页面都会就某一对家族说明这种权衡,依据的始终是 ClawAI 自己的路由模式和模型目录里的定性成本区间,而不是任何基准分数。',
    pairsHeading: '选择一对家族',
    cardSummaries: {
      [ModelFamilyPair.OPENAI_VS_ANTHROPIC]:
        '路由器如何在 OpenAI 和 Anthropic 的目录之间权衡一次请求。',
      [ModelFamilyPair.OPENAI_VS_GOOGLE]: '路由器如何在 OpenAI 和 Google 的目录之间权衡一次请求。',
      [ModelFamilyPair.ANTHROPIC_VS_GOOGLE]:
        '路由器如何在 Anthropic 和 Google 的目录之间权衡一次请求。',
      [ModelFamilyPair.OPENAI_VS_DEEPSEEK]:
        '成本区间如何影响路由器在 OpenAI 和 DeepSeek 之间的选择。',
      [ModelFamilyPair.OPENAI_VS_XAI]: '路由器如何在 OpenAI 和 xAI 的目录之间权衡一次请求。',
      [ModelFamilyPair.CLOUD_VS_LOCAL]:
        '当请求必须留在你自己控制的硬件上,而不是交给任何云端提供方时,会发生什么变化。',
    },
  },
  pairs: {
    [ModelFamilyPair.OPENAI_VS_ANTHROPIC]: {
      seo: {
        title: 'OpenAI 与 Anthropic:ClawAI 如何在两者之间路由',
        description:
          'ClawAI 的路由器如何为一次请求在 OpenAI 和 Anthropic 的模型目录之间做选择——成本区间、推理模式适配,以及手动指定。不做胜负判断。选择方案前请先确认实时目录。',
        keywords: [
          'OpenAI 与 Anthropic 对比',
          'ClawAI 路由 OpenAI Anthropic',
          '如何在 OpenAI 和 Claude 模型之间选择',
        ],
      },
      eyebrow: '模型路由',
      title: 'OpenAI 与 Anthropic:ClawAI 如何在两者之间路由',
      summary:
        'OpenAI 和 Anthropic 各自发布的目录都跨越多个成本区间,从便宜、响应快的模型到面向更难问题的高级和顶级模型。这个页面不会把其中一家排在另一家之上——它说明的是,当一次请求两边的模型都可能胜任时,ClawAI 的路由器实际会权衡什么,以及你自己如何覆盖这个选择。',
      sections: [
        {
          id: 'cost-class-across-both-catalogs',
          heading: '成本区间横跨两家目录,而不是各占一个档位',
          paragraphs: [
            'ClawAI 的模型目录为每个已收录的模型标注的是定性的成本区间——经济、标准、高级或顶级——而不是精确价格。OpenAI 的目录从经济一直延伸到高级;Anthropic 的目录则从标准延伸到顶级区间。两家都不是独占最便宜或最昂贵的一端,所以一个基于成本的路由决定,必须看两边目录中具体有哪些可用模型,而不能假设某一家整体更便宜。',
          ],
        },
        {
          id: 'routing-modes-that-touch-this-pair',
          heading: '涉及这一对家族的路由模式',
          paragraphs: [
            '在 Auto 路由下,ClawAI 的路由器可以根据请求的需要,把它发送给任一目录中的模型。High Reasoning 路由偏好用于分步推演问题的模型,OpenAI 和 Anthropic 都发布了这类模型;Cost Saver 路由偏好较低成本区间的模型,这在两家目录中同样都存在。Manual Model 模式则让你直接指定任一厂商的具体模型——适用于一个反复出现、你已经清楚该用哪个模型的任务。',
          ],
        },
        {
          id: 'what-this-page-does-not-claim',
          heading: '这个页面不会做出的判断',
          paragraphs: [
            '本站没有任何页面会发布比较这两家厂商的基准分数或速度说法,这个页面也不例外。参见下方链接的"如何解读 AI 基准测试"和"如何评估 AI 模型",了解该如何针对自己的工作负载去检验适配度,而不是从任何地方——包括这个页面——照搬一个排名。',
          ],
        },
      ],
      faq: [
        {
          question: 'OpenAI 和 Anthropic 哪个更好?',
          answer:
            '这个页面不会给出答案——两家都发布了覆盖多个成本区间和使用场景的模型,也没有哪个可信的基准能对所有任务一锤定音。参见下方链接的"如何评估 AI 模型",了解一种可以用在自己工作负载上的方法。',
        },
        {
          question: 'ClawAI 的路由器会自动在 OpenAI 和 Anthropic 之间选择吗?',
          answer:
            '在 Auto、High Reasoning 或 Cost Saver 路由下会——路由器可以根据请求的需要,把它发送给任一目录中的模型。你也可以在 Manual Model 模式下直接指定任一厂商的具体模型。',
        },
        {
          question: '我能在同一个工作区里同时使用 OpenAI 和 Anthropic 的模型吗?',
          answer:
            '可以——ClawAI 把两者都作为独立的提供方接入,Auto 路由可以根据请求从任一方调用模型,你也可以在 Manual Model 模式下为不同任务分别指定各自的具体模型。',
        },
      ],
      productNote:
        'ClawAI 的 Auto 和 High Reasoning 路由可以针对一次请求,从 OpenAI 或 Anthropic 的目录中调用模型,你也可以在 Manual Model 模式下直接指定一个。',
      catalogDisclaimer:
        '模型的可用性和额度由你的方案与实时目录决定,而不是由这个页面决定。在选择围绕某个特定模型构建的方案之前,请先在定价页确认实时目录。',
    },
    [ModelFamilyPair.OPENAI_VS_GOOGLE]: {
      seo: {
        title: 'OpenAI 与 Google:ClawAI 如何在两者之间路由',
        description:
          'ClawAI 的路由器如何为一次请求在 OpenAI 和 Google 的模型目录之间做选择——成本区间、上下文需求,以及手动指定。不做胜负判断。选择方案前请先确认实时目录。',
        keywords: [
          'OpenAI 与 Google Gemini 对比',
          'ClawAI 路由 OpenAI Google',
          '如何在 OpenAI 和 Gemini 模型之间选择',
        ],
      },
      eyebrow: '模型路由',
      title: 'OpenAI 与 Google:ClawAI 如何在两者之间路由',
      summary:
        'OpenAI 和 Google Gemini 各自发布的目录都从便宜、响应快的模型一直延伸到高级区间。这个页面不会指名一个赢家——它说明的是,当一次请求两边的家族都可能胜任时,ClawAI 的路由器会权衡什么,以及如何覆盖这个选择。',
      sections: [
        {
          id: 'cost-class-and-catalog-shape',
          heading: '成本区间与目录结构',
          paragraphs: [
            'OpenAI 已收录的目录从经济区间延伸到高级区间;Google 的 Gemini 目录同样从经济延伸到高级,并且也有自己的低价档位。一个权衡成本区间的路由决定,必须看每个家族内具体哪个模型符合请求的预算,因为两家厂商发布的都是一个价格区间,而不是单一固定价位。',
          ],
        },
        {
          id: 'context-window-considerations',
          heading: '上下文窗口是模型层面的属性,不是厂商层面的属性',
          paragraphs: [
            '一个模型一次能容纳多少内容,取决于具体选择的模型,而不取决于它来自这两家厂商中的哪一家。参见下方链接的"什么是上下文窗口",了解这个限制意味着什么;如果一次请求需要对一份长文档或很长的对话历史进行推理,应该直接核实具体的限制,而不要假设某一家厂商的模型整体上上下文窗口更大。',
          ],
        },
        {
          id: 'how-clawai-routes-this-pair',
          heading: 'ClawAI 如何在这两者之间路由一次请求',
          paragraphs: [
            '在 Auto 路由下,ClawAI 的路由器可以把请求发送给任一目录中合适的模型。Cost Saver 路由偏好较低成本区间的模型,与来自这两家厂商中的哪一家无关。Manual Model 模式让你为一个适配已知的重复性任务,直接指定某个具体的 OpenAI 或 Google 模型。',
          ],
        },
      ],
      faq: [
        {
          question: 'OpenAI 和 Google Gemini 哪个更好?',
          answer:
            '这个页面不会给出答案——两家都发布了覆盖多个成本区间的模型,适配与否取决于具体任务。参见下方链接的"如何评估 AI 模型",了解一种可重复用在自己工作负载上的方法。',
        },
        {
          question: 'ClawAI 会在 OpenAI 和 Google 的模型之间自动路由吗?',
          answer:
            '在 Auto 或 Cost Saver 路由下,路由器可以把请求发送给任一目录中合适的模型。你也可以在 Manual Model 模式下直接指定任一厂商的具体模型。',
        },
        {
          question: '哪家的上下文窗口更大?',
          answer:
            '这取决于具体模型,而不是统一按厂商决定的。参见下方链接的"什么是上下文窗口",了解如何在依赖某个模型处理长文档或长对话之前先核实它的具体限制。',
        },
      ],
      productNote:
        'ClawAI 的 Auto 和 Cost Saver 路由可以针对一次请求,从 OpenAI 或 Google 的目录中调用模型,你也可以在 Manual Model 模式下直接指定一个。',
      catalogDisclaimer:
        '模型的可用性和额度由你的方案与实时目录决定,而不是由这个页面决定。在选择围绕某个特定模型构建的方案之前,请先在定价页确认实时目录。',
    },
    [ModelFamilyPair.ANTHROPIC_VS_GOOGLE]: {
      seo: {
        title: 'Anthropic 与 Google:ClawAI 如何在两者之间路由',
        description:
          'ClawAI 的路由器如何为一次请求在 Anthropic 和 Google 的模型目录之间做选择——成本区间、推理模式适配,以及手动指定。不做胜负判断。选择方案前请先确认实时目录。',
        keywords: [
          'Anthropic 与 Google Gemini 对比',
          'ClawAI 路由 Anthropic Google',
          '如何在 Claude 和 Gemini 模型之间选择',
        ],
      },
      eyebrow: '模型路由',
      title: 'Anthropic 与 Google:ClawAI 如何在两者之间路由',
      summary:
        'Anthropic 的目录从标准一直延伸到顶级成本区间;Google 的 Gemini 目录则从经济延伸到高级。这个页面说明的是这种结构差异对 ClawAI 路由器如何在两者之间做选择意味着什么——而不是哪一家更好。',
      sections: [
        {
          id: 'cost-tier-shape-differs',
          heading: '两家目录覆盖的成本区间并不相同',
          paragraphs: [
            'Anthropic 已收录的模型落在标准、高级和顶级成本区间,目前没有经济档位;Google 的 Gemini 目录则一直下探到经济档位。这种结构上的差异——而不是能力上的高低判断——是成本敏感的路由决定在权衡预算紧张与否时会考虑的一个因素。',
          ],
        },
        {
          id: 'reasoning-focused-models-in-both',
          heading: '两家目录都包含专注推理的模型',
          paragraphs: [
            'Anthropic 和 Google 至少都在各自目录中发布了一款专门用于分步推演问题、而不是立即作答的模型。ClawAI 的 High Reasoning 路由模式可以针对这类请求,从任一家族中选出合适的模型;具体调用哪一个,取决于可用性和请求的其他需求,而不是对某一家厂商的固定偏好。',
          ],
        },
        {
          id: 'overriding-the-router',
          heading: '自行覆盖路由器的选择',
          paragraphs: [
            'Manual Model 模式让你直接指定某个具体的 Anthropic 或 Google 模型——这适用于一个反复出现、你已经清楚该用哪个模型的任务,比如一套已有文档记录的工作流、一种已知的风格,或是某个特定的集成场景,而不必每次都交给自动路由。',
          ],
        },
      ],
      faq: [
        {
          question: 'Anthropic 和 Google Gemini 哪个更好?',
          answer:
            '这个页面不会指名一个——两家目录覆盖的成本区间不同,而且都包含专注推理的模型。参见下方链接的"如何评估 AI 模型",了解该如何针对自己的工作负载检验适配度。',
        },
        {
          question: 'ClawAI 的 High Reasoning 模式会偏向其中一家厂商吗?',
          answer:
            '没有固定偏好——High Reasoning 路由可以根据可用性和请求的需要,从任一目录中选出合适的模型。',
        },
        {
          question: '我能为某个特定的重复性任务固定使用 Claude 或 Gemini 模型吗?',
          answer:
            '可以——Manual Model 模式让你直接指定任一厂商的具体模型,一旦你清楚某个任务的适配情况,这就是一个合理的选择,而不必每次都依赖自动路由。',
        },
      ],
      productNote:
        'ClawAI 的 High Reasoning 路由可以从 Anthropic 或 Google 的目录中选出合适的模型,你也可以在 Manual Model 模式下直接指定一个。',
      catalogDisclaimer:
        '模型的可用性和额度由你的方案与实时目录决定,而不是由这个页面决定。在选择围绕某个特定模型构建的方案之前,请先在定价页确认实时目录。',
    },
    [ModelFamilyPair.OPENAI_VS_DEEPSEEK]: {
      seo: {
        title: 'OpenAI 与 DeepSeek:ClawAI 如何在两者之间路由',
        description:
          '成本区间如何影响 ClawAI 的路由器在 OpenAI 和 DeepSeek 目录之间的选择,以及 Cost Saver 路由和 Manual Model 模式如何适用于这一对。不做胜负判断。选择方案前请先确认实时目录。',
        keywords: [
          'OpenAI 与 DeepSeek 对比',
          'ClawAI 路由 OpenAI DeepSeek',
          'OpenAI 的更便宜替代模型',
        ],
      },
      eyebrow: '模型路由',
      title: 'OpenAI 与 DeepSeek:ClawAI 如何在两者之间路由',
      summary:
        'OpenAI 的目录从经济延伸到高级区间;DeepSeek 已收录的模型都落在标准成本区间。这个页面讲的是这种成本区间差异对两者之间的路由意味着什么,而不会判定哪一家更好。',
      sections: [
        {
          id: 'cost-class-is-the-headline-difference',
          heading: '成本区间是这两家目录之间最明显的区别',
          paragraphs: [
            'DeepSeek 已收录的两款模型——一款通用聊天模型和一款专注推理的模型——都落在 ClawAI 的标准成本区间。OpenAI 的目录覆盖范围更广,从经济档位一直到高级档位。对成本敏感的请求来说,DeepSeek 的目录是一个合理的起点,不过 OpenAI 自己经济档位的模型也落在同一成本区间,同样值得权衡——这里比较的是成本区间,而不是把整家厂商拿来比较。',
          ],
        },
        {
          id: 'cost-saver-routing',
          heading: 'ClawAI 的 Cost Saver 路由模式',
          paragraphs: [
            'Cost Saver 是 ClawAI 七种路由模式之一,专门用于在请求不需要高级模型时,优先选择较低成本区间的模型。它可以进入任一目录,依据的是在那个成本区间里哪个模型真正适合这次请求,而不是默认指名某一家厂商。',
          ],
        },
        {
          id: 'reasoning-focused-option-in-both',
          heading: '两家目录都提供专注推理的选项',
          paragraphs: [
            'DeepSeek 发布了一款专门为分步推演问题而构建的模型,与它的通用聊天模型同属标准成本区间;OpenAI 则在标准和高级档位都发布了专注推理的模型。High Reasoning 路由可以调用任一款,而哪一款更适合某个具体的多步骤任务,值得直接核实,而不是仅凭成本区间去推断。',
          ],
        },
      ],
      faq: [
        {
          question: 'DeepSeek 是比 OpenAI 更便宜的替代选择吗?',
          answer:
            'DeepSeek 已收录的模型落在 ClawAI 的标准成本区间,而 OpenAI 也发布了经济和标准档位的模型——所以公平的比较应该按成本区间进行,而不是按厂商整体比较。具体模型的当前价格请在定价页确认。',
        },
        {
          question: 'ClawAI 的 Cost Saver 模式会偏好 DeepSeek 吗?',
          answer:
            '没有固定偏好——Cost Saver 路由会从任一目录中,选择符合该请求较低成本区间要求的可用模型。',
        },
        {
          question: 'DeepSeek 有和 OpenAI 类似的专注推理模型吗?',
          answer:
            '有——DeepSeek 发布了一款专门用于分步推演问题的模型,与它的通用聊天模型同属一个成本区间。OpenAI 也发布了专注推理的模型,分布在更宽的成本区间内。',
        },
      ],
      productNote:
        'ClawAI 的 Cost Saver 路由可以从 OpenAI 或 DeepSeek 的目录中,选出较低成本区间且合适的模型,你也可以在 Manual Model 模式下直接指定一个。',
      catalogDisclaimer:
        '模型的可用性和额度由你的方案与实时目录决定,而不是由这个页面决定。在选择围绕某个特定模型构建的方案之前,请先在定价页确认实时目录。',
    },
    [ModelFamilyPair.OPENAI_VS_XAI]: {
      seo: {
        title: 'OpenAI 与 xAI:ClawAI 如何在两者之间路由',
        description:
          'ClawAI 的路由器如何为一次具体请求,在 OpenAI 和 xAI 的 Grok 模型目录之间做出选择——权衡成本区间与手动指定模型。不做任何胜负判断。选择方案前,请先确认实时模型目录。',
        keywords: [
          'OpenAI 与 xAI Grok 对比',
          'ClawAI 路由 OpenAI xAI',
          '如何在 GPT 和 Grok 模型之间选择',
        ],
      },
      eyebrow: '模型路由',
      title: 'OpenAI 与 xAI:ClawAI 如何在两者之间路由',
      summary:
        'OpenAI 的目录从经济延伸到高级区间;ClawAI 中 xAI 的 Grok 目录同样从经济延伸到高级,只是已收录的模型总数更少。这个页面说明 ClawAI 的路由器在两者之间会权衡什么,不会指名哪一家更好。',
      sections: [
        {
          id: 'catalog-size-and-cost-class',
          heading: '目录规模小,不代表成本区间窄',
          paragraphs: [
            'ClawAI 中 xAI 已收录的目录比 OpenAI 小——两款模型对 OpenAI 的六款——但依然涵盖了一个经济档位和一个高级档位的模型,与 OpenAI 目录两端所覆盖的成本区间范围相同。两者之间的路由决定,权衡的是具体模型的成本区间与请求预算是否匹配,而不是哪家厂商的目录更大。',
          ],
        },
        {
          id: 'how-clawai-routes-this-pair',
          heading: 'ClawAI 如何在这两者之间路由一次请求',
          paragraphs: [
            '在 Auto 路由下,ClawAI 的路由器可以把请求发送给任一目录中合适的模型。Cost Saver 路由偏好成本区间更低的选项,与厂商无关。如果你已经清楚某个任务需要哪个模型,Manual Model 模式可以让你直接指定某个具体的 OpenAI 或 xAI 模型。',
          ],
        },
        {
          id: 'what-this-page-does-not-claim',
          heading: '这个页面不会做出的判断',
          paragraphs: [
            '这个页面不会对这两家厂商做出任何速度说法或能力排名——本站没有任何页面会这样做。参见下方链接的"如何评估 AI 模型",了解该如何针对自己的工作负载去检验适配度。',
          ],
        },
      ],
      faq: [
        {
          question: 'OpenAI 和 xAI 的 Grok 哪个更好?',
          answer:
            '这个页面不会给出答案——两家发布的模型覆盖相近的成本区间范围,也没有哪个可信的基准能对所有任务一锤定音。参见下方链接的"如何评估 AI 模型"。',
        },
        {
          question: 'ClawAI 会在 OpenAI 和 xAI 的模型之间自动路由吗?',
          answer:
            '在 Auto 或 Cost Saver 路由下会——路由器可以把请求发送给任一目录中合适的模型。你也可以在 Manual Model 模式下直接指定任一厂商的具体模型。',
        },
        {
          question: 'xAI 在 ClawAI 目录中的模型数量和 OpenAI 一样多吗?',
          answer:
            '不一样——xAI 已收录的目录更小,两款模型对 OpenAI 的六款,不过它覆盖的成本区间范围依然相近。请在定价页确认实时目录。',
        },
      ],
      productNote:
        'ClawAI 的 Auto 和 Cost Saver 路由可以针对一次请求,从 OpenAI 或 xAI 的目录中调用模型,你也可以在 Manual Model 模式下直接指定一个。',
      catalogDisclaimer:
        '模型的可用性和额度由你的方案与实时目录决定,而不是由这个页面决定。在选择围绕某个特定模型构建的方案之前,请先在定价页确认实时目录。',
    },
    [ModelFamilyPair.CLOUD_VS_LOCAL]: {
      seo: {
        title: '云端与本地:ClawAI 如何在两者之间路由',
        description:
          '当一次请求留在你自己控制的硬件上,而不是交给云端提供方时,会发生哪些变化,以及 ClawAI 的 Local-Only 和 Privacy-First 路由模式如何适配这种选择。不做胜负判断。选择方案前请先确认实时目录。',
        keywords: [
          '云端 AI 与本地 AI 对比',
          'ClawAI Local-Only 路由',
          '什么时候该在本地而非云端运行模型',
        ],
      },
      eyebrow: '模型路由',
      title: '云端与本地:ClawAI 如何在两者之间路由',
      summary:
        '这是这个板块里唯一一对不是按厂商划分、而是按请求运行在哪里划分的组合。ClawAI 接入的每一个云端家族——OpenAI、Anthropic、Google、DeepSeek、xAI——都是在自己的基础设施上运行模型;Ollama 和 llama.cpp 则是在你自己控制的硬件上运行一个开放权重模型。这个页面说明这会改变什么,以及在 ClawAI 自身本地优先的设计下,路由器如何看待这个选择。',
      sections: [
        {
          id: 'what-changes-when-a-request-stays-local',
          heading: '请求留在本地时,究竟改变了什么',
          paragraphs: [
            '云端提供方是在自己的基础设施上运行模型并按请求计费;Ollama 和 llama.cpp 则不同,它们把一个开放权重模型加载到你自己控制的硬件上,请求因此完全不会到达任何云端提供方。这改变的是谁能够看到这个请求,而不是某个具体模型的能力——完整机制参见模型提供方页面中的"本地 AI"部分。',
          ],
        },
        {
          id: 'local-only-and-privacy-first-routing',
          heading: 'ClawAI 的 Local-Only 和 Privacy-First 路由模式正是为此而生',
          paragraphs: [
            'Local-Only 路由让每一次请求都留在你控制的硬件上,通过 Ollama 或 llama.cpp 运行,完全不经过这个板块涉及的五个云端家族中的任何一个。Privacy-First 路由是另一种独立的模式,有它自己的优先级考量。这两种模式的存在,正是因为并非每种工作负载都应该默认走可以调用任何已接入提供方(无论云端还是本地)的 Auto 路由。',
          ],
        },
        {
          id: 'when-a-workload-should-stay-local',
          heading: '什么时候一项工作负载适合留在本地',
          paragraphs: [
            '当要求是请求绝不能离开你控制的硬件时——比如合规边界、客户保密要求,或者仅仅是不想把某些数据发给任何外部厂商——一次请求就是使用 Local-Only 或 Privacy-First 路由的合理候选。参见下方链接的"什么是本地优先 AI",了解该如何权衡自行运行开放权重模型与使用云端提供方目录之间的取舍。',
          ],
        },
      ],
      faq: [
        {
          question: '本地模型的能力和云端模型一样吗?',
          answer:
            '这个页面不会对它们排名——能力取决于你选择运行的具体开放权重模型,这是你自己的决定,而不是这个页面能够负责任地给出的一个固定比较。参见下方链接的"什么是本地优先 AI"。',
        },
        {
          question: 'ClawAI 如何决定是否让请求留在本地?',
          answer:
            '默认情况下它不会替你做这个决定——Local-Only 路由让每一次请求都留在你控制的硬件上,Privacy-First 路由则套用它自己的优先级考量;Auto 路由可以调用任何已接入的提供方,无论云端还是本地。使用哪种模式,由你自己为工作区或每次请求选择。',
        },
        {
          question: '通过 ClawAI 在本地运行模型需要付费吗?',
          answer:
            'ClawAI 不会像对云端提供方那样,对本地运行的模型按 token 收取费用,因为这里并没有需要付费的云端提供方——成本就是你已经拥有的那台硬件本身。具体的方案行为请在定价页确认。',
        },
      ],
      productNote:
        'ClawAI 的 Local-Only 路由模式通过 Ollama 或 llama.cpp,让每一次请求都留在你控制的硬件上——这是一个已经正式上线的连接器,而不是路线图上的计划项——同时还有 Privacy-First 路由适用于另一套优先级考量。',
      catalogDisclaimer:
        '这里特意不对任何具体的云端或本地模型排名——开放权重模型和每一家云端目录都各自按自己的节奏变化,运行或接入哪一个由你自己决定。本地工作负载的具体方案行为,请在定价页确认。',
    },
  },
};
