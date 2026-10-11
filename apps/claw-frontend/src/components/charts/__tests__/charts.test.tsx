import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AreaLineChart } from '@/components/charts/area-line-chart';
import { DonutChart } from '@/components/charts/donut-chart';
import { HorizontalBarChart } from '@/components/charts/horizontal-bar-chart';
import { StackedBarChart } from '@/components/charts/stacked-bar-chart';

const format = (value: number): string => `${value} units`;

describe('AreaLineChart', () => {
  it('shows the empty label and no svg when there is nothing to draw', () => {
    render(
      <AreaLineChart
        points={[]}
        ariaLabel="Requests"
        emptyLabel="Nothing yet"
        formatValue={format}
      />,
    );
    expect(screen.getByText('Nothing yet')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Requests' })).not.toBeInTheDocument();
  });

  it('is an image with a summary label and a focusable, labelled element per point', () => {
    render(
      <AreaLineChart
        points={[
          { label: '10-05', value: 3 },
          { label: '10-06', value: 9 },
        ]}
        ariaLabel="Requests"
        emptyLabel="Nothing yet"
        formatValue={format}
      />,
    );
    expect(screen.getByRole('img', { name: 'Requests' })).toBeInTheDocument();
    const point = screen.getByRole('img', { name: '10-06: 9 units' });
    expect(point).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('img', { name: '10-05: 3 units' })).toBeInTheDocument();
  });

  it('keeps time left to right inside a right-to-left page', () => {
    const { container } = render(
      <AreaLineChart
        points={[{ label: 'a', value: 1 }]}
        ariaLabel="r"
        emptyLabel="e"
        formatValue={format}
      />,
    );
    expect(container.firstElementChild).toHaveAttribute('dir', 'ltr');
  });

  it('colours only through theme tokens, so dark mode follows the theme', () => {
    const { container } = render(
      <AreaLineChart
        points={[{ label: 'a', value: 1 }]}
        ariaLabel="r"
        emptyLabel="e"
        formatValue={format}
      />,
    );
    expect(container.innerHTML).toContain('hsl(var(--primary))');
    expect(container.innerHTML).not.toMatch(/#[0-9a-f]{3,6}/iu);
  });
});

describe('HorizontalBarChart', () => {
  it('lists label and value as text', () => {
    render(
      <HorizontalBarChart
        data={[
          { key: 'a', label: 'Gemini', value: 10 },
          { key: 'b', label: 'Claude', value: 5 },
        ]}
        ariaLabel="By provider"
        emptyLabel="none"
        formatValue={format}
      />,
    );
    const list = screen.getByRole('list', { name: 'By provider' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    expect(within(list).getByText('Gemini')).toBeInTheDocument();
    expect(within(list).getByText('10 units')).toBeInTheDocument();
  });

  it('shows the empty label for no data', () => {
    render(<HorizontalBarChart data={[]} ariaLabel="x" emptyLabel="none" formatValue={format} />);
    expect(screen.getByText('none')).toBeInTheDocument();
  });
});

describe('StackedBarChart', () => {
  it('labels each column with every series value and names the colours in a legend', () => {
    render(
      <StackedBarChart
        labels={['10-05', '10-06']}
        series={[
          { key: 'in', label: 'Input', colorIndex: 0, values: [10, 20] },
          { key: 'out', label: 'Output', colorIndex: 1, values: [5, 0] },
        ]}
        ariaLabel="Tokens"
        emptyLabel="none"
        formatValue={format}
      />,
    );
    expect(screen.getByRole('img', { name: 'Tokens' })).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: '10-05: Input 10 units, Output 5 units' }),
    ).toHaveAttribute('tabindex', '0');
    expect(screen.getByText('Input')).toBeInTheDocument();
    expect(screen.getByText('Output')).toBeInTheDocument();
  });

  it('shows the empty label when there are no buckets', () => {
    render(
      <StackedBarChart
        labels={[]}
        series={[]}
        ariaLabel="x"
        emptyLabel="none"
        formatValue={format}
      />,
    );
    expect(screen.getByText('none')).toBeInTheDocument();
  });
});

describe('DonutChart', () => {
  it('prints value and percent for every positive slice in a text legend', () => {
    render(
      <DonutChart
        slices={[
          { key: 'a', label: 'Credit', value: 3 },
          { key: 'b', label: 'Free', value: 1 },
          { key: 'c', label: 'Zero', value: 0 },
        ]}
        ariaLabel="Billing"
        emptyLabel="none"
        formatValue={format}
      />,
    );
    expect(screen.getByRole('img', { name: 'Billing' })).toBeInTheDocument();
    expect(screen.getByText('3 units (75%)')).toBeInTheDocument();
    expect(screen.getByText('1 units (25%)')).toBeInTheDocument();
    expect(screen.queryByText('Zero')).not.toBeInTheDocument();
  });

  it('shows the empty label when every slice is zero', () => {
    render(
      <DonutChart
        slices={[{ key: 'a', label: 'A', value: 0 }]}
        ariaLabel="x"
        emptyLabel="none"
        formatValue={format}
      />,
    );
    expect(screen.getByText('none')).toBeInTheDocument();
  });
});
