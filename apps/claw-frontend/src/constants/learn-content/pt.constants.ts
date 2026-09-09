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
      [LearnTopic.HOW_LANGUAGE_MODELS_GENERATE_ANSWERS]:
        'Como um prompt vira tokens, probabilidades e uma resposta gerada.',
      [LearnTopic.WHAT_ARE_AI_TOKENS]:
        'A unidade que um modelo realmente lê e escreve, e por que uma contagem exata precisa do tokenizador dele.',
      [LearnTopic.TEMPERATURE_TOP_P_AND_RANDOMNESS]:
        'O que temperature e top-p realmente mudam numa resposta, e o que eles não conseguem mudar.',
      [LearnTopic.WHAT_ARE_EMBEDDINGS]:
        'Como o texto vira um vetor de números, e por que isso torna possível buscar por significado.',
      [LearnTopic.PROMPTING_VS_RAG_VS_FINE_TUNING]:
        'Três soluções diferentes para três problemas diferentes, e por que muitos produtos nunca precisam da terceira.',
      [LearnTopic.HOW_AI_TOOL_CALLING_WORKS]:
        'O modelo nunca executa nada — ele propõe uma chamada, e sua aplicação decide o que acontece depois.',
      [LearnTopic.WHAT_ARE_STRUCTURED_AI_OUTPUTS]:
        'Pedir JSON a um modelo é uma solicitação; só alguns mecanismos garantem de verdade que ele bate com seu esquema.',
      [LearnTopic.WHY_AI_HALLUCINATES]:
        'Por que um modelo afirma uma resposta errada com a mesma confiança de uma certa — e o que realmente reduz isso.',
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
      [LearnTopic.HOW_TO_EVALUATE_AI_MODELS]:
        'O que realmente testar antes de confiar seu trabalho a um modelo — não um número de ranking.',
      [LearnTopic.HOW_TO_READ_AI_BENCHMARKS]:
        'O que um número de benchmark realmente mede, e as formas como pode te enganar antes mesmo de você começar a testar.',
      [LearnTopic.WHAT_IS_PROMPT_INJECTION]:
        'Um texto que não é seu ainda assim pode dar instruções ao modelo — o que isso significa e por que um modelo mais inteligente não resolve isso por completo.',
    },
  },
  topics: {
    [LearnTopic.HOW_LANGUAGE_MODELS_GENERATE_ANSWERS]: {
      seo: {
        title: 'Como os modelos de linguagem geram respostas?',
        description:
          'Entenda tokenização, previsão do próximo token, contexto e amostragem, além dos motivos pelos quais uma resposta fluente ainda pode estar errada.',
        keywords: [
          'como funcionam modelos de linguagem',
          'previsão do próximo token',
          'geração de respostas LLM',
        ],
      },
      eyebrow: 'Fundamentos',
      title: 'Como os modelos de linguagem geram respostas',
      summary:
        'Um modelo de linguagem gera a resposta um token por vez. Ele transforma o prompt em tokens, usa o contexto ativo para atribuir probabilidades aos próximos tokens possíveis, escolhe um, acrescenta-o e repete. O resultado pode parecer planejado, mas nasce de padrões estatísticos aprendidos, não da recuperação de uma resposta pronta.',
      sections: [
        {
          id: 'tokenization',
          heading: 'O texto entra como tokens',
          paragraphs: [
            'Antes da geração, um tokenizador divide instruções, conversa, resultados de ferramentas e outros elementos do contexto. Um token pode ser uma palavra, parte dela ou pontuação. O modelo processa identificadores em vez das frases visíveis; por isso, ortografia, formatação e idioma alteram quanto da janela de contexto é consumido.',
          ],
        },
        {
          id: 'next-token-prediction',
          heading: 'O modelo prevê um token de cada vez',
          paragraphs: [
            'Para a sequência existente, a rede atribui uma probabilidade a cada próximo token possível do vocabulário. Uma regra de decodificação escolhe um, adiciona-o e calcula novamente. O ciclo termina em um token de parada ou limite configurado; em geral, o modelo não busca uma resposta completa armazenada antecipadamente.',
          ],
        },
        {
          id: 'context-and-probability',
          heading: 'O contexto molda as probabilidades',
          paragraphs: [
            'Instruções do sistema, pedido do usuário, mensagens anteriores e documentos fornecidos deslocam as probabilidades enquanto couberem no contexto ativo. Escolher o token mais provável tende a ser mais repetível; amostrar entre opções plausíveis produz variação. Temperatura e controles parecidos mudam a seleção, mas não acrescentam fatos.',
          ],
        },
        {
          id: 'not-database-retrieval',
          heading: 'Gerar não é consultar um banco de dados',
          paragraphs: [
            'O treinamento distribui padrões de texto por muitos pesos numéricos. Esses pesos não são um catálogo de trechos com endereços confiáveis. Sem recuperação documental ou ferramenta separada, o modelo não abre um registro fonte para provar uma afirmação. Assim, texto convincente pode combinar padrões familiares em uma informação sem apoio factual.',
          ],
        },
        {
          id: 'practical-limitations',
          heading: 'Limites práticos a considerar',
          paragraphs: [
            'Modelos podem inventar detalhes, interpretar mal pedidos ambíguos, perder informações fora do contexto, repetir vieses do treinamento e errar cálculos ou raciocínios longos. Trate saídas importantes como rascunhos: forneça contexto, use busca ou ferramentas para fatos atuais e verifique alegações relevantes com uma fonte ou teste independente.',
          ],
        },
      ],
      faq: [
        {
          question: 'Um modelo de linguagem entende a própria resposta?',
          answer:
            'Ele pode representar relações complexas e produzir texto semelhante a raciocínio, mas chamar isso de compreensão humana acrescenta uma hipótese que o mecanismo não comprova. Na prática, prevê tokens a partir dos parâmetros e do contexto.',
        },
        {
          question: 'Por que o mesmo prompt pode gerar respostas diferentes?',
          answer:
            'Ao amostrar vários próximos tokens plausíveis, uma escolha diferente no início muda todas as probabilidades seguintes. Configurações determinísticas reduzem a variação, mas não garantem que a resposta repetida esteja correta.',
        },
        {
          question: 'O modelo consegue citar suas fontes?',
          answer:
            'Somente quando as fontes são fornecidas pelo contexto, por recuperação ou por uma ferramenta e o sistema preserva essa ligação. Uma citação produzida apenas pelos pesos pode ser inventada e precisa ser conferida.',
        },
      ],
      productNote:
        'O ClawAI encaminha prompts a modelos configurados na nuvem ou locais e pode executar fluxos de comparação e verificação; o modelo escolhido ainda gera tokens probabilisticamente, então o roteamento sozinho não garante a verdade.',
    },
    [LearnTopic.WHAT_ARE_AI_TOKENS]: {
      seo: {
        title: 'O que são tokens de IA?',
        description:
          'Tokens são as unidades que um modelo de linguagem realmente lê e escreve, não palavras nem caracteres. Como funciona a tokenização, como entrada e saída são contadas, e por que só o tokenizador do próprio modelo dá um número exato.',
        keywords: ['o que é um token de IA', 'tokenização de LLM', 'tokens de entrada e saída'],
      },
      eyebrow: 'Fundamentos',
      title: 'O que são tokens de IA?',
      summary:
        'Um token é a unidade que um modelo de linguagem realmente lê e escreve: um fragmento de texto obtido ao dividir sua entrada com o tokenizador do próprio modelo. Não é uma palavra nem um caractere, e quantos tokens um texto produz depende do idioma em que está escrito, de como está formatado e de qual tokenizador está contando.',
      sections: [
        {
          id: 'tokens-vs-words-and-characters',
          heading: 'Um token não é uma palavra, nem um caractere',
          paragraphs: [
            'Um tokenizador divide o texto em pedaços tirados de um vocabulário fixo aprendido durante o treinamento. Uma palavra curta e comum costuma ser exatamente um token; uma palavra mais longa ou rara pode se dividir em dois ou três; um único símbolo incomum pode sozinho ocupar mais de um token. Pontuação, espaços e quebras de linha também são tokens, e não saem de graça.',
            'É por isso que a contagem de tokens, de palavras e de caracteres andam de forma independente. Duas frases com o mesmo número de palavras podem usar um número diferente de tokens, e reescrever uma frase com palavras mais curtas e comuns pode reduzir sua contagem de tokens sem encurtá-la como texto.',
          ],
        },
        {
          id: 'tokenization-differs-by-language-and-model',
          heading: 'A tokenização muda conforme o idioma e o modelo',
          paragraphs: [
            'Cada modelo vem com seu próprio tokenizador e seu próprio vocabulário fixo, construído a partir do texto com que foi treinado. Expressões frequentes nesse texto de treinamento tendem a se comprimir em tokens menos numerosos e mais longos; expressões raras tendem a se dividir em pedaços mais numerosos e curtos.',
            'Daí seguem duas consequências diretas. Primeiro, a mesma frase pode custar um número de tokens sensivelmente diferente conforme o idioma em que está escrita, porque nenhum vocabulário representa dois idiomas do mesmo jeito. Segundo, a mesma frase pode custar um número diferente de tokens em dois modelos distintos, porque cada um tem seu próprio vocabulário — uma contagem do tokenizador de um modelo não é uma estimativa confiável para outro.',
          ],
        },
        {
          id: 'input-and-output-tokens',
          heading: 'Uma requisição gasta tokens de entrada e tokens de saída',
          paragraphs: [
            'Cada requisição tem dois grupos de tokens, contados e normalmente cobrados separadamente. Tokens de entrada são tudo o que é enviado ao modelo: instruções, a conversa visível, documentos anexados e resultados de ferramentas. Tokens de saída são tudo o que o modelo gera de volta.',
            'Tokens de entrada não são um custo único numa conversa de vários turnos. Como cada nova requisição reenvia a conversa até ali, mensagens anteriores e qualquer material anexado voltam a ser contados como entrada a cada turno, não só no turno em que foram adicionados pela primeira vez.',
          ],
        },
        {
          id: 'tokens-and-the-context-window',
          heading: 'Tokens são a unidade em que se mede uma janela de contexto',
          paragraphs: [
            'Uma janela de contexto é um orçamento expresso em tokens, compartilhado pela entrada e pela saída de uma única requisição. "O que é uma janela de contexto?" explica como esse orçamento se comporta na prática; o que importa aqui é só a unidade — a janela não é medida em palavras, caracteres ou mensagens, é medida em tokens, e entrada e saída consomem do mesmo total.',
          ],
        },
        {
          id: 'estimating-cost-without-a-price-table',
          heading: 'Estimando o custo sem um número fixo',
          paragraphs: [
            'O custo baseado em tokens é uma multiplicação: tokens usados vezes uma tarifa definida por modelo. Provedores definem e mudam essas tarifas conforme seu próprio calendário, e um modelo mais capaz costuma custar mais por token do que um menor, com tokens de saída geralmente tarifados mais caro que os de entrada. Nada disso torna válido publicar aqui um número específico — uma tarifa impressa nesta página estaria errada em poucos meses.',
            'O que continua verdadeiro seja qual for a tabela de preços vigente é o formato do custo: prompts mais curtos e focados e respostas mais curtas e focadas usam menos tokens, e reenviar anexos grandes a cada turno de uma conversa longa é uma das formas mais comuns de o uso de tokens crescer sem que ninguém tenha decidido isso.',
          ],
        },
        {
          id: 'exact-counts-need-the-tokenizer',
          heading: 'Um número exato precisa do tokenizador do próprio modelo',
          paragraphs: [
            'Uma regra prática sobre tokens por palavra é uma aproximação válida para um idioma processado por um tokenizador, e não se transfere para outro idioma, outra escrita ou outro modelo. A formatação também muda o número: código, JSON e texto muito pontuado tendem a tokenizar de forma menos eficiente do que a mesma informação escrita como prosa simples.',
            'Se um número exato importa — porque uma requisição está perto de um limite de contexto, ou porque o custo precisa ser previsto com precisão — o único método confiável é passar o texto real pelo tokenizador do modelo específico, ou por um endpoint de contagem, antes de enviá-lo. Uma estimativa baseada em palavras ou caracteres é um palpite disfarçado de número.',
          ],
        },
      ],
      faq: [
        {
          question: 'Um token é a mesma coisa que uma palavra?',
          answer:
            'Não. Uma palavra curta e comum costuma ser um token, mas uma palavra mais longa ou rara pode se dividir em vários, e pontuação, espaços e quebras de linha contam como tokens por conta própria. A contagem de tokens e a de palavras se correspondem só de forma aproximada.',
        },
        {
          question:
            'Por que a mesma frase usa um número diferente de tokens em ferramentas diferentes?',
          answer:
            'Cada ferramenta costuma reportar a contagem do tokenizador de um modelo específico, e cada modelo tem seu próprio vocabulário construído a partir do seu próprio texto de treinamento. Uma contagem exata para o tokenizador de um modelo é só uma estimativa para outro.',
        },
        {
          question: 'Formatação como código ou JSON usa mais tokens que texto simples?',
          answer:
            'Muitas vezes, sim. Indentação, pontuação e símbolos repetidos são eles mesmos tokens, então um formato muito estruturado pode usar bem mais tokens que a mesma informação escrita em frases simples.',
        },
        {
          question:
            'Como posso saber a contagem exata de tokens de uma requisição antes de enviá-la?',
          answer:
            'Passe o texto exato pelo tokenizador do modelo específico ou por um endpoint de contagem que ele ofereça. Qualquer estimativa baseada em número de palavras ou caracteres é aproximada, e o erro cresce com diferenças de idioma, escrita e formatação.',
        },
      ],
      productNote:
        'O ClawAI conta os tokens de entrada e saída que uma requisição realmente usou depois que a resposta é gerada, e mostra o custo e o saldo consumido por aquela resposta em vez de uma estimativa feita com antecedência.',
    },
    [LearnTopic.TEMPERATURE_TOP_P_AND_RANDOMNESS]: {
      seo: {
        title: 'O que temperature e top-p controlam?',
        description:
          'Temperature e top-p decidem como um modelo escolhe o próximo token, não o que ele sabe. O que cada ajuste realmente muda, por que mais baixo não é automaticamente melhor, e por que temperature zero ainda não é perfeitamente repetível.',
        keywords: [
          'temperature top-p explicado',
          'parâmetros de amostragem de LLM',
          'aleatoriedade na saída de IA',
        ],
      },
      eyebrow: 'Fundamentos',
      title: 'O que temperature e top-p controlam?',
      summary:
        'Temperature e top-p são ajustes de decodificação que mudam como um modelo escolhe seu próximo token a partir das probabilidades que já calculou. Eles controlam a aleatoriedade no vocabulário e na formulação, não a precisão, o conhecimento ou a capacidade de raciocínio — e nenhum dos dois garante uma saída exatamente repetível, mesmo no ajuste mais conservador.',
      sections: [
        {
          id: 'what-these-settings-actually-change',
          heading: 'Eles remodelam uma escolha, não o conhecimento do modelo',
          paragraphs: [
            'No momento em que temperature ou top-p entram em ação, o modelo já calculou uma probabilidade para cada possível próximo token dado o contexto atual. Nenhum dos dois ajustes muda de onde vêm essas probabilidades — os parâmetros aprendidos do modelo e o contexto fornecido. Eles só mudam como um token é escolhido a partir da distribuição que o modelo já produziu.',
          ],
        },
        {
          id: 'temperature-and-the-shape-of-the-distribution',
          heading: 'Temperature ajusta o quão acentuada ou achatada é essa distribuição',
          paragraphs: [
            'Uma temperature mais baixa torna os tokens de maior probabilidade ainda mais prováveis de serem escolhidos, então a saída se inclina para a única continuação mais provável e se repete mais entre execuções distintas. Uma temperature mais alta achata a distribuição, dando aos tokens de menor probabilidade uma chance mais realista de serem escolhidos, o que produz uma formulação mais variada — e mais espaço para que um token improvável, às vezes estranho, escape.',
            'Temperature não acrescenta informação que o modelo não tem. Ela não pode transformar um palpite errado em um certo; só muda o quão fortemente o modelo se compromete com o palpite que já favorece.',
          ],
        },
        {
          id: 'top-p-and-the-candidate-pool',
          heading: 'Top-p limita quais tokens sequer são considerados',
          paragraphs: [
            'Top-p, também chamado de nucleus sampling, funciona diferente de temperature: em vez de remodelar cada probabilidade, ele primeiro reduz o campo ao menor conjunto de tokens principais cujas probabilidades somam um limite escolhido, e então amostra só desse conjunto. Um top-p baixo mantém apenas o punhado de tokens de que o modelo está mais confiante; um top-p alto deixa entrar uma gama mais ampla de alternativas plausíveis. Temperature e top-p costumam ser aplicados juntos, um depois do outro, em vez de substitutos um do outro.',
          ],
        },
        {
          id: 'why-temperature-zero-is-not-perfectly-repeatable',
          heading: 'Temperature zero é próxima do determinístico, não exatamente determinística',
          paragraphs: [
            'Uma temperature de zero, ou um ajuste equivalente de "sempre escolher o token mais provável", remove a etapa de amostragem e deveria, em princípio, tornar a saída reprodutível para uma entrada idêntica. Na prática, a aritmética de ponto flutuante em GPUs não é estritamente independente da ordem, e a infraestrutura do provedor pode agrupar ou reordenar o cálculo entre requisições. O resultado é que o mesmo prompt enviado duas vezes no ajuste mais determinístico ainda pode ocasionalmente voltar diferente, especialmente quando dois tokens candidatos estavam quase empatados.',
          ],
        },
        {
          id: 'lower-is-not-the-same-as-better',
          heading: 'Um ajuste mais baixo não é automaticamente melhor',
          paragraphs: [
            'Reduzir a aleatoriedade torna a saída mais repetível, não mais correta. Uma continuação errada dita com confiança continua errada com confiança em temperature baixa, e ajustes muito baixos também podem produzir uma formulação visivelmente repetitiva ou engessada em saídas mais longas, porque o modelo continua reselecionando os mesmos tokens seguros e de alta probabilidade.',
          ],
        },
        {
          id: 'choosing-a-setting-for-the-task',
          heading: 'O ajuste certo depende de para que serve a saída',
          paragraphs: [
            'Tarefas com essencialmente uma resposta correta — extrair um valor, seguir um formato rígido, escrever código que precisa compilar — geralmente se beneficiam de menos aleatoriedade, porque consistência importa mais que variedade. Tarefas em que várias respostas diferentes poderiam ser boas — brainstorm, redigir formulações alternativas, escrita aberta — se beneficiam de mais aleatoriedade, porque ali a variedade é o objetivo. Nenhum dos ajustes substitui dar ao modelo um contexto melhor, nem substitui verificar uma resposta que realmente importa.',
          ],
        },
      ],
      faq: [
        {
          question: 'Temperature zero torna a saída determinística?',
          answer:
            'Quase, mas não é garantido. Ela remove a aleatoriedade intencional da amostragem, mas o cálculo em ponto flutuante e o agrupamento do lado do provedor ainda podem ocasionalmente produzir um token diferente num empate exato ou numa decisão muito apertada, então requisições idênticas costumam ser — não sempre — idênticas.',
        },
        {
          question: 'Qual a diferença entre temperature e top-p?',
          answer:
            'Temperature remodela a probabilidade de cada possível próximo token. Top-p primeiro reduz o campo ao menor conjunto de candidatos principais cujas probabilidades ultrapassam um limite, e então amostra só desse conjunto. Eles agem sobre a mesma distribuição de formas diferentes e costumam ser combinados.',
        },
        {
          question: 'Uma temperature mais alta torna um modelo mais criativo ou mais sabido?',
          answer:
            'Ela muda a variedade da formulação, não o conhecimento ou o raciocínio. Uma temperature mais alta pode produzir uma formulação mais variada, mas continua vindo dos mesmos parâmetros aprendidos, e pode com a mesma facilidade trazer à tona uma continuação menos provável e de qualidade pior.',
        },
        {
          question: 'Devo sempre usar o ajuste mais baixo para tarefas factuais?',
          answer:
            'Um ajuste mais baixo torna a saída mais consistente, o que ajuda quando a própria consistência é o objetivo, mas não corrige uma resposta errada de base — uma saída em temperature baixa pode estar errada com confiança e de forma repetível. Verificar uma alegação factual ainda exige uma fonte ou checagem independente.',
        },
      ],
      productNote:
        'O ClawAI oferece um controle de temperature por conversa, aplicado ao provedor que atende a requisição; ele não oferece top-p como ajuste, então o nucleus sampling permanece no padrão de cada provedor.',
    },
    [LearnTopic.WHAT_ARE_EMBEDDINGS]: {
      seo: {
        title: 'O que são embeddings?',
        description:
          'Um embedding transforma texto num vetor de números que representa seu significado, o que torna possível buscar por significado em vez de pela redação exata. Como a similaridade é medida, e por que embeddings de modelos diferentes não se misturam.',
        keywords: [
          'o que é um embedding',
          'embeddings vetoriais explicados',
          'busca semântica por significado',
        ],
      },
      eyebrow: 'Fundamentos',
      title: 'O que são embeddings?',
      summary:
        'Um embedding é uma lista de números, produzida por um modelo de embeddings, que representa o significado de um trecho de texto como uma posição num espaço de muitas dimensões. Texto com significado parecido acaba com vetores próximos entre si, e é exatamente essa propriedade que torna possível buscar ou comparar por significado em vez de pela redação exata.',
      sections: [
        {
          id: 'what-an-embedding-actually-is',
          heading: 'Uma lista de números no lugar do significado',
          paragraphs: [
            'Um modelo de embeddings lê um trecho de texto — uma palavra, uma frase, um parágrafo, às vezes um documento inteiro — e devolve um vetor de tamanho fixo: uma lista ordenada de números, tipicamente com centenas ou milhares de elementos. Esse vetor não é um resumo legível por uma pessoa; é uma posição num espaço matemático que o modelo aprendeu durante o treinamento, organizado para que textos com significado relacionado fiquem próximos entre si.',
          ],
        },
        {
          id: 'why-similar-meaning-lands-nearby',
          heading: 'O que fica perto é o significado parecido, não a grafia parecida',
          paragraphs: [
            'Duas frases que quase não compartilham palavras mas significam mais ou menos a mesma coisa podem gerar vetores próximos, porque o modelo de embeddings aprendeu associações entre conceitos durante o treinamento, não só quais letras aparecem. Ao contrário, duas frases que compartilham muitas palavras mas significam coisas diferentes podem acabar bem distantes. Essa é a diferença central entre busca baseada em embeddings e correspondência por palavras-chave exatas.',
          ],
        },
        {
          id: 'how-similarity-is-measured',
          heading: 'Proximidade se mede, não se estima de olho',
          paragraphs: [
            'Uma vez que o texto está representado como vetores, comparar significado vira um problema geométrico: uma pontuação de similaridade calculada entre dois vetores, quase sempre pelo quanto apontam na mesma direção. Buscar numa coleção grande significa calcular essa pontuação entre um vetor de consulta e cada vetor armazenado, e devolver as correspondências mais próximas — a mesma operação, tenha a coleção cem entradas ou cem milhões.',
          ],
        },
        {
          id: 'embeddings-are-model-specific',
          heading: 'Embeddings de modelos diferentes não se misturam',
          paragraphs: [
            'Assim como o vocabulário de um tokenizador, o espaço vetorial de um modelo de embeddings é específico daquele modelo e de como ele foi treinado. Um vetor produzido por um modelo de embeddings não é comparável de forma útil a um vetor produzido por outro modelo, mesmo que ambos tenham o mesmo número de dimensões. Trocar de modelo de embeddings significa gerar de novo os embeddings de tudo que já está armazenado, não só do conteúdo novo daí em diante.',
          ],
        },
        {
          id: 'not-the-same-job-as-a-language-model',
          heading: 'Um modelo de embeddings faz um trabalho diferente do de um modelo de linguagem',
          paragraphs: [
            'Um modelo de linguagem gera texto, token a token, a partir de um prompt. Um modelo de embeddings não gera nada: ele transforma texto num vetor e para por aí. Alguns sistemas usam o mesmo modelo base para as duas tarefas, outros usam dois modelos totalmente separados; de qualquer forma, o vetor produzido por uma etapa de embeddings não é em si uma resposta, apenas algo que uma etapa de busca ou comparação pode usar.',
          ],
        },
        {
          id: 'where-embeddings-show-up-in-practice',
          heading: 'Onde isso aparece na prática',
          paragraphs: [
            'Embeddings são o que torna possível a geração aumentada por recuperação — veja o que é RAG para entender como a recuperação se encaixa com um modelo de linguagem —, mas a mesma técnica também está por trás da busca semântica em tickets de suporte ou documentação, do pareamento de conversas passadas parecidas, da deduplicação de conteúdo quase idêntico e do agrupamento de itens relacionados sem que ninguém rotule categorias manualmente.',
          ],
        },
      ],
      faq: [
        {
          question: 'Um embedding é a mesma coisa que um token?',
          answer:
            'Não. Um token é uma unidade discreta de texto que um modelo de linguagem lê ou escreve de cada vez. Um embedding é um vetor contínuo que representa o significado de um trecho maior de texto, produzido por uma etapa separada que não gera nada.',
        },
        {
          question: 'Posso comparar embeddings produzidos por dois modelos diferentes?',
          answer:
            'Não de forma útil. Cada modelo de embeddings define seu próprio espaço vetorial durante o treinamento, então uma distância que significa "muito parecido" no espaço de um modelo não tem significado definido no espaço de outro, mesmo com vetores do mesmo tamanho.',
        },
        {
          question: 'Um vetor de embedding maior significa uma busca melhor?',
          answer:
            'Não sozinho. Mais dimensões podem capturar mais nuances, mas a qualidade depende do que o modelo foi treinado e do quanto isso combina com seu conteúdo, não só do número de dimensões.',
        },
        {
          question: 'Alguém pode recuperar o texto original a partir de um embedding?',
          answer:
            'Recuperar com exatidão costuma ser impraticável, mas um embedding ainda deriva diretamente do seu conteúdo e pode vazar informação relevante sobre ele em certos ataques. Trate embeddings armazenados de texto sensível com o mesmo cuidado que o próprio texto, não como se já estivessem anonimizados.',
        },
      ],
      productNote:
        'Os recursos de memória e pacotes de contexto do ClawAI geram embeddings localmente via Ollama e os armazenam num banco vetorial para busca por similaridade, em vez de enviar seu conteúdo a uma API de embeddings na nuvem para essa finalidade.',
    },
    [LearnTopic.PROMPTING_VS_RAG_VS_FINE_TUNING]: {
      seo: {
        title: 'Prompting vs. RAG vs. fine-tuning: qual a diferença?',
        description:
          'Três formas diferentes de mudar o que um modelo produz: instruções melhores, contexto recuperado ou um modelo alterado. O que cada uma realmente resolve, o que não consegue resolver, e por que muitos produtos nunca precisam da terceira.',
        keywords: [
          'diferença entre prompting, RAG e fine-tuning',
          'quando fazer fine-tuning de um LLM',
          'RAG ou fine-tuning',
        ],
      },
      eyebrow: 'Fundamentos',
      title: 'Prompting vs. RAG vs. fine-tuning: qual a diferença?',
      summary:
        'Prompting, geração aumentada por recuperação (RAG) e fine-tuning são três respostas diferentes para a mesma pergunta de fundo: como fazer um modelo produzir o que você realmente precisa? Cada uma muda uma parte diferente do sistema — a requisição, o contexto ou o próprio modelo — e resolve um tipo diferente de lacuna. Escolher a técnica errada para o problema real é o motivo mais comum de um projeto travar.',
      sections: [
        {
          id: 'three-different-fixes-for-three-different-problems',
          heading: 'Três soluções diferentes para três problemas diferentes',
          paragraphs: [
            'O prompting muda o que você diz ao modelo numa requisição: instruções, exemplos, regras de formatação. A geração aumentada por recuperação, ou RAG, muda o que o modelo consegue ver numa requisição, buscando material relevante e adicionando-o ao contexto — veja o que é RAG para entender como essa etapa de recuperação funciona. O fine-tuning muda o próprio modelo, ajustando seus pesos para que um padrão fique incorporado e disponível sem precisar repeti-lo toda vez. Não são três níveis de dificuldade da mesma solução; elas respondem a três tipos diferentes de lacuna.',
          ],
        },
        {
          id: 'prompting-changes-only-the-request',
          heading: 'O prompting só muda a requisição que está na sua frente',
          paragraphs: [
            'Um prompt é feito de instruções, exemplos e restrições incluídos numa única requisição. Nada disso persiste depois que a resposta volta — a próxima requisição começa do mesmo zero, a menos que você inclua as mesmas instruções de novo. Isso torna o prompting a técnica mais barata e rápida para iterar: uma mudança de redação é testável em segundos, sem infraestrutura e sem retreinamento.',
            'O prompting também é a primeira coisa que vale a pena esgotar antes de recorrer a qualquer outra coisa. Uma parcela surpreendente dos problemas de "o modelo não sabe fazer X" são na verdade problemas de "as instruções nunca disseram para fazer X".',
          ],
        },
        {
          id: 'rag-adds-facts-without-touching-the-model',
          heading: 'O RAG adiciona fatos e documentos sem tocar no modelo',
          paragraphs: [
            'O RAG resolve um problema diferente: informação com a qual o modelo nunca foi treinado, ou informação que muda rápido demais para o treinamento acompanhar — seus próprios documentos, registros atuais, qualquer coisa privada. Em vez de ensinar essa informação ao modelo, uma etapa de recuperação encontra os trechos relevantes e os coloca diretamente na requisição como contexto, usando embeddings para buscar por significado em vez de pela redação exata — veja o que são embeddings para entender como essa busca funciona por baixo dos panos.',
            'Como nada no modelo muda, atualizar os documentos subjacentes atualiza imediatamente o que o sistema consegue responder, sem nenhuma etapa de retreinamento. A contrapartida é que a qualidade da resposta é limitada pela qualidade da recuperação: se o trecho certo nunca é encontrado, o modelo não consegue usar uma informação que nunca viu.',
          ],
        },
        {
          id: 'fine-tuning-changes-the-model-itself',
          heading: 'O fine-tuning muda o próprio modelo',
          paragraphs: [
            'O fine-tuning ajusta os pesos de um modelo usando exemplos de treinamento adicionais, de modo que um padrão de comportamento — um tom, um formato de resposta, uma habilidade especializada demonstrada nos exemplos — passe a fazer parte do modelo em vez de algo que você precisa repetir em todo prompt ou fornecer via recuperação. Uma vez treinado, o modelo se comporta assim por padrão, em qualquer requisição, sem instruções extras.',
            'Também tem custos reais que o prompting e o RAG não têm: exemplos de treinamento precisam ser preparados e selecionados, uma rodada de treinamento precisa ser executada e avaliada, e o resultado é um artefato de modelo específico que precisa ser hospedado e mantido sincronizado conforme os modelos base melhoram. O fine-tuning também não adiciona fatos vivos ou que mudam — ele incorpora um padrão a partir de um conjunto de treinamento fixo, e fica desatualizado do mesmo jeito que qualquer treinamento estático.',
          ],
        },
        {
          id: 'matching-the-technique-to-the-failure',
          heading: 'Faça a técnica corresponder à falha real, não à opção mais sofisticada',
          paragraphs: [
            'Tom errado, formato errado, instruções ignoradas: geralmente um problema de prompting. Fatos errados ou faltando, especialmente sobre material próprio ou que muda rápido: geralmente um problema de recuperação. Um comportamento especializado que você quer aplicado de forma consistente, em toda requisição, sem precisar reexplicar toda vez: o caso para o qual o fine-tuning realmente foi feito. Eles não são mutuamente exclusivos — um modelo com fine-tuning ainda pode receber um prompt e contexto recuperado —, mas cada um só resolve a falha para a qual foi construído, e usar o errado deixa o problema real sem solução enquanto adiciona custo e complexidade.',
          ],
        },
        {
          id: 'why-many-products-skip-fine-tuning',
          heading: 'Por que muitos produtos nunca recorrem ao fine-tuning',
          paragraphs: [
            'Prompting e RAG deixam o modelo subjacente intacto, então atualizar para um modelo base mais novo ou melhor costuma ser só uma mudança de configuração. Um modelo com fine-tuning fica preso ao modelo base do qual foi treinado — uma atualização significativa do modelo base geralmente significa repreparar dados e retreinar em vez de simplesmente trocar. Por isso muitos produtos resolvem todo o problema com prompting mais recuperação, e só recorrem ao fine-tuning quando um comportamento específico e bem definido precisa ser consistente num volume enorme de requisições sem o custo de repetir instruções e contexto toda vez.',
          ],
        },
      ],
      faq: [
        {
          question: 'O RAG atualiza o conhecimento do modelo de forma permanente?',
          answer:
            'Não. O RAG muda o que é incluído no contexto de uma requisição; o modelo subjacente nunca é modificado. A próxima requisição que não recuperar o mesmo material começa sem ele, exatamente como qualquer outro prompt.',
        },
        {
          question: 'O fine-tuning é sempre mais preciso que prompting ou RAG?',
          answer:
            'Não. O fine-tuning incorpora um padrão a partir dos seus exemplos de treinamento, mas não adiciona fatos ausentes desses dados de treinamento, e não mantém os fatos atualizados como a recuperação consegue. Um modelo com fine-tuning ainda pode estar confiantemente errado sobre qualquer coisa fora do que foi treinado.',
        },
        {
          question: 'Prompting, RAG e fine-tuning podem ser combinados?',
          answer:
            'Sim. Eles mudam partes diferentes do sistema, então um modelo com fine-tuning ainda pode receber contexto recuperado e instruções explícitas na mesma requisição. Combiná-los é comum; não é preciso tratá-los como escolhas mutuamente exclusivas.',
        },
        {
          question: 'Qual devo tentar primeiro?',
          answer:
            'Prompting, quase sempre. Não exige infraestrutura e uma mudança de redação é testável em segundos. Passe para a recuperação quando a lacuna for informação ausente ou desatualizada, e considere o fine-tuning só quando um comportamento específico e bem definido precisar ser consistente num volume de requisições grande o bastante para justificar o custo de treinamento e manutenção.',
        },
      ],
      productNote:
        'Os pacotes de contexto do ClawAI e a recuperação de arquivos e workspace adicionam material relevante a uma requisição sem tocar no modelo subjacente; o ClawAI não oferece fine-tuning de modelos — os modelos na nuvem e locais para os quais ele roteia são usados como já treinados.',
    },
    [LearnTopic.HOW_AI_TOOL_CALLING_WORKS]: {
      seo: {
        title: 'Como funciona de verdade a chamada de ferramentas na IA?',
        description:
          'Um modelo que chama uma ferramenta nunca executa nada sozinho: ele propõe um nome e argumentos, e sua aplicação decide se executa a chamada. Como funciona o ciclo requisição-resposta, e por que a proposta é um palpite, não uma garantia.',
        keywords: [
          'como funciona a chamada de ferramentas',
          'function calling em LLM explicado',
          'mecanismo de uso de ferramentas em IA',
        ],
      },
      eyebrow: 'Fundamentos',
      title: 'Como funciona de verdade a chamada de ferramentas na IA?',
      summary:
        'A chamada de ferramentas, às vezes chamada de function calling, permite que um modelo peça que algo seja feito em seu nome: consultar um banco de dados, chamar uma API, executar um cálculo. O que surpreende as pessoas é o que o modelo realmente faz nesse momento — ele não executa nada. Ele produz uma requisição estruturada nomeando uma ferramenta e seus argumentos, e sua aplicação decide se e como agir sobre isso.',
      sections: [
        {
          id: 'what-tool-calling-actually-is',
          heading: 'O modelo recebe um cardápio, não um teclado',
          paragraphs: [
            'Antes de uma requisição ser enviada, a aplicação descreve ao modelo as ferramentas disponíveis: um nome, uma descrição do que cada uma faz e um esquema para os argumentos esperados. O modelo não recebe código funcional nem uma conexão ativa com nada — recebe uma descrição, do mesmo jeito que uma pessoa lê um cardápio sem ter acesso à cozinha.',
          ],
        },
        {
          id: 'the-model-never-executes-anything',
          heading: 'O modelo nunca executa nada sozinho',
          paragraphs: [
            'Quando um modelo decide que uma ferramenta ajudaria, ele produz uma saída estruturada — normalmente um nome de ferramenta e um conjunto de argumentos — e para por aí. Nada ainda foi buscado, chamado ou alterado. A aplicação que enviou a requisição lê essa saída estruturada, decide se age sobre ela, e em caso afirmativo executa a função ou a chamada de API real na própria infraestrutura.',
          ],
        },
        {
          id: 'the-loop-request-response-continue',
          heading: 'Uma troca completa é um ciclo, não uma etapa única',
          paragraphs: [
            'A sequência típica é: a aplicação envia um prompt mais a lista de ferramentas disponíveis; o modelo responde com uma resposta ou com uma chamada de ferramenta proposta; se for uma chamada de ferramenta, a aplicação a executa e manda o resultado de volta como parte da conversa; o modelo então continua, muitas vezes produzindo uma resposta final que usa esse resultado. Tarefas de várias etapas podem repetir esse ciclo várias vezes antes de uma resposta chegar ao usuário.',
          ],
        },
        {
          id: 'a-proposed-call-is-a-guess-not-a-guarantee',
          heading: 'Uma chamada proposta é um palpite plausível, não uma garantia de acerto',
          paragraphs: [
            'Um modelo pode propor a ferramenta errada, inventar um argumento que nunca esteve no esquema, ou chamar uma ferramenta quando não havia nada para chamar — a mesma geração probabilística que produz qualquer outra saída produz uma chamada de ferramenta. Nada no mecanismo torna uma chamada proposta inerentemente segura de executar. Uma aplicação que executa argumentos sem validá-los contra o esquema, e sem autorizar o que a chamada realmente pode tocar, está confiando acesso real a um palpite.',
          ],
        },
        {
          id: 'the-schema-is-the-interface-the-model-sees',
          heading: 'O esquema é a única interface que o modelo realmente vê',
          paragraphs: [
            'O nome, a descrição e o esquema de argumentos de uma ferramenta são toda a especificação que o modelo tem para trabalhar — ele não tem outra forma de saber o que uma ferramenta faz ou como preencher seus parâmetros corretamente. A mesma função subjacente, descrita de forma clara e específica, tende a ser chamada corretamente com muito mais frequência do que uma descrita vagamente ou agrupada com opções sem relação, porque o modelo escolhe e preenche os argumentos só a partir dessa descrição.',
          ],
        },
        {
          id: 'why-this-differs-from-the-model-writing-code',
          heading: 'Por que isso é diferente de pedir a um modelo para escrever código',
          paragraphs: [
            'Pedir a um modelo para produzir um script funcional e pedir que ele chame uma ferramenta predefinida não são a mesma requisição. Uma chamada de ferramenta é limitada a um nome e argumentos que sua aplicação já sabe tratar com segurança; código gerado livremente pode tentar fazer qualquer coisa que o ambiente de execução permita, um problema de segurança muito maior e diferente. A chamada de ferramentas restringe o que um modelo pode pedir a um conjunto fixo e inspecionável de opções.',
          ],
        },
      ],
      faq: [
        {
          question: 'O modelo executa a ferramenta sozinho?',
          answer:
            'Não. O modelo produz uma requisição estruturada nomeando uma ferramenta e seus argumentos. A aplicação que enviou a requisição decide se executa, e a função ou chamada de API real roda na própria infraestrutura da aplicação, não dentro do modelo.',
        },
        {
          question: 'Um modelo pode chamar uma ferramenta com argumentos inventados?',
          answer:
            'Sim. Um modelo pode fornecer um valor que nunca fez parte do esquema, ou que não faz sentido para a ferramenta, porque a chamada é gerada do mesmo jeito que qualquer outra saída. Validar argumentos antes de executar algo real é responsabilidade da aplicação, não algo que o modelo garanta.',
        },
        {
          question: 'O que acontece se o modelo chamar a ferramenta errada?',
          answer:
            'Isso depende inteiramente de como a aplicação foi construída. Uma bem construída verifica se a chamada faz sentido antes de executá-la e pode devolver um erro ou um resultado esclarecedor ao modelo em vez de agir sobre uma requisição incompatível; uma mal construída executa o que recebe.',
        },
        {
          question: 'Chamada de ferramentas é a mesma coisa que um agente de IA?',
          answer:
            'Não, mas agentes geralmente são construídos em cima dela. A chamada de ferramentas é o mecanismo subjacente de requisição-resposta; um agente normalmente repete esse ciclo várias vezes, com lógica adicional decidindo o que tentar em seguida com base em cada resultado.',
        },
      ],
      productNote:
        'O ClawAI expõe conectores de workspace e outras ações aos modelos como ferramentas chamáveis durante uma requisição de chat; uma chamada proposta é validada contra seu esquema antes de o ClawAI executar qualquer coisa contra um conector real em seu nome.',
    },
    [LearnTopic.WHAT_ARE_STRUCTURED_AI_OUTPUTS]: {
      seo: {
        title: 'O que são saídas estruturadas de IA?',
        description:
          'Pedir a um modelo que responda em JSON é uma solicitação, não uma garantia — a resposta ainda pode voltar malformada. O que realmente restringe a saída de um modelo, por que alguns mecanismos a impõem e outros só pedem, e por que a validação continua importando de qualquer jeito.',
        keywords: [
          'o que são saídas estruturadas',
          'modo JSON de LLM explicado',
          'geração de IA restrita por esquema',
        ],
      },
      eyebrow: 'Fundamentos',
      title: 'O que são saídas estruturadas de IA?',
      summary:
        'Uma saída estruturada é uma resposta do modelo moldada para caber num formato específico — geralmente JSON conforme um esquema definido — em vez de texto livre, para que o código consiga interpretá-la sem adivinhar. O que surpreende é que "pedir ao modelo para devolver JSON" e "o modelo garante devolver JSON válido" são duas afirmações diferentes, e só alguns mecanismos realmente entregam a segunda.',
      sections: [
        {
          id: 'what-structured-output-means',
          heading: 'Estrutura significa que o código downstream pode confiar no formato',
          paragraphs: [
            'Uma saída estruturada restringe uma resposta a um formato definido — um conjunto fixo de campos, tipos específicos, uma enumeração de valores permitidos — em vez de um parágrafo de texto livre. Não se trata de estilo; um programa que lê a resposta consegue extrair um valor num caminho conhecido em vez de analisar frases e adivinhar o significado.',
          ],
        },
        {
          id: 'two-ways-to-ask-for-structure',
          heading: 'Há duas formas diferentes de pedir isso',
          paragraphs: [
            'A primeira é baseada em prompt: instruções dizem ao modelo para responder só em JSON conforme um formato descrito. Isso funciona com praticamente qualquer modelo e não precisa de suporte especial de API, mas é uma solicitação que o modelo ainda pode ignorar, fazer parcialmente errado, ou envolver em texto explicativo que você não pediu. A segunda é imposta pelo provedor: alguns provedores oferecem um modo, muitas vezes chamado de saídas estruturadas ou modo JSON, em que a própria geração é restrita para que só possam ser produzidos tokens compatíveis com o esquema a cada passo. Esse é um mecanismo mais forte que uma instrução, não só um que soa mais rígido — e é um recurso distinto da chamada de ferramentas (veja como funciona a chamada de ferramentas), que molda os argumentos de uma função nomeada em vez da própria resposta do modelo.',
          ],
        },
        {
          id: 'a-prompt-instruction-is-a-request-not-a-guarantee',
          heading: 'Uma instrução no prompt é uma solicitação, não uma garantia',
          paragraphs: [
            'Quando a estrutura vem só da redação do prompt, o modelo ainda pode produzir uma saída que não bate — um campo a mais, um faltando, texto antes do JSON, um valor do tipo errado. Qualquer sistema que dependa só de estrutura via prompt precisa de um plano real para quando a interpretação falhar, não da suposição de que isso nunca vai acontecer.',
          ],
        },
        {
          id: 'provider-enforced-output-is-a-different-guarantee',
          heading: 'Estrutura imposta pelo provedor é um tipo diferente de garantia',
          paragraphs: [
            'Quando um provedor restringe a geração diretamente contra um esquema, a saída fica muito mais confiavelmente bem formada, porque tokens malformados são excluídos de serem gerados desde o início, em vez de apenas desencorajados. Exatamente quais provedores e modelos suportam isso, e com que rigor, varia e muda com o tempo — trate estrutura via prompt e estrutura imposta pelo provedor como níveis de confiabilidade diferentes, não como formas intercambiáveis de chegar ao mesmo resultado.',
          ],
        },
        {
          id: 'schema-design-still-affects-quality',
          heading: 'Um formato válido não é a mesma coisa que uma resposta correta',
          paragraphs: [
            'Mesmo com a aplicação mais forte, o esquema só restringe a forma, não o significado. Um campo de resumo pode ser JSON sintaticamente válido e mesmo assim conter três frases divagantes em vez de uma, ou um número errado afirmado com confiança num campo rotulado como contagem. Um esquema vago ou permissivo demais tende a produzir saída tecnicamente válida mas ainda assim pouco confiável de usar.',
          ],
        },
        {
          id: 'validate-before-you-trust-it',
          heading: 'Interpretar com sucesso não é a mesma coisa que poder confiar',
          paragraphs: [
            'Quer a estrutura venha de um prompt ou da imposição do provedor, interpretar uma resposta com sucesso só confirma que o formato foi seguido — não diz nada sobre se os valores dos campos são precisos, estão dentro do intervalo ou fazem sentido. Tratar um objeto interpretado como dado verificado, em vez de como uma alegação a conferir, é onde os sistemas de saída estruturada mais falham em produção.',
          ],
        },
      ],
      faq: [
        {
          question: 'Uma saída estruturada é a mesma coisa que uma chamada de ferramenta?',
          answer:
            'Não. A chamada de ferramentas propõe uma função nomeada e seus argumentos para sua aplicação possivelmente executar; uma saída estruturada molda a própria resposta do modelo num formato definido. Os dois mecanismos podem ser usados separadamente ou juntos.',
        },
        {
          question: 'Pedir JSON ao modelo no prompt garante receber JSON válido de volta?',
          answer:
            'Não. É uma solicitação que o modelo ainda pode errar — texto a mais, um campo faltando, um tipo incorreto. Sistemas que dependem só da redação do prompt precisam de um fallback definido para quando a interpretação falhar, não da suposição de que ela sempre vai funcionar.',
        },
        {
          question: 'Se um provedor impõe um esquema, o resultado é garantidamente correto?',
          answer:
            'É garantido que fica bem formado de acordo com o esquema — os campos certos, os tipos certos. Não é garantido que os valores dentro desses campos sejam precisos ou façam sentido; a imposição restringe a forma, não a verdade.',
        },
        {
          question: 'Ainda preciso validar uma resposta estruturada antes de usá-la?',
          answer:
            'Sim. Interpretar uma resposta com sucesso confirma que o formato bateu, não que o conteúdo está correto. Verificações de intervalo, tipo e sanidade dos valores continuam necessárias, independentemente de como a estrutura foi produzida.',
        },
      ],
      productNote:
        'O recurso de julgamento do ClawAI pede a um modelo um formato JSON específico por meio de instruções no prompt e recorre a um estado definido de "falha na interpretação" em vez de adivinhar quando uma resposta não bate — um exemplo direto e funcionando de que um esquema pedido num prompt é uma solicitação, não uma garantia.',
    },
    [LearnTopic.WHY_AI_HALLUCINATES]: {
      seo: {
        title: 'Por que a IA tem alucinações?',
        description:
          'Um modelo de linguagem afirma uma resposta errada com o mesmo tom confiante de uma certa, porque nunca foi treinado para saber o que não sabe. Por que a alucinação acontece, por que não dá para eliminá-la de vez, e o que realmente a reduz.',
        keywords: [
          'por que a IA tem alucinações',
          'alucinação de modelos de linguagem explicada',
          'IA inventando informações',
        ],
      },
      eyebrow: 'Fundamentos',
      title: 'Por que a IA tem alucinações?',
      summary:
        'Uma alucinação é o modelo afirmar algo falso como se fosse fato, sem ressalva e sem nenhum sinal de que está adivinhando. Isso acontece porque um modelo de linguagem é treinado para produzir o próximo token estatisticamente mais provável, não para checar uma afirmação contra a realidade — uma frase fluida, confiante e errada, e uma fluida, confiante e certa, nascem exatamente do mesmo processo.',
      sections: [
        {
          id: 'a-confident-wrong-answer-not-a-crash',
          heading: 'É uma resposta errada confiante, não um erro que o modelo consiga sinalizar',
          paragraphs: [
            'O modelo não tem um modo separado de "não sei" para o qual recorrer. Toda resposta, certa ou errada, vem do mesmo processo de prever o próximo token, então uma citação inventada ou um método de API que não existe soam com a mesma confiança fluida de uma resposta correta. É isso que diferencia a alucinação de um bug de software comum — nenhuma exceção é lançada, nenhum sinal é acionado, não há nada para capturar. O resultado parece igualmente confiável, esteja certo ou errado.',
          ],
        },
        {
          id: 'why-it-happens-training-and-prediction',
          heading: 'Por que acontece: previsão, não consulta',
          paragraphs: [
            'Um modelo de linguagem é treinado para prever continuações plausíveis de texto, aprendidas a partir de padrões nos seus dados de treinamento. Ele não guarda fatos numa forma recuperável e verificável como faria um banco de dados — guarda a forma estatística da linguagem, incluindo os fatos comuns o bastante no treinamento para moldar essa forma. Quando um prompt pede algo que o modelo viu raramente, de forma inconsistente, ou nunca viu, o modelo não deixa de responder; produz a continuação mais plausível mesmo assim, porque é a única coisa que sabe fazer.',
            'Isso também explica por que a alucinação piora com detalhes específicos, raros ou recentes — um caso judicial que soa real mas é inventado, um número de versão plausível mas errado, uma citação que soa como o título de um artigo de verdade. Quanto mais específica a afirmação, maior a chance de o modelo estar preenchendo uma lacuna com algo apenas plausível, não algo conhecido.',
          ],
        },
        {
          id: 'grounding-narrows-it-does-not-remove-it',
          heading: 'O grounding estreita a lacuna; não a fecha',
          paragraphs: [
            'Colocar um texto-fonte real diante do modelo antes de ele responder — a recuperação, veja o que é RAG — reduz de forma mensurável a alucinação em perguntas que essas fontes realmente cobrem, porque o modelo consegue reformular o que acabou de ler em vez de prever só a partir dos dados de treinamento. Mas é uma tendência forte, não uma garantia: se a recuperação não retornar nada útil, ou as fontes estiverem incompletas, o modelo ainda pode responder com fluidez a partir da memória em vez de admitir que as fontes não ajudaram.',
          ],
        },
        {
          id: 'multiple-models-and-a-judge-are-a-filter-not-a-cure',
          heading: 'Cruzar modelos é um filtro, não uma cura',
          paragraphs: [
            'Fazer a mesma pergunta a vários modelos e comparar as respostas captura alucinações específicas do treinamento ou das particularidades de um modelo — se só um entre três modelos inventa um detalhe, esse desacordo é um sinal. Não captura uma alucinação que a maioria dos modelos compartilha, porque os dados de treinamento se sobrepõem entre provedores. O mesmo limite vale para usar um modelo à parte como juiz para pontuar uma resposta: um modelo juiz pode ser enganado pelo mesmo tipo de texto fluido, confiante e errado que deveria checar.',
          ],
        },
        {
          id: 'what-actually-reduces-it',
          heading: 'O que realmente reduz a alucinação, na prática',
          paragraphs: [
            'Nenhuma técnica sozinha elimina a alucinação, porque é uma propriedade de como esses modelos geram texto, não um defeito específico de um modelo ou provedor. O que ajuda de forma mensurável é restringir a tarefa do modelo: ancorar as respostas em texto-fonte recuperado para perguntas que essas fontes cobrem, manter as solicitações específicas em vez de abertas, e tratar as citações, números e detalhes específicos do próprio modelo como afirmações a verificar, não como fatos já checados. Combinar técnicas — grounding, cruzamento de modelos e verificação contra uma fonte — reduz mais a margem de erro do que qualquer uma delas isolada.',
          ],
        },
        {
          id: 'why-lower-temperature-does-not-fix-it',
          heading: 'Por que baixar a aleatoriedade não resolve',
          paragraphs: [
            'É comum supor que baixar a temperatura (veja temperatura e top-p) torna um modelo mais fiel à verdade, porque o resultado parece mais cauteloso e determinístico. A temperatura controla como o modelo amostra entre os próximos tokens prováveis — não muda o que o modelo sabe nem adiciona uma etapa de checagem de fatos. Um modelo pode ter alucinações na temperatura zero com a mesma confiança que na temperatura um; um ajuste mais baixo só faz com que ele alucine a mesma resposta errada com mais constância.',
          ],
        },
      ],
      faq: [
        {
          question: 'Dá para corrigir a alucinação por completo?',
          answer:
            'Não, não com as arquiteturas atuais de modelos de linguagem. Ela vem de como esses modelos geram texto — prever continuações plausíveis em vez de checar fatos —, então pode ser reduzida com grounding, cruzamento de modelos e verificação, mas não eliminada como categoria.',
        },
        {
          question: 'Um modelo maior ou mais novo tem menos alucinações?',
          answer:
            'Geralmente menos em conhecimento comum, porque uma parte maior dele estava bem representada no treinamento. Isso não elimina o mecanismo de base — um modelo mais novo ainda pode ter alucinações confiantes em detalhes raros, específicos ou recentes para os quais não foi bem treinado.',
        },
        {
          question: 'Alucinação é o mesmo que o modelo mentir?',
          answer:
            'Não. Mentir pressupõe conhecer a verdade e afirmar o contrário. O modelo não tem um canal separado para "a verdade" com o qual comparar sua saída — ele gera a continuação estatisticamente mais plausível, seja ela precisa ou não.',
        },
        {
          question: 'Dar os próprios documentos ao modelo interrompe a alucinação?',
          answer:
            'Reduz bastante em perguntas que esses documentos realmente respondem, porque o modelo consegue reformular texto recuperado em vez de prever só a partir dos dados de treinamento. Não impede o modelo de responder com fluidez a partir da memória quando a recuperação não encontra nada relevante.',
        },
      ],
      productNote:
        'O ClawAI não afirma eliminar a alucinação — nenhum produto pode dizer isso com honestidade. O que ele oferece são as mitigações que a reduzem de forma mensurável: respostas com recuperação ancoradas nos seus próprios documentos (veja o que é RAG), consenso multimodelo que evidencia o desacordo entre modelos (veja o que é consenso de IA), e um juiz de IA que pontua respostas segundo critérios definidos (veja o que é um juiz de IA) — três recursos reais e independentes, cada um um filtro parcial, não uma garantia.',
    },
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
        keywords: ['IA local', 'IA no seu hardware', 'IA privada'],
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
    [LearnTopic.HOW_TO_EVALUATE_AI_MODELS]: {
      seo: {
        title: 'Como avaliar modelos de IA para o seu próprio uso',
        description:
          'Um número de ranking diz como um modelo se saiu nas tarefas de outra pessoa. O que realmente prevê se ele vai funcionar para as suas — e as trocas de qualidade, custo, latência e privacidade que um único número não consegue mostrar.',
        keywords: [
          'como avaliar modelos de IA',
          'escolher um modelo de IA',
          'critérios de comparação de modelos',
        ],
      },
      eyebrow: 'Fundamentos',
      title: 'Como avaliar modelos de IA para o seu próprio uso',
      summary:
        'Avaliar um modelo para o seu próprio trabalho significa testá-lo nas suas próprias tarefas, não confiar numa pontuação calculada nas tarefas de outra pessoa. Um modelo no topo de um ranking público ainda pode ser a escolha errada para um trabalho específico, depois de pesar qualidade contra custo, latência, e o que você tem permissão de enviar a ele em primeiro lugar.',
      sections: [
        {
          id: 'a-leaderboard-score-is-not-your-score',
          heading: 'Um número de ranking não é o seu número',
          paragraphs: [
            'Benchmarks públicos medem desempenho num conjunto fixo de tarefas raramente idêntico ao seu — domínio diferente, formato diferente, tipos de erro diferentes que importam para você. Um modelo pode estar perto do topo de um benchmark geral e ainda assim ter desempenho pior que um menor no seu tipo específico de solicitação, porque o benchmark nunca testou nada parecido.',
            'Pontuações de benchmark também envelhecem rápido e podem ser afetadas por quanto os dados de treinamento de um modelo conhecem exatamente aquelas questões do benchmark, então uma pontuação alta é uma pista que vale a pena investigar, não um veredito para confiar cegamente.',
          ],
        },
        {
          id: 'test-on-your-own-tasks',
          heading: 'O único teste confiável é a sua própria tarefa',
          paragraphs: [
            'Pegue uma amostra representativa de solicitações reais do seu caso de uso real — não exemplos simplificados — e passe-as pelos modelos candidatos. Julgue as saídas pelo que você realmente aceitaria, não por uma noção genérica de boa resposta. Um modelo que escreve prosa elegante mas erra a terminologia do seu domínio é uma escolha ruim mesmo que soe bem.',
          ],
        },
        {
          id: 'quality-is-not-the-only-dimension',
          heading: 'Qualidade é apenas uma entre várias dimensões que se contrapõem',
          paragraphs: [
            'O modelo com melhor pontuação de qualidade costuma ser também o mais lento e mais caro por solicitação. Se essa troca vale a pena depende do trabalho: um processo em lote em segundo plano geralmente pode arcar com um modelo mais lento e barato; uma resposta de chat interativa geralmente não pode arcar com lentidão, por melhor que ela seja. Avaliar um modelo isoladamente, só pela qualidade, pula justamente a troca que realmente decide se ele é utilizável no seu produto.',
          ],
        },
        {
          id: 'privacy-and-data-handling-are-evaluation-criteria-too',
          heading: 'O que você tem permissão de enviar a ele também é um critério de avaliação',
          paragraphs: [
            'Um modelo com boa pontuação mas que exige enviar dados sensíveis a terceiros pela internet aberta pode não ser utilizável para uma carga de trabalho específica independentemente da qualidade — essa restrição precisa ser checada antes mesmo de a qualidade ser relevante, não depois de você já ter escolhido seu favorito. Quando uma tarefa envolve dados que você não pode tirar da sua própria infraestrutura, rodar localmente (veja o que é IA local) ou de forma self-hosted reduz o campo antes mesmo de os benchmarks entrarem em jogo.',
          ],
        },
        {
          id: 'know-a-models-known-weaknesses',
          heading:
            'Todo modelo tem pontos fracos conhecidos — encontre os seus antes de confiar nele',
          paragraphs: [
            'A tendência conhecida de um modelo a ter alucinações em perguntas fora do domínio, ou sua consistência em tarefas que exigem raciocínio cuidadoso passo a passo, importa pelo menos tanto quanto sua pontuação média. Se o seu caso de uso toca um domínio em que o modelo tende a chutar, avalie especificamente isso em vez de supor que uma boa pontuação média já cobre — veja por que a IA tem alucinações para entender por que o desempenho médio não prevê o comportamento num ponto fraco específico.',
          ],
        },
        {
          id: 'reevaluate-not-just-at-launch',
          heading: 'Avaliação não é uma decisão única',
          paragraphs: [
            'Provedores atualizam modelos — às vezes silenciosamente, sob o mesmo nome e endpoint — e preços e limites de taxa mudam. Um modelo que era a escolha certa quando você avaliou pode deixar de encaixar mais tarde. Tratar a escolha do modelo como uma decisão revisada periodicamente, em vez de fixada uma única vez no lançamento, captura esse desvio antes que ele vire um problema de produção.',
          ],
        },
      ],
      faq: [
        {
          question: 'Uma pontuação de benchmark mais alta é sempre a melhor escolha?',
          answer:
            'Não necessariamente. Benchmarks testam um conjunto fixo de tarefas que pode não se parecer com as suas, e uma pontuação mais alta costuma vir com mais custo ou latência. A única forma de saber é testar o modelo nas suas próprias tarefas representativas.',
        },
        {
          question: 'De quantos casos de teste preciso para avaliar bem um modelo?',
          answer:
            'O suficiente para cobrir a variedade de solicitações que seu caso de uso realmente produz, incluindo casos extremos e o tipo de entrada que costuma dar errado. Alguns exemplos fáceis farão quase qualquer modelo parecer bom; os casos mais difíceis e representativos são onde as diferenças reais aparecem.',
        },
        {
          question: 'Devo reavaliar um modelo depois de já tê-lo escolhido?',
          answer:
            'Sim. Provedores atualizam modelos sob o mesmo nome, preços e limites de taxa mudam, e o seu próprio caso de uso evolui. Trate a escolha como algo revisado periodicamente, não fixado para sempre no lançamento.',
        },
        {
          question: 'Preciso testar privacidade e tratamento de dados separadamente da qualidade?',
          answer:
            'Sim, e isso deveria vir primeiro se desqualificar uma opção. A pontuação de qualidade de um modelo é irrelevante se a carga de trabalho envolve dados que você não tem permissão de enviar a esse provedor em primeiro lugar.',
        },
      ],
      productNote:
        'Em vez de reduzir uma resposta de chat a um único número, o painel de transparência de roteamento do ClawAI mostra a classe de custo, a classe de latência, a confiança do roteamento, e se um modelo de fallback ou juiz foi usado para aquela resposta específica — um sinal de avaliação ligado à solicitação real, não um número genérico de ranking.',
    },
    [LearnTopic.HOW_TO_READ_AI_BENCHMARKS]: {
      seo: {
        title: 'Como ler benchmarks de IA sem se deixar enganar',
        description:
          'Um número de benchmark parece preciso, o que facilita confiar demais nele. O que uma pontuação como MMLU ou HumanEval realmente mede, as formas comuns como números de benchmark enganam, e o que verificar antes de tratar um como significativo para o seu caso.',
        keywords: [
          'como ler benchmarks de IA',
          'pontuações de benchmark de IA explicadas',
          'entendendo benchmarks de LLM',
        ],
      },
      eyebrow: 'Fundamentos',
      title: 'Como ler benchmarks de IA sem se deixar enganar',
      summary:
        'Uma pontuação de benchmark mede o desempenho num único conjunto fixo e específico de perguntas de teste — nem mais, nem menos. O número parece preciso e objetivo, e é justamente por isso que é fácil confiar demais nele: um único valor não consegue mostrar o que o teste cobriu, como o modelo foi questionado, ou se as perguntas vazaram para os dados de treinamento antes mesmo de o modelo vê-las de verdade.',
      sections: [
        {
          id: 'a-benchmark-is-one-fixed-test-not-a-general-measure',
          heading: 'Um benchmark é um teste fixo, não uma medida geral de capacidade',
          paragraphs: [
            'Benchmarks conhecidos como MMLU (conhecimento geral de múltipla escolha), HumanEval (problemas curtos de programação) ou GSM8K (problemas de matemática em forma de texto de nível fundamental) testam cada um uma habilidade estreita e específica num formato preciso. Um modelo pode pontuar bem num deles e mal numa tarefa que parece semelhante para um humano mas é estruturada de forma diferente — programação extensa em vez de funções curtas isoladas, por exemplo, ou escrita aberta em vez de recordação de múltipla escolha.',
          ],
        },
        {
          id: 'contamination-benchmark-questions-leak-into-training-data',
          heading: 'Perguntas de benchmark podem vazar para os dados de treinamento',
          paragraphs: [
            'Benchmarks populares são públicos, e suas perguntas circulam amplamente na web, em artigos e em discussões de fóruns — exatamente o tipo de texto com que grandes modelos são treinados. Quando um modelo já viu a resposta na prática, sua pontuação reflete memorização naquele teste específico, não a capacidade geral que o benchmark pretendia representar. Isso se chama contaminação, e é difícil de detectar de fora só pela pontuação.',
          ],
        },
        {
          id: 'scores-can-depend-heavily-on-how-the-model-was-prompted',
          heading: 'A pontuação relatada pode depender fortemente de como o modelo foi questionado',
          paragraphs: [
            'O mesmo modelo pode pontuar de forma muito diferente dependendo do formato do prompt, do número de exemplos resolvidos mostrados antes da pergunta real, e se foi permitido raciocinar passo a passo antes de responder. Um provedor que relata seu melhor resultado em condições generosas não está mentindo, mas esse número pode não se parecer com o que você obteria com um prompt simples do dia a dia.',
          ],
        },
        {
          id: 'benchmarks-saturate-and-stop-being-useful',
          heading:
            'Benchmarks saturam — e deixam de ser úteis quando a maioria dos modelos os supera',
          paragraphs: [
            'Quando a maioria dos modelos líderes pontua perto do máximo num benchmark, ele deixa de distingui-los de forma significativa, mesmo que o número antigo ainda seja citado com frequência. Uma pontuação quase perfeita num benchmark saturado diz menos do que dizia antes; benchmarks mais novos e difíceis tendem a substituí-lo, e uma comparação de marketing que se apoia num número velho e saturado merece um segundo olhar.',
          ],
        },
        {
          id: 'a-single-average-hides-where-a-model-actually-struggles',
          heading: 'Uma única média esconde exatamente onde um modelo realmente falha',
          paragraphs: [
            'Uma pontuação geral de benchmark é uma média entre muitas perguntas de dificuldade e tipo variados. Um modelo pode ter uma boa média e ainda assim ser pouco confiável numa subcategoria específica que importa para você — um tipo particular de raciocínio, um domínio específico, um determinado comprimento de tarefa. A média é um resumo, e resumos descartam justamente o detalhe que costuma importar mais numa decisão real.',
          ],
        },
        {
          id: 'treat-a-benchmark-as-a-starting-point-not-a-verdict',
          heading: 'Trate um benchmark como ponto de partida, não como veredito',
          paragraphs: [
            'Uma pontuação de benchmark é mais útil como um filtro inicial aproximado — descartar claramente um modelo inadequado, ou pré-selecionar alguns que valha a pena testar mais a fundo — do que como a palavra final sobre qual modelo usar. Veja como avaliar modelos de IA para saber o que realmente prevê o encaixe depois de reduzir uma pré-seleção: testar nas suas próprias tarefas representativas, algo que nenhum benchmark publicado consegue substituir.',
          ],
        },
      ],
      faq: [
        {
          question: 'O que um benchmark como MMLU ou HumanEval realmente testa?',
          answer:
            'Um conjunto fixo e específico de perguntas num formato preciso — MMLU é conhecimento geral de múltipla escolha, HumanEval são problemas curtos de programação. Cada um mede uma habilidade estreita, não uma inteligência geral ou capacidade em qualquer tarefa.',
        },
        {
          question:
            'Por que os benchmarks de provedores diferentes às vezes parecem inconsistentes?',
          answer:
            'As pontuações podem depender do formato do prompt, de quantos exemplos foram mostrados antes da pergunta real, e se o raciocínio passo a passo foi permitido. Condições de relato diferentes produzem números diferentes para o mesmo modelo subjacente.',
        },
        {
          question: 'O que é contaminação de benchmark?',
          answer:
            'Quando as perguntas públicas de um benchmark acabam nos dados de treinamento de um modelo, de modo que ele já viu as respostas na prática antes de ser testado. A pontuação resultante reflete memorização, não a capacidade que o benchmark pretendia medir.',
        },
        {
          question: 'Devo ignorar completamente as pontuações de benchmark?',
          answer:
            'Não — elas são um filtro inicial razoável para descartar modelos claramente inadequados ou montar uma pré-seleção. Só não trate o número final como um veredito; teste a pré-seleção nas suas próprias tarefas representativas antes de decidir.',
        },
      ],
      productNote:
        'O ClawAI não publica seu próprio ranking de benchmarks nem reivindica uma pontuação proprietária para nenhum modelo — em vez disso, seu painel de transparência de roteamento mostra a classe de custo, a classe de latência e a confiança de roteamento reais por trás de uma resposta específica, para que você possa julgar uma resposta em relação à sua própria solicitação, e não a um conjunto de testes publicado que você não pode inspecionar.',
    },
    [LearnTopic.WHAT_IS_PROMPT_INJECTION]: {
      seo: {
        title: 'O que é injeção de prompt?',
        description:
          'Um modelo de linguagem não consegue distinguir de forma confiável suas instruções das instruções escondidas no conteúdo que ele lê — uma página web, um documento, o resultado de uma ferramenta. O que é injeção de prompt de fato, por que um modelo mais inteligente não a resolve por completo, e o que limita o dano quando ela acontece.',
        keywords: [
          'o que é injeção de prompt',
          'ataque de injeção de prompt explicado',
          'injeção de prompt indireta',
        ],
      },
      eyebrow: 'Fundamentos',
      title: 'O que é injeção de prompt?',
      summary:
        'Injeção de prompt é texto que não é seu e que ainda assim dá instruções ao modelo — escondido numa página web que ele lê, num documento que resume, ou no resultado de uma ferramenta que ele chama. Um modelo de linguagem não tem uma forma confiável e embutida de separar "as instruções do usuário" de "texto que por acaso parece uma instrução", porque ambos chegam como o mesmo tipo de entrada: palavras na janela de contexto.',
      sections: [
        {
          id: 'direct-vs-indirect-injection',
          heading: 'Duas formas: direta e indireta',
          paragraphs: [
            'Injeção direta é alguém digitando instruções direto no chat tentando anular o comportamento pretendido do sistema — pedindo ao modelo para ignorar suas instruções, revelar configuração oculta, ou agir fora do escopo pretendido. Injeção indireta é a forma com mais consequências: instruções plantadas em conteúdo que o modelo lê em seu nome — uma página web, um e-mail, um arquivo, a resposta de uma API — que nunca deveriam ser tratadas como comandos pelo modelo, mas que ele não tem forma confiável de distinguir delas.',
          ],
        },
        {
          id: 'why-a-smarter-model-does-not-solve-it',
          heading: 'Por que um modelo mais inteligente não resolve isso sozinho',
          paragraphs: [
            'O problema não é que os modelos não são inteligentes o suficiente — é arquitetural. Tudo que um modelo vê, seja sua solicitação ou texto obtido de uma fonte não confiável, se torna o mesmo tipo de sequência de tokens ao entrar na janela de contexto. Não existe um canal separado e à prova de manipulação para "instruções confiáveis" versus "conteúdo para ler". Um modelo mais capaz pode ficar melhor em reconhecer formulações comuns de injeção, mas uma instrução suficientemente disfarçada — espalhada pelo texto, formulada indiretamente, escondida na formatação — ainda pode passar, porque a arquitetura subjacente não tem um limite rígido para impor.',
          ],
        },
        {
          id: 'why-tool-calling-raises-the-stakes',
          heading: 'O risco cresce muito assim que um modelo pode chamar ferramentas',
          paragraphs: [
            'Um chatbot que só produz texto limita a injeção a uma saída ruim ou enganosa — irritante, mas contida. Assim que um modelo pode chamar ferramentas (veja como funciona a chamada de ferramentas) — enviar um e-mail, executar um comando, modificar um arquivo — uma injeção bem-sucedida pode virar uma ação real indesejada, não só uma frase ruim. É por isso que sistemas que combinam navegação web ou leitura de documentos com acesso a ferramentas carregam um risco de injeção bem maior que um chatbot simples.',
          ],
        },
        {
          id: 'output-filtering-and-scope-limit-not-eliminate',
          heading: 'Filtragem e escopo reduzem o risco; nenhum dos dois o elimina',
          paragraphs: [
            'Escanear o conteúdo obtido em busca de padrões de injeção conhecidos captura algumas tentativas, mas qualquer lista fixa de padrões pode ser burlada formulando a instrução de outro jeito — isso é um filtro, não uma garantia. O que reduz o dano real de forma mais confiável é limitar o que um modelo tem permissão de fazer independentemente do que foi dito a ele: restringir estreitamente o acesso a ferramentas, exigir aprovação antes de uma ação destrutiva ou voltada para fora, e nunca conceder a um modelo permissões permanentes mais amplas que a tarefa específica à sua frente.',
          ],
        },
        {
          id: 'treat-fetched-content-as-untrusted-input',
          heading:
            'O conteúdo que um modelo lê é entrada não confiável, não uma fonte neutra de fatos',
          paragraphs: [
            'Qualquer sistema que deixa um modelo ler conteúdo externo — um resultado de busca, uma página raspada, um documento enviado por um usuário — o expõe a instruções que ninguém pediu. A implicação prática é tratar esse conteúdo como você trataria entrada de usuário não validada em qualquer outro software: assumir que pode conter algo adversarial, e projetar o sistema ao redor para que uma injeção bem-sucedida tenha alcance limitado, em vez de assumir que a injeção não vai acontecer.',
          ],
        },
      ],
      faq: [
        {
          question: 'A injeção de prompt pode ser totalmente evitada?',
          answer:
            'Não, não com as arquiteturas de modelo atuais. Não existe uma separação embutida e à prova de manipulação entre as instruções de um usuário e o texto que um modelo lê de outro lugar, então filtragem e escopo reduzem o risco e limitam o dano, mas não garantem a prevenção.',
        },
        {
          question: 'Injeção de prompt é a mesma coisa que jailbreak?',
          answer:
            'Elas se sobrepõem mas não são idênticas. Jailbreak geralmente significa um usuário tentando diretamente fazer um modelo contornar suas próprias diretrizes. Injeção de prompt se refere mais a instruções escondidas em conteúdo que o modelo lê em nome do usuário, sem o conhecimento dele.',
        },
        {
          question: 'A injeção de prompt importa para um chatbot que não pode usar ferramentas?',
          answer:
            'O risco é menor — uma injeção bem-sucedida pode produzir uma resposta enganosa ou manipulada, mas não pode realizar uma ação além de gerar texto. O risco cresce substancialmente assim que um modelo pode chamar ferramentas que fazem algo fora da conversa.',
        },
        {
          question: 'Escanear conteúdo em busca de padrões de injeção é proteção suficiente?',
          answer:
            'Captura tentativas conhecidas e reconhecíveis, mas qualquer lista fixa de padrões pode ser burlada reformulando. A proteção real também vem de limitar o que um modelo tem permissão de fazer — escopo estreito de ferramentas e aprovação exigida para ações com consequências — não só da detecção.',
        },
      ],
      productNote:
        'O serviço de pesquisa do ClawAI escaneia o conteúdo web obtido em busca de padrões de injeção de prompt conhecidos e redige tokens com aparência de segredo antes que esse conteúdo chegue a um modelo — registrando o que detecta em vez de bloquear silenciosamente, já que nenhuma lista fixa de padrões consegue capturar toda tentativa. Essa camada de detecção é apenas uma parte de uma defesa que também depende de restringir quais ferramentas um modelo pode chamar em primeiro lugar.',
    },
  },
};
