import { IntegrationTopic } from '@/enums/integration-topic.enum';
import type { IntegrationsDictionary } from '@/types/integrations.types';

export const PT_INTEGRATIONS_CONTENT: IntegrationsDictionary = {
  labels: {
    onThisPage: 'Nesta página',
    faqTitle: 'Perguntas frequentes',
    relatedTitle: 'Para onde seguir',
    lastReviewed: 'Última revisão',
    backToHub: 'Todas as integrações',
    ctaTitle: 'Conecte e veja por si mesmo',
    ctaBody:
      'Todo conector está disponível em todos os planos pagos. Conecte-o nas configurações do seu espaço de trabalho.',
    startFree: 'Começar no plano gratuito',
    seeFeatures: 'Ver o que o ClawAI faz',
    capabilitiesHeading: 'O que este conector pode fazer',
    readLabel: 'O ClawAI pode ler',
    writeLabel: 'O ClawAI pode escrever',
    syncLabel: 'Sincronização',
    realTimeLabel: 'Atualiza em tempo real',
    pollBasedLabel: 'Sincroniza em intervalos programados, não em tempo real',
  },
  hub: {
    seo: {
      title: 'Integrações: conecte o ClawAI às suas ferramentas',
      description:
        'O ClawAI se conecta a 14 ferramentas de trabalho — GitHub, Slack, Jira, Google Drive, Gmail e outras — para que uma conversa possa ler o seu trabalho e agir sobre ele, não apenas falar sobre ele.',
      keywords: [
        'integrações do ClawAI',
        'conectores de IA para o trabalho',
        'integrações de ferramentas de IA',
      ],
    },
    eyebrow: 'Integrações',
    title: 'Conecte o ClawAI às ferramentas que você já usa',
    summary:
      'Cada conector abaixo é real e está em produção, não é um item de roteiro — o que ele pode ler, o que pode escrever e se atualiza em tempo real ou em intervalos programados, tudo extraído do mesmo registro que o próprio produto usa.',
    topicsHeading: 'Escolha um conector',
    cardSummaries: {
      [IntegrationTopic.GITHUB]:
        'Repositórios, issues, pull requests — ler, comentar, revisar, aprovar.',
      [IntegrationTopic.GITLAB]:
        'Projetos, merge requests, issues — comentar, aprovar, sugerir alterações.',
      [IntegrationTopic.BITBUCKET]:
        'Repositórios e pull requests — comentar, aprovar, abrir issues.',
      [IntegrationTopic.SLACK]:
        'Canais e mensagens — ler o contexto, enviar e responder mensagens.',
      [IntegrationTopic.JIRA]: 'Issues e projetos — criar tickets, atualizá-los, comentar.',
      [IntegrationTopic.CONFLUENCE]:
        'Páginas e espaços — ler documentação, criar e editar páginas.',
      [IntegrationTopic.CLICKUP]:
        'Tarefas, espaços, pastas — criar, atualizar e comentar em tarefas.',
      [IntegrationTopic.FIGMA]:
        'Arquivos e comentários — ler designs, publicar comentários, encaminhar para o Jira.',
      [IntegrationTopic.GOOGLE_DRIVE]:
        'Arquivos e pastas — ler documentos e planilhas, enviar e mover arquivos.',
      [IntegrationTopic.GMAIL]: 'Threads e mensagens — ler e-mails, enviar, responder e redigir.',
      [IntegrationTopic.MICROSOFT_SHAREPOINT]:
        'Sites, documentos, listas — ler e enviar documentos, gerenciar itens de lista.',
      [IntegrationTopic.MICROSOFT_ONEDRIVE]: 'Arquivos e pastas — ler, enviar e mover arquivos.',
      [IntegrationTopic.GOOGLE_CALENDAR]: 'Reuniões e eventos — ler sua agenda, criar eventos.',
      [IntegrationTopic.OUTLOOK_CALENDAR]: 'Reuniões e eventos — ler sua agenda, criar eventos.',
    },
  },
  topics: {
    [IntegrationTopic.GITHUB]: {
      seo: {
        title: 'Integração de IA com GitHub — ClawAI',
        description:
          'Conecte o GitHub ao ClawAI para ler repositórios, issues e pull requests, e para redigir descrições de PR, comentar, sugerir alterações e aprovar — direto de uma conversa.',
        keywords: [
          'integração de IA com GitHub',
          'revisão de código com IA no GitHub',
          'conversar com repositório do GitHub',
        ],
      },
      eyebrow: 'Hospedagem de código',
      title: 'GitHub',
      summary:
        'Conecte uma conta ou organização do GitHub para que o ClawAI possa ler seus repositórios, issues e pull requests, e agir sobre eles — redigindo descrições, deixando comentários, sugerindo alterações e aprovando revisões — direto de dentro de uma conversa.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'O que o conector cobre',
          paragraphs: [
            'Depois de conectado, o ClawAI pode ler o conteúdo dos repositórios, issues, pull requests e comentários. Há suporte a atualizações em tempo real — um webhook avisa o ClawAI quando algo muda, em vez de esperar por uma consulta periódica — e a sincronização incremental (delta sync) significa que reler um repositório grande não exige relê-lo do zero a cada vez.',
            'No lado da escrita, o ClawAI pode criar uma issue, comentar numa issue, redigir a descrição de um pull request, comentar num pull request, sugerir uma alteração de código específica e aprovar um pull request. Toda escrita acontece como uma ação explícita que você revisa, nunca silenciosamente em segundo plano.',
          ],
        },
        {
          id: 'how-it-fits-coding-agent',
          heading: 'Como isso se encaixa com o Coding Agent',
          paragraphs: [
            'O conector do GitHub e o Coding Agent resolvem problemas relacionados, mas diferentes. O Coding Agent trabalha dentro do seu editor, sobre um repositório com checkout local. O conector do GitHub trabalha dentro de uma conversa do ClawAI, sobre os dados hospedados pelo GitHub — issues, pull requests e comentários de revisão — sem que ninguém precise ter o repositório aberto localmente.',
            'Um padrão comum: use o conector para triar issues e redigir descrições de PR pelo chat, e recorra ao Coding Agent quando o trabalho for de fato escrever e executar código.',
          ],
        },
        {
          id: 'authentication',
          heading: 'Como você conecta',
          paragraphs: [
            'O GitHub aceita OAuth (o padrão — entrar com o GitHub e conceder acesso com escopo definido) ou um token de acesso pessoal, para contas e automações que preferem um token. O GitHub Enterprise é suportado apontando o conector para a URL da API da sua instância, em vez de github.com.',
          ],
        },
      ],
      faq: [
        {
          question: 'O ClawAI pode comentar nos meus pull requests automaticamente?',
          answer:
            'Ele pode deixar um comentário quando você pedir — revisando um diff e publicando um retorno, ou aprovando quando estiver satisfeito. Ele não comenta sem ser solicitado; toda escrita é uma ação que você pede.',
        },
        {
          question: 'Funciona com repositórios privados?',
          answer:
            'Sim, conforme o acesso que você conceder durante a conexão. O ClawAI só vê o que a conta ou o token conectado consegue ver.',
        },
        {
          question: 'Isso substitui o Coding Agent?',
          answer:
            'Não — eles cobrem superfícies diferentes. O conector alcança as issues e pull requests hospedados pelo GitHub a partir do chat; o Coding Agent trabalha sobre o seu código com checkout local, no seu editor.',
        },
      ],
      productNote:
        'O conector do GitHub é um dos {connectorCount} conectores de espaço de trabalho do ClawAI, e toda ação de escrita que ele executa é uma que você pediu.',
    },
    [IntegrationTopic.GITLAB]: {
      seo: {
        title: 'Integração de IA com GitLab — ClawAI',
        description:
          'Conecte o GitLab ao ClawAI para ler projetos, merge requests e issues, e para comentar, sugerir alterações, atualizar descrições e aprovar — direto de uma conversa.',
        keywords: [
          'integração de IA com GitLab',
          'revisão de merge request com IA',
          'assistente de IA para GitLab',
        ],
      },
      eyebrow: 'Hospedagem de código',
      title: 'GitLab',
      summary:
        'Conecte uma conta do GitLab ou uma instância autogerenciada para que o ClawAI possa ler seus projetos, merge requests e issues, e agir sobre eles direto de uma conversa — comentando, sugerindo alterações, atualizando descrições e aprovando.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'O que o conector cobre',
          paragraphs: [
            'O ClawAI pode ler projetos, issues, merge requests e comentários, com atualizações em tempo real via webhook. A sincronização é uma releitura completa a cada execução, em vez de sincronização incremental, o que importa mais em projetos muito grandes do que em pequenos.',
            'No lado da escrita: comentar num merge request, aprová-lo, atualizar sua descrição, sugerir uma alteração de código específica, adicionar um comentário embutido numa imagem, criar uma issue e comentar numa issue. Cada uma é uma ação explícita que você solicita.',
          ],
        },
        {
          id: 'self-managed',
          heading: 'GitLab autogerenciado',
          paragraphs: [
            'O conector não se limita ao gitlab.com — apontá-lo para a URL da sua própria instância durante a configuração conecta o ClawAI a um GitLab autogerenciado do mesmo jeito que ele se conecta ao serviço hospedado.',
          ],
        },
        {
          id: 'authentication',
          heading: 'Como você conecta',
          paragraphs: [
            'O GitLab aceita OAuth ou um token de acesso pessoal. Ambos têm o escopo definido pelo que você concede durante a conexão — o ClawAI nunca tem acesso mais amplo do que o token ou a concessão OAuth permite.',
          ],
        },
      ],
      faq: [
        {
          question: 'Funciona com GitLab autogerenciado?',
          answer:
            'Sim — defina a URL da instância ao conectar, e o ClawAI conversa com a sua própria instalação do GitLab em vez do gitlab.com.',
        },
        {
          question: 'Ele consegue sugerir alterações reais de código, não só comentários?',
          answer:
            'Sim, por meio da ação de sugestão de alteração, que publica uma sugestão de diff específica e aplicável no merge request, em vez de um comentário em texto simples.',
        },
        {
          question: 'A sincronização de merge requests acontece em tempo real?',
          answer:
            'Sim — o conector aceita webhooks, então o ClawAI é notificado das mudanças em vez de precisar consultá-las periodicamente.',
        },
      ],
      productNote:
        'O GitLab é um dos {connectorCount} conectores de espaço de trabalho do ClawAI, cada um com suas próprias capacidades de leitura e escrita documentadas em sua própria página.',
    },
    [IntegrationTopic.BITBUCKET]: {
      seo: {
        title: 'Integração de IA com Bitbucket — ClawAI',
        description:
          'Conecte o Bitbucket Cloud ao ClawAI para ler repositórios e pull requests, e para comentar, aprovar e abrir issues — direto de uma conversa.',
        keywords: [
          'integração de IA com Bitbucket',
          'assistente de IA para Bitbucket',
          'busca de código com IA',
        ],
      },
      eyebrow: 'Hospedagem de código',
      title: 'Bitbucket',
      summary:
        'Conecte uma conta do Bitbucket Cloud para que o ClawAI possa ler seus repositórios e pull requests, e agir sobre eles — comentando, aprovando e abrindo issues — direto de uma conversa.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'O que o conector cobre',
          paragraphs: [
            'O ClawAI pode ler repositórios e pull requests, com suporte a atualizações em tempo real via webhook. A sincronização é uma releitura completa a cada execução, em vez de sincronização incremental.',
            'No lado da escrita: comentar num pull request, aprovar um pull request e criar uma issue. Cada uma é uma ação explícita, não algo que o ClawAI faz por conta própria.',
          ],
        },
        {
          id: 'authentication',
          heading: 'Como você conecta',
          paragraphs: [
            'O Bitbucket se conecta via OAuth — entre com sua conta Atlassian e conceda acesso com escopo definido aos workspaces e repositórios que você escolher.',
          ],
        },
      ],
      faq: [
        {
          question: 'O Bitbucket Server ou o Data Center são suportados?',
          answer:
            'O conector é voltado para o Bitbucket Cloud. O Bitbucket Server ou o Data Center autogerenciados não são suportados no momento.',
        },
        {
          question: 'Ele pode aprovar um pull request por mim?',
          answer:
            'Pode, quando você pedir depois de revisar o diff — a aprovação é uma ação explícita que você solicita, não um passo automático.',
        },
      ],
      productNote:
        'O Bitbucket é um dos {connectorCount} conectores de espaço de trabalho do ClawAI.',
    },
    [IntegrationTopic.SLACK]: {
      seo: {
        title: 'Integração de IA com Slack — ClawAI',
        description:
          'Conecte o Slack ao ClawAI para buscar em canais e mensagens, e para enviar e responder mensagens — assim uma conversa pode agir sobre o que a sua equipe está discutindo.',
        keywords: [
          'assistente de IA para Slack',
          'buscar mensagens do Slack com IA',
          'integração de IA no Slack',
        ],
      },
      eyebrow: 'Comunicação',
      title: 'Slack',
      summary:
        'Conecte um workspace do Slack para que o ClawAI possa ler canais, mensagens e usuários, e enviar ou responder mensagens em seu nome — transformando uma busca por threads espalhados numa pergunta que você faz uma única vez.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'O que o conector cobre',
          paragraphs: [
            'O ClawAI pode ler mensagens, canais e usuários, com atualizações em tempo real via webhooks de eventos do Slack — novas mensagens ficam visíveis assim que chegam, em vez de na próxima consulta periódica.',
            'No lado da escrita: enviar uma mensagem para um canal e responder dentro de uma thread. Ambas exigem seu pedido explícito; o ClawAI nunca publica no Slack sem ser solicitado.',
          ],
        },
        {
          id: 'what-it-is-good-for',
          heading: 'Para que ele é bom',
          paragraphs: [
            'Encontrar uma decisão enterrada numa thread de três semanas atrás, resumir a discussão de um canal antes de uma reunião, ou redigir uma resposta que referencia contexto de várias mensagens — o tipo de busca que a caixa de busca do Slack não faz bem, porque ela casa palavras-chave, não significado.',
          ],
        },
      ],
      faq: [
        {
          question: 'O ClawAI consegue ler canais privados?',
          answer:
            'Somente os canais dos quais a conta conectada é membro e aos quais ela concede acesso durante a conexão — o ClawAI nunca vê mais de um workspace do que o usuário que o conectou consegue ver.',
        },
        {
          question: 'Ele vai publicar no Slack sem que eu peça?',
          answer:
            'Não. Enviar ou responder uma mensagem é sempre uma ação explícita que você solicita na conversa.',
        },
      ],
      productNote:
        'O Slack é um dos {connectorCount} conectores de espaço de trabalho do ClawAI, com atualizações em tempo real via webhook.',
    },
    [IntegrationTopic.JIRA]: {
      seo: {
        title: 'Integração de IA com Jira — ClawAI',
        description:
          'Conecte o Jira ao ClawAI para ler issues e projetos, e para criar tickets, atualizá-los e comentar — incluindo transformar um comentário do Figma diretamente num ticket.',
        keywords: [
          'assistente de IA para Jira',
          'IA para tickets do Jira',
          'integração de IA no Jira',
        ],
      },
      eyebrow: 'Gestão de projetos',
      title: 'Jira',
      summary:
        'Conecte um site Jira da Atlassian para que o ClawAI possa ler issues, tickets, projetos e comentários, e agir sobre eles — criando e atualizando tickets, comentando e transformando um comentário de design do Figma diretamente num ticket do Jira ou numa user story.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'O que o conector cobre',
          paragraphs: [
            'O ClawAI pode ler issues, tickets, projetos e comentários, com atualizações em tempo real via webhook.',
            'No lado da escrita: criar um ticket, criar um ticket diretamente a partir de um comentário do Figma, redigir uma user story a partir de um arquivo do Figma, atualizar uma issue e comentar num ticket. As ações de Figma para Jira são as mais distintas — elas fecham o ciclo entre uma revisão de design e um item de trabalho rastreado sem que nada precise ser redigitado.',
          ],
        },
        {
          id: 'authentication',
          heading: 'Como você conecta',
          paragraphs: [
            'O Jira aceita OAuth ou autenticação básica com um token de API, junto com a URL do seu site Jira. A autenticação básica é adequada para contas de serviço e automações que não devem passar por um fluxo OAuth interativo.',
          ],
        },
      ],
      faq: [
        {
          question:
            'Ele consegue criar um ticket do Jira a partir de um comentário do Figma automaticamente?',
          answer:
            'Consegue, quando você pedir — a ação lê o comentário do Figma e cria o ticket do Jira ou o rascunho de user story correspondente num único passo, em vez de você copiar detalhes manualmente entre as duas ferramentas.',
        },
        {
          question: 'Funciona com o Jira Server, ou só com o Jira Cloud?',
          answer:
            'O conector é voltado para a API REST do Jira Cloud da Atlassian. Uma instância autogerenciada do Jira Server não é suportada no momento.',
        },
      ],
      productNote:
        'O Jira é um dos {connectorCount} conectores de espaço de trabalho do ClawAI, e se combina diretamente com o conector do Figma para a passagem de design para ticket.',
    },
    [IntegrationTopic.CONFLUENCE]: {
      seo: {
        title: 'Integração de IA com Confluence — ClawAI',
        description:
          'Conecte o Confluence ao ClawAI para ler páginas, espaços e comentários, e para criar e editar páginas — assim a documentação fica a uma conversa de distância.',
        keywords: [
          'assistente de IA para Confluence',
          'integração de IA no Confluence',
          'busca de documentação com IA',
        ],
      },
      eyebrow: 'Documentação',
      title: 'Confluence',
      summary:
        'Conecte um site Confluence da Atlassian para que o ClawAI possa ler páginas, espaços e comentários, e criar ou editar páginas diretamente — transformando uma busca de documentação numa pergunta e uma atualização de documentação num pedido.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'O que o conector cobre',
          paragraphs: [
            'O ClawAI pode ler páginas, comentários e os projetos (espaços) que os organizam. Este conector não tem suporte a atualizações em tempo real via webhook — a sincronização acontece sob demanda, em vez de por notificação push, então uma página editada há pouco pode não estar refletida até a próxima sincronização.',
            'No lado da escrita: criar uma página e editar uma página existente. Ambas são ações explícitas.',
          ],
        },
      ],
      faq: [
        {
          question: 'A sincronização do Confluence acontece em tempo real?',
          answer:
            'Não — diferente do GitHub ou do Slack, o Confluence não envia atualizações ao ClawAI por push. O conteúdo é sincronizado quando solicitado, e não no momento em que muda.',
        },
        {
          question: 'Ele consegue escrever documentação para mim, não só ler?',
          answer:
            'Sim — criar e editar páginas são ações de escrita suportadas, cada uma sendo um pedido explícito que você faz.',
        },
      ],
      productNote:
        'O Confluence é um dos {connectorCount} conectores de espaço de trabalho do ClawAI.',
    },
    [IntegrationTopic.FIGMA]: {
      seo: {
        title: 'Integração de IA com Figma — ClawAI',
        description:
          'Conecte o Figma ao ClawAI para ler arquivos e comentários, publicar comentários, e encaminhar um comentário de design diretamente ao Jira como ticket ou user story.',
        keywords: [
          'assistente de IA para Figma',
          'integração de IA no Figma',
          'automação de Figma para Jira',
        ],
      },
      eyebrow: 'Design',
      title: 'Figma',
      summary:
        'Conecte uma conta do Figma para que o ClawAI possa ler arquivos e comentários, publicar um comentário próprio e — combinado com o conector do Jira — transformar um comentário de design diretamente num ticket rastreado ou num rascunho de user story.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'O que o conector cobre',
          paragraphs: [
            'O ClawAI pode ler arquivos do Figma e seus comentários, com atualizações em tempo real via webhook. No lado da escrita, ele pode publicar um comentário num arquivo.',
            'A principal força do Figma no ClawAI vem de combiná-lo com o Jira: um comentário num design pode virar um ticket do Jira ou um rascunho de user story sem que ninguém precise redigitar o contexto à mão — veja a página de integração do Jira para as ações específicas.',
          ],
        },
      ],
      faq: [
        {
          question: 'O ClawAI consegue ler o design em si, não só os comentários?',
          answer:
            'Ele consegue ler o conteúdo do arquivo e os comentários pela API do Figma. O que ele consegue resumir de forma significativa sobre o design visual depende do arquivo — comentários e estrutura são a fonte mais confiável.',
        },
        {
          question: 'Também preciso do conector do Jira para o fluxo de Figma para ticket?',
          answer:
            'Sim — as ações de Figma para Jira ficam no conector do Jira e exigem que ambas as conexões estejam ativas.',
        },
      ],
      productNote:
        'O Figma é um dos {connectorCount} conectores de espaço de trabalho do ClawAI, mais útil quando combinado com o Jira.',
    },
    [IntegrationTopic.CLICKUP]: {
      seo: {
        title: 'Integração de IA com ClickUp — ClawAI',
        description:
          'Conecte o ClickUp ao ClawAI para ler tarefas, espaços e pastas, e para criar, atualizar e comentar em tarefas — direto de uma conversa.',
        keywords: [
          'assistente de IA para ClickUp',
          'integração de IA no ClickUp',
          'gestão de tarefas com IA',
        ],
      },
      eyebrow: 'Gestão de projetos',
      title: 'ClickUp',
      summary:
        'Conecte um workspace do ClickUp para que o ClawAI possa ler tarefas, espaços e pastas, e criar, atualizar ou comentar em tarefas diretamente a partir de uma conversa.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'O que o conector cobre',
          paragraphs: [
            'O ClawAI pode ler tarefas, espaços, pastas e comentários. Este conector não tem suporte a atualizações em tempo real via webhook no momento — a entrega do webhook subjacente não pode ser verificada como autêntica, então a sincronização acontece sob demanda, em vez de por push.',
            'No lado da escrita: criar uma tarefa, atualizar uma tarefa e comentar numa tarefa.',
          ],
        },
      ],
      faq: [
        {
          question: 'O ClickUp atualiza em tempo real?',
          answer:
            'Não — a sincronização acontece quando solicitada, em vez de por uma notificação push ao vivo. Trate-o do mesmo jeito que o Confluence ou o Google Drive: atualizado até a última sincronização, não ao vivo.',
        },
        {
          question: 'Ele consegue mover uma tarefa entre status?',
          answer:
            'As atualizações de tarefa cobrem mudanças de status e de campos numa tarefa existente; o conjunto exato de campos atualizáveis depende de como o seu workspace do ClickUp está configurado.',
        },
      ],
      productNote:
        'O ClickUp é um dos {connectorCount} conectores de espaço de trabalho do ClawAI. A sincronização é programada, não em tempo real.',
    },
    [IntegrationTopic.GOOGLE_DRIVE]: {
      seo: {
        title: 'Integração de IA com Google Drive — ClawAI',
        description:
          'Conecte o Google Drive ao ClawAI para ler documentos e planilhas, e para enviar e mover arquivos — com suporte a sincronizar somente o que mudou.',
        keywords: [
          'assistente de IA para Google Drive',
          'busca de documentos com IA',
          'integração de IA no Google Drive',
        ],
      },
      eyebrow: 'Arquivos',
      title: 'Google Drive',
      summary:
        'Conecte uma conta do Google Drive para que o ClawAI possa ler arquivos, documentos e planilhas, e enviar ou mover arquivos — com sincronização incremental, para que ressincronizar um Drive grande não signifique reler tudo a cada vez.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'O que o conector cobre',
          paragraphs: [
            'O ClawAI pode ler arquivos, documentos e planilhas. Este conector tem suporte a sincronização incremental — depois da primeira leitura completa, as sincronizações seguintes buscam apenas o que de fato mudou, o que importa quando um Drive tem milhares de arquivos. Ele não tem suporte a atualizações em tempo real via webhook no momento; a sincronização acontece sob demanda.',
            'No lado da escrita: enviar um arquivo e mover um arquivo entre pastas.',
          ],
        },
      ],
      faq: [
        {
          question: 'Conectar o Drive dá ao ClawAI acesso a tudo o que há nele?',
          answer:
            'Somente ao que a conta Google conectada conceder acesso durante o OAuth — em geral restrito aos arquivos que a conta já pode abrir, não uma concessão para toda a organização.',
        },
        {
          question: 'Ressincronizar um Drive grande vai ser lento toda vez?',
          answer:
            'A primeira sincronização lê o que precisa; a sincronização incremental faz com que as seguintes busquem apenas as mudanças, então ela não fica mais lenta à medida que o Drive cresce, uma vez concluída a sincronização inicial.',
        },
      ],
      productNote:
        'O Google Drive é um dos {connectorCount} conectores de espaço de trabalho do ClawAI, com sincronização incremental para bibliotecas grandes.',
    },
    [IntegrationTopic.GMAIL]: {
      seo: {
        title: 'Integração de IA com Gmail — ClawAI',
        description:
          'Conecte o Gmail ao ClawAI para ler threads e mensagens, e para enviar, responder e redigir e-mails — direto de uma conversa.',
        keywords: [
          'assistente de IA para Gmail',
          'integração de IA para e-mail',
          'integração de IA no Gmail',
        ],
      },
      eyebrow: 'E-mail',
      title: 'Gmail',
      summary:
        'Conecte uma conta do Gmail para que o ClawAI possa ler threads, mensagens e marcadores, e enviar, responder ou redigir e-mails diretamente a partir de uma conversa — com sincronização incremental, para que ele não releia toda a sua caixa de entrada a cada verificação.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'O que o conector cobre',
          paragraphs: [
            'O ClawAI pode ler threads, mensagens e marcadores de e-mail, com sincronização incremental. Ele não tem suporte a notificações push em tempo real para novos e-mails no momento — a sincronização acontece sob demanda.',
            'No lado da escrita: enviar um novo e-mail, responder a uma thread existente e criar um rascunho sem enviá-lo — útil quando você quer que o ClawAI prepare uma resposta para você revisar antes de ela sair.',
          ],
        },
      ],
      faq: [
        {
          question: 'O ClawAI vai enviar e-mails sem que eu aprove?',
          answer:
            'Não. Enviar é uma ação explícita; a ação de rascunho existe justamente para os casos em que você quer revisar antes de qualquer coisa ser enviada.',
        },
        {
          question: 'Ele verifica minha caixa de entrada continuamente?',
          answer:
            'Ele sincroniza sob demanda, em vez de por meio de uma conexão push ao vivo, então novos e-mails ficam visíveis conforme a última sincronização, não instantaneamente.',
        },
      ],
      productNote: 'O Gmail é um dos {connectorCount} conectores de espaço de trabalho do ClawAI.',
    },
    [IntegrationTopic.MICROSOFT_SHAREPOINT]: {
      seo: {
        title: 'Integração de IA com SharePoint — ClawAI',
        description:
          'Conecte o Microsoft SharePoint ao ClawAI para ler documentos e listas de site, e para enviar documentos e gerenciar itens de lista — direto de uma conversa.',
        keywords: [
          'assistente de IA para SharePoint',
          'integração de IA no SharePoint',
          'busca de documentos com IA na Microsoft',
        ],
      },
      eyebrow: 'Arquivos',
      title: 'Microsoft SharePoint',
      summary:
        'Conecte um site do Microsoft SharePoint para que o ClawAI possa ler documentos, arquivos e listas de site, e enviar documentos ou gerenciar itens de lista diretamente a partir de uma conversa.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'O que o conector cobre',
          paragraphs: [
            'O ClawAI pode ler documentos, arquivos e as listas que organizam um site do SharePoint. A sincronização acontece sob demanda, em vez de por uma conexão push em tempo real.',
            'No lado da escrita: enviar um documento, criar um item de lista e atualizar um item de lista existente.',
          ],
        },
        {
          id: 'authentication',
          heading: 'Como você conecta',
          paragraphs: [
            'O SharePoint exige o ID do seu locatário (tenant) da Microsoft junto com o OAuth, para que o conector saiba a qual SharePoint de qual organização se conectar.',
          ],
        },
      ],
      faq: [
        {
          question: 'Ele precisa do ID do meu locatário do Microsoft 365?',
          answer:
            'Sim — o SharePoint tem escopo por locatário, então o conector precisa do ID do seu locatário para saber a qual SharePoint de qual organização se conectar.',
        },
        {
          question: 'O conteúdo é atualizado em tempo real?',
          answer:
            'Não — a sincronização acontece sob demanda, e não por uma notificação push ao vivo.',
        },
      ],
      productNote:
        'O SharePoint é um dos {connectorCount} conectores de espaço de trabalho do ClawAI.',
    },
    [IntegrationTopic.MICROSOFT_ONEDRIVE]: {
      seo: {
        title: 'Integração de IA com OneDrive — ClawAI',
        description:
          'Conecte o Microsoft OneDrive ao ClawAI para ler arquivos e documentos, e para enviar e mover arquivos — com suporte a sincronizar somente o que mudou.',
        keywords: [
          'assistente de IA para OneDrive',
          'integração de IA no OneDrive',
          'busca de arquivos com IA na Microsoft',
        ],
      },
      eyebrow: 'Arquivos',
      title: 'Microsoft OneDrive',
      summary:
        'Conecte uma conta do Microsoft OneDrive para que o ClawAI possa ler arquivos e documentos, e enviar ou mover arquivos diretamente a partir de uma conversa — com sincronização incremental para bibliotecas grandes.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'O que o conector cobre',
          paragraphs: [
            'O ClawAI pode ler arquivos e documentos, com sincronização incremental — depois da primeira leitura completa, as sincronizações seguintes buscam apenas o que mudou. Notificações push em tempo real não são suportadas no momento; a sincronização acontece sob demanda.',
            'No lado da escrita: enviar um arquivo e mover um arquivo entre pastas.',
          ],
        },
        {
          id: 'authentication',
          heading: 'Como você conecta',
          paragraphs: [
            'O OneDrive exige o ID do seu locatário da Microsoft junto com o OAuth, da mesma forma que o SharePoint.',
          ],
        },
      ],
      faq: [
        {
          question: 'Ele precisa do ID do meu locatário do Microsoft 365?',
          answer:
            'Sim, do mesmo jeito que o SharePoint — o OneDrive for Business tem escopo por locatário.',
        },
        {
          question: 'Um OneDrive grande fica lento para manter sincronizado?',
          answer:
            'A primeira sincronização é a mais custosa; a sincronização incremental faz com que as seguintes busquem apenas o que de fato mudou.',
        },
      ],
      productNote:
        'O OneDrive é um dos {connectorCount} conectores de espaço de trabalho do ClawAI, com sincronização incremental para bibliotecas grandes.',
    },
    [IntegrationTopic.GOOGLE_CALENDAR]: {
      seo: {
        title: 'Integração de IA com o Google Calendar — ClawAI',
        description:
          'Conecte o Google Calendar ao ClawAI para ler reuniões e eventos, e para criar um evento na agenda — direto de uma conversa.',
        keywords: [
          'assistente de IA para Google Calendar',
          'integração de IA no Google Calendar',
          'agendar reunião com IA',
        ],
      },
      eyebrow: 'Agenda',
      title: 'Google Calendar',
      summary:
        'Conecte um Google Calendar para que o ClawAI possa ler suas reuniões e eventos, e criar um novo evento diretamente a partir de uma conversa, com sincronização incremental para que consultar sua agenda continue rápido.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'O que o conector cobre',
          paragraphs: [
            'O ClawAI pode ler reuniões e eventos, com sincronização incremental. Notificações push em tempo real não são suportadas no momento.',
            'No lado da escrita, o conector atualmente suporta uma ação: criar um evento na agenda. Reagendar, excluir ou responder a um convite existente ainda não são ações de escrita suportadas — esta página será atualizada se isso mudar.',
          ],
        },
      ],
      faq: [
        {
          question: 'O ClawAI consegue reagendar uma reunião existente para mim?',
          answer:
            'Ainda não — o conector atualmente suporta criar um novo evento, não editar ou reagendar um existente.',
        },
        {
          question: 'Ele vê toda a minha agenda, incluindo outras agendas às quais tenho acesso?',
          answer:
            'O acesso tem o escopo do que você concede durante a conexão, o que costuma ser a sua agenda principal, a menos que você o amplie explicitamente.',
        },
      ],
      productNote:
        'O Google Calendar é um dos {connectorCount} conectores de espaço de trabalho do ClawAI. A ação de escrita dele está atualmente limitada a criar eventos.',
    },
    [IntegrationTopic.OUTLOOK_CALENDAR]: {
      seo: {
        title: 'Integração de IA com o Outlook Calendar — ClawAI',
        description:
          'Conecte o Outlook Calendar ao ClawAI para ler reuniões e eventos, e para criar um evento na agenda — direto de uma conversa.',
        keywords: [
          'assistente de IA para Outlook Calendar',
          'integração de IA no Outlook',
          'agendar reunião com IA na Microsoft',
        ],
      },
      eyebrow: 'Agenda',
      title: 'Outlook Calendar',
      summary:
        'Conecte um Microsoft Outlook Calendar para que o ClawAI possa ler suas reuniões e eventos, e criar um novo evento diretamente a partir de uma conversa.',
      sections: [
        {
          id: 'what-it-covers',
          heading: 'O que o conector cobre',
          paragraphs: [
            'O ClawAI pode ler reuniões e eventos. Este conector não tem suporte a sincronização incremental nem a notificações push em tempo real no momento — cada sincronização lê o que precisa sob demanda.',
            'No lado da escrita, o conector atualmente suporta uma ação: criar um evento na agenda. Reagendar, excluir ou responder a um convite existente ainda não são suportados.',
          ],
        },
        {
          id: 'authentication',
          heading: 'Como você conecta',
          paragraphs: [
            'O Outlook Calendar aceita OAuth com um ID de locatário opcional — deixe em branco para usar o endpoint multilocatário da Microsoft, ou defina-o para uma organização específica.',
          ],
        },
      ],
      faq: [
        {
          question: 'O ClawAI consegue reagendar uma reunião existente para mim?',
          answer: 'Ainda não — apenas criar um novo evento é suportado no momento.',
        },
        {
          question: 'Preciso definir um ID de locatário?',
          answer:
            'Somente se você quiser que o conector fique restrito a uma organização específica da Microsoft. Deixá-lo em branco usa o endpoint multilocatário, que funciona para a maioria das contas pessoais e organizacionais.',
        },
      ],
      productNote:
        'O Outlook Calendar é um dos {connectorCount} conectores de espaço de trabalho do ClawAI. A ação de escrita dele está atualmente limitada a criar eventos.',
    },
  },
};
