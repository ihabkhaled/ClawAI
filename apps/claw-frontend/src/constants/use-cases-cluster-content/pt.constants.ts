import { UseCaseTask } from '@/enums/use-case-task.enum';
import type { UseCasesClusterDictionary } from '@/types/use-cases-cluster.types';

export const PT_USE_CASES_CLUSTER_CONTENT: UseCasesClusterDictionary = {
  labels: {
    onThisPage: 'Nesta página',
    faqTitle: 'Perguntas frequentes',
    relatedTitle: 'Para onde ir a seguir',
    lastReviewed: 'Última revisão',
    backToHub: 'Todos os casos de uso',
    ctaTitle: 'Experimente em vez de confiar apenas na nossa palavra',
    ctaBody:
      'A ClawAI direciona uma conversa para o modelo e as ferramentas adequados à tarefa, entre todos os provedores a que se conecta, a partir de um único espaço de trabalho.',
    startFree: 'Comece no plano gratuito',
    seeFeatures: 'Veja o que a ClawAI faz',
  },
  hub: {
    tasksHeading: 'Aprofunde numa tarefa específica',
    tasksIntro:
      'Os casos acima são a versão resumida. Cada uma das sete tarefas abaixo tem uma página completa: o que a tarefa realmente exige, qual funcionalidade ou modo de routing da ClawAI trata dela, e onde verificar os detalhes por conta própria.',
    cardSummaries: {
      [UseCaseTask.CODING_AND_DEVELOPMENT]:
        'Escrever, editar e rever código, com o agente de programação para alterações em várias etapas.',
      [UseCaseTask.RESEARCH_AND_FACT_FINDING]:
        'Respostas baseadas em fontes que a ClawAI realmente consultou, não apenas dados de treino.',
      [UseCaseTask.WRITING_AND_EDITING]:
        'Redação e edição de textos longos que se mantêm consistentes ao longo de todo o documento.',
      [UseCaseTask.COMPARING_MODEL_ANSWERS]:
        'Executar o mesmo prompt em vários modelos lado a lado, e deixar um deles avaliar os restantes.',
      [UseCaseTask.WORKSPACE_AUTOMATION]:
        'Conectar as ferramentas que a sua equipa já usa para que a ClawAI possa agir dentro delas.',
      [UseCaseTask.STRUCTURED_DATA_EXTRACTION]:
        'Transformar texto ou páginas desorganizados em saída estruturada que os seus próprios sistemas conseguem consumir.',
      [UseCaseTask.PRIVATE_AND_LOCAL_DEPLOYMENT]:
        'Manter um pedido em hardware sob seu controle em vez de um provedor na nuvem.',
    },
  },
  tasks: {
    [UseCaseTask.CODING_AND_DEVELOPMENT]: {
      seo: {
        title: 'Programação e desenvolvimento com a ClawAI',
        description:
          'Como a ClawAI apoia a programação — converse com um modelo para uma correção rápida, ou entregue uma alteração em várias etapas ao agente de programação. Baseado no produto real, sem benchmarks inventados.',
        keywords: [
          'IA para programação',
          'caso de uso do agente de programação',
          'fluxo de trabalho de programação a par com IA',
        ],
      },
      eyebrow: 'Caso de uso',
      title: 'Programação e desenvolvimento',
      summary:
        'O trabalho de programação na ClawAI abrange duas formas: uma pergunta rápida ou uma edição de um único ficheiro respondida numa conversa comum, e uma alteração em várias etapas — vários ficheiros, um plano, uma revisão — entregue ao agente de programação. Ambas partilham o mesmo routing e o mesmo catálogo de provedores por baixo.',
      sections: [
        {
          id: 'quick-fixes-in-chat',
          heading: 'Correções e perguntas rápidas, numa conversa comum',
          paragraphs: [
            'Uma edição de um único ficheiro, a explicação de um erro, ou uma pequena refatoração é uma mensagem de chat comum da ClawAI como qualquer outra. O router pode enviá-la para um modelo adequado à tarefa sob o routing Auto ou High Reasoning, ou pode fixar um modelo específico no modo Manual Model se já souber de qual precisa para um tipo de pergunta recorrente — veja como escolher um modelo para programação, ligado abaixo, para o que ponderar nesse caso.',
          ],
        },
        {
          id: 'multi-step-changes-with-the-coding-agent',
          heading: 'Alterações em várias etapas com o agente de programação',
          paragraphs: [
            'Para uma alteração que abrange vários ficheiros ou etapas — uma funcionalidade, uma migração, uma refatoração com um plano — o agente de programação da ClawAI executa um ciclo por turnos sobre a sua base de código em vez de responder numa única mensagem, com a sua própria superfície de uso medida, separada da conversa comum. Veja a página do agente de programação, ligada abaixo, para o que faz e como é instalado.',
          ],
        },
        {
          id: 'connecting-your-repository',
          heading: 'Conectar o repositório que o trabalho envolve',
          paragraphs: [
            'O trabalho de programação frequentemente precisa de ter o próprio repositório à vista, não apenas trechos colados — a ClawAI conecta-se ao GitHub, GitLab e Bitbucket como conectores de espaço de trabalho, para que um pedido possa referenciar o código, os problemas ou os pull requests reais em que está a trabalhar, em vez de copiar ficheiros à mão. Veja a página de integrações, ligada abaixo, para a lista completa de conectores.',
          ],
        },
      ],
      faq: [
        {
          question: 'A ClawAI escreve código por mim automaticamente?',
          answer:
            'Para uma alteração pequena e bem especificada, uma mensagem de chat comum costuma resolver. Para uma alteração em várias etapas que abrange vários ficheiros, o agente de programação executa um ciclo por turnos sobre a sua base de código em vez de responder de uma só vez — veja a página do agente de programação, ligada abaixo.',
        },
        {
          question: 'A ClawAI consegue ver o meu repositório real?',
          answer:
            'Sim, assim que o conectar — a ClawAI tem conectores de espaço de trabalho para GitHub, GitLab e Bitbucket, para que um pedido de programação possa referenciar ficheiros, problemas e pull requests reais em vez de trechos colados.',
        },
        {
          question: 'Qual modelo devo usar para programação?',
          answer:
            'Esta página não nomeia um — veja como escolher um modelo para programação, ligado abaixo, para o que ponderar em vez de um ranking.',
        },
      ],
      productNote:
        'A ClawAI direciona automaticamente uma pergunta de programação comum para um modelo adequado, e entrega uma alteração em várias etapas ao agente de programação — uma funcionalidade real e já disponível, com o seu próprio uso medido, não um truque de chat.',
    },
    [UseCaseTask.RESEARCH_AND_FACT_FINDING]: {
      seo: {
        title: 'Pesquisa e verificação de factos com a ClawAI',
        description:
          'Como o modo Research da ClawAI pesquisa, obtém e extrai conteúdo da web para que uma resposta cite fontes que realmente consultou, cobrado separadamente do crédito de modelo.',
        keywords: [
          'assistente de pesquisa com IA',
          'verificação de factos com IA',
          'respostas de IA com fontes',
        ],
      },
      eyebrow: 'Caso de uso',
      title: 'Pesquisa e verificação de factos',
      summary:
        'Uma tarefa de pesquisa pede uma resposta baseada em fontes consultadas especificamente para essa pergunta, não apenas no que um modelo aprendeu durante o treino. O modo Research da ClawAI é uma funcionalidade real, já disponível, construída exatamente para isto, com três profundidades e a sua própria medição, separada da conversa comum.',
      sections: [
        {
          id: 'what-research-mode-does',
          heading: 'O que faz realmente o modo Research',
          paragraphs: [
            'O modo Research permite que um pedido pesquise na web, obtenha uma página, ou obtenha e extraia conteúdo estruturado de uma página, antes de a ClawAI produzir uma resposta — assim a resposta pode citar fontes recolhidas para essa pergunta em vez de depender apenas de dados de treino. É uma funcionalidade sujeita ao plano, com três profundidades: apenas pesquisa, pesquisa mais obtenção de página, ou pesquisa mais obtenção e extração.',
          ],
        },
        {
          id: 'billed-separately-from-model-credit',
          heading: 'Medido separadamente do seu crédito de modelo',
          paragraphs: [
            'O acesso à pesquisa — pesquisa na web, obtenção de páginas e extração — é medido como uso próprio, separado do limite de tokens de que uma mensagem de chat comum depende. O limite de pesquisa do seu plano e o seu limite de tokens de modelo são duas linhas diferentes, não um único conjunto partilhado, pelo que executar uma pesquisa não consome o crédito que uma tarefa de programação ou de escrita usaria.',
          ],
        },
        {
          id: 'picking-a-depth-for-the-question',
          heading: 'Escolher uma profundidade adequada à pergunta',
          paragraphs: [
            'Uma verificação rápida de um facto costuma precisar apenas da profundidade de apenas pesquisa; uma pergunta que depende do que uma página específica realmente diz pede pesquisa mais obtenção; extrair dados estruturados de várias páginas ao mesmo tempo é onde a pesquisa mais obtenção e extração compensa o seu custo. Ajustar a profundidade à pergunta mantém o uso de pesquisa proporcional, em vez de recorrer sempre à opção mais cara por padrão.',
          ],
        },
      ],
      faq: [
        {
          question: 'A pesquisa usa o meu crédito de tokens de modelo?',
          answer:
            'Não. O acesso à pesquisa — pesquisa na web, obtenção de páginas e extração — é medido separadamente do limite de tokens de que uma mensagem de chat comum depende. Confirme ambos os limites na página de preços.',
        },
        {
          question: 'Qual é a diferença entre as três profundidades do modo Research?',
          answer:
            'Apenas pesquisa devolve resultados de uma pesquisa na web; pesquisa mais obtenção também recolhe o conteúdo da página; pesquisa mais obtenção e extração ainda retira conteúdo estruturado do que foi obtido.',
        },
        {
          question: 'O modelo que escolho importa para a qualidade da pesquisa?',
          answer:
            'Sim — o modo Research muda quais fontes um modelo consegue ver, não a qualidade com que as lê e concilia. Veja como escolher um modelo para pesquisa com fontes, ligado abaixo.',
        },
      ],
      productNote:
        'O modo Research da ClawAI pode pesquisar, obter e obter-e-extrair conteúdo da web antes de um modelo responder — uma funcionalidade real e já disponível, medida separadamente do seu crédito de tokens de modelo.',
    },
    [UseCaseTask.WRITING_AND_EDITING]: {
      seo: {
        title: 'Escrita e edição com a ClawAI',
        description:
          'Como a ClawAI apoia a redação e a edição de textos longos — pacotes de contexto para material de referência, memória para um estilo recorrente, e routing para um modelo adequado.',
        keywords: [
          'assistente de escrita com IA',
          'fluxo de trabalho de edição com IA',
          'redação de textos longos com IA',
        ],
      },
      eyebrow: 'Caso de uso',
      title: 'Escrita e edição',
      summary:
        'A escrita e a edição na ClawAI vão desde uma pequena reescrita até um documento longo que tem de se manter consistente da primeira à última página. Duas funcionalidades carregam a maior parte do peso quando um documento cresce: os pacotes de contexto para material de referência, e a memória para um estilo que deve persistir entre sessões.',
      sections: [
        {
          id: 'reference-material-with-context-packs',
          heading: 'Manter material de referência à vista com pacotes de contexto',
          paragraphs: [
            'Um guia de estilo, rascunhos anteriores, ou material de origem com que um texto tem de se manter consistente é, antes de mais, um problema de contexto e não de escrita — os pacotes de contexto da ClawAI são uma funcionalidade sujeita ao plano para manter esse material disponível a uma conversa em vez de o colar de novo a cada sessão. Veja o que são os pacotes de contexto, ligado abaixo, para como a funcionalidade funciona.',
          ],
        },
        {
          id: 'memory-for-a-recurring-voice',
          heading: 'Memória para uma voz que deve persistir',
          paragraphs: [
            'Uma tarefa de escrita recorrente — uma newsletter, um relatório semanal, um estilo de documentação — beneficia de a ClawAI recordar preferências já estabelecidas entre sessões em vez de as repetir sempre. A memória é uma funcionalidade separada dos pacotes de contexto, também sujeita ao plano: os pacotes de contexto guardam material de referência para uma tarefa, a memória guarda o que a ClawAI aprendeu sobre como quer que as coisas sejam escritas.',
          ],
        },
        {
          id: 'routing-a-writing-request',
          heading: 'Direcionar um pedido de escrita ou edição para um modelo adequado',
          paragraphs: [
            'O router da ClawAI pode enviar automaticamente um pedido de escrita ou edição para um modelo adequado sob o routing Auto ou Cost Saver, ou pode fixar um no modo Manual Model para uma tarefa recorrente com um estilo conhecido. Veja como escolher um modelo para escrita e edição, ligado abaixo, para o que ponderar ao escolher um deliberadamente.',
          ],
        },
      ],
      faq: [
        {
          question:
            'A ClawAI consegue manter um guia de estilo à vista ao longo de toda uma sessão de edição?',
          answer:
            'Sim — os pacotes de contexto foram feitos exatamente para isto, mantendo material de referência como um guia de estilo ou um documento de origem disponível a uma conversa em vez de o colar de novo. Veja o que são os pacotes de contexto, ligado abaixo.',
        },
        {
          question: 'A ClawAI recorda como gosto que as coisas sejam escritas?',
          answer:
            'A memória pode manter preferências já estabelecidas entre sessões para uma tarefa de escrita recorrente, separadamente dos pacotes de contexto, que guardam material de referência específico da tarefa em vez de preferências de longo prazo.',
        },
        {
          question: 'Qual modelo devo usar para escrita?',
          answer:
            'Esta página não nomeia um — veja como escolher um modelo para escrita e edição, ligado abaixo, para o que ponderar em vez de um ranking.',
        },
      ],
      productNote:
        'A ClawAI consegue manter material de referência à vista com pacotes de contexto e recordar um estilo recorrente com memória — ambas funcionalidades reais, sujeitas ao plano, não truques de chat.',
    },
    [UseCaseTask.COMPARING_MODEL_ANSWERS]: {
      seo: {
        title: 'Comparar respostas de modelos com a ClawAI',
        description:
          'Como os modos Compare e Judge da ClawAI executam um prompt em vários modelos lado a lado e deixam um modelo juiz avaliar os resultados — baseado na funcionalidade real, sem rankings inventados.',
        keywords: [
          'comparar respostas de modelos de IA',
          'consenso entre modelos de IA',
          'respostas de IA best-of-N',
        ],
      },
      eyebrow: 'Caso de uso',
      title: 'Comparar respostas de modelos',
      summary:
        'Às vezes a decisão certa não é escolher um modelo à partida, mas executar o mesmo prompt em vários e observar o que cada um devolve. O modo Compare da ClawAI faz exatamente isso, e o modo Judge pode deixar um modelo separado avaliar os resultados em vez de o obrigar a ler cada resposta.',
      sections: [
        {
          id: 'what-compare-mode-does',
          heading: 'O que faz o modo Compare',
          paragraphs: [
            'O modo Compare envia um prompt a vários modelos ao mesmo tempo e mostra as respostas lado a lado, para que uma decisão importante — uma questão de julgamento, um pedido ambíguo, um caso em que a interpretação de um modelo pode estar errada — receba mais do que uma perspetiva. É uma funcionalidade sujeita ao plano, medida por via e não por execução, pelo que o custo aumenta conforme o número de modelos comparados.',
          ],
        },
        {
          id: 'consensus-and-best-of-n',
          heading: 'Consenso e best-of-N, explicados devidamente',
          paragraphs: [
            'Duas ideias descrevem o que fazer com várias respostas depois de as ter: o consenso, em que a concordância entre modelos já é informativa por si só, e o best-of-N, em que se geram vários candidatos e se escolhe ou sintetiza o mais forte. Veja o que é o consenso de IA e o que é best-of-N, ambos ligados abaixo, para como cada um funciona realmente, sem uma versão de marketing.',
          ],
        },
        {
          id: 'judge-mode-and-critic-review',
          heading: 'Deixar um modelo avaliar os restantes',
          paragraphs: [
            'O modo Judge é uma funcionalidade separada, sujeita ao plano, que executa uma segunda passagem sobre uma execução do Compare, com um modelo a avaliar os restantes em vez de o obrigar a ler cada resposta à mão. A revisão crítica é uma funcionalidade relacionada, mas separada, para um segundo olhar sobre uma única resposta em vez de uma comparação entre modelos — veja o que é um juiz de IA, ligado abaixo, para como a avaliação realmente funciona.',
          ],
        },
      ],
      faq: [
        {
          question: 'Qual é a diferença entre o modo Compare e o modo Judge?',
          answer:
            'O modo Compare executa um prompt em vários modelos e mostra todas as respostas lado a lado. O modo Judge é uma segunda passagem separada, sujeita ao plano, que faz um modelo avaliar os resultados de uma execução do Compare em vez de os ler um a um.',
        },
        {
          question: 'O modo Compare custa mais do que uma mensagem de chat comum?',
          answer:
            'O uso do Compare é medido por via, não por execução — executar o mesmo prompt contra mais modelos custa proporcionalmente mais. Confirme o limite atual na página de preços.',
        },
        {
          question: 'O que é o best-of-N, e é o mesmo que consenso?',
          answer:
            'Não — o consenso trata a concordância entre respostas de modelos como informativa por si só, enquanto o best-of-N gera vários candidatos e escolhe ou sintetiza o mais forte. Veja o que é o consenso de IA e o que é best-of-N, ambos ligados abaixo.',
        },
      ],
      productNote:
        'Os modos Compare e Judge da ClawAI são funcionalidades reais, já disponíveis e sujeitas ao plano — um prompt em vários modelos, com um segundo modelo opcional para avaliar os resultados.',
    },
    [UseCaseTask.WORKSPACE_AUTOMATION]: {
      seo: {
        title: 'Automação do espaço de trabalho com a ClawAI',
        description:
          'Como a ClawAI se conecta às ferramentas que uma equipa já usa — GitHub, Slack, Jira, Google Drive e mais — para que um pedido possa agir dentro delas, não apenas falar sobre elas.',
        keywords: [
          'automação de espaço de trabalho com IA',
          'conectores de ferramentas de IA',
          'conectar IA ao Slack e ao Jira',
        ],
      },
      eyebrow: 'Caso de uso',
      title: 'Automação do espaço de trabalho',
      summary:
        'Um conector de espaço de trabalho permite que um pedido da ClawAI leia ou aja sobre uma ferramenta que a sua equipa já usa, em vez de copiar informação manualmente entre sistemas. A ClawAI tem hoje 14 conectores de espaço de trabalho, abrangendo alojamento de código, chat, gestão de projetos, documentos e calendários.',
      sections: [
        {
          id: 'what-a-workspace-connector-is',
          heading: 'O que faz realmente um conector de espaço de trabalho',
          paragraphs: [
            'Um espaço de trabalho conectado permite que um pedido referencie ou aja sobre dados reais nessa ferramenta — um ticket do Jira, uma conversa do Slack, um ficheiro no Google Drive — em vez de os colar na conversa. O acesso ao espaço de trabalho é uma funcionalidade sujeita ao plano, e as ações de conector são medidas como a sua própria superfície, separada da conversa comum.',
          ],
        },
        {
          id: 'which-tools-connect',
          heading: 'A que ferramentas a ClawAI se conecta',
          paragraphs: [
            'Os conectores da ClawAI abrangem alojamento de código (GitHub, GitLab, Bitbucket), mensagens e gestão de projetos (Slack, Jira, Confluence, ClickUp), design (Figma), documentos e armazenamento (Google Drive, Gmail, Microsoft SharePoint, Microsoft OneDrive) e calendários (Google Calendar, Outlook Calendar). Veja a página de integrações, ligada abaixo, para o que cada um faz.',
          ],
        },
        {
          id: 'multi-model-review-and-handoff',
          heading: 'Revisão multimodelo e transferência dentro de uma ação de espaço de trabalho',
          paragraphs: [
            'Uma ação de espaço de trabalho pode envolver mais do que uma única chamada a um modelo — um encadeamento de rascunhos ou uma etapa de transferência, ou uma revisão multimodelo do resultado antes de se agir sobre ele, fazem parte da mesma superfície medida em vez de serem uma funcionalidade separada que é preciso ativar. É a mesma infraestrutura de routing usada no resto da ClawAI, aplicada a ações que tocam uma ferramenta conectada.',
          ],
        },
      ],
      faq: [
        {
          question: 'A quantas ferramentas a ClawAI se conecta?',
          answer:
            'Catorze conectores de espaço de trabalho hoje, abrangendo alojamento de código, mensagens, gestão de projetos, design, documentos, armazenamento e calendários. Veja a página de integrações, ligada abaixo, para a lista completa.',
        },
        {
          question: 'A ClawAI consegue agir sobre uma ferramenta conectada, ou só ler dela?',
          answer:
            'As ações de espaço de trabalho conseguem agir sobre uma ferramenta conectada, não apenas ler dela — os detalhes dependem do conector e do limite de espaço de trabalho do seu plano.',
        },
        {
          question: 'A automação do espaço de trabalho é medida separadamente da conversa comum?',
          answer:
            'Sim — as ações de conector são medidas como a sua própria superfície de uso, separada do limite de tokens de que uma mensagem de chat comum depende. Confirme o limite atual na página de preços.',
        },
      ],
      productNote:
        'A ClawAI conecta-se hoje a 14 ferramentas de espaço de trabalho — alojamento de código, mensagens, gestão de projetos, design, documentos e calendários — com a sua própria superfície de uso medida para ações dentro delas.',
    },
    [UseCaseTask.STRUCTURED_DATA_EXTRACTION]: {
      seo: {
        title: 'Extração de dados estruturados com a ClawAI',
        description:
          'Como a ClawAI transforma texto e páginas não estruturados em saída estruturada — chamadas de ferramenta para um esquema definido, e a profundidade de extração do modo Research para páginas web.',
        keywords: [
          'extração de dados estruturados com IA',
          'saída em JSON com IA',
          'extrair dados de texto com IA',
        ],
      },
      eyebrow: 'Caso de uso',
      title: 'Extração de dados estruturados',
      summary:
        'Transformar texto desorganizado, um documento ou uma página web numa estrutura definida que os seus próprios sistemas conseguem consumir é uma tarefa diferente de escrever prosa — depende de chamadas de ferramenta para um esquema fixo e, quando a origem é uma página web, da profundidade de extração do modo Research da ClawAI.',
      sections: [
        {
          id: 'tool-calling-for-a-defined-schema',
          heading: 'Chamadas de ferramenta para um esquema de saída definido',
          paragraphs: [
            'Quando um pedido precisa que a sua saída tenha uma forma específica — um conjunto fixo de campos, uma estrutura JSON definida — o mecanismo de chamadas de ferramenta da ClawAI é o que torna isso fiável, em vez de esperar que uma resposta em texto simples seja interpretada corretamente. Veja como funcionam as chamadas de ferramenta de IA e o que são saídas de IA estruturadas, ambos ligados abaixo, para como o mecanismo realmente funciona.',
          ],
        },
        {
          id: 'extracting-from-a-web-page',
          heading: 'Extrair conteúdo estruturado de uma página web',
          paragraphs: [
            'Quando a origem é uma página web ao vivo e não um texto que já tem, a profundidade de pesquisa mais obtenção e extração do modo Research retira conteúdo estruturado do que obtém, como parte da mesma funcionalidade usada para pesquisa com fontes. É medida como uso de pesquisa, separado do limite de tokens de que uma mensagem de chat comum depende.',
          ],
        },
        {
          id: 'file-generation-for-the-output',
          heading: 'Gerar um ficheiro a partir do resultado extraído',
          paragraphs: [
            'Uma vez extraídos os dados, a geração de documentos e ficheiros da ClawAI pode transformá-los num ficheiro descarregável em vez de deixar o resultado apenas na transcrição do chat — a sua própria superfície medida, separada da conversa comum e da pesquisa.',
          ],
        },
      ],
      faq: [
        {
          question: 'A ClawAI consegue garantir uma saída JSON válida?',
          answer:
            'As chamadas de ferramenta para um esquema definido são o que torna a saída estruturada fiável, em vez de interpretar uma resposta em texto simples depois de gerada. Veja como funcionam as chamadas de ferramenta de IA, ligado abaixo, para o mecanismo.',
        },
        {
          question:
            'A ClawAI consegue extrair dados estruturados de uma página web, não apenas de texto que eu cole?',
          answer:
            'Sim — a profundidade de pesquisa mais obtenção e extração do modo Research retira conteúdo estruturado de uma página web que obtém, medida como uso de pesquisa separado da conversa comum.',
        },
        {
          question:
            'Posso obter o resultado extraído como um ficheiro em vez de apenas texto de chat?',
          answer:
            'Sim — a geração de documentos e ficheiros pode transformar um resultado extraído num ficheiro descarregável, na sua própria superfície de uso medida.',
        },
      ],
      productNote:
        'As chamadas de ferramenta da ClawAI para um esquema definido, e a profundidade de extração do modo Research para páginas web, são funcionalidades reais e já disponíveis por trás da extração de dados estruturados — não um único truque de prompt.',
    },
    [UseCaseTask.PRIVATE_AND_LOCAL_DEPLOYMENT]: {
      seo: {
        title: 'Implementação privada e local com a ClawAI',
        description:
          'Como os modos de routing Local-Only e Privacy-First da ClawAI mantêm um pedido em hardware sob seu controle, usando os conectores Ollama e llama.cpp em vez de um provedor na nuvem.',
        keywords: [
          'implementação privada de IA',
          'cargas de trabalho de IA locais',
          'executar modelos de IA no seu próprio hardware',
        ],
      },
      eyebrow: 'Caso de uso',
      title: 'Implementação privada e local',
      summary:
        'Alguns trabalhos têm de permanecer em hardware sob seu controle, sem chegar a nenhum provedor na nuvem. A ClawAI tem conectores reais para Ollama e llama.cpp exatamente para isto, além de modos de routing que mantêm um pedido local por política e não por acidente.',
      sections: [
        {
          id: 'what-local-deployment-changes',
          heading: 'O que realmente muda ao executar localmente',
          paragraphs: [
            'Um provedor na nuvem, noutro ponto do catálogo da ClawAI, executa um modelo na sua própria infraestrutura e cobra por pedido; o Ollama e o llama.cpp, em vez disso, carregam um modelo de pesos abertos em hardware sob o seu controle, para que o pedido nunca saia dele. Isso muda quem consegue ver o pedido, não a capacidade de um determinado modelo.',
          ],
        },
        {
          id: 'local-only-and-privacy-first-routing',
          heading: 'Os modos de routing Local-Only e Privacy-First',
          paragraphs: [
            'O routing Local-Only mantém todos os pedidos em hardware sob o seu controle, usando Ollama ou llama.cpp em vez de qualquer provedor na nuvem. O Privacy-First é um modo separado com prioridades próprias; ambos existem porque nem toda carga de trabalho deve usar o routing Auto por padrão, e escolher entre eles é uma decisão deliberada, não algo a deixar por padrão sem examinar.',
          ],
        },
        {
          id: 'when-private-deployment-fits',
          heading: 'Quando uma carga de trabalho privada ou local é a escolha certa',
          paragraphs: [
            'Uma carga de trabalho privada ou local é definida por onde o pedido é executado, não pelo tipo de tarefa — programação, escrita ou pesquisa podem todas ser executadas desta forma se o requisito for que nada saia de hardware sob o seu controle. Veja como escolher um modelo para cargas de trabalho privadas e locais e o que é IA local-first, ambos ligados abaixo, para as trocas a ponderar.',
          ],
        },
      ],
      faq: [
        {
          question: 'Qual é a diferença entre o routing Local-Only e o Privacy-First?',
          answer:
            'O Local-Only mantém todos os pedidos em hardware sob o seu controle via Ollama ou llama.cpp; o Privacy-First é um modo de routing separado com prioridades próprias. Ambos existem porque nem toda carga de trabalho deve usar o routing Auto por padrão.',
        },
        {
          question: 'Qual modelo de pesos abertos devo executar localmente?',
          answer:
            'Esta página não recomenda nenhum — veja o que é IA local-first, ligado abaixo, para como pensar sobre essa escolha, já que o modelo certo depende do seu hardware e da sua tarefa.',
        },
        {
          question: 'Posso executar qualquer tipo de tarefa localmente, ou só algumas?',
          answer:
            'Uma carga de trabalho privada ou local é definida por onde o pedido é executado, não pela tarefa — programação, escrita ou pesquisa podem todas ser executadas desta forma se manter tudo em hardware sob o seu controle importar mais do que qual tarefa é.',
        },
      ],
      productNote:
        'Os modos de routing Local-Only e Privacy-First da ClawAI mantêm um pedido em hardware sob o seu controle via os conectores Ollama e llama.cpp — conectores reais e já disponíveis, não um item de roadmap.',
    },
  },
};
