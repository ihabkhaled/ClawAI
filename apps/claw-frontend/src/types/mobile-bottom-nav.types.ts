import type { LucideIcon } from 'lucide-react';

/**
 * Primary navigation item that appears in the mobile bottom navigation bar.
 *
 * The mobile nav surfaces a fixed set of high-traffic routes (Chat, Models,
 * Files, Context) plus a synthetic "More" entry that opens the full sidebar
 * for everything else.
 */
export type MobileBottomNavItem = {
  /** Stable identifier used as React key. */
  id: string;
  /** Translation key for the visible label (e.g. 'nav.chat'). */
  labelKey: string;
  /** lucide-react icon component rendered inside the tab. */
  icon: LucideIcon;
  /** Concrete route to navigate to when the tab is pressed. */
  href: string;
};

/**
 * Return shape for the mobile bottom-nav controller hook.
 */
export type UseMobileBottomNavReturn = {
  /** The current route, used by the renderer to compute active state. */
  pathname: string;
  /** Opens the full sidebar (used by the "More" button). */
  openSidebar: () => void;
  /** Whether a given href should render as the active tab. */
  isActive: (href: string) => boolean;
};

/**
 * Props for a single tab inside the mobile bottom nav. The "More" button
 * does NOT use this shape — it is rendered separately because it triggers a
 * sidebar open rather than navigating to a route.
 */
export type MobileBottomNavLinkProps = {
  item: MobileBottomNavItem;
  isActive: boolean;
};
