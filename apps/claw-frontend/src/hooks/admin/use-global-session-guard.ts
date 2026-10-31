import { useCallback, useRef, useState } from 'react';

import { SESSION_GLOBAL_TOKEN_UI_SECONDS } from '@/constants/admin-sessions.constants';
import { ApiErrorCode } from '@/enums';
import type { SessionGlobalAction } from '@/enums/session-global-action.enum';
import { SessionGlobalAction as Action } from '@/enums/session-global-action.enum';
import { SessionGlobalStep } from '@/enums/session-global-step.enum';
import { useGlobalSessionCountdown } from '@/hooks/admin/use-global-session-countdown';
import { useGlobalSessionMutations } from '@/hooks/admin/use-global-session-mutations';
import { useTranslation } from '@/lib/i18n';
import type {
  SessionClearResult,
  SessionTerminateResult,
  UseGlobalSessionGuardReturn,
} from '@/types/admin-sessions.types';
import { showToast } from '@/utilities';
import { expectedGlobalPhrase, isGlobalPhraseValid } from '@/utilities/admin-sessions.utility';

/**
 * The two-step guard for the system-wide session actions (ADR-204).
 *
 * Step 1 asks for the administrator's own password and exchanges it for a one-time token.
 * The password field is cleared the moment the call returns, success or not. Step 2 asks for
 * the typed phrase and sends it with the token. The token lives only in a ref: not in state,
 * not in the query cache, not in storage, and it is dropped on cancel, expiry and use.
 */
export function useGlobalSessionGuard(): UseGlobalSessionGuardReturn {
  const { t } = useTranslation();
  const api = useGlobalSessionMutations();
  const token = useRef<string | null>(null);
  const [action, setAction] = useState<SessionGlobalAction | null>(null);
  const [step, setStep] = useState(SessionGlobalStep.CLOSED);
  const [password, setPassword] = useState('');
  const [phrase, setPhrase] = useState('');
  const [issuedAt, setIssuedAt] = useState(0);
  const [lastResult, setLastResult] = useState<SessionTerminateResult | SessionClearResult | null>(
    null,
  );

  const reset = useCallback((): void => {
    token.current = null;
    setStep(SessionGlobalStep.CLOSED);
    setAction(null);
    setPassword('');
    setPhrase('');
  }, []);
  const backToPassword = useCallback((): void => {
    token.current = null;
    setPhrase('');
    setStep(SessionGlobalStep.PASSWORD);
  }, []);
  const secondsLeft = useGlobalSessionCountdown(
    step === SessionGlobalStep.CONFIRM,
    SESSION_GLOBAL_TOKEN_UI_SECONDS,
    issuedAt,
    () => {
      backToPassword();
      showToast.error({ description: t('adminSessions.errors.tokenInvalid') });
    },
  );

  const start = useCallback((next: SessionGlobalAction): void => {
    setLastResult(null);
    setAction(next);
    setStep(SessionGlobalStep.PASSWORD);
  }, []);

  const submitPassword = useCallback(async (): Promise<void> => {
    if (action === null || password === '') {
      return;
    }
    const typed = password;
    setPassword('');
    try {
      const reply = await api.requestToken(action, typed);
      token.current = reply.token;
      setIssuedAt(Date.now());
      setStep(SessionGlobalStep.CONFIRM);
    } catch {
      // The mutation already toasted the coded reason; stay on this step.
    }
  }, [action, api, password]);

  const submitConfirm = useCallback(async (): Promise<void> => {
    const held = token.current;
    if (action === null || held === null || !isGlobalPhraseValid(action, phrase)) {
      return;
    }
    try {
      const result = await api.runAction(action, held, phrase);
      token.current = null;
      setLastResult(result);
      showToast.success({
        description: t(
          action === Action.TERMINATE_ALL
            ? 'adminSessions.globalTerminateDone'
            : 'adminSessions.globalClearDone',
        ),
      });
      reset();
    } catch (error: unknown) {
      const code = (error as { code?: string } | null)?.code;
      // A spent or refused token is useless: go back and ask for the password again.
      if (code === ApiErrorCode.GLOBAL_TOKEN_INVALID) {
        backToPassword();
      }
    }
  }, [action, api, backToPassword, phrase, reset, t]);

  return {
    step,
    action,
    password,
    setPassword,
    phrase,
    setPhrase,
    expectedPhrase: action === null ? '' : expectedGlobalPhrase(action),
    isPhraseValid: isGlobalPhraseValid(action, phrase),
    isBusy: api.isBusy,
    secondsLeft,
    start,
    submitPassword,
    submitConfirm,
    cancel: reset,
    lastResult,
  };
}
