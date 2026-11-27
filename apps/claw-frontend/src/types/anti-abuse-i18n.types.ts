/** `auth.botCheck.*`: the browser check and the anti-abuse refusals on sign-up and sign-in. */
export type BotCheckAuthTranslation = {
  checking: string;
  widgetLabel: string;
  requiredTitle: string;
  requiredDescription: string;
  failedTitle: string;
  failedDescription: string;
  disposableEmail: string;
  emailUndeliverable: string;
  signupLimitedTitle: string;
  signupLimitedInMinutes: string;
  signupLimitedInOneMinute: string;
  signupLimitedFallback: string;
};

/** `adminSecurity.*`: the admin "Sign-up protection" page and the linked-accounts view. */
export type AdminSecurityTranslation = {
  title: string;
  description: string;
  loading: string;
  loadFailed: string;
  readOnly: string;
  save: string;
  saving: string;
  saved: string;
  saveFailed: string;
  invalid: string;
  groups: {
    powTitle: string;
    powDescription: string;
    turnstileTitle: string;
    turnstileDescription: string;
    recaptchaTitle: string;
    recaptchaDescription: string;
    emailTitle: string;
    emailDescription: string;
    velocityTitle: string;
    velocityDescription: string;
  };
  fields: {
    siteKey: string;
    secretKey: string;
    secretHelp: string;
    secretConfigured: string;
    secretNotConfigured: string;
    /** The secret in force comes from the server environment. */
    secretFromServer: string;
    /** `{value}`: the site key the server environment supplies while the box is empty. */
    siteKeyFromServer: string;
    minScore: string;
    minScoreHelp: string;
    powDifficulty: string;
    powDifficultyHelp: string;
    blockedDomains: string;
    blockedDomainsHelp: string;
    allowedDomains: string;
    allowedDomainsHelp: string;
    maxPer10Min: string;
    maxPer10MinHelp: string;
    maxPerDevicePerDay: string;
    maxPerDevicePerDayHelp: string;
    defaultPlaceholder: string;
  };
  errors: {
    integerRange: string;
    scoreRange: string;
    domainList: string;
    tooLong: string;
  };
  /** What a captcha card has in force (GET /admin/security/sign-up/status). */
  status: {
    on: string;
    off: string;
    /** `{siteKey}` / `{secretKey}`: one of the three source labels below. */
    keySources: string;
    sourceSetting: string;
    sourceEnvironment: string;
    sourceNone: string;
    overrideNote: string;
    loadFailed: string;
  };
  /** The Email domains card: the built-in list and the address check. */
  emailCheck: {
    /** `{count}`: the built-in list size, already formatted. */
    builtInCount: string;
    label: string;
    placeholder: string;
    submit: string;
    checking: string;
    help: string;
    builtInList: string;
    adminBlocked: string;
    adminAllowed: string;
    noMailServer: string;
    mailServerFound: string;
    mailCheckInconclusive: string;
    allowed: string;
    blocked: string;
    invalid: string;
    failed: string;
  };
  linkedAccounts: {
    open: string;
    title: string;
    description: string;
    loading: string;
    loadFailed: string;
    empty: string;
    reasonDevice: string;
    reasonDeviceId: string;
    reasonRegistrationIp: string;
    banned: string;
    registered: string;
  };
};

export type AntiAbuseLocaleTranslation = {
  navigationLabel: string;
  auth: BotCheckAuthTranslation;
  admin: AdminSecurityTranslation;
};
