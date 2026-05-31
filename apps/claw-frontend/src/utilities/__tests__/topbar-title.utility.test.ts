import { describe, it, expect } from 'vitest';

import type { SidebarItem } from '@/constants';
import { resolveActiveNavItem } from '@/utilities/topbar-title.utility';

const icon = (() => null) as unknown as SidebarItem['icon'];

const items: SidebarItem[] = [
  { href: '/chat', labelKey: 'nav.chat' as SidebarItem['labelKey'], icon },
  { href: '/dashboard', labelKey: 'nav.dashboard' as SidebarItem['labelKey'], icon },
  {
    href: '/models',
    labelKey: 'nav.models' as SidebarItem['labelKey'],
    icon,
    children: [
      { href: '/models/catalog', labelKey: 'nav.modelCatalog' as SidebarItem['labelKey'], icon },
    ],
  },
];

describe('resolveActiveNavItem', () => {
  it('matches an exact href', () => {
    expect(resolveActiveNavItem(items, '/dashboard')?.href).toBe('/dashboard');
  });

  it('matches a sub-route to its parent section', () => {
    expect(resolveActiveNavItem(items, '/chat/compare')?.href).toBe('/chat');
  });

  it('prefers the longest matching prefix (child over parent)', () => {
    expect(resolveActiveNavItem(items, '/models/catalog')?.href).toBe('/models/catalog');
  });

  it('returns null when nothing matches', () => {
    expect(resolveActiveNavItem(items, '/unknown')).toBeNull();
  });

  it('does not partial-match across path segments', () => {
    expect(resolveActiveNavItem(items, '/chatter')).toBeNull();
  });
});
