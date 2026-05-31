import { BookOpen, FolderOpen, MessageSquare, Store } from 'lucide-react';

import { ROUTES } from '@/constants/routes.constants';
import type { MobileBottomNavItem } from '@/types/mobile-bottom-nav.types';

/**
 * The 4 primary destinations rendered in the mobile bottom navigation.
 *
 * Order matters: items are rendered left-to-right (or right-to-left in RTL)
 * in the order declared here. A 5th "More" button is appended in the renderer
 * to expose the full sidebar — it is NOT a route and lives outside this list.
 */
export const MOBILE_BOTTOM_NAV_ITEMS: readonly MobileBottomNavItem[] = [
  { id: 'chat', labelKey: 'nav.chat', icon: MessageSquare, href: ROUTES.CHAT },
  { id: 'models', labelKey: 'nav.models', icon: Store, href: ROUTES.MODELS },
  { id: 'files', labelKey: 'nav.files', icon: FolderOpen, href: ROUTES.FILES },
  { id: 'context', labelKey: 'nav.context', icon: BookOpen, href: ROUTES.CONTEXT },
] as const;
