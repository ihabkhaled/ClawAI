import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ComposerPlusMenu } from '@/components/chat/composer-plus-menu';
import { ComposerContextDialog } from '@/enums/composer-context-dialog.enum';
import { ResearchMode } from '@/enums/research-mode.enum';
import { ResearchProviderKind } from '@/enums/research-provider-kind.enum';
import { ResearchProviderStatus } from '@/enums/research-provider-status.enum';
import type { ComposerPlusMenuProps } from '@/types/composer-plus-menu.types';
import type { FileLibraryMenuInnerProps } from '@/types/file-library-ui.types';
import type { SanitizedResearchProvider } from '@/types/research.types';

const openDialog = vi.fn();
const promptsOpenChange = vi.fn();
const onResearchChange = vi.fn();
const onInsertPrompt = vi.fn();
const lastLibraryProps: { current: FileLibraryMenuInnerProps | null } = { current: null };
let selectedPackCount = 0;
let draftPackCount = 0;
const draftPacksInput: { current: { selectedIds: string[] } | null } = { current: null };

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, string>) =>
      values?.['value'] === undefined ? key : `${key}:${values['value']}`,
  }),
}));
vi.mock('@/components/chat/file-library-menu', () => ({
  FileLibraryMenu: (props: FileLibraryMenuInnerProps) => {
    lastLibraryProps.current = props;
    return (
      <div>
        <input aria-label="library-search" data-library-nav="" />
        <button type="button" data-library-nav="" onClick={props.onDone}>
          library-stub
        </button>
        <button
          type="button"
          data-library-nav=""
          onClick={() => {
            props.onBrowseAll?.();
          }}
        >
          library-browse
        </button>
      </div>
    );
  },
}));
vi.mock('@/components/chat/file-library-dialog', () => ({
  FileLibraryDialog: ({ open }: { open: boolean }) =>
    open ? <div>library-dialog-open</div> : null,
}));
vi.mock('@/hooks/chat/use-composer-context-menu', () => ({
  useComposerContextMenu: () => ({
    picker: { selectedCount: selectedPackCount },
    preview: {},
    menuOpen: false,
    onMenuOpenChange: vi.fn(),
    dialog: null,
    openDialog,
    closeDialog: vi.fn(),
  }),
}));
vi.mock('@/hooks/chat/use-draft-context-packs', () => ({
  useDraftContextPacks: (input: { selectedIds: string[] }) => {
    draftPacksInput.current = input;
    return { selectedCount: draftPackCount };
  },
}));
vi.mock('@/hooks/prompt-library/use-prompt-library-controller', () => ({
  usePromptLibraryController: () => ({ onOpenChange: promptsOpenChange }),
}));
vi.mock('@/components/chat/prompt-library/prompt-library-dialog', () => ({
  PromptLibraryDialog: () => <div>prompt-dialog-stub</div>,
}));
vi.mock('@/components/chat/composer-context-pack-picker', () => ({
  ComposerContextPackPicker: () => <div>pack-picker-stub</div>,
}));
vi.mock('@/components/chat/composer-context-packs-view', () => ({
  ComposerContextPacksView: () => null,
}));
vi.mock('@/components/chat/composer-memory-view', () => ({
  ComposerMemoryView: () => null,
}));
vi.mock('@/components/chat/preview-context-dialog', () => ({
  PreviewContextDialog: ({ open }: { open: boolean }) => (open ? <div>preview-open</div> : null),
}));

const provider = (id: string, name: string, enabled = true): SanitizedResearchProvider => ({
  id,
  kind: ResearchProviderKind.EXA,
  name,
  description: null,
  baseUrl: '',
  hasSecret: true,
  secretVersion: 1,
  enabled,
  priority: 1,
  status: ResearchProviderStatus.ACTIVE,
  publicConfig: {},
  allowlistDomains: [],
  blocklistDomains: [],
  timeoutMs: 1000,
  lastValidatedAt: null,
  validationError: null,
  createdAt: '',
  updatedAt: '',
});

const baseProps = (overrides: Partial<ComposerPlusMenuProps> = {}): ComposerPlusMenuProps => ({
  disabled: false,
  selectedFileIds: [],
  onSelectedFileIdsChange: vi.fn(),
  ingestFiles: vi.fn(),
  isUploadingAttachment: false,
  canResearch: true,
  research: { mode: ResearchMode.AUTO },
  onResearchChange,
  researchProviders: [provider('p1', 'Exa main')],
  isResearchProvidersLoading: false,
  threadId: 't1',
  draft: 'hello',
  onInsertPrompt,
  ...overrides,
});

const open = (): void => {
  fireEvent.click(screen.getByRole('button', { name: /^chat\.composerMenu\.addLabel/ }));
};

const navigable = (): HTMLElement[] =>
  Array.from(
    document.querySelectorAll<HTMLElement>('[data-plus-item]:not(:disabled), [data-library-nav]'),
  );

describe('ComposerPlusMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectedPackCount = 0;
    lastLibraryProps.current = null;
  });

  it('is one round button that keeps the attach tour anchor and shows nothing else', () => {
    render(<ComposerPlusMenu {...baseProps()} />);

    const trigger = screen.getByRole('button', { name: 'chat.composerMenu.addLabel' });
    expect(trigger).toHaveAttribute('data-tour', 'composer-attach');
    expect(trigger.className).toContain('rounded-full');
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('opens three labelled sections and hands the file library the composer upload pipeline', () => {
    const props = baseProps({ selectedFileIds: ['f1'] });
    render(<ComposerPlusMenu {...props} />);
    open();

    for (const name of [
      'chat.composerMenu.sectionAttach',
      'chat.composerMenu.sectionContext',
      'chat.composerMenu.sectionTools',
    ]) {
      expect(screen.getByRole('region', { name })).toBeInTheDocument();
    }
    expect(lastLibraryProps.current).toMatchObject({
      selectedFileIds: ['f1'],
      onChange: props.onSelectedFileIdsChange,
      ingestFiles: props.ingestFiles,
      isUploading: false,
      disabled: false,
    });
  });

  it('closes the menu when the file library reports it is done', () => {
    render(<ComposerPlusMenu {...baseProps()} />);
    open();
    fireEvent.click(screen.getByRole('button', { name: 'library-stub' }));

    expect(screen.queryByRole('region', { name: 'chat.composerMenu.sectionTools' })).toBeNull();
  });

  it('counts attached files and picked packs on the button', () => {
    selectedPackCount = 2;
    render(<ComposerPlusMenu {...baseProps({ selectedFileIds: ['f1'] })} />);

    const trigger = screen.getByRole('button', { name: 'chat.composerMenu.addLabelWithCount:3' });
    expect(trigger).toHaveTextContent('3');
    expect(trigger).toHaveAttribute('title', 'chat.composerMenu.addLabelWithCount:3');
  });

  it('keeps the plain label when nothing is selected', () => {
    render(<ComposerPlusMenu {...baseProps()} />);

    expect(screen.getByRole('button', { name: 'chat.composerMenu.addLabel' })).toBeInTheDocument();
  });

  it('opens a labelled popover with focus on the menu, not on the search box', () => {
    render(<ComposerPlusMenu {...baseProps()} />);
    open();

    const dialog = screen.getByRole('dialog', { name: 'chat.composerMenu.addLabel' });
    expect(dialog).toHaveFocus();
    expect(dialog).toHaveAttribute('tabindex', '-1');
    expect(screen.getByLabelText('library-search')).not.toHaveFocus();
  });

  it('keeps the phone width override and makes the library follow the host width', () => {
    render(<ComposerPlusMenu {...baseProps()} />);
    open();

    const dialog = screen.getByRole('dialog', { name: 'chat.composerMenu.addLabel' });
    expect(dialog.className).toContain('touch:w-[min(22rem,calc(100vw-1rem))]');
    expect(dialog.className).toContain('[&_[data-testid=file-library-menu]]:w-full');
    expect(dialog.className).toContain('short-viewport:');
  });

  it('starts the arrow keys from the menu itself', () => {
    render(<ComposerPlusMenu {...baseProps()} />);
    open();
    const dialog = screen.getByRole('dialog', { name: 'chat.composerMenu.addLabel' });

    fireEvent.keyDown(dialog, { key: 'ArrowDown' });
    expect(navigable()[0]).toHaveFocus();
    dialog.focus();
    fireEvent.keyDown(dialog, { key: 'ArrowUp' });
    expect(navigable().at(-1)).toHaveFocus();
  });

  it('crosses Attach, Context and Tools as one ordered list', () => {
    render(<ComposerPlusMenu {...baseProps()} />);
    open();
    const list = navigable();
    const lastLibrary = screen.getByRole('button', { name: 'library-browse' });
    const firstContext = screen.getByRole('button', { name: /chat.composerContext.pickLabel/ });
    const lastRow = screen.getByRole('button', { name: /promptLibrary.openLabel/ });
    expect(list.indexOf(firstContext)).toBe(list.indexOf(lastLibrary) + 1);

    lastLibrary.focus();
    fireEvent.keyDown(lastLibrary, { key: 'ArrowDown' });
    expect(firstContext).toHaveFocus();
    fireEvent.keyDown(firstContext, { key: 'ArrowUp' });
    expect(lastLibrary).toHaveFocus();

    const search = screen.getByLabelText('library-search');
    search.focus();
    fireEvent.keyDown(search, { key: 'ArrowUp' });
    expect(lastRow).toHaveFocus();
  });

  it('leaves Home and End to the search box caret', () => {
    render(<ComposerPlusMenu {...baseProps()} />);
    open();
    const search = screen.getByLabelText('library-search');
    search.focus();

    fireEvent.keyDown(search, { key: 'Home' });
    fireEvent.keyDown(search, { key: 'End' });
    expect(search).toHaveFocus();
  });

  it('hosts Browse all beside the popover so it survives the menu closing', () => {
    render(<ComposerPlusMenu {...baseProps()} />);
    open();
    expect(lastLibraryProps.current?.onBrowseAll).toBeTypeOf('function');
    expect(screen.queryByText('library-dialog-open')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'library-browse' }));

    expect(screen.getByText('library-dialog-open')).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'chat.composerMenu.addLabel' })).toBeNull();
    expect(screen.queryByRole('region', { name: 'chat.composerMenu.sectionTools' })).toBeNull();
  });

  it('ignores keys typed on elements that are not menu rows', () => {
    render(<ComposerPlusMenu {...baseProps()} />);
    open();
    const dialog = screen.getByRole('dialog', { name: 'chat.composerMenu.addLabel' });
    const stray = document.createElement('span');
    dialog.appendChild(stray);

    fireEvent.keyDown(stray, { key: 'ArrowDown' });
    expect(dialog).toHaveFocus();
  });

  it('leaves the Context section out on the new-chat surface, which has no thread', () => {
    render(<ComposerPlusMenu {...baseProps({ threadId: null })} />);
    open();

    expect(screen.queryByRole('region', { name: 'chat.composerMenu.sectionContext' })).toBeNull();
    expect(screen.getByRole('region', { name: 'chat.composerMenu.sectionTools' })).toBeVisible();
  });

  it('leaves the research row out when the plan does not unlock research', () => {
    render(<ComposerPlusMenu {...baseProps({ canResearch: false })} />);
    open();

    expect(screen.queryByRole('button', { name: /chat.composerMenu.researchLabel/ })).toBeNull();
    expect(screen.getByRole('button', { name: /promptLibrary.openLabel/ })).toBeInTheDocument();
  });

  it('names the active research mode on the Web research row', () => {
    render(<ComposerPlusMenu {...baseProps()} />);
    open();

    expect(
      screen.getByRole('button', { name: /chat.composerMenu.researchLabel/ }),
    ).toHaveTextContent('research.modes.auto');
  });

  it('opens the research sub-panel, changes the mode, then goes Back', () => {
    render(<ComposerPlusMenu {...baseProps()} />);
    open();
    fireEvent.click(screen.getByRole('button', { name: /chat.composerMenu.researchLabel/ }));

    fireEvent.click(screen.getByRole('radio', { name: /research\.modes\.search(?![A-Z])/ }));
    expect(onResearchChange).toHaveBeenCalledWith({ mode: ResearchMode.SEARCH });

    fireEvent.click(screen.getByRole('button', { name: /chat.composerMenu.back/ }));
    expect(screen.getByRole('region', { name: 'chat.composerMenu.sectionTools' })).toBeVisible();
  });

  it('picks a search provider and clears it back to Auto Provider', () => {
    render(
      <ComposerPlusMenu
        {...baseProps({ research: { mode: ResearchMode.SEARCH, providerId: 'p1' } })}
      />,
    );
    open();
    fireEvent.click(screen.getByRole('button', { name: /chat.composerMenu.researchLabel/ }));

    expect(screen.getByRole('radio', { name: /Exa main/ })).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByRole('radio', { name: 'research.toggle.autoProvider' }));
    expect(onResearchChange).toHaveBeenCalledWith({
      mode: ResearchMode.SEARCH,
      providerId: undefined,
    });
  });

  it('shows no provider list while research is off', () => {
    render(<ComposerPlusMenu {...baseProps({ research: { mode: ResearchMode.NONE } })} />);
    open();
    fireEvent.click(screen.getByRole('button', { name: /chat.composerMenu.researchLabel/ }));

    expect(screen.queryByRole('radiogroup', { name: 'research.toggle.providerLabel' })).toBeNull();
  });

  it('opens the pack picker as a sub-panel', () => {
    render(<ComposerPlusMenu {...baseProps()} />);
    open();
    fireEvent.click(screen.getByRole('button', { name: /chat.composerContext.pickLabel/ }));

    expect(screen.getByText('pack-picker-stub')).toBeInTheDocument();
  });

  it('opens the prompt library after closing the menu', () => {
    render(<ComposerPlusMenu {...baseProps()} />);
    open();
    fireEvent.click(screen.getByRole('button', { name: /promptLibrary.openLabel/ }));

    expect(promptsOpenChange).toHaveBeenCalledWith(true);
    expect(screen.queryByRole('region', { name: 'chat.composerMenu.sectionTools' })).toBeNull();
    expect(screen.getByText('prompt-dialog-stub')).toBeInTheDocument();
  });

  it('opens the memory and what-will-be-sent dialogs through the context hook', () => {
    render(<ComposerPlusMenu {...baseProps()} />);
    open();
    fireEvent.click(screen.getByRole('button', { name: /chat.composerContext.memoryLabel/ }));
    expect(openDialog).toHaveBeenLastCalledWith(ComposerContextDialog.MEMORY);

    open();
    fireEvent.click(screen.getByRole('button', { name: /chat.composerContext.viewLabel/ }));
    expect(openDialog).toHaveBeenLastCalledWith(ComposerContextDialog.VIEW);
  });

  it('opens the context preview dialog, which outlives the menu closing', () => {
    render(<ComposerPlusMenu {...baseProps()} />);
    open();
    fireEvent.click(screen.getByRole('button', { name: /preview.openLabel/ }));

    expect(screen.getByText('preview-open')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'chat.composerMenu.sectionTools' })).toBeNull();
  });

  it('moves focus between rows with the arrow keys, wrapping at both ends', () => {
    render(<ComposerPlusMenu {...baseProps()} />);
    open();
    const rows = navigable();
    const first = rows[0] as HTMLElement;
    const last = rows[rows.length - 1] as HTMLElement;
    first.focus();

    fireEvent.keyDown(first, { key: 'ArrowDown' });
    expect(rows[1]).toHaveFocus();
    fireEvent.keyDown(rows[1] as HTMLElement, { key: 'ArrowUp' });
    expect(first).toHaveFocus();
    fireEvent.keyDown(first, { key: 'ArrowUp' });
    expect(last).toHaveFocus();
    fireEvent.keyDown(last, { key: 'ArrowDown' });
    expect(first).toHaveFocus();
    fireEvent.keyDown(last, { key: 'Home' });
    expect(first).toHaveFocus();
    fireEvent.keyDown(rows[1] as HTMLElement, { key: 'End' });
    expect(last).toHaveFocus();
  });

  it('ignores other keys', () => {
    render(<ComposerPlusMenu {...baseProps()} />);
    open();
    const row = screen
      .getAllByRole('button')
      .find((button) => button.hasAttribute('data-plus-item'));
    row?.focus();
    fireEvent.keyDown(row as HTMLElement, { key: 'a' });

    expect(row).toHaveFocus();
  });

  it('returns focus to the row that opened a sub-panel when Back is used', () => {
    render(<ComposerPlusMenu {...baseProps()} />);
    open();
    fireEvent.click(screen.getByRole('button', { name: /chat.composerMenu.researchLabel/ }));
    fireEvent.click(screen.getByRole('button', { name: /chat.composerMenu.back/ }));

    expect(screen.getByRole('button', { name: /chat.composerMenu.researchLabel/ })).toHaveFocus();
  });

  it('cannot be opened while the composer is busy', () => {
    render(<ComposerPlusMenu {...baseProps({ disabled: true })} />);

    expect(screen.getByRole('button', { name: 'chat.composerMenu.addLabel' })).toBeDisabled();
  });

  it('gives every row a coarse-pointer hit area', () => {
    render(<ComposerPlusMenu {...baseProps()} />);
    open();
    const rows = screen
      .getAllByRole('button')
      .filter((button) => button.hasAttribute('data-plus-item'));

    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.className).toContain('touch:min-h-11');
    }
  });
});

// Compare and the labs have no thread until they run (rules/59): the same menu, with the
// pack picker holding the choice for the run and without the rows that need a thread.
describe('ComposerPlusMenu — a surface with no thread yet', () => {
  const draftContextPacks = { selectedIds: ['pack-1'], onChange: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    selectedPackCount = 0;
    draftPackCount = 0;
    draftPacksInput.current = null;
  });

  it('offers the pack picker, but not what-is-sent, memory or preview', () => {
    render(<ComposerPlusMenu {...baseProps({ threadId: null, draftContextPacks })} />);
    open();

    const context = screen.getByRole('region', { name: 'chat.composerMenu.sectionContext' });
    expect(context.querySelectorAll('button')).toHaveLength(1);
    expect(screen.getByText('chat.composerContext.pickLabel')).toBeInTheDocument();
    expect(screen.queryByText('chat.composerContext.viewLabel')).toBeNull();
    expect(screen.queryByText('chat.composerContext.memoryLabel')).toBeNull();
    expect(screen.queryByText('preview.openLabel')).toBeNull();
  });

  it('hands the caller choice to the draft pack picker', () => {
    render(<ComposerPlusMenu {...baseProps({ threadId: null, draftContextPacks })} />);

    expect(draftPacksInput.current).toBe(draftContextPacks);
  });

  it('counts the picked packs on the button', () => {
    draftPackCount = 2;
    render(
      <ComposerPlusMenu
        {...baseProps({ threadId: null, draftContextPacks, selectedFileIds: ['f1'] })}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'chat.composerMenu.addLabelWithCount:3' }),
    ).toBeInTheDocument();
  });

  it('opens the pack picker from the Context row', () => {
    render(<ComposerPlusMenu {...baseProps({ threadId: null, draftContextPacks })} />);
    open();
    fireEvent.click(screen.getByText('chat.composerContext.pickLabel'));

    expect(screen.getByText('pack-picker-stub')).toBeInTheDocument();
  });

  it('has no Context section at all when the surface supplies no packs (the bare new-chat menu)', () => {
    render(<ComposerPlusMenu {...baseProps({ threadId: null })} />);
    open();

    expect(screen.queryByRole('region', { name: 'chat.composerMenu.sectionContext' })).toBeNull();
    expect(draftPacksInput.current).toBeNull();
  });

  it('still uses the thread host, with its own rows, when there is a thread', () => {
    render(<ComposerPlusMenu {...baseProps({ threadId: 't1', draftContextPacks })} />);
    open();

    expect(screen.getByText('chat.composerContext.viewLabel')).toBeInTheDocument();
    expect(draftPacksInput.current).toBeNull();
  });
});
