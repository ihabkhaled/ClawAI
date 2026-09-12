import { AuthEmailKind } from '../../enums/auth-email-kind.enum';
import type { AuthEmailDictionary } from '../types/auth-email-copy.type';

// Portuguese (formal) translation of EN_AUTH_EMAIL_DICTIONARY. Same keys, same
// order and the same placeholders as the English source of truth.
export const PT_AUTH_EMAIL_DICTIONARY: AuthEmailDictionary = {
  chrome: {
    greeting: 'Olá {value},',
    greetingFallback: 'Olá,',
    signOff: 'Com os melhores cumprimentos,',
    teamName: 'A equipa ClawAI',
    footerNote:
      'Esta é uma mensagem automática relativa à sua conta ClawAI. Por favor, não responda a este e-mail — as respostas enviadas para este endereço não são lidas.',
    linkLabel: 'Abrir esta ligação',
  },
  emails: {
    [AuthEmailKind.VERIFICATION]: {
      subject: 'Confirme o seu endereço de e-mail para ativar a sua conta ClawAI',
      preheader: 'Falta apenas um passo: confirme o seu endereço e a sua conta ficará pronta.',
      heading: 'Confirme o seu endereço de e-mail',
      intro:
        'Obrigado por criar uma conta ClawAI. Para proteger a sua conta, precisamos de confirmar que este endereço lhe pertence.',
      bodyLines: [
        'A sua conta foi criada, mas ainda não está ativa. Enquanto este endereço não for confirmado, não lhe será possível iniciar sessão.',
        'Selecione o botão abaixo para confirmar o seu endereço e concluir a configuração da sua conta.',
      ],
      actionLabel: 'Confirmar o meu endereço de e-mail',
      fallbackNote: 'Se o botão não funcionar, copie o endereço abaixo para o seu navegador:',
      expiryNote:
        'Por motivos de segurança, esta ligação de confirmação expira dentro de {expiry}.',
      securityNote:
        'Se não criou uma conta ClawAI, pode ignorar esta mensagem com segurança — nenhuma conta será ativada sem esta confirmação.',
    },
    [AuthEmailKind.PASSWORD_RESET]: {
      subject: 'Redefina a sua palavra-passe ClawAI',
      preheader: 'Utilize a ligação segura incluída para escolher uma nova palavra-passe.',
      heading: 'Redefina a sua palavra-passe',
      intro:
        'Recebemos um pedido de redefinição da palavra-passe da conta ClawAI associada a este endereço.',
      bodyLines: [
        'Selecione o botão abaixo para escolher uma nova palavra-passe. A sua palavra-passe atual permanece válida até que o faça.',
        'Para sua segurança, poderá ser necessário iniciar sessão novamente nos seus outros dispositivos após a alteração.',
      ],
      actionLabel: 'Escolher uma nova palavra-passe',
      fallbackNote: 'Se o botão não funcionar, copie o endereço abaixo para o seu navegador:',
      expiryNote:
        'Por motivos de segurança, esta ligação de redefinição expira dentro de {expiry} e só pode ser utilizada uma vez.',
      securityNote:
        'Se não solicitou a redefinição da palavra-passe, não é necessária qualquer ação — a sua palavra-passe não foi alterada. Se esta situação se repetir, contacte a nossa equipa de apoio ao cliente.',
    },
    [AuthEmailKind.TEMPORARY_PASSWORD]: {
      subject: 'Foi emitida uma palavra-passe temporária para a sua conta ClawAI',
      preheader: 'Inicie sessão com a palavra-passe temporária e defina de imediato uma nova.',
      heading: 'A sua palavra-passe temporária',
      intro:
        'Um administrador emitiu uma palavra-passe temporária para a sua conta ClawAI. A sua palavra-passe anterior deixou de ser válida.',
      bodyLines: [
        'A sua palavra-passe temporária é: {value}',
        'Inicie sessão com ela e ser-lhe-á pedido que escolha imediatamente uma nova palavra-passe. Não partilhe esta palavra-passe com ninguém.',
      ],
      actionLabel: 'Iniciar sessão no ClawAI',
      fallbackNote: 'Se o botão não funcionar, copie o endereço abaixo para o seu navegador:',
      expiryNote:
        'Por favor, inicie sessão e altere esta palavra-passe assim que lhe for possível.',
      securityNote:
        'Se não estava à espera desta mensagem, contacte de imediato a nossa equipa de apoio ao cliente — alguém com acesso de administrador alterou os seus dados de início de sessão.',
    },
    [AuthEmailKind.EMAIL_CHANGE_OTP]: {
      subject: 'O seu código de verificação para alterar o seu endereço de e-mail ClawAI',
      preheader: 'Introduza este código para confirmar a alteração de endereço na sua conta.',
      heading: 'Confirme esta alteração de endereço',
      intro:
        'Foi efetuado um pedido para alterar o endereço de e-mail da sua conta ClawAI para {value}. Para continuar, confirme-o a partir do seu endereço atual.',
      bodyLines: [
        'Introduza este código de verificação na janela do navegador onde iniciou a alteração.',
      ],
      actionLabel: null,
      fallbackNote: null,
      expiryNote:
        'Este código expira dentro de {expiry}. Nunca o partilhe com ninguém, incluindo os nossos colaboradores.',
      securityNote:
        'Se não solicitou esta alteração, não introduza o código. Altere imediatamente a sua palavra-passe e contacte a nossa equipa de apoio ao cliente — alguém poderá ter acesso à sua conta.',
    },
    [AuthEmailKind.EMAIL_CHANGE_CONFIRM]: {
      subject: 'Confirme o seu novo endereço de e-mail ClawAI',
      preheader: 'Confirme este endereço para concluir a transferência da sua conta.',
      heading: 'Confirme o seu novo endereço',
      intro:
        'Este endereço foi indicado como o novo endereço de e-mail de uma conta ClawAI. Uma última confirmação conclui a alteração.',
      bodyLines: [
        'Depois de confirmado, este passa a ser o endereço com o qual inicia sessão e o endereço para o qual enviamos as mensagens relativas à sua conta.',
      ],
      actionLabel: 'Confirmar este endereço',
      fallbackNote: 'Se o botão não funcionar, copie o endereço abaixo para o seu navegador:',
      expiryNote:
        'Por motivos de segurança, esta ligação de confirmação expira dentro de {expiry}.',
      securityNote:
        'Se não estava à espera desta mensagem, ignore-a. A alteração não pode ser concluída sem esta confirmação.',
    },
    [AuthEmailKind.EMAIL_CHANGE_COMPLETED]: {
      subject: 'O endereço de e-mail da sua conta ClawAI foi alterado',
      preheader: 'Uma confirmação de que o endereço da sua conta foi alterado.',
      heading: 'O seu endereço de e-mail foi alterado',
      intro:
        'O endereço de e-mail utilizado para iniciar sessão na sua conta ClawAI foi alterado. Enviamos esta mensagem para o seu endereço anterior para que fique com um registo do sucedido.',
      bodyLines: [
        'As mensagens relativas à conta passarão a ser enviadas para o novo endereço, que será também utilizado no início de sessão a partir de agora.',
      ],
      actionLabel: null,
      fallbackNote: null,
      expiryNote: null,
      securityNote:
        'Se não efetuou esta alteração, contacte imediatamente a nossa equipa de apoio ao cliente — outra pessoa poderá ter acesso à sua conta.',
    },
  },
};
