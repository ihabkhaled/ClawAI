import { AuthEmailKind } from '../../enums/auth-email-kind.enum';
import type { AuthEmailDictionary } from '../types/auth-email-copy.type';

// English is the source of truth for auth email copy: every other locale in
// this folder is a translation of exactly these strings, and the shared
// AuthEmailDictionary type is what forces them to stay in step.
export const EN_AUTH_EMAIL_DICTIONARY: AuthEmailDictionary = {
  chrome: {
    greeting: 'Hello {value},',
    greetingFallback: 'Hello,',
    signOff: 'Kind regards,',
    teamName: 'The ClawAI Team',
    footerNote:
      'This is an automated message about your ClawAI account. Please do not reply to it — replies to this address are not read.',
    linkLabel: 'Open this link',
  },
  emails: {
    [AuthEmailKind.VERIFICATION]: {
      subject: 'Confirm your email address to activate your ClawAI account',
      preheader: 'One step left: confirm your address and your account is ready.',
      heading: 'Confirm your email address',
      intro:
        'Thank you for creating a ClawAI account. To protect your account we need to confirm that this address belongs to you.',
      bodyLines: [
        'Your account has been created but is not active yet. Until this address is confirmed you will not be able to sign in.',
        'Select the button below to confirm your address and finish setting up your account.',
      ],
      actionLabel: 'Confirm my email address',
      fallbackNote: 'If the button does not work, copy the address below into your browser:',
      expiryNote: 'For security, this confirmation link expires in {expiry}.',
      securityNote:
        'If you did not create a ClawAI account, you can safely ignore this message — no account will be activated without this confirmation.',
    },
    [AuthEmailKind.PASSWORD_RESET]: {
      subject: 'Reset your ClawAI password',
      preheader: 'Use the secure link inside to choose a new password.',
      heading: 'Reset your password',
      intro:
        'We received a request to reset the password for the ClawAI account linked to this address.',
      bodyLines: [
        'Select the button below to choose a new password. Your current password stays active until you do.',
        'For your security, signing in again on your other devices may be required after the change.',
      ],
      actionLabel: 'Choose a new password',
      fallbackNote: 'If the button does not work, copy the address below into your browser:',
      expiryNote: 'For security, this reset link expires in {expiry} and can be used only once.',
      securityNote:
        'If you did not request a password reset, no action is needed — your password has not been changed. If this keeps happening, please contact our support team.',
    },
    [AuthEmailKind.TEMPORARY_PASSWORD]: {
      subject: 'A temporary password has been issued for your ClawAI account',
      preheader: 'Sign in with the temporary password and set a new one straight away.',
      heading: 'Your temporary password',
      intro:
        'An administrator has issued a temporary password for your ClawAI account. Your previous password no longer works.',
      bodyLines: [
        'Your temporary password is: {value}',
        'Sign in with it and you will be asked to choose a new password immediately. Do not share this password with anyone.',
      ],
      actionLabel: 'Sign in to ClawAI',
      fallbackNote: 'If the button does not work, copy the address below into your browser:',
      expiryNote: 'Please sign in and change this password as soon as you can.',
      securityNote:
        'If you were not expecting this, contact our support team right away — someone with administrator access has changed your sign-in details.',
    },
    [AuthEmailKind.EMAIL_CHANGE_OTP]: {
      subject: 'Your verification code for changing your ClawAI email address',
      preheader: 'Enter this code to confirm the change of address on your account.',
      heading: 'Confirm this change of address',
      intro:
        'A request was made to change the email address on your ClawAI account to {value}. To continue, confirm it from your current address.',
      bodyLines: ['Enter this verification code in the browser window where you began the change.'],
      actionLabel: null,
      fallbackNote: null,
      expiryNote: 'This code expires in {expiry}. Never share it with anyone, including our staff.',
      securityNote:
        'If you did not request this change, do not enter the code. Change your password immediately and contact our support team — someone may have access to your account.',
    },
    [AuthEmailKind.EMAIL_CHANGE_CONFIRM]: {
      subject: 'Confirm your new ClawAI email address',
      preheader: 'Confirm this address to finish moving your account to it.',
      heading: 'Confirm your new address',
      intro:
        'This address was given as the new email address for a ClawAI account. One last confirmation finishes the change.',
      bodyLines: [
        'Once confirmed, this address becomes the address you sign in with and the address we send account messages to.',
      ],
      actionLabel: 'Confirm this address',
      fallbackNote: 'If the button does not work, copy the address below into your browser:',
      expiryNote: 'For security, this confirmation link expires in {expiry}.',
      securityNote:
        'If you were not expecting this, ignore this message. The change cannot complete without this confirmation.',
    },
    [AuthEmailKind.EMAIL_CHANGE_COMPLETED]: {
      subject: 'The email address on your ClawAI account was changed',
      preheader: 'A confirmation that the address on your account has changed.',
      heading: 'Your email address was changed',
      intro:
        'The email address used to sign in to your ClawAI account has been changed. This message is going to your previous address so you have a record of it.',
      bodyLines: [
        'Account messages will now be sent to the new address, and sign-in uses it from now on.',
      ],
      actionLabel: null,
      fallbackNote: null,
      expiryNote: null,
      securityNote:
        'If you did not make this change, contact our support team immediately — someone else may have access to your account.',
    },
  },
};
