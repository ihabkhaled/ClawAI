import type { ThreadsMarketingDictionary } from '@/types/threads-marketing-content.types';

export const PT_THREADS_MARKETING_CONTENT: ThreadsMarketingDictionary = {
  eyebrow: 'Novidade no ClawAI',
  title: 'ClawAI Threads: transforme um chat em um artigo público, pesquisado e com fontes',
  intro:
    'Uma boa conversa com uma IA muitas vezes termina em algo que vale a pena compartilhar. O Threads pega o chat que você já teve, pesquisa o assunto na web ao vivo, deixa vários modelos diferentes escreverem de forma independente, exige que cheguem a um único rascunho, passa por um juiz e um crítico e devolve para você. Você lê cada palavra e aprova. Só então ele vira uma página pública com fontes reais.',
  announcementBadge: 'Anúncio',
  announcementTitle: 'O Threads chegou e está aberto a todos os planos',
  announcementBody:
    'Free, Starter, Plus e todos os planos superiores podem criar Threads, e os administradores também. Comece em qualquer chat com «Transformar em Thread público» ou pela página de Threads. Publicar é sempre decisão sua: nada sai da sua conta até você aprovar o rascunho final.',
  createCta: 'Criar um Thread',
  discoverCta: 'Ler Threads publicados',
  howItWorksCta: 'Ver os seis passos',
  whatTitle: 'O que é um Thread',
  whatParagraphs: [
    'Um Thread é um artigo público criado a partir de um dos seus chats. Não é uma cópia da conversa e nunca mostra o chat. É um texto novo sobre o assunto, baseado em fontes que o ClawAI procurou para ele e escrito por vários modelos em vez de um só.',
    'Usar mais de um modelo importa. Cada autor escreve o próprio rascunho sem ver os outros. Depois os autores precisam concordar em um único rascunho, palavra por palavra. Um modelo juiz avalia o resultado com critérios explícitos e um modelo crítico anota o que ainda está fraco. Se qualquer um disser não, o rascunho volta para outra rodada, até três.',
    'Você fica no controle o tempo todo. Escolhe os modelos, define um limite de gasto, pode cancelar durante a execução e vê o rascunho pronto com suas fontes antes de qualquer coisa ficar pública. Depois de publicar, você pode retirar quando quiser, e a página some da busca, do sitemap e dos feeds.',
  ],
  stepsTitle: 'Como funciona, em seis passos',
  stepsIntro:
    'O mesmo fluxo funciona a partir de um chat ou da página de Threads. Cada passo é algo que você faz ou algo que o ClawAI faz por você.',
  steps: [
    {
      title: 'Escolha o chat',
      body: 'Abra o chat que quer compartilhar e escolha «Transformar em Thread público» no menu do chat. Na página de Threads, você escolhe o chat de origem. A conversa é congelada como um instantâneo, então mudanças posteriores no chat não alteram aquilo de que o Thread foi feito.',
    },
    {
      title: 'Diga o assunto e dê o consentimento',
      body: 'Escreva o assunto em uma ou duas frases, escolha o tipo (artigo, artigo de pesquisa, guia ou explicação técnica) e o idioma, e marque a caixa que confirma que você entende que o resultado será público. Sem esse consentimento, o botão de iniciar fica desativado.',
    },
    {
      title: 'Escolha os modelos',
      body: 'Escolha de três a cinco autores, um juiz e um crítico com o mesmo seletor de modelos do chat: agrupado por provedor, com busca e selos de capacidades e de modelos que usam crédito de conectores. Provedores diferentes geram rascunhos realmente diferentes.',
    },
    {
      title: 'Defina o limite de gasto e comece',
      body: 'Defina o máximo que este Thread pode gastar. Cada chamada a um modelo é verificada contra o limite antes de rodar, e o trabalho para em vez de ultrapassá-lo. Você acompanha as etapas ao vivo e pode cancelar a qualquer momento.',
    },
    {
      title: 'Pesquisar, escrever, concordar, julgar',
      body: 'O ClawAI pesquisa o assunto na web ao vivo e guarda as evidências. Os autores escrevem a partir delas, concordam em um rascunho, e o juiz e o crítico o revisam. Um rascunho reprovado é revisado e avaliado de novo, até três rodadas. Se ainda assim falhar, você recebe o motivo e nada é publicado.',
    },
    {
      title: 'Revisar, aprovar e publicar',
      body: 'Leia o rascunho com suas fontes, peça mudanças ou edite, e aprove quando estiver satisfeito. Só um rascunho aprovado vira página pública, com dados estruturados, lista de fontes, contador de leitores e espaço para comentários e reações. Você pode exportá-lo e retirá-lo quando quiser.',
    },
  ],
  trustTitle: 'Salvaguardas embutidas, não apenas prometidas',
  trustIntro:
    'Publicar algo na sua conta merece mais cuidado que uma resposta de chat. Estas verificações rodam em todo Thread.',
  trust: [
    {
      title: 'Nada é público sem a sua aprovação',
      body: 'Uma boa nota do juiz e do crítico apenas torna o rascunho elegível para a sua revisão. Nunca publica nada sozinha.',
    },
    {
      title: 'Somente fontes reais',
      body: 'As citações precisam vir das evidências reunidas pela etapa de pesquisa. Um rascunho que cita um endereço que a pesquisa nunca encontrou é rejeitado.',
    },
    {
      title: 'Dois revisores independentes',
      body: 'O juiz precisa dar ao rascunho pelo menos 80 de 100 e o crítico pelo menos 75. Ambos são modelos que você escolhe, então pode usar revisores de um provedor diferente do dos autores.',
    },
    {
      title: 'Um limite de gasto rígido',
      body: 'Cada chamada reserva primeiro o seu custo contra o limite. Reservas não usadas são liberadas, e um trabalho que falha ou é cancelado devolve o crédito.',
    },
    {
      title: 'Sua conversa continua sua',
      body: 'A página pública contém o artigo, não o chat. O chat é só o ponto de partida e é lido de um instantâneo fixo.',
    },
    {
      title: 'Segurança e privacidade dos leitores',
      body: 'Os leitores podem comentar, reagir, sugerir mudanças e denunciar uma página. Os contadores de visualizações ignoram rastreadores e guardam apenas hashes anônimos com chave, nunca um endereço ou uma conta.',
    },
  ],
  outputsTitle: 'O que você recebe',
  outputs: [
    {
      title: 'Uma página de artigo pública',
      body: 'Uma página limpa com o artigo, suas fontes numeradas e dados estruturados para os buscadores o entenderem, no idioma que você escolheu.',
    },
    {
      title: 'Descoberta e feeds',
      body: 'Os Threads publicados aparecem no hub de Threads, no sitemap e nos feeds RSS, e saem de lá assim que você os retira.',
    },
    {
      title: 'Exportações',
      body: 'Baixe um Thread em JSON, Markdown ou TOON, o formato compacto e barato de entregar a outro modelo.',
    },
    {
      title: 'Uma comunidade de leitores',
      body: 'Leitores conectados podem comentar, reagir e sugerir mudanças que você aceita ou recusa. Um contador de visualizações mostra o alcance sem rastrear ninguém.',
    },
  ],
  useCasesTitle: 'O que as pessoas transformam em Threads',
  useCases: [
    {
      title: 'Um chat de pesquisa em uma explicação',
      body: 'Você passou uma hora entendendo um assunto com a IA. Transforme isso no artigo que gostaria de ter encontrado no começo.',
    },
    {
      title: 'Uma solução em um guia',
      body: 'Resolveu algo difícil em um chat? Publique os passos que funcionam como guia, com as fontes que os sustentam.',
    },
    {
      title: 'Uma pergunta técnica em um texto',
      body: 'Pergunte a vários modelos, deixe que concordem e publique o resultado como uma explicação técnica revisada duas vezes.',
    },
    {
      title: 'Uma comparação em um post',
      body: 'Usou o Compare para ver como os modelos respondem? Publique o que aprendeu, com a pesquisa por trás.',
    },
  ],
  plansTitle: 'Planos e custo',
  plansBody:
    'O Threads está aberto a todos os planos. O Free inclui um Thread, o Starter dois por mês e o Plus dez por mês, e os planos superiores incluem mais. Criar um Thread usa a mesma franquia e as mesmas regras de crédito do resto do ClawAI, e o seu limite de gasto é o máximo que ele pode custar. Ler, comentar e reagir é grátis para qualquer conta conectada.',
  faqTitle: 'Perguntas frequentes',
  faq: [
    {
      question: 'Meu chat fica público?',
      answer:
        'Não. Só o artigo que você aprova é público. O chat é usado como ponto de partida e nunca aparece na página.',
    },
    {
      question: 'Um Thread pode ser publicado sem mim?',
      answer:
        'Não. Todo Thread espera a sua aprovação, por melhor que o juiz e o crítico o avaliem. Você também pode retirá-lo a qualquer momento.',
    },
    {
      question: 'Quais modelos escrevem um Thread?',
      answer:
        'Os que você escolhe: de três a cinco autores, um juiz e um crítico, com o mesmo seletor do chat. Provedores diferentes dão rascunhos mais variados e revisão independente.',
    },
    {
      question: 'O que acontece se o juiz ou o crítico rejeitar o rascunho?',
      answer:
        'O rascunho é revisado e avaliado de novo, até três rodadas. Se ainda não passar, o trabalho termina com um motivo claro, o crédito não usado é liberado e nada é publicado.',
    },
    {
      question: 'Como sei que as fontes são reais?',
      answer:
        'As citações precisam vir das evidências reunidas pela pesquisa, e um rascunho que cita outra coisa é rejeitado. Você vê a lista numerada de fontes antes de aprovar.',
    },
    {
      question: 'Quanto custa um Thread?',
      answer:
        'Você define um limite de gasto antes de começar e o trabalho não pode ultrapassá-lo. Modelos incluídos no seu plano não usam crédito; os de crédito de conectores usam seu crédito ou sua franquia gratuita, e um trabalho que falha ou é cancelado devolve a reserva.',
    },
    {
      question: 'Posso editar um Thread depois de publicado?',
      answer:
        'Sim. Uma edição é revisada de novo antes de substituir a versão pública, e os leitores podem sugerir mudanças que você aceita ou recusa.',
    },
    {
      question: 'Quais idiomas são suportados?',
      answer:
        'Os Threads podem ser escritos em qualquer um dos 13 idiomas suportados pelo ClawAI, e a página pública usa o idioma que você escolher.',
    },
  ],
  closingTitle: 'Transforme seu próximo bom chat em algo que vale a pena compartilhar',
  closingBody:
    'Abra qualquer chat, escolha «Transformar em Thread público» e veja o que volta. Você só publica o que aprovar.',
};
