import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { GlobalSearch } from '@/components/layout/global-search';

vi.mock('@/hooks/layout/use-global-search-controller', () => ({
  useGlobalSearchController: () => ({
    inputRef: { current: null },
    containerRef: { current: null },
    threads: [],
    isLoading: false,
    search: '',
    setSearch: vi.fn(),
    isOpen: true,
    showResults: false,
    handleToggle: vi.fn(),
    handleSelect: vi.fn(),
    handleKeyDown: vi.fn(),
    handleOpenChange: vi.fn(),
  }),
}));
vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('GlobalSearch mobile layout', () => {
  it('expands as an inset overlay with a fluid input', () => {
    const { container } = render(<GlobalSearch />);

    expect(container.firstElementChild).toHaveClass(
      'max-sm:absolute',
      'max-sm:inset-x-2',
      'max-sm:z-40',
    );
    expect(screen.getByPlaceholderText('chat.globalSearchPlaceholder')).toHaveClass(
      'max-sm:w-full',
      'min-w-0',
    );
  });
});
