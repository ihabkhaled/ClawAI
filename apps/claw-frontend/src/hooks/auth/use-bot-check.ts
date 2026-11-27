import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import { BOT_CHECK_CONFIG_STALE_MS } from '@/constants/bot-check.constants';
import type { BotCheckAction } from '@/enums/bot-check-action.enum';
import { BotCheckStatus } from '@/enums/bot-check-status.enum';
import { botCheckRepository } from '@/repositories/auth/bot-check.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import { botCheckService } from '@/services/auth/bot-check.service';
import type { BotCheckSession, UseBotCheckReturn } from '@/types/bot-check.types';

/**
 * The bot checks of one auth form. `eager` (sign-up) starts the proof of work,
 * the Turnstile widget and the reCAPTCHA script as the form opens, so the
 * answer is ready by the time the person presses the button and typing is
 * never blocked. Sign-in passes `eager: false`: nothing runs, and no
 * third-party script loads, until the server answers 428.
 *
 * The session is created in the effect (not during render) so React's
 * development double-mount disposes one session and starts a fresh one.
 */
export function useBotCheck(action: BotCheckAction, eager: boolean): UseBotCheckReturn {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<BotCheckStatus>(BotCheckStatus.IDLE);
  const sessionRef = useRef<BotCheckSession | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const loadConfig = () =>
      queryClient.fetchQuery({
        queryKey: queryKeys.auth.botCheckConfig,
        queryFn: () => botCheckRepository.getConfig(),
        staleTime: BOT_CHECK_CONFIG_STALE_MS,
      });
    const session = botCheckService.createSession(action, eager, setStatus, loadConfig);
    session.setContainer(containerRef.current);
    sessionRef.current = session;
    if (eager) {
      session.prepare();
    }
    return () => {
      session.dispose();
      sessionRef.current = null;
    };
  }, [action, eager, queryClient]);

  const setTurnstileContainer = useCallback((container: HTMLDivElement | null): void => {
    containerRef.current = container;
    sessionRef.current?.setContainer(container);
  }, []);
  const collect = useCallback(() => sessionRef.current?.collect() ?? Promise.resolve({}), []);
  const markRequired = useCallback(() => sessionRef.current?.markRequired(), []);
  const isRequired = useCallback(() => sessionRef.current?.isRequired() === true, []);

  return {
    status,
    isChecking: status === BotCheckStatus.CHECKING,
    setTurnstileContainer,
    collect,
    markRequired,
    isRequired,
  };
}
