import type {
  PublicLaunchCorePageDictionary,
  PublicLaunchLabels,
  PublicLaunchLocalizedLabels,
} from '@/types/public-launch-content.types';

/** Os rótulos da página (onThisPage, evidence, …) ficam em public-commerce-policy-content. */
export const PT_PUBLIC_LAUNCH_LABELS: Omit<PublicLaunchLabels, keyof PublicLaunchLocalizedLabels> =
  {
    viewPricing: 'Ver preços',
    readSecurity: 'Ler segurança e privacidade',
    baselineCatalog: 'Catálogo base de assinaturas',
    monthlyPrice: 'Mensal',
    yearlyPrice: 'Anual',
    dailyAllowance: 'Franquia ponderada diária',
    monthlyAllowance: 'Franquia ponderada mensal',
    liveCheckoutNote:
      'Estes são os preços e as franquias base do repositório. O checkout ao vivo confirma o preço ativo antes do pagamento.',
    providerAvailabilityNote:
      'Os modelos são sincronizados a partir dos provedores habilitados. O catálogo exato depende das credenciais configuradas, da disponibilidade dos provedores, do estado do ciclo de vida e da política do administrador.',
    routingRailTitle: 'Uma solicitação, uma rota verificável',
    routingRailSummary:
      'O ClawAI avalia a solicitação e a política atual antes de escolher um caminho de execução disponível.',
    routingRailAlternative:
      'Uma solicitação é avaliada, roteada para um provedor elegível, opcionalmente comparada e devolvida com a identidade do modelo e os detalhes de uso.',
    evaluate: 'Avaliar',
    evaluateDescription: 'Lê a tarefa, o contexto disponível, a política e a elegibilidade atual.',
    route: 'Rotear',
    routeDescription:
      'Escolhe um caminho de modelo ativo entre os provedores configurados pelo operador.',
    compare: 'Comparar',
    compareDescription:
      'Usa a orquestração de vários modelos somente quando o modo escolhido e a franquia permitem.',
    receipt: 'Devolver',
    receiptDescription:
      'Transmite a resposta com a origem do modelo visível e as informações de uso.',
  };

export const PT_PUBLIC_LAUNCH_PAGES: PublicLaunchCorePageDictionary = {
  about: {
    eyebrow: 'Sobre o ClawAI',
    sections: [
      {
        id: 'purpose',
        title: 'Um plano de controle prático para o trabalho com IA',
        body: 'O ClawAI reúne conversas, roteamento de modelos, arquivos, memória, pesquisa, geração e ações do espaço de trabalho em uma interface coerente. O produto foi pensado para reduzir o atrito operacional de alternar entre provedores, mantendo visíveis para quem trabalha o modelo escolhido, o uso e o caminho de execução.',
      },
      {
        id: 'principles',
        title: 'Construído em torno de escolha, evidência e controle',
        body: 'A plataforma não trata nenhum modelo como o melhor em tudo. Ela pode rotear por tarefa, deixar a pessoa escolher um modelo, comparar várias respostas elegíveis ou pedir a um juiz independente que revise a saída. A disponibilidade sempre depende dos conectores, das credenciais, da política do plano e do ciclo de vida dos modelos configurados no ambiente em execução.',
      },
      {
        id: 'architecture',
        title: 'Operação local em primeiro lugar, alcance a modelos na nuvem',
        body: 'O repositório contém uma interface Next.js e serviços implantáveis de forma independente, conectados por limites explícitos de HTTP e de eventos. Os operadores podem executar a plataforma na própria infraestrutura, conectar provedores de nuvem compatíveis ou definir uma implantação de modelos locais cujo hardware e cujas integrações atendam aos requisitos da organização.',
      },
      {
        id: 'trust',
        title: 'Confiança por meio de fatos verificáveis',
        body: 'Publicamos arquitetura, bases de preço, controles de segurança, limitações e datas de revisão, em vez de trocá-los por selos sem respaldo ou provas de clientes inventadas. O repositório de código-fonte está disponível para revisão técnica, enquanto os catálogos de provedores ao vivo e o checkout continuam sendo a referência do que está disponível em uma implantação específica.',
      },
    ],
    evidence:
      'O ClawAI é um repositório aberto com 18 serviços NestJS, um frontend Next.js, pacotes compartilhados, eventos RabbitMQ e um banco de dados próprio por serviço. As afirmações sobre o produto neste site limitam-se ao comportamento visível nesse repositório.',
  },
  pricing: {
    eyebrow: 'Bases de assinatura claras',
    sections: [
      {
        id: 'catalog',
        title: 'Sete pontos de partida, do gratuito ao alto volume',
        body: 'O catálogo base inclui os planos Free, Starter, Plus, Pro, Team, Scale e Unlimited. Os preços mensais vão de zero a duzentos dólares americanos, e os preços anuais equivalem a dez pagamentos mensais onde há cobrança anual. O serviço de checkout resolve no servidor o preço ativo imutável antes de criar um pagamento hospedado.',
      },
      {
        id: 'allowances',
        title: 'As franquias são ponderadas, não promessas de tokens brutos',
        body: 'Os valores diários, semanais e mensais publicados representam unidades normalizadas pelo custo. Um modelo mais caro consome a franquia de forma diferente de um modelo barato, o que permite que um único saldo cubra provedores heterogêneos. O catálogo também define, por plano, os limites de conversas, mensagens, concorrência, espaços de trabalho, memória e orquestração.',
      },
      {
        id: 'models',
        title: 'O acesso aos modelos segue a implantação ao vivo',
        body: 'Por padrão, o repositório expõe os modelos ativos sincronizados, a menos que um administrador crie restrições explícitas de provedor ou de modelo. A política de classes de custo pré-carregada não comprova as regras de um banco de dados implantado, portanto esta página não promete um modelo específico em um nível específico. Confirme o catálogo ao vivo antes de escolher um plano por causa de um modelo.',
      },
      {
        id: 'payment',
        title: 'Checkout hospedado com preço definido no servidor',
        body: 'As integrações com PayPal e Paymob usam checkout hospedado, de modo que os números de cartão não passam pela aplicação ClawAI. Os preços canônicos dos planos são armazenados em dólares americanos; um gateway configurado pode liquidar em outra moeda compatível. Impostos, disponibilidade geográfica, reembolsos e a prontidão do gateway dependem do serviço implantado e dos termos aplicáveis.',
      },
    ],
    evidence:
      'Os valores do catálogo são uma base versionada do repositório, não uma garantia de que um administrador não tenha alterado a implantação ativa. O checkout exibe e cobra o preço ativo no servidor.',
  },
  'supported-models': {
    eyebrow: 'Modelos e provedores',
    sections: [
      {
        id: 'cloud',
        title: 'Adaptadores de provedores de nuvem implementados',
        body: 'O serviço de conectores inclui adaptadores operacionais para OpenAI, Anthropic, Google Gemini, DeepSeek e xAI Grok. Cada adaptador sincroniza o catálogo do provedor quando há credenciais e configuração válidas. Nomes e disponibilidade de modelos podem mudar na origem, então o catálogo ao vivo é a fonte confiável para uma implantação em execução.',
      },
      {
        id: 'local',
        title: 'Execução local com Ollama e llama.cpp',
        body: 'Os operadores podem configurar Ollama e llama.cpp para modelos executados em infraestrutura controlada. Um modo de roteamento somente local mantém sua cadeia de contingência em provedores locais. Adequação ao hardware, licenciamento dos modelos, limites de contexto, qualidade e vazão variam, por isso a escolha de modelos para uma implantação privada é tratada no escopo técnico e não prometida de forma geral.',
      },
      {
        id: 'selection',
        title: 'Seleção manual e roteamento atento à política',
        body: 'As pessoas podem escolher diretamente um modelo disponível ou deixar que a lógica de roteamento selecione um caminho elegível para a tarefa. O roteador considera as capacidades do modelo, o ciclo de vida, a configuração do conector e a política. Os modos com vários modelos acrescentam padrões de comparação e revisão, mas sua disponibilidade e seus limites seguem a implantação ativa, e não o texto de marketing.',
      },
      {
        id: 'availability',
        title: 'Por que esta página evita uma lista congelada de versões',
        body: 'Uma lista estática de versões da moda fica imprecisa rapidamente e pode sugerir credenciais que não estão configuradas. Por isso o ClawAI distingue as famílias de provedores implementadas da disponibilidade real dos modelos. Os modelos exibidos no produto são sincronizados a partir dos conectores habilitados e filtrados por ciclo de vida e por eventuais restrições do administrador.',
      },
    ],
    evidence:
      'O AWS Bedrock existe no repositório como esqueleto de conector, mas a sincronização de seus modelos não está implementada, por isso ele deliberadamente não é apresentado aqui como provedor disponível.',
  },
  'security-and-privacy': {
    eyebrow: 'Segurança e privacidade',
    sections: [
      {
        id: 'credentials',
        title: 'As credenciais dos conectores são protegidas em repouso',
        body: 'As chaves de API de provedores e conectores são criptografadas com AES-256-GCM, usando um vetor de inicialização aleatório e uma etiqueta de autenticação, e mascaradas nas respostas da API. Os tokens dos gateways de pagamento usam criptografia autenticada com dados associados vinculados à linha. Esses controles sustentam afirmações precisas sobre a proteção de credenciais, não uma afirmação genérica sobre cada byte armazenado.',
      },
      {
        id: 'boundaries',
        title: 'Limites explícitos entre serviços e dados',
        body: 'O ClawAI separa a propriedade dos serviços e impede que um serviço acesse diretamente o banco de dados de outro. As solicitações cruzam limites HTTP autenticados ou eventos RabbitMQ, enquanto validação, autorização, limites de taxa, cabeçalhos de segurança e registros de auditoria são aplicados em camadas definidas. A configuração da implantação continua fazendo parte do perímetro de segurança.',
      },
      {
        id: 'retention',
        title: 'A retenção difere conforme o tipo de dado',
        body: 'Os arquivos expiram por padrão em trinta dias, a menos que um operador configure retenção indefinida. Os logs de cliente e de servidor usam índices de expiração de trinta dias no banco de dados, enquanto os registros de auditoria e os livros de uso não têm expiração automática em seus esquemas atuais. As pessoas podem excluir conversas, memórias, pacotes de contexto e arquivos; a exclusão da conta não é, no momento, de autoatendimento.',
      },
      {
        id: 'processing',
        title: 'O processamento pelo provedor é uma escolha da implantação',
        body: 'Os prompts e anexos enviados a um modelo na nuvem são processados pelo provedor configurado, conforme os termos dele. O roteamento somente local pode manter a execução do modelo em caminhos locais do Ollama, mas outros serviços habilitados ainda podem envolver operadores externos. Certificações, residência de dados, conformidade regulatória e garantias universais de apagamento exigem evidências separadas e não são afirmadas aqui.',
      },
    ],
    evidence:
      'As declarações de segurança descrevem controles presentes no repositório. Elas não são uma certificação, um relatório de teste de intrusão, um acordo de processamento de dados nem uma garantia sobre a configuração final de um operador.',
  },
  /* Owner legal review pending (2026-11-23) */
  privacy: {
    eyebrow: 'Aviso de privacidade',
    sections: [
      {
        id: 'data',
        title: 'Dados que a aplicação trata',
        body: 'O ClawAI trata dados da conta, conversas, prompts, respostas geradas, informações do modelo selecionado, arquivos enviados, memórias, pacotes de contexto, registros de uso, eventos de auditoria, mensagens de suporte e referências de cobrança necessários para prestar o serviço. Os conectores do espaço de trabalho podem tratar conteúdo e identificadores de serviços que um usuário autorizado escolher conectar.',
      },
      {
        id: 'use',
        title: 'Como os dados sustentam o funcionamento do produto',
        body: 'A aplicação usa esses dados para autenticar usuários, executar as ações de IA e do espaço de trabalho solicitadas, manter o contexto, aplicar o acesso e as franquias configurados, diagnosticar falhas, proteger a plataforma, processar o checkout hospedado e responder a pedidos de suporte. Provedores externos recebem apenas as informações necessárias para a operação configurada, sujeitas aos termos deles.',
      },
      {
        id: 'storage',
        title: 'Controles de armazenamento, retenção e exclusão',
        body: 'Os tokens de autenticação são armazenados atualmente no armazenamento local do navegador, junto com preferências como tema e idioma; um e-mail lembrado opcionalmente também pode ser guardado ali. Arquivos e logs operacionais seguem os padrões do repositório descritos na página de segurança. Os usuários podem excluir vários tipos de conteúdo, mas a exclusão completa da conta exige, por enquanto, contatar o operador.',
      },
      {
        id: 'choices',
        title: 'Escolhas e dúvidas',
        body: 'Os usuários podem evitar conectores opcionais, remover conversas, arquivos, memórias e pacotes de contexto, limpar o armazenamento local do navegador e escolher o roteamento de modelos locais quando a implantação o oferecer. Pedidos sobre uma conta, práticas do operador, acesso, correção ou exclusão devem ser enviados pela página de contato, para que o operador responsável possa verificá-los e responder.',
      },
    ],
    evidence:
      'Este aviso intencionalmente não afirma que os dados nunca são vendidos, nunca são usados para treinamento ou são sempre excluídos em um calendário universal, pois esses compromissos operacionais e de provedores não são estabelecidos apenas pelo código do repositório.',
  },
  /* Owner legal review pending (2026-11-23) */
  terms: {
    eyebrow: 'Termos de uso',
    sections: [
      {
        id: 'service',
        title: 'Uso do serviço',
        body: 'Estes termos regem o acesso à aplicação ClawAI e aos seus recursos hospedados ou autogerenciados. Os usuários devem fornecer dados de conta corretos, proteger suas credenciais, cumprir a lei aplicável e usar apenas dados, sistemas e integrações aos quais estejam autorizados a acessar. Termos comerciais adicionais podem se aplicar a uma implantação privada definida separadamente.',
      },
      {
        id: 'availability',
        title: 'Modelos, integrações e conteúdo gerado',
        body: 'A disponibilidade de modelos e provedores pode mudar com a configuração, as credenciais, os serviços de origem, o estado do ciclo de vida e a política do administrador. O conteúdo gerado pode ser incompleto, impreciso, inseguro ou inadequado para uma finalidade específica e deve ser revisado antes de um uso de consequência. O ClawAI não substitui o julgamento profissional jurídico, médico, financeiro ou de segurança.',
      },
      {
        id: 'billing',
        title: 'Planos e pagamento',
        body: 'As assinaturas pagas usam o preço ativo e o intervalo de cobrança exibidos no checkout hospedado com preço definido no servidor. Os valores base do catálogo no site de marketing podem diferir da implantação atual de um administrador. Disponibilidade do gateway, moeda de liquidação, impostos, prazo de cancelamento, reembolsos e outros direitos de pagamento seguem as informações do checkout e a lei aplicável.',
      },
      {
        id: 'changes',
        title: 'Alterações, suspensão e contato',
        body: 'O operador pode alterar recursos, limites, integrações ou estes termos para manter, proteger ou melhorar o serviço. O acesso pode ser restringido por risco de segurança, inadimplência, conduta ilícita ou violação relevante. Os termos atualizados devem trazer uma nova data de vigência, e dúvidas ou disputas devem ser apresentadas pela página de contato para análise.',
      },
    ],
    evidence:
      'Estes termos do produto são uma base factual de lançamento e não aconselhamento jurídico para uma jurisdição específica. O operador responsável deve buscar um advogado antes de confiar neles para um serviço comercial em produção.',
  },
  /* Owner legal review pending (2026-11-23) */
  cookies: {
    eyebrow: 'Cookies e armazenamento do navegador',
    sections: [
      {
        id: 'cookie',
        title: 'O cookie marcador de autenticação',
        body: 'Após o login, o frontend define um cookie marcador curto que informa ao middleware de roteamento que pode existir uma sessão autenticada. O marcador não é a credencial de acesso, é legível pelo cliente e usa SameSite Lax. Os tokens de acesso e de renovação ficam atualmente armazenados separadamente no armazenamento local do navegador, e não em um cookie de autenticação HttpOnly.',
      },
      {
        id: 'local-storage',
        title: 'Armazenamento local usado pela interface',
        body: 'O navegador pode armazenar o estado de autenticação, tema, idioma, preferências de visualização de modelos, informações transitórias do campo de composição e um endereço de e-mail somente quando o usuário escolhe a opção de lembrar o e-mail. Limpar os dados do site remove esses valores locais e pode desconectar o usuário ou redefinir preferências, sem excluir o conteúdo da conta no servidor.',
      },
      {
        id: 'advertising',
        title: 'Tecnologia de publicidade opcional',
        body: 'O layout de marketing contém uma integração com o Google AdSense, ativada por configuração. O repositório atual não oferece uma plataforma completa de gerenciamento de consentimento, portanto os operadores não devem habilitar o armazenamento publicitário opcional onde o consentimento é exigido por lei até implementarem e verificarem um fluxo de consentimento e uma política regional adequados.',
      },
      {
        id: 'control',
        title: 'Controles do navegador e atualizações',
        body: 'Os usuários podem inspecionar, bloquear ou limpar cookies e o armazenamento local pelo navegador, embora bloquear o armazenamento necessário possa impedir a autenticação ou a persistência de preferências. Os operadores devem atualizar este aviso quando mudarem chaves de armazenamento, análises, publicidade, pagamento ou serviços incorporados e alinhar a data de vigência ao comportamento implantado.',
      },
    ],
    evidence:
      'Este aviso descreve o armazenamento visível hoje no repositório. Um operador que implanta o serviço continua responsável por auditar scripts, proxies, análises e comportamentos de gateway adicionais incluídos por configuração.',
  },
  /* Owner legal review pending (2026-11-23) */
  'acceptable-use': {
    eyebrow: 'Uso aceitável',
    sections: [
      {
        id: 'authorised',
        title: 'Use apenas sistemas e dados que você está autorizado a usar',
        body: 'Não use o ClawAI para acessar contas, repositórios, arquivos, redes, dispositivos ou serviços de terceiros sem permissão clara. As ações do espaço de trabalho e as capacidades do agente devem permanecer dentro da autoridade concedida pelo respectivo proprietário. Não contorne aprovações, controles de acesso, limites de taxa, limites de segurança ou a política do administrador.',
      },
      {
        id: 'harm',
        title: 'Não facilite danos nem conduta ilícita',
        body: 'Não use o serviço para criar ou distribuir malware, roubo de credenciais, instruções destrutivas, assédio direcionado, exploração sexual, vigilância ilícita, falsificação enganosa de identidade ou material que viole a lei aplicável ou os direitos de outra pessoa. Decisões de alto impacto exigem revisão por pessoas qualificadas e salvaguardas adequadas.',
      },
      {
        id: 'platform',
        title: 'Proteja a confiabilidade e a integridade do serviço',
        body: 'Não sonde, sobrecarregue, extraia dados em massa, faça engenharia reversa nem interfira em uma implantação, exceto sob um acordo autorizado de testes de segurança. Não automatize a criação de contas, não burle franquias, não oculte origem abusiva, não manipule a cobrança e não use conteúdo gerado para falsear a procedência. Informe suspeitas de vulnerabilidades pelo canal de contato.',
      },
      {
        id: 'enforcement',
        title: 'Revisão e aplicação',
        body: 'O operador pode investigar denúncias críveis, preservar as evidências de auditoria relevantes, limitar um recurso, suspender uma conta ou bloquear o acesso quando razoavelmente necessário para proteger usuários, provedores, infraestrutura ou obrigações legais. Contexto, intenção, gravidade, reincidência e remediação disponível devem orientar qualquer decisão de aplicação.',
      },
    ],
    evidence:
      'Os controles de uso aceitável complementam a autorização técnica e as políticas dos provedores; não as substituem. As implantações privadas devem adaptar os procedimentos de aplicação e de denúncia à sua organização e jurisdição.',
  },
};
