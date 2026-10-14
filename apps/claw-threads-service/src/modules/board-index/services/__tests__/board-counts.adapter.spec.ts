import { BoardCountsAdapter } from '../board-counts.adapter';

function build(publicationId: string | null) {
  const repository = { findIdBySlug: vi.fn().mockResolvedValue(publicationId) };
  const index = { syncPublication: vi.fn().mockResolvedValue(true) };
  const adapter = new BoardCountsAdapter(repository as never, index as never);
  return { adapter, repository, index };
}

describe('BoardCountsAdapter', () => {
  it('re-syncs the row of the slug after a comment change', async () => {
    const { adapter, repository, index } = build('pub-1');

    await adapter.commentsChanged('a-slug');

    expect(repository.findIdBySlug).toHaveBeenCalledWith('a-slug');
    expect(index.syncPublication).toHaveBeenCalledWith('pub-1');
  });

  it('re-syncs from the source tables after a reaction change, not from the passed totals', async () => {
    const { adapter, index } = build('pub-1');

    await adapter.reactionsChanged('a-slug');

    expect(index.syncPublication).toHaveBeenCalledWith('pub-1');
  });

  it('re-syncs the row after a view', async () => {
    const { adapter, index } = build('pub-1');

    await adapter.viewsChanged('a-slug');

    expect(index.syncPublication).toHaveBeenCalledWith('pub-1');
  });

  it('does nothing for an unknown slug', async () => {
    const { adapter, index } = build(null);

    await adapter.commentsChanged('gone');

    expect(index.syncPublication).not.toHaveBeenCalled();
  });
});
