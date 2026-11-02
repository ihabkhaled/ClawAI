import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ModelPickerItem } from '@/components/chat/model-picker-item';
import { CostClass } from '@/enums/router-models.enum';
import type { ModelPickerOption } from '@/types';

vi.mock('@/lib/i18n/use-translation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

function renderItem(option: Partial<ModelPickerOption>, onSelect = vi.fn()) {
  render(
    <ModelPickerItem
      option={{ value: 'P::m', label: 'Model M', ...option }}
      isSelected={false}
      isActive={false}
      onSelect={onSelect}
      onHover={vi.fn()}
    />,
  );
  return onSelect;
}

describe('ModelPickerItem cost mark', () => {
  it.each(Object.values(CostClass))('renders a mark for %s', (costClass) => {
    renderItem({ costClass });
    expect(screen.getByTestId(`model-cost-mark-${costClass}`)).toBeInTheDocument();
  });

  it('renders no mark and no dimming when the fields are absent', () => {
    renderItem({});
    expect(screen.queryByTestId(/model-cost-mark/)).toBeNull();
    expect(screen.getByRole('option')).not.toHaveClass('opacity-60');
  });

  it('dims a model outside the allowance but still selects it', () => {
    const onSelect = renderItem({ costClass: CostClass.PREMIUM, outsideAllowance: true });
    const row = screen.getByRole('option');
    expect(row).toHaveClass('opacity-60');
    expect(row).not.toHaveAttribute('aria-disabled');
    fireEvent.click(row);
    expect(onSelect).toHaveBeenCalledWith('P::m');
  });

  it('keeps a locked model locked and unselectable', () => {
    const onSelect = renderItem({
      costClass: CostClass.ULTRA,
      isLocked: true,
      lockedLabel: 'Not on your plan',
    });
    const row = screen.getByRole('option');
    expect(row).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(row);
    expect(onSelect).not.toHaveBeenCalled();
  });
});
