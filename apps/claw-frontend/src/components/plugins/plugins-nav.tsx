import Link from 'next/link';

import { PLUGINS_NAV_LINK_CLASSES } from '@/constants/plugin-installs.constants';
import { ROUTES } from '@/constants/routes.constants';
import { PluginsNavTab } from '@/enums/plugins-nav-tab.enum';
import { cn } from '@/lib/utils';
import type { PluginsNavProps } from '@/types/plugin-installs.types';

/** Discover, Installed and My servers as links, so each view has its own URL and Back works. */
export function PluginsNav({ active, t }: PluginsNavProps): React.ReactElement {
  return (
    <nav
      aria-label={t('pluginsInstall.nav.label')}
      className="bg-muted mb-6 flex w-full flex-wrap gap-1 rounded-lg p-1 sm:w-fit"
    >
      <Link
        href={ROUTES.PLUGINS}
        aria-current={active === PluginsNavTab.Discover ? 'page' : undefined}
        className={cn(
          PLUGINS_NAV_LINK_CLASSES,
          active === PluginsNavTab.Discover ? 'bg-background shadow-sm' : 'text-muted-foreground',
        )}
      >
        {t('pluginsInstall.nav.discover')}
      </Link>
      <Link
        href={ROUTES.PLUGINS_INSTALLED}
        aria-current={active === PluginsNavTab.Installed ? 'page' : undefined}
        className={cn(
          PLUGINS_NAV_LINK_CLASSES,
          active === PluginsNavTab.Installed ? 'bg-background shadow-sm' : 'text-muted-foreground',
        )}
      >
        {t('pluginsInstall.nav.installed')}
      </Link>
      <Link
        href={ROUTES.PLUGINS_SERVERS}
        aria-current={active === PluginsNavTab.Servers ? 'page' : undefined}
        className={cn(
          PLUGINS_NAV_LINK_CLASSES,
          active === PluginsNavTab.Servers ? 'bg-background shadow-sm' : 'text-muted-foreground',
        )}
      >
        {t('pluginsServers.nav.servers')}
      </Link>
    </nav>
  );
}
