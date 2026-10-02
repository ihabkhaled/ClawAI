import { FREE_ALLOWANCE_BODY_WITH_LIMIT_KEY } from '@/constants/chat-limit-notice.constants';
import { ChatLimitKind } from '@/enums/chat-limit-kind.enum';
import { useCreditWallet } from '@/hooks/credit/use-credit-wallet';
import { useTranslation } from '@/lib/i18n';
import type { ChatLimitNotice } from '@/types/chat-limit-notice.types';

/**
 * The body sentence of a limit notice.
 *
 * Almost every kind is a fixed key. A spent free allowance can say HOW MANY
 * requests the plan gave ("all 5 free requests") when the wallet snapshot knows
 * the number, and falls back to the sentence without a number when it does not
 * (still loading, an older backend, an unlimited plan). The wallet query is the
 * one the composer's credit indicator already keeps warm, so this adds no request.
 */
export function useChatLimitNoticeBody(notice: ChatLimitNotice): string {
  const { t } = useTranslation();
  const { wallet } = useCreditWallet();
  const limit = wallet?.freeAllowance?.limit ?? null;

  if (notice.kind === ChatLimitKind.PaygFreeAllowanceExhausted && limit !== null) {
    return t(FREE_ALLOWANCE_BODY_WITH_LIMIT_KEY, { limit });
  }
  return t(notice.bodyKey);
}
