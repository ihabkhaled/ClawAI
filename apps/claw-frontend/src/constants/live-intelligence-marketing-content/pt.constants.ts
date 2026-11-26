import { LiveMarketingPlatformGroup } from '@/enums/live-marketing-platform-group.enum';
import type {
  LiveIntelligenceMarketingDictionary,
  LiveIntelligenceMarketingSeo,
} from '@/types/live-intelligence-marketing-content.types';

/**
 * The Portuguese copy for the public Live & Video Intelligence pages. Every claim mirrors the
 * English source in `en.constants.ts`; no price or free-minute count is written here.
 */
export const PT_LIVE_INTELLIGENCE_MARKETING_CONTENT: LiveIntelligenceMarketingDictionary = {
  eyebrow: 'Novidade no ClawAI: Live & Video Intelligence',
  title: 'Qualquer transmissão ao vivo ou vídeo, entendido no seu idioma',
  intro:
    'Cole o link de uma transmissão ao vivo ou de um vídeo gravado de mais de 50 plataformas. A ClawAI acompanha tudo com legendas ao vivo e um feed contínuo de resumos e destaques, ou transforma o vídeo inteiro em um relatório claro com um único clique. Tudo roda nos servidores da ClawAI, então funciona em qualquer dispositivo, inclusive no seu celular.',
  openCta: 'Cole um link agora',
  signUpCta: 'Criar conta grátis',
  howItWorksCta: 'Veja como funciona',
  videosTitle: 'Veja funcionando',
  videosIntro:
    'Dois clipes curtos do produto real. Toque para reproduzir: eles começam sem som e em loop, para você assistir em qualquer lugar.',
  videos: [
    {
      title: 'O painel Análise com IA ao lado de uma transmissão de jogo',
      body: 'Enquanto uma transmissão de jogo roda, o painel Análise com IA mantém um feed contínuo do que acontece na tela e do que é dito.',
    },
    {
      title: 'Um telejornal ao vivo em árabe, com legendas em inglês no celular',
      body: 'Gravação feita no celular de um telejornal ao vivo no YouTube: o apresentador fala árabe, a legenda aparece em inglês e o Feed inteligente resume a notícia até aquele momento.',
    },
  ],
  stepsTitle: 'Como funciona, em quatro passos',
  stepsIntro: 'Do link colado às anotações que você pode guardar. Não é preciso instalar nada.',
  steps: [
    {
      title: 'Cole um link',
      body: 'Cole o endereço de uma transmissão ao vivo ou de um vídeo gravado: um reel, um post, um short ou uma live passada. A ClawAI verifica se consegue ler a fonte antes de começar.',
    },
    {
      title: 'Escolha o idioma e o modo',
      body: 'Escolha o idioma em que quer ler, entre os 13 idiomas do app, e um modo de análise: Áudio, Áudio + visão ou Automático inteligente.',
    },
    {
      title: 'Acompanhe ao vivo ou clique em Resumir vídeo',
      body: 'Acompanhe com legendas e um Feed inteligente de resumos, destaques e notas visuais. Em um vídeo gravado, você também pode clicar em Resumir vídeo e receber o relatório completo de uma vez.',
    },
    {
      title: 'Exporte e compartilhe',
      body: 'Tudo fica salvo no seu histórico. Exporte em PDF, Markdown ou TXT e compartilhe com quem precisar.',
    },
  ],
  screenshotsTitle: 'Como fica no celular',
  screenshotsIntro: 'Telas reais do app, capturadas em um celular com o tema escuro.',
  screenshots: [
    {
      title: 'Colando o link de uma transmissão ao vivo ou de um vídeo',
      body: 'Um único campo aceita links de qualquer plataforma compatível. Escolha o idioma e o modo e comece.',
    },
    {
      title: 'O feed ao vivo com legendas, resumos e destaques',
      body: 'As legendas chegam alguns segundos depois da fala, enquanto o Feed inteligente mantém resumos, destaques e notas visuais sempre atualizados.',
    },
    {
      title: 'Um resumo de vídeo com um clique',
      body: 'O relatório pronto: um resumo geral, os momentos principais com marcação de tempo, destaques e a transcrição completa.',
    },
  ],
  outcomesTitle: 'O que ele faz por você',
  outcomes: [
    {
      title: 'Coloque em dia uma live de duas horas em minutos',
      body: 'Leia o resumo e os momentos principais em vez de passar a gravação inteira. Cada momento tem marcação de tempo, para você pular direto para o que importa.',
    },
    {
      title: 'Acompanhe uma transmissão em outro idioma no seu',
      body: 'Uma coletiva de imprensa em japonês, a narração de uma partida em espanhol, o noticiário em árabe: leia as legendas e os resumos no idioma que você escolher.',
    },
    {
      title: 'Nunca perca o momento decisivo',
      body: 'Os destaques são selecionados enquanto a transmissão acontece, então você pode desviar o olhar e ainda saber o que acabou de rolar.',
    },
    {
      title: 'Anotações para reuniões, aulas, notícias e games',
      body: 'Transforme um webinar público, uma aula gravada, uma cobertura de notícias ao vivo ou um torneio em anotações que você pode pesquisar, guardar e exportar.',
    },
    {
      title: 'Funciona em qualquer dispositivo',
      body: 'A ClawAI lê a transmissão nos próprios servidores. Não é preciso compartilhar a tela, então funciona do mesmo jeito no celular, no tablet ou no computador.',
    },
    {
      title: 'Seu histórico, suas exportações',
      body: 'O que você assistiu e cada resumo que você gerou ficam no seu histórico, prontos para exportar em PDF, Markdown ou TXT.',
    },
  ],
  waysTitle: 'Duas formas de usar',
  waysIntro:
    'Acompanhe uma transmissão enquanto ela acontece ou entregue um vídeo gravado à ClawAI e receba o relatório de uma só vez.',
  ways: [
    {
      title: 'Análise ao vivo: assista junto',
      body: 'As legendas chegam cerca de 7 a 12 segundos depois da fala, e um Feed inteligente contínuo acrescenta resumos, destaques e notas visuais. Plataformas com chat ao vivo ganham uma aba de chat. Em um vídeo gravado, a ClawAI reproduz desde o início em velocidade normal e a análise acompanha.',
    },
    {
      title: 'Resumir vídeo: um clique',
      body: 'Em um vídeo gravado, a ClawAI processa o vídeo inteiro de uma vez e devolve um relatório completo: um resumo geral, os momentos principais com marcação de tempo, destaques e a transcrição completa. Ele fica salvo no seu histórico e pode ser exportado em PDF, Markdown ou TXT.',
    },
  ],
  waysTableCaption: 'Análise ao vivo e resumo com um clique, lado a lado',
  waysTableAspect: 'O que você recebe',
  waysTableLive: 'Análise ao vivo',
  waysTableSummary: 'Resumir vídeo',
  waysRows: [
    {
      label: 'Funciona com',
      live: 'Transmissões ao vivo e vídeos gravados',
      summary: 'Vídeos gravados de até 3 horas',
    },
    {
      label: 'Tempo',
      live: 'Acompanha o vídeo em tempo real, legendas cerca de 7 a 12 segundos atrás',
      summary: 'O vídeo inteiro é processado de uma vez',
    },
    {
      label: 'Resultado',
      live: 'Legendas e um Feed inteligente de resumos, destaques e notas visuais',
      summary:
        'Resumo geral, momentos principais com marcação de tempo, destaques e transcrição completa',
    },
    {
      label: 'Chat ao vivo',
      live: 'Uma aba de chat nas plataformas que têm chat',
      summary: 'Não é necessário',
    },
    {
      label: 'Guardar',
      live: 'Salvo no seu histórico, exportação em PDF, Markdown ou TXT',
      summary: 'Salvo no seu histórico, exportação em PDF, Markdown ou TXT',
    },
  ],
  modesTitle: 'Três modos de análise',
  modesIntro: 'O modo define no que a ClawAI presta atenção. Você escolhe antes de começar.',
  modes: [
    {
      title: 'Áudio',
      body: 'Legendas, resumos e destaques a partir do que é dito. Ideal para palestras, entrevistas, podcasts, aulas e noticiários.',
    },
    {
      title: 'Áudio + visão',
      body: 'Acrescenta o que aparece na tela, como slides, gráficos, placares ou gameplay, para que as anotações descrevam o que você vê além do que você ouve.',
    },
    {
      title: 'Automático inteligente',
      body: 'Parte do áudio e olha a imagem quando ela provavelmente importa, por exemplo quando quem fala fica em silêncio ou a cena muda.',
    },
  ],
  researchNote:
    'Pesquisa: um resumo pode fazer uma busca na web para acrescentar contexto, como quem é um palestrante ou a que evento algo se refere.',
  languagesTitle: 'Leia no seu idioma',
  languagesParagraphs: [
    'Escolha qualquer um dos 13 idiomas do app: inglês, árabe, alemão, espanhol, persa, francês, hindi, italiano, japonês, português, russo, tailandês ou chinês. Quem fala pode usar qualquer idioma.',
    'Quando quem fala já usa o seu idioma, você lê as palavras exatas. Quando não, as legendas, os resumos e os destaques são traduzidos, e a tradução aparece no lugar do original.',
  ],
  platformsTitle: 'Mais de 50 plataformas',
  platformsBody:
    'YouTube, Twitch, Kick, Facebook, TikTok, Instagram, X (Twitter), Bilibili, Niconico e muitas outras. Funciona tanto com transmissões ao vivo quanto com vídeos gravados.',
  platformsCta: 'Ver todas as plataformas',
  limitsTitle: 'Bom saber',
  limits: [
    {
      title: 'Apenas vídeos e transmissões públicos',
      body: 'A ClawAI só consegue ler vídeos e transmissões públicos. Algumas plataformas, ou vídeos específicos, podem recusar o acesso a partir de um servidor; quando isso acontece, a ClawAI avisa com clareza em vez de fingir que deu certo.',
    },
    {
      title: 'Vídeos gravados de até 3 horas',
      body: 'Um vídeo gravado pode ter até 3 horas, tanto na análise ao vivo quanto no resumo com um clique.',
    },
    {
      title: 'As legendas chegam alguns segundos depois',
      body: 'A fala é transcrita em trechos curtos, então as legendas chegam cerca de 7 a 12 segundos depois de serem ditas. Não são legendas instantâneas.',
    },
    {
      title: 'Minutos grátis todo mês, minutos pagos só com sua aprovação',
      body: 'Todos os planos incluem minutos grátis todo mês. Depois disso, os minutos só são cobrados quando você aprova. Um resumo com um clique conta a duração do vídeo em minutos.',
    },
  ],
  faqTitle: 'Perguntas frequentes',
  faq: [
    {
      question: 'Funciona no celular?',
      answer:
        'Sim. A ClawAI lê a transmissão ou o vídeo nos próprios servidores, então não é preciso compartilhar a tela. Funciona igualmente em celulares, tablets e computadores.',
    },
    {
      question: 'Em quais idiomas posso ler as legendas?',
      answer:
        'Em qualquer um dos 13 idiomas do app: inglês, árabe, alemão, espanhol, persa, francês, hindi, italiano, japonês, português, russo, tailandês e chinês. Quem fala pode usar qualquer idioma. Se já falar o seu idioma, você vê as palavras exatas; caso contrário, a tradução aparece no lugar do original.',
    },
    {
      question: 'Funciona com vídeos gravados ou só com transmissões ao vivo?',
      answer:
        'Com os dois. Cole uma transmissão ao vivo ou um vídeo gravado, como um reel, um post, um short ou uma live passada. Com um vídeo gravado, você pode acompanhar desde o início em velocidade normal ou clicar em Resumir vídeo para receber o relatório completo de uma vez.',
    },
    {
      question: 'Qual pode ser a duração de um vídeo?',
      answer: 'Um vídeo gravado pode ter até 3 horas.',
    },
    {
      question: 'O que vem em um resumo com um clique?',
      answer:
        'Um resumo geral, os momentos principais com marcação de tempo, destaques e a transcrição completa. Ele fica salvo no seu histórico e pode ser exportado em PDF, Markdown ou TXT.',
    },
    {
      question: 'Como é cobrado?',
      answer:
        'Todos os planos incluem minutos grátis todo mês. Depois disso, você paga por minuto, e só depois de aprovar. Um resumo com um clique conta a duração do vídeo em minutos.',
    },
    {
      question: 'As legendas são em tempo real?',
      answer:
        'Quase. As legendas chegam cerca de 7 a 12 segundos depois da fala, porque o áudio é transcrito em trechos curtos. Os resumos e os destaques vêm logo depois das legendas.',
    },
    {
      question: 'Quais plataformas são compatíveis?',
      answer:
        'Mais de 50, incluindo YouTube, Twitch, Kick, Facebook, TikTok, Instagram, X (Twitter), Bilibili e Niconico. A página de plataformas lista todas. Só é possível ler vídeos e transmissões públicos, e o Discord não é compatível porque não tem links públicos.',
    },
    {
      question: 'A ClawAI publica ou conversa no chat em meu nome?',
      answer:
        'Não. A ClawAI apenas lê a transmissão. Ela nunca publica, comenta ou conversa em nenhuma plataforma por você. O que a transmissão diz, e o que o chat dela diz, é tratado como dado não confiável para resumir, nunca como instrução para a ClawAI.',
    },
    {
      question: 'Quem pode ver o que eu assisti?',
      answer:
        'Seu histórico é seu. As análises que você assistiu e os resumos que você gerou ficam na sua conta até você apagá-los, e você decide o que exportar ou compartilhar.',
    },
  ],
  closingTitle: 'Cole seu primeiro link',
  closingBody:
    'Uma partida ao vivo, uma coletiva de imprensa, uma aula ou aquela live de duas horas que você perdeu: cole o link, escolha o idioma e deixe a ClawAI fazer as anotações. Todos os planos incluem minutos grátis todo mês.',
  platformsPage: {
    eyebrow: 'Novidade no ClawAI: Live & Video Intelligence',
    title: 'Todas as plataformas que o Live & Video Intelligence consegue ler',
    intro:
      'Cole um link de qualquer uma destas plataformas, ao vivo ou gravado. A ClawAI lê nos próprios servidores, então funciona em qualquer dispositivo, inclusive celulares.',
    openCta: 'Cole um link agora',
    backCta: 'Voltar para Live & Video Intelligence',
    groupsTitle: 'Plataformas por tipo',
    groupsIntro:
      'Os nomes das plataformas são marcas registradas de seus respectivos donos. A ClawAI não é afiliada a elas nem endossada por elas.',
    groups: {
      [LiveMarketingPlatformGroup.GLOBAL_VIDEO]: {
        title: 'Vídeo global',
        body: 'Os grandes sites de vídeo que as pessoas compartilham todos os dias, de palestras e aulas longas a clipes curtos e programas de áudio.',
      },
      [LiveMarketingPlatformGroup.GAMING_STREAMING]: {
        title: 'Games e streaming',
        body: 'Lives de games, esports e transmissões de criadores, com uma aba de chat ao vivo ao lado da análise.',
      },
      [LiveMarketingPlatformGroup.SOCIAL]: {
        title: 'Redes sociais',
        body: 'Reels, posts, shorts e transmissões ao vivo de redes sociais e canais de mensagens.',
      },
      [LiveMarketingPlatformGroup.ASIA]: {
        title: 'Ásia',
        body: 'Plataformas de vídeo e de lives da China, do Japão, da Coreia e de toda a Ásia, lidas em qualquer um dos 13 idiomas do app.',
      },
    },
    liveTag: 'Ao vivo',
    videoTag: 'Vídeos',
    supportTitle: 'O que funciona em todas as plataformas',
    supportIntro: 'Os mesmos três recursos funcionam onde quer que a ClawAI consiga ler a fonte.',
    support: [
      {
        title: 'Transmissões ao vivo',
        body: 'Legendas cerca de 7 a 12 segundos depois da fala, um Feed inteligente de resumos, destaques e notas visuais e uma aba de chat ao vivo quando a plataforma tem uma.',
      },
      {
        title: 'Vídeos gravados',
        body: 'Reels, posts, shorts e lives passadas de até 3 horas. A ClawAI reproduz o vídeo desde o início em velocidade normal e a análise acompanha.',
      },
      {
        title: 'Resumo com um clique',
        body: 'Em um vídeo gravado, clique em Resumir vídeo e receba um resumo geral, os momentos principais com marcação de tempo, destaques e a transcrição completa.',
      },
    ],
    limitsTitle: 'Os limites, com honestidade',
    limits: [
      {
        title: 'Apenas conteúdo público',
        body: 'Só é possível ler vídeos e transmissões públicos. Conteúdo privado ou exclusivo para membros não pode ser lido.',
      },
      {
        title: 'Uma plataforma pode recusar',
        body: 'Algumas plataformas, ou vídeos específicos, podem recusar o acesso a partir de um servidor. Quando isso acontece, a ClawAI avisa com clareza em vez de mostrar um resultado falso.',
      },
      {
        title: 'O Discord não é compatível',
        body: 'As transmissões do Discord não têm links públicos, então não há nada que um servidor possa abrir.',
      },
    ],
    faqTitle: 'Perguntas sobre plataformas',
    faq: [
      {
        question: 'Minha plataforma é compatível?',
        answer:
          'Se ela está nesta página, cole o link e a ClawAI verifica antes de começar. Se a plataforma ou o vídeo recusar o acesso do servidor, você fica sabendo na hora.',
      },
      {
        question: 'Funcionam tanto transmissões ao vivo quanto vídeos gravados?',
        answer:
          'Sim, em todas as plataformas listadas. Um vídeo gravado de até 3 horas também pode ser resumido com um clique.',
      },
      {
        question: 'Por que um vídeo pode falhar se a plataforma está na lista?',
        answer:
          'Uma plataforma pode impedir que um servidor leia um vídeo específico, mesmo público. Quando isso acontece, a ClawAI avisa na hora. Vídeos e transmissões privados nunca podem ser lidos.',
      },
      {
        question: 'Por que o Discord não está aqui?',
        answer:
          'As transmissões do Discord não têm um link público que um servidor possa abrir, então a ClawAI não consegue lê-las.',
      },
    ],
    closingTitle: 'Encontrou sua plataforma?',
    closingBody:
      'Cole o link, escolha o idioma e comece. Todos os planos incluem minutos grátis todo mês.',
  },
};

/** Portuguese SEO copy for both pages; claims mirror the English file. */
export const PT_LIVE_INTELLIGENCE_MARKETING_SEO: LiveIntelligenceMarketingSeo = {
  overview: {
    title: 'Live & Video Intelligence: legendas ao vivo e resumo de vídeo com um clique',
    description:
      'Cole o link de uma live ou de um vídeo do YouTube, Twitch, TikTok e mais de 50 plataformas. Receba legendas ao vivo no seu idioma, um Feed inteligente de resumos e destaques ou um resumo de vídeo com marcação de tempo em um clique. Funciona em qualquer dispositivo.',
    keywords: [
      'legendas para live',
      'resumo de vídeo com IA',
      'resumir vídeo do YouTube',
      'legenda traduzida ao vivo',
      'destaques de live',
    ],
  },
  platforms: {
    title: 'Plataformas compatíveis com o Live & Video Intelligence',
    description:
      'Todas as plataformas que a ClawAI consegue ler para legendas ao vivo e resumos de vídeo: YouTube, Twitch, Kick, Facebook, TikTok, Instagram, X, Bilibili, Niconico e outras, agrupadas por tipo.',
    keywords: [
      'plataformas de vídeo compatíveis',
      'plataformas de transmissão ao vivo',
      'legendas para Twitch',
      'resumo de vídeo do YouTube',
    ],
  },
};
