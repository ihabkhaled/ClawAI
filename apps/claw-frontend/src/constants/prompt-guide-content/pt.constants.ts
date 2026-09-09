import { PromptGuideTopic } from '@/enums/prompt-guide-topic.enum';
import type { PromptGuideDictionary } from '@/types/prompt-guide.types';

export const PT_PROMPT_GUIDE_CONTENT: PromptGuideDictionary = {
  labels: {
    onThisPage: 'Nesta página',
    faqTitle: 'Perguntas frequentes',
    relatedTitle: 'Para onde ir a seguir',
    lastReviewed: 'Última revisão',
    backToHub: 'Todos os guias de prompts',
    ctaTitle: 'Pratique numa conversa real',
    ctaBody:
      'A ClawAI oferece um único espaço de trabalho para testar um prompt em modelos de todos os fornecedores a que se conecta, para que você veja por si mesmo o que muda.',
    startFree: 'Comece no plano gratuito',
    seeFeatures: 'Veja o que a ClawAI faz',
  },
  hub: {
    seo: {
      title: 'Como escrever melhores prompts de IA',
      description:
        'Guias práticos e honestos para escrever prompts que geram melhores resultados — clareza, exemplos, raciocínio passo a passo, saída estruturada, prompts de sistema e como corrigir uma resposta ruim. Sem estatísticas inventadas, sem exagerar o que um prompt pode consertar.',
      keywords: [
        'como escrever prompts de IA',
        'guia de escrita de prompts',
        'noções básicas de engenharia de prompts',
      ],
    },
    eyebrow: 'Guias de prompts',
    title: 'Como escrever melhores prompts de IA',
    summary:
      'Um prompt é a instrução que você dá a um modelo, e a forma como você o escreve muda a resposta que você recebe — isso é verdade independentemente do modelo ou produto que você usa. Estes guias percorrem as técnicas que realmente ajudam: ser específico, dar exemplos, pedir raciocínio passo a passo, descrever o formato de saída que você quer e corrigir uma resposta que não acertou o alvo. Nenhuma delas torna um modelo correto ou garante um resultado; elas tornam mais provável que você obtenha o que realmente queria pedir.',
    topicsHeading: 'Escolha um guia',
    cardSummaries: {
      [PromptGuideTopic.WRITING_CLEAR_PROMPTS]:
        'Os fundamentos: contexto, restrições, formato e exemplos.',
      [PromptGuideTopic.FEW_SHOT_PROMPTING]:
        'Mostrando a um modelo o que você quer ao dar exemplos.',
      [PromptGuideTopic.CHAIN_OF_THOUGHT_PROMPTING]:
        'Pedindo a um modelo que trabalhe os passos antes de responder.',
      [PromptGuideTopic.PROMPTING_FOR_STRUCTURED_OUTPUT]:
        'Escrevendo o prompt que pede JSON, uma tabela ou outro formato fixo.',
      [PromptGuideTopic.SYSTEM_PROMPTS_VS_USER_PROMPTS]:
        'O que um prompt de sistema faz de diferente do que você digita no chat.',
      [PromptGuideTopic.ITERATING_ON_A_PROMPT]:
        'O que mudar quando a primeira resposta não está certa.',
      [PromptGuideTopic.PROMPTING_BY_TASK_TYPE]:
        'Como a abordagem certa muda entre código, escrita e análise.',
    },
  },
  topics: {
    [PromptGuideTopic.WRITING_CLEAR_PROMPTS]: {
      seo: {
        title: 'Como escrever um prompt de IA claro e específico',
        description:
          'Os fundamentos de um prompt que gera uma resposta útil: dar contexto, declarar restrições, nomear o formato desejado e adicionar um exemplo. Orientação prática, sem estatísticas inventadas.',
        keywords: [
          'como escrever um prompt claro',
          'fundamentos de prompts de IA',
          'escrita de prompts específicos',
        ],
      },
      eyebrow: 'Guias de prompts',
      title: 'Como escrever um prompt de IA claro e específico',
      summary:
        'A maioria das respostas decepcionantes remonta a um prompt que deixou de fora algo que o modelo não tinha como adivinhar — o público, as restrições, o formato ou o que "bom" significa. Este guia percorre as quatro coisas que vale a pena adicionar antes de enviar um prompt, mais ou menos na ordem em que importam.',
      sections: [
        {
          id: 'give-context',
          heading: 'Dê ao modelo o contexto que ele não consegue adivinhar',
          paragraphs: [
            'Um modelo responde com base no que está na conversa mais o que aprendeu durante o treinamento — ele não sabe para quem você está escrevendo, o que você já tentou, ou por que a tarefa importa, a menos que você diga. "Reescreva este e-mail" e "reescreva este e-mail para que um cliente já frustrado o leia como um pedido de desculpas, não como uma desculpa esfarrapada" são a mesma tarefa com uma quantidade diferente de contexto, e recebem respostas diferentes. O contexto não precisa ser longo; precisa incluir o único ou os dois fatos que mudariam a forma como uma pessoa faria a tarefa.',
          ],
        },
        {
          id: 'state-constraints',
          heading: 'Declare as restrições em vez de esperar que fiquem implícitas',
          paragraphs: [
            'Um limite de tamanho, um nível de leitura, um tom, algo a evitar mencionar, um prazo que a resposta precisa respeitar — um modelo aplica uma restrição se você a declarar, e caso contrário recorre a um padrão genérico que pode não se encaixar. "Mantenha abaixo de 150 palavras" e "evite jargão técnico" são ambas restrições que um modelo consegue seguir de forma confiável uma vez explícitas; nenhuma delas é algo que ele infere corretamente sozinho com qualquer consistência.',
          ],
        },
        {
          id: 'name-the-format',
          heading: 'Nomeie o formato de saída que você realmente quer',
          paragraphs: [
            'Uma lista com marcadores, um parágrafo curto, uma tabela, uma linha de assunto mais um corpo — pedir a forma desejada de antemão evita uma mensagem de acompanhamento pedindo para reformatar. Isso importa mais, não menos, quando a saída precisa ser processada por algo além de uma pessoa lendo; para esse caso, veja como pedir saída estruturada, linkado abaixo, que é o guia complementar mais aprofundado sobre este ponto.',
          ],
        },
        {
          id: 'add-an-example',
          heading: 'Adicione um exemplo quando uma descrição sozinha seria ambígua',
          paragraphs: [
            'Algumas coisas são mais fáceis de mostrar do que de descrever — um estilo próprio, um tom, um formato específico para uma tarefa recorrente. Um exemplo bem escolhido muitas vezes resolve uma ambiguidade que várias frases de descrição não resolveriam. Veja few-shot prompting, linkado abaixo, para saber como usar mais de um exemplo de forma deliberada, e quando vale a pena o comprimento extra no prompt.',
          ],
        },
      ],
      faq: [
        {
          question: 'Um prompt mais longo sempre gera uma resposta melhor?',
          answer:
            'Não — um prompt mais longo só ajuda se o comprimento extra for contexto, uma restrição ou um exemplo que o modelo de outra forma não teria. Encher um prompt com instruções repetidas ou enchimento não melhora a resposta e pode enterrar a parte que realmente importava.',
        },
        {
          question: 'Um prompt claro vai impedir que um modelo erre os fatos?',
          answer:
            'Não. Um prompt claro torna mais provável que o modelo entenda o que você está pedindo, mas não verifica fatos nem elimina a alucinação — veja por que a IA alucina, linkado abaixo, para o que realmente causa isso e por que o prompt sozinho não consegue corrigir isso.',
        },
        {
          question: 'Qual é a única coisa mais útil para adicionar a um prompt vago?',
          answer:
            'Geralmente o contexto: o único ou os dois fatos sobre o público, o objetivo ou a situação que uma pessoa precisaria para fazer bem a tarefa. Uma restrição ou um exemplo também ajudam, mas importam menos se o modelo ainda não sabe para quem é a resposta.',
        },
      ],
      productNote:
        'A ClawAI não reescreve seu prompt por você, mas um prompt mais claro rende mais com qualquer modelo para o qual você o direcione — inclusive através do roteamento Auto, que ainda responde com base no que você realmente pediu.',
    },
    [PromptGuideTopic.FEW_SHOT_PROMPTING]: {
      seo: {
        title: 'Few-shot prompting: dando exemplos a um modelo',
        description:
          'Como usar um ou mais exemplos num prompt para mostrar a um modelo o padrão desejado, em vez de apenas descrevê-lo — com orientação sobre quantos exemplos ajudam e quando zero-shot já é suficiente.',
        keywords: ['few-shot prompting', 'exemplos em prompts', 'one-shot vs few-shot prompting'],
      },
      eyebrow: 'Guias de prompts',
      title: 'Few-shot prompting: dando exemplos a um modelo',
      summary:
        'Few-shot prompting significa incluir um ou mais exemplos resolvidos no próprio prompt, para que o modelo possa seguir o padrão em vez de inferi-lo apenas de uma descrição. É uma das formas mais confiáveis de delimitar o que "bom" significa para uma tarefa que é mais fácil de mostrar do que de explicar.',
      sections: [
        {
          id: 'what-few-shot-means',
          heading: 'O que significam "few-shot" e "zero-shot"',
          paragraphs: [
            'Um prompt zero-shot pede um resultado sem nenhum exemplo incluído; um prompt one-shot inclui exatamente um; um prompt few-shot inclui vários. Os termos descrevem quantos exemplos estão no prompt, não uma afirmação sobre precisão — um prompt zero-shot bem escrito pode superar um prompt few-shot mal escolhido, já que os exemplos só ajudam se realmente representarem o que você quer.',
          ],
        },
        {
          id: 'when-examples-help-most',
          heading: 'Quando exemplos ajudam mais do que uma descrição mais longa ajudaria',
          paragraphs: [
            'Exemplos merecem seu lugar quando a tarefa tem um formato, tom ou padrão que é genuinamente mais fácil de demonstrar do que de descrever — classificar dados em categorias difíceis de definir em palavras, imitar uma voz de escrita específica, ou seguir um modelo com particularidades que uma descrição simples deixaria passar. Para uma tarefa que já é inequívoca a partir de uma instrução curta, um exemplo adiciona comprimento sem adicionar informação.',
          ],
        },
        {
          id: 'choosing-good-examples',
          heading: 'O que torna um exemplo útil, não apenas presente',
          paragraphs: [
            'Um exemplo só é tão bom quanto representativo for da tarefa real — um exemplo fácil ou incomum pode ensinar o padrão errado. Alguns exemplos bem escolhidos que cobrem a gama de casos que você realmente espera, incluindo um caso extremo se for provável, tende a funcionar melhor do que vários exemplos que parecem todos iguais. Se seus exemplos discordarem entre si em tom ou formato, espere que o modelo os misture em vez de escolher o que você quis dizer.',
          ],
        },
      ],
      faq: [
        {
          question: 'Quantos exemplos um prompt few-shot deve incluir?',
          answer:
            'Não há um número fixo — o suficiente para cobrir a gama de casos que você espera, geralmente entre dois e cinco, e mais apenas se a tarefa realmente variar mais do que isso. Adicionar exemplos que parecem todos iguais raramente ajuda além do primeiro ou segundo.',
        },
        {
          question: 'O few-shot prompting é sempre melhor do que o zero-shot?',
          answer:
            'Não. Não está estabelecido como um ganho de precisão garantido e esta página não vai afirmar isso — um prompt zero-shot claro sobre uma tarefa bem definida pode se sair igualmente bem, e os exemplos ajudam principalmente quando a tarefa é mais fácil de mostrar do que de descrever.',
        },
        {
          question: 'Posso combinar exemplos few-shot com uma instrução passo a passo?',
          answer:
            'Sim — elas tratam de coisas diferentes. Os exemplos mostram o padrão ou formato desejado; pedir raciocínio passo a passo muda como o modelo trabalha em direção à resposta. Veja chain-of-thought prompting, linkado abaixo, para a segunda técnica.',
        },
      ],
      productNote:
        'Um prompt few-shot funciona da mesma forma em todos os modelos para os quais a ClawAI roteia — os exemplos vivem no seu prompt, não numa configuração, então eles acompanham a conversa independentemente de qual fornecedor a responde.',
    },
    [PromptGuideTopic.CHAIN_OF_THOUGHT_PROMPTING]: {
      seo: {
        title: 'Chain-of-thought prompting: pedindo a um modelo que raciocine passo a passo',
        description:
          'O que é o chain-of-thought prompting, quando pedir a um modelo que trabalhe os passos antes de responder realmente ajuda, e por que isso não garante um resultado correto.',
        keywords: [
          'chain-of-thought prompting',
          'prompting passo a passo',
          'técnica de prompt de raciocínio de IA',
        ],
      },
      eyebrow: 'Guias de prompts',
      title: 'Chain-of-thought prompting: pedindo a um modelo que raciocine passo a passo',
      summary:
        'O chain-of-thought prompting pede a um modelo que trabalhe um problema em etapas — decompondo-o, verificando resultados intermediários — antes de dar uma resposta final, em vez de produzir uma resposta imediata na primeira tentativa. É uma técnica real e útil para o tipo certo de tarefa, e não garante um raciocínio correto por si só.',
      sections: [
        {
          id: 'what-it-is',
          heading: 'O que pedir raciocínio passo a passo realmente faz',
          paragraphs: [
            'Um prompt como "trabalhe isso passo a passo" ou "mostre seu raciocínio antes de dar uma resposta final" pede ao modelo que exponha etapas intermediárias em vez de saltar direto para uma conclusão. Para um problema com vários passos, isso pode revelar um erro numa etapa intermediária que de outra forma ficaria enterrado dentro de uma única resposta final de aparência confiante — e dá a você algo concreto para verificar, em vez de apenas um resultado para confiar.',
          ],
        },
        {
          id: 'when-it-helps',
          heading: 'Quando ajuda, e quando é desnecessário',
          paragraphs: [
            'O prompting passo a passo tende a ajudar mais em problemas com várias etapas dependentes, várias restrições a satisfazer ao mesmo tempo, ou um cálculo que vale a pena verificar duas vezes — um problema de palavras com várias partes, uma decisão com vários fatores, uma lógica que precisa se manter coerente. Uma pergunta curta e de uma única etapa raramente se beneficia disso, e pedir mesmo assim só adiciona comprimento sem mudar a resposta. Veja como escolher um modelo para raciocínio complexo, linkado abaixo, para saber como isso se conecta à escolha de um modelo construído exatamente para esse tipo de tarefa.',
          ],
        },
        {
          id: 'what-it-does-not-guarantee',
          heading: 'O que isso não garante',
          paragraphs: [
            'Pedir a um modelo que raciocine passo a passo não garante uma resposta correta, e uma cadeia de etapas confiante e bem estruturada ainda pode chegar à conclusão errada — as etapas extras tornam um erro mais fácil de detectar, não impossível de cometer. Isso é consistente com por que a IA alucina, linkado abaixo: um modelo pode produzir um raciocínio fluente e de aparência plausível que ainda está errado, então uma resposta passo a passo vale a pena verificar em qualquer coisa que importe, não aceitar de olhos fechados só porque parece metódica.',
          ],
        },
      ],
      faq: [
        {
          question: 'O chain-of-thought prompting garante uma resposta correta?',
          answer:
            'Não — ele não garante raciocínio correto, e uma resposta passo a passo ainda pode chegar a uma conclusão errada. Ele tende a tornar um erro mais fácil de detectar nas etapas intermediárias, o que é diferente de impedir o erro.',
        },
        {
          question: 'Quando devo pedir a um modelo que mostre seu raciocínio?',
          answer:
            'Em problemas com várias etapas ou restrições dependentes, onde um erro intermediário de outra forma ficaria escondido dentro de uma única resposta final. Uma pergunta curta e de uma única etapa raramente precisa disso.',
        },
        {
          question: 'Isso é o mesmo que usar um modelo focado em raciocínio?',
          answer:
            'Relacionado, mas não idêntico — este guia trata de como você formula um prompt para qualquer modelo; escolher um modelo para raciocínio complexo, linkado abaixo, trata de qual modelo é construído para trabalhar as etapas por padrão. As duas coisas podem ser combinadas.',
        },
      ],
      productNote:
        'O modo de roteamento High Reasoning da ClawAI favorece um modelo adequado para trabalhar um problema em etapas, o que combina naturalmente com um prompt passo a passo — mas a técnica desta página funciona com qualquer modelo para o qual você a direcione.',
    },
    [PromptGuideTopic.PROMPTING_FOR_STRUCTURED_OUTPUT]: {
      seo: {
        title: 'Como escrever um prompt que pede saída estruturada',
        description:
          'Orientação prática para escrever um prompt que peça de forma confiável JSON, uma tabela ou outro formato fixo — o texto complementar a o que são saídas de IA estruturadas e por que o prompt sozinho não garante uma estrutura válida.',
        keywords: [
          'prompt para saída JSON',
          'prompting para saída estruturada',
          'como pedir uma tabela à IA',
        ],
      },
      eyebrow: 'Guias de prompts',
      title: 'Como escrever um prompt que pede saída estruturada',
      summary:
        'Este guia é o complemento prático de "como escrever o prompt" a o que são saídas de IA estruturadas, linkado abaixo, que cobre o mecanismo técnico — esta página assume que você já quer saída estruturada e foca em como pedi-la bem. Ela não reexplica o mecanismo subjacente e mantém consistência com o que aquela página já diz sobre o que um prompt simples pode e não pode garantir.',
      sections: [
        {
          id: 'describe-the-shape-exactly',
          heading: 'Descreva a forma exata que você quer, não apenas o nome do formato',
          paragraphs: [
            'Dizer "retorne isso como JSON" é um começo, mas nomear os campos, sua ordem e seus tipos é o que realmente elimina a ambiguidade — "retorne um objeto JSON com um campo de string chamado title e um campo de array chamado steps, onde cada step é uma string" deixa muito menos para o modelo adivinhar do que "retorne JSON com o title e os steps." O mesmo se aplica a uma tabela: nomeie as colunas e o que pertence a cada uma, em vez de assumir que o modelo escolherá a mesma divisão que você tem em mente.',
          ],
        },
        {
          id: 'show-an-example-of-the-shape',
          heading: 'Mostre um exemplo da saída exata que você quer',
          paragraphs: [
            'Um único exemplo da forma finalizada — uma pequena amostra de objeto JSON, ou uma linha da tabela — muitas vezes elimina mais ambiguidade do que outro parágrafo de descrição, pelo mesmo motivo que um exemplo ajuda no few-shot prompting, linkado abaixo. Isso importa mais quando o formato tem uma particularidade fácil de descrever de forma imprecisa, como se um campo é opcional ou como um valor ausente deve ser representado.',
          ],
        },
        {
          id: 'plain-prompting-has-limits',
          heading: 'O que um prompt bem escrito não garante aqui',
          paragraphs: [
            'Um prompt cuidadosamente escrito torna mais provável uma saída válida e bem formada, mas não garante isso — um modelo ainda pode retornar JSON malformado, um campo extra, ou texto envolvendo a estrutura que você pediu, especialmente numa resposta mais longa ou mais complexa. Veja o que são saídas de IA estruturadas, linkado abaixo, para os mecanismos técnicos — como a geração restrita por esquema — que existem especificamente porque o prompt sozinho não é uma garantia confiável, e para o que a ClawAI faz de diferente de apenas pedir educadamente num prompt.',
          ],
        },
      ],
      faq: [
        {
          question: 'Pedir educadamente num prompt é suficiente para garantir um JSON válido?',
          answer:
            'Não — um prompt bem escrito torna isso mais provável, não certo. Veja o que são saídas de IA estruturadas, linkado abaixo, para os mecanismos que existem porque o prompt sozinho não garante de forma confiável uma estrutura válida.',
        },
        {
          question: 'Devo descrever o formato ou mostrar um exemplo?',
          answer:
            'Ambos, quando o formato tiver qualquer ambiguidade — uma descrição precisa dos campos mais um exemplo da forma finalizada cobre mais casos do que qualquer um dos dois sozinho. Veja few-shot prompting, linkado abaixo, para saber como escolher um bom exemplo.',
        },
        {
          question: 'Qual é a diferença entre este guia e o que são saídas de IA estruturadas?',
          answer:
            'Aquela página explica o mecanismo técnico por trás de uma saída estruturada confiável; esta página é o complemento prático — como escrever o próprio prompt. Elas são feitas para serem lidas juntas, não como duplicatas uma da outra.',
        },
      ],
      productNote:
        'Para saída que precisa ser confiavelmente válida, os mecanismos de saída estruturada da ClawAI (veja o que são saídas de IA estruturadas, linkado abaixo) vão além da simples redação do prompt — este guia cobre a metade de escrita de prompt dessa imagem.',
    },
    [PromptGuideTopic.SYSTEM_PROMPTS_VS_USER_PROMPTS]: {
      seo: {
        title: 'Prompts de sistema vs prompts de usuário: o que cada um faz',
        description:
          'A diferença entre um prompt de sistema e as mensagens que você digita numa conversa — para que serve cada um, quando usar qual, e como eles funcionam juntos.',
        keywords: [
          'prompt de sistema vs prompt de usuário',
          'o que é um prompt de sistema',
          'papéis de prompt de IA explicados',
        ],
      },
      eyebrow: 'Guias de prompts',
      title: 'Prompts de sistema vs prompts de usuário: o que cada um faz',
      summary:
        'Uma conversa com um modelo geralmente é construída a partir de mais de um tipo de mensagem: um prompt de sistema que define instruções permanentes para toda a conversa, e prompts de usuário — o que você realmente digita — que pedem algo específico dentro dela. Saber qual usar para uma determinada instrução evita repetição e mantém uma conversa longa mais consistente.',
      sections: [
        {
          id: 'what-a-system-prompt-is-for',
          heading: 'Para que serve um prompt de sistema',
          paragraphs: [
            'Um prompt de sistema define uma instrução que se aplica a toda a conversa, e não a uma mensagem nela — uma persona a manter, um tom a seguir, uma regra a sempre respeitar ("sempre responda em português formal" ou "nunca sugira uma dosagem específica"). Ele é definido uma vez, tipicamente antes de a conversa começar, e um modelo o trata como orientação permanente, e não como algo a negociar a cada nova mensagem.',
          ],
        },
        {
          id: 'what-a-user-prompt-is-for',
          heading: 'Para que serve um prompt de usuário',
          paragraphs: [
            'Um prompt de usuário é o que você digita a cada turno da conversa — a pergunta ou tarefa específica daquela mensagem. É onde a orientação sobre contexto, restrições, formato e exemplos de como escrever um prompt claro e específico majoritariamente se aplica, já que um prompt de usuário costuma tratar de uma única coisa concreta, e não de uma regra permanente para toda a conversa.',
          ],
        },
        {
          id: 'when-to-use-which',
          heading: 'Quando colocar uma instrução no prompt de sistema em vez de repeti-la',
          paragraphs: [
            'Uma instrução que deveria valer para toda mensagem — um tom, uma persona, um limite — pertence ao prompt de sistema, para que você não a repita a cada turno e arrisque vê-la ser descartada ou contradita no meio de uma conversa longa. Um pedido pontual que só se aplica à mensagem atual pertence ao prompt de usuário. Um prompt de sistema não é, por si só, uma barreira de segurança; veja o que é injeção de prompt, linkado abaixo, para saber por que uma instrução em qualquer um dos dois lugares ainda pode ser sobreposta por conteúdo adversário em outro ponto da conversa.',
          ],
        },
      ],
      faq: [
        {
          question: 'Uma mensagem de usuário pode sobrepor um prompt de sistema?',
          answer:
            'Depende de como um produto específico lida com isso, e isso não é uma garantia consolidada em geral — um prompt de sistema é pensado como orientação permanente, não como uma regra inquebrável. Veja o que é injeção de prompt, linkado abaixo, para saber por que tratá-lo como uma barreira de segurança absoluta é um erro.',
        },
        {
          question: 'Preciso de um prompt de sistema para uma pergunta simples e pontual?',
          answer:
            'Não — um prompt de sistema se justifica quando uma instrução deve se aplicar a toda a conversa. Para uma única pergunta, colocar tudo no prompt de usuário é mais simples e igualmente eficaz.',
        },
        {
          question:
            'Que tipo de instrução pertence a um prompt de sistema em vez de um prompt de usuário?',
          answer:
            'Uma regra permanente que não deveria precisar ser repetida — uma persona, um tom, um limite que o modelo deve sempre respeitar. Um pedido específico e pontual pertence ao prompt de usuário.',
        },
      ],
      productNote:
        'A configuração de prompt de sistema da ClawAI se aplica a toda a conversa da mesma forma em todos os fornecedores para os quais roteia, então uma instrução permanente não precisa ser reescrita por modelo.',
    },
    [PromptGuideTopic.ITERATING_ON_A_PROMPT]: {
      seo: {
        title: 'O que fazer quando a primeira resposta de IA não está certa',
        description:
          'Uma abordagem prática para depurar um prompt que não gerou a resposta desejada — diagnosticando o que estava faltando em vez de apenas repetir o pedido, e quando recomeçar em vez de remendar.',
        keywords: [
          'melhorar um prompt de IA',
          'corrigir uma resposta ruim de IA',
          'depuração de prompts de IA',
        ],
      },
      eyebrow: 'Guias de prompts',
      title: 'O que fazer quando a primeira resposta de IA não está certa',
      summary:
        'A primeira resposta a um prompt raramente é a última palavra — a maioria das pessoas obtém um resultado melhor ao tratar uma resposta decepcionante como informação sobre o que faltava no prompt, e então ajustar, em vez de repetir o mesmo pedido esperando algo diferente. Este guia percorre como diagnosticar uma resposta ruim e decidir o que mudar.',
      sections: [
        {
          id: 'diagnose-before-you-rewrite',
          heading: 'Diagnostique o que deu errado antes de reescrever todo o prompt',
          paragraphs: [
            'Uma resposta decepcionante geralmente se encaixa numa de poucas categorias: faltou contexto que você tinha mas não declarou, ignorou uma restrição, usou o formato errado, ou está confiantemente errada sobre um fato. Nomear qual delas aconteceu aponta para uma correção específica — uma restrição ausente pede que se adicione a restrição explicitamente, não que se reescreva todo o prompt do zero ou se repita com mais força.',
          ],
        },
        {
          id: 'add-what-was-missing',
          heading: 'Adicione exatamente o que estava faltando, não mais instruções em geral',
          paragraphs: [
            'Uma vez que você saiba o que estava faltando, adicione exatamente aquilo: a restrição, o exemplo, o pedaço de contexto ou a descrição de formato que teria deixado o pedido claro. Veja como escrever um prompt claro e específico, linkado abaixo, para os fundamentos que esta etapa geralmente utiliza — a maior parte da iteração é aplicar o mesmo punhado de coisas que o primeiro prompt deixou de fora.',
          ],
        },
        {
          id: 'know-when-to-start-over',
          heading: 'Saiba quando começar um prompt novo em vez de remendar',
          paragraphs: [
            'Uma longa sequência de pequenas correções pode deixar uma conversa carregando instruções contraditórias que o modelo agora está tentando conciliar — nesse ponto, um prompt novo e completo que declara tudo o que você aprendeu que precisa é geralmente mais rápido e confiável do que mais um remendo. Isso também vale a pena lembrar quando a resposta está confiantemente errada sobre um fato, em vez de apenas fora do formato: remendar as palavras não vai consertar isso, já que não é um problema de redação — veja por que a IA alucina, linkado abaixo, para o que realmente está acontecendo nesse caso.',
          ],
        },
      ],
      faq: [
        {
          question: 'A resposta está bem escrita, mas factualmente errada — como corrijo o prompt?',
          answer:
            'Você quase não consegue corrigir isso reformulando o prompt, porque não é um problema de redação. Veja por que a IA alucina, linkado abaixo, para o que realmente está acontecendo e o que de fato ajuda, como pedir ao modelo que cite fontes verificáveis ou usar um modo de pesquisa que busca informações.',
        },
        {
          question: 'Devo continuar corrigindo na mesma conversa ou começar uma nova?',
          answer:
            'Qualquer uma das duas pode funcionar, mas uma longa cadeia de pequenas correções corre o risco de deixar instruções contraditórias para trás. Se uma conversa já teve várias correções, um prompt novo e completo costuma ser mais confiável do que mais um remendo.',
        },
        {
          question: 'Quantas vezes devo tentar antes de desistir de uma abordagem de prompt?',
          answer:
            'Não há um número fixo — mas se duas ou três correções específicas e diagnosticadas não ajudaram, o problema pode não ser o prompt de forma alguma. Veja como escolher um modelo para sua tarefa, linkado abaixo, para saber se a tarefa pode precisar de um tipo diferente de modelo.',
        },
      ],
      productNote:
        'Toda conversa na ClawAI mantém seu histórico, então você pode iterar num prompt ao longo de vários turnos e ver exatamente o que mudou de uma resposta para a próxima.',
    },
    [PromptGuideTopic.PROMPTING_BY_TASK_TYPE]: {
      seo: {
        title: 'Como o prompting muda para código, escrita e análise',
        description:
          'Como a abordagem certa de prompting muda entre tarefas de código, tarefas de escrita e tarefas analíticas — e como isso se conecta a escolher o modelo certo para cada uma, não apenas as palavras certas.',
        keywords: [
          'prompting para código vs escrita',
          'prompts de IA por tipo de tarefa',
          'prompting para tarefas de análise',
        ],
      },
      eyebrow: 'Guias de prompts',
      title: 'Como o prompting muda para código, escrita e análise',
      summary:
        'As técnicas deste hub — clareza, exemplos, raciocínio passo a passo, formato — se aplicam em todo lugar, mas quais delas importam mais muda conforme o tipo de tarefa. Este guia percorre o que tende a ajudar mais para código, para escrita e para análise, e faz referência ao conjunto sobre ajuste de modelo para o lado do modelo da mesma questão, em vez de reexplicar essas distinções de tarefa aqui.',
      sections: [
        {
          id: 'prompting-for-code',
          heading: 'Prompting para código: precisão acima de persuasão',
          paragraphs: [
            'Um prompt de código se beneficia mais da precisão — a assinatura exata da função, a linguagem e a versão, a restrição que o código precisa satisfazer, um exemplo da entrada e saída esperadas. Um enquadramento vago que seria inofensivo num prompt de escrita ("deixe bom") dá a uma tarefa de código quase nada com que trabalhar, já que não há uma única forma correta para um pedido assim.',
          ],
        },
        {
          id: 'prompting-for-writing',
          heading: 'Prompting para escrita: público, tom e um bom exemplo',
          paragraphs: [
            'Um prompt de escrita ou edição se beneficia mais da orientação sobre contexto e restrição de como escrever um prompt claro e específico, linkado abaixo — para quem é o texto, o tom que ele deve manter, e uma restrição de tamanho ou estrutura. Um exemplo da voz-alvo, conforme few-shot prompting, linkado abaixo, muitas vezes rende mais aqui do que uma descrição mais longa do tom.',
          ],
        },
        {
          id: 'prompting-for-analysis',
          heading: 'Prompting para análise: pedindo o raciocínio, não só a conclusão',
          paragraphs: [
            'Uma tarefa analítica — pesar opções, interpretar dados, trabalhar uma decisão com vários fatores — geralmente se beneficia do chain-of-thought prompting, linkado abaixo: pedir ao modelo que exponha seu raciocínio em vez de apenas declarar uma conclusão dá a você algo para verificar, e tende a revelar um fator perdido ou uma suposição fraca. Esse é o mesmo tipo de tarefa que escolher um modelo para raciocínio complexo, linkado abaixo, que cobre qual modelo é construído exatamente para isso, em vez de repetir essa orientação aqui.',
          ],
        },
      ],
      faq: [
        {
          question: 'Uma técnica de prompting funciona melhor nos três tipos de tarefa?',
          answer:
            'Não — a precisão importa mais para código, o público e o tom importam mais para escrita, e pedir raciocínio visível importa mais para análise. A maioria das tarefas se beneficia de uma mistura, ponderada para o que a tarefa realmente precisa.',
        },
        {
          question: 'O modelo que eu escolho importa tanto quanto a forma como escrevo o prompt?',
          answer:
            'Ambos importam, e são alavancas diferentes — este guia trata de redação; veja como escolher um modelo para sua tarefa, linkado abaixo, para o lado de ajuste de modelo em tarefas de código, escrita e raciocínio pesado especificamente.',
        },
        {
          question: 'Um prompt de código é só um prompt de escrita com palavras diferentes?',
          answer:
            'Não — uma tarefa de código geralmente tem uma única forma correta ou funcional, então a precisão sobre o requisito exato importa mais do que na maioria dos textos, onde várias formulações diferentes podem ser boas.',
        },
      ],
      productNote:
        'Os modos de roteamento da ClawAI já tendem a favorecer um modelo adequado por tarefa — Auto e High Reasoning para trabalho analítico, por exemplo — então um prompt bem escrito e uma rota adequada trabalham juntos, e não como escolhas separadas.',
    },
  },
};
