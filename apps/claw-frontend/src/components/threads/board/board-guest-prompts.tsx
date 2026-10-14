import { Flag, Lightbulb, LogIn, MessageSquare, ThumbsUp } from 'lucide-react';
import Link from 'next/link';
import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import type { BoardGuestPromptsProps } from '@/types/thread-board-view.types';
import { registerHrefFromSignIn } from '@/utilities/thread-board-guest.utility';

/**
 * What a guest sees where a member would see the like, comment, change-request and report
 * controls: one friendly "Sign in to ..." link per action, never a dead or hidden button.
 */
export function BoardGuestPrompts({ signInHref }: BoardGuestPromptsProps): ReactElement {
  const { t } = useTranslation();
  const prompts = [
    { Icon: ThumbsUp, label: t('chat.threadBoardGuestSignInToLike') },
    { Icon: MessageSquare, label: t('chat.threadBoardGuestSignInToComment') },
    { Icon: Lightbulb, label: t('chat.threadBoardGuestSignInToRequestChange') },
    { Icon: Flag, label: t('chat.threadBoardGuestSignInToReport') },
  ];

  return (
    <div
      role="group"
      aria-label={t('chat.threadBoardGuestPromptsLabel')}
      data-testid="board-guest-prompts"
      className="border-border bg-card flex flex-col gap-3 rounded-lg border p-4"
    >
      <p className="flex items-center gap-2 text-sm font-medium">
        <LogIn className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
        {t('chat.threadBoardGuestPromptsLabel')}
      </p>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {prompts.map(({ Icon, label }) => (
          <li key={label}>
            <Button asChild variant="outline" className="min-h-11 w-full justify-start">
              <Link href={signInHref}>
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </Link>
            </Button>
          </li>
        ))}
      </ul>
      <p className="text-muted-foreground text-sm">
        <Link href={registerHrefFromSignIn(signInHref)} className="text-primary underline">
          {t('chat.threadBoardGuestRegister')}
        </Link>
      </p>
    </div>
  );
}
