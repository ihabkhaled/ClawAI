import { AuthEmailKind } from '../../enums/auth-email-kind.enum';
import type { AuthEmailDictionary } from '../types/auth-email-copy.type';

// Japanese (敬語) translation of en.copy.ts, the source of truth for auth email copy.
// Every key, order and null here mirrors the English dictionary exactly.
export const JA_AUTH_EMAIL_DICTIONARY: AuthEmailDictionary = {
  chrome: {
    greeting: '{value} 様',
    greetingFallback: 'お客様',
    signOff: '今後ともよろしくお願い申し上げます。',
    teamName: 'ClawAI チーム',
    footerNote:
      '本メールは、お客様の ClawAI アカウントに関する自動配信メールです。本アドレスへのご返信は確認いたしかねますので、ご返信はお控えくださいますようお願い申し上げます。',
    linkLabel: 'このリンクを開く',
  },
  emails: {
    [AuthEmailKind.VERIFICATION]: {
      subject: 'ClawAI アカウントを有効化するため、メールアドレスをご確認ください',
      preheader: 'あと一歩です。メールアドレスをご確認いただくと、アカウントをご利用いただけます。',
      heading: 'メールアドレスのご確認',
      intro:
        'この度は ClawAI アカウントをご登録いただき、誠にありがとうございます。アカウントを保護するため、本メールアドレスがお客様ご本人のものであることを確認させていただく必要がございます。',
      bodyLines: [
        'アカウントは作成されておりますが、まだ有効になっておりません。本メールアドレスのご確認が完了するまで、サインインはできませんのでご了承ください。',
        '下のボタンを選択して本メールアドレスをご確認いただき、アカウントの設定を完了してください。',
      ],
      actionLabel: 'メールアドレスを確認する',
      fallbackNote:
        'ボタンが機能しない場合は、下記のアドレスをコピーしてブラウザーに貼り付けてください。',
      expiryNote: 'セキュリティ保護のため、この確認用リンクは {expiry} で有効期限が切れます。',
      securityNote:
        'ClawAI アカウントの作成にお心当たりがない場合は、本メールを破棄していただいて差し支えありません。このご確認がない限り、アカウントが有効になることはございません。',
    },
    [AuthEmailKind.PASSWORD_RESET]: {
      subject: 'ClawAI のパスワードの再設定について',
      preheader: '本メール内の安全なリンクから、新しいパスワードをご設定ください。',
      heading: 'パスワードの再設定',
      intro:
        '本メールアドレスに紐づく ClawAI アカウントについて、パスワード再設定のご依頼を承りました。',
      bodyLines: [
        '下のボタンを選択して、新しいパスワードをご設定ください。ご設定が完了するまで、現在のパスワードは引き続きご利用いただけます。',
        'セキュリティ保護のため、変更後は他のご利用端末で改めてサインインが必要になる場合がございます。',
      ],
      actionLabel: '新しいパスワードを設定する',
      fallbackNote:
        'ボタンが機能しない場合は、下記のアドレスをコピーしてブラウザーに貼り付けてください。',
      expiryNote:
        'セキュリティ保護のため、この再設定用リンクは {expiry} で有効期限が切れ、一度のみご利用いただけます。',
      securityNote:
        'パスワードの再設定にお心当たりがない場合、お客様側でのお手続きは必要ございません。パスワードは変更されておりません。同様のメールが繰り返し届く場合は、サポートチームまでご連絡ください。',
    },
    [AuthEmailKind.TEMPORARY_PASSWORD]: {
      subject: 'ClawAI アカウントに仮パスワードが発行されました',
      preheader: '仮パスワードでサインインのうえ、速やかに新しいパスワードをご設定ください。',
      heading: '仮パスワードのお知らせ',
      intro:
        '管理者により、お客様の ClawAI アカウントに仮パスワードが発行されました。これまでのパスワードはご利用いただけません。',
      bodyLines: [
        '仮パスワードは次のとおりです: {value}',
        'この仮パスワードでサインインいただくと、直ちに新しいパスワードの設定をご案内いたします。このパスワードは、いかなる方にも共有なさらないでください。',
      ],
      actionLabel: 'ClawAI にサインインする',
      fallbackNote:
        'ボタンが機能しない場合は、下記のアドレスをコピーしてブラウザーに貼り付けてください。',
      expiryNote: 'できる限り速やかにサインインのうえ、このパスワードをご変更ください。',
      securityNote:
        '本メールにお心当たりがない場合は、直ちにサポートチームまでご連絡ください。管理者権限を持つ何者かが、お客様のサインイン情報を変更した可能性がございます。',
    },
    [AuthEmailKind.EMAIL_CHANGE_OTP]: {
      subject: 'ClawAI のメールアドレス変更に関する確認コード',
      preheader: 'アカウントのメールアドレス変更を確定するため、この確認コードをご入力ください。',
      heading: 'メールアドレス変更のご確認',
      intro:
        'お客様の ClawAI アカウントのメールアドレスを {value} に変更するご依頼を承りました。お手続きを続けるには、現在のメールアドレスからご確認をお願いいたします。',
      bodyLines: ['変更のお手続きを開始されたブラウザーの画面で、この確認コードをご入力ください。'],
      actionLabel: null,
      fallbackNote: null,
      expiryNote:
        'この確認コードは {expiry} で有効期限が切れます。当社の担当者を含め、いかなる方にも絶対に共有なさらないでください。',
      securityNote:
        '本変更にお心当たりがない場合は、確認コードを入力なさらないでください。直ちにパスワードを変更のうえ、サポートチームまでご連絡ください。第三者がお客様のアカウントにアクセスしている可能性がございます。',
    },
    [AuthEmailKind.EMAIL_CHANGE_CONFIRM]: {
      subject: '新しい ClawAI メールアドレスのご確認',
      preheader: 'このアドレスをご確認いただくと、アカウントの移行が完了します。',
      heading: '新しいメールアドレスのご確認',
      intro:
        '本メールアドレスが、ClawAI アカウントの新しいメールアドレスとして登録されました。最後にもう一度ご確認いただくことで、変更が完了いたします。',
      bodyLines: [
        'ご確認が完了しますと、本メールアドレスがサインインにご利用いただくアドレスとなり、アカウントに関するご連絡もこちらへお送りいたします。',
      ],
      actionLabel: 'このアドレスを確認する',
      fallbackNote:
        'ボタンが機能しない場合は、下記のアドレスをコピーしてブラウザーに貼り付けてください。',
      expiryNote: 'セキュリティ保護のため、この確認用リンクは {expiry} で有効期限が切れます。',
      securityNote:
        '本メールにお心当たりがない場合は、破棄していただいて差し支えありません。このご確認がない限り、変更が完了することはございません。',
    },
    [AuthEmailKind.EMAIL_CHANGE_COMPLETED]: {
      subject: 'ClawAI アカウントのメールアドレスが変更されました',
      preheader: 'アカウントのメールアドレス変更が完了したことをお知らせいたします。',
      heading: 'メールアドレスが変更されました',
      intro:
        'お客様の ClawAI アカウントへのサインインにご利用いただくメールアドレスが変更されました。記録としてお手元に残していただくため、本メールは変更前のアドレス宛にお送りしております。',
      bodyLines: [
        '今後、アカウントに関するご連絡は新しいメールアドレス宛にお送りし、サインインにも新しいアドレスをご利用いただきます。',
      ],
      actionLabel: null,
      fallbackNote: null,
      expiryNote: null,
      securityNote:
        'この変更にお心当たりがない場合は、直ちにサポートチームまでご連絡ください。第三者がお客様のアカウントにアクセスしている可能性がございます。',
    },
  },
};
