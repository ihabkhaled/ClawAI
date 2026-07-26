import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { EditorialPageShell } from '@/components/marketing/shared/editorial-page-shell';
import { EditorialSectionNav } from '@/components/marketing/shared/editorial-section-nav';
import { EvidenceNote } from '@/components/marketing/shared/evidence-note';
import { RoutingRail } from '@/components/marketing/shared/routing-rail';

describe('marketing editorial primitives', () => {
  it('gives an editorial page one labelled article and one visible level-one heading', () => {
    render(
      <EditorialPageShell
        eyebrow="Security and privacy"
        title="Control where work runs"
        summary="A factual account of the controls available to operators."
        sectionNavigation={<span>Page contents</span>}
      >
        <section aria-label="Security controls">Controls</section>
      </EditorialPageShell>,
    );

    expect(screen.getByRole('article', { name: 'Control where work runs' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Control where work runs' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByText('Security and privacy')).toBeInTheDocument();
    expect(
      screen.getByText('A factual account of the controls available to operators.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Page contents')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Security controls' })).toBeInTheDocument();
  });

  it('renders local section links as a labelled keyboard navigation landmark', async () => {
    const user = userEvent.setup();
    render(
      <EditorialSectionNav
        label="On this page"
        items={[
          { id: 'plans', label: 'Plans' },
          { id: 'limits', label: 'Limits' },
        ]}
      />,
    );

    const navigation = screen.getByRole('navigation', { name: 'On this page' });
    const plansLink = screen.getByRole('link', { name: 'Plans' });
    const limitsLink = screen.getByRole('link', { name: 'Limits' });

    expect(navigation).toContainElement(plansLink);
    expect(plansLink).toHaveAttribute('href', '#plans');
    expect(limitsLink).toHaveAttribute('href', '#limits');

    await user.tab();
    expect(plansLink).toHaveFocus();
    await user.tab();
    expect(limitsLink).toHaveFocus();
  });

  it('presents evidence as a named complementary note with an optional source link', () => {
    render(
      <EvidenceNote
        label="Evidence note"
        source={{ href: '/architecture', label: 'Review the architecture' }}
      >
        Routing behavior depends on the available providers and policy.
      </EvidenceNote>,
    );

    const note = screen.getByRole('complementary', { name: 'Evidence note' });
    const source = screen.getByRole('link', { name: 'Review the architecture' });

    expect(note).toHaveTextContent(
      'Routing behavior depends on the available providers and policy.',
    );
    expect(note).toContainElement(source);
    expect(source).toHaveAttribute('href', '/architecture');
  });

  it('exposes the routing sequence and a complete text alternative as static markup', () => {
    render(
      <RoutingRail
        title="How a request moves"
        summary="The route is evaluated before a model is selected."
        textAlternative="A request is evaluated, routed, compared, and returned with a model receipt."
        evaluation={{
          label: 'Evaluate',
          description: 'Read request requirements and current policy.',
        }}
        routing={{
          label: 'Route',
          description: 'Select an eligible provider path.',
        }}
        comparison={{
          label: 'Compare',
          description: 'Compare only the eligible options.',
        }}
        receipt={{
          label: 'Receipt',
          description: 'Return the selected model identity with the response.',
        }}
      />,
    );

    const diagram = screen.getByRole('figure', {
      name: 'A request is evaluated, routed, compared, and returned with a model receipt.',
    });

    expect(
      screen.getByRole('heading', { level: 2, name: 'How a request moves' }),
    ).toBeInTheDocument();
    expect(diagram).toHaveAttribute('data-motion', 'static');
    expect(diagram.querySelectorAll('video[autoplay], [data-animated="true"]')).toHaveLength(0);
    expect(screen.getByRole('list')).toBeInTheDocument();
    expect(screen.getByText('Evaluate')).toBeInTheDocument();
    expect(screen.getByText('Route')).toBeInTheDocument();
    expect(screen.getByText('Compare')).toBeInTheDocument();
    expect(screen.getByText('Receipt')).toBeInTheDocument();
    expect(diagram).not.toHaveTextContent(/winner|benchmark|latency|uptime/i);
  });
});
