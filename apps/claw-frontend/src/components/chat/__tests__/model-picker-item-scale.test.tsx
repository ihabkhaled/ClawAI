import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ModelPickerItem } from '@/components/chat/model-picker-item';
import { ParallelModelRowView } from '@/components/chat/parallel-model-row';
import type { GroupedModels, ModelPickerOption } from '@/types';

vi.mock('@/lib/i18n/use-translation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const SCALE = {
  label: '256K context · 1T params',
  title: '256K context · 1T params, 32B active per token',
};

function renderItem(option: Partial<ModelPickerOption>): void {
  render(
    <ModelPickerItem
      option={{ value: 'P::m', label: 'Kimi K2', ...option }}
      isSelected={false}
      isActive={false}
      onSelect={vi.fn()}
      onHover={vi.fn()}
    />,
  );
}

describe('ModelPickerItem size (ADR-234)', () => {
  it('writes the size beside the name, with the fuller text in the tooltip', () => {
    renderItem({ scale: SCALE });

    const size = screen.getByTestId('model-scale');
    expect(size).toHaveTextContent('256K context · 1T params');
    expect(size).toHaveAttribute('title', SCALE.title);
    expect(screen.getByRole('option')).toHaveTextContent('Kimi K2');
  });

  it('renders nothing extra for a model whose size is unknown', () => {
    renderItem({});

    expect(screen.queryByTestId('model-scale')).toBeNull();
  });

  // The row is one fixed line: the size takes what the name leaves and clips, never pushing the
  // name ("GPT Oss 120b" must not lose its "120b") or wrapping.
  it('clips the size instead of the name, so a narrow row never overflows', () => {
    renderItem({ scale: SCALE });

    const size = screen.getByTestId('model-scale');
    expect(size).toHaveClass('truncate-fixed', 'min-w-0', 'sm:flex-1', 'sm:text-end');
    expect(size.className).not.toContain('shrink-0');
    const name = screen.getByText('Kimi K2');
    expect(name).toHaveClass('truncate-fixed', 'sm:min-w-[4rem]');
    expect(name.className).not.toContain('shrink-0');
    expect(name.className).not.toMatch(/(^| )flex-1/);
  });

  it('lets the name fill the row when it has no size beside it', () => {
    renderItem({});

    expect(screen.getByText('Kimi K2')).toHaveClass('truncate-fixed');
    expect(screen.getByText('Kimi K2').parentElement).toHaveClass('flex-1', 'min-w-0');
  });

  // A phone row is 44px tall: the size goes under the name instead of squeezing beside it.
  it('stacks the size under the name on a phone and puts it beside the name from sm up', () => {
    renderItem({ scale: SCALE });

    expect(screen.getByText('Kimi K2').parentElement).toHaveClass(
      'flex-col',
      'sm:flex-row',
      'sm:items-center',
    );
  });

  it('reads direction from its own text, so a right-to-left label keeps its order', () => {
    renderItem({ scale: { label: 'سياق 1M · 750B معاملات', title: 'سياق 1M · 750B معاملات' } });

    expect(screen.getByTestId('model-scale')).toHaveAttribute('dir', 'auto');
  });

  it('keeps the size beside the lock tag and cost mark of a locked model', () => {
    renderItem({ scale: SCALE, isLocked: true, lockedLabel: 'Not on your plan' });

    expect(screen.getByTestId('model-scale')).toBeInTheDocument();
    expect(screen.getByText('Not on your plan')).toBeInTheDocument();
    expect(screen.getByRole('option')).toHaveAttribute('aria-disabled', 'true');
  });
});

describe('ParallelModelRowView size (ADR-234)', () => {
  type Model = GroupedModels['models'][number];

  function renderRow(model: Partial<Model>): void {
    render(
      <ParallelModelRowView
        row={{
          kind: 'model',
          model: { provider: 'P', model: 'm', displayName: 'Kimi K2', ...model },
        }}
        isChecked={false}
        isDisabled={false}
        onToggle={vi.fn()}
        lockedLabel="Locked"
      />,
    );
  }

  it('writes the size beside the name in the Compare list', () => {
    renderRow({ scale: SCALE });

    expect(screen.getByTestId('model-scale')).toHaveTextContent('256K context · 1T params');
    expect(screen.getByTestId('model-scale')).toHaveAttribute('title', SCALE.title);
  });

  it('shows nothing for an unknown size', () => {
    renderRow({});

    expect(screen.queryByTestId('model-scale')).toBeNull();
  });

  it('clips before it pushes the name, in the ~260px Compare column', () => {
    renderRow({ scale: SCALE });

    expect(screen.getByTestId('model-scale')).toHaveClass('truncate-fixed', 'min-w-0', 'flex-1');
    expect(screen.getByText('Kimi K2').className).not.toContain('flex-1');
    expect(screen.getByText('Kimi K2').className).not.toContain('shrink-0');
  });
});
