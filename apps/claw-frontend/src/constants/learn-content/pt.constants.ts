import { LearnTopic } from '@/enums/learn-topic.enum';
import type { LearnDictionary } from '@/types/learn.types';

export const PT_LEARN_CONTENT: LearnDictionary = {
  labels: {
    onThisPage: 'Nesta página',
    faqTitle: 'Perguntas frequentes',
    relatedTitle: 'Para onde seguir',
    lastReviewed: 'Última revisão',
    backToHub: 'Todos os guias',
    ctaTitle: 'Experimente em vez de ler sobre isso',
    ctaBody:
      'O ClawAI reúne estas técnicas num único espaço de trabalho, para que você envie o mesmo prompt a vários modelos e veja a diferença por conta própria.',
    startFree: 'Começar no plano gratuito',
    seeFeatures: 'Ver o que o ClawAI faz',
  },
  hub: {
    seo: {
      title: 'Guias: IA multimodelo, roteamento e orquestração',
      description:
        'Explicações claras das técnicas por trás da IA multimodelo: roteamento, consenso, verificação, RAG, memória e modelos de pesos abertos no seu próprio hardware.',
      keywords: ['orquestração de LLM', 'roteamento de modelos de IA', 'IA multimodelo'],
    },
    eyebrow: 'Guias',
    title: 'Como a IA multimodelo funciona de verdade',
    summary:
      'Explicações curtas e práticas das ideias por trás de enviar um prompt a mais de um modelo: o que cada técnica faz, quando compensa o custo e quando um único modelo é a melhor resposta. Sem benchmarks de fornecedor nem números inventados.',
    topicsHeading: 'Escolha um conceito',
    cardSummaries: {
      [LearnTopic.WHAT_IS_MULTI_MODEL_AI]:
        'Usar vários modelos num mesmo fluxo em vez de se prender a um só.',
      [LearnTopic.WHAT_IS_LLM_ORCHESTRATION]:
        'A camada que decide qual modelo roda, em que ordem e o que acontece com o resultado.',
      [LearnTopic.WHAT_IS_AI_MODEL_ROUTING]:
        'Enviar cada requisição a um modelo escolhido por tarefa, custo, privacidade ou latência.',
      [LearnTopic.WHAT_IS_MODEL_FALLBACK]:
        'O que deve acontecer quando o primeiro modelo cai, é limitado ou recusa.',
      [LearnTopic.WHAT_IS_AI_CONSENSUS]:
        'Fazer a mesma pergunta a vários modelos e usar a concordância como sinal.',
      [LearnTopic.WHAT_IS_BEST_OF_N]: 'Gerar várias respostas candidatas e ficar com a melhor.',
      [LearnTopic.WHAT_IS_AN_AI_JUDGE]:
        'Usar um modelo para pontuar respostas de outros, e onde isso falha.',
      [LearnTopic.WHAT_IS_AI_ANSWER_VERIFICATION]:
        'Conferir uma resposta contra algo diferente do modelo que a produziu.',
      [LearnTopic.WHAT_IS_A_CONTEXT_WINDOW]:
        'A memória de trabalho de uma única requisição, e por que não é memória.',
      [LearnTopic.WHAT_IS_RAG]: 'Recuperar seus próprios documentos e colocá-los diante do modelo.',
      [LearnTopic.WHAT_IS_AI_MEMORY]: 'O que persiste entre conversas, e quanto isso custa.',
      [LearnTopic.WHAT_ARE_CONTEXT_PACKS]:
        'Pacotes de contexto reutilizáveis que você anexa a uma conversa de propósito.',
      [LearnTopic.WHAT_IS_LOCAL_AI]:
        'Rodar um modelo em hardware que você controla, e o que isso muda de fato.',
      [LearnTopic.WHAT_ARE_OPEN_WEIGHT_MODELS]:
        'Modelos cujos pesos você pode baixar — e o que «aberto» significa e não significa.',
      [LearnTopic.WHAT_IS_SELF_HOSTED_AI]:
        'Rodar a aplicação inteira por conta própria, não apenas o modelo.',
      [LearnTopic.OLLAMA_VS_LLAMACPP]:
        'Duas formas de rodar modelos de pesos abertos localmente, e para que serve cada uma.',
      [LearnTopic.CLOUD_AI_VS_LOCAL_AI]:
        'A troca real: capacidade e conveniência contra controle e formato de custo.',
      [LearnTopic.AI_AGENT_VS_AI_CHATBOT]:
        'A diferença entre responder a você e fazer algo por você.',
    },
  },
  topics: {
    [LearnTopic.WHAT_IS_MULTI_MODEL_AI]: {
      seo: {
        title: 'O que é IA multimodelo?',
        description:
          'IA multimodelo é usar vários modelos de linguagem num mesmo fluxo em vez de se prender a um. O que resolve, o que custa e quando um só basta.',
        keywords: ['IA multimodelo', 'vários modelos de IA', 'escolha de modelo'],
      },
      eyebrow: 'Fundamentos',
      title: 'O que é IA multimodelo?',
      summary:
        'A IA multimodelo trata modelos de linguagem como peças intercambiáveis em vez de escolher um e construir tudo à volta dele. A mesma pergunta pode ir a um modelo rápido e barato, a um modelo pesado de raciocínio ou a um que roda no seu hardware — escolhido por requisição e não uma única vez, na contratação.',
      sections: [
        {
          id: 'the-problem',
          heading: 'O problema que resolve',
          paragraphs: [
            'Modelos não são uniformemente melhores ou piores uns que os outros. Um escreve código mais limpo, outro segue documentos longos com mais fidelidade, um terceiro responde numa fração do tempo por uma fração do custo. Prender-se a um fornecedor significa aceitar o ponto mais fraco dele em todas as suas tarefas.',
            'Significa também aceitar as quedas, os limites de uso, as mudanças de preço e as descontinuações. Quando um modelo do qual você depende é aposentado, um fluxo de modelo único precisa ser refeito. Um fluxo multimodelo muda uma configuração.',
          ],
        },
        {
          id: 'what-it-looks-like',
          heading: 'Como isso aparece na prática',
          paragraphs: [
            'Na forma mais simples, a IA multimodelo é uma lista suspensa: você escolhe o modelo por conversa. Já é útil, e é por aí que a maioria começa.',
            'Fica mais interessante quando a escolha é automática — quando um roteador lê a requisição e a envia para onde faz sentido — e mais ainda quando vários modelos respondem ao mesmo tempo e as respostas são comparadas, pontuadas ou combinadas. São técnicas distintas, cada uma com seu custo, e cada uma tem sua página aqui.',
          ],
        },
        {
          id: 'the-cost',
          heading: 'Quanto custa',
          paragraphs: [
            'Cada modelo adicionado é mais uma conta de fornecedor, mais um conjunto de credenciais, mais uma relação de cobrança e mais um formato de dados de uso. Esse peso é o argumento honesto contra o multimodelo, e é por isso que quase ninguém faz isso à mão.',
            'Rodar vários modelos no mesmo prompt multiplica seu custo em tokens. Técnicas como consenso e melhor de N valem o preço em decisões que importam e são desperdício puro em perguntas de rotina. Saber distinguir é quase toda a habilidade.',
          ],
        },
        {
          id: 'when-one-is-enough',
          heading: 'Quando um único modelo é a resposta certa',
          paragraphs: [
            'Se a sua carga é estreita e um modelo dá conta, acrescentar outros é complexidade sem benefício. A abordagem multimodelo compensa quando as tarefas são variadas, quando o custo por tarefa varia uma ordem de grandeza entre requisições, ou quando parte dos seus dados simplesmente não pode ir para terceiros.',
          ],
        },
      ],
      faq: [
        {
          question: 'IA multimodelo não é só um gateway de API?',
          answer:
            'Um gateway dá um único endpoint para vários fornecedores, o que resolve o encanamento. IA multimodelo é o que você faz com isso: escolher por requisição, comparar respostas, recorrer a outro em caso de falha. O gateway é pré-requisito, não a técnica.',
        },
        {
          question: 'Usar vários modelos deixa as respostas mais exatas?',
          answer:
            'Por si só, não. Enviar um prompt a três modelos dá três respostas, não uma melhor. A exatidão só sobe quando você acrescenta uma forma de escolher entre elas — concordância, pontuação ou verificação externa — e cada uma tem suas próprias falhas.',
        },
        {
          question: 'Preciso de várias assinaturas?',
          answer:
            'Se for direto a cada fornecedor, sim. Plataformas que agregam fornecedores existem em parte para evitar isso. O ClawAI é uma delas: {cloudProviderCount} provedores em nuvem mais runtimes locais numa única conta.',
        },
      ],
      productNote:
        'O ClawAI é construído sobre essa ideia: {cloudProviderCount} provedores em nuvem e modelos locais de pesos abertos num mesmo espaço, com o modelo que respondeu registrado em cada mensagem.',
    },
    [LearnTopic.WHAT_IS_LLM_ORCHESTRATION]: {
      seo: {
        title: 'O que é orquestração de LLM?',
        description:
          'Orquestração de LLM é a camada que decide qual modelo roda, em que ordem e o que acontece com a saída. Como difere de prompting e de agentes.',
        keywords: ['orquestração de LLM', 'orquestração de IA', 'pipeline de modelos'],
      },
      eyebrow: 'Fundamentos',
      title: 'O que é orquestração de LLM?',
      summary:
        'Orquestração é tudo o que cerca a chamada ao modelo. Escolher qual roda, decidir se uma chamada basta, passar a saída de um passo para o próximo e decidir o que fazer quando um passo falha. O prompt é uma instrução; a orquestração é o programa dentro do qual ela roda.',
      sections: [
        {
          id: 'not-prompting',
          heading: 'Não é engenharia de prompt',
          paragraphs: [
            'Engenharia de prompt melhora uma chamada isolada. A orquestração decide quantas chamadas existem, quais modelos as fazem e como as saídas se combinam. Dá para ter prompts excelentes e nenhuma orquestração, e o resultado é um sistema que cai assim que um fornecedor tem uma hora ruim.',
            'A distinção importa porque os dois se otimizam de formas diferentes. Um prompt melhor é barato e melhora um pouco a qualidade. Uma orquestração melhor custa tokens e melhora bastante a confiabilidade.',
          ],
        },
        {
          id: 'what-it-decides',
          heading: 'O que uma camada de orquestração decide',
          paragraphs: [
            'Qual modelo. Se pergunta a mais de um. Se confere a resposta antes de devolver. O que fazer diante de uma recusa, um tempo esgotado ou um limite de uso. Se a saída deste passo vira a entrada do próximo. Se o conjunto é viável antes de começar.',
            'Cada um desses pontos é uma política, e cada uma pode errar isoladamente. Por isso vale nomear a orquestração como camada própria em vez de espalhar as decisões pelo código da aplicação.',
          ],
        },
        {
          id: 'techniques',
          heading: 'As técnicas comuns',
          paragraphs: [
            'O roteamento envia a requisição a um modelo adequado. O fallback trata a falha. O consenso pergunta a vários e observa a concordância. O melhor de N gera candidatas e fica com uma. Um juiz pontua respostas. A verificação confronta uma afirmação com algo fora do modelo. Pipelines encadeiam passos. A decomposição divide uma requisição grande em menores.',
            'O ClawAI implementa nove delas como modos de orquestração separados, mais juiz e comparação como superfícies próprias. Cada uma tem aqui uma página explicando o que é antes de você decidir se quer.',
          ],
        },
        {
          id: 'when-not-to',
          heading: 'Quando não orquestrar',
          paragraphs: [
            'A orquestração multiplica custo e latência. Um consenso com três modelos custa cerca de três vezes os tokens e demora o que o mais lento demorar. Para uma pergunta cuja resposta você confere de relance, é um mau negócio.',
            'A regra que se sustenta: orquestre quando errar sai caro e conferir é difícil. Caso contrário, mande uma requisição a um modelo e leia a resposta.',
          ],
        },
      ],
      faq: [
        {
          question: 'Orquestração é o mesmo que framework de agentes?',
          answer:
            'Há sobreposição, mas não são a mesma coisa. Um agente decide o próprio passo seguinte, em geral com ferramentas. A orquestração é a política ao redor — qual modelo, quantos, o que fazer em caso de falha — e vale igualmente para um fluxo sem agente algum.',
        },
        {
          question: 'Orquestração exige um framework?',
          answer:
            'Não. Repetir com outro modelo já é orquestração. Frameworks ajudam quando as políticas ficam numerosas a ponto de você reimplementá-las funcionalidade a funcionalidade.',
        },
        {
          question: 'Quanto custa?',
          answer:
            'Em tokens, mais ou menos proporcional a quantas chamadas a política faz. Uma chamada roteada custa quase o mesmo que uma não roteada; um consenso com três modelos, cerca de três vezes mais. O custo é previsível, e é isso que torna a decisão orçamentária em vez de aposta.',
        },
      ],
      productNote:
        'O ClawAI executa {orchestrationLabCount} modos de orquestração ao lado do chat comum e registra quais modelos cada execução usou: o custo de uma técnica se vê em vez de se deduzir.',
    },
    [LearnTopic.WHAT_IS_AI_MODEL_ROUTING]: {
      seo: {
        title: 'O que é roteamento de modelos de IA?',
        description:
          'O roteamento envia cada requisição a um modelo escolhido por tarefa, custo, privacidade ou latência em vez de usar um para tudo. Como os roteadores decidem e falham.',
        keywords: ['roteamento de modelos de IA', 'roteador de LLM', 'seleção de modelo'],
      },
      eyebrow: 'Roteamento',
      title: 'O que é roteamento de modelos de IA?',
      summary:
        'Um roteador olha a requisição antes de executá-la e escolhe qual modelo deve responder. O ponto é que o modelo certo muda conforme a requisição: uma pergunta de uma linha e uma refatoração de mil não merecem o mesmo modelo, e pagar preço de fronteira pelas duas não é escolha deliberada de ninguém.',
      sections: [
        {
          id: 'how-decisions-are-made',
          heading: 'Sobre o que um roteador decide',
          paragraphs: [
            'A maioria combina alguns sinais: que tipo de tarefa parece ser, qual o tamanho da entrada, quão sensíveis são os dados, com que rapidez a resposta é necessária e quanto a requisição pode custar.',
            'Esses sinais se contradizem. O modelo mais rápido raramente é o mais forte; a opção mais privada raramente é a mais capaz. Um roteador é, na verdade, uma política sobre o que sacrificar — os úteis deixam você dizer o que importa em vez de adivinhar.',
          ],
        },
        {
          id: 'automatic-vs-explicit',
          heading: 'Roteamento automático e explícito',
          paragraphs: [
            'O automático lê a requisição e decide. É conveniente e às vezes erra, e o erro é difícil de perceber se o sistema não disser qual modelo respondeu.',
            'O explícito significa que você define a prioridade — isto fica local, isto fica barato, para isto use o melhor raciocínio — e o roteador respeita. Na prática quase todo mundo quer os dois: um padrão sensato e a possibilidade de sobrepô-lo para a requisição da vez.',
          ],
        },
        {
          id: 'failure-modes',
          heading: 'Como o roteamento dá errado',
          paragraphs: [
            'As duas falhas comuns são rebaixamentos silenciosos e decisões invisíveis. Um rebaixamento silencioso é um roteador mandando discretamente sua requisição caprichada para um modelo barato. Uma decisão invisível é qualquer roteamento que você não consegue auditar depois.',
            'Ambos têm a mesma correção: o sistema deve registrar qual modelo realmente respondeu e mostrar isso. Um roteador que você não consegue inspecionar é indistinguível de um roteador quebrado.',
          ],
        },
        {
          id: 'in-clawai',
          heading: 'Como o ClawAI faz',
          paragraphs: [
            'O ClawAI tem {routingModeCount} modos de roteamento. Auto lê a requisição e escolhe. Manual fixa um modelo. Somente local mantém toda a cadeia em modelos que rodam no seu hardware. Privacidade primeiro prefere o local e se recusa a sair disso em silêncio. Os demais inclinam a escolha para menos latência, raciocínio mais forte ou custo menor.',
            'Cada resposta registra o modelo que a produziu, então uma decisão automática é conferível em vez de acreditada.',
          ],
        },
      ],
      faq: [
        {
          question: 'O roteamento piora a qualidade das respostas?',
          answer:
            'Pode, se a política não combinar com a requisição. Por isso o modo é sua escolha e por isso o modelo que respondeu aparece. Um roteamento que você vê e pode sobrepor é controle de custo; um que você não vê é rebaixamento.',
        },
        {
          question: 'Um roteador consegue manter dados fora da nuvem por completo?',
          answer:
            'Só se puder recusar em vez de recorrer a outro. Um modo «somente local» cuja cadeia de fallback alcança um provedor em nuvem não é controle de privacidade. O modo somente local do ClawAI mantém sua cadeia em provedores locais.',
        },
        {
          question: 'Roteamento vale a pena para uma pessoa só?',
          answer:
            'Geralmente sim, mais por custo do que por confiabilidade. Quase toda carga individual é sobretudo perguntas de rotina com algumas difíceis; mandar as de rotina para um modelo mais barato é a maior alavanca numa conta pessoal.',
        },
      ],
      productNote:
        'O ClawAI oferece {routingModeCount} modos de roteamento e mostra o modelo escolhido em cada mensagem, para você conferir o roteador em vez de confiar nele.',
    },
    [LearnTopic.WHAT_IS_MODEL_FALLBACK]: {
      seo: {
        title: 'O que é fallback entre modelos?',
        description:
          'Fallback é o que acontece quando o primeiro modelo falha — fora do ar, limitado ou recusando. Como funcionam as cadeias e por que o fallback silencioso é perigoso.',
        keywords: ['fallback de modelo', 'failover de LLM', 'confiabilidade de IA'],
      },
      eyebrow: 'Roteamento',
      title: 'O que é fallback entre modelos?',
      summary:
        'Fallback responde a «o que acontece quando o modelo que você queria não está disponível». Provedores têm quedas, limites de uso, recusas de conteúdo e tempos esgotados. Uma cadeia de fallback é uma lista ordenada do que tentar em seguida, e essa ordem codifica do que você está disposto a abrir mão.',
      sections: [
        {
          id: 'why-needed',
          heading: 'Por que não é opcional',
          paragraphs: [
            'Um fluxo com um único provedor herda exatamente a disponibilidade dele. Limites de uso, em especial, não são eventos raros: são a consequência normal de uma hora movimentada, e um fluxo sem fallback simplesmente para.',
            'O fallback transforma uma falha dura em resposta degradada. Se isso é uma melhoria depende inteiramente de você ser avisado.',
          ],
        },
        {
          id: 'what-to-fall-back-to',
          heading: 'Escolher a ordem',
          paragraphs: [
            'A ordem intuitiva é «o próximo melhor modelo», mas em geral está errada. Se a primeira escolha falhou porque a requisição era longa demais, um modelo menor também falhará. Se recusou por conteúdo, um parecido recusará do mesmo jeito.',
            'Uma ordem mais útil muda algo estrutural: outro provedor por completo, ou um modelo local com outras regras, em vez de um irmão que vai falhar igual.',
          ],
        },
        {
          id: 'silent-fallback',
          heading: 'A variante perigosa',
          paragraphs: [
            'Fallback silencioso é um sistema que responde discretamente com outro modelo e não diz nada. Você recebe uma resposta pior, atribui mentalmente ao modelo que escolheu e tira uma conclusão errada sobre ele.',
            'Quando o fallback cruza uma fronteira de privacidade é pior do que uma conclusão errada. Sair de um modelo local para um provedor em nuvem manda dados exatamente para onde a pessoa escolheu não mandar. Uma cadeia que pode deixar a execução local deveria ser uma cadeia aceita explicitamente.',
          ],
        },
        {
          id: 'in-clawai',
          heading: 'Como o ClawAI faz',
          paragraphs: [
            'Os modos de roteamento definem cadeias próprias, e o modo somente local mantém a sua em provedores locais em vez de buscar um modelo em nuvem quando o local está ocupado. Cada mensagem registra o modelo que de fato respondeu, então um fallback fica visível depois em vez de ser deduzido por uma mudança de tom.',
          ],
        },
      ],
      faq: [
        {
          question: 'Fallback é o mesmo que uma nova tentativa?',
          answer:
            'Uma nova tentativa manda a mesma requisição ao mesmo modelo, o que ajuda num erro passageiro. O fallback troca de modelo, o que ajuda quando o primeiro não consegue atender de jeito nenhum. Sistemas robustos fazem os dois, nessa ordem.',
        },
        {
          question: 'O fallback deveria alguma vez ir de local para nuvem?',
          answer:
            'Só se a pessoa pediu. A execução local costuma ser escolhida por um motivo que um fallback não consegue honrar, então o seguro é falhar e dizer em vez de ter sucesso em outro lugar.',
        },
        {
          question: 'Quantos modelos uma cadeia deve ter?',
          answer:
            'Dois ou três costumam bastar. Cadeias longas somam principalmente latência, porque cada tentativa fracassada é paga em tempo antes de a próxima começar.',
        },
      ],
      productNote:
        'Os modos de roteamento do ClawAI carregam cadeias de fallback próprias, e o somente local mantém a sua no local em vez de alcançar em silêncio um provedor em nuvem.',
    },
    [LearnTopic.WHAT_IS_AI_CONSENSUS]: {
      seo: {
        title: 'O que é consenso entre modelos de IA?',
        description:
          'O consenso faz a mesma pergunta a vários modelos e trata a concordância como sinal. O que a concordância diz e não diz, e quando o custo se justifica.',
        keywords: ['consenso de IA', 'concordância entre modelos', 'ensemble de LLM'],
      },
      eyebrow: 'Orquestração',
      title: 'O que é consenso entre modelos de IA?',
      summary:
        'O consenso passa um prompt por vários modelos e compara as respostas. Onde concordam, você tem um sinal fraco de que a resposta não é artefato de um único modelo. Onde divergem, você tem algo mais útil: um alerta de que a pergunta era mais difícil do que parecia.',
      sections: [
        {
          id: 'what-agreement-means',
          heading: 'O que a concordância diz de fato',
          paragraphs: [
            'Concordância é indício, não prova. Modelos treinados em dados sobrepostos compartilham vieses e podem errar com confiança na mesma direção. Três modelos concordando num fato falso é resultado comum, não raro.',
            'O sinal é mais forte quando os modelos são genuinamente diferentes — fornecedores diferentes, treinos diferentes, tamanhos diferentes. Consenso entre três variantes da mesma família não vale quase nada.',
          ],
        },
        {
          id: 'disagreement-is-the-value',
          heading: 'A divergência é a saída mais útil',
          paragraphs: [
            'O valor prático do consenso costuma estar no caso negativo. Quando os modelos divergem, você localizou uma pergunta que precisa de uma pessoa — e localizá-las barato vale mais do que um ganho marginal de confiança nas perguntas que já eram fáceis.',
            'Isso reposiciona quando usá-lo. O consenso não é uma melhoria de qualidade aplicada a tudo; é uma ferramenta de triagem aplicada onde errar sai caro.',
          ],
        },
        {
          id: 'the-cost',
          heading: 'O custo',
          paragraphs: [
            'Rodar três modelos custa cerca de três vezes os tokens e demora o que o mais lento demorar. Numa pergunta de rotina é desperdício puro. Numa cláusula contratual, num plano de migração ou num resumo médico sobre o qual você pretende agir, é barato.',
          ],
        },
        {
          id: 'when-not-to',
          heading: 'Quando não usar',
          paragraphs: [
            'Não use consenso para perguntas com resposta verificável. Se o código compila ou não, execute — esse sinal é mais forte do que três modelos concordando. O consenso serve para perguntas de julgamento sem verificação externa barata.',
          ],
        },
      ],
      faq: [
        {
          question: 'De quantos modelos preciso?',
          answer:
            'Três é a escolha usual, porque dois só podem concordar ou não, enquanto três mostram o formato de uma divergência. Além de três, a decisão raramente muda e a conta se multiplica.',
        },
        {
          question: 'O consenso evita alucinações?',
          answer:
            'Não. Ele pega alucinações específicas de um modelo e deixa passar as que vários compartilham. É um filtro, não uma garantia.',
        },
        {
          question: 'É o mesmo que melhor de N?',
          answer:
            'Não. O consenso compara respostas de modelos diferentes para ver se concordam. O melhor de N gera várias candidatas e escolhe uma. O consenso mede concordância; o melhor de N seleciona qualidade.',
        },
      ],
      productNote:
        'O consenso é um dos {orchestrationLabCount} modos de orquestração do ClawAI, e cada execução registra todos os modelos usados e quanto custou.',
    },
    [LearnTopic.WHAT_IS_BEST_OF_N]: {
      seo: {
        title: 'O que é amostragem melhor de N?',
        description:
          'O melhor de N gera várias respostas candidatas e fica com a melhor. Como as candidatas são escolhidas e por que o seletor importa mais do que N.',
        keywords: ['melhor de N', 'amostragem de candidatas', 'seleção de respostas'],
      },
      eyebrow: 'Orquestração',
      title: 'O que é melhor de N?',
      summary:
        'O melhor de N pede várias respostas ao mesmo prompt e fica com uma. Ele explora o fato de que a saída do modelo varia entre execuções: um modelo que acerta sete em cada dez vezes vai, em três tentativas, produzir pelo menos uma boa resposta. A técnica vive ou morre conforme você escolhe a vencedora.',
      sections: [
        {
          id: 'why-it-works',
          heading: 'Por que funciona',
          paragraphs: [
            'A saída de um modelo de linguagem é amostrada, não determinística. Duas execuções do mesmo prompt dão respostas diferentes de qualidade variável. Se as boas superam as ruins, tirar várias amostras aumenta a chance de pelo menos uma ser boa.',
            'Esse é todo o mecanismo. Não deixa o modelo mais inteligente; dá mais chances sobre a capacidade que ele já tem.',
          ],
        },
        {
          id: 'the-selector',
          heading: 'Escolher a vencedora é a parte difícil',
          paragraphs: [
            'Gerar candidatas é fácil. Escolher entre elas é o problema real, e é aí que estão a maior parte do valor da técnica e a maior parte das suas falhas.',
            'A seleção por verificação automática — compila, os testes passam, o esquema é respeitado — é de longe a mais confiável, porque a verificação independe do modelo. A seleção por outro modelo é um juiz, com todas as ressalvas daquela página. A seleção por uma pessoa é a mais exata e a menos escalável.',
          ],
        },
        {
          id: 'choosing-n',
          heading: 'Escolher N',
          paragraphs: [
            'Os retornos caem rápido. De uma candidata para três é uma melhoria grande; de três para dez é pequena a mais do triplo do custo. Quase todos os usos práticos ficam entre três e cinco.',
            'N multiplica o custo exatamente. Cinco candidatas são cinco vezes os tokens de geração, mais o que a seleção custar.',
          ],
        },
        {
          id: 'when-not-to',
          heading: 'Quando não usar',
          paragraphs: [
            'Se você não tem como distinguir uma resposta boa de uma ruim, o melhor de N não ajuda: você escolherá ao acaso num monte maior e pagará mais por isso. Seu lugar natural é trabalho com verificação objetiva: código, saída estruturada, qualquer coisa que ou analisa ou não.',
          ],
        },
      ],
      faq: [
        {
          question: 'Melhor de N é o mesmo que aumentar a temperatura?',
          answer:
            'Não, embora interajam. A temperatura controla o quanto cada resposta varia. O melhor de N trata de quantas você pega e de como escolhe. Alguma variedade ajuda, porque candidatas idênticas não dão o que escolher.',
        },
        {
          question: 'Posso usar modelos diferentes para as candidatas?',
          answer:
            'Sim, e costuma ajudar: modelos falham de formas diferentes, então o conjunto é mais variado do que amostras repetidas de um só. Nesse ponto você está perto do consenso, com seleção no lugar da concordância.',
        },
        {
          question: 'Ajuda na exatidão factual?',
          answer:
            'Só se o seu seletor detectar erros factuais. Sem verificação externa você escolhe entre respostas confiantes, e confiança não é exatidão.',
        },
      ],
      productNote:
        'O melhor de N é um dos {orchestrationLabCount} modos de orquestração do ClawAI, e cada candidata gerada fica registrada frente ao custo da execução.',
    },
    [LearnTopic.WHAT_IS_AN_AI_JUDGE]: {
      seo: {
        title: 'O que é um juiz de IA?',
        description:
          'Um juiz de IA é um modelo que pontua respostas de outros modelos. Para que serve, quais vieses carrega e por que não substitui uma verificação de verdade.',
        keywords: ['juiz de IA', 'LLM como juiz', 'pontuação de respostas'],
      },
      eyebrow: 'Orquestração',
      title: 'O que é um juiz de IA?',
      summary:
        'Um juiz é um modelo com outro trabalho: em vez de responder à pergunta, ele lê respostas e as avalia. É assim que se faz quase toda a seleção automática entre candidatas, e ele carrega um conjunto de vieses bem documentados e fáceis de esquecer.',
      sections: [
        {
          id: 'what-it-does',
          heading: 'O que um juiz faz',
          paragraphs: [
            'Um juiz recebe a pergunta original e duas ou mais respostas, e devolve uma classificação ou nota, normalmente com uma justificativa. É o passo de seleção no melhor de N e o passo de arbitragem quando os modelos divergem.',
            'O apelo é óbvio: escala de um jeito que a revisão humana não escala, e é muito mais barato do que a pessoa que substitui.',
          ],
        },
        {
          id: 'the-biases',
          heading: 'Os vieses, que são consistentes',
          paragraphs: [
            'Juízes preferem respostas longas às curtas, mesmo quando a curta está completa. Preferem formulação confiante à ponderada, esteja a confiança justificada ou não. São sensíveis à ordem de apresentação das candidatas. E um modelo chamado a julgar a própria saída tende a preferi-la.',
            'Nenhum é sutil e todos são gerenciáveis — embaralhe a ordem, use um modelo diferente como juiz e como autor, peça critérios específicos em vez de preferência geral. Mas precisam ser tratados de propósito, porque a configuração padrão exibe os quatro.',
          ],
        },
        {
          id: 'not-a-check',
          heading: 'Um juiz não é um verificador',
          paragraphs: [
            'Um juiz compara respostas entre si. Não as compara com a realidade. Diante de três respostas erradas ele as ordenará com confiança, e a vencedora continuará errada.',
            'Onde existir verificação externa — testes, um esquema, uma busca — essa verificação vence um juiz, porque independe do que está sendo julgado. Um juiz é o que se usa quando tal verificação não existe.',
          ],
        },
      ],
      faq: [
        {
          question: 'O juiz deve ser o modelo mais forte?',
          answer:
            'Normalmente um forte, e de preferência não o mesmo que escreveu as candidatas. A autopreferência é real e a correção mais barata é usar outro modelo.',
        },
        {
          question: 'Um juiz pode pontuar uma única resposta?',
          answer:
            'Pode, mas o julgamento comparativo é mais confiável do que a nota absoluta. Modelos são melhores em «qual destas é melhor» do que em «isto é 7 ou 8».',
        },
        {
          question: 'Como sei se o juiz está certo?',
          answer:
            'Confira por amostragem contra o seu próprio julgamento. Se nunca conferir, você moveu a confiança em vez de conquistá-la.',
        },
      ],
      productNote:
        'O ClawAI executa o julgamento como superfície própria sobre uma comparação: uma resposta pontuada registra tanto os modelos que escreveram as candidatas quanto o que as julgou.',
    },
    [LearnTopic.WHAT_IS_AI_ANSWER_VERIFICATION]: {
      seo: {
        title: 'O que é verificação de respostas de IA?',
        description:
          'Verificar é conferir uma resposta contra algo diferente do modelo que a produziu. Por que a independência é tudo e quanto vale de fato uma autoverificação.',
        keywords: ['verificação de IA', 'conferir respostas', 'exatidão de LLM'],
      },
      eyebrow: 'Orquestração',
      title: 'O que é verificação de respostas de IA?',
      summary:
        'Verificar é conferir uma resposta gerada contra uma fonte que não seja o gerador. A palavra-chave é independente: um modelo que revisa a própria resposta compartilha o raciocínio que produziu o erro, e é por isso que autoverificações pegam bem menos do que as pessoas esperam.',
      sections: [
        {
          id: 'independence',
          heading: 'A independência é a ideia inteira',
          paragraphs: [
            'Se um modelo inventa um fato por causa de algo no treino, perguntar a esse modelo se o fato é verdadeiro consulta a mesma fonte que o inventou. Verificação e erro têm causa comum, então a verificação passa.',
            'Um verificador útil muda algo. Outro modelo, uma busca em documentos reais, um compilador, uma suíte de testes, um validador de esquema. Quanto mais diferente o verificador for do gerador, mais ele pega.',
          ],
        },
        {
          id: 'kinds',
          heading: 'Tipos de verificação, do mais fraco ao mais forte',
          paragraphs: [
            'Autorrevisão: o modelo relê a resposta. Barata, pega sobretudo formatação e contradições internas. Revisão cruzada: outro modelo confere. Melhor, pega erros específicos do primeiro. Recuperação: a afirmação é conferida contra documentos recuperados. Forte para afirmações factuais. Execução: o código roda, o esquema valida, os testes passam. A mais forte, e só disponível onde a resposta é executável.',
            'O padrão é que a força acompanha a independência em relação ao modelo, e a disponibilidade vai no sentido oposto: as verificações mais fortes só existem para certos tipos de trabalho.',
          ],
        },
        {
          id: 'repair',
          heading: 'Verificação e reparo',
          paragraphs: [
            'Um verificador que só relata o problema deixa você onde estava. Na prática a verificação vem acompanhada de reparo: a falha e o motivo voltam a um modelo, que produz uma resposta corrigida, que é conferida de novo.',
            'Esse laço precisa de limite. Sem ele, um modelo incapaz de corrigir seguirá produzindo variações do mesmo erro a preço cheio.',
          ],
        },
      ],
      faq: [
        {
          question: 'Pedir ao modelo que confira ajuda?',
          answer:
            'Um pouco, e sobretudo para incoerência interna mais do que para erro factual. É a forma mais fraca de verificação e a mais fácil de superestimar.',
        },
        {
          question: 'Verificação por recuperação é o mesmo que RAG?',
          answer:
            'Usam a mesma maquinaria em direções opostas. O RAG recupera antes de gerar, para informar a resposta. A verificação por recuperação recupera depois, para conferi-la.',
        },
        {
          question: 'Quantas tentativas de reparo fazem sentido?',
          answer:
            'Uma ou duas. Se um modelo não corrigiu na segunda, as seguintes costumam ser reformulações do mesmo erro, e uma pessoa deveria olhar.',
        },
      ],
      productNote:
        'Verificação e reparo são dois dos {orchestrationLabCount} modos de orquestração do ClawAI, e ambos são medidos por tentativa: um laço de reparo não consegue acumular uma conta invisível.',
    },
    [LearnTopic.WHAT_IS_A_CONTEXT_WINDOW]: {
      seo: {
        title: 'O que é uma janela de contexto?',
        description:
          'A janela de contexto é quanto texto um modelo consegue considerar numa requisição. Por que não é memória, por que enchê-la piora a qualidade e como eleva o custo.',
        keywords: ['janela de contexto', 'tokens de LLM', 'contexto longo'],
      },
      eyebrow: 'Contexto',
      title: 'O que é uma janela de contexto?',
      summary:
        'A janela de contexto é todo o texto que um modelo consegue sustentar numa única requisição: seu prompt, a conversa até ali, os documentos anexados e a resposta sendo escrita. É medida em tokens e se zera por completo entre requisições.',
      sections: [
        {
          id: 'not-memory',
          heading: 'Não é memória',
          paragraphs: [
            'Um modelo não se lembra da sua conversa anterior. A ilusão de memória vem de a aplicação reenviar as mensagens anteriores a cada nova requisição. A janela é área de trabalho para uma chamada, não armazenamento.',
            'Disso decorre uma consequência direta que as pessoas descobrem por surpresa: uma conversa longa fica mais cara a cada mensagem, porque todo o histórico é reenviado e recobrado toda vez.',
          ],
        },
        {
          id: 'filling-it',
          heading: 'Uma janela cheia não é uma janela bem usada',
          paragraphs: [
            'Uma janela grande é uma folga, não uma meta. Modelos distribuem a atenção de forma desigual ao longo de um contexto extenso: o que está no meio de uma entrada muito longa tem mais chance de ser tratado de leve do que o que está nas pontas.',
            'Na prática, dez páginas focadas costumam vencer duzentas dispersas. A recuperação existe justamente para escolher essas dez páginas em vez de mandar tudo e torcer.',
          ],
        },
        {
          id: 'cost',
          heading: 'Como eleva o custo',
          paragraphs: [
            'Quase todos os provedores cobram por token, entrada e saída separadamente, e a entrada costuma ser mais barata. Um documento grande anexado a cada mensagem de uma conversa longa é cobrado em cada mensagem, não uma vez.',
            'É a causa mais comum de uma conta surpreendente, e a solução é estrutural: anexe o que a pergunta precisa em vez de tudo que possa ser relevante.',
          ],
        },
      ],
      faq: [
        {
          question: 'Uma janela maior é sempre melhor?',
          answer:
            'Ela remove um limite, o que é bom, mas não melhora como o modelo usa o que recebe. Uma janela maior compra principalmente a possibilidade de cometer um erro mais caro.',
        },
        {
          question: 'O que é um token?',
          answer:
            'Aproximadamente um fragmento de palavra. Em inglês dá cerca de três quartos de palavra por token, então mil tokens são umas setecentas e cinquenta palavras — mas isso varia por idioma, e alfabetos não latinos costumam gastar mais tokens por palavra.',
        },
        {
          question: 'O que acontece se eu exceder?',
          answer:
            'A requisição falha, ou a aplicação descarta em silêncio as mensagens mais antigas. O segundo caso é mais comum e mais confuso, porque o modelo parece esquecer algo que você disse.',
        },
      ],
      productNote:
        'O ClawAI registra os tokens que cada mensagem consumiu, então uma conversa que está ficando cara aparece antes da fatura, não depois.',
    },
    [LearnTopic.WHAT_IS_RAG]: {
      seo: {
        title: 'O que é RAG (geração aumentada por recuperação)?',
        description:
          'O RAG recupera trechos relevantes dos seus documentos e os coloca diante do modelo. Como a divisão em blocos e a qualidade da recuperação decidem o resultado.',
        keywords: ['RAG', 'geração aumentada por recuperação', 'IA sobre documentos'],
      },
      eyebrow: 'Contexto',
      title: 'O que é geração aumentada por recuperação?',
      summary:
        'RAG é buscar nos seus próprios documentos os trechos relevantes para uma pergunta e incluí-los na requisição. O modelo responde a partir de material que você forneceu em vez de memória, e é isso que o torna capaz de falar de documentos com os quais nunca foi treinado.',
      sections: [
        {
          id: 'how-it-works',
          heading: 'Como funciona',
          paragraphs: [
            'Os documentos são divididos em blocos e cada bloco é convertido em vetor — uma representação numérica do seu significado. A pergunta é convertida do mesmo jeito, e os blocos com vetores mais próximos são recuperados.',
            'Esses blocos são inseridos no prompt, normalmente com a instrução de responder a partir deles. O modelo faz o trabalho de linguagem; a recuperação faz o saber.',
          ],
        },
        {
          id: 'retrieval-quality',
          heading: 'A qualidade da recuperação é o sistema inteiro',
          paragraphs: [
            'Se o trecho certo não for recuperado, nenhum modelo salva a resposta: ele responderá com conhecimento geral e soará igualmente confiante. Quase todo sistema RAG decepcionante é um problema de recuperação fantasiado de geração.',
            'A divisão em blocos é onde isso se decide. Blocos pequenos demais perdem o contexto que os tornava significativos; grandes demais e cada um dilui a correspondência. Dividir pela estrutura do documento — seções, títulos — costuma vencer a divisão por tamanho fixo.',
          ],
        },
        {
          id: 'what-it-fixes',
          heading: 'O que resolve e o que não resolve',
          paragraphs: [
            'O RAG resolve «o modelo nunca viu meus documentos». Reduz alucinações em perguntas que os documentos respondem, porque a resposta está diante do modelo.',
            'Não resolve raciocínio, e não impede o modelo de responder de memória quando a recuperação não traz nada útil. O ancoramento é uma tendência forte, não uma garantia, e o modo de falha é uma resposta confiante sem fonte.',
          ],
        },
      ],
      faq: [
        {
          question: 'RAG é o mesmo que fine-tuning?',
          answer:
            'Não, e resolvem problemas diferentes. O fine-tuning muda como um modelo se comporta; o RAG muda o que ele sabe para uma requisição. Para «responda perguntas sobre meus documentos», o RAG é quase sempre a ferramenta certa e muito mais barato de manter atualizado.',
        },
        {
          question: 'Janelas de contexto grandes tornam o RAG obsoleto?',
          answer:
            'Não. Você pode colar mais, mas paga cada token em cada mensagem e os modelos distribuem mal a atenção em entradas muito longas. A recuperação também é a única abordagem que escala além do que cabe em qualquer janela.',
        },
        {
          question: 'O RAG manda meus documentos ao provedor do modelo?',
          answer:
            'Os trechos recuperados, sim — é assim que o modelo os vê. Se isso for inaceitável, o modelo precisa rodar num lugar que você controla, e é para isso que serve a execução local.',
        },
      ],
      productNote:
        'O ClawAI recupera dos arquivos que você anexa e combina isso com execução local, para que os trechos recuperados possam ficar no seu próprio hardware.',
    },
    [LearnTopic.WHAT_IS_AI_MEMORY]: {
      seo: {
        title: 'O que é memória num assistente de IA?',
        description:
          'Memória é o que um assistente guarda entre conversas. Como difere da janela de contexto, quanto custa em tokens e a questão de privacidade que levanta.',
        keywords: ['memória de IA', 'contexto persistente', 'memória do assistente'],
      },
      eyebrow: 'Contexto',
      title: 'O que é memória num assistente de IA?',
      summary:
        'Memória é a aplicação guardando fatos sobre você e reintroduzindo-os em conversas posteriores. O modelo em si não lembra nada entre requisições; a memória é um recurso construído ao redor dele, com um custo e um formato de privacidade que convém entender antes de ligar.',
      sections: [
        {
          id: 'mechanism',
          heading: 'Como funciona de fato',
          paragraphs: [
            'A aplicação decide que algo vale guardar — uma preferência, um fato, uma instrução permanente — e anota. Numa conversa posterior seleciona as entradas relevantes e as acrescenta à requisição antes de o modelo ver.',
            'Então memória é recuperação sobre um repositório de fatos a seu respeito, não algo que aconteça dentro do modelo. O que significa que ela só é tão boa quanto as decisões sobre o que guardar e o que reintroduzir.',
          ],
        },
        {
          id: 'cost',
          heading: 'Não é de graça',
          paragraphs: [
            'Cada fato lembrado que volta a uma conversa são tokens de entrada, cobrados em cada mensagem que os carrega. Uma memória grande injetada sem critério é um imposto permanente sobre todas as suas conversas.',
            'Boas implementações são seletivas: trazem de volta o que é relevante para esta conversa em vez de tudo o que sabem.',
          ],
        },
        {
          id: 'privacy',
          heading: 'A questão da privacidade',
          paragraphs: [
            'Memória implica um repositório duradouro de fatos pessoais, o que é uma situação de privacidade diferente de uma conversa que você pode apagar. As perguntas que valem são onde fica guardado, se você pode ler tudo, se pode apagar entradas específicas e se é enviado ao provedor do modelo quando reintroduzido.',
            'A última é a que escapa. Um fato lembrado injetado num prompt vai para onde esse prompt for.',
          ],
        },
      ],
      faq: [
        {
          question: 'A memória treina o modelo com meus dados?',
          answer:
            'Por si só, não. Memória coloca texto num prompt; treino muda pesos do modelo. Se um provedor treina com prompts é outra questão e depende dos termos dele.',
        },
        {
          question: 'Por que o assistente lembra algo errado?',
          answer:
            'Porque anotou algo que já foi verdade, ou leu um comentário de passagem como preferência permanente. Poder ler e editar o repositório diretamente é a única correção real.',
        },
        {
          question: 'Memória é o mesmo que uma conversa longa?',
          answer:
            'Não. Uma conversa longa guarda tudo e paga por tudo a cada mensagem. A memória guarda fatos selecionados e sobrevive ao fim da conversa.',
        },
      ],
      productNote:
        'A memória no ClawAI é um conjunto de entradas armazenadas e inspecionáveis em vez de um perfil opaco, e pode ser combinada com execução local para que fatos lembrados fiquem em hardware que você controla.',
    },
    [LearnTopic.WHAT_ARE_CONTEXT_PACKS]: {
      seo: {
        title: 'O que são pacotes de contexto?',
        description:
          'Pacotes de contexto são conjuntos reutilizáveis que você anexa a uma conversa de propósito. Como diferem de memória e RAG, e quando um pacote curado vence.',
        keywords: ['pacotes de contexto', 'contexto reutilizável', 'contexto de prompt'],
      },
      eyebrow: 'Contexto',
      title: 'O que são pacotes de contexto?',
      summary:
        'Um pacote de contexto é um conjunto nomeado e reutilizável de material — instruções, textos de referência, arquivos, links — que você anexa a uma conversa de propósito. Fica entre a memória, que o sistema escolhe por você, e um anexo avulso, que você remonta toda vez.',
      sections: [
        {
          id: 'the-gap',
          heading: 'A lacuna que preenchem',
          paragraphs: [
            'A memória é automática: o sistema decide o que guardar e quando reintroduzir, o que é conveniente e impreciso. Um anexo avulso é preciso e descartável: semana que vem você reúne os mesmos cinco documentos de novo.',
            'Um pacote é o meio-termo: montado uma vez, de propósito, e aplicado quando você quiser. Seus padrões de código, a terminologia do produto, as restrições que um trabalho precisa respeitar.',
          ],
        },
        {
          id: 'what-goes-in',
          heading: 'O que cabe dentro',
          paragraphs: [
            'Material estável que você teria de reexplicar: estilo da casa, vocabulário do domínio, restrições permanentes, o formato de saída que você sempre quer.',
            'O que não cabe é qualquer coisa que mude a cada pergunta. Um pacote que você edita toda vez que usa é um prompt com passos a mais.',
          ],
        },
        {
          id: 'cost-and-discipline',
          heading: 'Custo e disciplina',
          paragraphs: [
            'Um pacote são tokens de entrada em cada mensagem à qual está anexado, então um grande aplicado a tudo é o problema de custo da janela de contexto em outro formato. Vários pacotes pequenos e específicos vencem um grande e genérico.',
            'Como um pacote é explícito, também é revisável: você pode ler exatamente o que está sendo enviado, o que não vale para uma memória que se monta sozinha.',
          ],
        },
      ],
      faq: [
        {
          question: 'Em que difere de um prompt de sistema?',
          answer:
            'Um prompt de sistema costuma ser um bloco de instruções definido uma vez. Um pacote é um conjunto nomeado que você anexa e desanexa por conversa, e pode carregar arquivos e referências além de instruções.',
        },
        {
          question: 'Posso usar vários ao mesmo tempo?',
          answer:
            'Sim, e compor pacotes pequenos é justamente o ponto: um pacote de idioma mais um de estilo da casa, em vez de um bloco por projeto.',
        },
        {
          question: 'Pacotes substituem o RAG?',
          answer:
            'Não. Um pacote é curado à mão e sempre incluído; a recuperação seleciona de um corpus grande conforme a pergunta. Pacotes servem a material estável; a recuperação, a material grande demais para anexar.',
        },
      ],
      productNote:
        'Os pacotes de contexto do ClawAI são conjuntos reutilizáveis que você anexa por conversa: o que o modelo recebe é algo que você montou, não algo deduzido a seu respeito.',
    },
    [LearnTopic.WHAT_IS_LOCAL_AI]: {
      seo: {
        title: 'O que é IA local?',
        description:
          'IA local roda um modelo em hardware que você controla. O que muda em privacidade e custo, o que exige de hardware e onde ela compete de verdade.',
        keywords: ['IA local', 'IA on-premise', 'IA privada'],
      },
      eyebrow: 'Local e privado',
      title: 'O que é IA local?',
      summary:
        'IA local significa que o modelo roda numa máquina que você controla — seu notebook, seu servidor, seu rack — em vez de como chamada à API de outra pessoa. O prompt não sai do hardware, o que muda por completo a questão da privacidade e muda a do custo de um jeito frequentemente mal compreendido.',
      sections: [
        {
          id: 'what-changes',
          heading: 'O que muda',
          paragraphs: [
            'Os dados são a razão de verdade. Um prompt enviado a um modelo hospedado é processado por aquele provedor sob os termos dele. Um prompt a um modelo local não é enviado a lugar nenhum, a única versão dessa garantia que não depende da política de terceiros.',
            'Também elimina a cobrança por token, os limites de uso e a possibilidade de um modelo ser aposentado sob os seus pés. Um modelo baixado continua funcionando.',
          ],
        },
        {
          id: 'the-cost-shape',
          heading: 'O formato do custo, não o custo',
          paragraphs: [
            'IA local não é automaticamente mais barata. Ela converte um custo variável em fixo: você compra ou aluga hardware, e daí a inferência é quase gratuita na margem.',
            'É um bom negócio em volume alto e constante e um mau negócio para uso ocasional. Uma GPU parada a maior parte do dia custa mais do que as chamadas de API que substituiu.',
          ],
        },
        {
          id: 'the-honest-limits',
          heading: 'Os limites honestos',
          paragraphs: [
            'Modelos que rodam confortavelmente numa única máquina geralmente não são os maiores disponíveis. Nas tarefas de raciocínio mais duras a distância para um modelo de fronteira hospedado é real.',
            'Para muitíssimas tarefas do dia a dia — resumir, redigir, extrair, classificar, código de rotina — a distância é bem menor do que se supõe, e as propriedades de privacidade e custo costumam pesar mais do que o último incremento de capacidade.',
          ],
        },
        {
          id: 'hybrid',
          heading: 'Mais útil como híbrido',
          paragraphs: [
            'O padrão comum não é só local nem só nuvem. É local para o que é sensível ou de alto volume, hospedado para as perguntas mais difíceis, e uma política decidindo o que é o quê — exatamente para o que serve um roteador.',
          ],
        },
      ],
      faq: [
        {
          question: 'De que hardware preciso?',
          answer:
            'Depende inteiramente do tamanho do modelo e da quantização, e quem der um número único está chutando. A restrição dominante é a memória disponível: os pesos precisam caber, e o que cabe determina o que você consegue rodar.',
        },
        {
          question: 'IA local é privada por definição?',
          answer:
            'A chamada ao modelo é. O resto da aplicação pode não ser: busca, telemetria e outras integrações ainda podem sair. Privacidade é propriedade do sistema inteiro, não de um componente.',
        },
        {
          question: 'Modelos locais podem usar meus documentos?',
          answer:
            'Sim. A recuperação funciona igual, e quando tanto a recuperação quanto o modelo são locais os documentos não saem do seu hardware em momento algum.',
        },
      ],
      productNote:
        'O ClawAI roda modelos locais via Ollama e llama.cpp, e seu modo de roteamento somente local mantém toda a cadeia de fallback em provedores locais em vez de buscar um modelo em nuvem.',
    },
    [LearnTopic.WHAT_ARE_OPEN_WEIGHT_MODELS]: {
      seo: {
        title: 'O que são modelos de pesos abertos?',
        description:
          'Modelos de pesos abertos publicam seus parâmetros treinados para você rodá-los. O que «aberto» cobre, o que não cobre e por que as licenças diferem tanto.',
        keywords: ['modelos de pesos abertos', 'LLM de código aberto', 'modelos baixáveis'],
      },
      eyebrow: 'Local e privado',
      title: 'O que são modelos de pesos abertos?',
      summary:
        'Um modelo de pesos abertos é aquele cujos parâmetros treinados são publicados, de modo que você pode baixá-lo e rodá-lo no seu hardware. É um termo preciso e deliberadamente mais estreito que «código aberto»: a disponibilidade dos pesos não diz nada sobre dados de treino, código ou o que a licença permite.',
      sections: [
        {
          id: 'what-open-covers',
          heading: 'O que «aberto» cobre aqui',
          paragraphs: [
            'Pesos abertos significa que os números que constituem o modelo treinado são baixáveis. Isso basta para rodá-lo, ajustá-lo, inspecioná-lo e mantê-lo funcionando independentemente do que o editor fizer depois.',
            'Normalmente não inclui os dados de treino e muitas vezes nem o código de treino. Então um modelo de pesos abertos é reprodutível no sentido de que você pode rodá-lo, não no sentido de que poderia reconstruí-lo.',
          ],
        },
        {
          id: 'licences',
          heading: 'As licenças diferem de verdade',
          paragraphs: [
            'Alguns modelos de pesos abertos vêm com licenças permissivas comuns. Outros vêm com condições: restrições de uso comercial acima de um limite, proibições de aplicações específicas ou exigências de atribuição e sobre modelos derivados.',
            'Isso importa comercialmente e é fácil de pular. «Podemos baixar» e «podemos usar no nosso produto» são perguntas diferentes, e só a licença responde à segunda.',
          ],
        },
        {
          id: 'why-they-matter',
          heading: 'Por que importam',
          paragraphs: [
            'São os únicos modelos que você pode rodar inteiramente no seu hardware, o que os torna a base de todo deployment local e privado. Também não podem ser aposentados sob os seus pés: um modelo baixado funciona enquanto você o mantiver.',
            'A distância de capacidade para os melhores modelos hospedados é real e diminuiu bastante. Para boa parte do trabalho do dia a dia já não é o fator decisivo.',
          ],
        },
      ],
      faq: [
        {
          question: 'Pesos abertos é o mesmo que código aberto?',
          answer:
            'Não. Código aberto implica o código-fonte e a liberdade de usar e modificar. Pesos abertos significa que os parâmetros foram publicados, sob a licença que o editor escolheu, que às vezes é restritiva.',
        },
        {
          question: 'Posso ajustar um modelo de pesos abertos?',
          answer:
            'Tecnicamente sim, é uma das principais razões para querer os pesos. Se você pode, e o que pode fazer com o resultado, é questão de licença que varia por modelo.',
        },
        {
          question: 'Dá para usar comercialmente sem risco?',
          answer:
            'Muitos sim; alguns não sem condições. Leia a licença específica do modelo específico — é a única coisa nesta área que realmente não se generaliza.',
        },
      ],
      productNote:
        'O ClawAI roda modelos de pesos abertos via Ollama e llama.cpp no seu hardware, ao lado de {cloudProviderCount} provedores em nuvem, com o roteamento decidindo quem atende o quê.',
    },
    [LearnTopic.WHAT_IS_SELF_HOSTED_AI]: {
      seo: {
        title: 'O que é IA auto-hospedada?',
        description:
          'IA auto-hospedada significa rodar a aplicação inteira por conta própria, não só o modelo. O que abrange, o que exige na operação e como difere de modelos locais.',
        keywords: ['IA auto-hospedada', 'plataforma de IA on-premise', 'deployment privado'],
      },
      eyebrow: 'Local e privado',
      title: 'O que é IA auto-hospedada?',
      summary:
        'Auto-hospedar significa que a aplicação roda em infraestrutura que você controla — a interface, os bancos de dados, as filas, a orquestração — não apenas o modelo. É um compromisso maior do que rodar um modelo local e responde a outra pergunta: não só «onde acontece a inferência» mas «quem guarda os dados em repouso».',
      sections: [
        {
          id: 'more-than-the-model',
          heading: 'É mais do que o modelo',
          paragraphs: [
            'Rodar um modelo local ainda deixa conversas, arquivos, memória e dados de conta na aplicação que você usou. Auto-hospedar move tudo isso para a sua infraestrutura.',
            'A distinção importa para quem tem obrigações sobre dados armazenados e não sobre inferência. Onde o modelo roda e onde o histórico vive são perguntas separadas, e só o auto-hospedar responde à segunda.',
          ],
        },
        {
          id: 'what-it-costs-you',
          heading: 'O que custa na operação',
          paragraphs: [
            'Você assume atualizações, backups, monitoramento, TLS e a depuração quando algo quebra numa hora inconveniente. É um custo real e contínuo, medido em atenção mais do que em dinheiro.',
            'Vale a pena quando os dados realmente não podem estar em outro lugar, ou quando o deployment precisa sobreviver a qualquer relação com fornecedor. Não vale como precaução genérica.',
          ],
        },
        {
          id: 'hybrid-is-normal',
          heading: 'Auto-hospedado não significa desconectado',
          paragraphs: [
            'Um deployment auto-hospedado ainda pode chamar modelos hospedados. Muitos chamam: a plataforma e os dados são seus, e provedores em nuvem são usados onde a capacidade deles justifica os dados saírem.',
            'A combinação que elimina totalmente o processamento externo é auto-hospedar mais modelos locais, e é uma configuração deliberada, não o padrão.',
          ],
        },
      ],
      faq: [
        {
          question: 'Auto-hospedar é o mesmo que IA local?',
          answer:
            'Não. IA local trata de onde o modelo roda. Auto-hospedar trata de onde a aplicação e seus dados vivem. Dá para ter um sem o outro, e a posição de privacidade mais forte precisa dos dois.',
        },
        {
          question: 'Auto-hospedar nos torna conformes?',
          answer:
            'Não. Pode ser um componente de uma história de conformidade, mas conformidade é feita de contratos, controles, evidências e auditorias. Onde o software roda é um insumo entre vários.',
        },
        {
          question: 'O que é preciso para operar?',
          answer:
            'Na maioria das plataformas, contêineres, um banco de dados e onde rodá-los — mais uma pessoa que assuma o caminho de atualização. É essa última parte que costuma ser subestimada.',
        },
      ],
      productNote:
        'O ClawAI roda na sua própria infraestrutura — a pilha completa, não um plano hospedado com opção local — e o código-fonte está disponível para revisão técnica.',
    },
    [LearnTopic.OLLAMA_VS_LLAMACPP]: {
      seo: {
        title: 'Ollama ou llama.cpp: qual usar?',
        description:
          'Ollama e llama.cpp rodam modelos de pesos abertos localmente. Como se relacionam, para que serve cada um e por que usar os dois é normal.',
        keywords: ['Ollama ou llama.cpp', 'runtime local', 'rodar LLM localmente'],
      },
      eyebrow: 'Local e privado',
      title: 'Ollama ou llama.cpp',
      summary:
        'Não são realmente concorrentes. O llama.cpp é o motor de inferência que tornou prático rodar modelos de linguagem em hardware comum; o Ollama é um gerenciador de modelos e servidor construído sobre essa linhagem. A pergunta em geral não é qual escolher, mas em que camada você quer trabalhar.',
      sections: [
        {
          id: 'what-each-is',
          heading: 'O que cada um é',
          paragraphs: [
            'O llama.cpp é um motor de inferência em C++. Roda modelos quantizados com eficiência em CPUs e GPUs e expõe controle fino sobre como um modelo é carregado e executado. É a camada de baixo, e boa parte do ecossistema de IA local é construída sobre ela.',
            'O Ollama envolve um motor desse tipo em conveniência: baixe um modelo pelo nome, suba um servidor, ganhe uma API HTTP e deixe que ele cuide dos arquivos e da memória. Otimiza para colocar um modelo no ar em um minuto.',
          ],
        },
        {
          id: 'choosing',
          heading: 'Como escolher',
          paragraphs: [
            'Escolha o Ollama quando quiser modelos rodando rápido com padrões sensatos, quando for alternar entre vários modelos ou quando quiser uma API local estável sem ajustar nada.',
            'Escolha o llama.cpp diretamente quando precisar de controle — uma quantização específica, um descarregamento de camadas específico, hardware incomum ou inferência embutida no seu binário. O preço é gerenciar os detalhes.',
          ],
        },
        {
          id: 'both',
          heading: 'Usar os dois é normal',
          paragraphs: [
            'Um arranjo comum é Ollama para o uso interativo do dia a dia e llama.cpp para uma carga ajustada de propósito. Não se excluem, e uma plataforma que suporte os dois deixa a decisão por deployment em vez de uma vez só.',
          ],
        },
      ],
      faq: [
        {
          question: 'O Ollama é só um invólucro?',
          answer:
            'Isso o subestima. Gerenciamento de modelos, tratamento de memória e uma API consistente são justamente as partes que tornam modelos locais práticos no dia a dia, e são trabalho de verdade qualquer que seja o motor por baixo.',
        },
        {
          question: 'Qual é mais rápido?',
          answer:
            'Com o mesmo modelo, quantização e hardware, ficam próximos, porque o trabalho pesado é o mesmo. As diferenças na prática costumam vir da configuração, não da ferramenta.',
        },
        {
          question: 'O que é quantização?',
          answer:
            'Guardar os pesos do modelo com menor precisão para ocuparem menos memória. É o que faz modelos grandes caberem em hardware comum, trocando um pouco de qualidade por muita praticidade.',
        },
      ],
      productNote:
        'O ClawAI suporta os dois como runtimes locais, então um deployment pode usar a conveniência do Ollama, o controle do llama.cpp ou os dois ao mesmo tempo.',
    },
    [LearnTopic.CLOUD_AI_VS_LOCAL_AI]: {
      seo: {
        title: 'IA em nuvem ou IA local: como escolher',
        description:
          'Modelos em nuvem oferecem capacidade sem hardware; modelos locais oferecem controle e custo fixo. As trocas que realmente decidem e por que a maioria usa os dois.',
        keywords: ['IA em nuvem ou local', 'LLM local ou hospedado', 'deployment de IA privada'],
      },
      eyebrow: 'Local e privado',
      title: 'IA em nuvem ou IA local',
      summary:
        'O resumo honesto: modelos em nuvem são mais capazes no topo e não exigem nada de você; modelos locais mantêm os dados no seu hardware e transformam uma conta variável numa fixa. Quase ninguém deveria escolher um para tudo, e a pergunta interessante é onde fica a linha.',
      sections: [
        {
          id: 'capability',
          heading: 'Capacidade',
          paragraphs: [
            'Os maiores e mais fortes modelos são hospedados, e em raciocínio realmente difícil a diferença é real. Se o seu trabalho é dominado pelas perguntas mais duras, isso importa mais do que tudo nesta página.',
            'Para resumir, redigir, extrair, classificar e código de rotina, a distância diminuiu o bastante para raramente decidir.',
          ],
        },
        {
          id: 'data',
          heading: 'Dados',
          paragraphs: [
            'É isso que costuma decidir de fato. Um prompt enviado a um modelo hospedado é processado por aquele provedor sob os termos dele. Para a maior parte do conteúdo, tudo bem. Para alguns — registros regulados, trabalho não publicado, material confidencial de terceiros — não, e nenhuma garantia contratual é tão forte quanto os dados não saírem.',
            'Por isso a divisão raramente é tudo ou nada. Costuma ser decidida por tipo de dado, e não por organização.',
          ],
        },
        {
          id: 'cost',
          heading: 'Custo',
          paragraphs: [
            'A nuvem é variável: sem desembolso inicial e com uma conta proporcional ao uso que cresce com o sucesso. O local é fixo: hardware antes, depois custo marginal quase zero.',
            'O ponto de cruzamento depende do volume. Uso ocasional sai mais barato hospedado. Uso intenso, constante e previsível costuma sair mais barato local, e o equilíbrio chega antes do esperado quando o uso é contínuo.',
          ],
        },
        {
          id: 'the-answer',
          heading: 'A maioria acaba com os dois',
          paragraphs: [
            'Local para o sensível e o de alto volume, hospedado para as perguntas mais duras, e uma política de roteamento decidindo por requisição. Isso exige um sistema em que a decisão seja explícita e auditável — senão «o sensível fica local» é uma intenção e não um controle.',
          ],
        },
      ],
      faq: [
        {
          question: 'IA local é mais barata?',
          answer:
            'Em volume sustentado, normalmente sim. Em volume baixo ou irregular, normalmente não — hardware parado custa dinheiro use você ou não.',
        },
        {
          question: 'Posso começar hospedado e migrar depois?',
          answer:
            'Sim, e é uma ordem sensata: prove o fluxo com modelos hospedados e depois mova as partes cujo volume ou sensibilidade justifique o hardware. É muito mais fácil numa plataforma que já suporta os dois.',
        },
        {
          question: 'Híbrido é complicado?',
          answer:
            'É, se você construir por conta, porque mantém dois caminhos. É simples se a camada de roteamento já tratar modelos locais e hospedados como destinos intercambiáveis.',
        },
      ],
      productNote:
        'O ClawAI trata modelos locais e em nuvem como o mesmo tipo de destino, e seus modos privacidade primeiro e somente local tornam «o sensível fica local» uma configuração em vez de um hábito.',
    },
    [LearnTopic.AI_AGENT_VS_AI_CHATBOT]: {
      seo: {
        title: 'Agente de IA ou chatbot: qual a diferença?',
        description:
          'Um chatbot responde; um agente age. O que muda quando um modelo usa ferramentas, por que a aposta sobe e o que conferir antes de deixá-lo agir.',
        keywords: ['agente de IA ou chatbot', 'o que é um agente de IA', 'uso de ferramentas'],
      },
      eyebrow: 'Fundamentos',
      title: 'Agente de IA ou chatbot',
      summary:
        'Um chatbot produz texto e você decide o que fazer com ele. A um agente se dão ferramentas e um objetivo, e ele dá passos por conta própria — ler arquivos, chamar APIs, executar comandos — até achar que terminou. A diferença não é inteligência; é se a saída é uma sugestão ou uma ação.',
      sections: [
        {
          id: 'the-difference',
          heading: 'A diferença real',
          paragraphs: [
            'O mecanismo é o uso de ferramentas. Um agente é um modelo num laço com um conjunto de ferramentas que pode chamar, e cada resultado alimenta a decisão seguinte. Tire as ferramentas e o laço e você tem um chatbot.',
            'Esse laço é o que torna agentes úteis e arriscados. Um chatbot errado faz você perder tempo. Um agente errado já fez alguma coisa.',
          ],
        },
        {
          id: 'what-agents-are-good-at',
          heading: 'Onde agentes valem a pena',
          paragraphs: [
            'Trabalho de vários passos com um estado final verificável. Rode os testes, leia a falha, mude o código, rode de novo. A verificação fecha o laço, e o agente consegue saber se teve êxito.',
            'Eles patinam onde o sucesso é questão de julgamento, porque nada lhes diz para parar. Um agente sem forma de verificar o próprio progresso seguirá adiante com confiança.',
          ],
        },
        {
          id: 'what-to-check',
          heading: 'O que conferir antes de deixá-lo agir',
          paragraphs: [
            'Quais ferramentas ele tem e o que essas ferramentas alcançam. Se ações destrutivas exigem aprovação. Se você vê os passos e não só o resultado. E se dá para pará-lo no meio.',
            'Os passos importam mais. Um agente cujo raciocínio você não consegue inspecionar é um agente para aceitar ou rejeitar em bloco, a pior posição para revisar um trabalho.',
          ],
        },
      ],
      faq: [
        {
          question: 'Um chatbot com busca é um agente?',
          answer:
            'É a fronteira. Assim que ele decide sozinho se busca, e o que fazer com os resultados, tem o laço. Quase todos os assistentes úteis hoje ficam em algum ponto desse espectro em vez de num extremo.',
        },
        {
          question: 'Agentes precisam dos modelos mais fortes?',
          answer:
            'Eles se beneficiam mais do que chatbots, porque os erros se acumulam ao longo dos passos. Um erro pequeno no início pode levar a execução inteira para lugar nenhum.',
        },
        {
          question: 'É seguro rodar um agente numa base de código?',
          answer:
            'Com controle de versão, permissões restritas e um passo de revisão, sim — é um uso consolidado. Sem isso, um agente faz alterações não revisadas no seu trabalho.',
        },
      ],
      productNote:
        'O agente de código do ClawAI roda no seu editor com os passos visíveis e a escolha de modelo nas suas mãos, então uma execução é revisável em vez de um resultado para aceitar ou rejeitar.',
    },
  },
};
