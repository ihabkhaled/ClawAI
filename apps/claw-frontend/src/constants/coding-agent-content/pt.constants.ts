import type { CodingAgentDictionary } from '@/types/coding-agent-content.types';

/**
 * A versão portuguesa das duas páginas do Coding Agent.
 *
 * Todas as afirmações aqui vêm do README e do manifesto da própria extensão em
 * `apps/claw-coding-agent`, e não de desejos de marketing. A extensão é um
 * cliente leve — autenticação, direitos de acesso, cotas, histórico, credenciais
 * de fornecedor, roteamento e inferência ficam na plataforma — e o texto diz
 * isso mesmo, porque um programador que a instale à espera de um modelo de
 * código offline desinstala-a num minuto.
 */
export const PT_CODING_AGENT_CONTENT: CodingAgentDictionary = {
  overview: {
    eyebrow: 'O ClawAI no seu editor',
    title: 'O ClawAI Coding Agent para VS Code',
    intro:
      'Todos os modelos da sua assinatura ClawAI, dentro do editor que já usa. A extensão é um cliente leve: a sua conta, as suas cotas, as suas credenciais de fornecedor e o seu histórico de conversas ficam na plataforma, por isso a mesma conversa que começou no navegador continua no VS Code.',
    installCta: 'Instalar do Marketplace',
    marketplaceCta: 'Ver no Marketplace',
    capabilitiesTitle: 'O que faz',
    capabilities: [
      {
        title: 'Todos os modelos, uma assinatura',
        body: 'Nove famílias de modelos de ponta e os seus modelos locais de pesos abertos, ao alcance do editor sem nenhuma chave de API para colar. O roteamento acontece na plataforma, por isso o editor nunca guarda uma credencial de fornecedor.',
      },
      {
        title: 'Roteamento automático ou manual',
        body: 'Deixe a plataforma encaminhar cada mensagem para o modelo certo, ou fixe uma conversa num modelo específico. A escolha é a mesma que a aplicação web faz, porque é feita no mesmo sítio.',
      },
      {
        title: 'Comparar e julgar, dentro do editor',
        body: 'Envie um prompt a vários modelos ao mesmo tempo e leia as respostas lado a lado, com uma passagem opcional de juiz — o mesmo fluxo de comparação da aplicação web, sobre o código que tem aberto.',
      },
      {
        title: 'Pré-visualizar antes de aplicar',
        body: 'As edições chegam como um diff que pode rever, não como uma escrita inesperada. Nada toca na sua árvore de trabalho até que a aceite.',
      },
      {
        title: 'Contexto que pode inspecionar',
        body: 'Cada resposta traz um registo de uso: que ficheiros foram lidos, que modelo respondeu e quanto consumiu da sua cota. Quando uma resposta está errada, consegue ver para onde ela estava a olhar.',
      },
      {
        title: 'Conversas em paralelo',
        body: 'Vários separadores de conversa com título ao mesmo tempo, dois a correr em paralelo contra modelos diferentes, com o histórico do backend reposto no lugar.',
      },
    ],
    requirementsTitle: 'O que é preciso',
    requirementsBody:
      'VS Code 1.98 ou posterior, e uma conta ClawAI. A extensão liga-se à plataforma alojada da ClawAI ou à sua própria instalação self-hosted — escolhe qual no início de sessão.',
    faqTitle: 'Perguntas que nos fazem',
    faq: [
      {
        question: 'Preciso de uma assinatura separada para a extensão?',
        answer:
          'Não. A extensão usa a conta ClawAI que já tem e consome a mesma cota da aplicação web. Não há nada mais para comprar.',
      },
      {
        question: 'O meu código é enviado para um fornecedor de modelos?',
        answer:
          'Só o que um pedido precisa, e só para o modelo que responde — o registo de uso em cada resposta nomeia esse modelo. Fixe a conversa num modelo local de pesos abertos, ou aponte a extensão para uma instalação self-hosted, e nada chega a um fornecedor externo.',
      },
      {
        question: 'Funciona com um ClawAI self-hosted?',
        answer:
          'Sim. A extensão pede o URL do backend no início de sessão, por isso funciona contra a plataforma alojada da ClawAI ou contra uma instância que corre inteiramente na sua própria infraestrutura.',
      },
      {
        question: 'Posso continuar a usar também a aplicação web?',
        answer:
          'Sim, e as mesmas conversas aparecem nas duas. O histórico vive na plataforma, por isso uma conversa começada no navegador continua no editor e volta atrás.',
      },
    ],
  },
  install: {
    eyebrow: 'Instalação',
    title: 'Instalar o ClawAI Coding Agent',
    intro:
      'Três passos, cerca de um minuto. A extensão está publicada no Visual Studio Marketplace sob o publicador verificado ClawAI.',
    stepsTitle: 'A partir do VS Code',
    steps: [
      {
        title: 'Abra a vista de Extensões',
        body: 'Prima Ctrl+Shift+X no Windows e no Linux, ou Cmd+Shift+X no macOS. Também a pode abrir a partir da barra de atividade, à esquerda.',
      },
      {
        title: 'Procure por ClawAI Coding Agent',
        body: 'Escreva «ClawAI» na caixa de pesquisa. Procure a entrada publicada por ClawAI — o nome do publicador tem um selo de verificado.',
      },
      {
        title: 'Instale e inicie sessão',
        body: 'Clique em Install, depois abra o painel ClawAI e inicie sessão. Vai ser-lhe pedido o URL do backend — deixe o valor por omissão para usar a plataforma alojada da ClawAI, ou introduza o seu se fizer self-hosting.',
      },
    ],
    cliTitle: 'A partir da linha de comandos',
    cliBody:
      'Se instala extensões a partir de um terminal ou de um script de configuração, um comando basta. Funciona em qualquer sítio onde o comando `code` esteja no seu PATH.',
    signInTitle: 'Início de sessão',
    signInBody:
      'O início de sessão acontece no seu navegador e devolve ao editor um token de âmbito limitado. A extensão nunca guarda a sua palavra-passe, nem detém a chave de API de um fornecedor de modelos — essas ficam na plataforma.',
    troubleshootingTitle: 'Se algo correr mal',
    troubleshooting: [
      {
        question: 'A extensão não aparece na pesquisa',
        answer:
          'Verifique a sua versão do VS Code — a extensão exige a 1.98 ou posterior. Em versões mais antigas, o Marketplace esconde-a em vez de oferecer uma instalação incompatível.',
      },
      {
        question: 'O link de instalação não faz nada',
        answer:
          'O link de um clique usa o protocolo `vscode:`, que só funciona se o VS Code estiver instalado na máquina a partir da qual está a navegar. Use antes a página do Marketplace ou a linha de comandos.',
      },
      {
        question: 'O início de sessão resulta mas não aparece nenhum modelo',
        answer:
          'O acesso aos modelos segue o seu plano. Veja a página de Modelos na aplicação web; se um modelo também faltar lá, o que acontece é que não está disponível para a sua conta, e não que falte na extensão.',
      },
      {
        question: 'Não consegue alcançar a minha instalação self-hosted',
        answer:
          'O URL do backend tem de estar acessível a partir da sua máquina e tem de apresentar um certificado em que o seu editor confie. Um certificado autoassinado que o navegador aceitou depois de um aviso continua a ser recusado aqui.',
      },
    ],
    marketplaceCta: 'Abrir a página do Marketplace',
    openInEditorCta: 'Abrir no VS Code',
  },
};
