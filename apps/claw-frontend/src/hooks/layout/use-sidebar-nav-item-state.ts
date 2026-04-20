import { useState } from 'react';

import type { SidebarItem } from '@/constants/sidebar.constants';
import type { UseSidebarNavItemStateReturn } from '@/types/hook.types';

export function useSidebarNavItemState(input: {
  hasChildren: boolean;
  parentHref: string;
  children: SidebarItem[];
  pathname: string;
}): UseSidebarNavItemStateReturn {
  const { hasChildren, parentHref, children, pathname } = input;
  const anyChildActive = children.some(
    (c) => pathname === c.href || pathname.startsWith(`${c.href}/`),
  );
  const parentSubtreeActive = pathname.startsWith(`${parentHref}/`);
  const shouldAutoExpand = hasChildren && (anyChildActive || parentSubtreeActive);
  const [expanded, setExpanded] = useState<boolean>(shouldAutoExpand);

  return {
    expanded: expanded || shouldAutoExpand,
    toggle: () => setExpanded((prev) => !prev),
  };
}
