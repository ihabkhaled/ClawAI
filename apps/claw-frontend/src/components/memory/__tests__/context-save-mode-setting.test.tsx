import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ContextSaveModeSetting } from '@/components/memory/context-save-mode-setting';
import { signInTestUser, signOutTestUser } from '@/test/fixtures/signed-in-user.fixture';
import {
  contextSaveModeStorageKey,
  readContextSaveMode,
  resetContextSaveModeMemory,
  writeContextSaveMode,
} from '@/utilities/context-save-mode.utility';

vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const modeSwitch = () => screen.getByRole('switch', { name: 'memory.saveMode.switchLabel' });

describe('ContextSaveModeSetting (ADR-168)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetContextSaveModeMemory();
    signInTestUser('user-1');
  });

  afterEach(() => {
    signOutTestUser();
  });

  it('shows asking first as the default, off, with its own explanation', () => {
    render(<ContextSaveModeSetting />);

    expect(modeSwitch()).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByText('memory.saveMode.descriptionAsk')).toBeInTheDocument();
    expect(screen.queryByText('memory.saveMode.descriptionAuto')).toBeNull();
    expect(screen.getByRole('region', { name: 'memory.saveMode.title' })).toBeInTheDocument();
  });

  it('turns automatic saving on and back off, for this account only', () => {
    render(<ContextSaveModeSetting />);

    fireEvent.click(modeSwitch());
    expect(modeSwitch()).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('memory.saveMode.descriptionAuto')).toBeInTheDocument();
    expect(window.localStorage.getItem(contextSaveModeStorageKey('user-1'))).toBe('AUTO');
    expect(window.localStorage.getItem(contextSaveModeStorageKey('user-2'))).toBeNull();

    fireEvent.click(modeSwitch());
    expect(modeSwitch()).toHaveAttribute('aria-checked', 'false');
    expect(readContextSaveMode()).toBe('ASK');
  });

  it('shows what the dialog chose, so the two stay one setting', () => {
    render(<ContextSaveModeSetting />);

    act(() => writeContextSaveMode('AUTO'));

    expect(modeSwitch()).toHaveAttribute('aria-checked', 'true');
  });

  it("shows the next account asking first, never the previous account's AUTO", () => {
    window.localStorage.setItem(contextSaveModeStorageKey('user-1'), 'AUTO');
    render(<ContextSaveModeSetting />);
    expect(modeSwitch()).toHaveAttribute('aria-checked', 'true');

    act(() => {
      signOutTestUser();
      signInTestUser('user-2');
    });

    expect(modeSwitch()).toHaveAttribute('aria-checked', 'false');
  });
});
