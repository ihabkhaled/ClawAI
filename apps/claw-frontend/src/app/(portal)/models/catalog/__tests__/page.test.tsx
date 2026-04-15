import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ModelCatalogPage from '../page';

vi.mock('@/hooks/ollama/use-model-catalog-page', () => ({
  useModelCatalogPage: () => ({
    t: (key: string) => key,
    entries: [
      {
        id: 'model-1',
        name: 'GLM-5.1',
        tag: 'latest',
      },
    ],
    meta: { total: 1 },
    isLoading: false,
    isError: false,
    isFetchingNextPage: false,
    hasNextPage: false,
    sentinelRef: vi.fn(),
    category: undefined,
    search: '',
    pullJobs: [
      {
        id: 'job-1',
        modelName: 'glm5.1:latest',
        status: 'IN_PROGRESS',
      },
    ],
    handleCategoryChange: vi.fn(),
    handleSearchChange: vi.fn(),
    handlePull: vi.fn(),
    handleCancelJob: vi.fn(),
    handleDelete: vi.fn(),
    isPullPending: false,
    isCancelPending: false,
    isDeletePending: false,
    getJobForModel: vi.fn(),
    hasActiveJobs: true,
    downloadStatsMap: new Map(),
  }),
}));

vi.mock('@/components/common/page-header', () => ({
  PageHeader: ({ title, description }: { title: string; description?: string }) => (
    <div>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  ),
}));

vi.mock('@/components/models/catalog-category-filter', () => ({
  CatalogCategoryFilter: () => <div>category-filter</div>,
}));

vi.mock('@/components/models/active-downloads-panel', () => ({
  ActiveDownloadsPanel: () => <div>active-downloads-panel</div>,
}));

vi.mock('@/components/models/catalog-model-card', () => ({
  CatalogModelCard: ({ entry }: { entry: { name: string } }) => <div>{entry.name}</div>,
}));

describe('ModelCatalogPage', () => {
  it('renders the active downloads panel above the model grid', () => {
    render(<ModelCatalogPage />);

    const downloadsPanel = screen.getByText('active-downloads-panel');
    const modelCard = screen.getByText('GLM-5.1');

    expect(downloadsPanel.compareDocumentPosition(modelCard)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });
});
