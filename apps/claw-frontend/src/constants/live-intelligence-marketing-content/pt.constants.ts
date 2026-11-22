import type { LiveIntelligenceMarketingDictionary } from '@/types/live-intelligence-marketing-content.types';

/** Portuguese copy for the public Live Intelligence page. Same claims as the English source. */
export const PT_LIVE_INTELLIGENCE_MARKETING_CONTENT: LiveIntelligenceMarketingDictionary = {
  eyebrow: 'Novidade no ClawAI',
  title: 'Live Intelligence: legendas, resumos e destaques de uma transmissão ao vivo',
  intro:
    'Cole o link de uma transmissão ao vivo e assista dentro do ClawAI. Enquanto ela roda, o ClawAI transforma a fala em legendas no idioma que você escolher, mantém cartões de resumo curtos atualizados quando o assunto muda e marca os momentos importantes em uma linha do tempo. Feche a janela e o que você assistiu fica no seu histórico, pronto para aprimorar e exportar.',
  openCta: 'Abrir o Live Intelligence',
  pricingCta: 'Ver planos e preços',
  howItWorksCta: 'Ver como funciona',
  whatTitle: 'O que é o Live Intelligence',
  whatParagraphs: [
    'Uma transmissão ao vivo é difícil de acompanhar quando é longa, rápida ou está num idioma que você não fala. O Live Intelligence fica ao lado do vídeo e faz as anotações: legendas traduzidas para o seu idioma, um resumo contínuo e uma lista de destaques, para você poder desviar o olhar sem perder o fio.',
    'Tudo acontece numa janela dentro do ClawAI: a transmissão e a análise ficam na mesma tela. Antes de começar você escolhe o idioma das legendas e um modo de análise, e pode pausar, retomar e avançar ou voltar onde a transmissão permitir. Ao pausar, a transmissão congela e a cobrança para.',
    'Muitas pessoas podem assistir à mesma transmissão sem pagar várias vezes pelo mesmo trabalho. O ClawAI processa uma transmissão uma única vez e compartilha a análise com todos os espectadores. A análise que você realmente assistiu é salva no seu histórico e fica lá até você apagá-la.',
  ],
  stepsTitle: 'Como funciona, em cinco passos',
  stepsIntro:
    'Do link colado ao resumo exportado. Cada passo é algo que você faz ou algo que o ClawAI faz por você.',
  steps: [
    {
      title: 'Cole o link',
      body: 'Abra o Live Intelligence e cole o endereço de uma transmissão ao vivo. O ClawAI verifica se a fonte é compatível antes de analisar ou cobrar qualquer coisa e avisa com clareza se não for.',
    },
    {
      title: 'Escolha idioma e modo',
      body: 'Escolha o idioma das legendas e dos resumos e um de três modos: Áudio, Áudio + Visão ou Smart Auto. Antes de começar, você confirma que tem direito de analisar a transmissão.',
    },
    {
      title: 'Assista com legendas, cartões e destaques',
      body: 'As legendas aparecem alguns segundos depois da fala, com cerca de 7 a 12 segundos de atraso. Os cartões de resumo mudam com os assuntos e os destaques detectados ficam numa linha do tempo clicável.',
    },
    {
      title: 'Pause, retome e avance',
      body: 'Pause para congelar a transmissão e parar o contador. Retome de onde parou ou vá para o ao vivo, com a lacuna mostrada claramente. Avançar e voltar funciona onde a própria transmissão permite.',
    },
    {
      title: 'Feche, volte, aprimore, exporte',
      body: 'Ao fechar a janela, o que você assistiu fica no histórico. Depois, você pode aprimorar qualquer cartão com um modelo à sua escolha e exportar o histórico em PDF, Markdown ou TXT.',
    },
  ],
  featuresTitle: 'O que você recebe',
  features: [
    {
      title: 'Legendas ao vivo no seu idioma',
      body: 'A fala é transcrita e traduzida para o idioma escolhido. As legendas chegam alguns segundos depois de quem fala: não é instantâneo, e a interface diz isso.',
    },
    {
      title: 'Cartões de resumo que acompanham',
      body: 'Cartões curtos resumem a transmissão e são atualizados quando o assunto muda, então o mais recente mostra onde a transmissão está agora.',
    },
    {
      title: 'Destaques automáticos numa linha do tempo',
      body: 'Os momentos que valem a pena rever são detectados e marcados na linha do tempo. Clique para ir até lá, onde a transmissão permitir.',
    },
    {
      title: 'Pause, retome e avance',
      body: 'Controle a reprodução como uma gravação quando a fonte permitir. Em pausa, a transmissão fica congelada e nada é cobrado.',
    },
    {
      title: 'Um histórico sob seu controle',
      body: 'A análise que você assistiu fica num histórico paginado até você apagá-la. Apagar remove.',
    },
    {
      title: 'Aprimore um cartão com o modelo que escolher',
      body: 'Escolha um modelo disponível para reescrever ou aprofundar um cartão. O aprimoramento é cobrado pelo custo real do modelo escolhido.',
    },
    {
      title: 'Exporte em PDF, Markdown ou TXT',
      body: 'Leve seu histórico para fora do ClawAI no formato que combina com o próximo passo.',
    },
    {
      title: 'Processamento compartilhado',
      body: 'Muitos espectadores, uma análise. A mesma transmissão é processada uma vez e compartilhada, para que trabalho e custo não se multipliquem com o público.',
    },
  ],
  modesTitle: 'Três modos de análise',
  modesIntro:
    'O modo decide o que o ClawAI observa. Você o escolhe antes de começar e o custo acompanha a escolha.',
  modes: [
    {
      title: 'Áudio',
      body: 'Legendas, resumos e destaques a partir do que é dito. O modo mais simples, certo para palestras, briefings, aulas e entrevistas.',
    },
    {
      title: 'Áudio + Visão',
      body: 'Acrescenta o que aparece na tela, como slides, gráficos ou uma demonstração. O ClawAI amostra quadros da transmissão e guarda os que mudaram. A visão é cobrada pelo custo real do modelo usado.',
    },
    {
      title: 'Smart Auto',
      body: 'Começa pelo áudio e só acrescenta visão quando a transmissão fica em silêncio ou a imagem muda, para você pagar pela visão quando ela provavelmente importa.',
    },
  ],
  sourcesTitle: 'O que ele pode e não pode analisar',
  sourcesIntro:
    'Preferimos contar os limites agora a deixar você descobri-los no meio da transmissão.',
  sources: [
    {
      title: 'A análise por IA funciona em transmissões HLS',
      body: 'O Live Intelligence analisa transmissões HLS ao vivo que você tem direito de analisar. Ao iniciar, você confirma que tem.',
    },
    {
      title: 'Links do YouTube tocam, mas não são analisados',
      body: 'Você pode colar um link do YouTube e assistir dentro do ClawAI, mas não há análise por IA para transmissões do YouTube. Os termos do YouTube não permitem capturar o áudio ou as legendas deles, então o ClawAI não faz isso, e a janela avisa.',
    },
    {
      title: 'As legendas chegam com alguns segundos de atraso',
      body: 'A fala é transcrita em trechos curtos, então as legendas chegam cerca de 7 a 12 segundos depois. Não é legendagem em tempo real.',
    },
    {
      title: 'Estados honestos, nunca um sucesso falso',
      body: 'A janela mostra quando está conectando, atrasada, se recuperando, sem minutos grátis, aguardando sua aprovação, na capacidade máxima ou quando a transmissão terminou.',
    },
  ],
  plansTitle: 'Minutos grátis e preços',
  plansIntro:
    'Todos os planos incluem minutos de análise grátis a cada mês. São os valores padrão e podem ser ajustados.',
  planMinutesUnit: 'minutos grátis por mês',
  planProAndAbove: 'Pro e acima',
  plansBody:
    'Depois dos minutos grátis, a análise custa {price} por minuto, e só depois que você confirmar. Você pode definir um limite de gasto. Quando o crédito acaba, há um único período de tolerância de 60 segundos. A visão é cobrada pelo custo real do modelo usado e pausar para o contador.',
  faqTitle: 'Perguntas frequentes',
  faq: [
    {
      question: 'O Live Intelligence funciona com transmissões ao vivo do YouTube?',
      answer:
        'Você pode assistir a um link do YouTube dentro do ClawAI, mas não há análise por IA. Os termos do YouTube não permitem capturar o áudio ou as legendas deles, então não há legendas, resumos nem destaques para o YouTube.',
    },
    {
      question: 'Quais transmissões ele pode analisar?',
      answer:
        'Transmissões HLS ao vivo que você tem direito de analisar. Você confirma isso ao iniciar. Uma transmissão que o serviço não consegue ler é informada como não compatível, sem falhar em silêncio.',
    },
    {
      question: 'As legendas são em tempo real?',
      answer:
        'Não. Chegam cerca de 7 a 12 segundos depois da fala, porque o áudio é transcrito em trechos curtos. Resumos e destaques seguem as legendas.',
    },
    {
      question: 'Quanto custa?',
      answer:
        'Cada plano inclui minutos grátis por mês: 30 no Free, 120 no Starter, 300 no Plus e 600 no Pro e acima. Depois, US$ 0,02 por minuto, só após sua confirmação e com limite de gasto opcional. A visão é cobrada pelo custo real do modelo.',
    },
    {
      question: 'O que acontece se meu crédito acabar no meio da transmissão?',
      answer:
        'Você tem um único período de tolerância de 60 segundos e depois a análise para até você adicionar crédito.',
    },
    {
      question: 'Pausar custa alguma coisa?',
      answer:
        'Não. Ao pausar, a transmissão congela e a cobrança para. Retome de onde parou ou volte ao ao vivo.',
    },
    {
      question: 'O que acontece com o meu histórico?',
      answer:
        'A análise que você realmente assistiu fica guardada até você apagá-la. Você pode navegar nela, aprimorar um cartão com um modelo à sua escolha e exportá-la em PDF, Markdown ou TXT.',
    },
    {
      question: 'Posso fazer perguntas à transmissão?',
      answer:
        'Não nesta primeira versão. O Live Intelligence oferece legendas, cartões de resumo e destaques; perguntas sobre uma transmissão ainda não estão incluídas.',
    },
  ],
  closingTitle: 'Acompanhe a próxima transmissão sem assistir a cada minuto',
  closingBody:
    'Cole um link HLS que você tem direito de analisar, escolha seu idioma e comece. Seus minutos grátis estão esperando.',
};
