import { ComparisonDimension } from '@/enums/comparison-dimension.enum';
import { ComparisonRival } from '@/enums/comparison-rival.enum';
import type { ComparisonDictionary } from '@/types/public-comparison.types';

export const ZH_COMPARISON_CONTENT: ComparisonDictionary = {
  labels: {
    onThisPage: '本页内容',
    atAGlance: '一览',
    tableCaption: 'ClawAI 与 {rival} 的逐项能力对比',
    capabilityColumn: '能力',
    clawColumn: 'ClawAI',
    strengthTitle: '{rival} 的强项',
    differenceTitle: 'ClawAI 的不同做法',
    chooseTitle: '该选哪一个',
    chooseRivalLabel: '选择 {rival}，如果',
    chooseClawLabel: '选择 ClawAI，如果',
    faqTitle: '常见问题',
    lastReviewed: '基于公开信息对比，最近核对时间',
    independence:
      'ClawAI 是独立产品，与本页提及的任何助手均无隶属关系，未获其背书，也不代其转售。所有说法均取自各厂商在上述日期的公开文档，而这类产品变化很快——做决定前请查看厂商自己的页面。',
    otherComparisons: '将 ClawAI 与另一款助手对比',
    startFree: '从免费方案开始',
    seePricing: '查看价格',
  },
  hub: {
    eyebrow: '对比',
    intro:
      'ClawAI 并不打算做一个更好的单一助手。它把九大前沿模型家族放在同一份订阅之下，并把每条消息交给合适的那个。这些页面就用同样的八项能力，把这种做法与人们已在使用的助手逐一对照。',
    cardsTitle: '选择一款助手进行对比',
    cardCta: '与 {rival} 对比',
    coversTitle: '每篇对比涵盖什么',
    coversBody:
      '每页都是同样八项能力、同样顺序：模型选择、路由、并排回答、本地模型、自托管、记忆与文件、工作区连接器，以及每次回答的用量记录。对所有产品都问同样的问题，因此两页可以并排阅读。',
  },
  dimensionLabels: {
    [ComparisonDimension.MODEL_CHOICE]: '模型选择',
    [ComparisonDimension.ROUTING]: '路由',
    [ComparisonDimension.SIDE_BY_SIDE]: '并排回答',
    [ComparisonDimension.LOCAL_MODELS]: '本地与开源权重模型',
    [ComparisonDimension.SELF_HOSTING]: '自托管',
    [ComparisonDimension.MEMORY_AND_FILES]: '记忆与文件',
    [ComparisonDimension.CONNECTORS]: '工作区连接器',
    [ComparisonDimension.RECEIPTS]: '用量记录',
  },
  clawCells: {
    [ComparisonDimension.MODEL_CHOICE]: '一份订阅覆盖九大前沿模型家族',
    [ComparisonDimension.ROUTING]: '五种路由模式，含按消息自动路由',
    [ComparisonDimension.SIDE_BY_SIDE]: '同一条提示同时发给多个模型，回答并排呈现',
    [ComparisonDimension.LOCAL_MODELS]:
      '在你自己的 GPU 上运行开源权重模型，经由 Ollama 或 llama.cpp',
    [ComparisonDimension.SELF_HOSTING]: '整套系统跑在你的服务器上，源码在 GitHub',
    [ComparisonDimension.MEMORY_AND_FILES]: '跨对话保留的记忆，外加文件上下文',
    [ComparisonDimension.CONNECTORS]: '十二个工作区连接器',
    [ComparisonDimension.RECEIPTS]: '每次回答都记录所用模型、成本与消耗的额度',
  },
  rivals: {
    [ComparisonRival.CHATGPT]: {
      name: 'ChatGPT',
      vendor: 'OpenAI',
      eyebrow: 'ClawAI 与 ChatGPT 对比',
      intro:
        '多数人说「AI」时想到的就是 ChatGPT：打磨精良、响应迅速，背后是 OpenAI 自家的前沿模型。ClawAI 的形态不同：一份订阅既能触达 OpenAI 的模型，也能触达另外八个家族，并把每条消息交给合适的那个。',
      theirStrength:
        '一个做得极为出色的单一产品。语音、图像生成、代码执行与深度研究都内建其中并彼此协同，移动端应用出色，底层模型是前沿模型而非折中方案。',
      ourDifference:
        'ClawAI 不追求做更好的单一助手，而是把「只能用一家」的问题整个拿掉：同一段对话可以在 OpenAI、Anthropic、Google 及另外六个家族之间移动，在数据不能离开内网时落到本地开源权重模型，并记录是哪个模型作答。',
      chooseRival:
        '你想要一个打磨精良的助手，OpenAI 的模型几乎覆盖你的全部工作，而且内建的语音与图像工具对你很重要。',
      chooseClaw:
        '你经常撞到单一厂商的边界，希望第二个模型复核第一个，或者部分工作必须留在自己的硬件上。',
      cells: {
        [ComparisonDimension.MODEL_CHOICE]: '仅 OpenAI 模型',
        [ComparisonDimension.ROUTING]: '在 OpenAI 自家产品线内自动选择',
        [ComparisonDimension.SIDE_BY_SIDE]: '一次一个回答',
        [ComparisonDimension.LOCAL_MODELS]: '仅云端',
        [ComparisonDimension.SELF_HOSTING]: '不提供',
        [ComparisonDimension.MEMORY_AND_FILES]: '记忆、项目与文件上传',
        [ComparisonDimension.CONNECTORS]: '付费方案中的应用与连接器',
        [ComparisonDimension.RECEIPTS]: '方案层面的用量，无每次回答成本',
      },
      faq: [
        {
          question: 'ClawAI 能用与 ChatGPT 相同的 OpenAI 模型吗？',
          answer:
            'ClawAI 会路由到 OpenAI 的模型，它是模型清单中九个家族之一。无需注册 OpenAI 账号，也不必粘贴 API 密钥——模型访问权包含在订阅里。',
        },
        {
          question: 'ClawAI 是 ChatGPT 的客户端吗？',
          answer:
            '不是。ClawAI 是独立平台，拥有自己的路由、记忆、对比与编排层。OpenAI 只是它可以发送消息的供应商之一，而不是它的底座。',
        },
        {
          question: '我能在完全不向 OpenAI 发送任何内容的情况下使用 ClawAI 吗？',
          answer:
            '可以。把对话固定到本地开源权重模型，或者自托管整套系统、只运行自有 GPU 上的模型，完全不产生任何外部调用。',
        },
      ],
    },
    [ComparisonRival.CLAUDE]: {
      name: 'Claude',
      vendor: 'Anthropic',
      eyebrow: 'ClawAI 与 Claude 对比',
      intro:
        '当工作又长、又需要细致、又以书写为主时，很多人会转向 Claude。ClawAI 同样能触达 Anthropic 的模型——与另外八个家族并列——并且允许第二个模型复核第一个模型说了什么。',
      theirStrength:
        '对长文档的细致推理、业内最可靠的指令遵循，以及扎实的代码审查。项目、工件与 MCP 连接器让它成为持续书写工作的好去处。',
      ourDifference:
        'ClawAI 把 Anthropic 视为一个有力选项，而非唯一选项。同一线程可以把提示同时发给 Claude 和另外四个模型，让一个模型评判另一个模型的回答，并在某家供应商故障时自动切换。',
      chooseRival: '你的工作几乎都是长篇推理或代码审查，一个优秀模型就够用。',
      chooseClaw:
        '你既要 Claude 的回答也要第二意见，敏感工作需要本地模型，或者不想按厂商各订一份服务。',
      cells: {
        [ComparisonDimension.MODEL_CHOICE]: '仅 Anthropic 模型',
        [ComparisonDimension.ROUTING]: '由你自己挑选模型',
        [ComparisonDimension.SIDE_BY_SIDE]: '一次一个回答',
        [ComparisonDimension.LOCAL_MODELS]: '仅云端',
        [ComparisonDimension.SELF_HOSTING]: '不提供',
        [ComparisonDimension.MEMORY_AND_FILES]: '项目、文件与记忆',
        [ComparisonDimension.CONNECTORS]: 'MCP 连接器与桌面扩展',
        [ComparisonDimension.RECEIPTS]: '方案层面的用量，无每次回答成本',
      },
      faq: [
        {
          question: 'ClawAI 包含 Claude 模型吗？',
          answer:
            '包含。Anthropic 是清单中九个模型家族之一，任何对话都能使用，无需单独的 Anthropic 账号或密钥。',
        },
        {
          question: '一个模型能复核另一个模型的回答吗？',
          answer:
            '可以。Verify、Judge 与 Critic 会用第二个模型审视第一个模型的输出。这能降低「自信而错误」的风险，但不能消除——任何有后果的结论仍需人来把关。',
        },
        {
          question: 'ClawAI 与 Anthropic 有隶属关系吗？',
          answer:
            '没有。ClawAI 是独立的。它路由到 Anthropic 模型的方式与路由到其他八家供应商一样，既未获其背书，也不是其合作伙伴。',
        },
      ],
    },
    [ComparisonRival.GEMINI]: {
      name: 'Gemini',
      vendor: 'Google',
      eyebrow: 'ClawAI 与 Gemini 对比',
      intro:
        '如果你的文档就在 Google Workspace 里，Gemini 是离这些文档最近的助手。ClawAI 从另一端切入：对厂商保持中立，Google 的模型只是九个家族之一。',
      theirStrength:
        '极大的上下文窗口、对图像与音视频的原生处理、快速响应，以及与 Gmail、Drive 和 Docs 的深度整合——这是任何第三方都追不上的。',
      ourDifference:
        'ClawAI 既不绑定某个办公套件，也不绑定某家厂商的路线图。它连接十二种工作工具而非一种，按任务为每条消息选路，并可把敏感工作留在本地开源权重模型上。',
      chooseRival: '你的组织生活在 Google Workspace 中，希望助手就待在它里面。',
      chooseClaw:
        '你使用多家厂商的工具，想在投入前比较模型，或者需要一套完全不产生外部调用的部署。',
      cells: {
        [ComparisonDimension.MODEL_CHOICE]: '仅 Google 模型',
        [ComparisonDimension.ROUTING]: '在 Google 自家产品线内自动选择',
        [ComparisonDimension.SIDE_BY_SIDE]: '一次一个回答',
        [ComparisonDimension.LOCAL_MODELS]: '仅由 Google 托管',
        [ComparisonDimension.SELF_HOSTING]: '不提供',
        [ComparisonDimension.MEMORY_AND_FILES]: '文件、Drive 与 Workspace 上下文',
        [ComparisonDimension.CONNECTORS]: '深度 Google Workspace 整合',
        [ComparisonDimension.RECEIPTS]: '方案层面的用量，无每次回答成本',
      },
      faq: [
        {
          question: 'ClawAI 能使用 Gemini 模型吗？',
          answer: '可以。Google 是清单中九个模型家族之一，在同一份订阅下的任何对话中都可使用。',
        },
        {
          question: 'ClawAI 能连接 Google Workspace 吗？',
          answer:
            'ClawAI 提供十二个连接器，覆盖工单系统、聊天与文档。它与 Google 的整合是一个连接器而非第一方界面：跨厂商更宽，在 Google 内部更浅。',
        },
        {
          question: '超长文档用哪个更好？',
          answer:
            '两者都能胜任，Google 最大的上下文窗口也位居现有方案前列。ClawAI 的不同在于，你可以把同一份长文档发给两个模型，再比较各自的结论。',
        },
      ],
    },
    [ComparisonRival.PERPLEXITY]: {
      name: 'Perplexity',
      vendor: 'Perplexity AI',
      eyebrow: 'ClawAI 与 Perplexity 对比',
      intro:
        'Perplexity 围绕一件事构建：从实时网络回答问题并附上来源。ClawAI 围绕另一件事构建：把合适的模型放到你手头的工作上，研究也在其中。',
      theirStrength:
        '面向搜索型问题最贴合的产品。回答附带引用，追问能保持线索连贯，整个界面都是为了核对某个说法从何而来而设计的。',
      ourDifference:
        'ClawAI 是工作区，不是答案引擎。研究只是其中一种模式，与模型对比、持久记忆、文件上下文、编码代理和本地模型并列——而且每个回答都会记录生成它的模型。',
      chooseRival: '你的大多数问题是「现在什么是真的，是谁说的」。',
      chooseClaw:
        '研究只是工作的一部分，你还需要写代码、长文写作、模型对比，或者一个跑在自有硬件上的模型。',
      cells: {
        [ComparisonDimension.MODEL_CHOICE]: '较高方案中提供多家厂商的模型',
        [ComparisonDimension.ROUTING]: '按搜索与回答质量选择',
        [ComparisonDimension.SIDE_BY_SIDE]: '一次一个回答',
        [ComparisonDimension.LOCAL_MODELS]: '仅云端',
        [ComparisonDimension.SELF_HOSTING]: '不提供',
        [ComparisonDimension.MEMORY_AND_FILES]: '空间、线程与文件上传',
        [ComparisonDimension.CONNECTORS]: '商业方案中的连接器',
        [ComparisonDimension.RECEIPTS]: '方案层面的用量，无每次回答成本',
      },
      faq: [
        {
          question: 'ClawAI 会搜索网络吗？',
          answer:
            '会。研究会执行多步网络检索，并返回带来源的回答。它是工作区内的一项能力，而非整个产品。',
        },
        {
          question: '哪个引用做得更好？',
          answer:
            'Perplexity 专为带引用的回答而生，几乎为每条说法给出来源。ClawAI 会为其研究结果标注来源；但若是纯粹的「查找并引用」问题，专用答案引擎是更锋利的工具。',
        },
        {
          question: '两个能一起用吗？',
          answer:
            '很多人就是这么做的。真正该问的是：你要的是专用答案引擎、通用多模型工作区，还是两者都要。',
        },
      ],
    },
    [ComparisonRival.COPILOT]: {
      name: 'Microsoft Copilot',
      vendor: 'Microsoft',
      eyebrow: 'ClawAI 与 Microsoft Copilot 对比',
      intro:
        'Copilot 就是内嵌了助手的 Microsoft 365。ClawAI 是一个独立工作区，能触达九大模型家族，并可完全运行在你自己的服务器上。',
      theirStrength:
        '没有什么能像它这样贴近组织既有的 Microsoft 数据。Word、Excel、Outlook 与 Teams 的上下文无需配置即可到位，授权、租户与合规也沿用 IT 已经签下的 Microsoft 365 协议。',
      ourDifference:
        'ClawAI 对厂商中立，可部署在任何地方。它在九大模型家族之间选路，而不是使用单一供应商挑好的组合；它显示每次回答的成本；它可以带着开源权重模型装进你自己的网络，且不产生任何外部调用。',
      chooseRival: '你的组织跑在 Microsoft 365 上，价值就在于助手待在已有的文档里面。',
      chooseClaw: '你想要供应商选择权、可见的单次回答成本，或者一套永远不离开自有基础设施的部署。',
      cells: {
        [ComparisonDimension.MODEL_CHOICE]: 'OpenAI 模型加上 Microsoft 自研模型',
        [ComparisonDimension.ROUTING]: '由 Microsoft 按各入口选定',
        [ComparisonDimension.SIDE_BY_SIDE]: '一次一个回答',
        [ComparisonDimension.LOCAL_MODELS]: '仅云端',
        [ComparisonDimension.SELF_HOSTING]: '不提供',
        [ComparisonDimension.MEMORY_AND_FILES]: 'Microsoft 365 文件与组织上下文',
        [ComparisonDimension.CONNECTORS]: '最深的 Microsoft 365 整合',
        [ComparisonDimension.RECEIPTS]: '按席位授权，无每次回答成本',
      },
      faq: [
        {
          question: 'ClawAI 能部署在我们自己的网络里吗？',
          answer:
            '可以。整套系统跑在你的服务器上，使用你自有 GPU 上的开源权重模型，且不向外部供应商发起任何调用。这是一次范围明确的实施，而不是线上直接购买的方案。',
        },
        {
          question: 'ClawAI 能与 Microsoft 365 集成吗？',
          answer:
            'ClawAI 提供十二个连接器，覆盖工单系统、聊天与文档——跨厂商比 Copilot 更宽，在 Microsoft 自家应用内部则更浅。',
        },
        {
          question: '用量如何计费？',
          answer:
            '按成本归一化的 token 计入每日与每月额度，而不是按席位。每个回答都会显示模型、成本以及消耗的额度。',
        },
      ],
    },
    [ComparisonRival.KIMI]: {
      name: 'Kimi',
      vendor: 'Moonshot AI',
      eyebrow: 'ClawAI 与 Kimi 对比',
      intro:
        'Kimi 靠超长上下文建立了声誉，近来又公开了任何人都能下载并运行的开源权重。ClawAI 的形态不同：一份订阅既能触达 Kimi 这一类开源权重模型，也能触达另外八个家族，并把每条消息交给合适的那个。',
      theirStrength:
        '以低于多数西方前沿模型的价格读取长上下文，代理与工具调用表现扎实，旗舰产品线还公开了权重——同一个模型可以先在托管产品里评估，再放到你自己的硬件上运行。',
      ourDifference:
        'ClawAI 不要求你选定某一家实验室。成本或数据驻留要紧时，可以由开源权重模型作答；需要时再交给前沿模型；而路由决定会逐条记录，不必靠你自己记住。',
      chooseRival:
        '你的工作以超长文档为主，只用一家厂商也没问题，而且每 token 的价格是决定一切的那个数字。',
      chooseClaw:
        '你希望一部分消息享受开源权重的经济性、另一部分拿到前沿模型的质量，又不想为此维持两份订阅、每次还得手动决定。',
      cells: {
        [ComparisonDimension.MODEL_CHOICE]: '仅 Moonshot 模型',
        [ComparisonDimension.ROUTING]: '在 Moonshot 自家产品线内选择',
        [ComparisonDimension.SIDE_BY_SIDE]: '一次一个回答',
        [ComparisonDimension.LOCAL_MODELS]: '权重已公开，托管要你自己解决',
        [ComparisonDimension.SELF_HOSTING]: '权重可以，产品不行',
        [ComparisonDimension.MEMORY_AND_FILES]: '长上下文文件读取',
        [ComparisonDimension.CONNECTORS]: '自家应用之外很有限',
        [ComparisonDimension.RECEIPTS]: 'API 层面的用量，无每次回答成本',
      },
      faq: [
        {
          question: 'ClawAI 能使用 Kimi 模型吗？',
          answer:
            'ClawAI 通过自己的模型清单触达这一类开源权重模型，并可在你的 GPU 上本地运行。无需另行注册账号，也不必粘贴 API 密钥。',
        },
        {
          question: '自己运行开源权重会比订阅更便宜吗？',
          answer:
            '在持续的高用量下有可能，前提是 GPU 和运维时间都归你自己。ClawAI 面向的是中间那种情况：适合的消息用开源权重的经济性，不适合的交给前沿模型，合成一份账单。',
        },
        {
          question: '用本地模型时，我的数据会离开内网吗？',
          answer:
            '不会。把对话固定到本地开源权重模型，就不会有任何内容发往外部供应商。自托管整套系统则完全消除外部调用。',
        },
      ],
    },
    [ComparisonRival.QWEN]: {
      name: 'Qwen',
      vendor: 'Alibaba',
      eyebrow: 'ClawAI 与 Qwen 对比',
      intro:
        'Qwen 是现有最完整的开源权重家族之一：尺寸阶梯很宽，多语言覆盖扎实，大部分产品线还采用宽松许可。ClawAI 把这一类模型与另外八个家族一起放在同一份订阅之下。',
      theirStrength:
        '广度。尺寸从能在笔记本上跑的一直到需要服务器的，另有视觉与代码变体，在英语之外也确实好用，许可证还让商用自托管变得直截了当。',
      ourDifference:
        'ClawAI 是模型之上的那一层，而不是模型本身。它按消息选路，可以把同一个问题抛给多个家族并把回答并排呈现，在所有模型之间保留记忆与文件，并把这一切计入同一份额度。',
      chooseRival: '你要在模型之上做开发，希望自己掌控部署，并且有运维能力自行运行与更新它。',
      chooseClaw: '你想使用模型而不是运维模型，并希望在开源权重模型不够用时还能触达前沿模型。',
      cells: {
        [ComparisonDimension.MODEL_CHOICE]: '仅 Qwen 家族',
        [ComparisonDimension.ROUTING]: '由你自己挑选尺寸与变体',
        [ComparisonDimension.SIDE_BY_SIDE]: '不属于模型本身',
        [ComparisonDimension.LOCAL_MODELS]: '整条产品线都有开源权重',
        [ComparisonDimension.SELF_HOSTING]: '权重可以，产品不行',
        [ComparisonDimension.MEMORY_AND_FILES]: '取决于你自己搭的那一层',
        [ComparisonDimension.CONNECTORS]: '取决于你自己搭的那一层',
        [ComparisonDimension.RECEIPTS]: '由你自行埋点统计',
      },
      faq: [
        {
          question: '我能在 ClawAI 里运行开源权重模型吗？',
          answer:
            '可以。ClawAI 通过自己的运行时在本地运行开源权重模型，而且对话可以固定到其中一个，任何内容都不会离开你的网络。',
        },
        {
          question: '为什么用 ClawAI，而不是直接自己托管一个模型？',
          answer:
            '因为模型才是简单的那部分。路由、对比、记忆、文件处理、连接器、配额和每次回答的成本核算，才是你原本要自己搭的东西，而这些正是 ClawAI。',
        },
        {
          question: 'ClawAI 支持英语以外的语言吗？',
          answer:
            '产品界面提供十三种语言，而且模型是按消息选择的——需要多语言能力的消息可以交给多语言模型。',
        },
      ],
    },
    [ComparisonRival.GLM]: {
      name: 'GLM',
      vendor: 'Zhipu AI',
      eyebrow: 'ClawAI 与 GLM 对比',
      intro:
        'GLM 是 Zhipu 的前沿产品线，以远低于最大型西方模型的价格给出出色的编码与代理表现，大部分产品线还公开了权重。ClawAI 把这一类模型视为九个选项之一。',
      theirStrength:
        '价格与能力之比。编码与工具调用的结果接近贵得多的模型，发布节奏紧凑，公开的权重也让自托管成为真正可行的选项，而不只是一纸新闻稿。',
      ourDifference:
        'ClawAI 不会让你押注某一家实验室能一直领先。路由按消息进行，模型清单会在你脚下更新，因此让更便宜的模型承担更多工作只是一次配置调整，而不是一次迁移。',
      chooseRival:
        '每个可用回答的成本是决定一切的那个数字，你的工作以代码为主，而且愿意紧跟某一家实验室的发布节奏。',
      chooseClaw:
        '你希望这种经济性随时可用，却不必为此把所有工作都押上去，同时想留下究竟是哪个模型作答的记录。',
      cells: {
        [ComparisonDimension.MODEL_CHOICE]: '仅 Zhipu 模型',
        [ComparisonDimension.ROUTING]: '在 Zhipu 自家产品线内选择',
        [ComparisonDimension.SIDE_BY_SIDE]: '一次一个回答',
        [ComparisonDimension.LOCAL_MODELS]: '大部分产品线有开源权重',
        [ComparisonDimension.SELF_HOSTING]: '权重可以，产品不行',
        [ComparisonDimension.MEMORY_AND_FILES]: '自家应用内的文件上传',
        [ComparisonDimension.CONNECTORS]: '自家应用之外很有限',
        [ComparisonDimension.RECEIPTS]: 'API 层面的用量，无每次回答成本',
      },
      faq: [
        {
          question: 'ClawAI 会比直接使用低价模型更便宜吗？',
          answer:
            '按 token 算不会——直接调用最便宜的可用模型永远是价格底线。ClawAI 便宜在与现实的替代方案相比：要么订上好几份服务，要么自己搭路由、记忆与成本核算。',
        },
        {
          question: '我能让 ClawAI 偏向低成本模型吗？',
          answer:
            '可以。路由模式从完全自动到固定某个具体模型都有，其中考虑成本的模式会按消息在价格与能力之间权衡。',
        },
        {
          question: '我怎么知道是哪个模型作答的？',
          answer: '每个回答都带着供应商、模型、路由模式以及消耗的成本，路由决策本身也可以查看。',
        },
      ],
    },
    [ComparisonRival.DEEPSEEK]: {
      name: 'DeepSeek',
      vendor: 'DeepSeek',
      eyebrow: 'ClawAI 与 DeepSeek 对比',
      intro:
        'DeepSeek 改变了人们对推理模型价格的预期，并为旗舰产品线公开了权重。ClawAI 就是那一层：让这样的模型去做它擅长的工作，而不必成为你唯一的模型。',
      theirStrength:
        '推理与数学的价格颠覆了市场，旗舰产品线公开权重，研究姿态是发表而非暗示——你可以读到这些模型是怎么训练出来的。',
      ourDifference:
        'ClawAI 把选择权按消息保留下来。重推理的问题可以交给推理模型，例行的交给又便宜又快的，敏感的交给你自己硬件上的模型，而且这个决定是记录下来的，不是猜的。',
      chooseRival: '你的工作以困难推理为主，希望为此拿到最低价格，而且只用一家厂商也可以接受。',
      chooseClaw: '推理只是工作的一部分而非全部，而且你希望随时有第二个模型来复核第一个。',
      cells: {
        [ComparisonDimension.MODEL_CHOICE]: '仅 DeepSeek 模型',
        [ComparisonDimension.ROUTING]: '由你自己挑选对话或推理',
        [ComparisonDimension.SIDE_BY_SIDE]: '一次一个回答',
        [ComparisonDimension.LOCAL_MODELS]: '旗舰产品线有开源权重',
        [ComparisonDimension.SELF_HOSTING]: '权重可以，产品不行',
        [ComparisonDimension.MEMORY_AND_FILES]: '自家应用内的文件上传',
        [ComparisonDimension.CONNECTORS]: '自家应用之外很有限',
        [ComparisonDimension.RECEIPTS]: 'API 层面的用量，无每次回答成本',
      },
      faq: [
        {
          question: 'ClawAI 能只路由到推理模型吗？',
          answer:
            '可以。对话可以固定到某个具体模型，而且自动模式本来就会把重推理的消息发给适合它们的模型。',
        },
        {
          question: '我的数据在哪里处理？',
          answer:
            '在作答的那家供应商那里，回答会写明是哪一家。如果这一点对某项工作很重要，就把它固定到本地开源权重模型，或者自托管整套系统，任何内容都不会离开你的网络。',
        },
        {
          question: '我能就同一个问题比较两个模型吗？',
          answer:
            '可以。对比模式把同一条提示同时发给多个模型，并把回答并排呈现，还可以选做一次评判来打分。',
        },
      ],
    },
  },
};
