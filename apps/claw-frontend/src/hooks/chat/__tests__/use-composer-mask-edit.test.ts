import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useComposerMaskEdit } from '@/hooks/chat/use-composer-mask-edit';

function setup(selected: string[]) {
  const onChange = vi.fn<(ids: string[]) => void>();
  const hook = renderHook(() =>
    useComposerMaskEdit({ selectedFileIds: selected, onSelectedFileIdsChange: onChange }),
  );
  return { hook, onChange };
}

describe('useComposerMaskEdit', () => {
  it('opens and closes the editor for one image', () => {
    const { hook } = setup(['a']);

    act(() => hook.result.current.openEditor('a'));
    expect(hook.result.current.editingFileId).toBe('a');

    act(() => hook.result.current.closeEditor());
    expect(hook.result.current.editingFileId).toBeNull();
  });

  it('moves the masked image to the front — the pipeline edits imageFiles[0]', () => {
    const { hook, onChange } = setup(['doc', 'photo', 'other']);

    act(() => hook.result.current.applyMask('photo', 'mask-1'));

    expect(onChange).toHaveBeenCalledWith(['photo', 'doc', 'other']);
    expect(hook.result.current.mask).toEqual({ sourceFileId: 'photo', maskFileId: 'mask-1' });
  });

  it('hands the mask out once, for the send it was drawn for', () => {
    const { hook } = setup(['photo']);
    act(() => hook.result.current.applyMask('photo', 'mask-1'));

    let first: string | undefined;
    let second: string | undefined;
    act(() => {
      first = hook.result.current.consumeMaskFor(['photo']);
      second = hook.result.current.consumeMaskFor(['photo']);
    });

    expect(first).toBe('mask-1');
    expect(second).toBeUndefined();
    expect(hook.result.current.mask).toBeNull();
  });

  it('drops the mask when its source image is no longer first (removed or reordered)', () => {
    const { hook } = setup(['photo']);
    act(() => hook.result.current.applyMask('photo', 'mask-1'));

    let sent: string | undefined;
    act(() => {
      sent = hook.result.current.consumeMaskFor(['other']);
    });

    expect(sent).toBeUndefined();
    expect(hook.result.current.mask).toBeNull();
  });

  it('sends nothing when there is no mask or no files', () => {
    const { hook } = setup([]);

    expect(hook.result.current.consumeMaskFor(undefined)).toBeUndefined();
  });

  it('clearMask forgets the mask without sending', () => {
    const { hook } = setup(['photo']);
    act(() => hook.result.current.applyMask('photo', 'mask-1'));

    act(() => hook.result.current.clearMask());

    expect(hook.result.current.mask).toBeNull();
    expect(hook.result.current.consumeMaskFor(['photo'])).toBeUndefined();
  });
});
