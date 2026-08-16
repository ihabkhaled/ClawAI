import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { OrchestrationLabInfo } from '@/components/chat/orchestration/orchestration-lab-info';

const t = (key: string): string => key;

describe('OrchestrationLabInfo', () => {
  it('renders the goal text and every benefit bullet', () => {
    render(
      <OrchestrationLabInfo
        goal="Get a synthesized answer from multiple models."
        benefits={['Surfaces disagreement', 'Reduces single-model risk', 'Best for high stakes']}
        t={t}
      />,
    );

    expect(screen.getByText('Get a synthesized answer from multiple models.')).toBeInTheDocument();
    expect(screen.getByText('Surfaces disagreement')).toBeInTheDocument();
    expect(screen.getByText('Reduces single-model risk')).toBeInTheDocument();
    expect(screen.getByText('Best for high stakes')).toBeInTheDocument();
  });

  it('renders the section labels via t()', () => {
    render(<OrchestrationLabInfo goal="Goal text" benefits={['One benefit']} t={t} />);

    expect(screen.getByText('orchestrationShell.goalLabel')).toBeInTheDocument();
    expect(screen.getByText('orchestrationShell.benefitsLabel')).toBeInTheDocument();
  });

  it('renders one list item per benefit, in order', () => {
    render(<OrchestrationLabInfo goal="Goal" benefits={['First', 'Second', 'Third']} t={t} />);

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('First');
    expect(items[1]).toHaveTextContent('Second');
    expect(items[2]).toHaveTextContent('Third');
  });
});
