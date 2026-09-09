import { ModelFamilyPair } from '@/enums/model-family-pair.enum';
import type { CompareModelsDictionary } from '@/types/compare-models.types';

export const PT_COMPARE_MODELS_CONTENT: CompareModelsDictionary = {
  labels: {
    onThisPage: 'Nesta página',
    faqTitle: 'Perguntas frequentes',
    relatedTitle: 'Para onde ir a seguir',
    lastReviewed: 'Última revisão',
    backToHub: 'Todos os pares',
    ctaTitle: 'Experimente em vez de confiar apenas na nossa palavra',
    ctaBody:
      'A ClawAI direciona uma conversa para o modelo adequado a ela, entre todos os provedores a que se conecta, a partir de um único espaço de trabalho.',
    startFree: 'Comece no plano gratuito',
    seeFeatures: 'Veja o que a ClawAI faz',
    seePricing: 'Confirme o catálogo em tempo real na página de preços',
  },
  hub: {
    seo: {
      title: 'Como a ClawAI direciona pedidos entre famílias de modelos',
      description:
        'Como o próprio router da ClawAI escolhe entre duas famílias de provedores para um determinado pedido — classe de custo, necessidades de contexto e se um pedido deve permanecer local. Sem rankings entre produtos nomeados, sem benchmarks inventados.',
      keywords: [
        'como a ClawAI direciona pedidos entre provedores de modelos',
        'escolher entre famílias de modelos de IA',
        'routing OpenAI vs Anthropic vs Google',
      ],
    },
    eyebrow: 'Routing de modelos',
    title: 'Como a ClawAI direciona pedidos entre famílias de modelos',
    summary:
      'Este hub não classifica OpenAI, Anthropic, Google, DeepSeek ou xAI uns em relação aos outros — essa é uma pergunta diferente da que o router da ClawAI de facto responde. O que o router faz é escolher, para um determinado pedido, para qual família enviar esse pedido, ponderando a classe de custo, quanto contexto o pedido precisa, se a carga de trabalho tem de permanecer em hardware sob o seu controle, e qual o modo de routing selecionado. Cada página abaixo explica essa escolha para um par de famílias, com base nos próprios modos de routing da ClawAI e nas faixas de custo qualitativas do seu catálogo de modelos, nunca numa pontuação de benchmark.',
    pairsHeading: 'Escolha um par',
    cardSummaries: {
      [ModelFamilyPair.OPENAI_VS_ANTHROPIC]:
        'Como o router pondera um pedido entre os catálogos da OpenAI e da Anthropic.',
      [ModelFamilyPair.OPENAI_VS_GOOGLE]:
        'Como o router pondera um pedido entre os catálogos da OpenAI e da Google.',
      [ModelFamilyPair.ANTHROPIC_VS_GOOGLE]:
        'Como o router pondera um pedido entre os catálogos da Anthropic e da Google.',
      [ModelFamilyPair.OPENAI_VS_DEEPSEEK]:
        'Como a classe de custo muda a escolha do router entre a OpenAI e a DeepSeek.',
      [ModelFamilyPair.OPENAI_VS_XAI]:
        'Como o router pondera um pedido entre os catálogos da OpenAI e da xAI.',
      [ModelFamilyPair.CLOUD_VS_LOCAL]:
        'O que muda quando um pedido tem de permanecer em hardware sob o seu controle em vez de qualquer provedor na nuvem.',
    },
  },
  pairs: {
    [ModelFamilyPair.OPENAI_VS_ANTHROPIC]: {
      seo: {
        title: 'OpenAI vs Anthropic: como a ClawAI direciona pedidos entre elas',
        description:
          'Como o router da ClawAI escolhe entre os catálogos de modelos da OpenAI e da Anthropic para um determinado pedido — classe de custo, adequação ao modo de raciocínio e fixação manual. Sem vencedor declarado. Confirme o catálogo em tempo real antes de escolher um plano.',
        keywords: [
          'OpenAI vs Anthropic',
          'router da ClawAI OpenAI Anthropic',
          'escolher entre modelos OpenAI e Claude',
        ],
      },
      eyebrow: 'Routing de modelos',
      title: 'OpenAI vs Anthropic: como a ClawAI direciona pedidos entre elas',
      summary:
        'A OpenAI e a Anthropic publicam catálogos que abrangem várias classes de custo, de modelos económicos e de resposta rápida até níveis premium e ultra construídos para problemas mais difíceis. Esta página não classifica uma família acima da outra — ela explica o que o router da ClawAI realmente pondera quando um pedido poderia plausivelmente ir para qualquer uma delas, e como pode substituir essa escolha por conta própria.',
      sections: [
        {
          id: 'cost-class-across-both-catalogs',
          heading: 'A classe de custo abrange os dois catálogos, não um nível por fornecedor',
          paragraphs: [
            'O catálogo de modelos da ClawAI etiqueta cada modelo semeado com uma classe de custo qualitativa — económica, standard, premium ou máxima — em vez de um preço exato. O catálogo da OpenAI vai de económica a premium; o da Anthropic vai de standard até ao nível máximo. Nenhum dos fornecedores domina sozinho a ponta económica nem a ponta cara, por isso uma decisão do router baseada em custo tem de olhar para os modelos específicos disponíveis em ambos os catálogos, e não presumir que um fornecedor é uniformemente mais barato.',
          ],
        },
        {
          id: 'routing-modes-that-touch-this-pair',
          heading: 'Os modos de routing que afetam este par',
          paragraphs: [
            'Sob o routing Auto, o router da ClawAI pode enviar um pedido para um modelo de qualquer um dos dois catálogos, consoante o que o pedido precisa. O routing High Reasoning favorece um modelo construído para resolver um problema por etapas, e tanto a OpenAI como a Anthropic publicam modelos nesse formato; o routing Cost Saver favorece um modelo de classe de custo mais baixa, que também existe em ambos os catálogos. O modo Manual Model permite fixar diretamente um modelo específico de qualquer um dos fornecedores, a substituição deliberada para uma tarefa recorrente em que já sabe qual modelo é adequado.',
          ],
        },
        {
          id: 'what-this-page-does-not-claim',
          heading: 'O que esta página não afirma',
          paragraphs: [
            'Nenhuma página deste site publica uma pontuação de benchmark ou uma afirmação de velocidade a comparar estes dois fornecedores, e esta não é exceção. Veja como interpretar benchmarks de IA e como avaliar modelos de IA, ligados abaixo, para verificar a adequação face à sua própria carga de trabalho em vez de aceitar um ranking de qualquer lado, incluindo desta página.',
          ],
        },
      ],
      faq: [
        {
          question: 'A OpenAI ou a Anthropic é melhor?',
          answer:
            'Esta página não vai responder a isso — ambas publicam modelos em várias classes de custo e casos de uso, e nenhum benchmark fiável resolve isso para todas as tarefas. Veja como avaliar modelos de IA, ligado abaixo, para um método que pode aplicar à sua própria carga de trabalho.',
        },
        {
          question: 'O router da ClawAI escolhe automaticamente entre OpenAI e Anthropic?',
          answer:
            'Sob o routing Auto, High Reasoning ou Cost Saver, sim — o router pode enviar um pedido para um modelo de qualquer um dos catálogos consoante o que o pedido precisa. Também pode fixar um modelo específico de qualquer um dos fornecedores no modo Manual Model.',
        },
        {
          question: 'Posso usar modelos da OpenAI e da Anthropic no mesmo espaço de trabalho?',
          answer:
            'Sim — a ClawAI conecta-se a ambos como provedores separados, e o routing Auto pode recorrer a qualquer um deles consoante o pedido, ou pode fixar um modelo específico de cada um para tarefas diferentes no modo Manual Model.',
        },
      ],
      productNote:
        'O routing Auto e High Reasoning da ClawAI pode recorrer ao catálogo da OpenAI ou da Anthropic para um determinado pedido, ou pode fixar um diretamente no modo Manual Model.',
      catalogDisclaimer:
        'A disponibilidade e os limites dos modelos são aplicados pelo seu plano e pelo catálogo em tempo real, não por esta página. Confirme o catálogo em tempo real na página de preços antes de escolher um plano construído em torno de um modelo específico.',
    },
    [ModelFamilyPair.OPENAI_VS_GOOGLE]: {
      seo: {
        title: 'OpenAI vs Google: como a ClawAI direciona pedidos entre elas',
        description:
          'Como o router da ClawAI escolhe entre os catálogos de modelos da OpenAI e da Google para um determinado pedido — classe de custo, necessidades de contexto e fixação manual. Sem vencedor declarado. Confirme o catálogo em tempo real antes de escolher um plano.',
        keywords: [
          'OpenAI vs Google Gemini',
          'router da ClawAI OpenAI Google',
          'escolher entre modelos OpenAI e Gemini',
        ],
      },
      eyebrow: 'Routing de modelos',
      title: 'OpenAI vs Google: como a ClawAI direciona pedidos entre elas',
      summary:
        'A OpenAI e a Google Gemini publicam ambas catálogos que vão de modelos económicos e de resposta rápida até níveis premium. Esta página não nomeia um vencedor — ela explica o que o router da ClawAI pondera quando um pedido poderia plausivelmente ir para qualquer uma das famílias, e como substituir essa escolha.',
      sections: [
        {
          id: 'cost-class-and-catalog-shape',
          heading: 'Classe de custo e forma do catálogo',
          paragraphs: [
            'O catálogo semeado da OpenAI vai de económica a premium; o catálogo Gemini da Google também vai de económica a premium, com um nível económico próprio. Uma decisão do router que pondere a classe de custo tem de olhar para o modelo específico dentro de cada família que se adequa ao orçamento de um pedido, já que ambos os fornecedores publicam uma gama, não um único preço fixo.',
          ],
        },
        {
          id: 'context-window-considerations',
          heading: 'A janela de contexto é uma propriedade por modelo, não por fornecedor',
          paragraphs: [
            'Quanto um modelo consegue manter à vista de uma só vez varia consoante o modelo específico escolhido, não consoante qual destes dois fornecedores o publica. Veja o que é uma janela de contexto, ligado abaixo, para o que esse limite significa e por que motivo um pedido que precise de raciocinar sobre um documento extenso ou um histórico de conversa longo deve verificar isso diretamente, em vez de presumir que os modelos de um fornecedor são uniformemente maiores.',
          ],
        },
        {
          id: 'how-clawai-routes-this-pair',
          heading: 'Como a ClawAI direciona um pedido entre elas',
          paragraphs: [
            'Sob o routing Auto, o router da ClawAI pode enviar um pedido para um modelo adequado de qualquer um dos catálogos. O routing Cost Saver favorece um modelo de classe de custo mais baixa, independentemente de qual destes dois fornecedores o publica. O modo Manual Model permite fixar diretamente um modelo específico da OpenAI ou da Google para uma tarefa recorrente com uma adequação conhecida.',
          ],
        },
      ],
      faq: [
        {
          question: 'A OpenAI ou a Google Gemini é melhor?',
          answer:
            'Esta página não responde a isso — ambas publicam modelos em várias classes de custo, e a adequação depende da tarefa. Veja como avaliar modelos de IA, ligado abaixo, para uma forma repetível de verificar face à sua própria carga de trabalho.',
        },
        {
          question: 'A ClawAI direciona automaticamente entre modelos OpenAI e Google?',
          answer:
            'Sob o routing Auto ou Cost Saver, o router pode enviar um pedido para um modelo adequado de qualquer um dos catálogos. Também pode fixar um modelo específico de qualquer um dos fornecedores no modo Manual Model.',
        },
        {
          question: 'Qual fornecedor tem a janela de contexto maior?',
          answer:
            'Isso varia consoante o modelo específico, não uniformemente por fornecedor. Veja o que é uma janela de contexto, ligado abaixo, para como verificar o limite de um determinado modelo antes de confiar nele para um documento extenso ou uma conversa longa.',
        },
      ],
      productNote:
        'O routing Auto e Cost Saver da ClawAI pode recorrer ao catálogo da OpenAI ou da Google para um determinado pedido, ou pode fixar um diretamente no modo Manual Model.',
      catalogDisclaimer:
        'A disponibilidade e os limites dos modelos são aplicados pelo seu plano e pelo catálogo em tempo real, não por esta página. Confirme o catálogo em tempo real na página de preços antes de escolher um plano construído em torno de um modelo específico.',
    },
    [ModelFamilyPair.ANTHROPIC_VS_GOOGLE]: {
      seo: {
        title: 'Anthropic vs Google: como a ClawAI direciona pedidos entre elas',
        description:
          'Como o router da ClawAI escolhe entre os catálogos de modelos da Anthropic e da Google para um determinado pedido — classe de custo, adequação ao modo de raciocínio e fixação manual. Sem vencedor declarado. Confirme o catálogo em tempo real antes de escolher um plano.',
        keywords: [
          'Anthropic vs Google Gemini',
          'router da ClawAI Anthropic Google',
          'escolher entre modelos Claude e Gemini',
        ],
      },
      eyebrow: 'Routing de modelos',
      title: 'Anthropic vs Google: como a ClawAI direciona pedidos entre elas',
      summary:
        'O catálogo da Anthropic vai de standard até ao nível de custo máximo; o catálogo Gemini da Google vai de económica a premium. Esta página explica o que essa diferença de forma significa para a forma como o router da ClawAI escolhe entre elas — não qual delas é melhor.',
      sections: [
        {
          id: 'cost-tier-shape-differs',
          heading: 'Os dois catálogos cobrem partes diferentes da faixa de custo',
          paragraphs: [
            'Os modelos semeados da Anthropic situam-se nas classes de custo standard, premium e máxima, sem entrada de nível económico atualmente; o catálogo Gemini da Google desce até um nível económico. Essa diferença de forma, e não um juízo de capacidade, é um dos fatores que uma decisão de routing sensível ao custo pondera quando um pedido tem um orçamento apertado em contraste com um em que o custo importa menos.',
          ],
        },
        {
          id: 'reasoning-focused-models-in-both',
          heading: 'Ambos os catálogos incluem modelos focados em raciocínio',
          paragraphs: [
            'Tanto a Anthropic como a Google publicam pelo menos um modelo no seu catálogo destinado a resolver um problema por etapas em vez de responder de imediato. O modo de routing High Reasoning da ClawAI pode favorecer um modelo adequado de qualquer uma das famílias para esse tipo de pedido; qual deles escolhe depende da disponibilidade e das outras necessidades do pedido, não de uma preferência fixa por um fornecedor.',
          ],
        },
        {
          id: 'overriding-the-router',
          heading: 'Substituir o router por conta própria',
          paragraphs: [
            'O modo Manual Model permite fixar diretamente um modelo específico da Anthropic ou da Google, a escolha certa para uma tarefa recorrente em que já sabe qual modelo é adequado — um fluxo de trabalho documentado, um estilo conhecido, uma integração específica — em vez de deixar isso ao routing automático sempre.',
          ],
        },
      ],
      faq: [
        {
          question: 'A Anthropic ou a Google Gemini é melhor?',
          answer:
            'Esta página não nomeia uma — os dois catálogos cobrem partes diferentes da faixa de custo e ambos incluem modelos focados em raciocínio. Veja como avaliar modelos de IA, ligado abaixo, para como verificar a adequação face à sua própria carga de trabalho.',
        },
        {
          question: 'O modo High Reasoning da ClawAI favorece um destes fornecedores?',
          answer:
            'Sem preferência fixa — o routing High Reasoning pode favorecer um modelo adequado de qualquer um dos catálogos consoante a disponibilidade e as necessidades do pedido.',
        },
        {
          question: 'Posso fixar um modelo Claude ou Gemini para uma tarefa recorrente específica?',
          answer:
            'Sim — o modo Manual Model permite fixar diretamente um modelo específico de qualquer um dos fornecedores, uma escolha razoável assim que souber a adequação de uma tarefa, em vez de confiar no routing automático sempre.',
        },
      ],
      productNote:
        'O routing High Reasoning da ClawAI pode favorecer um modelo adequado do catálogo da Anthropic ou da Google, ou pode fixar um diretamente no modo Manual Model.',
      catalogDisclaimer:
        'A disponibilidade e os limites dos modelos são aplicados pelo seu plano e pelo catálogo em tempo real, não por esta página. Confirme o catálogo em tempo real na página de preços antes de escolher um plano construído em torno de um modelo específico.',
    },
    [ModelFamilyPair.OPENAI_VS_DEEPSEEK]: {
      seo: {
        title: 'OpenAI vs DeepSeek: como a ClawAI direciona pedidos entre elas',
        description:
          'Como a classe de custo desloca o router da ClawAI entre os catálogos da OpenAI e da DeepSeek, e como o routing Cost Saver e o modo Manual Model se adequam a este par. Sem vencedor declarado. Confirme o catálogo em tempo real antes de escolher um plano.',
        keywords: [
          'OpenAI vs DeepSeek',
          'router da ClawAI OpenAI DeepSeek',
          'alternativa mais barata à OpenAI',
        ],
      },
      eyebrow: 'Routing de modelos',
      title: 'OpenAI vs DeepSeek: como a ClawAI direciona pedidos entre elas',
      summary:
        'O catálogo da OpenAI vai de económica a premium; os modelos semeados da DeepSeek situam-se na classe de custo standard. Esta página percorre o que essa diferença de classe de custo significa para direcionar um pedido entre as duas, sem declarar qual delas é o melhor fornecedor.',
      sections: [
        {
          id: 'cost-class-is-the-headline-difference',
          heading: 'A classe de custo é a diferença mais evidente entre estes dois catálogos',
          paragraphs: [
            'Os dois modelos semeados da DeepSeek — um modelo de conversação geral e um modelo focado em raciocínio — situam-se ambos na classe de custo standard da ClawAI. O catálogo da OpenAI abrange uma gama mais ampla, de um nível económico até premium. Para um pedido sensível ao custo, isso torna o catálogo da DeepSeek um ponto de partida razoável, embora os próprios modelos de nível económico da OpenAI se situem na mesma classe de custo e também valham a pena ponderar — a comparação é entre classes de custo, não entre fornecedores como um todo.',
          ],
        },
        {
          id: 'cost-saver-routing',
          heading: 'O modo de routing Cost Saver da ClawAI',
          paragraphs: [
            'Cost Saver é um dos sete modos de routing da ClawAI, construído para favorecer um modelo de classe de custo mais baixa quando um pedido não precisa de um modelo premium. Pode recorrer a qualquer um dos catálogos consoante o modelo que realmente se adequa ao pedido nessa classe de custo, em vez de recorrer por padrão a um fornecedor específico.',
          ],
        },
        {
          id: 'reasoning-focused-option-in-both',
          heading: 'Existe uma opção focada em raciocínio em ambos os catálogos',
          paragraphs: [
            'A DeepSeek publica um modelo construído especificamente para resolver um problema por etapas, na mesma classe de custo standard do seu modelo de conversação geral; a OpenAI publica modelos focados em raciocínio nos seus níveis standard e premium. O routing High Reasoning pode recorrer a qualquer um deles, e vale a pena verificar diretamente qual se adequa a uma tarefa específica de várias etapas, em vez de presumir apenas pela classe de custo.',
          ],
        },
      ],
      faq: [
        {
          question: 'A DeepSeek é uma alternativa mais barata à OpenAI?',
          answer:
            'Os modelos semeados da DeepSeek situam-se na classe de custo standard da ClawAI, e a OpenAI também publica modelos de nível económico e standard — por isso a comparação justa é por classe de custo, não por fornecedor. Confirme o preço atual de qualquer modelo específico na página de preços.',
        },
        {
          question: 'O modo Cost Saver da ClawAI prefere a DeepSeek?',
          answer:
            'Sem preferência fixa — o routing Cost Saver favorece o modelo disponível que se adequa a uma classe de custo mais baixa para o pedido, de qualquer um dos catálogos.',
        },
        {
          question: 'A DeepSeek tem um modelo focado em raciocínio como o da OpenAI?',
          answer:
            'Sim — a DeepSeek publica um modelo construído para resolver um problema por etapas, na mesma classe de custo do seu modelo de conversação geral. A OpenAI também publica modelos focados em raciocínio, numa faixa de custo mais ampla.',
        },
      ],
      productNote:
        'O routing Cost Saver da ClawAI pode favorecer um modelo de classe de custo mais baixa do catálogo da OpenAI ou da DeepSeek, ou pode fixar um diretamente no modo Manual Model.',
      catalogDisclaimer:
        'A disponibilidade e os limites dos modelos são aplicados pelo seu plano e pelo catálogo em tempo real, não por esta página. Confirme o catálogo em tempo real na página de preços antes de escolher um plano construído em torno de um modelo específico.',
    },
    [ModelFamilyPair.OPENAI_VS_XAI]: {
      seo: {
        title: 'OpenAI vs xAI: como a ClawAI direciona pedidos entre elas',
        description:
          'Como o router da ClawAI escolhe entre os catálogos da OpenAI e do Grok da xAI para um determinado pedido — classe de custo e fixação manual. Sem vencedor declarado. Confirme o catálogo em tempo real antes de escolher um plano.',
        keywords: [
          'OpenAI vs xAI Grok',
          'router da ClawAI OpenAI xAI',
          'escolher entre modelos GPT e Grok',
        ],
      },
      eyebrow: 'Routing de modelos',
      title: 'OpenAI vs xAI: como a ClawAI direciona pedidos entre elas',
      summary:
        'O catálogo da OpenAI vai de económica a premium; o catálogo Grok da xAI na ClawAI também vai de económica a premium, com menos modelos semeados no total. Esta página explica o que o router da ClawAI pondera entre as duas, sem nomear qual delas é o melhor fornecedor.',
      sections: [
        {
          id: 'catalog-size-and-cost-class',
          heading: 'Um catálogo menor não significa uma faixa de custo mais estreita',
          paragraphs: [
            'O catálogo semeado da xAI na ClawAI é menor do que o da OpenAI — dois modelos contra os seis da OpenAI — mas ainda abrange um modelo de nível económico e um de nível premium, a mesma faixa de classe de custo que o catálogo da própria OpenAI cobre nos seus extremos. Uma decisão do router entre elas pondera a classe de custo do modelo específico face ao orçamento do pedido, não o tamanho do catálogo de qualquer um dos fornecedores.',
          ],
        },
        {
          id: 'how-clawai-routes-this-pair',
          heading: 'Como a ClawAI direciona um pedido entre elas',
          paragraphs: [
            'Sob o routing Auto, o router da ClawAI pode enviar um pedido para um modelo adequado de qualquer um dos catálogos. O routing Cost Saver favorece a opção de classe de custo mais baixa, independentemente do fornecedor. O modo Manual Model permite fixar diretamente um modelo específico da OpenAI ou da xAI se já souber de qual uma tarefa precisa.',
          ],
        },
        {
          id: 'what-this-page-does-not-claim',
          heading: 'O que esta página não afirma',
          paragraphs: [
            'Esta página não faz nenhuma afirmação de velocidade nem classificação de capacidade entre estes dois fornecedores — nenhuma página deste site faz isso. Veja como avaliar modelos de IA, ligado abaixo, para um método de verificar a adequação face à sua própria carga de trabalho.',
          ],
        },
      ],
      faq: [
        {
          question: 'A OpenAI ou o Grok da xAI é melhor?',
          answer:
            'Esta página não responde a isso — ambas publicam modelos numa faixa de classe de custo semelhante, e nenhum benchmark fiável resolve a adequação para todas as tarefas. Veja como avaliar modelos de IA, ligado abaixo.',
        },
        {
          question: 'A ClawAI direciona automaticamente entre modelos OpenAI e xAI?',
          answer:
            'Sob o routing Auto ou Cost Saver, sim — o router pode enviar um pedido para um modelo adequado de qualquer um dos catálogos. Também pode fixar um modelo específico de qualquer um dos fornecedores no modo Manual Model.',
        },
        {
          question: 'A xAI tem tantos modelos no catálogo da ClawAI quanto a OpenAI?',
          answer:
            'Não — o catálogo semeado da xAI é menor, dois modelos contra os seis da OpenAI, embora ainda abranja uma faixa de classe de custo semelhante. Confirme o catálogo em tempo real na página de preços.',
        },
      ],
      productNote:
        'O routing Auto e Cost Saver da ClawAI pode recorrer ao catálogo da OpenAI ou da xAI para um determinado pedido, ou pode fixar um diretamente no modo Manual Model.',
      catalogDisclaimer:
        'A disponibilidade e os limites dos modelos são aplicados pelo seu plano e pelo catálogo em tempo real, não por esta página. Confirme o catálogo em tempo real na página de preços antes de escolher um plano construído em torno de um modelo específico.',
    },
    [ModelFamilyPair.CLOUD_VS_LOCAL]: {
      seo: {
        title: 'Nuvem vs local: como a ClawAI direciona pedidos entre elas',
        description:
          'O que muda quando um pedido permanece em hardware sob o seu controle em vez de um provedor na nuvem, e como os modos de routing Local-Only e Privacy-First da ClawAI se adequam a essa escolha. Sem vencedor declarado. Confirme o catálogo em tempo real antes de escolher um plano.',
        keywords: [
          'IA na nuvem vs IA local',
          'routing Local-Only da ClawAI',
          'quando executar um modelo localmente em vez da nuvem',
        ],
      },
      eyebrow: 'Routing de modelos',
      title: 'Nuvem vs local: como a ClawAI direciona pedidos entre elas',
      summary:
        'Este é o único par deste conjunto definido por onde um pedido é executado, não por qual fornecedor responde. Todas as famílias na nuvem a que a ClawAI se conecta — OpenAI, Anthropic, Google, DeepSeek, xAI — executam um modelo na sua própria infraestrutura; o Ollama e o llama.cpp, em vez disso, executam um modelo de pesos abertos em hardware sob o seu controle. Esta página explica o que isso muda e como o router da ClawAI trata essa escolha, dado o design local-first da própria ClawAI.',
      sections: [
        {
          id: 'what-changes-when-a-request-stays-local',
          heading: 'O que realmente muda quando um pedido permanece local',
          paragraphs: [
            'Um provedor na nuvem executa um modelo na sua própria infraestrutura e cobra por pedido; o Ollama e o llama.cpp, em vez disso, carregam um modelo de pesos abertos em hardware sob o seu controle, para que o pedido nunca chegue a um provedor na nuvem. Isso muda quem consegue ver o pedido, não a capacidade de um determinado modelo — veja IA local, na página de provedores de modelos, para o mecanismo completo.',
          ],
        },
        {
          id: 'local-only-and-privacy-first-routing',
          heading:
            'Os modos de routing Local-Only e Privacy-First da ClawAI existem para esta escolha',
          paragraphs: [
            'O routing Local-Only mantém todos os pedidos em hardware sob o seu controle via Ollama ou llama.cpp, sem nunca chegar a nenhuma das cinco famílias na nuvem que este conjunto abrange. O Privacy-First é um modo separado com prioridades próprias. Ambos existem especificamente porque nem toda carga de trabalho deve usar o routing Auto por padrão, que pode recorrer a qualquer provedor conectado, na nuvem ou local, consoante o pedido.',
          ],
        },
        {
          id: 'when-a-workload-should-stay-local',
          heading: 'Quando uma carga de trabalho é candidata a permanecer local',
          paragraphs: [
            'Um pedido é um candidato razoável ao routing Local-Only ou Privacy-First quando o requisito é que nunca saia de hardware sob o seu controle — um limite de conformidade, um requisito de confidencialidade de cliente, ou simplesmente uma preferência por não enviar determinados dados a nenhum fornecedor externo. Veja o que é IA local-first, ligado abaixo, para como pensar sobre a troca entre um modelo de pesos abertos executado por si e o catálogo de um provedor na nuvem.',
          ],
        },
      ],
      faq: [
        {
          question: 'Um modelo local é tão capaz quanto um modelo na nuvem?',
          answer:
            'Esta página não os classifica — a capacidade depende do modelo específico de pesos abertos que escolher executar, o que é uma decisão sua, não uma comparação fixa que esta página possa fazer com responsabilidade. Veja o que é IA local-first, ligado abaixo.',
        },
        {
          question: 'Como decide a ClawAI se mantém um pedido local?',
          answer:
            'Não decide por si por padrão — o routing Local-Only mantém todos os pedidos em hardware sob o seu controle, e o routing Privacy-First aplica as suas próprias prioridades; o routing Auto pode recorrer a qualquer provedor conectado, na nuvem ou local. É você quem escolhe qual modo um espaço de trabalho ou pedido usa.',
        },
        {
          question: 'Executar um modelo localmente custa algo através da ClawAI?',
          answer:
            'A ClawAI não cobra uma tarifa por token para um modelo executado localmente da forma como cobra para um provedor na nuvem, já que nenhum provedor na nuvem está a ser faturado — o custo é o hardware que já usa. Confirme o comportamento atual do plano na página de preços.',
        },
      ],
      productNote:
        'O modo de routing Local-Only da ClawAI mantém todos os pedidos em hardware sob o seu controle via Ollama ou llama.cpp — um conector real e já disponível, não um item de roadmap — ao lado do routing Privacy-First para um conjunto separado de prioridades.',
      catalogDisclaimer:
        'Propositadamente, nenhum modelo específico na nuvem ou local é classificado aqui — os modelos de pesos abertos e cada catálogo na nuvem mudam segundo o seu próprio calendário, e é você quem escolhe qual executar ou conectar. Confirme o comportamento do plano para cargas de trabalho locais na página de preços.',
    },
  },
};
