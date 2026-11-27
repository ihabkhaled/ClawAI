import type { BotCheckAction } from '@/enums/bot-check-action.enum';
import type { BotCheckStatus } from '@/enums/bot-check-status.enum';
import { solveChallenge } from '@/lib/bot-check/pow-solver';
import { executeRecaptcha, loadRecaptcha } from '@/lib/bot-check/recaptcha';
import { mountTurnstileWidget } from '@/lib/bot-check/turnstile';
import { botCheckRepository } from '@/repositories/auth/bot-check.repository';
import type { BotCheckConfig, BotCheckSession } from '@/types/bot-check.types';

import { createBotCheckSession } from './bot-check-session.service';

/** Wires a bot-check session to the real endpoints, the PoW worker and the two script wrappers. */
export const botCheckService = {
  createSession(
    action: BotCheckAction,
    keepPrepared: boolean,
    onStatusChange: (status: BotCheckStatus) => void,
    loadConfig: () => Promise<BotCheckConfig>,
  ): BotCheckSession {
    return createBotCheckSession(
      {
        action,
        loadConfig,
        createChallenge: () => botCheckRepository.createChallenge(),
        solveChallenge,
        mountTurnstile: mountTurnstileWidget,
        loadRecaptcha,
        executeRecaptcha,
        onStatusChange,
      },
      keepPrepared,
    );
  },
};
