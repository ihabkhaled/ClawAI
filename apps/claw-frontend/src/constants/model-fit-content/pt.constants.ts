import { ModelFitTask } from '@/enums/model-fit-task.enum';
import type { ModelFitDictionary } from '@/types/model-fit.types';

export const PT_MODEL_FIT_CONTENT: ModelFitDictionary = {
  labels: {
    onThisPage: 'Nesta página',
    faqTitle: 'Perguntas frequentes',
    relatedTitle: 'Para onde ir a seguir',
    lastReviewed: 'Última revisão',
    backToHub: 'Todas as tarefas',
    ctaTitle: 'Experimente em vez de confiar apenas na nossa palavra',
    ctaBody:
      'A ClawAI direciona uma conversa para o modelo adequado a ela, entre todos os provedores a que se conecta, a partir de um único espaço de trabalho.',
    startFree: 'Comece no plano gratuito',
    seeFeatures: 'Veja o que a ClawAI faz',
    seePricing: 'Confirme o catálogo em tempo real na página de preços',
  },
  hub: {
    seo: {
      title: 'Como escolher um modelo para a sua tarefa',
      description:
        'O que realmente importa ao escolher um modelo para programação, raciocínio complexo, escrita, pesquisa com fontes ou cargas de trabalho privadas e locais — sem rankings, sem benchmarks inventados.',
      keywords: [
        'escolher um modelo para uma tarefa',
        'qual modelo de IA é adequado para a minha tarefa',
        'modelo para programação versus escrita',
      ],
    },
    eyebrow: 'Adequação do modelo',
    title: 'Como escolher um modelo para a sua tarefa',
    summary:
      'Não existe um único melhor modelo — existe um modelo que se adequa a uma determinada tarefa, e essa adequação muda conforme o que a tarefa exige: quão profundo o raciocínio precisa ser, quanto contexto precisa reter, quão sensível é o custo e se o pedido precisa permanecer em hardware sob seu controle. Este hub não classifica modelos; ele percorre o que ponderar para cinco tipos comuns de trabalho e liga às páginas de provedores e aos guias de avaliação que permitem verificar por conta própria.',
    topicsHeading: 'Escolha uma tarefa',
    cardSummaries: {
      [ModelFitTask.CODING]: 'O que importa quando um modelo escreve ou edita código.',
      [ModelFitTask.COMPLEX_REASONING]:
        'Problemas de várias etapas em que o modelo precisa avançar passo a passo.',
      [ModelFitTask.WRITING_AND_EDITING]:
        'Redação longa, edição e o cumprimento de um guia de estilo.',
      [ModelFitTask.RESEARCH_WITH_SOURCES]:
        'Respostas baseadas em fontes que o modelo consultou, e não apenas em dados de treino.',
      [ModelFitTask.PRIVATE_LOCAL_WORKLOADS]:
        'Manter um pedido em hardware sob seu controle em vez de um provedor na nuvem.',
    },
  },
  tasks: {
    [ModelFitTask.CODING]: {
      seo: {
        title: 'Como escolher um modelo para programação',
        description:
          'O que ponderar ao escolher um modelo para tarefas de programação na ClawAI — seguimento de instruções, janela de contexto e custo por pedido. Sem rankings, sem benchmarks inventados. Confirme o catálogo em tempo real antes de escolher um plano.',
        keywords: [
          'escolher um modelo para programação',
          'qual modelo usar para programação',
          'modelo de IA para programação',
        ],
      },
      eyebrow: 'Adequação do modelo',
      title: 'Como escolher um modelo para programação',
      summary:
        'O trabalho de programação abrange uma ampla gama de casos — uma correção de uma linha, uma refatoração de vários ficheiros, uma funcionalidade construída do zero — e o modelo adequado muda conforme o tamanho e a forma desse trabalho. Esta página percorre o que ponderar em vez de nomear um único vencedor; o router da ClawAI já consegue agir sobre a maior parte disso, ou pode escolher manualmente.',
      sections: [
        {
          id: 'what-coding-needs',
          heading: 'O que uma tarefa de programação realmente precisa de um modelo',
          paragraphs: [
            'Tarefas de programação dependem da capacidade de um modelo seguir instruções detalhadas e estruturadas e manter uma alteração internamente consistente num ficheiro ou em vários ficheiros — mais próximo de uma escrita cuidadosa passo a passo do que de uma conversa aberta. Vários provedores no catálogo da ClawAI publicam modelos construídos especificamente para resolver um problema por etapas em vez de responder de imediato, o que é uma escolha razoável para uma alteração não trivial; uma edição simples e bem especificada raramente precisa disso.',
          ],
        },
        {
          id: 'context-and-cost',
          heading: 'Janela de contexto e custo, não apenas capacidade',
          paragraphs: [
            'Uma base de código grande, ou uma tarefa que exige vários ficheiros abertos ao mesmo tempo, é antes de mais um problema de janela de contexto — um modelo precisa conseguir manter o código relevante à vista para raciocinar corretamente sobre ele. A sensibilidade ao custo também varia dentro de um mesmo fluxo de trabalho: uma tarefa de alto volume, como gerar código repetitivo ou completar trechos simples, é um bom lugar para um modelo de custo mais baixo, enquanto uma refatoração cuidadosa num caminho crítico é um bom lugar para investir mais. Tratar todos os pedidos de programação da mesma forma, independentemente do tamanho, costuma ser a escolha errada por padrão.',
          ],
        },
        {
          id: 'how-clawai-routes-coding',
          heading: 'Como a ClawAI pode direcionar um pedido de programação',
          paragraphs: [
            'O router da ClawAI pode enviar um pedido de programação automaticamente para um modelo adequado sob o modo Auto ou High Reasoning, ou pode fixar um modelo específico no modo Manual Model quando souber exatamente do que a tarefa precisa. Consulte a página de provedores de modelos para ver todas as famílias de provedores para as quais a ClawAI pode direcionar um pedido, e confirme o catálogo em tempo real na página de preços antes de escolher um plano construído em torno de um único modelo — a disponibilidade e os limites são aplicados ali, não nesta página.',
          ],
        },
      ],
      faq: [
        {
          question: 'Qual é o melhor modelo para programação?',
          answer:
            'Esta página não vai nomear um — o "melhor" depende do tamanho e da forma da tarefa, e nenhum benchmark confiável resolve isso para todos os casos. Veja como avaliar modelos de IA, ligado abaixo, para um método repetível que pode aplicar à sua própria carga de trabalho.',
        },
        {
          question:
            'A ClawAI escolhe automaticamente um modelo diferente para tarefas de programação?',
          answer:
            'Sob o modo Auto ou High Reasoning, o router da ClawAI pode enviar um pedido para um modelo que considera adequado à tarefa, incluindo programação. Também pode fixar um modelo específico no modo Manual Model.',
        },
        {
          question: 'Um modelo focado em raciocínio é sempre a escolha certa para programação?',
          answer:
            'Não necessariamente — uma alteração simples e bem especificada muitas vezes não precisa de um, enquanto uma refatoração de várias etapas é uma escolha mais natural. Confirme o catálogo em tempo real na página de preços antes de escolher um plano em torno de um modelo específico.',
        },
      ],
      productNote:
        'A ClawAI pode direcionar um pedido de programação automaticamente para um modelo adequado, ou pode fixar um diretamente no modo Manual Model — a escolha é sua, sem estar presa a um único fornecedor.',
      catalogDisclaimer:
        'A disponibilidade e os limites dos modelos são aplicados pelo seu plano e pelo catálogo em tempo real, não por esta página. Confirme o catálogo em tempo real na página de preços antes de escolher um plano construído em torno de um modelo específico.',
    },
    [ModelFitTask.COMPLEX_REASONING]: {
      seo: {
        title: 'Como escolher um modelo para raciocínio complexo',
        description:
          'O que ponderar ao escolher um modelo para tarefas de raciocínio de várias etapas na ClawAI — profundidade de raciocínio, modos de routing e como avaliar um modelo no seu próprio problema. Confirme o catálogo em tempo real antes de escolher um plano.',
        keywords: [
          'escolher um modelo para raciocínio',
          'modelo de IA para problemas complexos',
          'modelo de raciocínio em várias etapas',
        ],
      },
      eyebrow: 'Adequação do modelo',
      title: 'Como escolher um modelo para raciocínio complexo',
      summary:
        'Uma tarefa de raciocínio complexo pede a um modelo que avance por várias etapas — decompor um problema, verificar resultados intermédios, rever antes de responder — em vez de produzir uma resposta de primeira tentativa. Esta página percorre o que isso muda na adequação do modelo, sem nomear um único vencedor nem citar uma pontuação de benchmark.',
      sections: [
        {
          id: 'what-reasoning-tasks-need',
          heading: 'O que uma tarefa de raciocínio em várias etapas precisa',
          paragraphs: [
            'Vários provedores no catálogo da ClawAI publicam modelos construídos especificamente para resolver um problema passo a passo antes de produzir uma resposta final, em vez de responder de imediato — um ponto de partida razoável para uma tarefa com várias etapas dependentes, várias restrições a satisfazer ao mesmo tempo, ou um resultado que precisa ser verificado antes de ser dado como final. Uma pergunta curta e de uma só etapa raramente beneficia desse tipo de modelo; a adequação está relacionada com a estrutura da tarefa, não com uma noção geral de qual modelo é mais forte.',
          ],
        },
        {
          id: 'high-reasoning-routing',
          heading: 'O modo de routing High Reasoning da ClawAI',
          paragraphs: [
            'High Reasoning é um dos sete modos de routing da ClawAI, criado exatamente para este tipo de pedido: o router favorece um modelo adequado para resolver um problema por etapas em vez de responder de imediato. O routing Auto também pode recorrer a um destes modelos quando considera que um pedido o exige; o modo Manual Model permite fixar um diretamente caso já saiba de qual modelo uma tarefa recorrente precisa.',
          ],
        },
        {
          id: 'evaluating-reasoning-models',
          heading: 'Como verificar por conta própria a adequação de raciocínio de um modelo',
          paragraphs: [
            'Nenhuma página deste site publica uma pontuação de benchmark, porque um número publicado raramente reflete o desempenho de um modelo no seu problema específico — veja como interpretar benchmarks de IA, ligado abaixo, para o que uma pontuação publicada realmente diz e o que não diz. Como avaliar modelos de IA, também ligado abaixo, percorre uma forma repetível de verificar um modelo face às suas próprias tarefas de raciocínio.',
          ],
        },
      ],
      faq: [
        {
          question: 'Qual é o melhor modelo em raciocínio?',
          answer:
            'Esta página não nomeia um — os modelos construídos para raciocínio em várias etapas variam por provedor, e vale a pena verificar por conta própria o desempenho num problema específico em vez de confiar numa pontuação publicada. Veja como avaliar modelos de IA, ligado abaixo.',
        },
        {
          question: 'O que faz o modo de routing High Reasoning da ClawAI?',
          answer:
            'É um dos sete modos de routing da ClawAI; quando selecionado, o router favorece um modelo adequado para resolver um problema por etapas em vez de responder de imediato.',
        },
        {
          question: 'Devo usar sempre um modelo focado em raciocínio?',
          answer:
            'Não — uma pergunta curta e de uma só etapa raramente precisa de um, e os modelos focados em raciocínio existem em todas as faixas de custo entre os provedores da ClawAI. Confirme o catálogo em tempo real na página de preços antes de escolher um plano em torno de um modelo específico.',
        },
      ],
      productNote:
        'O modo de routing High Reasoning da ClawAI pode enviar um pedido para um modelo adequado para resolver um problema por etapas, ou pode fixar um diretamente no modo Manual Model.',
      catalogDisclaimer:
        'A disponibilidade e os limites dos modelos são aplicados pelo seu plano e pelo catálogo em tempo real, não por esta página. Confirme o catálogo em tempo real na página de preços antes de escolher um plano construído em torno de um modelo específico.',
    },
    [ModelFitTask.WRITING_AND_EDITING]: {
      seo: {
        title: 'Como escolher um modelo para escrita e edição',
        description:
          'O que ponderar ao escolher um modelo para redação, edição e escrita longa na ClawAI — janela de contexto, seguimento de um guia de estilo e custo ao longo de um fluxo de trabalho. Confirme o catálogo em tempo real antes de escolher um plano.',
        keywords: [
          'escolher um modelo para escrita',
          'modelo de IA para edição',
          'modelo para redação longa',
        ],
      },
      eyebrow: 'Adequação do modelo',
      title: 'Como escolher um modelo para escrita e edição',
      summary:
        'Escrita e edição cobrem uma ampla gama de tarefas — uma reescrita curta, um documento longo editado para manter consistência, um rascunho completo construído segundo um guia de estilo — e o que um modelo precisa fazer bem muda ao longo dessa gama. Esta página percorre o que ponderar em vez de nomear um único modelo como resposta.',
      sections: [
        {
          id: 'what-writing-tasks-need',
          heading: 'O que uma tarefa de escrita ou edição precisa de um modelo',
          paragraphs: [
            'Trabalho de escrita cuidadoso depende da capacidade de um modelo seguir instruções detalhadas e manter um tom e uma estrutura consistentes ao longo de um texto inteiro, algo próximo do que vários provedores descrevem como adequado para os seus modelos de uso geral e de níveis superiores. Uma reescrita curta ou um único parágrafo raramente precisam do mesmo modelo que um documento longo que tem de se manter consistente da primeira à última página.',
          ],
        },
        {
          id: 'context-window-for-long-documents',
          heading: 'A janela de contexto importa em documentos longos',
          paragraphs: [
            'Editar um documento longo, ou redigir um contra um guia de estilo extenso e material de referência, é antes de mais um problema de janela de contexto — o modelo precisa conseguir manter o documento inteiro, ou uma parte suficiente dele, à vista para manter a terminologia, o tom e a estrutura consistentes. Veja o que é uma janela de contexto, ligado abaixo, para o que esse limite realmente significa e de onde vem.',
          ],
        },
        {
          id: 'how-clawai-routes-writing',
          heading: 'Como a ClawAI pode direcionar um pedido de escrita',
          paragraphs: [
            'O router da ClawAI pode enviar automaticamente um pedido de escrita ou edição para um modelo adequado sob o modo Auto ou Cost Saver, ou pode fixar um modelo específico no modo Manual Model para uma tarefa recorrente com um guia de estilo conhecido. Consulte a página de provedores de modelos para ver todas as famílias de provedores para as quais a ClawAI pode direcionar pedidos, e confirme o catálogo em tempo real na página de preços antes de escolher um plano construído em torno de um único modelo.',
          ],
        },
      ],
      faq: [
        {
          question: 'Qual modelo escreve melhor?',
          answer:
            'Esta página não vai nomear um — a qualidade da escrita é julgada de forma diferente por cada leitor e cada tarefa, e nenhum benchmark resolve isso. Veja como avaliar modelos de IA, ligado abaixo, para um método que verifica isso face ao seu próprio material.',
        },
        {
          question: 'Qual modelo devo usar para um documento longo?',
          answer:
            'Analise primeiro o tamanho da janela de contexto, já que um documento longo precisa caber à vista para o modelo se manter consistente ao longo dele. Veja o que é uma janela de contexto, ligado abaixo, para como esse limite funciona.',
        },
        {
          question: 'Posso manter o mesmo modelo para uma tarefa de escrita recorrente?',
          answer:
            'Sim — fixe um no modo Manual Model se uma tarefa recorrente tiver um guia de estilo conhecido e quiser sempre o mesmo modelo, em vez de deixar isso ao routing automático.',
        },
      ],
      productNote:
        'A ClawAI pode direcionar um pedido de escrita automaticamente para um modelo adequado, ou pode fixar um diretamente no modo Manual Model para uma tarefa recorrente com um guia de estilo conhecido.',
      catalogDisclaimer:
        'A disponibilidade e os limites dos modelos são aplicados pelo seu plano e pelo catálogo em tempo real, não por esta página. Confirme o catálogo em tempo real na página de preços antes de escolher um plano construído em torno de um modelo específico.',
    },
    [ModelFitTask.RESEARCH_WITH_SOURCES]: {
      seo: {
        title: 'Como escolher um modelo para pesquisa com fontes',
        description:
          'Como o modo Research da ClawAI baseia uma resposta em fontes que consultou, como isso é cobrado separadamente do crédito de modelo e o que ainda depende do modelo escolhido. Confirme o catálogo em tempo real antes de escolher um plano.',
        keywords: [
          'pesquisa de IA com fontes',
          'modelo de IA com respostas fundamentadas',
          'escolher um modelo para pesquisa',
        ],
      },
      eyebrow: 'Adequação do modelo',
      title: 'Como escolher um modelo para pesquisa com fontes',
      summary:
        'Uma tarefa de pesquisa pede uma resposta baseada em fontes que o modelo realmente consultou, não apenas no que aprendeu durante o treino. O modo Research da ClawAI é uma funcionalidade real e já disponível, construída exatamente para isto; esta página explica o que faz, como é cobrado e o que a escolha de modelo ainda muda quando fontes estão envolvidas.',
      sections: [
        {
          id: 'what-research-mode-does',
          heading: 'O que faz o modo Research da ClawAI',
          paragraphs: [
            'O modo Research permite que um pedido pesquise na web, obtenha uma página, ou obtenha e extraia conteúdo estruturado de uma página, antes de o modelo produzir uma resposta — assim a resposta pode citar fontes recolhidas para essa pergunta específica, em vez de depender apenas do que o modelo subjacente aprendeu durante o treino. É uma funcionalidade sujeita ao plano, com três profundidades: apenas pesquisa, pesquisa mais obtenção de página, ou pesquisa mais obtenção e extração.',
          ],
        },
        {
          id: 'billed-separately-from-model-credit',
          heading: 'A pesquisa é cobrada separadamente, não a partir do seu crédito de modelo',
          paragraphs: [
            'O acesso à pesquisa é medido como uso próprio — pesquisa na web, obtenção de páginas e extração — separado do limite de tokens de que uma mensagem de chat depende. Uma afirmação de que "a pesquisa usa o seu crédito de modelo" estaria errada: as duas coisas são acompanhadas e cobradas como itens diferentes, e o limite de pesquisa do seu plano é uma linha separada do seu limite de tokens de modelo.',
          ],
        },
        {
          id: 'what-the-model-still-changes',
          heading: 'O que o modelo subjacente ainda muda',
          paragraphs: [
            'O modo Research muda o que o modelo consegue ver antes de responder, não a qualidade com que raciocina sobre o que recolheu — um modelo ainda precisa de ler as fontes obtidas, pesá-las entre si e escrever uma resposta que as reflita com precisão. As mesmas considerações que se aplicam a tarefas de raciocínio complexo aplicam-se aqui: um modelo construído para resolver várias etapas é uma escolha razoável para conciliar várias fontes, e vale a pena verificar isso face ao seu próprio material em vez de presumir.',
          ],
        },
      ],
      faq: [
        {
          question: 'A pesquisa usa o meu crédito de modelo?',
          answer:
            'Não. O acesso à pesquisa — pesquisa na web, obtenção de páginas e extração — é medido separadamente do limite de tokens de que uma mensagem de chat depende. Confirme ambos os limites na página de preços.',
        },
        {
          question: 'Qual é a diferença entre as três profundidades do modo Research?',
          answer:
            'Apenas pesquisa devolve resultados de uma pesquisa na web; pesquisa mais obtenção também recolhe o conteúdo da página; pesquisa mais obtenção e extração ainda retira conteúdo estruturado do que foi obtido. A profundidade usada num pedido depende de como está configurado.',
        },
        {
          question: 'O modelo que escolho importa quando o modo Research está ativo?',
          answer:
            'Sim — o modo Research muda quais fontes o modelo consegue ver, não a qualidade com que as lê e concilia. Veja como avaliar modelos de IA, ligado abaixo, para como verificar isso face à sua própria carga de trabalho.',
        },
      ],
      productNote:
        'O modo Research da ClawAI pode pesquisar, obter e obter-e-extrair conteúdo da web antes de um modelo responder — uma funcionalidade real e já disponível, medida separadamente do seu crédito de tokens de modelo.',
      catalogDisclaimer:
        'A disponibilidade e os limites dos modelos são aplicados pelo seu plano e pelo catálogo em tempo real, não por esta página. Confirme o catálogo em tempo real na página de preços antes de escolher um plano construído em torno de um modelo específico.',
    },
    [ModelFitTask.PRIVATE_LOCAL_WORKLOADS]: {
      seo: {
        title: 'Como escolher um modelo para cargas de trabalho privadas e locais',
        description:
          'O que muda quando um pedido permanece em hardware sob seu controle em vez de um provedor na nuvem, e como os modos de routing Local-Only e Privacy-First da ClawAI se adequam a cargas de trabalho privadas. Confirme o catálogo em tempo real antes de escolher um plano.',
        keywords: [
          'cargas de trabalho de IA privadas',
          'escolha de modelo de IA local',
          'executar modelos de IA no seu próprio hardware',
        ],
      },
      eyebrow: 'Adequação do modelo',
      title: 'Como escolher um modelo para cargas de trabalho privadas e locais',
      summary:
        'Uma carga de trabalho privada ou local é definida por onde o pedido é executado, não pelo tipo de tarefa que é — o requisito é que permaneça em hardware sob seu controle em vez de chegar a um provedor na nuvem. A ClawAI tem conectores reais para Ollama e llama.cpp exatamente para isto, além de modos de routing que mantêm um pedido local por padrão.',
      sections: [
        {
          id: 'what-changes-locally',
          heading: 'O que realmente muda ao executar um modelo localmente',
          paragraphs: [
            'Um provedor na nuvem, noutro ponto do catálogo da ClawAI, executa um modelo na sua própria infraestrutura e cobra por pedido; o Ollama e o llama.cpp, em vez disso, carregam um modelo de pesos abertos em hardware sob o seu controle, para que o pedido nunca saia dele. Isso muda quem consegue ver o pedido, não a capacidade de um determinado modelo — veja IA local, na página de provedores de modelos, para o mecanismo completo em vez de o repetir aqui.',
          ],
        },
        {
          id: 'local-only-and-privacy-first-routing',
          heading: 'Os modos de routing Local-Only e Privacy-First da ClawAI',
          paragraphs: [
            'O routing Local-Only mantém todos os pedidos em hardware sob o seu controle, usando Ollama ou llama.cpp em vez de qualquer provedor na nuvem. O Privacy-First é um modo separado com prioridades próprias; ambos existem especificamente porque nem toda carga de trabalho deve usar o routing Auto por padrão. Escolher entre eles, ou fixar um modelo local específico no modo Manual Model, é uma decisão de carga de trabalho que vale a pena tomar de forma deliberada em vez de deixar a um padrão de uso geral.',
          ],
        },
        {
          id: 'choosing-which-open-weight-model',
          heading: 'Como escolher qual modelo de pesos abertos executar',
          paragraphs: [
            'Esta página propositadamente não nomeia nenhum modelo de pesos abertos específico, pela mesma razão que a página de provedores de IA local também não o faz: o campo evolui mais depressa do que uma página estática consegue acompanhar, e uma recomendação desatualizada é pior do que nenhuma. Veja o que é IA local-first, ligado abaixo, para como pensar sobre a troca entre um modelo de pesos abertos executado por si e um provedor na nuvem.',
          ],
        },
      ],
      faq: [
        {
          question:
            'Qual modelo de pesos abertos devo executar para uma carga de trabalho privada?',
          answer:
            'Esta página não recomenda nenhum — veja o que é IA local-first, ligado abaixo, para como pensar sobre essa escolha, já que o modelo certo depende do seu hardware e da sua tarefa de uma forma que uma página estática não consegue acompanhar com responsabilidade.',
        },
        {
          question: 'Qual é a diferença entre o routing Local-Only e o Privacy-First?',
          answer:
            'O Local-Only mantém todos os pedidos em hardware sob o seu controle via Ollama ou llama.cpp; o Privacy-First é um modo de routing separado com prioridades próprias. Ambos existem porque nem toda carga de trabalho deve usar o routing Auto por padrão.',
        },
        {
          question: 'Executar um modelo localmente custa algo através da ClawAI?',
          answer:
            'A ClawAI não cobra uma tarifa por token para um modelo executado localmente da forma como cobra para um provedor na nuvem, já que não há nenhum provedor na nuvem a ser faturado — o custo é o hardware que já usa. Confirme o comportamento atual do plano na página de preços.',
        },
      ],
      productNote:
        'O modo de routing Local-Only da ClawAI mantém todos os pedidos em hardware sob o seu controle via Ollama ou llama.cpp — um conector real e já disponível, não um item de roadmap.',
      catalogDisclaimer:
        'Nenhum modelo específico é nomeado aqui de propósito — os modelos de pesos abertos e as suas capacidades mudam rapidamente, e é você quem escolhe quais executar. Confirme o comportamento do plano para cargas de trabalho locais na página de preços.',
    },
  },
};
