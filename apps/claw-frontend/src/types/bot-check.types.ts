import type { BotCheckAction } from '@/enums/bot-check-action.enum';
import type { BotCheckStatus } from '@/enums/bot-check-status.enum';
import type { TranslateFunction } from '@/types/i18n.types';

/** GET /auth/bot-check/config. A third-party check is `null` until an admin saves its keys. */
export type BotCheckConfig = {
  pow: { enabled: boolean; difficulty: number };
  turnstile: { siteKey: string } | null;
  recaptcha: { siteKey: string; action: BotCheckAction } | null;
};

/** POST /auth/bot-check/challenge. `token` is HMAC-signed and single use. */
export type PowChallenge = {
  token: string;
  salt: string;
  difficulty: number;
  expiresAt: string;
};

/** A solved challenge, as the register / login body carries it. */
export type PowSolution = {
  token: string;
  nonce: string;
};

/** `botCheck` on POST /auth/register and POST /auth/login. Every part is optional in the schema. */
export type BotCheckPayload = {
  pow?: PowSolution;
  turnstileToken?: string;
  recaptchaToken?: string;
};

/** The stable browser signals the fingerprint is computed from. */
export type DeviceSignals = {
  tz?: string;
  lang?: string;
  platform?: string;
  screen?: string;
  cores?: number;
  memory?: number;
  webgl?: string;
  touch?: boolean;
};

/** `device` on POST /auth/register and POST /auth/login. */
export type DevicePayload = {
  /** 64 hex characters: SHA-256 over the signals plus a canvas hash. */
  fingerprint: string;
  /** Random UUID kept in localStorage. */
  deviceId: string;
  signals?: DeviceSignals;
};

/** Message the main thread posts to the proof-of-work worker. */
export type PowWorkerRequest = {
  salt: string;
  difficulty: number;
  maxAttempts: number;
  batchSize: number;
};

/** Message the proof-of-work worker posts back. `nonce` is null when it gave up. */
export type PowWorkerResponse = {
  nonce: string | null;
  attempts: number;
};

/** The parts of `window.turnstile` this app calls (explicit render). */
export type TurnstileRenderOptions = {
  sitekey: string;
  action?: string;
  callback: (token: string) => void;
  'expired-callback': () => void;
  'error-callback': () => void;
};

export type TurnstileApi = {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string | undefined;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

/** The parts of `window.grecaptcha` (v3) this app calls. */
export type RecaptchaApi = {
  ready: (callback: () => void) => void;
  execute: (siteKey: string, options: { action: string }) => Promise<string>;
};

/** A rendered Turnstile widget. One token per submit; `reset` asks for a fresh one. */
export type TurnstileWidgetHandle = {
  nextToken: (timeoutMs: number) => Promise<string | null>;
  reset: () => void;
  remove: () => void;
};

/** What the bot-check session needs from the outside world (injected for tests). */
export type BotCheckSessionDependencies = {
  action: BotCheckAction;
  loadConfig: () => Promise<BotCheckConfig>;
  createChallenge: () => Promise<PowChallenge>;
  solveChallenge: (challenge: PowChallenge) => Promise<string | null>;
  mountTurnstile: (container: HTMLElement, siteKey: string) => Promise<TurnstileWidgetHandle>;
  loadRecaptcha: (siteKey: string) => Promise<void>;
  executeRecaptcha: (siteKey: string, action: BotCheckAction) => Promise<string>;
  onStatusChange: (status: BotCheckStatus) => void;
};

/**
 * One form's bot checks. `prepare` warms everything up (config, a solved proof
 * of work, the Turnstile widget, the reCAPTCHA script); `collect` hands over
 * what the next submit carries and starts preparing the one after it, because
 * every token is single use.
 */
export type BotCheckSession = {
  setContainer: (container: HTMLElement | null) => void;
  prepare: () => void;
  collect: () => Promise<BotCheckPayload>;
  markRequired: () => void;
  isRequired: () => boolean;
  dispose: () => void;
};

/** The login call with the 428 retry: the device always, bot checks once asked for. */
export type LoginBotCheckHooks = {
  collectBotCheck: () => Promise<BotCheckPayload>;
  isBotCheckRequired: () => boolean;
  markBotCheckRequired: () => void;
};

export type UseBotCheckReturn = {
  status: BotCheckStatus;
  isChecking: boolean;
  /** Callback ref for the element the Turnstile widget renders into. */
  setTurnstileContainer: (container: HTMLDivElement | null) => void;
  collect: () => Promise<BotCheckPayload>;
  markRequired: () => void;
  isRequired: () => boolean;
};

export type BotCheckNoticeProps = {
  isChecking: boolean;
  setTurnstileContainer: (container: HTMLDivElement | null) => void;
  t: TranslateFunction;
};
