import { FeatureCapability } from '@/enums/feature-capability.enum';
import type { FeaturesFlagshipDictionary } from '@/types/features-cluster.types';

export const PT_FEATURES_FLAGSHIP_CONTENT: FeaturesFlagshipDictionary = {
  capabilitiesIntro:
    'As seções acima são a versão resumida. Cada recurso abaixo tem uma página completa: o que ele realmente faz, como é liberado ou medido e quais limites se aplicam, tudo conferido com o produto disponível.',
  cardSummaries: {
    [FeatureCapability.MULTIMODAL_AI]:
      'Notas de voz e de vídeo, um assistente que descreve imagens para modelos que não enxergam e um roteamento que escolhe um modelo capaz de lidar com o anexo.',
    [FeatureCapability.FILES_FROM_CHAT]:
      'Peça um PDF, uma planilha ou uma apresentação em linguagem natural e receba um arquivo de verdade, nomeado pelo modelo que o escreveu.',
    [FeatureCapability.SMART_ATTACHMENTS]:
      'Solte documentos, código, mídia ou arquivos compactados inteiros no chat; cada envio passa por antivírus e tem o texto extraído para o modelo.',
    [FeatureCapability.NARRATED_RESEARCH]:
      'Um ciclo de pesquisa que decide se deve buscar ou rastrear, narra cada etapa enquanto trabalha e respeita o robots.txt em cada acesso.',
    [FeatureCapability.ORCHESTRATION_LABS]:
      'Laboratórios dedicados que colocam vários modelos no mesmo problema — comparação com juiz, consenso, escalonamento, verificação e muito mais.',
    [FeatureCapability.CONVERSATION_TOOLS]:
      'Ramifique uma conversa, edite e reexecute uma mensagem, pesquise suas conversas, exporte uma resposta e deixe uma conversa aproveitar outra.',
    [FeatureCapability.READ_ALOUD]:
      'Ouça qualquer resposta em vez de lê-la, com uma reprodução que começa assim que o primeiro trecho curto fica pronto.',
    [FeatureCapability.IMAGE_GENERATION]:
      'Gere e edite imagens dentro da conversa, com vários provedores de imagem e fallback automático entre eles.',
    [FeatureCapability.RELIABILITY]:
      'Fallback automático para outro modelo, um disjuntor compartilhado para provedores que ficam sem crédito e streams que sobrevivem a uma reconexão.',
    [FeatureCapability.PAY_AS_YOU_GO_CREDIT]:
      'Um crédito mensal do seu plano mais recargas que nunca expiram, reservado antes de cada chamada e exibido na sua própria moeda.',
    [FeatureCapability.ADMINISTRATION_AND_ACCESS]:
      'Funções que você pode remodelar, gestão de usuários e planos e um log de auditoria filtrável para quem opera a ClawAI em uma organização.',
  },
  capabilities: {
    [FeatureCapability.MULTIMODAL_AI]: {
      seo: {
        title: 'IA multimodal na ClawAI: voz, vídeo e visão',
        description:
          'Como a ClawAI lida com notas de voz, notas de vídeo e imagens: transcrição, amostragem de quadros de vídeo, um assistente de visão para modelos só de texto e roteamento por tipo de anexo.',
        keywords: [
          'notas de voz com IA',
          'compreensão de vídeo por IA',
          'roteamento de IA multimodal',
        ],
      },
      eyebrow: 'Recurso',
      title: 'IA multimodal: voz, vídeo e visão',
      summary:
        'Você pode falar com a ClawAI, mostrar um vídeo ou entregar uma imagem, e a mensagem ainda chega a um modelo capaz de entendê-la. Gravação, transcrição, amostragem de quadros e um assistente de visão fazem parte do chat disponível, não de um aplicativo separado.',
      sections: [
        {
          id: 'voice-and-video-notes',
          heading: 'Notas de voz e de vídeo direto do compositor',
          paragraphs: [
            'O compositor tem um botão de gravação para notas de voz e de vídeo. Ele pede permissão primeiro, mostra uma forma de onda ao vivo enquanto você grava e limita cada gravação a cinco minutos. A gravação é transcrita — o Gemini é tentado primeiro e o OpenAI Whisper é o fallback — e o modelo que responde é informado de que a mensagem chegou como nota de voz, para responder ao que você disse e não a um arquivo.',
            'O áudio que você já tem funciona da mesma forma: envios em WebM, OGG, MP3, MP4 e M4A, WAV, FLAC e AAC são transcritos antes de chegar ao modelo.',
          ],
        },
        {
          id: 'video-understanding',
          heading: 'Vídeo que o modelo consegue acompanhar de verdade',
          paragraphs: [
            'Um vídeo enviado é transcrito com marcas de tempo, e até seis quadros por vídeo são amostrados e mostrados ao modelo junto com a transcrição, para que ele responda tanto sobre o que acontece na tela quanto sobre o que é dito. Um vídeo sem som é informado como sem fala, em vez de gerar uma transcrição vazia, e você pode interromper o processamento de um vídeo longo a qualquer momento.',
            'Cada plano tem uma cota de duração de vídeo definida pelo operador; independentemente do plano, um vídeo nunca pode passar de trinta minutos nem de resolução 4K. Os contêineres aceitos são MP4, MOV, WebM, AVI e MPEG.',
          ],
        },
        {
          id: 'vision-helper-and-modality-routing',
          heading: 'Um assistente de visão e roteamento por tipo de anexo',
          paragraphs: [
            'Nem todo modelo enxerga. Quando o modelo que responde a uma mensagem é só de texto, um segundo modelo pode descrever até quatro imagens para ele, incluindo qualquer texto presente nelas, e o modelo que responde é informado de que está trabalhando a partir de uma descrição. Em conversas Somente local e de privacidade em primeiro lugar, só são usados assistentes locais servidos via Ollama ou llama.cpp.',
            'No modo Auto, o roteador também classifica os modelos candidatos pela forma como lidam com o tipo de anexo da mensagem, de modo que uma imagem, um PDF ou um vídeo tende a cair em um modelo que o aceita nativamente, sem depender do assistente.',
          ],
        },
      ],
      faq: [
        {
          question: 'Qual pode ser a duração de uma nota de voz ou de vídeo?',
          answer:
            'Uma gravação feita no compositor pode durar até cinco minutos. Os vídeos enviados são limitados pela cota de duração de vídeo do seu plano e nunca passam de trinta minutos nem de resolução 4K, em nenhum plano.',
        },
        {
          question:
            'O que acontece se eu enviar uma imagem para um modelo que não enxerga imagens?',
          answer:
            'Se o assistente de visão estiver habilitado no seu plano, um modelo com visão descreve a imagem e transcreve o texto dela, e o modelo que responde trabalha a partir dessa descrição, sabendo que se trata de uma descrição e não da própria imagem.',
        },
        {
          question: 'A ClawAI escolhe outro modelo por causa do meu anexo?',
          answer:
            'No modo Auto, sim: o roteador classifica os candidatos pela forma como lidam com o tipo de anexo. Se você mesmo fixar um modelo, sua escolha é mantida e o assistente de visão cobre a lacuna onde estiver habilitado.',
        },
      ],
      productNote:
        'Notas de voz e de vídeo, transcrição e roteamento sensível à modalidade já estão disponíveis; o assistente de visão é um recurso de plano que o operador ativa ao atribuir um modelo assistente.',
    },
    [FeatureCapability.FILES_FROM_CHAT]: {
      seo: {
        title: 'Arquivos a partir do chat: PDF, DOCX, XLSX, PPTX e ZIP',
        description:
          'Peça à ClawAI um documento, uma planilha, uma apresentação ou um arquivo compactado em linguagem natural e baixe um arquivo de verdade em um de dez formatos, nomeado e resumido pelo modelo.',
        keywords: ['gerar PDF com IA', 'criar planilha com IA', 'gerador de PowerPoint com IA'],
      },
      eyebrow: 'Recurso',
      title: 'Arquivos a partir do chat',
      summary:
        'Diga «transforme isto em PDF» ou «coloque isso em uma planilha» e a ClawAI entrega um arquivo, não um bloco de texto para copiar. O modelo escreve o conteúdo, um adaptador de formato monta o arquivo e o resultado fica na conversa, pronto para baixar.',
      sections: [
        {
          id: 'ten-formats-from-plain-language',
          heading: 'Dez formatos de arquivo a partir de um pedido em linguagem natural',
          paragraphs: [
            'Um pedido como «crie um PDF deste plano» ou «exporte a tabela como CSV» é reconhecido e enviado para a geração de arquivos. Os formatos aceitos são PDF, DOCX, XLSX, PPTX, ZIP, HTML, Markdown, texto simples, CSV e JSON — cada um montado por seu próprio adaptador, para que uma planilha tenha células de verdade e uma apresentação tenha slides de verdade, e não uma única página comprida.',
          ],
        },
        {
          id: 'named-by-the-model',
          heading: 'Nomeado e resumido pelo modelo que o escreveu',
          paragraphs: [
            'Em vez de «documento (3).pdf», o modelo dá a cada arquivo um título descritivo de até 120 caracteres e um resumo de uma frase, que aparecem no cartão do arquivo no chat. Títulos em árabe, chinês, hindi ou qualquer outra escrita são mantidos como foram escritos, sem transliteração.',
            'À parte disso, qualquer resposta pode ser exportada com um clique como Markdown, TXT, HTML, DOCX, PDF, XLSX, PPTX ou ZIP. Essas exportações convertem uma resposta que você já tem, por isso nunca contam para a sua cota diária de arquivos.',
          ],
        },
        {
          id: 'downloads-and-allowances',
          heading: 'Downloads privados e uma cota diária em todos os planos',
          paragraphs: [
            'Só a pessoa que criou um arquivo pode baixá-lo, por meio de um link autenticado. O download fica disponível por uma hora; depois disso, você pode reconstruir o mesmo arquivo de graça ou pedir ao modelo que o gere novamente com conteúdo novo.',
            'Todos os planos, incluindo o Free, têm uma cota diária de arquivos escritos por IA definida pelo operador, e os níveis mais altos a aumentam ou removem o limite. Sua cota de uso normal também se aplica à escrita em si, e vale o limite que for atingido primeiro.',
          ],
        },
      ],
      faq: [
        {
          question: 'Quais formatos de arquivo a ClawAI consegue criar?',
          answer:
            'Dez: PDF, DOCX, XLSX, PPTX, ZIP, HTML, Markdown, texto simples, CSV e JSON. A exportação de respostas cobre oito deles — Markdown, TXT, HTML, DOCX, PDF, XLSX, PPTX e ZIP.',
        },
        {
          question: 'Por que meu link de download parou de funcionar?',
          answer:
            'Os arquivos gerados ficam disponíveis para download por uma hora. Depois disso, abra o cartão do arquivo e reconstrua-o — o mesmo conteúdo, sem custo — ou peça ao modelo que o gere de novo se quiser que ele seja reescrito.',
        },
        {
          question: 'Existe um limite de quantos arquivos posso gerar?',
          answer:
            'Sim, uma cota diária por plano definida pelo operador, e ela também está disponível no Free. Exportar uma resposta que você já tem não conta para essa cota.',
        },
      ],
      productNote:
        'A geração de arquivos é um serviço próprio, com um adaptador por formato e sua própria superfície de medição (FILE_GENERATION), separada do uso comum do chat.',
    },
    [FeatureCapability.SMART_ATTACHMENTS]: {
      seo: {
        title: 'Anexos inteligentes: arquivos compactados, mídia e antivírus',
        description:
          'O que acontece quando você anexa um arquivo na ClawAI: cinquenta tipos aceitos, arquivos compactados abertos em uma árvore legível, envios retomáveis e uma verificação antivírus que falha de forma segura.',
        keywords: [
          'anexos em chat de IA',
          'enviar zip para IA',
          'leitor de arquivos compactados com IA',
        ],
      },
      eyebrow: 'Recurso',
      title: 'Anexos inteligentes',
      summary:
        'Um anexo só é útil se o modelo conseguir lê-lo. A ClawAI extrai o texto de documentos e arquivos compactados antes de um modelo vê-los, verifica cada envio em busca de malware e permite soltar arquivos em qualquer parte do chat, sem precisar procurar um botão.',
      sections: [
        {
          id: 'what-you-can-attach',
          heading: 'O que você pode anexar, e quanto',
          paragraphs: [
            'Documentos (PDF, DOCX, XLSX, PPTX, RTF), cerca de quarenta formatos de texto e código, imagens (PNG, JPEG, WebP, GIF, SVG), áudio, vídeo e arquivos compactados (ZIP, 7z, RAR, TAR, GZ, BZ2, XZ). Cada arquivo pode ter até 50 MB e uma mensagem pode levar até dez. Arquivos acima de 4 MB são enviados em partes retomáveis, então uma conexão perdida não significa começar de novo.',
            'Você pode soltar arquivos em qualquer lugar do painel de chat — sobre as mensagens ou no compositor — e cada anexo mostra um indicador de status durante o envio, com um botão de cancelar caso você mude de ideia.',
          ],
        },
        {
          id: 'text-extraction-and-archives',
          heading: 'Extração de texto e arquivos compactados que o modelo consegue navegar',
          paragraphs: [
            'O texto legível de arquivos PDF, Office e RTF é extraído e entregue ao modelo, para que ele responda a partir do próprio documento e não de um texto de substituição. Um arquivo compactado é aberto em uma árvore de arquivos mais o texto de cada item, então você pode anexar um projeto zipado e perguntar sobre um arquivo específico dentro dele.',
            'Os arquivos compactados são verificados antes de serem abertos: limites de tamanho total descompactado, número de entradas e profundidade de aninhamento impedem que uma bomba de descompressão chegue ao extrator.',
          ],
        },
        {
          id: 'scanning-and-retention',
          heading: 'Antivírus que falha de forma segura, e retenção',
          paragraphs: [
            'Cada envio é verificado pelo ClamAV antes de ser armazenado. Se o antivírus estiver indisponível, o envio é recusado em vez de passar sem verificação. Os envios são excluídos automaticamente após o período de retenção configurado pelo operador, e você mesmo pode excluir um arquivo a qualquer momento.',
          ],
        },
      ],
      faq: [
        {
          question: 'Posso enviar um projeto inteiro como arquivo ZIP?',
          answer:
            'Sim. Arquivos compactados ZIP, 7z, RAR, TAR, GZ, BZ2 e XZ são abertos em uma árvore de arquivos com o texto de cada item, para que o modelo encontre e cite um arquivo específico dentro do pacote.',
        },
        {
          question: 'Qual é o tamanho máximo de um anexo?',
          answer:
            '50 MB por arquivo e até dez anexos por mensagem. Arquivos acima de 4 MB são enviados em partes retomáveis, então uma conexão interrompida continua de onde parou em vez de recomeçar.',
        },
        {
          question: 'O que acontece se o antivírus estiver fora do ar?',
          answer:
            'O envio é recusado. A ClawAI nunca armazena um arquivo não verificado como alternativa — você vê um erro e pode tentar de novo quando a verificação voltar.',
        },
      ],
      productNote:
        'O tratamento de anexos fica no serviço de arquivos: extração, manifestos de arquivos compactados, envios em partes e verificação com ClamAV vêm ativados por padrão, não são complementos opcionais.',
    },
    [FeatureCapability.NARRATED_RESEARCH]: {
      seo: {
        title: 'Pesquisa narrada e rastreamento da web na ClawAI',
        description:
          'Como a ClawAI pesquisa na web: um planejador que escolhe entre buscar e rastrear, um registro de trabalho narrado ao vivo, acesso em níveis que respeita o robots.txt e fontes citadas.',
        keywords: [
          'pesquisa na web com IA',
          'rastreador de sites com IA',
          'pesquisa com IA e fontes',
        ],
      },
      eyebrow: 'Recurso',
      title: 'Pesquisa narrada e rastreamento da web',
      summary:
        'Quando uma pergunta precisa da web ao vivo, a ClawAI não chuta. Um planejador decide se responde diretamente, busca, rastreia um site ou faz as duas coisas, narra cada etapa enquanto trabalha e devolve a resposta com as fontes que realmente leu.',
      sections: [
        {
          id: 'a-planner-not-a-keyword',
          heading: 'Quem decide é um planejador, não uma palavra-chave',
          paragraphs: [
            'No modo de pesquisa Auto, um modelo planejador lê a mensagem e escolhe um de quatro caminhos: responder com o que já sabe, buscar na web, rastrear um site específico ou rastrear e depois buscar. Um link que você cola é sempre aberto. Se o modelo planejador devolver algo inutilizável, o próximo modelo é tentado, em vez de a pesquisa parar em silêncio.',
            'Você também pode escolher o modo no compositor: desligado, Auto, apenas busca, busca e acesso às páginas, ou busca e extração de conteúdo estruturado.',
          ],
        },
        {
          id: 'a-narrated-work-log',
          heading: 'Um registro de trabalho que você pode acompanhar',
          paragraphs: [
            'Cada etapa — o plano, cada busca, cada página acessada ou ignorada — é transmitida para um registro narrado acima da resposta à medida que acontece, e salva com a resposta para continuar lá depois de atualizar a página. As fontes usadas pela resposta aparecem listadas junto dela, para que você possa abri-las e conferir por conta própria.',
          ],
        },
        {
          id: 'tiered-and-polite-fetching',
          heading: 'Acesso em níveis que segue as regras',
          paragraphs: [
            'As páginas são acessadas do jeito mais barato primeiro: a API oficial do site, quando existe, depois uma requisição HTTP simples, e só então um navegador headless quando a página realmente exige, com um serviço de leitura e cópias de arquivos da web como alternativas posteriores. Um rastreamento pode cobrir até duzentas páginas de um mesmo site.',
            'O robots.txt é respeitado em cada acesso sob o user agent ClawAI-ResearchBot, e uma página não permitida não é tentada de outra forma. Barreiras de login e bloqueios legais interrompem o acesso, captchas nunca são resolvidos, cada redirecionamento é verificado contra endereços de rede privada e uma cópia arquivada é sempre identificada como tal.',
          ],
        },
      ],
      faq: [
        {
          question: 'A ClawAI respeita o robots.txt?',
          answer:
            'Sim, em cada acesso, sob o user agent ClawAI-ResearchBot. Uma página que o robots.txt não permite é ignorada e não é tentada por outro método de acesso.',
        },
        {
          question: 'Posso ver o que a pesquisa realmente fez?',
          answer:
            'Sim. Um registro de trabalho narrado mostra o plano, cada busca e cada página acessada ou ignorada, e fica salvo com a resposta junto com a lista de fontes utilizadas.',
        },
        {
          question: 'A pesquisa na web está disponível em todos os planos?',
          answer:
            'Os modos de pesquisa são recursos de plano (RESEARCH_MODE, WEB_SEARCH, WEB_FETCH e WEB_EXTRACT) com cotas próprias, que o operador define por plano. A página de preços mostra o que cada plano inclui.',
        },
      ],
      productNote:
        'O ciclo de pesquisa roda em um serviço de pesquisa próprio, com níveis de acesso editáveis pelo administrador, e é medido em superfícies próprias, não como tokens comuns de chat.',
    },
    [FeatureCapability.ORCHESTRATION_LABS]: {
      seo: {
        title: 'Laboratórios de orquestração: comparar, julgar, consenso, escalonamento',
        description:
          'Os laboratórios da ClawAI que colocam vários modelos no mesmo prompt — Compare com Judge e Critic, Consensus, Escalation, Best-of-N, Verify, Repair, Pipelines e outros.',
        keywords: [
          'comparar modelos de IA lado a lado',
          'resposta de IA por consenso',
          'LLM como juiz',
        ],
      },
      eyebrow: 'Recurso',
      title: 'Laboratórios de orquestração',
      summary:
        'Algumas perguntas merecem mais de um modelo. Os laboratórios são espaços de trabalho dedicados, cada um com sua própria página e visualização de resultados, para rodar vários modelos no mesmo problema e ver exatamente em que eles diferem.',
      sections: [
        {
          id: 'compare-judge-and-critic',
          heading: 'Compare, com um juiz e um crítico',
          paragraphs: [
            'O Compare envia um único prompt a vários modelos e mostra as respostas lado a lado, com latência e contagem de tokens. Ative o Judge e um modelo independente pontua cada resposta segundo critérios explícitos; ative o Critic e ele registra por escrito os pontos fracos de cada uma. O Compare também funciona dentro de uma conversa comum, então você pode checar uma resposta sem sair dela.',
          ],
        },
        {
          id: 'consensus-and-escalation',
          heading: 'Consenso e escalonamento',
          paragraphs: [
            'O Consensus faz a mesma pergunta a dois a cinco modelos e sintetiza uma única resposta a partir dos pontos em que concordam, sinalizando onde divergem. O Escalation começa com um modelo barato e só sobe na cadeia quando a resposta não é suficiente, para que você pague por um modelo forte apenas quando a pergunta realmente precisa dele.',
          ],
        },
        {
          id: 'the-other-labs',
          heading: 'Verificar, reparar e o restante da bancada',
          paragraphs: [
            'O Best-of-N gera vários candidatos e fica com o mais forte. O Verify coloca um segundo modelo para checar se uma resposta está correta. O Repair corrige um defeito específico de uma resposta existente em vez de gerá-la de novo. O Decompose divide uma tarefa grande em etapas. Os Role packs passam um problema entre modelos especializados por papel, o Cost ensemble equilibra qualidade e gasto, e os Pipelines encadeiam várias etapas em um único fluxo nomeado e reexecutável.',
            'Cada laboratório é habilitado por plano pelo operador, e as execuções dos laboratórios são medidas separadamente do chat comum — Compare, Judge e Critic em superfícies próprias, os demais laboratórios na superfície de orquestração.',
          ],
        },
      ],
      faq: [
        {
          question: 'Qual é a diferença entre Compare e Consensus?',
          answer:
            'O Compare mostra a resposta de cada modelo lado a lado e deixa o veredito com você, opcionalmente com uma nota do Judge. O Consensus funde as respostas em uma só e sinaliza os pontos em que os modelos discordam.',
        },
        {
          question: 'Como o escalonamento economiza dinheiro?',
          answer:
            'Ele começa com um modelo mais barato e só passa para um mais forte quando a resposta não atinge o nível esperado, então perguntas fáceis nunca pagam pelo modelo mais caro.',
        },
        {
          question: 'Os laboratórios estão em todos os planos?',
          answer:
            'Cada laboratório é ativado por plano pelo operador, então a disponibilidade depende do seu plano. A página de preços lista o que cada plano inclui.',
        },
      ],
      productNote:
        'Compare, Consensus, Escalation, Repair, Decompose, Best-of-N, Verify, Pipeline, Cost ensemble e Role pack estão disponíveis, cada um com sua própria página, endpoint e cartão de resultado.',
    },
    [FeatureCapability.CONVERSATION_TOOLS]: {
      seo: {
        title: 'Ferramentas avançadas de conversa: ramificar, editar, pesquisar, exportar',
        description:
          'As ferramentas da ClawAI para trabalhar com uma conversa, e não apenas lê-la: ramificação, editar e reexecutar, localizar na conversa, pesquisa entre conversas, exportação e links compartilhados.',
        keywords: [
          'ramificar conversa com IA',
          'editar e reexecutar prompt',
          'exportar chat de IA',
        ],
      },
      eyebrow: 'Recurso',
      title: 'Ferramentas avançadas de conversa',
      summary:
        'Uma conversa longa é um documento de trabalho. A ClawAI oferece as ferramentas para ramificá-la, corrigi-la, pesquisá-la, reaproveitá-la em outra conversa e entregá-la a outra pessoa, sem copiar e colar.',
      sections: [
        {
          id: 'branch-edit-and-rerun',
          heading: 'Ramificar, editar e reexecutar',
          paragraphs: [
            'Ramifique uma conversa a partir de qualquer mensagem para testar outro caminho, mantendo a original intacta. Edite uma das suas mensagens anteriores e reexecute-a, ou gere de novo uma resposta que não agradou, e a conversa continua a partir da nova versão.',
          ],
        },
        {
          id: 'find-search-and-cross-thread-context',
          heading: 'Localizar, pesquisar e contexto de outras conversas',
          paragraphs: [
            'Pesquise dentro da conversa atual ou em todas as suas conversas por título e texto das mensagens. O contexto entre conversas permite que uma conversa aproveite suas próprias conversas anteriores relevantes — no máximo três, e sempre apenas as suas. Ele vem ativado por padrão, pode ser desativado por conversa, e o inspetor de contexto mostra quais conversas foram usadas.',
          ],
        },
        {
          id: 'export-pin-and-share',
          heading: 'Exportar, fixar e compartilhar',
          paragraphs: [
            'Exporte uma conversa inteira como Markdown, ou uma única resposta como Markdown, TXT, HTML, DOCX, PDF, XLSX, PPTX ou ZIP. Fixe as conversas às quais você sempre volta. Compartilhe uma conversa por meio de um link público que você pode renovar para uma nova URL ou revogar a qualquer momento.',
          ],
        },
      ],
      faq: [
        {
          question: 'Ramificar altera a conversa original?',
          answer:
            'Não. Uma ramificação é uma nova conversa que começa a partir da mensagem escolhida; a conversa original permanece exatamente como estava.',
        },
        {
          question:
            'A conversa de outra pessoa pode vazar para a minha pelo contexto entre conversas?',
          answer:
            'Não. O contexto entre conversas só lê as suas próprias conversas, no máximo três delas, e você pode desativá-lo em qualquer conversa nas configurações dela.',
        },
        {
          question: 'Posso parar de compartilhar uma conversa depois de enviar o link?',
          answer:
            'Sim. Você pode revogar um link compartilhado a qualquer momento, ou renová-lo para uma nova URL, e o antigo deixa de funcionar.',
        },
      ],
      productNote:
        'Ramificação, editar e reexecutar, regeneração, pesquisa dentro da conversa e entre conversas, exportação, fixação, compartilhamento e contexto entre conversas estão todos disponíveis no espaço de trabalho do chat.',
    },
    [FeatureCapability.READ_ALOUD]: {
      seo: {
        title: 'Leitura em voz alta: ouça as respostas de IA na ClawAI',
        description:
          'Como a ClawAI lê uma resposta em voz alta com fala gerada no servidor: reprodução que começa cedo, controles de pausar e parar, tratamento de respostas longas e nenhuma cobrança por trechos que falham.',
        keywords: ['IA que lê em voz alta', 'respostas de IA em áudio', 'ouvir chat de IA'],
      },
      eyebrow: 'Recurso',
      title: 'Leitura em voz alta',
      summary:
        'Qualquer resposta pode ser ouvida em vez de lida. A fala é gerada no servidor por um modelo de conversão de texto em fala, não pela voz embutida do navegador, e começa a tocar antes que a resposta inteira tenha sido convertida.',
      sections: [
        {
          id: 'how-playback-works',
          heading: 'Como funciona a reprodução',
          paragraphs: [
            'Cada mensagem do assistente tem um botão Ler em voz alta com reproduzir, pausar e parar. A resposta é convertida em trechos, e a reprodução começa assim que o primeiro trecho curto fica pronto, para que você não precise esperar uma resposta longa ser processada por inteiro antes de ouvir algo.',
          ],
        },
        {
          id: 'long-answers-and-languages',
          heading: 'Respostas longas e outros idiomas',
          paragraphs: [
            'São lidos até 12.000 caracteres de uma resposta, e você é avisado quando a resposta era mais longa do que isso e a reprodução foi interrompida. As frases são divididas corretamente em textos latinos, árabes, em hindi e em chinês, japonês e coreano, para que uma resposta multilíngue não tropece a cada ponto final.',
          ],
        },
        {
          id: 'voices-and-billing',
          heading: 'Vozes, disponibilidade e cobrança',
          paragraphs: [
            'As vozes vêm de modelos de conversão de texto em fala do Gemini ou da OpenAI, escolhidos pelo operador. A leitura em voz alta é um recurso de plano; se nenhuma voz tiver sido atribuída, o botão avisa isso em vez de falhar em silêncio. Os trechos que falham na geração não são cobrados.',
          ],
        },
      ],
      faq: [
        {
          question: 'A leitura em voz alta usa a voz do meu navegador?',
          answer:
            'Não. A fala é gerada no servidor por um modelo de conversão de texto em fala do Gemini ou da OpenAI, então soa igual em qualquer dispositivo e navegador.',
        },
        {
          question: 'Ela consegue ler uma resposta muito longa?',
          answer:
            'Ela lê até 12.000 caracteres de uma resposta e avisa quando a resposta era mais longa do que isso, para que você saiba que a reprodução parou antes do fim.',
        },
        {
          question: 'Sou cobrado se a leitura em voz alta falhar?',
          answer:
            'Só pelos trechos que foram realmente gerados. Um trecho que falha não é cobrado, e você pode reproduzir a resposta novamente.',
        },
      ],
      productNote:
        'A leitura em voz alta é um recurso de plano que usa um modelo de conversão de texto em fala no servidor, atribuído pelo operador; não é o mecanismo de fala do navegador.',
    },
    [FeatureCapability.IMAGE_GENERATION]: {
      seo: {
        title: 'Geração de imagens com IA dentro das conversas da ClawAI',
        description:
          'Gere e edite imagens a partir de uma conversa na ClawAI usando modelos Gemini, OpenAI, xAI ou Stable Diffusion locais, com fallback entre provedores, progresso e nova tentativa integrados.',
        keywords: [
          'gerador de imagens com IA',
          'editar imagem com IA',
          'geração de imagens com Gemini',
        ],
      },
      eyebrow: 'Recurso',
      title: 'Geração de imagens',
      summary:
        'Descreva uma imagem na conversa e a ClawAI a gera ali mesmo, ao lado do restante do trabalho. Vários provedores de imagem ficam por trás de um único pedido, e se um falhar o próximo é tentado automaticamente.',
      sections: [
        {
          id: 'providers-and-fallback',
          heading: 'Vários provedores por trás de um único pedido',
          paragraphs: [
            'Os pedidos de imagem podem ser atendidos por modelos de imagem do Gemini, pelo gpt-image-1 da OpenAI, pelo Grok Imagine da xAI ou por modelos Stable Diffusion locais (SDXL-Turbo e um fluxo do ComfyUI) rodando no seu próprio hardware. Se o provedor escolhido falhar, o pedido passa para o próximo — primeiro nuvem, depois local — em vez de devolver um erro.',
            'Se você mesmo escolher um modelo de imagem específico, é esse modelo que será usado, mesmo quando o prompt não contém uma palavra-chave óbvia de imagem.',
          ],
        },
        {
          id: 'in-the-conversation',
          heading: 'Gerada na conversa, com progresso',
          paragraphs: [
            'As imagens aparecem dentro do chat, com um painel de progresso enquanto são geradas. Você pode cancelar uma geração ou tentar de novo com outro provedor se não gostar do resultado. Não há um aplicativo de imagens separado para onde precise ir.',
          ],
        },
        {
          id: 'prompts-sizes-and-edits',
          heading: 'Prompts, tamanhos e edições',
          paragraphs: [
            'Os prompts podem ter até 4.000 caracteres, e as imagens podem ser pedidas em tamanhos de 256 a 4.096 pixels. Anexe uma imagem de referência de até 25 MB para editar uma imagem existente em vez de começar do zero. A geração de imagens é um recurso dos planos pagos e é medida em sua própria superfície, separada dos tokens de chat.',
          ],
        },
      ],
      faq: [
        {
          question: 'Quais modelos geram as imagens?',
          answer:
            'Modelos de imagem do Gemini, o gpt-image-1 da OpenAI, o Grok Imagine da xAI e modelos Stable Diffusion locais. Quais deles estão disponíveis depende do que o operador configurou.',
        },
        {
          question: 'Posso editar uma imagem que já tenho?',
          answer:
            'Sim. Anexe uma imagem de referência de até 25 MB e descreva a mudança que deseja, e o modelo a edita em vez de gerar do zero.',
        },
        {
          question: 'A geração de imagens está disponível no plano gratuito?',
          answer:
            'A geração de imagens é um recurso dos planos pagos e é medida separadamente do chat. A página de preços mostra quais planos a incluem.',
        },
      ],
      productNote:
        'A geração de imagens roda em um serviço de imagens próprio, com fallback de provedores da nuvem para modelos locais, e é medida na superfície IMAGE.',
    },
    [FeatureCapability.RELIABILITY]: {
      seo: {
        title: 'Confiabilidade na ClawAI: fallback, disjuntores e streams retomáveis',
        description:
          'O que a ClawAI faz quando um provedor falha: fallback automático para outro modelo, um disjuntor compartilhado para contas de provedor esgotadas e streams que continuam após uma reconexão.',
        keywords: [
          'fallback de modelos de IA',
          'failover de provedores de LLM',
          'streaming de IA retomável',
        ],
      },
      eyebrow: 'Recurso',
      title: 'Confiabilidade',
      summary:
        'Provedores falham, ficam sem crédito e estouram o tempo limite. A ClawAI foi feita para que, quando isso acontecer, sua conversa continue com outro modelo e um stream interrompido retome de onde parou.',
      sections: [
        {
          id: 'automatic-fallback',
          heading: 'Fallback automático para outro modelo',
          paragraphs: [
            'Cada solicitação roteada carrega uma lista de modelos candidatos. Se o modelo escolhido falhar no meio da solicitação, a ClawAI passa automaticamente para o próximo candidato, e a resposta registra qual modelo realmente respondeu, não apenas o escolhido primeiro.',
          ],
        },
        {
          id: 'a-shared-provider-breaker',
          heading: 'Um disjuntor compartilhado para provedores esgotados',
          paragraphs: [
            'Quando uma conta de provedor fica sem crédito, um disjuntor tira esse provedor de rotação por dez minutos e depois deixa passar uma única chamada de teste para ver se ele se recuperou. O estado do disjuntor é compartilhado no Redis entre todos os servidores de chat, então uma falha é aprendida uma vez só, em vez de ser redescoberta por cada servidor, e cada servidor recorre à sua própria cópia se o Redis estiver indisponível.',
          ],
        },
        {
          id: 'stop-and-resume',
          heading: 'Um Parar que sempre para, streams que retomam',
          paragraphs: [
            'Apertar Parar é transmitido a todos os servidores de chat, então aquele que estiver rodando o modelo o interrompe. Se a sua conexão cair enquanto uma resposta está sendo transmitida, a reconexão reproduz os eventos perdidos a partir de um buffer, em vez de perder o restante da resposta.',
          ],
        },
      ],
      faq: [
        {
          question: 'O que acontece se um modelo falhar no meio de uma resposta?',
          answer:
            'A ClawAI passa automaticamente para o próximo modelo candidato, e a resposta mostra qual modelo realmente a produziu.',
        },
        {
          question: 'Contra o que o disjuntor de provedores protege?',
          answer:
            'Contra uma conta de provedor que ficou sem crédito. Ela é ignorada por dez minutos e depois testada com uma chamada, em vez de todas as solicitações falharem contra ela nesse meio-tempo.',
        },
        {
          question: 'Perco uma resposta se minha conexão cair?',
          answer:
            'Não. Quando o stream se reconecta, os eventos perdidos são reproduzidos a partir de um buffer no servidor e a resposta continua.',
        },
      ],
      productNote:
        'O fallback, o disjuntor de provedores compartilhado no Redis, o Parar entre servidores e os streams retomáveis já estão no serviço de chat hoje; os operadores veem o estado do disjuntor na página de conectores do painel de administração.',
    },
    [FeatureCapability.PAY_AS_YOU_GO_CREDIT]: {
      seo: {
        title: 'Crédito de IA pré-pago por uso e preços em moeda local',
        description:
          'Como funciona o crédito pague-conforme-o-uso da ClawAI: um crédito mensal do seu plano, recargas que nunca expiram, gasto reservado antes de cada chamada e preços exibidos na sua moeda.',
        keywords: [
          'IA pague conforme o uso',
          'recarga de créditos de IA',
          'preços de IA em moeda local',
        ],
      },
      eyebrow: 'Recurso',
      title: 'Crédito pague-conforme-o-uso e moeda local',
      summary:
        'Os modelos em nuvem custam dinheiro de verdade por token, por isso a ClawAI os mede contra uma carteira de créditos em vez de esconder o custo dentro de uma taxa fixa. Você vê quanto cada recurso gastou, recarrega só quando precisa e lê os preços na sua própria moeda.',
      sections: [
        {
          id: 'two-kinds-of-credit',
          heading: 'Dois tipos de crédito, gastos em uma ordem fixa',
          paragraphs: [
            'A carteira guarda dois tipos de crédito. O crédito mensal é uma parte do preço do seu plano pago que se renova a cada período de cobrança e não se acumula para o seguinte; um plano gratuito não concede nenhum. O crédito comprado vem de recargas, nunca expira e continua sendo seu mesmo após um downgrade ou um cancelamento.',
            'O gasto sempre consome primeiro o crédito mensal e depois o crédito comprado, então uma recarga só é usada quando o crédito do período acaba. Qualquer pessoa pode comprar uma recarga, inclusive no plano gratuito, e os pacotes de recarga e os preços dos planos vêm de registros de preço versionados, e não desta página.',
          ],
        },
        {
          id: 'no-surprise-spend',
          heading: 'O gasto é reservado antes da chamada, nunca depois',
          paragraphs: [
            'Antes de um modelo em nuvem rodar, o custo da solicitação é reservado contra o seu saldo; depois, a reserva é liquidada pelo valor real ou liberada. Você não consegue gastar além do seu saldo, e se o que resta não cobrir uma resposta útil, a solicitação é recusada em vez de ser cortada no meio. Um modelo sem preço publicado é bloqueado em vez de ser tratado como gratuito.',
            'O crédito cobre chat, Compare, Judge, os laboratórios de orquestração, geração de imagens e arquivos, o agente de programação, ações de espaço de trabalho, transcrição, o assistente de visão e a leitura em voz alta. Os modelos locais servidos via Ollama ou llama.cpp não são medidos, e a pesquisa na web usa suas próprias cotas separadas.',
          ],
        },
        {
          id: 'ledger-and-local-currency',
          heading: 'Um extrato por recurso, e preços na sua moeda',
          paragraphs: [
            'Cada movimentação é gravada em um razão somente de acréscimo, em micro-dólares inteiros — sem desvio de arredondamento — e a página de cobrança mostra qual recurso gastou cada valor, para que uma semana intensa de geração de imagens apareça exatamente como tal.',
            'Os preços são exibidos em mais de sessenta moedas de exibição, detectadas pela sua localização ou escolhidas manualmente, com o valor original em dólares americanos ao lado. O valor exibido é uma estimativa; você é cobrado na moeda mostrada no checkout, a uma taxa fixada no momento do pagamento, pelos gateways de pagamento que o operador habilitou — hoje, PayPal e Paymob.',
          ],
        },
      ],
      faq: [
        {
          question: 'O crédito não usado passa para o mês seguinte?',
          answer:
            'O crédito mensal não — ele se renova a cada período de cobrança. O crédito que você comprou como recarga nunca expira e sobrevive a um downgrade ou cancelamento.',
        },
        {
          question: 'Uma conversa longa pode gastar mais do que o meu saldo?',
          answer:
            'Não. O custo é reservado antes de o modelo rodar, e uma solicitação que o seu saldo restante não cobre é recusada logo de início, em vez de ser cobrada depois.',
        },
        {
          question: 'Por que o preço no checkout é um pouco diferente do que eu vi?',
          answer:
            'O preço em moeda local exibido no site é uma estimativa convertida de dólares americanos. A cobrança usa a moeda mostrada no checkout e uma taxa de câmbio fixada no momento em que você paga.',
        },
      ],
      productNote:
        'O crédito pague-conforme-o-uso é uma carteira com um razão em micro-dólares somente de acréscimo, ativada por implantação pelo seu operador; os preços dos planos e os pacotes de recarga sempre vêm de registros de preço versionados.',
    },
    [FeatureCapability.ADMINISTRATION_AND_ACCESS]: {
      seo: {
        title: 'Administração e controle de acesso na ClawAI',
        description:
          'O que um operador recebe ao rodar a ClawAI para uma organização: permissões baseadas em funções, funções personalizadas, gestão de usuários, configurações de planos e gateways e um log de auditoria filtrável.',
        keywords: [
          'console de administração de IA',
          'controle de acesso baseado em funções para IA',
          'log de auditoria de IA',
        ],
      },
      eyebrow: 'Recurso',
      title: 'Administração e controle de acesso',
      summary:
        'Operar a ClawAI para um grupo de pessoas — uma empresa, um departamento, um laboratório — significa decidir quem pode fazer o quê e conseguir verificar o que aconteceu. O console de administração cobre usuários, funções, planos, pagamentos e uma trilha de auditoria, e é o mesmo console quer a ClawAI seja hospedada para você, quer rode nos seus próprios servidores.',
      sections: [
        {
          id: 'roles-and-permissions',
          heading: 'Funções e permissões que você pode remodelar',
          paragraphs: [
            'Cada conta tem uma função, e cada tela e ação da API verifica uma permissão nomeada em vez de uma função fixa no código. Os administradores podem mudar quais permissões uma função carrega e criar suas próprias funções, então um revisor somente leitura ou um operador só de cobrança é uma mudança de configuração, não de código.',
          ],
        },
        {
          id: 'users-plans-and-payments',
          heading: 'Usuários, planos e pagamentos',
          paragraphs: [
            'Os administradores podem ativar ou desativar contas, mudar a função de um usuário, definir uma senha temporária que deve ser trocada no próximo login e ver o uso e o plano de cada usuário. Planos, reembolsos, gateways de pagamento, as configurações do roteador inteligente, as entregas de webhooks e os detalhes da implantação têm cada um sua própria tela de administração.',
          ],
        },
        {
          id: 'audit-and-self-hosting',
          heading: 'Um log de auditoria, e sua própria infraestrutura se precisar',
          paragraphs: [
            'As ações relevantes para a segurança são gravadas em um log de auditoria que os administradores podem filtrar e revisar, e os registros de auditoria são mantidos, em vez de expirarem no calendário normal dos logs. Organizações que não podem enviar dados a um provedor terceiro podem rodar a plataforma inteira nos seus próprios servidores, apenas com modelos locais; trata-se de uma implantação sob medida, não de um plano de autoatendimento.',
          ],
        },
      ],
      faq: [
        {
          question: 'Posso criar minhas próprias funções?',
          answer:
            'Sim. Os administradores podem criar funções e escolher quais permissões cada uma carrega; cada tela e ação da API verifica uma permissão nomeada, não uma função fixa.',
        },
        {
          question:
            'A ClawAI tem espaços de trabalho de equipe, licenças por usuário ou login único (SSO)?',
          answer:
            'Ainda não. Hoje não há espaços de trabalho de equipe compartilhados, cobrança por usuário, convites por e-mail nem login único. A administração é por implantação: um operador gerencia usuários, funções e planos pelo console de administração.',
        },
        {
          question: 'Podemos rodar a ClawAI dentro da nossa própria rede?',
          answer:
            'Sim, como uma implantação sob medida nos seus próprios servidores, apenas com modelos locais, para que nenhum prompt ou documento saia da sua infraestrutura. A página de implantação privada descreve o que isso envolve.',
        },
      ],
      productNote:
        'Permissões baseadas em funções, funções personalizadas, gestão de usuários e o log de auditoria estão disponíveis no console de administração; espaços de trabalho de equipe, cobrança por usuário, convites e login único não estão.',
    },
  },
};
