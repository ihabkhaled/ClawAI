import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SmartRouterStatusBadge } from '@/components/admin/smart-router/smart-router-status-badge';
import { RouterConfigurationStatus } from '@/enums/router-configuration.enum';

const t = (key: string): string => key;

describe('SmartRouterStatusBadge', () => {
  it('renders the translated label for the status', () => {
    render(<SmartRouterStatusBadge status={RouterConfigurationStatus.DRAFT} t={t} />);
    expect(screen.getByText('smartRouterAdmin.enums.status.DRAFT')).toBeInTheDocument();
  });

  it('renders a different label for PUBLISHED', () => {
    render(<SmartRouterStatusBadge status={RouterConfigurationStatus.PUBLISHED} t={t} />);
    expect(screen.getByText('smartRouterAdmin.enums.status.PUBLISHED')).toBeInTheDocument();
  });
});
