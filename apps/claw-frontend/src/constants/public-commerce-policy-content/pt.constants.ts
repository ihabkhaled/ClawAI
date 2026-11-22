import { PUBLIC_CONTACT_EMAIL } from '@/constants/public-contact.constants';
import { PublicLaunchPageSlug } from '@/enums/public-launch-page-slug.enum';
import type { PublicCommercePolicyLocaleContent } from '@/types/public-launch-content.types';

export const PT_PUBLIC_COMMERCE_POLICY_CONTENT: PublicCommercePolicyLocaleContent = {
  pages: {
    [PublicLaunchPageSlug.DELIVERY_SHIPPING]: {
      eyebrow: 'Política de entrega e envio',
      sections: [
        {
          id: 'digital-service',
          title: 'O ClawAI é um serviço digital',
          body: 'O ClawAI é um serviço de software on-line usado em um navegador da web e nos aplicativos compatíveis. Não há produto físico: nada é embalado, enviado pelo correio ou despachado, e nenhum endereço de entrega é solicitado. Tudo o que um plano inclui é entregue pela internet à conta que o comprou.',
        },
        {
          id: 'instant-access',
          title: 'O acesso é on-line e imediato',
          body: 'Uma conta gratuita fica pronta assim que o cadastro é concluído. Quando um plano pago é comprado, ele é aplicado à conta assim que o pagamento é confirmado, normalmente na hora, e você pode entrar e usá-lo imediatamente. Não há período de espera nem prazo de entrega além dessa ativação instantânea da conta.',
        },
        {
          id: 'no-fees',
          title: 'Sem taxas de envio ou entrega',
          body: 'Como nada físico é enviado, o ClawAI nunca cobra taxas de envio, manuseio, alfândega ou entrega. O preço de um plano é o valor mostrado no pagamento. Os arquivos que você cria no produto, como documentos ou imagens, são baixados da sua conta e não são enviados a você pelo correio.',
        },
        {
          id: 'access-problems',
          title: 'Se você não consegue acessar o que pagou',
          body: `Se um pagamento foi aprovado, mas o plano não aparece na sua conta ou você não consegue entrar, escreva para ${PUBLIC_CONTACT_EMAIL} informando o e-mail da conta e, se tiver, a referência do pagamento. Verificaremos o pagamento e a conta e resolveremos o acesso ao que você pagou.`,
        },
      ],
      evidence:
        'O ClawAI é operado on-line a partir do Cairo, Egito. A entrega de uma assinatura é a ativação da conta para a qual ela foi comprada, e o checkout hospedado mostra o preço vigente antes do pagamento.',
    },
    [PublicLaunchPageSlug.REFUND_CANCELLATION]: {
      eyebrow: 'Política de reembolso e cancelamento',
      sections: [
        {
          id: 'cancel',
          title: 'Cancele quando quiser pela sua conta',
          body: 'Você pode cancelar uma assinatura paga a qualquer momento nas configurações de faturamento da sua conta. O cancelamento interrompe a renovação da assinatura, então o próximo período de cobrança não é cobrado. Você não precisa escrever para ninguém nem dar um motivo para cancelar.',
        },
        {
          id: 'access-after-cancel',
          title: 'O acesso continua até o fim do período pago',
          body: 'Depois do cancelamento, o plano continua ativo até o fim do período que você já pagou, seja um mês ou um prazo maior. Seus recursos pagos ficam disponíveis até essa data e, então, a assinatura termina em vez de ser renovada e cobrada novamente.',
        },
        {
          id: 'refunds',
          title: 'Quando um reembolso é concedido',
          body: 'O período pago atual, e qualquer período já utilizado, não é reembolsado, porque o acesso ao serviço já foi fornecido. Reembolsos são concedidos apenas quando cometemos um erro de cobrança, como uma cobrança duplicada ou incorreta, ou quando a lei aplicável a você exige. Quando um pagamento é reembolsado integralmente, o acesso pago que ele comprou termina.',
        },
        {
          id: 'trial-and-requests',
          title: 'Teste gratuito e como pedir um reembolso',
          body: `O teste gratuito de 90 dias não exige cartão de pagamento, então nada é cobrado e não há nada a reembolsar enquanto você experimenta o ClawAI. Para informar um erro de cobrança ou pedir um reembolso, escreva para ${PUBLIC_CONTACT_EMAIL} com o e-mail da conta, a data e o valor da cobrança e a referência do pagamento, se tiver.`,
        },
      ],
      evidence:
        'Esta política complementa os Termos de uso, segundo os quais as condições de pagamento seguem as informações exibidas no checkout e a lei aplicável. O preço vigente e o intervalo de cobrança são mostrados no checkout hospedado antes de você pagar.',
    },
  },
  labels: {
    onThisPage: 'Nesta página',
    evidence: 'Nota verificável',
    lastReviewed: 'Última revisão',
    effectiveDate: 'Data de vigência',
    startFree: 'Criar uma conta gratuita',
    contactTeam: 'Falar com a equipe',
    companyDetailsTitle: 'Dados da empresa',
    emailLabel: 'E-mail',
    phoneLabel: 'Telefone',
    addressLabel: 'Endereço',
    addressNote:
      'O ClawAI é um serviço on-line. Não há escritório aberto a visitantes, por isso entre em contato conosco por e-mail.',
  },
  seo: {
    [PublicLaunchPageSlug.DELIVERY_SHIPPING]: {
      title: 'Política de entrega e envio',
      description:
        'O ClawAI é um serviço digital: o acesso é on-line e começa assim que o cadastro ou o pagamento é confirmado. Nada é enviado e não há taxas de entrega.',
      keywords: ['política de entrega', 'política de envio', 'acesso a serviço digital'],
    },
    [PublicLaunchPageSlug.REFUND_CANCELLATION]: {
      title: 'Política de reembolso e cancelamento',
      description:
        'Cancele uma assinatura do ClawAI a qualquer momento no faturamento. O acesso vai até o fim do período pago; reembolso em caso de erro de cobrança ou quando a lei exigir.',
      keywords: ['política de reembolso', 'política de cancelamento', 'cancelar assinatura'],
    },
  },
};
