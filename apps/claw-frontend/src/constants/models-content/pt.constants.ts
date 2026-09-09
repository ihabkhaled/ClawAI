import { ModelProviderPage } from '@/enums/model-provider-page.enum';
import type { ModelsDictionary } from '@/types/models.types';

export const PT_MODELS_CONTENT: ModelsDictionary = {
  labels: {
    onThisPage: 'Nesta página',
    faqTitle: 'Perguntas frequentes',
    relatedTitle: 'A seguir',
    lastReviewed: 'Última revisão',
    backToHub: 'Todos os fornecedores',
    ctaTitle: 'Experimente em vez de confiar na nossa palavra',
    ctaBody:
      'A ClawAI encaminha uma conversa para o modelo mais adequado, entre todos os fornecedores abaixo, a partir de um único espaço de trabalho.',
    startFree: 'Começar no plano gratuito',
    seeFeatures: 'Ver o que a ClawAI faz',
    catalogHeading: 'Modelos para os quais a ClawAI pode encaminhar',
    costBandLabel: 'Faixa de custo',
    seePricing: 'Confirme o catálogo em tempo real na página de preços',
    sourceLabel: 'Fonte',
    costBandNames: {
      budget: 'Econômico',
      standard: 'Padrão',
      premium: 'Premium',
      highest: 'Mais alto',
    },
  },
  hub: {
    seo: {
      title: 'Fornecedores de modelos de IA conectados à ClawAI',
      description:
        'Todos os fornecedores de modelos para os quais a ClawAI pode encaminhar uma conversa — OpenAI, Anthropic, Google Gemini, DeepSeek, xAI Grok e modelos locais de pesos abertos — com faixas de custo qualitativas e nenhum benchmark inventado.',
      keywords: [
        'fornecedores de modelos de IA',
        'quais modelos de IA a ClawAI suporta',
        'comparar fornecedores de IA',
      ],
    },
    eyebrow: 'Fornecedores de modelos',
    title: 'Os fornecedores de modelos por trás da ClawAI',
    summary:
      'A ClawAI não constrói modelos — ela encaminha sua conversa para um, escolhido entre vários fornecedores conforme a tarefa, o custo ou a privacidade. Esta página nomeia as famílias de fornecedores com um conector ativo hoje, o que cada uma é geralmente conhecida por fazer, e uma faixa de custo qualitativa. Ela não os classifica, e não substitui a verificação do catálogo em tempo real antes de você escolher um plano.',
    topicsHeading: 'Escolha um fornecedor',
    cardSummaries: {
      [ModelProviderPage.OPENAI]: 'GPT-5, o3 e o restante da linha atual da OpenAI.',
      [ModelProviderPage.ANTHROPIC]: 'A família Claude Opus, Sonnet e Haiku.',
      [ModelProviderPage.GOOGLE]: 'Gemini 2.5 Pro, Flash e Flash-Lite.',
      [ModelProviderPage.DEEPSEEK]: 'DeepSeek Chat e DeepSeek Reasoner.',
      [ModelProviderPage.XAI]: 'Grok 4 e Grok 3 mini, da xAI.',
      [ModelProviderPage.LOCAL_AI]:
        'Modelos de pesos abertos que você mesmo executa, com Ollama ou llama.cpp.',
    },
  },
  providers: {
    [ModelProviderPage.OPENAI]: {
      seo: {
        title: 'Modelos da OpenAI na ClawAI — GPT-5, o3 e mais',
        description:
          'Os modelos da OpenAI para os quais a ClawAI pode encaminhar uma conversa, para que serve cada um, e uma faixa de custo qualitativa. Confirme o catálogo em tempo real antes de escolher um plano.',
        keywords: ['modelos OpenAI ClawAI', 'GPT-5 na ClawAI', 'qual modelo OpenAI usar'],
      },
      eyebrow: 'Fornecedor de modelos',
      title: 'OpenAI',
      summary:
        'A ClawAI tem um conector ativo com a OpenAI, então uma conversa pode ser encaminhada para um de vários modelos da OpenAI dependendo da tarefa, da sua faixa de custo e do seu modo de roteamento. Esta página nomeia os modelos que a ClawAI consegue alcançar hoje; ela não substitui o catálogo em tempo real na página de preços.',
      sections: [
        {
          id: 'the-lineup',
          heading: 'O que a linha da OpenAI cobre',
          paragraphs: [
            'A linha atual da OpenAI abrange um nível principal de raciocínio e uso geral (GPT-5), um irmão mais leve e rápido (GPT-5 mini), um generalista multimodal (GPT-4o e GPT-4o mini), e dois modelos construídos especificamente para tarefas de raciocínio passo a passo (o3 e o4-mini). O roteador da ClawAI pode escolher entre eles a cada requisição, em vez de comprometer toda a sua conta com um único modelo.',
          ],
        },
        {
          id: 'when-openai-fits',
          heading: 'Quando uma tarefa combina com um modelo da OpenAI',
          paragraphs: [
            'Os modelos da OpenAI são um padrão razoável para escrita de uso geral, assistência de código e perguntas e respostas do dia a dia, e os modelos da série o são construídos especificamente para problemas de raciocínio em várias etapas, nos quais se espera que o modelo trabalhe o problema em vez de responder de imediato. Qual deles realmente tem o melhor desempenho na sua tarefa é algo que vale a pena verificar você mesmo — veja como avaliar modelos de IA abaixo — em vez de confiar em texto de marketing, incluindo esta página.',
          ],
        },
        {
          id: 'routing-and-cost',
          heading: 'Como a ClawAI encaminha para ele',
          paragraphs: [
            'O roteador da ClawAI pode enviar uma requisição para um modelo da OpenAI automaticamente nos modos Automático ou Economia, ou você pode fixar um modelo específico no modo Modelo Manual. As faixas de custo abaixo são qualitativas — modelos mais baratos custam significativamente menos por requisição, mas a tarifa exata varia com a própria tabela de preços da OpenAI, não com algo que a ClawAI controla.',
          ],
        },
      ],
      faq: [
        {
          question: 'A ClawAI tem uma parceria direta com a OpenAI?',
          answer:
            'Não. A ClawAI se conecta à API pública da OpenAI da mesma forma que qualquer aplicação com uma chave de API faria. Esta página não implica nenhum acordo especial.',
        },
        {
          question: 'Qual modelo da OpenAI devo usar para programação?',
          answer:
            'Isso depende da tarefa e do espaço de trabalho em que você está — veja como avaliar modelos de IA, com link abaixo, para um método em vez de uma única recomendação. Esta página propositalmente não afirma que um modelo é o melhor.',
        },
        {
          question: 'O GPT-5 está sempre disponível no meu plano?',
          answer:
            'A disponibilidade dos modelos é definida pelo seu plano e pelo catálogo em tempo real, não por esta página. Confirme a linha atual na página de preços antes de escolher um plano para um modelo específico.',
        },
      ],
      productNote:
        'A ClawAI pode encaminhar uma requisição para um modelo da OpenAI automaticamente, ou você pode fixar um diretamente — a escolha é sua, sem ficar presa a um único fornecedor.',
      catalogDisclaimer:
        'Esta lista reflete os modelos da OpenAI que a ClawAI precificou até a data de revisão acima, não um feed em tempo real. A disponibilidade dos modelos muda.',
    },
    [ModelProviderPage.ANTHROPIC]: {
      seo: {
        title: 'Modelos Claude da Anthropic na ClawAI',
        description:
          'Os modelos Claude para os quais a ClawAI pode encaminhar uma conversa — Opus, Sonnet e Haiku — para que serve cada um, e uma faixa de custo qualitativa. Confirme o catálogo em tempo real antes de escolher um plano.',
        keywords: [
          'modelos Claude ClawAI',
          'Anthropic na ClawAI',
          'Claude Opus vs Sonnet vs Haiku',
        ],
      },
      eyebrow: 'Fornecedor de modelos',
      title: 'Anthropic',
      summary:
        'A ClawAI tem um conector ativo com a Anthropic, então uma conversa pode ser encaminhada para um modelo Claude dependendo da tarefa, da sua faixa de custo e do seu modo de roteamento. Esta página nomeia os modelos que a ClawAI consegue alcançar hoje; ela não substitui o catálogo em tempo real na página de preços.',
      sections: [
        {
          id: 'the-lineup',
          heading: 'O que a linha Claude cobre',
          paragraphs: [
            'A linha atual da Anthropic tem três níveis: Claude Opus 4 no topo, construído para as tarefas mais difíceis e complexas; Claude Sonnet 4 como o nível intermediário de uso geral; e Claude Haiku 4.5 como a opção rápida e de menor custo para requisições mais simples. O roteador da ClawAI pode alternar entre eles a cada requisição.',
          ],
        },
        {
          id: 'when-anthropic-fits',
          heading: 'Quando uma tarefa combina com um modelo Claude',
          paragraphs: [
            'Os modelos Claude são comumente usados para trabalho com documentos longos, escrita cuidadosa e passo a passo, e assistência de código quando seguir instruções detalhadas é importante. Como em qualquer fornecedor, o modelo certo para uma tarefa específica vale a pena verificar contra sua própria carga de trabalho — veja como ler benchmarks de IA abaixo para entender o que um número publicado realmente mostra e o que não mostra.',
          ],
        },
        {
          id: 'routing-and-cost',
          heading: 'Como a ClawAI encaminha para ele',
          paragraphs: [
            'O roteador da ClawAI pode enviar uma requisição para um modelo Claude automaticamente nos modos Automático, Raciocínio Elevado ou Economia, ou você pode fixar um modelo no modo Modelo Manual. A Anthropic é o único fornecedor desta lista que publica uma tarifa separada de escrita em cache, o que é um detalhe de cobrança e não uma diferença de capacidade — isso não muda o que o modelo consegue fazer.',
          ],
        },
      ],
      faq: [
        {
          question: 'Qual é a diferença entre Opus, Sonnet e Haiku?',
          answer:
            'São três níveis de custo e capacidade da mesma família de modelos — Opus é o nível mais alto, Sonnet o nível intermediário, Haiku o nível mais rápido e de menor custo. O roteador da ClawAI pode escolher entre eles, ou você pode escolher manualmente.',
        },
        {
          question: 'A ClawAI tem uma parceria direta com a Anthropic?',
          answer:
            'Não. A ClawAI se conecta à API pública da Anthropic da mesma forma que qualquer aplicação com uma chave de API faria.',
        },
        {
          question: 'O Claude Opus 4 está disponível em todos os planos?',
          answer:
            'A disponibilidade dos modelos é definida pelo seu plano e pelo catálogo em tempo real, não por esta página. Confirme a linha atual na página de preços antes de escolher um plano para um modelo específico.',
        },
      ],
      productNote:
        'A ClawAI pode encaminhar uma requisição para um modelo Claude automaticamente, ou você pode fixar um diretamente — a escolha é sua, sem ficar presa a um único fornecedor.',
      catalogDisclaimer:
        'Esta lista reflete os modelos Claude que a ClawAI precificou até a data de revisão acima, não um feed em tempo real. A disponibilidade dos modelos muda.',
    },
    [ModelProviderPage.GOOGLE]: {
      seo: {
        title: 'Modelos Google Gemini na ClawAI',
        description:
          'Os modelos Gemini para os quais a ClawAI pode encaminhar uma conversa — 2.5 Pro, Flash e Flash-Lite — para que serve cada um, e uma faixa de custo qualitativa. Confirme o catálogo em tempo real antes de escolher um plano.',
        keywords: ['modelos Gemini ClawAI', 'Google AI na ClawAI', 'Gemini Pro vs Flash'],
      },
      eyebrow: 'Fornecedor de modelos',
      title: 'Google Gemini',
      summary:
        'A ClawAI tem um conector ativo com o Google Gemini, então uma conversa pode ser encaminhada para um modelo Gemini dependendo da tarefa, da sua faixa de custo e do seu modo de roteamento. Esta página nomeia os modelos que a ClawAI consegue alcançar hoje; ela não substitui o catálogo em tempo real na página de preços.',
      sections: [
        {
          id: 'the-lineup',
          heading: 'O que a linha Gemini cobre',
          paragraphs: [
            'A linha atual do Google tem três níveis: Gemini 2.5 Pro para as requisições mais exigentes, Gemini 2.5 Flash como o nível intermediário de uso geral, e Gemini 2.5 Flash-Lite como a opção rápida e de menor custo. O roteador da ClawAI pode alternar entre eles a cada requisição.',
          ],
        },
        {
          id: 'when-google-fits',
          heading: 'Quando uma tarefa combina com um modelo Gemini',
          paragraphs: [
            'Os modelos Gemini costumam ser buscados para tarefas com uma grande quantidade de material de origem a processar, já que a família é construída em torno do tratamento de contexto longo. Se um determinado nível é a escolha certa para sua carga de trabalho específica vale a pena verificar por conta própria — veja como avaliar modelos de IA abaixo para um método repetível em vez de uma afirmação de uma linha.',
          ],
        },
        {
          id: 'routing-and-cost',
          heading: 'Como a ClawAI encaminha para ele',
          paragraphs: [
            'O roteador da ClawAI pode enviar uma requisição para um modelo Gemini automaticamente nos modos Automático ou Economia, ou você pode fixar um modelo no modo Modelo Manual. A tabela de preços publicada do Gemini sobe acima de um limite de contexto longo que a faixa de custo desta página não tenta modelar — uma única faixa qualitativa não é precisa o suficiente para expressar uma tarifa em camadas, então trate-a como um ponto de partida, não uma conta.',
          ],
        },
      ],
      faq: [
        {
          question: 'A ClawAI tem uma parceria direta com o Google?',
          answer:
            'Não. A ClawAI se conecta à API do Gemini da mesma forma que qualquer aplicação com uma chave de API faria.',
        },
        {
          question: 'Qual modelo Gemini lida melhor com documentos longos?',
          answer:
            'A família em geral é construída para tratamento de contexto longo em todos os níveis; o limite exato e o custo dependem do modelo e da requisição específicos. Consulte o catálogo em tempo real em vez de assumir um número fixo.',
        },
        {
          question: 'O Gemini 2.5 Pro está disponível em todos os planos?',
          answer:
            'A disponibilidade dos modelos é definida pelo seu plano e pelo catálogo em tempo real, não por esta página. Confirme a linha atual na página de preços antes de escolher um plano para um modelo específico.',
        },
      ],
      productNote:
        'A ClawAI pode encaminhar uma requisição para um modelo Gemini automaticamente, ou você pode fixar um diretamente — a escolha é sua, sem ficar presa a um único fornecedor.',
      catalogDisclaimer:
        'Esta lista reflete os modelos Gemini que a ClawAI precificou até a data de revisão acima, não um feed em tempo real. A disponibilidade dos modelos muda.',
    },
    [ModelProviderPage.DEEPSEEK]: {
      seo: {
        title: 'Modelos DeepSeek na ClawAI',
        description:
          'Os modelos DeepSeek para os quais a ClawAI pode encaminhar uma conversa — DeepSeek Chat e DeepSeek Reasoner — para que serve cada um, e uma faixa de custo qualitativa. Confirme o catálogo em tempo real antes de escolher um plano.',
        keywords: ['modelos DeepSeek ClawAI', 'DeepSeek na ClawAI', 'DeepSeek Chat vs Reasoner'],
      },
      eyebrow: 'Fornecedor de modelos',
      title: 'DeepSeek',
      summary:
        'A ClawAI tem um conector ativo com a DeepSeek, então uma conversa pode ser encaminhada para um modelo DeepSeek dependendo da tarefa, da sua faixa de custo e do seu modo de roteamento. Esta página nomeia os modelos que a ClawAI consegue alcançar hoje; ela não substitui o catálogo em tempo real na página de preços.',
      sections: [
        {
          id: 'the-lineup',
          heading: 'O que a linha DeepSeek cobre',
          paragraphs: [
            'A linha atual da DeepSeek tem dois modelos: DeepSeek Chat, um modelo de uso geral, e DeepSeek Reasoner, construído especificamente para tarefas em que se espera que o modelo trabalhe várias etapas antes de responder. Ambos são precificados bem abaixo de vários outros fornecedores desta página, o que é parte do motivo pelo qual o modo de roteamento Economia recorre à DeepSeek com mais frequência.',
          ],
        },
        {
          id: 'when-deepseek-fits',
          heading: 'Quando uma tarefa combina com um modelo DeepSeek',
          paragraphs: [
            'A DeepSeek é uma opção razoável quando o custo por requisição importa mais do que espremer o último incremento de capacidade, e o DeepSeek Reasoner especificamente para tarefas de raciocínio em várias etapas. Como em qualquer fornecedor, verifique contra sua própria carga de trabalho em vez de uma afirmação geral — veja como ler benchmarks de IA abaixo.',
          ],
        },
        {
          id: 'routing-and-cost',
          heading: 'Como a ClawAI encaminha para ele',
          paragraphs: [
            'O roteador da ClawAI pode enviar uma requisição para um modelo DeepSeek automaticamente nos modos Economia ou Automático, ou você pode fixar um modelo no modo Modelo Manual. Ambos os modelos DeepSeek se encaixam na faixa de custo padrão nesta página — genuinamente baratos em relação aos níveis premium em outras partes deste site, sem que esta página afirme uma tarifa exata.',
          ],
        },
      ],
      faq: [
        {
          question: 'A DeepSeek é mais barata do que outros fornecedores?',
          answer:
            'Ambos os modelos DeepSeek ficam na faixa de custo padrão aqui, geralmente mais baixa do que modelos de nível premium de outros fornecedores — mas o preço exato varia com as tarifas publicadas pela própria DeepSeek, não com esta página.',
        },
        {
          question: 'Para que serve o DeepSeek Reasoner?',
          answer:
            'Ele é construído para tarefas em que o modelo trabalha várias etapas antes de produzir uma resposta, com um propósito parecido com o dos modelos focados em raciocínio publicados por outros fornecedores.',
        },
        {
          question: 'A ClawAI tem uma parceria direta com a DeepSeek?',
          answer:
            'Não. A ClawAI se conecta à API pública da DeepSeek da mesma forma que qualquer aplicação com uma chave de API faria.',
        },
      ],
      productNote:
        'A ClawAI pode encaminhar uma requisição para um modelo DeepSeek automaticamente, ou você pode fixar um diretamente — a escolha é sua, sem ficar presa a um único fornecedor.',
      catalogDisclaimer:
        'Esta lista reflete os modelos DeepSeek que a ClawAI precificou até a data de revisão acima, não um feed em tempo real. A disponibilidade dos modelos muda.',
    },
    [ModelProviderPage.XAI]: {
      seo: {
        title: 'Modelos Grok da xAI na ClawAI',
        description:
          'Os modelos Grok, da xAI, para os quais a ClawAI pode encaminhar uma conversa — Grok 4 e Grok 3 mini — para que serve cada um, e uma faixa de custo qualitativa. Confirme o catálogo em tempo real antes de escolher um plano.',
        keywords: ['modelos Grok ClawAI', 'xAI na ClawAI', 'Grok 4 na ClawAI'],
      },
      eyebrow: 'Fornecedor de modelos',
      title: 'xAI',
      summary:
        'A ClawAI tem um conector ativo com a xAI, então uma conversa pode ser encaminhada para um modelo Grok dependendo da tarefa, da sua faixa de custo e do seu modo de roteamento. Esta página nomeia os modelos que a ClawAI consegue alcançar hoje; ela não substitui o catálogo em tempo real na página de preços.',
      sections: [
        {
          id: 'the-lineup',
          heading: 'O que a linha Grok cobre',
          paragraphs: [
            'A linha atual da xAI tem dois modelos disponíveis pela ClawAI: Grok 4, o nível de maior capacidade, e Grok 3 mini, uma opção mais rápida e de menor custo. O roteador da ClawAI pode alternar entre eles a cada requisição.',
          ],
        },
        {
          id: 'when-xai-fits',
          heading: 'Quando uma tarefa combina com um modelo Grok',
          paragraphs: [
            'Os modelos Grok são uma opção de uso geral razoável ao lado dos outros fornecedores desta página. Qual deles tem o melhor desempenho em uma tarefa específica vale a pena verificar você mesmo — veja como avaliar modelos de IA abaixo para um método que não depende do marketing de um único fornecedor.',
          ],
        },
        {
          id: 'routing-and-cost',
          heading: 'Como a ClawAI encaminha para ele',
          paragraphs: [
            'O roteador da ClawAI pode enviar uma requisição para um modelo Grok automaticamente nos modos Automático ou Economia, ou você pode fixar um modelo no modo Modelo Manual. O Grok 3 mini fica na faixa de custo econômica nesta página; o Grok 4 fica na faixa premium.',
          ],
        },
      ],
      faq: [
        {
          question: 'A ClawAI tem uma parceria direta com a xAI?',
          answer:
            'Não. A ClawAI se conecta à API pública da xAI da mesma forma que qualquer aplicação com uma chave de API faria.',
        },
        {
          question: 'Qual é a diferença entre o Grok 4 e o Grok 3 mini?',
          answer:
            'São um nível de maior capacidade e um nível mais rápido e de menor custo da mesma família de modelos. O roteador da ClawAI pode escolher entre eles, ou você pode escolher manualmente.',
        },
        {
          question: 'O Grok 4 está disponível em todos os planos?',
          answer:
            'A disponibilidade dos modelos é definida pelo seu plano e pelo catálogo em tempo real, não por esta página. Confirme a linha atual na página de preços antes de escolher um plano para um modelo específico.',
        },
      ],
      productNote:
        'A ClawAI pode encaminhar uma requisição para um modelo Grok automaticamente, ou você pode fixar um diretamente — a escolha é sua, sem ficar presa a um único fornecedor.',
      catalogDisclaimer:
        'Esta lista reflete os modelos Grok que a ClawAI precificou até a data de revisão acima, não um feed em tempo real. A disponibilidade dos modelos muda.',
    },
    [ModelProviderPage.LOCAL_AI]: {
      seo: {
        title: 'Modelos de IA locais de pesos abertos na ClawAI',
        description:
          'Execute você mesmo modelos de pesos abertos com Ollama ou llama.cpp através da ClawAI, em vez de enviar requisições a um fornecedor na nuvem. O mecanismo e como ele difere dos fornecedores em nuvem desta página.',
        keywords: [
          'modelos de IA locais ClawAI',
          'Ollama na ClawAI',
          'executar modelos de IA localmente',
        ],
      },
      eyebrow: 'Fornecedor de modelos',
      title: 'IA Local',
      summary:
        'A ClawAI tem conectores ativos com o Ollama e o llama.cpp, duas formas de executar um modelo de pesos abertos em hardware que você controla em vez de enviar uma requisição a um fornecedor na nuvem. Diferente das outras páginas deste conjunto, não há um catálogo fixo a nomear — os modelos são de pesos abertos e você escolhe quais executar.',
      sections: [
        {
          id: 'what-changes',
          heading: 'O que realmente muda ao executar um modelo localmente',
          paragraphs: [
            'Um fornecedor na nuvem, neste site, executa um modelo na sua própria infraestrutura e cobra por requisição. Já o Ollama e o llama.cpp carregam um modelo de pesos abertos em hardware que você controla — sua própria máquina, ou um servidor que você opera — de modo que a requisição nunca sai dele. Isso muda quem pode ver a requisição, não o que o modelo é capaz de fazer; um modelo de pesos abertos executado localmente é algo de natureza diferente de qualquer um dos fornecedores em nuvem listados em outras partes deste conjunto, não um substituto direto para um deles.',
          ],
        },
        {
          id: 'ollama-vs-llamacpp',
          heading: 'Ollama e llama.cpp são duas ferramentas diferentes',
          paragraphs: [
            'Ambos são conectores reais da ClawAI, mas servem a situações diferentes — o Ollama foca na facilidade de baixar e executar um modelo com configurações padrão sensatas, e o llama.cpp dá controle mais direto sobre como um modelo é executado, ao custo de uma configuração mais manual. A comparação completa está em Ollama vs llama.cpp, com link abaixo, em vez de ser repetida aqui.',
          ],
        },
        {
          id: 'choosing-a-model',
          heading: 'Escolhendo qual modelo de pesos abertos executar',
          paragraphs: [
            'Esta página propositalmente não nomeia nenhum modelo de pesos abertos específico, porque o campo se move mais rápido do que uma página estática consegue acompanhar, e uma recomendação desatualizada é pior do que nenhuma. O que é IA local-first, com link abaixo, explica os modelos de pesos abertos e o trade-off em relação aos fornecedores em nuvem com mais profundidade do que uma página de produto deveria.',
          ],
        },
      ],
      faq: [
        {
          question: 'A IA local custa alguma coisa através da ClawAI?',
          answer:
            'A ClawAI não cobra uma tarifa por token para um modelo executado localmente da forma que cobra de um fornecedor na nuvem, já que nenhum fornecedor na nuvem está sendo faturado — o custo é o hardware que você já opera. Confirme o comportamento atual do plano na página de preços.',
        },
        {
          question: 'Qual modelo de pesos abertos devo executar?',
          answer:
            'Esta página não recomenda nenhum — veja o que é IA local-first, com link abaixo, para saber como pensar sobre essa escolha, já que o modelo certo depende do seu hardware e da sua tarefa de um jeito que uma página estática não consegue acompanhar com responsabilidade.',
        },
        {
          question: 'Um modelo executado localmente é tão capaz quanto um modelo na nuvem?',
          answer:
            'Isso depende inteiramente do modelo de pesos abertos específico e do seu hardware, e esta página não fará uma afirmação genérica em nenhum sentido. Veja como avaliar modelos de IA, com link abaixo, para saber como verificar isso na sua própria carga de trabalho.',
        },
      ],
      productNote:
        'Os conectores Ollama e llama.cpp da ClawAI são conectores reais e já lançados — o modo de roteamento Somente Local mantém cada requisição em hardware que você controla.',
      catalogDisclaimer:
        'Nenhum modelo específico é citado aqui de propósito — os modelos de pesos abertos e suas capacidades mudam rapidamente, e você escolhe quais executar. Confirme o comportamento do plano para modelos locais na página de preços.',
    },
  },
};
