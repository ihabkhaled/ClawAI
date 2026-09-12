import { AuthEmailKind } from '../../enums/auth-email-kind.enum';
import type { AuthEmailDictionary } from '../types/auth-email-copy.type';

// Simplified Chinese (formal register) translation of en.copy.ts, the source of truth
// for auth email copy. Every key, order and null here mirrors the English dictionary.
export const ZH_AUTH_EMAIL_DICTIONARY: AuthEmailDictionary = {
  chrome: {
    greeting: '尊敬的 {value}：',
    greetingFallback: '尊敬的用户：',
    signOff: '顺致敬意，',
    teamName: 'ClawAI 团队',
    footerNote:
      '本邮件为有关您 ClawAI 账户的系统自动通知。请勿回复本邮件，发送至该地址的回复不会被查阅。',
    linkLabel: '打开此链接',
  },
  emails: {
    [AuthEmailKind.VERIFICATION]: {
      subject: '请确认您的邮箱地址以激活 ClawAI 账户',
      preheader: '仅剩一步：确认您的邮箱地址后，账户即可正常使用。',
      heading: '确认您的邮箱地址',
      intro: '感谢您注册 ClawAI 账户。为保障您的账户安全，我们需要确认该邮箱地址确属您本人所有。',
      bodyLines: [
        '您的账户已创建，但尚未激活。在该邮箱地址完成确认之前，您将无法登录。',
        '请点击下方按钮确认您的邮箱地址，并完成账户设置。',
      ],
      actionLabel: '确认我的邮箱地址',
      fallbackNote: '如果按钮无法使用，请复制下方地址并粘贴至您的浏览器中打开。',
      expiryNote: '为保障安全，此确认链接将在 {expiry} 后失效。',
      securityNote:
        '如果您并未注册 ClawAI 账户，可放心忽略本邮件；未经此次确认，任何账户都不会被激活。',
    },
    [AuthEmailKind.PASSWORD_RESET]: {
      subject: '重置您的 ClawAI 密码',
      preheader: '请使用邮件内的安全链接设置新密码。',
      heading: '重置您的密码',
      intro: '我们收到了为与该邮箱地址关联的 ClawAI 账户重置密码的请求。',
      bodyLines: [
        '请点击下方按钮设置新密码。在您完成设置之前，当前密码仍然有效。',
        '为保障您的安全，密码变更后，您在其他设备上可能需要重新登录。',
      ],
      actionLabel: '设置新密码',
      fallbackNote: '如果按钮无法使用，请复制下方地址并粘贴至您的浏览器中打开。',
      expiryNote: '为保障安全，此重置链接将在 {expiry} 后失效，且仅可使用一次。',
      securityNote:
        '如果您并未申请重置密码，则无需进行任何操作，您的密码尚未被更改。如果此类邮件反复出现，请联系我们的支持团队。',
    },
    [AuthEmailKind.TEMPORARY_PASSWORD]: {
      subject: '您的 ClawAI 账户已获发临时密码',
      preheader: '请使用临时密码登录，并立即设置新密码。',
      heading: '您的临时密码',
      intro: '管理员已为您的 ClawAI 账户签发临时密码。您此前使用的密码已不再有效。',
      bodyLines: [
        '您的临时密码为：{value}',
        '使用该密码登录后，系统将立即要求您设置新密码。请勿将此密码透露给任何人。',
      ],
      actionLabel: '登录 ClawAI',
      fallbackNote: '如果按钮无法使用，请复制下方地址并粘贴至您的浏览器中打开。',
      expiryNote: '请尽快登录并更改此密码。',
      securityNote:
        '如果这并非您所预期的操作，请立即联系我们的支持团队：可能有拥有管理员权限的人员更改了您的登录信息。',
    },
    [AuthEmailKind.EMAIL_CHANGE_OTP]: {
      subject: '变更 ClawAI 邮箱地址的验证码',
      preheader: '请输入此验证码，以确认变更您账户的邮箱地址。',
      heading: '确认此次邮箱地址变更',
      intro:
        '我们收到了将您 ClawAI 账户的邮箱地址变更为 {value} 的请求。如需继续，请通过您当前的邮箱地址进行确认。',
      bodyLines: ['请在您发起此次变更的浏览器窗口中输入此验证码。'],
      actionLabel: null,
      fallbackNote: null,
      expiryNote: '此验证码将在 {expiry} 后失效。请勿向任何人透露，包括我们的工作人员。',
      securityNote:
        '如果您并未申请此次变更，请勿输入该验证码。请立即更改您的密码并联系我们的支持团队：可能已有他人能够访问您的账户。',
    },
    [AuthEmailKind.EMAIL_CHANGE_CONFIRM]: {
      subject: '确认您的新 ClawAI 邮箱地址',
      preheader: '确认此邮箱地址，即可完成账户邮箱的迁移。',
      heading: '确认您的新邮箱地址',
      intro:
        '该邮箱地址已被填写为某一 ClawAI 账户的新邮箱地址。只需最后一次确认，即可完成此次变更。',
      bodyLines: [
        '确认完成后，该邮箱地址将成为您登录时使用的地址，我们也会将账户相关通知发送至该地址。',
      ],
      actionLabel: '确认此邮箱地址',
      fallbackNote: '如果按钮无法使用，请复制下方地址并粘贴至您的浏览器中打开。',
      expiryNote: '为保障安全，此确认链接将在 {expiry} 后失效。',
      securityNote: '如果这并非您所预期的操作，请忽略本邮件。未经此次确认，该变更无法完成。',
    },
    [AuthEmailKind.EMAIL_CHANGE_COMPLETED]: {
      subject: '您 ClawAI 账户的邮箱地址已变更',
      preheader: '兹确认您账户的邮箱地址已完成变更。',
      heading: '您的邮箱地址已变更',
      intro:
        '用于登录您 ClawAI 账户的邮箱地址已完成变更。本邮件发送至您此前的邮箱地址，以便您留存记录。',
      bodyLines: ['此后，账户相关通知将发送至新的邮箱地址，登录时亦将使用该地址。'],
      actionLabel: null,
      fallbackNote: null,
      expiryNote: null,
      securityNote:
        '如果此次变更并非由您本人进行，请立即联系我们的支持团队：可能已有他人能够访问您的账户。',
    },
  },
};
