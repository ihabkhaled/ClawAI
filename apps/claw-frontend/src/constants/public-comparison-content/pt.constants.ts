import { ComparisonDimension } from '@/enums/comparison-dimension.enum';
import { ComparisonRival } from '@/enums/comparison-rival.enum';
import type { ComparisonDictionary } from '@/types/public-comparison.types';

export const PT_COMPARISON_CONTENT: ComparisonDictionary = {
  labels: {
    onThisPage: 'Nesta página',
    atAGlance: 'Num relance',
    tableCaption: 'ClawAI e {rival} comparados, capacidade a capacidade',
    capabilityColumn: 'Capacidade',
    clawColumn: 'ClawAI',
    strengthTitle: 'Onde o {rival} é forte',
    differenceTitle: 'Onde o ClawAI funciona de forma diferente',
    chooseTitle: 'Qual escolher',
    chooseRivalLabel: 'Escolha o {rival} se',
    chooseClawLabel: 'Escolha o ClawAI se',
    faqTitle: 'Perguntas frequentes',
    lastReviewed: 'Comparado com base em informação pública, última verificação',
    independence:
      'O ClawAI é um produto independente. Não é afiliado, endossado nem revendedor de nenhum dos assistentes citados nesta página. Cada afirmação vem da documentação pública de cada fornecedor na data acima, e estes produtos mudam depressa — consulte as páginas do próprio fornecedor antes de decidir.',
    otherComparisons: 'Comparar o ClawAI com outro assistente',
    startFree: 'Comece no plano gratuito',
    seePricing: 'Ver preços',
  },
  hub: {
    eyebrow: 'Comparações',
    intro:
      'O ClawAI não tenta ser um assistente único melhor. Coloca {cloudProviderCount} provedores em nuvem e modelos locais de pesos abertos sob uma só assinatura e envia cada mensagem para o que melhor serve. Estas páginas põem isso frente aos assistentes que as pessoas já usam, sempre sobre as mesmas oito capacidades.',
    cardsTitle: 'Escolha um assistente para comparar',
    cardCta: 'Comparar com {rival}',
    coversTitle: 'O que cada comparação cobre',
    coversBody:
      'As mesmas oito capacidades, na mesma ordem, em todas as páginas: escolha de modelos, roteamento, respostas lado a lado, modelos locais, self-hosting, memória e ficheiros, conectores e registo de uso por resposta. As mesmas perguntas para todos, para que duas páginas se leiam lado a lado.',
  },
  dimensionLabels: {
    [ComparisonDimension.MODEL_CHOICE]: 'Escolha de modelos',
    [ComparisonDimension.ROUTING]: 'Roteamento',
    [ComparisonDimension.SIDE_BY_SIDE]: 'Respostas lado a lado',
    [ComparisonDimension.LOCAL_MODELS]: 'Modelos locais e de pesos abertos',
    [ComparisonDimension.SELF_HOSTING]: 'Self-hosting',
    [ComparisonDimension.MEMORY_AND_FILES]: 'Memória e ficheiros',
    [ComparisonDimension.CONNECTORS]: 'Conectores de trabalho',
    [ComparisonDimension.RECEIPTS]: 'Registo de uso',
  },
  clawCells: {
    [ComparisonDimension.MODEL_CHOICE]:
      '{cloudProviderCount} provedores em nuvem, mais modelos de pesos abertos no seu próprio hardware',
    [ComparisonDimension.ROUTING]:
      '{routingModeCount} modos de roteamento, incluindo o automático por mensagem',
    [ComparisonDimension.SIDE_BY_SIDE]:
      'Um mesmo pedido para vários modelos ao mesmo tempo, respostas lado a lado',
    [ComparisonDimension.LOCAL_MODELS]:
      'Modelos de pesos abertos na sua própria GPU, via Ollama ou llama.cpp',
    [ComparisonDimension.SELF_HOSTING]:
      'Toda a pilha corre nos seus servidores, código-fonte no GitHub',
    [ComparisonDimension.MEMORY_AND_FILES]:
      'Memória que persiste entre conversas, mais o contexto dos ficheiros',
    [ComparisonDimension.CONNECTORS]: '{connectorCount} conectores de trabalho',
    [ComparisonDimension.RECEIPTS]: 'Cada resposta regista o modelo, o custo e o saldo consumido',
  },
  rivals: {
    [ComparisonRival.CHATGPT]: {
      name: 'ChatGPT',
      vendor: 'OpenAI',
      eyebrow: 'ClawAI vs ChatGPT',
      intro:
        'O ChatGPT é o assistente em que quase toda a gente pensa quando diz «IA»: polido, rápido e apoiado nos modelos de ponta da OpenAI. O ClawAI tem outra forma: uma assinatura que alcança os modelos da OpenAI ao lado de outras oito famílias e envia cada mensagem para a que melhor serve.',
      theirStrength:
        'Um único produto extremamente bem feito. Voz, geração de imagens, execução de código e pesquisa profunda vêm integradas e funcionam em conjunto, as apps móveis são excelentes e o modelo por baixo é de ponta, não um compromisso.',
      ourDifference:
        'O ClawAI não tenta ser um assistente único melhor. Remove a questão do fornecedor único: uma mesma conversa pode passar entre OpenAI, Anthropic, Google e outras seis famílias, descer para um modelo local de pesos abertos quando os dados não podem sair da sua rede, e registar qual modelo respondeu.',
      chooseRival:
        'quer um assistente polido, os modelos da OpenAI cobrem quase tudo o que faz, e as ferramentas de voz e imagem integradas contam para si.',
      chooseClaw:
        'bate com frequência no limite de um só fornecedor, quer um segundo modelo a verificar o primeiro, ou parte do trabalho tem de ficar no seu próprio hardware.',
      cells: {
        [ComparisonDimension.MODEL_CHOICE]: 'Apenas modelos OpenAI',
        [ComparisonDimension.ROUTING]: 'Seleção automática dentro da gama da OpenAI',
        [ComparisonDimension.SIDE_BY_SIDE]: 'Uma resposta de cada vez',
        [ComparisonDimension.LOCAL_MODELS]: 'Apenas nuvem',
        [ComparisonDimension.SELF_HOSTING]: 'Não oferecido',
        [ComparisonDimension.MEMORY_AND_FILES]: 'Memória, projetos e envio de ficheiros',
        [ComparisonDimension.CONNECTORS]: 'Apps e conectores nos planos pagos',
        [ComparisonDimension.RECEIPTS]: 'Uso ao nível do plano, não custo por resposta',
      },
      faq: [
        {
          question: 'O ClawAI pode usar os mesmos modelos OpenAI que o ChatGPT?',
          answer:
            'O ClawAI encaminha para os modelos da OpenAI como uma das nove famílias do seu catálogo. Não há conta OpenAI para criar nem chave de API para colar: o acesso aos modelos vem com a assinatura.',
        },
        {
          question: 'O ClawAI é um cliente do ChatGPT?',
          answer:
            'Não. O ClawAI é uma plataforma independente com as suas próprias camadas de roteamento, memória, comparação e orquestração. A OpenAI é um dos fornecedores a quem pode enviar uma mensagem, não o produto por baixo.',
        },
        {
          question: 'Posso usar o ClawAI sem enviar nada para a OpenAI?',
          answer:
            'Sim. Fixe a conversa num modelo local de pesos abertos, ou instale toda a pilha nos seus servidores e corra apenas modelos nas suas GPUs, sem qualquer chamada externa.',
        },
      ],
    },
    [ComparisonRival.CLAUDE]: {
      name: 'Claude',
      vendor: 'Anthropic',
      eyebrow: 'ClawAI vs Claude',
      intro:
        'O Claude é aquilo a que muitos recorrem quando o trabalho é longo, cuidadoso e escrito. O ClawAI também alcança os modelos da Anthropic — ao lado de outras oito famílias — e deixa um segundo modelo verificar o que o primeiro disse.',
      theirStrength:
        'Raciocínio cuidadoso sobre documentos longos, o cumprimento de instruções mais fiável do setor e boa revisão de código. Projetos, artefactos e conectores MCP fazem dele um sítio realmente bom para trabalho escrito prolongado.',
      ourDifference:
        'O ClawAI trata a Anthropic como uma opção forte, não como a única. O mesmo tópico pode enviar um pedido ao Claude e a outros quatro modelos ao mesmo tempo, pôr um modelo a julgar a resposta de outro, e comutar automaticamente quando um fornecedor cai.',
      chooseRival:
        'quase todo o seu trabalho é raciocínio longo ou revisão de código e um modelo excelente chega.',
      chooseClaw:
        'quer a resposta do Claude e uma segunda opinião, precisa de um modelo local para trabalho sensível, ou prefere não manter uma assinatura por fornecedor.',
      cells: {
        [ComparisonDimension.MODEL_CHOICE]: 'Apenas modelos Anthropic',
        [ComparisonDimension.ROUTING]: 'É você que escolhe o modelo',
        [ComparisonDimension.SIDE_BY_SIDE]: 'Uma resposta de cada vez',
        [ComparisonDimension.LOCAL_MODELS]: 'Apenas nuvem',
        [ComparisonDimension.SELF_HOSTING]: 'Não oferecido',
        [ComparisonDimension.MEMORY_AND_FILES]: 'Projetos, ficheiros e memória',
        [ComparisonDimension.CONNECTORS]: 'Conectores MCP e extensões de ambiente de trabalho',
        [ComparisonDimension.RECEIPTS]: 'Uso ao nível do plano, não custo por resposta',
      },
      faq: [
        {
          question: 'O ClawAI inclui modelos Claude?',
          answer:
            'Sim. A Anthropic é uma das nove famílias de modelos do catálogo, acessível a partir de qualquer conversa sem conta nem chave Anthropic separadas.',
        },
        {
          question: 'Um modelo pode verificar a resposta de outro?',
          answer:
            'Sim. O Verify, o Judge e o Critic põem um segundo modelo sobre a saída do primeiro. Isso reduz o risco de uma resposta errada e confiante sem o eliminar: tudo o que for consequente continua a precisar de leitura humana.',
        },
        {
          question: 'O ClawAI é afiliado da Anthropic?',
          answer:
            'Não. O ClawAI é independente. Encaminha para os modelos da Anthropic como encaminha para outros oito fornecedores, e não é endossado nem parceiro de nenhum deles.',
        },
      ],
    },
    [ComparisonRival.GEMINI]: {
      name: 'Gemini',
      vendor: 'Google',
      eyebrow: 'ClawAI vs Gemini',
      intro:
        'O Gemini é o assistente mais próximo dos documentos que já tem, desde que esses documentos vivam no Google Workspace. O ClawAI chega pelo lado oposto: neutro perante fornecedores, com os modelos da Google como uma de nove famílias.',
      theirStrength:
        'Janelas de contexto muito grandes, tratamento nativo de imagens, áudio e vídeo, respostas rápidas e uma integração com o Gmail, o Drive e o Docs que nenhum terceiro consegue igualar.',
      ourDifference:
        'O ClawAI não está preso a uma suite de escritório nem ao roteiro de um fornecedor. Liga-se a doze ferramentas de trabalho em vez de uma, encaminha cada mensagem conforme a tarefa, e pode manter trabalho sensível num modelo local de pesos abertos.',
      chooseRival:
        'a sua organização vive no Google Workspace e quer o assistente diretamente lá dentro.',
      chooseClaw:
        'usa ferramentas de vários fornecedores, quer comparar modelos antes de se comprometer, ou precisa de uma instalação sem qualquer chamada externa.',
      cells: {
        [ComparisonDimension.MODEL_CHOICE]: 'Apenas modelos Google',
        [ComparisonDimension.ROUTING]: 'Seleção automática dentro da gama da Google',
        [ComparisonDimension.SIDE_BY_SIDE]: 'Uma resposta de cada vez',
        [ComparisonDimension.LOCAL_MODELS]: 'Apenas alojado pela Google',
        [ComparisonDimension.SELF_HOSTING]: 'Não oferecido',
        [ComparisonDimension.MEMORY_AND_FILES]: 'Ficheiros, Drive e contexto do Workspace',
        [ComparisonDimension.CONNECTORS]: 'Integração profunda com o Google Workspace',
        [ComparisonDimension.RECEIPTS]: 'Uso ao nível do plano, não custo por resposta',
      },
      faq: [
        {
          question: 'O ClawAI pode usar modelos Gemini?',
          answer:
            'Sim. A Google é uma das nove famílias de modelos do catálogo, disponível em qualquer conversa sob a mesma assinatura.',
        },
        {
          question: 'O ClawAI liga-se ao Google Workspace?',
          answer:
            'O ClawAI traz doze conectores para gestores de tarefas, chat e documentos. A sua integração com a Google é um conector, não uma superfície própria: mais larga entre fornecedores, menos profunda dentro da Google.',
        },
        {
          question: 'Qual é melhor para documentos muito longos?',
          answer:
            'Ambos lidam bem com eles, e as maiores janelas de contexto da Google estão entre as maiores disponíveis. A diferença do ClawAI é poder enviar o mesmo documento a dois modelos e comparar as conclusões.',
        },
      ],
    },
    [ComparisonRival.PERPLEXITY]: {
      name: 'Perplexity',
      vendor: 'Perplexity AI',
      eyebrow: 'ClawAI vs Perplexity',
      intro:
        'O Perplexity é construído à volta de uma só tarefa: responder a uma pergunta a partir da web em tempo real, com fontes. O ClawAI é construído à volta de outra: pôr o modelo certo no trabalho que tem em mãos, pesquisa incluída.',
      theirStrength:
        'O produto mais bem talhado para perguntas de tipo pesquisa. As respostas chegam com citações, as perguntas seguintes mantêm o fio coerente, e toda a interface foi pensada para verificar de onde vem uma afirmação.',
      ourDifference:
        'O ClawAI é um espaço de trabalho, não um motor de respostas. A pesquisa é um modo entre vários, ao lado da comparação de modelos, da memória persistente, do contexto de ficheiros, de um agente de código e dos modelos locais — e cada resposta regista o modelo que a produziu.',
      chooseRival: 'a maioria das suas perguntas é «o que é verdade agora, e quem o diz».',
      chooseClaw:
        'a pesquisa é apenas parte do trabalho e também precisa de código, escrita longa, comparação de modelos, ou um modelo a correr no seu próprio hardware.',
      cells: {
        [ComparisonDimension.MODEL_CHOICE]: 'Modelos de vários fornecedores nos planos superiores',
        [ComparisonDimension.ROUTING]: 'Escolhido pela qualidade de pesquisa e resposta',
        [ComparisonDimension.SIDE_BY_SIDE]: 'Uma resposta de cada vez',
        [ComparisonDimension.LOCAL_MODELS]: 'Apenas nuvem',
        [ComparisonDimension.SELF_HOSTING]: 'Não oferecido',
        [ComparisonDimension.MEMORY_AND_FILES]: 'Espaços, tópicos e envio de ficheiros',
        [ComparisonDimension.CONNECTORS]: 'Conectores nos planos empresariais',
        [ComparisonDimension.RECEIPTS]: 'Uso ao nível do plano, não custo por resposta',
      },
      faq: [
        {
          question: 'O ClawAI pesquisa na web?',
          answer:
            'Sim. A pesquisa executa uma busca web em vários passos e devolve uma resposta com as suas fontes. É uma capacidade dentro do espaço de trabalho, não o produto inteiro.',
        },
        {
          question: 'Qual cita melhor?',
          answer:
            'O Perplexity foi feito de propósito para respostas citadas e mostra fontes para praticamente cada afirmação. O ClawAI cita as suas pesquisas; para uma pergunta de puro «encontrar e citar», um motor de respostas dedicado é a ferramenta mais afiada.',
        },
        {
          question: 'Posso usar os dois?',
          answer:
            'Muita gente usa. A comparação que interessa é se quer um motor de respostas especializado, um espaço de trabalho multimodelo geral, ou ambos.',
        },
      ],
    },
    [ComparisonRival.COPILOT]: {
      name: 'Microsoft Copilot',
      vendor: 'Microsoft',
      eyebrow: 'ClawAI vs Microsoft Copilot',
      intro:
        'O Copilot é o Microsoft 365 com um assistente entrelaçado. O ClawAI é um espaço de trabalho autónomo que alcança nove famílias de modelos e pode correr inteiramente nos seus próprios servidores.',
      theirStrength:
        'Nada está tão perto dos dados Microsoft que uma organização já tem. O contexto do Word, do Excel, do Outlook e do Teams chega sem configuração, e licenciamento, isolamento e conformidade seguem o contrato Microsoft 365 que a TI já tem.',
      ourDifference:
        'O ClawAI é neutro perante fornecedores e instalável em qualquer lado. Encaminha por nove famílias de modelos em vez da seleção de um só fornecedor, mostra quanto custou cada resposta, e pode ser instalado dentro da sua rede com modelos de pesos abertos e sem chamadas externas.',
      chooseRival:
        'a sua organização assenta no Microsoft 365 e o valor está no assistente viver dentro dos documentos que já lá estão.',
      chooseClaw:
        'quer escolher o fornecedor, ver o custo por resposta, ou uma instalação que nunca sai da sua infraestrutura.',
      cells: {
        [ComparisonDimension.MODEL_CHOICE]: 'Modelos OpenAI mais os da própria Microsoft',
        [ComparisonDimension.ROUTING]: 'Escolhido pela Microsoft consoante a superfície',
        [ComparisonDimension.SIDE_BY_SIDE]: 'Uma resposta de cada vez',
        [ComparisonDimension.LOCAL_MODELS]: 'Apenas nuvem',
        [ComparisonDimension.SELF_HOSTING]: 'Não oferecido',
        [ComparisonDimension.MEMORY_AND_FILES]:
          'Ficheiros do Microsoft 365 e contexto da organização',
        [ComparisonDimension.CONNECTORS]: 'A integração mais profunda com o Microsoft 365',
        [ComparisonDimension.RECEIPTS]: 'Licença por posto, não custo por resposta',
      },
      faq: [
        {
          question: 'O ClawAI pode ser instalado dentro da nossa rede?',
          answer:
            'Sim. Toda a pilha corre nos seus servidores, com modelos de pesos abertos nas suas GPUs e sem chamadas a fornecedores externos. É um projeto delimitado, não um plano que se compra online.',
        },
        {
          question: 'O ClawAI integra-se com o Microsoft 365?',
          answer:
            'O ClawAI traz doze conectores para gestores de tarefas, chat e documentos — mais largo entre fornecedores do que o Copilot, e menos profundo dentro das aplicações da Microsoft.',
        },
        {
          question: 'Como é faturado o uso?',
          answer:
            'Por tokens normalizados por custo contra um saldo diário e mensal, não por posto. Cada resposta mostra o modelo, o custo e o saldo consumido.',
        },
      ],
    },
    [ComparisonRival.KIMI]: {
      name: 'Kimi',
      vendor: 'Moonshot AI',
      eyebrow: 'ClawAI vs Kimi',
      intro:
        'O Kimi ganhou reputação com contexto muito longo e, mais recentemente, com a publicação de pesos abertos que qualquer pessoa pode descarregar e correr. O ClawAI tem outra forma: uma assinatura que alcança modelos de pesos abertos desta classe ao lado de outras oito famílias e envia cada mensagem para a que melhor serve.',
      theirStrength:
        'Leitura de contexto longo a um preço abaixo da maioria dos modelos de ponta ocidentais, bom comportamento agêntico e de uso de ferramentas, e pesos abertos na linha principal — o mesmo modelo pode ser avaliado no produto alojado e depois corrido no seu próprio hardware.',
      ourDifference:
        'O ClawAI não lhe pede que escolha um laboratório. Um modelo de pesos abertos pode responder às perguntas em que o custo ou a residência dos dados contam, um modelo de ponta pode ficar com as que precisam disso, e a decisão de roteamento fica registada em cada resposta em vez de ser um hábito que tem de recordar.',
      chooseRival:
        'o seu trabalho é dominado por documentos muito longos, está confortável com um só fornecedor, e o preço por token é o número que decide.',
      chooseClaw:
        'quer a economia dos pesos abertos nalgumas mensagens e a qualidade de ponta noutras, sem manter duas assinaturas e decidir à mão de cada vez.',
      cells: {
        [ComparisonDimension.MODEL_CHOICE]: 'Apenas modelos Moonshot',
        [ComparisonDimension.ROUTING]: 'Seleção dentro da gama da Moonshot',
        [ComparisonDimension.SIDE_BY_SIDE]: 'Uma resposta de cada vez',
        [ComparisonDimension.LOCAL_MODELS]: 'Pesos abertos publicados, o alojamento é consigo',
        [ComparisonDimension.SELF_HOSTING]: 'Os pesos sim, o produto não',
        [ComparisonDimension.MEMORY_AND_FILES]: 'Leitura de ficheiros em contexto longo',
        [ComparisonDimension.CONNECTORS]: 'Limitados fora das suas próprias apps',
        [ComparisonDimension.RECEIPTS]: 'Uso ao nível da API, não custo por resposta',
      },
      faq: [
        {
          question: 'O ClawAI pode usar modelos Kimi?',
          answer:
            'O ClawAI alcança modelos de pesos abertos desta classe através do seu próprio catálogo, e pode corrê-los localmente nas suas GPUs. Não há conta separada para criar nem chave de API para colar.',
        },
        {
          question: 'Correr pesos abertos por minha conta é mais barato do que uma assinatura?',
          answer:
            'Com volume sustentado pode ser, depois de ter as GPUs e o tempo de operação. O ClawAI aponta ao caso intermédio: a economia dos pesos abertos para as mensagens que a servem, modelos de ponta para as que não, numa só fatura.',
        },
        {
          question: 'Os meus dados saem da rede se usar um modelo local?',
          answer:
            'Não. Fixe a conversa num modelo local de pesos abertos e nada é enviado para um fornecedor externo. Instalar toda a pilha nos seus servidores elimina por completo as chamadas externas.',
        },
      ],
    },
    [ComparisonRival.QWEN]: {
      name: 'Qwen',
      vendor: 'Alibaba',
      eyebrow: 'ClawAI vs Qwen',
      intro:
        'O Qwen é uma das famílias de pesos abertos mais completas que existem: uma escada larga de tamanhos, boa cobertura multilingue e licenciamento permissivo em quase toda a gama. O ClawAI põe modelos dessa classe ao lado de outras oito famílias numa só assinatura.',
      theirStrength:
        'Amplitude. Tamanhos que vão dos que correm num portátil aos que precisam de um servidor, variantes de visão e de código, desempenho realmente bom fora do inglês, e licenciamento que torna simples o self-hosting comercial.',
      ourDifference:
        'O ClawAI é a camada acima do modelo, não o modelo em si. Encaminha por mensagem, pode fazer a mesma pergunta a várias famílias e mostrar as respostas lado a lado, mantém memória e ficheiros em todas elas, e cobra o conjunto como um só saldo.',
      chooseRival:
        'está a construir em cima de um modelo, quer ser dono da instalação, e tem capacidade operacional para o correr e atualizar por si.',
      chooseClaw:
        'quer usar modelos em vez de os operar, e quer a opção de alcançar um modelo de ponta quando um de pesos abertos não chega.',
      cells: {
        [ComparisonDimension.MODEL_CHOICE]: 'Apenas a família Qwen',
        [ComparisonDimension.ROUTING]: 'É você que escolhe o tamanho e a variante',
        [ComparisonDimension.SIDE_BY_SIDE]: 'Não faz parte do modelo',
        [ComparisonDimension.LOCAL_MODELS]: 'Pesos abertos em toda a gama',
        [ComparisonDimension.SELF_HOSTING]: 'Os pesos sim, o produto não',
        [ComparisonDimension.MEMORY_AND_FILES]: 'O que construir à volta dele',
        [ComparisonDimension.CONNECTORS]: 'O que construir à volta dele',
        [ComparisonDimension.RECEIPTS]: 'A sua própria instrumentação',
      },
      faq: [
        {
          question: 'Posso correr um modelo de pesos abertos dentro do ClawAI?',
          answer:
            'Sim. O ClawAI corre modelos de pesos abertos localmente através do seu próprio runtime, e uma conversa pode ser fixada num deles para que nada saia da sua rede.',
        },
        {
          question: 'Porquê usar o ClawAI em vez de alojar um modelo diretamente?',
          answer:
            'Porque o modelo é a parte fácil. Roteamento, comparação, memória, tratamento de ficheiros, conectores, quotas e contabilidade de custo por resposta são as partes que teria de construir, e são aquilo que o ClawAI é.',
        },
        {
          question: 'O ClawAI suporta outras línguas além do inglês?',
          answer:
            'A interface do produto vem em treze línguas, e a escolha do modelo é por mensagem: um modelo multilingue pode ficar com as mensagens que precisem dele.',
        },
      ],
    },
    [ComparisonRival.GLM]: {
      name: 'GLM',
      vendor: 'Zhipu AI',
      eyebrow: 'ClawAI vs GLM',
      intro:
        'O GLM é a linha de ponta da Zhipu, conhecida por bom desempenho em código e em trabalho agêntico por uma fração do preço dos maiores modelos ocidentais, com pesos abertos em boa parte da gama. O ClawAI trata modelos dessa classe como uma opção entre nove.',
      theirStrength:
        'Preço face à capacidade. Resultados em código e uso de ferramentas próximos de modelos muito mais caros, uma cadência de lançamentos agressiva, e pesos abertos que fazem do self-hosting uma opção real e não um comunicado de imprensa.',
      ourDifference:
        'O ClawAI não o obriga a apostar que um laboratório mantém a dianteira. O roteamento é por mensagem e o catálogo muda por baixo de si, por isso pôr um modelo mais barato a levar mais trabalho é uma alteração de configuração, não uma migração.',
      chooseRival:
        'o custo por resposta capaz é o número que decide, o seu trabalho é sobretudo código, e está disposto a seguir de perto o ciclo de lançamentos de um laboratório.',
      chooseClaw:
        'quer essa economia disponível sem se comprometer com ela para tudo, e quer um registo de qual modelo respondeu de facto.',
      cells: {
        [ComparisonDimension.MODEL_CHOICE]: 'Apenas modelos Zhipu',
        [ComparisonDimension.ROUTING]: 'Seleção dentro da gama da Zhipu',
        [ComparisonDimension.SIDE_BY_SIDE]: 'Uma resposta de cada vez',
        [ComparisonDimension.LOCAL_MODELS]: 'Pesos abertos em boa parte da gama',
        [ComparisonDimension.SELF_HOSTING]: 'Os pesos sim, o produto não',
        [ComparisonDimension.MEMORY_AND_FILES]: 'Envio de ficheiros na sua própria app',
        [ComparisonDimension.CONNECTORS]: 'Limitados fora das suas próprias apps',
        [ComparisonDimension.RECEIPTS]: 'Uso ao nível da API, não custo por resposta',
      },
      faq: [
        {
          question: 'O ClawAI é mais barato do que usar um modelo de baixo custo diretamente?',
          answer:
            'Por token, não: uma chamada direta à API do modelo capaz mais barato é sempre o mínimo. O ClawAI é mais barato do que a alternativa realista: várias assinaturas, ou construir por si o roteamento, a memória e a contabilidade de custos.',
        },
        {
          question: 'Posso fazer o ClawAI preferir modelos de menor custo?',
          answer:
            'Sim. Os modos de roteamento vão do totalmente automático até fixar um modelo específico, e os modos atentos ao custo pesam o preço face à capacidade em cada mensagem.',
        },
        {
          question: 'Como sei qual modelo respondeu?',
          answer:
            'Cada resposta traz o fornecedor, o modelo, o modo de roteamento e o custo consumido, e a própria decisão de roteamento pode ser inspecionada.',
        },
      ],
    },
    [ComparisonRival.DEEPSEEK]: {
      name: 'DeepSeek',
      vendor: 'DeepSeek',
      eyebrow: 'ClawAI vs DeepSeek',
      intro:
        'A DeepSeek mudou a expectativa de preço dos modelos de raciocínio e publicou pesos abertos para a sua linha principal. O ClawAI é a camada que deixa um modelo desses ficar com o trabalho em que é bom sem passar a ser o único modelo que tem.',
      theirStrength:
        'Raciocínio e matemática a um preço que abalou o mercado, pesos abertos na linha principal, e uma postura de investigação que publica em vez de insinuar: pode ler como os modelos foram treinados.',
      ourDifference:
        'O ClawAI mantém a escolha aberta em cada mensagem. Uma pergunta pesada em raciocínio pode ir para um modelo de raciocínio, uma de rotina para algo barato e rápido, e uma sensível para um modelo no seu próprio hardware, com a decisão registada em vez de presumida.',
      chooseRival:
        'a sua carga de trabalho é dominada por raciocínio difícil, quer o preço mais baixo para isso, e um só fornecedor é aceitável.',
      chooseClaw:
        'o raciocínio é parte do seu trabalho e não a totalidade, e quer um segundo modelo disponível para verificar o primeiro.',
      cells: {
        [ComparisonDimension.MODEL_CHOICE]: 'Apenas modelos DeepSeek',
        [ComparisonDimension.ROUTING]: 'É você que escolhe entre chat e raciocínio',
        [ComparisonDimension.SIDE_BY_SIDE]: 'Uma resposta de cada vez',
        [ComparisonDimension.LOCAL_MODELS]: 'Pesos abertos na linha principal',
        [ComparisonDimension.SELF_HOSTING]: 'Os pesos sim, o produto não',
        [ComparisonDimension.MEMORY_AND_FILES]: 'Envio de ficheiros na sua própria app',
        [ComparisonDimension.CONNECTORS]: 'Limitados fora das suas próprias apps',
        [ComparisonDimension.RECEIPTS]: 'Uso ao nível da API, não custo por resposta',
      },
      faq: [
        {
          question: 'O ClawAI pode encaminhar apenas para modelos de raciocínio?',
          answer:
            'Sim. Uma conversa pode ser fixada num modelo específico, e o modo automático já envia as mensagens pesadas em raciocínio para modelos adequados a elas.',
        },
        {
          question: 'Onde são processados os meus dados?',
          answer:
            'No fornecedor que respondeu, e a resposta diz qual. Se isso importar para algum trabalho, fixe-o num modelo local de pesos abertos, ou instale a pilha nos seus servidores para que nada saia da sua rede.',
        },
        {
          question: 'Posso comparar dois modelos na mesma pergunta?',
          answer:
            'Sim. O modo de comparação envia um mesmo pedido para vários modelos ao mesmo tempo e mostra as respostas lado a lado, com uma passagem opcional de júri para as pontuar.',
        },
      ],
    },
  },
};
