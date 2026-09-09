import { FeatureCapability } from '@/enums/feature-capability.enum';
import type { FeaturesClusterDictionary } from '@/types/features-cluster.types';

export const PT_FEATURES_CLUSTER_CONTENT: FeaturesClusterDictionary = {
  labels: {
    onThisPage: 'Nesta página',
    faqTitle: 'Perguntas frequentes',
    relatedTitle: 'Para onde ir depois',
    lastReviewed: 'Última revisão',
    backToHub: 'Todos os recursos',
    ctaTitle: 'Experimente em vez de confiar na nossa palavra',
    ctaBody:
      'A ClawAI encaminha cada conversa para o modelo e as ferramentas certas para a tarefa, em todos os provedores a que se conecta, a partir de um único espaço de trabalho.',
    startFree: 'Comece no plano gratuito',
    seeUseCases: 'Veja isso aplicado a uma tarefa real',
  },
  hub: {
    capabilitiesHeading: 'Aprofunde-se em um recurso específico',
    capabilitiesIntro:
      'As nove seções acima são a versão resumida. Cada um dos seis recursos abaixo é uma página completa: o que o recurso subjacente realmente faz, qual plano o libera, e onde verificar o mecanismo por conta própria.',
    cardSummaries: {
      [FeatureCapability.MODEL_ROUTING_AND_ORCHESTRATION]:
        'Sete modos de roteamento decidem qual modelo responde, e nove primitivas de orquestração colocam vários modelos no mesmo problema.',
      [FeatureCapability.MEMORY_AND_CONTEXT]:
        'Memória que persiste entre conversas, e context packs que carregam o material de referência de uma tarefa.',
      [FeatureCapability.WORKSPACE_CONNECTORS]:
        'Catorze conectores de espaço de trabalho permitem que uma solicitação leia ou aja nas ferramentas que sua equipe já usa.',
      [FeatureCapability.FILE_AND_DOCUMENT_HANDLING]:
        'Envio, fragmentação e OCR na entrada; geração de imagens, documentos e pesquisa na saída.',
      [FeatureCapability.OBSERVABILITY_AND_TRANSPARENCY]:
        'Cada resposta registra qual modelo a atendeu, por quê, e quanto custou do seu plano.',
      [FeatureCapability.SECURITY_AND_DATA_HANDLING]:
        'Os mecanismos concretos — autenticação, RBAC, criptografia de credenciais, criptografia em trânsito — descritos com clareza.',
    },
  },
  capabilities: {
    [FeatureCapability.MODEL_ROUTING_AND_ORCHESTRATION]: {
      seo: {
        title: 'Roteamento de modelos e orquestração na ClawAI',
        description:
          'Os sete modos de roteamento que decidem qual modelo responde a uma mensagem, e as nove primitivas de orquestração que colocam vários modelos no mesmo problema, como existem na ClawAI.',
        keywords: [
          'modos de roteamento de modelos IA',
          'orquestração multimodelo',
          'transparência do roteamento IA',
        ],
      },
      eyebrow: 'Recurso',
      title: 'Roteamento de modelos e orquestração',
      summary:
        'O roteamento decide qual modelo único responde a uma mensagem; a orquestração decide o que fazer quando um modelo não basta. A ClawAI oferece os dois como mecanismos distintos e sujeitos ao plano, em vez de um único padrão oculto — sete modos de roteamento e nove primitivas de orquestração, todos visíveis na resposta que você recebe.',
      sections: [
        {
          id: 'seven-routing-modes',
          heading: 'Sete modos de roteamento, não um padrão oculto',
          paragraphs: [
            'A ClawAI classifica cada mensagem e pode enviá-la automaticamente a um modelo adequado, ou você pode definir a regra você mesmo. Os modos: Auto (classifica pela tarefa e escolhe um modelo forte para essa classe), Manual Model (fixa um modelo para a conversa), Local-Only (cada solicitação permanece em hardware que você controla, via Ollama ou llama.cpp), Privacy-First (um modo distinto com prioridades próprias para manter uma solicitação fora do caminho de nuvem genérico), Low Latency (prefere o modelo que responde mais rapidamente), High Reasoning (prefere o modelo de raciocínio mais forte, independentemente de velocidade ou custo) e Cost Saver (prefere o modelo mais barato ainda capaz de atender a solicitação). Veja «o que é roteamento de modelos IA», ligado abaixo, para o funcionamento geral de um roteador.',
          ],
        },
        {
          id: 'nine-orchestration-primitives',
          heading: 'Nove formas de colocar mais de um modelo em um problema',
          paragraphs: [
            'Quando um modelo não basta, as primitivas de orquestração da ClawAI — registradas no razão sob a superfície ORCHESTRATION, distinta do chat comum — são Compare (até cinco modelos no mesmo prompt, lado a lado), Consensus (sintetizar uma resposta a partir de onde vários modelos concordam, sinalizando as discordâncias), Escalation (começar barato e subir automaticamente só quando a qualidade não é suficiente), Best-of-N (gerar vários candidatos e manter o mais forte), Repair (corrigir um defeito específico em uma resposta existente em vez de regenerá-la), Verify (um segundo modelo verifica a correção com um limite configurável de revisões), Role packs (uma pequena equipe de modelos especializados por papel que se revezam) Pipelines (encadear várias dessas etapas em um fluxo nomeado e reexecutável) e Judge e Critic (um modelo independente pontua uma resposta segundo critérios explícitos, com retorno escrito da passagem Critic sobre os pontos fracos). Compare e Judge estão cada um sujeitos individualmente ao plano (COMPARE_MODE, JUDGE_MODE, CRITIC_REVIEW); veja «o que é consenso de IA» e «o que é um juiz de IA», ambos ligados abaixo, para como a própria avaliação funciona.',
          ],
        },
        {
          id: 'automatic-fallback-on-provider-failure',
          heading: 'O que acontece quando um provedor falha no meio da solicitação',
          paragraphs: [
            'Uma decisão de roteamento não é uma aposta única: se o provedor ou o modelo para o qual uma solicitação foi enviada falhar no meio do processamento, a ClawAI pode migrar automaticamente para outro modelo, e a resposta registra qual modelo realmente assumiu — não apenas o escolhido inicialmente. Veja «o que é fallback de modelo», ligado abaixo, para como essa decisão de fallback é tomada.',
          ],
        },
      ],
      faq: [
        {
          question: 'Quantos modos de roteamento a ClawAI tem?',
          answer:
            'Sete: Auto, Manual Model, Local-Only, Privacy-First, Low Latency, High Reasoning e Cost Saver. Auto é o padrão; os outros seis existem para quando você quer decidir o roteamento você mesmo, ou direcioná-lo de forma específica.',
        },
        {
          question: 'Qual é a diferença entre Compare e Consensus?',
          answer:
            'Compare mostra a resposta de cada modelo ao mesmo prompt lado a lado, com latência e contagem de tokens por modelo, deixando a leitura para você. Consensus sintetiza uma resposta a partir de onde os modelos concordam e sinaliza as discordâncias.',
        },
        {
          question: 'Posso ver qual modelo realmente respondeu, e por quê?',
          answer:
            'Sim — cada resposta traz o provedor e o modelo que a produziu, o raciocínio por trás da escolha de roteamento, e quanto custou do seu plano. Se um provedor falhou e outro modelo assumiu, isso também é registrado.',
        },
      ],
      productNote:
        'Sete modos de roteamento e nove primitivas de orquestração são mecanismos reais e já disponíveis na ClawAI, não um único padrão oculto — Compare, Judge e Critic estão cada um sujeitos individualmente ao plano e medidos em sua própria superfície do razão.',
    },
    [FeatureCapability.MEMORY_AND_CONTEXT]: {
      seo: {
        title: 'Memória e contexto na ClawAI',
        description:
          'Como funcionam a memória e os context packs da ClawAI — registros de memória aprovados com pontuação de confiança, armazenamento delimitado e pacotes de material de referência versionados, como recursos disponíveis e sujeitos ao plano.',
        keywords: [
          'recurso de memória IA',
          'context packs de IA',
          'memória de conversa IA persistente',
        ],
      },
      eyebrow: 'Recurso',
      title: 'Memória e contexto',
      summary:
        'Memória e context packs são dois recursos distintos e sujeitos ao plano (MEMORY e CONTEXT_PACKS) que resolvem problemas diferentes: a memória preserva o que a ClawAI aprendeu sobre você entre sessões, enquanto um context pack reúne material de referência para uma tarefa específica. Ambos são interruptores por conversa, não algo gerenciado globalmente.',
      sections: [
        {
          id: 'memory-records-and-approval',
          heading: 'Os registros de memória, e a fila de aprovação antes deles',
          paragraphs: [
            'Um registro de memória é um fato, preferência, instrução ou resumo, armazenado com uma categoria, uma pontuação de confiança e sua origem. Nada é lembrado silenciosamente: os candidatos entram em uma fila que você aprova ou rejeita, e apenas itens de alta confiança e não sensíveis são aprovados automaticamente, em um limiar que você mesmo define. Veja «o que é memória IA», ligado abaixo, para o funcionamento geral.',
          ],
        },
        {
          id: 'context-packs-for-reference-material',
          heading: 'Context packs para material que uma tarefa precisa ter à vista',
          paragraphs: [
            'Um context pack reúne texto reutilizável, arquivos, links e referências de memória em uma unidade nomeada e versionada que você anexa a qualquer conversa — assim um briefing de estilo, um conjunto de documentos de origem ou instruções permanentes não precisam ser recolados a cada sessão. Os packs são versionados, então você pode ver o que mudou e reverter. Veja «o que são context packs», ligado abaixo, para o funcionamento geral.',
          ],
        },
        {
          id: 'scopes-receipts-and-controls',
          heading: 'Escopos, recibos de contexto e controles',
          paragraphs: [
            'Uma memória pode ser limitada a você mesmo, a uma única conversa, a um projeto ou a um espaço de trabalho, para que o contexto de trabalho não vaze para conversas pessoais. Cada resposta que usa memória ou um pack registra um recibo de contexto — quais itens entraram no prompt, em que ordem, e quanto orçamento de tokens cada um consumiu — e controles permitem pausar toda a memória, um único item, definir uma expiração, marcar algo como sensível para redação, ou excluí-lo completamente, com cada mudança gravada em um registro de auditoria. Veja «o que é uma janela de contexto», ligado abaixo, para a importância dessa contabilidade de orçamento de tokens.',
          ],
        },
      ],
      faq: [
        {
          question: 'A ClawAI se lembra de coisas sobre mim sem perguntar?',
          answer:
            'Não — os candidatos entram em uma fila de aprovação que você mesmo revisa. Apenas itens de alta confiança e não sensíveis são aprovados automaticamente, em um limiar que você define, e cada mudança em um registro de memória é gravada em um registro de auditoria.',
        },
        {
          question: 'Qual é a diferença entre memória e um context pack?',
          answer:
            'A memória preserva, entre sessões, o que a ClawAI aprendeu sobre suas preferências. Um context pack é um pacote versionado de material de referência — texto, arquivos, links — que você anexa a uma tarefa específica em vez de uma preferência duradoura. São dois recursos distintos sujeitos ao plano.',
        },
        {
          question: 'Posso desativar a memória para uma única pergunta?',
          answer:
            'Sim — memória e context packs são interruptores por conversa. Desative-os para uma pergunta pontual e o prompt não conterá nada além do que você digitou.',
        },
      ],
      productNote:
        'Memória e context packs são dois recursos distintos da ClawAI, sujeitos ao plano (MEMORY, CONTEXT_PACKS) — registros aprovados com pontuação de confiança e pacotes de referência versionados, ambos delimitados e auditáveis, não um único bloco de memória misturado.',
    },
    [FeatureCapability.WORKSPACE_CONNECTORS]: {
      seo: {
        title: 'Conectores de espaço de trabalho na ClawAI',
        description:
          'Os 14 conectores de espaço de trabalho que a ClawAI disponibiliza — GitHub, Slack, Jira, Google Drive e mais — e como uma ação de espaço de trabalho sujeita ao plano lê ou age sobre eles.',
        keywords: [
          'conectores de espaço de trabalho IA',
          'conectar IA ao GitHub e Slack',
          'integrações de ferramentas IA',
        ],
      },
      eyebrow: 'Recurso',
      title: 'Conectores de espaço de trabalho',
      summary:
        'Um conector de espaço de trabalho permite que uma solicitação da ClawAI leia ou aja em uma ferramenta que sua equipe já usa, em vez de copiar informações manualmente. A ClawAI tem hoje 14 conectores de espaço de trabalho, e o acesso ao espaço de trabalho é um recurso distinto sujeito ao plano (WORKSPACES) com sua própria superfície de uso medida (WORKSPACE_ACTION).',
      sections: [
        {
          id: 'the-fourteen-connectors',
          heading: 'Os catorze conectores, por categoria',
          paragraphs: [
            'Hospedagem de código: GitHub, GitLab, Bitbucket. Mensagens e acompanhamento: Slack, Jira, Confluence, ClickUp. Design: Figma. Documentos e armazenamento: Google Drive, Gmail, Microsoft SharePoint, Microsoft OneDrive. Calendários: Google Calendar, Outlook Calendar. Cada um se conecta uma vez via OAuth, e as credenciais são criptografadas em repouso, vinculadas à sua conta e revogáveis com um clique.',
          ],
        },
        {
          id: 'what-a-connected-workspace-can-do',
          heading: 'O que um espaço de trabalho conectado realmente permite fazer',
          paragraphs: [
            'Uma vez conectada, a ClawAI pode buscar em uma ferramenta, extrair contexto dela para uma conversa, e agir sobre ela após sua aprovação — um ticket do Jira, uma thread do Slack, um arquivo no Google Drive, referenciado ou alterado diretamente em vez de colado manualmente. As conexões sincronizam segundo uma programação e via webhooks, assim os resultados de busca permanecem atuais, e quantas conexões você pode manter depende do seu plano.',
          ],
        },
        {
          id: 'multi-model-review-inside-a-workspace-action',
          heading: 'Revisão multimodelo como parte da mesma superfície medida',
          paragraphs: [
            'Uma ação de espaço de trabalho não se limita a uma única chamada de modelo — uma etapa de rascunho em cadeia ou de repasse, ou uma revisão multimodelo do resultado antes de ser executado, usa a mesma infraestrutura de roteamento e orquestração descrita na página roteamento de modelos e orquestração, ligada abaixo, aplicada a uma ação que toca uma ferramenta conectada em vez de uma mensagem de chat comum.',
          ],
        },
      ],
      faq: [
        {
          question: 'A quantas ferramentas a ClawAI se conecta?',
          answer:
            'Catorze conectores de espaço de trabalho: GitHub, GitLab, Bitbucket, Slack, Jira, Confluence, ClickUp, Figma, Google Drive, Gmail, Microsoft SharePoint, Microsoft OneDrive, Google Calendar e Outlook Calendar.',
        },
        {
          question: 'Minhas credenciais de conector estão seguras?',
          answer:
            'As credenciais são criptografadas em repouso, vinculadas à sua conta, e nunca retornadas ao navegador — veja a página segurança e tratamento de dados, ligada abaixo, para o mecanismo subjacente.',
        },
        {
          question:
            'Uma ação de espaço de trabalho é medida separadamente de uma mensagem de chat comum?',
          answer:
            'Sim — as ações de espaço de trabalho têm sua própria superfície medida (WORKSPACE_ACTION), distinta da cota de tokens de uma mensagem de chat comum. Confirme a cota atual na página de preços.',
        },
      ],
      productNote:
        'A ClawAI se conecta hoje a 14 ferramentas de espaço de trabalho — hospedagem de código, mensagens, acompanhamento de projetos, design, documentos, armazenamento e calendários — atrás de um único recurso WORKSPACES sujeito ao plano, com sua própria superfície de ação medida.',
    },
    [FeatureCapability.FILE_AND_DOCUMENT_HANDLING]: {
      seo: {
        title: 'Tratamento de arquivos e documentos na ClawAI',
        description:
          'Como a ClawAI recebe arquivos — envio, fragmentação, OCR, verificações de envio — e os gera de volta como imagens, documentos e pesquisas com fontes citadas.',
        keywords: [
          'envio de arquivos e OCR IA',
          'geração de documentos IA',
          'formatos de exportação de documentos IA',
        ],
      },
      eyebrow: 'Recurso',
      title: 'Tratamento de arquivos e documentos',
      summary:
        'Os arquivos se movem nas duas direções na ClawAI: para dentro, como um envio fragmentado e indexado para que um modelo responda a partir do seu conteúdo, não apenas dos dados de treinamento; e para fora, como uma imagem gerada, um documento exportado ou uma pesquisa com fontes citadas. Ambas as direções são reais, disponíveis e medidas separadamente.',
      sections: [
        {
          id: 'upload-chunking-and-retrieval',
          heading: 'Envio, fragmentação e entrega por modelo',
          paragraphs: [
            'A ClawAI aceita PDF, DOCX, planilhas, CSV, JSON, Markdown, texto simples, arquivos de código e imagens. Um arquivo é dividido em passagens e indexado, assim apenas as partes relevantes para uma pergunta entram no prompt, e cada modelo recebe a forma que trata com mais confiabilidade — uma imagem nativa, um PDF nativo ou texto extraído — com cada mensagem mostrando qual forma cada modelo realmente recebeu. Arquivos podem ser anexados por mensagem, inclusive em execuções Compare, permitindo consultar vários modelos sobre o mesmo documento ao mesmo tempo.',
          ],
        },
        {
          id: 'ocr-and-upload-checks',
          heading: 'OCR para documentos digitalizados, e verificações em cada envio',
          paragraphs: [
            'Um PDF digitalizado sem camada de texto passa por OCR antes de chegar a um modelo, e é sinalizado quando a confiança de reconhecimento é baixa. Cada envio é escaneado contra vírus, verificado quanto ao tipo de arquivo declarado, examinado quanto a nomes de arquivo perigosos, e rejeitado se um arquivo compactado se revelar uma bomba de descompressão — os envios contam contra os limites de tamanho e armazenamento de um plano, e os arquivos são removidos segundo um cronograma de retenção ou podem ser excluídos a qualquer momento.',
          ],
        },
        {
          id: 'generating-images-documents-and-research',
          heading: 'Gerar imagens, documentos e pesquisas citadas',
          paragraphs: [
            'Na saída, a ClawAI pode produzir uma imagem a partir de uma descrição, exportar qualquer resposta ou uma conversa inteira como arquivo formatado em PDF, DOCX, CSV, HTML, Markdown, TXT ou JSON, e executar uma tarefa de pesquisa que busca na web, recupera e lê páginas, e responde com as fontes realmente usadas. Geração de imagens, geração de arquivos e pesquisa são cada uma medidas separadamente (IMAGE, FILE_GENERATION, e as cotas RESEARCH_MODE / WEB_SEARCH / WEB_FETCH / WEB_EXTRACT), distintas do uso de tokens do chat comum. Veja «como funciona a chamada de ferramentas IA» e «o que são saídas de IA estruturadas», ambos ligados abaixo, para o mecanismo por trás de uma forma de saída definida.',
          ],
        },
      ],
      faq: [
        {
          question: 'Quais tipos de arquivo posso enviar?',
          answer:
            'PDF, DOCX, planilhas, CSV, JSON, Markdown, texto simples, arquivos de código e imagens. Cada modelo recebe a forma que trata com mais confiabilidade, e a mensagem mostra qual forma cada modelo realmente recebeu.',
        },
        {
          question: 'A ClawAI consegue ler um documento digitalizado sem camada de texto?',
          answer:
            'Sim — um PDF digitalizado passa por OCR antes de chegar a um modelo, e é sinalizado quando a confiança de reconhecimento é baixa.',
        },
        {
          question: 'Em quais formatos posso exportar um documento?',
          answer:
            'PDF, DOCX, CSV, HTML, Markdown, TXT e JSON. A exportação de documentos é uma superfície medida distinta, separada do chat comum e do uso de pesquisa.',
        },
      ],
      productNote:
        'Envio, fragmentação, OCR e verificações de envio na entrada; geração de imagens, exportação de documentos e pesquisas citadas na saída — recursos reais, disponíveis e medidos separadamente, não um único modo de arquivo misturado.',
    },
    [FeatureCapability.OBSERVABILITY_AND_TRANSPARENCY]: {
      seo: {
        title: 'Observabilidade e transparência na ClawAI',
        description:
          'Como a ClawAI mostra o que uma solicitação consome — um painel de uso, detalhes de roteamento por resposta, um registro de auditoria e progresso ao vivo — para que o uso nunca seja uma caixa preta.',
        keywords: [
          'transparência de uso de IA',
          'registro de auditoria de roteamento IA',
          'observabilidade de custos de IA',
        ],
      },
      eyebrow: 'Recurso',
      title: 'Observabilidade e transparência',
      summary:
        'O uso na ClawAI é medido, atribuído e visível, em vez de uma caixa preta: um painel de uso, detalhes de roteamento por resposta, um registro de auditoria e progresso ao vivo enquanto um modelo trabalha são quatro peças distintas e disponíveis do mesmo princípio — você sempre vê o que uma solicitação fez e quanto custou.',
      sections: [
        {
          id: 'usage-dashboard-and-per-answer-detail',
          heading: 'O painel de uso, e o detalhe de roteamento por resposta',
          paragraphs: [
            'Um painel de uso mostra a cota consumida hoje e neste mês, dividida por modelo, com o saldo restante nas mesmas unidades em que um plano é cotado. Abaixo, cada resposta individual traz o modelo que a produziu, por que foi escolhido, quanto tempo levou, quantos tokens usou, e quanto custou da cota — incluindo qual modelo assumiu se o provedor original falhou no meio da solicitação. Veja «o que é roteamento de modelos IA» e «o que é fallback de modelo», ambos ligados abaixo, para como essa decisão de roteamento é tomada.',
          ],
        },
        {
          id: 'the-audit-log',
          heading:
            'Um registro de auditoria para logins, mudanças de plano e atividade de conectores',
          paragraphs: [
            'Logins, mudanças de plano, atividade de conectores, edições de memória e conteúdo gerado são cada um registrados com um carimbo de data/hora e um ator, assim o histórico de uma conta é reconstituível, não apenas visível no momento em que aconteceu. É o mesmo rastro de auditoria para o qual as páginas memória e contexto e segurança e tratamento de dados, ligadas abaixo, remetem as ações que cada um desses recursos grava nele.',
          ],
        },
        {
          id: 'live-progress-and-limit-warnings',
          heading: 'Progresso ao vivo enquanto um modelo trabalha, e avisos de limite claros',
          paragraphs: [
            'Enquanto um modelo trabalha, você vê o estágio em que está, o texto conforme chega, seu raciocínio quando o modelo o expõe, e contadores de tokens e tempo ao vivo — nunca uma espera silenciosa. Quando uma solicitação atinge um limite do plano, a ClawAI informa qual limite, quanto resta nas outras janelas e quando ele reinicia, em vez de cortar a solicitação sem explicação.',
          ],
        },
      ],
      faq: [
        {
          question: 'Posso ver qual modelo respondeu a uma mensagem específica, e por quê?',
          answer:
            'Sim — cada resposta registra o provedor e o modelo que a produziu, o raciocínio por trás da escolha de roteamento, a duração, os tokens usados, e quanto custou do seu plano.',
        },
        {
          question: 'O que o registro de auditoria realmente grava?',
          answer:
            'Logins, mudanças de plano, atividade de conectores, edições de memória e conteúdo gerado, cada um com um carimbo de data/hora e um ator, assim o histórico da conta é reconstituível depois dos fatos.',
        },
        {
          question: 'O que acontece quando atinjo um limite de uso?',
          answer:
            'A ClawAI informa qual limite específico foi atingido, quanta cota resta nas suas outras janelas de uso, e quando o limite reinicia — nada é cortado silenciosamente.',
        },
      ],
      productNote:
        'Um painel de uso, detalhe de roteamento por resposta, um registro de auditoria e progresso ao vivo são quatro peças reais e disponíveis do mesmo princípio: o uso na ClawAI é medido, atribuído e visível, nunca uma caixa preta.',
    },
    [FeatureCapability.SECURITY_AND_DATA_HANDLING]: {
      seo: {
        title: 'Segurança e tratamento de dados na ClawAI',
        description:
          'Os mecanismos concretos por trás da segurança de contas e dados da ClawAI — hash de senhas com Argon2, refresh tokens rotativos, RBAC, criptografia de credenciais AES-256-GCM, TLS e isolamento de serviços — descritos com clareza, sem alegações de conformidade regulatória.',
        keywords: [
          'segurança de plataforma IA',
          'criptografia de credenciais IA',
          'controle de acesso baseado em função IA',
        ],
      },
      eyebrow: 'Recurso',
      title: 'Segurança e tratamento de dados',
      summary:
        'Esta página descreve mecanismos que existem hoje no produto, com clareza, em vez de uma alegação de conformidade regulatória. Contas, credenciais, transporte e fronteiras entre serviços têm cada um um mecanismo concreto e verificável por trás — e onde uma solicitação precisa permanecer em hardware que você controla em vez de alcançar um provedor de nuvem, o roteamento Local-Only e Privacy-First é a resposta para isso, não uma certificação de segurança.',
      sections: [
        {
          id: 'accounts-sessions-and-access-control',
          heading: 'Contas, sessões e acesso baseado em função',
          paragraphs: [
            'As senhas passam por hash com Argon2; os tokens de acesso são de curta duração, e os refresh tokens giram a cada uso, assim um token roubado é detectável. Cada conta traz uma função e um conjunto explícito de permissões, verificado na interface e novamente em cada endpoint do backend — controle de acesso baseado em função aplicado em ambas as camadas, não apenas onde a interface por acaso o mostra.',
          ],
        },
        {
          id: 'credential-and-transport-encryption',
          heading: 'Criptografia de credenciais e criptografia em trânsito',
          paragraphs: [
            'As credenciais de provedores e conectores são criptografadas em repouso com AES-256-GCM e nunca retornadas ao navegador. O transporte é TLS do navegador até a borda, e novamente TLS entre cada serviço interno, com certificados verificados em cada salto — assim uma credencial fica protegida tanto em repouso quanto em movimento.',
          ],
        },
        {
          id: 'service-isolation-and-what-is-not-claimed',
          heading: 'Isolamento de serviços, limitação de taxa, e o que não é alegado aqui',
          paragraphs: [
            'Cada serviço de backend possui seu próprio banco de dados e não pode ler o de outro, assim uma falha na geração de imagens não pode alcançar suas conversas; limites de taxa por conta protegem tanto sua cota quanto a plataforma contra loops descontrolados. A ClawAI não possui hoje nenhuma certificação de conformidade regulatória, e o app hospedado envia solicitações a provedores de modelos terceiros sob seus próprios termos — onde isso não funcionar para uma organização, uma implantação privada dentro da sua própria rede, executando apenas modelos de pesos abertos, é definida caso a caso; entre em contato para conversar sobre isso. Para uma solicitação que precise permanecer por padrão em hardware que você controla, veja implantação privada e local, ligado abaixo.',
          ],
        },
      ],
      faq: [
        {
          question: 'Como minhas senhas e tokens de login são protegidos?',
          answer:
            'As senhas passam por hash com Argon2. Os tokens de acesso são de curta duração, e os refresh tokens giram a cada uso, assim um refresh token roubado é detectável em vez de silenciosamente reutilizável.',
        },
        {
          question: 'Como minhas credenciais de ferramentas conectadas são armazenadas?',
          answer:
            'As credenciais de provedores e conectores são criptografadas em repouso com AES-256-GCM e nunca retornadas ao navegador, seja qual for o conector de espaço de trabalho.',
        },
        {
          question: 'A ClawAI possui certificações de conformidade regulatória de terceiros?',
          answer:
            'Não — a ClawAI não possui hoje nenhuma certificação de conformidade regulatória. Para um requisito que o app hospedado não pode atender, uma implantação privada dentro da sua própria rede é definida caso a caso; veja o caso de uso implantação local e privada, ligado abaixo.',
        },
      ],
      productNote:
        'Hash de senhas com Argon2, refresh tokens rotativos, RBAC verificado em cada endpoint do backend, criptografia de credenciais AES-256-GCM, TLS em cada salto e isolamento de banco de dados por serviço — mecanismos concretos, descritos com clareza, sem nenhuma certificação de conformidade regulatória alegada.',
    },
  },
};
