import { AuthEmailKind } from '../../enums/auth-email-kind.enum';
import type { AuthEmailDictionary } from '../types/auth-email-copy.type';

// French (formal "vous") translation of en.copy.ts, which remains the source of
// truth: every key, every order and every null here mirrors the English file.
export const FR_AUTH_EMAIL_DICTIONARY: AuthEmailDictionary = {
  chrome: {
    greeting: 'Bonjour {value},',
    greetingFallback: 'Bonjour,',
    signOff: 'Cordialement,',
    teamName: "L'équipe ClawAI",
    footerNote:
      'Ce message automatique concerne votre compte ClawAI. Merci de ne pas y répondre — les réponses envoyées à cette adresse ne sont pas lues.',
    linkLabel: 'Ouvrir ce lien',
  },
  emails: {
    [AuthEmailKind.VERIFICATION]: {
      subject: 'Confirmez votre adresse e-mail pour activer votre compte ClawAI',
      preheader: "Il ne reste qu'une étape : confirmez votre adresse et votre compte sera prêt.",
      heading: 'Confirmez votre adresse e-mail',
      intro:
        "Nous vous remercions d'avoir créé un compte ClawAI. Pour la sécurité de votre compte, nous devons confirmer que cette adresse vous appartient.",
      bodyLines: [
        "Votre compte a été créé, mais il n'est pas encore actif. Tant que cette adresse n'est pas confirmée, vous ne pourrez pas vous connecter.",
        'Sélectionnez le bouton ci-dessous pour confirmer votre adresse et terminer la configuration de votre compte.',
      ],
      actionLabel: 'Confirmer mon adresse e-mail',
      fallbackNote:
        "Si le bouton ne fonctionne pas, copiez l'adresse ci-dessous dans votre navigateur :",
      expiryNote: 'Pour des raisons de sécurité, ce lien de confirmation expire dans {expiry}.',
      securityNote:
        "Si vous n'êtes pas à l'origine de la création d'un compte ClawAI, vous pouvez ignorer ce message en toute sécurité — aucun compte ne sera activé sans cette confirmation.",
    },
    [AuthEmailKind.PASSWORD_RESET]: {
      subject: 'Réinitialisez votre mot de passe ClawAI',
      preheader: 'Utilisez le lien sécurisé ci-dessous pour choisir un nouveau mot de passe.',
      heading: 'Réinitialisez votre mot de passe',
      intro:
        'Nous avons reçu une demande de réinitialisation du mot de passe du compte ClawAI associé à cette adresse.',
      bodyLines: [
        "Sélectionnez le bouton ci-dessous pour choisir un nouveau mot de passe. Votre mot de passe actuel reste valable tant que vous ne l'avez pas fait.",
        'Pour votre sécurité, une nouvelle connexion pourra vous être demandée sur vos autres appareils après ce changement.',
      ],
      actionLabel: 'Choisir un nouveau mot de passe',
      fallbackNote:
        "Si le bouton ne fonctionne pas, copiez l'adresse ci-dessous dans votre navigateur :",
      expiryNote:
        "Pour des raisons de sécurité, ce lien de réinitialisation expire dans {expiry} et ne peut être utilisé qu'une seule fois.",
      securityNote:
        "Si vous n'avez pas demandé de réinitialisation, aucune action n'est nécessaire — votre mot de passe n'a pas été modifié. Si cette situation se reproduit, veuillez contacter notre équipe d'assistance.",
    },
    [AuthEmailKind.TEMPORARY_PASSWORD]: {
      subject: 'Un mot de passe temporaire a été émis pour votre compte ClawAI',
      preheader:
        'Connectez-vous avec le mot de passe temporaire, puis définissez-en un nouveau sans attendre.',
      heading: 'Votre mot de passe temporaire',
      intro:
        'Un administrateur a émis un mot de passe temporaire pour votre compte ClawAI. Votre ancien mot de passe ne fonctionne plus.',
      bodyLines: [
        'Votre mot de passe temporaire est : {value}',
        "Connectez-vous avec ce mot de passe : il vous sera immédiatement demandé d'en choisir un nouveau. Ne communiquez ce mot de passe à personne.",
      ],
      actionLabel: 'Se connecter à ClawAI',
      fallbackNote:
        "Si le bouton ne fonctionne pas, copiez l'adresse ci-dessous dans votre navigateur :",
      expiryNote: 'Veuillez vous connecter et modifier ce mot de passe dès que possible.',
      securityNote:
        "Si vous ne vous attendiez pas à ce message, contactez immédiatement notre équipe d'assistance — une personne disposant d'un accès administrateur a modifié vos identifiants de connexion.",
    },
    [AuthEmailKind.EMAIL_CHANGE_OTP]: {
      subject: 'Votre code de vérification pour la modification de votre adresse e-mail ClawAI',
      preheader: "Saisissez ce code pour confirmer le changement d'adresse sur votre compte.",
      heading: "Confirmez ce changement d'adresse",
      intro:
        "Une demande de modification de l'adresse e-mail de votre compte ClawAI vers {value} a été enregistrée. Pour continuer, confirmez-la depuis votre adresse actuelle.",
      bodyLines: [
        'Saisissez ce code de vérification dans la fenêtre de navigateur où vous avez commencé la modification.',
      ],
      actionLabel: null,
      fallbackNote: null,
      expiryNote:
        'Ce code expire dans {expiry}. Ne le communiquez jamais à personne, pas même à nos collaborateurs.',
      securityNote:
        "Si vous n'êtes pas à l'origine de cette demande, ne saisissez pas le code. Modifiez immédiatement votre mot de passe et contactez notre équipe d'assistance — une autre personne pourrait avoir accès à votre compte.",
    },
    [AuthEmailKind.EMAIL_CHANGE_CONFIRM]: {
      subject: 'Confirmez votre nouvelle adresse e-mail ClawAI',
      preheader: 'Confirmez cette adresse pour achever le transfert de votre compte vers celle-ci.',
      heading: 'Confirmez votre nouvelle adresse',
      intro:
        "Cette adresse a été indiquée comme nouvelle adresse e-mail d'un compte ClawAI. Une dernière confirmation suffit pour finaliser le changement.",
      bodyLines: [
        'Une fois confirmée, cette adresse deviendra celle que vous utiliserez pour vous connecter et celle à laquelle nous enverrons les messages relatifs à votre compte.',
      ],
      actionLabel: 'Confirmer cette adresse',
      fallbackNote:
        "Si le bouton ne fonctionne pas, copiez l'adresse ci-dessous dans votre navigateur :",
      expiryNote: 'Pour des raisons de sécurité, ce lien de confirmation expire dans {expiry}.',
      securityNote:
        'Si vous ne vous attendiez pas à ce message, ignorez-le. Le changement ne peut pas aboutir sans cette confirmation.',
    },
    [AuthEmailKind.EMAIL_CHANGE_COMPLETED]: {
      subject: "L'adresse e-mail de votre compte ClawAI a été modifiée",
      preheader: "Une confirmation que l'adresse de votre compte a bien été modifiée.",
      heading: 'Votre adresse e-mail a été modifiée',
      intro:
        "L'adresse e-mail utilisée pour vous connecter à votre compte ClawAI a été modifiée. Ce message est envoyé à votre ancienne adresse afin que vous en conserviez une trace.",
      bodyLines: [
        'Les messages relatifs à votre compte seront désormais envoyés à la nouvelle adresse, qui servira également à la connexion.',
      ],
      actionLabel: null,
      fallbackNote: null,
      expiryNote: null,
      securityNote:
        "Si vous n'êtes pas à l'origine de ce changement, contactez immédiatement notre équipe d'assistance — une autre personne pourrait avoir accès à votre compte.",
    },
  },
};
