'use client';

import { LogOut, Settings, User } from 'lucide-react';
import Link from 'next/link';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ROUTES } from '@/constants';
import { useCurrentUser } from '@/hooks/auth/use-current-user';
import { useLogout } from '@/hooks/auth/use-logout';
import { useTranslation } from '@/lib/i18n';
import { getInitials } from '@/utilities';

export function UserMenu(): React.ReactElement | null {
  const { user } = useCurrentUser();
  const { logout, isPending } = useLogout();
  const { t } = useTranslation();

  if (!user) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="unstyled"
          size="unstyled"
          className="hover:bg-accent flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors"
        >
          {/* Avatar wrapper carries the primary-tinted ring + an online status
           * dot anchored to the bottom-end corner. The dot uses `end-0` so it
           * mirrors automatically under RTL, and a 2px card-colored border
           * around it punches it visually away from the avatar circle. */}
          <span className="relative inline-flex">
            <Avatar className="ring-primary/20 duration-fast ease-expo-out hover:ring-primary/40 h-8 w-8 ring-2 transition-shadow">
              <AvatarFallback className="text-xs">{getInitials(user.username)}</AvatarFallback>
            </Avatar>
            <span
              className="border-card absolute end-0 bottom-0 inline-block h-2.5 w-2.5 rounded-full border-2 bg-[hsl(var(--success))]"
              role="status"
              aria-label={t('accessibility.userStatusOnline')}
            />
          </span>
          <span className="max-w-[120px] truncate font-medium">{user.username}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">{user.username}</p>
            <p className="text-muted-foreground text-xs">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={ROUTES.SETTINGS} className="cursor-pointer">
            <User className="me-2 h-4 w-4" />
            {t('settings.profile')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={ROUTES.SETTINGS} className="cursor-pointer">
            <Settings className="me-2 h-4 w-4" />
            {t('nav.settings')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive cursor-pointer"
          disabled={isPending}
          onClick={() => logout()}
        >
          <LogOut className="me-2 h-4 w-4" />
          {isPending ? t('common.loading') : t('auth.logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
