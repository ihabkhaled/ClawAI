import { TourId } from '@/enums/tour-id.enum';
import type { TourDictionary } from '@/types/tour.types';

export const PT_TOURS_CONTENT: TourDictionary = {
  ui: {
    next: 'Avançar',
    back: 'Voltar',
    skip: 'Pular o tour',
    done: 'Concluir',
    stepOf: 'Passo {current} de {total}',
    dialogLabel: 'Tour do produto',
    launcherLabel: 'Tours e ajuda',
    launcherTitle: 'Tours do produto',
    launcherHint: 'Um passeio curto pelo que você vê nesta página.',
    launcherHere: 'Nesta página',
    launcherMore: 'Mais tours',
    launcherDone: 'Concluído',
    launcherStart: 'Iniciar',
    launcherRestart: 'Rever',
    offerTitle: 'Novo por aqui? Faça um tour de 1 minuto',
    offerStart: 'Mostre-me',
    offerLater: 'Agora não',
    missingTarget: 'Esta parte não está na tela agora. Abra-a e inicie o tour de novo.',
  },
  tours: {
    [TourId.ThreadsIntro]: {
      title: 'Conheça o Threads',
      description: 'Transforme um chat em um artigo público, pesquisado e com fontes.',
      steps: {
        welcome: {
          title: 'Threads em um minuto',
          body: 'Um Thread é um artigo público escrito a partir de um dos seus chats: pesquisado na web ao vivo, escrito por vários modelos, revisado por um juiz e um crítico e publicado só quando você aprova.',
        },
        list: {
          title: 'Seus Threads',
          body: 'Cada Thread que você inicia aparece aqui com seu status. Abra um para acompanhá-lo enquanto roda, revisar o rascunho, aprová-lo, exportá-lo ou compartilhá-lo.',
        },
        create: {
          title: 'Crie um Thread',
          body: 'Escolha um chat de origem, diga sobre o que é o artigo e escolha os modelos. Você também pode começar de qualquer chat com «Transformar em Thread público».',
        },
        process: {
          title: 'O que acontece depois',
          body: 'O ClawAI pesquisa o assunto, de três a cinco autores escrevem de forma independente, concordam em um rascunho e o juiz e o crítico o revisam por até três rodadas.',
        },
        approve: {
          title: 'Você decide',
          body: 'Nada fica público até você ler o rascunho e aprová-lo. Você pode retirar a qualquer momento, e um limite de gasto que você define restringe o custo.',
        },
      },
    },
    [TourId.ThreadCreate]: {
      title: 'Preencha o formulário do Thread',
      description: 'O que cada campo faz antes de começar.',
      steps: {
        topic: {
          title: 'O assunto',
          body: 'Diga o que o artigo deve explicar ou responder. Uma pergunta clara dá aos autores e à pesquisa um alvo claro.',
        },
        kind: {
          title: 'Tipo e idioma',
          body: 'Escolha artigo, artigo de pesquisa, guia ou explicação técnica, e o idioma em que a página pública será escrita.',
        },
        cap: {
          title: 'Gasto máximo',
          body: 'O máximo que este Thread pode custar. Cada chamada a um modelo é checada antes contra ele, e o trabalho para em vez de ultrapassá-lo.',
        },
        models: {
          title: 'Autores, juiz e crítico',
          body: 'Escolha de três a cinco autores, um juiz e um crítico com o mesmo seletor do chat. Provedores diferentes dão rascunhos mais variados e revisão independente.',
        },
        consent: {
          title: 'Seu consentimento',
          body: 'Marque para confirmar que entende que o artigo final será público e pesquisável. Iniciar fica desativado até você marcar.',
        },
        start: {
          title: 'Iniciar a geração',
          body: 'O ClawAI inicia o trabalho e abre a página de revisão, onde você acompanha cada etapa e pode cancelar a qualquer momento.',
        },
      },
    },
    [TourId.ThreadReview]: {
      title: 'Revise um Thread',
      description: 'Acompanhe, leia, aprove, exporte, compartilhe.',
      steps: {
        status: {
          title: 'Progresso ao vivo',
          body: 'Enquanto o trabalho roda, esta linha diz o que acontece: pesquisando, autores escrevendo, concordando em um rascunho, juiz e crítico. Cancelar o interrompe e devolve o crédito não usado.',
        },
        draft: {
          title: 'O rascunho e suas fontes',
          body: 'Quando as revisões passam, o rascunho aparece com as fontes numeradas. Leia com atenção: você pode editá-lo ou pedir mudanças antes que algo fique público.',
        },
        approve: {
          title: 'Aprove e publique',
          body: 'Só um rascunho aprovado vira página pública. Retirar remove da página, da busca, do sitemap e dos feeds.',
        },
        export: {
          title: 'Baixe',
          body: 'Marque um ou vários formatos e baixe juntos em um ZIP, ou salve um PDF pela janela de impressão do navegador.',
        },
        share: {
          title: 'Compartilhe',
          body: 'Copie o link, use o menu de compartilhar do dispositivo ou publique no WhatsApp, Facebook, LinkedIn, X, Telegram, Reddit ou por e-mail depois de publicado.',
        },
      },
    },
    [TourId.ChatIntro]: {
      title: 'Tour do chat',
      description: 'Tudo ao redor da caixa de mensagem, em um minuto.',
      steps: {
        input: {
          title: 'Escreva aqui',
          body: 'Digite a mensagem e aperte Enter para enviar. Shift+Enter adiciona uma linha. Você também pode colar imagens e arquivos.',
        },
        context: {
          title: 'Contexto',
          body: 'Adicione pacotes de contexto, visualize o que o modelo verá e use sua memória, para que as respostas se baseiem no seu material.',
        },
        model: {
          title: 'Qual modelo responde',
          body: 'Deixe em Auto e o ClawAI escolhe um modelo para cada mensagem, ou escolha um específico.',
        },
        attach: {
          title: 'Anexe arquivos',
          body: 'Envie documentos, imagens, áudio ou vídeo. O texto é extraído para que qualquer modelo possa lê-lo.',
        },
        research: {
          title: 'Pesquise na web',
          body: 'Ative a pesquisa na web quando a resposta precisar de fatos atuais e fontes.',
        },
        prompts: {
          title: 'Biblioteca de prompts',
          body: 'Prompts reutilizáveis para tarefas comuns. Escolha um para preencher a caixa de mensagem.',
        },
        send: {
          title: 'Enviar',
          body: 'Envia sua mensagem. A resposta chega aos poucos e você pode pará-la a qualquer momento.',
        },
        rail: {
          title: 'Ferramentas deste chat',
          body: 'Compare o mesmo prompt entre modelos, peça a um juiz que arbitre, pesquise neste chat, compartilhe-o ou abra mais ações.',
        },
      },
    },
    [TourId.ChatModels]: {
      title: 'Como escolher um modelo',
      description: 'Roteamento automático, escolha manual e o que as etiquetas significam.',
      steps: {
        model: {
          title: 'Abra o seletor de modelo',
          body: 'Este botão mostra o que responderá sua próxima mensagem. Abra para ver todos os modelos, agrupados por provedor, com busca.',
        },
        auto: {
          title: 'Auto ou um modelo específico',
          body: 'O roteamento automático escolhe um modelo por mensagem entre os que seu plano permite. Escolher um modelo fixa este chat nele.',
        },
        badges: {
          title: 'Etiquetas de crédito',
          body: '«Usa crédito» significa que o modelo gasta seu crédito de conectores ou as solicitações grátis. Modelos incluídos nunca usam crédito.',
        },
        credit: {
          title: 'Seu crédito',
          body: 'Mostra o que você pode gastar. Quando o crédito ou as solicitações grátis acabam, o ClawAI passa para um modelo incluído e avisa você.',
        },
      },
    },
    [TourId.ChatResearch]: {
      title: 'Como pesquisar',
      description: 'Receba respostas com fontes ao vivo.',
      steps: {
        toggle: {
          title: 'Ative a pesquisa na web',
          body: 'Ative a pesquisa antes de enviar. O ClawAI busca na web, lê as melhores páginas e responde com o que encontrou.',
        },
        provider: {
          title: 'Escolha o provedor de busca',
          body: 'Escolha qual provedor de busca usar. Auto escolhe um disponível para você.',
        },
        sources: {
          title: 'Confira as fontes',
          body: 'As respostas mostram suas fontes para você abri-las e verificar as afirmações. Para uma investigação longa, use a página Pesquisa.',
        },
      },
    },
    [TourId.ChatContext]: {
      title: 'Como adicionar contexto',
      description: 'Baseie as respostas no seu próprio material.',
      steps: {
        context: {
          title: 'O botão Contexto',
          body: 'Abra para anexar um pacote de contexto, ver o que está anexado e ligar ou desligar a memória neste chat.',
        },
        preview: {
          title: 'Visualize antes de enviar',
          body: 'Veja exatamente o que o modelo receberá do seu histórico, pacotes, memória e arquivos, para que nada surpreendente vá junto.',
        },
        packs: {
          title: 'Crie seus próprios pacotes',
          body: 'Um pacote de contexto é material de referência reutilizável. Crie um na página Contexto e anexe a qualquer chat.',
        },
      },
    },
    [TourId.ChatToThread]: {
      title: 'Transforme um chat em um Thread',
      description: 'Publique o que você aprendeu, com fontes.',
      steps: {
        more: {
          title: 'Abra Mais ações',
          body: 'O menu no fim da barra tem Exportar, Transformar em Thread público, Configurações do Thread e Excluir.',
        },
        create: {
          title: 'Escolha Transformar em Thread público',
          body: 'Abre um formulário com este chat como origem. Revise o assunto, escolha modelos, defina um limite de gasto e dê seu consentimento.',
        },
        after: {
          title: 'Acompanhe e aprove',
          body: 'Você chega à página de revisão. Quando as revisões passam, leia o rascunho e aprove para publicar.',
        },
      },
    },
    [TourId.CompareIntro]: {
      title: 'Tour do Compare',
      description: 'Envie um prompt a vários modelos.',
      steps: {
        prompt: {
          title: 'Um prompt, muitos modelos',
          body: 'Escreva o prompt uma vez. O Compare o envia a cada modelo escolhido e mostra as respostas lado a lado.',
        },
        models: {
          title: 'Escolha os modelos',
          body: 'Escolha até cinco modelos com o mesmo seletor do chat. Misture provedores para ver como diferem.',
        },
        judge: {
          title: 'Juiz e crítico',
          body: 'Peça a um juiz que classifique as respostas e a um crítico que aponte o que está fraco, ambos com seus motivos.',
        },
      },
    },
    [TourId.ContextPacks]: {
      title: 'Como criar contexto',
      description: 'Monte material de referência reutilizável.',
      steps: {
        create: {
          title: 'Crie um pacote',
          body: 'Dê um nome e adicione notas, texto ou arquivos. Um pacote é seu e fica fora dos chats de outras pessoas.',
        },
        use: {
          title: 'Use em qualquer chat',
          body: 'Abra o botão Contexto em um chat e anexe o pacote. O modelo então responde com esse material à vista.',
        },
      },
    },
  },
};
