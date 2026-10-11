import { MarketingSceneId } from '@/enums/marketing-scene-id.enum';
import type { MarketingScenesLocaleContent } from '@/types/marketing-scenes.types';

export const PT_MARKETING_SCENES_CONTENT: MarketingScenesLocaleContent = {
  heading: 'Veja no app',
  scenes: {
    [MarketingSceneId.CHAT_CONVERSATION]: {
      alt: 'Um chat do ClawAI com uma pergunta, a resposta escrita, um selo com o modelo que respondeu e os detalhes de roteamento abaixo da resposta.',
      caption: 'Cada resposta mostra qual modelo a escreveu e por quê.',
    },
    [MarketingSceneId.CHAT_MODEL_PICKER]: {
      alt: 'A caixa de mensagem do ClawAI com o seletor de modelo aberto, listando os modelos que você pode escolher.',
      caption: 'Escolha um modelo você mesmo, ou deixe o AUTO escolher.',
    },
    [MarketingSceneId.CHAT_RESEARCH]: {
      alt: 'A caixa de mensagem com a pesquisa na web ativada e o seletor do provedor de busca à mostra.',
      caption: 'Ative a pesquisa na web e escolha como ela busca.',
    },
    [MarketingSceneId.CHAT_CONTEXT_MENU]: {
      alt: 'A caixa de mensagem com o menu Contexto aberto, oferecendo sua memória e seus pacotes de contexto.',
      caption: 'Leve sua memória e seus pacotes de contexto para qualquer chat.',
    },
    [MarketingSceneId.CHAT_SHARE_DIALOG]: {
      alt: 'A janela «Compartilhar este chat» aberta sobre uma conversa, com as opções de compartilhamento.',
      caption: 'Compartilhe um chat por link, nos seus termos.',
    },
    [MarketingSceneId.COMPARE_SETUP]: {
      alt: 'A página Comparar com três modelos selecionados e um prompt digitado, pronto para enviar.',
      caption: 'Faça uma pergunta e veja três modelos responderem lado a lado.',
    },
    [MarketingSceneId.LABS_CONSENSUS]: {
      alt: 'A página Consenso, em que vários modelos respondem à mesma pergunta e chegam a um resultado em comum.',
      caption: 'Deixe vários modelos responderem e chegue a uma resposta acordada.',
    },
    [MarketingSceneId.FILES]: {
      alt: 'A página Arquivos listando os arquivos que você enviou e os que o ClawAI criou para você.',
      caption: 'Seus envios e arquivos gerados, em um só lugar.',
    },
    [MarketingSceneId.MEMORY]: {
      alt: 'A página Memória mostrando o que o ClawAI lembra sobre você, que você pode revisar e editar.',
      caption: 'Veja e controle o que o ClawAI lembra.',
    },
    [MarketingSceneId.CONTEXT_PACKS]: {
      alt: 'A página Contexto listando pacotes de contexto reutilizáveis que você pode anexar aos chats.',
      caption: 'Pacotes de contexto reutilizáveis para o trabalho que você repete.',
    },
    [MarketingSceneId.CONNECTORS]: {
      alt: 'A página Conectores listando os serviços que você pode vincular ao seu espaço de trabalho.',
      caption: 'Conecte suas ferramentas para a IA trabalhar com elas.',
    },
    [MarketingSceneId.BILLING_PLANS]: {
      alt: 'A página de Cobrança mostrando os planos disponíveis e qual é o atual.',
      caption: 'Planos claros, e você sempre vê qual está usando.',
    },
    [MarketingSceneId.PLAN_OVERVIEW]: {
      alt: 'A página Plano mostrando o que o seu plano inclui e quanto você já usou.',
      caption: 'Veja exatamente o que o seu plano inclui.',
    },
    [MarketingSceneId.USAGE]: {
      alt: 'A página Uso com gráficos de quantos tokens você usou ao longo do tempo.',
      caption: 'Acompanhe seu uso em tempo real.',
    },
    [MarketingSceneId.SETTINGS]: {
      alt: 'A página Configurações rolada até o cartão de notificações, com seus interruptores.',
      caption: 'Escolha quais notificações você recebe.',
    },
    [MarketingSceneId.THREADS_LIST]: {
      alt: 'A página Threads listando os seus Threads, cada um com o seu status.',
      caption: 'Todos os seus Threads e em que ponto cada um está.',
    },
    [MarketingSceneId.THREAD_REVIEW]: {
      alt: 'O rascunho de um Thread aberto na página de revisão, antes de ser publicado.',
      caption: 'Revise um rascunho antes de qualquer coisa se tornar pública.',
    },
    [MarketingSceneId.NOTIFICATIONS_PANEL]: {
      alt: 'O painel de notificações aberto pelo sino, com algumas notificações recentes.',
      caption: 'Saiba no momento em que algo estiver pronto.',
    },
    [MarketingSceneId.TOUR_CARD]: {
      alt: 'Um cartão curto de tour do produto aberto na página do chat, apontando para um recurso.',
      caption: 'Um tour rápido mostra o app para você.',
    },
    [MarketingSceneId.DASHBOARD]: {
      alt: 'O painel do ClawAI com uma visão geral da sua atividade e do seu uso recentes.',
      caption: 'Seu espaço de trabalho num relance.',
    },
    [MarketingSceneId.OBSERVABILITY_CONSUMPTION]: {
      alt: 'A visão de Observabilidade para administradores, aba Consumo, com gráficos de quanto os modelos foram usados.',
      caption: 'Os administradores veem o consumo em gráficos.',
    },
    [MarketingSceneId.MOBILE_CHAT]: {
      alt: 'Uma conversa de chat do ClawAI na tela de um celular.',
      caption: 'O mesmo chat, no seu celular.',
    },
    [MarketingSceneId.MOBILE_DASHBOARD]: {
      alt: 'O painel do ClawAI na tela de um celular.',
      caption: 'Seu painel também cabe numa tela pequena.',
    },
  },
};
