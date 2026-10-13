import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CONTEXT_SAVE_MODE_CHANGE_EVENT,
  CONTEXT_SAVE_MODE_STORAGE_KEY,
} from '@/constants/context-save.constants';
import { signInTestUser, signOutTestUser } from '@/test/fixtures/signed-in-user.fixture';
import {
  contextSaveModeStorageKey,
  readContextSaveMode,
  resetContextSaveModeMemory,
  subscribeContextSaveMode,
  writeContextSaveMode,
} from '@/utilities/context-save-mode.utility';

const KEY = contextSaveModeStorageKey('user-1');

describe('context save mode (ADR-168)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetContextSaveModeMemory();
    signInTestUser('user-1');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    signOutTestUser();
  });

  it('defaults to ASK when nothing is stored', () => {
    expect(readContextSaveMode()).toBe('ASK');
  });

  it('keys the stored choice by user id', () => {
    expect(KEY).toBe(`${CONTEXT_SAVE_MODE_STORAGE_KEY}:user-1`);
  });

  it('remembers AUTO and returns to ASK by removing the key', () => {
    writeContextSaveMode('AUTO');
    expect(window.localStorage.getItem(KEY)).toBe('AUTO');
    expect(readContextSaveMode()).toBe('AUTO');

    writeContextSaveMode('ASK');
    expect(window.localStorage.getItem(KEY)).toBeNull();
    expect(readContextSaveMode()).toBe('ASK');
  });

  it('treats a tampered stored value as ASK, never as AUTO', () => {
    window.localStorage.setItem(KEY, 'auto');
    expect(readContextSaveMode()).toBe('ASK');
    window.localStorage.setItem(KEY, '{"mode":"AUTO"}');
    expect(readContextSaveMode()).toBe('ASK');
  });

  it('does not throw when storage cannot be read, and falls back to ASK', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(readContextSaveMode()).toBe('ASK');
  });

  it('keeps the choice for the session when storage cannot be written', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(() => writeContextSaveMode('AUTO')).not.toThrow();

    expect(readContextSaveMode()).toBe('AUTO');
  });

  it('does not let a stale in-memory AUTO override a mode another tab switched back', () => {
    writeContextSaveMode('AUTO');
    window.localStorage.removeItem(KEY);

    expect(readContextSaveMode()).toBe('ASK');
  });

  describe('across accounts on one browser', () => {
    it("does not leak one account's AUTO to the next account that signs in", () => {
      writeContextSaveMode('AUTO');
      expect(readContextSaveMode()).toBe('AUTO');

      signOutTestUser();
      expect(readContextSaveMode()).toBe('ASK');
      signInTestUser('user-2');

      expect(readContextSaveMode()).toBe('ASK');
      expect(window.localStorage.getItem(contextSaveModeStorageKey('user-2'))).toBeNull();
    });

    it('gives the first account its own choice back when it signs in again', () => {
      writeContextSaveMode('AUTO');
      signOutTestUser();
      signInTestUser('user-2');
      writeContextSaveMode('ASK');

      signOutTestUser();
      signInTestUser('user-1');

      expect(readContextSaveMode()).toBe('AUTO');
    });

    it('does not leak through the in-memory fallback either', () => {
      // Only the save-mode key is blocked; the auth store still persists its session.
      const realSetItem = Storage.prototype.setItem;
      const realGetItem = Storage.prototype.getItem;
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
        this: Storage,
        key: string,
        value: string,
      ) {
        if (key.startsWith(CONTEXT_SAVE_MODE_STORAGE_KEY)) {
          throw new Error('quota');
        }
        realSetItem.call(this, key, value);
      });
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (
        this: Storage,
        key: string,
      ) {
        if (key.startsWith(CONTEXT_SAVE_MODE_STORAGE_KEY)) {
          throw new Error('blocked');
        }
        return realGetItem.call(this, key);
      });
      writeContextSaveMode('AUTO');
      expect(readContextSaveMode()).toBe('AUTO');

      signOutTestUser();
      signInTestUser('user-2');

      expect(readContextSaveMode()).toBe('ASK');
    });

    it('ignores the old un-keyed value written before the choice was per account', () => {
      window.localStorage.setItem(CONTEXT_SAVE_MODE_STORAGE_KEY, 'AUTO');

      expect(readContextSaveMode()).toBe('ASK');
    });

    it('is ASK, and cannot be changed, while nobody is signed in', () => {
      signOutTestUser();

      writeContextSaveMode('AUTO');

      expect(readContextSaveMode()).toBe('ASK');
      const saveModeKeys = Object.keys(window.localStorage).filter((key) =>
        key.startsWith(CONTEXT_SAVE_MODE_STORAGE_KEY),
      );
      expect(saveModeKeys).toEqual([]);
    });
  });

  it('notifies subscribers in this tab and on storage events, and stops after unsubscribe', () => {
    const onChange = vi.fn();
    const unsubscribe = subscribeContextSaveMode(onChange);

    writeContextSaveMode('AUTO');
    expect(onChange).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new StorageEvent('storage', { key: KEY }));
    expect(onChange).toHaveBeenCalledTimes(2);

    window.dispatchEvent(new StorageEvent('storage', { key: 'something-else' }));
    expect(onChange).toHaveBeenCalledTimes(2);

    unsubscribe();
    window.dispatchEvent(new Event(CONTEXT_SAVE_MODE_CHANGE_EVENT));
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('notifies subscribers when the signed-in account changes, so a mounted view re-reads', () => {
    const onChange = vi.fn();
    const unsubscribe = subscribeContextSaveMode(onChange);

    signOutTestUser();
    expect(onChange).toHaveBeenCalledTimes(1);
    signInTestUser('user-2');
    expect(onChange).toHaveBeenCalledTimes(2);

    unsubscribe();
    signOutTestUser();
    expect(onChange).toHaveBeenCalledTimes(2);
  });
});
