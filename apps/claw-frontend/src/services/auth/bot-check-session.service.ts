import {
  RECAPTCHA_EXECUTE_TIMEOUT_MS,
  TURNSTILE_TOKEN_TIMEOUT_MS,
} from '@/constants/bot-check.constants';
import { BotCheckStatus } from '@/enums/bot-check-status.enum';
import type {
  BotCheckConfig,
  BotCheckPayload,
  BotCheckSession,
  BotCheckSessionDependencies,
  PowSolution,
  TurnstileWidgetHandle,
} from '@/types/bot-check.types';
import { settleWithin } from '@/utilities/promise-timeout.utility';

/**
 * One form's bot checks: proof of work (always), Turnstile and reCAPTCHA v3
 * (when an admin configured them). Framework-free so it can be tested without
 * React; `useBotCheck` owns one per mounted form.
 *
 * Every part is best effort. A check that cannot run is left out of the
 * payload rather than failing the submit: the server is the authority and
 * answers BOT_CHECK_REQUIRED / BOT_CHECK_FAILED, which the form translates.
 * Every token is single use, so `collect` consumes what was prepared and, for a
 * form that keeps checking (sign-up, or a sign-in the server challenged),
 * starts preparing the next set at once.
 */
export function createBotCheckSession(
  dependencies: BotCheckSessionDependencies,
  keepPrepared: boolean,
): BotCheckSession {
  let container: HTMLElement | null = null;
  let config: Promise<BotCheckConfig | null> | null = null;
  let pow: Promise<PowSolution | null> | null = null;
  let turnstile: Promise<TurnstileWidgetHandle | null> | null = null;
  let required = false;
  let disposed = false;

  const report = (status: BotCheckStatus): void => {
    if (!disposed) {
      dependencies.onStatusChange(status);
    }
  };

  const loadConfig = (): Promise<BotCheckConfig | null> => {
    config ??= dependencies.loadConfig().catch(() => {
      config = null;
      return null;
    });
    return config;
  };

  const solvePow = async (): Promise<PowSolution | null> => {
    const current = await loadConfig();
    if (current !== null && !current.pow.enabled) {
      return null;
    }
    try {
      const challenge = await dependencies.createChallenge();
      const nonce = await dependencies.solveChallenge(challenge);
      return nonce === null ? null : { token: challenge.token, nonce };
    } catch {
      return null;
    }
  };

  const startPow = (): Promise<PowSolution | null> => {
    if (pow === null) {
      const started = solvePow();
      pow = started;
      void started.then((solution) => {
        if (pow === started) {
          report(solution === null ? BotCheckStatus.DEGRADED : BotCheckStatus.READY);
        }
      });
    }
    return pow;
  };

  const ensureTurnstile = async (): Promise<TurnstileWidgetHandle | null> => {
    const current = await loadConfig();
    if (current === null || current.turnstile === null || container === null || disposed) {
      return null;
    }
    turnstile ??= dependencies.mountTurnstile(container, current.turnstile.siteKey).catch(() => {
      turnstile = null;
      return null;
    });
    return turnstile;
  };

  const warmRecaptcha = async (): Promise<void> => {
    const current = await loadConfig();
    if (current !== null && current.recaptcha !== null) {
      await dependencies.loadRecaptcha(current.recaptcha.siteKey).catch(() => undefined);
    }
  };

  const prepare = (): void => {
    if (disposed) {
      return;
    }
    report(BotCheckStatus.CHECKING);
    void startPow();
    void ensureTurnstile();
    void warmRecaptcha();
  };

  const readRecaptchaToken = async (): Promise<string | null> => {
    const current = await loadConfig();
    if (current === null || current.recaptcha === null) {
      return null;
    }
    return settleWithin(
      dependencies.executeRecaptcha(current.recaptcha.siteKey, dependencies.action),
      RECAPTCHA_EXECUTE_TIMEOUT_MS,
    );
  };

  const readTurnstileToken = async (): Promise<string | null> => {
    const handle = await ensureTurnstile();
    if (handle === null) {
      return null;
    }
    const token = await handle.nextToken(TURNSTILE_TOKEN_TIMEOUT_MS);
    handle.reset();
    return token;
  };

  const collect = async (): Promise<BotCheckPayload> => {
    report(BotCheckStatus.CHECKING);
    const pending = startPow();
    const [solution, turnstileToken, recaptchaToken] = await Promise.all([
      pending,
      readTurnstileToken(),
      readRecaptchaToken(),
    ]);
    if (pow === pending) {
      pow = null;
    }
    report(BotCheckStatus.IDLE);
    if (keepPrepared || required) {
      prepare();
    }
    return {
      ...(solution === null ? {} : { pow: solution }),
      ...(turnstileToken === null ? {} : { turnstileToken }),
      ...(recaptchaToken === null ? {} : { recaptchaToken }),
    };
  };

  return {
    setContainer: (next: HTMLElement | null) => {
      container = next;
    },
    prepare,
    collect,
    markRequired: () => {
      required = true;
    },
    isRequired: () => required,
    dispose: () => {
      disposed = true;
      void turnstile?.then((handle) => handle?.remove());
      turnstile = null;
    },
  };
}
