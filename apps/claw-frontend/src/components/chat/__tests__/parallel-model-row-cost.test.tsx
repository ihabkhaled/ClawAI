import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ParallelModelRowView } from '@/components/chat/parallel-model-row';
import { CostClass } from '@/enums/router-models.enum';
import type { GroupedModels } from '@/types';

vi.mock('@/lib/i18n/use-translation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

type Model = GroupedModels['models'][number];

function renderRow(model: Partial<Model>, onToggle = vi.fn()) {
  render(
    <ParallelModelRowView
      row={{
        kind: 'model',
        model: { provider: 'P', model: 'm', displayName: 'Model M', ...model },
      }}
      isChecked={false}
      isDisabled={false}
      onToggle={onToggle}
      lockedLabel="Locked"
    />,
  );
  return onToggle;
}

describe('ParallelModelRowView cost mark', () => {
  it.each(Object.values(CostClass))('renders a mark for %s', (costClass) => {
    renderRow({ costClass });
    expect(screen.getByTestId(`model-cost-mark-${costClass}`)).toBeInTheDocument();
  });

  it('renders no mark and no dimming when the fields are absent', () => {
    renderRow({});
    expect(screen.queryByTestId(/model-cost-mark/)).toBeNull();
    expect(screen.getByRole('button')).not.toHaveClass('opacity-60');
  });

  it('dims a model outside the allowance but still ticks it', () => {
    const onToggle = renderRow({ costClass: CostClass.PREMIUM, outsideAllowance: true });
    const row = screen.getByRole('button');
    expect(row).toHaveClass('opacity-60');
    fireEvent.click(row);
    expect(onToggle).toHaveBeenCalledWith('P', 'm', true);
  });

  it('a locked model is dimmer, cannot be ticked and keeps its band', () => {
    const onToggle = renderRow({ costClass: CostClass.CHEAP, isLocked: true });
    const row = screen.getByRole('button');
    expect(row).toBeDisabled();
    expect(row).toHaveClass('opacity-50');
    expect(screen.getByText('Locked')).toBeInTheDocument();
    expect(screen.getByTestId(`model-cost-mark-${CostClass.CHEAP}`)).toBeInTheDocument();
    fireEvent.click(row);
    expect(onToggle).not.toHaveBeenCalled();
  });
});
