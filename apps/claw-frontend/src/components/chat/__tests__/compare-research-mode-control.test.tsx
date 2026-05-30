import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CompareResearchModeControl } from '@/components/chat/compare-research-mode-control';
import { CompareResearchMode } from '@/enums';

const t = (key: string): string => key;

describe('CompareResearchModeControl', () => {
  it('renders the label, hint, and all four mode options', () => {
    render(
      <CompareResearchModeControl
        value={CompareResearchMode.NONE}
        onChange={vi.fn()}
        t={t}
      />,
    );

    expect(screen.getByText('compare.research.label')).toBeInTheDocument();
    expect(screen.getByText('compare.research.hint')).toBeInTheDocument();

    // Open the select to enumerate options. The trigger uses the current
    // value's label; clicking it expands the listbox.
    fireEvent.click(screen.getByRole('combobox'));

    expect(screen.getAllByText('compare.research.none').length).toBeGreaterThan(0);
    expect(screen.getByText('compare.research.search')).toBeInTheDocument();
    expect(screen.getByText('compare.research.searchFetch')).toBeInTheDocument();
    expect(screen.getByText('compare.research.searchExtract')).toBeInTheDocument();
  });

  it('fires onChange when a different mode is picked', () => {
    const onChange = vi.fn();
    render(
      <CompareResearchModeControl
        value={CompareResearchMode.NONE}
        onChange={onChange}
        t={t}
      />,
    );

    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(screen.getByText('compare.research.searchFetch'));

    expect(onChange).toHaveBeenCalledWith(CompareResearchMode.SEARCH_FETCH);
  });
});
